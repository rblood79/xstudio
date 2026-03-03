#!/bin/bash
# Codex helper: format changed files with Prettier.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

FILES="$(git diff --name-only --diff-filter=ACMR 2>/dev/null || true)"
if [ -z "$FILES" ]; then
  FILES="$(git diff --name-only --cached --diff-filter=ACMR 2>/dev/null || true)"
fi

TARGETS="$(echo "$FILES" | grep -E '\.(ts|tsx|js|jsx|css|json|md)$' || true)"

if [ -z "$TARGETS" ]; then
  echo "[codex:format] 포맷 대상 없음"
  exit 0
fi

echo "[codex:format] prettier 실행"
if [ -x "./node_modules/.bin/prettier" ]; then
  # shellcheck disable=SC2086
  ./node_modules/.bin/prettier --write $TARGETS
  exit 0
fi

echo "[codex:format] 로컬 prettier 미설치 - 스킵"
