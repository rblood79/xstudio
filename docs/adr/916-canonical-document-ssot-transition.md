# ADR-916: Canonical Document SSOT 전환 계획

## Status

In Progress — 2026-05-01 (Phase 0 G1 ✅ + Phase 1 G2 ✅ land)

### 진행 로그

- **2026-04-30**: Proposed. ADR-903/910/911/912/913/914 라인업의 최종 cutover ADR 로 도입. ADR-914 standalone scope 흡수. tier3 entry "다음 Tier 1 = ADR-916 진입" 권고.
- **2026-05-01 — Phase 0 G1 Schema Boundary Freeze land + Accepted 승격**:
  - **framing #3 lock-in** — §Decision 의 "ADR fork checkpoint (4 질문)" 서브섹션에서 ADR-903 의 read-through projection ↔ 본 ADR 의 primary SSOT reverse 가 valid 한 사유 명문화. base/응용 분류 + schema 4 영역 직교성 + reverse 정당화 (ADR-903 transition bridge / ADR-910/911/912/913 누적 / closure ADR 부재) + codex 1차 진입 합의.
  - **타입 land** — `packages/shared/src/types/composition-document.types.ts` 에 (1) `@fileoverview` ADR-916 G1 boundary 4-항 분류표 추가, (2) `CanonicalNode.props?: Record<string, unknown>` 신규 필드 (G1 §2.1 결정), (3) `CanonicalNode.metadata` 주석에 `metadata.legacyProps` transition-only marker, (4) `CompositionExtension` / `CompositionExtendedNode` / `SerializedEventHandler` / `SerializedAction` / `SerializedDataBinding` 타입 (G1 §3 namespace).
  - **legacy marker land** — `apps/builder/src/types/builder/unified.types.ts` 의 `Element.events` / `Element.dataBinding` / `Element.layout_id` / `Element.slot_name` / `Element.componentRole` / `Element.masterId` / `Element.overrides` / `Element.descendants` / `Element.componentName` 9 필드에 ADR-916 G5 / G7 Extension Boundary cleanup target 마커 부착. 기존 `@deprecated ADR-913 Phase 5` 마커와 병기.
  - **design §5 갱신** — Phase 0 산출물 6 항목 모두 ✅ 마크 + baseline 4 grep 결과 (`legacyToCanonical(` 44 / `metadata.legacyProps|legacyProps` 92 / legacy 5필드 broad 1062 / events·dataBinding broad 856) main HEAD `119f0206c` 기준 기록.
  - **검증** — `pnpm type-check` 3/3 PASS (5.23s). 신규 `props?` optional 필드 추가가 기존 41+ canonical consumer 를 깨지 않음을 확증.
  - **Gate G1 (Schema Boundary Freeze) PASS** → Status `Proposed → Accepted` 승격.
- **2026-05-01 — Phase 1 G2 Canonical Document Store API land**:
  - **결정 분기 D1=B / D2=β / D3=i** — Phase 1 land scope = types + skeleton + unit test (R1 명시 "API + unit test 까지만"). storage backing = 별도 Zustand slice (elementsMap wrapper 기각, Phase 2 hot path cutover 시점에 elementsMap 의존 제거 자연스러움). 역방향 adapter = spec only (구현은 Phase 3).
  - **types land** — `packages/shared/src/types/composition-document-actions.types.ts` 신규: (1) `CanonicalDocumentActions` interface 8 method (`getDocument` / `setDocument` / `setCurrentProject` + 5 mutation: `updateNode` / `updateNodeProps` / `insertNode` / `removeNode` / `updateDescendant`), (2) `CanonicalLegacyAdapter<TElement, TPage, TLayout>` generic spec stub (Phase 3 prerequisite), (3) `CanonicalLegacyExport` / `CanonicalLegacyAdapterInput` / `CanonicalRoundtripDiff` / `CanonicalExportDiagnostic` placeholder. barrel `packages/shared/src/types/index.ts` 末尾 export.
  - **store land** — `apps/builder/src/builder/stores/canonical/canonicalDocumentStore.ts` 신규: Zustand `create<CanonicalDocumentStore>` slice. 활성 document 모델 (`currentProjectId` + `Map<projectId, doc>`) + `documentVersion` 카운터 + clone-on-write immutability + dev warn (silent fail / throw 회피). Phase 1 단순화: `parentPath` / `nodePath` = nodeId (single-segment), `descendantPath` = pencil slash-separated. `selectCanonicalNode` / `selectActiveCanonicalDocument` cold-path selector.
  - **G7 사전 enforcement** — `updateNodeProps` 에서 `events` / `actions` / `dataBinding` key 입력 시 dev warn + skip (Extension Boundary G7 의 props ↔ x-composition 분리 사전 적용).
  - **structural invariant 보호** — `updateNode` 가 `id` / `type` / `props` patch 를 받으면 silently 무시 (id/type 은 구조 invariant, props 는 `updateNodeProps` 사용 권장 — semantic intent 분리, history granularity 보존).
  - **unit test land** — `apps/builder/src/builder/stores/canonical/__tests__/canonicalDocumentStore.test.ts` 신규: 7 action × happy path + edge case + selector + immutability = **37 test PASS**. 검증 항목 = no-active-project no-op, node 미발견 warn, DFS lookup, props undefined 키 삭제, G7 forbidden key skip, descendants 3-mode union add/overwrite, RefNode 외 target reject, documentVersion 카운터, Map reference clone, structural clone 전파.
  - **design §6 갱신** — Phase 1 ✅ 마크 + 6-A~6-G 서브섹션 (산출물표 / 활성 document 모델 / 시그니처 구체화 / 역방향 adapter spec / Phase 1 외부 잔존 / 원칙 / 검증 evidence).
  - **검증** — `pnpm type-check` 3/3 PASS (4.23s, turbo cache miss 후 재실행) + vitest 37/37 PASS (520ms).
  - **Gate G2 (Canonical Store/API) PASS** — `CompositionDocument` read/write/mutation API 와 canonical -> legacy export adapter API 가 `elements[]` 직접 mutation 없이 테스트 가능. Status `Accepted → In Progress` 전이.
- **2026-05-01 — Phase 2 G3 Sub-Phase A: Bridge layer + selector subscription pattern land**:
  - **결정 분기 D4=γ / D5=A / D6=i** — 5 hot path 다중 영역 R2 HIGH risk 대응으로 3-4d bridge first + 1 path pilot 채택 (atomic 1주 단일 PR 기각 / path-by-path 5 PR 보다 회귀 isolation 우선). bridge layer 먼저 land (D5=A). React subscribe 패턴은 `useSyncExternalStore` (D6=i, Zustand v5 selector cache miss 회피 — 세션 36 ElementSlotSelector 무한 루프 이력).
  - **bridge land** — `apps/builder/src/builder/stores/canonical/canonicalElementsBridge.ts` 신규 (~140 lines): (1) read API `getCanonicalNode(nodeId)` / `getActiveCanonicalDocument()` (Phase 1 selector wrap), (2) subscribe API `subscribeCanonicalStore(listener)` (Zustand v5 native subscribe — `subscribeWithSelector` middleware 미사용, store 의 clone-on-write 가 snapshot stability 보장하므로 over-subscribe 가 perf 영향 없음), (3) feature flag `isCanonicalBridgeEnabled()` / `setCanonicalBridgeEnabled(value)` (default `false`, Sub-Phase B 진입 시 path 별 enable), (4) React hook 2종 `useCanonicalNode(nodeId): CanonicalNode | null` + `useActiveCanonicalDocument(): CompositionDocument | null` (`useSyncExternalStore` 기반, SSR snapshot = `null` placeholder).
  - **unit test land** — `apps/builder/src/builder/stores/canonical/__tests__/canonicalElementsBridge.test.tsx` 신규: feature flag 3 + read API 7 + subscribe API 4 + `useCanonicalNode` 5 + `useActiveCanonicalDocument` 3 = **22 test PASS**. snapshot stability 검증 (mutation 없음 → 동일 reference) 및 mutation re-render (clone-on-write 후 새 reference) 명시 evidence.
  - **Sub-Phase A scope 명시** — canonical store 단독 read (legacy `elementsMap` fallback 미포함). `legacyToCanonical()` 자동 변환 캐싱 + 5 hot path path-by-path cutover (LayerTree → Selection/properties → Preview sync → BuilderCore → canvas drag/drop) 는 Sub-Phase B 부터 진입.
  - **검증** — `pnpm turbo run type-check` 3/3 PASS (builder cache miss 313ms, shared/publish cache hit) + vitest canonical 전체 59/59 PASS (37 store + 22 bridge — 회귀 0).
  - **Gate G3 진행률**: 5/5 hot path 중 0/5 path 실 cutover (backbone 구축 단계). Sub-Phase B 진입 prerequisite 충족 — `useCanonicalNode` / `useActiveCanonicalDocument` hook 이 LayerTree pilot 의 read backbone 으로 사용 가능.
- **2026-05-01 — Phase 2 G3 Sub-Phase B Step 1a: Legacy → canonical write-through sync land**:
  - **결정 분기 D7=A / D8=β / D9=i** — write-through sync 채택 (canonical store 가 mirror, design §6-E 정통 경로) + Step 1a 단독 land (회귀 isolation, LayerTree cutover 는 다음 세션 Step 1b) + Zustand v5 native subscribe + ref 비교 selector (legacy store 무수정).
  - **CRITICAL 발견 (Sub-Phase A 후속)**: Sub-Phase A bridge land 후 baseline 측정 결과 canonical store `setDocument` 호출 site **0건** — Phase 1 store 가 어디서도 채워지지 않은 상태. LayerTree pilot 진입 시 `useActiveCanonicalDocument()` 가 즉시 `null` 회귀 위험 발견 → write-through sync 가 5 hot path 공통 prerequisite 임이 확정. Sub-Phase B 진입 첫 작업으로 Step 1a 격상.
  - **sync 모듈 land** — `apps/builder/src/builder/stores/canonical/canonicalDocumentSync.ts` 신규 (~150 lines): (1) `startCanonicalDocumentSync(): () => void` 공개 API (3 store subscribe + initial schedule + return unsubscribe), (2) microtask coalesce (`queueMicrotask` 기반, 동일 macrotask 내 다중 mutation → 1번 sync collapse), (3) ref 비교 selector (`elementsMap`/`pages`/`layouts`/`currentProjectId` 동일 ref 시 sync skip), (4) `null` projectId no-op (data store 미초기화 시 안전), (5) `selectCanonicalDocument()` 재사용 (`apps/builder/src/builder/stores/elements.ts:2024` 기존 helper — 신규 변환 로직 0).
  - **호출 site 명시 (Step 1b 진입 prerequisite)**: 본 모듈은 land 만 됐고 실제 `startCanonicalDocumentSync()` 호출은 builder 부트스트랩 (`apps/builder/src/main.tsx` 또는 project init effect) 에 추가 필요. Step 1b (LayerTree pilot) 진입 시점에 함께 land 권장.
  - **unit test land** — `apps/builder/src/builder/stores/canonical/__tests__/canonicalDocumentSync.test.ts` 신규: lifecycle 3 + null projectId 2 + propagation 5 + microtask coalesce 1 = **11 test PASS**. test scheduler override 패턴 (`setSyncScheduler((cb) => cb())`) 으로 microtask flush 대기 없이 결과 검증 가능, default `queueMicrotask` 회복 시 coalesce 검증 (3 mutation → 1 sync, version diff = 1).
  - **검증** — `pnpm turbo run type-check` 3/3 PASS (builder cache miss 313ms) + vitest canonical 전체 70/70 PASS (37 store + 22 bridge + 11 sync — 회귀 0).
  - **Gate G3 진행률**: 5/5 hot path 중 0/5 path 실 cutover. Sub-Phase B Step 1b (LayerTree pilot) 진입 가능 — `useActiveCanonicalDocument()` 가 실제 데이터 수신할 backbone 완성. legacy mutation → canonical store 자동 mirror 경로 단방향 sync 가동.
- **2026-05-01 — Phase 2 G3 Sub-Phase B Step 1b-1: Bootstrap 호출 + env flag land**:
  - **결정 분기 D10=B / D11=β / D12=i** — Builder mount lifecycle 에 sync 호출 (route 이탈 시 cleanup 자동) + Step 1b-1 단독 land (LayerTree dual-mode cutover 는 Step 1b-2 다음 세션) + flag default `false` (보수, LayerTree pilot 검증 시점 사용자 명시 enable).
  - **재추정 발견**: design §7-B "LayerTree pilot 1-2d MED" 가 단일 PR 가정이었으나 실측 작업 분해 시 (1) Bootstrap + flag = LOW ~30분, (2) LayerTree dual-mode cutover = MED ~1d, (3) Chrome MCP visual evidence = MED ~1-2h. Step 1b 가 1b-1 / 1b-2 / 1b-3 으로 세분화. 본 commit = 1b-1 만.
  - **flag land** — `apps/builder/src/utils/featureFlags.ts` 에 `isCanonicalDocumentSyncEnabled()` getter 추가 (`VITE_ADR916_DOCUMENT_SYNC` env, default `false`). 기존 `isFramesTabCanonical()` (ADR-911 P2) 패턴 정합 — `parseBoolean` + env override + emergency rollback (`VITE_ADR916_DOCUMENT_SYNC=false` 즉시 비활성화).
  - **bootstrap 호출 land** — `apps/builder/src/builder/main/BuilderCore.tsx` import chain 에 `isCanonicalDocumentSyncEnabled` + `startCanonicalDocumentSync` 추가. mount useEffect (history useEffect 직전 위치, deps `[]`): flag enabled 시 `startCanonicalDocumentSync()` 호출 + cleanup 으로 unsubscribe 함수 반환 → Builder route 이탈 시 sync 자동 정리.
  - **회귀 안전망**: default `false` 이므로 production 영향 0 — Step 1b-2 진입 사용자 검증 후 명시 enable. canonical store hydrated 되어도 hot path consumer 가 없어 메모리 cost 만 발생 (LayerTree cutover 시점에 의미 발현).
  - **검증** — `pnpm turbo run type-check` 3/3 PASS (builder cache miss 291ms) + vitest canonical 전체 70/70 PASS (apps/builder cwd, 회귀 0). root cwd 실행 시 jsdom 환경 분리 이슈는 pre-existing config 한계 — 본 변경 무관, apps/builder cwd 에서 정상.
  - **Step 1b-2 진입 prerequisite (다음 세션)**: (1) 사용자 환경에서 `VITE_ADR916_DOCUMENT_SYNC=true` 명시 enable + dev console 로그 확인 (canonical store 가 mutation 시 update 되는지), (2) `useLayerTreeData.ts` dual-mode cutover (canonical → LayerTreeNode 변환 helper + virtual children + ref/instance 분기), (3) Chrome MCP visual evidence (legacy vs canonical 모드 LayerTree 표시 정합성).
- **2026-05-01 — Phase 2 G3 Sub-Phase B Step 1b: LayerTree pilot land (1 PR 통합)**:
  - **결정 분기 D13=A / D14=i / D15 통합** — canonical → Element[] derived view helper + metadata.legacyProps 활용 + 1 PR 통합 land (사용자 지시 "쓸데없이 쪼개기 하지마" / "본래 목적을 찾아라" 반영).
  - **schema 보강** — `apps/builder/src/adapters/canonical/legacyMetadata.ts` 의 `buildLegacyElementMetadata()` 가 보존하는 element top-level fields 를 6개 → 7개로 확장 (`element.type` 추가). canonical inverse 변환에서 ref 노드의 원본 element.type 복원 가능 (canonical type === "ref" 만으로는 LayerTree 분기 무력화).
  - **derived view land** — `apps/builder/src/builder/stores/canonical/canonicalElementsView.ts` 신규 (~140 lines): (1) `canonicalDocumentToElements(doc)` helper — DFS + metadata.legacyProps 기반 무손실 inverse 변환 (id/parent_id/page_id/layout_id/order_num/fills/type + props spread 7-fields), (2) metadata 미보존 노드는 skip + 자식 parent context 승계 (page placeholder / slot synthetic 안전), (3) `useCanonicalElements()` React hook — `useActiveCanonicalDocument()` + `useMemo` 변환.
  - **dual-mode cutover land** — `apps/builder/src/builder/panels/nodes/tree/LayerTree/useLayerTreeData.ts` 진입점에 source 분기 추가: `isCanonicalDocumentSyncEnabled()` && canonical store hydrated 시 `useCanonicalElements()` 결과 사용, 미충족 시 caller 가 전달한 legacy `elements[]` 유지. 하류 파이프라인 (`resolveCanonicalRefTree` / `buildTreeFromElements` / `convertToLayerTreeNodes`) 변경 0 — 기존 schema/동작 무손실.
  - **회귀 안전망**: flag default `false` 이므로 production 영향 0. flag enable 시에도 canonical → Element[] derived view 라 LayerTreeNode.element / selectedElementId / batchUpdateElements 모두 legacy UUID 기반 유지 → 5 hot path cascade 회피.
  - **unit test land** — `apps/builder/src/builder/stores/canonical/__tests__/canonicalElementsView.test.ts` 신규 (**7 test PASS**): happy path 3 (single root + nested DFS + ref 노드 type 복원) + metadata 미보존 노드 2 + fields 무손실 복원 2.
  - **검증** — `pnpm turbo run type-check` 3/3 PASS (builder cache miss 304ms) + vitest canonical 전체 77/77 PASS (37 store + 22 bridge + 11 sync + 7 view, 회귀 0) + LayerTree 기존 vitest 5/5 PASS (회귀 0).
  - **Gate G3 진행률**: 5/5 hot path 중 **1/5 path cutover backbone 완성** (LayerTree). 사용자 환경 dev enable + Chrome MCP visual evidence 후 LayerTree pilot 완결 → Step 2 (Selection/properties) 진입 가능.
- **2026-05-01 — Step 1b dev 검증 + caller-driven sync 전환**:
  - **회귀 #1 (subscribe 시그니처)**: 사용자 dev 환경 (`VITE_ADR916_DOCUMENT_SYNC=true pnpm dev`) 검증 시 `currentProjectId === null` + `documentVersion === 0` 영구 지속 발견. console 로그 분석 결과 `useDataStore.subscribe(listener)` native fallback 이 fire 0건 (useStore / useLayoutsStore 는 정상). root cause = `useDataStore` 가 `subscribeWithSelector` middleware 사용 (data.ts:313) → selector-aware 시그니처 (`subscribe(selector, listener)`) 필수.
  - **회귀 #2 (dataStore fragility)**: subscribe 시그니처 fix 후에도 `useDataStore.isInitialized === false` 지속 → BuilderCore 의 init useEffect 가 sequential await 중 stuck 또는 condition skip. dataStore 자체가 fragile source 임이 확정.
  - **caller-driven 전환 (근본 fix)**: `startCanonicalDocumentSync()` → `startCanonicalDocumentSync(projectId: string)` 시그니처 변경. caller (BuilderCore) 가 `useParams<{projectId}>()` 의 routing 값을 명시 전달. dataStore 의존 완전 제거 + 2 store subscribe 만 유지 (useStore + useLayoutsStore). routing source 는 dataStore lifecycle 와 무관 — 항상 immediate available.
  - **stop() 시 currentProjectId reset 추가** — 다른 project sync 시작 시 stale 데이터 노출 방지.
  - **dev evidence (사용자 검증)**: Builder 페이지 (`/builder/<projectId>`) 진입 + `VITE_ADR916_DOCUMENT_SYNC=true` enable 후:
    - `window.__canonical_STORE__.getState().currentProjectId === '<route projectId>'` ✅
    - `documentVersion` 페이지 요소 추가 시 7→8→9→10→11 증가 ✅ (sync 정상 trigger)
  - **vitest 갱신**: 11 test 모두 caller-driven 시그니처 사용 (`startCanonicalDocumentSync("proj-a")` 명시). 신규 검증 = stop 시 reset / 동일 projectId skip / start 미호출 시 무시.
  - **검증** — `pnpm turbo run type-check` 3/3 PASS + vitest canonical 전체 77/77 PASS (회귀 0).
  - **Step 1b LayerTree pilot 완결** — sync backbone + caller-driven 전환 + dev evidence 모두 확보. design §7-B Step 2 (Selection/properties) 진입 가능.

## Context

ADR-903은 `CompositionDocument` canonical format, `reusable/ref/descendants/slot` 문법, resolver-first migration을 도입했고, ADR-910은 `themes`/`variables`를 canonical document에 land했다. ADR-911/912/913/914는 그 후속 영역인 frame/slot authoring, editing semantics, `tag -> type`, hybrid field cleanup, imports resolver를 나누어 처리했다. 2026-04-30 기준 ADR-914 독립 계획은 superseded 처리하고, 잔여 `imports` resolver/cache 범위는 본 ADR의 canonical document boundary로 흡수한다.

그러나 현재 runtime/persistence 구조는 아직 **canonical document가 최종 SSOT가 아니라 read-through projection**에 가깝다. `elements[] + pages[] + layouts[]`에서 매번 `CompositionDocument`를 만들고, legacy 필드(`layout_id`, `slot_name`, `componentRole`, `masterId`, legacy `overrides/descendants`)를 canonical 의미로 역해석한다. 이 상태는 format 전환기의 완충책으로는 유효하지만, 최종 구조가 되면 성능과 의미 충돌을 계속 만든다.

이 ADR은 기존 후속 ADR들을 폐기하지 않고, 그 위에 **최종 목표를 명확히 고정**한다. 최종 기준은 Pencil 원본 `.pen` schema도, legacy `elements[]` store도 아니다. 최종 기준은 Composition component vocabulary를 유지하는 **`CompositionDocument` canonical schema**다.

**Hard Constraints**:

1. **최종 SSOT 고정** — 저장/편집/렌더/history/preview/publish의 장기 기준은 `CompositionDocument`여야 한다. legacy `elements[]`는 adapter/import/export/migration 경계로 내려간다.
2. **Pencil 원본 schema 비채택** — `frame/ref/descendants/slot` 구조는 Pencil과 정합하지만, `Button`, `Section`, `TextField` 같은 Composition component vocabulary와 Spec/D1-D3 체인은 유지한다.
3. **Component props 위치 확정** — `Button`, `TextField`, `Section` 같은 component semantics는 `metadata.legacyProps`가 아니라 `CanonicalNode.props?: Record<string, unknown>`에 저장한다. `metadata.legacyProps`는 transition adapter 출력일 뿐 최종 SSOT가 아니다.
4. **Hot path projection 금지** — drag, selection, canvas render, preview sync, layer tree update 같은 고빈도 경로에서 `legacyToCanonical()` 전체 문서 재구성을 호출하지 않는다.
5. **Core vs extension 경계 명시** — canonical core에는 문서 구조 문법과 component props만 둔다. Composition app behavior(`events`, `actions`, `dataBinding`, editor state)는 namespaced extension으로 분리한다.
6. **하위 호환 read-through** — 기존 프로젝트는 adapter로 읽을 수 있어야 하지만, 신규 write는 canonical document를 우선해야 한다.
7. **역방향 adapter 명시** — canonical primary 저장으로 전환하기 전에 `CompositionDocument -> legacy elements[]/pages[]/layouts[]` export adapter와 roundtrip 검증이 존재해야 한다.
8. **시각/데이터 회귀 0** — 전환 후 기존 샘플 프로젝트와 사용자 프로젝트의 Skia/Preview/Publish 렌더 결과와 slot/ref editing semantics가 보존되어야 한다.
9. **ADR-063 경계 유지** — D1(RAC DOM/접근성), D2(RSP Props/API), D3(Spec 시각) SSOT는 canonical document 하위 consumer로 유지하고, 본 ADR은 그 상위 document/source model만 다룬다.

**Soft Constraints**:

- 단계별 feature flag와 shadow write/read verification을 사용한다.
- ADR-911/913의 기존 phase와 ADR-914의 historical imports scope를 최대한 재사용하되, 최종 cutover gate는 본 ADR에서 통합 관리한다.
- migration 도중 임시 adapter 최적화는 허용하지만 최종 목표로 삼지 않는다.

## Alternatives Considered

### 대안 A: Legacy `elements[]` 유지 + canonical adapter 강화

- 설명: 현재처럼 legacy store를 SSOT로 두고, `legacyToCanonical()` projection과 resolver cache를 개선한다.
- 근거: 단기 구현량이 작고 기존 저장/스토어/Undo 경로 변경이 적다.
- 위험:
  - 기술: MED — adapter/renderer/store가 계속 양방향 의미 변환을 알아야 한다.
  - 성능: HIGH — 전체 문서 projection이 hot path로 재유입될 위험이 남는다.
  - 유지보수: HIGH — legacy field와 canonical field가 계속 공존한다.
  - 마이그레이션: LOW — destructive migration은 피할 수 있다.

### 대안 B: Pencil `.pen` schema 그대로 채택

- 설명: Composition 내부 저장 format을 Pencil primitive schema에 맞춘다.
- 근거: 외부 Pencil 호환성과 import/export 단순성이 가장 높다.
- 위험:
  - 기술: HIGH — Composition의 component/spec/RAC vocabulary와 primitive scenegraph가 충돌한다.
  - 성능: MED — primitive 변환 layer가 별도로 필요하다.
  - 유지보수: HIGH — Button/TextField/Section 같은 component semantics 손실을 adapter가 계속 복구해야 한다.
  - 마이그레이션: HIGH — 기존 component-centric 데이터의 의미 손실 위험이 크다.

### 대안 C: `CompositionDocument` canonical schema를 최종 SSOT로 전환

- 설명: Composition component vocabulary를 유지한 canonical document를 저장/편집/렌더의 최종 기준으로 승격한다. Pencil 구조 필드는 정합하게 유지하고, Pencil primitive와 app behavior는 adapter/extension으로 분리한다.
- 근거: ADR-903/910/911/913의 실제 전환 방향과 일치하고, format 변경의 목적을 완료 상태까지 밀어붙인다.
- 위험:
  - 기술: MED — canonical document mutation API, history, persistence, preview bridge를 재정렬해야 한다.
  - 성능: LOW — cutover 후 hot path의 legacy projection 제거가 가능하다.
  - 유지보수: LOW — document/source model이 하나로 줄어든다.
  - 마이그레이션: HIGH — 저장/편집/history/preview/publish 경계 전환 범위가 크다.

### Risk Threshold Check

| 대안 | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ---- | ---- | ---- | -------- | ------------ | :--------: |
| A    | MED  | HIGH | HIGH     | LOW          |     2      |
| B    | HIGH | MED  | HIGH     | HIGH         |     3      |
| C    | MED  | LOW  | LOW      | HIGH         |     1      |

대안 C도 migration HIGH가 남지만, 이 위험은 단계별 shadow write/read gate로 관리 가능하다. 대안 A는 현재 문제를 고착시키고, 대안 B는 Composition의 component model을 손상시킨다.

## Decision

**대안 C: `CompositionDocument` canonical schema를 최종 SSOT로 전환**을 선택한다.

선택 근거:

1. format 변경의 목적이 reusable/ref/descendants/slot/frame을 문서 문법으로 승격하는 것이므로, 최종 기준도 문서-네이티브 schema여야 한다.
2. legacy `elements[]`를 최종 SSOT로 두면 `layout_id`, `slot_name`, `componentRole`, `masterId`를 계속 canonical 의미로 변환/역해석해야 한다.
3. Pencil 구조 정합은 유지하되 Pencil primitive schema를 그대로 채택하지 않아야 Composition의 React Aria/Spectrum + Spec component model을 보존할 수 있다.
4. 성능 문제의 근본 처리는 adapter cache가 아니라 hot path에서 legacy projection 자체를 제거하는 것이다.

기각 사유:

- **대안 A 기각**: migration 완충책으로는 유효하지만 최종 구조가 되면 현재 hybrid 비용과 의미 충돌을 영구화한다.
- **대안 B 기각**: Pencil 호환성은 높지만 Composition의 component-centric schema와 충돌한다.

### ADR fork checkpoint (4 질문 lock-in)

`adr-writing.md` §"ADR Fork / 분리 결정 시 framing checkpoint" 의무에 따라, 본 ADR fork 시점에 4 질문을 명시적으로 통과 후 Phase 진입한다.

1. **base / 응용 분류**: 본 ADR (ADR-916) = canonical SSOT 추상 base. ADR-911 (frame-bundled preset 편의 확장) / ADR-913 (`tag → type` rename + hybrid 6 cleanup) / ADR-914 (imports resolver, Superseded) = 응용 specialization. base 가 응용의 prerequisite.
2. **schema 직교성**: canonical core (`children`/`type`/`props`/`reusable`/`ref`/`descendants`/`slot`/`frame`/`themes`/`variables`/`imports`) ⊥ Composition extension (`x-composition.events`/`actions`/`dataBinding`/`editor`) ⊥ legacy adapter (`layout_id`/`slot_name`/`componentRole`/`masterId`/legacy `overrides`/`metadata.legacyProps`) ⊥ Pencil primitive schema. 4 영역 모두 직교.
3. **baseline framing reverse 검증**: ADR-903 의 "canonical = read-through projection" framing 을 본 ADR 이 "canonical = primary SSOT" 로 reverse 한다. 이 reverse 가 valid 한 사유 — (a) ADR-903 의 read-through 는 format 도입을 위한 transition bridge 였고, hot path projection 영구화 의도가 아님 (R2 직접 명시). (b) ADR-910/911/912/913 가 ADR-903 위에 차곡차곡 쌓이면서 canonical document 가 이미 사실상 운영 SSOT 로 성장. legacy `elements[]` 가 SSOT 로 남으면 hybrid 비용이 영구화 (대안 A 기각 사유와 동일). (c) ADR-903 자체의 final cutover gate 가 미정의 상태로 남아 본 ADR 이 그 closure ADR. 따라서 reverse 는 base ADR 의 의도된 후속 결정이며, ADR-903 framing 의 위반이 아닌 완성.
4. **codex 3차까지 미루지 말 것**: framing #3 reverse 정당화는 본 §Decision 시점 lock-in. Phase 0 G1 land 와 동시에 codex 1차 review 진입. 본문 정합 (Risk/Gate 매핑) 은 codex round 에 위임하되, framing reverse 의 valid 성은 본 시점 본문에 명문화한다.

> 구현 상세: [916-canonical-document-ssot-transition-breakdown.md](design/916-canonical-document-ssot-transition-breakdown.md)

## Risks

| ID  | 위험                                                                                                         | 심각도 | 대응                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------ | :----: | ------------------------------------------------------------------------------------------------------------- |
| R1  | canonical document mutation API가 저장/history/undo 경계를 한 번에 바꾸면서 데이터 손실을 만들 수 있음       |  HIGH  | Phase 1은 API + unit test까지만 진행하고, Phase 3에서 shadow write + backup + roundtrip diff 후 write-through |
| R2  | `legacyToCanonical()` 또는 `selectCanonicalDocument()`가 drag/selection/render hot path에 계속 남을 수 있음  |  HIGH  | G3에 hot path projection 0건 grep gate를 두고, cold path/adapter-only 예외를 파일 경로로 제한                 |
| R3  | `events`/`dataBinding`/`actions`가 canonical core에 섞여 Pencil-compatible 구조 경계를 흐릴 수 있음          |  MED   | `x-composition` extension namespace를 먼저 고정하고, function callback serialize를 금지                       |
| R4  | ADR-911/913/914가 각자 cleanup을 진행하면서 최종 cutover 기준이 다시 흩어질 수 있음                          |  HIGH  | ADR-916 G5를 상위 closure gate로 두고 README row와 각 ADR phase 상태를 동시 갱신                              |
| R5  | legacy field quarantine이 과도하게 빨리 진행되어 기존 프로젝트 read-through가 깨질 수 있음                   |  HIGH  | adapter-only read-through와 migration marker를 유지하고, destructive migration 없이 shadow 검증 후 제거       |
| R6  | canonical primary 전환 후 Skia/Preview/Publish 중 한 경로만 다른 tree를 소비할 수 있음                       |  MED   | G6에서 3경로 parity matrix와 history/slot/ref 시나리오를 함께 검증                                            |
| R7  | component props가 `metadata.legacyProps`에 계속 남아 canonical document가 사실상 legacy wrapper가 될 수 있음 |  HIGH  | G1에서 `CanonicalNode.props`를 shared type에 추가하고, `metadata.legacyProps`는 adapter-only로 제한           |

## Gates

| Gate                          | 시점    | 통과 조건                                                                                                                            | 실패 시 대안                    |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| G1: Schema Boundary Freeze    | Phase 0 | canonical core, `CanonicalNode.props`, Composition extension, legacy adapter field 분류표가 타입/문서에 고정됨                       | Phase 1 진입 보류               |
| G2: Canonical Store/API       | Phase 1 | `CompositionDocument` read/write/mutation API와 canonical -> legacy export adapter API가 `elements[]` 직접 mutation 없이 테스트 가능 | adapter write-through 유지      |
| G3: Hot Path Cutover          | Phase 2 | drag/selection/render/LayerTree/Preview sync 경로에서 full `legacyToCanonical()` 호출 0건                                            | 해당 경로 flag rollback         |
| G4: Persistence Write-Through | Phase 3 | 신규 저장은 canonical document 우선, legacy 저장은 adapter/shadow로만 유지                                                           | read-through only 연장          |
| G5: Legacy Field Quarantine   | Phase 4 | `layout_id`, `slot_name`, `componentRole`, `masterId`, legacy `overrides/descendants`가 adapter 디렉터리 밖 runtime read/write 0건   | 필드별 cleanup sub-phase 재분리 |
| G6: Runtime Parity            | Phase 5 | Skia/Preview/Publish/History/Undo/Redo/slot fill/ref detach 샘플 회귀 0건                                                            | cutover 보류, shadow mode 유지  |
| G7: Extension Boundary        | Phase 5 | `events`, `actions`, `dataBinding`이 canonical core가 아닌 namespaced Composition extension으로만 serialize됨                        | extension schema 보강           |

## Consequences

### Positive

- document/source model의 최종 기준이 명확해진다.
- Pencil식 `frame/ref/descendants/slot` 구조와 Composition component vocabulary를 동시에 유지한다.
- legacy-to-canonical projection 비용을 hot path에서 제거할 수 있다.
- slot fill, detach, override reset, origin/ref 관계를 schema 기준으로 판단할 수 있다.
- import/export adapter와 내부 저장 format 경계가 분리된다.

### Negative

- 저장, history, preview bridge, renderer input, LayerTree, properties panel까지 전환 범위가 넓다.
- 전환 기간에는 canonical document와 legacy adapter가 계속 병행된다.
- ADR-911/913/914의 잔여 phase와 의존 관계를 다시 정렬해야 한다.
- extension namespace를 확정하기 전까지 events/dataBinding schema를 성급히 core에 넣을 수 없다.

## References

- [ADR-903: ref/descendants + slot 기본 composition 포맷 전환 계획](completed/903-ref-descendants-slot-composition-format-migration-plan.md)
- [ADR-910: Canonical `themes`/`variables` 필드 Land Plan](completed/910-canonical-themes-variables-land-plan.md)
- [ADR-911: Layout/Slot Frameset 완전 재설계](911-layout-frameset-pencil-redesign.md)
- [ADR-912: Editing Semantics UI 6요소 + Slot section base](completed/912-editing-semantics-ui-5elements.md)
- [ADR-913: `Element.tag -> Element.type` rename + hybrid 6 필드 cleanup](913-tag-type-rename-hybrid-cleanup.md)
- [ADR-914: `imports` resolver + DesignKit 통합](completed/914-imports-resolver-designkit-integration.md) — Superseded; 잔여 `imports` resolver/cache scope 는 본 ADR 이 흡수
- [`CompositionDocument` 타입](../../packages/shared/src/types/composition-document.types.ts)
- [Legacy `Element` 타입](../../apps/builder/src/types/builder/unified.types.ts)
- [Legacy -> canonical adapter](../../apps/builder/src/adapters/canonical/index.ts)
- [Pencil copy clean-room mapping](../pencil-copy/composition-mapping.md)
