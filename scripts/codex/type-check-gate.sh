#!/bin/bash
# Codex gate: run type-check only when TS files changed.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

CHANGED_TS="$(git diff --name-only --diff-filter=ACMR 2>/dev/null | grep -E '\.(ts|tsx)$' || true)"
if [ -z "$CHANGED_TS" ]; then
  CHANGED_TS="$(git diff --name-only --cached --diff-filter=ACMR 2>/dev/null | grep -E '\.(ts|tsx)$' || true)"
fi

if [ -z "$CHANGED_TS" ]; then
  echo "[codex:typecheck] TS 변경 없음 - 스킵"
  exit 0
fi

echo "[codex:typecheck] TS 변경 감지 - pnpm type-check 실행"
pnpm type-check
