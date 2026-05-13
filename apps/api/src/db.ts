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
  "categories",
  "items",
  "item_images",
  "follows",
  "bookmarks",
  "offers",
  "offer_items",
  "wallets",
  "transactions",
  "notifications",
  "deals",
  "shipments",
  "chat_conversations",
  "chat_participants",
  "chat_messages"
];

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
  const pglite = new PGlite(dataDir);
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
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled','confirmed')),
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS offer_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
      item_id UUID REFERENCES items(id) ON DELETE CASCADE,
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
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS chat_participants (
      conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(conversation_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
      sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
      text TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS instant_swap BOOLEAN DEFAULT false;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS logistics JSONB DEFAULT '{}';
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_level INTEGER DEFAULT 2;
    ALTER TABLE shipments ADD COLUMN IF NOT EXISTS pickup_photo_url TEXT;
    ALTER TABLE shipments ADD COLUMN IF NOT EXISTS dropoff_photo_url TEXT;
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

export async function seed() {
  const existing = await q<{ count: string }>("SELECT count(*)::text AS count FROM users");
  if (Number(existing.rows[0]?.count || 0) > 0) {
    await backfillDemoRelations();
    return;
  }
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
      credit: 300,
      open: true,
      wanted: ["หนังสือ UX", "กาแฟ", "เครดิต"],
      wantedText: "อยากแลกหนังสือ UX หรือเครดิต",
      loc: "อโศก, กรุงเทพฯ",
      img: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80"
    }
  ];
  for (const item of items) {
    const inserted = await q<{ id: string }>(
      `INSERT INTO items(owner_id,title,description,category,condition,deal_type,price_cash,price_credit,open_to_offers,wanted_text,wanted_tags,location_label,latitude,longitude)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,13.7563,100.5018) RETURNING id`,
      [item.owner, item.title, item.description, item.category, item.condition, item.deal, item.cash, item.credit, item.open, item.wantedText, item.wanted, item.loc]
    );
    await q("INSERT INTO item_images(item_id,url,sort_order) VALUES($1,$2,0)", [inserted.rows[0].id, item.img]);
  }
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
}
