-- ============================================================
-- QXwap — Supabase Database Schema
-- วิธีใช้: เปิด Supabase Dashboard → SQL Editor → วางทั้งหมดแล้วกด Run
-- ============================================================

-- ── 1. EXTENSIONS ──────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 2. PROFILES ────────────────────────────────────────────
-- ต่อกับ auth.users ของ Supabase อัตโนมัติ
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  display_name text not null,
  avatar_url  text,
  location    text,
  bio         text,
  rating      numeric(3,2) default 5.00,
  total_swaps int default 0,
  verified    boolean default false,
  created_at  timestamptz default now()
);

-- สร้าง profile อัตโนมัติเมื่อ user สมัคร
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 3. LISTINGS ────────────────────────────────────────────
-- โพสต์สินค้าที่ลงประกาศ
create table listings (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references profiles(id) on delete cascade,

  -- สินค้าที่มี
  have_title    text not null,
  have_images   text[] not null default '{}',   -- array ของ URL รูปภาพ
  have_desc     text,
  have_category text not null default 'other',  -- electronics | fashion | home | ...

  -- สินค้าที่ต้องการแลก
  want_title    text,
  want_desc     text,

  -- ราคาและโหมด
  price         numeric(12,2),
  currency      text default 'THB',
  mode          text not null default 'swap'     -- swap | sell | both
                check (mode in ('swap','sell','both')),

  -- metadata
  location      text,
  condition     text default 'used_good'         -- new | used_good | used_fair | used_poor
                check (condition in ('new','used_good','used_fair','used_poor')),
  status        text default 'active'            -- active | paused | completed | deleted
                check (status in ('active','paused','completed','deleted')),
  view_count    int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── 4. OFFERS ──────────────────────────────────────────────
-- ข้อเสนอขอแลก
create table offers (
  id            uuid primary key default uuid_generate_v4(),
  listing_id    uuid not null references listings(id) on delete cascade,
  sender_id     uuid not null references profiles(id) on delete cascade,

  -- สิ่งที่เสนอ
  offer_items   jsonb default '[]',  -- [{ title, image_url, desc }]
  cash_amount   numeric(12,2) default 0,
  credit_amount numeric(12,2) default 0,
  note          text,

  -- สถานะ
  status        text default 'pending'
                check (status in ('pending','accepted','rejected','completed','cancelled')),

  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),

  unique(listing_id, sender_id)  -- 1 คนส่งได้ 1 ข้อเสนอต่อ listing
);

-- ── 5. MESSAGES ────────────────────────────────────────────
-- แชทระหว่างผู้ใช้
create table conversations (
  id            uuid primary key default uuid_generate_v4(),
  offer_id      uuid references offers(id) on delete set null,
  participant_a uuid not null references profiles(id),
  participant_b uuid not null references profiles(id),
  last_message  text,
  last_at       timestamptz default now(),
  created_at    timestamptz default now(),
  check (participant_a < participant_b)  -- ป้องกัน duplicate
);

create table messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id),
  text            text not null,
  read_at         timestamptz,
  created_at      timestamptz default now()
);

-- ── 6. CREDITS ─────────────────────────────────────────────
-- เครดิตในแอป
create table credit_ledger (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id),
  amount      numeric(12,2) not null,            -- บวก = เพิ่ม, ลบ = ลด
  type        text not null,                     -- earn | spend | escrow | release
  ref_id      uuid,                              -- offer_id หรือ transaction อื่น
  note        text,
  created_at  timestamptz default now()
);

-- view ยอดรวม credit ต่อ user
create view user_credit_balance as
  select user_id, sum(amount) as balance
  from credit_ledger
  group by user_id;

-- ── 7. STORAGE ─────────────────────────────────────────────
-- bucket สำหรับเก็บรูปสินค้า (สร้างใน Dashboard → Storage)
-- bucket name: "listing-images"
-- public bucket: true

-- ── 8. ROW LEVEL SECURITY (RLS) ────────────────────────────
alter table profiles enable row level security;
alter table listings enable row level security;
alter table offers enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table credit_ledger enable row level security;

-- profiles: อ่านได้ทุกคน, แก้ไขได้เฉพาะเจ้าของ
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- listings: อ่านได้ทุกคน, แก้ไข/ลบได้เฉพาะเจ้าของ
create policy "listings_select_all" on listings for select using (status != 'deleted');
create policy "listings_insert_own" on listings for insert with check (auth.uid() = owner_id);
create policy "listings_update_own" on listings for update using (auth.uid() = owner_id);
create policy "listings_delete_own" on listings for delete using (auth.uid() = owner_id);

-- offers: เจ้าของ listing และ sender เห็นได้
create policy "offers_select_parties" on offers for select using (
  auth.uid() = sender_id or
  auth.uid() = (select owner_id from listings where id = listing_id)
);
create policy "offers_insert_own" on offers for insert with check (auth.uid() = sender_id);
create policy "offers_update_parties" on offers for update using (
  auth.uid() = sender_id or
  auth.uid() = (select owner_id from listings where id = listing_id)
);

-- conversations: เฉพาะ participant ที่เกี่ยวข้อง
create policy "conversations_select" on conversations for select using (
  auth.uid() = participant_a or auth.uid() = participant_b
);
create policy "conversations_insert" on conversations for insert with check (
  auth.uid() = participant_a or auth.uid() = participant_b
);

-- messages: เฉพาะ participant ในการสนทนา
create policy "messages_select" on messages for select using (
  auth.uid() in (
    select participant_a from conversations where id = conversation_id
    union
    select participant_b from conversations where id = conversation_id
  )
);
create policy "messages_insert" on messages for insert with check (
  auth.uid() = sender_id
);

-- ── 9. INDEXES ─────────────────────────────────────────────
create index idx_listings_owner    on listings(owner_id);
create index idx_listings_status   on listings(status);
create index idx_listings_category on listings(have_category);
create index idx_offers_listing    on offers(listing_id);
create index idx_offers_sender     on offers(sender_id);
create index idx_messages_conv     on messages(conversation_id, created_at desc);
create index idx_credit_user       on credit_ledger(user_id);

-- ── 10. REALTIME ───────────────────────────────────────────
-- เปิด realtime สำหรับ messages และ offers
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table offers;
