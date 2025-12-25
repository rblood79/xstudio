# Drag & Drop 레이어 트리 구현 계획서

> **작성일**: 2025-12-25
> **수정일**: 2025-12-25 (리뷰 피드백 반영)
> **상태**: 계획 확정
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
| 정렬 유틸리티 | `reorderElements` 함수 있음 | `stores/utils/elementReorder.ts` |

---

## Phase 1: 레이어 트리 DnD 인프라 구축

### 1.1 새 파일 구조

```
📁 src/builder/sidebar/dnd/
├── useDraggableTreeItem.ts    # 드래그 가능한 트리 아이템 훅
├── useDropTarget.ts           # 드롭 타겟 훅
├── useTreeDragDrop.ts         # 트리 전체 DnD 상태 관리
├── TreeDragPreview.tsx        # 드래그 프리뷰 컴포넌트
├── DropIndicator.tsx          # 드롭 위치 표시 컴포넌트
├── validation.ts              # 드롭 유효성 검증
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
  hasChildren: boolean;
  isLeaf: boolean;
}

export type DropPositionType = 'before' | 'after' | 'inside';

export interface DropPosition {
  type: DropPositionType;
  targetId: string;
  targetParentId: string | null;
  targetDepth: number;
}

export interface DropValidation {
  isValid: boolean;
  reason?: 'self-drop' | 'descendant-drop' | 'leaf-inside' | 'invalid-container';
}

export interface DragPreviewProps {
  item: DragItem;
}

// 가상 스크롤 연동용
export interface VirtualDropZone {
  virtualIndex: number;
  scrollTop: number;
  visibleRange: { start: number; end: number };
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
    // 키보드 DnD 지원
    preview: (items, callback) => {
      // 커스텀 프리뷰 반환
      callback(() => <TreeDragPreview item={item} />);
    },
  });

  return { dragProps, dragButtonProps, isDragging };
}
```

### 1.4 드롭 위치 계산 로직 (보강)

```typescript
// validation.ts
interface DropPositionContext {
  mouseY: number;
  mouseX: number;
  itemRect: DOMRect;
  draggedItem: DragItem;
  targetItem: DragItem;
  indentWidth: number; // 들여쓰기 픽셀
}

/**
 * 드롭 위치 결정 (보강된 로직)
 * - Y 비율뿐 아니라 깊이/들여쓰기 기준 고려
 * - leaf 노드에는 inside 불가
 * - 루트 영역 드롭 처리
 */
export function getDropPosition(ctx: DropPositionContext): DropPositionType | null {
  const { mouseY, mouseX, itemRect, draggedItem, targetItem, indentWidth } = ctx;

  const relativeY = mouseY - itemRect.top;
  const relativeX = mouseX - itemRect.left;
  const height = itemRect.height;

  // 기본 Y 기반 판별
  let basePosition: DropPositionType;
  if (relativeY < height * 0.25) {
    basePosition = 'before';
  } else if (relativeY > height * 0.75) {
    basePosition = 'after';
  } else {
    basePosition = 'inside';
  }

  // Leaf 노드에는 inside 불가
  if (basePosition === 'inside' && targetItem.isLeaf) {
    // X 위치로 before/after 결정
    return relativeY < height * 0.5 ? 'before' : 'after';
  }

  // 같은 깊이에서 X 위치가 왼쪽이면 부모 레벨 이동 의도로 해석
  const expectedIndent = targetItem.depth * indentWidth;
  if (relativeX < expectedIndent - indentWidth / 2 && draggedItem.depth === targetItem.depth) {
    // 부모 레벨로 이동 의도 - 특수 처리 필요
    return basePosition; // 추후 handleDrop에서 부모 레벨 계산
  }

  return basePosition;
}

/**
 * 드롭 유효성 검증
 */
export function validateDrop(
  draggedId: string,
  targetId: string,
  dropType: DropPositionType,
  elementsMap: Map<string, Element>
): DropValidation {
  // 1. 자기 자신에게 드롭 불가
  if (draggedId === targetId) {
    return { isValid: false, reason: 'self-drop' };
  }

  // 2. 자신의 자손에게 드롭 불가 (순환 참조 방지)
  if (dropType === 'inside') {
    const isDescendant = checkIsDescendant(draggedId, targetId, elementsMap);
    if (isDescendant) {
      return { isValid: false, reason: 'descendant-drop' };
    }
  }

  // 3. 특정 컨테이너 규칙 검증
  const target = elementsMap.get(targetId);
  if (target && dropType === 'inside') {
    // Tabs 내부에는 Tab/Panel만 허용 등 컨테이너 규칙
    if (!isValidContainer(target.tag, draggedId, elementsMap)) {
      return { isValid: false, reason: 'invalid-container' };
    }
  }

  return { isValid: true };
}

function checkIsDescendant(
  ancestorId: string,
  descendantId: string,
  elementsMap: Map<string, Element>
): boolean {
  let current = elementsMap.get(descendantId);
  while (current?.parent_id) {
    if (current.parent_id === ancestorId) return true;
    current = elementsMap.get(current.parent_id);
  }
  return false;
}
```

---

## Phase 2: 순서 변경 (기존 elementReorder 확장)

### 2.0 기존 유틸리티와의 통합 전략

**핵심 원칙**: 새로운 `moveElement`는 기존 코드 경로를 재사용하여 정렬 규칙 충돌을 방지합니다.

| 기존 함수 | 역할 | moveElement와의 관계 |
|----------|------|---------------------|
| `reorderElements()` | 전체 order_num 정규화 (0-based 연속) | moveElement 내부에서 호출 |
| `updateElementOrder()` | 단일 요소 order_num 업데이트 | moveElement가 내부적으로 사용 |
| `normalizeOrderNums()` | 빈 슬롯/중복 제거 | 기존 로직 그대로 공유 |

```typescript
// 🔗 통합 아키텍처
moveElement()
  ├── updateElementOrder()  // 스토어 업데이트 (기존 액션)
  ├── normalizeOrderNums()  // 정규화 로직 공유
  └── reorderElements()     // 특수 컴포넌트 정렬 (Tabs, Collection 등)
```

**중복 방지 규칙**:
1. order_num 정규화는 `normalizeOrderNums()` 단일 함수로 처리
2. 스토어 업데이트는 `updateElementOrder()` 콜백 패턴 유지
3. 특수 정렬(Tabs Tab-Panel 쌍)은 기존 `reorderElements()` 로직 활용

### 2.1 기존 유틸리티 확장 (새 파일 생성 X)

**파일**: `src/builder/stores/utils/elementReorder.ts` 확장

```typescript
// elementReorder.ts에 추가

export interface MoveElementParams {
  elementId: string;
  newParentId: string | null;
  newOrderNum: number;
}

/**
 * 요소 이동 (기존 reorderElements 흐름과 통합)
 *
 * 🔗 기존 유틸과의 관계:
 * - updateElementOrder(): 스토어 업데이트에 사용
 * - normalizeOrderNums(): 동일한 정규화 로직 공유
 * - reorderElements(): 특수 컴포넌트(Tabs 등) 처리 시 호출
 *
 * - 같은 order_num 정규화 로직 사용
 * - 빈 슬롯/중복 방지 검증 포함
 */
export async function moveElement(
  params: MoveElementParams,
  get: () => ElementsState,
  set: (state: Partial<ElementsState>) => void
): Promise<{ success: boolean; rollbackData?: Element[] }> {
  const { elementId, newParentId, newOrderNum } = params;
  const { elements, elementsMap, currentPageId } = get();

  const element = elementsMap.get(elementId);
  if (!element) return { success: false };

  const oldParentId = element.parent_id;
  const oldOrderNum = element.order_num ?? 0;

  // 변경 전 상태 백업 (롤백용)
  const rollbackData = elements.map(el => ({ ...el }));

  try {
    // 1. 원래 부모 그룹의 order_num 재정렬 (빈 슬롯 방지)
    const oldSiblings = elements
      .filter(el => el.parent_id === oldParentId && el.id !== elementId)
      .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));

    // 2. 새 부모 그룹의 order_num 계산
    const newSiblings = elements
      .filter(el => el.parent_id === newParentId && el.id !== elementId)
      .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));

    // 3. 정규화된 order_num 할당
    const updatedElements = elements.map(el => {
      if (el.id === elementId) {
        return { ...el, parent_id: newParentId, order_num: newOrderNum };
      }

      // 원래 부모 형제: 재정렬
      if (el.parent_id === oldParentId) {
        const idx = oldSiblings.findIndex(s => s.id === el.id);
        if (idx !== -1) {
          return { ...el, order_num: idx };
        }
      }

      // 새 부모 형제: 삽입 위치 이후 +1
      if (el.parent_id === newParentId) {
        const currentOrder = el.order_num ?? 0;
        if (currentOrder >= newOrderNum) {
          return { ...el, order_num: currentOrder + 1 };
        }
      }

      return el;
    });

    // 4. 중복 order_num 검증
    const orderValidation = validateOrderNums(updatedElements, newParentId);
    if (!orderValidation.isValid) {
      // 자동 정규화
      const normalized = normalizeOrderNums(updatedElements, newParentId);
      set({ elements: normalized });
    } else {
      set({ elements: updatedElements });
    }

    get()._rebuildIndexes();

    // 5. DB 동기화 (변경된 요소만)
    const changedElements = diffElements(rollbackData, get().elements);
    if (changedElements.length > 0) {
      await batchUpdateToDatabase(changedElements, currentPageId);
    }

    return { success: true, rollbackData };
  } catch (error) {
    // 롤백
    set({ elements: rollbackData });
    get()._rebuildIndexes();
    console.error('moveElement failed, rolled back:', error);
    return { success: false, rollbackData };
  }
}

/**
 * order_num 정규화 (0부터 연속된 숫자로)
 */
function normalizeOrderNums(elements: Element[], parentId: string | null): Element[] {
  const siblings = elements
    .filter(el => el.parent_id === parentId)
    .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));

  const orderMap = new Map<string, number>();
  siblings.forEach((el, idx) => orderMap.set(el.id, idx));

  return elements.map(el => {
    if (orderMap.has(el.id)) {
      return { ...el, order_num: orderMap.get(el.id)! };
    }
    return el;
  });
}

/**
 * 변경된 요소만 추출 (diff)
 */
function diffElements(before: Element[], after: Element[]): Element[] {
  const beforeMap = new Map(before.map(el => [el.id, el]));
  return after.filter(el => {
    const prev = beforeMap.get(el.id);
    if (!prev) return true;
    return prev.parent_id !== el.parent_id || prev.order_num !== el.order_num;
  });
}
```

### 2.2 드롭 핸들러 (루트 영역 포함)

```typescript
const handleDrop = async (
  draggedId: string,
  dropPosition: DropPosition | null
) => {
  // 루트 영역 드롭 (빈 공간)
  if (!dropPosition) {
    // 루트 레벨의 마지막으로 배치
    const rootElements = elements.filter(el => el.parent_id === null);
    const maxOrder = Math.max(...rootElements.map(el => el.order_num ?? 0), -1);

    await moveElement({
      elementId: draggedId,
      newParentId: null,
      newOrderNum: maxOrder + 1,
    });
    return;
  }

  const { type, targetId, targetParentId } = dropPosition;
  const target = elementsMap.get(targetId);
  if (!target) return;

  // 유효성 검증
  const validation = validateDrop(draggedId, targetId, type, elementsMap);
  if (!validation.isValid) {
    console.warn(`Drop rejected: ${validation.reason}`);
    return;
  }

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

  const result = await moveElement({ elementId: draggedId, newParentId, newOrderNum });

  if (!result.success) {
    // 실패 시 사용자에게 알림
    showToast('요소 이동에 실패했습니다.');
  }
};
```

---

## Phase 3: 가상 스크롤 연동

### 3.1 자동 스크롤

```typescript
// useTreeDragDrop.ts

const AUTO_SCROLL_THRESHOLD = 50; // px
const AUTO_SCROLL_SPEED = 10; // px per frame

interface AutoScrollState {
  direction: 'up' | 'down' | null;
  rafId: number | null;
}

export function useAutoScroll(containerRef: RefObject<HTMLDivElement>) {
  const scrollState = useRef<AutoScrollState>({ direction: null, rafId: null });

  const updateAutoScroll = useCallback((mouseY: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const topThreshold = rect.top + AUTO_SCROLL_THRESHOLD;
    const bottomThreshold = rect.bottom - AUTO_SCROLL_THRESHOLD;

    let direction: 'up' | 'down' | null = null;
    if (mouseY < topThreshold) {
      direction = 'up';
    } else if (mouseY > bottomThreshold) {
      direction = 'down';
    }

    if (direction !== scrollState.current.direction) {
      // 방향 변경 시 기존 RAF 취소
      if (scrollState.current.rafId) {
        cancelAnimationFrame(scrollState.current.rafId);
      }

      scrollState.current.direction = direction;

      if (direction) {
        const scroll = () => {
          if (!containerRef.current || !scrollState.current.direction) return;

          const delta = scrollState.current.direction === 'up'
            ? -AUTO_SCROLL_SPEED
            : AUTO_SCROLL_SPEED;
          containerRef.current.scrollTop += delta;

          scrollState.current.rafId = requestAnimationFrame(scroll);
        };
        scrollState.current.rafId = requestAnimationFrame(scroll);
      }
    }
  }, [containerRef]);

  const stopAutoScroll = useCallback(() => {
    if (scrollState.current.rafId) {
      cancelAnimationFrame(scrollState.current.rafId);
      scrollState.current.rafId = null;
    }
    scrollState.current.direction = null;
  }, []);

  return { updateAutoScroll, stopAutoScroll };
}
```

### 3.2 언마운트된 아이템 드롭 인디케이터

```typescript
// DropIndicator.tsx

interface VirtualDropIndicatorProps {
  flattenedItems: FlattenedTreeItem[];
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  dropPosition: DropPosition | null;
  containerRef: RefObject<HTMLDivElement>;
}

/**
 * 가상화로 언마운트된 항목에도 드롭 지시선 표시
 */
export function VirtualDropIndicator({
  flattenedItems,
  virtualizer,
  dropPosition,
  containerRef,
}: VirtualDropIndicatorProps) {
  if (!dropPosition) return null;

  const targetIndex = flattenedItems.findIndex(
    item => item.item.id === dropPosition.targetId
  );
  if (targetIndex === -1) return null;

  // 가상 아이템의 실제 위치 계산
  const virtualItems = virtualizer.getVirtualItems();
  const isVisible = virtualItems.some(v => v.index === targetIndex);

  if (isVisible) {
    // 보이는 아이템: 기존 방식으로 처리
    return null;
  }

  // 언마운트된 아이템: 가상 높이 기반 위치 계산
  const itemHeight = virtualizer.options.estimateSize(targetIndex);
  const offsetTop = virtualizer.getOffsetForIndex(targetIndex, 'start')?.[0] ?? 0;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: offsetTop + (dropPosition.type === 'after' ? itemHeight : 0),
    height: dropPosition.type === 'inside' ? itemHeight : 2,
    backgroundColor: dropPosition.type === 'inside'
      ? 'rgba(var(--color-accent-rgb), 0.1)'
      : 'var(--color-accent)',
    pointerEvents: 'none',
    zIndex: 10,
  };

  return <div className="virtual-drop-indicator" style={style} />;
}
```

---

## Phase 4: 시각적 피드백 & 접근성

### 4.1 드래그 프리뷰

```typescript
// TreeDragPreview.tsx
export const TreeDragPreview: React.FC<DragPreviewProps> = ({ item }) => (
  <div className="tree-drag-preview" role="status" aria-live="polite">
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

.drop-indicator-invalid {
  outline-color: var(--color-error);
  cursor: not-allowed;
}

.dragging {
  opacity: 0.5;
}

/* 가상 스크롤용 */
.virtual-drop-indicator {
  transition: top 0.1s ease-out;
}
```

### 4.3 접근성 (Accessibility) 시나리오

```typescript
// useTreeDragDropA11y.ts

interface A11yAnnouncement {
  type: 'drag-start' | 'drag-over' | 'drag-end' | 'drop-invalid';
  message: string;
}

/**
 * 스크린 리더용 라이브 리전 관리
 */
export function useTreeDragDropA11y() {
  const [announcement, setAnnouncement] = useState<string>('');

  const announce = useCallback((event: A11yAnnouncement) => {
    let message = '';
    switch (event.type) {
      case 'drag-start':
        message = `${event.message} 드래그 시작. 방향키로 이동, Enter로 드롭, Escape로 취소`;
        break;
      case 'drag-over':
        message = event.message; // "Button 위로 이동" | "Button 안으로 이동"
        break;
      case 'drag-end':
        message = `${event.message} 이동 완료`;
        break;
      case 'drop-invalid':
        message = `이동 불가: ${event.message}`;
        break;
    }
    setAnnouncement(message);
  }, []);

  // 라이브 리전 컴포넌트
  const LiveRegion = useMemo(() => (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only" // 화면에 보이지 않음
    >
      {announcement}
    </div>
  ), [announcement]);

  return { announce, LiveRegion };
}

// 키보드 DnD 핸들러
const handleKeyboardDrag = (e: KeyboardEvent, draggedItem: DragItem) => {
  switch (e.key) {
    case 'ArrowUp':
      // 이전 아이템으로 포커스 이동
      announce({ type: 'drag-over', message: `${prevItem.tag} 위로 이동` });
      break;
    case 'ArrowDown':
      // 다음 아이템으로 포커스 이동
      announce({ type: 'drag-over', message: `${nextItem.tag} 아래로 이동` });
      break;
    case 'ArrowRight':
      // inside로 변경
      announce({ type: 'drag-over', message: `${targetItem.tag} 안으로 이동` });
      break;
    case 'ArrowLeft':
      // 부모 레벨로 이동
      announce({ type: 'drag-over', message: '부모 레벨로 이동' });
      break;
    case 'Enter':
      // 드롭 실행
      handleDrop(draggedItem.id, currentDropPosition);
      announce({ type: 'drag-end', message: draggedItem.tag });
      break;
    case 'Escape':
      // 드래그 취소
      cancelDrag();
      break;
  }
};
```

### 4.4 드래그 중 자동 확장 (안전장치 포함)

```typescript
const AUTO_EXPAND_DELAY = 800;
const MAX_AUTO_EXPAND_DEPTH = 5; // 무한 확장 방지

const handleDragEnter = (itemId: string, item: DragItem) => {
  // 안전장치: 자기 자신이나 자손에는 자동 확장 안 함
  if (item.id === draggedItemId || checkIsDescendant(draggedItemId, item.id)) {
    return;
  }

  // 깊이 제한
  if (item.depth >= MAX_AUTO_EXPAND_DEPTH) {
    return;
  }

  if (item.hasChildren && !expandedKeys.has(itemId)) {
    autoExpandTimeoutRef.current = setTimeout(() => {
      onToggleExpand(itemId);
    }, AUTO_EXPAND_DELAY);
  }
};
```

---

## Phase 5: WebGL 캔버스 드래그 동기화

### 5.1 위치 타입별 방어 로직

```typescript
// canvasPositionSync.ts

interface PositionUpdateContext {
  element: Element;
  delta: { x: number; y: number };
  parentBounds?: BoundingBox;
}

/**
 * position 타입에 따른 위치 업데이트
 * - absolute: left/top 직접 수정
 * - relative: transform 또는 margin으로 대체
 * - static/fixed: 경고 후 스킵
 */
export function calculateNewPosition(ctx: PositionUpdateContext): {
  updates: Partial<React.CSSProperties>;
  warnings: string[];
} {
  const { element, delta, parentBounds } = ctx;
  const style = (element.props?.style || {}) as React.CSSProperties;
  const position = style.position || 'static';
  const warnings: string[] = [];

  switch (position) {
    case 'absolute':
    case 'fixed': {
      // left/top 또는 right/bottom 확인
      const hasLeft = style.left !== undefined;
      const hasTop = style.top !== undefined;
      const hasRight = style.right !== undefined;
      const hasBottom = style.bottom !== undefined;

      const updates: Partial<React.CSSProperties> = {};

      if (hasLeft || (!hasLeft && !hasRight)) {
        const currentLeft = parsePositionValue(style.left, parentBounds?.width);
        updates.left = `${currentLeft + delta.x}px`;
      } else if (hasRight) {
        const currentRight = parsePositionValue(style.right, parentBounds?.width);
        updates.right = `${currentRight - delta.x}px`;
      }

      if (hasTop || (!hasTop && !hasBottom)) {
        const currentTop = parsePositionValue(style.top, parentBounds?.height);
        updates.top = `${currentTop + delta.y}px`;
      } else if (hasBottom) {
        const currentBottom = parsePositionValue(style.bottom, parentBounds?.height);
        updates.bottom = `${currentBottom - delta.y}px`;
      }

      return { updates, warnings };
    }

    case 'relative': {
      // transform으로 이동 (기존 transform 병합)
      const existingTransform = style.transform || '';
      const newTranslate = `translate(${delta.x}px, ${delta.y}px)`;

      // 기존 translate 제거 후 새로 추가
      const cleanedTransform = existingTransform.replace(/translate\([^)]+\)/g, '').trim();
      const updates = {
        transform: cleanedTransform ? `${newTranslate} ${cleanedTransform}` : newTranslate,
      };

      return { updates, warnings };
    }

    case 'static':
    default: {
      warnings.push(`position: ${position} 요소는 드래그 이동을 지원하지 않습니다.`);
      return { updates: {}, warnings };
    }
  }
}

/**
 * 위치 값 파싱 (px, %, auto 등)
 */
function parsePositionValue(value: string | number | undefined, containerSize?: number): number {
  if (value === undefined || value === 'auto') return 0;
  if (typeof value === 'number') return value;

  const str = String(value).trim();
  if (str.endsWith('px')) {
    return parseFloat(str);
  }
  if (str.endsWith('%') && containerSize) {
    return (parseFloat(str) / 100) * containerSize;
  }
  return parseFloat(str) || 0;
}
```

### 5.2 다중 선택 이동 (레이아웃 제약 고려)

```typescript
const handleMultiMoveEnd = async (
  elementIds: string[],
  delta: { x: number; y: number }
) => {
  const updates: BatchPropsUpdate[] = [];
  const warnings: string[] = [];

  for (const id of elementIds) {
    const element = elementsMap.get(id);
    if (!element) continue;

    // 부모가 flex/grid인 경우 경고
    const parent = element.parent_id ? elementsMap.get(element.parent_id) : null;
    const parentStyle = (parent?.props?.style || {}) as React.CSSProperties;

    if (parentStyle.display === 'flex' || parentStyle.display === 'grid') {
      warnings.push(`${element.tag}의 부모가 ${parentStyle.display} 레이아웃입니다. 위치 변경이 제한될 수 있습니다.`);
    }

    // 위치 계산
    const parentBounds = parent ? getElementBounds(parent.id) : undefined;
    const { updates: styleUpdates, warnings: posWarnings } = calculateNewPosition({
      element,
      delta,
      parentBounds,
    });

    warnings.push(...posWarnings);

    if (Object.keys(styleUpdates).length > 0) {
      updates.push({
        id,
        props: {
          ...element.props,
          style: { ...(element.props?.style as object), ...styleUpdates },
        },
      });
    }
  }

  // 경고 표시
  if (warnings.length > 0) {
    console.warn('Position update warnings:', warnings);
    // 선택적으로 사용자에게 표시
  }

  // 배치 업데이트
  if (updates.length > 0) {
    await batchUpdateElementProps(updates);
  }
};
```

---

## Phase 6: 배치 DB 업데이트 전략

### 6.1 Diff 기반 업데이트

```typescript
// batchDbUpdate.ts

interface BatchUpdateOptions {
  throttleMs?: number;      // 기본 300ms
  maxBatchSize?: number;    // 기본 50
  retryCount?: number;      // 기본 3
}

class BatchUpdateQueue {
  private queue: Map<string, Partial<Element>> = new Map();
  private timeoutId: NodeJS.Timeout | null = null;
  private options: Required<BatchUpdateOptions>;

  constructor(options: BatchUpdateOptions = {}) {
    this.options = {
      throttleMs: options.throttleMs ?? 300,
      maxBatchSize: options.maxBatchSize ?? 50,
      retryCount: options.retryCount ?? 3,
    };
  }

  /**
   * 업데이트 큐에 추가 (debounce)
   */
  enqueue(elementId: string, updates: Partial<Element>) {
    // 기존 업데이트와 병합
    const existing = this.queue.get(elementId) || {};
    this.queue.set(elementId, { ...existing, ...updates });

    // 타이머 리셋
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // 최대 배치 크기 도달 시 즉시 플러시
    if (this.queue.size >= this.options.maxBatchSize) {
      this.flush();
      return;
    }

    // 디바운스
    this.timeoutId = setTimeout(() => this.flush(), this.options.throttleMs);
  }

  /**
   * 큐 플러시 (DB에 저장)
   */
  async flush(): Promise<{ success: boolean; failed: string[] }> {
    if (this.queue.size === 0) {
      return { success: true, failed: [] };
    }

    const batch = Array.from(this.queue.entries());
    this.queue.clear();

    const failed: string[] = [];

    for (let attempt = 0; attempt < this.options.retryCount; attempt++) {
      try {
        await elementsApi.batchUpdate(
          batch.map(([id, updates]) => ({ id, ...updates }))
        );
        return { success: true, failed };
      } catch (error) {
        console.warn(`Batch update attempt ${attempt + 1} failed:`, error);

        if (attempt === this.options.retryCount - 1) {
          // 마지막 시도 실패 - 개별 업데이트로 폴백
          for (const [id, updates] of batch) {
            try {
              await elementsApi.updateElement(id, updates);
            } catch {
              failed.push(id);
            }
          }
        } else {
          // 재시도 전 대기 (exponential backoff)
          await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt)));
        }
      }
    }

    return { success: failed.length === 0, failed };
  }
}

// 싱글톤 인스턴스
export const batchUpdateQueue = new BatchUpdateQueue();
```

### 6.2 Optimistic 업데이트 + 롤백

```typescript
// 드래그 종료 시 사용
async function commitDragOperation(
  localUpdates: Element[],
  rollbackData: Element[]
): Promise<void> {
  // 이미 로컬 상태는 업데이트됨 (optimistic)

  try {
    const result = await batchUpdateQueue.flush();

    if (!result.success) {
      // 일부 실패 시 롤백
      console.error('Some updates failed:', result.failed);

      // 실패한 요소만 롤백
      const failedElements = rollbackData.filter(el => result.failed.includes(el.id));
      if (failedElements.length > 0) {
        set(state => ({
          elements: state.elements.map(el => {
            const rollback = failedElements.find(r => r.id === el.id);
            return rollback || el;
          }),
        }));
        get()._rebuildIndexes();

        showToast(`${result.failed.length}개 요소 저장 실패. 변경이 취소되었습니다.`);
      }
    }
  } catch (error) {
    // 전체 실패 시 전체 롤백
    set({ elements: rollbackData });
    get()._rebuildIndexes();
    showToast('저장 실패. 변경이 취소되었습니다.');
  }
}
```

---

## Phase 7: 히스토리 & Undo/Redo

### 7.1 확장된 히스토리 엔트리 구조

```typescript
// historyTypes.ts

/**
 * 트리 구조 변경 (레이어 DnD)
 */
interface TreeMoveHistoryEntry {
  type: 'tree-move';
  elementId: string;
  from: {
    parentId: string | null;
    orderNum: number;
  };
  to: {
    parentId: string | null;
    orderNum: number;
  };
  // 영향받은 형제 요소들의 order_num 변경
  siblingChanges: Array<{ id: string; from: number; to: number }>;
}

/**
 * 캔버스 위치 변경 (WebGL DnD)
 */
interface PositionMoveHistoryEntry {
  type: 'position-move';
  elementId: string;
  from: Partial<React.CSSProperties>;
  to: Partial<React.CSSProperties>;
}

/**
 * 다중 요소 위치 변경
 */
interface MultiPositionMoveHistoryEntry {
  type: 'multi-position-move';
  changes: Array<{
    elementId: string;
    from: Partial<React.CSSProperties>;
    to: Partial<React.CSSProperties>;
  }>;
}

/**
 * 합성 액션 (트리 + 위치 동시 변경)
 */
interface CompositeHistoryEntry {
  type: 'composite';
  entries: Array<TreeMoveHistoryEntry | PositionMoveHistoryEntry>;
  description: string;
}

type DragHistoryEntry =
  | TreeMoveHistoryEntry
  | PositionMoveHistoryEntry
  | MultiPositionMoveHistoryEntry
  | CompositeHistoryEntry;
```

### 7.2 연속 드래그 Coalescing

```typescript
// historyCoalescing.ts

const COALESCE_THRESHOLD_MS = 500; // 500ms 내 연속 드래그는 병합

interface CoalesceState {
  lastEntry: DragHistoryEntry | null;
  lastTimestamp: number;
  elementId: string | null;
}

const coalesceState: CoalesceState = {
  lastEntry: null,
  lastTimestamp: 0,
  elementId: null,
};

/**
 * 연속 드래그를 하나의 히스토리 엔트리로 병합
 */
export function addDragHistoryEntry(entry: DragHistoryEntry): void {
  const now = Date.now();
  const timeDiff = now - coalesceState.lastTimestamp;

  // 같은 요소의 연속 드래그인지 확인
  const isSameElement = getEntryElementId(entry) === coalesceState.elementId;
  const shouldCoalesce = isSameElement && timeDiff < COALESCE_THRESHOLD_MS;

  if (shouldCoalesce && coalesceState.lastEntry) {
    // 이전 엔트리와 병합
    const merged = mergeEntries(coalesceState.lastEntry, entry);
    historyManager.replaceLastEntry(merged);
    coalesceState.lastEntry = merged;
  } else {
    // 새 엔트리 추가
    historyManager.addEntry(entry);
    coalesceState.lastEntry = entry;
    coalesceState.elementId = getEntryElementId(entry);
  }

  coalesceState.lastTimestamp = now;
}

function mergeEntries(prev: DragHistoryEntry, next: DragHistoryEntry): DragHistoryEntry {
  // from은 이전 값 유지, to는 새 값 사용
  if (prev.type === 'position-move' && next.type === 'position-move') {
    return {
      type: 'position-move',
      elementId: prev.elementId,
      from: prev.from,
      to: next.to,
    };
  }

  if (prev.type === 'tree-move' && next.type === 'tree-move') {
    return {
      type: 'tree-move',
      elementId: prev.elementId,
      from: prev.from,
      to: next.to,
      siblingChanges: [...prev.siblingChanges, ...next.siblingChanges],
    };
  }

  // 타입이 다르면 합성 액션으로
  return {
    type: 'composite',
    entries: [prev, next] as any,
    description: 'Combined drag operations',
  };
}
```

### 7.3 Undo/Redo 동작 규칙

```typescript
// historyActions.ts (확장)

async function undoDragEntry(entry: DragHistoryEntry): Promise<void> {
  switch (entry.type) {
    case 'tree-move': {
      // 원래 위치로 복원
      await moveElement({
        elementId: entry.elementId,
        newParentId: entry.from.parentId,
        newOrderNum: entry.from.orderNum,
      });

      // 형제 요소들도 복원
      for (const sibling of entry.siblingChanges) {
        updateElementOrder(sibling.id, sibling.from);
      }
      break;
    }

    case 'position-move': {
      const element = elementsMap.get(entry.elementId);
      if (element) {
        await updateElementProps(entry.elementId, {
          ...element.props,
          style: { ...(element.props?.style as object), ...entry.from },
        });
      }
      break;
    }

    case 'multi-position-move': {
      const updates = entry.changes.map(change => ({
        id: change.elementId,
        props: {
          ...(elementsMap.get(change.elementId)?.props || {}),
          style: { ...change.from },
        },
      }));
      await batchUpdateElementProps(updates);
      break;
    }

    case 'composite': {
      // 역순으로 undo
      for (const subEntry of entry.entries.reverse()) {
        await undoDragEntry(subEntry);
      }
      break;
    }
  }
}

/**
 * Redo 동작 규칙
 * - Undo의 반대 방향으로 실행
 * - from과 to를 교환하여 적용
 */
async function redoDragEntry(entry: DragHistoryEntry): Promise<void> {
  switch (entry.type) {
    case 'tree-move': {
      // to 위치로 이동
      await moveElement({
        elementId: entry.elementId,
        newParentId: entry.to.parentId,
        newOrderNum: entry.to.orderNum,
      });

      // 형제 요소들도 to 값으로 설정
      for (const sibling of entry.siblingChanges) {
        updateElementOrder(sibling.id, sibling.to);
      }
      break;
    }

    case 'position-move': {
      const element = elementsMap.get(entry.elementId);
      if (element) {
        await updateElementProps(entry.elementId, {
          ...element.props,
          style: { ...(element.props?.style as object), ...entry.to },
        });
      }
      break;
    }

    case 'multi-position-move': {
      const updates = entry.changes.map(change => ({
        id: change.elementId,
        props: {
          ...(elementsMap.get(change.elementId)?.props || {}),
          style: { ...change.to },
        },
      }));
      await batchUpdateElementProps(updates);
      break;
    }

    case 'composite': {
      // 정순으로 redo (undo의 반대)
      for (const subEntry of entry.entries) {
        await redoDragEntry(subEntry);
      }
      break;
    }
  }
}
```

### 7.4 트랜잭션 묶기 기준

**원칙**: 하나의 드래그 작업은 하나의 히스토리 엔트리로 기록

```typescript
/**
 * 드래그 작업 트랜잭션 구조
 *
 * 1. 단일 요소 트리 이동 → TreeMoveHistoryEntry
 * 2. 단일 요소 캔버스 이동 → PositionMoveHistoryEntry
 * 3. 다중 요소 캔버스 이동 → MultiPositionMoveHistoryEntry
 * 4. 트리 + 캔버스 동시 → CompositeHistoryEntry
 */

interface DragTransaction {
  id: string;
  startTime: number;
  entries: DragHistoryEntry[];
  batchUpdates: BatchPropsUpdate[];
  committed: boolean;
}

class DragTransactionManager {
  private currentTransaction: DragTransaction | null = null;

  /**
   * 드래그 시작 시 트랜잭션 시작
   */
  begin(): string {
    const txId = crypto.randomUUID();
    this.currentTransaction = {
      id: txId,
      startTime: Date.now(),
      entries: [],
      batchUpdates: [],
      committed: false,
    };
    return txId;
  }

  /**
   * 히스토리 엔트리 추가 (아직 커밋 안 함)
   */
  addEntry(entry: DragHistoryEntry): void {
    if (!this.currentTransaction) {
      throw new Error('No active transaction');
    }
    this.currentTransaction.entries.push(entry);
  }

  /**
   * 배치 업데이트 추가 (아직 커밋 안 함)
   */
  addBatchUpdate(update: BatchPropsUpdate): void {
    if (!this.currentTransaction) {
      throw new Error('No active transaction');
    }
    this.currentTransaction.batchUpdates.push(update);
  }

  /**
   * 드래그 종료 시 트랜잭션 커밋
   * - 모든 배치 업데이트를 하나로 묶어 DB 저장
   * - 모든 히스토리 엔트리를 하나로 병합
   */
  async commit(): Promise<{ success: boolean }> {
    if (!this.currentTransaction) {
      return { success: false };
    }

    const tx = this.currentTransaction;

    try {
      // 1. 배치 업데이트 실행
      if (tx.batchUpdates.length > 0) {
        await batchUpdateElementProps(tx.batchUpdates);
      }

      // 2. 히스토리 엔트리 병합 및 추가
      if (tx.entries.length === 1) {
        historyManager.addEntry(tx.entries[0]);
      } else if (tx.entries.length > 1) {
        // 다중 엔트리는 composite로 병합
        const composite: CompositeHistoryEntry = {
          type: 'composite',
          entries: tx.entries as any,
          description: `Drag operation with ${tx.entries.length} changes`,
        };
        historyManager.addEntry(composite);
      }

      tx.committed = true;
      this.currentTransaction = null;
      return { success: true };
    } catch (error) {
      // 실패 시 롤백은 moveElement 내부에서 처리됨
      console.error('Transaction commit failed:', error);
      this.currentTransaction = null;
      return { success: false };
    }
  }

  /**
   * 드래그 취소 시 트랜잭션 롤백
   */
  rollback(): void {
    // 로컬 상태는 이미 moveElement의 rollbackData로 복원됨
    this.currentTransaction = null;
  }
}

export const dragTransaction = new DragTransactionManager();
```

**사용 예시**:

```typescript
// 드래그 시작
const onDragStart = () => {
  dragTransaction.begin();
};

// 드래그 중 (트리 이동)
const onTreeDrop = async (draggedId: string, dropPosition: DropPosition) => {
  const result = await moveElement({ ... });
  if (result.success) {
    dragTransaction.addEntry({
      type: 'tree-move',
      elementId: draggedId,
      from: { parentId: oldParentId, orderNum: oldOrderNum },
      to: { parentId: newParentId, orderNum: newOrderNum },
      siblingChanges: [...],
    });
  }
};

// 드래그 종료
const onDragEnd = async () => {
  const result = await dragTransaction.commit();
  if (!result.success) {
    showToast('드래그 작업 저장 실패');
  }
};

// 드래그 취소 (Escape)
const onDragCancel = () => {
  dragTransaction.rollback();
};
```

### 7.5 다중 선택 이동 기록 규칙

| 시나리오 | 히스토리 엔트리 타입 | 병합 여부 |
|----------|---------------------|----------|
| 단일 요소 트리 이동 | `tree-move` | - |
| 다중 요소 트리 이동 | `tree-move[]` → `composite` | 하나로 병합 |
| 단일 요소 캔버스 이동 | `position-move` | - |
| 다중 요소 캔버스 이동 | `multi-position-move` | 단일 엔트리로 기록 |
| 연속 드래그 (500ms 내) | 기존 엔트리와 병합 | coalescing |

---

## 구현 우선순위

```
Phase 1 (기본 인프라)
    ↓
Phase 2 (순서 변경) ←── 기존 elementReorder 확장
    ↓
Phase 3 (가상 스크롤) ←→ Phase 4 (시각적 피드백 & 접근성)
    ↓                           ↓
Phase 5 (WebGL 동기화) ←── 위치 타입별 방어 로직
    ↓
Phase 6 (배치 DB 업데이트)
    ↓
Phase 7 (히스토리 & Undo/Redo)
```

---

## 수정/생성 파일 목록

### 새 파일
```
src/builder/sidebar/dnd/
├── useDraggableTreeItem.ts
├── useDropTarget.ts
├── useTreeDragDrop.ts          # 전체 DnD 상태 관리
├── useAutoScroll.ts            # 자동 스크롤
├── useTreeDragDropA11y.ts      # 접근성
├── TreeDragPreview.tsx
├── DropIndicator.tsx
├── VirtualDropIndicator.tsx    # 가상 스크롤용
├── validation.ts               # 드롭 유효성 검증
├── types.ts
└── index.ts

src/builder/workspace/canvas/
└── canvasPositionSync.ts       # 위치 동기화 유틸

src/builder/stores/utils/
└── batchDbUpdate.ts            # 배치 업데이트 큐
```

### 수정 파일
```
src/builder/sidebar/VirtualizedLayerTree.tsx
src/builder/stores/utils/elementReorder.ts  # moveElement 추가
src/builder/stores/elements.ts
src/builder/stores/history/historyTypes.ts  # 새 엔트리 타입
src/builder/stores/history/historyActions.ts
src/builder/workspace/canvas/selection/useDragInteraction.ts
src/builder/nodes/index.css
```

---

## 주의 사항

1. **기존 코드 경로 활용**
   - `elementMove` 신설 대신 `elementReorder.ts` 확장으로 order_num 정규화 일관성 유지

2. **순환 참조 방지**
   - 자신의 자손에게 드롭 방지 필수

3. **Leaf 노드 처리**
   - inside 드롭 불가, before/after로 대체

4. **가상 스크롤 호환**
   - 자동 스크롤, 언마운트된 항목 드롭 인디케이터

5. **위치 타입 방어**
   - position: static 경고, relative는 transform 사용

6. **DB 동기화 전략**
   - diff 기반, optimistic 업데이트, 실패 시 롤백

7. **히스토리 coalescing**
   - 연속 드래그 병합으로 undo 스택 최적화

---

## 참고 자료

- [React Aria DnD](https://react-aria.adobe.com/dnd)
- [React Aria useDrag](https://react-aria.adobe.com/dnd#usedrag)
- [React Aria useDrop](https://react-aria.adobe.com/dnd#usedrop)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
