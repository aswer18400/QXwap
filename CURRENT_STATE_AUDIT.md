# CURRENT STATE AUDIT

Date: 2026-05-30  
Repo: `QXwap`  
Scope: Step 1 audit only. No app code changed in this round.

## Audit Method

- Read current frontend route composition in `apps/web/src/App.tsx`
- Read key screens, shared components, API routes, and seed logic
- Checked local browser behavior on `http://127.0.0.1:5174` for guest-access routes after splash
- Verified current backend contract from `apps/api/src/server.ts` and `apps/api/src/db.ts`

Known audit limitation:

- Guest routes were browser-verified directly
- Signed-in flows were audited mostly from code because this round did not complete an end-to-end authenticated browser automation path

## Executive Summary

Current QXwap is already a usable local marketplace shell, but it is still a mixed state between:

- real marketplace/product flows
- seeded demo marketplace data
- partially implemented credit/follow/reputation concepts
- several route and journey mismatches

The largest current problems are:

1. auth entry route behavior is inconsistent with what the app claims to support
2. wallet/credit exists in data model and UI copy, but the route is effectively dead
3. seeded/mock marketplace data is still part of normal backend boot, not isolated to tests
4. user-role differentiation is mostly visual; hard permission differences are minimal
5. “ของที่มี / ของที่อยากได้” exists in the data model, but not as a complete product experience

## Route Inventory And CTA Audit

| Route / Entry | Screen | Main CTA / Buttons | Current Behavior | Audit Note |
|---|---|---|---|---|
| `/` | `AiFeed` | Hero banner, category shortcuts, product cards, save, tag, profile open | Works as landing feed | Supports browsing, but concept is still mostly “discover items” rather than a full have/want exchange system |
| `/login`, `/signin` | auth entry expected via `AuthModal` | Sign in / sign up | Code says it should open auth modal, browser audit showed feed after splash instead of dedicated login entry | P0 journey mismatch |
| `/signup` | auth entry expected via `AuthModal` | Create account | Code path exists | Needs dedicated runtime verification; not proven in this audit |
| `/?view=shop` | `ShopPage` | Sort, nearby, filter, category buttons, product cards, load more | Works | Commerce browsing is real, but empty/error copy is still more helper-like than production-tight |
| `/?view=following` | `ShopPage` with `filters.following=true` | Same as shop | Real backend filter exists | Following view is real but still just a filtered shop, not a distinct social feed journey |
| `/?view=search` | `SearchSheet` | Search field, tabs, trending tags, suggested items | Works | Good browse/search entry, but still sheet-like and not a deep result journey by itself |
| `/?view=filter` | `FilterSheet` | Radius, location, price, deal type, condition, category | Works | Filter UI exists, but wording/state consistency still differs from core pages |
| `/?view=sort` | `FilterSheet` in sort mode | Sort option cards | Works | Real route |
| `/?view=add` | `AddProduct` | Guest login CTA, authenticated publish flow, media picker, location, deal type | Guest state works; authenticated path exists in code | Needs signed-in browser verification for full create/edit/reswap journey |
| `/?view=inbox` | `OffersPage` | Tab switch, open deal, open chat, open shop/add from empty state | Works for guest gate and code path | This is now closer to “Deal Management Center” than pure chat |
| `/?view=notifications` | `NotificationsPage` | Mark all read, open offer detail | Works for guest gate and code path | Notification list is real, but error and empty states are still text-heavy |
| `/?view=profile` | `Profile` | Add listing, saved, inbox, following, notifications, profile edit, avatar update | Works for guest gate and local profile shell | Profile has many surfaces and trust/reputation UI, but some navigation options do not map to live routes |
| `/?view=profile_edit` | `ProfileEditPage` | Save profile | Guest gate works, authenticated edit form exists | Needs signed-in runtime verification |
| `/?view=saved` | `SavedPage` | Open item, login CTA | Works for guest gate and code path | Standard bookmark flow present |
| `/?view=campaign&campaign=:id` | `CampaignDetailPage` | Open CTA target | Route exists | Depends on seeded campaign/banner data |
| `/?item=:id` | `Detail` | Offer, chat, save, edit/delete if owner, open related, open owner | Core product detail flow exists | Strongest product flow, but still partly backed by synthetic trust/condition signals |
| `/?offer=:id` | `OfferDetailPage` | Accept, reject, confirm, logistics steps, receipt confirm, return request, chat | Very rich flow exists | No explicit expired state; complex flow needs dedicated regression coverage |
| `/?view=chat&offer=:id` | `ChatPage` | Send message, retry load | Real route exists | Deal chat depends on offer context, not standalone messaging |
| `/?view=wallet` | `WalletPage` exists in code | Deposit credits, transaction history | View is declared, page exists, API exists, but App coerces wallet view back to profile | P0 dead route / broken journey |

## What Each Major CTA Currently Does

### Feed

- Hero banner: opens banner target or stays static if no banner
- Category shortcuts: push user into category-filtered browsing
- Product card primary click: opens item detail
- Save button: bookmark toggle
- Tag click: re-enters product discovery by wanted tag
- Recommended user cards: open user profile

### Shop

- Sort: opens sort route
- Nearby: opens nearby filter flow
- Filter: opens filter route
- Category buttons: apply category filter
- Product cards: open item detail
- Load more: paginates

### Add Product

- Guest primary CTA: login/signup gate
- Deal-type picker: changes create intent (`swap`, `sell`, `buy`, `both`)
- Media picker: attaches up to 5 images
- Current location: asks for GPS permission and fills location
- Publish CTA: submits item create/update

### Inbox / Deals

- Tab switch: toggles `กำลังแลก` vs `ประวัติ`
- Primary card action: opens deal detail
- Secondary card action: open chat or contextual next step depending on status
- Empty-state CTA: usually back to add/shop depending on state

### Notifications

- Card click: marks notification read and opens offer detail when linked
- Read all: marks all as read

### Profile

- Add listing CTA: opens add flow
- Saved shortcut: opens saved
- Offers shortcut: opens inbox/deals
- Following shortcut: opens following view
- Notifications action: opens notifications
- Edit profile: opens profile edit
- Account hub items: mixed, see journey issue below

### Detail

- Offer CTA: opens offer flow / auth gate / restricted message depending on viewer
- Chat CTA: opens active offer chat if present, otherwise starts offer flow
- Save CTA: bookmark toggle
- Edit/Delete: owner-only actions
- Related product CTA: opens another detail route
- Owner card CTA: opens owner profile

### Offer Detail

- Accept / reject / approve: changes offer state
- Logistics schedule / shipment step buttons: progress fulfillment
- Confirm receipt / request return: final resolution actions
- Chat CTA: opens conversation

## Flows That Are Still Incomplete Or Not Fully Closed

### 1. Auth entry flow is inconsistent

- Code supports `/login`, `/signin`, `/signup`, and hash-based auth routes
- Browser audit on `/login` still surfaced the regular feed after splash instead of a clear auth entry
- This means “direct entry into auth” is not trustworthy yet

### 2. Wallet / credit journey is incomplete

- `WalletPage` exists
- `/wallet`, `/transactions`, `/wallet/deposit` APIs exist
- profile menu and copy still mention credits
- but App route restoration and state coercion rewrite `wallet` to `profile`
- result: the user can see credit language, but cannot travel a clean route into the credit page

### 3. Create item journey is only partially runtime-verified

- Draft persistence, validation, GPS handling, price validation, image limits, and field errors exist in code
- Guest gate was browser-verified
- Full signed-in submit/edit/reswap browser proof was not completed in this audit

### 4. Offer lifecycle is rich but lacks an explicit expiry concept

- States implemented: `pending`, `accepted_by_receiver`, `accepted`, `rejected`, `cancelled`, `confirmed`
- No explicit `expired` state exists in backend or frontend contracts
- If the product expects timed-out deals, that state is missing

### 5. Credit/payment flow is still local-only

- Deposit is a local integer increment to wallet balance
- No real checkout/payment provider exists
- No production-grade payment flow exists behind credit operations

### 6. Have / Want exchange concept is only partially complete

- Item model supports `wanted.text` and `wanted.tags`
- detail page surfaces “ต้องการแลกกับ”
- feed/shop cards show wanted hints
- profile tabs define `มีอยู่` and `อยากได้`
- but there is no real second inventory/storefront for “want” items; only actual listings are rendered

## Mock / Seed / Test Data Inventory

### Backend boot-time mock data

File: `apps/api/src/db.ts`

- `seed()`
- `ensureMockDataset()`
- `seedCampaignsAndBanners()`
- demo users:
  - `mali@qxwap.app`
  - `niran@qxwap.app`
  - `ploy@qxwap.app`
- marketplace mock blueprints:
  - `mock-01@qxwap.app` through `mock-17@qxwap.app`
- `mockProductTemplates`
- `mockLocations`
- seeded follow relationships
- seeded wallet balances
- seeded banners and campaigns

Result:

- Mock/demo data is not isolated to tests
- It is part of normal local backend startup

### Test-created data

File: `apps/api/tests/api.test.ts`

- creates seeder accounts/items during tests

### Script-seeded audit/readiness data

Files:

- `scripts/qxwap-product-readiness-personas.mjs`
- `scripts/qxwap-product-readiness-loop.mjs`
- `scripts/qxwap-product-readiness-browser.mjs`
- `scripts/qxwap-api-smoke.mjs`
- `scripts/qxwap-full-smoke.mjs`

These contain:

- seeded bug reports
- smoke flow artifacts
- readiness automation assumptions

### Demo/example UI files

Files:

- `apps/web/src/design-system/components-example.html`
- `apps/web/src/design-system/README.md`
- `apps/web/public/status.html`

These are not production pages, but they still contain example/demo scaffolding.

## Duplicate / Overlapping Component Inventory

### Guest/login prompt system overlap

Files:

- `apps/web/src/components/LoginCTA.tsx`
- `apps/web/src/components/AuthNudge.tsx`
- `apps/web/src/components/GuestAccessScreen.tsx`

Finding:

- Same problem domain is solved in three layers:
  - content source
  - floating dock
  - full-screen guest gate
- This is useful, but still a duplication hotspot

### Empty-state patterns overlap

Files:

- `apps/web/src/components/ContextEmptyState.tsx`
- plus inline `empty`, `empty-inline`, `err` usage across screens

Finding:

- The app has a reusable empty-state component
- But many screens still mix it with one-off inline empty/error markup

### Trust / reputation overlap

Files:

- `apps/web/src/components/TrustPanel.tsx`
- `apps/web/src/screens/Profile.tsx`
- `apps/web/src/screens/Detail.tsx`

Finding:

- Trust is expressed in multiple styles instead of one consistent contract

### Product card overlap

Files:

- `apps/web/src/components/ProductGridCard.tsx`
- `apps/web/src/components/ProfileProductCard.tsx`

Finding:

- Two card families exist for related item content
- Reasonable, but another consistency hotspot

## Navigation / Journey Mismatches

### P0: wallet exists but is unreachable

Files:

- `apps/web/src/App.tsx`
- `apps/web/src/screens/WalletPage.tsx`
- `apps/web/src/design-system.ts`

Details:

- `View` includes `wallet`
- guest prompt title includes `wallet`
- menu label includes `กระเป๋าเครดิต`
- but `App.tsx` rewrites wallet state to profile during route restore
- no live render branch for `WalletPage`

### P0: `/login` route behavior does not match intended auth journey

Files:

- `apps/web/src/App.tsx`
- `apps/web/src/sheets/AuthModal.tsx`

Details:

- Code clearly intends `/login` and `/signin` to open auth modal
- Browser audit observed regular feed after splash instead

### P1: profile navigation mentions surfaces not fully connected

Files:

- `apps/web/src/design-system.ts`
- `apps/web/src/screens/Profile.tsx`

Details:

- menu definitions include credits and shipping
- visible shortcut and hub actions mostly wire to saved/offers/following/profile edit
- there is no complete route-level implementation parity for every declared profile menu concept

## Wording Mismatches / App-Language Gaps

### Mixed marketplace vocabulary

Observed terms include:

- `ข้อเสนอ`
- `ดีล`
- `Xwap`
- `เครดิต`
- `กระเป๋าเครดิต`
- `ขายหรือแลก`
- `เปิดรับข้อเสนอ`

Finding:

- The app is much closer to a real marketplace than before, but wording is still mixed between:
  - swap-first language
  - general marketplace language
  - internal credit/reward language

### Level copy is more complete than permission logic

Files:

- `apps/web/src/lib/format.ts`
- `apps/web/src/design-system.ts`
- `apps/api/src/server.ts`

Finding:

- Level names and notes are polished
- But they suggest differentiated product capabilities that mostly do not exist yet in real permission logic

### Condition percentage is still synthetic

Files:

- `apps/web/src/lib/format.ts`
- `apps/web/src/components/ProductGridCard.tsx`
- `apps/web/src/screens/Detail.tsx`

Finding:

- `สภาพ 85% / 92%` is derived heuristically, not measured
- It may still read like mock certainty unless explained or reduced

## State Coverage Audit

### States clearly present

- loading:
  - feed
  - shop
  - inbox
  - notifications
  - profile
  - wallet
  - add
  - detail incoming offers
  - campaign
- empty:
  - search suggestions
  - shop
  - inbox
  - notifications
  - saved
  - profile activity/listings
  - add restricted/guest states
- error:
  - feed
  - shop
  - inbox
  - notifications
  - chat
  - profile edit
  - add field validation
  - app shell error boundary
- success:
  - add item submit path
  - avatar saved
  - some offer lifecycle actions
- rejected/cancelled/confirmed:
  - offer detail
  - inbox
  - notifications

### States missing or incomplete

- expired:
  - no dedicated offer/deal expiry state
- permission denied:
  - backend returns `FORBIDDEN` / `ACCOUNT_RESTRICTED`, but route-level UX is not uniformly specialized
- unauthorized deep links:
  - guest gates exist, but direct auth-route recovery is inconsistent
- slow API / retry:
  - some screens have retry, some just show text
- success confirmation consistency:
  - several flows rely on state change rather than a clearly consistent success surface

## Feed Audit: “ของที่มี / ของที่อยากได้”

Current support level: **partial**

### What is real

- `Item` data model includes:
  - item being offered (`ของที่มี`)
  - wanted description/tags (`ของที่อยากได้`)
- detail page surfaces wanted exchange intent
- add form supports wanted text and wanted tags
- feed/shop cards expose wanted hints

### What is still missing

- No real “want inventory” or “wanted-only listing” collection in profile/storefront
- `profileProductTabs` declares `have` and `want`, but `ProfileShop` only renders actual items
- The user mental model is still closer to:
  - “listing an item and optionally describing what I want”
  than:
  - “managing both my have-list and want-list as first-class inventory”

## Credit Audit

### Where credit appears

Files:

- `apps/web/src/design-system.ts`
- `apps/web/src/screens/WalletPage.tsx`
- `apps/web/src/lib/types.ts`
- `apps/api/src/server.ts`

### Current state

- wallet type exists
- transaction type exists
- wallet page exists
- deposit endpoint exists
- item model includes `deal.price_credit`
- profile/menu copy references credits

### Reality check

- route is dead in App
- deposit is local state mutation only
- no real checkout
- no external ledger or payment confirmation
- no production trust boundary around credit economics

Conclusion:

- credit is more than mock copy, but still not production-grade business logic

## Follow-Based Feed Audit

Current support level: **partial but real**

### What works

- backend supports `/follows`
- backend item listing supports `following=true`
- App loads followed users
- home feed prioritizes followed owners first when logged in
- following view opens shop with `filters.following = true`

### What does not yet exist

- no dedicated social/follow graph experience
- no separate “following feed” with post-level or activity-level logic
- no evidence of follow-based notification/recommendation depth beyond owner prioritization and filtering

## User Level / Role Audit

### Levels present

Files:

- `apps/web/src/lib/format.ts`
- `apps/api/src/db.ts`
- `apps/api/src/server.ts`

Levels:

- Level 0: visitor
- Level 1: member
- Level 2: ready to swap
- Level 3: credit user
- Level 4: restricted

### Real permission differences today

- unauthenticated users are guest-gated in protected routes
- Level 4 users cannot create offers (`ACCOUNT_RESTRICTED`)

### Mostly presentation-only differences

- Level 1, 2, and 3 are primarily copy/trust distinctions
- There is no meaningful route/data segregation between 1, 2, and 3 in current app behavior

Conclusion:

- Levels exist
- Roles are not yet deeply operationalized

## P0 Issues

### P0-1 Direct auth route is not reliable

- `/login` and `/signin` should open auth entry
- browser audit showed normal feed after splash
- This breaks a core entry journey

Relevant files:

- `apps/web/src/App.tsx`
- `apps/web/src/sheets/AuthModal.tsx`

### P0-2 Wallet/credit route is effectively dead

- `wallet` is declared in route types
- wallet page exists
- APIs exist
- App coerces wallet view back to profile

Relevant files:

- `apps/web/src/App.tsx`
- `apps/web/src/lib/types.ts`
- `apps/web/src/screens/WalletPage.tsx`
- `apps/web/src/design-system.ts`

## P1 Issues

### P1-1 Backend boot still depends on seeded/mock marketplace data

Relevant files:

- `apps/api/src/db.ts`
- `apps/api/src/server.ts`

### P1-2 “Have / Want” product concept is only partially implemented

Relevant files:

- `apps/web/src/lib/types.ts`
- `apps/web/src/screens/AddProduct.tsx`
- `apps/web/src/screens/Detail.tsx`
- `apps/web/src/screens/ProfileShop.tsx`
- `apps/web/src/design-system.ts`

### P1-3 Credit system is not production-real yet

Relevant files:

- `apps/web/src/screens/WalletPage.tsx`
- `apps/api/src/server.ts`
- `apps/web/src/lib/types.ts`

### P1-4 User levels are mostly visual, not permission-based

Relevant files:

- `apps/web/src/lib/format.ts`
- `apps/api/src/server.ts`
- `apps/api/src/db.ts`

### P1-5 Offer lifecycle lacks expiry model

Relevant files:

- `apps/web/src/lib/types.ts`
- `apps/api/src/db.ts`
- `apps/api/src/server.ts`
- `apps/web/src/screens/OfferDetailPage.tsx`

### P1-6 Navigation/menu definitions and live routes are not fully aligned

Relevant files:

- `apps/web/src/design-system.ts`
- `apps/web/src/screens/Profile.tsx`
- `apps/web/src/App.tsx`

## P2 Issues

### P2-1 Guest/login prompt pattern is spread across multiple components

Relevant files:

- `apps/web/src/components/LoginCTA.tsx`
- `apps/web/src/components/AuthNudge.tsx`
- `apps/web/src/components/GuestAccessScreen.tsx`

### P2-2 Empty/error state patterns are not fully standardized

Relevant files:

- `apps/web/src/components/ContextEmptyState.tsx`
- `apps/web/src/screens/AiFeed.tsx`
- `apps/web/src/screens/ShopPage.tsx`
- `apps/web/src/screens/NotificationsPage.tsx`
- `apps/web/src/screens/InboxPage.tsx`
- `apps/web/src/screens/ChatPage.tsx`
- `apps/web/src/screens/SavedPage.tsx`

### P2-3 Trust/reputation UI exists in multiple styles

Relevant files:

- `apps/web/src/components/TrustPanel.tsx`
- `apps/web/src/screens/Profile.tsx`
- `apps/web/src/screens/Detail.tsx`

### P2-4 Condition percentages still feel synthetic

Relevant files:

- `apps/web/src/lib/format.ts`
- `apps/web/src/components/ProductGridCard.tsx`
- `apps/web/src/screens/Detail.tsx`

## Relevant Files

### App shell / routing

- `apps/web/src/App.tsx`
- `apps/web/src/lib/types.ts`
- `apps/web/src/design-system.ts`
- `apps/web/src/components/BottomNav.tsx`
- `apps/web/src/components/Topbar.tsx`
- `apps/web/src/components/AppShellErrorBoundary.tsx`

### Main screens

- `apps/web/src/screens/AiFeed.tsx`
- `apps/web/src/screens/ShopPage.tsx`
- `apps/web/src/screens/AddProduct.tsx`
- `apps/web/src/screens/InboxPage.tsx`
- `apps/web/src/screens/NotificationsPage.tsx`
- `apps/web/src/screens/Profile.tsx`
- `apps/web/src/screens/ProfileEditPage.tsx`
- `apps/web/src/screens/SavedPage.tsx`
- `apps/web/src/screens/Detail.tsx`
- `apps/web/src/screens/OfferDetailPage.tsx`
- `apps/web/src/screens/ChatPage.tsx`
- `apps/web/src/screens/CampaignDetailPage.tsx`
- `apps/web/src/screens/WalletPage.tsx`

### Shared UI / journey components

- `apps/web/src/components/LoginCTA.tsx`
- `apps/web/src/components/AuthNudge.tsx`
- `apps/web/src/components/GuestAccessScreen.tsx`
- `apps/web/src/components/ContextEmptyState.tsx`
- `apps/web/src/components/TrustPanel.tsx`
- `apps/web/src/components/ProductGridCard.tsx`
- `apps/web/src/components/ProfileProductCard.tsx`
- `apps/web/src/components/Price.tsx`

### Sheets / modals

- `apps/web/src/sheets/AuthModal.tsx`
- `apps/web/src/sheets/SearchSheet.tsx`
- `apps/web/src/sheets/FilterSheet.tsx`
- `apps/web/src/sheets/OfferSheet.tsx`

### API / data / mock

- `apps/api/src/server.ts`
- `apps/api/src/db.ts`
- `apps/api/tests/api.test.ts`
- `scripts/qxwap-api-smoke.mjs`
- `scripts/qxwap-full-smoke.mjs`
- `scripts/qxwap-product-readiness-browser.mjs`
- `scripts/qxwap-product-readiness-loop.mjs`
- `scripts/qxwap-product-readiness-personas.mjs`

## Recommended Next Step After This Audit

Step 2 should start with route/journey correctness, not visual polish:

1. fix auth entry route behavior (`/login`, `/signin`, `/signup`)
2. decide whether wallet/credit is real now or should be hidden until complete
3. isolate mock/seed data from normal runtime boot
4. define real permission differences for user levels, or simplify the level system
5. decide whether QXwap is:
   - a listing-first marketplace with wanted hints
   - or a true have/want swap system with two-sided inventory

Until those are resolved, further UI polish will keep sitting on top of unclear product behavior.
