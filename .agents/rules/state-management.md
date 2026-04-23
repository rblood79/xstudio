# State Management Rule

Codex용 상태 관리 규칙 엔트리포인트입니다.

- 정본 상세: [legacy `.claude/rules/state-management.md`](../../.claude/rules/state-management.md)
- 관련 스킬: [composition-patterns](../skills/composition-patterns/SKILL.md)

핵심:

- 파이프라인 순서 보존: Memory → Index → History → DB → Preview → Rebalance
- store update와 preview sync, persistence를 분리해서 본다
