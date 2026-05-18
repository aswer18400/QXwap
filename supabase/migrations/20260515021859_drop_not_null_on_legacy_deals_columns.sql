-- The deals table has columns from an older schema that the current API does
-- not populate. The new API writes buyer_id, seller_id, item_id; the legacy
-- columns sender_id, receiver_id, target_item_id were NOT NULL, which caused
-- /api/offers/:id/accept to throw 23502 when inserting into deals.
--
-- We drop the NOT NULL but do not drop the columns themselves — if any
-- consumer reads them, they get NULL which is semantically equivalent to
-- "the new schema didn't supply that field". A future migration can drop the
-- legacy columns once it's confirmed nothing reads them.

ALTER TABLE public.deals ALTER COLUMN sender_id      DROP NOT NULL;
ALTER TABLE public.deals ALTER COLUMN receiver_id    DROP NOT NULL;
ALTER TABLE public.deals ALTER COLUMN target_item_id DROP NOT NULL;
