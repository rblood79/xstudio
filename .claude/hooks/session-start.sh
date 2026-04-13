#!/usr/bin/env bash
# SessionStart hook — 세션 시작 시 composition 전용 agent/skill 로스터 및 권장 워크플로 주입
set -euo pipefail

cat <<'EOF'
<composition-workflow-roster>
# composition 전용 워크플로 (자동 주입 — SessionStart)

## 핵심 Skills (자연어 발동 + `/` 호출 모두 가능)
- `composition-patterns` — 코드 규칙/패턴 (코드 작업 전 확인)
- `cross-check` — CSS↔Skia 렌더링 정합성 (렌더링 수정 후 필수)
- `parallel-verify` — 컴포넌트 패밀리 일괄 검증
- `component-design` — 새 컴포넌트 설계 (React Aria/Spectrum 참조)
- `create-adr` / `review-adr` — 아키텍처 결정 문서
- `react-aria` / `react-spectrum` — 공식 API 레퍼런스

## Superpowers Skills (워크플로 프로세스)
- `brainstorming` → `writing-plans` → `executing-plans` (다단계 구현)
- `systematic-debugging` — 버그 root-cause 4단계
- `test-driven-development` — RED-GREEN-REFACTOR
- `verification-before-completion` — 완료 직전 evidence 검증
- `using-git-worktrees` — 격리된 리팩토링

## Agents (작업 유형별 라우팅)
| 상황 | 1차 agent | 2차 검증 |
|---|---|---|
| 새 기능 구현 | implementer | reviewer → evaluator |
| 버그 재현/수정 | debugger | cross-check skill |
| 아키텍처 설계/ADR | architect | review-adr skill |
| 대규모 리팩토링 | refactorer (worktree) | reviewer |
| UI 실제 동작 검증 | evaluator (Chrome MCP) | — |
| 테스트 작성 | tester | — |
| 문서 작성 | documenter | — |

## 자동 규칙 (UserPromptSubmit hook)
프롬프트에 아래 키워드 포함 시 관련 skill/agent 힌트 자동 주입:
- "렌더링/Canvas/Skia" → cross-check + debugger
- "ADR/아키텍처 결정" → create-adr / review-adr
- "새 컴포넌트/S2 전환" → brainstorming → component-design → implementer
- "버그/에러/실패" → systematic-debugging → debugger
- "리팩토링" → refactorer + worktree
- "테스트" → tester + TDD
- "완료/머지/PR" → verification-before-completion → reviewer

## Slash Commands (표준 워크플로)
- `/cross-check` — 렌더링 정합성 검증
- `/new-adr` — ADR 생성
- `/impl` — brainstorm → plan → implement 파이프라인
- `/fix` — debug → cross-check 파이프라인
- `/review` — 완료 전 품질 검증
- `/sweep` — 패밀리 일괄 검증

규칙: 한 줄 수정/단순 질문은 skill 스킵 가능. CRITICAL/HIGH 이슈는 즉시 수정.
</composition-workflow-roster>
EOF

exit 0
