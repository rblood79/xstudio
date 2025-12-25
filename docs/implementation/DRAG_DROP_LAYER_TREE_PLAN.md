# Drag & Drop 레이어 트리 구현 계획서

> **작성일**: 2025-12-25
> **수정일**: 2025-12-25 (react-aria-components v1.14 기준 API 업데이트)
> **상태**: 계획 확정
> **관련 기술**: react-aria Tree, @tanstack/react-virtual, react-aria DnD, PixiJS
> **레퍼런스 기준**: react-aria-components v1.14 (2025년 12월)

---

## 목표

1. **react-aria Tree 마이그레이션**: nodesPanel의 레이어 트리를 react-aria Tree로 교체
2. **기존 기능 100% 보존**: Collection 가상 자식, Tabs 정렬, 세로 라인, 빌더 UI
3. **DnD 구현**: 내장 `onReorder`/`onMove`로 순서 변경 및 parent/child 관계 변경
4. **WebGL 캔버스 DnD**: WebGL 모드에서 선택된 요소를 드래그&드롭으로 위치 이동 후 React와 동기화

---

## 우선순위

| 순위 | 항목 | 비고 |
|------|------|------|
| 1 | 완성도 | react-aria Tree DnD 내장 활용 |
| 1-2 | 기존 기능 동작 보장 | 세로 라인, Collection 가상 자식, Tabs 정렬 |
| 1-3 | WebGL 퍼포먼스 | Virtualizer 적용 |

---

## 현재 상태 분석

| 항목 | 상태 | 파일 |
|------|------|------|
| react-aria-components | ✅ v1.14.0 | `package.json` |
| 레이어 트리 | 커스텀 `VirtualizedLayerTree` (497줄) | `src/builder/sidebar/VirtualizedLayerTree.tsx` |
| 세로 라인 | `elementItemIndent` + `linear-gradient` | `src/builder/nodes/index.css:40-49` |
| Collection 가상 자식 | 8가지 타입 지원 | `VirtualizedLayerTree.tsx:70-122` |
| Tabs 특수 정렬 | `sortTabsChildren` | `src/builder/utils/treeUtils.ts:132-186` |
| 빌더 액션 버튼 | Settings2, Trash | `VirtualizedLayerTree.tsx:375-390` |

### 보존 필수 UI 요소: 세로 라인

```css
/* src/builder/nodes/index.css */
.elementItemIndent {
  display: inline-block;
  width: var(--spacing-lg);
  height: var(--spacing-2xl);
  position: relative;
  /* 세로 라인: 8px 간격으로 1px 선 반복 */
  background: linear-gradient(to left, var(--border-color) 1px, transparent 1px) 0 0 / 8px 1px;
}
```

**구현 방식**: `depth * 8px` 너비로 세로 라인 표시

---

## Phase 1: react-aria Tree 기본 마이그레이션

### 1.1 새 파일 구조

```
📁 src/builder/sidebar/
├── LayerTree/
│   ├── LayerTree.tsx           # react-aria Tree 기반 메인 컴포넌트
│   ├── LayerTreeItem.tsx       # TreeItem 커스텀 렌더링
│   ├── LayerTreeContent.tsx    # TreeItemContent (세로 라인 + 아이콘 + 라벨)
│   ├── VirtualChildItem.tsx    # Collection 가상 자식 렌더링
│   ├── useLayerTreeData.ts     # useTreeData + Zustand 동기화
│   ├── types.ts                # 타입 정의
│   └── index.ts                # 배럴 export
├── VirtualizedLayerTree.tsx    # [DEPRECATED] 마이그레이션 후 제거
└── ...
```

### 1.2 핵심 타입 정의

```typescript
// types.ts
import type { TreeItemProps } from 'react-aria-components';
import type { Element } from '../../../types/core/store.types';

export interface LayerTreeNode {
  id: string;
  name: string;        // 표시 라벨 (tag 또는 커스텀)
  tag: string;         // 원본 태그
  parentId: string | null;
  orderNum: number;
  depth: number;
  hasChildren: boolean;
  isLeaf: boolean;
  children?: LayerTreeNode[];
  // 원본 Element 참조
  element: Element;
  // Collection 가상 자식용
  virtualChildType?: VirtualChildType;
  virtualChildIndex?: number;
  virtualChildData?: unknown;
}

export type VirtualChildType =
  | 'toggle'
  | 'checkbox'
  | 'radio'
  | 'listbox'
  | 'gridlist'
  | 'select'
  | 'combobox'
  | 'tree';

export interface LayerTreeProps {
  elements: Element[];
  selectedElementId: string | null;
  selectedTab?: { parentId: string; tabIndex: number } | null;
  onItemClick: (element: Element) => void;
  onItemDelete: (element: Element) => Promise<void>;
  onSelectTabElement?: (parentId: string, props: ElementProps, index: number) => void;
}
```

### 1.3 react-aria Tree 기본 구조

> ⚠️ **주의 (v1.14 기준)**: react-aria Virtualizer는 Tree와의 직접 통합이 공식 지원되지 않음.
> ListBox, GridList, Table만 Virtualizer 공식 지원. Tree는 `@tanstack/react-virtual` 사용 권장.

```typescript
// LayerTree.tsx
import { Tree, TreeItem } from 'react-aria-components';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTreeData } from 'react-stately';
import { LayerTreeContent } from './LayerTreeContent';
import { useLayerTreeData } from './useLayerTreeData';

export function LayerTree({ elements, selectedElementId, onItemClick, onItemDelete }: LayerTreeProps) {
  // Zustand elements → react-aria TreeData 변환 및 동기화
  const { tree, syncToStore } = useLayerTreeData(elements);
  const containerRef = useRef<HTMLDivElement>(null);

  // 옵션 A: @tanstack/react-virtual 사용 (권장, 100+ 요소 시)
  const flatItems = useMemo(() => flattenTree(tree.items), [tree.items]);
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 28,
    overscan: 5,
  });

  // 옵션 B: react-aria Tree 기본 스크롤링 (요소 적을 때)
  return (
    <div ref={containerRef} style={{ maxHeight: '400px', overflow: 'auto' }}>
      <Tree
        aria-label="Layers"
        items={tree.items}
        selectionMode="single"
        selectedKeys={selectedElementId ? [selectedElementId] : []}
        onSelectionChange={(keys) => {
          const id = [...keys][0] as string;
          const node = tree.getItem(id);
          if (node) onItemClick(node.value.element);
        }}
      >
        {(node) => (
          <LayerTreeItem
            key={node.id}
            node={node}
            onDelete={onItemDelete}
          />
        )}
      </Tree>
    </div>
  );
}
```

### 1.4 세로 라인 보존 (LayerTreeContent)

```typescript
// LayerTreeContent.tsx
import { TreeItemContent, Button } from 'react-aria-components';
import { ChevronRight, Box, Settings2, Trash } from 'lucide-react';
import { ICON_EDIT_PROPS } from '../treeHelpers';

interface LayerTreeContentProps {
  node: LayerTreeNode;
  onDelete: (element: Element) => Promise<void>;
}

export function LayerTreeContent({ node, onDelete }: LayerTreeContentProps) {
  const { depth, hasChildren, tag, element } = node;

  return (
    <TreeItemContent>
      {({ isExpanded, isFocusVisible, isSelected }) => (
        <div className={`elementItem ${isSelected ? 'active' : ''} ${isFocusVisible ? 'focused' : ''}`}>
          {/* 🔑 세로 라인 보존: depth * 8px */}
          <div
            className="elementItemIndent"
            style={{ width: depth > 0 ? `${depth * 8}px` : '0px' }}
          />

          {/* 아이콘 (펼침/접기) */}
          <div className="elementItemIcon">
            {hasChildren ? (
              <ChevronRight
                color={ICON_EDIT_PROPS.color}
                strokeWidth={ICON_EDIT_PROPS.stroke}
                size={ICON_EDIT_PROPS.size}
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              />
            ) : (
              <Box
                color={ICON_EDIT_PROPS.color}
                strokeWidth={ICON_EDIT_PROPS.stroke}
                size={ICON_EDIT_PROPS.size}
                style={{ padding: '2px' }}
              />
            )}
          </div>

          {/* 라벨 */}
          <div className="elementItemLabel">{node.name}</div>

          {/* 빌더 액션 버튼 */}
          <div className="elementItemActions">
            <Button className="iconButton" aria-label="Settings">
              <Settings2 {...ICON_EDIT_PROPS} />
            </Button>
            {tag !== 'body' && (
              <Button
                className="iconButton"
                aria-label={`Delete ${tag}`}
                onPress={() => onDelete(element)}
              >
                <Trash {...ICON_EDIT_PROPS} />
              </Button>
            )}
          </div>
        </div>
      )}
    </TreeItemContent>
  );
}
```

### 1.5 Zustand 동기화 훅

```typescript
// useLayerTreeData.ts
import { useTreeData } from 'react-stately';
import { useMemo, useCallback, useEffect } from 'react';
import { useStore } from '../../stores';
import { buildTreeFromElements } from '../../utils/treeUtils';
import type { Element } from '../../../types/core/store.types';
import type { LayerTreeNode } from './types';

export function useLayerTreeData(elements: Element[]) {
  // 기존 treeUtils 활용하여 트리 구조 생성
  const elementTree = useMemo(() => buildTreeFromElements(elements), [elements]);

  // ElementTreeItem → LayerTreeNode 변환
  const treeNodes = useMemo(() => convertToLayerTreeNodes(elementTree, elements), [elementTree, elements]);

  // react-aria useTreeData
  const tree = useTreeData<LayerTreeNode>({
    initialItems: treeNodes,
    getKey: (item) => item.id,
    getChildren: (item) => item.children || [],
  });

  // elements 변경 시 tree 동기화
  useEffect(() => {
    // tree.items와 treeNodes 비교 후 필요시 업데이트
    syncTreeData(tree, treeNodes);
  }, [treeNodes]);

  // Store 업데이트 함수
  const updateElementOrder = useStore((state) => state.updateElementOrder);
  const batchUpdateElements = useStore((state) => state.batchUpdateElementProps);

  const syncToStore = useCallback((updates: Array<{ id: string; parentId: string | null; orderNum: number }>) => {
    // Zustand store 업데이트
    updates.forEach(({ id, parentId, orderNum }) => {
      updateElementOrder(id, { parent_id: parentId, order_num: orderNum });
    });
  }, [updateElementOrder]);

  return { tree, syncToStore };
}

// 변환 헬퍼 (Collection 가상 자식 포함)
function convertToLayerTreeNodes(
  tree: ElementTreeItem[],
  elements: Element[],
  depth = 0
): LayerTreeNode[] {
  const elementsMap = new Map(elements.map(e => [e.id, e]));

  return tree.flatMap((item): LayerTreeNode[] => {
    const element = elementsMap.get(item.id);
    if (!element) return [];

    const baseNode: LayerTreeNode = {
      id: item.id,
      name: getDisplayName(item),
      tag: item.tag,
      parentId: item.parent_id || null,
      orderNum: item.order_num,
      depth,
      hasChildren: Boolean(item.children?.length) || hasVirtualChildren(item),
      isLeaf: !item.children?.length && !hasVirtualChildren(item),
      element,
      children: item.children ? convertToLayerTreeNodes(item.children, elements, depth + 1) : [],
    };

    // Collection 가상 자식 추가
    const virtualChildren = getVirtualChildren(item, depth + 1, element);
    if (virtualChildren.length > 0) {
      baseNode.children = [...(baseNode.children || []), ...virtualChildren];
    }

    return [baseNode];
  });
}
```

---

## Phase 2: DnD 구현 (onMove 사용)

> **v1.14 API 기준**: `onMove`만 사용하여 모든 DnD 케이스 처리 권장
> - `onReorder`: 같은 레벨 순서 변경만 지원
> - `onMove`: 모든 이동 (순서 변경 + 부모 변경) 지원 ✅

### 2.1 useDragAndDrop 설정

```typescript
// LayerTree.tsx (DnD 추가)
import { useDragAndDrop } from 'react-aria-components';

export function LayerTree({ elements, ... }: LayerTreeProps) {
  const { tree, syncToStore } = useLayerTreeData(elements);

  const { dragAndDropHooks } = useDragAndDrop({
    // 드래그 아이템 정의
    getItems: (keys) => [...keys].map(key => ({
      'application/x-layer-tree-item': JSON.stringify({ id: key }),
      'text/plain': tree.getItem(key)?.value.name || '',
    })),

    // ✅ onMove만 사용하여 모든 DnD 케이스 처리 (v1.14 권장)
    onMove(e) {
      const { keys, target } = e;

      // 1. 같은 레벨 이동 (before/after)
      if (target.dropPosition === 'before') {
        tree.moveBefore(target.key, keys);  // ✅ v1.14 API
      } else if (target.dropPosition === 'after') {
        tree.moveAfter(target.key, keys);   // ✅ v1.14 API
      }
      // 2. 부모 변경 (on) - 타겟의 자식으로 이동
      else if (target.dropPosition === 'on') {
        [...keys].forEach((key, i) => {
          tree.move(key, target.key, i);    // move(key, toParentKey, index)
        });
      }

      // 3. Zustand + IndexedDB 동기화
      const updates = calculateMoveUpdates(keys, target);
      syncToStore(updates);
    },

    // 드롭 유효성 검증
    acceptedDragTypes: ['application/x-layer-tree-item'],

    // 드래그 프리뷰
    renderDragPreview(items) {
      return <DragPreview items={items} />;
    },

    // 드롭 인디케이터
    renderDropIndicator(target) {
      return <DropIndicator target={target} />;
    },
  });

  return (
    <div ref={containerRef} style={{ maxHeight: '400px', overflow: 'auto' }}>
      <Tree
        aria-label="Layers"
        items={tree.items}
        dragAndDropHooks={dragAndDropHooks}
        // ...
      >
        {/* ... */}
      </Tree>
    </div>
  );
}
```

### useTreeData 메서드 요약 (v1.14)

| 메서드 | 시그니처 | 용도 |
|--------|----------|------|
| `moveBefore` | `tree.moveBefore(targetKey, keys)` | 대상 항목 이전으로 이동 |
| `moveAfter` | `tree.moveAfter(targetKey, keys)` | 대상 항목 이후로 이동 |
| `move` | `tree.move(key, parentKey, index)` | 특정 부모의 인덱스로 이동 |

### 2.2 드롭 유효성 검증

```typescript
// validation.ts
export function isValidDrop(
  draggedId: string,
  targetId: string,
  dropPosition: 'before' | 'after' | 'on',
  tree: TreeData<LayerTreeNode>
): { valid: boolean; reason?: string } {
  const draggedNode = tree.getItem(draggedId)?.value;
  const targetNode = tree.getItem(targetId)?.value;

  if (!draggedNode || !targetNode) {
    return { valid: false, reason: 'invalid-node' };
  }

  // 1. 자기 자신에게 드롭 불가
  if (draggedId === targetId) {
    return { valid: false, reason: 'self-drop' };
  }

  // 2. 자신의 자손에게 드롭 불가 (순환 참조 방지)
  if (isDescendant(draggedId, targetId, tree)) {
    return { valid: false, reason: 'descendant-drop' };
  }

  // 3. leaf 노드 내부로 드롭 불가 (dropPosition === 'on')
  if (dropPosition === 'on' && targetNode.isLeaf) {
    return { valid: false, reason: 'leaf-inside' };
  }

  // 4. body는 이동 불가
  if (draggedNode.tag === 'body') {
    return { valid: false, reason: 'body-immutable' };
  }

  // 5. 루트 레벨로 이동 불가 (body 외)
  if (targetNode.depth === 0 && dropPosition !== 'on') {
    return { valid: false, reason: 'root-level-denied' };
  }

  return { valid: true };
}

function isDescendant(ancestorId: string, descendantId: string, tree: TreeData<LayerTreeNode>): boolean {
  let current = tree.getItem(descendantId);
  while (current) {
    if (current.value.parentId === ancestorId) return true;
    current = current.value.parentId ? tree.getItem(current.value.parentId) : null;
  }
  return false;
}
```

### 2.3 기존 elementReorder.ts 연동

```typescript
// 기존 reorderElements 함수 활용
import { reorderElements } from '../../stores/utils/elementReorder';

function calculateOrderUpdates(
  treeItems: TreeNode<LayerTreeNode>[],
  movedKeys: Set<Key>,
  targetKey: Key,
  dropPosition: 'before' | 'after'
): Array<{ id: string; parentId: string | null; orderNum: number }> {
  // 이동된 노드의 새 부모 찾기
  const targetNode = findNode(treeItems, targetKey);
  const newParentId = targetNode?.value.parentId || null;

  // 같은 부모의 형제들 추출
  const siblings = getSiblings(treeItems, newParentId);

  // 기존 reorderElements 로직 재사용
  const reordered = reorderElements(
    siblings.map(s => s.value.element),
    [...movedKeys].map(k => findNode(treeItems, k)!.value.element),
    targetKey as string,
    dropPosition
  );

  return reordered.map((el, idx) => ({
    id: el.id,
    parentId: newParentId,
    orderNum: idx,
  }));
}
```

---

## Phase 3: Collection 가상 자식 보존

### 3.1 가상 자식 렌더링

```typescript
// VirtualChildItem.tsx
import { TreeItem, TreeItemContent } from 'react-aria-components';
import { Box, Folder, File } from 'lucide-react';
import type { LayerTreeNode, VirtualChildType } from './types';

interface VirtualChildItemProps {
  node: LayerTreeNode;
  onSelect?: (parentId: string, index: number) => void;
}

export function VirtualChildItem({ node, onSelect }: VirtualChildItemProps) {
  const { virtualChildType, virtualChildIndex, virtualChildData, depth } = node;

  if (!virtualChildType || virtualChildIndex === undefined) return null;

  const label = getVirtualChildLabel(virtualChildType, virtualChildData, virtualChildIndex);
  const icon = getVirtualChildIcon(virtualChildType, virtualChildData);

  return (
    <TreeItem
      id={`${node.id}-${virtualChildType}-${virtualChildIndex}`}
      textValue={label}
    >
      <TreeItemContent>
        {({ isSelected }) => (
          <div
            className={`elementItem ${isSelected ? 'active' : ''}`}
            onClick={() => onSelect?.(node.id, virtualChildIndex)}
          >
            {/* 세로 라인 */}
            <div className="elementItemIndent" style={{ width: `${depth * 8}px` }} />
            <div className="elementItemIcon">{icon}</div>
            <div className="elementItemLabel">{label}</div>
            <div className="elementItemActions" />
          </div>
        )}
      </TreeItemContent>
    </TreeItem>
  );
}

function getVirtualChildLabel(type: VirtualChildType, data: unknown, index: number): string {
  switch (type) {
    case 'toggle':
      return (data as ButtonItem).title || `Button ${index + 1}`;
    case 'checkbox':
      return (data as CheckboxItem).label || `Checkbox ${index + 1}`;
    case 'radio':
      return (data as RadioItem).label || `Radio ${index + 1}`;
    case 'listbox':
    case 'gridlist':
      return (data as ListItem).label || `Item ${index + 1}`;
    case 'select':
    case 'combobox':
      return (data as ListItem).label || `Option ${index + 1}`;
    case 'tree':
      return (data as TreeItemType).title;
    default:
      return `Item ${index + 1}`;
  }
}

function getVirtualChildIcon(type: VirtualChildType, data: unknown) {
  if (type === 'tree') {
    const treeItem = data as TreeItemType;
    return treeItem.children?.length > 0
      ? <Folder size={14} />
      : <File size={14} />;
  }
  return <Box size={14} style={{ padding: '2px' }} />;
}
```

### 3.2 지원 Collection 타입 (8가지)

| 타입 | 컴포넌트 | 가상 자식 소스 |
|------|---------|--------------|
| toggle | ToggleButtonGroup | `props.children: ButtonItem[]` |
| checkbox | CheckboxGroup | `props.children: CheckboxItem[]` |
| radio | RadioGroup | `props.children: RadioItem[]` |
| listbox | ListBox | `props.children: ListItem[]` |
| gridlist | GridList | `props.children: ListItem[]` |
| select | Select | `props.children: ListItem[]` |
| combobox | ComboBox | `props.children: ListItem[]` |
| tree | Tree | `props.children: TreeItemType[]` |

---

## Phase 4: Tabs 특수 정렬 보존

### 4.1 기존 sortTabsChildren 로직 유지

```typescript
// useLayerTreeData.ts 내부

function convertToLayerTreeNodes(tree: ElementTreeItem[], ...): LayerTreeNode[] {
  return tree.flatMap((item): LayerTreeNode[] => {
    // ...

    let children = item.children || [];

    // 🔑 Tabs 특수 정렬: Tab-Panel 쌍 유지
    if (item.tag === 'Tabs') {
      children = sortTabsChildrenForTree(children);
    }

    const baseNode: LayerTreeNode = {
      // ...
      children: children.length > 0
        ? convertToLayerTreeNodes(children, elements, depth + 1)
        : [],
    };

    return [baseNode];
  });
}

// treeUtils.ts의 sortTabsChildren 재사용
function sortTabsChildrenForTree(items: ElementTreeItem[]): ElementTreeItem[] {
  const tabs = items.filter(i => i.tag === 'Tab').sort((a, b) => a.order_num - b.order_num);
  const panels = items.filter(i => i.tag === 'Panel').sort((a, b) => a.order_num - b.order_num);

  const paired: ElementTreeItem[] = [];
  const usedPanelIds = new Set<string>();

  tabs.forEach((tab) => {
    paired.push(tab);
    const tabId = tab.props?.tabId;
    if (tabId) {
      const matchingPanel = panels.find(p => p.props?.tabId === tabId && !usedPanelIds.has(p.id));
      if (matchingPanel) {
        paired.push(matchingPanel);
        usedPanelIds.add(matchingPanel.id);
      }
    }
  });

  // orphaned panels
  panels.filter(p => !usedPanelIds.has(p.id)).forEach(p => paired.push(p));

  return paired;
}
```

---

## Phase 5: WebGL 캔버스 동기화

### 5.1 위치 이동 후 React 동기화

```typescript
// useDragInteraction.ts 수정

const handleMoveEnd = useCallback((elementId: string, delta: { x: number; y: number }) => {
  const element = elementsMap.get(elementId);
  if (!element) return;

  // position 타입 체크
  const currentPosition = element.props?.style?.position || 'static';

  if (currentPosition === 'static') {
    console.warn('static position 요소는 드래그 이동 불가');
    return;
  }

  // 현재 위치 가져오기
  const currentLeft = parseFloat(element.props?.style?.left || '0');
  const currentTop = parseFloat(element.props?.style?.top || '0');

  // 새 위치 계산
  const newLeft = currentLeft + delta.x;
  const newTop = currentTop + delta.y;

  // Zustand 업데이트
  updateElement(elementId, {
    props: {
      ...element.props,
      style: {
        ...element.props?.style,
        left: `${newLeft}px`,
        top: `${newTop}px`,
      },
    },
  });

  // 히스토리 기록
  recordPositionChange(elementId, {
    from: { left: currentLeft, top: currentTop },
    to: { left: newLeft, top: newTop },
  });
}, [elementsMap, updateElement, recordPositionChange]);
```

---

## Phase 6: 배치 DB 업데이트 (IndexedDB)

### 6.1 IndexedDB Adapter 활용

> **API 기준**: `src/lib/db/types.ts` DatabaseAdapter 인터페이스

```typescript
// batchUpdateElements.ts
import { getDB } from '../../../lib/db';
import type { Element } from '../../../types/core/store.types';

interface ElementUpdate {
  id: string;
  parent_id?: string | null;
  order_num?: number;
}

/**
 * IndexedDB를 통한 배치 업데이트
 * - 로컬 우선 (Local-first): 1-5ms 응답
 * - 오프라인 지원
 * - Supabase 동기화는 별도 sync 레이어에서 처리
 */
export async function batchUpdateElementsInDB(
  updates: ElementUpdate[]
): Promise<{ success: boolean; error?: string }> {
  if (updates.length === 0) return { success: true };

  try {
    const db = await getDB();

    // ✅ 올바른 API: db.elements.updateMany 사용
    await db.elements.updateMany(
      updates.map(u => ({
        id: u.id,
        data: {
          ...(u.parent_id !== undefined && { parent_id: u.parent_id }),
          ...(u.order_num !== undefined && { order_num: u.order_num }),
          updated_at: new Date().toISOString(),
        },
      }))
    );

    return { success: true };
  } catch (error) {
    console.error('IndexedDB batch update failed:', error);
    return { success: false, error: String(error) };
  }
}

// 디바운스 적용 (300ms)
export const debouncedBatchUpdate = debounce(batchUpdateElementsInDB, 300);
```

### IndexedDB API 참고 (src/lib/db/types.ts)

```typescript
// DatabaseAdapter.elements 인터페이스
elements: {
  getById(id: string): Promise<Element | null>;           // 단일 조회
  update(id: string, data: Partial<Element>): Promise<Element>;  // 단일 업데이트
  updateMany(updates: Array<{ id: string; data: Partial<Element> }>): Promise<Element[]>;  // 배치 업데이트 ✅
}
```

### 6.2 롤백 전략 (IndexedDB 스냅샷)

```typescript
// useLayerTreeData.ts

const syncToStore = useCallback(async (updates: ElementUpdate[]) => {
  // 1. 롤백용 스냅샷 저장 (IndexedDB에서 현재 상태 읽기)
  const db = await getDB();
  const snapshots = await Promise.all(
    updates.map(async (u) => {
      const element = await db.elements.getById(u.id);  // ✅ 올바른 API
      return {
        id: u.id,
        parent_id: element?.parent_id,
        order_num: element?.order_num,
      };
    })
  );

  // 2. 낙관적 업데이트 (Zustand)
  updates.forEach(({ id, parentId, orderNum }) => {
    updateElementOrder(id, { parent_id: parentId, order_num: orderNum });
  });

  // 3. IndexedDB 커밋 (비동기)
  const result = await debouncedBatchUpdate(updates);

  // 4. 실패 시 롤백
  if (!result.success) {
    // Zustand 롤백
    snapshots.forEach(({ id, parent_id, order_num }) => {
      updateElementOrder(id, { parent_id, order_num });
    });
    toast.error('변경사항 저장 실패. 롤백되었습니다.');
  }
}, [updateElementOrder]);
```

### 6.3 Supabase 동기화 (선택적)

```typescript
// 기존 projectSync.ts 활용
// IndexedDB → Supabase 동기화는 별도 sync 레이어에서 자동 처리
// DnD 작업에서는 IndexedDB만 직접 업데이트
```

---

## Phase 7: 히스토리 & Undo/Redo

### 7.1 DragHistoryEntry 타입

```typescript
// history/types.ts
export interface DragHistoryEntry {
  type: 'tree-move';
  timestamp: number;
  elementId: string;
  changes: {
    parentId: { from: string | null; to: string | null };
    orderNum: { from: number; to: number };
  };
  siblingChanges: Array<{
    id: string;
    orderNum: { from: number; to: number };
  }>;
  coalesceKey?: string; // 같은 키면 병합
}
```

### 7.2 Coalescing 규칙

```typescript
function shouldCoalesce(prev: DragHistoryEntry, next: DragHistoryEntry): boolean {
  // 1. 같은 요소의 연속 이동만 병합
  if (prev.elementId !== next.elementId) return false;

  // 2. 500ms 이내만 병합
  if (next.timestamp - prev.timestamp > 500) return false;

  // 3. 같은 coalesceKey만 병합
  if (prev.coalesceKey !== next.coalesceKey) return false;

  return true;
}

function coalesce(prev: DragHistoryEntry, next: DragHistoryEntry): DragHistoryEntry {
  return {
    ...next,
    changes: {
      parentId: { from: prev.changes.parentId.from, to: next.changes.parentId.to },
      orderNum: { from: prev.changes.orderNum.from, to: next.changes.orderNum.to },
    },
    // siblingChanges는 최신 것 사용
  };
}
```

### 7.3 Undo/Redo 구현

```typescript
// historyActions.ts

function undoTreeMove(entry: DragHistoryEntry) {
  const { elementId, changes, siblingChanges } = entry;

  // 1. 메인 요소 복원
  updateElementOrder(elementId, {
    parent_id: changes.parentId.from,
    order_num: changes.orderNum.from,
  });

  // 2. 형제 요소들 복원
  siblingChanges.forEach(({ id, orderNum }) => {
    updateElementOrder(id, { order_num: orderNum.from });
  });

  // 3. DB 동기화
  debouncedBatchUpdate([
    { id: elementId, parent_id: changes.parentId.from, order_num: changes.orderNum.from },
    ...siblingChanges.map(s => ({ id: s.id, order_num: s.orderNum.from })),
  ]);
}

function redoTreeMove(entry: DragHistoryEntry) {
  const { elementId, changes, siblingChanges } = entry;

  // Undo의 역방향
  updateElementOrder(elementId, {
    parent_id: changes.parentId.to,
    order_num: changes.orderNum.to,
  });

  siblingChanges.forEach(({ id, orderNum }) => {
    updateElementOrder(id, { order_num: orderNum.to });
  });

  debouncedBatchUpdate([
    { id: elementId, parent_id: changes.parentId.to, order_num: changes.orderNum.to },
    ...siblingChanges.map(s => ({ id: s.id, order_num: s.orderNum.to })),
  ]);
}
```

---

## 마이그레이션 체크리스트

### Phase 1: 기본 마이그레이션
- [ ] LayerTree 디렉토리 생성
- [ ] LayerTree.tsx 기본 구조 작성
- [ ] LayerTreeContent.tsx (세로 라인 보존)
- [ ] useLayerTreeData.ts (Zustand 동기화)
- [ ] 기존 VirtualizedLayerTree 대체 테스트

### Phase 2: DnD 구현
- [ ] useDragAndDrop 설정
- [ ] onReorder 구현 (같은 레벨)
- [ ] onMove 구현 (부모 변경)
- [ ] 드롭 유효성 검증
- [ ] 드래그 프리뷰 / 드롭 인디케이터

### Phase 3: Collection 가상 자식
- [ ] VirtualChildItem.tsx 작성
- [ ] 8가지 타입 지원 확인
- [ ] 선택 동작 테스트

### Phase 4: Tabs 정렬
- [ ] sortTabsChildrenForTree 구현
- [ ] Tab-Panel 쌍 유지 테스트

### Phase 5: WebGL 동기화
- [ ] handleMoveEnd 수정
- [ ] position 타입별 동작 확인

### Phase 6: 배치 DB
- [ ] batchUpdateElementsInDB 구현
- [ ] 디바운스 적용
- [ ] 롤백 테스트

### Phase 7: 히스토리
- [ ] DragHistoryEntry 타입 추가
- [ ] Undo/Redo 구현
- [ ] Coalescing 테스트

---

## 영향받는 파일 목록

| 파일 | 변경 유형 | 비고 |
|------|----------|------|
| `sidebar/LayerTree/` | **신규** | 새 디렉토리 |
| `sidebar/VirtualizedLayerTree.tsx` | **삭제** | 마이그레이션 후 |
| `nodes/Layers.tsx` | 수정 | LayerTree import 변경 |
| `nodes/NodesPanel.tsx` | 수정 | LayerTree 연결 |
| `stores/utils/elementReorder.ts` | 유지 | 기존 로직 재사용 |
| `utils/treeUtils.ts` | 유지 | sortTabsChildren 재사용 |
| `stores/history/` | 수정 | DragHistoryEntry 추가 |
| `nodes/index.css` | 유지 | 기존 스타일 100% 보존 |

---

## 테스트 시나리오

### 기능 테스트
1. [ ] 트리 렌더링 확인 (세로 라인 포함)
2. [ ] 펼침/접기 동작
3. [ ] 선택 동작
4. [ ] DnD 순서 변경 (같은 레벨)
5. [ ] DnD 부모 변경 (다른 레벨)
6. [ ] Collection 가상 자식 표시
7. [ ] Tabs Tab-Panel 쌍 정렬
8. [ ] Settings/Delete 버튼 동작

### 접근성 테스트
1. [ ] 키보드 네비게이션 (Arrow, Home, End)
2. [ ] 스크린 리더 ARIA 트리 패턴
3. [ ] 포커스 표시

### 성능 테스트
1. [ ] 100+ 요소 가상 스크롤
2. [ ] 드래그 중 60fps 유지
3. [ ] 배치 업데이트 디바운스

---

## 참고 자료

> **기준**: react-aria-components v1.14 (2025년 12월)

- [React Aria Tree](https://react-aria.adobe.com/Tree) - Tree 컴포넌트 및 DnD 통합
- [React Aria Virtualizer](https://react-aria.adobe.com/Virtualizer) - 가상 스크롤링 (ListBox/GridList/Table 지원, Tree 미지원)
- [React Aria DnD](https://react-aria.adobe.com/dnd) - useDragAndDrop, onMove/onReorder 핸들러
- [React Stately useTreeData](https://react-spectrum.adobe.com/react-stately/useTreeData.html) - moveBefore/moveAfter/move 메서드

### API 요약 (v1.14)

| 메서드 | 시그니처 | 설명 |
|--------|----------|------|
| `moveBefore` | `tree.moveBefore(targetKey, keys)` | 대상 항목 이전으로 이동 |
| `moveAfter` | `tree.moveAfter(targetKey, keys)` | 대상 항목 이후로 이동 |
| `move` | `tree.move(key, parentKey, index)` | 특정 부모의 인덱스로 이동 |
| `onMove` | `useDragAndDrop({ onMove(e) {...} })` | 계층 간 이동 지원 (before/after/on) |
| `onReorder` | `useDragAndDrop({ onReorder(e) {...} })` | 같은 레벨만 지원 |
