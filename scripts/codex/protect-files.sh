#!/bin/bash
# Codex preflight: block edits to sensitive files unless explicitly approved.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [ "$#" -gt 0 ]; then
  FILES="$(printf '%s\n' "$@")"
else
  FILES="$(git diff --name-only --cached --diff-filter=ACMR 2>/dev/null || true)"
  if [ -z "$FILES" ]; then
    FILES="$(git diff --name-only --diff-filter=ACMR 2>/dev/null || true)"
  fi
fi

if [ -z "$FILES" ]; then
  echo "[codex:guard] 변경 파일 없음"
  exit 0
fi

PROTECTED_PATTERNS=(
  "^\\.env$"
  "^\\.env\\..+"
  "credentials"
  "secret"
  "^supabase/config\\.toml$"
  "^\\.claude/settings\\.json$"
  "^\\.claude/settings\\.local\\.json$"
)

BLOCKED_FILES=()
while IFS= read -r file; do
  [ -z "$file" ] && continue
  for pattern in "${PROTECTED_PATTERNS[@]}"; do
    if echo "$file" | grep -Eiq "$pattern"; then
      BLOCKED_FILES+=("$file")
      break
    fi
  done
done <<< "$FILES"

if [ "${#BLOCKED_FILES[@]}" -gt 0 ]; then
  echo "[codex:guard] 보호 파일 변경이 감지되어 중단합니다:"
  printf ' - %s\n' "${BLOCKED_FILES[@]}"
  echo "필요 시 사용자 승인 후 진행하세요."
  exit 2
fi

echo "[codex:guard] 통과"
