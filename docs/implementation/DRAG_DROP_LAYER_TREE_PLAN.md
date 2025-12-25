# Drag & Drop 레이어 트리 구현 계획서

> **작성일**: 2025-12-25
> **상태**: 계획 검토 중
> **관련 기술**: react-aria DnD, @tanstack/react-virtual, PixiJS

---

## 목표

1. **레이어 트리 DnD**: nodesPanel의 레이어 트리에서 드래그&드롭으로 순서 변경 및 parent/child 관계 변경
2. **WebGL 캔버스 DnD**: WebGL 모드에서 선택된 요소를 드래그&드롭으로 위치 이동 후 React와 동기화

---

## 현재 상태 분석

| 항목 | 상태 | 파일 |
|------|------|------|
| react-aria-components | ✅ 설치됨 (v1.14.0) | `package.json` |
| 레이어 트리 | `VirtualizedLayerTree` + `TreeItemRow` | `src/builder/sidebar/VirtualizedLayerTree.tsx` |
| 요소 구조 | `parent_id`, `order_num` 필드 있음 | `stores/elements.ts` |
| WebGL 드래그 | `useDragInteraction` 훅 있음 | `canvas/selection/useDragInteraction.ts` |
| 상태 업데이트 | `updateElement`, `updateElementOrder` 액션 있음 | `stores/elements.ts` |

---

## Phase 1: 레이어 트리 DnD 인프라 구축

### 1.1 새 파일 구조

```
📁 src/builder/sidebar/dnd/
├── useDraggableTreeItem.ts    # 드래그 가능한 트리 아이템 훅
├── useDropTarget.ts           # 드롭 타겟 훅
├── TreeDragPreview.tsx        # 드래그 프리뷰 컴포넌트
├── DropIndicator.tsx          # 드롭 위치 표시 컴포넌트
├── types.ts                   # DnD 타입 정의
└── index.ts                   # 배럴 export
```

### 1.2 핵심 타입 정의

```typescript
// types.ts
export interface DragItem {
  type: 'element';
  id: string;
  tag: string;
  parentId: string | null;
  orderNum: number;
  depth: number;
}

export type DropPositionType = 'before' | 'after' | 'inside';

export interface DropPosition {
  type: DropPositionType;
  targetId: string;
  targetParentId: string | null;
}

export interface DragPreviewProps {
  item: DragItem;
}
```

### 1.3 react-aria useDrag/useDrop 적용

```typescript
// useDraggableTreeItem.ts
import { useDrag } from 'react-aria';

export function useDraggableTreeItem(item: DragItem) {
  const { dragProps, dragButtonProps, isDragging } = useDrag({
    getItems() {
      return [{
        'application/x-tree-item': JSON.stringify(item),
        'text/plain': item.tag,
      }];
    },
  });

  return { dragProps, dragButtonProps, isDragging };
}
```

### 1.4 드롭 위치 계산 로직

```typescript
// 마우스 Y 위치에 따른 드롭 위치 결정
export function getDropPosition(
  mouseY: number,
  itemRect: DOMRect
): DropPositionType {
  const relativeY = mouseY - itemRect.top;
  const height = itemRect.height;

  if (relativeY < height * 0.25) return 'before';  // 상단 25%
  if (relativeY > height * 0.75) return 'after';   // 하단 25%
  return 'inside';                                  // 중앙 50%
}
```

---

## Phase 2: 순서 변경 (order_num 업데이트)

### 2.1 moveElement 액션 추가

**파일**: `src/builder/stores/utils/elementMove.ts`

```typescript
export interface MoveElementParams {
  elementId: string;
  newParentId: string | null;
  newOrderNum: number;
}

export async function moveElement(
  params: MoveElementParams,
  get: () => ElementsState,
  set: (state: Partial<ElementsState>) => void
): Promise<void> {
  const { elementId, newParentId, newOrderNum } = params;
  const { elements, elementsMap } = get();

  const element = elementsMap.get(elementId);
  if (!element) return;

  const oldParentId = element.parent_id;
  const oldOrderNum = element.order_num ?? 0;

  // 1. 요소 업데이트
  const updatedElement = {
    ...element,
    parent_id: newParentId,
    order_num: newOrderNum,
  };

  // 2. 형제 요소들의 order_num 재정렬
  const updatedElements = elements.map(el => {
    if (el.id === elementId) {
      return updatedElement;
    }

    // 원래 부모의 형제들: order_num 감소
    if (el.parent_id === oldParentId && el.order_num > oldOrderNum) {
      return { ...el, order_num: (el.order_num ?? 0) - 1 };
    }

    // 새 부모의 형제들: order_num 증가
    if (el.parent_id === newParentId && el.order_num >= newOrderNum) {
      return { ...el, order_num: (el.order_num ?? 0) + 1 };
    }

    return el;
  });

  // 3. 상태 업데이트
  set({ elements: updatedElements });
  get()._rebuildIndexes();

  // 4. DB 동기화 (배치)
  await batchUpdateToDatabase(updatedElements.filter(/* changed */));
}
```

### 2.2 드롭 핸들러

```typescript
const handleDrop = async (dropPosition: DropPosition) => {
  const { type, targetId, targetParentId } = dropPosition;
  const target = elementsMap.get(targetId);
  if (!target) return;

  let newParentId: string | null;
  let newOrderNum: number;

  switch (type) {
    case 'before':
      newParentId = targetParentId;
      newOrderNum = target.order_num ?? 0;
      break;
    case 'after':
      newParentId = targetParentId;
      newOrderNum = (target.order_num ?? 0) + 1;
      break;
    case 'inside':
      newParentId = targetId;
      newOrderNum = 0; // 첫 번째 자식으로
      break;
  }

  await moveElement({ elementId: draggedId, newParentId, newOrderNum });
};
```

---

## Phase 3: Parent/Child 관계 변경

### 3.1 자식으로 삽입

드롭 위치가 `inside`일 때:
- 드래그한 요소의 `parent_id`를 타겟 요소의 `id`로 변경
- `order_num`을 0으로 설정 (첫 번째 자식)
- 기존 자식들의 `order_num` +1 증가

### 3.2 부모 밖으로 빼기

드래그한 요소를 부모 레벨 위/아래로 드롭:
- `parent_id`를 부모의 `parent_id`로 변경
- 적절한 `order_num` 계산

### 3.3 순환 참조 방지

```typescript
export function canDrop(
  draggedId: string,
  targetId: string,
  elementsMap: Map<string, Element>
): boolean {
  // 자기 자신에게 드롭 불가
  if (draggedId === targetId) return false;

  // 자신의 자손에게 드롭 불가
  const isDescendant = (ancestorId: string, descendantId: string): boolean => {
    let current = elementsMap.get(descendantId);
    while (current?.parent_id) {
      if (current.parent_id === ancestorId) return true;
      current = elementsMap.get(current.parent_id);
    }
    return false;
  };

  return !isDescendant(draggedId, targetId);
}
```

---

## Phase 4: 시각적 피드백

### 4.1 드래그 프리뷰

```typescript
// TreeDragPreview.tsx
export const TreeDragPreview: React.FC<DragPreviewProps> = ({ item }) => (
  <div className="tree-drag-preview">
    <Box size={16} strokeWidth={1} />
    <span>{item.tag}</span>
  </div>
);
```

### 4.2 드롭 인디케이터 스타일

```css
/* nodes/index.css */
.drop-indicator-before::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--color-accent);
}

.drop-indicator-after::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--color-accent);
}

.drop-indicator-inside {
  background-color: rgba(var(--color-accent-rgb), 0.1);
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.dragging {
  opacity: 0.5;
}
```

### 4.3 드래그 중 자동 확장

```typescript
// 폴더에 800ms 이상 hover 시 자동 펼침
const AUTO_EXPAND_DELAY = 800;

const handleDragEnter = (itemId: string, hasChildren: boolean) => {
  if (hasChildren && !expandedKeys.has(itemId)) {
    autoExpandTimeoutRef.current = setTimeout(() => {
      onToggleExpand(itemId);
    }, AUTO_EXPAND_DELAY);
  }
};

const handleDragLeave = () => {
  if (autoExpandTimeoutRef.current) {
    clearTimeout(autoExpandTimeoutRef.current);
    autoExpandTimeoutRef.current = null;
  }
};
```

---

## Phase 5: WebGL 캔버스 드래그 동기화

### 5.1 현재 useDragInteraction 확장

**파일**: `src/builder/workspace/canvas/selection/useDragInteraction.ts`

현재 기능:
- ✅ Move (요소 이동) - 시각적 이동만
- ✅ Resize (크기 조절)
- ✅ Lasso (다중 선택)

추가 필요:
- ❌ 이동 종료 시 React 상태 동기화

### 5.2 onMoveEnd 콜백 확장

```typescript
// BuilderCanvas.tsx에서 사용
const handleMoveEnd = async (
  elementId: string,
  delta: { x: number; y: number }
) => {
  const element = elementsMap.get(elementId);
  if (!element) return;

  const currentStyle = (element.props?.style || {}) as React.CSSProperties;

  // 현재 위치 파싱
  const currentLeft = parseFloat(String(currentStyle.left || '0'));
  const currentTop = parseFloat(String(currentStyle.top || '0'));

  // 새 위치 계산
  const newLeft = currentLeft + delta.x;
  const newTop = currentTop + delta.y;

  // React 상태 업데이트 (DB 동기화 포함)
  await updateElementProps(elementId, {
    ...element.props,
    style: {
      ...currentStyle,
      left: `${newLeft}px`,
      top: `${newTop}px`,
    },
  });
};
```

### 5.3 다중 선택 이동

```typescript
const handleMultiMoveEnd = async (
  elementIds: string[],
  delta: { x: number; y: number }
) => {
  const updates = elementIds.map(id => {
    const element = elementsMap.get(id);
    if (!element) return null;

    const currentStyle = (element.props?.style || {}) as React.CSSProperties;
    const currentLeft = parseFloat(String(currentStyle.left || '0'));
    const currentTop = parseFloat(String(currentStyle.top || '0'));

    return {
      id,
      props: {
        ...element.props,
        style: {
          ...currentStyle,
          left: `${currentLeft + delta.x}px`,
          top: `${currentTop + delta.y}px`,
        },
      },
    };
  }).filter(Boolean);

  // 배치 업데이트
  await batchUpdateElementProps(updates);
};
```

---

## Phase 6: 히스토리 & Undo/Redo

### 6.1 드래그 작업 히스토리 기록

```typescript
interface MoveHistoryEntry {
  type: 'move-element';
  elementId: string;
  from: {
    parentId: string | null;
    orderNum: number;
  };
  to: {
    parentId: string | null;
    orderNum: number;
  };
}

interface PositionHistoryEntry {
  type: 'move-position';
  elementId: string;
  from: { left: string; top: string };
  to: { left: string; top: string };
}
```

### 6.2 히스토리 통합

`historyManager`에 새로운 엔트리 타입 추가하여 Undo/Redo 지원

---

## 구현 우선순위

```
Phase 1 (기본 인프라)
    ↓
Phase 2 (순서 변경)
    ↓
Phase 3 (Parent/Child)  ←→  Phase 4 (시각적 피드백)
    ↓                              ↓
Phase 5 (WebGL 동기화)
    ↓
Phase 6 (히스토리)
```

---

## 예상 작업 시간

| Phase | 설명 | 복잡도 |
|-------|------|--------|
| Phase 1 | DnD 인프라 구축 | 중 |
| Phase 2 | 순서 변경 로직 | 중 |
| Phase 3 | Parent/Child 변경 | 중 |
| Phase 4 | 시각적 피드백 | 낮음 |
| Phase 5 | WebGL 동기화 | 중 |
| Phase 6 | 히스토리 통합 | 중 |

---

## 수정/생성 파일 목록

### 새 파일
```
src/builder/sidebar/dnd/
├── useDraggableTreeItem.ts
├── useDropTarget.ts
├── TreeDragPreview.tsx
├── DropIndicator.tsx
├── types.ts
└── index.ts

src/builder/stores/utils/elementMove.ts
```

### 수정 파일
```
src/builder/sidebar/VirtualizedLayerTree.tsx
src/builder/sidebar/components/TreeNodeItem.tsx (선택적)
src/builder/stores/elements.ts
src/builder/workspace/canvas/selection/useDragInteraction.ts
src/builder/nodes/index.css
```

---

## 주의 사항

1. **Virtualized Tree 호환성**
   - `@tanstack/react-virtual`과 react-aria DnD 함께 사용 시 스크롤 영역 처리

2. **순환 참조 방지**
   - 요소를 자신의 자손에게 드롭하는 것 방지 필수

3. **성능 최적화**
   - 대규모 트리(100+ 요소)에서 reorder 시 배치 업데이트 사용
   - 드래그 중 React 리렌더링 최소화

4. **DB 동기화**
   - 드래그 종료 시 한 번만 DB 업데이트
   - 중간 상태는 로컬만 업데이트

5. **접근성**
   - 키보드 드래그 지원 (react-aria 기본 제공)
   - 스크린 리더 지원

---

## 참고 자료

- [React Aria DnD](https://react-aria.adobe.com/dnd)
- [React Aria useDrag](https://react-aria.adobe.com/dnd#usedrag)
- [React Aria useDrop](https://react-aria.adobe.com/dnd#usedrop)
