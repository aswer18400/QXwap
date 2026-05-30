import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

type QueryResult<T = any> = { rows: T[]; rowCount?: number | null };

export type Db = {
  query<T = any>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
};

let db: Db | undefined;

export const requiredTables = [
  "users",
  "user_sessions",
  "profiles",
  "user_roles",
  "categories",
  "items",
  "item_images",
  "item_tags",
  "wanted_items",
  "feed_posts",
  "item_views",
  "follows",
  "bookmarks",
  "offers",
  "offer_items",
  "swap_status_logs",
  "wallets",
  "transactions",
  "notifications",
  "deals",
  "shipments",
  "system_reward_items",
  "reward_redemptions",
  "reports",
  "reviews",
  "campaigns",
  "banners",
  "item_owner_history",
  "chat_conversations",
  "chat_participants",
  "chat_messages"
];

function shouldRecoverPGliteDir(error: unknown) {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error || "");
  return /Aborted\(\)|pg_initdb|_checkReady|wasm-function/i.test(message);
}

async function createPGliteWithRecovery(dataDir: string) {
  try {
    const pglite = new PGlite(dataDir);
    await pglite.query("SELECT 1");
    return pglite;
  } catch (error) {
    if (process.env.NODE_ENV === "test" || !fs.existsSync(dataDir) || !shouldRecoverPGliteDir(error)) {
      throw error;
    }
    const backupDir = `${dataDir}-recovered-${Date.now()}`;
    fs.renameSync(dataDir, backupDir);
    fs.mkdirSync(dataDir, { recursive: true });
    console.warn(`[QXwap API] recovered local PGlite directory by moving ${dataDir} -> ${backupDir}`);
    const pglite = new PGlite(dataDir);
    await pglite.query("SELECT 1");
    return pglite;
  }
}

export async function getDb(): Promise<Db> {
  if (db) return db;
  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = { query: async (text, params) => pool.query(text, params as any[]) as Promise<QueryResult<any>> };
    return db;
  }
  const defaultDir = process.env.NODE_ENV === "test" ? `.data/qxwap-pglite-test-${process.pid}` : ".data/qxwap-pglite-local";
  const dataDir = path.resolve(process.cwd(), process.env.PGLITE_DATA_DIR || defaultDir);
  fs.mkdirSync(dataDir, { recursive: true });
  const pglite = await createPGliteWithRecovery(dataDir);
  db = {
    query: async (text, params) => {
      if (!params?.length && text.includes(";")) {
        let last: QueryResult<any> = { rows: [] };
        for (const statement of text.split(";").map((s) => s.trim()).filter(Boolean)) {
          last = await pglite.query(statement) as QueryResult<any>;
        }
        return last;
      }
      return pglite.query(text, params as any[]) as Promise<QueryResult<any>>;
    }
  };
  return db;
}

export async function q<T = any>(text: string, params: unknown[] = []) {
  return (await getDb()).query<T>(text, params);
}

export async function migrate() {
  const database = await getDb();
  try {
    await database.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  } catch {
    // PGlite has gen_random_uuid without extension support; Postgres installs it above.
  }
  await database.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS user_sessions (
      sid TEXT PRIMARY KEY,
      sess JSONB NOT NULL,
      expire TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expire ON user_sessions(expire);
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      display_name TEXT,
      username TEXT UNIQUE,
      city TEXT,
      bio TEXT,
      avatar_url TEXT,
      rating NUMERIC DEFAULT 0,
      response_time_minutes INTEGER,
      is_featured BOOLEAN DEFAULT false,
      is_fast_responder BOOLEAN DEFAULT false,
      account_level INTEGER DEFAULT 2,
      latitude NUMERIC,
      longitude NUMERIC,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      granted_at TIMESTAMP DEFAULT now(),
      UNIQUE(user_id, role)
    );
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT
    );
    CREATE TABLE IF NOT EXISTS items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      condition TEXT,
      deal_type TEXT CHECK (deal_type IN ('swap','sell','buy','both')) DEFAULT 'swap',
      price_cash INTEGER DEFAULT 0,
      price_cash_unknown BOOLEAN DEFAULT false,
      price_credit INTEGER DEFAULT 0,
      open_to_offers BOOLEAN DEFAULT false,
      wanted_text TEXT,
      wanted_tags TEXT[] DEFAULT '{}',
      location_label TEXT,
      latitude NUMERIC,
      longitude NUMERIC,
      status TEXT DEFAULT 'active',
      view_count INTEGER DEFAULT 0,
      request_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS item_images (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      item_id UUID REFERENCES items(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS item_tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      item_id UUID REFERENCES items(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      source TEXT DEFAULT 'derived',
      created_at TIMESTAMP DEFAULT now(),
      UNIQUE(item_id, tag)
    );
    CREATE TABLE IF NOT EXISTS wanted_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_item_id UUID UNIQUE REFERENCES items(id) ON DELETE CASCADE,
      owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      deal_type TEXT CHECK (deal_type IN ('swap','sell','buy','both')) DEFAULT 'buy',
      wanted_text TEXT,
      wanted_tags TEXT[] DEFAULT '{}',
      reference_images TEXT[] DEFAULT '{}',
      urgency TEXT DEFAULT 'normal',
      location_label TEXT,
      latitude NUMERIC,
      longitude NUMERIC,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS system_reward_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      credit_cost INTEGER NOT NULL DEFAULT 0,
      inventory_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS feed_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_key TEXT UNIQUE NOT NULL,
      actor_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      post_type TEXT NOT NULL CHECK (post_type IN ('item','wanted_item','swap_update','reward_redemption','follow')),
      item_id UUID REFERENCES items(id) ON DELETE CASCADE,
      wanted_item_id UUID REFERENCES wanted_items(id) ON DELETE CASCADE,
      reward_item_id UUID REFERENCES system_reward_items(id) ON DELETE CASCADE,
      visibility TEXT DEFAULT 'public',
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS follows (
      follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
      following_id UUID REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT now(),
      UNIQUE(follower_id, following_id)
    );
    CREATE TABLE IF NOT EXISTS bookmarks (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      item_id UUID REFERENCES items(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT now(),
      UNIQUE(user_id, item_id)
    );
    CREATE TABLE IF NOT EXISTS offers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      target_item_id UUID REFERENCES items(id) ON DELETE CASCADE,
      message TEXT,
      cash_amount INTEGER DEFAULT 0,
      credit_amount INTEGER DEFAULT 0,
      instant_swap BOOLEAN DEFAULT false,
      logistics JSONB DEFAULT '{}',
      rejection_reason TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('draft','pending','accepted','countered','scheduled','handover_pending','completed','rejected','expired','cancelled','reported')),
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS offer_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
      item_id UUID REFERENCES items(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS swap_status_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
      actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS wallets (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      credit_balance INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER,
      type TEXT,
      description TEXT,
      source_kind TEXT,
      source_id TEXT,
      rule_key TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      type TEXT,
      title TEXT,
      body TEXT,
      data JSONB,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS deals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
      buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
      seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
      item_id UUID REFERENCES items(id) ON DELETE CASCADE,
      stage TEXT DEFAULT 'accepted',
      logistics JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS shipments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'started',
      current_step TEXT,
      tracking_number TEXT,
      pickup_photo_url TEXT,
      dropoff_photo_url TEXT,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS reward_redemptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      reward_item_id UUID REFERENCES system_reward_items(id) ON DELETE CASCADE,
      credit_amount INTEGER NOT NULL,
      status TEXT DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reporter_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'open',
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reviewer_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      reviewee_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT now(),
      UNIQUE(reviewer_user_id, offer_id)
    );
    CREATE TABLE IF NOT EXISTS campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      body TEXT,
      hero_image_url TEXT,
      cta_label TEXT DEFAULT 'ถัดไป',
      cta_target_type TEXT CHECK (cta_target_type IN ('product_list','product_detail','campaign_detail')) DEFAULT 'product_list',
      cta_target_value TEXT,
      is_active BOOLEAN DEFAULT true,
      starts_at TIMESTAMP DEFAULT now(),
      ends_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS banners (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      image_url TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      target_type TEXT CHECK (target_type IN ('product_list','product_detail','campaign_detail')) NOT NULL,
      target_value TEXT,
      campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS instant_swap BOOLEAN DEFAULT false;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS logistics JSONB DEFAULT '{}';
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
    ALTER TABLE items ADD COLUMN IF NOT EXISTS price_cash_unknown BOOLEAN DEFAULT false;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_level INTEGER DEFAULT 2;
    ALTER TABLE wanted_items ADD COLUMN IF NOT EXISTS reference_images TEXT[] DEFAULT '{}';
    ALTER TABLE wanted_items ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal';
    ALTER TABLE shipments ADD COLUMN IF NOT EXISTS pickup_photo_url TEXT;
    ALTER TABLE shipments ADD COLUMN IF NOT EXISTS dropoff_photo_url TEXT;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_kind TEXT;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_id TEXT;
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS rule_key TEXT;
  `);

  const resolveColumnMeta = async (tableName: string, columnName: string) => {
    const info = await database.query<{ formatted_type: string; type_kind: string; udt_name: string }>(
      `SELECT
          pg_catalog.format_type(a.atttypid, a.atttypmod) AS formatted_type,
          t.typtype AS type_kind,
          t.typname AS udt_name
         FROM pg_catalog.pg_attribute a
         JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
         JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
         JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
        WHERE n.nspname = 'public'
          AND c.relname = $1
          AND a.attname = $2
          AND a.attnum > 0
          AND NOT a.attisdropped
        LIMIT 1`,
      [tableName, columnName]
    );
    return info.rows[0];
  };

  const resolveColumnSqlType = async (tableName: string, columnName: string, fallback: "UUID" | "TEXT" = "UUID") => {
    const row = await resolveColumnMeta(tableName, columnName);
    if (!row) return fallback;
    const normalizedType = String(row.formatted_type || row.udt_name || "").toLowerCase();
    if (row.udt_name === "uuid" || normalizedType === "uuid") return "UUID";
    if (normalizedType === "text" || normalizedType === "character varying" || normalizedType === "varchar" || row.udt_name === "text" || row.udt_name === "varchar") return "TEXT";
    return fallback;
  };

  const offerStatusMeta = await resolveColumnMeta("offers", "status");
  if (offerStatusMeta?.type_kind === "e" && offerStatusMeta.udt_name) {
    const offerStatuses = ["draft", "pending", "accepted", "countered", "scheduled", "handover_pending", "completed", "rejected", "expired", "cancelled", "reported"];
    for (const status of offerStatuses) {
      try {
        await database.query(`ALTER TYPE ${offerStatusMeta.udt_name} ADD VALUE IF NOT EXISTS '${status}'`);
      } catch {
        // Legacy production schemas may still use a Postgres enum here. We try
        // to backfill missing values, but local TEXT-backed schemas do not need
        // enum updates and some engines may reject this syntax harmlessly.
      }
    }
    await database.query(`
      UPDATE offers SET status='accepted' WHERE status='accepted_by_receiver';
      UPDATE offers SET status='completed' WHERE status='confirmed';
    `);
  } else {
    await database.query(`
      UPDATE offers SET status='accepted' WHERE status='accepted_by_receiver';
      UPDATE offers SET status='completed' WHERE status='confirmed';
      ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_status_check;
      ALTER TABLE offers ADD CONSTRAINT offers_status_check CHECK (status IN ('draft','pending','accepted','countered','scheduled','handover_pending','completed','rejected','expired','cancelled','reported'));
    `);
  }

  const userIdSqlType = await resolveColumnSqlType("users", "id");
  const itemIdSqlType = await resolveColumnSqlType("items", "id");
  const offerIdSqlType = await resolveColumnSqlType("offers", "id");

  await database.query(`
    CREATE TABLE IF NOT EXISTS item_views (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
      item_id ${itemIdSqlType} REFERENCES items(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS item_owner_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      item_id ${itemIdSqlType} REFERENCES items(id) ON DELETE CASCADE,
      offer_id ${offerIdSqlType} REFERENCES offers(id) ON DELETE SET NULL,
      previous_owner_id ${userIdSqlType} REFERENCES users(id) ON DELETE SET NULL,
      new_owner_id ${userIdSqlType} REFERENCES users(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id ${offerIdSqlType} REFERENCES offers(id) ON DELETE SET NULL,
      item_id ${itemIdSqlType} REFERENCES items(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS chat_participants (
      conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
      user_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(conversation_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
      sender_id ${userIdSqlType} REFERENCES users(id) ON DELETE CASCADE,
      text TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
    ALTER TABLE chat_conversations
      ADD COLUMN IF NOT EXISTS item_id ${itemIdSqlType} REFERENCES items(id) ON DELETE SET NULL;
    ALTER TABLE chat_participants
      ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP DEFAULT now();
    ALTER TABLE chat_messages
      ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'user';
    ALTER TABLE chat_messages
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
  `);

  await database.query(`
    UPDATE item_owner_history
       SET status='completed'
     WHERE status='confirmed'
  `);

  await database.query(`
    CREATE OR REPLACE VIEW user_profiles AS
      SELECT p.*, u.email
      FROM profiles p
      JOIN users u ON u.id = p.id;
    CREATE OR REPLACE VIEW item_photos AS
      SELECT * FROM item_images;
    CREATE OR REPLACE VIEW item_categories AS
      SELECT i.id AS item_id,
             c.id AS category_id,
             c.name,
             c.slug,
             c.icon
      FROM items i
      LEFT JOIN categories c
        ON lower(c.name) = lower(i.category) OR lower(c.slug) = lower(i.category);
    CREATE OR REPLACE VIEW saved_items AS
      SELECT user_id, item_id, created_at
      FROM bookmarks;
    CREATE OR REPLACE VIEW swap_requests AS
      SELECT * FROM offers;
    CREATE OR REPLACE VIEW swap_request_items AS
      SELECT * FROM offer_items;
    CREATE OR REPLACE VIEW chats AS
      SELECT * FROM chat_conversations;
    CREATE OR REPLACE VIEW messages AS
      SELECT * FROM chat_messages;
    CREATE OR REPLACE VIEW credits AS
      SELECT user_id, credit_balance, updated_at
      FROM wallets;
    CREATE OR REPLACE VIEW credit_transactions AS
      SELECT * FROM transactions;
  `);

  const ok = await database.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1)`,
    [requiredTables]
  );
  const existing = new Set(ok.rows.map((row) => row.table_name));
  const missing = requiredTables.filter((table) => !existing.has(table));
  if (missing.length) {
    throw new Error(`Migration failed: missing required tables ${missing.join(", ")}`);
  }
}

export async function seed(options: { forceDemo?: boolean } = {}) {
  const runtimeSeedEnabled = demoSeedEnabled(options.forceDemo);
  const existing = await q<{ count: string }>("SELECT count(*)::text AS count FROM users");
  if (Number(existing.rows[0]?.count || 0) > 0) {
    if (runtimeSeedEnabled) {
      await backfillDemoRelations();
    }
    return;
  }
  if (!runtimeSeedEnabled) return;
  const bcryptModule = await import("bcryptjs");
  const bcrypt = bcryptModule.default || bcryptModule;
  const password = await bcrypt.hash("password123", 10);
  const users = await q<{ id: string; email: string }>(
    `INSERT INTO users(email,password_hash) VALUES
      ('mali@qxwap.app',$1),('niran@qxwap.app',$1),('ploy@qxwap.app',$1)
     RETURNING id,email`,
    [password]
  );
  for (const [i, user] of users.rows.entries()) {
    await q(
      `INSERT INTO profiles(id,display_name,username,city,bio,avatar_url,rating,response_time_minutes,is_featured,is_fast_responder,account_level,latitude,longitude)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        user.id,
        ["มะลิ Swap Studio", "นิรันดร์ Gadget", "พลอย Closet"][i],
        ["mali", "niran", "ploy"][i],
        ["กรุงเทพฯ", "เชียงใหม่", "นนทบุรี"][i],
        "พร้อมแลกของดี ใช้งานจริง ตอบไว",
        `https://api.dicebear.com/9.x/thumbs/svg?seed=${user.email}`,
        [4.9, 4.7, 4.8][i],
        [8, 18, 11][i],
        i !== 1,
        i !== 1,
        [3, 2, 2][i],
        13.7563,
        100.5018
      ]
    );
    await q("INSERT INTO wallets(user_id, credit_balance) VALUES($1,$2)", [user.id, 1500 + i * 500]);
  }
  await backfillDemoRelations();
  await q(
    `INSERT INTO categories(name,slug,icon) VALUES
     ('Electronics','electronics','smartphone'),('Fashion','fashion','shirt'),('Home','home','home'),
     ('Sports','sports','dumbbell'),('Vehicles','vehicles','bike'),('Collectibles','collectibles','sparkles'),
     ('Books','books','book'),('Beauty','beauty','heart'),('Toys','toys','gamepad'),('Other','other','box')
     ON CONFLICT(slug) DO NOTHING`
  );
  const items = [
    {
      owner: users.rows[0].id,
      title: "iPad mini 6 สีม่วง",
      description: "สภาพดี แบตยังอึด มีเคสและฟิล์ม อยากแลกกล้องหรือเพิ่มเงินคุยได้",
      category: "Electronics",
      condition: "Like new",
      deal: "both",
      cash: 11900,
      cashUnknown: false,
      credit: 1000,
      open: false,
      wanted: ["กล้องฟิล์ม", "Nintendo Switch", "เลนส์กล้อง"],
      wantedText: "อยากได้กล้องขนาดพกพา หรือ Switch OLED",
      loc: "สยาม, กรุงเทพฯ",
      img: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=80"
    },
    {
      owner: users.rows[1].id,
      title: "จักรยานพับ Brompton style",
      description: "ขี่น้อย เก็บในคอนโด พร้อมไฟหน้าและกระเป๋า",
      category: "Vehicles",
      condition: "Good",
      deal: "swap",
      cash: 0,
      cashUnknown: true,
      credit: 0,
      open: true,
      wanted: ["โต๊ะทำงาน", "เครื่องชงกาแฟ", "เครดิต"],
      wantedText: "เปิดกว้างทุกข้อเสนอ โดยเฉพาะของแต่งบ้าน",
      loc: "อารีย์, กรุงเทพฯ",
      img: "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=900&q=80"
    },
    {
      owner: users.rows[2].id,
      title: "กระเป๋า Freitag มือสอง",
      description: "ใบจริง มีรอยใช้งานนิดหน่อยแต่เท่มาก",
      category: "Fashion",
      condition: "Used",
      deal: "sell",
      cash: 3400,
      cashUnknown: false,
      credit: 500,
      open: true,
      wanted: ["รองเท้า", "น้ำหอม", "เงินสด"],
      wantedText: "ขายหรือแลกของแฟชั่น",
      loc: "งามวงศ์วาน, นนทบุรี",
      img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80"
    },
    {
      owner: users.rows[0].id,
      title: "หนังสือ Design Systems",
      description: "อ่านจบแล้ว สภาพเหมือนใหม่ เหมาะกับ designer/dev",
      category: "Books",
      condition: "Like new",
      deal: "swap",
      cash: 0,
      cashUnknown: false,
      credit: 300,
      open: true,
      wanted: ["หนังสือ UX", "กาแฟ", "เครดิต"],
      wantedText: "อยากแลกหนังสือ UX หรือเครดิต",
      loc: "อโศก, กรุงเทพฯ",
      img: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80"
    }
  ];
  const insertedItemIds: string[] = [];
  for (const item of items) {
    const inserted = await q<{ id: string }>(
      `INSERT INTO items(owner_id,title,description,category,condition,deal_type,price_cash,price_cash_unknown,price_credit,open_to_offers,wanted_text,wanted_tags,location_label,latitude,longitude)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,13.7563,100.5018) RETURNING id`,
      [item.owner, item.title, item.description, item.category, item.condition, item.deal, item.cash, item.cashUnknown, item.credit, item.open, item.wantedText, item.wanted, item.loc]
    );
    insertedItemIds.push(inserted.rows[0].id);
    await q("INSERT INTO item_images(item_id,url,sort_order) VALUES($1,$2,0)", [inserted.rows[0].id, item.img]);
  }
  await ensureSeedDataset(password);
  await seedCampaignsAndBanners();
  await syncDerivedDomainSeedData();
}

async function backfillDemoRelations() {
  const demo = await q<{ id: string; email: string }>("SELECT id,email FROM users WHERE email = ANY($1)", [["mali@qxwap.app", "niran@qxwap.app", "ploy@qxwap.app"]]);
  const byEmail = new Map(demo.rows.map((user) => [user.email, user.id]));
  const mali = byEmail.get("mali@qxwap.app");
  const niran = byEmail.get("niran@qxwap.app");
  const ploy = byEmail.get("ploy@qxwap.app");
  if (mali && niran) await q("INSERT INTO follows(follower_id,following_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [mali, niran]);
  if (mali && ploy) await q("INSERT INTO follows(follower_id,following_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [mali, ploy]);
  for (const user of demo.rows) {
    await q("INSERT INTO wallets(user_id,credit_balance) VALUES($1,1200) ON CONFLICT(user_id) DO NOTHING", [user.id]);
  }
  await ensureSeedDataset();
  await seedCampaignsAndBanners();
  await syncDerivedDomainSeedData();
}

function normalizeDerivedTag(value: string) {
  return value.replace(/^#+/, "").trim().replace(/\s+/g, "-").slice(0, 40).toLowerCase();
}

function deriveItemTags(row: { category?: string | null; wanted_tags?: string[] | null; title?: string | null }) {
  const tags = new Set<string>();
  for (const tag of row.wanted_tags || []) {
    const normalized = normalizeDerivedTag(String(tag || ""));
    if (normalized) tags.add(normalized);
  }
  if (row.category) {
    const normalizedCategory = normalizeDerivedTag(String(row.category));
    if (normalizedCategory) tags.add(normalizedCategory);
  }
  for (const word of String(row.title || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((part) => normalizeDerivedTag(part))
    .filter((part) => part.length >= 3)
    .slice(0, 4)) {
    tags.add(word);
  }
  return Array.from(tags).slice(0, 12);
}

async function syncUserRoles() {
  const preservedRoles = await q<{ user_id: string; role: string }>(
    "SELECT user_id, role FROM user_roles WHERE role IN ('admin', 'restricted')"
  );
  const preservedByUser = new Map<string, Set<string>>();
  for (const row of preservedRoles.rows) {
    const current = preservedByUser.get(row.user_id) || new Set<string>();
    current.add(row.role);
    preservedByUser.set(row.user_id, current);
  }
  await q("DELETE FROM user_roles WHERE role NOT IN ('admin', 'restricted')");
  const users = await q<{
    id: string;
    account_level: number | null;
    listing_count: string;
    review_count: string;
    follower_count: string;
  }>(
    `SELECT
        u.id,
        COALESCE(p.account_level, 2) AS account_level,
        COALESCE((SELECT count(*)::text FROM items i WHERE i.owner_id = u.id AND i.status = 'active'), '0') AS listing_count,
        COALESCE((SELECT count(*)::text FROM reviews r WHERE r.reviewee_user_id = u.id), '0') AS review_count,
        COALESCE((SELECT count(*)::text FROM follows f WHERE f.following_id = u.id), '0') AS follower_count
       FROM users u
       LEFT JOIN profiles p ON p.id = u.id`
  );
  for (const user of users.rows) {
    const roles = new Set<string>(["member", "basic_user"]);
    const listingCount = Number(user.listing_count || 0);
    const reviewCount = Number(user.review_count || 0);
    const followerCount = Number(user.follower_count || 0);
    if (
      Number(user.account_level || 0) >= 3 ||
      reviewCount >= 1 ||
      listingCount >= 1 ||
      followerCount >= 1
    ) {
      roles.add("trusted");
      roles.add("trusted_user");
    }
    if (
      reviewCount >= 5 ||
      listingCount >= 8 ||
      followerCount >= 10
    ) {
      roles.add("power_user");
    }
    for (const preserved of preservedByUser.get(user.id) || []) {
      roles.add(preserved);
    }
    if (Number(user.account_level || 0) === 4) roles.add("restricted");
    for (const role of roles) {
      await q("INSERT INTO user_roles(user_id, role) VALUES($1, $2) ON CONFLICT(user_id, role) DO NOTHING", [user.id, role]);
    }
  }
}

export async function syncItemDerivedData(itemId: string) {
  const item = await q<{
    id: string;
    owner_id: string;
    title: string;
    description: string | null;
    category: string | null;
    deal_type: string;
    wanted_text: string | null;
    wanted_tags: string[] | null;
    location_label: string | null;
    latitude: number | null;
    longitude: number | null;
    status: string | null;
  }>(
    `SELECT id, owner_id, title, description, category, deal_type, wanted_text, wanted_tags, location_label, latitude, longitude, status
     FROM items
     WHERE id = $1`,
    [itemId]
  );
  const row = item.rows[0];
  if (!row) {
    await q("DELETE FROM item_tags WHERE item_id = $1", [itemId]);
    await q("DELETE FROM feed_posts WHERE item_id = $1 OR source_key = $2", [itemId, `item:${itemId}`]);
    await q("DELETE FROM wanted_items WHERE source_item_id = $1", [itemId]);
    return;
  }

  await q("DELETE FROM item_tags WHERE item_id = $1", [itemId]);
  for (const tag of deriveItemTags(row)) {
    await q("INSERT INTO item_tags(item_id, tag, source) VALUES($1, $2, 'derived') ON CONFLICT(item_id, tag) DO NOTHING", [itemId, tag]);
  }

  const existingMirroredWanted = await q<{ id: string }>(
    "SELECT id FROM wanted_items WHERE source_item_id = $1 LIMIT 1",
    [row.id]
  );
  const existingMirroredWantedId = existingMirroredWanted.rows[0]?.id || null;
  const shouldMirrorWanted =
    row.deal_type === "buy" ||
    Boolean(String(row.wanted_text || "").trim()) ||
    Boolean((row.wanted_tags || []).length);
  let wantedItemId: string | null = null;
  if (shouldMirrorWanted) {
    const wanted = await q<{ id: string }>(
      `INSERT INTO wanted_items(source_item_id, owner_id, title, description, category, deal_type, wanted_text, wanted_tags, reference_images, urgency, location_label, latitude, longitude, status)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::text[], '{}'), COALESCE($10::text, 'normal'), $11, $12, $13, COALESCE($14, 'active'))
       ON CONFLICT(source_item_id) DO UPDATE SET
         owner_id = EXCLUDED.owner_id,
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         category = EXCLUDED.category,
         deal_type = EXCLUDED.deal_type,
         wanted_text = EXCLUDED.wanted_text,
         wanted_tags = EXCLUDED.wanted_tags,
         reference_images = EXCLUDED.reference_images,
         urgency = EXCLUDED.urgency,
         location_label = EXCLUDED.location_label,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         status = EXCLUDED.status,
         updated_at = now()
       RETURNING id`,
      [
        row.id,
        row.owner_id,
        row.title,
        row.description || "",
        row.category || "Other",
        row.deal_type,
        row.wanted_text || "",
        row.wanted_tags || [],
        [],
        "normal",
        row.location_label || "",
        row.latitude,
        row.longitude,
        row.status || "active"
      ]
    );
    wantedItemId = wanted.rows[0]?.id || null;
  } else {
    await q("DELETE FROM wanted_items WHERE source_item_id = $1", [row.id]);
  }

  if (row.status === "active") {
    await q(
      `INSERT INTO feed_posts(source_key, actor_user_id, post_type, item_id, visibility)
       VALUES($1, $2, 'item', $3, 'public')
       ON CONFLICT(source_key) DO UPDATE SET actor_user_id = EXCLUDED.actor_user_id, item_id = EXCLUDED.item_id, updated_at = now()`,
      [`item:${row.id}`, row.owner_id, row.id]
    );

    if (wantedItemId) {
      await q(
        `INSERT INTO feed_posts(source_key, actor_user_id, post_type, wanted_item_id, visibility)
         VALUES($1, $2, 'wanted_item', $3, 'public')
         ON CONFLICT(source_key) DO UPDATE SET actor_user_id = EXCLUDED.actor_user_id, wanted_item_id = EXCLUDED.wanted_item_id, updated_at = now()`,
        [`wanted:${wantedItemId}`, row.owner_id, wantedItemId]
      );
    } else {
      await q("DELETE FROM feed_posts WHERE source_key = $1", [`wanted:${row.id}`]);
      await q("DELETE FROM feed_posts WHERE wanted_item_id NOT IN (SELECT id FROM wanted_items)");
    }
  } else {
    await q("DELETE FROM feed_posts WHERE source_key = $1 OR item_id = $2", [`item:${row.id}`, row.id]);
    await q(
      "DELETE FROM feed_posts WHERE source_key = $1 OR wanted_item_id = $2",
      [`wanted:${wantedItemId || existingMirroredWantedId || row.id}`, wantedItemId || existingMirroredWantedId]
    );
  }
}

async function seedSystemRewardItems() {
  const rewards = [
    {
      slug: "camera-cleaning-kit",
      title: "ชุดทำความสะอาดกล้อง",
      description: "ของรางวัลระบบสำหรับคนสะสมอุปกรณ์ถ่ายภาพ",
      image_url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
      credit_cost: 180,
      inventory_count: 12,
      status: "active"
    },
    {
      slug: "coffee-voucher",
      title: "คูปองกาแฟพาร์ทเนอร์",
      description: "แลกเครดิตเป็นสิทธิ์เครื่องดื่มจากพาร์ทเนอร์ที่ร่วมรายการ",
      image_url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
      credit_cost: 120,
      inventory_count: 0,
      status: "active"
    },
    {
      slug: "shipping-support",
      title: "เครดิตช่วยค่าส่ง",
      description: "ใช้แลกสิทธิ์ช่วยค่าส่งสำหรับดีลถัดไป",
      image_url: "https://images.unsplash.com/photo-1519010470956-6d877008eaa4?auto=format&fit=crop&w=900&q=80",
      credit_cost: 250,
      inventory_count: 20,
      status: "active"
    },
    {
      slug: "repair-consult-pass",
      title: "สิทธิ์ปรึกษาซ่อมอุปกรณ์",
      description: "สิทธิ์จากระบบสำหรับขอคำแนะนำซ่อมอุปกรณ์กับพาร์ทเนอร์ที่ร่วมรายการ",
      image_url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80",
      credit_cost: 220,
      inventory_count: 6,
      status: "inactive"
    }
  ];
  for (const reward of rewards) {
    await q(
      `INSERT INTO system_reward_items(slug, title, description, image_url, credit_cost, inventory_count, status)
       VALUES($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(slug) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         image_url = EXCLUDED.image_url,
         credit_cost = EXCLUDED.credit_cost,
         inventory_count = EXCLUDED.inventory_count,
         status = EXCLUDED.status,
         updated_at = now()`,
      [reward.slug, reward.title, reward.description, reward.image_url, reward.credit_cost, reward.inventory_count, reward.status]
    );
  }
}

async function seedShowcaseReviews() {
  const profiles = await q<{ id: string; username: string | null }>(
    "SELECT id, username FROM profiles WHERE username = ANY($1)",
    [["mali", "niran", "ploy"]]
  );
  const byUsername = new Map(profiles.rows.map((row) => [row.username || "", row.id]));
  const samples = [
    { reviewer: "niran", reviewee: "mali", rating: 5, comment: "ตอบไว นัดรับชัดเจน ของตรงตามภาพ" },
    { reviewer: "ploy", reviewee: "niran", rating: 4, comment: "คุยง่าย แพ็กของเรียบร้อยมาก" },
    { reviewer: "mali", reviewee: "ploy", rating: 5, comment: "สภาพของดีจริง และตกลงดีลง่าย" }
  ];
  for (const sample of samples) {
    const reviewerId = byUsername.get(sample.reviewer);
    const revieweeId = byUsername.get(sample.reviewee);
    if (!reviewerId || !revieweeId) continue;
    const existing = await q<{ id: string }>(
      "SELECT id FROM reviews WHERE reviewer_user_id = $1 AND reviewee_user_id = $2 AND comment = $3 LIMIT 1",
      [reviewerId, revieweeId, sample.comment]
    );
    if (existing.rows[0]) continue;
    await q(
      "INSERT INTO reviews(reviewer_user_id, reviewee_user_id, rating, comment) VALUES($1, $2, $3, $4)",
      [reviewerId, revieweeId, sample.rating, sample.comment]
    );
  }
}

export async function syncDerivedDomainSeedData() {
  await syncUserRoles();
  const items = await q<{ id: string }>("SELECT id FROM items");
  for (const item of items.rows) {
    await syncItemDerivedData(item.id);
  }
  await q("DELETE FROM feed_posts WHERE item_id IS NOT NULL AND item_id NOT IN (SELECT id FROM items)");
  await q("DELETE FROM feed_posts WHERE wanted_item_id IS NOT NULL AND wanted_item_id NOT IN (SELECT id FROM wanted_items)");
  await seedSystemRewardItems();
  await seedShowcaseReviews();
}

export async function resetSeedData() {
  const database = await getDb();
  await database.query(`
    TRUNCATE TABLE
      reward_redemptions,
      reviews,
      reports,
      swap_status_logs,
      feed_posts,
      wanted_items,
      item_tags,
      chat_messages,
      chat_participants,
      chat_conversations,
      item_owner_history,
      item_views,
      shipments,
      deals,
      notifications,
      transactions,
      offer_items,
      offers,
      bookmarks,
      follows,
      item_images,
      items,
      system_reward_items,
      banners,
      campaigns,
      categories,
      wallets,
      user_roles,
      profiles,
      user_sessions,
      users
    RESTART IDENTITY CASCADE
  `);
  await seed({ forceDemo: true });
}

function demoSeedEnabled(forceDemo = false) {
  if (forceDemo) return true;
  const raw = String(process.env.QXWAP_ENABLE_RUNTIME_SEED || "").trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return process.env.NODE_ENV !== "production";
}

type SeedUserBlueprint = {
  email: string;
  displayName: string;
  username: string;
  city: string;
  bio: string;
  rating: number;
  responseTime: number;
  featured: boolean;
  fast: boolean;
  latitude: number;
  longitude: number;
};

const seedUserBlueprints: SeedUserBlueprint[] = [
  { email: "mali@qxwap.app", displayName: "มะลิ Swap Studio", username: "mali", city: "กรุงเทพฯ", bio: "พร้อมแลกของดี ใช้งานจริง ตอบไว", rating: 4.9, responseTime: 8, featured: true, fast: true, latitude: 13.7563, longitude: 100.5018 },
  { email: "niran@qxwap.app", displayName: "นิรันดร์ Gadget", username: "niran", city: "เชียงใหม่", bio: "สายแกดเจ็ตและอุปกรณ์ใช้งานจริง", rating: 4.7, responseTime: 18, featured: false, fast: false, latitude: 18.7883, longitude: 98.9853 },
  { email: "ploy@qxwap.app", displayName: "พลอย Closet", username: "ploy", city: "นนทบุรี", bio: "แฟชั่นและไอเท็มสะสมสภาพดี", rating: 4.8, responseTime: 11, featured: true, fast: true, latitude: 13.8591, longitude: 100.5217 },
  { email: "mock-01@qxwap.app", displayName: "นนท์ Analog Club", username: "analog_nont", city: "กรุงเทพฯ", bio: "ชอบกล้องฟิล์ม หนังสือภาพ และของสะสมสายอนาล็อก", rating: 4.6, responseTime: 15, featured: false, fast: true, latitude: 13.7466, longitude: 100.5347 },
  { email: "mock-02@qxwap.app", displayName: "ฟ้า Outdoor Lab", username: "fa_outdoor", city: "เชียงใหม่", bio: "อุปกรณ์แคมป์ จักรยาน และของใช้นอกบ้าน", rating: 4.5, responseTime: 22, featured: false, fast: false, latitude: 18.7961, longitude: 98.9793 },
  { email: "mock-03@qxwap.app", displayName: "บอส Coffee Works", username: "boss_brew", city: "กรุงเทพฯ", bio: "เครื่องชงกาแฟ มิลล์ และแก้วคอลเลกชัน", rating: 4.8, responseTime: 12, featured: true, fast: true, latitude: 13.7797, longitude: 100.5447 },
  { email: "mock-04@qxwap.app", displayName: "เกด Home Select", username: "kate_home", city: "ขอนแก่น", bio: "เฟอร์นิเจอร์แต่งบ้านและของแต่งมินิมอล", rating: 4.4, responseTime: 27, featured: false, fast: false, latitude: 16.4322, longitude: 102.8236 },
  { email: "mock-05@qxwap.app", displayName: "ไผ่ Sneaker Room", username: "pai_sneaker", city: "กรุงเทพฯ", bio: "รองเท้าแฟชั่น เสื้อผ้า และของหายาก", rating: 4.7, responseTime: 10, featured: true, fast: true, latitude: 13.7236, longitude: 100.4762 },
  { email: "mock-06@qxwap.app", displayName: "เจน Boardgame Shelf", username: "jane_board", city: "นครราชสีมา", bio: "บอร์ดเกม ไพ่สะสม และเกมหายาก", rating: 4.6, responseTime: 16, featured: false, fast: true, latitude: 14.9799, longitude: 102.0977 },
  { email: "mock-07@qxwap.app", displayName: "อาร์ต Creator Desk", username: "art_creator", city: "กรุงเทพฯ", bio: "อุปกรณ์ครีเอเตอร์ แท็บเล็ต วาดรูป และไมค์", rating: 4.9, responseTime: 9, featured: true, fast: true, latitude: 13.7365, longitude: 100.5232 },
  { email: "mock-08@qxwap.app", displayName: "ปริม Wellness Space", username: "prim_well", city: "หัวหิน", bio: "บิวตี้ สุขภาพ และไลฟ์สไตล์ดูแลตัวเอง", rating: 4.3, responseTime: 20, featured: false, fast: false, latitude: 12.5684, longitude: 99.9577 },
  { email: "mock-09@qxwap.app", displayName: "เต้ Sound District", username: "tae_sound", city: "กรุงเทพฯ", bio: "หูฟัง ลำโพง และเครื่องเสียงมือสองสภาพดี", rating: 4.8, responseTime: 13, featured: true, fast: true, latitude: 13.7308, longitude: 100.5695 },
  { email: "mock-10@qxwap.app", displayName: "แอล Kiddo Market", username: "elle_kiddo", city: "ชลบุรี", bio: "ของเล่น หนังสือเด็ก และของใช้ครอบครัว", rating: 4.4, responseTime: 19, featured: false, fast: false, latitude: 13.3611, longitude: 100.9847 },
  { email: "mock-11@qxwap.app", displayName: "ต้น Vintage Garage", username: "ton_garage", city: "เชียงราย", bio: "ของสะสม วินเทจ และอุปกรณ์แต่งรถมอเตอร์ไซค์", rating: 4.5, responseTime: 24, featured: false, fast: false, latitude: 19.9105, longitude: 99.8406 },
  { email: "mock-12@qxwap.app", displayName: "เนย Beauty Drop", username: "noey_beauty", city: "กรุงเทพฯ", bio: "เครื่องสำอาง สกินแคร์ และเซ็ตของขวัญ", rating: 4.6, responseTime: 17, featured: false, fast: true, latitude: 13.7657, longitude: 100.5383 },
  { email: "mock-13@qxwap.app", displayName: "วีร์ Runner Track", username: "veer_run", city: "ภูเก็ต", bio: "รองเท้าวิ่ง อุปกรณ์ฟิตเนส และกีฬาเอาต์ดอร์", rating: 4.7, responseTime: 14, featured: true, fast: true, latitude: 7.8804, longitude: 98.3923 },
  { email: "mock-14@qxwap.app", displayName: "แก้ม Reading Corner", username: "kaem_books", city: "เชียงใหม่", bio: "หนังสือ งานศิลป์ และเครื่องเขียนคุณภาพดี", rating: 4.9, responseTime: 8, featured: true, fast: true, latitude: 18.7953, longitude: 98.9986 },
  { email: "mock-15@qxwap.app", displayName: "โย Studio Light", username: "yo_light", city: "กรุงเทพฯ", bio: "ไฟถ่ายภาพ ฉากหลัง และอุปกรณ์สตูดิโอ", rating: 4.5, responseTime: 18, featured: false, fast: true, latitude: 13.7847, longitude: 100.5619 },
  { email: "mock-16@qxwap.app", displayName: "มุก Plant & Pot", username: "mook_plant", city: "ระยอง", bio: "ต้นไม้ กระถาง และของแต่งบ้านธรรมชาติ", rating: 4.3, responseTime: 23, featured: false, fast: false, latitude: 12.6814, longitude: 101.2816 },
  { email: "mock-17@qxwap.app", displayName: "ออม Workstation Lab", username: "aom_work", city: "กรุงเทพฯ", bio: "จอมอนิเตอร์ เก้าอี้ทำงาน และแกดเจ็ตโต๊ะทำงาน", rating: 4.8, responseTime: 11, featured: true, fast: true, latitude: 13.7474, longitude: 100.5653 }
];

const seedLocations = [
  { label: "BTS สยาม, กรุงเทพฯ", short: "สยาม", latitude: 13.7466, longitude: 100.5347 },
  { label: "MRT สุทธิสาร, กรุงเทพฯ", short: "สุทธิสาร", latitude: 13.7788, longitude: 100.5736 },
  { label: "อารีย์, กรุงเทพฯ", short: "อารีย์", latitude: 13.7797, longitude: 100.5447 },
  { label: "เซ็นทรัลเชียงใหม่, เชียงใหม่", short: "เชียงใหม่", latitude: 18.8065, longitude: 99.0172 },
  { label: "ขอนแก่นมหาวิทยาลัย, ขอนแก่น", short: "ขอนแก่น", latitude: 16.4745, longitude: 102.8222 },
  { label: "บลูพอร์ต, หัวหิน", short: "หัวหิน", latitude: 12.5477, longitude: 99.9615 },
  { label: "เซ็นทรัลภูเก็ต, ภูเก็ต", short: "ภูเก็ต", latitude: 7.8906, longitude: 98.3675 },
  { label: "แหลมทอง, ระยอง", short: "ระยอง", latitude: 12.6921, longitude: 101.2706 }
];

const seedProductTemplates = [
  { category: "Electronics", title: "Canon AE-1 Program พร้อมเลนส์ 50mm", description: "ชุดกล้องใช้งานได้จริง เหมาะกับคนเริ่มเล่นฟิล์ม อุปกรณ์ครบพร้อมออกถ่าย", wantedTags: ["กล้องฟิล์ม", "เลนส์", "เครดิต"], wantedText: "อยากได้เลนส์คาแรคเตอร์ดีหรือเครดิตเพิ่มตามสภาพ", condition: "Good", dealType: "swap", priceCash: 6800, priceCredit: 500, open: true, images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1495707902641-75cac588d2e9?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=80"] },
  { category: "Electronics", title: "iPhone 13 mini ความจุ 128GB", description: "ตัวเครื่องสวย ใช้งานปกติ แบตยังดี เหมาะกับคนชอบมือถือขนาดกะทัดรัด", wantedTags: ["มือถือ", "แท็บเล็ต", "เครดิต"], wantedText: "รับแลกมือถือรุ่นใกล้เคียงหรือแท็บเล็ตขนาดเล็ก", condition: "Like new", dealType: "both", priceCash: 14900, priceCredit: 1500, open: false, images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=1200&q=80"] },
  { category: "Fashion", title: "Onitsuka Mexico 66 สีขาวครีม", description: "รองเท้าใส่ไม่กี่ครั้ง พื้นยังแน่น เหมาะกับคนชอบลุคมินิมอล", wantedTags: ["รองเท้า", "เสื้อผ้า", "เงินสด"], wantedText: "อยากได้รองเท้าทรงใกล้เคียงหรือเสื้อแจ็กเก็ตสภาพดี", condition: "Good", dealType: "sell", priceCash: 3200, priceCredit: 300, open: true, images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=1200&q=80"] },
  { category: "Home", title: "เครื่องชงกาแฟเอสเปรสโซ่หน้าไม้", description: "เครื่องใช้งานปกติ สตีมนมได้ เหมาะกับคาเฟ่เล็กหรือใช้ในบ้าน", wantedTags: ["กาแฟ", "เครื่องชงกาแฟ", "ครัว"], wantedText: "แลกมิลล์กาแฟหรืออุปกรณ์บาร์ชงในบ้าน", condition: "Good", dealType: "swap", priceCash: 0, priceCredit: 1200, open: true, images: ["https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80"] },
  { category: "Sports", title: "Garmin Forerunner รุ่นใช้งานวิ่ง", description: "นาฬิกาวิ่ง GPS แบตยังดี ใช้ติดตามระยะและหัวใจได้ครบ", wantedTags: ["วิ่ง", "นาฬิกา", "ฟิตเนส"], wantedText: "มองหารองเท้าวิ่งไซซ์ผู้ชายหรือเครดิตเพิ่มได้", condition: "Good", dealType: "both", priceCash: 5900, priceCredit: 450, open: true, images: ["https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1510017803434-a899398421b3?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1576243345690-4e4b79b63288?auto=format&fit=crop&w=1200&q=80"] },
  { category: "Vehicles", title: "จักรยานพับสำหรับเดินทางในเมือง", description: "ขี่นุ่ม เก็บง่าย เหมาะกับเดินทางระยะสั้นหรือขึ้นรถไฟฟ้า", wantedTags: ["จักรยาน", "เดินทาง", "คาเฟ่"], wantedText: "อยากได้โต๊ะทำงานหรือเครดิตตามสภาพ", condition: "Good", dealType: "swap", priceCash: 0, priceCredit: 0, open: true, cashUnknown: true, images: ["https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1511994298241-608e28f14fde?auto=format&fit=crop&w=1200&q=80"] },
  { category: "Collectibles", title: "ฟิกเกอร์คอลเลกชันพร้อมกล่อง", description: "กล่องครบ สภาพสะสม วางโชว์อย่างเดียว ไม่มีตำหนิหนัก", wantedTags: ["ฟิกเกอร์", "ของสะสม", "โมเดล"], wantedText: "รับแลกของสะสมสายอนิเมะหรือกล้องคอมแพค", condition: "Like new", dealType: "swap", priceCash: 2500, priceCredit: 350, open: true, images: ["https://images.unsplash.com/photo-1608889175110-ecf08d4d5330?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1596727147705-61a532a659bd?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1588497859490-85d1c17db96d?auto=format&fit=crop&w=1200&q=80"] },
  { category: "Books", title: "ชุดหนังสือ UX และ Product Design", description: "รวมหนังสือที่อ่านจบแล้ว เนื้อหาทันสมัยสำหรับสายออกแบบและโปรดักต์", wantedTags: ["หนังสือ", "UX", "ดีไซน์"], wantedText: "แลกหนังสือเทคหรือของแต่งโต๊ะทำงาน", condition: "Like new", dealType: "swap", priceCash: 0, priceCredit: 260, open: true, images: ["https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&w=1200&q=80"] },
  { category: "Beauty", title: "เซ็ตสกินแคร์ผิวแพ้ง่าย", description: "ของแท้ทุกชิ้น ซื้อแล้วใช้ไม่ทัน เหลืออายุอีกนาน", wantedTags: ["สกินแคร์", "บิวตี้", "สุขภาพ"], wantedText: "อยากแลกน้ำหอมหรือของดูแลผิวสภาพใหม่", condition: "Like new", dealType: "sell", priceCash: 1800, priceCredit: 220, open: true, images: ["https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?auto=format&fit=crop&w=1200&q=80"] },
  { category: "Toys", title: "บอร์ดเกมสายปาร์ตี้เล่น 4-8 คน", description: "อุปกรณ์ครบ พร้อมกติกาภาษาไทย เหมาะกับกลุ่มเพื่อนหรือครอบครัว", wantedTags: ["บอร์ดเกม", "ปาร์ตี้", "ของเล่น"], wantedText: "แลกบอร์ดเกม co-op หรือเครดิตเพิ่มได้", condition: "Good", dealType: "both", priceCash: 1450, priceCredit: 180, open: true, images: ["https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1606503153255-59d8b8bdfd39?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1632501641765-e568d28b0015?auto=format&fit=crop&w=1200&q=80"] },
  { category: "Other", title: "เก้าอี้ทำงานพนักพิงสูง", description: "นั่งสบาย ปรับระดับได้ เหมาะกับโต๊ะทำงานที่บ้านหรือออฟฟิศ", wantedTags: ["โต๊ะทำงาน", "เก้าอี้", "โฮมออฟฟิศ"], wantedText: "รับแลกจอมอนิเตอร์หรือของแต่งโต๊ะ", condition: "Good", dealType: "both", priceCash: 3900, priceCredit: 400, open: true, images: ["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80"] },
  { category: "Electronics", title: "ลำโพงบลูทูธพกพาเสียงแน่น", description: "แบตยังดี เชื่อมต่อเสถียร เหมาะกับพกไปแคมป์หรือใช้งานในห้อง", wantedTags: ["ลำโพง", "เครื่องเสียง", "แคมป์"], wantedText: "แลกหูฟังหรือเครดิตตามสภาพ", condition: "Good", dealType: "sell", priceCash: 2300, priceCredit: 260, open: true, images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=1200&q=80"] }
];

async function ensureSeedDataset(existingPasswordHash?: string) {
  const existingUsers = await q<{ id: string; email: string }>(
    "SELECT id,email FROM users WHERE email = ANY($1)",
    [seedUserBlueprints.map((user) => user.email)]
  );
  const existingEmails = new Set(existingUsers.rows.map((user) => user.email));
  let passwordHash = existingPasswordHash;
  if (seedUserBlueprints.some((user) => !existingEmails.has(user.email))) {
    if (!passwordHash) {
      const bcryptModule = await import("bcryptjs");
      const bcrypt = bcryptModule.default || bcryptModule;
      passwordHash = await bcrypt.hash("password123", 10);
    }
    for (const user of seedUserBlueprints) {
      if (existingEmails.has(user.email)) continue;
      const inserted = await q<{ id: string }>("INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id", [user.email, passwordHash]);
      await q(
        `INSERT INTO profiles(id,display_name,username,city,bio,avatar_url,rating,response_time_minutes,is_featured,is_fast_responder,account_level,latitude,longitude)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,2,$11,$12)`,
        [
          inserted.rows[0].id,
          user.displayName,
          user.username,
          user.city,
          user.bio,
          `https://api.dicebear.com/9.x/thumbs/svg?seed=${user.email}`,
          user.rating,
          user.responseTime,
          user.featured,
          user.fast,
          user.latitude,
          user.longitude
        ]
      );
      await q("INSERT INTO wallets(user_id,credit_balance) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING", [inserted.rows[0].id, 900 + seedUserBlueprints.findIndex((entry) => entry.email === user.email) * 80]);
    }
  }

  const owners = await q<{ id: string; email: string }>(
    "SELECT id,email FROM users WHERE email = ANY($1) ORDER BY email ASC",
    [seedUserBlueprints.map((user) => user.email)]
  );
  const titles = Array.from({ length: 100 }, (_, index) => {
    const template = seedProductTemplates[index % seedProductTemplates.length];
    const location = seedLocations[index % seedLocations.length];
    const batch = Math.floor(index / seedProductTemplates.length) + 1;
    return `${template.title} · ${location.short} ${String(batch).padStart(2, "0")}`;
  });
  const existingItems = await q<{ title: string }>("SELECT title FROM items WHERE title = ANY($1)", [titles]);
  const existingTitles = new Set(existingItems.rows.map((row) => row.title));
  for (let index = 0; index < titles.length; index++) {
    const title = titles[index];
    if (existingTitles.has(title)) continue;
    const template = seedProductTemplates[index % seedProductTemplates.length];
    const location = seedLocations[index % seedLocations.length];
    const owner = owners.rows[index % owners.rows.length];
    const cashUnknown = Boolean((template as { cashUnknown?: boolean }).cashUnknown);
    const inserted = await q<{ id: string }>(
      `INSERT INTO items(owner_id,title,description,category,condition,deal_type,price_cash,price_cash_unknown,price_credit,open_to_offers,wanted_text,wanted_tags,location_label,latitude,longitude,view_count,request_count)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
      [
        owner.id,
        title,
        template.description,
        template.category,
        template.condition,
        template.dealType,
        cashUnknown ? 0 : template.priceCash,
        cashUnknown,
        template.priceCredit,
        template.open,
        template.wantedText,
        template.wantedTags,
        location.label,
        location.latitude,
        location.longitude,
        12 + (index % 37),
        2 + (index % 11)
      ]
    );
    for (const [sortOrder, imageUrl] of template.images.entries()) {
      await q("INSERT INTO item_images(item_id,url,sort_order) VALUES($1,$2,$3)", [inserted.rows[0].id, imageUrl, sortOrder]);
    }
  }

  const seededItems = await q<{ id: string; title: string }>("SELECT id,title FROM items WHERE title = ANY($1)", [titles]);
  for (const row of seededItems.rows) {
    const titleIndex = titles.indexOf(row.title);
    if (titleIndex < 0) continue;
    const template = seedProductTemplates[titleIndex % seedProductTemplates.length];
    const existingImages = await q<{ url: string }>("SELECT url FROM item_images WHERE item_id=$1 ORDER BY sort_order ASC", [row.id]);
    const sameGallery =
      existingImages.rows.length === template.images.length &&
      existingImages.rows.every((image, index) => image.url === template.images[index]);
    if (sameGallery) continue;
    await q("DELETE FROM item_images WHERE item_id=$1", [row.id]);
    for (const [sortOrder, imageUrl] of template.images.entries()) {
      await q("INSERT INTO item_images(item_id,url,sort_order) VALUES($1,$2,$3)", [row.id, imageUrl, sortOrder]);
    }
  }
}

async function seedCampaignsAndBanners() {
  const seededProduct = await q<{ id: string }>(
    "SELECT id FROM items WHERE title='iPad mini 6 สีม่วง' ORDER BY created_at ASC LIMIT 1"
  );
  const productId = seededProduct.rows[0]?.id || "";
  const campaign = await q<{ id: string }>(
    `INSERT INTO campaigns(slug,title,summary,body,hero_image_url,cta_label,cta_target_type,cta_target_value)
     VALUES(
       'camera-month',
       'Camera Month',
       'รวมของแลกสายกล้องและอุปกรณ์ถ่ายภาพ',
       'เดือนนี้เน้นดีลสายกล้อง ฟิล์ม เลนส์ และอุปกรณ์ถ่ายภาพ พร้อมแนะนำรายการใกล้เคียงที่ควรลองแลกต่อ',
       'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
       'ถัดไป',
       'product_list',
       'tag:กล้อง'
     )
     ON CONFLICT(slug) DO UPDATE SET
       title=EXCLUDED.title,
       summary=EXCLUDED.summary,
       body=EXCLUDED.body,
       hero_image_url=EXCLUDED.hero_image_url,
       cta_label=EXCLUDED.cta_label,
       cta_target_type=EXCLUDED.cta_target_type,
       cta_target_value=EXCLUDED.cta_target_value,
       updated_at=now()
     RETURNING id`
  );
  await q("DELETE FROM banners");
  await q(
    `INSERT INTO banners(title,image_url,sort_order,target_type,target_value,campaign_id,is_active) VALUES
     ('ดีลเด่นสายกล้อง','https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',0,'campaign_detail',$1,$2,true),
     ('ลองดูสินค้าติด #กล้อง','https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',1,'product_list','tag:กล้อง',NULL,true),
     ('รายการ iPad mini 6 สีม่วง','https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=1200&q=80',2,'product_detail',$3,NULL,true)`,
    [campaign.rows[0].id, campaign.rows[0].id, productId]
  );
}
