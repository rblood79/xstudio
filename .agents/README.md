# Codex Migration Guide

`.claude/`에 있던 프로젝트 전용 워크플로를 Codex에서 사용할 수 있도록 정리한 엔트리포인트입니다.

## 우선순위

1. `AGENTS.md`
2. `.agents/skills/composition-patterns/SKILL.md`
3. `.agents/skills/INDEX.md`
4. `.agents/progress.md`
5. `.agents/agent-memory/{role}/MEMORY.md`

## 자연어 발동 매트릭스

| 대상 | 자연어 발동 | 조건 | 예시 |
| --- | --- | --- | --- |
| `skill` | 가능 | skill 이름을 직접 언급하거나 요청이 skill 설명과 명확히 일치할 때 | "cross-check 해줘", "ADR 만들어줘", "새 컴포넌트 설계해줘" |
| `sub-agent / 병렬 위임` | 조건부 | 사용자가 위임/병렬/서브에이전트를 명시적으로 요청할 때 | "서브에이전트로 나눠서 해줘", "병렬로 검증해줘" |
| `.agents/rules/*` | 자동 참고 | 관련 작업을 수행할 때 Codex가 참고 | 렌더링 수정 시 `canvas-rendering.md` 참고 |
| `.agents/progress.md` | 자동 참고 | 세션 시작/재개 시 우선 확인 | 진행 상태, 최근 이슈 확인 |
| `.agents/agent-memory/*` | 자동 참고 | 역할별 패턴 확인이 필요할 때 | reviewer/debugger 메모 확인 |
| `npm run codex:guard` / `format` / `typecheck` / `preflight` | 가능 | 사용자가 실행을 요청하거나 완료 전 검증이 필요할 때 | "preflight 돌려", "guard 체크해줘" |
| Claude slash command 대응 기능 | 간접 가능 | 실제 slash command가 아니라 대응 skill/스크립트로 매핑되어 있을 때 | `/cross-check` 대신 "cross-check 해줘" |
| Claude hooks (`SessionStart`, `UserPromptSubmit`, `PreCompact`, `SubagentStop`) | 불가 | Codex에서 자동 훅 실행은 없음 | 수동으로 `.agents/*`와 codex 스크립트 사용 |

## Legacy → Codex 매핑

| Legacy Claude 자산 | Codex 대응 |
| --- | --- |
| `.claude/commands/cross-check.md` | `.agents/skills/cross-check/SKILL.md` |
| `.claude/commands/new-adr.md` | `.agents/skills/create-adr/SKILL.md` |
| `.claude/commands/sweep.md` | `.agents/skills/parallel-verify/SKILL.md` |
| `.claude/hooks/protect-files.sh` | `npm run codex:guard` |
| `.claude/hooks/auto-format.sh` | `npm run codex:format` |
| `.claude/hooks/type-check-gate.sh` | `npm run codex:typecheck` |
| `.claude/hooks/session-start.sh` | `.agents/progress.md`, `.agents/skills/INDEX.md` 수동 확인 |
| `.claude/hooks/route-prompt.sh` | `AGENTS.md` + skill trigger 문구 |
| `.claude/hooks/subagent-stop.sh` | Codex 보조 에이전트 결과는 세션 응답과 메모 파일로 관리 |
| `.claude/hooks/precompact-snapshot.sh` | `.agents/skills/composition-patterns/SKILL.md` + `.agents/rules/*` |

## 운영 원칙

- `.claude/`는 legacy reference와 통계 보관소로 유지한다.
- Codex가 직접 따라야 하는 진입점은 `.agents/`와 `AGENTS.md`에 둔다.
- 자동 훅이 없는 부분은 `npm run codex:preflight`와 skill 문서로 보완한다.
- 상세 역사/통계가 필요할 때만 링크된 legacy `.claude/...` 파일을 추가로 연다.
