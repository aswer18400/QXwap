# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## OpenClaw Background Coding Agent

Use Telegram as a compact command surface, not a GUI.

Main helper:

```bash
~/.openclaw/scripts/openclaw-background-agent.mjs status
~/.openclaw/scripts/openclaw-background-agent.mjs project QXwap
~/.openclaw/scripts/openclaw-background-agent.mjs enqueue "index codebase แล้วสรุป architecture"
~/.openclaw/scripts/openclaw-background-agent.mjs next
~/.openclaw/scripts/openclaw-background-agent.mjs start
~/.openclaw/scripts/openclaw-background-agent.mjs telegram-refresh
```

Capabilities expected from the bot:

- Project Workspace: remember the active project and keep work scoped to it.
- Codebase Indexer: map structure, important files, routes, APIs, tests, and known risks.
- File Editor: make narrow patches and summarize diffs.
- Terminal Runner: run tests/build/lint/checks and summarize output.
- Browser Agent: inspect UI flows when a web target exists.
- Git/GitHub: use `gh auth status`; never request a PAT; ask before push/merge/delete.

Telegram menu behavior:

- Keep a compact bottom reply keyboard for `status`, `next`, and `⚙️ Menu`.
- Configure Telegram's native command menu (`setMyCommands` + `setChatMenuButton`) as the popup selector.
- Do not print large menu lists in chat.
- Do not send inline menu blocks unless the user explicitly asks for chat buttons.

Do not create Telegram buttons per project. Do not require Mini App GUI for normal coding work.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

## Related

- [Agent workspace](/concepts/agent-workspace)
