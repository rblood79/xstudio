# ADR-911 Phase 2 Closure 5단계 사전 체크리스트

> 본 문서는 [ADR-911](../911-layout-frameset-pencil-redesign.md) Phase 2 closure 를 위해 작성됐던 historical checklist 다. 2026-04-30 이후 ADR-912 base 완료 + ADR-916 선행 결정으로, ADR-911 잔여 G3/G4/G5 는 ADR-916 G2/G5/G6 이후 재개한다.

## 진입 prerequisite

| 조건                     | 검증 방법                                                 | 통과 기준                |
| ------------------------ | --------------------------------------------------------- | ------------------------ |
| ADR-916 G2 통과          | canonical store/API + canonical→legacy export adapter API | mutation/export API 존재 |
| ADR-916 G5 baseline 확정 | legacy field quarantine 측정표                            | adapter-only 기준 확정   |
| dev runtime 회귀 0       | Chrome MCP / cross-check skill / 사용자 검증              | 추가 회귀 0건            |

기존 monitoring 기반 Phase 2 Implemented 승격 흐름은 더 이상 다음 작업의 선행 조건이 아니다. 남은 closure 는 ADR-916 이후 G3 canonical-native cascade / G4 legacy adapter 0 / G5 Pencil import-export parity 를 닫은 뒤 재작성한다.

## Closure 재작성 기준

기존 Phase 2 monitoring 기반 closure 5단계 템플릿은 실행하지 않는다. 남은 작업은 아래 순서로 다시 체크리스트를 작성한다.

| 순서 | 작업                                                                                                       | 선행 조건          |
| ---- | ---------------------------------------------------------------------------------------------------------- | ------------------ |
| 1    | ADR-916 G2 canonical store/API + canonical→legacy export adapter API 확정                                  | ADR-916 Phase 0/1  |
| 2    | ADR-911 G3 canonical-native cascade (`deleteReusableFrame` / `duplicateReusableFrame` / `setPageFrameRef`) | ADR-916 G2         |
| 3    | ADR-911 G4 legacy adapter 0 + PanelSlot/BottomPanelSlot 명칭 충돌 해소                                     | ADR-916 G5         |
| 4    | ADR-911 G5 Pencil `.pen` import/export parity + imports resolver/cache boundary 통합                       | ADR-916 G6         |
| 5    | 본문 Status / README / CHANGELOG / archive 여부 재판정                                                     | G3/G4/G5 모두 PASS |

ADR-913 Step 4-4 write-through 은 ADR-911 Phase 2 monitoring 이 아니라 ADR-916 G2 이후 canonical primary/shadow write 정책에 맞춰 재평가한다.

## 관련 문서

- ADR-911: `docs/adr/911-layout-frameset-pencil-redesign.md` (Status: In Progress)
- ADR-911 design breakdown: `docs/adr/design/911-layout-frameset-pencil-redesign-breakdown.md` (843줄)
- ADR-916: `docs/adr/916-canonical-document-ssot-transition.md` (canonical document SSOT 선행)
- 메모리 [feedback-adr-closure-5-step.md] — closure 5단계 패턴 정본
- 메모리 [tier3-entry-2026-04-27-session45-adr910-implemented.md] — 본 세션 진입 가이드
