## AI Memory Workflow

Before starting work every time:

1. Read `data/hot-cache.md` first to understand the latest project state.
2. If older context is needed from previous sessions, run:

```bash
python3 session-store.py search "keyword"
```

3. After meaningful progress, update `data/hot-cache.md` with the latest branch, PR, blockers, and next sprint.

```bash
python3 session-store.py append "short sprint note"
python3 session-store.py snapshot --branch "branch-name" --pr "draft-pr-link" --focus "what changed" --blocker "current blocker" --next "next sprint"
```

4. Do not store secrets, cookies, tokens, or credentials in memory files.
