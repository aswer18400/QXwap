-- Align the legacy Supabase schema with what apps/api/src/server.ts writes.
--
-- The pre-existing schema was created by an earlier version of the API and
-- diverged from the current code. Until this migration:
--   * /api/offers/:id/reject would crash on missing rejection_reason column
--   * Owners' account_level (used in feed sort + currentUser response) was
--     missing from profiles
--   * /api/shipments/:id/update-step and /finish would fail because the photo
--     URL columns did not exist
--   * /api/offers/:id/cancel would crash because the enum used US spelling
--     "canceled" but the API writes UK "cancelled"
--   * /api/offers/:id/confirm would crash because "confirmed" was not in the
--     enum at all
--   * POST /api/items with deal_type="sell" would crash because the enum did
--     not allow "sell"

ALTER TABLE public.offers     ADD COLUMN IF NOT EXISTS rejection_reason  TEXT;
ALTER TABLE public.offers     ADD COLUMN IF NOT EXISTS instant_swap      BOOLEAN DEFAULT false;
ALTER TABLE public.offers     ADD COLUMN IF NOT EXISTS logistics         JSONB   DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles   ADD COLUMN IF NOT EXISTS account_level     INTEGER DEFAULT 2;
ALTER TABLE public.shipments  ADD COLUMN IF NOT EXISTS pickup_photo_url  TEXT;
ALTER TABLE public.shipments  ADD COLUMN IF NOT EXISTS dropoff_photo_url TEXT;

ALTER TYPE public.offer_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE public.offer_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE public.deal_type    ADD VALUE IF NOT EXISTS 'sell';
