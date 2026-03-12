# Workspace Scene Phase 1: SceneSnapshot Foundation

## Purpose

이 문서는 `ADR-037 Phase 1`의 구현 설계서다.
첫 단계의 목표는 전체 구조를 한 번에 뒤집는 것이 아니라,
`BuilderCanvas`에서 흩어진 scene 파생 계산을
`SceneSnapshot`이라는 읽기 모델로 수렴시키는 데 있다.

---

## Phase 1 Scope

포함:

- snapshot 타입 정의
- page/frame/visible page/selection read model 도입
- `BuilderCanvas`가 snapshot을 읽도록 변경
- 기존 렌더 경로와 공존 가능한 adapter 작성

제외:

- drag/resize/lasso state machine 재작성
- renderer direct store read 제거
- layout incremental patch
- `canvasSync` store 분리

---

## Current Pain Points

현재 [BuilderCanvas.tsx](/Users/admin/work/xstudio/apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx)는
아래 파생 계산을 직접 수행하거나 hook 결과를 조합한다.

- `depthMap`
- `pageElements`
- `allPageData`
- `pageFrames`
- `visiblePageIds`
- hit test용 selection bounds 계산

문제는 이 값들이 실제로 하나의 scene 상태에서 유도되는데,
컴포넌트별 `useMemo`와 local helper로 나뉘어 있다는 점이다.

Phase 1은 이를 “읽기 모델 통합” 단계로 정리한다.

---

## Target Output

### SceneSnapshot 타입

```ts
export interface SceneSnapshot {
  sceneVersion: number;
  layoutVersion: number;
  viewportVersion: number;
  selectionVersion: number;
  currentPageId: string | null;
  pageFrames: ScenePageFrame[];
  visiblePageIds: Set<string>;
  allPageData: Map<string, ScenePageData>;
  depthMap: Map<string, number>;
  selection: SelectionSnapshot;
}
```

### Supporting Types

```ts
export interface ScenePageFrame {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  elementCount: number;
}

export interface ScenePageData {
  bodyElement: Element | null;
  pageElements: Element[];
}

export interface SelectionSnapshot {
  selectedIds: string[];
  selectionBounds: BoundingBox | null;
}
```

---

## File Plan

### 신규 파일

```text
apps/builder/src/builder/workspace/canvas/scene/
  sceneSnapshotTypes.ts
  buildSceneIndex.ts
  buildVisiblePageSet.ts
  buildSelectionSnapshot.ts
  buildSceneSnapshot.ts
  index.ts
```

### 수정 대상

```text
apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx
apps/builder/src/builder/workspace/canvas/hooks/useMultiPageCanvasData.ts
```

### 유지 대상

```text
apps/builder/src/builder/workspace/canvas/components/ElementsLayer.tsx
apps/builder/src/builder/workspace/canvas/selection/SelectionLayer.tsx
apps/builder/src/builder/workspace/canvas/hooks/useCentralCanvasPointerHandlers.ts
```

이 Phase에서는 유지 대상의 구조를 직접 크게 바꾸지 않는다.

---

## Implementation Steps

### Step 1. Snapshot 타입 정의

- `SceneSnapshot`
- `ScenePageFrame`
- `ScenePageData`
- `SelectionSnapshot`

원칙:

- renderer 친화적 읽기 모델
- 쓰기 action 포함 금지
- store 객체를 그대로 노출하지 않고 파생값 중심으로 구성

### Step 2. Scene index builder 추출

기존 `useMultiPageCanvasData`의 일부 로직을 옮긴다.

대상:

- `allPageData`
- `pageFrames`

초기 단계에서는 기존 helper를 내부에서 재사용해도 된다.

### Step 3. Visible page 계산 분리

`visiblePageIds` 계산을 `buildVisiblePageSet.ts`로 분리한다.

입력:

- container size
- viewport state
- page frames

출력:

- `Set<string>`

### Step 4. Selection read model 추가

`SelectionSnapshot`은 초기에는 “읽기 모델”만 제공한다.

허용:

- 기존 selection bounds helper 재사용

금지:

- pointer session 로직 포함
- drag mutation 로직 포함

### Step 5. `buildSceneSnapshot()` 작성

모든 builder를 조합한다.

입력 예시:

```ts
interface SceneSnapshotInput {
  elements: Element[];
  elementsMap: Map<string, Element>;
  pages: Page[];
  pageIndex: {
    elementsByPage: Map<string, Set<string>>;
  };
  pagePositions: Record<string, { x: number; y: number } | undefined>;
  pageWidth: number;
  pageHeight: number;
  currentPageId: string | null;
  selectedElementIds: string[];
  zoom: number;
  panOffset: { x: number; y: number };
  containerSize: { width: number; height: number };
}
```

### Step 6. `BuilderCanvas`를 snapshot 소비자로 전환

대상 교체:

- `pageFrames`
- `allPageData`
- `visiblePageIds`

초기에는 아래 항목은 남겨도 된다.

- `useCanvasDragDropHelpers`
- `useDragInteraction`
- actual selection mutation

---

## Expected BuilderCanvas Diff

### 제거 또는 축소 예정

- page data 관련 `useMemo`
- page visible set 관련 `useMemo`
- page frame 관련 파생 계산

### 유지 예정

- Pixi app bootstrap
- interaction wiring
- overlay mounting

결과적으로 `BuilderCanvas`는 “파생 계산자”보다 “조립자” 성격이 강해져야 한다.

---

## Temporary Adapters

Phase 1에서는 아래 adapter를 허용한다.

1. `buildSelectionSnapshot()` 내부에서 기존 helper 호출
2. `buildSceneIndex()` 내부에서 `getPageElements()` 재사용
3. `BuilderCanvas`가 snapshot과 legacy local state를 혼용

단, 각 adapter에는 `ADR-037 Phase 2/3에서 제거` 주석을 달아야 한다.

---

## Acceptance Criteria

1. `BuilderCanvas`가 `scene/buildSceneSnapshot`을 통해 page/frame/visible data를 공급받는다.
2. 기존 렌더 결과와 동작이 동일하다.
3. `useMultiPageCanvasData`는 제거되거나 thin wrapper로 축소된다.
4. scene snapshot builder는 unit test 가능한 순수 함수 구조를 가진다.

---

## Suggested Tests

### Unit

- page별 body/non-body 분리
- page frame elementCount 계산
- viewport 밖 page filtering
- selection snapshot null/non-null 케이스

### Manual

- multi-page visible page 전환
- page title / page drag 렌더 유지
- selection box 표시 유지
- compare mode에서 page frame 위치 유지

---

## Risks

### Risk 1. Snapshot builder가 너무 많은 입력을 직접 읽음

완화:

- pure input object 사용
- builder 내부 store 접근 금지

### Risk 2. Phase 1에서 selection logic까지 과도하게 흡수하려는 유혹

완화:

- Phase 1은 read model only
- mutation/session logic은 Phase 2로 미룬다

### Risk 3. `BuilderCanvas`와 `useMultiPageCanvasData`가 동시에 살아 있어 중복 계산 발생

완화:

- phase 완료 시 `useMultiPageCanvasData`를 thin wrapper 또는 deprecated로 축소

---

## Exit Deliverables

Phase 1 완료 시 아래 산출물이 있어야 한다.

1. `scene/` 디렉터리 초기 뼈대
2. `SceneSnapshot` 타입 정의
3. `buildSceneSnapshot()` 도입
4. `BuilderCanvas`에서 snapshot 사용 시작
5. 관련 unit test 또는 최소한의 builder smoke test
