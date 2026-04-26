#!/usr/bin/env bash
set -euo pipefail

TARGET_BRANCH="${1:-origin/main}"

echo "[1/4] Fetching target branch: ${TARGET_BRANCH}"
git fetch origin "${TARGET_BRANCH#origin/}" --depth=200

BASE_COMMIT="$(git merge-base HEAD "${TARGET_BRANCH}")"
echo "merge-base: ${BASE_COMMIT}"

echo "[2/4] Checking merge conflicts (without modifying branch)"
if git merge-tree "${BASE_COMMIT}" HEAD "${TARGET_BRANCH}" | grep -q "^<<<<<<< "; then
  echo "❌ Merge conflict detected against ${TARGET_BRANCH}"
  exit 2
fi
echo "✅ No merge conflict detected against ${TARGET_BRANCH}"

echo "[3/4] Running backend checks"
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server test

echo "[4/4] Running frontend checks"
pnpm --filter @workspace/web-app run typecheck
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/web-app run build

echo "✅ Preflight passed"
