# ADR Writing Rule

Codex용 ADR 규칙 엔트리포인트입니다.

- Codex 진입점: 이 파일
- 정본 상세: [legacy `.claude/rules/adr-writing.md`](../../.claude/rules/adr-writing.md)
- 관련 스킬: [create-adr](../skills/create-adr/SKILL.md)

핵심:

- Risk-First 순서 유지: Context → Alternatives → Threshold Check → Decision → Risks → Gates
- 구현 상세는 ADR 본문 대신 `docs/adr/design/*-breakdown.md`로 분리
- `docs/adr/README.md` 동시 갱신
