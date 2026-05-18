-- Enable Row Level Security on every public table.
--
-- Background: Supabase exposes a PostgREST API on the anon JWT (which is
-- effectively public knowledge). With RLS disabled the anon key could read
-- and write every row of users, profiles, user_sessions, items, etc.
--
-- This app does NOT use the anon key. It connects via DATABASE_URL with
-- Postgres's `postgres` role, which bypasses RLS entirely. So enabling RLS
-- without adding any policies is exactly what we want: the application keeps
-- working, and the PostgREST surface is closed.
--
-- Re-applying is idempotent (ENABLE on an already-RLS-enabled table is a no-op
-- as long as no rows changed semantics).

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_otps           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_chats         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_images         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages       ENABLE ROW LEVEL SECURITY;
