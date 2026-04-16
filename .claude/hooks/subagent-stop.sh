#!/usr/bin/env bash
# SubagentStop hook — 서브에이전트 종료 시 결과를 JSONL로 기록
# 주간 리포트(weekly-report.sh) / INDEX.md 자동 갱신이 이 로그를 집계함
#
# 2.1.x payload 구조 (실측):
#   .agent_type          — e.g. "Explore", "implementer", "reviewer"
#   .agent_id            — 고유 ID
#   .session_id
#   .last_assistant_message
#   .hook_event_name     — "SubagentStop"
set -euo pipefail

payload=$(cat)
log_dir="$CLAUDE_PROJECT_DIR/.claude/stats"
mkdir -p "$log_dir"
log_file="$log_dir/agents.jsonl"

ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if command -v jq >/dev/null 2>&1; then
  agent_type=$(echo "$payload" | jq -r '.agent_type // "unknown"' 2>/dev/null || echo "unknown")
  agent_id=$(echo "$payload" | jq -r '.agent_id // empty' 2>/dev/null || echo "")
  session_id=$(echo "$payload" | jq -r '.session_id // empty' 2>/dev/null || echo "")
  # 한 줄 JSON
  jq -cn --arg ts "$ts" --arg at "$agent_type" --arg aid "$agent_id" --arg sid "$session_id" \
    '{ts:$ts, agent_type:$at, agent_id:$aid, session_id:$sid}' >> "$log_file"
else
  echo "{\"ts\":\"$ts\",\"raw\":$(echo "$payload" | sed 's/"/\\"/g; s/^/"/; s/$/"/')}" >> "$log_file"
fi

exit 0
