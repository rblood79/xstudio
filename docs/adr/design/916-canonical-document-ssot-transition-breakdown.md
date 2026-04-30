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

## 6. Phase 1 — Canonical Document Store API

현재 `legacyToCanonical(input, deps)`는 read-through adapter다. Phase 1에서는 canonical document 자체를 mutation할 수 있는 API를 별도 surface로 만든다.

필수 API 초안:

```ts
interface CanonicalDocumentActions {
  getDocument(projectId: string): CompositionDocument;
  setDocument(projectId: string, doc: CompositionDocument): void;
  updateNode(nodeId: string, patch: Partial<CanonicalNode>): void;
  updateNodeProps(nodeId: string, patch: Record<string, unknown>): void;
  insertNode(parentPath: string, node: CanonicalNode, index?: number): void;
  removeNode(nodePath: string): void;
  updateDescendant(
    refPath: string,
    descendantPath: string,
    value: DescendantOverride,
  ): void;
}
```

역방향 adapter API 초안:

```ts
interface CanonicalLegacyExport {
  elements: LegacyElement[];
  pages: LegacyPage[];
  layouts: LegacyLayout[];
  diagnostics: CanonicalExportDiagnostic[];
}

interface CanonicalLegacyAdapter {
  exportLegacyDocument(doc: CompositionDocument): CanonicalLegacyExport;
  diffLegacyRoundtrip(
    before: LegacyAdapterInput,
    after: CanonicalLegacyExport,
  ): CanonicalRoundtripDiff;
}
```

원칙:

1. mutation API는 legacy `Element`를 입력으로 받지 않는다.
2. adapter는 legacy load/import/export에만 사용한다.
3. history entry는 canonical patch 단위로 기록한다.
4. `descendants` update는 slot fill, override patch, reset override를 모두 표현해야 한다.
5. `exportLegacyDocument()`는 Phase 3 shadow write 전 필수 산출물이다.

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
