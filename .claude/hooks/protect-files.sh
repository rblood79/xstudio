#!/bin/bash
# PreToolUse Hook: 보호 파일 수정 차단
# Edit/Write 시 민감 파일 접근을 차단

set -euo pipefail

INPUT=$(cat)

# tool_input에서 file_path 추출
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# 보호 대상 패턴
PROTECTED_PATTERNS=(
  ".env"
  ".env.local"
  ".env.production"
  "credentials"
  "secret"
  ".claude/settings.json"
  ".claude/settings.local.json"
  "supabase/config.toml"
)

for PATTERN in "${PROTECTED_PATTERNS[@]}"; do
  if echo "$FILE_PATH" | grep -qi "$PATTERN"; then
    echo "보호 파일 수정 차단: $FILE_PATH" >&2
    echo "이 파일은 보안/설정 파일이므로 직접 수정이 금지됩니다. 사용자에게 확인을 요청하세요." >&2
    exit 2
  fi
done

exit 0
