# COMPONENT AUDIT

Date: 2026-05-30  
Scope: Planning only. No UI implementation in this round.

## Goal

Keep QXwap component-based, but avoid:

- duplicated business surfaces
- too many tiny wrappers
- route-specific one-off patterns for the same job

## Component Strategy

The project should move to:

- a small set of route screens
- a moderate set of reusable structural components
- a very small set of reusable business components

Rule of thumb:

- split only when reused or when the screen file becomes unstable
- do not split purely for abstraction aesthetics

## Components That Should Stay As Major Reusable Building Blocks

### Shell / layout

- `PageHeader`
- `BottomNav`
- `Topbar`
- `AppShellErrorBoundary`
- skeleton components

Reason:

- these are true cross-route building blocks

## Components That Should Be Standardized

### 1. Access-gate family

Current files:

- `LoginCTA.tsx`
- `AuthNudge.tsx`
- `GuestAccessScreen.tsx`

Plan:

- keep one content contract
- one full-screen access-gate surface
- one floating dock variant
- one auth modal entry

Target conceptual model:

- `AccessGateContent`
- `AccessGateScreen`
- `AccessGateDock`

What will be refactored:

- prompt wording and CTA config flow

What will be combined:

- duplicated guest/login prompting logic

## 2. Listing card family

Current files:

- `ProductGridCard.tsx`
- `ProfileProductCard.tsx`

Plan:

- combine around one base listing card model
- keep visual variants for:
  - feed/shop grid
  - profile compact
  - related item

Target conceptual model:

- `ListingCard`
  - `variant = grid | compact | related`

What will be removed:

- duplicated per-card business formatting where possible

## 3. Empty / error / status state family

Current state:

- `ContextEmptyState.tsx` exists
- many screens still use inline `.empty`, `.empty-inline`, `.err`

Plan:

- use one consistent state language family:
  - empty
  - loading
  - error
  - success
  - blocked/restricted

Target conceptual model:

- `StateCard`
  - `kind = empty | error | success | info | blocked`

What will be combined:

- route-specific empty/error one-offs

## 4. Trust / reputation family

Current state:

- `TrustPanel.tsx`
- inline trust panels in profile
- inline owner card trust in detail

Plan:

- keep one trust summary contract
- reuse in:
  - profile
  - owner card
  - deal screens

Target conceptual model:

- `TrustSummary`
- `ReputationBadgeRow`
- `OwnerSummaryCard`

What will be refactored:

- trust indicators and reputation copy

## 5. Deal management family

Current state:

- inbox/deal center
- offer detail
- chat

Plan:

- reuse a common deal summary model
- do not build separate status wording rules in every screen

Target conceptual model:

- `DealStatusPill`
- `DealSummaryCard`
- `DealNextActionCard`

## Components That Should Not Be Over-Split

These should remain mostly route-level screens with sections inside them:

- `AddProduct.tsx`
- `OfferDetailPage.tsx`
- `Profile.tsx`
- `Detail.tsx`

Reason:

- they are orchestration-heavy screens
- breaking them into many tiny files too early will increase coordination cost

Allowed internal split later:

- shared section blocks only if reused elsewhere

## What Will Be Refactored

- access gate components
- listing card duplication
- trust/reputation duplication
- state card inconsistency
- route-local business formatting that belongs in shared helpers

## What Will Be Removed

Planning only:

- duplicated business presentation logic across multiple cards/screens
- one-off route wrappers that exist only because shared components are inconsistent

Examples:

- repeated guest-prompt variants with separate wording logic
- repeated trust pill generation per screen
- repeated status copy for deals/offers where one shared mapping should exist

## What Will Be Combined

### Combine into one shared business component family

- guest/login prompt system
- listing cards
- trust/reputation blocks
- state cards
- deal status/summary blocks

## Components That Should Be Reused Across New Architecture

### Must reuse

- `PageHeader`
- `BottomNav`
- `Topbar`
- `ContextEmptyState` as the basis of the final state system
- skeletons

### Reuse with redesign of API/props

- `ProductGridCard`
- `ProfileProductCard`
- `LoginCTA`
- `AuthNudge`
- `GuestAccessScreen`
- `TrustPanel`

## Components Likely To Be Deprecated Later

Conceptually deprecated, not deleted in this round:

- separate guest prompt components with overlapping roles
- profile-only product card if base listing card variant replaces it
- trust-specific one-off blocks embedded directly in route screens

## Risks Of Component Refactor

- over-abstraction can slow product iteration
- over-sharing card components can force unnatural props
- splitting large route files too early can hide business logic instead of clarifying it
- under-sharing will keep copy/status inconsistency alive

## Recommended Component Refactor Order

1. access gate family
2. state card family
3. listing card family
4. trust/reputation family
5. deal summary family

## Principle For MVP

Use fewer, stronger components.

Preferred pattern:

- one route screen
- one or two section blocks
- one shared card/state component

Avoid:

- five tiny wrapper components for one section
