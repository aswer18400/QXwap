import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import express, { NextFunction, Request, Response } from "express";
import session from "express-session";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { migrate, q, requiredTables, resetSeedData, seed, syncItemDerivedData } from "./db.js";
import { DbSessionStore } from "./session-store.js";

const app = express();
const port = Number(process.env.PORT || 8787);
const uploadDir = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

// Render terminates TLS at its edge and forwards to us via HTTP. Trusting the
// first proxy hop makes:
//   - req.ip resolve to the real client IP from X-Forwarded-For (for rate
//     limiting and structured logs)
//   - req.secure correctly return true for proxied HTTPS, which lets
//     express-session set `secure: true` cookies behind Render.
// Outside production we don't enable it to avoid trusting headers from any
// caller on a dev box.
if (process.env.NODE_ENV === "production") app.set("trust proxy", true);

const upload = multer({ dest: uploadDir, limits: { fileSize: 6 * 1024 * 1024, files: 8 } });
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const storageBucket = process.env.STORAGE_BUCKET || "qxwap";
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || "";
const maxProductImages = 5;

function normalizeImageUrls(urls: string[] | undefined) {
  return [...new Set((urls || []).map((url) => String(url).trim()).filter(Boolean))].slice(0, maxProductImages);
}

function normalizeHashtag(value: string) {
  return value.replace(/^#+/, "").trim().replace(/\s+/g, "-").slice(0, 40);
}

function normalizeHashtags(values: string[] | undefined) {
  return [...new Set((values || []).map((value) => normalizeHashtag(String(value || ""))).filter(Boolean))].slice(0, 10);
}

function asNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function validateRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const errors: string[] = [];
  const isProduction = env.NODE_ENV === "production";
  const hasSupabaseUrl = Boolean(env.SUPABASE_URL);
  const hasSupabaseKey = Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
  const hasStorageBucket = Boolean(env.STORAGE_BUCKET);

  if (isProduction) {
    if (!env.DATABASE_URL) errors.push("DATABASE_URL is required in production");
    if (!env.FRONTEND_ORIGIN || env.FRONTEND_ORIGIN === "*") errors.push("FRONTEND_ORIGIN must be an explicit HTTPS origin in production");
    if (!env.SESSION_SECRET || env.SESSION_SECRET === "change-me-in-production" || env.SESSION_SECRET === "dev-qxwap-secret") {
      errors.push("SESSION_SECRET must be a real production secret");
    }
  }

  if ((hasSupabaseUrl || hasSupabaseKey || hasStorageBucket) && !(hasSupabaseUrl && hasSupabaseKey && hasStorageBucket)) {
    errors.push("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and STORAGE_BUCKET must be set together");
  }

  if (errors.length) {
    throw new Error(`Invalid QXwap runtime config: ${errors.join("; ")}`);
  }
}

// Security response headers. Applied before CORS so they end up on every
// response including preflights and error pages. We don't pull in `helmet`
// to avoid a runtime dep; these are the seven that actually matter for an
// API that serves JSON + an image upload byte stream.
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "geolocation=(self), microphone=(), camera=(), payment=()");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  // Minimal CSP for an API response: the only thing a browser should ever
  // render from this origin is the JSON itself; everything else is blocked.
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(cors({ origin: frontendOrigin === "*" ? true : frontendOrigin.split(","), credentials: true }));
app.use(express.json({ limit: "8mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(uploadDir));
app.use(
  session({
    name: "qxwap.sid",
    secret: process.env.SESSION_SECRET || "dev-qxwap-secret",
    proxy: process.env.NODE_ENV === "production",
    resave: false,
    saveUninitialized: false,
    store: new DbSessionStore(),
    cookie: {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30
    }
  })
);

function asyncRoute(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => void fn(req, res, next).catch(next);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ error: "AUTH_REQUIRED", message: "กรุณาเข้าสู่ระบบก่อน" });
  next();
}

// In-memory rate limiter, keyed by route name + client IP. Sufficient for a
// single-instance Render web service; if we scale horizontally later, swap
// for Redis. Skipped in tests so the existing 10-test suite is not impacted.
type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();
const recentItemCreates = new Map<string, { item: unknown; createdAt: number }>();
const pendingItemCreates = new Map<string, Promise<unknown>>();

setInterval(() => {
  const now = Date.now();
  for (const [k, b] of rateBuckets) if (b.resetAt < now) rateBuckets.delete(k);
}, 60_000).unref?.();

setInterval(() => {
  const cutoff = Date.now() - 10 * 60_000;
  for (const [k, entry] of recentItemCreates) if (entry.createdAt < cutoff) recentItemCreates.delete(k);
}, 60_000).unref?.();

function rateLimit(name: string, max: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip in tests unless FORCE_RATE_LIMIT=1 (so the 429 path can still be
    // covered by a dedicated test without slowing every other test).
    if (process.env.NODE_ENV === "test" && process.env.FORCE_RATE_LIMIT !== "1") return next();
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${name}:${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("x-ratelimit-limit", String(max));
      res.setHeader("x-ratelimit-remaining", String(max - 1));
      return next();
    }
    if (bucket.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("retry-after", String(retryAfterSec));
      res.setHeader("x-ratelimit-limit", String(max));
      res.setHeader("x-ratelimit-remaining", "0");
      const requestId = (req as Request & { requestId?: string }).requestId;
      return res.status(429).json({
        error: "RATE_LIMITED",
        message: `ลองอีกครั้งใน ${retryAfterSec} วินาที`,
        retry_after_sec: retryAfterSec,
        requestId
      });
    }
    bucket.count++;
    res.setHeader("x-ratelimit-limit", String(max));
    res.setHeader("x-ratelimit-remaining", String(max - bucket.count));
    next();
  };
}

// Request logging: structured JSON in production, compact in dev/test.
// Each request gets an x-request-id header (forwarded if client supplied one).
// Skip /api/health unless it errors, to keep logs readable.
const isTestEnv = process.env.NODE_ENV === "test";
const isProductionEnv = process.env.NODE_ENV === "production";

function emitLog(payload: Record<string, unknown>) {
  if (isTestEnv) return;
  const line = isProductionEnv ? JSON.stringify(payload) : `[QXwap] ${JSON.stringify(payload)}`;
  if (typeof payload.status === "number" && payload.status >= 500) console.error(line);
  else console.log(line);
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const incomingId = req.header("x-request-id");
  const requestId = incomingId && /^[\w.-]{1,128}$/.test(incomingId) ? incomingId : randomUUID();
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader("x-request-id", requestId);

  const startedAt = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if ((req.path === "/api/health" || req.path === "/api/version") && res.statusCode < 400) return;
    emitLog({
      ts: new Date().toISOString(),
      level: res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userId: req.session?.userId || null,
      ua: req.header("user-agent")?.slice(0, 80) || null
    });
  });

  next();
});

function extensionForUpload(file: Express.Multer.File) {
  const fromOriginal = path.extname(file.originalname || "").toLowerCase();
  if (fromOriginal && /^[.a-z0-9]+$/.test(fromOriginal)) return fromOriginal;
  const fromMime = file.mimetype.split("/")[1];
  return fromMime ? `.${fromMime.replace(/[^a-z0-9]/gi, "").toLowerCase()}` : "";
}

async function storeUpload(file: Express.Multer.File) {
  if (!supabaseUrl || !supabaseServiceRoleKey) return `/uploads/${path.basename(file.path)}`;

  const key = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extensionForUpload(file)}`;
  const bytes = await fs.promises.readFile(file.path);
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${storageBucket}/${key}`, {
    method: "POST",
    headers: {
      apikey: supabaseServiceRoleKey,
      authorization: `Bearer ${supabaseServiceRoleKey}`,
      "content-type": file.mimetype || "application/octet-stream",
      "x-upsert": "false"
    },
    body: bytes
  });

  await fs.promises.unlink(file.path).catch(() => undefined);

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Supabase upload failed (${response.status}) ${message}`.trim());
  }

  return `${supabaseUrl}/storage/v1/object/public/${storageBucket}/${key}`;
}

async function deleteStoredUpload(uploadUrl: string) {
  if (!uploadUrl) return;
  if (uploadUrl.startsWith("/uploads/")) {
    const localPath = path.resolve(uploadDir, path.basename(uploadUrl));
    await fs.promises.unlink(localPath).catch(() => undefined);
    return;
  }
  if (!supabaseUrl || !supabaseServiceRoleKey) return;
  const publicPrefix = `${supabaseUrl}/storage/v1/object/public/${storageBucket}/`;
  if (!uploadUrl.startsWith(publicPrefix)) return;
  const key = uploadUrl.slice(publicPrefix.length);
  if (!key.startsWith("uploads/")) return;
  await fetch(`${supabaseUrl}/storage/v1/object/${storageBucket}/${key}`, {
    method: "DELETE",
    headers: {
      apikey: supabaseServiceRoleKey,
      authorization: `Bearer ${supabaseServiceRoleKey}`
    }
  }).catch(() => undefined);
}

async function currentUser(userId?: string) {
  if (!userId) return null;
  const result = await q(
    `SELECT u.id,u.email,u.created_at,p.display_name,p.username,p.city,p.bio,p.avatar_url,p.rating,p.response_time_minutes,p.is_featured,p.is_fast_responder,p.account_level,p.latitude,p.longitude,
            COALESCE((SELECT array_agg(role ORDER BY role) FROM user_roles ur WHERE ur.user_id=u.id), '{}') AS roles
     FROM users u LEFT JOIN profiles p ON p.id=u.id WHERE u.id=$1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function publicProfile(userId: string) {
  const result = await q(
    `SELECT p.id,p.display_name,p.username,p.city,p.bio,p.avatar_url,p.rating,p.response_time_minutes,p.is_featured,p.is_fast_responder,
            COALESCE((SELECT array_agg(role ORDER BY role) FROM user_roles ur WHERE ur.user_id=p.id), '{}') AS roles,
            count(i.id)::int AS listing_count,
            COALESCE((SELECT count(*) FROM reviews r WHERE r.reviewee_user_id=p.id), 0)::int AS review_count
     FROM profiles p
     LEFT JOIN items i ON i.owner_id=p.id AND i.status='active'
     WHERE p.id=$1
     GROUP BY p.id`,
    [userId]
  );
  return result.rows[0] || null;
}

type CreditRuleKey = "signup_bonus" | "swap_completed" | "profile_completed" | "follow_created" | "review_submitted";

const creditRuleCatalog: Record<CreditRuleKey, { amount: number; type: string; description: string }> = {
  signup_bonus: { amount: 100, type: "activity", description: "สมัคร QXwap รับ Manu Credit เริ่มต้น" },
  swap_completed: { amount: 75, type: "activity", description: "ดีลสำเร็จ รับเครดิตเพิ่ม" },
  profile_completed: { amount: 20, type: "activity", description: "กรอกโปรไฟล์ครบ รับเครดิตเพิ่ม" },
  follow_created: { amount: 5, type: "activity", description: "ติดตามร้านใหม่ รับเครดิตเพิ่ม" },
  review_submitted: { amount: 10, type: "activity", description: "รีวิวหลังจบดีล รับเครดิตเพิ่ม" }
};

async function ensureWalletRecord(userId: string) {
  await q("INSERT INTO wallets(user_id,credit_balance) VALUES($1,0) ON CONFLICT(user_id) DO NOTHING", [userId]);
}

async function readWalletRecord(userId: string) {
  await ensureWalletRecord(userId);
  return (await q("SELECT * FROM wallets WHERE user_id=$1", [userId])).rows[0] || null;
}

async function createCreditTransaction(params: {
  userId: string;
  amount: number;
  type: string;
  description: string;
  sourceKind?: string | null;
  sourceId?: string | null;
  ruleKey?: string | null;
}) {
  const { userId, amount, type, description, sourceKind = null, sourceId = null, ruleKey = null } = params;
  await ensureWalletRecord(userId);
  if (ruleKey) {
    const existing = await q<{ id: string }>(
      "SELECT id FROM transactions WHERE user_id=$1 AND rule_key=$2 AND COALESCE(source_id,'') = COALESCE($3,'') LIMIT 1",
      [userId, ruleKey, sourceId]
    );
    if (existing.rows[0]) {
      return (await q("SELECT * FROM transactions WHERE id=$1", [existing.rows[0].id])).rows[0] || null;
    }
  }
  const wallet = await readWalletRecord(userId);
  const nextBalance = Number(wallet?.credit_balance || 0) + amount;
  if (nextBalance < 0) {
    throw new Error("เครดิตไม่เพียงพอ");
  }
  await q("UPDATE wallets SET credit_balance=$2, updated_at=now() WHERE user_id=$1", [userId, nextBalance]);
  const inserted = await q(
    `INSERT INTO transactions(user_id,amount,type,description,source_kind,source_id,rule_key)
     VALUES($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [userId, amount, type, description, sourceKind, sourceId, ruleKey]
  );
  const transaction = inserted.rows[0] || null;
  if (transaction && amount > 0 && type === "activity") {
    await createNotificationEntry(
      userId,
      "credit_earned",
      "เครดิตกิจกรรมเพิ่มแล้ว",
      `${description} +${amount} เครดิต`,
      {
        transaction_id: transaction.id,
        amount,
        source_kind: sourceKind,
        source_id: sourceId
      }
    );
  }
  return transaction;
}

async function applyCreditRule(userId: string, ruleKey: CreditRuleKey, sourceId?: string | null) {
  const rule = creditRuleCatalog[ruleKey];
  return await createCreditTransaction({
    userId,
    amount: rule.amount,
    type: rule.type,
    description: rule.description,
    sourceKind: "rule",
    sourceId: sourceId || null,
    ruleKey
  });
}

async function awardSwapCompletionCredits(offerId: string, fromUserId: string, toUserId: string) {
  await applyCreditRule(fromUserId, "swap_completed", offerId);
  await applyCreditRule(toUserId, "swap_completed", offerId);
}

const offerExpiryHours = 72;
const lockingOfferStatuses = new Set(["accepted", "scheduled", "handover_pending", "reported"]);
const terminalOfferStatuses = new Set(["completed", "rejected", "expired", "cancelled"]);
const expirableOfferStatuses = new Set(["pending", "countered"]);

async function logSwapStatus(offerId: string, actorUserId: string | null | undefined, fromStatus: string | null, toStatus: string, note?: string | null) {
  await q(
    "INSERT INTO swap_status_logs(offer_id,actor_user_id,from_status,to_status,note) VALUES($1,$2,$3,$4,$5)",
    [offerId, actorUserId || null, fromStatus, toStatus, note || null]
  );
}

function createOfferExpiryDate() {
  return new Date(Date.now() + offerExpiryHours * 60 * 60 * 1000);
}

function offerInboxTabForUser(offer: { from_user_id: string; to_user_id: string }, userId: string) {
  return offer.from_user_id === userId ? "sent" : "received";
}

async function createNotificationEntry(userId: string, type: string, title: string, body: string, data: Record<string, unknown> = {}) {
  await q(
    "INSERT INTO notifications(user_id,type,title,body,data) VALUES($1,$2,$3,$4,$5)",
    [userId, type, title, body, data]
  );
}

type ChatMessageType = "user" | "system";

async function touchConversation(conversationId: string) {
  await q("UPDATE chat_conversations SET updated_at=now() WHERE id=$1", [conversationId]);
}

async function markConversationRead(conversationId: string, userId: string) {
  await q("UPDATE chat_participants SET last_read_at=now() WHERE conversation_id=$1 AND user_id=$2", [conversationId, userId]);
}

async function markMessageNotificationsRead(userId: string, conversationId: string) {
  await q(
    "UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL AND type='new_message' AND COALESCE(data->>'conversation_id','')=$2",
    [userId, conversationId]
  );
}

async function listConversationParticipants(conversationId: string) {
  return (await q<{ user_id: string }>(
    "SELECT user_id FROM chat_participants WHERE conversation_id=$1 ORDER BY user_id ASC",
    [conversationId]
  )).rows.map((entry) => entry.user_id);
}

async function appendConversationMessage(params: {
  conversationId: string;
  senderId?: string | null;
  text: string;
  messageType?: ChatMessageType;
  metadata?: Record<string, unknown>;
}) {
  const inserted = await q(
    `INSERT INTO chat_messages(conversation_id,sender_id,text,message_type,metadata)
     VALUES($1,$2,$3,$4,$5::jsonb)
     RETURNING *`,
    [
      params.conversationId,
      params.senderId || null,
      params.text,
      params.messageType || "user",
      JSON.stringify(params.metadata || {})
    ]
  );
  await touchConversation(params.conversationId);
  if (params.senderId) {
    await markConversationRead(params.conversationId, params.senderId);
  }
  return inserted.rows[0] || null;
}

async function appendOfferSystemMessage(offerId: string, text: string, metadata: Record<string, unknown> = {}) {
  const row = await getOfferRow(offerId);
  if (!row) return null;
  const conversationId = await ensureConversation(offerId, row.from_user_id, row.to_user_id);
  return await appendConversationMessage({
    conversationId,
    text,
    messageType: "system",
    metadata: { offer_id: offerId, ...metadata }
  });
}

async function notifyConversationRecipients(conversationId: string, senderUserId: string, text: string) {
  const sender = await currentUser(senderUserId);
  const access = await q<{ offer_id: string | null; item_id: string | null }>(
    "SELECT offer_id,item_id FROM chat_conversations WHERE id=$1 LIMIT 1",
    [conversationId]
  );
  const conversation = access.rows[0] || null;
  const participants = await listConversationParticipants(conversationId);
  const preview = text.trim().slice(0, 140);
  await Promise.all(
    participants
      .filter((userId) => userId !== senderUserId)
      .map((userId) =>
        createNotificationEntry(
          userId,
          "new_message",
          `${sender?.display_name || sender?.username || "คู่ดีล"} ส่งข้อความใหม่`,
          preview || "เปิดห้องแชทเพื่ออ่านข้อความล่าสุด",
          {
            conversation_id: conversationId,
            offer_id: conversation?.offer_id || null,
            item_id: conversation?.item_id || null,
            sender_user_id: senderUserId
          }
        )
      )
  );
}

async function getOfferRow(offerId: string) {
  return (await q<any>("SELECT * FROM offers WHERE id=$1 LIMIT 1", [offerId])).rows[0] || null;
}

async function getOfferItemIds(offerId: string) {
  const rows = await q<{ item_id: string }>("SELECT item_id FROM offer_items WHERE offer_id=$1 ORDER BY created_at ASC", [offerId]);
  return rows.rows.map((entry) => entry.item_id);
}

async function recomputeOfferItemAvailability(itemIds: string[]) {
  const uniqueItemIds = [...new Set(itemIds.filter(Boolean))];
  for (const itemId of uniqueItemIds) {
    const item = await q<{ status: string }>("SELECT status FROM items WHERE id=$1 LIMIT 1", [itemId]);
    const currentStatus = String(item.rows[0]?.status || "");
    if (!currentStatus || currentStatus === "swapped" || currentStatus === "inactive") continue;
    const lock = await q(
      `SELECT 1
       FROM offers o
       LEFT JOIN offer_items oi ON oi.offer_id=o.id
       WHERE o.status = ANY($2::text[])
         AND (o.target_item_id=$1 OR oi.item_id=$1)
       LIMIT 1`,
      [itemId, [...lockingOfferStatuses]]
    );
    const nextStatus = lock.rows[0] ? "pending_swap" : "active";
    if (currentStatus !== nextStatus) {
      await q("UPDATE items SET status=$2, updated_at=now() WHERE id=$1", [itemId, nextStatus]);
    }
  }
}

async function ensureOfferItemsAreSwappable(offerId: string, targetItemId: string) {
  const itemIds = [targetItemId, ...(await getOfferItemIds(offerId))];
  if (!itemIds.length) return;
  const statusRows = await q<{ id: string; status: string; owner_id: string }>(
    "SELECT id,status,owner_id FROM items WHERE id::text = ANY($1::text[])",
    [itemIds]
  );
  const byId = new Map(statusRows.rows.map((row) => [row.id, row]));
  for (const itemId of itemIds) {
    const row = byId.get(itemId);
    if (!row) throw new Error("INVALID_SWAP_ITEMS");
    if ((row.status || "active") !== "active") {
      const message = row.status === "swapped"
        ? "มีสินค้าบางชิ้นถูกแลกไปแล้ว"
        : row.status === "inactive"
          ? "มีสินค้าบางชิ้นถูกปิดประกาศแล้ว"
          : "มีสินค้าบางชิ้นไม่พร้อมเริ่มดีลใหม่";
      const error = new Error(message);
      (error as Error & { code?: string }).code = "ITEM_UNAVAILABLE";
      throw error;
    }
  }
}

async function expireOfferIfNeeded(row: any) {
  if (!row || !expirableOfferStatuses.has(String(row.status || "")) || !row.expires_at) return row;
  const expiresAt = new Date(row.expires_at);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() > Date.now()) return row;
  await q(
    "UPDATE offers SET status='expired', rejection_reason=COALESCE(rejection_reason,'no_response'), updated_at=now() WHERE id=$1 AND status=$2",
    [row.id, row.status]
  );
  await logSwapStatus(row.id, null, row.status, "expired", "no_response");
  await recomputeOfferItemAvailability([row.target_item_id, ...(await getOfferItemIds(row.id))]);
  await createNotificationEntry(
    row.from_user_id,
    "offer_status",
    "ข้อเสนอหมดเวลาแล้ว",
    "ข้อเสนอนี้ไม่ได้รับการตอบกลับภายในเวลาที่กำหนด",
    { offer_id: row.id, status: "expired", inbox_tab: "sent" }
  );
  await createNotificationEntry(
    row.to_user_id,
    "offer_status",
    "คำขอแลกหมดเวลาแล้ว",
    "ระบบปิดคำขอนี้ให้โดยอัตโนมัติ เพราะไม่มีการตอบกลับภายในเวลาที่กำหนด",
    { offer_id: row.id, status: "expired", inbox_tab: "received" }
  );
  await appendOfferSystemMessage(row.id, "คำขอแลกนี้หมดเวลาแล้ว", { status: "expired", note: "no_response" });
  return await getOfferRow(row.id);
}

type ListReq = Pick<Request, "query" | "session">;
type ItemPage = {
  items: ReturnType<typeof rowItem>[];
  page: {
    limit: number;
    offset: number;
    has_more: boolean;
    next_offset: number | null;
  };
};

function rowItem(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    category: row.category || "Other",
    condition: row.condition || "Good",
    status: row.status || "active",
    is_featured: Boolean(row.is_featured),
    is_fast_responder: Boolean(row.is_fast_responder),
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner: {
      id: row.owner_id,
      name: row.owner_name || "QXwap user",
      avatar_url: row.owner_avatar || "",
      rating: Number(row.owner_rating || 0),
      account_level: row.owner_account_level == null ? undefined : Number(row.owner_account_level)
    },
    media: {
      images: row.images ? row.images.filter(Boolean) : []
    },
    deal: {
      type: row.deal_type,
      price_cash: Number(row.price_cash || 0),
      price_cash_unknown: Boolean(row.price_cash_unknown),
      price_credit: Number(row.price_credit || 0),
      open_to_offers: Boolean(row.open_to_offers)
    },
    wanted: {
      text: row.wanted_text || "",
      tags: row.wanted_tags || []
    },
    location: {
      label: row.location_label || "",
      latitude: row.latitude,
      longitude: row.longitude,
      distance_km: row.distance_km == null ? null : Number(row.distance_km),
      maps_url:
        row.latitude != null && row.longitude != null
          ? `https://www.google.com/maps/search/?api=1&query=${row.latitude},${row.longitude}`
          : row.location_label
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.location_label)}`
            : ""
    },
    stats: {
      requests: Number(row.request_count || 0),
      views: Number(row.view_count || 0)
    },
    trade: {
      count: Number(row.trade_count || 0),
      history: [] as Array<any>
    },
    viewer: {
      is_owner: Boolean(row.is_owner),
      is_bookmarked: Boolean(row.is_bookmarked)
    }
  };
}

async function readItemsForViewer(itemIds: string[], viewerId?: string | null) {
  if (!itemIds.length) return [];
  const me = viewerId || null;
  const rows = await q(
    `SELECT i.*, p.display_name owner_name, p.avatar_url owner_avatar, p.rating owner_rating, p.is_featured, p.is_fast_responder, p.account_level owner_account_level,
            COALESCE((SELECT count(*) FROM item_owner_history h WHERE h.item_id=i.id), 0) AS trade_count,
            COALESCE(array_agg(img.url ORDER BY img.sort_order) FILTER (WHERE img.url IS NOT NULL), '{}') AS images,
            (i.owner_id=$2) AS is_owner,
            EXISTS(SELECT 1 FROM bookmarks b WHERE b.user_id=$2 AND b.item_id=i.id) AS is_bookmarked
     FROM items i
     LEFT JOIN profiles p ON p.id=i.owner_id
     LEFT JOIN item_images img ON img.item_id=i.id
     WHERE i.id::text = ANY($1::text[])
     GROUP BY i.id,p.display_name,p.avatar_url,p.rating,p.is_featured,p.is_fast_responder,p.account_level`,
    [itemIds, me]
  );
  const byId = new Map(rows.rows.map((row) => [row.id, rowItem(row)]));
  return itemIds.map((id) => byId.get(id)).filter(Boolean);
}

async function readTradeHistory(itemId: string) {
  const history = await q<{
    id: string;
    offer_id: string | null;
    previous_owner_id: string | null;
    previous_owner_name: string | null;
    new_owner_id: string | null;
    new_owner_name: string | null;
    created_at: string;
    status: string;
  }>(
    `SELECT h.id,h.offer_id,h.previous_owner_id,h.new_owner_id,h.created_at,h.status,
            prev.display_name AS previous_owner_name,
            next.display_name AS new_owner_name
     FROM item_owner_history h
     LEFT JOIN profiles prev ON prev.id=h.previous_owner_id
     LEFT JOIN profiles next ON next.id=h.new_owner_id
     WHERE h.item_id=$1
     ORDER BY h.created_at DESC`,
    [itemId]
  );

  const entries = [];
  for (const row of history.rows) {
    const counterpartRows = row.offer_id
      ? await q<{ id: string; title: string }>(
          `SELECT i.id,i.title
           FROM (
             SELECT target_item_id AS item_id FROM offers WHERE id=$1
             UNION
             SELECT item_id FROM offer_items WHERE offer_id=$1
           ) offer_items_union
           JOIN items i ON i.id=offer_items_union.item_id
           WHERE i.id <> $2`,
          [row.offer_id, itemId]
        )
      : { rows: [] };
    entries.push({
      ...row,
      counterpart_items: counterpartRows.rows
    });
  }
  return entries;
}

function rowWantedItem(row: any) {
  return {
    id: row.id,
    owner_id: row.owner_id,
    source_item_id: row.source_item_id || null,
    title: row.title,
    description: row.description || "",
    category: row.category || "Other",
    deal_type: row.deal_type || "buy",
    wanted_text: row.wanted_text || "",
    wanted_tags: row.wanted_tags || [],
    reference_images: row.reference_images || [],
    urgency: row.urgency || "normal",
    location_label: row.location_label || "",
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status || "active",
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner: row.owner_id
      ? {
          id: row.owner_id,
          display_name: row.owner_name || "QXwap user",
          username: row.owner_username || undefined,
          avatar_url: row.owner_avatar || "",
          rating: Number(row.owner_rating || 0),
          city: row.owner_city || undefined,
          account_level: row.owner_account_level == null ? undefined : Number(row.owner_account_level)
        }
      : null
  };
}

async function listWantedItems(req: ListReq) {
  const params: unknown[] = [];
  const where: string[] = [];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const limitValue = Math.max(1, Math.min(Number(req.query.limit || 20) || 20, 40));
  const ownerId = req.query.owner_id ? String(req.query.owner_id) : "";
  const includeInactive =
    req.query.include_inactive === "true" &&
    Boolean(req.session.userId) &&
    Boolean(ownerId) &&
    ownerId === req.session.userId;
  const requestedStatus = String(req.query.status || "").trim();
  if (ownerId) where.push(`w.owner_id=${add(ownerId)}`);
  if (!includeInactive) {
    if (requestedStatus && requestedStatus !== "any") where.push(`w.status=${add(requestedStatus)}`);
    else where.push("w.status='active'");
  } else if (requestedStatus && requestedStatus !== "any") {
    where.push(`w.status=${add(requestedStatus)}`);
  }
  if (req.query.q) {
    const search = `%${String(req.query.q).trim()}%`;
    const key = add(search);
    where.push(`(w.title ILIKE ${key} OR w.description ILIKE ${key} OR w.wanted_text ILIKE ${key} OR EXISTS (SELECT 1 FROM unnest(w.wanted_tags) tag WHERE tag ILIKE ${key}))`);
  }
  if (req.query.category) where.push(`w.category=${add(String(req.query.category))}`);
  if (req.query.following === "true" && req.session.userId) {
    where.push(`EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=${add(req.session.userId)} AND f.following_id=w.owner_id)`);
  }
  const rows = await q(
    `SELECT w.*, p.display_name AS owner_name, p.username AS owner_username, p.avatar_url AS owner_avatar, p.rating AS owner_rating, p.city AS owner_city, p.account_level AS owner_account_level
     FROM wanted_items w
     LEFT JOIN profiles p ON p.id = w.owner_id
     WHERE ${where.length ? where.join(" AND ") : "true"}
     ORDER BY w.created_at DESC
     LIMIT ${add(limitValue)}`,
    params
  );
  return rows.rows.map(rowWantedItem);
}

async function listItems(req: ListReq, ownerOverride?: string): Promise<ItemPage> {
  const viewerLocation =
    req.session.userId
      ? (
          await q<{ latitude: number | null; longitude: number | null }>(
            "SELECT latitude,longitude FROM profiles WHERE id=$1",
            [req.session.userId]
          )
        ).rows[0]
      : null;
  const requestLatitude = asNumber(req.query.latitude) ?? asNumber(viewerLocation?.latitude);
  const requestLongitude = asNumber(req.query.longitude) ?? asNumber(viewerLocation?.longitude);
  const nearbyRadiusKm = asNumber(req.query.nearby_radius_km);
  const hasLocationContext = requestLatitude != null && requestLongitude != null;
  const p: unknown[] = [];
  const where: string[] = [];
  const add = (value: unknown) => {
    p.push(value);
    return `$${p.length}`;
  };
  const limitValue = Math.max(1, Math.min(Number(req.query.limit || 20) || 20, 40));
  const offsetValue = Math.max(0, Number(req.query.offset || 0) || 0);
  const me = add(req.session.userId || null);
  const effectiveOwnerId = String(ownerOverride || req.query.owner_id || "").trim();
  const includeInactive =
    req.query.include_inactive === "true" &&
    Boolean(req.session.userId) &&
    Boolean(effectiveOwnerId) &&
    effectiveOwnerId === req.session.userId;
  const requestedStatus = String(req.query.status || "").trim();
  if (effectiveOwnerId) where.push(`i.owner_id=${add(effectiveOwnerId)}`);
  if (!includeInactive) {
    if (requestedStatus && requestedStatus !== "any") where.push(`i.status=${add(requestedStatus)}`);
    else where.push("i.status='active'");
  } else if (requestedStatus && requestedStatus !== "any") {
    where.push(`i.status=${add(requestedStatus)}`);
  }
  if (req.query.q) {
    const v = `%${String(req.query.q).trim()}%`;
    const ix = add(v);
    where.push(`(i.title ILIKE ${ix} OR i.description ILIKE ${ix} OR i.wanted_text ILIKE ${ix} OR i.location_label ILIKE ${ix} OR EXISTS (SELECT 1 FROM unnest(i.wanted_tags) tag WHERE tag ILIKE ${ix}))`);
  }
  if (req.query.category) where.push(`i.category=${add(req.query.category)}`);
  if (req.query.condition) where.push(`i.condition=${add(req.query.condition)}`);
  if (req.query.deal_type) where.push(`i.deal_type=${add(req.query.deal_type)}`);
  if (req.query.wanted_tag) {
    const normalizedTag = normalizeHashtag(String(req.query.wanted_tag));
    if (normalizedTag) {
      where.push(`EXISTS (SELECT 1 FROM unnest(i.wanted_tags) tag WHERE tag ILIKE ${add(`%${normalizedTag}%`)})`);
    }
  }
  if (req.query.location_label) where.push(`i.location_label ILIKE ${add(`%${String(req.query.location_label).trim()}%`)}`);
  if (req.query.open_to_offers === "true") where.push("i.open_to_offers=true");
  if (req.query.min_price) where.push(`((COALESCE(i.price_cash_unknown,false)=false AND i.price_cash >= ${add(Number(req.query.min_price))}) OR i.open_to_offers=true)`);
  if (req.query.max_price) where.push(`((COALESCE(i.price_cash_unknown,false)=false AND i.price_cash <= ${add(Number(req.query.max_price))}) OR i.open_to_offers=true)`);
  if (req.query.fast_responder === "true") where.push("p.is_fast_responder=true");
  if (req.query.featured === "true") where.push("p.is_featured=true");
  if (req.query.following === "true" && req.session.userId) where.push(`EXISTS (SELECT 1 FROM follows f WHERE f.follower_id=${add(req.session.userId)} AND f.following_id=i.owner_id)`);
  if (req.query.bookmarked === "true" && req.session.userId) where.push(`EXISTS(SELECT 1 FROM bookmarks b WHERE b.user_id=${me} AND b.item_id=i.id)`);
  const distanceSql =
    hasLocationContext
      ? `(6371 * acos(
          least(1, greatest(-1,
            cos(radians(${add(requestLatitude)})) * cos(radians(COALESCE(i.latitude, ${add(requestLatitude)}))) *
            cos(radians(COALESCE(i.longitude, ${add(requestLongitude)})) - radians(${add(requestLongitude)})) +
            sin(radians(${add(requestLatitude)})) * sin(radians(COALESCE(i.latitude, ${add(requestLatitude)})))
          ))
        ))`
      : "NULL";
  if (nearbyRadiusKm != null && hasLocationContext) {
    where.push(`i.latitude IS NOT NULL AND i.longitude IS NOT NULL AND ${distanceSql} <= ${add(nearbyRadiusKm)}`);
  }
  const sort = String(req.query.sort || "newest");
  const order =
    sort === "ai" ? `(
      CASE WHEN p.is_fast_responder THEN 18 ELSE 0 END +
      CASE WHEN p.is_featured THEN 10 ELSE 0 END +
      COALESCE(i.request_count, 0) * 5 +
      COALESCE(i.view_count, 0) +
      CASE
        WHEN ${me} IS NOT NULL AND EXISTS(
          SELECT 1 FROM follows f
          WHERE f.follower_id=${me} AND f.following_id=i.owner_id
        ) THEN 35
        ELSE 0
      END +
      CASE
        WHEN ${me} IS NOT NULL AND EXISTS(
          SELECT 1
          FROM bookmarks b
          JOIN items bi ON bi.id=b.item_id
          WHERE b.user_id=${me}
            AND (
              bi.category=i.category OR
              EXISTS (
                SELECT 1
                FROM unnest(bi.wanted_tags) bt
                WHERE bt = ANY(i.wanted_tags)
              )
            )
        ) THEN 28
        ELSE 0
      END +
      CASE
        WHEN ${me} IS NOT NULL AND EXISTS(
          SELECT 1
          FROM item_views iv
          JOIN items vi ON vi.id=iv.item_id
          WHERE iv.user_id=${me}
            AND iv.created_at >= now() - interval '30 days'
            AND (
              vi.category=i.category OR
              EXISTS (
                SELECT 1
                FROM unnest(vi.wanted_tags) vt
                WHERE vt = ANY(i.wanted_tags)
              )
            )
        ) THEN 24
        ELSE 0
      END +
      CASE
        WHEN ${hasLocationContext ? `${distanceSql} <= 12` : "false"} THEN 16
        WHEN ${hasLocationContext ? `${distanceSql} <= 30` : "false"} THEN 8
        ELSE 0
      END +
      CASE WHEN i.open_to_offers THEN 12 ELSE 0 END +
      CASE WHEN i.owner_id=${me} THEN -1000 ELSE 0 END
    ) DESC, i.created_at DESC` :
    sort === "nearby" && hasLocationContext ? `${distanceSql} ASC NULLS LAST, i.created_at DESC` :
    sort === "price_asc" ? "(CASE WHEN COALESCE(i.price_cash_unknown,false) THEN NULL ELSE i.price_cash END) ASC NULLS LAST" :
    sort === "price_desc" ? "(CASE WHEN COALESCE(i.price_cash_unknown,false) THEN NULL ELSE i.price_cash END) DESC NULLS LAST" :
    sort === "most_requested" ? "i.request_count DESC" :
    sort === "fast_responder" ? "p.response_time_minutes ASC NULLS LAST" :
    "i.created_at DESC";
  const result = await q(
    `SELECT i.*, p.display_name owner_name, p.avatar_url owner_avatar, p.rating owner_rating, p.is_featured, p.is_fast_responder, p.account_level owner_account_level,
      ${distanceSql} AS distance_km,
      COALESCE((SELECT count(*) FROM item_owner_history h WHERE h.item_id=i.id), 0) AS trade_count,
      COALESCE(array_agg(img.url ORDER BY img.sort_order) FILTER (WHERE img.url IS NOT NULL), '{}') AS images,
      (i.owner_id=${me}) AS is_owner,
      EXISTS(SELECT 1 FROM bookmarks b WHERE b.user_id=${me} AND b.item_id=i.id) AS is_bookmarked
     FROM items i
     LEFT JOIN profiles p ON p.id=i.owner_id
     LEFT JOIN item_images img ON img.item_id=i.id
     WHERE ${where.join(" AND ")}
     GROUP BY i.id,p.display_name,p.avatar_url,p.rating,p.is_featured,p.is_fast_responder,p.account_level
     ORDER BY ${order}
     LIMIT ${add(limitValue + 1)}
     OFFSET ${add(offsetValue)}`,
    p
  );
  const hasMore = result.rows.length > limitValue;
  const rows = hasMore ? result.rows.slice(0, limitValue) : result.rows;
  return {
    items: rows.map(rowItem),
    page: {
      limit: limitValue,
      offset: offsetValue,
      has_more: hasMore,
      next_offset: hasMore ? offsetValue + limitValue : null
    }
  };
}

// Build/version metadata, captured once at boot. Set in CI via env or fall
// back to "dev" so the endpoint always works. Use this to confirm a deploy
// actually picked up a given commit: `curl /api/version` from prod.
const buildInfo = {
  commit: (process.env.GIT_COMMIT_SHA || process.env.RENDER_GIT_COMMIT || process.env.GITHUB_SHA || "dev").slice(0, 40),
  branch: process.env.GIT_BRANCH || process.env.RENDER_GIT_BRANCH || process.env.GITHUB_REF_NAME || "unknown",
  builtAt: process.env.BUILD_TIME || new Date().toISOString(),
  node: process.version,
  env: process.env.NODE_ENV || "development",
  startedAt: new Date().toISOString()
};

app.get("/api/health", asyncRoute(async (_req, res) => {
  const dbNow = await q<{ now: string }>("SELECT now()::text AS now");
  const tableResult = await q<{ count: string }>(
    "SELECT count(*)::text AS count FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1)",
    [requiredTables]
  );
  const itemCount = await q<{ count: string }>("SELECT count(*)::text AS count FROM items");
  res.json({
    ok: true,
    name: "QXwap API",
    database: "connected",
    db_time: dbNow.rows[0]?.now,
    required_tables: Number(tableResult.rows[0]?.count || 0),
    required_tables_expected: requiredTables.length,
    items: Number(itemCount.rows[0]?.count || 0),
    time: new Date().toISOString()
  });
}));

app.get("/api/version", (_req, res) => res.json(buildInfo));

app.get("/api/auth/me", asyncRoute(async (req, res) => res.json({ user: await currentUser(req.session.userId) })));
app.post("/api/auth/signup", rateLimit("signup", 5, 60_000), asyncRoute(async (req, res) => {
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    display_name: z.string().trim().min(1).max(80).optional()
  }).parse(req.body);
  const email = body.email.toLowerCase();
  const existing = await q<{ id: string }>("SELECT id FROM users WHERE email=$1", [email]);
  if (existing.rows[0]) {
    return res.status(409).json({ error: "EMAIL_EXISTS", message: "อีเมลนี้ถูกใช้งานแล้ว" });
  }
  const hash = await bcrypt.hash(body.password, 10);
  const user = await q<{ id: string }>("INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id", [email, hash]);
  const displayName = body.display_name || email.split("@")[0];
  await q("INSERT INTO profiles(id,display_name,username,avatar_url) VALUES($1,$2,$3,$4)", [user.rows[0].id, displayName, `user_${user.rows[0].id.slice(0, 8)}`, `https://api.dicebear.com/9.x/thumbs/svg?seed=${email}`]);
  await ensureWalletRecord(user.rows[0].id);
  await applyCreditRule(user.rows[0].id, "signup_bonus", user.rows[0].id);
  req.session.userId = user.rows[0].id;
  res.status(201).json({ user: await currentUser(req.session.userId) });
}));
// Precomputed dummy password hash (cost 10, same as real signups). When the
// signin email does not exist we still run bcrypt.compare against this hash
// so the response time does not leak email existence to a timing attacker.
// Generated once at module load (~100ms boot cost, run before app.listen).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("__qxwap_signin_dummy__", 10);

app.post("/api/auth/signin", rateLimit("signin", 10, 60_000), asyncRoute(async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
  const user = await q<{ id: string; password_hash: string }>("SELECT id,password_hash FROM users WHERE email=$1", [body.email.toLowerCase()]);
  const row = user.rows[0];
  const hashToCheck = row?.password_hash || DUMMY_PASSWORD_HASH;
  const passwordOk = await bcrypt.compare(body.password, hashToCheck);
  if (!row || !passwordOk) {
    return res.status(401).json({ error: "INVALID_LOGIN", message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
  }
  req.session.userId = row.id;
  res.json({ user: await currentUser(req.session.userId) });
}));
app.post("/api/auth/signout", (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.delete("/api/auth/account", requireAuth, asyncRoute(async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "AUTH_REQUIRED", message: "กรุณาเข้าสู่ระบบก่อน" });
  await q("DELETE FROM user_sessions WHERE sid=$1 OR sess->>'userId'=$2", [req.sessionID, userId]);
  await q("DELETE FROM users WHERE id=$1", [userId]);
  req.session.destroy(() => undefined);
  res.json({ ok: true });
}));
app.get("/api/auth/replit/login", (_req, res) => res.status(501).json({ error: "NOT_ENABLED", message: "Replit login is optional and not configured." }));

app.get("/api/profiles/me", requireAuth, asyncRoute(async (req, res) => res.json({ profile: await currentUser(req.session.userId) })));
app.patch("/api/profiles/me", requireAuth, asyncRoute(async (req, res) => {
  const body = z.object({ display_name: z.string().optional(), username: z.string().optional(), city: z.string().optional(), bio: z.string().optional(), avatar_url: z.string().optional(), latitude: z.number().optional(), longitude: z.number().optional() }).parse(req.body);
  await q(
    `UPDATE profiles SET display_name=COALESCE($2,display_name), username=COALESCE($3,username), city=COALESCE($4,city), bio=COALESCE($5,bio), avatar_url=COALESCE($6,avatar_url), latitude=COALESCE($7,latitude), longitude=COALESCE($8,longitude), updated_at=now() WHERE id=$1`,
    [req.session.userId, body.display_name, body.username, body.city, body.bio, body.avatar_url, body.latitude, body.longitude]
  );
  res.json({ profile: await currentUser(req.session.userId) });
}));
app.get("/api/profiles", asyncRoute(async (req, res) => {
  const qText = String(req.query.q || "").trim();
  const params: unknown[] = [];
  let where = "";
  if (qText) {
    params.push(`%${qText.toLowerCase()}%`);
    where = "WHERE lower(coalesce(p.display_name,'')) LIKE $1 OR lower(coalesce(p.username,'')) LIKE $1 OR lower(coalesce(p.city,'')) LIKE $1";
  }
  const profiles = await q(
    `SELECT p.id,p.display_name,p.username,p.city,p.bio,p.avatar_url,p.rating,p.response_time_minutes,p.is_featured,p.is_fast_responder,
            count(i.id)::int AS listing_count
     FROM profiles p
     LEFT JOIN items i ON i.owner_id=p.id AND i.status='active'
     ${where}
     GROUP BY p.id
     ORDER BY p.is_featured DESC,p.is_fast_responder DESC,p.updated_at DESC
     LIMIT 30`,
    params
  );
  res.json({ profiles: profiles.rows });
}));
app.get("/api/profiles/:id", asyncRoute(async (req, res) => res.json({ profile: await publicProfile(String(req.params.id)) })));

app.get("/api/location/search", asyncRoute(async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (!query) return res.json({ locations: [] });
  if (googleMapsApiKey) {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("language", "th");
    url.searchParams.set("region", "th");
    url.searchParams.set("key", googleMapsApiKey);
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));
    const locations = Array.isArray(data.results)
      ? data.results.slice(0, 6).map((result: any) => ({
          label: result.formatted_address,
          latitude: result.geometry?.location?.lat ?? null,
          longitude: result.geometry?.location?.lng ?? null
        }))
      : [];
    return res.json({ provider: "google_maps", locations });
  }
  const local = await q<{ label: string; latitude: number | null; longitude: number | null }>(
    `SELECT DISTINCT location_label AS label, latitude, longitude
     FROM items
     WHERE location_label ILIKE $1
     ORDER BY location_label ASC
     LIMIT 6`,
    [`%${query}%`]
  );
  res.json({ provider: "local", locations: local.rows });
}));

app.get("/api/hashtags/trending", asyncRoute(async (req, res) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit || 10) || 10, 20));
  const tags = await q<{ tag: string; item_count: number; created_today: number }>(
    `SELECT tag,
            count(*)::int AS item_count,
            count(*) FILTER (WHERE i.created_at::date = CURRENT_DATE)::int AS created_today
     FROM items i,
          unnest(i.wanted_tags) AS tag
     WHERE i.status='active'
     GROUP BY tag
     ORDER BY created_today DESC, item_count DESC, tag ASC
     LIMIT $1`,
    [limit]
  );
  res.json({
    hashtags: tags.rows.map((row) => ({
      tag: row.tag,
      label: `#${row.tag}`,
      item_count: Number(row.item_count || 0),
      created_today: Number(row.created_today || 0)
    }))
  });
}));

app.get("/api/hashtags/suggest", asyncRoute(async (req, res) => {
  const query = normalizeHashtag(String(req.query.q || ""));
  const limit = Math.max(1, Math.min(Number(req.query.limit || 10) || 10, 20));
  const params: unknown[] = [limit];
  const where = query ? "AND tag ILIKE $2" : "";
  if (query) params.push(`${query}%`);
  const tags = await q<{ tag: string; item_count: number }>(
    `SELECT tag, count(*)::int AS item_count
     FROM items i,
          unnest(i.wanted_tags) AS tag
     WHERE i.status='active' ${where}
     GROUP BY tag
     ORDER BY item_count DESC, tag ASC
     LIMIT $1`,
    params
  );
  res.json({
    hashtags: tags.rows.map((row) => ({
      tag: row.tag,
      label: `#${row.tag}`,
      item_count: Number(row.item_count || 0)
    }))
  });
}));

app.get("/api/banners", asyncRoute(async (_req, res) => {
  const banners = await q(
    `SELECT b.id,b.title,b.image_url,b.sort_order,b.target_type,b.target_value,b.campaign_id,
            c.title AS campaign_title,c.summary AS campaign_summary
     FROM banners b
     LEFT JOIN campaigns c ON c.id=b.campaign_id
     WHERE b.is_active=true
     ORDER BY b.sort_order ASC, b.created_at DESC`
  );
  res.json({ banners: banners.rows });
}));

app.get("/api/campaigns/:id", asyncRoute(async (req, res) => {
  const campaign = await q(
    `SELECT id,slug,title,summary,body,hero_image_url,cta_label,cta_target_type,cta_target_value
     FROM campaigns
     WHERE is_active=true AND (id::text=$1 OR slug=$1)
     LIMIT 1`,
    [req.params.id]
  );
  if (!campaign.rows[0]) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบแคมเปญ" });
  res.json({ campaign: campaign.rows[0] });
}));

app.get("/api/items", asyncRoute(async (req, res) => {
  const data = await listItems(req);
  res.json(data);
}));
app.get("/api/feed", asyncRoute(async (req, res) => {
  const data = await listItems({ query: { ...req.query, sort: "ai" }, session: req.session });
  res.json(data);
}));
app.get("/api/feed/posts", asyncRoute(async (req, res) => {
  const params: unknown[] = [];
  const where = ["fp.visibility='public'"];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const limit = Math.max(1, Math.min(Number(req.query.limit || 30) || 30, 60));
  const offset = Math.max(0, Number(req.query.offset || 0) || 0);
  if (req.query.following === "true" && req.session.userId) {
    where.push(`EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=${add(req.session.userId)} AND f.following_id=fp.actor_user_id)`);
  }
  const posts = await q(
    `SELECT fp.*, p.display_name AS actor_name, p.username AS actor_username, p.avatar_url AS actor_avatar, p.rating AS actor_rating, p.account_level AS actor_account_level
     FROM feed_posts fp
     LEFT JOIN profiles p ON p.id = fp.actor_user_id
     WHERE ${where.join(" AND ")}
     ORDER BY fp.created_at DESC
     LIMIT ${add(limit)}
     OFFSET ${add(offset)}`,
    params
  );
  res.json({ posts: posts.rows });
}));
app.get("/api/items/:id", asyncRoute(async (req, res) => {
  const itemId = String(req.params.id);
  const [item] = await readItemsForViewer([itemId], req.session.userId);
  if (!item) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบสินค้า" });
  await q("UPDATE items SET view_count=view_count+1 WHERE id=$1", [itemId]);
  if (req.session.userId) {
    await q("INSERT INTO item_views(user_id,item_id) VALUES($1,$2)", [req.session.userId, itemId]);
  }
  item.trade = {
    count: Number(item.trade?.count || 0),
    history: await readTradeHistory(item.id)
  };
  const related = (await listItems({
    query: { category: item.category, wanted_tag: item.wanted.tags[0] || "", limit: "24" },
    session: req.session
  })).items.filter((x: any) => x.id !== item.id).slice(0, 6);
  res.json({ item, related });
}));
const itemPayloadSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  category: z.string().optional(),
  condition: z.string().optional(),
  deal_type: z.enum(["swap", "sell", "buy", "both"]),
  status: z.enum(["active", "inactive", "pending_swap", "swapped"]).optional(),
  price_cash: z.number().int().min(0).optional(),
  price_cash_unknown: z.boolean().optional(),
  price_credit: z.number().int().min(0).optional(),
  open_to_offers: z.boolean().optional(),
  wanted_text: z.string().optional(),
  wanted_tags: z.array(z.string()).optional(),
  location_label: z.string().optional(),
  latitude: z.number().finite().nullable().optional(),
  longitude: z.number().finite().nullable().optional(),
  images: z.array(z.string()).max(maxProductImages).optional()
}).superRefine((value, ctx) => {
  const needsCashDecision = value.deal_type === "sell" || value.deal_type === "both";
  const cashAmount = Number(value.price_cash || 0);
  if (needsCashDecision && !Boolean(value.price_cash_unknown) && cashAmount <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["price_cash"],
      message: "กรอกราคาเงินสดหรือเลือกไม่ทราบราคา"
    });
  }
});

async function readItemForOwner(ownerId: string, itemId: string, sessionUserId?: string | null) {
  return (
    await listItems({
      query: { owner_id: ownerId, include_inactive: "true", limit: "40" },
      session: { userId: sessionUserId || ownerId } as Request["session"]
    })
  ).items.find((x: any) => x.id === itemId) || null;
}

app.post("/api/items", requireAuth, asyncRoute(async (req, res) => {
  const body = itemPayloadSchema.parse(req.body);
  const idempotencyKey = String(req.get("x-idempotency-key") || "").trim();
  const dedupeKey = /^[a-zA-Z0-9._:-]{8,200}$/.test(idempotencyKey) ? `${req.session.userId}:${idempotencyKey}` : "";
  if (dedupeKey) {
    const recent = recentItemCreates.get(dedupeKey);
    if (recent) return res.status(200).json({ item: recent.item });
    const pending = pendingItemCreates.get(dedupeKey);
    if (pending) return res.status(200).json({ item: await pending });
  }
  const images = normalizeImageUrls(body.images);
  const wantedTags = normalizeHashtags(body.wanted_tags);
  const createItem = (async () => {
    const result = await q<{ id: string }>(
      `INSERT INTO items(owner_id,title,description,category,condition,deal_type,status,price_cash,price_cash_unknown,price_credit,open_to_offers,wanted_text,wanted_tags,location_label,latitude,longitude)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [
        req.session.userId,
        body.title,
        body.description || "",
        body.category || "Other",
        body.condition || "Good",
        body.deal_type,
        body.status || "active",
        body.price_cash || 0,
        Boolean(body.price_cash_unknown),
        body.price_credit || 0,
        Boolean(body.open_to_offers),
        body.wanted_text || "",
        wantedTags,
        body.location_label || "",
        body.latitude ?? null,
        body.longitude ?? null
      ]
    );
    for (const [i, url] of images.entries()) await q("INSERT INTO item_images(item_id,url,sort_order) VALUES($1,$2,$3)", [result.rows[0].id, url, i]);
    await syncItemDerivedData(result.rows[0].id);
    return await readItemForOwner(req.session.userId!, result.rows[0].id, req.session.userId);
  })();
  if (dedupeKey) pendingItemCreates.set(dedupeKey, createItem);
  try {
    const item = await createItem;
    if (dedupeKey) recentItemCreates.set(dedupeKey, { item, createdAt: Date.now() });
    res.status(201).json({ item });
  } finally {
    if (dedupeKey) pendingItemCreates.delete(dedupeKey);
  }
}));
app.patch("/api/items/:id", requireAuth, asyncRoute(async (req, res) => {
  const own = await q("SELECT id FROM items WHERE id=$1 AND owner_id=$2", [req.params.id, req.session.userId]);
  if (!own.rows[0]) return res.status(403).json({ error: "FORBIDDEN", message: "แก้ไขได้เฉพาะสินค้าของคุณ" });
  let normalizedImages: string[] | undefined;
  if (Array.isArray(req.body.images)) {
    normalizedImages = normalizeImageUrls(z.array(z.string()).max(maxProductImages).parse(req.body.images));
  }
  const fields = ["title","description","category","condition","deal_type","status","price_cash","price_cash_unknown","price_credit","open_to_offers","wanted_text","wanted_tags","location_label","latitude","longitude"];
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const f of fields) {
    if (!(f in req.body)) continue;
    values.push(f === "wanted_tags" ? normalizeHashtags(req.body[f]) : req.body[f]);
    sets.push(`${f}=$${values.length}`);
  }
  if (sets.length) await q(`UPDATE items SET ${sets.join(",")}, updated_at=now() WHERE id=$${values.length + 1}`, [...values, req.params.id]);
  if (normalizedImages) {
    await q("DELETE FROM item_images WHERE item_id=$1", [req.params.id]);
    for (const [idx, url] of normalizedImages.entries()) {
      await q("INSERT INTO item_images(item_id,url,sort_order) VALUES($1,$2,$3)", [req.params.id, url, idx]);
    }
  }
  await syncItemDerivedData(String(req.params.id));
  res.json({ item: (await listItems({ query: { owner_id: req.session.userId, include_inactive: "true", limit: "40" }, session: req.session })).items.find((x: any) => x.id === req.params.id) });
}));
app.delete("/api/items/:id", requireAuth, asyncRoute(async (req, res) => {
  const deleted = await q("UPDATE items SET status='inactive', updated_at=now() WHERE id=$1 AND owner_id=$2 RETURNING id", [req.params.id, req.session.userId]);
  if (!deleted.rows[0]) return res.status(403).json({ error: "FORBIDDEN", message: "ลบได้เฉพาะสินค้าของคุณ" });
  await syncItemDerivedData(String(req.params.id));
  res.json({ ok: true });
}));

const wantedItemPayloadSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().min(10),
  category: z.string().trim().min(1),
  deal_type: z.enum(["swap", "sell", "buy", "both"]).optional(),
  wanted_text: z.string().optional(),
  wanted_tags: z.array(z.string()).optional(),
  reference_images: z.array(z.string()).max(maxProductImages).optional(),
  urgency: z.enum(["low", "normal", "high"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  location_label: z.string().optional(),
  latitude: z.number().finite().nullable().optional(),
  longitude: z.number().finite().nullable().optional()
});

app.get("/api/wanted-items", asyncRoute(async (req, res) => {
  const wantedItems = await listWantedItems({ query: req.query, session: req.session });
  res.json({ wanted_items: wantedItems });
}));
app.get("/api/wanted-items/:id", asyncRoute(async (req, res) => {
  const wanted = (
    await q(
      `SELECT w.*, p.display_name AS owner_name, p.username AS owner_username, p.avatar_url AS owner_avatar, p.rating AS owner_rating, p.city AS owner_city, p.account_level AS owner_account_level
       FROM wanted_items w
       LEFT JOIN profiles p ON p.id = w.owner_id
       WHERE w.id = $1
       LIMIT 1`,
      [req.params.id]
    )
  ).rows[0];
  if (!wanted) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบรายการที่ต้องการ" });
  res.json({ wanted_item: rowWantedItem(wanted) });
}));
app.post("/api/wanted-items", requireAuth, asyncRoute(async (req, res) => {
  const body = wantedItemPayloadSchema.parse(req.body);
  const inserted = await q<{ id: string }>(
    `INSERT INTO wanted_items(owner_id, title, description, category, deal_type, wanted_text, wanted_tags, reference_images, urgency, location_label, latitude, longitude, status)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8::text[],$9,$10,$11,$12,$13)
     RETURNING id`,
    [
      req.session.userId,
      body.title,
      body.description || "",
      body.category || "Other",
      body.deal_type || "buy",
      body.wanted_text || "",
      normalizeHashtags(body.wanted_tags),
      normalizeImageUrls(body.reference_images),
      body.urgency || "normal",
      body.location_label || "",
      body.latitude ?? null,
      body.longitude ?? null,
      body.status || "active"
    ]
  );
  if ((body.status || "active") === "active") {
    await q(
      `INSERT INTO feed_posts(source_key, actor_user_id, post_type, wanted_item_id, visibility)
       VALUES($1, $2, 'wanted_item', $3, 'public')
       ON CONFLICT(source_key) DO UPDATE SET actor_user_id = EXCLUDED.actor_user_id, wanted_item_id = EXCLUDED.wanted_item_id, updated_at = now()`,
      [`wanted:${inserted.rows[0].id}`, req.session.userId, inserted.rows[0].id]
    );
  }
  const wanted = (
    await q(
      `SELECT w.*, p.display_name AS owner_name, p.username AS owner_username, p.avatar_url AS owner_avatar, p.rating AS owner_rating, p.city AS owner_city, p.account_level AS owner_account_level
       FROM wanted_items w
       LEFT JOIN profiles p ON p.id = w.owner_id
       WHERE w.id = $1
       LIMIT 1`,
      [inserted.rows[0].id]
    )
  ).rows[0];
  res.status(201).json({ wanted_item: rowWantedItem(wanted) });
}));
app.patch("/api/wanted-items/:id", requireAuth, asyncRoute(async (req, res) => {
  const own = await q("SELECT id FROM wanted_items WHERE id=$1 AND owner_id=$2", [req.params.id, req.session.userId]);
  if (!own.rows[0]) return res.status(403).json({ error: "FORBIDDEN", message: "แก้ไขได้เฉพาะรายการที่คุณสร้าง" });
  const fields = ["title", "description", "category", "deal_type", "wanted_text", "wanted_tags", "reference_images", "urgency", "status", "location_label", "latitude", "longitude"];
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const field of fields) {
    if (!(field in req.body)) continue;
    if (field === "wanted_tags") values.push(normalizeHashtags(req.body[field]));
    else if (field === "reference_images") values.push(normalizeImageUrls(req.body[field]));
    else values.push(req.body[field]);
    sets.push(field === "reference_images" ? `${field}=$${values.length}::text[]` : `${field}=$${values.length}`);
  }
  if (sets.length) {
    await q(`UPDATE wanted_items SET ${sets.join(",")}, updated_at=now() WHERE id=$${values.length + 1}`, [...values, req.params.id]);
  }
  const wanted = (
    await q(
      `SELECT w.*, p.display_name AS owner_name, p.username AS owner_username, p.avatar_url AS owner_avatar, p.rating AS owner_rating, p.city AS owner_city, p.account_level AS owner_account_level
       FROM wanted_items w
       LEFT JOIN profiles p ON p.id = w.owner_id
       WHERE w.id = $1
       LIMIT 1`,
      [req.params.id]
    )
  ).rows[0];
  if (wanted?.status === "active") {
    await q(
      `INSERT INTO feed_posts(source_key, actor_user_id, post_type, wanted_item_id, visibility)
       VALUES($1, $2, 'wanted_item', $3, 'public')
       ON CONFLICT(source_key) DO UPDATE SET actor_user_id = EXCLUDED.actor_user_id, wanted_item_id = EXCLUDED.wanted_item_id, updated_at = now()`,
      [`wanted:${req.params.id}`, req.session.userId, req.params.id]
    );
  } else {
    await q("DELETE FROM feed_posts WHERE source_key=$1 OR wanted_item_id=$2", [`wanted:${req.params.id}`, req.params.id]);
  }
  res.json({ wanted_item: rowWantedItem(wanted) });
}));
app.delete("/api/wanted-items/:id", requireAuth, asyncRoute(async (req, res) => {
  const archived = await q(
    "UPDATE wanted_items SET status='inactive', updated_at=now() WHERE id=$1 AND owner_id=$2 RETURNING id",
    [req.params.id, req.session.userId]
  );
  if (!archived.rows[0]) return res.status(403).json({ error: "FORBIDDEN", message: "ลบได้เฉพาะรายการที่คุณสร้าง" });
  await q("DELETE FROM feed_posts WHERE source_key=$1 OR wanted_item_id=$2", [`wanted:${req.params.id}`, req.params.id]);
  res.json({ ok: true });
}));

app.post("/api/upload", requireAuth, rateLimit("upload", 30, 60_000), upload.array("images", maxProductImages), asyncRoute(async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) || [];
  const urls = await Promise.all(files.map(storeUpload));
  res.json({ urls });
}));
app.post("/api/upload/cleanup", requireAuth, asyncRoute(async (req, res) => {
  const urls = Array.isArray(req.body?.urls) ? req.body.urls.map(String).slice(0, maxProductImages) : [];
  await Promise.all(urls.map(deleteStoredUpload));
  res.json({ ok: true });
}));

app.get("/api/bookmarks", requireAuth, asyncRoute(async (req, res) => {
  const items = await listItems({ query: { ...req.query, bookmarked: "true" }, session: req.session });
  res.json(items);
}));
app.post("/api/bookmarks", requireAuth, asyncRoute(async (req, res) => {
  const itemId = String(req.body.item_id || "");
  const insertedBookmark = await q<{ item_id: string }>(
    "INSERT INTO bookmarks(user_id,item_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING item_id",
    [req.session.userId, itemId]
  );
  const savedItem = await q<{ id: string; title: string; owner_id: string }>(
    "SELECT id,title,owner_id FROM items WHERE id=$1 LIMIT 1",
    [itemId]
  );
  const savedRow = savedItem.rows[0];
  if (insertedBookmark.rows[0] && savedRow?.owner_id && savedRow.owner_id !== req.session.userId) {
    const sender = await currentUser(req.session.userId);
    await createNotificationEntry(
      savedRow.owner_id,
      "save",
      `${sender?.display_name || sender?.username || "มีคนสนใจสินค้า"} บันทึกสินค้าของคุณ`,
      savedRow.title,
      {
        item_id: savedRow.id,
        saver_user_id: req.session.userId
      }
    );
  }
  res.json({ ok: true });
}));
app.delete("/api/bookmarks/:id", requireAuth, asyncRoute(async (req, res) => { await q("DELETE FROM bookmarks WHERE user_id=$1 AND item_id=$2", [req.session.userId, req.params.id]); res.json({ ok: true }); }));

app.get("/api/follows", requireAuth, asyncRoute(async (req, res) => res.json({ follows: (await q(
  `SELECT p.id,p.display_name,p.username,p.city,p.bio,p.avatar_url,p.rating,p.response_time_minutes,p.is_featured,p.is_fast_responder,p.account_level,p.latitude,p.longitude,f.created_at
   FROM follows f JOIN profiles p ON p.id=f.following_id
   WHERE f.follower_id=$1 ORDER BY f.created_at DESC`,
  [req.session.userId]
)).rows })));
app.post("/api/follows/:id", requireAuth, asyncRoute(async (req, res) => {
  const insertedFollow = await q<{ following_id: string }>(
    "INSERT INTO follows(follower_id,following_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING following_id",
    [req.session.userId, req.params.id]
  );
  await q(
    `INSERT INTO feed_posts(source_key, actor_user_id, post_type, visibility)
     VALUES($1, $2, 'follow', 'public')
     ON CONFLICT(source_key) DO UPDATE SET actor_user_id = EXCLUDED.actor_user_id, updated_at = now()`,
    [`follow:${req.session.userId}:${req.params.id}`, req.session.userId]
  );
  try {
    await applyCreditRule(req.session.userId!, "follow_created", String(req.params.id));
  } catch {
    // ignore idempotent follow credit failures so the follow action itself still succeeds
  }
  if (insertedFollow.rows[0] && req.params.id !== req.session.userId) {
    const follower = await currentUser(req.session.userId);
    await createNotificationEntry(
      String(req.params.id),
      "follow",
      `${follower?.display_name || follower?.username || "มีผู้ใช้ใหม่"} เริ่มติดตามคุณ`,
      "เปิดดูโปรไฟล์เพื่อติดตามความเคลื่อนไหวล่าสุดได้เลย",
      {
        profile_id: req.session.userId
      }
    );
  }
  res.json({ ok: true });
}));
app.delete("/api/follows/:id", requireAuth, asyncRoute(async (req, res) => { await q("DELETE FROM follows WHERE follower_id=$1 AND following_id=$2", [req.session.userId, req.params.id]); res.json({ ok: true }); }));

async function ensureConversation(offerId: string, a: string, b: string) {
  const existing = await q<{ id: string }>("SELECT id FROM chat_conversations WHERE offer_id=$1", [offerId]);
  if (existing.rows[0]) {
    await q(
      "INSERT INTO chat_participants(conversation_id,user_id,last_read_at) VALUES($1,$2,now()),($1,$3,now()) ON CONFLICT DO NOTHING",
      [existing.rows[0].id, a, b]
    );
    return existing.rows[0].id;
  }
  const conv = await q<{ id: string }>("INSERT INTO chat_conversations(offer_id) VALUES($1) RETURNING id", [offerId]);
  await q(
    "INSERT INTO chat_participants(conversation_id,user_id,last_read_at) VALUES($1,$2,now()),($1,$3,now()) ON CONFLICT DO NOTHING",
    [conv.rows[0].id, a, b]
  );
  return conv.rows[0].id;
}

async function ensureItemConversation(itemId: string, a: string, b: string) {
  const existing = await q<{ id: string }>(
    `SELECT c.id
     FROM chat_conversations c
     JOIN chat_participants self_p ON self_p.conversation_id=c.id AND self_p.user_id=$2
     JOIN chat_participants other_p ON other_p.conversation_id=c.id AND other_p.user_id=$3
     WHERE c.item_id=$1
     ORDER BY c.updated_at DESC
     LIMIT 1`,
    [itemId, a, b]
  );
  if (existing.rows[0]) {
    await q(
      "INSERT INTO chat_participants(conversation_id,user_id,last_read_at) VALUES($1,$2,now()),($1,$3,now()) ON CONFLICT DO NOTHING",
      [existing.rows[0].id, a, b]
    );
    return existing.rows[0].id;
  }
  const conv = await q<{ id: string }>("INSERT INTO chat_conversations(item_id) VALUES($1) RETURNING id", [itemId]);
  await q(
    "INSERT INTO chat_participants(conversation_id,user_id,last_read_at) VALUES($1,$2,now()),($1,$3,now()) ON CONFLICT DO NOTHING",
    [conv.rows[0].id, a, b]
  );
  return conv.rows[0].id;
}

async function transferOfferOwnership(offerId: string, fromUserId: string, toUserId: string, targetItemId: string) {
  const offeredItems = await q<{ item_id: string }>(
    "SELECT item_id FROM offer_items WHERE offer_id=$1 ORDER BY created_at ASC",
    [offerId]
  );

  await q("UPDATE items SET owner_id=$1, status='swapped', updated_at=now() WHERE id=$2", [fromUserId, targetItemId]);
  await q(
    "INSERT INTO item_owner_history(item_id,offer_id,previous_owner_id,new_owner_id,status) VALUES($1,$2,$3,$4,'completed')",
    [targetItemId, offerId, toUserId, fromUserId]
  );

  for (const entry of offeredItems.rows) {
    await q("UPDATE items SET owner_id=$1, status='swapped', updated_at=now() WHERE id=$2", [toUserId, entry.item_id]);
    await q(
      "INSERT INTO item_owner_history(item_id,offer_id,previous_owner_id,new_owner_id,status) VALUES($1,$2,$3,$4,'completed')",
      [entry.item_id, offerId, fromUserId, toUserId]
    );
  }
}

async function loadOfferDetail(offerId: string, userId?: string | null) {
  if (!userId) return null;
  const detail = await q<any>(
    `SELECT o.*,
            i.title AS target_title,
            COALESCE(img.url,'') AS target_image,
            owner.display_name AS owner_name,
            owner.avatar_url AS owner_avatar,
            sender.display_name AS from_name,
            sender.avatar_url AS from_avatar,
            receiver.display_name AS to_name,
            receiver.avatar_url AS to_avatar
     FROM offers o
     JOIN items i ON i.id=o.target_item_id
     LEFT JOIN LATERAL (SELECT url FROM item_images WHERE item_id=i.id ORDER BY sort_order ASC LIMIT 1) img ON true
     JOIN profiles owner ON owner.id=i.owner_id
     JOIN profiles sender ON sender.id=o.from_user_id
     JOIN profiles receiver ON receiver.id=o.to_user_id
     WHERE o.id=$1 AND (o.from_user_id=$2 OR o.to_user_id=$2)
     LIMIT 1`,
    [offerId, userId]
  );
  const row = await expireOfferIfNeeded(detail.rows[0]);
  if (!row) return null;
  const offerItems = await q<{ item_id: string }>(
    "SELECT item_id FROM offer_items WHERE offer_id=$1 ORDER BY created_at ASC",
    [offerId]
  );
  const conversation = await q<{ id: string }>("SELECT id FROM chat_conversations WHERE offer_id=$1 LIMIT 1", [offerId]);
  const shipment = await q("SELECT * FROM shipments WHERE offer_id=$1 LIMIT 1", [offerId]);
  const [targetItem] = await readItemsForViewer([row.target_item_id], userId);
  const offeredItems = await readItemsForViewer(offerItems.rows.map((entry) => entry.item_id), userId);
  return {
    offer: row,
    target_item: targetItem || null,
    offered_items: offeredItems,
    shipment: shipment.rows[0] || null,
    conversation_id: conversation.rows[0]?.id || null,
    chat_enabled: Boolean(conversation.rows[0]?.id)
  };
}

async function readOfferList(sql: string, params: unknown[]) {
  const rows = (await q<any>(sql, params)).rows;
  const normalized = [];
  for (const row of rows) normalized.push(await expireOfferIfNeeded(row));
  return normalized.filter(Boolean);
}

async function readConversationAccess(conversationId: string, userId?: string | null) {
  if (!userId) return null;
  const result = await q<{ offer_id: string | null; item_id: string | null; status: string | null }>(
    `SELECT c.offer_id,c.item_id,o.status
     FROM chat_conversations c
     JOIN chat_participants p ON p.conversation_id=c.id
     LEFT JOIN offers o ON o.id=c.offer_id
     WHERE c.id=$1 AND p.user_id=$2
     LIMIT 1`,
    [conversationId, userId]
  );
  return result.rows[0] || null;
}

async function loadConversationDetail(conversationId: string, userId?: string | null) {
  if (!userId) return null;
  const result = await q<{
    id: string;
    offer_id: string | null;
    item_id: string | null;
    created_at: string;
    updated_at: string;
    counterpart_id: string | null;
    counterpart_name: string | null;
    counterpart_avatar: string | null;
    item_title: string | null;
    item_image: string | null;
    item_status: string | null;
    offer_status: string | null;
    unread_count: number;
    last_message_text: string | null;
    last_message_type: string | null;
    last_message_at: string | null;
    last_message_sender_id: string | null;
  }>(
    `SELECT c.id,
            c.offer_id,
            COALESCE(c.item_id, offer.target_item_id) AS item_id,
            c.created_at,
            COALESCE(latest.created_at, c.updated_at) AS updated_at,
            other.user_id AS counterpart_id,
            profile.display_name AS counterpart_name,
            profile.avatar_url AS counterpart_avatar,
            context_item.title AS item_title,
            image.url AS item_image,
            context_item.status AS item_status,
            offer.status AS offer_status,
            latest.text AS last_message_text,
            latest.message_type AS last_message_type,
            latest.created_at AS last_message_at,
            latest.sender_id AS last_message_sender_id,
            COALESCE(unread.unread_count, 0)::int AS unread_count
     FROM chat_conversations c
     JOIN chat_participants self ON self.conversation_id=c.id AND self.user_id=$2
     LEFT JOIN offers offer ON offer.id=c.offer_id
     LEFT JOIN LATERAL (
       SELECT p.user_id
       FROM chat_participants p
       WHERE p.conversation_id=c.id AND p.user_id<>$2
       ORDER BY p.user_id ASC
       LIMIT 1
     ) other ON true
     LEFT JOIN profiles profile ON profile.id=other.user_id
     LEFT JOIN items context_item ON context_item.id=COALESCE(c.item_id, offer.target_item_id)
     LEFT JOIN LATERAL (
       SELECT url
       FROM item_images
       WHERE item_id=COALESCE(c.item_id, offer.target_item_id)
       ORDER BY sort_order ASC, created_at ASC
       LIMIT 1
     ) image ON true
     LEFT JOIN LATERAL (
       SELECT m.text,m.message_type,m.created_at,m.sender_id
       FROM chat_messages m
       WHERE m.conversation_id=c.id
       ORDER BY m.created_at DESC
       LIMIT 1
     ) latest ON true
     LEFT JOIN LATERAL (
       SELECT count(*)::int AS unread_count
       FROM chat_messages m
       WHERE m.conversation_id=c.id
         AND m.created_at > COALESCE(self.last_read_at, to_timestamp(0))
         AND (m.sender_id IS NULL OR m.sender_id <> $2)
     ) unread ON true
     WHERE c.id=$1
     LIMIT 1`,
    [conversationId, userId]
  );
  return result.rows[0] || null;
}

async function shipmentParticipantByOfferId(offerId: string, userId?: string) {
  if (!userId) return null;
  const result = await q<{ id: string; from_user_id: string; to_user_id: string; status: string }>(
    "SELECT id,from_user_id,to_user_id,status FROM offers WHERE id=$1 AND (from_user_id=$2 OR to_user_id=$2)",
    [offerId, userId]
  );
  return result.rows[0] || null;
}

async function shipmentParticipantByShipmentId(shipmentId: string, userId?: string) {
  if (!userId) return null;
  const result = await q<{ shipment_id: string; offer_id: string; from_user_id: string; to_user_id: string; offer_status: string }>(
    `SELECT s.id AS shipment_id,s.offer_id,o.from_user_id,o.to_user_id,o.status AS offer_status
     FROM shipments s
     JOIN offers o ON o.id=s.offer_id
     WHERE s.id=$1 AND (o.from_user_id=$2 OR o.to_user_id=$2)`,
    [shipmentId, userId]
  );
  return result.rows[0] || null;
}

function invalidTransition(res: Response, message: string) {
  return res.status(409).json({ error: "INVALID_STATE", message });
}

function normalizeOfferLogistics(raw: unknown) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      // noop
    }
  }
  return {} as Record<string, unknown>;
}

app.get("/api/offers", requireAuth, asyncRoute(async (req, res) => res.json({ offers: await readOfferList(
  `SELECT o.*,
          i.title AS target_title,
          COALESCE(img.url,'') AS target_image,
          owner.display_name AS owner_name,
          owner.avatar_url AS owner_avatar,
          sender.display_name AS from_name,
          sender.avatar_url AS from_avatar,
          receiver.display_name AS to_name,
          receiver.avatar_url AS to_avatar
   FROM offers o
   JOIN items i ON i.id=o.target_item_id
   LEFT JOIN LATERAL (SELECT url FROM item_images WHERE item_id=i.id ORDER BY sort_order ASC LIMIT 1) img ON true
   JOIN profiles owner ON owner.id=i.owner_id
   JOIN profiles sender ON sender.id=o.from_user_id
   JOIN profiles receiver ON receiver.id=o.to_user_id
   WHERE o.from_user_id=$1 OR o.to_user_id=$1
   ORDER BY o.created_at DESC`,
  [req.session.userId]
) })));
app.get("/api/offers/sent", requireAuth, asyncRoute(async (req, res) => res.json({ offers: await readOfferList(
  `SELECT o.*,
          i.title AS target_title,
          COALESCE(img.url,'') AS target_image,
          owner.display_name AS owner_name,
          owner.avatar_url AS owner_avatar,
          sender.display_name AS from_name,
          sender.avatar_url AS from_avatar,
          receiver.display_name AS to_name,
          receiver.avatar_url AS to_avatar
   FROM offers o
   JOIN items i ON i.id=o.target_item_id
   LEFT JOIN LATERAL (SELECT url FROM item_images WHERE item_id=i.id ORDER BY sort_order ASC LIMIT 1) img ON true
   JOIN profiles owner ON owner.id=i.owner_id
   JOIN profiles sender ON sender.id=o.from_user_id
   JOIN profiles receiver ON receiver.id=o.to_user_id
   WHERE o.from_user_id=$1
   ORDER BY o.created_at DESC`,
  [req.session.userId]
) })));
app.get("/api/offers/received", requireAuth, asyncRoute(async (req, res) => res.json({ offers: await readOfferList(
  `SELECT o.*,
          i.title AS target_title,
          COALESCE(img.url,'') AS target_image,
          owner.display_name AS owner_name,
          owner.avatar_url AS owner_avatar,
          sender.display_name AS from_name,
          sender.avatar_url AS from_avatar,
          receiver.display_name AS to_name,
          receiver.avatar_url AS to_avatar
   FROM offers o
   JOIN items i ON i.id=o.target_item_id
   LEFT JOIN LATERAL (SELECT url FROM item_images WHERE item_id=i.id ORDER BY sort_order ASC LIMIT 1) img ON true
   JOIN profiles owner ON owner.id=i.owner_id
   JOIN profiles sender ON sender.id=o.from_user_id
   JOIN profiles receiver ON receiver.id=o.to_user_id
   WHERE o.to_user_id=$1
   ORDER BY o.created_at DESC`,
  [req.session.userId]
) })));
app.get("/api/offers/:id/detail", requireAuth, asyncRoute(async (req, res) => {
  const detail = await loadOfferDetail(String(req.params.id), req.session.userId);
  if (!detail) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบข้อเสนอ" });
  res.json(detail);
}));
app.get("/api/offers/:id", requireAuth, asyncRoute(async (req, res) => {
  const offer = await expireOfferIfNeeded((await q("SELECT * FROM offers WHERE id=$1 AND (from_user_id=$2 OR to_user_id=$2)", [req.params.id, req.session.userId])).rows[0]);
  res.json({ offer });
}));
app.post("/api/offers", requireAuth, asyncRoute(async (req, res) => {
  const level = await q<{ account_level: number }>("SELECT account_level FROM profiles WHERE id=$1", [req.session.userId]);
  if (Number(level.rows[0]?.account_level || 2) === 4) {
    return res.status(403).json({ error: "ACCOUNT_RESTRICTED", message: "บัญชีนี้ถูกจำกัดสิทธิ์ สามารถดูได้เท่านั้น" });
  }
  const body = z.object({
    target_item_id: z.string().uuid(),
    message: z.string().optional(),
    cash_amount: z.number().int().min(0).optional(),
    credit_amount: z.number().int().min(0).optional(),
    item_ids: z.array(z.string().uuid()).optional(),
    instant_swap: z.boolean().optional(),
    shipping_payer: z.enum(["split", "requester", "owner"]).optional(),
    pickup_window: z.string().optional()
  }).parse(req.body);
  const normalizedMessage = String(body.message || "").trim();
  const normalizedItemIds = [...new Set((body.item_ids || []).map((id) => String(id).trim()).filter(Boolean))];
  const hasMeaningfulOffer =
    normalizedItemIds.length > 0 ||
    normalizedMessage.length > 0 ||
    Number(body.cash_amount || 0) > 0 ||
    Number(body.credit_amount || 0) > 0;
  if (!hasMeaningfulOffer) {
    return res.status(400).json({
      error: "EMPTY_OFFER",
      message: "ข้อเสนอต้องมีอย่างน้อย 1 อย่าง เช่น ข้อความ สินค้าที่จะแลก หรือเงินสด"
    });
  }
  const target = await q<{ owner_id: string; title: string; status: string | null }>("SELECT owner_id,title,status FROM items WHERE id=$1", [body.target_item_id]);
  if (!target.rows[0]) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบสินค้า" });
  if (target.rows[0].owner_id === req.session.userId) return res.status(400).json({ error: "OWN_ITEM", message: "ไม่สามารถขอแลกสินค้าของตัวเอง" });
  if ((target.rows[0].status || "active") !== "active") {
    return res.status(409).json({ error: "ITEM_UNAVAILABLE", message: "สินค้านี้ยังไม่พร้อมรับข้อเสนอใหม่" });
  }
  if (normalizedItemIds.length) {
    const mine = await q<{ id: string }>(
      "SELECT id FROM items WHERE owner_id=$1 AND status='active' AND id::text = ANY($2::text[])",
      [req.session.userId, normalizedItemIds]
    );
    if (mine.rows.length !== normalizedItemIds.length) {
      return res.status(400).json({ error: "INVALID_OFFER_ITEMS", message: "มีสินค้าสำหรับแลกบางรายการที่ไม่พร้อมใช้งานหรือไม่ใช่ของคุณ" });
    }
  }
  const logistics = {
    shipping_payer: body.shipping_payer || "split",
    pickup_window: body.pickup_window || "",
    courier_photo_required: true,
    pickup_photo_required: true,
    dropoff_photo_required: true,
    schedule_confirmations: {},
    receipt_confirmations: {}
  };
  const offer = await q<{ id: string }>(
    "INSERT INTO offers(from_user_id,to_user_id,target_item_id,message,cash_amount,credit_amount,instant_swap,logistics,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) RETURNING id",
    [req.session.userId, target.rows[0].owner_id, body.target_item_id, normalizedMessage, body.cash_amount || 0, body.credit_amount || 0, Boolean(body.instant_swap), JSON.stringify(logistics), createOfferExpiryDate()]
  );
  await logSwapStatus(offer.rows[0].id, req.session.userId, null, "pending", "offer_created");
  for (const id of normalizedItemIds) await q("INSERT INTO offer_items(offer_id,item_id) VALUES($1,$2)", [offer.rows[0].id, id]);
  await q("UPDATE items SET request_count=request_count+1 WHERE id=$1", [body.target_item_id]);
  await createNotificationEntry(target.rows[0].owner_id, "offer", "มีข้อเสนอ Xwap ใหม่", target.rows[0].title, {
    offer_id: offer.rows[0].id,
    status: "pending",
    inbox_tab: "received"
  });
  const conv = await ensureConversation(offer.rows[0].id, req.session.userId!, target.rows[0].owner_id);
  await appendConversationMessage({
    conversationId: conv,
    text: "สร้างคำขอแลกสินค้าแล้ว",
    messageType: "system",
    metadata: { offer_id: offer.rows[0].id, status: "pending" }
  });
  if (normalizedMessage) {
    await appendConversationMessage({
      conversationId: conv,
      senderId: req.session.userId!,
      text: normalizedMessage,
      messageType: "user",
      metadata: { offer_id: offer.rows[0].id, status: "pending" }
    });
  }
  res.status(201).json({ offer_id: offer.rows[0].id, conversation_id: conv });
}));

async function persistOfferStatus(
  row: any,
  actorUserId: string,
  nextStatus: string,
  options: {
    note?: string | null;
    rejectionReason?: string | null;
    logistics?: Record<string, unknown>;
    expiresAt?: Date | null;
    notifyUserId?: string | null;
    notifyType?: string;
    notifyTitle?: string;
    notifyBody?: string;
    notifyData?: Record<string, unknown>;
    systemMessageText?: string;
  } = {}
) {
  const nextLogistics = options.logistics ?? normalizeOfferLogistics(row.logistics);
  const nextOffer = (
    await q<any>(
      `UPDATE offers
       SET status=$2,
           rejection_reason=$3,
           logistics=$4::jsonb,
           expires_at=$5,
           updated_at=now()
       WHERE id=$1
       RETURNING *`,
      [
        row.id,
        nextStatus,
        options.rejectionReason ?? row.rejection_reason ?? null,
        JSON.stringify(nextLogistics),
        options.expiresAt === undefined ? row.expires_at || null : options.expiresAt
      ]
    )
  ).rows[0];
  await logSwapStatus(row.id, actorUserId, row.status, nextStatus, options.note || null);
  if (nextStatus === "accepted") {
    const logisticsJson = typeof nextOffer.logistics === "string" ? nextOffer.logistics : JSON.stringify(nextOffer.logistics || {});
    await q(
      "INSERT INTO deals(offer_id,buyer_id,seller_id,item_id,stage,logistics) VALUES($1,$2,$3,$4,'accepted',$5::jsonb) ON CONFLICT DO NOTHING",
      [row.id, row.from_user_id, row.to_user_id, row.target_item_id, logisticsJson]
    );
  }
  if (lockingOfferStatuses.has(String(row.status || "")) || lockingOfferStatuses.has(String(nextStatus || "")) || terminalOfferStatuses.has(String(nextStatus || ""))) {
    await recomputeOfferItemAvailability([row.target_item_id, ...(await getOfferItemIds(row.id))]);
  }
  if (options.notifyUserId && options.notifyTitle) {
    await createNotificationEntry(
      options.notifyUserId,
      options.notifyType || "offer_status",
      options.notifyTitle,
      options.notifyBody || "สถานะข้อเสนอมีการเปลี่ยนแปลง",
      {
        offer_id: row.id,
        status: nextStatus,
        inbox_tab: offerInboxTabForUser(row, options.notifyUserId),
        ...(options.notifyData || {})
      }
    );
  }
  if (options.systemMessageText) {
    await appendOfferSystemMessage(row.id, options.systemMessageText, {
      status: nextStatus,
      note: options.note || null
    });
  }
  return nextOffer;
}

async function readParticipantOffer(offerId: string, userId: string) {
  const row = await getOfferRow(offerId);
  if (!row) return null;
  if (row.from_user_id !== userId && row.to_user_id !== userId) return null;
  return await expireOfferIfNeeded(row);
}

async function acceptOfferHandler(req: Request, res: Response) {
  const row = await readParticipantOffer(String(req.params.id), req.session.userId!);
  if (!row) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบข้อเสนอ" });
  if (row.status === "completed") return res.json({ ok: true, status: row.status });
  if (row.status === "expired") return invalidTransition(res, "คำขอแลกนี้หมดเวลาแล้ว");
  if (row.status === "pending") {
    if (row.to_user_id !== req.session.userId) return res.status(403).json({ error: "FORBIDDEN" });
    try {
      await ensureOfferItemsAreSwappable(row.id, row.target_item_id);
    } catch (error: any) {
      return res.status(409).json({ error: error.code || "ITEM_UNAVAILABLE", message: error.message || "สินค้าบางชิ้นไม่พร้อมแลกแล้ว" });
    }
    const updated = await persistOfferStatus(row, req.session.userId!, "accepted", {
      note: "offer_accepted",
      rejectionReason: null,
      expiresAt: null,
      notifyUserId: row.from_user_id,
      notifyTitle: "ข้อเสนอของคุณถูกตอบรับแล้ว",
      notifyBody: "เปิดแชทและจัดการนัดรับหรือส่งมอบต่อได้ทันที",
      systemMessageText: "ตอบรับคำขอแลกแล้ว"
    });
    return res.json({ ok: true, status: updated.status });
  }
  if (row.status === "countered") {
    if (row.from_user_id !== req.session.userId) return res.status(403).json({ error: "FORBIDDEN" });
    try {
      await ensureOfferItemsAreSwappable(row.id, row.target_item_id);
    } catch (error: any) {
      return res.status(409).json({ error: error.code || "ITEM_UNAVAILABLE", message: error.message || "สินค้าบางชิ้นไม่พร้อมแลกแล้ว" });
    }
    const updated = await persistOfferStatus(row, req.session.userId!, "accepted", {
      note: "counter_offer_accepted",
      rejectionReason: null,
      expiresAt: null,
      logistics: {
        ...normalizeOfferLogistics(row.logistics),
        counter_offer: null
      },
      notifyUserId: row.to_user_id,
      notifyTitle: "ข้อเสนอโต้กลับของคุณถูกตอบรับแล้ว",
      notifyBody: "ดีลนี้พร้อมคุยต่อและเริ่มขั้นตอนนัดรับแล้ว",
      systemMessageText: "ตอบรับข้อเสนอโต้กลับแล้ว"
    });
    return res.json({ ok: true, status: updated.status });
  }
  return invalidTransition(res, "ยอมรับข้อเสนอได้เฉพาะรายการที่กำลังรอตอบหรือรอรับข้อเสนอโต้กลับ");
}

app.post("/api/offers/:id/counter", requireAuth, asyncRoute(async (req, res) => {
  const row = await readParticipantOffer(String(req.params.id), req.session.userId!);
  if (!row) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบข้อเสนอ" });
  if (row.to_user_id !== req.session.userId) return res.status(403).json({ error: "FORBIDDEN" });
  if (row.status === "expired") return invalidTransition(res, "คำขอแลกนี้หมดเวลาแล้ว");
  if (row.status !== "pending") return invalidTransition(res, "ส่งข้อเสนอโต้กลับได้เฉพาะคำขอที่กำลังรอตอบรับ");
  const body = z.object({
    message: z.string().trim().max(400).optional(),
    cash_amount: z.number().int().min(0).optional(),
    credit_amount: z.number().int().min(0).optional()
  }).parse(req.body);
  const nextMessage = body.message != null ? String(body.message).trim() : String(row.message || "").trim();
  const nextCashAmount = body.cash_amount != null ? Number(body.cash_amount) : Number(row.cash_amount || 0);
  const nextCreditAmount = body.credit_amount != null ? Number(body.credit_amount) : Number(row.credit_amount || 0);
  if (
    nextMessage === String(row.message || "").trim() &&
    nextCashAmount === Number(row.cash_amount || 0) &&
    nextCreditAmount === Number(row.credit_amount || 0)
  ) {
    return res.status(400).json({ error: "NO_COUNTER_CHANGES", message: "ข้อเสนอโต้กลับต้องมีรายละเอียดที่เปลี่ยนจากเดิม" });
  }
  const nextLogistics = {
    ...normalizeOfferLogistics(row.logistics),
    counter_offer: {
      message: nextMessage,
      cash_amount: nextCashAmount,
      credit_amount: nextCreditAmount,
      actor_user_id: req.session.userId,
      created_at: new Date().toISOString()
    }
  };
  const updated = (
    await q<any>(
      `UPDATE offers
       SET status='countered',
           message=$2,
           cash_amount=$3,
           credit_amount=$4,
           logistics=$5::jsonb,
           rejection_reason=NULL,
           expires_at=$6,
           updated_at=now()
       WHERE id=$1
       RETURNING *`,
      [row.id, nextMessage, nextCashAmount, nextCreditAmount, JSON.stringify(nextLogistics), createOfferExpiryDate()]
    )
  ).rows[0];
  await logSwapStatus(row.id, req.session.userId, row.status, "countered", "counter_offer_sent");
  await createNotificationEntry(
    row.from_user_id,
    "offer_status",
    "อีกฝ่ายส่งข้อเสนอโต้กลับมาแล้ว",
    "ตรวจรายละเอียดใหม่แล้วเลือกตอบรับ ปฏิเสธ หรือยกเลิกได้จากหน้าดีลนี้",
    { offer_id: row.id, status: "countered", inbox_tab: "sent" }
  );
  await appendOfferSystemMessage(row.id, "ส่งข้อเสนอโต้กลับแล้ว", { status: "countered" });
  res.json({ ok: true, status: updated.status });
}));
app.post("/api/offers/:id/accept", requireAuth, asyncRoute(acceptOfferHandler));
app.post("/api/offers/:id/approve", requireAuth, asyncRoute(acceptOfferHandler));
app.post("/api/offers/:id/reject", requireAuth, asyncRoute(async (req, res) => {
  const row = await readParticipantOffer(String(req.params.id), req.session.userId!);
  if (!row) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบข้อเสนอ" });
  if (row.status === "expired") return invalidTransition(res, "คำขอแลกนี้หมดเวลาแล้ว");
  const rejectionReason = String(req.body?.rejection_reason || "").trim().slice(0, 120) || null;
  if (row.status === "pending") {
    if (row.to_user_id !== req.session.userId) return res.status(403).json({ error: "FORBIDDEN" });
    const updated = await persistOfferStatus(row, req.session.userId!, "rejected", {
      note: rejectionReason || "offer_rejected",
      rejectionReason: rejectionReason || "not_a_match",
      expiresAt: null,
      notifyUserId: row.from_user_id,
      notifyTitle: "ข้อเสนอของคุณถูกปฏิเสธ",
      notifyBody: rejectionReason || "เจ้าของสินค้าไม่สะดวกรับข้อเสนอนี้",
      systemMessageText: "ปฏิเสธคำขอแลกแล้ว"
    });
    return res.json({ ok: true, status: updated.status });
  }
  if (row.status === "countered") {
    if (row.from_user_id !== req.session.userId) return res.status(403).json({ error: "FORBIDDEN" });
    const updated = await persistOfferStatus(row, req.session.userId!, "rejected", {
      note: rejectionReason || "counter_offer_rejected",
      rejectionReason: rejectionReason || "counter_offer_declined",
      expiresAt: null,
      notifyUserId: row.to_user_id,
      notifyTitle: "อีกฝ่ายปฏิเสธข้อเสนอโต้กลับแล้ว",
      notifyBody: rejectionReason || "ดีลนี้ปิดลงโดยไม่ตอบรับข้อเสนอโต้กลับ",
      systemMessageText: "ปฏิเสธข้อเสนอโต้กลับแล้ว"
    });
    return res.json({ ok: true, status: updated.status });
  }
  return invalidTransition(res, "ปฏิเสธข้อเสนอได้เฉพาะตอนที่ดีลยังรอตอบหรือรอรับข้อเสนอโต้กลับ");
}));
app.post("/api/offers/:id/cancel", requireAuth, asyncRoute(async (req, res) => {
  const row = await readParticipantOffer(String(req.params.id), req.session.userId!);
  if (!row) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบข้อเสนอ" });
  if (terminalOfferStatuses.has(String(row.status || "")) || row.status === "reported") {
    return invalidTransition(res, "ข้อเสนอนี้ยกเลิกต่อไม่ได้แล้ว");
  }
  const updated = await persistOfferStatus(row, req.session.userId!, "cancelled", {
    note: "offer_cancelled",
    expiresAt: null,
    notifyUserId: row.from_user_id === req.session.userId ? row.to_user_id : row.from_user_id,
    notifyTitle: "ข้อเสนอถูกยกเลิกแล้ว",
    notifyBody: "ดีลนี้ถูกยกเลิกและไม่สามารถเดินหน้าต่อได้",
    systemMessageText: "ยกเลิกดีลนี้แล้ว"
  });
  res.json({ ok: true, status: updated.status });
}));
app.patch("/api/offers/:id/logistics", requireAuth, asyncRoute(async (req, res) => {
  const row = await readParticipantOffer(String(req.params.id), req.session.userId!);
  if (!row) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบข้อเสนอ" });
  if (!["accepted", "scheduled", "handover_pending", "reported"].includes(String(row.status || ""))) {
    return invalidTransition(res, "อัปเดตข้อมูลนัดรับได้หลังจากตอบรับข้อเสนอแล้วเท่านั้น");
  }
  const currentLogistics = normalizeOfferLogistics(row.logistics);
  const incoming = req.body?.logistics && typeof req.body.logistics === "object" ? req.body.logistics : {};
  const nextLogistics = {
    ...currentLogistics,
    ...incoming,
    proofs: {
      ...(currentLogistics.proofs && typeof currentLogistics.proofs === "object" ? currentLogistics.proofs as Record<string, string> : {}),
      ...(incoming.proofs && typeof incoming.proofs === "object" ? incoming.proofs as Record<string, string> : {})
    },
    receipt_confirmations: {
      ...(currentLogistics.receipt_confirmations && typeof currentLogistics.receipt_confirmations === "object"
        ? currentLogistics.receipt_confirmations as Record<string, string>
        : {}),
      ...(incoming.receipt_confirmations && typeof incoming.receipt_confirmations === "object"
        ? incoming.receipt_confirmations as Record<string, string>
        : {})
    },
    schedule_confirmations: {
      ...(currentLogistics.schedule_confirmations && typeof currentLogistics.schedule_confirmations === "object"
        ? currentLogistics.schedule_confirmations as Record<string, string>
        : {}),
      ...(incoming.schedule_confirmations && typeof incoming.schedule_confirmations === "object"
        ? incoming.schedule_confirmations as Record<string, string>
        : {})
    }
  };
  const scheduleConfirmations = (nextLogistics.schedule_confirmations && typeof nextLogistics.schedule_confirmations === "object"
    ? nextLogistics.schedule_confirmations as Record<string, string>
    : {});
  const bothScheduleConfirmed = Boolean(scheduleConfirmations[row.from_user_id] && scheduleConfirmations[row.to_user_id]);
  if (bothScheduleConfirmed && row.status === "accepted") {
    const updated = await persistOfferStatus(row, req.session.userId!, "scheduled", {
      note: "schedule_confirmed",
      logistics: nextLogistics,
      notifyUserId: row.from_user_id === req.session.userId ? row.to_user_id : row.from_user_id,
      notifyTitle: "แผนนัดรับของพร้อมแล้ว",
      notifyBody: "ทั้งสองฝ่ายยืนยันเวลาและวิธีส่งมอบครบแล้ว",
      systemMessageText: "ยืนยันนัดหมายแลกของแล้ว"
    });
    return res.json({ ok: true, status: updated.status, logistics: nextLogistics });
  }
  await q("UPDATE offers SET logistics=$2::jsonb, updated_at=now() WHERE id=$1", [req.params.id, JSON.stringify(nextLogistics)]);
  await createNotificationEntry(
    row.from_user_id === req.session.userId ? row.to_user_id : row.from_user_id,
    "offer_status",
    "มีการอัปเดตแผนนัดรับของ",
    "อีกฝ่ายเพิ่งอัปเดตข้อมูลการนัดรับหรือการส่งมอบ",
    { offer_id: row.id, status: row.status, inbox_tab: offerInboxTabForUser(row, row.from_user_id === req.session.userId ? row.to_user_id : row.from_user_id) }
  );
  res.json({ ok: true, status: row.status, logistics: nextLogistics });
}));
async function confirmOfferReceipt(req: Request, res: Response) {
  const row = await readParticipantOffer(String(req.params.id), req.session.userId!);
  if (!row) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบข้อเสนอ" });
  if (row.status === "completed") return res.json({ ok: true, status: row.status, confirmed: true });
  if (!["handover_pending", "reported", "scheduled"].includes(String(row.status || ""))) {
    return invalidTransition(res, "ยืนยันรับของได้หลังจากทั้งสองฝ่ายตอบรับข้อเสนอและส่งมอบเสร็จแล้วเท่านั้น");
  }
  const shipment = await q<{ current_step: string }>("SELECT current_step FROM shipments WHERE offer_id=$1 LIMIT 1", [row.id]);
  if (shipment.rows[0] && shipment.rows[0].current_step !== "finished") {
    return invalidTransition(res, "ยืนยันรับของได้หลังปิดงานส่งมอบแล้วเท่านั้น");
  }
  const currentLogistics = normalizeOfferLogistics(row.logistics);
  const receiptConfirmations = {
    ...(currentLogistics.receipt_confirmations && typeof currentLogistics.receipt_confirmations === "object"
      ? currentLogistics.receipt_confirmations as Record<string, string>
      : {}),
    [req.session.userId!]: new Date().toISOString()
  };
  const nextLogistics = {
    ...currentLogistics,
    receipt_confirmations: receiptConfirmations
  };
  const bothConfirmed = Boolean(receiptConfirmations[row.from_user_id] && receiptConfirmations[row.to_user_id]);
  if (bothConfirmed) {
    await q("UPDATE offers SET status='completed', logistics=$2::jsonb, expires_at=NULL, updated_at=now() WHERE id=$1", [row.id, JSON.stringify(nextLogistics)]);
    await transferOfferOwnership(row.id, row.from_user_id, row.to_user_id, row.target_item_id);
    await logSwapStatus(row.id, req.session.userId, row.status, "completed", "receipt_confirmed");
    await awardSwapCompletionCredits(row.id, row.from_user_id, row.to_user_id);
    await appendOfferSystemMessage(row.id, "แลกเปลี่ยนสำเร็จแล้ว", { status: "completed" });
  } else {
    await q("UPDATE offers SET logistics=$2::jsonb, updated_at=now() WHERE id=$1", [row.id, JSON.stringify(nextLogistics)]);
    await appendOfferSystemMessage(row.id, "อีกฝ่ายยืนยันรับของแล้ว", { status: row.status, phase: "receipt_confirmed" });
  }
  const notifyUserId = row.from_user_id === req.session.userId ? row.to_user_id : row.from_user_id;
  await createNotificationEntry(
    notifyUserId,
    "offer_status",
    bothConfirmed ? "ดีลนี้ยืนยันรับของครบแล้ว" : "อีกฝ่ายยืนยันรับของแล้ว",
    bothConfirmed ? "ระบบเปลี่ยนดีลนี้เป็นสำเร็จเรียบร้อยแล้ว" : "รอคุณกดยืนยันรับของเพื่อปิดดีล",
    {
      offer_id: row.id,
      status: bothConfirmed ? "completed" : row.status,
      inbox_tab: offerInboxTabForUser(row, notifyUserId)
    }
  );
  res.json({ ok: true, status: bothConfirmed ? "completed" : row.status, confirmed: bothConfirmed, logistics: nextLogistics });
}
app.post("/api/offers/:id/confirm", requireAuth, asyncRoute(confirmOfferReceipt));
app.post("/api/offers/:id/confirm-receipt", requireAuth, asyncRoute(confirmOfferReceipt));
app.post("/api/offers/:id/request-return", requireAuth, asyncRoute(async (req, res) => {
  const row = await readParticipantOffer(String(req.params.id), req.session.userId!);
  if (!row) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบข้อเสนอ" });
  if (!["accepted", "scheduled", "handover_pending", "reported"].includes(String(row.status || ""))) {
    return invalidTransition(res, "ขอคืนสินค้าได้เฉพาะดีลที่ยังไม่ยืนยันรับของครบ");
  }
  const currentLogistics = normalizeOfferLogistics(row.logistics);
  const nextLogistics = {
    ...currentLogistics,
    return_requested_by: req.session.userId,
    return_reason: String(req.body?.reason || "ต้องการคืนสินค้า").trim().slice(0, 240)
  };
  const updated = await persistOfferStatus(row, req.session.userId!, "reported", {
    note: "return_requested",
    logistics: nextLogistics,
    notifyUserId: row.from_user_id === req.session.userId ? row.to_user_id : row.from_user_id,
    notifyType: "report_update",
    notifyTitle: "อีกฝ่ายรายงานปัญหาในดีลนี้",
    notifyBody: nextLogistics.return_reason || "ดีลนี้ถูกทำเครื่องหมายว่ามีปัญหา",
    systemMessageText: "มีการรายงานปัญหาและขอคืนสินค้า"
  });
  res.json({ ok: true, status: updated.status, logistics: nextLogistics });
}));
app.post("/api/offers/:id/report", requireAuth, asyncRoute(async (req, res) => {
  const row = await readParticipantOffer(String(req.params.id), req.session.userId!);
  if (!row) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบข้อเสนอ" });
  if (row.status === "completed") {
    return invalidTransition(res, "ดีลที่สำเร็จแล้วไม่สามารถเปลี่ยนเป็นสถานะรายงานปัญหาได้");
  }
  const body = z.object({
    reason: z.string().trim().min(2).max(120),
    description: z.string().trim().max(600).optional()
  }).parse(req.body);
  const report = await q(
    `INSERT INTO reports(reporter_user_id,target_type,target_id,reason,description)
     VALUES($1,'swap',$2,$3,$4)
     RETURNING *`,
    [req.session.userId, row.id, body.reason, body.description || ""]
  );
  const nextStatus = terminalOfferStatuses.has(String(row.status || "")) ? row.status : "reported";
  if (nextStatus === "reported" && row.status !== "reported") {
    await persistOfferStatus(row, req.session.userId!, "reported", {
      note: body.reason,
      logistics: {
        ...normalizeOfferLogistics(row.logistics),
        report_issue: {
          reason: body.reason,
          description: body.description || "",
          actor_user_id: req.session.userId,
          created_at: new Date().toISOString()
        }
      },
      notifyUserId: row.from_user_id === req.session.userId ? row.to_user_id : row.from_user_id,
      notifyType: "report_update",
      notifyTitle: "มีการรายงานปัญหาในดีลนี้",
      notifyBody: body.reason,
      systemMessageText: "มีการรายงานปัญหาในดีลนี้"
    });
  } else {
    await createNotificationEntry(
      row.from_user_id === req.session.userId ? row.to_user_id : row.from_user_id,
      "report_update",
      "มีการรายงานปัญหาในดีลนี้",
      body.reason,
      { offer_id: row.id, status: row.status, inbox_tab: offerInboxTabForUser(row, row.from_user_id === req.session.userId ? row.to_user_id : row.from_user_id) }
    );
    await appendOfferSystemMessage(row.id, "มีการรายงานปัญหาในดีลนี้", { status: row.status, reason: body.reason });
  }
  res.status(201).json({ report: report.rows[0], status: nextStatus });
}));

app.get("/api/wallet", requireAuth, asyncRoute(async (req, res) => res.json({ wallet: await readWalletRecord(req.session.userId!) })));
app.get("/api/transactions", requireAuth, asyncRoute(async (req, res) => res.json({ transactions: (await q("SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC", [req.session.userId])).rows })));
app.post("/api/wallet/deposit", requireAuth, asyncRoute(async (req, res) => {
  const { amount } = z.object({ amount: z.number().int().min(50).max(50000) }).parse(req.body);
  await createCreditTransaction({
    userId: req.session.userId!,
    amount,
    type: "deposit",
    description: `เติมเครดิต ${amount} เครดิต`,
    sourceKind: "deposit"
  });
  res.json({ wallet: await readWalletRecord(req.session.userId!) });
}));
app.post("/api/credits/apply-rule", requireAuth, asyncRoute(async (req, res) => {
  const body = z.object({
    rule_key: z.enum(["signup_bonus", "swap_completed", "profile_completed", "follow_created", "review_submitted"]),
    source_id: z.string().optional()
  }).parse(req.body);
  const transaction = await applyCreditRule(req.session.userId!, body.rule_key, body.source_id || null);
  res.json({ wallet: await readWalletRecord(req.session.userId!), transaction });
}));

app.get("/api/notifications", requireAuth, asyncRoute(async (req, res) => res.json({ notifications: (await q("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC", [req.session.userId])).rows })));
app.get("/api/notifications/unread-count", requireAuth, asyncRoute(async (req, res) => {
  const unread = await q<{ unread_count: string }>(
    "SELECT count(*)::text AS unread_count FROM notifications WHERE user_id=$1 AND read_at IS NULL",
    [req.session.userId]
  );
  res.json({ unread_count: Number(unread.rows[0]?.unread_count || 0) });
}));
app.post("/api/notifications/read", requireAuth, asyncRoute(async (req, res) => {
  // Branch in app code so the query is dialect-agnostic. The earlier
  // `($2::uuid IS NULL OR id=$2)` pattern relied on id being UUID, which
  // works on PGlite but throws "operator does not exist: text = uuid" on
  // production Supabase where id is TEXT.
  const targetId = req.body?.id;
  if (targetId) {
    await q("UPDATE notifications SET read_at=now() WHERE user_id=$1 AND id=$2", [req.session.userId, String(targetId)]);
  } else {
    await q("UPDATE notifications SET read_at=now() WHERE user_id=$1", [req.session.userId]);
  }
  res.json({ ok: true });
}));
app.get("/api/events", requireAuth, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write(`event: ready\ndata: ${JSON.stringify({ ok: true, user_id: req.session.userId })}\n\n`);
  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`);
  }, 30000);
  req.on("close", () => clearInterval(heartbeat));
});

app.get("/api/deals/mine", requireAuth, asyncRoute(async (req, res) => res.json({ deals: (await q("SELECT * FROM deals WHERE buyer_id=$1 OR seller_id=$1 ORDER BY created_at DESC", [req.session.userId])).rows })));
app.get("/api/deals/:id", requireAuth, asyncRoute(async (req, res) => res.json({ deal: (await q("SELECT * FROM deals WHERE id=$1 AND (buyer_id=$2 OR seller_id=$2)", [req.params.id, req.session.userId])).rows[0] })));
app.patch("/api/deals/:id/stage", requireAuth, asyncRoute(async (req, res) => { await q("UPDATE deals SET stage=$1, updated_at=now() WHERE id=$2 AND (buyer_id=$3 OR seller_id=$3)", [req.body.stage, req.params.id, req.session.userId]); res.json({ ok: true }); }));
app.patch("/api/deals/:id/logistics", requireAuth, asyncRoute(async (req, res) => { await q("UPDATE deals SET logistics=$1, updated_at=now() WHERE id=$2 AND (buyer_id=$3 OR seller_id=$3)", [req.body.logistics || {}, req.params.id, req.session.userId]); res.json({ ok: true }); }));

app.post("/api/shipments/:offerId/start", requireAuth, asyncRoute(async (req, res) => {
  const offerId = String(req.params.offerId);
  const participant = await readParticipantOffer(offerId, req.session.userId!);
  if (!participant) return res.status(403).json({ error: "FORBIDDEN", message: "ไม่มีสิทธิ์เริ่มขนส่งสำหรับข้อเสนอนี้" });
  if (!["accepted", "scheduled", "handover_pending", "reported"].includes(String(participant.status || ""))) {
    return res.status(400).json({ error: "INVALID_STATE", message: "เริ่มนัดรับสินค้าได้หลังจากทั้งสองฝ่ายตอบรับข้อเสนอแล้วเท่านั้น" });
  }
  const pickupWindow = String(req.body.pickup_window || "").trim().slice(0, 120);
  const shippingPayer = ["split", "requester", "owner"].includes(String(req.body.shipping_payer || ""))
    ? String(req.body.shipping_payer)
    : "split";
  const currentOffer = await q<{ logistics: any }>("SELECT logistics FROM offers WHERE id=$1", [offerId]);
  const shippingMethod = ["courier", "meetup"].includes(String(req.body.shipping_method || ""))
    ? String(req.body.shipping_method)
    : "courier";
  const meetupLocation = String(req.body.meetup_location || "").trim().slice(0, 160);
  const meetupMapsUrl = String(req.body.meetup_maps_url || "").trim().slice(0, 400);
  const meetupTime = String(req.body.meetup_time || "").trim().slice(0, 120);
  const meetupNote = String(req.body.meetup_note || "").trim().slice(0, 240);
  const nextLogistics = {
    ...normalizeOfferLogistics(currentOffer.rows[0]?.logistics),
    shipping_payer: shippingPayer,
    pickup_window: pickupWindow,
    shipping_method: shippingMethod,
    meetup_location: meetupLocation,
    meetup_maps_url: meetupMapsUrl,
    meetup_time: meetupTime,
    meetup_note: meetupNote,
    schedule_confirmations: {
      [req.session.userId!]: new Date().toISOString()
    }
  };
  const existing = await q("SELECT * FROM shipments WHERE offer_id=$1", [offerId]);
  if (existing.rows[0] && !["started", "picked_up"].includes(String(existing.rows[0].current_step || "started"))) {
    return invalidTransition(res, "แก้แผนนัดรับได้ก่อนเริ่มส่งมอบจริงเท่านั้น");
  }
  await q(
    "UPDATE offers SET status='accepted', logistics=$2::jsonb, updated_at=now() WHERE id=$1",
    [offerId, JSON.stringify(nextLogistics)]
  );
  if (participant.status !== "accepted") {
    await logSwapStatus(offerId, req.session.userId, participant.status, "accepted", "schedule_reset");
  }
  await createNotificationEntry(
    participant.from_user_id === req.session.userId ? participant.to_user_id : participant.from_user_id,
    "offer_status",
    "มีการอัปเดตแผนนัดรับของ",
    "อีกฝ่ายเพิ่งบันทึกหรือปรับข้อมูลการนัดรับใหม่",
    { offer_id: offerId, status: "accepted", inbox_tab: offerInboxTabForUser(participant, participant.from_user_id === req.session.userId ? participant.to_user_id : participant.from_user_id) }
  );
  await appendOfferSystemMessage(offerId, "บันทึกแผนนัดรับหรือวิธีส่งมอบแล้ว", { status: "accepted" });
  if (existing.rows[0]) return res.status(200).json({ shipment: existing.rows[0] });
  const r = await q(
    "INSERT INTO shipments(offer_id,current_step,tracking_number,pickup_photo_url) VALUES($1,'started',$2,$3) RETURNING *",
    [offerId, req.body.tracking_number || "", req.body.pickup_photo_url || null]
  );
  res.status(201).json({ shipment: r.rows[0] });
}));
app.get("/api/shipments/:offerId", requireAuth, asyncRoute(async (req, res) => {
  const offerId = String(req.params.offerId);
  const participant = await shipmentParticipantByOfferId(offerId, req.session.userId);
  if (!participant) return res.status(403).json({ error: "FORBIDDEN", message: "ไม่มีสิทธิ์ดูขนส่งสำหรับข้อเสนอนี้" });
  res.json({ shipment: (await q("SELECT * FROM shipments WHERE offer_id=$1", [offerId])).rows[0] });
}));
app.post("/api/shipments/:id/update-step", requireAuth, asyncRoute(async (req, res) => {
  const shipmentId = String(req.params.id);
  const participant = await shipmentParticipantByShipmentId(shipmentId, req.session.userId);
  if (!participant) return res.status(403).json({ error: "FORBIDDEN", message: "ไม่มีสิทธิ์อัปเดตขนส่งสำหรับดีลนี้" });
  const shipment = await q<{ current_step: string; status: string }>("SELECT current_step,status FROM shipments WHERE id=$1", [shipmentId]);
  if (!shipment.rows[0]) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบงานขนส่ง" });
  if (!["scheduled", "handover_pending"].includes(String(participant.offer_status || ""))) {
    return invalidTransition(res, "ต้องยืนยันแผนนัดรับให้ครบก่อน จึงจะขยับสถานะการส่งมอบได้");
  }
  const nextStep = String(req.body.current_step || "");
  const allowedTransitions: Record<string, string> = {
    started: "picked_up",
    picked_up: "in_transit"
  };
  if (shipment.rows[0].current_step === "finished") return invalidTransition(res, "งานขนส่งนี้ถูกปิดแล้ว");
  if (allowedTransitions[shipment.rows[0].current_step] !== nextStep) {
    return invalidTransition(res, "ลำดับขั้นตอนขนส่งไม่ถูกต้อง");
  }
  await q(
    "UPDATE shipments SET current_step=$1,status='in_progress',pickup_photo_url=COALESCE($3,pickup_photo_url),dropoff_photo_url=COALESCE($4,dropoff_photo_url),updated_at=now() WHERE id=$2",
    [nextStep, shipmentId, req.body.pickup_photo_url || null, req.body.dropoff_photo_url || null]
  );
  if (participant.offer_status === "scheduled") {
    await q("UPDATE offers SET status='handover_pending', updated_at=now() WHERE id=$1", [participant.offer_id]);
    await logSwapStatus(participant.offer_id, req.session.userId, "scheduled", "handover_pending", "handover_started");
    await appendOfferSystemMessage(participant.offer_id, "เริ่มขั้นตอนส่งมอบแล้ว", { status: "handover_pending", current_step: nextStep });
  }
  await createNotificationEntry(
    participant.from_user_id === req.session.userId ? participant.to_user_id : participant.from_user_id,
    "offer_status",
    "ดีลนี้กำลังเข้าสู่ขั้นส่งมอบ",
    nextStep === "picked_up" ? "อีกฝ่ายเริ่มรับของแล้ว" : "อีกฝ่ายอัปเดตว่ากำลังอยู่ระหว่างส่งมอบ",
    { offer_id: participant.offer_id, status: "handover_pending", inbox_tab: offerInboxTabForUser(participant, participant.from_user_id === req.session.userId ? participant.to_user_id : participant.from_user_id) }
  );
  res.json({ ok: true });
}));
app.post("/api/shipments/:id/finish", requireAuth, asyncRoute(async (req, res) => {
  const shipmentId = String(req.params.id);
  const participant = await shipmentParticipantByShipmentId(shipmentId, req.session.userId);
  if (!participant) return res.status(403).json({ error: "FORBIDDEN", message: "ไม่มีสิทธิ์ปิดงานขนส่งสำหรับดีลนี้" });
  const shipment = await q<{ current_step: string; status: string }>("SELECT current_step,status FROM shipments WHERE id=$1", [shipmentId]);
  if (!shipment.rows[0]) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบงานขนส่ง" });
  if (shipment.rows[0].current_step === "finished") return res.json({ ok: true });
  if (shipment.rows[0].current_step !== "in_transit") {
    return invalidTransition(res, "ปิดงานขนส่งได้เมื่ออัปเดตเป็นกำลังจัดส่งแล้วเท่านั้น");
  }
  await q("UPDATE shipments SET current_step='finished',status='finished',dropoff_photo_url=COALESCE($2,dropoff_photo_url),updated_at=now() WHERE id=$1", [shipmentId, req.body.dropoff_photo_url || null]);
  await appendOfferSystemMessage(participant.offer_id, "ยืนยันการส่งมอบแล้ว", { status: "handover_pending", current_step: "finished" });
  await createNotificationEntry(
    participant.from_user_id === req.session.userId ? participant.to_user_id : participant.from_user_id,
    "offer_status",
    "ขั้นตอนส่งมอบเสร็จแล้ว",
    "อีกฝ่ายปิดขั้นตอนส่งมอบแล้ว คุณสามารถเข้ามายืนยันรับของเพื่อปิดดีลได้",
    { offer_id: participant.offer_id, status: "handover_pending", inbox_tab: offerInboxTabForUser(participant, participant.from_user_id === req.session.userId ? participant.to_user_id : participant.from_user_id) }
  );
  res.json({ ok: true });
}));

app.get("/api/chat/conversations", requireAuth, asyncRoute(async (req, res) => {
  const conversations = await q(
    `SELECT c.id,
            c.offer_id,
            COALESCE(c.item_id, offer.target_item_id) AS item_id,
            c.created_at,
            COALESCE(latest.created_at, c.updated_at) AS updated_at,
            other.user_id AS counterpart_id,
            profile.display_name AS counterpart_name,
            profile.avatar_url AS counterpart_avatar,
            context_item.title AS item_title,
            image.url AS item_image,
            context_item.status AS item_status,
            offer.status AS offer_status,
            latest.text AS last_message_text,
            latest.message_type AS last_message_type,
            latest.created_at AS last_message_at,
            latest.sender_id AS last_message_sender_id,
            COALESCE(unread.unread_count, 0)::int AS unread_count
     FROM chat_conversations c
     JOIN chat_participants self ON self.conversation_id=c.id AND self.user_id=$1
     LEFT JOIN offers offer ON offer.id=c.offer_id
     LEFT JOIN LATERAL (
       SELECT p.user_id
       FROM chat_participants p
       WHERE p.conversation_id=c.id AND p.user_id<>$1
       ORDER BY p.user_id ASC
       LIMIT 1
     ) other ON true
     LEFT JOIN profiles profile ON profile.id=other.user_id
     LEFT JOIN items context_item ON context_item.id=COALESCE(c.item_id, offer.target_item_id)
     LEFT JOIN LATERAL (
       SELECT url
       FROM item_images
       WHERE item_id=COALESCE(c.item_id, offer.target_item_id)
       ORDER BY sort_order ASC, created_at ASC
       LIMIT 1
     ) image ON true
     LEFT JOIN LATERAL (
       SELECT m.text,m.message_type,m.created_at,m.sender_id
       FROM chat_messages m
       WHERE m.conversation_id=c.id
       ORDER BY m.created_at DESC
       LIMIT 1
     ) latest ON true
     LEFT JOIN LATERAL (
       SELECT count(*)::int AS unread_count
       FROM chat_messages m
       WHERE m.conversation_id=c.id
         AND m.created_at > COALESCE(self.last_read_at, to_timestamp(0))
         AND (m.sender_id IS NULL OR m.sender_id <> $1)
     ) unread ON true
     ORDER BY COALESCE(latest.created_at, c.updated_at) DESC, c.created_at DESC`,
    [req.session.userId]
  );
  res.json({ conversations: conversations.rows });
}));
app.post("/api/chat/from-item/:itemId", requireAuth, asyncRoute(async (req, res) => {
  const itemLookup = await q<{ id: string; owner_id: string; status: string }>(
    "SELECT id,owner_id,status FROM items WHERE id=$1 LIMIT 1",
    [req.params.itemId]
  );
  const row = itemLookup.rows[0];
  if (!row) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบสินค้าที่จะเปิดแชท" });
  if (row.owner_id === req.session.userId) {
    return res.status(400).json({ error: "OWN_ITEM", message: "ไม่สามารถเปิดแชทกับสินค้าของตัวเองได้" });
  }
  if ((row.status || "active") !== "active") {
    return res.status(409).json({ error: "ITEM_UNAVAILABLE", message: "สินค้านี้ยังไม่พร้อมเปิดแชทในตอนนี้" });
  }
  const conversationId = await ensureItemConversation(row.id, req.session.userId!, row.owner_id);
  res.status(201).json({ conversation_id: conversationId });
}));
app.post("/api/chat/from-swap/:offerId", requireAuth, asyncRoute(async (req, res) => {
  const offer = await q<{ id: string; from_user_id: string; to_user_id: string }>(
    "SELECT id,from_user_id,to_user_id FROM offers WHERE id=$1 AND (from_user_id=$2 OR to_user_id=$2)",
    [req.params.offerId, req.session.userId]
  );
  const row = offer.rows[0];
  if (!row) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบดีลที่ใช้เปิดแชท" });
  const conversationId = await ensureConversation(row.id, row.from_user_id, row.to_user_id);
  res.status(201).json({ conversation_id: conversationId });
}));
app.get("/api/chat/conversations/:id", requireAuth, asyncRoute(async (req, res) => {
  const conversationId = String(req.params.id);
  const conversation = await loadConversationDetail(conversationId, req.session.userId);
  if (!conversation) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบห้องแชทนี้" });
  res.json({ conversation });
}));
app.get("/api/chat/conversations/:id/messages", requireAuth, asyncRoute(async (req, res) => {
  const conversationId = String(req.params.id);
  const access = await readConversationAccess(conversationId, req.session.userId);
  if (!access) return res.status(403).json({ error: "FORBIDDEN", message: "ไม่มีสิทธิ์ดูแชทนี้" });
  await markConversationRead(conversationId, req.session.userId!);
  await markMessageNotificationsRead(req.session.userId!, conversationId);
  res.json({
    messages: (
      await q(
        "SELECT m.* FROM chat_messages m JOIN chat_participants p ON p.conversation_id=m.conversation_id WHERE m.conversation_id=$1 AND p.user_id=$2 ORDER BY m.created_at ASC",
        [conversationId, req.session.userId]
      )
    ).rows
  });
}));
app.post("/api/chat/conversations/:id/messages", requireAuth, asyncRoute(async (req, res) => {
  const conversationId = String(req.params.id);
  const access = await readConversationAccess(conversationId, req.session.userId);
  if (!access) return res.status(403).json({ error: "FORBIDDEN", message: "ไม่มีสิทธิ์ส่งข้อความในแชทนี้" });
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "VALIDATION_ERROR", message: "กรอกข้อความก่อนส่ง" });
  if (text.length > 1000) return res.status(400).json({ error: "VALIDATION_ERROR", message: "ข้อความยาวเกินไป" });
  const exists = await q<{ ok: number }>(
    "SELECT 1 AS ok FROM chat_participants WHERE conversation_id=$1 AND user_id=$2 LIMIT 1",
    [conversationId, req.session.userId]
  );
  if (!exists.rows[0]) return res.status(403).json({ error: "FORBIDDEN", message: "ไม่มีสิทธิ์ส่งข้อความในแชทนี้" });
  const message = await appendConversationMessage({
    conversationId,
    senderId: req.session.userId!,
    text,
    messageType: "user",
    metadata: { offer_id: access.offer_id, item_id: access.item_id }
  });
  await notifyConversationRecipients(conversationId, req.session.userId!, text);
  res.status(201).json({ message });
}));

app.get("/api/rewards", asyncRoute(async (_req, res) => {
  const rewards = await q("SELECT * FROM system_reward_items WHERE status='active' ORDER BY credit_cost ASC, created_at DESC");
  res.json({ rewards: rewards.rows });
}));
app.get("/api/rewards/:id", asyncRoute(async (req, res) => {
  const reward = await q("SELECT * FROM system_reward_items WHERE id::text=$1 OR slug=$1 LIMIT 1", [req.params.id]);
  if (!reward.rows[0]) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบของรางวัลระบบ" });
  res.json({ reward: reward.rows[0] });
}));
app.post("/api/rewards/:id/redeem", requireAuth, asyncRoute(async (req, res) => {
  const reward = await q<{ id: string; title: string; credit_cost: number; inventory_count: number; status: string }>(
    "SELECT id,title,credit_cost,inventory_count,status FROM system_reward_items WHERE (id::text=$1 OR slug=$1) LIMIT 1",
    [req.params.id]
  );
  const row = reward.rows[0];
  if (!row || row.status !== "active") return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบของรางวัลระบบ" });
  if (Number(row.inventory_count || 0) <= 0) return res.status(409).json({ error: "OUT_OF_STOCK", message: "ของรางวัลนี้หมดชั่วคราว" });
  const wallet = await readWalletRecord(req.session.userId!);
  if (Number(wallet?.credit_balance || 0) < Number(row.credit_cost || 0)) {
    return res.status(409).json({ error: "INSUFFICIENT_CREDIT", message: "เครดิตไม่เพียงพอสำหรับแลกรางวัลนี้" });
  }
  const redemption = await q<{ id: string }>(
    "INSERT INTO reward_redemptions(user_id,reward_item_id,credit_amount,status) VALUES($1,$2,$3,'completed') RETURNING id",
    [req.session.userId, row.id, row.credit_cost]
  );
  await createCreditTransaction({
    userId: req.session.userId!,
    amount: -Number(row.credit_cost || 0),
    type: "redeem",
    description: `แลกรางวัล ${row.title}`,
    sourceKind: "reward_redemption",
    sourceId: redemption.rows[0].id,
    ruleKey: `reward_redeem:${redemption.rows[0].id}`
  });
  await createNotificationEntry(
    req.session.userId!,
    "reward_redeemed",
    "แลกรางวัลสำเร็จแล้ว",
    `คุณใช้ QX Credit แลก ${row.title} สำเร็จ`,
    {
      reward_id: row.id,
      redemption_id: redemption.rows[0].id
    }
  );
  await q("UPDATE system_reward_items SET inventory_count=GREATEST(inventory_count-1,0), updated_at=now() WHERE id=$1", [row.id]);
  await q(
    `INSERT INTO feed_posts(source_key, actor_user_id, post_type, reward_item_id, visibility)
     VALUES($1, $2, 'reward_redemption', $3, 'public')
     ON CONFLICT(source_key) DO UPDATE SET actor_user_id = EXCLUDED.actor_user_id, reward_item_id = EXCLUDED.reward_item_id, updated_at = now()`,
    [`reward:${redemption.rows[0].id}`, req.session.userId, row.id]
  );
  res.status(201).json({
    redemption: (await q("SELECT * FROM reward_redemptions WHERE id=$1", [redemption.rows[0].id])).rows[0],
    wallet: await readWalletRecord(req.session.userId!)
  });
}));

app.get("/api/reviews", asyncRoute(async (req, res) => {
  const params: unknown[] = [];
  const where: string[] = [];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  if (req.query.reviewee_user_id) where.push(`r.reviewee_user_id=${add(String(req.query.reviewee_user_id))}`);
  if (req.query.reviewer_user_id) where.push(`r.reviewer_user_id=${add(String(req.query.reviewer_user_id))}`);
  if (req.query.offer_id) where.push(`r.offer_id=${add(String(req.query.offer_id))}`);
  const reviews = await q(
    `SELECT r.* FROM reviews r ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY r.created_at DESC LIMIT 50`,
    params
  );
  res.json({ reviews: reviews.rows });
}));
app.post("/api/reviews", requireAuth, asyncRoute(async (req, res) => {
  const body = z.object({
    reviewee_user_id: z.string().uuid(),
    offer_id: z.string().uuid().optional(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(400).optional()
  }).parse(req.body);
  if (body.reviewee_user_id === req.session.userId) {
    return res.status(400).json({ error: "INVALID_REVIEW", message: "ไม่สามารถรีวิวตัวเองได้" });
  }
  if (body.offer_id) {
    const offer = await q<{ id: string; from_user_id: string; to_user_id: string; status: string }>(
      "SELECT id,from_user_id,to_user_id,status FROM offers WHERE id=$1 LIMIT 1",
      [body.offer_id]
    );
    const offerRow = offer.rows[0];
    if (!offerRow) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบดีลสำหรับรีวิว" });
    if (offerRow.status !== "completed") return res.status(409).json({ error: "INVALID_STATE", message: "รีวิวได้หลังจบดีลเท่านั้น" });
    if (offerRow.from_user_id !== req.session.userId && offerRow.to_user_id !== req.session.userId) {
      return res.status(403).json({ error: "FORBIDDEN", message: "ไม่มีสิทธิ์รีวิวดิลนี้" });
    }
  }
  const existingReview = await q<{ id: string }>(
    "SELECT id FROM reviews WHERE reviewer_user_id=$1 AND COALESCE(offer_id::text,'') = COALESCE($2,'') LIMIT 1",
    [req.session.userId, body.offer_id || null]
  );
  if (existingReview.rows[0]) {
    return res.status(409).json({ error: "REVIEW_EXISTS", message: "คุณรีวิวดีลนี้ไปแล้ว" });
  }
  const review = await q(
    `INSERT INTO reviews(reviewer_user_id, reviewee_user_id, offer_id, rating, comment)
     VALUES($1,$2,$3,$4,$5)
     RETURNING *`,
    [req.session.userId, body.reviewee_user_id, body.offer_id || null, body.rating, body.comment || ""]
  );
  try {
    await applyCreditRule(req.session.userId!, "review_submitted", review.rows[0].id);
  } catch {
    // ignore repeated reward attempts for the same review
  }
  res.status(201).json({ review: review.rows[0] });
}));

app.post("/api/reports", requireAuth, asyncRoute(async (req, res) => {
  const body = z.object({
    target_type: z.string().trim().min(2).max(80),
    target_id: z.string().trim().min(1).max(120),
    reason: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000).optional()
  }).parse(req.body);
  const report = await q(
    `INSERT INTO reports(reporter_user_id, target_type, target_id, reason, description)
     VALUES($1,$2,$3,$4,$5)
     RETURNING *`,
    [req.session.userId, body.target_type, body.target_id, body.reason, body.description || ""]
  );
  res.status(201).json({ report: report.rows[0] });
}));

app.post("/api/dev/seed/reset", asyncRoute(async (_req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "FORBIDDEN", message: "ไม่เปิดใช้งานใน production" });
  }
  await resetSeedData();
  res.json({ ok: true });
}));

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const requestId = (req as Request & { requestId?: string }).requestId;
  emitLog({
    ts: new Date().toISOString(),
    level: "error",
    requestId: requestId || null,
    method: req.method,
    path: req.path,
    error: err?.name || "Error",
    message: err?.message || String(err),
    stack: isProductionEnv ? undefined : err?.stack
  });
  if (err instanceof z.ZodError) return res.status(400).json({ error: "VALIDATION_ERROR", message: "ข้อมูลไม่ถูกต้อง", details: err.flatten(), requestId });
  res.status(500).json({ error: "SERVER_ERROR", message: err.message || "เกิดข้อผิดพลาด", requestId });
});

export async function createApp() {
  validateRuntimeConfig();
  await migrate();
  await seed();
  return app;
}

if (process.env.NODE_ENV !== "test") {
  createApp().then(() => app.listen(port, () => console.log(`QXwap API listening on ${port}`))).catch((err) => {
    console.error("QXwap API failed to start", err);
    process.exit(1);
  });
}
