# Multi-Page Canvas Rendering (Frame-like)

## 개요

XStudio의 빌더 캔버스에서 모든 페이지를 Pencil의 Frame처럼 동시에 렌더링한다. 프리뷰(iframe)는 기존대로 현재 페이지 1개만 유지한다.

## 요구사항

- 렌더 범위: 프리뷰(iframe)는 현재 페이지 1개만 렌더링 유지.
- 캔버스 렌더: 모든 페이지를 동시에 표시.
- 페이지 배치: 가로 스택 기본 배치 (간격 80px).
- 위치 조절: 페이지 타이틀 영역 드래그로 위치 재배치 가능.
- 로딩 정책: 초기 로드 시 모든 페이지/요소를 로딩(페이지 단위 lazy load 없음).

## 동작 정의

- 캔버스는 페이지 컨테이너를 수평으로 배열하고 페이지 간 `PAGE_STACK_GAP = 80px` 간격을 유지한다.
- 드래그는 타이틀 영역에서 시작하며, 드래그 중 페이지 위치가 즉시 갱신된다.
- 페이지 간 전환은 프리뷰(iframe)에서만 발생하며, 캔버스 표시에는 영향을 주지 않는다.
- 현재 페이지 선택 상태는 유지하며, 캔버스에서 다른 페이지의 요소를 클릭하면 해당 페이지가 선택 상태로 전환된다.
- 빈 캔버스 영역(페이지 사이/페이지 밖) 클릭 시 선택이 완전히 해제된다 (`setSelectedElements([])`).
- Body 요소는 키보드(Delete/Backspace)로 삭제할 수 없으며, 페이지 삭제 시에만 함께 삭제된다.
- 활성 페이지의 타이틀은 selection 색상(`#3B82F6`)으로, 비활성 페이지는 slate-500(`#64748b`)으로 표시된다.

## 범위

- 적용 범위: Builder Canvas (Pixi/Skia) 영역.
- 제외 범위: Preview iframe 렌더링 방식 변경, 페이지 라우팅/스토리지 구조 변경.

---

## 구현 상세

### Phase 1: 페이지 위치 상태 관리

**변경 파일:** `stores/elements.ts`, `hooks/usePageManager.ts`

Store에 페이지별 위치 상태를 추가하고 초기 수평 배치를 계산한다.

```typescript
// stores/elements.ts — 추가된 상태 & 액션
pagePositions: Record<string, { x: number; y: number }>  // 페이지별 위치
pagePositionsVersion: number                              // 변경 감지용 카운터
initializePagePositions(pages, pageWidth, gap)            // 전체 위치 재계산
updatePagePosition(pageId, x, y)                          // 단일 페이지 위치 업데이트
```

- `initializePagePositions`: `order_num` 정렬 후 `currentX += pageWidth + gap` 방식으로 수평 배치.
- `usePageManager.initializeProject()` 완료 후 `initializePagePositions()` 호출.
- `addPage()` 시 기존 페이지들의 최대 X + 현재 `canvasSize.width` + gap 위치에 새 페이지 추가.
- 상단 바에서 breakpoint(사이즈) 변경 시 `BuilderCanvas`의 `useEffect`가 `pageWidth` 변경을 감지하여 `initializePagePositions()` 재호출 → 모든 페이지 위치를 새 사이즈 기준으로 재배치.
- 페이지 너비는 `useCanvasSyncStore.getState().canvasSize.width`에서 동적으로 읽음 (하드코딩 없음).

### Phase 2: 다중 페이지 PixiJS 씬 그래프

**변경 파일:** `canvas/BuilderCanvas.tsx`

Camera Container 아래에 페이지별 컨테이너를 생성하여 모든 페이지를 동시 렌더링한다.

**변경 전 구조:**
```
Camera
  BodyLayer (단일)
  CanvasBounds (단일)
  ElementsLayer (단일, currentPageId만)
  SelectionLayer
```

**변경 후 구조:**
```
Camera
  pages.map(page =>
    <PageContainer key={page.id} posX={pos.x} posY={pos.y}>
      <pixiGraphics />        ← 타이틀 드래그 히트 영역
      <BodyLayer />
      <CanvasBounds />
      {isVisible && <ElementsLayer />}   ← 뷰포트 컬링
    </PageContainer>
  )
  <SelectionLayer />          ← 최상단, 모든 페이지 위
```

- `PageContainer`: `memo` 컴포넌트로 추출하여 부모 리렌더 시에도 props 불변이면 스킵.
- `allPageData`: `pageIndex` 기반 O(1) 조회로 페이지별 body/elements 사전 계산 (기존 `elements.find/filter` O(N*M) 제거).
- `elementById`: store의 `elementsMap`을 직접 사용 (중복 Map 생성 제거).
- 페이지 컨테이너에 `x/y` 직접 배치 (Yoga layout 외부이므로 x/y prop 예외 허용).
- `@pixi/layout` formatStyles 병합 이슈 회피: 페이지 컨테이너에 `layout` prop 미사용.

### Phase 3: Skia 렌더링 멀티페이지 대응

**변경 파일:** `canvas/skia/SkiaOverlay.tsx`, `canvas/skia/selectionRenderer.ts`

#### Skia traverse() 수정 불필요 (핵심 발견)
`buildSkiaTreeHierarchical()`의 `traverse()`는 수정 없이 멀티페이지 호환:
- `worldTransform`이 모든 부모 offset(페이지 컨테이너 x/y 포함) 누적.
- labeled 노드의 `relX = absX - parentAbsX`에서 page offset이 자연스럽게 반영.
- unlabeled 컨테이너(`Page-{id}`)는 parentAbsX를 그대로 전달 → 하위 labeled 노드의 absX에 page offset 포함.

#### 트리 캐시 확장
```typescript
// 변경 전: registryVersion만 캐시 키
if (_cachedTree && registryVersion === _cachedVersion) return _cachedTree;

// 변경 후: pagePositionsVersion 추가
if (_cachedTree && registryVersion === _cachedVersion
    && pagePositionsVersion === _cachedPagePosVersion) return _cachedTree;
```

#### Content Layer 재렌더 트리거
- `registryVersion + pagePosVersion` 합산 방식 **폐기** (버전 충돌 위험).
- `pagePosVersionRef`로 React lifecycle에서 갱신, 렌더 루프에서 변경 감지 시 `renderer.invalidateContent()` 호출.
- 매 프레임 `useStore.getState()` 호출 제거 → ref 기반.

#### 페이지 전환 시 레지스트리 초기화 제거
- 모든 페이지가 동시 마운트되므로 `clearSkiaRegistry()` / `clearImageCache()` / `clearTextParagraphCache()` 호출 제거.
- `currentPageId` 변경 시에는 `invalidateContent()`만 호출 (선택 하이라이트 갱신용).

#### 페이지 타이틀 렌더링
- `renderPageTitle(ck, canvas, title, zoom, fontMgr, isActive)`:
  - 활성 페이지: selection 색상(`#3B82F6`, SELECTION_R/G/B), opacity 1, Medium weight.
  - 비활성 페이지: slate-500(`#64748b`), opacity 0.8, Normal weight.
- 렌더 루프에서 `useStore.getState().currentPageId`와 비교하여 `isActive` 결정.

### Phase 4: 페이지 클릭 → currentPage 전환

**변경 파일:** `canvas/BuilderCanvas.tsx`

- `handleElementClick`에서 클릭된 요소의 `page_id`가 `currentPageId`와 다르면:
  1. 기존 선택 해제 (`clearSelection()`)
  2. `setCurrentPageId(element.page_id)` 호출
  3. 클릭된 요소 선택
- Cmd+Click 다중 선택 시 크로스 페이지 방지: 다른 페이지 요소면 페이지 전환 + 단일 선택.

### Phase 5: Selection 페이지 경계 처리

**변경 파일:** `canvas/BuilderCanvas.tsx`, `canvas/selection/SelectionLayer.tsx`

- `SelectionLayer`에 `pagePositions`, `pagePositionsVersion` prop 전달 (기존 인터페이스 활용).
- `findElementsInLassoArea`에서 `currentPageId` 요소만 대상 필터링.
- 빈 영역 클릭(영역 0 라쏘): `setSelectedElements([])` 호출 — `selectedElementId`, `selectedElementProps`까지 완전 초기화.
  - 기존 `clearSelection()`은 `selection.ts` 슬라이스만 초기화하여 트리/패널에 잔류 문제 있었음.
- boundsMap 캐시에 `pagePosVersion` 분리 키 추가 → 페이지 이동 시 selection bounds 정확성 유지.

### Phase 6: Viewport Culling 페이지 단위 최적화

**변경 파일:** `canvas/BuilderCanvas.tsx`

```typescript
const visiblePageIds = useMemo(() => {
  const visible = new Set<string>();
  for (const page of pages) {
    const pos = pagePositions[page.id];
    // 스크린 좌표 AABB vs 뷰포트 충돌 검사 (margin=200px)
    if (isInViewport(screenX, screenY, screenW, screenH, margin))
      visible.add(page.id);
  }
  return visible;
}, [pages, pagePositionsVersion, pageWidth, pageHeight, zoom, panOffset, containerSize]);
```

- 뷰포트 밖 페이지는 `ElementsLayer` 조건부 렌더링 제외 (BodyLayer/CanvasBounds는 항상 렌더 — 가벼움).
- 200px 마진으로 패닝 시 깜빡임 방지.

### Phase 7: 페이지 타이틀 드래그로 위치 재배치

**변경/추가 파일:** `canvas/hooks/usePageDrag.ts` (신규), `canvas/BuilderCanvas.tsx`

```typescript
export function usePageDrag(zoom: number): UsePageDragReturn {
  // pointerDown → window.pointermove → window.pointerup
  // RAF 스로틀링으로 프레임당 1회 updatePagePosition() 호출
  // startPointer: DOM clientX/clientY 사용 (PixiJS global 좌표 아님 — 좌표계 통일)
}
```

- 타이틀 히트 영역: `PAGE_TITLE_HIT_HEIGHT = 24px`, 페이지 상단 위쪽에 투명 Graphics.
- `onPointerDown`에서 `e.nativeEvent.clientX/clientY` 전달 (DOM 좌표계로 통일).
- PixiJS EventBoundary가 타이틀 영역 vs 내부 요소 드래그를 자동 분리.

---

## 성능 최적화

| 최적화 | 변경 전 | 변경 후 |
|--------|---------|---------|
| `allPageData` | `elements.find/filter` O(N*M) | `pageIndex` O(1) 조회 |
| `elementById` | `new Map(elements.map())` 매 렌더 생성 | `elementsMap` 직접 참조 |
| 페이지 컨테이너 | 인라인 JSX (매 렌더 재생성) | `PageContainer` memo 컴포넌트 |
| Skia content 감지 | `registryVersion + pagePosVersion` 합산 | `invalidateContent()` + ref 기반 감지 |
| 매 프레임 store 읽기 | `useStore.getState().pagePositionsVersion` | `pagePosVersionRef` (React lifecycle 갱신) |
| Skia boundsMap | `registryVersion` 단일 캐시 키 | `registryVersion` + `pagePosVersion` 분리 키 |

---

## Body 요소 보호

- **키보드 삭제 방지:** `useGlobalKeyboardShortcuts.handleCanvasDelete`에서 `tag === 'body'` 요소를 삭제 대상에서 필터링.
- **Store 레벨 가드:** `elementRemoval.ts`의 `removeElement` 액션에서도 body 요소 직접 삭제 차단.
- **페이지 삭제 시:** DB에서 직접 삭제 (`removeElement` 미경유) → 정상 동작.

---

## 수정 대상 파일 요약

| 파일 | Phase | 변경 내용 |
|------|-------|-----------|
| `stores/elements.ts` | 1 | `pagePositions`, `pagePositionsVersion`, `initializePagePositions`, `updatePagePosition` 상태/액션 추가 |
| `stores/utils/elementRemoval.ts` | — | Body 요소 삭제 가드 추가 |
| `hooks/usePageManager.ts` | 1 | 초기화 시 `initializePagePositions` 호출, `addPage` 시 새 페이지 위치 계산 (동적 canvasSize) |
| `hooks/useGlobalKeyboardShortcuts.ts` | — | `handleCanvasDelete`에서 body 요소 필터링 |
| `canvas/BuilderCanvas.tsx` | 2,4,5,6 | 핵심 구조 변경: `PageContainer` memo, `allPageData` pageIndex 기반, viewport culling, 페이지 전환, 선택 해제 |
| `canvas/layers/BodyLayer.tsx` | 2 | `pageId` prop 사용 (기존 인터페이스) |
| `canvas/skia/SkiaOverlay.tsx` | 3 | 트리 캐시 `pagePosVersion` 추가, 레지스트리 초기화 제거, content invalidation ref 기반 |
| `canvas/skia/selectionRenderer.ts` | 3 | `renderPageTitle` isActive 파라미터 추가 (selection 색상) |
| `canvas/selection/SelectionLayer.tsx` | 5 | `pagePositions`, `pagePositionsVersion` prop 연결 |
| `canvas/hooks/useViewportCulling.ts` | 6 | 페이지 단위 컬링 지원 |
| `canvas/hooks/usePageDrag.ts` | 7 | **신규** — 페이지 드래그 훅 (RAF 스로틀, DOM 좌표계) |

---

## 로딩/성능 정책

- 초기 진입 시 모든 페이지 요소를 한 번에 로딩한다.
- 페이지 단위 lazy loading은 비활성화한다.
- 뷰포트 밖 전체 페이지는 `ElementsLayer` 렌더링을 건너뛴다 (200px 마진).
- Skia 트리 캐시와 boundsMap 캐시는 `registryVersion` + `pagePositionsVersion` 기반으로 동작한다.

## UI 메모

- 페이지 타이틀 영역(`PAGE_TITLE_HIT_HEIGHT = 24px`)은 드래그 핸들로 동작한다.
- 타이틀은 페이지 상단에 노출하며, 활성 페이지는 selection 색상(`#3B82F6`), 비활성은 slate-500.
- 페이지 간 간격: `PAGE_STACK_GAP = 80px`.
