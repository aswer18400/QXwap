-- Provide an auto-generated UUID for `id` on tables where the legacy schema
-- created the column as TEXT NOT NULL but without a default.
--
-- Every API INSERT into these tables omits the id parameter (the API expects
-- the database to generate one). Without this default the INSERT throws
-- `23502 null value in column "id" violates not-null constraint` in
-- production. PGlite's local schema in apps/api/src/db.ts uses
-- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` so it doesn't see the bug,
-- which is why the issue only surfaced once we exercised the live Supabase
-- database.
--
-- gen_random_uuid() returns uuid type; the id columns are TEXT — Postgres
-- auto-casts on the way in, identical to the pattern already used by
-- users / items / offers / deals / follows.

ALTER TABLE public.transactions       ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.item_images        ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.chat_conversations ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.offer_items        ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.notifications      ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.chat_messages      ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.shipments          ALTER COLUMN id SET DEFAULT gen_random_uuid();
