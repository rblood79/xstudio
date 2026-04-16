#!/bin/bash
# Stop Hook: Type Check Gate
# agent가 응답 완료 시 자동으로 pnpm type-check 실행
# 2.1.x JSON 응답 형식: {"decision":"block","reason":"..."} 사용 (exit 0 with JSON)
set -euo pipefail

INPUT=$(cat)

# 재진입 방지
STOP_HOOK_ACTIVE="${STOP_HOOK_ACTIVE:-false}"
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# .ts/.tsx 변경 감지
CHANGED_TS=$(git diff --name-only HEAD 2>/dev/null | grep -E '\.(ts|tsx)$' || true)
if [ -z "$CHANGED_TS" ]; then
  exit 0
fi

# type-check 실행
export STOP_HOOK_ACTIVE=true
if ! TYPE_CHECK_OUTPUT=$(pnpm type-check 2>&1); then
  # 실패 시 JSON decision:block
  # jq로 reason 안전하게 JSON-encode
  REASON_TEXT="type-check 실패. 아래 에러를 수정하세요:

$(echo "$TYPE_CHECK_OUTPUT" | tail -30)"

  if command -v jq >/dev/null 2>&1; then
    jq -n --arg r "$REASON_TEXT" '{decision: "block", reason: $r}'
  else
    # jq 없을 때 fallback: exit 2 + stderr (기존 동작)
    echo "$REASON_TEXT" >&2
    exit 2
  fi
  exit 0
fi

exit 0
