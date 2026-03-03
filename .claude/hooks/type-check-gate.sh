#!/bin/bash
# Stop Hook: Type Check Gate
# agent가 응답 완료 시 자동으로 pnpm type-check 실행
# 실패 시 exit 2로 agent에게 피드백

set -euo pipefail

INPUT=$(cat)

# Stop hook 재진입 방지 (무한 루프 차단)
STOP_HOOK_ACTIVE="${STOP_HOOK_ACTIVE:-false}"
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  exit 0
fi

# 프로젝트 디렉토리로 이동
cd "${CLAUDE_PROJECT_DIR:-.}"

# .ts/.tsx 파일이 변경되었는지 확인 (git diff로 판별)
CHANGED_TS=$(git diff --name-only HEAD 2>/dev/null | grep -E '\.(ts|tsx)$' || true)

if [ -z "$CHANGED_TS" ]; then
  # TypeScript 파일 변경 없으면 스킵
  exit 0
fi

# type-check 실행
export STOP_HOOK_ACTIVE=true
TYPE_CHECK_OUTPUT=$(pnpm type-check 2>&1) || {
  EXIT_CODE=$?
  # 마지막 30줄만 피드백
  echo "type-check 실패. 아래 에러를 수정하세요:" >&2
  echo "$TYPE_CHECK_OUTPUT" | tail -30 >&2
  exit 2
}

exit 0
