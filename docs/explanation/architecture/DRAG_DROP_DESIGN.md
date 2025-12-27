# Drag & Drop 레이어 트리 구현 계획서 (초기 설계)

> **작성일**: 2025-12-25
> **수정일**: 2025-12-25 (react-aria-components v1.14 기준 API 업데이트)
> **상태**: 초기 설계 문서 (보관)
> **최신 구현 문서**: `docs/implementation/DRAG_DROP_LAYER_TREE_IMPLEMENTATION.md`
> **관련 기술**: react-aria Tree, @tanstack/react-virtual, react-aria DnD, PixiJS
> **레퍼런스 기준**: react-aria-components v1.14 (2025년 12월)

---

이 문서는 **초기 설계 기록**입니다. 최신 구현 내용과 운영 기준은
`docs/implementation/DRAG_DROP_LAYER_TREE_IMPLEMENTATION.md`를 참고하세요.

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
│   ├── LayerTree.tsx           # react-aria Tree 기반 메인 컴포넌트 (상태/드롭/선택)
│   ├── LayerTreeItem.tsx       # TreeItem 컨테이너 (drag handle + content)
│   ├── LayerTreeContent.tsx    # TreeItemContent (세로 라인 + 아이콘 + 라벨 + 액션)
│   ├── VirtualChildItem.tsx    # Collection 가상 자식 렌더링 (선택 전용)
│   ├── useLayerTreeData.ts     # useTreeData + elements → TreeData 변환
│   ├── useLayerTreeDnd.ts      # DnD 계산/검증 유틸 (calculateMoveUpdates 포함)
│   ├── validation.ts           # drop 유효성 검증
│   ├── types.ts                # 타입 정의
│   └── index.ts                # 배럴 export
├── VirtualizedLayerTree.tsx    # [DEPRECATED] 마이그레이션 후 제거
└── ...
```

### 1.1.1 컴포넌트 역할 분리 (구현 방향)

**LayerTree.tsx**
- Tree 제어 컴포넌트: `selectedKeys`, `expandedKeys`, `dragAndDropHooks` 연결
- `useLayerTreeData`로 TreeData 생성, `useLayerTreeDnd`로 이동 계산
- `onSelectionChange`에서 가상 자식 제외 후 store 업데이트

**LayerTreeItem.tsx**
- TreeItem wrapper로 렌더링 책임 분리
- Drag handle 영역 지정 (Settings/Delete와 분리)
- `TreeItemContent`와 `VirtualChildItem` 분기

**LayerTreeContent.tsx**
- 세로 라인, 아이콘, 라벨, 액션 버튼 렌더링
- expand 토글 클릭 처리
- `selected`/`focus` 상태 스타일 적용

**VirtualChildItem.tsx**
- Collection 가상 자식 렌더링 전담
- 선택 전용(`selectedTab`), drag/drop 비활성화
- `aria-disabled` 적용

**useLayerTreeData.ts**
- `buildTreeFromElements` 기반 TreeData 생성
- 가상 자식 삽입, Tabs 정렬 반영
- elements 변경 시 재초기화 전략 지원

**useLayerTreeDnd.ts**
- `calculateMoveUpdates`, `collectSiblings`, `computeInsertIndex` 제공
- dropPosition 처리 및 old/new parent 재정렬

**validation.ts**
- `isValidDrop` + reason 코드 제공
- DnD UX 피드백과 연동

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
  expandedKeys?: Set<string | number>;
  onExpandedChange?: (keys: Set<string | number>) => void;
  onToggleExpand?: (key: string) => void;
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

export function LayerTree({
  elements,
  selectedElementId,
  expandedKeys,
  onExpandedChange,
  onItemClick,
  onItemDelete,
}: LayerTreeProps) {
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
        selectedKeys={selectedElementId ? new Set([selectedElementId]) : new Set()}
        expandedKeys={expandedKeys}
        onExpandedChange={(keys) => {
          if (onExpandedChange && keys !== 'all') {
            onExpandedChange(keys as Set<string | number>);
          }
        }}
        onSelectionChange={(keys) => {
          if (keys === 'all') return;
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
  onToggleExpand?: (key: string) => void;
}

export function LayerTreeContent({ node, onDelete, onToggleExpand }: LayerTreeContentProps) {
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
          <div
            className="elementItemIcon"
            onClick={() => {
              if (hasChildren) onToggleExpand?.(node.id);
            }}
          >
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
  const batchUpdateElements = useStore((state) => state.batchUpdateElements);

  const syncToStore = useCallback((updates: Array<{ id: string; parentId?: string | null; orderNum?: number }>) => {
    // ✅ batchUpdateElements로 parent_id + order_num 동시 업데이트
    batchUpdateElements(
      updates.map((update) => ({
        elementId: update.id,
        updates: {
          ...(update.parentId !== undefined && { parent_id: update.parentId }),
          ...(update.orderNum !== undefined && { order_num: update.orderNum }),
        },
      }))
    );
  }, [batchUpdateElements]);

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

### 1.6 Tree 상태 동기화 / expandedKeys / selection 모델

**확장 상태**
- `useTreeExpandState`의 `expandedKeys`를 Tree에 전달해 **완전 제어형**으로 유지
- 아이콘 클릭은 `onToggleExpand`로 처리하고, 키보드/포커스 확장은 `onExpandedChange`로 수신

**선택 상태**
- `selectedKeys`는 `Set` 기반 (`new Set([id])`)으로 전달
- `onSelectionChange`에서 `keys === 'all'` 처리
- Collection 가상 자식은 **Tree 선택과 분리**하여 `selectedTab`로만 하이라이트

**Tree 데이터 동기화**
- `useTreeData`는 내부 상태를 가지므로 **elements 변경 시 재초기화 전략** 필요
- 권장: `LayerTree`에 `key`를 부여해 재마운트하고, 확장/선택은 외부 상태로 유지
  - 예시: `const treeKey = useMemo(() => `${pageId}:${elements.length}`, [pageId, elements.length]);`

### 1.7 Tree 가상화 전략

> ⚠️ **react-aria Tree는 Virtualizer 공식 통합이 없음**  
> 현재 기준에서는 **두 가지 모드**를 명확히 분리해 운영하는 것이 안전합니다.

#### 모드 A: 비가상화 (기본)
- 대상: 요소 수가 적거나 DnD/키보드 내비게이션 안정성이 우선일 때
- 구현: `<Tree>` 직접 렌더
- 기준: `flattenedItems.length < 50` 또는 `elements.length < 100`

#### 모드 B: react-virtual 기반 가상화 (대규모)
- 대상: 100+ 요소에서 렌더링 성능 이슈가 명확할 때
- 구현: 기존 `VirtualizedLayerTree` 유지 또는 Tree 전환 이후 커스텀 가상화
- 주의:
  - Tree 가상화 시 **포커스/키보드 이동/드롭 타겟 계산**이 깨질 수 있음
  - 드래그 중 자동 확장 및 drop indicator 위치가 안정적인지 별도 검증 필요

#### 선택 기준 요약
- `elements.length >= 100` → 가상화 고려
- `DnD/접근성 안정성` 최우선일 때 → 비가상화 유지
- 실제 성능 문제 재현 시에만 가상화 활성화 (기본 OFF)

### 1.8 VirtualizedLayerTree 단계적 제거 플랜

**Phase A: 병행 운영 (현재)**
- `LayerTree` 기본 렌더 경로 유지
- `elements.length >= 100`일 때만 `VirtualizedLayerTree` 사용
- 목표: Tree 마이그레이션 안정화 + DnD/선택/확장 상태 회귀 확인

**Phase B: 성능 검증**
- 100+ 요소에서 `LayerTree` 성능 측정 (스크롤 FPS/입력 지연)
- 가상화 필요성 재평가 (실측 데이터 기반)
- 필요 시 `LayerTree` 가상화 전략 재검토

**Phase C: 제거 조건**
- `LayerTree` 성능이 기준 충족 시 `VirtualizedLayerTree` 제거
- `Layers.tsx` 가상화 분기 삭제
- 관련 유틸/스타일 정리 (가상화 전용 코드 제거)

**검증 체크리스트**
- DnD 동작 (same level / parent change) 안정성
- 키보드 네비게이션/포커스 유지
- expandedKeys/selection 동기화
- Collection 가상 자식 표시/선택

### 1.9 가상화 성능 측정 기준

**측정 시나리오**
- 요소 100/300/500개에서 트리 렌더링/스크롤/선택/드래그 테스트
- `elements.length >= 100`에서 `LayerTree`와 `VirtualizedLayerTree` 비교

**핵심 지표**
- 스크롤 FPS (목표: 55~60fps 유지)
- 클릭/선택 INP 지연 (목표: 200ms 이하)
- DnD 드래그 시 프레임 드랍 여부 (육안 + FPS)

**검증 체크리스트**
- 100+ 요소에서 스크롤 중 라벨/아이콘 깜빡임 없음
- 드래그 중 DropIndicator 위치 안정
- expandedKeys 변경 시 렌더링 지연 없음
- 선택 변경 시 inspector/iframe 동기화 지연 없음

---

## Phase 2: DnD 구현 (onMove 사용)

> **v1.14 API 기준**: `onMove`만 사용하여 모든 DnD 케이스 처리 권장
> - `onReorder`: 같은 레벨 순서 변경만 지원
> - `onMove`: 모든 이동 (순서 변경 + 부모 변경) 지원 ✅

### 2.0 DnD 처리 흐름 (현재 코드 기준)

1. **드롭 이벤트 정규화**: `keys`/`target` → `targetParentId`/`insertIndex` 계산
2. **유효성 검증**: self/descendant/body 이동 금지, root before/after 금지, 가상 자식 드롭 금지, page/layout 컨텍스트 불일치 금지
3. **업데이트 계산**: oldParent + newParent 형제 리스트 재구성 → `order_num` 재부여
4. **상태 반영**: `batchUpdateElements`로 `parent_id` + `order_num` 동시 업데이트
5. **히스토리 기록**: `type: 'move'`로 기존 HistoryEntry에 기록

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
      if (!target || target.type !== 'item') return;

      // 드롭 유효성 검증
      for (const key of keys) {
        const { valid } = isValidDrop(key as string, target.key as string, target.dropPosition, tree);
        if (!valid) return;
      }

      // 드롭 위치 계산 (insertIndex 포함)
      const updates = calculateMoveUpdates({
        tree,
        movedKeys: keys,
        targetKey: target.key,
        dropPosition: target.dropPosition,
      });

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

      // 3. Zustand + IndexedDB 동기화 (batchUpdateElements)
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

### 2.1.1 Tree 상태/Selection/DnD 연동 예시

```typescript
// LayerTree.tsx (controlled state 예시)
import { Tree } from 'react-aria-components';
import { useTreeExpandState } from '../../hooks/useTreeExpandState';

export function LayerTree({
  elements,
  selectedElementId,
  selectedTab,
  onItemClick,
  onItemDelete,
}: LayerTreeProps) {
  const { tree, syncToStore } = useLayerTreeData(elements);
  const { expandedKeys, toggleKey, collapseAll } = useTreeExpandState({
    selectedElementId,
    elements,
  });

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((key) => ({
      'application/x-layer-tree-item': JSON.stringify({ id: key }),
      'text/plain': tree.getItem(key)?.value.name || '',
    })),
    onMove(e) {
      const { keys, target } = e;
      if (!target || target.type !== 'item') return;
      for (const key of keys) {
        const { valid } = isValidDrop(key as string, target.key as string, target.dropPosition, tree);
        if (!valid) return;
      }
      const updates = calculateMoveUpdates({
        tree,
        movedKeys: keys,
        targetKey: target.key,
        dropPosition: target.dropPosition,
      });
      syncToStore(updates);
    },
  });

  return (
    <Tree
      aria-label="Layers"
      items={tree.items}
      selectionMode="single"
      selectedKeys={selectedElementId ? new Set([selectedElementId]) : new Set()}
      expandedKeys={expandedKeys}
      onExpandedChange={(keys) => {
        if (keys !== 'all') {
          // useTreeExpandState와 동기화 (키보드/포커스 확장용)
        }
      }}
      onSelectionChange={(keys) => {
        if (keys === 'all') return;
        const key = [...keys][0] as string;
        const node = tree.getItem(key)?.value;
        if (!node || node.virtualChildType) return;
        onItemClick(node.element);
      }}
      dragAndDropHooks={dragAndDropHooks}
    >
      {(node) => (
        <LayerTreeItem
          key={node.id}
          node={node}
          onDelete={onItemDelete}
          onToggleExpand={toggleKey}
          selectedTab={selectedTab}
        />
      )}
    </Tree>
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

  // 3-1. 가상 자식 드롭 불가 (Collection children)
  if (draggedNode.virtualChildType || targetNode.virtualChildType) {
    return { valid: false, reason: 'virtual-child' };
  }

  // 4. body는 이동 불가
  if (draggedNode.tag === 'body') {
    return { valid: false, reason: 'body-immutable' };
  }

  // 5. 루트 레벨로 이동 불가 (body 외)
  if (targetNode.depth === 0 && dropPosition !== 'on') {
    return { valid: false, reason: 'root-level-denied' };
  }

  // 6. 페이지/레이아웃 컨텍스트 불일치 방지
  const draggedElement = draggedNode.element;
  const targetElement = targetNode.element;
  if (
    draggedElement.page_id !== targetElement.page_id ||
    draggedElement.layout_id !== targetElement.layout_id
  ) {
    return { valid: false, reason: 'context-mismatch' };
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

### 2.2.1 DnD 유효성 규칙 요약

| 규칙 | 조건 | 이유 |
|------|------|------|
| Self drop 금지 | draggedId === targetId | 순환 방지 |
| Descendant drop 금지 | isDescendant(draggedId, targetId) | 트리 순환 방지 |
| Leaf 내부 drop 금지 | dropPosition === 'on' && target.isLeaf | leaf는 자식 불가 |
| Virtual child drop 금지 | dragged/target virtualChildType 존재 | 가상 자식은 선택 전용 |
| body 이동 금지 | dragged.tag === 'body' | root 안정성 |
| root before/after 금지 | target.depth === 0 && dropPosition !== 'on' | 트리 최상단 안정성 |
| 컨텍스트 불일치 금지 | page_id/layout_id 불일치 | 페이지/레이아웃 경계 유지 |

### 2.2.2 에러 UX 제안

- DropIndicator 숨김: 유효하지 않은 대상에서는 드롭 인디케이터 미표시
- 커서 피드백: invalid 대상에 `not-allowed` 커서 적용
- 경고 메시지 최소화: toast는 반복 스팸 방지를 위해 1회/세션 또는 디바운스
- 키보드 DnD 지원 시: invalid 조건은 `aria-live`로 간단 메시지 제공
- 개발 모드 로그: dev 환경에서만 reason 코드 출력 (prod는 무음)

### 2.3 기존 elementReorder.ts 연동

```typescript
// ✅ DnD에서는 reorderElements를 직접 사용하지 않고
//    oldParent + newParent 형제 리스트를 재구성하여 업데이트 계산
function calculateMoveUpdates({
  tree,
  movedKeys,
  targetKey,
  dropPosition,
}: {
  tree: TreeData<LayerTreeNode>;
  movedKeys: Set<Key>;
  targetKey: Key;
  dropPosition: 'before' | 'after' | 'on';
}): Array<{ id: string; parentId?: string | null; orderNum?: number }> {
  const movedIds = [...movedKeys].map((k) => String(k));
  const targetNode = tree.getItem(targetKey)?.value;
  if (!targetNode) return [];

  // newParentId 결정
  const newParentId =
    dropPosition === 'on' ? targetNode.id : targetNode.parentId ?? null;

  // oldParentIds 수집
  const oldParentIds = new Set<string | null>();
  movedIds.forEach((id) => {
    const node = tree.getItem(id)?.value;
    oldParentIds.add(node?.parentId ?? null);
  });

  // newParent + oldParent 모두 재정렬 대상
  const affectedParents = new Set<string | null>([...oldParentIds, newParentId]);

  const updates: Array<{ id: string; parentId?: string | null; orderNum?: number }> = [];

  affectedParents.forEach((parentId) => {
    // 현재 parentId 하위 형제들 수집
    const siblings = collectSiblings(tree, parentId);
    const filtered = siblings.filter((s) => !movedIds.includes(s.id));

    // dropPosition에 따라 삽입 index 계산
    const insertIndex = computeInsertIndex(filtered, targetKey, dropPosition, parentId);
    const next = parentId === newParentId
      ? insertAt(filtered, movedIds, insertIndex)
      : filtered;

    // 새 부모인 경우에만 movedIds 삽입
    const finalList = parentId === newParentId
      ? insertAt(filtered, movedIds, insertIndex)
      : filtered;

    finalList.forEach((id, index) => {
      const isMoved = movedIds.includes(id);
      updates.push({
        id,
        ...(isMoved && parentId === newParentId && { parentId: newParentId }),
        orderNum: index,
      });
    });
  });

  return updates;
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

### 3.3 가상 자식 선택/표시 규칙 (hover/selection/aria)

**선택 상태**
- 가상 자식은 Tree의 `selectedKeys`에서 제외
- 선택 하이라이트는 `selectedTab`(parentId + index)만 기준으로 적용
- 부모 TreeItem 선택과 가상 자식 선택이 **동시에 활성화되지 않도록** 시각적으로 분리

**Hover**
- hover는 일반 TreeItem과 동일한 스타일을 적용
- drag handle/expand 아이콘은 가상 자식에 표시하지 않음

**ARIA/접근성**
- 가상 자식은 `TreeItem`로 렌더하되 `aria-disabled="true"` 적용 (드롭/드래그 방지)
- `textValue`는 가상 자식의 label과 동일하게 지정
- 키보드 네비게이션 시 선택 동작은 커스텀 `onSelectTabElement`에서만 처리

**DnD**
- 가상 자식은 드래그 소스/드롭 타겟 모두 비활성화
- DropIndicator는 가상 자식 행에서는 숨김

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

### 6.1 배치 업데이트 경로 (현재 코드 기준)

> **권장 경로**: `batchUpdateElements` 액션 사용  
> 내부에서 **메모리 업데이트 → 인덱스 재구축 → IndexedDB 저장**을 처리합니다.

```typescript
// useLayerTreeData.ts
const syncToStore = useCallback((updates: ElementUpdate[]) => {
  batchUpdateElements(
    updates.map((u) => ({
      elementId: u.id,
      updates: {
        ...(u.parentId !== undefined && { parent_id: u.parentId }),
        ...(u.orderNum !== undefined && { order_num: u.orderNum }),
      },
    }))
  );
}, [batchUpdateElements]);
```

### 6.2 롤백 전략 (선택)

- `batchUpdateElements`는 내부에서 IndexedDB 오류를 로깅하고 메모리는 유지합니다.
- 실패 시 롤백이 필요하다면, **업데이트 전 스냅샷을 별도로 보관**한 후 재적용하는 방식으로 구성합니다.

### 6.3 Supabase 동기화 (선택적)

```typescript
// 기존 projectSync.ts 활용
// IndexedDB → Supabase 동기화는 별도 sync 레이어에서 자동 처리
// DnD 작업에서는 IndexedDB만 직접 업데이트
```

---

## Phase 7: 히스토리 & Undo/Redo

### 7.1 HistoryEntry (move 타입) 사용

```typescript
// history.ts의 기존 HistoryEntry 타입 활용
historyManager.addEntry({
  type: 'move',
  elementId: movedId,          // 대표 요소
  elementIds: movedIds,        // 다중 이동 시 사용
  data: {
    prevParentId,
    parentId,
    prevOrderNum,
    orderNum,
  },
});
```

### 7.2 Coalescing 규칙

```typescript
// 기존 HistoryEntry 기준으로 coalesce 적용
// (대표 elementId + 시간 기준으로 병합)
```

### 7.3 Undo/Redo 구현

```typescript
// historyActions.ts

function undoMove(entry: HistoryEntry) {
  // elementIds + prevParentId/prevOrderNum 기준으로 복원
  // batchUpdateElements 사용
}

function redoMove(entry: HistoryEntry) {
  // elementIds + parentId/orderNum 기준으로 재적용
  // batchUpdateElements 사용
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
