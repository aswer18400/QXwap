# Migration plan: nested Item shape (option A)

Status: **Proposed — awaiting confirmation before edits**
Author: refactor session 2026-05-09
Scope: full backend + frontend type contract change

## Goal

Reshape the single flat `Item` into three explicit data layers — `product`, `trade`, `owner` — across DB, API, and React. Source of truth: the spec we agreed on (3 layers + UX fixes).

## Non-goals (this PR)

- Rich editor for `accessories` / `wanted` ranks (just plumb the data through; AddProduct keeps current single-line inputs as a transitional UI)
- ML-driven match score (`item.match` stays heuristic on backend, identical to today)
- Dropping legacy columns (we keep them for one release for rollback safety)

## Final API contract

```ts
type Item = {
  id: string;
  category: string;          // remains top-level for SQL filters
  status: "active" | "sold" | "archived";
  view_count: number;
  request_count: number;
  created_at: string;

  // ── Layer 1: Core product
  product: {
    title: string;
    brand?: string;
    model?: string;
    purchased_year?: number;
    description: string;
    condition_score: number;             // 0-100
    condition_label: string;             // "New" | "Like new" | "Good" | "Used"
    condition_notes?: string;
    accessories: { label: string; included: boolean }[];
    images: string[];
    tags: string[];                      // free-form keywords (was wanted_tags reused)
  };

  // ── Layer 2: Trade
  trade: {
    deal_type: "swap" | "sell" | "buy" | "both";
    wanted: { rank: 1 | 2 | 3; tag: string; note?: string }[];
    accept_cash: boolean;
    cash_range?: { min: number; max: number };
    accept_credit: boolean;
    credit_range?: { min: number; max: number };
    pickup: { mode: "meet" | "ship" | "both"; area?: string; max_radius_km?: number };
    shipping_payer?: "owner" | "requester" | "split";
    open_to_offers: boolean;
    offer_note?: string;
  };

  // ── Layer 3: Owner / trust (server-derived, read-only)
  owner: {
    id: string;
    display_name: string;
    username?: string;
    avatar_url?: string;
    rating: number;
    deals_completed: number;
    response_time_minutes?: number;
    is_verified: boolean;
    badges: ("featured" | "fast_responder")[];
    account_level: 0 | 1 | 2 | 3 | 4;
  };

  // ── Viewer-specific
  is_owner: boolean;
  is_bookmarked: boolean;
  match?: { score: number; reasons: string[] };
};
```

POST / PATCH bodies mirror the same shape minus viewer fields and `owner` (server fills in).

## DB strategy: expand-only

Keep all existing columns; add new ones; populate from old on first migrate. Drop legacy in a follow-up release.

### `items` — additions

| Column | Type | Notes |
|---|---|---|
| `brand` | TEXT | nullable |
| `model` | TEXT | nullable |
| `purchased_year` | INTEGER | nullable |
| `condition_score` | INTEGER | 0–100, NOT NULL DEFAULT 82, backfilled from `condition` |
| `condition_notes` | TEXT | nullable |
| `accessories` | JSONB | DEFAULT '[]' |
| `accept_cash` | BOOLEAN | DEFAULT false, backfilled `(price_cash > 0 OR deal_type IN ('sell','buy','both'))` |
| `cash_min` | INTEGER | nullable, backfilled `price_cash` |
| `cash_max` | INTEGER | nullable, backfilled `price_cash` |
| `accept_credit` | BOOLEAN | DEFAULT false, backfilled `(price_credit > 0)` |
| `credit_min` | INTEGER | nullable, backfilled `price_credit` |
| `credit_max` | INTEGER | nullable, backfilled `price_credit` |
| `pickup_mode` | TEXT | CHECK IN ('meet','ship','both'), DEFAULT 'meet' |
| `pickup_area` | TEXT | backfilled `location_label` |
| `pickup_max_radius_km` | INTEGER | nullable |
| `shipping_payer` | TEXT | CHECK IN ('owner','requester','split'), nullable |
| `wanted_items` | JSONB | DEFAULT '[]', backfilled from `wanted_tags` (rank by index) |
| `tags` | TEXT[] | DEFAULT '{}'; **separate** from `wanted_tags` for search filter on free keywords (we'll alias `wanted_tags` → `tags` post-migration) |

### `items` — kept as-is (legacy)

`title`, `description`, `condition`, `deal_type`, `price_cash`, `price_credit`, `open_to_offers`, `wanted_text`, `wanted_tags`, `location_label`, `latitude`, `longitude`, `status`, `view_count`, `request_count`, `owner_id`, `created_at`, `updated_at`. **Not dropped this PR.** Marked `// LEGACY` in inline comment.

### `profiles` — additions

| Column | Type | Notes |
|---|---|---|
| `is_verified` | BOOLEAN | DEFAULT false |
| `deals_completed` | INTEGER | DEFAULT 0 (synthesized field; recomputed from `deals` in serializer using `COUNT(*) FILTER (WHERE stage='confirmed')`) |
| `badges` | JSONB | DEFAULT '[]'; backfill: `is_featured ? ['featured'] : []` ∪ `is_fast_responder ? ['fast_responder'] : []` |

### Indexes

Add: `idx_items_condition_score`, `idx_items_pickup_mode`, GIN index on `items.wanted_items` for tag search.

## Backfill SQL (one-time, idempotent)

```sql
UPDATE items SET
  condition_score = CASE lower(coalesce(condition,''))
    WHEN 'new' THEN 98 WHEN 'like new' THEN 92 WHEN 'good' THEN 85 ELSE 72 END
  WHERE condition_score IS NULL OR condition_score = 0;

UPDATE items SET
  accept_cash = (price_cash > 0 OR deal_type IN ('sell','buy','both')),
  cash_min = NULLIF(price_cash, 0),
  cash_max = NULLIF(price_cash, 0)
  WHERE accept_cash IS NULL;

UPDATE items SET
  accept_credit = (price_credit > 0),
  credit_min = NULLIF(price_credit, 0),
  credit_max = NULLIF(price_credit, 0)
  WHERE accept_credit IS NULL;

UPDATE items SET
  pickup_area = location_label,
  pickup_mode = 'meet'
  WHERE pickup_area IS NULL;

UPDATE items SET wanted_items = (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('rank', LEAST(idx + 1, 3), 'tag', tag)
                            ORDER BY idx), '[]'::jsonb)
  FROM unnest(wanted_tags) WITH ORDINALITY AS w(tag, idx)
) WHERE wanted_items = '[]'::jsonb OR wanted_items IS NULL;

UPDATE profiles SET badges = (
  CASE WHEN is_featured THEN '["featured"]'::jsonb ELSE '[]'::jsonb END
  || CASE WHEN is_fast_responder THEN '["fast_responder"]'::jsonb ELSE '[]'::jsonb END
) WHERE badges = '[]'::jsonb OR badges IS NULL;
```

## API serializer change (`server.ts → listItems`)

Replace `rowItem(row)` to build the nested shape. Pseudocode:

```ts
function serializeItem(row, viewerId) {
  return {
    id: row.id,
    category: row.category,
    status: row.status,
    view_count: row.view_count,
    request_count: row.request_count,
    created_at: row.created_at,

    product: {
      title: row.title,
      brand: row.brand ?? undefined,
      model: row.model ?? undefined,
      purchased_year: row.purchased_year ?? undefined,
      description: row.description ?? "",
      condition_score: row.condition_score ?? 82,
      condition_label: row.condition ?? "Good",
      condition_notes: row.condition_notes ?? undefined,
      accessories: row.accessories ?? [],
      images: (row.images ?? []).filter(Boolean),
      tags: row.tags ?? row.wanted_tags ?? [],   // fallback during transition
    },

    trade: {
      deal_type: row.deal_type,
      wanted: row.wanted_items ?? [],
      accept_cash: row.accept_cash,
      cash_range: row.cash_min != null && row.cash_max != null
        ? { min: row.cash_min, max: row.cash_max } : undefined,
      accept_credit: row.accept_credit,
      credit_range: row.credit_min != null && row.credit_max != null
        ? { min: row.credit_min, max: row.credit_max } : undefined,
      pickup: {
        mode: row.pickup_mode ?? "meet",
        area: row.pickup_area ?? row.location_label ?? undefined,
        max_radius_km: row.pickup_max_radius_km ?? undefined,
      },
      shipping_payer: row.shipping_payer ?? undefined,
      open_to_offers: row.open_to_offers,
      offer_note: row.wanted_text || undefined,
    },

    owner: {
      id: row.owner_id,
      display_name: row.owner_name ?? "",
      username: row.owner_username ?? undefined,
      avatar_url: row.owner_avatar ?? undefined,
      rating: Number(row.owner_rating ?? 0),
      deals_completed: Number(row.owner_deals_completed ?? 0),
      response_time_minutes: row.owner_response_time_minutes ?? undefined,
      is_verified: Boolean(row.owner_is_verified),
      badges: row.owner_badges ?? [],
      account_level: row.owner_account_level ?? 2,
    },

    is_owner: Boolean(row.is_owner),
    is_bookmarked: Boolean(row.is_bookmarked),
    match: row.match_score != null
      ? { score: row.match_score, reasons: row.match_reasons ?? [] }
      : undefined,
  };
}
```

The current SQL select already grabs most of these — we just add: `i.brand, i.model, i.purchased_year, i.condition_score, i.condition_notes, i.accessories, i.accept_cash, i.cash_min, i.cash_max, i.accept_credit, i.credit_min, i.credit_max, i.pickup_mode, i.pickup_area, i.pickup_max_radius_km, i.shipping_payer, i.wanted_items, p.username AS owner_username, p.is_verified AS owner_is_verified, p.badges AS owner_badges, p.response_time_minutes AS owner_response_time_minutes`, plus a CTE for `owner_deals_completed`.

### Filters that must be updated

| Old query param | New SQL |
|---|---|
| `?condition=Good` | `i.condition_score >= 80 AND i.condition_score < 90` (map per label) |
| `?min_price=...` | `(i.cash_min >= $X OR i.open_to_offers=true)` |
| `?max_price=...` | `(i.cash_max <= $X OR i.open_to_offers=true)` |
| `?wanted_tag=foo` | `EXISTS (SELECT 1 FROM jsonb_array_elements(i.wanted_items) e WHERE e->>'tag' ILIKE $X)` |

### Request body validators

`POST /api/items` and `PATCH /api/items/:id` now accept the nested shape. Server flattens to columns:
- `body.product.title → title`
- `body.product.condition_score → condition_score`
- `body.trade.cash_range.{min,max} → cash_min, cash_max`
- ...

Reject requests using the old flat shape with `400 LEGACY_SHAPE` and a message pointing to migration notes.

## Frontend changes

### `lib/types.ts`
Replace `Item` definition with the nested type above.

### `lib/format.ts`
- `conditionPercent(item)` → `item.product.condition_score` (no more regex)
- `wantedImage(item)` → reads `item.product.tags[0]` or `item.trade.wanted[0]?.tag`
- `recommendationScore` / `bestMyItem` / `matchReason` — adjust to nested
- `uniqueOwners` — extracts from `item.owner` block

### Components
| File | Change |
|---|---|
| `components/SwapSide.tsx` | `item.images[0]` → `item.product.images[0]`, `item.title` → `item.product.title`, `item.category` → `item.category` (still top-level) |
| `components/ProductGridCard.tsx` | All `item.*` reads → nested |
| `components/ProfileProductCard.tsx` | `item.images`, `item.title`, `item.deal_type` → nested |
| `components/WantedPreviewCard.tsx` | `item.wanted_tags`, `item.wanted_text` → `item.trade.wanted[0]?.tag`, `item.trade.offer_note` |
| `screens/AiFeed.tsx` | Various reads, swap-pair cards |
| `screens/ShopPage.tsx` | Filter wiring (still uses `Filters` flat — maps 1:1 to query params) |
| `screens/Detail.tsx` | All info-grid + wanted block |
| `screens/AddProduct.tsx` | Form payload now sends nested body |
| `screens/Profile.tsx`, `ProfileShop.tsx`, `InboxPage.tsx` | Reads only — straightforward replacements |
| `sheets/OfferSheet.tsx` | Reads `item.product.title`, `item.owner.id` |

### CTA wording (UX fix bundled here since it touches the same files)
- All buttons currently labelled `Xwap` (verb usage) → `เสนอแลก`
- Brand label `Xwap` only used in headings / brand chrome
- Login gate: replace disabled-button pattern with `requireLogin()` interceptor at click time + visible subtitle hint

### Match tooltip
`Detail.tsx` adds an info button next to the match chip → opens a small inline list of `item.match.reasons`.

## Test impact

`apps/api/tests/api.test.ts`:
- `created.body.item.images.length` → `created.body.item.product.images.length`
- `fetched.body.item.title` → `fetched.body.item.product.title`
- `fetched.body.item.wanted_tags` → `fetched.body.item.product.tags` (we mirror old wanted_tags into `product.tags` for keyword search compatibility)
- POST body in test → nested shape
- Add new test: nested filter (`?condition_score_min=80`) — optional this PR

## Seed data update

`db.ts seed()` rewrites the `items` array to push each item through the new nested structure. Each demo item adds:
- `condition_score` explicit
- `accessories` (e.g. iPad: `[{label:'กล่อง',included:true},{label:'อะแดปเตอร์',included:true}]`)
- `wanted_items` with rank
- `pickup_mode`, `pickup_area`
- Profiles: `is_verified=true` for mali, `badges=['featured','fast_responder']` etc.

## Rollout order (to execute when confirmed)

1. **DB**: extend schema + backfill in `db.ts migrate()` and seed (idempotent)
2. **Server**: new serializer + new validators; legacy body returns 400
3. **Tests**: update `api.test.ts` to nested assertions
4. **Frontend types**: `lib/types.ts` switch
5. **Frontend format helpers**: `lib/format.ts`
6. **Frontend components**: bulk update, screen by screen
7. **Frontend forms**: `AddProduct.tsx` switch payload
8. **UX bundle**: CTA wording, login gate, match tooltip
9. **Verify**: `tsc --noEmit` (web + api), `vitest run` (api)
10. **Cleanup task** (separate later PR): drop legacy columns + remove fallback paths

Estimated scope: ~25 files touched, ~700 LoC delta net (API +200, Frontend +300, Seed +150, Tests +50).

## Open questions for confirmation

1. **Drop legacy columns now or follow-up?** Recommendation: follow-up PR after verifying.
2. **`wanted_tags` vs `tags` separation** — the spec uses `product.tags` for free keywords and `trade.wanted` for desired items. Do you also want `tags` to be editable in AddProduct or auto-generated from title for v1?
3. **`condition_score` editing** — slider 0–100 or kept as label dropdown that sets a fixed score? Recommendation: keep dropdown + score = pre-mapped, expose slider in v2.
4. **Match score reasons** — keep deriving on the fly in `listItems` (current heuristic) or add a `match_score` column populated by a worker? Recommendation: keep on-the-fly for now; column-based later when we add ML.
5. **Profile `deals_completed`** — count from `deals.stage='confirmed'` at query time (slower but always fresh) or denormalize on each confirm transaction? Recommendation: query-time for now (small dataset).

---

**To proceed:** answer the 5 questions above (or say "use recommendations") and I'll start with step 1 (DB) and work through to step 9.
