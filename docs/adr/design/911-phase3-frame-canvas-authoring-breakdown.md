# ADR-911 Phase 3 — Frame Canvas Authoring 시각 path Breakdown

> **상태**: Proposed (2026-04-28 세션 46) — 본격 land 미진입
> **연결 ADR**: [911](../911-layout-frameset-pencil-redesign.md) Phase 3 sub-phase
> **prerequisite**: 본 sub-phase 가 [ADR-912](../912-editing-semantics-ui-5elements.md) 의 Canvas 시각 마커 land 의 prerequisite

## 1. 결함 요약

### 사용자 시나리오

1. FramesTab 에서 새 Frame 추가 (Frame 1, Frame 2 등)
2. Inspector 에서 Layout Preset 선택 (예: "수직 2단", "수직 3단")
3. **기대**: Skia 캔버스에 영역 구분 slot 들이 시각화 (header / content / footer 분리선)
4. **실제**: Skia 캔버스에 page (Home) 사각형만 표시. frame body + slot 영역 미렌더

### 측정 evidence (세션 46 Chrome MCP)

```js
// Builder dev runtime store state
pagePositions: { "234dc7c9-...": { x: 0, y: 0 } }   // ← page 1개만, frame 좌표 0건
editingContextId: null                              // ← frame editing context 진입 path 없음
elementsMap: 8 elements                             // page body + Frame 1 body+2 Slots + Frame 2 body+3 Slots
childrenMap.root = [
  "29f8a4b0",  // page body (page=234dc7c9)
  "91c01890",  // Frame 1 body (layout=f49ac75d) — root 자식이지만 viewport 밖
  "77ae39dc",  // Frame 2 body (layout=9c945c91) — 동일
]
```

### Root cause 진단 (3 layer)

| Layer                   | 결함                                                                                                                                             | 영향                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **L1**: 좌표 등록       | `pagePositions` 가 page id 만 key. frame id 의 좌표 등록 path 부재 (`updatePagePosition: (pageId, x, y)`)                                        | frame body 의 viewport 좌표 없음 → 캔버스에 그릴 영역 없음 |
| **L2**: 그룹 계산       | `computeLayoutGroups(pages, layouts, doc)` 가 page-layout 매핑 (그래픽 그룹 라벨링) 만. frame 자체를 별도 캔버스 영역으로 그릴 그룹화 logic 없음 | frame editing 시 별도 영역 계산 안 됨                      |
| **L3**: editing context | `editingContextId` 가 frame 선택 시 frame.id 로 갱신되지 않음. SkiaCanvas 가 frame editing 모드 인지 path 없음                                   | frame editing 진입 시각 표현 불가                          |

### Cutover 의 의미

- ADR-911 cutover commit `7b6f4eb9` (Phase 2 PR-E4) = **`featureFlags` default true flip 만** (4 file / 38/-8 라인, 실 logic 0건)
- 즉 frame canvas authoring 시각 path 는 **dual-mode (legacy/canonical 모두) 시절부터 미구현**
- cutover 가 회귀를 만든 게 아니라 **ADR-911 design 자체의 fundamental 미완성** 노출
- Gate G2 (시각 회귀 0) 충족 불가 → Phase 2 closure 보류

## 2. Sub-phase 분해

| Sub-phase | 작업                                                                                                                                                                           | 예상 비용 |   위험   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------: | :------: |
| **P3-α**  | `pagePositions` 확장 또는 신규 `framePositions` map 도입 — frame id → `{x, y, width, height}` 저장 + 갱신 setter                                                               |    1d     |   MED    |
| **P3-β**  | `computeLayoutGroups` 확장 — frame 별 캔버스 영역 그룹 추가. selectedReusableFrameId 또는 모든 reusable frame 을 별도 영역으로 계산                                            |    1d     |   MED    |
| **P3-γ**  | frame editing indicator 갱신 path — `selectReusableFrame` 이 `useLayoutsStore.selectedReusableFrameId` 갱신 (이미 구현). 캔버스 consumer 가 indicator read 후 P3-δ render 분기 |   0.5d    |   LOW    |
| **P3-δ**  | Skia render path 통합 — BuilderCanvas 의 page viewport 외에 frame viewport 추가. frame body+slot 들이 frame viewport 안에 그려짐                                               |    2d     | **HIGH** |
| **P3-ε**  | hit-test/drag/selection 통합 — frame 영역도 사용자 인터랙션 가능 (선택, 드래그, hover)                                                                                         |   1.5d    |   MED    |
| **P3-ζ**  | Chrome MCP 시각 회귀 검증 + roundtrip — Frame 추가 → Layout preset 적용 → Skia slot 시각화 사용자 시나리오 GREEN                                                               |   0.5d    |   LOW    |

**총 예상**: 6.5d ≈ **1주+** HIGH

## 3. 대안 검토

### 대안 A: 본 sub-phase 분해대로 진입 (frame canvas viewport 신규 도입)

- 위험: 기술(M) / 성능(M) / 유지보수(M) / 마이그레이션(L)
- 장점: pencil app 호환 design 정합 (frame 이 1급 캔버스 영역)
- 단점: 1주+ HIGH 작업, BuilderCanvas 광범위 변경

### 대안 B: page.layout_id 기반 inline 시각화 (frame body 를 page 안에 그림)

- 위험: 기술(L) / 성능(L) / 유지보수(M) / 마이그레이션(L)
- 장점: pagePositions 확장 불필요. page → frame 통합 시각 표현
- 단점: 한 page 가 한 frame 만 적용 가능 (현재 model). reusable frame 의 다중 page 사용 시 각 page 마다 동일 frame 시각 반복 — 사용자 인지 저하
- pencil app 의 frame editing semantics 와 정합 안 됨

### 대안 C: page.layout_id 자동 cleanup + 사용자 인지 변경 (frame 자체는 시각화 안 함)

- 위험: 기술(L) / 성능(L) / 유지보수(L) / 마이그레이션(L)
- 장점: 최소 변경. 단순 데이터 정합 fix
- 단점: 사용자가 FramesTab 에서 Frame 추가/편집 시 시각 feedback 0 — UX 손실
- ADR-911 의 핵심 가치 (frame authoring) 자체 포기

### Risk Threshold Check

| 대안 | HIGH+ | 판정                         |
| ---- | :---: | ---------------------------- |
| A    |   0   | 채택 권장 (1주+ 비용 수용)   |
| B    |   0   | 채택 가능, 사용자 인지 단점  |
| C    |   0   | 채택 가능, ADR-911 가치 손실 |

대안 A 채택 권장 — pencil app 호환 design 정합 + 사용자 인지 완성. 단, 본격 land 는 별도 세션 (1주+ HIGH).

## 4. Gate

| Gate     | 시점      | 통과 조건                                                                                                                                                                                                  | 실패 시                     |
| -------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **G3-α** | P3-α 완료 | (a) `framePositions` 또는 확장된 `pagePositions` 에 frame id 좌표 저장 (b) updatePosition setter 동작 (c) test 5/5 PASS                                                                                    | 데이터 모델 재검토          |
| **G3-β** | P3-β 완료 | (a) computeLayoutGroups 가 frame 영역 그룹 반환 (b) 기존 page 그룹화 회귀 0                                                                                                                                | layoutGroup 알고리즘 재검토 |
| **G3-γ** | P3-γ 완료 | (a) `selectReusableFrame(frameId)` 후 `selectedReusableFrameId === frameId` (b) `selectReusableFrame(null)` 후 `selectedReusableFrameId === null` (c) `editingContextId` 미충돌 (element-id semantic 보존) |                             |
| **G3-δ** | P3-δ 완료 | (a) Skia 캔버스에 frame body 영역 그려짐 (b) frame body 자식 (slot) 도 영역 안에 그려짐 (c) Chrome MCP screenshot 사용자 시나리오 GREEN                                                                    | render 알고리즘 재검토      |
| **G3-ε** | P3-ε 완료 | (a) frame body 클릭 시 selection (b) drag 가능 (c) hover outline 표시                                                                                                                                      |                             |
| **G3-ζ** | P3 종결   | (a) Chrome MCP 사용자 회귀 시나리오 100% GREEN (b) `mockLargeDataV2` 시각 회귀 0 (c) 기존 page 캔버스 회귀 0                                                                                               | 부분 land 후 후속           |

## 4.5. P3-γ 설계 결정 (세션 47, B 채택)

본 sub-phase 의 indicator 필드는 **`editingContextId` (X) → `selectedReusableFrameId` (✓)** 로 정정.

**왜**: `editingContextId` 는 `elements.ts` 정의로 element id 타입. `resolveClickTarget` (`hierarchicalSelection.ts:25`) 가 `parent_id` chain 을 탐색하여 직계 자식 식별 — frameId (legacy layoutId) 직접 대입 시 chain 매칭 실패 → `useCanvasElementSelectionHandlers.ts:187` 의 자동 exit 분기 trigger → 사용자가 첫 클릭만에 frame editing 모드 강제 종료.

**대안**: `selectedReusableFrameId` (`useLayoutsStore`, ADR-903 P3-B 도입) 는 이미 frame editing indicator 로 설계됐고 `selectReusableFrame` 이 갱신 중. 캔버스 read path 만 P3-δ Skia render 통합 시 추가 (dead read 회피).

**대등 분리**: P3-α 의 `framePositions` 별도 map 결정과 동일한 domain 분리 패턴 — `editingContextId` (element 클릭 scope) 와 `selectedReusableFrameId` (frame 편집 indicator) 의 semantic 충돌 회피.

## 4.6. P3-δ 진입 inventory (세션 47, P3-δ-1)

### Render 경로 chain (Skia frame pipeline)

```
BuilderCanvas.tsx (line 230-381)
   ↓ subscribe pagePositions / pagePositionsVersion / sceneSnapshot
createSkiaRendererInput (rendererInput.ts:76-106)
   ↓ rendererInput { pages, pageSnapshots, pagePositions, pagePositionsVersion, ... }
skiaFramePipeline.ts:229
   ↓ collectVisiblePageRoots(rendererInput)
visiblePageRoots.ts:15
   ↓ for (const page of rendererInput.pages) → bodyElement → rootElementIds
   ↓ bodyPagePositions[bodyElement.id] = pagePositions[page.id]
getCachedCommandStream(rootElementIds, ..., bodyPagePositions, ...)
   ↓ cache key: registryVersion + pagePositionsVersion + sharedLayoutVersion + rootSignature
buildRenderCommandStream → DFS → RenderCommand[] + boundsMap
```

### Root cause 위치 확정

`visiblePageRoots.ts:15` 의 `for (const page of rendererInput.pages)` 만 iterate — frame body element 는 `elementsMap`/`childrenMap.root` 에 존재하지만 **page 가 아니므로 root list 진입 path 0**. 따라서 Skia 가 frame body 를 그리지 않음. 세션 46 evidence (`pagePositions: { page-id: {x:0,y:0} }`, frame 좌표 0건) 와 정확히 일치.

### 변경 surface (5 파일, ~80 line + test)

| 파일                                         | 변경                                                                                                             | 영향 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---- |
| `skia/visibleFrameRoots.ts`                  | **신규** — `collectVisibleFrameRoots(rendererInput, framePositions, frameAreas, ...)` (~50 line)                 | NEW  |
| `skia/skiaFramePipeline.ts:229`              | rootElementIds 병합 (page + frame), bodyPagePositions 단일 맵 통합                                               | ~10  |
| `skia/renderCommands.ts:209-243`             | `getCachedCommandStream` cache key 에 `framePositionsVersion` 추가 (4 → 5 키)                                    | ~5   |
| `renderers/rendererInput.ts:76-106`          | input 에 `framePositions`/`framePositionsVersion`/`frameAreas` 통합                                              | ~10  |
| `workspace/canvas/BuilderCanvas.tsx:230-380` | framePositions/Version selector 추가 + `useLayoutsStore` selectedReusableFrameId subscribe (P3-γ B 안 read path) | ~5   |

### 결정 분기 3건

#### D1. frame body element 식별 방법

| 옵션                                                                | 장점                                                                        | 단점                                          | 권고 |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------- | ---- |
| **A. `el.layout_id === frameId` 매칭** (composition-pre-1.0 legacy) | 이미 ADR-903 P3-E E-6 에서 검증된 패턴. canonical adapter 가 layout_id 보존 | legacy 의존 — Phase 4 legacy 0 시 재작업 가능 | ✓    |
| B. canonical doc 의 reusable FrameNode → metadata.layoutId 매칭     | Phase 4 legacy 0 후에도 유지                                                | 실 elementsMap iteration 필요, 분기 추가      |      |

**A 권고** — P3-δ 단계에서는 이미 검증된 패턴 재사용. Phase 4 legacy 0 진입 시 B 로 마이그레이션 (별도 작업).

#### D2. viewport root collection 함수 — 통합 vs 분리

| 옵션                                           | 장점                                                                                                       | 단점                                                                        | 권고 |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---- |
| A. `collectVisiblePageRoots` 확장 (page+frame) | 단일 함수, caller 1개                                                                                      | 두 domain (page/frame) 단일 함수 안에 mix — P3-α/β 의 domain 분리 패턴 위반 |      |
| **B. 신규 `collectVisibleFrameRoots` 추가**    | P3-α framePositions / P3-β computeFrameAreas / P3-γ selectedReusableFrameId 도입과 일관된 domain 분리 패턴 | caller 가 두 함수 호출 후 결과 병합 (~5 line)                               | ✓    |

**B 권고** — domain 분리 + 본 세션의 일관 패턴 유지.

#### D3. frame body 좌표 lookup 자료구조

| 옵션                                                                         | 장점                                                | 단점                                                          | 권고 |
| ---------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------- | ---- |
| **A. `bodyPagePositions` 단일 맵 통합** (frame body element id → {x,y} 추가) | renderCommands.ts 시그니처 미변경, caller 영향 최소 | 이름이 "PagePositions" 라 frame entry 혼재 시 의미 misleading | ✓    |
| B. `bodyFramePositions` 별도 맵 + `buildRenderCommandStream` 시그니처 확장   | 이름 정합                                           | 시그니처 + caller chain 확장, 복잡도 증가                     |      |

**A 권고** — 단일 맵 + 변수명 `bodyRootPositions` 로 rename 검토 (Phase 4 cleanup 시).

### G3-δ 통과 조건 (재확인)

- (a) Skia 캔버스에 frame body 영역 그려짐 — frame border + 빈 background
- (b) frame body 자식 (slot) 도 영역 안에 그려짐 — childrenMap DFS 정상 동작
- (c) Chrome MCP screenshot 사용자 시나리오 GREEN — Frame 추가 → Layout preset 적용 → slot 영역 시각화

### P3-δ 진입 시 작업 비용 재산정

D1=A, D2=B, D3=A 채택 시 **~1d (HIGH 2d 의 lower bound)**. 다음 세션에서 본격 land. 본 세션 P3-δ-1 inventory 는 진입 위험 50% 감소 (변경 surface + 결정 분기 사전 lock-in).

## 4.7. P3-δ fix #3 — frame body fullTreeLayout 발행 path (세션 47 후속, 다음 세션 진입)

### 결함 요약

본 세션 47 의 P3-δ + fix #1+#2 land 후 Chrome MCP 검증 (2026-04-28):

- **frame body 자체는 시각화 ✅** — collectVisibleFrameRoots → rootElementIds 진입 + framePositions 좌표 적용. 큰 사각형 (390×844) 캔버스에 그려짐
- **frame body 자식 (Slot 들) 시각화 ❌** — slot 분리선 / header / content 영역 미표시. screenshot 에 빈 사각형만 보임

### Root cause (systematic-debugging Phase 1-2)

| Layer                                      | 결함                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| **`useLayoutPublisher`**                   | `visiblePages.map(...)` 만 처리 — frame body input 0건                    |
| **`buildPixiPageRendererInput`**           | `pageId: page.id` 가 필수 — frame body 는 page 가 아님                    |
| **`publishLayoutMap(layoutMap, page_id)`** | 두번째 인자 = `bodyElement.page_id` — frame body 는 `page_id === null`    |
| **`getCachedPageLayout`**                  | page-centric — bodyElement / pageElements / pageWidth/Height 가 page 기준 |

→ frame body 와 자식 의 fullTreeLayout 호출 path **자체 부재**. layoutMap 에 entry 없음.

→ `visitElement` (`renderCommands.ts:356`) 에서 `layoutMap.get(slotId) === undefined` → `skiaData.width/height` fallback. Slot 의 `skiaData.width = 0` → DFS 진입 하지만 0×0 → 시각적 invisible.

frame body 자체가 보이는 이유 = framePositions 좌표 + skiaData 또는 element.props 의 width/height 가 어떻게든 살아있어서 큰 사각형으로 그려짐. 일관성 없는 동작이지만 root cause 는 자식 layout 미계산.

### 변경 surface (예상 4 파일 + test)

| 파일                                                 | 변경                                                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `hooks/useLayoutPublisher.ts`                        | 시그니처 확장: `framePages: PageLayoutInput[]` 추가 입력. frame body 도 동일 logic 처리         |
| `renderers/rendererInput.ts`                         | `buildFrameRendererInput(...)` 신규 — frame body 용 PixiPageRendererInput-like 구조 빌드        |
| `BuilderCanvas.tsx`                                  | `frameLayoutPublisherInputs` useMemo + useLayoutPublisher 두번째 인자                           |
| `layout/engines/fullTreeLayout.ts::publishLayoutMap` | 키 정책: `bodyElement.page_id ?? bodyElement.layout_id ?? bodyElement.id` (frame body fallback) |

### 결정 분기 3건 (다음 세션 시작 시 사용자 승인 대기)

#### D4. frame body input 빌드 함수

| 옵션                                                        | 장점                                                 | 단점                                                    | 권고 |
| ----------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- | ---- |
| **A. `buildFrameRendererInput` 신규 (page-centric 비대칭)** | rendererInput.ts 의 page 함수와 frame 함수 분리 명확 | 두 함수 사이 코드 중복 (~30 line)                       | ✓    |
| B. `buildPixiPageRendererInput` generic 화                  | 단일 함수                                            | page-centric 가정 깨고 generic root 도입 — 변경 범위 큼 |      |

**A 권고** — P3-α/β/γ/δ 의 domain 분리 일관 패턴 유지.

#### D5. publishLayoutMap 키 정책

| 옵션                                                            | 장점                            | 단점                                         | 권고 |
| --------------------------------------------------------------- | ------------------------------- | -------------------------------------------- | ---- |
| **A. fallback chain: `page_id ?? layout_id ?? id`**             | 최소 변경, frame body 매칭 가능 | 키 의미 mixed (page-id/layout-id/element-id) | ✓    |
| B. `publishLayoutMap` 시그니처 확장 — 두번째 인자 명시 root key | 키 명시 명확                    | caller 다수 영향                             |      |

**A 권고** — 즉시 도입 가능. Phase 4 cleanup 시 generic key 마이그레이션 (별도 작업).

#### D6. layoutVersion / dimension key 통합

`useLayoutPublisher` 의 dimensionKey 가 page 만 처리. frame 도 추가 시 `framePositionsVersion` + frame width/height 도 dimensionKey 에 포함 필요.

| 옵션                                         | 장점                | 단점                                        |
| -------------------------------------------- | ------------------- | ------------------------------------------- |
| **A. 단일 dimensionKey 에 frame entry 추가** | 단일 useEffect 유지 | frame width/height 미정 시 처리 (page 동일) |
| B. frame 별도 useEffect                      | scope 분리          | hook count 증가                             |

**A 권고** — 단일 hook flow 유지.

### G3-δ fix #3 통과 조건

- (a) frame body 자식 (Slot) 의 layout 계산 결과가 layoutMap 에 entry 보유 (Chrome MCP `_lastBoundsMap` 에 slot id entry width > 0)
- (b) Skia 캔버스에 slot 분리선 / 영역 시각화 — 수직 2단 preset 의 header / content 분리 명확
- (c) Chrome MCP screenshot 사용자 시나리오 GREEN

### 비용 재산정

D4=A, D5=A, D6=A 채택 시 **~1d HIGH** (당초 P3-δ 본격 land 의 lower bound 와 동일 — fix #1/#2 의 추가 1d MED 가 본 fix 의 prerequisite 였음). 본 fix #3 land 후 G3-δ 전체 충족 → P3-ε / P3-ζ 진입.

## 5. 비고

- 본 sub-phase 진입 시 **1주+ HIGH 작업**. design 단계가 prerequisite — 단순 fix 불가
- ADR-912 (Editing Semantics UI 5요소) 의 Canvas 시각 마커는 **본 P3 base render 위에 land**. 본 결함이 ADR-912 의 prerequisite
- ADR-911 monitoring 6일 대기 framing 무의미 — Gate G2 가 사용자 회귀 보고로 미충족 확정. monitoring 종결이 시각 회귀를 해소하지 않음
- 본 sub-phase 가 ADR-911 Phase 3 의 신규 영역. 기존 Phase 3 (cascade 재작성) 와 별개로 진행 가능 — 두 영역 schema 직교

## 6. 참조

- [ADR-911 본문](../911-layout-frameset-pencil-redesign.md) (진행 로그 2026-04-28 entry)
- [ADR-911 design breakdown 본체](911-layout-frameset-pencil-redesign-breakdown.md)
- [ADR-911 Closure 체크리스트](911-closure-checklist.md) — 본 P3 land 후 종결 체크
- [ADR-912](../912-editing-semantics-ui-5elements.md) — 시각 마커 (본 P3 prerequisite)
- 세션 46 fix commits — `1f732be3` / `f299d373` (LayerTree/Inspector 정상화, Skia 캔버스는 본 P3 작업 후)
