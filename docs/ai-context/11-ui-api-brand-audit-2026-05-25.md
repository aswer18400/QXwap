# UI / API / Brand Audit - 2026-05-25

## Scope

- Local preview on `http://127.0.0.1:5174`
- API health on `http://127.0.0.1:8787/api/health`
- Guest, signed-in, and protected-route onboarding surfaces
- Primary journeys around `feed`, `shop`, `profile`, `add`, `inbox`, and `offer_detail`

## Reviewer Setup

This pass reused three reviewer tracks:

1. `UI Special Lead - Visual System`
   - Focus: brand consistency, shell cohesion, onboarding surfaces, splash quality
2. `UI Special Lead - Flow QA`
   - Focus: per-page interaction, button completion, routing continuity, protected actions
3. `UX/API Reliability Lead`
   - Focus: API completeness, health, startup behavior, DB risks, broken or incomplete states

## Key Findings

### Confirmed and addressed in this sprint

- Guest onboarding surfaces were visually fragmented.
  - `LoginCTA`, splash, and auth modal did not feel like one system.
- Splash screen looked like a placeholder rather than a product surface.
- Brand mark was too generic for the requested modern tech / space direction.
- Regression tests had drifted from the current UI labels and protected-flow behavior.
- Local browser QA showed the profile sign-out flow still worked, but automated coverage needed to be updated to current labels.

### Confirmed risks, not fully addressed in this sprint

- API startup and DB recovery remain a sensitive local-dev path.
  - This was stabilized in a prior sprint, but it remains a risk area worth regression coverage.
- Health and readiness checks are still fairly shallow.
- Some singleton-style API routes can still rely on nullable data conventions that deserve stronger invariants.
- Upload persistence still assumes a local/durable environment that should be reviewed before production hardening.

### Findings raised by reviewers but not reproduced on the current running branch

- Filter flow was reported as unclear or incomplete.
  - Current branch verification showed the `ดูผลลัพธ์` action working and routing back to `shop`.
- Sign-in / save inconsistencies were reported.
  - Current guest-state review found the login-gate messaging coherent enough for this sprint, but deeper parity work is still worth another pass.

## Changes Applied

### Brand and onboarding

- Reworked the brand mark into a more modern orbit / tech motif.
- Rebuilt splash into a branded animated loading surface.
- Rebuilt `LoginCTA` into infographic-style contextual cards.
- Upgraded auth modal with branded header and benefit chips.

### Reliability / QA

- Updated Playwright expectations to match current route labels and onboarding semantics.
- Re-ran browser QA on guest and signed-in profile/add/filter flows.
- Re-ran E2E on the `5174` preview base instead of the old default base.

## Files Touched

- `apps/web/src/components/BrandMark.tsx`
- `apps/web/src/components/LoginCTA.tsx`
- `apps/web/src/components/Skeletons.tsx`
- `apps/web/src/sheets/AuthModal.tsx`
- `apps/web/src/styles/auth.css`
- `apps/web/src/styles/form.css`
- `apps/web/src/styles/loading.css`
- `apps/web/src/styles/topbar.css`
- `tests/e2e/hardening-audit.spec.js`
- `tests/e2e/message-only-offer-detail.spec.js`

## Recommended Next Sprint

1. Add regression coverage for local API startup and readiness.
2. Add route context metadata to the shell error boundary so future render crashes are easier to triage.
3. Continue pixel pass on authenticated populated routes:
   - `own profile`
   - `inbox`
   - `offer_detail`
   - `chat`
4. Revisit upload durability and singleton/null API contracts before production hardening.
