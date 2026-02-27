# ADR-005: Full-Tree WASM Layout (단일 Taffy 호출 레이아웃 최적화)

**Status:** Proposed
**Date:** 2026-02-27
**Decision Makers:** XStudio Team

## Context

현재 레이아웃 엔진은 **레벨별 독립 호출** 패턴으로 동작한다:

```
Page (body)
  └─ calculateChildrenLayout(body, [A, B])        ← WASM call set #1
       ├─ A (flex container)
       │   └─ calculateChildrenLayout(A, [C, D])  ← WASM call set #2
       │       └─ D (flex container)
       │           └─ calculateChildrenLayout(D, [E, F]) ← WASM call set #3
       └─ B (grid container)
           └─ calculateChildrenLayout(B, [G, H])  ← WASM call set #4
```

각 `calculateChildrenLayout()` 호출마다:
1. `create_node()` × N children (N회 WASM 경계 횡단)
2. `create_node_with_children()` × 1
3. `compute_layout()` × 1
4. `get_layouts_batch()` × 1
5. `clear()` × 1

**총 WASM 호출**: 요소 100개, 레벨 5개 기준 → ~110회

### 핵심 문제: Cross-Level 레이아웃 최적화 불가

Figma와 같은 디자인 도구는 전체 요소 트리를 **한 번의 레이아웃 엔진 호출**로 계산한다. 현재 XStudio는 레벨별 독립 계산으로 인해:

1. **Intrinsic size 전파 단절**: 자식 D의 크기가 손자 E, F에 의존하지만, A의 레이아웃 계산 시 D의 최종 크기를 알 수 없음
2. **2-pass 보정 비용**: `TaffyFlexEngine`이 inline-block 자식의 텍스트 wrap 높이를 교정하기 위해 2-pass 레이아웃을 수행하지만, 이는 한 레벨에서만 동작
3. **중복 enrichment**: 각 레벨에서 `enrichWithIntrinsicSize()`를 독립적으로 호출하여, 트리 깊이에 비례한 중복 계산 발생
4. **WASM 경계 오버헤드**: JSON 직렬화/역직렬화, WASM boundary crossing이 레벨 수 × 요소 수만큼 반복

### Taffy의 네이티브 전체 트리 지원

Rust의 `TaffyTree`는 이미 전체 트리 레이아웃을 **네이티브로 지원**한다:

```rust
// 현재 Rust 코드 (taffy_bridge.rs)
pub struct TaffyLayoutEngine {
    tree: TaffyTree<()>,       // ← 전체 트리 지원
    nodes: Vec<Option<NodeId>>,
    free_list: Vec<usize>,
}

// compute_layout()은 루트에서 재귀적으로 전체 트리를 계산
pub fn compute_layout(&mut self, handle: usize, ...) {
    self.tree.compute_layout(node_id, available).expect("...");
}
```

문제는 TypeScript 측에서 레벨별로 분리 호출하는 패턴에 있다.

## Decision

**전체 요소 트리를 단일 WASM 호출로 Taffy에 전달**하여 레이아웃을 계산한다.

### Phase 1: `build_tree_batch` Rust API 추가

```rust
// taffy_bridge.rs 추가

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BatchNodeInput {
    style: StyleInput,
    /// batch 배열 내 자식 노드 인덱스 (topological order: 리프 먼저)
    children: Vec<usize>,
}

#[wasm_bindgen]
impl TaffyLayoutEngine {
    /// 전체 트리를 한 번에 빌드.
    ///
    /// 입력: JSON 배열 (topological order — 리프 먼저, 루트 마지막)
    /// 반환: 각 노드의 handle (입력 인덱스와 1:1 대응)
    ///
    /// 기존 개별 create_node() 호출 대비:
    /// - WASM 경계 횡단: N회 → 1회
    /// - JSON 파싱: N회 → 1회
    /// - Vec 할당: N회 → 1회 (사전 capacity 할당)
    pub fn build_tree_batch(&mut self, nodes_json: &str) -> Box<[usize]> {
        let nodes: Vec<BatchNodeInput> =
            serde_json::from_str(nodes_json).unwrap_or_default();
        let mut handles = Vec::with_capacity(nodes.len());

        for node in &nodes {
            let style = convert_style(&node.style);
            let child_ids: Vec<NodeId> = node.children
                .iter()
                .filter_map(|&idx| {
                    handles.get(idx).and_then(|&h| self.resolve(h))
                })
                .collect();

            let node_id = if child_ids.is_empty() {
                self.tree.new_leaf(style).unwrap()
            } else {
                self.tree.new_with_children(style, &child_ids).unwrap()
            };
            handles.push(self.alloc_handle(node_id));
        }

        handles.into_boxed_slice()
    }
}
```

### Phase 2: TypeScript `calculateFullTreeLayout()` 함수

```typescript
// engines/fullTreeLayout.ts (신규)

interface BatchNode {
  style: TaffyStyle;
  children: number[];  // batch 내 인덱스 참조
  elementId: string;
}

/**
 * 전체 요소 트리를 단일 WASM 호출로 레이아웃 계산.
 *
 * 기존 calculateChildrenLayout()의 레벨별 호출을 대체하여:
 * - WASM 경계 횡단: ~110회 → 3회 (build_tree_batch + compute_layout + get_layouts_batch)
 * - Cross-level flex-grow/shrink 전파: Taffy 네이티브 처리
 * - Intrinsic size: 사전 계산 후 트리에 주입
 */
export function calculateFullTreeLayout(
  rootElement: Element,
  elementsMap: Map<string, Element>,
  childrenMap: Map<string, string[]>,
  availableWidth: number,
  availableHeight: number,
): Map<string, LayoutResult> | null {
  const taffy = getTaffyInstance();
  if (!taffy) return null; // Dropflow fallback으로 위임

  const batch: BatchNode[] = [];
  const elementIdToIndex = new Map<string, number>();

  // DFS post-order: 리프 먼저, 루트 마지막
  function traverse(
    elementId: string,
    parentComputedStyle: ComputedStyle,
    parentAvailableWidth: number,
    parentAvailableHeight: number,
  ) {
    const element = elementsMap.get(elementId);
    if (!element) return;

    const rawStyle = element.props?.style as Record<string, unknown> | undefined;
    const computedStyle = resolveStyle(rawStyle, parentComputedStyle);
    const display = rawStyle?.display as string | undefined;

    const childIds = childrenMap.get(elementId) ?? [];
    const childIndices: number[] = [];

    // 자식 먼저 순회 (post-order)
    for (const childId of childIds) {
      traverse(childId, computedStyle, parentAvailableWidth, parentAvailableHeight);
      const idx = elementIdToIndex.get(childId);
      if (idx !== undefined) childIndices.push(idx);
    }

    // Intrinsic size 사전 계산 (텍스트/inline-block 리프)
    const childElements = childIds
      .map(id => elementsMap.get(id))
      .filter(Boolean) as Element[];
    const enriched = enrichWithIntrinsicSize(
      element, parentAvailableWidth, parentAvailableHeight,
      computedStyle, childElements,
    );

    // 통합 TaffyStyle 변환 (flex/grid/block 모두 Taffy가 처리)
    const taffyStyle = elementToUnifiedTaffyStyle(enriched, computedStyle, display);

    // CSS blockification (flex/grid 컨테이너의 자식)
    // → 자식의 inner display type 변환은 traverse 시 자동 적용

    const index = batch.length;
    batch.push({ style: taffyStyle, children: childIndices, elementId });
    elementIdToIndex.set(elementId, index);
  }

  traverse(rootElement.id, ROOT_COMPUTED_STYLE, availableWidth, availableHeight);

  try {
    // ★ 3회 WASM 호출로 전체 트리 레이아웃 완성
    const handles = taffy.buildTreeBatch(JSON.stringify(batch));
    const rootHandle = handles[handles.length - 1];
    taffy.computeLayout(rootHandle, availableWidth, availableHeight);
    return taffy.getLayoutsBatch(Array.from(handles));
  } finally {
    taffy.clear();
  }
}
```

### Phase 3: BuilderCanvas 통합

```typescript
// BuilderCanvas.tsx 변경

function ElementsLayer({ pageId, ... }) {
  // 기존: 레벨별 renderWithCustomEngine → calculateChildrenLayout
  // 변경: 페이지 단위 전체 트리 레이아웃
  const layoutMap = useMemo(() => {
    return calculateFullTreeLayout(
      pageRoot, elementsMap, childrenMap,
      pageWidth, pageHeight,
    );
  }, [pageRoot, elementsMap, childrenMap, pageWidth, pageHeight]);

  // layoutMap이 null이면 기존 레벨별 방식으로 폴백
  if (!layoutMap) {
    return <LegacyElementsLayer ... />;
  }

  return <FullTreeElementsLayer layoutMap={layoutMap} ... />;
}

// FullTreeElementsLayer: layoutMap에서 O(1) 조회
function renderElementTree(element: Element, layoutMap: Map<string, LayoutResult>) {
  const layout = layoutMap.get(element.id);
  if (!layout) return null;

  return (
    <DirectContainer
      elementId={element.id}
      x={layout.x} y={layout.y}
      width={layout.width} height={layout.height}
    >
      <ElementSprite element={element} ... />
      {childrenMap.get(element.id)?.map(childId => {
        const child = elementsMap.get(childId);
        return child ? renderElementTree(child, layoutMap) : null;
      })}
    </DirectContainer>
  );
}
```

## Alternatives Considered

### Option A: WASM → JS 콜백 (MeasureFunc)

Taffy의 `MeasureFunc`를 활용하여 리프 노드의 intrinsic size를 WASM에서 JS로 콜백하여 측정.

```rust
tree.new_leaf_with_measure(style, MeasureFunc::Raw(|known, available, ..| {
    // WASM → JS 콜백으로 텍스트 크기 측정
    Size { width: ..., height: ... }
}));
```

**장점:** Cross-level intrinsic size가 완벽하게 해결됨
**단점:** WASM→JS 콜백 오버헤드가 큼 (텍스트 노드당 1회). wasm-bindgen closure 관리 복잡.
**결론:** 현재 단계에서는 오버헤드 대비 이점이 불분명. Phase 2 이후 측정 필요 시 도입 검토.

### Option B: Web Worker 비동기 레이아웃

전체 트리를 Web Worker로 전송하여 메인 스레드 블로킹 없이 레이아웃 계산.

**장점:** 메인 스레드 60fps 보장
**단점:** Worker ↔ Main 직렬화 비용, 비동기 결과 동기화 복잡성
**결론:** 요소 수 1,000개 이상에서 의미 있는 최적화. Phase 3 이후 측정 기반 결정.

### Option C: Incremental Layout (부분 트리 갱신)

변경된 서브트리만 재계산하는 증분 레이아웃.

**장점:** 드래그 중 최소 계산
**단점:** Taffy API가 증분 갱신을 제한적으로 지원. 변경 감지 로직 복잡.
**결론:** Full-tree 적용 후 프로파일링 결과에 따라 Phase 4에서 검토.

## Rationale

### 핵심 이유: Taffy의 네이티브 재귀 레이아웃 활용

현재 Taffy가 **이미 지원하는** 기능을 TypeScript 레벨에서 수동 분리하고 있다:

```
현재 (TS가 트리를 분해 → 레벨별 Taffy 호출):
  TS: 트리 순회 → 레벨 A 추출 → Taffy(A) → 결과
  TS: 트리 순회 → 레벨 B 추출 → Taffy(B) → 결과
  TS: 트리 순회 → 레벨 C 추출 → Taffy(C) → 결과

제안 (TS가 트리를 그대로 전달 → Taffy가 전체 계산):
  TS: 트리 직렬화 → Taffy(전체 트리) → 전체 결과
```

Taffy의 `compute_layout()`은 내부적으로 DFS 재귀 순회하며 모든 노드의 레이아웃을 한 번에 계산한다. 이를 활용하면:

1. **WASM 호출 ~110회 → 3회** (build + compute + get)
2. **Cross-level flex-grow/shrink** 자동 전파
3. **JSON 직렬화**: 노드별 → 배치 1회
4. **메모리 할당**: 레벨별 clear/재할당 → 1회 할당

### 성능 예상치

| 항목 | 현재 (Level-by-Level) | 제안 (Full-Tree) | 개선 |
|------|----------------------|-----------------|------|
| WASM 경계 횡단 (100 요소) | ~110회 | 3회 | **97% 감소** |
| compute_layout 호출 | ~5회 (레벨당) | 1회 | **80% 감소** |
| JSON 직렬화 | ~100회 (노드별) | 1회 (배치) | **99% 감소** |
| Cross-level 최적화 | 불가 | Taffy 네이티브 | **신규** |
| 2-pass 보정 | 레벨별 독립 | 전체 트리 1회 | **레벨 수 비례 감소** |

### 리스크 및 완화 전략

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Block layout (Dropflow) 호환 | Taffy의 Block 모드가 Dropflow의 고급 기능(margin collapse, float) 미지원 가능 | Block 서브트리는 Dropflow로 사전 계산 → 결과를 고정 크기 리프로 Taffy에 주입 |
| Intrinsic size 정확도 | 사전 계산 시 부모 available space 추정 필요 | 기존 enrichment 로직 유지 + 부정확 시 2-pass 보정 |
| 대규모 JSON 직렬화 | 요소 1,000개 이상에서 JSON 크기 증가 | 프로파일링 후 필요 시 바이너리 프로토콜(SharedArrayBuffer) 전환 |
| 기존 코드와의 호환 | calculateChildrenLayout API 변경 범위 | 기존 API 유지 + 새 API 병행 (feature flag로 전환) |

## Migration Strategy

### Phase 1: Rust API 추가 (비파괴적)

```
wasm/src/taffy_bridge.rs에 build_tree_batch() 추가
wasm-bindings/taffyLayout.ts에 buildTreeBatch() 래퍼 추가
WASM 재빌드 + 기존 API 변경 없음
```

### Phase 2: TypeScript 통합 (Feature Flag)

```
engines/fullTreeLayout.ts 신규 파일 생성
BuilderCanvas.tsx에서 feature flag로 분기:
  - useFullTreeLayout = true  → calculateFullTreeLayout()
  - useFullTreeLayout = false → 기존 calculateChildrenLayout() (폴백)
```

### Phase 3: Block Layout 통합

```
Dropflow Block 서브트리 → Taffy Block 모드 전환 가능성 검증
또는 Dropflow 사전 계산 결과를 고정 크기 리프로 주입하는 하이브리드 방식
```

### Phase 4: 성능 측정 및 최적화

```
프로파일링: 요소 50개, 200개, 1,000개 시나리오
병목 분석: JSON 직렬화 vs WASM 계산 vs React 리렌더
필요 시: SharedArrayBuffer 바이너리 프로토콜, Web Worker, 증분 레이아웃
```

## Consequences

### Positive

- **WASM 호출 97% 감소**: 레이아웃 계산 전체 시간 단축
- **Cross-level 레이아웃 정확성**: Taffy 네이티브 재귀로 flex-grow/shrink 전파
- **코드 단순화**: 레벨별 분리/재조합 로직 제거
- **Figma 수준 아키텍처**: 업계 표준 패턴 채택

### Negative

- **Rust WASM 빌드 필요**: `build_tree_batch` API 추가 시 WASM 재빌드
- **Block layout 호환**: Dropflow ↔ Taffy Block 모드 간 동작 차이 검증 필요
- **Intrinsic size 사전 계산**: 텍스트 측정의 정확도가 부모 available space 추정에 의존
- **마이그레이션 기간**: Feature flag 병행 운영 동안 두 경로 모두 유지보수

## Data Flow Comparison

### 현재 (Level-by-Level)

```
ElementsLayer 렌더
  └─ createContainerChildRenderer(body, w, h)
       └─ calculateChildrenLayout(body, children, w, h)    ← WASM set #1
            ├─ enrichWithIntrinsicSize(childA)
            ├─ TaffyFlexEngine: create_node × N + compute + get
            └─ taffy.clear()
       └─ children.map(child =>
            <DirectContainer x={layout.x} y={layout.y}>
              <ElementSprite>
                └─ createContainerChildRenderer(child, cw, ch)
                     └─ calculateChildrenLayout(child, ...) ← WASM set #2
                          ├─ enrichWithIntrinsicSize(...)
                          ├─ TaffyFlexEngine: create_node × M + compute + get
                          └─ taffy.clear()
              </ElementSprite>
            </DirectContainer>
          )
```

### 제안 (Full-Tree)

```
ElementsLayer 렌더
  └─ calculateFullTreeLayout(pageRoot, elementsMap, childrenMap, w, h)
       ├─ DFS post-order traverse:
       │    ├─ enrichWithIntrinsicSize(리프 노드들)
       │    └─ batch[] 구성 (topological order)
       ├─ taffy.buildTreeBatch(JSON.stringify(batch))       ← WASM #1
       ├─ taffy.computeLayout(rootHandle, w, h)             ← WASM #2
       ├─ taffy.getLayoutsBatch(allHandles)                 ← WASM #3
       └─ taffy.clear()
  └─ renderElementTree(root, layoutMap)
       └─ children.map(child =>
            <DirectContainer x={layoutMap[child.id].x} y={layoutMap[child.id].y}>
              <ElementSprite ... />
              {renderElementTree(child, layoutMap)}  ← 재귀 (WASM 호출 없음)
            </DirectContainer>
          )
```

## References

- [ADR-003: Canvas Rendering](003-canvas-rendering.md) — CanvasKit/Skia + PixiJS 이중 렌더러
- [ENGINE.md](../ENGINE.md) — Taffy + Dropflow 레이아웃 엔진 전략
- [WASM.md](../WASM.md) — WASM 아키텍처 상세
- `apps/builder/src/.../wasm/src/taffy_bridge.rs` — Rust Taffy 바인딩
- `apps/builder/src/.../wasm-bindings/taffyLayout.ts` — TypeScript Taffy 래퍼
- `apps/builder/src/.../layout/engines/index.ts` — 레이아웃 엔진 디스패처
- `apps/builder/src/.../layout/engines/TaffyFlexEngine.ts` — Flex 레이아웃 엔진
- `apps/builder/src/.../layout/engines/BaseTaffyEngine.ts` — Taffy 공통 추상 클래스
- [Taffy Documentation](https://github.com/DioxusLabs/taffy) — Taffy Rust layout engine
