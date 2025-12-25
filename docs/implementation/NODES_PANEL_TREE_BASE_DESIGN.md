# Nodes Panel Tree Base Design (Panel System First)

> 작성일: 2025-12-25
> 상태: 구현 진행 중 (LayerTree DnD 완료)
> 기준 버전: react-aria-components v1.14
> 최종 검토: 2025-12-26

본 문서는 패널 시스템 기준으로 NodesPanel의 Page/Layer 트리를
react-aria Tree 기반의 공통 베이스로 통합하기 위한 설계서다.

---

## 배경/문제

- 좌측 UI가 Sidebar 기반이며, 패널 시스템과 기능이 중복되어 유지보수 리스크가 큼.
- Page/Layer 트리 렌더링이 커스텀 구조와 혼재되어 구조적 완성도가 떨어짐.
- Tree 컴포넌트를 도입했지만 도메인 규칙(DnD, 가상 자식, selection)이 분산됨.

---

## 목표

1. 패널 시스템을 단일 진입점으로 확정 (단일 오너십)
2. react-aria Tree 기반의 공통 Tree 베이스 구축
3. PageTree/LayerTree를 동일한 상태 모델과 DnD 계약으로 통합
4. Sidebar는 임시 어댑터 역할만 수행 (최종 제거 가능)

---

## 비범위

- WebGL 캔버스 자체 구현 변경
- 신규 기능/UX 추가 (동등성 유지 우선)

---

## 대상 구조

```
src/builder/panels/nodes/
  NodesPanel.tsx              # 데이터/초기화/조합 (단일 진입점)
  tree/
    TreeBase.tsx              # 공통 Tree 렌더러 (react-aria Tree)
    TreeItemContent.tsx       # 공통 아이템 UI (chevron, a11y)
    treeTypes.ts              # 공통 타입 정의
    helpers.ts                # treeHelpers 통합
    adapters/
      pageTreeAdapter.ts      # Page -> TreeNode 변환
      layerTreeAdapter.ts     # Element -> TreeNode 변환
    hooks/
      useTreeState.ts         # expanded/selection/virtual child 상태
      useTreeDnD.ts           # 공통 DnD 규약
      useTreeVirtual.ts       # 가상화 기준/렌더링
    LayerTree/                # 기존 LayerTree 로직 (점진적 흡수)
    PageTree/                 # 신규 PageTree (TreeBase 기반)
```

현재 LayerTree는 `src/builder/panels/nodes/tree/LayerTree`로 이동 완료.

---

## 공통 상태 모델

```
expandedKeys: Set<Key>
selectedKeys: Set<Key>         # 실제 노드만 포함
selectedVirtualChild?: {
  parentId: string
  index: number
  type: VirtualChildType
}
focusedKey?: Key
```

정책:
- virtual child는 selectedKeys에 포함하지 않고 별도 상태로 관리
- expandedKeys는 외부 제어 가능 (패널 시스템 주도)

---

## 공통 DnD 규약

### 공통 규칙
- 자기 자신/자식 노드로 drop 금지
- virtual child는 drop 대상 제외
- DropPosition: before/after/on

### DnD API (v1.14 기준)

| 메서드 | 시그니처 | 용도 |
|--------|----------|------|
| `moveBefore` | `tree.moveBefore(targetKey, keys)` | 대상 항목 이전으로 이동 |
| `moveAfter` | `tree.moveAfter(targetKey, keys)` | 대상 항목 이후로 이동 |
| `move` | `tree.move(key, parentKey, index)` | 특정 부모의 인덱스로 이동 |
| `onMove` | `useDragAndDrop({ onMove })` | 모든 이동 처리 (권장) |

> **권장**: `onReorder` 대신 `onMove`만 사용 (계층 간 이동 지원)

### LayerTree 규칙
- drag source: 실제 element 노드만
- **body 노드는 드래그 금지**
- body는 **drop target(on/inside) 허용**
  - body 자체 이동은 금지
  - body 자식들의 재정렬/이동은 허용
- 업데이트: `batchUpdateElements(parent_id, order_num)`

### PageTree 규칙
- drag source: 페이지 노드만
- drop target: 페이지 노드만
- 업데이트: pages reorder API + store update

### 에러 UX
- invalid drop: drop indicator 숨김 + 1회 경미한 안내
- drag 종료 시 invalid면 selection/hover 상태 복구

---

## PageTree 설계 상세

### 입력/데이터 모델
- 입력: `UnifiedPage[]` (id, title, slug, parent_id, order_num)
- 선택: `selectedPageId` (단일 선택)
- 확장: `expandedKeys` (외부 제어 가능)

### 어댑터 규칙 (Page -> TreeNode)
- `label`: `title || "Untitled"`
- `hasChildren`: 동일 parent_id를 가진 페이지 존재 여부
- `depth`: parent 기반 계산 (재귀)
- `parentId`: `parent_id ?? null`
- `orderNum`: `order_num ?? 0`
- `isRoot`: `parent_id === null && order_num === 0` (Home 기준)

### 표시 규칙
- 기본 라벨: page title
- slug 배지 표시: `slug` 존재 시 `page-url-badge` 사용
- Home 페이지는 삭제 버튼 비노출
- Tree 아이템 액션: Settings(옵션), Delete(비-root)

### 선택/동기화
- selection 변경 시 `fetchElements(page.id)` 호출
- selection은 실제 페이지 노드만 허용 (virtual 없음)
- page 삭제 후 남은 페이지 자동 선택 정책 유지

### DnD 규칙
- drag source: 페이지 노드만
- drop target: 페이지 노드만
- **Home(root) 페이지는 드래그 금지**
- drop on self/descendant 금지
- dropPosition 지원: before/after/on
- 이동 업데이트: memory state 먼저 적용 후 pages API 저장
  - 실패 시: 이전 상태 복구 or 오류 표시

### 에러/UX
- invalid drop: indicator 숨김 + 1회 안내
- drag 종료 후 invalid이면 selection 복구

---

## TreeBase 공통화 설계

### 책임
- react-aria Tree 기반 렌더링 표준화
- 공통 상태(expanded/selection)와 DnD 연결
- a11y 규칙(chevron button) 일괄 적용

### TreeBase API (안)
```tsx
type DropPosition = 'before' | 'after' | 'on';

type MovePayload<TNode> = {
  keys: Set<Key>;
  target: {
    key: Key;
    node: TNode;
    dropPosition: DropPosition;
  };
  // 계산된 업데이트 (호출자가 store/DB 동기화에 사용)
  updates: Array<{ id: string; parentId?: string | null; orderNum?: number }>;
};

type TreeBaseProps<TNode> = {
  items: TNode[];
  getKey: (node: TNode) => Key;
  getChildren: (node: TNode) => TNode[];
  renderContent: (node: TNode) => React.ReactNode;
  selectedKeys?: Set<Key>;
  expandedKeys?: Set<Key>;
  onSelectionChange?: (keys: Set<Key>) => void;
  onExpandedChange?: (keys: Set<Key>) => void;
  dnd?: {
    getDragItems: (keys: Set<Key>) => DragItem[];
    canDrop: (source: TNode, target: TNode, position: DropPosition) => boolean;
    onMove: (payload: MovePayload<TNode>) => void;
  };
  virtual?: {
    enabled: boolean;
    estimateSize: number;
    overscan: number;
  };
};
```

### 렌더링 전략
- 기본: TreeItem + Collection 재귀
- 가상화: flat list 렌더 + TreeItemContent 재사용
- DropIndicator는 공통 처리하되 invalid 시 숨김

### 스타일 계약
- `.element`, `.elementItem`, `.elementItemIndent`, `.elementItemActions`
- depth 기반 indent는 공통 계산 규칙 유지

---

## 가상화 전략

- 기본 임계값: 100개 이상이면 가상화
- 가상화 모드에서도 동일 DnD 규약 유지
- drop indicator는 overlay 방식으로 유지

### ⚠️ Virtualizer 호환성 (v1.14 기준)

> **주의**: react-aria Virtualizer는 Tree와의 직접 통합이 공식 지원되지 않음
> - 지원: ListBox, GridList, Table
> - **미지원: Tree**

**권장 방식**: `@tanstack/react-virtual` 사용
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: flatItems.length,
  getScrollElement: () => containerRef.current,
  estimateSize: () => 28,
  overscan: 5,
});
```

---

## 접근성 규칙 (react-aria)

### 필수 규칙
- 확장 가능한 노드는 `Button slot="chevron"` 필수
- aria-label 형식: `${Expand|Collapse} ${label}` (상태 반영)
- TreeItem role/keyboard 규칙 준수 (react-aria 기본)

### 키보드 네비게이션
- `ArrowUp/Down`: 이전/다음 항목 포커스
- `ArrowLeft`: 축소 또는 부모로 이동
- `ArrowRight`: 확장 또는 첫 번째 자식으로 이동
- `Enter/Space`: 선택
- `Home/End`: 첫/마지막 항목으로 이동

---

## treeHelpers 이관

- `src/builder/sidebar/treeHelpers.ts` -> `src/builder/panels/nodes/tree/helpers.ts`
- Sidebar/VirtualizedLayerTree는 임시로 새 helpers를 참조하도록 수정
- 최종적으로 Sidebar 제거 시 helpers는 단일 위치만 유지

---

## 마이그레이션 순서

1. ✅ TreeBase + helpers + adapters 확정
2. ⏳ PageTree를 TreeBase 기반으로 신규 구현
3. ✅ LayerTree를 TreeBase 위로 통합 (가상 자식/selection/DnD)
4. ⏳ Sidebar는 TreeBase 호출만 수행 후 단계적 제거

---

## 구현 현황 (2025-12-26)

### ✅ 완료

| 항목 | 위치 | 비고 |
|------|------|------|
| LayerTree DnD | `tree/LayerTree/LayerTree.tsx` | react-aria useDragAndDrop + onMove |
| DnD Validation | `tree/LayerTree/validation.ts` | isValidDrop (6가지 규칙) |
| Move 계산 로직 | `tree/LayerTree/useLayerTreeDnd.ts` | calculateMoveUpdates |
| Tree 데이터 구조 | `tree/LayerTree/useLayerTreeData.ts` | useTreeData 기반 |

### ⏳ 진행 예정

| 항목 | 우선순위 | 비고 |
|------|----------|------|
| PageTree 구현 | 높음 | TreeBase 기반 신규 구현 |
| TreeBase 공통화 | 중간 | LayerTree/PageTree 공통 로직 추출 |
| Sidebar 제거 | 낮음 | 기능 동등성 확인 후 |
| 가상화 통합 | 중간 | @tanstack/react-virtual 적용 |

---

## 완료 기준

- 패널 시스템 NodesPanel만 진입점으로 남음
- Page/Layer 모두 동일 Tree 베이스 사용
- selection/expanded/DnD 규약이 단일화됨
- Sidebar 제거 시에도 기능 동등성 유지

---

## 오픈 이슈

- ~~PageTree에서 root page reorder 제약 여부 (Home 고정 여부)~~ → ✅ 해결: Home 드래그 금지 (PageTree 설계 상세 참조)
- DnD 안내 UX 위치/표시 방식 표준화
- WebGL reorder와 Tree reorder 동기화 지연 허용 범위

---

## 참고 자료

> **기준**: react-aria-components v1.14 (2025년 12월)

- [React Aria Tree](https://react-aria.adobe.com/Tree) - Tree 컴포넌트 및 DnD 통합
- [React Aria Virtualizer](https://react-aria.adobe.com/Virtualizer) - 가상 스크롤링 (Tree 미지원)
- [React Aria DnD](https://react-aria.adobe.com/dnd) - useDragAndDrop, onMove/onReorder
- [useTreeData – React Stately](https://react-spectrum.adobe.com/react-stately/useTreeData.html) - moveBefore/moveAfter/move 메서드
- [@tanstack/react-virtual](https://tanstack.com/virtual/latest) - Tree 가상화 권장 라이브러리
