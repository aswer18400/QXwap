# Remote Deploy Triggers — Telegram, Discord, Slack, curl

After the one-time setup below, you can redeploy QXwap from anywhere:
a GitHub button, a Telegram message, a Discord slash command, a Slack
command, or a raw `curl` from any device with a GitHub Personal Access
Token. The workflow does the same thing every time:

1. POSTs to your Render Deploy Hook (Render rebuilds)
2. Waits up to 15 minutes for `/api/health` and `/api/version` to show
   the new runtime + the commit SHA from `main`
3. Runs `pnpm smoke:api` and `pnpm smoke:full` against the live API
4. (Optional) Pings Telegram/Discord with pass/fail

The workflow file is `.github/workflows/deploy-render.yml`. The first
deploy still requires you to set the env vars in the Render dashboard
manually once — see `docs/render-env-handoff.md`. After that, never again.

## One-time setup (5 minutes)

### 1. Render Deploy Hook
- Open `https://dashboard.render.com/web/srv-d7mfphu7r5hc73868seg`
- Settings → scroll to "Deploy Hook" → click "Generate"
- Copy the URL (looks like `https://api.render.com/deploy/srv-…?key=…`)

### 2. GitHub secret
- Open `https://github.com/aswer18400/QXwap/settings/secrets/actions`
- New repository secret:
  - Name: `RENDER_DEPLOY_HOOK_URL`
  - Value: paste the URL from step 1

That's the minimum. The rest is optional notifications.

### 3. Optional — Telegram bot

- Open Telegram, message [@BotFather](https://t.me/BotFather) → `/newbot`
- Pick a name and username → BotFather returns a token like `1234:ABC…`
- Get your chat id: message [@userinfobot](https://t.me/userinfobot) → it
  replies with your numeric ID
- In GitHub Secrets:
  - `TELEGRAM_BOT_TOKEN` = the BotFather token
  - `TELEGRAM_CHAT_ID` = your numeric ID (or a group ID, prefixed with `-`)

### 4. Optional — Discord webhook

- In your Discord server → channel settings → Integrations → Webhooks →
  New Webhook → copy URL
- In GitHub Secrets:
  - `DISCORD_WEBHOOK_URL` = the URL

## How to trigger

### From the GitHub Actions UI (no setup beyond §2)

`https://github.com/aswer18400/QXwap/actions/workflows/deploy-render.yml`
→ Run workflow → choose branch `main` → optional "reason" → Run.

### From a Personal Access Token (Telegram bot, mobile, anywhere)

Create a fine-grained PAT at `https://github.com/settings/personal-access-tokens/new`:
- Repository access: `aswer18400/QXwap`
- Repository permissions: **Actions: Read and write** (only this one)
- Expiration: as long as you want

Then to trigger:

```bash
curl -X POST \
  -H "Authorization: Bearer <PAT>" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/aswer18400/QXwap/actions/workflows/deploy-render.yml/dispatches" \
  -d '{"ref":"main","inputs":{"reason":"telegram /deploy"}}'
```

GitHub responds with `204 No Content` on success. The deploy starts within ~5 seconds.

### From a Telegram bot

The cleanest approach is to use [n8n](https://n8n.io) or [Pipedream](https://pipedream.com)
(both free tiers) to wire a Telegram bot → "on /deploy command" → HTTP
POST to GitHub. The HTTP body is the same as the `curl` above. No code
to deploy yourself.

If you prefer to host a bot yourself:

```python
# bot.py — minimal Telegram bot that triggers GitHub workflow_dispatch
# pip install python-telegram-bot httpx
import httpx
from telegram.ext import Application, CommandHandler

GITHUB_PAT = "<your fine-grained PAT>"
GITHUB_REPO = "aswer18400/QXwap"
WORKFLOW = "deploy-render.yml"

async def deploy(update, context):
    reason = " ".join(context.args) or "telegram /deploy"
    r = httpx.post(
        f"https://api.github.com/repos/{GITHUB_REPO}/actions/workflows/{WORKFLOW}/dispatches",
        headers={"Authorization": f"Bearer {GITHUB_PAT}", "Accept": "application/vnd.github+json"},
        json={"ref": "main", "inputs": {"reason": reason}},
        timeout=10,
    )
    await update.message.reply_text(f"Triggered (HTTP {r.status_code}). Logs: https://github.com/{GITHUB_REPO}/actions")

Application.builder().token("<bot token>").build().add_handler(CommandHandler("deploy", deploy)).run_polling()
```

Then chat with your bot: `/deploy hotfix for upload bug` → the workflow
runs and Telegram gets the pass/fail back via the workflow's `notify`
job.

### From Discord / Slack

Use a [Discord slash command + webhook proxy](https://github.com/discord/discord-interactions-js)
or Slack's [workflow builder](https://slack.com/help/articles/360035692513).
Both end the same way: an HTTP POST to the GitHub `dispatches` endpoint.

## How long does each deploy take

| Phase | Time |
|---|---|
| Workflow boot + pnpm install | 30-60s (cached) |
| Render build + image swap | 4-8 min |
| Wait for `/api/health` = QXwap runtime | usually within build time |
| `pnpm smoke:api` | ~10s |
| `pnpm smoke:full` | ~25s |
| Notify Telegram/Discord | ~1s |
| **Total** | typically 6-10 min, occasionally up to 15 |

The Render Free tier has a slower cold build. Bumping the service to
Starter / Standard plan cuts ~2-3 min off the build.

## Failure modes the workflow catches

| What broke | How you find out |
|---|---|
| Render service is down | Workflow times out at the `/api/health` step → ❌ in Telegram |
| Env vars on Render got wiped | `smoke:api` upload fails (Supabase env missing) → workflow ❌ |
| Database disconnected | `/api/health` reports `database != connected` → workflow ❌ |
| Schema drift (missing column/enum) | `smoke:full` step that exercises it returns 5xx → workflow ❌ |
| Wrong runtime running (build pointed at wrong package) | `/api/health.name != "QXwap API"` → workflow ❌ |
| 429 rate-limit regression | `smoke:full` "rate-limits" test would catch, but only when running locally with `FORCE_RATE_LIMIT=1`; production smoke is conservative on signup count |
| CORS / cookie regression | `smoke:full` cross-session profile step fails → workflow ❌ |

For every failure, the workflow log tells you which step failed and
links to `docs/ops-runbook.md` §4 for the fix.

## What is NOT covered

This workflow assumes Render env vars are already correct. If you ever
need to change an env var (DB password rotation, new Supabase key, etc.)
you still have to edit it in the Render dashboard — there is no Render
MCP and GitHub Secrets are not piped into Render automatically. You can
script that too via the Render API + a `RENDER_API_KEY` secret, but the
extra risk (a leaked PAT could rotate prod env) isn't worth it for a
solo project.
