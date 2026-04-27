# ADR-911: Layout/Slot Frameset 완전 재설계 — pencil app 호환

## Status

In Progress — 2026-04-26 → 2026-04-27

### 진행 로그

- **2026-04-26 (세션 35)**: Proposed. Phase 0 ~ 4 sub-budget 작성, design breakdown 발행 (843줄)
- **2026-04-27 (세션 36)**: Phase 1 함수 layer 완결 — `convertTemplateToCanonicalFrame` / `flattenTemplateElements` / `buildDescendantsFromSlots` / `hoistLayoutAsReusableFrame` / `dryRunMigrationP911` / `applyMigrationP911` (vitest 45/45 PASS, commits batch in PR #249 + `f4047af1`)
- **2026-04-27 (세션 37)**: Phase 2 진입 — **PR-A: frameActions canonical wrapper + FRAMES_TAB_CANONICAL feature flag**
  - `apps/builder/src/builder/stores/utils/frameActions.ts` 신규 — `createReusableFrame` / `deleteReusableFrame` / `updateReusableFrameName` / `selectReusableFrame` (legacy `useLayoutsStore` wrapping, P3 이후 직접 canonical mutation 으로 전환)
  - `apps/builder/src/utils/featureFlags.ts` — `isFramesTabCanonical()` + `framesTabCanonical` 필드 추가 (default `false`, dual-mode 운영용)
  - vitest 7/7 PASS / type-check 0
  - **scope 보호**: FramesTab.tsx 미수정 — 기존 동작 0 변화. PR-A 는 baseline 확장만
- **잔여 Phase 2 sub-PR**: PR-B (FramesTab wrapper consumer 전환) / PR-C (read path canonical 전환 + selector cache 함정 회피) / PR-D (FrameList/FrameDetails/SlotList 분리) / PR-E (PageLayoutSelector + dev migration trigger + dual-mode flag 활성화)

## Context

### Domain (SSOT 체인 - [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md))

- **해당 domain**: **없음** — 본 ADR 은 D1/D2/D3 상위에 위치하는 **문서 구조 / Layout-Slot composition 모델** 결정. ADR-903 의 G3 (b)/(c)/(d) 잔여 영역 흡수.

### 배경

[ADR-903](completed/903-ref-descendants-slot-composition-format-migration-plan.md) 가 Implemented 승격되었으나, **Phase 3 G3 의 (b)/(c)/(d) 항목** 은 잔여:

- **G3 (b)**: NodesPanel `LayoutsTab` → `FramesTab` 재설계 (canonical `ref`/`slot`/`descendants` 직접 조작)
- **G3 (c)**: repo-wide 결합 해체 — 잔여 caller (FramesTab/layoutActions/usePageManager/PageLayoutSelector 등 다수) `el.layout_id === X` 매칭이 여전히 legacy fallback 으로 동작
- **G3 (d)**: layout-vs-page 이원화 UI 전원 canonical frame authoring UI 로 치환 — 기능 상실 0

본 ADR-903 진행 중 P3-D-5 + P3-E E-6 sweep 으로 일부 caller (`ComponentsPanel.tsx` / `ElementSlotSelector.tsx` / `LayoutPresetSelector/usePresetApply.ts` / `BuilderCore.tsx` / `useCanvasDragDropHelpers.ts` / `BuilderCanvas.tsx` / `workflowEdges.ts` / `elementUtils.ts`) 는 `belongsToLegacyLayout(el, layoutId, doc)` helper 또는 canonical wrapper 경유로 정합화되었으나, **점진 정합화 (helper 교체)** 만으로는 다음 영역이 해소되지 않음:

1. **FramesTab.tsx** — `db.elements.getByLayout()` caller (composition-1.0 후 빈 배열) + `loadFrameElements` + `frameElements` memo 가 `el.layout_id === currentFrame.id` 직접 매칭. 단순 helper 교체로는 frame UI 빈 화면 회귀 가능
2. **layoutActions.ts** — `deleteLayout` / `cloneLayout` 의 elements cascade. write-through 후 `el.layout_id === id` 빈 배열 → cascade 실패 → 데이터 정합 깨질 위험
3. **usePageManager.ts:528** — `mergedMap` 합성 (`selectCanonicalReusableFrames` + `el.layout_id != null` 매칭 혼용)
4. **layoutTemplates.ts** — 28건 Slot 선언 — 신 format 으로 재정의 필요
5. **NodesPanel `LayoutsTab` UI** — frame authoring 인터페이스 미구현. 사용자가 reusable frame + slot 을 직접 편집할 수 있는 UI 부재
6. **`PageLayoutSelector` / `LayoutBodyEditor` / `LayoutSlugEditor`** — page ↔ layout 연결 인터페이스가 legacy `page.layout_id` 기반

### Hard Constraints

1. **pencil app 호환** — 사용자 명시적 결정. 외부 pencil `.pen` 문서를 import/export 할 때 시각/구조 정합 유지. canonical 문서의 `imports` field 와 reusable frame + ref + slot + descendants 문법이 pencil 의 schema 와 1:1 매칭
2. **기존 프로젝트 데이터 보존** — ADR-903 의 IndexedDB 자동 migration (P3-E E-6) 후 elements `parent_id` 가 canonical frame node id 로 변환된 상태. 본 ADR 의 재설계가 이 데이터를 그대로 읽어 frame authoring UI 에 표시
3. **시각 결과 동일성** — 기존 사용자가 만든 layout-bound page 의 Builder/Preview/Publish 3축 출력은 재설계 후에도 시각적으로 동일 (구현 방법은 자유)
4. **F4 진입 가능 조건** — 본 ADR 완료 후 ADR-903 의 G4 (Editing Semantics UI 5요소) 를 별도 ADR 로 진행 가능해야 함 (즉 본 ADR 가 G4 의 UI 토대를 제공)
5. **pencil 공식 명칭 단일 표준** — composition 코드베이스의 명칭 (`Layout` / `Frame` / `Preset`) 중 pencil 공식 명칭 (`frame` / `ref` / `reusable` / `slot` / `descendants` / `clip` / `placeholder`) 과 의미상 충돌하는 영역만 변경. pencil 무관 영역 (Taffy layout engine / CSS layout files / Builder UI panel arrangement) 은 명칭 유지. 강제 alias 또는 신조어 도입 금지

### Soft Constraints

1. UI 재설계 동안 기능 상실 0 (legacy adapter 유지하면서 점진 cutover)
2. 신 format 의 reusable frame 편집 UI 가 기존 LayoutsTab 보다 단순하거나 동등 (인지 부담 감소)
3. layoutTemplates 28 Slot 은 마이그레이션 도구 자동화 가능

## Alternatives Considered

### 대안 A: 점진 정합화 (helper 교체 + 부분 UI 패치)

- 설명: 잔여 caller 를 `belongsToLegacyLayout` helper 로 sweep 하고, FramesTab 등 UI 는 부분 수정만. NodesPanel 의 LayoutsTab 도 legacy 형태 유지하면서 내부 동작만 canonical 으로 전환
- 위험: 기술(L) / 성능(L) / 유지보수(**HIGH**) / 마이그레이션(M)
- **유지보수 HIGH**: legacy adapter 가 영구히 잔존 → composition 전체에 layout_id 의존 dead code + 신 컴포넌트 추가 시 어느 경로 사용할지 모호. ADR-903 의 R1 ("source-of-truth 혼동") 영구화

### 대안 B: 완전 재설계 (pencil app 호환) — **사용자 결정**

- 설명: 기존 LayoutsTab UI 를 폐기하고 pencil 의 frame authoring 모델 (reusable frame + slot 메타 + ref instance + descendants override) 그대로 재구성. layoutActions / layoutTemplates / FramesTab / PageLayoutSelector / LayoutBodyEditor / LayoutSlugEditor / ElementSlotSelector 전부 canonical-native 로 신규 작성. legacy adapter 는 read-through one-shot 변환 후 폐기
- 위험: 기술(M) / 성능(L) / 유지보수(L) / 마이그레이션(**HIGH**)
- **마이그레이션 HIGH**: UI 전면 교체 + DB cascade 재작성 + layoutTemplates 28 Slot 재정의. 기존 사용자 프로젝트의 frame/layout 구조 자동 변환 정합성 검증 필수
- **유지보수 LOW**: legacy 0 → 단일 SSOT (canonical) → 신 컴포넌트 추가 / pencil import/export 추가 시 단일 경로
- pencil app 호환으로 **외부 디자인 도구 import/export 직접 지원** 가능 → 향후 ADR-903 §3.10 imports resolver (P5-D/E/F) 와 자연스럽게 통합

### 대안 C: pencil 호환 layer 만 추가 + legacy 영구 유지

- 설명: 기존 LayoutsTab + layout_id schema 를 그대로 두고, pencil import/export adapter 만 신규로 추가. 사용자가 pencil 와 호환된 frame/slot UI 를 원하면 별도 모드 진입
- 위험: 기술(L) / 성능(L) / 유지보수(**CRITICAL**) / 마이그레이션(L)
- **유지보수 CRITICAL**: 두 시스템 (legacy LayoutsTab + canonical pencil layer) 영구 공존 → 모든 신 기능을 양쪽에 구현 의무 + 사용자 학습 비용 2배 + UI 일관성 혼란

### Risk Threshold Check

| 대안 |      HIGH+ 갯수       | 판정                                                                                                     |
| ---- | :-------------------: | -------------------------------------------------------------------------------------------------------- |
| A    |   1 (유지보수 HIGH)   | 위험 회피 새 대안 추가 (대안 B/C) ✅                                                                     |
| B    | 1 (마이그레이션 HIGH) | 위험 수용 가능 — 일회성 cutover, 사용자 결정에 부합                                                      |
| C    | 1 (유지보수 CRITICAL) | 근본적으로 다른 접근 추가 (대안 A 점진 정합화) — A 도 유지보수 HIGH 라 회피 불가 → 본 카테고리 자체 기각 |

루프 1회 — 대안 B 의 마이그레이션 HIGH 는 **일회성 (Phase 1 마이그레이션 도구 + Gate G2 시각 회귀 0)** 으로 관리 가능 → 위험 수용.

## Decision

**대안 B: 완전 재설계 (pencil app 호환)** 를 선택한다.

선택 근거:

1. **사용자 명시적 결정** — "변경된 format 에 맞게 (pencil app 과 동일하게) 완전 재설계"
2. ADR-903 의 R1 ("legacy adapter 장기 잔존 → SSOT 혼동") 을 근본 해소. 점진 정합화는 잔존 영역이 영구히 남을 위험 + 신 컴포넌트 추가 시 어느 경로 따를지 모호
3. pencil app 호환으로 외부 디자인 자산 import/export 가 자연스럽게 지원 → 향후 ADR-903 §3.10 `imports` resolver 와 단일 SSOT 통합
4. UI 단순화 — 단일 frame authoring 인터페이스로 사용자 학습 비용 감소
5. ADR-903 G4 (Editing Semantics UI 5요소) 의 토대 제공 — reusable/ref/override 시각 마커가 본 ADR 의 신 UI 위에 자연스럽게 추가 가능

### 기각된 대안 사유

- **대안 A 기각**: 유지보수 HIGH (legacy adapter 영구 잔존) + ADR-903 R1 영구화 + 사용자 결정 ("완전 재설계") 과 충돌
- **대안 C 기각**: 유지보수 CRITICAL (두 시스템 영구 공존) + 사용자 학습 비용 2배 + 신 기능 양쪽 구현 의무

### Terminology — pencil 공식 명칭 정합 (CRITICAL)

본 ADR 은 [pencil.dev 공식 schema](https://docs.pencil.dev/for-developers/the-pen-format) 명칭을 **단일 표준** 으로 채택. composition 기존 명칭 (`Layout` / `Frame` / `Preset`) 은 pencil 명칭과 의미상 충돌하는 영역만 변경하고, 그 외는 유지. 사용자 결정 (2026-04-27): "pencil 의 기능 명칭 그대로 사용해도 된다 — 강제로 맞추거나 alias 만들 필요 없다."

#### Pencil 공식 점유 단어 (canonical document layer)

| 명칭          | 의미                                                  | 코드 위치                                                            |
| ------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| `frame`       | `type: "frame"` 노드 (컨테이너 + 재사용 단위)         | `packages/shared/src/types/composition-document.types.ts::FrameNode` |
| `ref`         | `type: "ref"` 인스턴스 노드                           | 동일::RefNode                                                        |
| `reusable`    | boolean 플래그 — `true` 면 재사용 원본                | 동일::CanonicalNode                                                  |
| `slot`        | `false \| string[]` — 추천 reusable component ID 배열 | 동일::FrameNode.slot                                                 |
| `descendants` | override 맵 (3-mode: patch / replacement / children)  | 동일::RefNode.descendants                                            |
| `clip`        | overflow:hidden 매핑                                  | 동일::FrameNode.clip                                                 |
| `placeholder` | 빈 frame UI hint                                      | 동일::FrameNode.placeholder                                          |
| `imports`     | 외부 `.pen` 참조 hook                                 | 동일::CompositionDocument.imports                                    |

**금지**: 위 단어를 pencil 의 공식 의미가 아닌 다른 용도로 신규 도입.

#### Composition vs Pencil 매핑 (기능 흡수)

| composition 기존                         | pencil 공식 매핑                         | 처리 방향                                              |
| ---------------------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| `Element.tag`                            | `node.type`                              | **rename** (ADR-913 scope)                             |
| `Layout` (entity) + `useLayoutsStore`    | `frame` + `reusable: true` + `slot`      | **폐기 → canonical FrameNode 흡수** (Phase 4)          |
| `tag="Slot"` element                     | `frame.slot` field (`false \| string[]`) | **흡수** (Phase 1 마이그레이션 도구)                   |
| `slot_name` prop                         | `descendants[slotPath]` key path         | **변환** (slash 구분자)                                |
| `componentRole: "instance"` + `masterId` | `type: "ref"` + `ref` field              | **변환**                                               |
| `componentName` (reusable 전용 prop)     | `name` (모든 노드 공통)                  | **흡수**                                               |
| `LayoutPreset` (slot 구조 preset)        | pencil 무대응 → reusable frame template  | **폐기 또는 frame template 라이브러리** (Phase 1 결정) |

→ pencil 의 `frame` + `reusable` + `slot` + `ref` + `descendants` 조합이 composition 의 layout/preset 기능을 모두 커버. 별도 명칭 (`SlotPresetSelector`, `FrameTemplate` 등) 신설 불필요.

#### 충돌 해소 — pencil 표준과 의미 충돌하는 영역 (rename / 폐기 대상)

2026-04-27 inventory 결과: 코드베이스 grep + 의미 분석으로 실제 충돌 영역은 **2 단어 / 4 항목** 만 식별. 이전 추정 (~30 파일) 은 과대 평가였으며 Skia/workflow 의 `Frame` 단어는 canonical FrameNode 의 **시각 표현** 으로 의미 일치 → **유지**.

| 현재                                                                     | 변경 후                         | 근거                                                                                               |
| ------------------------------------------------------------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/builder/src/builder/layout/PanelSlot.tsx`                          | `PanelArea.tsx`                 | Builder UI panel slot 은 panel arrangement 영역. pencil `slot` (frame 자식 교체 위치) 과 의미 다름 |
| `apps/builder/src/builder/layout/BottomPanelSlot.tsx`                    | `BottomPanelArea.tsx`           | 동일                                                                                               |
| `useLayoutsStore` / `Layout` entity (`types/builder/layout.types.ts:41`) | 폐기 (canonical FrameNode 흡수) | Phase 4 G4 — 19 call sites                                                                         |
| `LayoutsTab` (UI)                                                        | `FramesTab`                     | pencil 표준 정합 — 이미 ADR-911 결정                                                               |

**유지 (의미 일치, rename 불필요)**: `skiaFrameHelpers.ts` / `skiaFramePlan.ts` / `skiaFramePipeline.ts` / `workflowRenderer.PageFrame` / `workflowHitTest`/`workflowMinimap`/`skiaWorkflowSelection` 의 frame 변수 — 모두 canonical FrameNode 의 Skia 시각 표현 또는 page-level FrameNode reference 로 pencil `frame` 의미와 정합.

#### 충돌 없음 — pencil 무관 또는 의미 일치 (명칭 유지)

| 위치                                                                                                                        | 의미                                                    | 처리                                                |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------- |
| `apps/builder/src/builder/workspace/canvas/layout/`                                                                         | Taffy WASM layout engine                                | **유지** — CSS/layout engine 표준 용어, pencil 무관 |
| `apps/builder/src/builder/styles/layout/`                                                                                   | CSS layout files                                        | **유지** — CSS 표준 용어                            |
| `apps/builder/src/builder/layout/`                                                                                          | Builder UI panel arrangement (좌/우/하단 panel)         | **유지** — pencil 무관, panel arrangement 의미 명확 |
| `LAYOUT_PROP_KEYS` / `INHERITED_LAYOUT_PROPS_UPDATE` / `NON_LAYOUT_PROPS_UPDATE`                                            | layoutVersion 캐시 시그니처                             | **유지** — Taffy layout engine 영역                 |
| `panels/styles/hooks/useLayout{Auxiliary,Value,Values}` / `LayoutSection.tsx`                                               | Inspector style panel 의 CSS layout 섹션                | **유지** — CSS layout 의미                          |
| `preview/utils/layoutResolver.ts`                                                                                           | preview iframe layout                                   | **유지** — preview 영역                             |
| `apps/builder/src/builder/workspace/canvas/skia/skiaFrame*.ts` (`skiaFrameHelpers` / `skiaFramePlan` / `skiaFramePipeline`) | canonical FrameNode 의 Skia 시각 표현                   | **유지** — pencil `frame` 의미 일치                 |
| `workflowRenderer.PageFrame` / `workflowHitTest` / `workflowMinimap` / `skiaWorkflowSelection.PageFrameLike`                | page-level FrameNode reference                          | **유지** — pencil `frame` 의미 일치                 |
| `MaskedFrame.spec.ts` / `MaskedFrame.css`                                                                                   | composition Component vocabulary 의 mask frame 컴포넌트 | **유지** — Component vocabulary, pencil 무관        |
| `useFrameCallback.ts` / `gpuProfilerCore.FrameStats`                                                                        | requestAnimationFrame (RAF)                             | **유지** — RAF, pencil 무관                         |
| `useIframeMessenger.ts` / `iframeMessenger.ts`                                                                              | postMessage iframe (HTML 표준)                          | **유지** — pencil 무관                              |
| `panels/datatable/presets/` (`dataTablePresets` / `DataTablePresetSelector`)                                                | DataTable schema preset                                 | **유지** — pencil 무관, composition 고유            |
| `cssComponentPresets.ts` / `cssLabelPresets.ts` / `specPresetResolver.ts`                                                   | Spec/CSS preset resolver                                | **유지** — Spec D3 영역, pencil 무관                |
| `components/particle/presets.ts`                                                                                            | particle effect presets                                 | **유지** — pencil 무관                              |

> 구현 상세: [911-layout-frameset-pencil-redesign-breakdown.md](design/911-layout-frameset-pencil-redesign-breakdown.md) — 후속 세션에 작성 (Phase 분해 + 파일 변경 목록 + 마이그레이션 도구 + 검증 시나리오)

## Risks

| ID  | 위험                                                                                                                                    | 심각도 | 대응                                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | 기존 프로젝트의 layout-bound page 가 새 frame authoring UI 에서 시각적으로 다르게 렌더 (예: slot 매칭 실패 + descendants override 누락) |  HIGH  | Gate G2 (시각 회귀 0) — Phase 1 마이그레이션 도구가 모든 layoutTemplates 28 Slot + 사용자 프로젝트의 layout-page 결합을 자동 변환. roundtrip 시각 비교 (Builder/Preview 양축 screenshot diff) 후 cutover |
| R2  | UI 재설계 동안 LayoutsTab 사용자가 frame authoring UI 학습 부담 + 일시적 기능 상실                                                      |  MED   | Phase 2 에서 legacy LayoutsTab 과 신 FramesTab 을 1주 이상 병행. 사용자 documentation 우선 작성 + in-app 마이그레이션 안내                                                                               |
| R3  | layoutActions cascade 재작성 중 deleteLayout / cloneLayout 데이터 누락                                                                  |  HIGH  | Phase 3 진입 전 unit test 50+ fixture 추가 (createLayout / deleteLayout / cloneLayout / addPageToLayout 시나리오). roundtrip read-write-read 정합 검증                                                   |
| R4  | pencil schema 와의 1:1 매칭 시 composition 만의 확장 필드 (예: theme override) 가 호환성 위반                                           |  LOW   | composition 확장 필드는 `metadata.composition*` namespace 안에 격리 (ADR-903 §3.10 패턴). pencil import/export 시 metadata 보존                                                                          |
| R5  | layoutTemplates.ts 28 Slot 자동 변환 후 일부 시각 변경 발생 (예: 미세한 padding/gap drift)                                              |  MED   | Phase 1 마이그레이션 도구가 변환 결과를 dry-run + roundtrip 시각 비교 (Skia/CSS 양축) 검증. 사용자 confirm 후 cutover                                                                                    |

잔존 HIGH 위험 = R1, R3 — 모두 Gate 매핑.

## Gates

| Gate                                        | 시점         | 통과 조건                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 실패 시 대안                                   |
| ------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **G1**: Layout migration 도구 land          | Phase 1 완료 | (a) layoutTemplates.ts 28 Slot 전수 자동 변환 정상 / (b) 사용자 IndexedDB 의 layout-bound elements 가 신 frame node 안의 descendants 로 변환 / (c) dry-run + roundtrip 시각 비교 (Skia/CSS) screenshot diff 0건                                                                                                                                                                                                                                                                                    | 변환 도구 보강 또는 변환 대상 좁히기           |
| **G2**: 시각 회귀 0 (R1 매핑)               | Phase 2 완료 | (a) `mockLargeDataV2` + 샘플 프로젝트 100% 시각 회귀 0 (Skia/CSS 양축) / (b) 사용자 cutover 전 1주 dual-mode (legacy + canonical) 운영 후 issue report 0건                                                                                                                                                                                                                                                                                                                                         | dual-mode 기간 연장 또는 specific 시나리오 fix |
| **G3**: cascade 회귀 0 (R3 매핑)            | Phase 3 완료 | (a) deleteLayout / cloneLayout / addPageToLayout / removePageFromLayout 50+ fixture roundtrip read-write-read 정합 0 drift / (b) undo/redo 정상                                                                                                                                                                                                                                                                                                                                                    | layoutActions 재작성 보강                      |
| **G4**: legacy adapter 0건 + 명칭 충돌 해소 | Phase 4 완료 | (a) `apps/builder/src/builder/stores/layouts.ts` 본체 0줄 또는 adapter shim 한정 / (b) repo-wide grep `LayoutsTab` / `legacy layout_id` 결과 0 / (c) `useLayoutsStore` 호출 site 0건 (또는 adapter shim 안에서만) / (d) **명칭 충돌 해소** — `PanelSlot.tsx` → `PanelArea.tsx`, `BottomPanelSlot.tsx` → `BottomPanelArea.tsx` rename land (Builder UI panel slot ↔ pencil `slot` 의미 격리). repo-wide grep `PanelSlot\|BottomPanelSlot` 결과 0 (`apps/builder/src/builder/layout/` 디렉토리 한정) | adapter shim 디렉토리 한정 + dead code 제거    |
| **G5**: pencil 호환 검증                    | Phase 5 완료 | (a) 샘플 pencil `.pen` 파일 5종 import → composition canonical document 변환 → roundtrip export → 원본과 schema-equivalent (binary diff 가능 영역만) / (b) ADR-903 §3.10 `imports` resolver 와 통합 가능 인터페이스                                                                                                                                                                                                                                                                                | composition 확장 필드 namespace 격리 보강      |

## Consequences

### Positive

- ADR-903 의 R1 ("legacy adapter 장기 잔존 → SSOT 혼동") 근본 해소 — legacy 0
- pencil app 과 schema 호환 → 외부 디자인 자산 import/export 자연스럽게 지원
- 단일 frame authoring 인터페이스 → 사용자 학습 비용 감소 + UI 일관성
- ADR-903 G4 (Editing Semantics UI 5요소) 의 토대 제공
- ADR-903 P5-D/E/F (`imports` resolver + DesignKit 통합) 와 자연스럽게 통합
- **pencil 공식 명칭 단일 표준 채택** — 2026-04-27 inventory 결과 실제 충돌 영역은 Builder UI panel slot 2건 (`PanelSlot` / `BottomPanelSlot`) 으로 한정. Skia rendering 의 `Frame` 단어는 canonical FrameNode 의 시각 표현으로 의미 일치 → 유지

### Negative

- UI 전면 재설계 + DB cascade 재작성 + layoutTemplates 재정의 — 일회성 작업량 큼 (~수 주)
- 사용자 cutover 부담 — 기존 LayoutsTab 사용자가 신 FramesTab 학습 필요 (Phase 2 dual-mode 기간으로 완화)
- layoutTemplates 28 Slot 의 변환 결과 일부 시각 drift 발생 가능 (R5) — 사용자 confirm 단계 필요
- Builder UI rename 2 파일 (`PanelSlot.tsx` / `BottomPanelSlot.tsx` → `PanelArea.tsx` / `BottomPanelArea.tsx`) — Phase 4 G4 통과 조건에 흡수, 외부 API 영향 없음 (내부 import 경로만 변경)

## References

- [ADR-903](completed/903-ref-descendants-slot-composition-format-migration-plan.md) — canonical document migration (Implemented 2026-04-26, 본 ADR 의 G3 (b)/(c)/(d) 잔여 흡수)
- [ADR-903 phase 3 frameset breakdown](design/903-phase3-frameset-breakdown.md) — frameset 흡수 분석 (본 ADR Phase 1 마이그레이션 도구 설계 시 참조)
- [ADR-903 residual grep audit](design/903-residual-grep-audit-2026-04-26.md) — 잔여 caller inventory (Phase 4 G4 측정 baseline)
- [pencil app schema](https://pencil.dev/) — 본 ADR 의 호환 기준
