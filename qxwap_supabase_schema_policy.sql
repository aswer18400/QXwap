-- Supabase schema/policy SQL executed by .github/workflows/setup-db.yml

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE priority AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE deal_type AS ENUM ('swap', 'buy', 'both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE item_status AS ENUM ('active', 'paused', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'offer_received',
    'offer_accepted',
    'offer_rejected',
    'deal_stage_updated'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id          serial PRIMARY KEY,
  title       text        NOT NULL,
  description text,
  completed   boolean     NOT NULL DEFAULT false,
  priority    priority    NOT NULL DEFAULT 'medium',
  created_at  timestamp   NOT NULL DEFAULT now(),
  updated_at  timestamp   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  sid    varchar     PRIMARY KEY,
  sess   json        NOT NULL,
  expire timestamp(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_user_sessions_expire" ON user_sessions (expire);

CREATE TABLE IF NOT EXISTS users (
  id                  varchar     PRIMARY KEY DEFAULT gen_random_uuid(),
  email               varchar     UNIQUE,
  password_hash       varchar,
  replit_user_id      varchar     UNIQUE,
  first_name          varchar,
  last_name           varchar,
  profile_image_url   varchar,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id                    varchar     PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username              varchar,
  display_name          varchar,
  avatar_url            varchar,
  city                  varchar     NOT NULL DEFAULT 'Bangkok',
  verified_status       boolean     NOT NULL DEFAULT false,
  rating_avg            numeric(3,2) NOT NULL DEFAULT 0,
  successful_deals_count integer    NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
  id              varchar     PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        varchar     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           varchar     NOT NULL,
  description     text,
  category        varchar     NOT NULL,
  condition_label varchar     NOT NULL DEFAULT 'สภาพดี',
  deal_type       deal_type   NOT NULL DEFAULT 'swap',
  price_cash      integer     NOT NULL DEFAULT 0,
  price_credit    integer     NOT NULL DEFAULT 0,
  wanted_text     text,
  status          item_status NOT NULL DEFAULT 'active',
  location_label  varchar     NOT NULL DEFAULT 'Bangkok',
  image_emoji     varchar     NOT NULL DEFAULT '📦',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offers (
  id              varchar       PRIMARY KEY DEFAULT gen_random_uuid(),
  target_item_id  varchar       NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  sender_id       varchar       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id     varchar       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          offer_status  NOT NULL DEFAULT 'pending',
  offered_cash    integer       NOT NULL DEFAULT 0,
  offered_credit  integer       NOT NULL DEFAULT 0,
  message         text,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deals (
  id                  varchar     PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id            varchar     NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  sender_id           varchar     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id         varchar     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_item_id      varchar     NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  stage               varchar     NOT NULL DEFAULT 'accepted',
  fulfillment_type    varchar     NOT NULL DEFAULT 'pickup',
  pickup_slot         varchar(120),
  pickup_point        text,
  shipping_address    text,
  carrier             varchar(120),
  tracking_code       varchar(120),
  shipment_proof_ref  text,
  receipt_proof_ref   text,
  logistics_confirmed boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id                varchar     PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id           varchar     NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  participant_a_id  varchar     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_b_id  varchar     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message      text        NOT NULL DEFAULT '',
  last_message_at   timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS conversations_deal_id_unique ON conversations (deal_id);
CREATE INDEX IF NOT EXISTS conversations_participant_a_idx     ON conversations (participant_a_id);
CREATE INDEX IF NOT EXISTS conversations_participant_b_idx     ON conversations (participant_b_id);
CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx  ON conversations (last_message_at);

CREATE TABLE IF NOT EXISTS messages (
  id               varchar     PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  varchar     NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        varchar     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content          text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx
  ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id         varchar           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    varchar           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id   varchar           REFERENCES users(id) ON DELETE SET NULL,
  type       notification_type NOT NULL,
  title      varchar           NOT NULL,
  body       text,
  offer_id   varchar           REFERENCES offers(id) ON DELETE SET NULL,
  deal_id    varchar           REFERENCES deals(id) ON DELETE SET NULL,
  is_read    boolean           NOT NULL DEFAULT false,
  created_at timestamptz       NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id    varchar     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id    varchar     NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS bookmarks_user_created_idx ON bookmarks (user_id, created_at DESC);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- The API server manages all data access; RLS is disabled so the service-role
-- key used by DATABASE_URL has unrestricted access.

ALTER TABLE user_sessions    DISABLE ROW LEVEL SECURITY;
ALTER TABLE users            DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         DISABLE ROW LEVEL SECURITY;
ALTER TABLE items            DISABLE ROW LEVEL SECURITY;
ALTER TABLE offers           DISABLE ROW LEVEL SECURITY;
ALTER TABLE deals            DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations    DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages         DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks        DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks            DISABLE ROW LEVEL SECURITY;
