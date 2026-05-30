# ROUTE FLOW PLAN

Date: 2026-05-30  
Scope: Planning only. No routing implementation in this round.

## Goal

Define a route and journey structure that matches the product users are actually trying to use:

- browse feed
- browse shop
- post item
- post wanted item
- follow users
- save items
- propose swaps
- manage deals
- chat
- complete swaps
- earn credit
- redeem system items

## Route Principles

1. each major journey gets a real route
2. login/signup routes must be direct-entry safe
3. credits/redeem must be real routes if visible in UI
4. wanted posts must not be hidden as a sub-field of item posting forever
5. deal detail and chat remain tied to swap context

## Proposed Route Map

### Public / guest-safe

- `/`
  - home feed
- `/shop`
  - browse all active item listings
- `/wanted`
  - browse wanted posts
- `/search`
  - search hub
- `/search/items`
  - item results
- `/search/wanted`
  - wanted results
- `/search/users`
  - user/store results
- `/campaigns/:slug`
  - campaign detail
- `/items/:itemId`
  - item detail
- `/wanted/:wantedId`
  - wanted detail
- `/users/:username`
  - public profile/store
- `/login`
  - sign in
- `/signup`
  - sign up

### Authenticated core

- `/me`
  - own profile home
- `/me/edit`
  - profile edit
- `/me/listings`
  - own item listings
- `/me/wanted`
  - own wanted posts
- `/me/saved`
  - saved items
- `/me/following`
  - following management
- `/items/new`
  - post item
- `/wanted/new`
  - post wanted item
- `/items/:itemId/edit`
  - edit item
- `/wanted/:wantedId/edit`
  - edit wanted post
- `/deals`
  - deal management center
- `/deals/:dealId`
  - deal detail
- `/chat/:conversationId`
  - chat
- `/notifications`
  - notifications center
- `/credits`
  - wallet / earned credits
- `/redeem`
  - system reward catalog
- `/redeem/:rewardId`
  - reward detail / redemption

## Current Routes That Should Be Refactored

### 1. Query-param view router

Current pattern:

- `/?view=shop`
- `/?view=add`
- `/?view=inbox`
- `/?view=profile`
- `/?item=:id`
- `/?offer=:id`

Plan:

- move to path-based routes over time
- keep compatibility redirect layer during migration

### 2. Auth route handling

Current problem:

- `/login` does not reliably behave like login entry

Plan:

- direct path route must always produce auth entry

### 3. Wallet route

Current problem:

- route exists conceptually but is coerced back to profile

Plan:

- if credits stay in MVP, `/credits` must be real
- if not, remove it from visible user journey until complete

## Main User Flows In The New Architecture

## Flow 1: Browse feed

Route path:

- `/`

Expected path:

- open feed
- browse recommended listings
- open item or user
- save/follow from supporting entry points

## Flow 2: Post item

Route path:

- `/items/new`

Expected path:

- choose listing type = have item
- fill listing form
- submit
- see preview/confirmation
- land in own listing detail or own listings page

## Flow 3: Post wanted item

Route path:

- `/wanted/new`

Expected path:

- choose listing type = wanted
- define wanted category/tags/description/budget
- submit
- appear in wanted feed and own wanted list

## Flow 4: Follow user

Route paths:

- `/users/:username`
- `/me/following`
- `/shop?source=following` or `/following`

Expected path:

- follow from public profile
- see followed sellers in dedicated following area

## Flow 5: Save item

Route paths:

- `/items/:itemId`
- `/me/saved`

Expected path:

- save from feed/shop/detail
- review saved items later

## Flow 6: Propose swap

Route path:

- `/items/:itemId`
- modal/sheet or sub-route from detail

Expected path:

- open target item
- choose own item(s) and cash/credit adjustment
- send proposal
- move into deal detail/chat

## Flow 7: Accept / reject swap

Route path:

- `/deals/:dealId`

Expected path:

- review target, offer bundle, cash/credit difference
- accept or reject
- update notifications and deal board

## Flow 8: Complete swap

Route path:

- `/deals/:dealId`

Expected path:

- schedule handoff
- upload proof if required
- confirm receipt
- mark deal completed
- award credits if eligible

## Flow 9: Earn credit

Route path:

- `/credits`

Expected path:

- user completes swap
- credit transaction is written
- balance and history update

## Flow 10: Redeem system item

Route paths:

- `/redeem`
- `/redeem/:rewardId`

Expected path:

- browse reward/system items
- view cost and trust requirements
- redeem using credit
- create redemption record

## Flows That Must Be Fixed First

### Priority 1

- auth entry
- credits route truthfulness
- item post flow completion
- deal state correctness

### Priority 2

- wanted post as first-class flow
- following as a distinct user journey
- saved/follow/profile consistency

### Priority 3

- reward redemption journey
- advanced level-based gating

## What Will Be Removed

Planning only:

- dependency on query-only route state as the long-term navigation model
- hidden/implicit navigation to concepts that do not have real routes

## What Will Be Combined

- inbox + offer status tracking + “deal management center” under `/deals`
- feed + shop browsing under clearer path semantics
- profile + own activity hub under `/me`

## Route-Specific Risks

- deep links may break during migration if redirects are not planned
- current browser/session restore logic may conflict with a real router
- offer detail and chat must keep old links working temporarily
- wanted and item detail cannot be visually identical forever if the business object differs

## Suggested Redirect / Compatibility Layer

During migration:

- `/?view=shop` -> `/shop`
- `/?view=add` -> `/items/new`
- `/?view=inbox` -> `/deals`
- `/?view=profile` -> `/me`
- `/?view=profile_edit` -> `/me/edit`
- `/?view=saved` -> `/me/saved`
- `/?view=notifications` -> `/notifications`
- `/?item=:id` -> `/items/:id`
- `/?offer=:id` -> `/deals/:id`

## Implement Order

1. define final route map
2. make auth routes deterministic
3. make credits route honest
4. split item vs wanted creation routes
5. consolidate deal routes
6. migrate deep links and compatibility redirects
