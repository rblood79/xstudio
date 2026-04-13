#!/usr/bin/env bash
# SubagentStop hook — 서브에이전트 종료 시 결과를 JSONL로 기록
# 주간 리포트(weekly-report.sh)가 이 로그를 집계함
set -euo pipefail

payload=$(cat)
log_dir="$CLAUDE_PROJECT_DIR/.claude/stats"
mkdir -p "$log_dir"
log_file="$log_dir/agents.jsonl"

ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# jq가 있으면 구조화된 추출, 없으면 raw payload 저장
if command -v jq >/dev/null 2>&1; then
  subagent_type=$(echo "$payload" | jq -r '.subagent_type // "unknown"' 2>/dev/null || echo "unknown")
  session_id=$(echo "$payload" | jq -r '.session_id // empty' 2>/dev/null || echo "")
  stop_reason=$(echo "$payload" | jq -r '.stop_reason // empty' 2>/dev/null || echo "")
  echo "{\"ts\":\"$ts\",\"subagent_type\":\"$subagent_type\",\"session_id\":\"$session_id\",\"stop_reason\":\"$stop_reason\"}" >> "$log_file"
else
  echo "{\"ts\":\"$ts\",\"raw\":$(echo "$payload" | sed 's/"/\\"/g; s/^/"/; s/$/"/')}" >> "$log_file"
fi

exit 0
