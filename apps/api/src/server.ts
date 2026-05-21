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
import { migrate, q, requiredTables, seed } from "./db.js";
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
    `SELECT u.id,u.email,u.created_at,p.display_name,p.username,p.city,p.bio,p.avatar_url,p.rating,p.response_time_minutes,p.is_featured,p.is_fast_responder,p.account_level,p.latitude,p.longitude
     FROM users u LEFT JOIN profiles p ON p.id=u.id WHERE u.id=$1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function publicProfile(userId: string) {
  const result = await q(
    `SELECT p.id,p.display_name,p.username,p.city,p.bio,p.avatar_url,p.rating,p.response_time_minutes,p.is_featured,p.is_fast_responder,
            count(i.id)::int AS listing_count
     FROM profiles p
     LEFT JOIN items i ON i.owner_id=p.id AND i.status='active'
     WHERE p.id=$1
     GROUP BY p.id`,
    [userId]
  );
  return result.rows[0] || null;
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
    is_featured: Boolean(row.is_featured),
    is_fast_responder: Boolean(row.is_fast_responder),
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner: {
      id: row.owner_id,
      name: row.owner_name || "QXwap user",
      avatar_url: row.owner_avatar || "",
      rating: Number(row.owner_rating || 0)
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
    `SELECT i.*, p.display_name owner_name, p.avatar_url owner_avatar, p.rating owner_rating,
            COALESCE((SELECT count(*) FROM item_owner_history h WHERE h.item_id=i.id), 0) AS trade_count,
            COALESCE(array_agg(img.url ORDER BY img.sort_order) FILTER (WHERE img.url IS NOT NULL), '{}') AS images,
            (i.owner_id=$2) AS is_owner,
            EXISTS(SELECT 1 FROM bookmarks b WHERE b.user_id=$2 AND b.item_id=i.id) AS is_bookmarked
     FROM items i
     LEFT JOIN profiles p ON p.id=i.owner_id
     LEFT JOIN item_images img ON img.item_id=i.id
     WHERE i.id::text = ANY($1::text[])
     GROUP BY i.id,p.display_name,p.avatar_url,p.rating`,
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
  const where = ["i.status='active'"];
  const add = (value: unknown) => {
    p.push(value);
    return `$${p.length}`;
  };
  const limitValue = Math.max(1, Math.min(Number(req.query.limit || 20) || 20, 40));
  const offsetValue = Math.max(0, Number(req.query.offset || 0) || 0);
  const me = add(req.session.userId || null);
  if (ownerOverride || req.query.owner_id) where.push(`i.owner_id=${add(ownerOverride || req.query.owner_id)}`);
  if (req.query.q) {
    const v = `%${String(req.query.q).trim()}%`;
    const ix = add(v);
    where.push(`(i.title ILIKE ${ix} OR i.description ILIKE ${ix} OR i.wanted_text ILIKE ${ix} OR i.location_label ILIKE ${ix} OR EXISTS (SELECT 1 FROM unnest(i.wanted_tags) tag WHERE tag ILIKE ${ix}))`);
  }
  if (req.query.category) where.push(`i.category=${add(req.query.category)}`);
  if (req.query.condition) where.push(`i.condition=${add(req.query.condition)}`);
  if (req.query.deal_type) where.push(`i.deal_type=${add(req.query.deal_type)}`);
  if (req.query.wanted_tag) where.push(`${add(normalizeHashtag(String(req.query.wanted_tag)))}=ANY(i.wanted_tags)`);
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
  await q("INSERT INTO wallets(user_id,credit_balance) VALUES($1,100)", [user.rows[0].id]);
  await q("INSERT INTO transactions(user_id,amount,type,description) VALUES($1,100,'activity','สมัคร QXwap รับ Manu Credit เริ่มต้น')", [user.rows[0].id]);
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
});

async function readItemForOwner(ownerId: string, itemId: string, sessionUserId?: string | null) {
  return (await listItems({ query: { owner_id: ownerId, limit: "40" }, session: { userId: sessionUserId || ownerId } as Request["session"] })).items.find((x: any) => x.id === itemId) || null;
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
      `INSERT INTO items(owner_id,title,description,category,condition,deal_type,price_cash,price_cash_unknown,price_credit,open_to_offers,wanted_text,wanted_tags,location_label,latitude,longitude)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [
        req.session.userId,
        body.title,
        body.description || "",
        body.category || "Other",
        body.condition || "Good",
        body.deal_type,
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
  const fields = ["title","description","category","condition","deal_type","price_cash","price_cash_unknown","price_credit","open_to_offers","wanted_text","wanted_tags","location_label","latitude","longitude"];
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
  res.json({ item: (await listItems({ query: { owner_id: req.session.userId, limit: "40" }, session: req.session })).items.find((x: any) => x.id === req.params.id) });
}));
app.delete("/api/items/:id", requireAuth, asyncRoute(async (req, res) => {
  const deleted = await q("DELETE FROM items WHERE id=$1 AND owner_id=$2 RETURNING id", [req.params.id, req.session.userId]);
  if (!deleted.rows[0]) return res.status(403).json({ error: "FORBIDDEN", message: "ลบได้เฉพาะสินค้าของคุณ" });
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
  await q("INSERT INTO bookmarks(user_id,item_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [req.session.userId, req.body.item_id]);
  res.json({ ok: true });
}));
app.delete("/api/bookmarks/:id", requireAuth, asyncRoute(async (req, res) => { await q("DELETE FROM bookmarks WHERE user_id=$1 AND item_id=$2", [req.session.userId, req.params.id]); res.json({ ok: true }); }));

app.get("/api/follows", requireAuth, asyncRoute(async (req, res) => res.json({ follows: (await q(
  `SELECT p.id,p.display_name,p.username,p.city,p.bio,p.avatar_url,p.rating,p.response_time_minutes,p.is_featured,p.is_fast_responder,p.account_level,p.latitude,p.longitude,f.created_at
   FROM follows f JOIN profiles p ON p.id=f.following_id
   WHERE f.follower_id=$1 ORDER BY f.created_at DESC`,
  [req.session.userId]
)).rows })));
app.post("/api/follows/:id", requireAuth, asyncRoute(async (req, res) => { await q("INSERT INTO follows(follower_id,following_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [req.session.userId, req.params.id]); res.json({ ok: true }); }));
app.delete("/api/follows/:id", requireAuth, asyncRoute(async (req, res) => { await q("DELETE FROM follows WHERE follower_id=$1 AND following_id=$2", [req.session.userId, req.params.id]); res.json({ ok: true }); }));

async function ensureConversation(offerId: string, a: string, b: string) {
  const existing = await q<{ id: string }>("SELECT id FROM chat_conversations WHERE offer_id=$1", [offerId]);
  if (existing.rows[0]) return existing.rows[0].id;
  const conv = await q<{ id: string }>("INSERT INTO chat_conversations(offer_id) VALUES($1) RETURNING id", [offerId]);
  await q("INSERT INTO chat_participants(conversation_id,user_id) VALUES($1,$2),($1,$3) ON CONFLICT DO NOTHING", [conv.rows[0].id, a, b]);
  return conv.rows[0].id;
}

async function transferOfferOwnership(offerId: string, fromUserId: string, toUserId: string, targetItemId: string) {
  const offeredItems = await q<{ item_id: string }>(
    "SELECT item_id FROM offer_items WHERE offer_id=$1 ORDER BY created_at ASC",
    [offerId]
  );

  await q("UPDATE items SET owner_id=$1, status='active', updated_at=now() WHERE id=$2", [fromUserId, targetItemId]);
  await q(
    "INSERT INTO item_owner_history(item_id,offer_id,previous_owner_id,new_owner_id,status) VALUES($1,$2,$3,$4,'confirmed')",
    [targetItemId, offerId, toUserId, fromUserId]
  );

  for (const entry of offeredItems.rows) {
    await q("UPDATE items SET owner_id=$1, status='active', updated_at=now() WHERE id=$2", [toUserId, entry.item_id]);
    await q(
      "INSERT INTO item_owner_history(item_id,offer_id,previous_owner_id,new_owner_id,status) VALUES($1,$2,$3,$4,'confirmed')",
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
  const row = detail.rows[0];
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
    chat_enabled: row.status === "accepted" || row.status === "confirmed"
  };
}

async function readConversationAccess(conversationId: string, userId?: string | null) {
  if (!userId) return null;
  const result = await q<{ offer_id: string | null; status: string | null }>(
    `SELECT c.offer_id,o.status
     FROM chat_conversations c
     JOIN chat_participants p ON p.conversation_id=c.id
     LEFT JOIN offers o ON o.id=c.offer_id
     WHERE c.id=$1 AND p.user_id=$2
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

app.get("/api/offers", requireAuth, asyncRoute(async (req, res) => res.json({ offers: (await q(
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
)).rows })));
app.get("/api/offers/sent", requireAuth, asyncRoute(async (req, res) => res.json({ offers: (await q(
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
)).rows })));
app.get("/api/offers/received", requireAuth, asyncRoute(async (req, res) => res.json({ offers: (await q(
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
)).rows })));
app.get("/api/offers/:id/detail", requireAuth, asyncRoute(async (req, res) => {
  const detail = await loadOfferDetail(String(req.params.id), req.session.userId);
  if (!detail) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบข้อเสนอ" });
  res.json(detail);
}));
app.get("/api/offers/:id", requireAuth, asyncRoute(async (req, res) => res.json({ offer: (await q("SELECT * FROM offers WHERE id=$1 AND (from_user_id=$2 OR to_user_id=$2)", [req.params.id, req.session.userId])).rows[0] })));
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
      message: "ข้อเสนอต้องมีอย่างน้อย 1 อย่าง เช่น ข้อความ สินค้าที่จะแลก เงินสด หรือเครดิต"
    });
  }
  const target = await q<{ owner_id: string; title: string }>("SELECT owner_id,title FROM items WHERE id=$1", [body.target_item_id]);
  if (!target.rows[0]) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบสินค้า" });
  if (target.rows[0].owner_id === req.session.userId) return res.status(400).json({ error: "OWN_ITEM", message: "ไม่สามารถขอแลกสินค้าของตัวเอง" });
  if (normalizedItemIds.length) {
    const mine = await q<{ id: string }>("SELECT id FROM items WHERE owner_id=$1 AND id = ANY($2::uuid[])", [req.session.userId, normalizedItemIds]);
    if (mine.rows.length !== normalizedItemIds.length) {
      return res.status(400).json({ error: "INVALID_OFFER_ITEMS", message: "มีสินค้าสำหรับแลกบางรายการที่ไม่ถูกต้อง" });
    }
  }
  const logistics = {
    shipping_payer: body.shipping_payer || "split",
    pickup_window: body.pickup_window || "",
    courier_photo_required: true,
    pickup_photo_required: true,
    dropoff_photo_required: true
  };
  const offer = await q<{ id: string }>(
    "INSERT INTO offers(from_user_id,to_user_id,target_item_id,message,cash_amount,credit_amount,instant_swap,logistics) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING id",
    [req.session.userId, target.rows[0].owner_id, body.target_item_id, normalizedMessage, body.cash_amount || 0, body.credit_amount || 0, Boolean(body.instant_swap), JSON.stringify(logistics)]
  );
  for (const id of normalizedItemIds) await q("INSERT INTO offer_items(offer_id,item_id) VALUES($1,$2)", [offer.rows[0].id, id]);
  await q("UPDATE items SET request_count=request_count+1 WHERE id=$1", [body.target_item_id]);
  await q("INSERT INTO notifications(user_id,type,title,body,data) VALUES($1,'offer','มีข้อเสนอ Xwap ใหม่',$2,$3)", [target.rows[0].owner_id, target.rows[0].title, { offer_id: offer.rows[0].id }]);
  const conv = await ensureConversation(offer.rows[0].id, req.session.userId!, target.rows[0].owner_id);
  if (normalizedMessage) await q("INSERT INTO chat_messages(conversation_id,sender_id,text) VALUES($1,$2,$3)", [conv, req.session.userId, normalizedMessage]);
  res.status(201).json({ offer_id: offer.rows[0].id, conversation_id: conv });
}));

async function transitionOffer(req: Request, res: Response, status: string) {
  const offer = await q<any>("SELECT * FROM offers WHERE id=$1", [req.params.id]);
  if (!offer.rows[0]) return res.status(404).json({ error: "NOT_FOUND" });
  const row = offer.rows[0];
  if ((status === "accepted_by_receiver" || status === "rejected") && row.to_user_id !== req.session.userId) return res.status(403).json({ error: "FORBIDDEN" });
  if (status === "accepted" && row.from_user_id !== req.session.userId) return res.status(403).json({ error: "FORBIDDEN" });
  if ((status === "cancelled" || status === "confirmed") && row.from_user_id !== req.session.userId && row.to_user_id !== req.session.userId) return res.status(403).json({ error: "FORBIDDEN" });
  if (status === "accepted_by_receiver" && row.status !== "pending") return invalidTransition(res, "ยอมรับข้อเสนอได้เฉพาะรายการที่รอตอบรับ");
  if (status === "accepted" && row.status !== "accepted_by_receiver") return invalidTransition(res, "ยืนยันรับข้อเสนอได้หลังอีกฝ่ายตอบรับแล้วเท่านั้น");
  if (status === "rejected" && row.status !== "pending") return invalidTransition(res, "ปฏิเสธข้อเสนอได้เฉพาะรายการที่รอตอบรับ");
  if (status === "cancelled" && !(row.status === "pending" || row.status === "accepted_by_receiver")) return invalidTransition(res, "ยกเลิกข้อเสนอได้เฉพาะข้อเสนอที่ยังไม่เริ่มนัดรับ");
  if (status === "confirmed") {
    if (row.status === "confirmed") return res.json({ ok: true, status: row.status });
    if (row.status !== "accepted") return invalidTransition(res, "ยืนยันการแลกได้หลังยอมรับข้อเสนอแล้วเท่านั้น");
    const shipment = await q<{ current_step: string; status: string }>("SELECT current_step,status FROM shipments WHERE offer_id=$1", [row.id]);
    if (shipment.rows[0] && shipment.rows[0].current_step !== "finished") {
      return res.status(400).json({ error: "INVALID_STATE", message: "ยืนยันการแลกได้หลังปิดงานขนส่งแล้วเท่านั้น" });
    }
  }
  const rejectionReason = status === "rejected" ? String(req.body.rejection_reason || "not_a_match") : null;
  await q("UPDATE offers SET status=$1, rejection_reason=COALESCE($3,rejection_reason), updated_at=now() WHERE id=$2", [status, req.params.id, rejectionReason]);
  if (status === "accepted") {
    const logisticsJson = typeof row.logistics === "string" ? row.logistics : JSON.stringify(row.logistics || {});
    await q("INSERT INTO deals(offer_id,buyer_id,seller_id,item_id,stage,logistics) VALUES($1,$2,$3,$4,'accepted',$5::jsonb) ON CONFLICT DO NOTHING", [row.id, row.from_user_id, row.to_user_id, row.target_item_id, logisticsJson]);
  }
  if (status === "confirmed") {
    await q("UPDATE wallets SET credit_balance=credit_balance+100, updated_at=now() WHERE user_id IN ($1,$2)", [row.from_user_id, row.to_user_id]);
    await q("INSERT INTO transactions(user_id,amount,type,description) VALUES($1,100,'swap_reward','ยืนยันการแลกสำเร็จ'),($2,100,'swap_reward','ยืนยันการแลกสำเร็จ')", [row.from_user_id, row.to_user_id]);
    await transferOfferOwnership(row.id, row.from_user_id, row.to_user_id, row.target_item_id);
  }
  const notifyUserId = row.from_user_id === req.session.userId ? row.to_user_id : row.from_user_id;
  const notifyTitle =
    status === "accepted_by_receiver"
      ? "อีกฝ่ายตอบรับข้อเสนอแล้ว"
      : status === "accepted"
        ? "ทั้งสองฝ่ายตอบรับข้อเสนอแล้ว"
        : `ข้อเสนอ ${status}`;
  await q("INSERT INTO notifications(user_id,type,title,body,data) VALUES($1,'offer_status',$2,$3,$4)", [notifyUserId, notifyTitle, "สถานะข้อเสนอมีการเปลี่ยนแปลง", { offer_id: row.id, status }]);
  res.json({ ok: true, status });
}
app.post("/api/offers/:id/accept", requireAuth, asyncRoute((req, res) => transitionOffer(req, res, "accepted_by_receiver")));
app.post("/api/offers/:id/approve", requireAuth, asyncRoute((req, res) => transitionOffer(req, res, "accepted")));
app.post("/api/offers/:id/reject", requireAuth, asyncRoute((req, res) => transitionOffer(req, res, "rejected")));
app.post("/api/offers/:id/cancel", requireAuth, asyncRoute((req, res) => transitionOffer(req, res, "cancelled")));
app.post("/api/offers/:id/confirm", requireAuth, asyncRoute((req, res) => transitionOffer(req, res, "confirmed")));

app.get("/api/wallet", requireAuth, asyncRoute(async (req, res) => res.json({ wallet: (await q("SELECT * FROM wallets WHERE user_id=$1", [req.session.userId])).rows[0] })));
app.get("/api/transactions", requireAuth, asyncRoute(async (req, res) => res.json({ transactions: (await q("SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC", [req.session.userId])).rows })));
app.post("/api/wallet/deposit", requireAuth, asyncRoute(async (req, res) => {
  const { amount } = z.object({ amount: z.number().int().min(50).max(50000) }).parse(req.body);
  await q("INSERT INTO wallets(user_id,credit_balance) VALUES($1,0) ON CONFLICT(user_id) DO NOTHING", [req.session.userId]);
  await q("UPDATE wallets SET credit_balance=credit_balance+$2, updated_at=now() WHERE user_id=$1", [req.session.userId, amount]);
  await q("INSERT INTO transactions(user_id,amount,type,description) VALUES($1,$2,'deposit',$3)", [req.session.userId, amount, `เติมเครดิต ${amount} เครดิต`]);
  res.json({ wallet: (await q("SELECT * FROM wallets WHERE user_id=$1", [req.session.userId])).rows[0] });
}));

app.get("/api/notifications", requireAuth, asyncRoute(async (req, res) => res.json({ notifications: (await q("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC", [req.session.userId])).rows })));
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
  const participant = await shipmentParticipantByOfferId(offerId, req.session.userId);
  if (!participant) return res.status(403).json({ error: "FORBIDDEN", message: "ไม่มีสิทธิ์เริ่มขนส่งสำหรับข้อเสนอนี้" });
  if (!(participant.status === "accepted" || participant.status === "confirmed")) {
    return res.status(400).json({ error: "INVALID_STATE", message: "เริ่มขนส่งได้หลังจากทั้งสองฝ่ายตอบรับข้อเสนอแล้วเท่านั้น" });
  }
  const existing = await q("SELECT * FROM shipments WHERE offer_id=$1", [offerId]);
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
  res.json({ ok: true });
}));

app.get("/api/chat/conversations", requireAuth, asyncRoute(async (req, res) => res.json({ conversations: (await q("SELECT c.* FROM chat_conversations c JOIN chat_participants p ON p.conversation_id=c.id WHERE p.user_id=$1 ORDER BY c.updated_at DESC", [req.session.userId])).rows })));
app.get("/api/chat/conversations/:id/messages", requireAuth, asyncRoute(async (req, res) => {
  const conversationId = String(req.params.id);
  const access = await readConversationAccess(conversationId, req.session.userId);
  if (!access) return res.status(403).json({ error: "FORBIDDEN", message: "ไม่มีสิทธิ์ดูแชทนี้" });
  if (!(access.status === "accepted" || access.status === "confirmed")) {
    return res.status(403).json({ error: "CHAT_LOCKED", message: "เปิดแชทได้หลังทั้งสองฝ่ายตอบรับข้อเสนอแล้ว" });
  }
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
  if (!(access.status === "accepted" || access.status === "confirmed")) {
    return res.status(403).json({ error: "CHAT_LOCKED", message: "ส่งข้อความได้หลังทั้งสองฝ่ายตอบรับข้อเสนอแล้ว" });
  }
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "VALIDATION_ERROR", message: "กรอกข้อความก่อนส่ง" });
  if (text.length > 1000) return res.status(400).json({ error: "VALIDATION_ERROR", message: "ข้อความยาวเกินไป" });
  const r = await q(
    "INSERT INTO chat_messages(conversation_id,sender_id,text) SELECT $1,$2,$3 WHERE EXISTS(SELECT 1 FROM chat_participants WHERE conversation_id=$1 AND user_id=$2) RETURNING *",
    [conversationId, req.session.userId, text]
  );
  res.status(201).json({ message: r.rows[0] });
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
