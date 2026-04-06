# ADR-100 Phase 2: SceneGraph + PixiJS 제거

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PixiJS를 완전히 제거하고 순수 TS SceneGraph + CanvasKit 단일 렌더러로 전환. Feature flag 기반 점진 배포.

**Architecture:** SceneGraph(순수 TS retained mode) + StoreBridge(Zustand→SceneGraph, React 우회) + SkiaRenderer(SceneGraph에서 직접 렌더) + Event System(DOM→WASM HitTest→SceneGraph→Store)

**Tech Stack:** TypeScript, CanvasKit/Skia WASM, Zustand, Vitest

**Prerequisite:** Phase 1 완료 (Rust Layout Engine + layoutBridge.ts)

**Phase 0 Baseline:** 아이들 50fps, 154MB 힙, WebGL 2개

---

## 서브 Phase 구조

Phase 2는 feature flag별 점진 전환:

```
2A: SceneGraph 코어 (SceneNode 트리 관리 + dirty tracking)
2B: StoreBridge (Zustand→SceneGraph 동기화, React 렌더 우회)
2C: HoverManager + CursorManager (USE_DOM_HOVER flag)
2D: Camera 클래스 (USE_CAMERA_OBJECT flag)
2E: SkiaRenderer SceneGraph 연결 (USE_SCENE_GRAPH flag)
2F: PixiJS 제거 (REMOVE_PIXI flag)
2G: 78개 기능 파리티 검증
```

## Task 2.1: SceneGraph 코어 구현

**Files:**

- Create: `apps/builder/src/builder/workspace/canvas/sceneGraph/SceneGraph.ts`
- Modify: `apps/builder/src/builder/workspace/canvas/sceneGraph/types.ts` (필요시)
- Create: `apps/builder/src/builder/workspace/canvas/sceneGraph/__tests__/SceneGraph.test.ts`

SceneNode 트리 관리 클래스. Phase 0에서 정의한 `SceneNode`, `DirtyFlags`, `ComputedLayout` 타입 사용.

핵심 API:

```typescript
class SceneGraph {
  createNode(
    id: string,
    tag: string,
    parentId: string | null,
    style: Record<string, unknown>,
  ): SceneNode;
  updateStyle(id: string, changes: Record<string, unknown>): void;
  updateLayout(id: string, layout: ComputedLayout): void;
  moveNode(id: string, newParentId: string, index: number): void;
  removeNode(id: string): void;
  getNode(id: string): SceneNode | undefined;
  getChildren(id: string): SceneNode[];
  markDirty(id: string, flags: DirtyFlags): void;
  collectDirtyNodes(): string[];
  clearDirty(): void;
  getVisibleNodes(viewport: DOMRect): SceneNode[];
}
```

테스트: 노드 CRUD, dirty 전파, 트리 순회.

---

## Task 2.2: StoreBridge 구현

**Files:**

- Create: `apps/builder/src/builder/workspace/canvas/sceneGraph/StoreBridge.ts`
- Create: `apps/builder/src/builder/workspace/canvas/sceneGraph/__tests__/StoreBridge.test.ts`

Zustand store 변경을 SceneGraph에 반영. React 렌더 사이클 우회.

핵심:

```typescript
class StoreBridge {
  constructor(graph: SceneGraph, store: BuilderStore);
  flush(): void; // RAF에서 호출 — 변경 큐 일괄 처리
  dispose(): void;
}
```

Store `subscribe()`로 elementsMap/childrenMap 변경 감지 → SceneGraph 노드 생성/갱신/삭제.

---

## Task 2.3: HoverManager + CursorManager

**Files:**

- Create: `apps/builder/src/builder/workspace/canvas/events/HoverManager.ts`
- Create: `apps/builder/src/builder/workspace/canvas/events/CursorManager.ts`

PixiJS의 hover/pressed 상태 + cursor 관리를 DOM 이벤트로 대체.

```typescript
// HoverManager (~30줄)
class HoverManager {
  onPointerMove(canvasPoint: Point): void; // hitTest → setPreviewState
}

// CursorManager (~15줄)
class CursorManager {
  updateCursor(nodeId: string | null, handleHit: string | null): void;
}
```

Feature flag: `USE_DOM_HOVER`

---

## Task 2.4: Camera 클래스

**Files:**

- Create: `apps/builder/src/builder/workspace/canvas/viewport/Camera.ts`

PixiJS Container 대체. 숫자 3개 (x, y, zoom).

```typescript
class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  screenToCanvas(screenX: number, screenY: number, rect: DOMRect): Point;
  canvasToScreen(canvasX: number, canvasY: number, rect: DOMRect): Point;
  applyToSkia(canvas: CanvasKitCanvas): void;
}
```

Feature flag: `USE_CAMERA_OBJECT`

---

## Task 2.5: GPU Backend 구현 (CanvasKitWebGLBackend)

**Files:**

- Create: `apps/builder/src/builder/workspace/canvas/gpu/CanvasKitWebGLBackend.ts`

Phase 0의 `GPUBackend` 인터페이스 구현. 기존 `createSurface.ts` + `SkiaRenderer.ts`의 Surface 로직을 이식.

---

## Task 2.6: SkiaRenderer SceneGraph 연결

**Files:**

- Modify: `apps/builder/src/builder/workspace/canvas/skia/SkiaOverlay.tsx` (feature flag 분기)
- Create: `apps/builder/src/builder/workspace/canvas/skia/SkiaCanvas.tsx` (SceneGraph 기반 단독 렌더러)

`USE_SCENE_GRAPH=true`일 때 SkiaRenderer가 SceneGraph에서 직접 렌더.
기존 SkiaOverlay.tsx는 수정하지 않고, 새 SkiaCanvas.tsx를 feature flag로 분기.

---

## Task 2.7: BuilderCanvas feature flag 분기

**Files:**

- Modify: `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx`

`REMOVE_PIXI=true`일 때 PixiJS `<Application>` 대신 순수 `<canvas>` + SceneGraph 경로.
기존 코드는 그대로, flag 분기만 추가.

---

## Task 2.8: 기능 파리티 78개 검증

**Files:**

- Create: `apps/builder/src/builder/workspace/canvas/__tests__/featureParity.test.ts`

섹션 13 체크리스트의 핵심 항목 자동 검증:

- 선택 (S1~S5)
- 드래그 임계값 (D3)
- 뷰포트 (V1, V5)
- 텍스트 편집 (T1)
- 렌더링 (R1~R11 스크린샷)

---

## Task 2.9: Phase 2 Gate 검증

| Gate 항목                 | 검증                 |
| ------------------------- | -------------------- |
| pnpm type-check           | 0 errors             |
| vitest SceneGraph         | tests pass           |
| USE_DOM_HOVER=true 동작   | hover 상태 정상      |
| USE_SCENE_GRAPH=true 동작 | 렌더링 정상          |
| REMOVE_PIXI=true 동작     | PixiJS 없이 동작     |
| 78개 기능 파리티          | 최소 70/78           |
| 벤치마크 회귀 없음        | fps ≥ baseline       |
| WebGL 컨텍스트            | 1개 (PixiJS 제거 후) |

---

## 의존성 그래프

```
Task 2.1 (SceneGraph) ──┐
                         ├→ Task 2.2 (StoreBridge)
Task 2.3 (Hover/Cursor) │
Task 2.4 (Camera)       │
                         ├→ Task 2.5 (GPU Backend)
                         ├→ Task 2.6 (SkiaCanvas)
                         └→ Task 2.7 (BuilderCanvas flag)
                              └→ Task 2.8 (파리티) → Task 2.9 (Gate)
```

Task 2.1, 2.3, 2.4는 독립적으로 병렬 가능.
Task 2.5, 2.6은 2.1+2.2 완료 후.
Task 2.7은 2.3~2.6 전부 완료 후.
