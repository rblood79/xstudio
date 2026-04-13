---
description: 새 ADR 생성 — 번호 자동 할당 + Risk-First 템플릿 + README.md 동시 갱신
argument-hint: [ADR 제목]
---

`create-adr` skill을 호출하여 "$ARGUMENTS" 제목의 ADR을 생성한다.

필수 사항:

- docs/adr/ 내 최대 번호 + 1로 자동 할당
- Risk-First 템플릿 (Context → Alternatives → Decision → Gates 순서)
- 구현 상세는 docs/design/NNN-\*-breakdown.md로 분리
- docs/adr/README.md 테이블 동시 갱신
- rules/adr-writing.md의 검증 체크리스트 6개 모두 통과
