# ADR-916 구현 상세 — Canonical Document SSOT 전환

본 문서는 [ADR-916](../916-canonical-document-ssot-transition.md)의 phase plan, inventory, gate 측정 방법을 정의한다. 핵심은 `CompositionDocument`를 최종 SSOT로 승격하고, legacy `elements[]`를 runtime 중심이 아니라 adapter/migration 경계로 격리하는 것이다.

## 1. 최종 구조

| Layer                 | 최종 역할                                | 남겨도 되는 것                                                                                                                                              | 제거/격리 대상                          |
| --------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Canonical core        | 저장/편집/렌더 입력의 SSOT               | `CompositionDocument.version`, `children`, `type`, `props`, `frame`, `ref`, `reusable`, `descendants`, `slot`, `themes`, `variables`, `imports`, `metadata` | legacy ownership 필드                   |
| Composition extension | Composition-only behavior                | `x-composition.events`, `x-composition.actions`, `x-composition.dataBinding`, editor-safe metadata                                                          | function callback, React runtime object |
| Adapter boundary      | 기존 프로젝트 read-through/import/export | `legacyToCanonical`, `canonicalToLegacy`, migration backup, Pencil import/export                                                                            | hot path에서 전체 문서 projection       |
| Renderer input        | Skia/Preview/Publish 소비 모델           | resolved canonical tree, derived scene snapshot                                                                                                             | `layout_id`/`slot_name` 직접 분기       |

## 2. Core / Extension / Legacy 분류

| 항목                   | 최종 위치               | 이유                                    | 현재 anchor                                  |
| ---------------------- | ----------------------- | --------------------------------------- | -------------------------------------------- |
| `version`              | canonical core          | document schema version                 | `CompositionDocument.version`                |
| `children`             | canonical core          | document tree root                      | `CompositionDocument.children`               |
| `type`                 | canonical core          | component/structure discriminator       | `CanonicalNode.type`                         |
| `props`                | canonical core          | component semantics payload             | 현재는 `metadata.legacyProps` transition     |
| `frame`                | canonical core          | layout/group primitive                  | `FrameNode.type === "frame"`                 |
| `reusable`             | canonical core          | origin/master 선언                      | `CanonicalNode.reusable`                     |
| `ref`                  | canonical core          | instance 참조                           | `RefNode.ref`                                |
| `descendants`          | canonical core          | instance override/slot fill             | `RefNode.descendants`                        |
| `slot`                 | canonical core          | slot contract/recommendation            | `CanonicalNode.slot`                         |
| `themes`               | canonical core          | ADR-910 document-level theme            | `CompositionDocument.themes`                 |
| `variables`            | canonical core          | ADR-910 variable snapshot/resolver      | `CompositionDocument.variables`              |
| `imports`              | canonical core hook     | external document/reference hook        | `CompositionDocument.imports`                |
| `events`               | Composition extension   | Pencil core에 없는 app behavior         | legacy `Element.events`                      |
| `actions`              | Composition extension   | workflow behavior, function 아님        | Events Panel action model                    |
| `dataBinding`          | Composition extension   | app data source binding                 | legacy `Element.dataBinding`                 |
| `metadata.legacyProps` | adapter-only transition | legacy props 보존/renderer bridge       | `buildLegacyElementMetadata()`               |
| `layout_id`            | adapter-only legacy     | frame/ref/descendants로 대체            | legacy `Element.layout_id`, `Page.layout_id` |
| `slot_name`            | adapter-only legacy     | `descendants[slotPath].children`로 대체 | legacy `Element.slot_name`                   |
| `componentRole`        | adapter-only legacy     | `reusable`/`type:"ref"`로 대체          | legacy `Element.componentRole`               |
| `masterId`             | adapter-only legacy     | `RefNode.ref`로 대체                    | legacy `Element.masterId`                    |
| `overrides`            | adapter-only legacy     | `RefNode.descendants` patch mode로 대체 | legacy `Element.overrides`                   |

## 2.1 Component Props SSOT 결정

결정: `CanonicalNode.props?: Record<string, unknown>`를 canonical component props payload로 채택한다.

현재 `CanonicalNode` 타입은 `props` 필드를 갖지 않고, adapter가 `metadata.legacyProps`에 legacy `Element.props`와 일부 top-level field를 보존한다. Preview의 canonical renderer도 이 `legacyProps`를 꺼내 기존 rendererMap에 넘긴다. 이 구조는 transition bridge로는 유효하지만, 최종 SSOT로는 부적합하다. component semantics가 `metadata`에 묻히면 canonical document가 실제로는 legacy wrapper가 되기 때문이다.

Phase 0에서 shared type을 아래 형태로 고정한다.

```ts
interface CanonicalNode {
  id: string;
  type: ComponentTag;
  name?: string;
  props?: Record<string, unknown>;
  metadata?: {
    type: string;
    [k: string]: unknown;
  };
  reusable?: boolean;
  children?: CanonicalNode[];
  slot?: false | string[];
  theme?: {
    mode?: string;
    tint?: string;
    [k: string]: string | undefined;
  };
}
```

| 선택지                                          | 판정 | 이유                                                                                                  |
| ----------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------- |
| `CanonicalNode.props?: Record<string, unknown>` | 채택 | 기존 renderer/inspector migration path와 가장 가깝고, `Button`/`TextField`/`Section` 의미 위치가 명확 |
| `CanonicalNode.component?: { props: ... }`      | 기각 | 구조 필드와 props 분리는 가능하지만 모든 renderer/inspector/store path에 한 단계 indirection을 추가   |
| `metadata.legacyProps` 유지                     | 기각 | 최종 SSOT 위반. metadata 과적재이며 canonical document를 legacy wrapper로 고착                        |

규칙:

1. `props`는 serializable JSON payload만 허용한다.
2. function callback, React element, runtime object는 `props`에 저장하지 않는다.
3. `events`, `actions`, `dataBinding`은 `props`가 아니라 `x-composition` extension에 저장한다.
4. Phase 1 이후 신규 canonical write는 `metadata.legacyProps`를 직접 쓰지 않는다.
5. legacy export adapter가 필요할 때만 `CanonicalNode.props`에서 legacy `Element.props`를 생성한다.

## 3. Extension namespace 결정

canonical core는 Pencil 구조 정합을 유지해야 하므로 Composition-only behavior를 core field로 직접 추가하지 않는다. 다만 Composition 내부 저장에는 app behavior가 필요하다.

### 채택안: top-level namespaced extension field

```ts
interface CompositionExtension {
  events?: SerializedEventHandler[];
  dataBinding?: SerializedDataBinding;
  actions?: SerializedAction[];
  editor?: Record<string, unknown>;
}

interface CompositionExtendedNode extends CanonicalNode {
  "x-composition"?: CompositionExtension;
}
```

| 후보                   | 장점                                                     | 단점                                                             | 판정 |
| ---------------------- | -------------------------------------------------------- | ---------------------------------------------------------------- | ---- |
| `x-composition`        | Pencil-compatible core와 명확히 분리, JSON에서 검색 쉬움 | 타입 확장 필요                                                   | 채택 |
| `metadata.composition` | 기존 `metadata` 활용 가능                                | `metadata.type` 계약과 섞이고 app behavior가 metadata로 과적재됨 | 기각 |
| `props.events`         | 기존 renderer path와 가까움                              | function callback/React props와 혼동, core/behavior 경계 붕괴    | 기각 |

규칙:

1. function callback은 serialize하지 않는다.
2. React Aria `onPress`, `onSelectionChange`, hover-triggered behavior는 serialized event name으로만 저장한다.
3. hover visual state는 event가 아니라 Spec/renderer state이다. hover로 동작을 실행할 때만 extension event가 된다.
4. ADR-916은 event storage 위치를 `x-composition`으로 정하는 ADR이다. editor capability registry, event label/category metadata, implemented-event filtering은 제거 대상이 아니라 serializer/adapter의 입력 catalog로 유지한다.

### Current dual-storage inventory

| 항목                                                | 현재 저장/소비 위치                     | 전환 규칙                                                                  |
| --------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| top-level `Element.events`                          | Inspector update path, Publish renderer | `x-composition.events`로 이동, legacy export 시 top-level로 복원           |
| `props.events`                                      | Preview event handler path              | `x-composition.events`에서 preview adapter가 event handler map 생성        |
| top-level `Element.dataBinding` / DB `data_binding` | API service, builder store              | `x-composition.dataBinding`으로 이동, legacy export 시 `data_binding` 복원 |
| shared component `dataBinding` prop                 | collection components runtime           | renderer adapter가 `x-composition.dataBinding`을 component prop으로 주입   |
| `actions`                                           | Events Panel handler/action model       | `x-composition.events[].actions` 아래에 serialize                          |

## 4. Phase Plan

| Phase   | 목표                         | 주요 작업                                                                                                    | Gate  |
| ------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ | ----- |
| Phase 0 | boundary freeze              | core/props/extension/legacy 분류 확정, 타입 TODO/ADR link 추가, 측정 baseline 갱신                           | G1    |
| Phase 1 | canonical document store/API | document mutation API + canonical -> legacy export adapter API 설계                                          | G2    |
| Phase 2 | hot path read cutover        | drag/selection/render/LayerTree/Preview sync에서 full projection 제거, canonical snapshot 구독               | G3    |
| Phase 3 | persistence write-through    | canonical document 저장 우선, legacy shadow write 또는 export adapter로 축소                                 | G4    |
| Phase 4 | legacy field quarantine      | ADR-913 Phase 5 + ADR-911 layout cleanup과 연결, adapter 디렉터리 외 legacy read/write 0건                   | G5    |
| Phase 5 | parity/extension closure     | Skia/Preview/Publish/History parity, `imports` resolver/cache policy, event/dataBinding extension serializer | G6/G7 |

## 5. Phase 0 — Boundary Freeze

산출물:

- `composition-document.types.ts`에 core/extension boundary 주석 보강 ✅ (G1 §2.1 + §3 + @fileoverview ADR-916 G1 boundary 표)
- `CanonicalNode.props?: Record<string, unknown>` shared type 추가 ✅
- `unified.types.ts` legacy field에 ADR-916 adapter-only marker 추가 ✅ (5필드 — `layout_id` / `slot_name` / `componentRole` / `masterId` / `overrides` / `descendants` / `componentName`)
- `metadata.legacyProps` transition-only marker 추가 ✅ (`CanonicalNode.metadata` 주석)
- `events`/`dataBinding`의 canonical core 진입 금지 및 dual-storage inventory 문서화 ✅ (`CompositionExtension` + `CompositionExtendedNode` + `Element.events`/`Element.dataBinding` @deprecated marker)
- baseline command 결과를 본 문서에 기록 ✅ (아래 baseline 표)

측정:

```bash
rg -n "legacyToCanonical\\(" apps packages
rg -n "metadata\\.legacyProps|legacyProps" apps packages
rg -n "\\b(layout_id|slot_name|componentRole|masterId|overrides)\\b" apps packages
rg -n "\\bprops\\.events\\b|\\bevents\\b|\\bdataBinding\\b|\\bdata_binding\\b" apps packages
```

### Baseline (2026-05-01, ADR-916 Phase 0 G1 land 직전 main HEAD `119f0206c`)

| Grep                                                                                 | 결과 |                                                                       의미                                                                        |
| ------------------------------------------------------------------------------------ | ---: | :-----------------------------------------------------------------------------------------------------------------------------------------------: |
| `legacyToCanonical\(` (호출 site 수)                                                 |   44 |                                         Phase 2 제거 대상 (drag/selection/render/LayerTree/Preview sync)                                          |
| `metadata\.legacyProps\|legacyProps` (참조 수)                                       |   92 |                                             Phase 1 이후 신규 write 0건 + Phase 4 adapter 외 0건 목표                                             |
| `\b(layout_id\|slot_name\|componentRole\|masterId\|overrides)\b` (broad word grep)   | 1062 | Phase 4 G5 정밀 grep (`adapters/` / test fixture 제외 후 0건 목표). 본 수치는 broad noise 포함 — Phase 4 Step 4-1 시점에 §9 정밀 grep 으로 재측정 |
| `\bprops\.events\b\|\bevents\b\|\bdataBinding\b\|\bdata_binding\b` (broad word grep) |  856 |                               Phase 5 G7 Extension Boundary 시점에 adapter 외 0건 목표. 본 수치는 broad noise 포함                                |

완료 조건:

| 조건                       | 통과 기준                                                                         |                             결과                             |
| -------------------------- | --------------------------------------------------------------------------------- | :----------------------------------------------------------: |
| core/extension/legacy 분류 | 본 문서 표와 타입 주석이 일치                                                     |                           ✅ PASS                            |
| component props 위치       | `CanonicalNode.props?: Record<string, unknown>` 타입 추가 + 신규 write path 지정  |                           ✅ PASS                            |
| Pencil schema 오해 방지    | "Pencil schema 그대로 채택" 문구 0건                                              |             ✅ PASS (대안 B 기각 §Decision 명시)             |
| events/dataBinding 위치    | core field가 아닌 extension-only로 명시 + legacy dual-storage migration path 존재 | ✅ PASS (`CompositionExtension` + dual-storage inventory §3) |

## 6. Phase 1 — Canonical Document Store API ✅ 2026-05-01 land

현재 `legacyToCanonical(input, deps)`는 read-through adapter다. Phase 1에서는 canonical document 자체를 mutation할 수 있는 API를 별도 surface로 만든다.

**Phase 1 land scope (R1 보수 = "API + unit test 까지만")**:

- D1=B (types + skeleton + unit test) — write-through 는 Phase 3 (G4)
- D2=β (별도 Zustand slice — `apps/builder/src/builder/stores/canonical/canonicalDocumentStore.ts`) — elementsMap wrapper 가 아니라 분리 store, Phase 2 hot path cutover 시 elementsMap 의존 제거 자연스럽게 가능
- D3=i (역방향 adapter spec only) — `CanonicalLegacyAdapter` interface 만 type lock-in, 구현은 Phase 3

### 6-A. land 산출물 (2026-05-01, ADR-916 Phase 1 G2)

| 산출물                                                                                                               | 위치                                                                                 |              |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | :----------: |
| `CanonicalDocumentActions` interface (7 method) + `CanonicalLegacyAdapter` spec stub                                 | `packages/shared/src/types/composition-document-actions.types.ts`                    | ✅ 신규 land |
| barrel export                                                                                                        | `packages/shared/src/types/index.ts` 末미 추가                                       |   ✅ land    |
| Zustand slice 구현 (`useCanonicalDocumentStore`) + `selectCanonicalNode` / `selectActiveCanonicalDocument` selectors | `apps/builder/src/builder/stores/canonical/canonicalDocumentStore.ts`                | ✅ 신규 land |
| vitest unit test (37 test, 7 action × happy path + edge case)                                                        | `apps/builder/src/builder/stores/canonical/__tests__/canonicalDocumentStore.test.ts` | ✅ 신규 land |

### 6-B. 활성 document 모델

design breakdown §6 spec 의 mutation method 시그니처는 projectId 를 받지 않는다 (`updateNode(nodeId, patch)` 등). 이를 Phase 1 에서는 **활성 document 모델** 로 해석:

- store state: `currentProjectId: string | null` + `documents: Map<string, CompositionDocument>` + `documentVersion: number`.
- mutation method 는 currentProjectId 가 가리키는 document 에 작용.
- `setCurrentProject(projectId | null)` action 을 추가 (spec 외 — 활성 document 모델의 결과).
- currentProjectId 가 `null` 또는 document 미존재 / 노드 미발견 시 **no-op + dev warn** (silent fail / throw 모두 회피 — hot path race 대응).

### 6-C. 시그니처 구체화 (Phase 1 결정)

- `nodeId` = document 내 unique id (DFS 검색).
- `parentPath` / `nodePath` = Phase 1 에서는 single-segment nodeId 와 동일. multi-segment path (reusable boundary 가로지르는 경로) 는 Phase 2 hot path cutover 시점에 필요해지면 확장 (R6 잔존).
- `descendantPath` = pencil.dev 공식 slash-separated id path (`"label"` / `"ok-button/label"`).
- `updateNode` 가 `patch.id` / `patch.type` / `patch.props` 를 받으면 **silently 무시** — id/type 은 구조 invariant, props 는 `updateNodeProps` 사용 권장 (semantic intent 분리).
- `updateNodeProps` 가 `events` / `actions` / `dataBinding` key 를 받으면 **dev warn + skip** (G7 Extension Boundary 사전 enforcement).
- 모든 성공 mutation 은 `documentVersion + 1` + 새 `documents` Map reference 생성 (Zustand selector trigger).

### 6-D. 역방향 adapter (Phase 3 prerequisite)

`CanonicalLegacyAdapter` 는 Phase 1 spec only:

```ts
interface CanonicalLegacyAdapter<
  TElement = unknown,
  TPage = unknown,
  TLayout = unknown,
> {
  exportLegacyDocument(
    doc: CompositionDocument,
  ): CanonicalLegacyExport<TElement, TPage, TLayout>;
  diffLegacyRoundtrip(
    before: CanonicalLegacyAdapterInput<TElement, TPage, TLayout>,
    after: CanonicalLegacyExport<TElement, TPage, TLayout>,
  ): CanonicalRoundtripDiff;
  restoreFromLegacyBackup?(
    projectId: string,
  ): CanonicalLegacyAdapterInput<TElement, TPage, TLayout> | null;
}
```

Generic `T*` 매개변수로 builder 의 `Element` / `Page` / `Layout` 타입에 의존하지 않음 — Phase 3 호출 site 에서 builder 타입 주입.

### 6-E. Phase 1 외부 (Phase 2~5 잔존)

- **history/undo 통합** — Phase 1 mutation 은 history entry 를 push 하지 않음. Phase 2/3 시점에 canonical patch → history record 변환 결정 (R1 잔존).
- **persistence write-through** — Phase 3 G4. 본 store 는 in-memory only.
- **legacy elementsMap 양방향 sync** — Phase 2 hot path cutover (G3) 와 함께. 본 store 는 legacy store 와 별개.
- **selector subscription pattern** — `useCanonicalNode(nodeId)` 류 React hook 은 Phase 2 hot path cutover 시점에 추가 (`selectCanonicalNode` 는 cold path 용 placeholder). **✅ Phase 2 G3 Sub-Phase A (2026-05-01) land 완료** — `apps/builder/src/builder/stores/canonical/canonicalElementsBridge.ts` 의 `useCanonicalNode(nodeId)` + `useActiveCanonicalDocument()` 가 `useSyncExternalStore` 기반으로 구현 (D6=i 채택). Sub-Phase B 의 5 hot path cutover 는 본 hook 을 read backbone 으로 사용.

### 6-F. 원칙 (design breakdown §6 unchanged)

1. mutation API는 legacy `Element`를 입력으로 받지 않는다.
2. adapter는 legacy load/import/export에만 사용한다.
3. history entry는 canonical patch 단위로 기록한다 (Phase 2/3 통합).
4. `descendants` update는 slot fill, override patch, reset override를 모두 표현해야 한다 (`DescendantOverride` 3-mode union).
5. `exportLegacyDocument()`는 Phase 3 shadow write 전 필수 산출물이다.

### 6-G. 검증 evidence (Gate G2 PASS)

| 검증               | 결과           | 비고                                                                                   |
| ------------------ | -------------- | -------------------------------------------------------------------------------------- |
| `pnpm type-check`  | 3/3 successful | shared / builder / publish 모두 PASS (turbo cache miss)                                |
| vitest (canonical) | 37/37 PASS     | 7 action × happy + edge case + selector + immutability                                 |
| Gate G2 통과 조건  | ✅             | document mutation API + adapter API spec + `elements[]` 직접 mutation 없이 테스트 가능 |

## 7. Phase 2 — Hot Path Cutover

우선 제거 대상:

| 경로                       | 현재 문제                                          | 전환 목표                                |
| -------------------------- | -------------------------------------------------- | ---------------------------------------- |
| canvas drag/drop helper    | mousemove 중 doc build 위험                        | canonical snapshot 또는 scene index 사용 |
| BuilderCore layout refresh | elements 변경마다 projection/filter                | canonical store selector 사용            |
| LayerTree                  | legacy childrenMap + synthetic canonical 혼재      | canonical tree에서 derived view 생성     |
| Preview sync               | legacy element payload + canonical projection 혼재 | resolved canonical tree publish          |
| Selection/properties       | selected legacy element에서 canonical 역추적       | selected canonical path/id 기준          |

측정:

```bash
rg -n "legacyToCanonical\\(|selectCanonicalDocument\\(" apps/builder/src/builder apps/builder/src/preview
rg -n "layout_id|slot_name|componentRole|masterId" apps/builder/src/builder apps/builder/src/preview
```

완료 조건:

- drag/selection/render/LayerTree/Preview sync 경로에서 full document projection 0건
- `selectCanonicalDocument`는 adapter boundary 또는 cold path에서만 호출
- frame/slot/ref rendering은 canonical snapshot에서 파생

### 7-A. Sub-Phase A: Bridge layer + selector subscription pattern ✅ (2026-05-01)

**결정 분기**: D4=γ (3-4d bridge first + 1 path pilot) / D5=A (bridge layer 먼저 land) / D6=i (`useSyncExternalStore` — Zustand v5 selector cache miss 회피).

**산출물**:

- `apps/builder/src/builder/stores/canonical/canonicalElementsBridge.ts` (신규, ~140 lines)
  - read API: `getCanonicalNode(nodeId)` / `getActiveCanonicalDocument()` (Phase 1 selector wrap)
  - subscribe API: `subscribeCanonicalStore(listener)` (Zustand v5 native subscribe)
  - feature flag: `isCanonicalBridgeEnabled()` / `setCanonicalBridgeEnabled(value)` (default `false`)
  - React hook: `useCanonicalNode(nodeId): CanonicalNode | null` / `useActiveCanonicalDocument(): CompositionDocument | null` (`useSyncExternalStore` 기반)
- `apps/builder/src/builder/stores/canonical/__tests__/canonicalElementsBridge.test.tsx` (신규, **22 test PASS**)
  - feature flag 3 + read API 7 + subscribe API 4 + `useCanonicalNode` 5 + `useActiveCanonicalDocument` 3
  - snapshot stability 검증 + mutation re-render evidence

**Sub-Phase A scope**:

- canonical store 단독 read (legacy `elementsMap` fallback 미포함)
- subscribe lifecycle + React hook backbone
- 5 hot path 자체 cutover 미진행 (Sub-Phase B)

**검증 evidence**:

| 검증                        | 결과           | 비고                                                |
| --------------------------- | -------------- | --------------------------------------------------- |
| `pnpm turbo run type-check` | 3/3 successful | builder cache miss 313ms / shared·publish cache hit |
| vitest (canonical 전체)     | 59/59 PASS     | 37 store + 22 bridge — 회귀 0                       |
| Gate G3 진행률              | 0/5 path       | backbone 구축 — Sub-Phase B 진입 prerequisite 충족  |

### 7-B. Sub-Phase B: 5 hot path path-by-path cutover

**진입 순서 권장** (회귀 isolation 좁힘 → 넓힘):

1. **LayerTree pilot** (1-2d MED) — derived view 생성 단순. `useActiveCanonicalDocument()` 가 read backbone. 회귀 = layer 표시 정확성.
2. **Selection/properties** (1d MED) — selected nodeId 기준 `useCanonicalNode` 직접 호출. 회귀 = panel 데이터 정확성.
3. **Preview sync** (1-2d HIGH) — resolved canonical tree publish 채널. 회귀 = preview iframe 시각.
4. **BuilderCore layout refresh** (1-2d HIGH) — projection/filter 제거 + canonical selector 도입. 회귀 = layoutVersion 트리거 정합.
5. **canvas drag/drop helper** (1d HIGH) — mousemove 중 doc build 회피 + scene index 도입. 회귀 = drag preview + drop position.

각 path 별 회귀 0 확증 (cross-check skill + Chrome MCP evidence) 후 다음 path 진입.

#### Step 1a: Legacy → canonical write-through sync ✅ (2026-05-01)

**결정 분기**: D7=A (write-through 정통 경로) / D8=β (Step 1a 단독 land) / D9=i (Zustand v5 native subscribe + ref 비교 selector — legacy store 무수정).

**CRITICAL 발견 → 격상 경로**: Sub-Phase A bridge land 후 baseline 측정 결과 canonical store `setDocument` 호출 site **0건**. LayerTree pilot 이 `useActiveCanonicalDocument()` 사용 시 즉시 `null` 회귀 → write-through sync 가 5 hot path 공통 prerequisite 임이 확정. Sub-Phase B Step 1 = sync 우선 land + LayerTree cutover 후속 분리.

**산출물**:

- `apps/builder/src/builder/stores/canonical/canonicalDocumentSync.ts` (신규, ~150 lines)
  - `startCanonicalDocumentSync(): () => void` 공개 API (3 store subscribe + initial schedule + unsubscribe)
  - microtask coalesce (`queueMicrotask` — 동일 macrotask 내 다중 mutation → 1번 sync)
  - ref 비교 selector (`elementsMap`/`pages`/`layouts`/`currentProjectId` 동일 ref 시 skip)
  - `null` projectId no-op (data store 미초기화 안전)
  - `selectCanonicalDocument()` 재사용 (elements.ts:2024 기존 helper)
  - test helper: `setSyncScheduler` / `resetSyncScheduler` / `isSyncScheduled`
- `apps/builder/src/builder/stores/canonical/__tests__/canonicalDocumentSync.test.ts` (신규, **11 test PASS**)
  - lifecycle 3 + null projectId 2 + propagation 5 + microtask coalesce 1

**Step 1b 분해 (작업량 재추정)**:

design §7-B 의 "LayerTree pilot 1-2d MED" 가 단일 PR 가정이었으나, 본 step 진입 시점 실측 분해:

| Sub-step  | risk | est   | 비고                                                       |
| --------- | ---- | ----- | ---------------------------------------------------------- |
| Step 1b-1 | LOW  | ~30분 | Bootstrap 호출 + env flag (default false 보수)             |
| Step 1b-2 | MED  | ~1d   | LayerTree dual-mode cutover (canonical → LayerTreeNode)    |
| Step 1b-3 | MED  | ~1-2h | Chrome MCP visual evidence (legacy vs canonical 시각 정합) |

#### Step 1b-1: Bootstrap 호출 + env flag ✅ (2026-05-01)

**결정 분기**: D10=B (Builder mount lifecycle) / D11=β (Step 1b-1 단독 land) / D12=i (flag default `false` 보수).

**산출물**:

- `apps/builder/src/utils/featureFlags.ts` 에 `isCanonicalDocumentSyncEnabled()` getter 추가 (`VITE_ADR916_DOCUMENT_SYNC`, default `false`)
- `apps/builder/src/builder/main/BuilderCore.tsx` mount useEffect 에 `startCanonicalDocumentSync()` 호출 (flag enabled 시) + cleanup unsubscribe → Builder route 이탈 시 sync 자동 정리

**회귀 안전망**: default `false` 이므로 production 영향 0. flag enable 은 Step 1b-2 진입 사용자 검증 시점.

**검증**:

| 검증                        | 결과           | 비고                                                   |
| --------------------------- | -------------- | ------------------------------------------------------ |
| `pnpm turbo run type-check` | 3/3 successful | builder cache miss 291ms                               |
| vitest (canonical 전체)     | 70/70 PASS     | apps/builder cwd — 회귀 0                              |
| flag 패턴 정합              | ✅             | `isFramesTabCanonical()` (ADR-911 P2) 와 동일 시그니처 |

#### Step 1b-2 진입 prerequisite (다음 세션):

- 사용자 환경에서 `VITE_ADR916_DOCUMENT_SYNC=true` 명시 enable + dev 검증 (canonical store mutation 시 update 확인)
- `useLayerTreeData.ts` dual-mode cutover (canonical → LayerTreeNode 변환 helper + virtual children + ref/instance 분기)
- Chrome MCP visual evidence (legacy vs canonical 모드 LayerTree 표시 정합성)

**검증 evidence**:

| 검증                        | 결과           | 비고                                           |
| --------------------------- | -------------- | ---------------------------------------------- |
| `pnpm turbo run type-check` | 3/3 successful | builder cache miss 313ms                       |
| vitest (canonical 전체)     | 70/70 PASS     | 37 store + 22 bridge + 11 sync — 회귀 0        |
| coalesce 검증               | ✅             | 3 mutation → 1 sync (version diff = 1)         |
| ref 비교 skip               | ✅             | 동일 ref setState → sync 미실행 (version 보존) |

#### Step 2: Selection/properties cutover ✅ (2026-05-01)

**결정 분기**: D13=A (1 PR 통합 land — sub-step 분해 회피, 사용자 surface 최소화 정책 준수) / D14=A (legacy uuid 기준 metadata DFS lookup — segId 와 다른 lookup 키 분리) / D15=A (`useSelectedElementData` 단일 진입점 dual-mode — fallback 자동 처리, caller 무수정).

**산출물**:

- `apps/builder/src/builder/stores/canonical/canonicalElementsBridge.ts`
  - `useCanonicalNode(nodeId: string | null)` 시그니처 확장 — null 안전 (Step 2 caller 가 selectedElementId 직접 전달)
- `apps/builder/src/builder/stores/canonical/canonicalElementsView.ts`
  - `canonicalNodeToElement` export 승격 (Step 1b 의 internal helper → public)
  - `findNodeByLegacyId(doc, legacyId)` 내부 helper — `metadata.legacyProps.id === legacyId` DFS 매칭 (canonical node.id = segId 와 legacy uuid 가 다르므로 metadata 검색 필요)
  - `useCanonicalSelectedElement(selectedElementId)` 신규 hook — `useActiveCanonicalDocument` + `findNodeByLegacyId` + `canonicalNodeToElement` 조합. `useMemo` (deps: `selectedElementId`, `doc`)
- `apps/builder/src/builder/stores/index.ts`
  - `useSelectedElementData()` dual-mode 분기 — `isCanonicalDocumentSyncEnabled() && canonicalSelectedElement !== null` 시 canonical 우선, 그 외 legacy `state.elementsMap` fallback. caller (PropertiesPanel / inspector editors / Style sections) 무수정
- 신규 test 7건 — bridge `useCanonicalNode(null)` null 시그니처 1건 + view `useCanonicalSelectedElement` 6건 (selectedElementId null / store 미활성 / Element 변환 / metadata 미보존 / id 변경 시 새 element / mutation re-render)

**Step 2 scope**:

- `useSelectedElementData()` 1 hook 만 cutover — PropertiesPanel + ComponentSemanticsSection + ComponentSlotFillSection + FrameSlotSection + Style sections 자동 전환 (단일 SSOT 진입점)
- write 경로 (`updateSelectedStyle` / `updateSelectedProperty` 등) 미진입 — Phase 3 G4 영역
- ref instance resolution canonical mode skip — sync 가 ref 처리 미수행 시점, Sub-Phase B 후속 cutover 시점에 재검토

**검증 evidence**:

| 검증                                 | 결과           | 비고                                                                      |
| ------------------------------------ | -------------- | ------------------------------------------------------------------------- |
| `pnpm turbo run type-check`          | 3/3 successful | builder cache miss / shared·publish cache hit                             |
| vitest (canonical 전체)              | 84/84 PASS     | 37 store + 23 bridge + 11 sync + 13 view — 회귀 0                         |
| vitest (stores+properties+inspector) | 209/209 PASS   | 26 file 광역 회귀 검증                                                    |
| Gate G3 진행률                       | 2/5 path       | LayerTree (Step 1b) + Selection/properties (Step 2) — Sub-Phase B 진행 중 |

**다음 진입점**: 5 hot path 중 3 (Preview sync / BuilderCore / canvas drag-drop) 잔여. Preview sync 는 1-2d HIGH (resolved canonical tree publish 채널), BuilderCore + drag-drop 은 layoutVersion / 좌표 정합 검증 필요.

## 8. Phase 3 — Persistence Write-Through

저장 전략:

| 단계                        | 동작                                             | 목적                 |
| --------------------------- | ------------------------------------------------ | -------------------- |
| 3-A shadow write            | canonical 저장 + legacy export 결과 비교         | 무손실 확인          |
| 3-B canonical primary       | 저장 source를 canonical document로 전환          | SSOT 전환            |
| 3-C legacy export on demand | legacy `elements[]`는 export/compat에서만 생성   | adapter 격리         |
| 3-D migration marker        | `_meta.schemaVersion`을 canonical-primary로 승격 | 재실행/rollback 제어 |

필수 안전장치:

- localStorage/IndexedDB backup
- dry-run diff summary
- project-level rollback marker
- sample project roundtrip
- visual smoke: Skia + Preview + Publish

Phase 3 진입 전 필수 API:

| API                                  | 목적                                             | 최소 검증                 |
| ------------------------------------ | ------------------------------------------------ | ------------------------- |
| `exportLegacyDocument(doc)`          | canonical primary에서 legacy compat payload 생성 | legacy load/render parity |
| `diffLegacyRoundtrip(before, after)` | shadow write 결과 차이 요약                      | destructive diff 0        |
| `restoreFromLegacyBackup(projectId)` | rollback                                         | local backup restore PASS |

## 9. Phase 4 — Legacy Field Quarantine

ADR-913 Phase 5와 ADR-911 잔여 layout cleanup을 본 ADR의 final gate로 묶는다. ADR-914의 독립 imports resolver/cache 계획은 2026-04-30 superseded 처리됐으므로, `imports` 자체는 canonical core hook으로 유지하되 fetch/cache/resolver 실행 경계는 본 ADR의 adapter/import/export 단계에서 다시 확정한다.

| 필드                       | 담당 ADR          | ADR-916 종결 기준                            |
| -------------------------- | ----------------- | -------------------------------------------- |
| `slot_name`                | ADR-913 Phase 5-A | adapter 밖 read/write 0건                    |
| `overrides`                | ADR-913 Phase 5-B | `RefNode.descendants` patch mode로 통합      |
| `componentRole`            | ADR-913 Phase 5-C | `reusable`/`type:"ref"`만 사용               |
| `masterId`                 | ADR-913 Phase 5-D | `RefNode.ref`만 사용                         |
| `descendants` legacy shape | ADR-913 Phase 5-E | canonical `DescendantOverride` union만 사용  |
| `layout_id`                | ADR-911 Phase 3/4 | reusable frame + page ref/descendants로 통합 |

완료 기준:

```bash
# runtime field access/write only. broad word grep 금지.
rg -n "\\.(layout_id|slot_name|componentRole|masterId|overrides)\\b|\\b(layout_id|slot_name|componentRole|masterId|overrides)\\s*:" \
  apps/builder/src apps/publish/src packages/shared/src \
  -g '*.ts' -g '*.tsx' \
  -g '!**/__tests__/**' \
  -g '!*.test.ts' -g '!*.test.tsx' \
  -g '!apps/builder/src/adapters/**' \
  -g '!apps/builder/src/lib/db/migration*.ts'

# DB/API snake_case field access must also be adapter-only after cutover.
rg -n "\\b(layout_id|slot_name|component_role|master_id)\\b" \
  apps/builder/src/services apps/builder/src/lib packages/shared/src/schemas \
  -g '*.ts' -g '!**/__tests__/**'
```

결과는 0건이 원칙이다. 불가피한 잔존은 adapter/shim 디렉터리로 이동하고 파일명에 `legacy`를 포함해야 한다. test fixture, markdown, 일반 변수명 `overrides`는 gate failure로 세지 않고 별도 bucket에 기록한다.

## 10. Phase 5 — Runtime Parity + Extension Closure

검증 matrix:

| 영역            | 필수 시나리오                                                                       |
| --------------- | ----------------------------------------------------------------------------------- |
| Slot            | 같은 recommended component 반복 fill, append semantics, clear slot                  |
| Ref             | origin -> instance navigation, instance -> origin navigation, detach                |
| Descendants     | patch / node replacement / children replacement 3-mode                              |
| Props           | `metadata.legacyProps` 없이 canonical props payload로 Button/TextField/Section 렌더 |
| Frame           | reusable frame 생성, page ref 연결, layout preset import                            |
| Imports         | external `.pen` reference fetch, ResolverCache/cache invalidation, import namespace |
| History         | slot fill, detach, override reset undo/redo                                         |
| Preview/Publish | canonical resolved tree 기반 렌더                                                   |
| Events          | `x-composition.events` serialize/deserialize, callback 저장 0건                     |
| DataBinding     | `x-composition.dataBinding` serialize/deserialize, renderer adapter 연결            |

## 11. ADR 의존 관계 정리

| ADR     | ADR-916에서의 역할                        | 조정 필요                                                                                                                                       |
| ------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR-903 | canonical format foundation               | completed 유지, final SSOT cutover는 ADR-916이 담당                                                                                             |
| ADR-910 | `themes`/`variables` canonical field land | 그대로 유지                                                                                                                                     |
| ADR-911 | `layout_id`/frame authoring cleanup       | ADR-916 G5의 layout field quarantine에 연결                                                                                                     |
| ADR-912 | editing semantics base                    | ADR-916 parity matrix의 reusable/ref UX 기준으로 사용                                                                                           |
| ADR-913 | `tag -> type` + hybrid cleanup            | ADR-916 G5의 field quarantine에 연결                                                                                                            |
| ADR-914 | imports resolver historical scope         | Superseded. DesignKit scope 는 ADR-915 로 무효화, P5-D/P5-E fetch/cache/resolver 는 ADR-916 import/export adapter + runtime parity gate 로 흡수 |

## 12. 완료 판정

ADR-916은 아래 조건이 모두 충족될 때 `Implemented`로 이동한다.

| 조건                       | 기준                                                         |
| -------------------------- | ------------------------------------------------------------ |
| canonical primary storage  | 신규 저장 source가 `CompositionDocument`                     |
| legacy adapter quarantine  | legacy field runtime read/write가 adapter-only               |
| hot path projection 0      | drag/selection/render/preview sync에 full projection 없음    |
| extension boundary closure | events/dataBinding/actions가 `x-composition` 아래에만 직렬화 |
| parity pass                | Skia/Preview/Publish/History/Slot/Ref 시나리오 회귀 0        |
| docs sync                  | ADR-911/913/914 README row와 본 ADR gate 상태 일치           |
