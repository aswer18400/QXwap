# ARCHITECTURE PLAN

Date: 2026-05-30  
Scope: Step 2 planning only. No implementation in this round.

## Goal

Rebuild QXwap around a clean marketplace architecture where:

1. frontend never ships business mock data
2. mock/demo data lives only in database seed and test fixtures
3. frontend reads data only through a service / API layer
4. UI remains component-based, but not fragmented into too many tiny components
5. the core product supports both:
   - item listings (`ของที่มี`)
   - wanted listings (`ของที่อยากได้`)

## Target Architecture

### 1. Frontend Layers

#### A. App Shell Layer

Responsibilities:

- global route handling
- auth state
- session recovery
- top-level loading/error boundary
- mobile shell, topbar, bottom nav

Files likely involved later:

- `apps/web/src/App.tsx`
- `apps/web/src/components/AppShellErrorBoundary.tsx`
- `apps/web/src/components/BottomNav.tsx`
- `apps/web/src/components/Topbar.tsx`

Plan:

- keep a single app shell
- reduce business logic inside `App.tsx`
- move data fetching and route-specific orchestration into feature services

#### B. Feature Screen Layer

Responsibilities:

- render route-level screens
- call feature services/hooks
- map state to UI

Feature groups:

- feed
- shop/search/filter
- add/edit listing
- wanted listing
- detail
- deals
- chat
- notifications
- profile
- credits/redeem

Plan:

- keep route screens as the main composition unit
- do not split every section into separate components unless the same section is reused

#### C. Shared UI Layer

Responsibilities:

- reusable layout and interaction components
- cards
- empty/loading/error states
- guest/login access surfaces
- page header / modal / tabs / trust blocks

Plan:

- reuse shared components where behavior is stable across screens
- avoid “micro-component sprawl”
- prefer one base component with variants over many near-duplicates

#### D. Service / API Layer

Responsibilities:

- frontend-side domain access
- API request composition
- route-independent data transforms
- response normalization
- local caching strategy if needed later

Plan:

- every business domain gets a small service module
- screens should call services, not raw endpoint strings
- services should depend on the low-level API client, not on UI

#### E. Backend Domain Layer

Responsibilities:

- business rules
- seed/runtime separation
- permission checks
- state transitions
- wallet/credit logic

Plan:

- keep Express entry file thin
- gradually move business logic out of route handlers into domain modules

## Recommended Frontend Module Structure

Target structure, not implementation yet:

```text
apps/web/src/
  app/
    router/
    shell/
    session/
  features/
    auth/
    feed/
    listings/
    wanted/
    search/
    follows/
    bookmarks/
    deals/
    chat/
    notifications/
    profile/
    wallet/
    rewards/
  services/
    apiClient.ts
    authService.ts
    feedService.ts
    listingService.ts
    wantedService.ts
    socialService.ts
    dealService.ts
    chatService.ts
    walletService.ts
    rewardService.ts
    profileService.ts
  components/
    shell/
    cards/
    states/
    forms/
    auth/
```

## What Will Be Refactored

### Frontend

- `App.tsx`
  - reduce route orchestration and data orchestration in one file
- screen files that call `api(...)` directly
  - move business fetches to services
- auth route handling
  - make `/login`, `/signin`, `/signup` deterministic
- wallet route
  - stop coercing wallet to profile
- product feed heuristics now living in frontend formatting helpers
  - move recommendation/trust data ownership to backend response or dedicated service logic

### Backend

- large route handlers in `apps/api/src/server.ts`
- seed/runtime mixing inside `apps/api/src/db.ts`
- offer/deal/shipment/credit logic that currently sits too close to HTTP

## What Will Be Removed

Planned removal only, not in this round:

### From frontend runtime

- business mock content hardcoded in UI code
- direct endpoint strings scattered across route screens
- route coercion that hides `wallet`
- frontend-only fake recommendation/trust outputs where backend should own the truth

### Specific candidates

- `wantedImage()` hardcoded business content fallback behavior in `apps/web/src/lib/format.ts`
- `recommendationScore()` and `matchReason()` as product-ranking truth in frontend
- route behavior that rewrites `wallet` to `profile` in `apps/web/src/App.tsx`

## What Will Be Combined

### Access / guest prompts

Combine conceptually into one access-gate system:

- `LoginCTA.tsx`
- `AuthNudge.tsx`
- `GuestAccessScreen.tsx`

Not necessarily one file, but one shared API and content contract.

### Empty / error / success messaging

Standardize around one state system:

- `ContextEmptyState.tsx`
- inline `.empty`, `.err`, and ad hoc empty cards

### Listing card family

Unify card model between:

- `ProductGridCard.tsx`
- `ProfileProductCard.tsx`

Target:

- one base listing card with route-specific variants

### Trust / reputation surfaces

Unify conceptually:

- `TrustPanel.tsx`
- profile trust blocks
- detail owner trust card

## Service Modules That Should Be Created

Planning only. No creation in this round.

### Core services

- `authService`
  - sign in
  - sign up
  - sign out
  - current session
- `feedService`
  - home feed
  - following feed
  - banner/campaign feed surfaces
- `listingService`
  - list items
  - item detail
  - create item
  - update item
  - delete item
- `wantedService`
  - create wanted listing
  - update wanted listing
  - browse wanted listings
- `socialService`
  - follow / unfollow
  - followed users
  - saved/bookmarked items
- `dealService`
  - create offer
  - accept / reject / approve / cancel
  - shipment/logistics
  - complete swap
- `chatService`
  - load conversations
  - load messages
  - send messages
- `walletService`
  - wallet balance
  - transactions
  - earned credit
  - spend credit
- `rewardService`
  - redeemable system items
  - redeem flow
- `profileService`
  - own profile
  - public profile
  - profile update
  - activity feed
- `notificationService`
  - list notifications
  - mark read

## User Journey Coverage In The New Architecture

The new architecture must support these flows as first-class product paths:

1. browse feed
2. post item
3. post wanted item
4. follow user
5. save item
6. chat
7. propose swap
8. accept / reject swap
9. complete swap
10. earn credit
11. use credit to redeem system items

## User Level Model For MVP

No KYC in first MVP.

### Proposed levels

- `Level 0: guest`
  - browse only
- `Level 1: member`
  - sign in, follow, save, chat, create listing, create wanted listing
- `Level 2: active trader`
  - has created listing or completed onboarding, can propose swap
- `Level 3: trusted trader`
  - earned through completed swaps / dispute-free behavior, can use more trust surfaces and unlock credit redemption
- `Level 4: restricted`
  - view only, cannot propose swap or transact

### Principle

- levels must change real behavior, not just wording
- level advancement should be behavior-driven in MVP
- KYC can be introduced later as a trust enhancer, not as a first blocker

## Risks Of This Refactor

### Product risks

- route migration may break deep links
- switching from one item-only model to item + wanted model may confuse existing flows if not staged carefully
- credit logic can become misleading if UI is enabled before business rules are stable

### Engineering risks

- `App.tsx` is a large integration hotspot; careless extraction can break multiple journeys at once
- direct `api(...)` calls are spread through many screens
- route-state and query-state restoration behavior is tightly coupled today
- seed removal without environment strategy can make local QA harder

### Delivery risks

- too much component fragmentation will slow the team
- too much backend restructuring at once will delay route correctness
- swapping to a new model without a migration plan can invalidate old test/smoke scripts

## Recommended Implementation Order

### Phase 1: Route and auth correctness

- fix direct auth routes
- restore wallet route truthfully
- define final route map

### Phase 2: Service layer extraction

- add frontend service layer
- stop screen-level raw endpoint strings
- keep UI unchanged while moving data access

### Phase 3: Data model split

- separate user item listing from wanted listing
- keep feed and detail backward-compatible during transition

### Phase 4: Deal domain cleanup

- normalize offer/deal/shipment states
- add explicit expiry/rejection/cancel reasoning rules

### Phase 5: Credit and reward domain

- separate earned credit from redeemed system items
- add system catalog / reward redeem flows

### Phase 6: Trust/level activation

- connect level to actual capability differences
- unify reputation and trust output

## Recommended First Work After Planning

The first real implementation step should be:

1. fix route correctness
2. create service-layer seams
3. isolate runtime seed behavior

Do not start with visual refactors.
