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

const upload = multer({ dest: uploadDir, limits: { fileSize: 6 * 1024 * 1024, files: 8 } });
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const storageBucket = process.env.STORAGE_BUCKET || "qxwap";

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

async function currentUser(userId?: string) {
  if (!userId) return null;
  const result = await q(
    `SELECT u.id,u.email,u.created_at,p.display_name,p.username,p.city,p.bio,p.avatar_url,p.rating,p.response_time_minutes,p.is_featured,p.is_fast_responder,p.account_level
     FROM users u LEFT JOIN profiles p ON p.id=u.id WHERE u.id=$1`,
    [userId]
  );
  return result.rows[0] || null;
}

type ListReq = Pick<Request, "query" | "session">;

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
      rating: Number(row.owner_rating || 0),
      account_level: row.owner_account_level
    },
    media: {
      images: row.images ? row.images.filter(Boolean) : []
    },
    deal: {
      type: row.deal_type,
      price_cash: Number(row.price_cash || 0),
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
      longitude: row.longitude
    },
    stats: {
      requests: Number(row.request_count || 0),
      views: Number(row.view_count || 0)
    },
    viewer: {
      is_owner: Boolean(row.is_owner),
      is_bookmarked: Boolean(row.is_bookmarked)
    }
  };
}

async function listItems(req: ListReq, ownerOverride?: string) {
  const p: unknown[] = [];
  const where = ["i.status='active'"];
  const add = (value: unknown) => {
    p.push(value);
    return `$${p.length}`;
  };
  if (ownerOverride || req.query.owner_id) where.push(`i.owner_id=${add(ownerOverride || req.query.owner_id)}`);
  if (req.query.q) {
    const v = `%${String(req.query.q).trim()}%`;
    const ix = add(v);
    where.push(`(i.title ILIKE ${ix} OR i.description ILIKE ${ix} OR i.wanted_text ILIKE ${ix} OR EXISTS (SELECT 1 FROM unnest(i.wanted_tags) tag WHERE tag ILIKE ${ix}))`);
  }
  if (req.query.category) where.push(`i.category=${add(req.query.category)}`);
  if (req.query.condition) where.push(`i.condition=${add(req.query.condition)}`);
  if (req.query.deal_type) where.push(`i.deal_type=${add(req.query.deal_type)}`);
  if (req.query.wanted_tag) where.push(`${add(String(req.query.wanted_tag))}=ANY(i.wanted_tags)`);
  if (req.query.open_to_offers === "true") where.push("i.open_to_offers=true");
  if (req.query.min_price) where.push(`(i.price_cash >= ${add(Number(req.query.min_price))} OR i.open_to_offers=true)`);
  if (req.query.max_price) where.push(`(i.price_cash <= ${add(Number(req.query.max_price))} OR i.open_to_offers=true)`);
  if (req.query.fast_responder === "true") where.push("p.is_fast_responder=true");
  if (req.query.featured === "true") where.push("p.is_featured=true");
  if (req.query.following === "true" && req.session.userId) where.push(`EXISTS (SELECT 1 FROM follows f WHERE f.follower_id=${add(req.session.userId)} AND f.following_id=i.owner_id)`);
  const sort = String(req.query.sort || "newest");
  const order =
    sort === "ai" ? "(CASE WHEN p.is_fast_responder THEN 18 ELSE 0 END + CASE WHEN p.is_featured THEN 10 ELSE 0 END + i.request_count * 5 + i.view_count) DESC, i.created_at DESC" :
    sort === "price_asc" ? "i.price_cash ASC NULLS LAST" :
    sort === "price_desc" ? "i.price_cash DESC NULLS LAST" :
    sort === "most_requested" ? "i.request_count DESC" :
    sort === "fast_responder" ? "p.response_time_minutes ASC NULLS LAST" :
    "i.created_at DESC";
  const me = add(req.session.userId || null);
  const result = await q(
    `SELECT i.*, p.display_name owner_name, p.avatar_url owner_avatar, p.rating owner_rating, p.is_featured, p.is_fast_responder, p.account_level owner_account_level,
      COALESCE(array_agg(img.url ORDER BY img.sort_order) FILTER (WHERE img.url IS NOT NULL), '{}') AS images,
      (i.owner_id=${me}) AS is_owner,
      EXISTS(SELECT 1 FROM bookmarks b WHERE b.user_id=${me} AND b.item_id=i.id) AS is_bookmarked
     FROM items i
     LEFT JOIN profiles p ON p.id=i.owner_id
     LEFT JOIN item_images img ON img.item_id=i.id
     WHERE ${where.join(" AND ")}
     GROUP BY i.id,p.display_name,p.avatar_url,p.rating,p.is_featured,p.is_fast_responder,p.account_level
     ORDER BY ${order}
     LIMIT 80`,
    p
  );
  return result.rows.map(rowItem);
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
app.post("/api/auth/signup", asyncRoute(async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(6) }).parse(req.body);
  const hash = await bcrypt.hash(body.password, 10);
  const user = await q<{ id: string }>("INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id", [body.email.toLowerCase(), hash]);
  await q("INSERT INTO profiles(id,display_name,username,avatar_url) VALUES($1,$2,$3,$4)", [user.rows[0].id, body.email.split("@")[0], `user_${user.rows[0].id.slice(0, 8)}`, `https://api.dicebear.com/9.x/thumbs/svg?seed=${body.email}`]);
  await q("INSERT INTO wallets(user_id,credit_balance) VALUES($1,100)", [user.rows[0].id]);
  await q("INSERT INTO transactions(user_id,amount,type,description) VALUES($1,100,'activity','สมัคร QXwap รับ Manu Credit เริ่มต้น')", [user.rows[0].id]);
  req.session.userId = user.rows[0].id;
  res.status(201).json({ user: await currentUser(req.session.userId) });
}));
app.post("/api/auth/signin", asyncRoute(async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
  const user = await q<{ id: string; password_hash: string }>("SELECT id,password_hash FROM users WHERE email=$1", [body.email.toLowerCase()]);
  if (!user.rows[0] || !(await bcrypt.compare(body.password, user.rows[0].password_hash))) {
    return res.status(401).json({ error: "INVALID_LOGIN", message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
  }
  req.session.userId = user.rows[0].id;
  res.json({ user: await currentUser(req.session.userId) });
}));
app.post("/api/auth/signout", (req, res) => req.session.destroy(() => res.json({ ok: true })));
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
    `SELECT p.id,p.display_name,p.username,p.city,p.bio,p.avatar_url,p.rating,p.response_time_minutes,p.is_featured,p.is_fast_responder,p.account_level,
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
app.get("/api/profiles/:id", asyncRoute(async (req, res) => res.json({ profile: await currentUser(String(req.params.id)) })));

app.get("/api/items", asyncRoute(async (req, res) => res.json({ items: await listItems(req) })));
app.get("/api/feed", asyncRoute(async (req, res) => res.json({ items: await listItems({ query: { ...req.query, sort: "ai" }, session: req.session }) })));
app.get("/api/items/:id", asyncRoute(async (req, res) => {
  const items = await listItems({ query: {}, session: req.session });
  const item = items.find((x: any) => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบสินค้า" });
  await q("UPDATE items SET view_count=view_count+1 WHERE id=$1", [req.params.id]);
  const related = (await listItems({ query: { category: item.category }, session: req.session })).filter((x: any) => x.id !== item.id).slice(0, 6);
  res.json({ item, related });
}));
app.post("/api/items", requireAuth, asyncRoute(async (req, res) => {
  const body = z.object({
    title: z.string().min(2), description: z.string().optional(), category: z.string().optional(), condition: z.string().optional(),
    deal_type: z.enum(["swap", "sell", "buy", "both"]), price_cash: z.number().int().min(0).optional(), price_credit: z.number().int().min(0).optional(),
    open_to_offers: z.boolean().optional(), wanted_text: z.string().optional(), wanted_tags: z.array(z.string()).optional(), location_label: z.string().optional(), images: z.array(z.string()).optional()
  }).parse(req.body);
  const result = await q<{ id: string }>(
    `INSERT INTO items(owner_id,title,description,category,condition,deal_type,price_cash,price_credit,open_to_offers,wanted_text,wanted_tags,location_label)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [req.session.userId, body.title, body.description || "", body.category || "Other", body.condition || "Good", body.deal_type, body.price_cash || 0, body.price_credit || 0, Boolean(body.open_to_offers), body.wanted_text || "", body.wanted_tags || [], body.location_label || ""]
  );
  for (const [i, url] of (body.images || []).entries()) await q("INSERT INTO item_images(item_id,url,sort_order) VALUES($1,$2,$3)", [result.rows[0].id, url, i]);
  res.status(201).json({ item: (await listItems({ query: { owner_id: req.session.userId }, session: req.session })).find((x: any) => x.id === result.rows[0].id) });
}));
app.patch("/api/items/:id", requireAuth, asyncRoute(async (req, res) => {
  const own = await q("SELECT id FROM items WHERE id=$1 AND owner_id=$2", [req.params.id, req.session.userId]);
  if (!own.rows[0]) return res.status(403).json({ error: "FORBIDDEN", message: "แก้ไขได้เฉพาะสินค้าของคุณ" });
  const fields = ["title","description","category","condition","deal_type","price_cash","price_credit","open_to_offers","wanted_text","wanted_tags","location_label"];
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const f of fields) if (f in req.body) { values.push(req.body[f]); sets.push(`${f}=$${values.length}`); }
  if (sets.length) await q(`UPDATE items SET ${sets.join(",")}, updated_at=now() WHERE id=$${values.length + 1}`, [...values, req.params.id]);
  if (Array.isArray(req.body.images)) {
    await q("DELETE FROM item_images WHERE item_id=$1", [req.params.id]);
    for (const [idx, url] of req.body.images.entries()) {
      await q("INSERT INTO item_images(item_id,url,sort_order) VALUES($1,$2,$3)", [req.params.id, url, idx]);
    }
  }
  res.json({ item: (await listItems({ query: { owner_id: req.session.userId }, session: req.session })).find((x: any) => x.id === req.params.id) });
}));
app.delete("/api/items/:id", requireAuth, asyncRoute(async (req, res) => {
  const deleted = await q("DELETE FROM items WHERE id=$1 AND owner_id=$2 RETURNING id", [req.params.id, req.session.userId]);
  if (!deleted.rows[0]) return res.status(403).json({ error: "FORBIDDEN", message: "ลบได้เฉพาะสินค้าของคุณ" });
  res.json({ ok: true });
}));

app.post("/api/upload", requireAuth, upload.array("images", 8), asyncRoute(async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) || [];
  const urls = await Promise.all(files.map(storeUpload));
  res.json({ urls });
}));

app.get("/api/bookmarks", requireAuth, asyncRoute(async (req, res) => {
  const items = await listItems(req);
  res.json({ items: items.filter((item: any) => item.viewer.is_bookmarked) });
}));
app.post("/api/bookmarks", requireAuth, asyncRoute(async (req, res) => {
  await q("INSERT INTO bookmarks(user_id,item_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [req.session.userId, req.body.item_id]);
  res.json({ ok: true });
}));
app.delete("/api/bookmarks/:id", requireAuth, asyncRoute(async (req, res) => { await q("DELETE FROM bookmarks WHERE user_id=$1 AND item_id=$2", [req.session.userId, req.params.id]); res.json({ ok: true }); }));

app.get("/api/follows", requireAuth, asyncRoute(async (req, res) => res.json({ follows: (await q(
  `SELECT p.id,p.display_name,p.username,p.city,p.bio,p.avatar_url,p.rating,p.response_time_minutes,p.is_featured,p.is_fast_responder,p.account_level,f.created_at
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
app.get("/api/offers/sent", requireAuth, asyncRoute(async (req, res) => res.json({ offers: (await q("SELECT * FROM offers WHERE from_user_id=$1 ORDER BY created_at DESC", [req.session.userId])).rows })));
app.get("/api/offers/received", requireAuth, asyncRoute(async (req, res) => res.json({ offers: (await q("SELECT * FROM offers WHERE to_user_id=$1 ORDER BY created_at DESC", [req.session.userId])).rows })));
app.get("/api/offers/:id", requireAuth, asyncRoute(async (req, res) => res.json({ offer: (await q("SELECT * FROM offers WHERE id=$1 AND (from_user_id=$2 OR to_user_id=$2)", [req.params.id, req.session.userId])).rows[0] })));
app.post("/api/offers", requireAuth, asyncRoute(async (req, res) => {
  const level = await q<{ account_level: number }>("SELECT account_level FROM profiles WHERE id=$1", [req.session.userId]);
  if (Number(level.rows[0]?.account_level || 2) === 4) {
    return res.status(403).json({ error: "ACCOUNT_RESTRICTED", message: "บัญชีนี้ถูกจำกัดสิทธิ์ สามารถดูได้เท่านั้น" });
  }
  const body = z.object({
    target_item_id: z.string(),
    message: z.string().optional(),
    cash_amount: z.number().int().min(0).optional(),
    credit_amount: z.number().int().min(0).optional(),
    item_ids: z.array(z.string()).optional(),
    instant_swap: z.boolean().optional(),
    shipping_payer: z.enum(["split", "requester", "owner"]).optional(),
    pickup_window: z.string().optional()
  }).parse(req.body);
  const target = await q<{ owner_id: string; title: string }>("SELECT owner_id,title FROM items WHERE id=$1", [body.target_item_id]);
  if (!target.rows[0]) return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบสินค้า" });
  if (target.rows[0].owner_id === req.session.userId) return res.status(400).json({ error: "OWN_ITEM", message: "ไม่สามารถขอแลกสินค้าของตัวเอง" });
  const logistics = {
    shipping_payer: body.shipping_payer || "split",
    pickup_window: body.pickup_window || "",
    courier_photo_required: true,
    pickup_photo_required: true,
    dropoff_photo_required: true
  };
  const offer = await q<{ id: string }>(
    "INSERT INTO offers(from_user_id,to_user_id,target_item_id,message,cash_amount,credit_amount,instant_swap,logistics) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING id",
    [req.session.userId, target.rows[0].owner_id, body.target_item_id, body.message || "", body.cash_amount || 0, body.credit_amount || 0, Boolean(body.instant_swap), JSON.stringify(logistics)]
  );
  for (const id of body.item_ids || []) await q("INSERT INTO offer_items(offer_id,item_id) VALUES($1,$2)", [offer.rows[0].id, id]);
  await q("UPDATE items SET request_count=request_count+1 WHERE id=$1", [body.target_item_id]);
  await q("UPDATE wallets SET credit_balance=credit_balance+5, updated_at=now() WHERE user_id=$1", [req.session.userId]);
  await q("INSERT INTO transactions(user_id,amount,type,description) VALUES($1,5,'activity','ส่งข้อเสนอ Xwap')", [req.session.userId]);
  await q("INSERT INTO notifications(user_id,type,title,body,data) VALUES($1,'offer','มีข้อเสนอ Xwap ใหม่',$2,$3)", [target.rows[0].owner_id, target.rows[0].title, { offer_id: offer.rows[0].id }]);
  const conv = await ensureConversation(offer.rows[0].id, req.session.userId!, target.rows[0].owner_id);
  if (body.message) await q("INSERT INTO chat_messages(conversation_id,sender_id,text) VALUES($1,$2,$3)", [conv, req.session.userId, body.message]);
  res.status(201).json({ offer_id: offer.rows[0].id, conversation_id: conv });
}));

async function transitionOffer(req: Request, res: Response, status: string) {
  const offer = await q<any>("SELECT * FROM offers WHERE id=$1", [req.params.id]);
  if (!offer.rows[0]) return res.status(404).json({ error: "NOT_FOUND" });
  const row = offer.rows[0];
  if ((status === "accepted" || status === "rejected") && row.to_user_id !== req.session.userId) return res.status(403).json({ error: "FORBIDDEN" });
  if ((status === "cancelled" || status === "confirmed") && row.from_user_id !== req.session.userId && row.to_user_id !== req.session.userId) return res.status(403).json({ error: "FORBIDDEN" });
  const rejectionReason = status === "rejected" ? String(req.body.rejection_reason || "not_a_match") : null;
  await q("UPDATE offers SET status=$1, rejection_reason=COALESCE($3,rejection_reason), updated_at=now() WHERE id=$2", [status, req.params.id, rejectionReason]);
  if (status === "accepted") {
    const logisticsJson = typeof row.logistics === "string" ? row.logistics : JSON.stringify(row.logistics || {});
    await q("INSERT INTO deals(offer_id,buyer_id,seller_id,item_id,stage,logistics) VALUES($1,$2,$3,$4,'accepted',$5::jsonb) ON CONFLICT DO NOTHING", [row.id, row.from_user_id, row.to_user_id, row.target_item_id, logisticsJson]);
  }
  if (status === "confirmed") {
    await q("UPDATE wallets SET credit_balance=credit_balance+100, updated_at=now() WHERE user_id IN ($1,$2)", [row.from_user_id, row.to_user_id]);
    await q("INSERT INTO transactions(user_id,amount,type,description) VALUES($1,100,'swap_reward','ยืนยันการแลกสำเร็จ'),($2,100,'swap_reward','ยืนยันการแลกสำเร็จ')", [row.from_user_id, row.to_user_id]);
  }
  await q("INSERT INTO notifications(user_id,type,title,body,data) VALUES($1,'offer_status',$2,$3,$4)", [row.from_user_id === req.session.userId ? row.to_user_id : row.from_user_id, `ข้อเสนอ ${status}`, "สถานะข้อเสนอมีการเปลี่ยนแปลง", { offer_id: row.id, status }]);
  res.json({ ok: true, status });
}
app.post("/api/offers/:id/accept", requireAuth, asyncRoute((req, res) => transitionOffer(req, res, "accepted")));
app.post("/api/offers/:id/reject", requireAuth, asyncRoute((req, res) => transitionOffer(req, res, "rejected")));
app.post("/api/offers/:id/cancel", requireAuth, asyncRoute((req, res) => transitionOffer(req, res, "cancelled")));
app.post("/api/offers/:id/confirm", requireAuth, asyncRoute((req, res) => transitionOffer(req, res, "confirmed")));

app.get("/api/wallet", requireAuth, asyncRoute(async (req, res) => res.json({ wallet: (await q("SELECT * FROM wallets WHERE user_id=$1", [req.session.userId])).rows[0] })));
app.get("/api/transactions", requireAuth, asyncRoute(async (req, res) => res.json({ transactions: (await q("SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC", [req.session.userId])).rows })));
app.post("/api/wallet/deposit", requireAuth, asyncRoute(async (req, res) => {
  const amount = Math.max(0, Number(req.body.amount || 0));
  await q("UPDATE wallets SET credit_balance=credit_balance+$2, updated_at=now() WHERE user_id=$1", [req.session.userId, amount]);
  await q("INSERT INTO transactions(user_id,amount,type,description) VALUES($1,$2,'deposit','เติมเครดิต')", [req.session.userId, amount]);
  res.json({ wallet: (await q("SELECT * FROM wallets WHERE user_id=$1", [req.session.userId])).rows[0] });
}));

app.get("/api/notifications", requireAuth, asyncRoute(async (req, res) => res.json({ notifications: (await q("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC", [req.session.userId])).rows })));
app.post("/api/notifications/read", requireAuth, asyncRoute(async (req, res) => { await q("UPDATE notifications SET read_at=now() WHERE user_id=$1 AND ($2::uuid IS NULL OR id=$2)", [req.session.userId, req.body.id || null]); res.json({ ok: true }); }));
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
  const r = await q("INSERT INTO shipments(offer_id,current_step,tracking_number,pickup_photo_url) VALUES($1,'started',$2,$3) RETURNING *", [req.params.offerId, req.body.tracking_number || "", req.body.pickup_photo_url || null]);
  res.status(201).json({ shipment: r.rows[0] });
}));
app.get("/api/shipments/:offerId", requireAuth, asyncRoute(async (req, res) => res.json({ shipment: (await q("SELECT * FROM shipments WHERE offer_id=$1", [req.params.offerId])).rows[0] })));
app.post("/api/shipments/:id/update-step", requireAuth, asyncRoute(async (req, res) => {
  await q(
    "UPDATE shipments SET current_step=$1,status='in_progress',pickup_photo_url=COALESCE($3,pickup_photo_url),dropoff_photo_url=COALESCE($4,dropoff_photo_url),updated_at=now() WHERE id=$2",
    [req.body.current_step, req.params.id, req.body.pickup_photo_url || null, req.body.dropoff_photo_url || null]
  );
  res.json({ ok: true });
}));
app.post("/api/shipments/:id/finish", requireAuth, asyncRoute(async (req, res) => {
  await q("UPDATE shipments SET current_step='finished',status='finished',dropoff_photo_url=COALESCE($2,dropoff_photo_url),updated_at=now() WHERE id=$1", [req.params.id, req.body.dropoff_photo_url || null]);
  res.json({ ok: true });
}));

app.get("/api/chat/conversations", requireAuth, asyncRoute(async (req, res) => res.json({ conversations: (await q("SELECT c.* FROM chat_conversations c JOIN chat_participants p ON p.conversation_id=c.id WHERE p.user_id=$1 ORDER BY c.updated_at DESC", [req.session.userId])).rows })));
app.get("/api/chat/conversations/:id/messages", requireAuth, asyncRoute(async (req, res) => res.json({ messages: (await q("SELECT m.* FROM chat_messages m JOIN chat_participants p ON p.conversation_id=m.conversation_id WHERE m.conversation_id=$1 AND p.user_id=$2 ORDER BY m.created_at ASC", [req.params.id, req.session.userId])).rows })));
app.post("/api/chat/conversations/:id/messages", requireAuth, asyncRoute(async (req, res) => { const r = await q("INSERT INTO chat_messages(conversation_id,sender_id,text) SELECT $1,$2,$3 WHERE EXISTS(SELECT 1 FROM chat_participants WHERE conversation_id=$1 AND user_id=$2) RETURNING *", [req.params.id, req.session.userId, req.body.text || ""]); res.status(201).json({ message: r.rows[0] }); }));

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
