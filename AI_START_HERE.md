# QXwap AI Start Here

## Canonical Rule (2026-05-18)

- GitHub `main` is the only source of truth.
- Local folders are temporary working copies only.
- Do not ask which local folder to use. Start from latest `origin/main`.
- If importing a local snapshot, do it on a new branch and Draft PR only.
- Do not force-push or delete `main` directly.

## Latest Status (2026-05-17 21:40 +07)

- Render API is live on the monorepo backend and now runs commit `d74c64d06af7c2edf6641885d9131a20444d0ea6`.
- PR #131 (`fix: restore session cookies behind Render proxy`) was merged and deployed to Render.
- Production auth cookie issue is fixed:
  - `POST https://qxwap-api.onrender.com/api/auth/signup` now returns `Set-Cookie: qxwap.sid=...; HttpOnly; Secure; SameSite=None`.
- PR #132 (`fix: make notification read query Supabase-safe`) was merged and deployed to Render.
- Production smoke passed:
  - `API_BASE_URL=https://qxwap-api.onrender.com/api pnpm smoke:api` -> passed.
  - Smoke created an item, uploaded an image to Supabase Storage, created an offer, and confirmed `required_tables: 18`.
  - Upload URL example returned by smoke: `https://cpradtvneftyeflwjvmx.supabase.co/storage/v1/object/public/qxwap/uploads/2026-05-17/23002c31-6270-48be-aa1c-5ce65e138e82.png`.
- Full production smoke passed:
  - `API_BASE_URL=https://qxwap-api.onrender.com/api node scripts/qxwap-full-smoke.mjs` -> 38 assertions, failed 0.
  - Covered health/version, signup sessions, owner/non-owner permissions, search/filter, Supabase image upload, profile photo persistence, no-item offer flow, shipment start, notifications mark-read, and owner delete cleanup.
- Verified production version:
  - `GET https://qxwap-api.onrender.com/api/version` -> commit `d74c64d06af7c2edf6641885d9131a20444d0ea6`, branch `main`.
- Frontend production API base verified:
  - `https://aswer18400.github.io/QXwap/` serves `window.API_BASE = "https://qxwap-api.onrender.com/api"`.
  - `API_BASE_URL=https://qxwap-api.onrender.com/api pnpm preflight:frontend --health` -> passed.
- Frontend production status page verified:
  - `https://aswer18400.github.io/QXwap/status.html` now returns HTTP 200.
- Frontend Feed auth overlay fix deployed:
  - Reduced/remodeled guest `AuthNudge` bottom layer so it no longer blurs the whole lower Feed.
  - PR #134 (`fix: reduce guest feed auth overlay`) was merged.
  - GitHub Pages updated to JS asset `/QXwap/assets/index-CW5vKK_8.js` and CSS asset `/QXwap/assets/index-BtNxxIXo.css`.
- Local-only frontend dev unblock in this folder:
  - Fixed stale local `AuthModal.tsx` broken imports for missing `Register/ForgotPassword/ResetPassword` screens by keeping signup/forgot states inline in the modal.
  - Removed stale local unused `onLogout` destructure from `Topbar.tsx`.
  - Local Feed loads seeded product cards at `http://localhost:5173/` when local API is running.
- Verification after local frontend fixes:
  - `pnpm run typecheck` -> passed.
  - `PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build` -> passed.
- Verification after latest production deploy:
  - `API_BASE_URL=https://qxwap-api.onrender.com/api pnpm smoke:api` -> passed.
  - `API_BASE_URL=https://qxwap-api.onrender.com/api pnpm preflight:frontend --health` -> passed.
  - `API_BASE_URL=https://qxwap-api.onrender.com/api node scripts/qxwap-full-smoke.mjs` -> 38 assertions, failed 0.
- Local note: this directory currently has no `.git` folder, so local `git status` returns `fatal: not a git repository`. Use GitHub main as source of truth for committed code. Local worktrees are temporary. Reclone from GitHub before making PRs.
- Next priority:
  - Continue mobile Feed UI/product-card fixes against the now-working production backend.
  - Decide whether to sync local-only docs/Figma/scripts/security changes into GitHub via small PRs.

## Recon (STEP 0) Results

### Stack Overview
- **Monorepo (pnpm workspace)** – root contains `apps/api` (Express TS backend) and `apps/web` (React Vite frontend).
- **Backend**: Node v20+, TypeScript, Express, Zod for validation, Supabase/Postgres (via `pg` & `@electric-sql/pglite` for local dev), sessions stored with `express-session`, file uploads with `multer`.
- **Frontend**: React 18, Vite, TypeScript, Tailwind‑based design system, custom `api.ts` helper with typed errors (`RateLimitError`, `ApiError`).
- **Package manager**: `pnpm@9.15.4` (upgrade notice available).
- **Deploy**: Render (API) using `render.yaml`; GitHub Pages hosts the static web build.
- **CI/Smoke**: Scripts in `package.json` (`typecheck`, `test`, `build`, `preflight:frontend/backend`, `smoke:*`, `deploy:now`).

### Available Scripts (root `package.json`)
- `pnpm install` – install all workspace deps.
- `pnpm typecheck` – runs `tsc --noEmit` for both API and web.
- `pnpm test` – runs Vitest tests in both packages (frontend has none, API has 14 tests).
- `pnpm build` – runs each workspace's `build` (API compiles to `dist`, web bundles via Vite).
- `pnpm preflight:frontend` / `pnpm preflight:backend` – health checks before deploy.
- `pnpm smoke:api`, `pnpm smoke:full` – end‑to‑end smoke against live Render API.
- `pnpm deploy:now` – interactive one‑click Render deploy (env‑var validation).
- `pnpm check:render-env` – validates required Render env vars.

### QA Gaps Identified
| Area | Current State | Gap |
|------|---------------|-----|
| **Auth UI** | Login page exists, but Register/Forgot/Reset routes not present. | Missing registration & password‑reset flows. |
| **Password Policy** | No explicit validation in API or UI. | Need policy & validation. |
| **Session Management** | Uses `express-session` with in‑memory store (dev). No logout endpoint, no token expiry handling. | Add logout & session expiry. |
| **2FA** | No UI/route. | Placeholder required. |
| **Security Headers** | Not configured in Express middleware. | Add CSP, HSTS, etc. |
| **API Error Format** | Errors thrown directly, inconsistent shape. | Standardise error response middleware. |
| **Rate Limiting / CORS** | Basic CORS via `cors` default (allows all). No rate‑limit middleware. | Implement rate limiting & restrictive CORS. |
| **API Docs** | None. | Add OpenAPI/Swagger doc. |
| **Database Docs** | Supabase migrations exist, but no human‑readable schema doc. | Create `docs/database-schema.md`. |
| **Responsive UI / Loading / Empty States** | Mostly functional, but missing loading spinners & empty placeholders for lists. | Add UI states. |
| **Error Pages / Accessibility / SEO** | No custom 404/500, limited meta tags, minimal a11y. | Add pages & meta. |
| **PWA** | No manifest/service worker. | Add manifest placeholder. |
| **Notifications UI** | Basic badge, but no center/CRUD. | Add notification center placeholder. |
| **Credit Display, Transaction History** | Backend endpoints exist, UI not present. | Add UI components (mock if needed). |
| **Testing Coverage** | API tests cover auth, rate‑limit, notifications. No frontend unit/integration tests. | Add unit tests (step 17) and integration tests (step 18). |

### Implementation Plan (incremental steps)
1. **STEP 1 – Auth Pages** – create Register, Forgot Password, Reset Password routes + UI links.
2. **STEP 2 – Password Policy** – add Zod schema & UI validation.
3. **STEP 3 – Session Management** – logout endpoint, session expiry, protect routes.
4. **STEP 4 – 2FA Foundation** – placeholder UI/route with docs.
5. **STEP 5 – Security Headers** – Express middleware for CSP, HSTS, etc.
6. **STEP 6 – API Error Handling** – unified error middleware + validation.
7. **STEP 7 – Rate Limiting & CORS** – add `express-rate-limit` and restrictive CORS config.
8. **STEP 8 – API Docs** – generate OpenAPI spec (e.g., `swagger-jsdoc`).
9. **STEP 9 – DB Docs** – write `docs/database-schema.md` & backup/recovery guide.
10. **STEP 10 – Responsive UI + Loading/Empty States** – add spinners & empty placeholders.
11. **STEP 11 – Error Pages, Accessibility, SEO** – custom 404/500, meta tags, a11y fixes.
12. **STEP 12 – PWA Foundation** – add `manifest.json` (service worker TODO).
13. **STEP 13 – Dashboard & Xwap UI** – build post‑login dashboard.
14. **STEP 14 – Credit Display** – show credit balance.
15. **STEP 15 – Transaction History** – component/page.
16. **STEP 16 – Notifications UI** – center placeholder.
17. **STEP 17 – Unit Tests** – add tests for new utils.
18. **STEP 18 – Integration Tests** – full auth/health flow.
19. **STEP 19 – Performance & Security Docs** – docs & audit scripts.
20. **STEP 20 – Final QA** – run full lint/test/build, update checklist.

Each step will:
- Update relevant files.
- Run `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Commit with message `step‑X‑<description>`.
- Update this `AI_START_HERE.md` with new status.

---

**Next Action:** Proceed to STEP 1 – implement authentication pages and routing.
