# Codex Skill Catalog

Codex에서 우선 사용할 composition 전용 스킬 목록입니다.

## Core Skills

| Skill                  | 경로                                                           | 용도                    |
| ---------------------- | -------------------------------------------------------------- | ----------------------- |
| `composition-patterns` | [composition-patterns/SKILL.md](composition-patterns/SKILL.md) | 코드 규칙/패턴 인덱스   |
| `cross-check`          | [cross-check/SKILL.md](cross-check/SKILL.md)                   | 렌더링 경로 정합성 검증 |
| `parallel-verify`      | [parallel-verify/SKILL.md](parallel-verify/SKILL.md)           | 병렬 검증 워크플로      |
| `component-design`     | [component-design/SKILL.md](component-design/SKILL.md)         | 새 컴포넌트 설계/구현   |
| `create-adr`           | [create-adr/SKILL.md](create-adr/SKILL.md)                     | ADR 생성                |
| `review-adr`           | [review-adr/SKILL.md](review-adr/SKILL.md)                     | ADR 검증                |
| `react-aria`           | [react-aria/SKILL.md](react-aria/SKILL.md)                     | React Aria 레퍼런스     |
| `react-spectrum`       | [react-spectrum/SKILL.md](react-spectrum/SKILL.md)             | React Spectrum 레퍼런스 |

## Legacy Command Mapping

| Claude slash command | Codex skill                                 |
| -------------------- | ------------------------------------------- |
| `/cross-check`       | `cross-check`                               |
| `/new-adr`           | `create-adr`                                |
| `/sweep`             | `parallel-verify`                           |
| `/impl`              | `component-design` + `composition-patterns` |

## 참고

- legacy 사용 통계: [`.claude/skills/INDEX.md`](../../.claude/skills/INDEX.md)
- macro rules: [`.agents/rules/`](../rules/)
- Codex harness: `pnpm run codex:route -- "<요청>"`, `pnpm run codex:snapshot`, `pnpm run codex:preflight`
