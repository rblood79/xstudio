# ADR-911 Layout/Slot Frameset 완전 재설계 — 구현 상세

> **상태**: Placeholder — 본 design 문서는 ADR-911 가 Accepted 상태로 진입한 후 후속 세션에서 phase 분해 + 파일 변경 목록 + 마이그레이션 도구 설계 + 검증 시나리오를 채운다. 본 placeholder 는 scaffolding 만 보장.

## 0. Phase 분해 (예정)

| Phase  | 작업                                                                        | 의존                                        | 예상 규모 |
| ------ | --------------------------------------------------------------------------- | ------------------------------------------- | --------- |
| **P1** | layout migration 도구 + layoutTemplates 28 Slot 자동 변환                   | ADR-903 P3-E E-6 데이터 자동 migration 완료 | TBD       |
| **P2** | 신 FramesTab UI 작성 + dual-mode (legacy + canonical) 병행                  | P1                                          | TBD       |
| **P3** | layoutActions cascade 재작성 (deleteLayout / cloneLayout / addPageToLayout) | P2                                          | TBD       |
| **P4** | legacy LayoutsTab 폐기 + `useLayoutsStore` adapter shim 한정                | P3 + dual-mode 1주 운영                     | TBD       |
| **P5** | pencil import/export adapter + ADR-903 §3.10 `imports` resolver 통합        | P4                                          | TBD       |

## 1. 변경 대상 파일 (Inventory)

### UI 영역

- `apps/builder/src/builder/panels/nodes/LayoutsTab/` — 폐기
- `apps/builder/src/builder/panels/nodes/FramesTab/` — 재작성 (frame authoring UI)
- `apps/builder/src/builder/panels/nodes/FramesTab/FramesTab.tsx` — `db.elements.getByLayout()` caller + `loadFrameElements` + `frameElements` memo 전부 canonical 으로 재작성
- `apps/builder/src/builder/panels/properties/editors/PageLayoutSelector.tsx` — frame ref 선택 UI 로 재설계
- `apps/builder/src/builder/panels/properties/editors/LayoutBodyEditor.tsx` — frame body 편집 UI
- `apps/builder/src/builder/panels/properties/editors/LayoutSlugEditor.tsx` — frame slug 편집 UI
- `apps/builder/src/builder/panels/properties/editors/LayoutPresetSelector/` — preset 자체를 reusable frame 으로 변환

### Store / Action 영역

- `apps/builder/src/builder/stores/layouts.ts` — adapter shim 한정 (P4)
- `apps/builder/src/builder/stores/utils/layoutActions.ts` — cascade 재작성 (canonical descendants 기반)
- `apps/builder/src/builder/hooks/usePageManager.ts:528` — mergedMap 합성 정합화

### DB / Persistence 영역

- `apps/builder/src/lib/db/indexedDB/adapter.ts` — `getByLayout` 메서드 폐기 (P5-C 와 연계, ADR-903 G5 별도 ADR)
- `apps/builder/src/lib/db/migration.ts` — Layout migration 단계 추가 (Phase 1)

### Template / Asset 영역

- `apps/builder/src/builder/utils/layoutTemplates.ts` — 28 Slot 정의를 canonical reusable frame + slot 메타 로 재정의

### pencil 호환 영역

- `apps/builder/src/adapters/pencil/` (신규) — pencil `.pen` import/export adapter
- `packages/shared/src/types/pencil-adapter.types.ts` — 기존 type 확장

## 2. 마이그레이션 도구 (Phase 1)

### 입력

- 기존 IndexedDB 의 elements (`layout_id` 가 ADR-903 P3-E E-6 후 null, `parent_id` 가 canonical frame node id 인 상태)
- 기존 `layouts` store (legacy Layout records)
- `layoutTemplates.ts` 28 Slot 정의

### 출력

- canonical document 의 `children` 안에 reusable frame nodes (slot 메타 + descendants override 포함)
- `_meta` 에 `schemaVersion: "composition-1.1"` (Layout 재설계 완료 시 minor 증가)
- localStorage backup `composition-layout-redesign-backup:<projectId>:<ts>`

### 검증

- dry-run + roundtrip 시각 비교 (Skia/CSS 양축 screenshot diff)
- 사용자 confirm 후 cutover

## 3. 검증 시나리오 (Gates)

### G1 — layout migration 도구 land

- (a) layoutTemplates.ts 28 Slot 전수 자동 변환 정상
- (b) 사용자 IndexedDB 의 layout-bound elements 가 신 frame node 안의 descendants 로 변환
- (c) dry-run + roundtrip 시각 비교 screenshot diff 0건

### G2 — 시각 회귀 0 (R1 매핑)

- (a) `mockLargeDataV2` + 샘플 프로젝트 100% 시각 회귀 0 (Skia/CSS 양축)
- (b) dual-mode 1주 운영 후 issue report 0건

### G3 — cascade 회귀 0 (R3 매핑)

- (a) deleteLayout / cloneLayout / addPageToLayout / removePageFromLayout 50+ fixture roundtrip read-write-read 정합 0 drift
- (b) undo/redo 정상

### G4 — legacy adapter 0건

- (a) `stores/layouts.ts` 본체 0줄 또는 adapter shim 한정
- (b) repo-wide grep `LayoutsTab` / `legacy layout_id` 결과 0
- (c) `useLayoutsStore` 호출 site 0건

### G5 — pencil 호환 검증

- (a) 샘플 pencil `.pen` 파일 5종 import → composition canonical 변환 → roundtrip export → 원본 schema-equivalent
- (b) ADR-903 §3.10 `imports` resolver 와 통합 가능 인터페이스

## 4. 후속 ADR 과의 관계

| ADR                                                | 관계                                                                                          |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| ADR-903 (Implemented 2026-04-26)                   | 본 ADR 가 G3 (b)/(c)/(d) 잔여 흡수                                                            |
| ADR-903 G4 (별도 ADR 예정)                         | 본 ADR 의 신 FramesTab UI 위에 reusable/ref/override 시각 마커 + detach + reset override 추가 |
| ADR-903 G5 `tag → type` rename (별도 ADR 예정)     | 본 ADR 와 독립 진행 가능 (tag/type 영역은 별개 SSOT)                                          |
| ADR-903 P5-D/E/F imports/DesignKit (별도 ADR 예정) | 본 ADR 의 pencil 호환 adapter 가 P5-D 의 외부 `.pen` fetch 와 통합                            |

## 5. 결정 사항 (TBD — 후속 세션에서 채움)

- pencil schema 의 어느 버전을 호환 기준으로 잡을지 (현재 `2.10` vs composition `composition-1.0`)
- composition 확장 필드 (theme override 등) 의 namespace 정책
- dual-mode 운영 기간 (1주 / 2주 / 사용자 비율 기반)
- adapter shim 의 final shape — full removal vs minimal compat layer

## 6. 참조

- [ADR-911 본문](../911-layout-frameset-pencil-redesign.md)
- [ADR-903 phase 3 frameset breakdown](903-phase3-frameset-breakdown.md)
- [ADR-903 residual grep audit](903-residual-grep-audit-2026-04-26.md)
- [pencil app schema](https://pencil.dev/)
