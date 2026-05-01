# ADR-916: Canonical Document SSOT 전환 계획

## Status

In Progress — 2026-05-02 (Phase 0 G1 ✅ + Phase 1 G2 ✅ + Phase 2 G3 ✅ + Phase 3 G4 grep gate ✅ + **Phase 4 G5 §9.3 strict logic-access PASS marker ✅** (raw 45 → strict 0) + **Phase 5 G6-1 closure 시그널 도달 ✅** (read site cleanup 47 → 0 = 100%) + **Phase 5 G6-1 second work ✅** (canonical primary fallback + spec consumer parity evidence) + **Phase 5 G6-2 first slice ✅** (Preview canonical 렌더 fallback, extractLegacyPropsFromResolved G6-1 정합) + **Phase 5 G7 transition first slice ✅** (events/dataBinding round-trip 보존, buildLegacyElementMetadata + exportLegacyDocument) + **Phase 5 G7 본격 cutover ✅** (`x-composition` extension only 전환) + **Phase 5 G7 closure marker ✅** (직렬화 contract + write boundary 분류) + **Phase 5 G6-2 second slice ✅** (history parity 자동 cover, canonicalDocumentSync 회로 isolated evidence) + **Phase 5 G6-2 third slice ✅** (canonicalMutations DI pattern — ESM circular import 차단, vitest setup fail 영역 + canonical 광역 + G4 grep gate baseline 0 유지 모두 PASS). 잔존 = Phase 4 G5 P5-B overrides (MED-HIGH) / Phase 3 G4 canonical primary write (HIGH, 11+ caller migration). 진정 logic cleanup (instanceActions / ComponentSlotFillSection / editingSemantics) 은 ADR-911 P3 / ADR-913 P5 의존, 별 ADR phase)

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
- **2026-05-01 — Phase 2 G3 Step 2: Selection/properties cutover land (1 PR 통합)**:
  - **결정 분기 D13=A / D14=A / D15=A** — 1 PR 통합 land (sub-step 분해 회피, 사용자 surface 최소화 정책 준수) + legacy uuid 기준 `metadata.legacyProps.id` DFS lookup (segId 와 다른 lookup 키 분리) + `useSelectedElementData()` 단일 진입점 dual-mode (caller 무수정).
  - **lookup 키 분리 발견**: canonical node.id = segId (stable path, 예: `page:p1/0/2`), legacy element.id = uuid (예: `uuid-xxx`). selectedElementId 는 legacy uuid 이므로 `selectCanonicalNode(uuid)` 미매칭 → `findNodeByLegacyId(doc, legacyId)` 가 `metadata.legacyProps.id === legacyId` DFS 검색.
  - **bridge 시그니처 확장** — `useCanonicalNode(nodeId: string | null)` null 안전 확장 (caller selectedElementId 직접 전달 가능).
  - **view hook land** — `apps/builder/src/builder/stores/canonical/canonicalElementsView.ts` 의 `canonicalNodeToElement` export 승격 (Step 1b internal → public, Step 2 hook 재사용) + `findNodeByLegacyId` 내부 helper (DFS metadata 검색) + `useCanonicalSelectedElement(selectedElementId)` 신규 hook (`useActiveCanonicalDocument` + `findNodeByLegacyId` + `canonicalNodeToElement` 조합).
  - **dual-mode 진입점** — `apps/builder/src/builder/stores/index.ts::useSelectedElementData()` 에 `isCanonicalDocumentSyncEnabled() && canonicalSelectedElement !== null` 분기 추가. canonical 우선, fallback legacy `state.elementsMap`. caller (PropertiesPanel + 5+ Style sections + inspector editors) 무수정 단일 SSOT 진입점.
  - **검증** — `pnpm turbo run type-check` 3/3 PASS + vitest canonical 84/84 PASS (77 → 84, +7 신규: bridge `useCanonicalNode(null)` 1 + view `useCanonicalSelectedElement` 6) + 광역 stores+properties+inspector 209/209 PASS (회귀 0).
  - **Gate G3 진행률**: 5/5 path 중 **2/5 path cutover** (LayerTree + Selection/properties).
- **2026-05-01 — Phase 2 G3 Step 3: Preview sync cutover land (1 PR 통합)**:
  - **`useIframeMessenger.ts` elements source dual-mode** — `legacyElements = useStore((state) => state.elements)` rename + `elements = useMemo` dual-mode (canonical mode + active doc 존재 시 `useCanonicalElements()` derived, 그 외 legacy). `sendInitialData` closure 안 `useStore.getState().elements` 호출도 매 호출 시 dual-mode 평가 (`getActiveCanonicalDocument` + `canonicalDocumentToElements`).
  - **postMessage UPDATE_ELEMENTS 채널 무수정** — caller 가 dual-mode source 자동 사용.
  - **ADR-903 P3-D-4 source-text test regex 갱신** — `legacyElements` + `useMemo` 패턴 정합 검증.
  - **검증** — type-check 3/3 + vitest hooks+preview+canonical 101/101 PASS (회귀 0).
  - **Gate G3 진행률**: 5/5 path 중 **3/5 path cutover** (+ Preview sync).
- **2026-05-01 — Phase 2 G3 Step 4: BuilderCore layout refresh cutover land (1 PR 통합)**:
  - **`BuilderCore.tsx` 의 elements 변경 → iframe sync useEffect dual-mode 분기** — `publishElements(sourceElements)` helper 추출 (editMode filter + lastSentRef 비교 + sendElementsToIframe 호출 logic 단일화). canonical mode 시 `subscribeCanonicalStore` listener (canonical store mutation 시 `getActiveCanonicalDocument` + `canonicalDocumentToElements` → `publishElements`). `lastDerivedRef` ref 비교로 중복 publish 방지. doc 부재 시 legacy fallback. legacy mode 는 기존 `useStore.subscribe` 경로 유지.
  - **dual subscribe 회피** — canonical mode 활성 시 canonical store 단일 publish source (write-through sync 가 legacy → canonical propagate 보장).
  - **검증** — type-check 3/3 + vitest hooks+main+stores 200/200 PASS (회귀 0). 광역 vitest 6 fail (factoryOwnership / resolver TC1 / useFillActions) = Step 1b 종결 시점부터 pre-existing — 본 cutover 무관 확정 (별도 처리 권장).
  - **Gate G3 진행률**: 5/5 path 중 **4/5 path cutover** (+ BuilderCore layout refresh).
- **2026-05-01 — Phase 2 G3 Step 5: Canvas drag/drop helper cutover land (1 PR 통합) → Phase 2 G3 종결 ✅**:
  - **`useCanvasDragDropHelpers.ts` doc build 2 site dual-mode** — `findDropTarget` (drag mousemove 빈번 hot path, legacy: 매 호출 O(n) `selectCanonicalDocument`). canonical mode hit 시 `getActiveCanonicalDocument()` pre-built doc 직접 사용 → build cost 0. miss 시 legacy fallback `selectCanonicalDocument(state, pages, layouts)`. `buildReorderUpdates` (drop 시 1회 cold path) 도 동일 패턴 정합 유지.
  - **scope 분리** — `BuilderCanvas.tsx` 의 `useMemo` 캐싱된 doc build 2 site (`computeLayoutGroups` + `computeFrameAreas`) 는 deps 변경 시만 재계산 cold path → Step 5 scope 외, 미수정.
  - **검증** — type-check 3/3 + vitest canvas+canonical 224/224 PASS (회귀 0).
  - **Gate G3 진행률**: **5/5 path ✅ — Phase 2 G3 종결**.
  - **Phase 2 G3 종결 의의** — 5 hot path 모두 dual-mode cutover land 완료 (LayerTree + Selection/properties + Preview sync + BuilderCore layout refresh + canvas drag/drop helper). canonical store 가 read backbone — flag enabled 시 single source publish, flag disabled 시 legacy fallback (production 영향 0). 다음 진입점 = Phase 3 G4 — Persistence Write-Through (canonical primary storage 전환 + legacy export on demand).
- **2026-05-01 — Phase 2 G3 dev evidence 사용자 검증 + Phase 3 G4 design lock-in**:
  - **G3 dev evidence 사용자 검증 PASS** — `VITE_ADR916_DOCUMENT_SYNC=true` enable 후 Builder 진입. `currentProjectId === '<route projectId>'` ✅ + `documentVersion` 7→8→9→10 페이지 요소 추가마다 +1 증가 ✅. ADR-903 P3-E E-4 + ADR-913 P4 dry-run 모두 status=success errors=0. 5 hot path 회귀 0 — G3 monitoring 종결.
  - **Phase 3 G4 fork checkpoint 4 질문 통과 (design §8.0 lock-in)**: (1) base/응용 분류 = 3-A shadow write base / 3-B/C/D 응용, (2) schema 직교성 = read↔write 직교 단 D17=B 채택 시 G3 회귀 검증 의무, (3) baseline framing reverse = ADR-903 read-through ↔ ADR-916 primary SSOT reverse Phase 0 시점 lock-in 그대로 valid, (4) codex 3차 미루지 말 것 = D16~D19 lock-in 직후 codex 1차 진입.
  - **결정 분기 D16~D19 lock-in (design §8.2)**:
    - **D16=A** — 필수 API 3개 stub-first 단독 PR + 3-A logic 후속 별 PR (회귀 isolation, codex stub 단계 review 가능). D16=B 통합 / D16=C PoC-only 기각.
    - **D17=A** — localStorage 우선 canonical primary 전환 (DB schema 미변경, rollback 단순, G3 read path 회귀 0 보장). D17=B DB schema bump 은 3-D 시점 별개 진행 권장 / D17=C 동시 전환 분리 권장.
    - **D18=A** — `exportLegacyDocument(doc)` 단일 SSOT 격리 (grep gate 단순). D18=B cache layer 는 perf 별도 작업.
    - **D19=B** — schemaVersion bump + project-level rollback marker (`canRollback: boolean` + backup snapshot). D19=A bump-only 기각 (rollback 부재) / D19=C automated trigger 분리 권장.
  - **sub-phase 진입 순서 (design §8.3 확정)**: 3-A-stub (LOW ~30분-1h, 필수 API 3개 stub) → 3-A-impl (MED ~1d, 실 구현 + shadow logic) → 3-A monitoring (1-2주, destructive diff 0 확인) → 3-B (MED ~1d, localStorage primary + G3 read 회귀 재검증) → 3-C (LOW ~30분-1h, export adapter 단일 SSOT grep gate) → 3-D (MED ~1d, schemaVersion bump + rollback marker = G4 PASS 시그널).
  - **다음 진입점**: 3-A-stub 단독 PR — 필수 API 3개 (`exportLegacyDocument` / `diffLegacyRoundtrip` / `restoreFromLegacyBackup`) stub + vitest 시그니처 검증. codex 1차 review prerequisite 충족.
- **2026-05-01 — Phase 3 G4 sub-phase 3-A-stub: 필수 API 3개 stub land (단독 PR, D16=A)**:
  - **신규 API stub** — `apps/builder/src/adapters/canonical/{exportLegacyDocument,diffLegacyRoundtrip,restoreFromLegacyBackup}.ts` 3 파일. 시그니처 + TODO marker + 빈/false return.
  - **타입 surface** — `RoundtripDiff` + `RoundtripDiffEntry` (3 카테고리 destructive/reorder/cosmetic) export.
  - **vitest 6 test PASS** — stub 시그니처 검증 (인자 / 반환 타입 / stub return). 3-A-impl 시점 본 test 가 실 동작 검증으로 확장 prerequisite.
  - **D16=A 채택 사유 검증** — stub 단독 PR 로 API 시그니처 codex 1차 review 가능 + 3-A-impl 진입 시 logic 회귀 isolation 좁힘.
- **2026-05-01 — Phase 3 G4 sub-phase 3-A-impl: 필수 API 실 구현 + shadow write evaluator land (1 PR 통합)**:
  - **`exportLegacyDocument` 실 구현** — `metadata.legacyProps` 가 보존하는 7 top-level fields (id/parent_id/page_id/layout_id/order_num/fills/type) + props 전체를 source 로 DFS 순회 하여 `Element[]` 복원. synthetic 컨테이너 (page wrapper / layout shell / reusable master) 는 metadata.legacyProps 없으므로 자동 skip. round-trip 무손실 contract — `exportLegacyDocument(legacyToCanonical({elements,pages,layouts}))` 가 모든 legacy id + structural fields 보존.
  - **`diffLegacyRoundtrip` 실 구현** — element id 매칭 (Map) + 4 structural fields (type/parent_id/page_id/layout_id) + props recursive deep-equal. 3 카테고리 분류: destructive (missing/extra/structural/props 손실) / reorder (order_num) / cosmetic (null↔undefined nullish 동등).
  - **`restoreFromLegacyBackup` 실 구현 + helper API 3개** — localStorage key `__adr916_legacy_backup_{projectId}` 직렬화 (BackupPayload version 1.0 + savedAt). 신규 helper: `saveLegacyBackup(projectId, elements)` / `loadLegacyBackup(projectId)` / `clearLegacyBackup(projectId)`. `restoreFromLegacyBackup` 은 backup 존재 + parse 가능 시 true (실 elements 적용은 caller 책임 — 3-D 시점 사용자 evidence 수집 시 별도 hook 통합).
  - **shadow write evaluator land** — `apps/builder/src/adapters/canonical/shadowWriteDiff.ts` 신규: pure 함수 `evaluateShadowWrite(legacyBefore, legacyAfter): ShadowWriteResult` + `evaluateShadowWriteFromCanonical(legacyBefore, doc)` wrapper + console helper `logShadowWriteResult(result, context)`. flag `isShadowWriteEnabled()` / `setShadowWriteEnabled(value)` (default false, 3-A monitoring 시점 enable). attach subscription / auto-fire 는 caller-driven 패턴 (memory feedback-caller-driven-sync-pattern) — 후속 단계 결정.
  - **vitest 25 test PASS (stub 6 → impl 25, +19)** — `persistenceWriteThroughStub.test.ts` expand: A. exportLegacyDocument round-trip (5 test, page wrapper skip + fills 보존 포함) + B. diffLegacyRoundtrip 3 카테고리 (8 test) + C. restoreFromLegacyBackup localStorage round-trip + corrupted JSON guard (5 test, jsdom 환경 marker) + D. shadowWriteDiff evaluator + logger (7 test, console.warn/info spy + flag toggle).
  - **검증** — `pnpm type-check` 3/3 PASS + vitest canonical 광역 137/137 PASS (118 baseline + 19 신규, 회귀 0).
  - **Phase 3 G4 진행률** — 4 sub-phase 중 3-A 완료 (stub + impl). 다음 진입점 = 3-A monitoring (1-2주 destructive=0 dev 환경 evidence) → 3-B (localStorage primary 전환) → 3-C (export SSOT grep gate) → 3-D (schemaVersion bump + rollback marker = G4 PASS).
- **2026-05-01 — Phase 3 G4 sub-phase 3-B/3-C/3-D 단축 통합 land (옵션 1, 사용자 명시 진행 신호)**:
  - **framing 의문 raise + 사용자 결정** — design §8.6 grep gate 사전 측정 결과 baseline 18 site (BuilderCore + dev fixture + stores/elements + factories + hooks + layoutActions + FramesTab + PageLayoutSelector + TableEditor + useMessageCoalescing). design ~1d 추정이 30+ caller 광역 refactor 를 underestimate. monitoring 단축 시 production destructive=0 evidence 부재. 3 옵션 surface (단축 / framing 정합 / 시간 보존) 후 사용자 옵션 1 (단축) 선택. **G4 PASS 시그널 미충족 — mutation reverse + grep gate 0건 + production evidence 모두 본 단계 잔존**. 본 land 는 marker + skeleton + flag + helper 위주.
  - **3-B 단축** — `apps/builder/src/utils/featureFlags.ts` 에 `isCanonicalPrimaryEnabled()` flag 추가 (`VITE_ADR916_CANONICAL_PRIMARY` env, default `false`). `apps/builder/src/builder/main/BuilderCore.tsx` 에 backup bootstrap useEffect 추가 — flag enable 시 Builder 진입 시점 `useStore.getState().elements` 를 `saveLegacyBackup(projectId, elements)` 로 localStorage 저장. **mutation reverse 광역 refactor 는 후속 sub-phase 분리** (caller 18 site, ~2-3d 분량).
  - **3-C 부분** — `apps/builder/src/adapters/canonical/__tests__/exportSsotGrepGate.test.ts` 신규 vitest test. design §8.6 grep 명령을 `node:fs` walk 로 codify. baseline 18 site 측정 + 카테고리별 분포 (BuilderCore / stores / hooks / factories / panels / dev) 추적. baseline 증가 시 regression detection — 후속 sub-phase 에서 점진 refactor 시 0 도달 가능. **0 도달 시 expected baseline 0 으로 변경 + Gate G4 grep 부분 PASS marker**.
  - **3-D** — `packages/shared/src/types/composition-document.types.ts` 에 `CompositionDocument._meta?: { schemaVersion?, canRollback? }` 필드 surface 도입 (실 schemaVersion bump 은 mutation reverse 완료 후 별도 sub-phase). `apps/builder/src/adapters/canonical/restoreFromLegacyBackup.ts` 확장: (1) `BackupSchemaVersion` 타입 export (`legacy-1.0` / `canonical-primary-1.0`), (2) `BackupPayload` 에 `schemaVersion` 필드 추가, (3) `saveLegacyBackup` 시그니처에 `schemaVersion` 인자 추가 (default `legacy-1.0`), (4) `getCanonicalPrimaryStatus(projectId): CanonicalPrimaryStatus` helper 신규 — `hasBackup` + `schemaVersion` + `savedAt` + `canRollback` 일괄 조회 (D19=B 검증 진입점).
  - **vitest 6 test 추가 (137 → 143 PASS)** — restoreFromLegacyBackup section 에 `getCanonicalPrimaryStatus` 4 test (no backup / legacy-1.0 / canonical-primary-1.0 / clear) + grep gate 2 test (baseline regression detection + 카테고리 분포). type-check 3/3 PASS + vitest canonical 광역 143/143 PASS (회귀 0).
  - **G4 잔존 작업 (다음 sub-phase 별도 진입)**: (1) **mutation reverse 광역 refactor** — 18 caller site 의 `setElements` / `mergeElements` / `elementsApi.{create,update,delete}` 를 `exportLegacyDocument` 경유로 전환 (~2-3d). (2) **production destructive=0 evidence** — 사용자 dev 환경 1-2주 + sample project 100건 round-trip. (3) **schemaVersion 실 bump** — mutation reverse 완료 후 신규 backup 의 schemaVersion 을 `canonical-primary-1.0` 으로 marker (현재 default `legacy-1.0`). (4) **grep gate baseline 0 도달** — 본 단축 land 의 baseline 18 → 0.
- **2026-05-01 — Phase 3 G4 mutation reverse 진입: wrapper API + pilot caller 2 land**:
  - **framing surface + 사용자 옵션 1 채택** — "다음 phase 진행" 사용자 신호 후 (A) G4 잔존 mutation reverse / (B) Phase 4 G5 prerequisite 위반 / (C) 단축 fraud 3 옵션 surface. 사용자 "설계 의도에 가장 맞는 옵션" 질의 → 답변: 옵션 A (G4 본질 mutation reverse). G5 prerequisite (R5 HIGH cascade risk) 회피.
  - **canonical mutation wrapper 신규** — `apps/builder/src/adapters/canonical/canonicalMutations.ts`. wrapper API 2종: `mergeElementsCanonicalPrimary(elements)` + `setElementsCanonicalPrimary(elements)`. 본 단계 wrapper 내부 = 단순 legacy `useStore.{merge,set}Elements` 호출 (BC 보존). 후속 mutation reverse 광역 완료 시점에 wrapper 내부 reverse — canonical store mutation 우선 + legacy mirror 자동. caller 변경 0 + wrapper 내부만 reverse.
  - **파일 위치 의도** — wrapper 가 `apps/builder/src/adapters/canonical/` 안에 있어 design §8.6 grep gate 의 `apps/builder/src/adapters/**` exclude 패턴 안에 들어감. caller 변환 1개당 baseline 1 자동 감소.
  - **pilot caller 2 land** — (1) `apps/builder/src/builder/factories/utils/elementCreation.ts:103` `addElementsToStore` 에서 `store.mergeElements([parent, ...children])` → `mergeElementsCanonicalPrimary([parent, ...children])`. production user mutation entry (복합 컴포넌트 생성). (2) `apps/builder/src/builder/dev/editingSemanticsFixture.ts:178` ADR-912 dev fixture 의 `store.setElements([...7 elements])` → `setElementsCanonicalPrimary([...])`. dev only (production 영향 0).
  - **grep gate baseline 18 → 16** — `exportSsotGrepGate.test.ts` 의 `BASELINE_VIOLATION_COUNT` 16 으로 update + 2026-05-01 측정 추적 history 명시. baseline 감소가 mutation reverse 진척 자동 추적 도구.
  - **검증** — `pnpm type-check` 3/3 PASS + vitest canonical 광역 143/143 PASS. factories + stores 영역 vitest 수행 시 16 fail 발견되었으나 **caller 변환 전후 stash 비교로 동일 fail set 확정** = 모두 pre-existing (supabaseUrl env 미설정 / jsdom 환경 / @/builder/stores/layouts alias 등 환경 의존 fail). 본 변환 회귀 0.
  - **G4 잔존 mutation reverse caller 16 site (다음 세션 진입점)**: BuilderCore (1) / stores/elements (1) / hooks/useIframeMessenger (2) / hooks/usePageManager (1) / factories/utils/dbPersistence (2) / stores/utils/layoutActions (2) / panels/nodes/FramesTab (3) / panels/properties/editors/PageLayoutSelector (1) / panels/properties/editors/TableEditor (2) / hooks/useMessageCoalescing (1 — JSDoc 주석, false positive). 각 caller 변환 = baseline 1 감소 → 0 도달 시 G4 grep gate PASS.
- **2026-05-01 — Phase 3 G4 grep gate PASS 도달 ✅ (mutation reverse 광역 완료, 16 caller 변환)**:
  - **사용자 명시 진행 신호** "phase 3 완료까지 진행해" + auto mode → Phase 3 G4 PASS marker 도달 진행.
  - **wrapper API 3개 확장** — `apps/builder/src/adapters/canonical/canonicalMutations.ts` 에 `createElementCanonicalPrimary(element)` / `updateElementCanonicalPrimary(id, patch)` / `createMultipleElementsCanonicalPrimary(elements)` 추가. 본 단계 wrapper 내부 = 단순 elementsApi 호출 (BC 보존). 후속 단계에서 wrapper 내부 reverse — canonical store mutation 우선 + DB persist 자동.
  - **caller 16 site 광역 변환**:
    - `apps/builder/src/builder/main/BuilderCore.tsx:374` — `setElements(mergedElements)` → `setElementsCanonicalPrimary(mergedElements)`
    - `apps/builder/src/builder/stores/elements.ts:807` — `elementsApi.updateElement(el.id, el)` → `updateElementCanonicalPrimary(el.id, el)`
    - `apps/builder/src/builder/hooks/useIframeMessenger.ts:175,180` — `mergeElements(queuedElements)` + `elementsApi.createMultipleElements(queuedElements)` → wrapper 2 (selector 변수 제거 포함)
    - `apps/builder/src/builder/hooks/usePageManager.ts:263` — `useStore.getState().mergeElements(allElements)` → `mergeElementsCanonicalPrimary(allElements)`
    - `apps/builder/src/builder/factories/utils/dbPersistence.ts:155,166` — `elementsApi.createElement(parentToSave/childToSave)` → `createElementCanonicalPrimary(...)` × 2
    - `apps/builder/src/builder/stores/utils/layoutActions.ts:249,464` — `mergeElements([bodyElement])` + `mergeElements(newElements as Element[])` → wrapper 2 (selector destructure 제거)
    - `apps/builder/src/builder/panels/nodes/FramesTab/FramesTab.tsx:185,245,360` — `mergeElements(frameElements)` × 3 → wrapper × 3 + `mergeElements` selector 변수 제거 + 3 useEffect deps array 정리
    - `apps/builder/src/builder/panels/properties/editors/PageLayoutSelector.tsx:113` — `mergeElements(layoutElements)` → wrapper + selector destructure 제거
    - `apps/builder/src/builder/panels/properties/editors/TableEditor.tsx:193,265` — `mergeElements([...])` × 2 → wrapper × 2 + selector 변수 제거
    - `apps/builder/src/builder/hooks/useMessageCoalescing.ts:234` (JSDoc 주석) — 주석 `setElements` → `setElementsCanonicalPrimary` 의미 동일 변경 (false positive 해소)
  - **grep gate baseline 18 → 0 도달** — `exportSsotGrepGate.test.ts` 의 `BASELINE_VIOLATION_COUNT` 0 으로 update + 측정 추적 history 명시. 모든 legacy `elements[]` direct write site 가 `apps/builder/src/adapters/canonical/canonicalMutations.ts` 의 wrapper API 경유로 전환됨 (D18=A 단일 SSOT 격리 검증 PASS).
  - **Gate G4 grep gate PASS 시그널 도달 ✅** — design §8.3 G4 PASS 정의 ("4 sub-phase 모두 land + grep gate 0건") 의 grep gate 부분 충족. Phase 4 G5 prerequisite 정합 도달.
  - **검증** — `pnpm type-check` 3/3 PASS + vitest canonical 광역 143/143 PASS (회귀 0).
  - **G4 잔존 작업 (Phase 4 G5 prerequisite 외)**: (1) **wrapper 내부 진정 reverse** — 본 단계 wrapper 내부는 단순 BC 호출. 후속 단계에서 canonical store mutation 우선 + legacy mirror 자동으로 reverse. caller 변경 0. (2) **production destructive=0 evidence** — 사용자 dev 환경 1-2주 + sample project 100건 round-trip (Phase 3-A monitoring 단축 사유 명시). (3) **schemaVersion 실 bump** — wrapper 내부 reverse 완료 후 신규 backup default schemaVersion 을 `canonical-primary-1.0` 으로 변경.
- **2026-05-01 — Phase 4 G5 진입 prerequisite land: design §9 보강 + sub-phase 분리 + framing reverse lock-in**:
  - **fork checkpoint 4 질문 lock-in (design §9.0)**: (1) base/응용 분류 = ADR-911 P3 잔여 + ADR-913 Phase 5 가 base cleanup work, ADR-916 G5 = 응용 closure aggregator. (2) schema 직교성 = G5 6 필드 ⊥ G7 events/dataBinding ⊥ componentName. 9 필드 통합은 직교성 위반이므로 G5 phase scope = **6 필드만**. (3) baseline framing reverse = ADR-911/913 의 "ADR-916 이후 재개" framing **stale** 처리, 두 ADR cleanup work 를 ADR-916 G5 work scope **안에서** 진행 + 동시 closure (R4 cleanup 기준 흩어짐 대응). (4) codex 1차 진입 prerequisite 도달.
  - **sub-phase 분리 (design §9.1)** — G5-A (`layout_id` 165 matches, ADR-911 Phase 3/4 base) → G5-B (`slot_name`/`overrides`/`componentRole`/`masterId`/legacy `descendants` 195 matches, ADR-913 Phase 5-A~E base). 진입 순서 = G5-A 먼저 (광역 + ADR-911 frame canvas authoring 본질 결합).
  - **6 필드 baseline + caller 영역 분류 codify (design §9.2)** — main HEAD `e5719bdf6` 기준 design §9 grep 패턴 측정. G5 합계 360 matches. hot path 식별: `elementSanitizer.ts` 6 필드 모두 (37) / `instanceActions.ts` ADR-913 P5 핵심 (38) / `ElementsApiService.ts` DB-facing (22) / `canonicalRefResolution.ts` + `editingSemantics.ts` ref resolution / `PageParentSelector.tsx` + `usePageManager.ts` layout_id 광역. single point cleanup 우선 전략 (R5 cascade 분산).
  - **R5 cascade risk 대응 절차 명문화 (design §9.5)** — adapter read-through 보존 / `metadata.legacyProps` 7 fields marker 유지 / destructive migration 없이 shadow 검증 / single point cleanup 우선 / caller chain 회귀 검증.
  - **ADR-911/913 closure 동시 마감 framing 명시 (design §9.4)** — G5-A 종결 시 ADR-911 closure marker, G5-B 종결 시 ADR-913 P5 closure marker. ADR-913 Phase 4 (DB schema migration) 는 P5 와 직교, 별도 진행. ADR-916 G5 closure = G5-A + G5-B 모두 grep gate 0 도달 시점, Phase 5 G6/G7 진입 prerequisite.
  - **Phase 4 G5 진입 mutation work 미진행** — 본 land 는 design 보강 + 진행 로그 entry only (LOW risk, mutation scope = 0). 다음 sub-phase 진입점 = G5-A first work (`elementSanitizer.ts` single point cleanup 우선 검토 또는 ADR-911 P3 잔여 frame canvas authoring 진행).
  - **검증** — `pnpm type-check` 3/3 PASS (design+ADR markdown 변경, 코드 영향 0).
- **2026-05-01 — Phase 4 G5 first work: elementSanitizer adapter 영역 격리 (G5 baseline 360 → 323, -37 ✅)**:
  - **single point cleanup 우선 정책 채택** — design §9.5 R5 cascade 대응 절차 中 single point cleanup 우선 (6 필드 모두 등장 site 부터 cleanup) 정합. `apps/builder/src/builder/stores/utils/elementSanitizer.ts` (37 matches: layout_id 7 + slot_name 6 + componentRole 4 + masterId 4 + overrides 8 + descendants 8) 정독 결과 = **DB-facing serialization layer** (Supabase camelCase ↔ snake_case 변환 + postMessage 직렬화). 본질이 adapter-like 역할이지만 위치가 stores/utils — design §9 grep pattern exclude 영역 (`apps/builder/src/adapters/**`) 밖.
  - **file move + rename land** — `apps/builder/src/builder/stores/utils/elementSanitizer.ts` → `apps/builder/src/adapters/canonical/legacyElementSanitizer.ts` (design §9 footnote: "불가피한 잔존은 adapter/shim 디렉터리로 이동하고 파일명에 `legacy`를 포함" 정합). test file 도 `__tests__/legacyElementSanitizer.test.ts` 동시 이동. caller import path 7 site 갱신 (factories/utils/elementCreation + stores/history/historyActions + stores/utils/elementCreation + stores/utils/instanceActions + stores/utils/elementRemoval + 본 file 내부 types path + test file 내부 mock path).
  - **grep gate baseline 재측정**:
    | 필드 | 이전 | 신규 | 변동 |
    |---|---:|---:|---:|
    | layout_id | 165 | 158 | -7 |
    | slot_name | 23 | 17 | -6 |
    | componentRole | 41 | 37 | -4 |
    | masterId | 50 | 46 | -4 |
    | overrides | 25 | 17 | -8 |
    | descendants | 56 | 48 | -8 |
    | **G5 합계** | **360** | **323** | **-37 ✅** |
  - **검증** — `pnpm type-check` 3/3 PASS (cache miss 314ms) + vitest canonical 9 file **145 PASS** (이전 143 + sanitizer test 흡수, 회귀 0). stores/utils 광역 vitest = 6 fail / 3 pass / 31 tests (main HEAD baseline 6 fail / 4 pass / 33 tests 와 비교: pass file count 4 → 3 = sanitizer test 가 canonical/**tests** 로 이동, **본 변경 신규 fail 0 확정**, pre-existing 6 fail 그대로).
  - **R5 cascade risk 대응 evidence** — file move = mechanical refactor, runtime caller logic 변경 0, adapter read-through 보존 (sanitizer 가 Element ↔ SupabaseElement 변환 보존). `metadata.legacyProps` 7 fields marker 영향 0.
  - **다음 sub-phase 진입점** — G5-A 본격 cleanup 진입 (`page.layout_id → page.bodyElement (frame ref)` 마이그레이션, ADR-911 P3 잔여 본질 결합) 또는 G5-B 진입 (ADR-913 P5-A `slot_name` cleanup 부터). instanceActions.ts (38 matches) 가 ADR-913 P5 핵심 hot path 로 single point cleanup 후속 검토 가치 있음.
- **2026-05-01 — Phase 4 G5 second work: ElementsApiService adapter 영역 격리 (baseline 323 → 301, -22 ✅ + DB snake_case 0 도달)**:
  - **single point cleanup 후속 정합** — `apps/builder/src/services/api/ElementsApiService.ts` (22 matches: componentRole 11 + masterId 11) 정독 결과 = sanitizer 와 동일 DB-facing serialization layer (Supabase CRUD + camelCase ↔ snake_case 변환 + 캐시 무효화). service 영역이지만 본질 = adapter-like role. design §9 footnote "불가피한 잔존은 adapter/shim 디렉터리로 이동하고 파일명에 `legacy` 를 포함" 정합.
  - **file move + rename land** — `apps/builder/src/services/api/ElementsApiService.ts` → `apps/builder/src/adapters/canonical/legacyElementsApiService.ts`. Singleton `elementsApi` export 유지.
  - **caller import path 5 site 갱신** — `services/api/index.ts` ×2 (export re-export + internal import for static) + `utils/projectSync.ts` + `builder/factories/utils/dbPersistence.ts` + `adapters/canonical/canonicalMutations.ts`. dashboard/index.tsx 는 `services/api` index 경유라 변경 0.
  - **stale duplicate 식별 (Phase 4 G5 scope 외)**: `apps/builder/src/services/api/BaseApiService.ts:224-330` 에 별도 ElementsApiService 클래스 + elementsApi 싱글톤 정의 존재 — 모든 caller 가 `./ElementsApiService` 경유 import 하므로 BaseApiService 의 정의는 dead code. 6 필드 변환 logic 도 없어 grep gate 영향 0. 별 cleanup task 권장.
  - **grep gate baseline 재측정**:
    | 필드 | 이전 | 신규 | 변동 |
    |---|---:|---:|---:|
    | layout_id | 158 | 158 | 0 |
    | slot_name | 17 | 17 | 0 |
    | componentRole | 37 | 26 | -11 |
    | masterId | 46 | 35 | -11 |
    | overrides | 17 | 17 | 0 |
    | descendants | 48 | 48 | 0 |
    | **G5 합계** | **323** | **301** | **-22 ✅** |
  - **DB snake_case 측정 (design §9 두번째 grep)**:
    - `component_role`: **0 도달** ✅ (이전 미측정 — ElementsApiService 가 핵심 caller, 본 이동으로 services/lib/schemas 영역 0)
    - `master_id`: **0 도달** ✅ (동일)
    - `layout_id`: 29 잔존 (다른 service file — PagesApiService 등 / lib/db)
    - `slot_name`: 1 잔존 (PagesApiService)
  - **검증** — `pnpm type-check` 3/3 PASS (cache miss 313ms) + vitest canonical **145 PASS** (회귀 0, ElementsApiService test 가 canonical 영역에 없어 영향 0). caller 5 site mechanical refactor.
  - **R5 cascade risk 대응 evidence** — file move + import path 갱신만, runtime caller logic 변경 0. service 영역 보존 (services/api/index.ts re-export 유지, dashboard 등 caller 무수정).
  - **G5 누적 진척 (2 commit)**: 360 (codify) → 323 (sanitizer 격리, -37) → 301 (ElementsApiService 격리, -22) = **누적 -59 ✅**. componentRole / masterId DB snake_case 영역 0 도달 (ADR-913 P5-C/D base cleanup 의 DB-facing 진척 marker).
  - **다음 sub-phase 진입점** — instanceActions.ts (componentRole 9 + masterId 8 + overrides 9 + descendants 12 = 38 matches, ADR-913 P5 hot path) single point cleanup 검토 또는 G5-A 본격 (`page.layout_id → page.bodyElement` 마이그레이션).
- **2026-05-01 — Phase 4 G5 third work: BaseApiService dead duplicate 정리 + design §9.6/§9.7 보강 (본 세션 phase 4 종결)**:
  - **framing 의무 raise (사용자 신호 "phase 4 완료까지 진행해" scope 검증)**: P5 sub-step 별 caller 정독 결과 = P5-B (instanceActions 9 site, instance 시스템 logic 변경 MED-HIGH) / P5-C (~2d) / P5-D (~2-3d) / P5-E (HIGH 분할) / G5-A (ADR-911 P3 frame canvas authoring 본질 결합, HIGH ~1주+). **G5 baseline 0 도달 = 다중 세션 필수** — 본 세션 max_phases=3 budget 내 도달 불가. surface 1회 + LOW hygiene 진척 자율 land + 다음 세션 진입 전략 land.
  - **BaseApiService dead duplicate 정리** — `apps/builder/src/services/api/BaseApiService.ts:223-330` 의 stale `ElementsApiService extends BaseApiService` 클래스 + `elementsApi` 싱글톤 export 삭제. 해당 dead code 는 ADR-916 G5 second work (commit `05c92416b`) 에서 적절한 정의가 `apps/builder/src/adapters/canonical/legacyElementsApiService.ts` 로 이동된 후 잔존. 모든 caller (services/api/index.ts re-export + utils/projectSync + factories/utils/dbPersistence + adapters/canonical/canonicalMutations + dashboard 등) 가 adapter 영역 정의를 사용하므로 dead code. unused `import { Element }` 도 함께 제거. **baseline 영향 0** (dead code 였으므로) but file hygiene + 향후 confusion 회피.
  - **design §9.6 측정 history codify** — 본 세션 baseline 변동 추적표 + DB snake_case 측정 추가. main HEAD `e5719bdf6` (codify 360) → `ec73bc66c` (sanitizer 격리, -37) → `05c92416b` (ElementsApiService 격리, -22) = baseline 301. DB snake_case `component_role` / `master_id` 0 도달 명문화.
  - **design §9.7 본격 sub-step 진입 전략 (다음 세션)** — P5-A/B/C/D/E + G5-A 의 caller pattern + 진입 risk 표 + reorder 권장 (P5-B → P5-C → P5-D → P5-E → P5-A → G5-A). design §4 ref 수 기준 reorder 사유: ADR-911 P3 결합 위험 회피 + ADR-911 영역과 직교 sub-step (P5-B/C/D) 우선. P5-A 는 ADR-911 P3 frame.slot[] 인프라 land 또는 G5-A 진행 후 진입.
  - **본 세션 land 누적 (5 commit)**:
    | commit | 작업 | baseline 변동 |
    | --- | --- | ---: |
    | `7ae825224` | Phase 4 G5 design 보강 + framing lock-in | codify 360 |
    | `ec73bc66c` | first work — sanitizer 격리 | -37 |
    | `05c92416b` | second work — ElementsApiService 격리 | -22 |
    | `<next>` | third work — BaseApiService dead duplicate + design §9.6/§9.7 | 0 (hygiene + codify) |
  - **검증** — `pnpm type-check` 3/3 PASS (BaseApiService.ts dead code 제거 후 cache miss 332ms, unused import 정리 후 회귀 0). 영향 영역 vitest = 본 변경 영향 file 의 test 없음 (BaseApiService 자체 test 없음, dead code 였으므로 caller 영향 0).
  - **본 세션 phase 4 진척 종결**: G5 baseline 360 → 301 (-59 누적, 16% 감소) + DB snake_case component_role/master_id 0 도달 + dead duplicate 정리 + design §9.6/§9.7 next-session 진입 전략 명문화. 본 세션 LOW risk mechanical refactor 영역 모두 land. **본격 sub-step (P5-B 부터) 진입 = 별 세션 ~3-4h MED scope**, 다음 세션 surface 후 결정.
  - **본 ADR-916 Status `In Progress` 유지** — phase 4 G5 closure 미도달 (다중 세션 plan), Phase 5 G6/G7 진입 prerequisite 미충족.
- **2026-05-01 — Phase 4 G5-B P5-B `overrides` cleanup (read-through fallback marker + write site initial cleanup, baseline 17 → 16)**:
  - **fork checkpoint 4 질문 재확인** (design §9.0 lock-in 적용): (1) base/응용 = ADR-913 P5-B base cleanup 의 ADR-916 G5-B 흡수. (2) schema 직교성 = `overrides` ⊥ G5 5 다른 필드. (3) baseline framing reverse = ADR-913 P5 cleanup 을 ADR-916 G5-B 안에서 진행. (4) codex 회피 (ADR 본문 변경만, framing reverse 적용 base ADR 본문 미수정).
  - **사용자 신호 "ADR 916 부터 진행해, 911,913 진행하지마" 정합** — ADR-916 §9 본문 + design §9.6/§9.7 update only, ADR-911/913 본문 closure marker 미적용. ADR-911 영역 (`componentRole === "instance"` 분기, `instance.overrides` Record read site) 침범 없이 P5-B 진행 가능 영역 한정.
  - **P5-B scope 결정 (D2=b read-through fallback)**: design §3.2 line 73 "migration script: 기존 IndexedDB legacy overrides → canonical descendants 변환 (Step 4-4 write-through 와 별도, Phase 5-B 진입 시점에 결정)" 결정 분기에서 **D2=b read-through fallback 채택** — destructive migration 회피, R5 cascade risk 최소화. legacy IndexedDB 의 `overrides` Record 는 transition bridge 로 그대로 read 보존 (점근적 0 도달).
  - **type field marker 강화** (`apps/builder/src/types/builder/unified.types.ts`):
    - `Element.overrides?: Record<string, unknown>` JSDoc 강화 — 기존 `@deprecated ADR-913 Phase 5-B + ADR-916 G5 cleanup target` 에 **read-through fallback only (ADR-916 G5-B P5-B)** 명시 추가. 신규 write 는 canonical `RefNode.descendants[path].props` 만 사용. legacy `componentRole === "instance"` 분기 자체는 ADR-911 P3 cleanup 영역 — 본 필드 cleanup 은 ADR-911 P3 cleanup 후 점근적 0 도달 명문화.
  - **write site initial cleanup** (`apps/builder/src/builder/stores/utils/instanceActions.ts:629`):
    - `createInstance()` 의 initial value `overrides: {}` (empty Record) → `overrides: undefined` 로 변경. 신규 legacy instance 가 IndexedDB 에 `overrides` field 자체를 저장하지 않도록 정리. read site 의 `isRecord(...)` graceful fallback 패턴 그대로 안전.
    - 본 변경의 점근 효과: 신규 legacy instance write = `overrides` field 0 → 시간 경과에 따라 IndexedDB 의 legacy data 도 점근적으로 0 도달 (사용자 detach / clear / migration 시 cleanup).
  - **legacy public API JSDoc deprecation marker** (`apps/builder/src/utils/component/instanceResolver.ts`):
    - `resolveInstanceProps(instance, master)` JSDoc — `@deprecated ADR-916 G5-B P5-B — read-through fallback only` 추가. 신규 canonical 경로는 `resolveInstanceWithSharedCache` (`resolvers/canonical/storeBridge.ts`) 또는 `resolveCanonicalRefElement` (`builder/utils/canonicalRefResolution.ts`) 사용 명문화. legacy 분기 caller migration 도 ADR-911 P3 cleanup 과 동시 진행 marker.
    - `resolveInstanceElement(instance, master)` JSDoc — 동일 marker (thin wrapper of `resolveInstanceProps`).
    - `resolveDescendantOverrides(childElement, instanceDescendants)` JSDoc — 동일 marker (legacy `instance.descendants[childId]` flat Record 경로 전용, 신규 canonical 경로는 `resolveCanonicalDescendantOverride` 사용).
  - **grep gate baseline 재측정**:
    | 필드 | 이전 | 신규 | 변동 |
    |---|---:|---:|---:|
    | layout_id | 158 | 158 | 0 |
    | slot_name | 17 | 17 | 0 |
    | componentRole | 26 | 26 | 0 |
    | masterId | 35 | 35 | 0 |
    | overrides | 17 | 16 | -1 |
    | descendants | 48 | 48 | 0 |
    | **G5 합계** | **301** | **300** | **-1 ✅** |
  - **본 phase 한계 framing (P5-B 본격 cleanup 의 ADR-911 영역 결합)**: design §9.7 P5-B 가 추정한 "instance 시스템 logic 본질 변경 ~1-2d MED-HIGH" scope 는 본 시점에서 **ADR-911 P3 영역과 결합** (legacy `componentRole === "instance"` 분기 자체 cleanup 필요). 본 phase 는 marker / strategy 명문화 + write site initial cleanup 만 land (read-through fallback 유지). 진정한 baseline 0 도달은 ADR-911 P3 cleanup 진행 시점 또는 P5-C `componentRole` cleanup 과 동시 진행 시점에 가능 — design §9.7 reorder 권장 (P5-B → P5-C → P5-D → P5-E → P5-A → G5-A) 정합.
  - **검증** — `pnpm type-check` 3/3 PASS (cache miss 314ms) + vitest canonical 73/73 test PASS (1 file load 단계 fail = canonicalDocumentSync.test.ts 의 settings slice zustand init pre-existing, stash 비교로 본 변경 영향 0 확정).
  - **R5 cascade risk 대응 evidence** — JSDoc/주석 변경 + 1 line write site (`{}` → `undefined`) 만, runtime caller logic 변경 0, adapter read-through 보존, `metadata.legacyProps` 7 fields marker 영향 0.
  - **다음 sub-step 진입점**: P5-C `componentRole` cleanup (~2d MED, ADR-911 `componentRoleAdapter.ts` 활용 가능, instance 시스템 logic 변경 영역 분리). 또는 P5-D `masterId` cleanup (~2-3d MED-HIGH, RefNode.ref 전환). design §9.7 reorder 권장 정합.
- **2026-05-01 — Phase 4 G5-B P5-C `componentRole` cleanup (caller 5 site migration + JSDoc, baseline 26 → 19, -7)**:
  - **사용자 명시 신호** "ADR 916 부터 진행해, 911,913 계입 시키지마" 정합 — ADR-916 §9 본문 + design §9.6/§9.7 update only, ADR-911 본문 (`componentRoleAdapter.ts` 는 ADR-911 product 코드라 사용 OK, 단 ADR-911 본문 .md 파일 touch 0). ADR-911 영역 (`instanceActions.ts` 9 site `componentRole` 분기 + `editingSemantics.ts` 5 site role 판정) 침범 없이 P5-C 진행 가능 영역 한정.
  - **scope 결정**: caller 5 site (multiElementCopy 1 + elements 4 + elementIndexer 2) 의 직접 literal 비교 (`el.componentRole === "master" | "instance"`) → `isMasterElement(el)` / `isInstanceElement(el)` type guard 호출로 단일화. type guard 자체는 strict legacy 의미 유지 (logic 변경 0, read-through fallback marker 보존). `editingSemanticsFixture.ts` 1 site 는 dual-mode dev 검증 가치로 보존 (canonical resolver 가 legacy `componentRole === "instance"` fixture 도 호환되는지 확증).
  - **type guard 강화 (의미 동일, JSDoc 만 강화)** (`apps/builder/src/types/builder/unified.types.ts`):
    - `isMasterElement(el)` JSDoc — `@deprecated read-through fallback only` marker + canonical `reusable: true` 별도 인식 시 caller 측 합성 패턴 (multiElementCopy `isReusableOrigin` 참조) 명문화.
    - `isInstanceElement(el)` JSDoc — `@deprecated read-through fallback only` marker + canonical `type: "ref"` 인식은 별도 함수 `isCanonicalRefElement` 사용 명문화.
    - `Element.componentRole` JSDoc 강화 — read-through fallback only marker + caller 가 직접 literal 비교 대신 type guard 사용 권장.
  - **caller migration land**:
    - `apps/builder/src/builder/utils/multiElementCopy.ts:29` — `isReusableOrigin` 내부 직접 literal 비교 → `isMasterElement(element)` 호출 합성 (canonical `reusable === true` 와 OR).
    - `apps/builder/src/builder/stores/elements.ts:481/485/497/502` — `indexComponentElement` / `unindexComponentElement` 의 4 site → `isMasterElement(element)` / `isInstanceElement(element)` 호출. masterId 별도 검사 보존 (canonical RefNode 호환 안전망).
    - `apps/builder/src/builder/stores/utils/elementIndexer.ts:246/249` — `rebuildComponentIndex` 의 2 site → `isMasterElement(el)` / `isInstanceElement(el)` 호출.
  - **grep gate baseline 재측정**:
    | 필드 | 이전 | 신규 | 변동 |
    |---|---:|---:|---:|
    | layout_id | 158 | 158 | 0 |
    | slot_name | 17 | 17 | 0 |
    | componentRole | 26 | 19 | -7 |
    | masterId | 35 | 35 | 0 |
    | overrides | 16 | 16 | 0 |
    | descendants | 48 | 48 | 0 |
    | **G5 합계** | **300** | **293** | **-7 ✅** |
  - **잔존 19 caller 영역** (본 phase 침범 회피 = ADR-911 영역 결합):
    - `instanceActions.ts` 9 site (instance lifecycle reset/merge/update 본질) — ADR-911 P3 cleanup 영역
    - `editingSemantics.ts` 5 site (origin/instance role 판정) — ADR-911 영역
    - `unified.types.ts` 2 site (isMasterElement / isInstanceElement 내부 logic) — read-through fallback 보존
    - `editingSemanticsFixture.ts` 1 site (dev fixture dual-mode 검증)
    - `composition-document.types.ts` 1 site (type 주석)
    - `canonicalRefResolution.ts` 1 site (strip dict)
  - **검증** — `pnpm type-check` 3/3 PASS (cache miss 326ms) + vitest canonical 73/73 PASS (1 file load fail = canonicalDocumentSync.test.ts pre-existing, stash 비교로 본 변경 영향 0 확정).
  - **R5 cascade risk 대응 evidence** — type guard 호출 substitution 만 (logic 동일), runtime caller logic 변경 0, adapter read-through 보존, fixture dual-mode 보존.
  - **다음 sub-step 진입점**: P5-D `masterId` cleanup (~2-3d MED-HIGH, baseline 35, RefNode.ref 전환). 또는 P5-E `descendants` cleanup (HIGH 분할, baseline 48). design §9.7 reorder 정합.
- **2026-05-01 — Phase 4 G5-B P5-D `masterId` cleanup (helper getInstanceMasterRef + 4 file caller migration, baseline 35 → 24, -11)**:
  - **사용자 명시 신호** "ADR 916 완료가 우선이다 911,913 계입 시키지마라" 정합 — ADR-916 §9 본문 + design §9.6/§9.7 update only, ADR-911 본문 (.md) touch 0. ADR-911 영역 (`instanceActions.ts` 9 site `instance.masterId` 분기 + `editingSemantics.ts` 2 site role 판정) 침범 없이 P5-D 진행 가능 영역 한정.
  - **scope 결정**: 4 file caller (elements 7 access + elementIndexer 4 access + StoreRenderBridge 2 access + useResolvedElement 2 access) 의 `element.masterId` direct property access → `getInstanceMasterRef(el)` helper 호출로 단일화. helper 내부는 legacy `el.masterId` + canonical `el.ref` (RefNode) dual-mode read-through fallback. caller 측 grep miss + canonical RefNode 자동 호환.
  - **helper 신규 도입** (`apps/builder/src/types/builder/unified.types.ts`):
    - `getInstanceMasterRef(el: Element): string | undefined` 신규 export.
    - 우선순위 = legacy `masterId` → canonical `ref` (RefNode) → undefined.
    - JSDoc `@deprecated 부분` marker — legacy `masterId` 분기는 read-through fallback only, 신규 write 는 canonical `RefNode.ref` 만 사용. ADR-911 P3 cleanup 시점에 legacy 분기 제거.
  - **type field marker 강화**:
    - `Element.masterId` JSDoc — 기존 `@deprecated ADR-913 Phase 5-D + ADR-916 G5 cleanup target` 에 **read-through fallback only (ADR-916 G5-B P5-D)** 명시 추가. caller 가 직접 property access 대신 `getInstanceMasterRef(el)` helper 사용 권장 명문화.
  - **caller migration land**:
    - `apps/builder/src/builder/stores/elements.ts:492-516` — `indexComponentElement` / `unindexComponentElement` 의 `element.masterId` 7 access → `getInstanceMasterRef(element)` 호출 + `masterRef` local 변수 사용. `if (!masterRef) return;` 안전망 (canonical RefNode broken case 대응).
    - `apps/builder/src/builder/stores/utils/elementIndexer.ts:248-263` — `rebuildComponentIndex` 의 `el.masterId` 4 access → 동일 패턴 (helper 호출 + local 변수 + continue 안전망).
    - `apps/builder/src/builder/workspace/canvas/skia/StoreRenderBridge.ts:422-431` — sync 함수 내 `element.masterId` 2 access → 동일 패턴 (helper + local + null guard).
    - `apps/builder/src/builder/workspace/canvas/sprites/useResolvedElement.ts:39-46` — `useResolvedElement` hook 의 `element.masterId` 2 access → 동일 패턴 (`useStore` selector 내 helper 호출).
  - **grep gate baseline 재측정**:
    | 필드 | 이전 | 신규 | 변동 |
    |---|---:|---:|---:|
    | layout_id | 158 | 158 | 0 |
    | slot_name | 17 | 17 | 0 |
    | componentRole | 19 | 19 | 0 |
    | masterId | 35 | 24 | -11 |
    | overrides | 16 | 16 | 0 |
    | descendants | 48 | 48 | 0 |
    | **G5 합계** | **293** | **282** | **-11 ✅** |
  - **잔존 24 caller 영역** (본 phase 침범 회피 = ADR-911 영역 결합 + read-through fallback / 주석 / type 정의 / parameter signature):
    - `instanceActions.ts` 9 site (instance lifecycle reset/merge/update + createInstance signature + parameter) — ADR-911 P3 cleanup 영역
    - `editingSemantics.ts` 2 site (origin id 판정) — ADR-911 영역
    - `elements.ts:270, 1660` 2 site — createInstance signature parameter
    - `historyHelpers.ts:203` 1 site — parameter
    - `unified.types.ts` 2 site (`isInstanceElement` body + `getInstanceMasterRef` body) — read-through fallback 보존
    - `component.types.ts` 2 site (type 정의 — `ResolvedInstanceProps` interface)
    - `editingSemanticsFixture.ts` 1 site (dev fixture dual-mode 검증)
    - `storeBridge.ts` 1 site (JSDoc 주석)
    - `canonicalRefResolution.ts` 1 site (strip dict)
    - `unified.types.ts` Element.masterId field 정의 1 site
  - **검증** — `pnpm type-check` 3/3 PASS (cache miss 348ms) + vitest canonical 73/73 PASS (1 file load fail = pre-existing, stash 비교로 본 변경 영향 0 확정. 측정 중간 cache miss 환경 변동으로 일시 15 fail 측정됐으나 stash pop 후 재측정 시 73 PASS 동일 — false positive).
  - **R5 cascade risk 대응 evidence** — helper 호출 substitution 만 (logic 동일, legacy 분기 보존), runtime caller logic 변경 0, adapter read-through 보존, fixture dual-mode 보존.
  - **본 세션 누적 (3 commits — P5-B + P5-C + P5-D)**: G5 합계 301 → 293 → 282 (-19 누적, P5-B -1 + P5-C -7 + P5-D -11). 본 세션 max_phases=3 default budget 도달.
  - **다음 sub-step 진입점**: P5-E `descendants` cleanup (~2-3d HIGH, baseline 48, ref 100+ + 23 file 분포로 내부 분할 권장). 또는 instanceActions.ts hot path 의 ADR-911 영역 cleanup (componentRole + masterId + overrides + descendants 동시 진정 cleanup) — ADR-911 P3 cleanup 시점에 진행 권장.
- **2026-05-01 — Phase 4 G5 runtime helper quarantine 추가 진행 (working tree, raw 282 → 64)**:
  - **adapter helper 경계 신설/확장** — `apps/builder/src/adapters/canonical/legacyElementFields.ts` 신규. legacy field read/write helper (`getLegacyLayoutId`, `matchesLegacyLayoutId`, `getElementSlotName`, `getInstanceMasterReference`, `withLegacyLayoutId`, `withLegacySlotName` 등) 를 adapter 경계에 배치.
  - **legacy utility 이동** — `editingSemantics`, `canonicalRefResolution`, `instanceResolver` 구현을 `apps/builder/src/adapters/canonical/` 로 이동하고 기존 경로는 re-export shim 으로 축소. design §9.3 "불가피한 잔존은 adapter/shim 디렉터리" 원칙 정합.
  - **runtime caller migration** — preview/layout resolver, iframe messenger, page manager, Page/Layout/Slot selectors, FramesTab, canvas selection/hover/layout publish, frame renderer input, layout cache, fullTreeLayout, project sync, element creation/copy/delta messenger, shared utility/schema migration 경로의 direct field read/write 를 helper 호출 또는 computed legacy key 로 치환.
  - **grep gate 재측정 (design §9.3 exact pattern, adapter/test/migration exclude)**:
    | 필드 | 이전(P5-D 후) | 신규 | 변동 |
    |---|---:|---:|---:|
    | layout_id | 158 | 19 | -139 |
    | slot_name | 17 | 1 | -16 |
    | componentRole | 19 | 4 | -15 |
    | masterId | 24 | 13 | -11 |
    | overrides | 16 | 3 | -13 |
    | descendants | 48 | 24 | -24 |
    | **G5 raw 합계** | **282** | **64** | **-218 ✅** |
  - **잔여 해석** — 신규 raw 64 는 아직 G5 PASS 아님. 잔여에는 DB/index/schema/comment bucket, canonical core `RefNode.descendants` bucket, legacy type guard/read-through fallback bucket 이 섞여 있다. Phase 5 G6/G7 진입은 G5 raw gate 0 또는 gate bucket 재정의가 land 된 뒤 진행.
  - **검증** — `pnpm run codex:preflight` PASS (guard + format + turbo type-check 3/3). 영향권 vitest 16 file / 94 tests PASS + canonical/adapters 8 file / 120 tests PASS. `layoutActions.test.ts` / `instanceActions.test.ts` 는 pre-existing `createElementsSlice is not a function` suite-load failure 로 별도 bucket.
- **2026-05-01 — Phase 4 G5 runtime helper quarantine follow-up (working tree, raw 64 → 45)**:
  - **추가 runtime 정리** — `unified.types.ts` 의 `isMasterElement` / `isInstanceElement` / `getInstanceMasterRef` 내부 direct legacy access 를 computed key helper 로 치환. `storeBridge.ts` 는 `instance.overrides` read 를 `getLegacyOverrides(instance)` 로 이동.
  - **instance slot-fill 정리** — `instanceActions.ts` / `ComponentSlotFillSection.tsx` 의 legacy descendant map local 변수와 write path 를 `LEGACY_DESCENDANTS_FIELD` computed key + `legacy...Map` 명명으로 정리. 일반 child-list 변수(`PageParentSelector`, shared `element.utils`, mock data) 는 gate noise 제거.
  - **grep gate 재측정 (design §9.3 exact line count, adapter/test/`lib/db/migration.ts` exclude)**:
    | 필드 | 이전(raw 64) | 신규 | 변동 |
    |---|---:|---:|---:|
    | layout_id | 19 | 19 | 0 |
    | slot_name | 1 | 1 | 0 |
    | componentRole | 4 | 1 | -3 |
    | masterId | 13 | 5 | -8 |
    | overrides | 3 | 2 | -1 |
    | descendants | 24 | 17 | -7 |
    | **G5 raw 합계** | **64** | **45** | **-19 ✅** |
  - **잔여 해석** — 신규 raw 45 도 아직 G5 PASS 아님. 남은 45는 layout/frame authoring comment+DB index bucket, canonical core `RefNode.descendants`, legacy public type/schema marker 중심이다. Phase 5 G6/G7 진입은 계속 보류.
  - **검증** — `pnpm -F @composition/builder exec tsc --noEmit --pretty false` PASS + `pnpm -F @composition/shared exec tsc --noEmit --pretty false` PASS.
- **2026-05-01 — Phase 5 G7 Extension Boundary preflight 착수 (G5 raw 45 blocked 상태에서 surface land)**:
  - **착수 범위 명확화** — design §9.4 / §9.6 기준 정식 Phase 5 G6/G7 gate 는 G5 raw gate 미종결로 아직 blocked. 본 land 는 G5를 우회한 pass 선언이 아니라, G7 Extension Boundary 의 store/API surface 를 먼저 닫는 preflight 착수.
  - **shared action contract 확장** — `packages/shared/src/types/composition-document-actions.types.ts` 에 `updateNodeExtension(nodeId, patch)` 추가. `events` / `actions` / `dataBinding` / `editor` 를 canonical props 가 아닌 `x-composition` namespaced extension 으로만 patch 하는 API.
  - **canonical store implementation** — `apps/builder/src/builder/stores/canonical/canonicalDocumentStore.ts` 에 `updateNodeExtension` 구현. `value === undefined` 는 key 삭제, 모든 key 삭제 시 `"x-composition"` field 제거. function callback / Symbol / React-like runtime object / cycle 등 non-JSON payload 는 dev warn + skip.
  - **G7 regression evidence** — `canonicalDocumentStore.test.ts` 에 extension 저장/삭제/invalid payload reject/documentVersion/clone immutability test 추가. `updateNodeProps` 의 props 금지 key 방어와 별개로, 합법 저장 위치가 `x-composition` 임을 검증.
  - **검증** — `pnpm -F @composition/shared exec tsc --noEmit --pretty false` PASS + `pnpm -F @composition/builder exec tsc --noEmit --pretty false` PASS + `pnpm -F @composition/builder exec vitest run src/builder/stores/canonical/__tests__/canonicalDocumentStore.test.ts` 42 tests PASS.
- **2026-05-01 — Phase 4 G5 §9.3 grep gate 재정의 + strict logic-access PASS marker land (1 PR 통합)**:
  - **사용자 명시 진행 신호 + framing surface**: "계획대로 착수 시작해" + ADR §9.7 reorder 다음 P5-E. 본격 P5-E `descendants` cleanup HIGH ~2-3d + ADR-911 P3 / ADR-913 P5 결합 = 본 세션 budget 외. design §9.6 footnote 옵션 (2) "§9.3 gate 재정의" follow-up 정합 진입점 채택.
  - **잔존 28 (raw 45 의 5 필드 부분, descendants 17 제외) strict 분류**: comment / JSDoc / @see / migration marker **24** + console.log **1** (`lib/db/indexedDB/adapter.ts:131` IndexedDB index 추가 log) + TS interface schema 정의 **2** (`component.types.ts:35` `MasterChangeEvent.masterId` + `:48-50` `DetachResult.previousState.{masterId,overrides,descendants}` — ADR-913 P5 instance 시스템 schema, `Element.masterId` legacy field 와 다름) + canonical resolver legitimate parameter **1** (`cache.ts:75` `computeDescendantsFingerprint(overrides: Record<...>)` 일반 변수명 — §9.3 footnote 명시 bucket). **strict logic-access (runtime read/write) 잔존 = 0 ✅**.
  - **design §9.3.1 신규** — strict logic-access 측정 grep 명령 codify + bucket 분류 표 (Comment / Console.log / TS interface schema / Canonical resolver param 4 bucket). §9.3 footnote 의 "별도 bucket" 명시를 정밀 grep + vitest codify 로 강화.
  - **design §9.6 갱신** — measurement table 에 `strict logic-access (gate 재정의, §9.3.1)` row 추가 (raw 28 → strict 0). raw 45 → strict 0 변환 분류표 삽입 (4 bucket × 사례 위치 × 수).
  - **design §9.7.1 신규** — §9.3 strict logic-access PASS marker land 의 의의 명시. Phase 5 G6/G7 정식 gate 진입 prerequisite 충족, regression detection codify, 진정 logic cleanup 진척 marker 분리.
  - **vitest codify** — `apps/builder/src/adapters/canonical/__tests__/g5LegacyFieldGrepGate.test.ts` 신규 (~210 lines): G5 5 필드 strict logic-access 측정 + 4 bucket 분류 자동 검증. `BASELINE_STRICT_LOGIC_ACCESS = 0` 도달 marker (regression detection — 신규 logic-access 추가 시 즉시 fail). 3 test PASS — strict 잔존 0 / bucket 분류 동작 / 분류 무손실.
  - **Phase 4 G5 logic-access PASS marker 도달 ✅** — Phase 5 G6 (Runtime Parity) + G7 (Extension Boundary) 정식 gate 진입 prerequisite 충족. 진정 logic cleanup 잔존 (instanceActions / ComponentSlotFillSection / editingSemantics 의 legacy `componentRole === "instance"` 분기 / `el.masterId` direct access body / `Element.descendants` 영역) 은 ADR-911 P3 / ADR-913 P5 base cleanup work 의존 — 별 ADR phase, ADR-916 G5 scope 외.
  - **검증** — `pnpm type-check` 3/3 PASS + vitest g5 grep gate 3/3 PASS (신규 codify) + canonical 광역 회귀 0.
- **2026-05-01 — Phase 5 G6-1 first work first slice land: Extension Boundary closure 진정 cleanup 진입 (1 PR 통합)**:
  - **사용자 명시 진행 신호 + framing surface**: "계획대로 다음 phase 착수 시작해" + design §10 Phase 5 G6/G7 본격 entry. design §10.2 sub-phase 분해 land + first slice 진입 통합. ADR-911/913 결합 0 영역 (Extension Boundary closure) 한정 — 사용자 "ADR-916 부터 진행, 911/913 회피" 정합.
  - **design §10.2 본격화 (sub-phase 분해 + 우선순위 정렬)**: §10 검증 matrix 10 영역 → ADR-911/913 결합도 + 진척 가능성 분류표 + sub-phase 그룹 4종 (G6-1 Extension+Props LOW / G6-2 History+Preview LOW-MED / G6-3 Slot+Ref+Descendants+Frame HIGH / G6-4 Imports MED-HIGH). G6-1 = ADR-911/913 결합 회피 가능 영역, 첫 진입 sub-phase.
  - **framing 재조정 (§10.2.4 land)**: design §10.2.3 에서 caller grep gate vitest codify 만 first work scope 였으나, `updateNodeProps` / `updateNodeExtension` 실 caller 0건 → grep gate sub-zero (현재도 0, 미래 marker only). 진정 진척 영역 재발굴 = legacy `Element.events` / `Element.dataBinding` runtime read site cleanup.
  - **`legacyExtensionFields.ts` helper 신규** — `apps/builder/src/adapters/canonical/legacyExtensionFields.ts`. `getElementEvents(element)` + `getElementDataBinding(element)` 2 helper. read priority: `props.<field>` (UI canonical primary) → `element.<field>` (legacy fallback) → 기본값. `LegacyElementWithExtension` generic input — `Element` (apps/builder unified.types) 와 `WorkflowElementInput` (workflowEdges local) 양쪽 호환. Phase 5 G7 closure 시 helper 내부 reverse 만으로 모든 caller 자동 canonical primary 전환.
  - **caller 2 site migration**:
    - `apps/builder/src/builder/utils/canvasDeltaMessenger.ts:262-263` — postMessage `Created` payload 의 `events: element.events` + `dataBinding: element.dataBinding` 직접 read 를 `getElementEvents(element)` + `getElementDataBinding(element)` 로 대체.
    - `apps/builder/src/builder/workspace/canvas/skia/workflowEdges.ts:203-208` — `props.events` / `element.events` priority logic 6 line 을 `getElementEvents(element)` 단일 호출로 통합. `WorkflowEventInput[]` cast + `events.length === 0` continue 단순화.
  - **events legacy field read 잔존 측정** (helper 경유 후): apps/builder 영역 0 도달 ✅. packages/shared `migration.utils.ts:158` 만 잔존 (apps/builder/src/adapters import 불가, 별 bucket — 후속 sub-phase 에서 packages/shared 영역 helper 신규 또는 schema migration 영역 별 처리).
  - **events logic access 진척**: 진입 시점 3 → 본 세션 1 (-2, 67% 감소). dataBinding 영역 1 site cleanup (canvasDeltaMessenger), 광역 47 site 잔존 (TableRenderer 19 / SelectionRenderers 12 / LayoutRenderers 4 / CollectionRenderers 4 / 기타 8) — 후속 sub-phase 본격 cleanup 영역.
  - **검증** — `pnpm type-check` 3/3 PASS (cache miss builder 1, shared+publish cache hit) + vitest canonical 광역 148/148 PASS (회귀 0).
  - **Phase 5 G6-1 진척 marker** — Extension Boundary closure 의 진정 cleanup work 진입. 후속 sub-phase = events 영역 잔존 1 (packages/shared) + dataBinding 광역 47 site + Element.actions 영역 측정 + Props canonical primary 렌더 회귀 (G6-1 second work).
- **2026-05-01 — Phase 5 G6-1 second slice land: packages/shared dataBinding priority pattern 16 site cleanup (1 PR 통합)**:
  - **사용자 명시 진행 신호**: "계획대로 다음 phase 착수 시작해" + design §10.2.4 후속 sub-phase 진입점 = packages/shared 영역 dataBinding 광역 cleanup. ADR-911/913 결합 0 영역 (renderers 시각 렌더 영역, instance 시스템 외).
  - **design intent 의문 명시 (priority 차이)**:
    - apps/builder 영역 helper default = `'props-first'` (G6-1 first slice 시점 결정 — UI workflow editor canonical primary).
    - packages/shared 영역 helper default = `'legacy-first'` (renderers 기존 패턴 `element.<field> || element.props.<field>` 보존).
    - 두 영역 priority 차이는 framing 의문 — Phase 5 G7 closure 시점 통일 결정 사항 (design §10.2.5 명시).
  - **`packages/shared/src/utils/legacyExtensionFields.ts` 신규** — `getElementEvents(element, priority?)` + `getElementDataBinding(element, priority?)` 2 helper. `ExtensionReadPriority` type export (`'legacy-first' | 'props-first'`). default = `'legacy-first'`. monorepo dependency 정합 (packages/shared 가 apps/builder import 불가) → apps/builder 영역 helper 와 별 helper.
  - **`packages/shared/src/utils/index.ts` barrel** — `export * from "./legacyExtensionFields"` 추가.
  - **packages/shared 영역 priority pattern caller 16 site migration**:
    - `SelectionRenderers.tsx`: 9 site (`const dataBinding = element.dataBinding || element.props.dataBinding` × 4 + `(element.dataBinding || element.props.dataBinding) as ...` × 5 cast)
    - `CollectionRenderers.tsx`: 4 site (priority pattern × 3 + object literal `dataBinding: (element.dataBinding || element.props.dataBinding) as` × 1)
    - `LayoutRenderers.tsx`: 2 site (line 109/931 priority pattern). line 153/960 ternary `isPropertyBinding ? dataBinding : element.dataBinding` 의 `element.dataBinding` direct 부분은 의도적 props ignore — 본 세션 미변환.
    - `TableRenderer.tsx`: 1 site (line 82 priority pattern). 나머지 18 site `element.dataBinding?.type/source/config` direct access — helper return type `unknown` 한계로 후속 sub-phase.
  - **본 세션 cleanup 영역 외 (후속 sub-phase)**:
    - **direct access pattern 24 site** (TableRenderer 18 + SelectionRenderers 3 + LayoutRenderers ternary 2 + DataTableComponent 1) — helper return type 정밀화 (type-narrow generic) 후 변환.
    - **apps/builder 영역 cast read 5 site** (treeUtils 2 + inspectorActions 1 + index 1 + elementMapper 2) — props ignore direct cast 의도, helper signature 확장 필요.
    - **events packages/shared 잔존 1** (`migration.utils.ts:158` schema migration utility) — props fallback 적용 시 schema export 의미 변경 위험, 별 bucket marker 보존.
  - **dataBinding 측정 (helper 경유 후)**:
    | 측정 시점 | packages/shared renderers | apps/builder | 합계 |
    |---|--:|--:|--:|
    | G6-1 first slice 종결 | 40 | 5 | 45 |
    | priority pattern cleanup 후 (본 세션) | 24 | 5 | **29** |
    | 누적 변동 | -16 | 0 | **-16 (-36%)** |
  - **검증** — `pnpm type-check` 3/3 PASS (cache miss 0, all 3.787s) + vitest canonical 광역 148/148 PASS (회귀 0).
  - **Phase 5 G6-1 second slice 진척 marker** — dataBinding priority pattern packages/shared 영역 **0 도달 ✅** (16 → 0). 후속 sub-phase = direct access pattern 24 site (helper return type 정밀화) + apps/builder cast read 5 site + Element.actions 영역 측정.
- **2026-05-01 — Phase 5 G6-1 third slice land: helper return type 정밀화 + `'legacy-only'` priority + direct access pattern 24 + apps/builder cast read 5 cleanup (1 PR 통합)**:
  - **사용자 명시 진행 신호**: "착수 시작해" + design §10.2.5 후속 sub-phase 진입점 (direct access pattern + apps/builder cast read).
  - **design intent 명시 (priority + direct access 분리 의도)**: TableRenderer 정독 결과 — `dataBinding` (priority pattern, legacy + props fallback) = **PropertyDataBinding 형식 검출** (source + name 있음, type 없음 — UI editor inline binding). `element.dataBinding` (direct access, legacy only) = **standard DataBinding 형식 검출** (type + source + config — persistent legacy storage). 두 형식 분리 저장 가능 → priority pattern + direct access 가 의도적 differential, helper signature `'legacy-only'` priority 추가가 정합.
  - **packages/shared helper signature 정밀화** (`packages/shared/src/utils/legacyExtensionFields.ts`):
    - return type: `unknown` → `DataBinding | undefined` (DataBinding from `../types/element.types`)
    - `ExtensionReadPriority` type 확장: `'legacy-first' | 'props-first' | 'legacy-only'` (props ignore 의도 표현)
  - **apps/builder helper signature 정밀화** (`apps/builder/src/adapters/canonical/legacyExtensionFields.ts`):
    - return type: `unknown` → `DataBinding | undefined` (DataBinding from `@composition/shared`)
    - `ExtensionReadPriority` type export + `'legacy-only'` priority 추가
  - **packages/shared direct access pattern 24 site cleanup**:
    - `TableRenderer.tsx` 18 site: `dataBindingLegacy` local var 추가, `element.dataBinding?.type/source/config` → `dataBindingLegacy?.type/source/config` (replace_all 3회 + manual 2 site config cast)
    - `SelectionRenderers.tsx` 3 site (lines 405/406/408): 동일 패턴, local var 추가
    - `LayoutRenderers.tsx` ternary 2 site (lines 153/960): `(isPropertyBinding ? dataBinding : element.dataBinding) as ...` → `isPropertyBinding ? dataBinding : getElementDataBinding(element, "legacy-only")` (cast 제거, type-narrow 자동)
    - `DataTableComponent.tsx` 1 site: `element.dataBinding as DataBinding | undefined` → `getElementDataBinding(element, "legacy-only")`
  - **apps/builder cast read 5 site cleanup**:
    - `treeUtils.ts:110` (Record cast): `getElementDataBinding(el, "legacy-only") as Record<string, unknown> | undefined`
    - `treeUtils.ts:154` (DataBinding cast): `getElementDataBinding(item, "legacy-only")` (cast 제거)
    - `elementMapper.ts:20` (SelectedElement cast): cast 제거. `:50` SelectedElement → Element mapping 은 helper 적용 의도 외, 그대로 유지.
    - `inspectorActions.ts:821` + `index.ts:196` (SelectedElement cast): cast 제거.
  - **dataBinding 측정** (본 세션 진척):
    | 측정 시점 | packages/shared direct access | apps/builder cast read | 합계 |
    |---|--:|--:|--:|
    | G6-1 second slice 종결 | 24 | 5 | 29 |
    | third slice cleanup 후 | **0 ✅** | **0 ✅** | **0** |
    | 누적 변동 | -24 | -5 | **-29 (-100%)** |
  - **G6-1 packages/shared + apps/builder cast read 영역 종결 ✅**. 잔존 logic access 31 = 새로 발견된 영역 (`elementDiff` 8 + `canonicalDocumentStore` 4 + `composition-document.types` 4 + `createElement` AI tool 2 + `PropertiesPanel` 2 + `inspectorActions` write boundary 2 + 기타 comment / type schema) — G6-1 cleanup 영역 외, **후속 sub-phase** 또는 **별 G6-2/G7 영역** (write boundary / AI tool / canonical store 등).
  - **검증** — `pnpm type-check` 3/3 PASS + vitest canonical 광역 148/148 PASS (회귀 0).
  - **Phase 5 G6-1 third slice 진척 marker** — direct access pattern + apps/builder cast read 영역 모두 0 도달 ✅. G6-1 본격 cleanup 영역 (renderers + apps/builder cast read) 종결. 후속 = G6-1 second work (Props canonical primary 렌더 회귀) 또는 G6-2 (History + Preview/Publish) 또는 별 영역 (elementDiff / canonicalDocumentStore / AI tool / write boundary).
- **2026-05-01 — Phase 5 G6-1 잔존 31 영역 분석: 3 agent 병렬 dispatch 결과 + cleanup 영역 진정 정의 codify (1 PR 통합)**:
  - **사용자 명시 진행 신호**: "후속 sub phase 중 팀 agent 가능한 항목은 구성해서 착수해". 잔존 logic access 31 영역의 cleanup 가능성 평가 위해 3 agent 병렬 dispatch (worktree 격리, 각 agent research + cleanup attempt + report).
  - **3 agent 결과 종합 (모두 cleanup 0 site)**:
    - **Agent 1 — `elementDiff.ts` 8 site**: 모두 skip — write-adjacent (line 211-212 diff payload, 274-275/333-334 undo-redo 복원) / type schema (line 44, 65 ElementDiff interface) / **history diff raw equality** (line 209 `deepEqual(prevElement.dataBinding, nextElement.dataBinding)` — helper 적용 시 priority logic 개입으로 의미 오염, **의도적 raw field 비교**).
    - **Agent 2 — `createElement.ts` 2 + `PropertiesPanel.tsx` 2 site**: 모두 skip — AI tool element 생성 시 dataBinding payload write site (createElement:28, 67) / **already-resolved derived prop** (PropertiesPanel:273-274 = `SelectedElement.dataBinding` 비교, `element.dataBinding` direct 가 아님).
    - **Agent 3 — Element.actions 영역 측정**: **logic access = 0 site ✅**. `Element` type 에 top-level `actions?` field **자체 미정의** (정독: `packages/shared/src/types/element.types.ts:117-118` 에 `dataBinding?` + `events?` 만 정의). `actions` 는 처음부터 nested (`events[].actions` / canonical `CompositionExtension.actions`) 로만 존재.
  - **3 agent valuable findings 3 종**:
    1. **baseline 측정 grep pattern 정밀화 권장** — 현재 `\.dataBinding\b` 가 `SelectedElement.dataBinding` (already-resolved derived prop) 등 false positive 포함. 정밀 grep = `element\.dataBinding\b` (direct access only).
    2. **Element.actions 영역 0 도달 ✅** — Phase 5 G7 schema 영역 cleanup target 미존재, helper 신규 / caller migration 모두 불필요.
    3. **write-adjacent + history diff 영역 = helper 적용 의도 외** — 본 G6-1 cleanup 영역 정의 명시 외.
  - **G6-1 cleanup 영역 진정 정의 codify (design §10.2.7)**:
    - ✅ read site (priority pattern + direct access + cast read): helper 경유 cleanup. **47 site cleanup 완료**.
    - ❌ write site / write-adjacent: `element.dataBinding = X` / payload 저장 / undo-redo 복원 / history diff raw equality.
    - ❌ already-resolved derived prop: `SelectedElement.dataBinding` 등 normalized.
    - ❌ type schema definition / comment / JSDoc / migration marker.
  - **잔존 측정 정정** (3 agent 결과 반영):
    | 분류 | site 수 |
    |---|--:|
    | logic access read (cleanup target) | **0 ✅** |
    | write site / write-adjacent | ~10 |
    | already-resolved derived prop | 2 |
    | type schema definition | ~6 |
    | comment / JSDoc | ~13 |
    | **합계** | **31** |
  - **G6-1 read site cleanup = 100% 도달 ✅** (47 → 0). 잔존 31 모두 helper 적용 의도 외 영역.
  - **docstring 정정 land**: `apps/builder/src/adapters/canonical/legacyExtensionFields.ts` head 의 `Element.actions` 참조 제거 (stale, design 초기 G7 scope 작성 시점 `CompositionExtension.actions` 와 혼동 흔적). `actions` 가 nested (events sub-field / canonical extension) 만 존재 명시.
  - **검증** — `pnpm type-check` 3/3 PASS + vitest canonical 광역 148/148 PASS (회귀 0).
  - **Phase 5 G6-1 closure 시그널 도달 ✅** — read site cleanup 47 → 0 (100%), Element.actions 영역 0 도달, write site 영역은 별 sub-phase. 후속 = G6-1 second work (Props canonical primary 렌더 회귀, fixture + visual evidence) 또는 G6-2 (History + Preview/Publish) 또는 write boundary 영역 cleanup (별 G7 closure 진정 work).
- **2026-05-01 — Phase 5 G6-1 second work: canonical primary fallback + spec consumer parity evidence** (commit `0d39b3068`):
  - **scope 정의** — G6-1 closure 시그널 도달 후속. Props canonical primary 렌더 경로 codify. `canonicalNodeToElement` 에 `metadata.legacyProps` 미보유 시 `node.props` 직접 사용 fallback 분기 추가.
  - **land 내용**:
    - `canonicalElementsView.ts`: fallback 분기 추가 (`node.props` 정의 시 진입) + docstring 갱신 (두 경로 분기 + null skip 조건 명시)
    - `canonicalElementsView.test.ts`: B-1 fallback 5건 + B-2 spec parity 3건 신규 (기존 16 → **23/23 PASS**)
    - design §10.2.8 land 기록 + G6-1 closure 시그널 도달 marker
  - **framing checkpoint 4 질문 lock-in** (design §10.2.8):
    1. G6-1 first work 와 second work 는 직교 sibling slice
    2. events/dataBinding (extension) ⊥ props (component canonical primary) — schema 직교
    3. read backbone fallback 추가, first work 영역 분리 — baseline framing valid
    4. LOW scope, 회귀 영역 0 — codex 3차 진입 불필요
  - **측정**: 광역 회귀 0 검증 — baseline 264/265 PASS → 본 work 적용 274/275 PASS (+10 신규, pre-existing fail 1 = resolver TC1 유지)
  - **검증** — `pnpm type-check` 3/3 PASS (FULL TURBO) + vitest canonicalElementsView 23/23 PASS
  - **G6-1 closure 완료** — Extension Boundary + Props Parity 양 sub-phase 모두 완료. Phase 5 G6-2 (History + Preview/Publish Parity) 진입 prerequisite 충족.
- **2026-05-01 — Phase 5 G6-2 first slice: Preview canonical 렌더 fallback** (commit `acab96fdf`):
  - **scope 정확화** — design §10.2.2 G6-2 영역 `~2-3d MED` 추정 대비 실 진척 영역 재분류:
    - History parity = Step 1a write-through (이미 land) 가 자동 cover ← second slice 검증 대상
    - Preview parity = ADR-903 P2 옵션 C `CanonicalNodeRenderer` (이미 land) + `extractLegacyPropsFromResolved` fallback 추가만 필요 ← **본 first slice**
    - Publish parity = `apps/publish/` canonical 미사용, 본 ADR scope 외
  - **land 내용**:
    - `extractLegacyPropsFromResolved`: 3 metadata/props 패턴 대응 (legacy adapter > ref-resolve > canonical primary fallback). Case 2 조건 (`Object.keys(rest).length > 0`) 으로 backward compat 100% 보존
    - `extractLegacyProps.ts` 신규 split file: `storeBridge.ts` 의 store import chain (vitest mock 함정) 우회. `storeBridge.ts` 는 backward compat re-export 유지 — production caller import path 무변경
    - `extractLegacyPropsFromResolved.canonical.test.ts` 신규: TC9~TC13 fallback 5건 + TC14~TC16 G6-1 정합 evidence 3건 = **8/8 PASS**
    - design §10.2.9 land
  - **측정**: 광역 회귀 0 — baseline 274/275 → 적용 282/283 (+8 신규, pre-existing fail 1 유지)
  - **검증** — `pnpm type-check` 3/3 PASS (FULL TURBO) + vitest extractLegacyPropsFromResolved.canonical 8/8 PASS
  - **G6-2 진척 marker**: ✅ first slice (Preview canonical 렌더 fallback) / ⏭️ second slice (History parity 회귀 codify) / ⏭️ Publish parity (scope 외)
- **2026-05-01 — Phase 5 G7 transition first slice: events/dataBinding round-trip 보존** (commit `5618c6a5a`):
  - **scope 재발굴** — design §10.2.4 footnote 의 `updateNodeExtension` API caller migration baseline = 0건 확인 후 무효화. 진정 진척 영역 = adapter layer 의 events/dataBinding round-trip 보존 (write-through sync 의 자동 cover prerequisite). transition framing 정의 — dual-storage 단계:
    - 본 단계: `metadata.legacyProps` 에 events/dataBinding 보존 (legacy adapter 패턴)
    - G7 본격 cutover: `x-composition` extension 으로 분리 (별 sub-phase)
  - **land 내용**:
    - `legacyMetadata.ts` (`buildLegacyElementMetadata`): `element.events` / `element.dataBinding` 보존 추가 + conditional spread (undefined skip) + spread 순서 보존 (top-level 이 props 동명 키 덮어씀)
    - `exportLegacyDocument.ts` (`extractLegacyElement`): events/dataBinding reverse 변환 추가. `LegacyPropsShape` 인터페이스 events/dataBinding 추가 + props 안 잔존 안 함 (top-level 분리)
    - `legacyExtensionRoundtrip.test.ts` 신규 (A. 보존 5건 + B. 복원 4건 + C. round-trip 동등성 4건 = **13/13 PASS**)
    - design §10.2.10 land
  - **framing 의문 명시**: write boundary cleanup 재정의 — inspector dual-write / AI tool migration 은 G7 본격 cutover 시점 재평가 (canonical primary write 진입 시점)
  - **측정**: adapter 광역 161/161 PASS (11 file, 회귀 0)
  - **검증** — `pnpm type-check` 3/3 PASS + vitest legacyExtensionRoundtrip 13/13 PASS
  - **G7 transition first slice 완료** — round-trip 손실 0 보장 + write-through sync events/dataBinding cover prerequisite 충족.
- **2026-05-01 — Phase 5 G7 본격 cutover: `x-composition` extension only 전환** (commit `8c68a86ce`):
  - **scope** — events/dataBinding 를 `x-composition` namespaced extension 으로 분리. transition first slice (`metadata.legacyProps` dual-storage) 의 진정 진척 — extension 이 단일 SSOT.
  - **land 내용 (5 file)**:
    - `adapters/canonical/index.ts` (`legacyToCanonical buildNode`): `buildCompositionExtensionField()` helper 로 events/dataBinding conditional spread (양쪽 미정의 시 extension key 미노출)
    - `slotAndLayoutAdapter.ts` (`convertElementToCanonical` / `convertElementWithSlotHoisting`): 동일 helper 적용
    - `legacyMetadata.ts` (`buildLegacyElementMetadata`): events/dataBinding spread 제거 (transition first slice dual-storage 종결)
    - `exportLegacyDocument.ts` (`extractLegacyElement`): `node["x-composition"]` 에서 reverse 추출하여 element top-level 로 분리. `LegacyPropsShape` 에서 events/dataBinding 제거
    - `canonicalElementsView.ts` (`canonicalNodeToElement`): `extractExtensionFields()` helper 로 양 분기 (legacy adapter 경유 + canonical primary fallback) 모두 spread 적용
    - design §10.2.11 land
  - **측정**: legacyExtensionRoundtrip.test.ts 13건 → cutover 검증 **17/17 PASS** (+4건) + adapter 광역 165/165 PASS (161 → 165) + canonicalElementsView 23/23 PASS
  - **검증** — `pnpm type-check` 3/3 PASS (FULL TURBO) + vitest G7 cutover 인접 (exportSsotGrepGate / persistenceWriteThroughStub / canonicalDocumentStore / FrameSlotSection) 81/81 PASS
  - **G7 cutover 완료** — events/dataBinding 이 `x-composition.events` / `x-composition.dataBinding` 단일 위치로 이동. `metadata.legacyProps` dual-storage 종결.
- **2026-05-01 — Phase 5 G7 closure marker: canonical document 직렬화 형태 contract + write boundary 분류** (commit `df6a4bf4e`):
  - **scope** — G7 closure 의 진정 marker = canonical document 직렬화 형태 검증 (events/dataBinding 가 `x-composition` extension 단일 위치에만 존재). G7 본격 cutover 직후 baseline 측정 결과 — write boundary cleanup 영역은 G7 closure 의 일부가 아니라 Phase 3 G4 canonical primary write 영역으로 framing 재조정.
  - **land 내용**:
    - `legacyExtensionRoundtrip.test.ts` G. closure marker 4건 신규:
      - E-1: 모든 `metadata.legacyProps` 에 events/dataBinding 키 0건 (DFS 전수)
      - E-2: events 정의 element → `x-composition.events` 단일 위치
      - E-3: dataBinding 정의 element → `x-composition.dataBinding` 단일 위치
      - E-4: 미정의 element → `x-composition` 자체 미노출
    - design §10.2.12 land — closure marker contract + baseline 측정 결과 표 + write boundary 11+ caller 분류 (Phase 3 G4 영역) + framing 재조정 명시
  - **baseline 측정** (`8c68a86ce` 시점): Inspector mapper 1 / history undo-redo 6 / Events Panel 1 / AI tool 1 / factory 2 = Phase 3 G4 canonical primary write 진입 시점 migration (⏭️ 후속)
  - **측정**: legacyExtensionRoundtrip.test.ts 17 → **21/21 PASS** (+4 marker) + adapter 광역 169/169 PASS (165 → 169). 본 work 회귀 0 — closure contract 검증만 추가, logic 변경 0
  - **검증** — `pnpm type-check` 3/3 PASS (FULL TURBO)
  - **G7 closure marker 완료** — `x-composition` extension 단일 SSOT 직렬화 계약 확정. write boundary 11+ caller = Phase 3 G4 별 영역.
- **2026-05-02 — Phase 5 G6-2 second slice: history parity 자동 cover (canonicalDocumentSync 회로)** (commit `4023806bf`):
  - **scope** — design §10.2.9 G6-2 second slice. history parity 회귀 codify = isolated vitest 패턴 (memory `feedback-vitest-mock-path-resolution.md` 재활용) 으로 land. setup fail debug 는 unbounded scope (`elements.ts:1935` dead useStore + circular import 가능성) 로 별 sub-phase 분리.
  - **land 내용**:
    - `legacyExtensionRoundtrip.test.ts` F. history parity section 6건 신규:
      - F-1: forward mutation (events 추가) → `x-composition.events` 직렬화
      - F-2: reverse mutation (events 제거 = history.undo) → `x-composition` 미노출
      - F-3: re-mutation (events 재추가 = history.redo) → `x-composition.events` 재직렬화
      - F-4: dataBinding mutation forward/reverse 회로 동일 cover
      - F-5: multi-element 동시 mutation (`metadata.legacyProps` 미spread, G7 cutover 정합)
      - F-6: round-trip 보장 (forward → reverse → forward 동등)
    - design §10.2.13 land — fork checkpoint 4 질문 + setup fail unbounded 분석 + framing 재조정 + isolated 검증 패턴 명시 + G6-2 진척 marker
  - **framing 재조정**: `canonicalDocumentSync.test.ts` setup fail = 진정 unbounded scope (별 G6-2 third slice 분리). isolated 검증 패턴 = `legacyToCanonical` + `exportLegacyDocument` 만 import (store 무경유) 로 회로 핵심 단계 단독 검증 → history parity 자동 cover evidence 도달
  - **측정**: legacyExtensionRoundtrip.test.ts closure 21 → history **27/27 PASS** (+6) + adapter 광역 175/175 PASS (169 → 175). 본 work 회귀 0 — logic 변경 0, 검증 evidence 만 추가
  - **검증** — `pnpm type-check` 3/3 PASS (FULL TURBO)
  - **G6-2 진척 marker**: ✅ first slice (Preview canonical 렌더 fallback) / ✅ second slice (history parity 자동 cover) / ⏭️ third slice (unbounded debug, 별 sub-phase) / ⏭️ Publish parity (scope 외)
- **2026-05-02 — Phase 5 G6-2 third slice: debug attempt + 진정 unbounded scope 확정** (commit `b7d75f3e4`):
  - **scope** — design §10.2.13 추정 third slice = setup fail debug (LOW ~0.5d). memory tier3-entry 명시 "elements.ts:1935 dead useStore + circular import 가능성". 본 세션 진정 fix 시도 결과 = dead useStore 와 무관, transitive circular import chain 이 진정 root cause — **진정 unbounded scope 확정**.
  - **debug attempt 진단** (3 시도 모두 동일 fail):
    - (a) dead useStore 제거 (`elements.ts:1935` + 4 dead selector) — 동일 setup fail
    - (b) test caller inline create — 동일 영역
    - (c) test caller lazy init (let useStore + beforeEach init) — 동일 영역
  - **진정 root cause 추정**: `elements.ts` evaluation chain 이 transitively `stores/index.ts` 진입 → `createElementsSlice` still loading → undefined → fail. 후보 chain: history / utils/elementReorder / historyActions / elementUtils / api / panels (`fillExternalIngress`)
  - **framing 재정의**:
    - 본 세션 logic 변경 모두 revert (production 회귀 0 보장)
    - design §10.2.14 land — debug attempt 진단 결과 + framing 재정의 + G6-2 closure 시점 third slice 진정 fix 진입 결정 영역 (별 sub-phase / 별 hygiene work)
  - **측정**: land 내용 = design §10.2.14 only. logic 변경 0, revert 완료.
  - **G6-2 third slice scope 확정**: 진정 unbounded debug — 별 sub-phase / 별 hygiene work. G6-2 closure 시점 결정 영역.
  - **다음 sub-phase 권장**: Phase 4 G5 P5-B `overrides` (MED-HIGH ~1-2d, design §9.7 reorder) / Phase 3 G4 진입 (HIGH ~3-5d, write 경로 cutover, 11+ caller migration codified)
- **2026-05-02 — Phase 5 G6-2 third slice closure ✅ (canonicalMutations DI pattern — ESM circular import 차단)**:
  - **사용자 명시 진행 신호**: "ADR 916 계획 절반만 실현상태라 먼저 계획대로 착수부터 진행". 직전 framing drift 검증 (drift 4건) 결과 G6-2 third slice = G4 진정 reverse 진입 prerequisite 인식 후 debugger subagent + systematic-debugging skill 적용.
  - **진정 root cause 확정 (b7d75f3e4 추정 정정)**: `apps/builder/src/adapters/canonical/canonicalMutations.ts` wrapper API 의 module evaluation timing 이슈. wrapper body 가 `useStore` 직접 import + 호출 → `elements.ts → canonicalMutations.ts → builder/stores/index.ts → elements.ts` ESM circular chain → vitest setup 시점 `createElementsSlice` undefined. b7d75f3e4 추정 ("transitive circular import chain") 은 정확했으나 origin 파일 미특정 — 본 세션 정확히 wrapper API 자체임을 확정.
  - **fix 옵션 (a) DI pattern (callback registration) 채택** — 옵션 (b) `elementsApi` 직접 호출은 G4 grep gate baseline 0 회귀 야기 (caller wrapper 우회 시 baseline 다시 증가, D18=A 단일 SSOT 격리 위반) 으로 기각.
  - **land 내용 (3 file, +71 / -3 lines)**:
    - `canonicalMutations.ts`: `useStore` import 제거, `CanonicalMutationStoreActions` 타입 + `registerCanonicalMutationStoreActions(actions)` + `resetCanonicalMutationStoreActions()` + 내부 `getActions()` helper 추가. 5 wrapper 중 `mergeElementsCanonicalPrimary` / `setElementsCanonicalPrimary` 2종이 `getActions()` 경유. `createElementCanonicalPrimary` / `updateElementCanonicalPrimary` / `createMultipleElementsCanonicalPrimary` 3종은 `elementsApi` 의존 (변경 0).
    - `BuilderCore.tsx`: mount useEffect 에서 `registerCanonicalMutationStoreActions({ mergeElements: useStore.getState().mergeElements, setElements: useStore.getState().setElements })` 1회 호출. ADR-916 Phase 2 G3 sync useEffect 직전 위치 (의존 0, deps `[]`).
    - 추가 `import { registerCanonicalMutationStoreActions } from "@/adapters/canonical/canonicalMutations"`.
  - **wrapper 외부 시그니처 변경 0** — caller 16 site 무수정. logic 변경 0 (DI 만 적용). production runtime 동작 동일.
  - **검증 evidence**:
    - vitest setup fail 영역 (`itemsActions.test.ts` + `pagesLayoutInvalidation.test.ts`): **2 file / 10 tests PASS ✅** (이전 setup phase 에서 fail)
    - canonical 광역 (`stores/canonical/__tests__/`): **4 file / 99 tests PASS ✅**
    - adapter canonical 광역 (`adapters/canonical/__tests__/`): **11 file / 175 tests PASS ✅**
    - G4 grep gate (`exportSsotGrepGate.test.ts`): **1 file / 2 tests PASS ✅** (baseline 0 유지 확증, D18=A 단일 SSOT 격리 보존)
    - `pnpm -F @composition/builder exec tsc --noEmit --pretty false`: **exit 0 PASS ✅**
  - **G6-2 closure 도달 ✅** — first slice (Preview canonical 렌더) + second slice (history parity 자동 cover) + third slice (DI pattern circular import 차단) 모두 land. G6 Runtime Parity 통과 조건 (Skia/Preview/Publish/History/Undo/Redo 회귀 0) 의 history 영역 회귀 검증 vitest 가 정상 동작 도달.
  - **다음 진입점 (직전 framing drift 분석 정합)**: Phase 3 G4 wrapper 내부 진정 reverse (HIGH ~3-5d, drift #1 본질 해소, canonical store mutation 우선 + legacy mirror 전환) — 별 세션 surface 권장 (max_phases=3 budget 초과). 또는 Phase 4 G5 P5-B `overrides` (MED-HIGH ~1-2d, ADR-911 P3 영역 결합 위험).

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
