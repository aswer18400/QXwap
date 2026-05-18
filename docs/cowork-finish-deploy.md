# Cowork — Finish the QXwap Deploy

Paste this entire file into a fresh Cowork session. Cowork runs with browser
and (optionally) computer-use access, so it can do the last 4 steps that the
previous AI session (Supabase MCP only) could not.

---

## Context (read first, don't redo any of this)

Project root on user's Mac:
```
<repo-root>
```

GitHub: https://github.com/aswer18400/QXwap (reference; GitHub main is source of truth)

Latest handoff: `docs/ai-handoff-2026-05-15.md` — read that first if you need
the full background. **Do not** redo migrations, tests, security hardening,
or any of the file edits listed there. Everything backend / Supabase / docs
is done.

Live infrastructure that already exists:
- Frontend: `https://aswer18400.github.io/QXwap/` (deployed; `status.html`
  available at same path).
- Backend: `https://qxwap-api.onrender.com` — service id
  `srv-d7mfphu7r5hc73868seg`. Currently serving a stale runtime (returns
  `{"ok":true}` only on `/api/health` and 404 on `/api/version`).
- Supabase: project `cpradtvneftyeflwjvmx` (ap-south-1, Postgres 17.6,
  ACTIVE_HEALTHY). Schema migrated, RLS enabled, bucket `qxwap` exists.

## Your goal

Make `https://qxwap-api.onrender.com/api/health` return the new QXwap API
JSON (with `"name":"QXwap API"`, `"database":"connected"`, `"required_tables":18`)
and run the verification smoke tests.

## What you need to do

There are exactly **4 manual steps** the previous AI could not perform
because the Supabase MCP refuses to expose service-role keys (security
boundary). You can do them via the browser (Chrome MCP, computer-use, or
asking the user to paste).

### Step 1 — DATABASE_URL

Open in browser:
```
https://supabase.com/dashboard/project/cpradtvneftyeflwjvmx/settings/database
```

Find "Connection string" → URI tab → **Direct connection** (port 5432).

Copy the string. It looks like:
```
postgresql://postgres:[YOUR-DB-PASSWORD]@db.cpradtvneftyeflwjvmx.supabase.co:5432/postgres
```

Ask the user to replace `[YOUR-DB-PASSWORD]` with the real password from
their password manager. Append `?sslmode=require` if not already there.

### Step 2 — SUPABASE_SERVICE_ROLE_KEY

Open:
```
https://supabase.com/dashboard/project/cpradtvneftyeflwjvmx/settings/api
```

Find the "service_role" secret. Click "Reveal" then copy. It starts with
`eyJ…` (legacy JWT) or `sb_secret_…` (new format). The previous AI session
verified the project ref is `cpradtvneftyeflwjvmx` — the JWT's `ref` claim
should match.

**Never** put this key in a screenshot, frontend code, GitHub Pages variable,
or any committed file.

### Step 3 — Run the deploy helper

Open the user's terminal at the project root and run:

```bash
cd <repo-root>
pnpm deploy:now
```

The script (`scripts/qxwap-deploy-now.mjs`) will:

1. Prompt for `DATABASE_URL` (visible) — paste the value from Step 1.
2. Prompt for `SUPABASE_SERVICE_ROLE_KEY` (hidden) — paste the value from
   Step 2.
3. Generate a fresh `SESSION_SECRET` automatically.
4. Run `check:render-env` — fails fast on anon-vs-service-role swap, project
   ref mismatch, http origin, weak secret, missing sslmode. If it fails,
   fix and rerun.
5. Print the exact env-var block you must paste into Render.

When you see the prompt "Done pasting and triggered the deploy?", **do not
press Enter yet** — go to Step 4.

### Step 4 — Paste into Render and Manual Deploy

Open:
```
https://dashboard.render.com/web/srv-d7mfphu7r5hc73868seg
```

Go to **Settings** tab and confirm:
- Root Directory: blank or `.`
- Build Command: `corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile --prod=false && pnpm --filter @workspace/api-server build`
- Start Command: `pnpm --filter @workspace/api-server start`
- Health Check Path: `/api/health`

If any differ, update them and save.

Go to **Environment** tab. Paste these 8 values (the script in Step 3
printed the exact block):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `FRONTEND_ORIGIN` | `https://aswer18400.github.io` |
| `SUPABASE_URL` | `https://cpradtvneftyeflwjvmx.supabase.co` |
| `STORAGE_BUCKET` | `qxwap` |
| `SESSION_SECRET` | (the one the script generated) |
| `DATABASE_URL` | (Step 1 value) |
| `SUPABASE_SERVICE_ROLE_KEY` | (Step 2 value) |

Click **Manual Deploy → Clear build cache & deploy → Deploy latest commit**.

Go back to the terminal and press Enter on the script.

The script then polls `/api/health` and `/api/version` for up to 10 minutes
until the new runtime is live, prints commit SHA, runs `smoke:api` (basic
E2E), then runs `smoke:full` (two-session: owner gating + filters + profile
photo + offer → accept → shipment + notifications). Final output is one of:

- **🎉 Deploy verified** — done. Move to verification.
- **One of the smoke tests failed** — read the FAIL lines. Match against
  `docs/ops-runbook.md` §4 (common incidents). Common cause: a env value
  was pasted wrong.

## After 🎉

1. Open `https://aswer18400.github.io/QXwap/status.html` — both pills must
   be green (API health: OK, Build: <SHA>).
2. Open `https://aswer18400.github.io/QXwap/` in two browser sessions
   (Chrome normal + Chrome incognito) at 390px viewport. Run the
   click-through in `docs/ui-qa-checklist.md` — it has 27 steps across
   owner gating, search/filter, and profile photo persistence. `smoke:full`
   already covered the HTTP-level assertions, so this is just visual
   confirmation of the UI wires.
3. Edit `docs/manual-qa.md` and tick the relevant boxes. Edit
   `AI_START_HERE.md` and remove the "Render runtime still serving stub"
   line from the Current Status section.
4. `git add -A && git commit -m "ops: staging verified live" && git push`.

## Hard rules

- **Do not** rewrite the monorepo structure.
- **Do not** redo Supabase migrations — they are already applied (see
  `supabase/migrations/`).
- **Do not** edit production secrets into any committed file.
- **Do not** click "Reset database password" in Supabase unless the user
  explicitly asks — it cascades to several places.
- If a step is ambiguous, ask the user before guessing.

## Tools you likely need

- **Chrome MCP** (`mcp__claude-in-chrome__*`) — preferred for the Supabase
  and Render web pages. Ask the user to make sure the Claude in Chrome
  extension is connected and signed in.
- **Computer-use** (`mcp__computer-use__*`) — fallback. Render and Supabase
  are web apps so Chrome MCP is faster, but for Terminal you'll need
  computer-use or the bash tool. The user must have Screen Recording on for
  Chrome to be visible to computer-use, but Chrome MCP does not need that.
- **Bash** (`mcp__workspace__bash`) — for running the helper script
  non-interactively if you can populate the prompts via stdin redirection
  (e.g. `printf '%s\n%s\n' "$DATABASE_URL" "$SERVICE_KEY" | pnpm deploy:now`).
  Recommended only after Chrome MCP fails — running interactively is more
  predictable.

## Read-on-demand reference

- `AI_START_HERE.md` — entrypoint with current status + commands.
- `docs/ai-handoff-2026-05-15.md` — what changed last session.
- `docs/ops-runbook.md` — incident response when smoke fails.
- `docs/render-env-handoff.md` — env-var format reference.
- `docs/ui-qa-checklist.md` — browser QA steps after deploy.
- `supabase/migrations/README.md` — what each migration fixed.
