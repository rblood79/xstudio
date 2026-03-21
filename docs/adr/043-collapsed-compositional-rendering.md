# ADR-043: Collapsed Compositional Rendering — Compositional 컴포넌트 단일 렌더링 최적화

## Status

Proposed

## Date

2026-03-21

## Decision Makers

XStudio Team

## Related ADRs

- [ADR-006](completed/006-child-composition-remaining.md): Child Composition Pattern
- [ADR-009](009-full-tree-wasm-layout.md): Figma-Class Rendering & Layout
- [ADR-012](012-rendering-layout-pipeline-hardening.md): 렌더링/레이아웃 파이프라인 하드닝
- [ADR-036](completed/036-spec-first-single-source.md): Spec-First Single Source
- [ADR-042](042-spec-dimension-injection.md): Spec Container Dimension Injection

---

## Context

### 문제: Compositional 컴포넌트의 과도한 렌더링 오버헤드

ADR-006에서 react-aria-components 패턴으로 마이그레이션한 compositional 컴포넌트(Select, ComboBox, TextField 등)는 Store에 부모+자식 Element 트리로 저장된다:

```
Select (parent)
├── Label
├── SelectTrigger
│   ├── SelectValue
│   └── SelectIcon
└── FieldError
```

현재 WebGL/Skia 캔버스에서 각 자식 Element가 **독립적으로** 렌더링된다:

- **6개 ElementSprite** React 컴포넌트 마운트 + useMemo 실행
- **6개 useSkiaNode** 레지스트리 등록
- **6+ canvas.save/restore** 쌍 (spec shapes 내부 children 포함)
- **6개 canvas.translate** 호출
- **6개 CMD_ELEMENT_BEGIN/END** 커맨드 스트림 엔트리

사용자는 편집 진입 전까지 compositional 컴포넌트를 **단일 단위**로 인식하며, 내부 자식을 개별 조작하지 않는다. 그러나 렌더링은 이미 완전 분해(fully expanded) 상태로 동작한다.

### 현재 렌더링 파이프라인 분석

```
ElementSprite (×N) → useMemo(specShapesToSkia) → useSkiaNode(registry)
                                                        ↓
buildRenderCommandStream (DFS) → CMD_ELEMENT_BEGIN → CMD_DRAW → CMD_CHILDREN_BEGIN
                                                                    ↓ (재귀)
                                                              자식 visitElement (×N)
                                                                    ↓
executeRenderCommands (선형) → canvas.save/translate/restore (×N)
```

**페이지에 compositional 컴포넌트 20개** (평균 자식 4개): 총 **100개** ElementSprite, **100개** save/restore 쌍.

### 기존 기반 메커니즘

1. **`_hasChildren` 패턴**: Select/ComboBox 등의 Spec `render.shapes()`에 이미 `_hasChildren === false`일 때 전체를 단일 Spec으로 렌더링하는 fallback 경로 존재 (`Select.spec.ts:306`)

2. **`editingContextId` 메커니즘**: 더블클릭 → `enterEditingContext(elementId)` → 자식 선택 가능. 계층적 선택 모델 구현 완료 (`selection.ts:142`)

3. **Command Stream 캐싱**: `registryVersion + layoutVersion + pagePosVersion` 기반 3중 키 캐시 (`renderCommands.ts:197`)

4. **AABB Culling**: `executeRenderCommands`에서 뷰포트 밖 요소 자동 스킵 (`renderCommands.ts:601-616`)

---

## Decision

### Collapsed/Expanded 2모드 렌더링 도입

Compositional 컴포넌트를 **기본적으로 Collapsed 모드**로 렌더링하고, 더블클릭 편집 진입 시에만 **Expanded 모드**로 전환한다.

|                      | Collapsed (기본)             | Expanded (더블클릭 후) |
| -------------------- | ---------------------------- | ---------------------- |
| **ElementSprite**    | 부모 1개만                   | 기존대로 개별 마운트   |
| **SkiaNodeData**     | 부모가 자식 shapes 병합 생성 | 각자 개별 생성         |
| **useSkiaNode 등록** | 1개                          | N개                    |
| **Command Stream**   | 자식 재귀 스킵               | 기존대로 DFS           |
| **Hit Testing**      | 부모 영역만                  | 개별 자식              |
| **선택**             | 부모만 선택 가능             | 자식 개별 선택 가능    |

### 구현 레벨: Command Stream + ElementSprite 하이브리드 (Option C+B)

검토한 4가지 접근:

| Option | 방식                       | 판정      | 이유                                                    |
| ------ | -------------------------- | --------- | ------------------------------------------------------- |
| **A**  | Composite Spec (메가 Spec) | 기각      | 자식별 독립 Spec 구조 파괴, Spec은 layout 위치 모름     |
| **B**  | SkiaNodeData 병합          | 부분 채택 | 부모가 자식 SkiaNodeData 병합 → React 오버헤드 제거     |
| **C**  | Command Stream 배칭        | 채택      | DFS 자식 재귀 스킵 → save/restore/translate 제거        |
| **D**  | Offscreen Surface Blit     | 기각      | GPU 메모리 할당, sub-pixel 품질 저하, AABB culling 불가 |

**최종 결정**: B+C 하이브리드 — 부모 ElementSprite가 자식 shapes를 병합 생성(B)하고, Command Stream이 자식 재귀를 스킵(C)한다.

### 대상 컴포넌트 (COMPOSITIONAL_PARENT_TAGS)

고정 자식 구조를 가진 컴포넌트만 대상. 사용자가 자유롭게 자식 추가/삭제하는 컨테이너는 제외:

**포함 (23개)**:

```
Select, ComboBox, TextField, TextArea, NumberField, SearchField,
DateField, TimeField, ColorField, Checkbox, Radio, Switch,
DatePicker, DateRangePicker, Slider, ProgressBar, Meter, StatusLight,
CheckboxGroup, RadioGroup, TagGroup, ColorSlider, ColorArea
```

**제외**: Card, Panel, Form, Group, Table, GridList, Tree, Disclosure, DisclosureGroup, Toolbar (사용자 자식 편집 가능)

---

## Implementation Plan

### Phase 1: Collapsed SkiaNodeData Builder (핵심 엔진)

**목표**: 부모 Element가 자식 트리 전체의 SkiaNodeData를 단일 노드로 병합 생성

**새 파일**: `apps/builder/src/builder/workspace/canvas/skia/collapsedComponentRenderer.ts`

```typescript
export function buildCollapsedSkiaNodeData(
  parentElement: Element,
  childrenMap: Map<string, Element[]>,
  elementsMap: Map<string, Element>,
  layoutMap: Map<string, ComputedLayout>,
  skiaTheme: "light" | "dark",
  tintPreset: TintPreset | null,
): SkiaNodeData;
```

**동작 흐름**:

1. 부모 Element의 Spec → `render.shapes()` → `specShapesToSkia()` 로 부모 SkiaNodeData 생성
2. `childrenMap`에서 자식 목록 조회
3. 각 자식에 대해:
   - `elementsMap`에서 최신 props 조회
   - Size delegation 처리 (부모 `size` → 자식 주입)
   - `getSpecForTag(child.tag)` → `render.shapes()` → `specShapesToSkia()`
   - `layoutMap`에서 부모 기준 상대 좌표(x, y) 획득
   - 자식 SkiaNodeData에 layout 오프셋 적용
4. 모든 자식 SkiaNodeData를 부모의 `children` 배열에 병합
5. `collapsedChildren: true` 플래그 설정

**주요 과제**:

- **Prop injection 로직 공유**: `ElementsLayer.createContainerChildRenderer`의 prop 주입(size delegation, variant 상속 등)을 공유 유틸로 추출
- **`fullTreeLayoutMap` 접근**: layout은 렌더링 전에 이미 계산 완료 — `getPublishedLayoutMap(pageId)`으로 접근

**수정 파일**:

| 파일                                   | 변경 내용                                       |
| -------------------------------------- | ----------------------------------------------- |
| `collapsedComponentRenderer.ts` (신규) | 핵심 병합 로직                                  |
| `ElementSprite.tsx`                    | collapsed/expanded 분기 추가                    |
| `nodeRenderers.ts` 타입                | `SkiaNodeData.collapsedChildren?: boolean` 추가 |

### Phase 2: Command Stream 최적화

**목표**: Collapsed 컴포넌트의 자식 DFS 재귀 제거

**수정**: `renderCommands.ts` → `visitElement()`

```typescript
// visitElement 내부 — collapsedChildren 플래그 체크
const skiaData = getSkiaNode(elementId);

// ... (기존 ELEMENT_BEGIN, DRAW 커맨드 발행) ...

// 외부 자식 재귀 분기
if (skiaData?.collapsedChildren) {
  // 자식 shapes는 이미 skiaData.children에 병합됨
  // childrenMap 재귀 스킵 → CMD_CHILDREN_BEGIN/END 미발행
} else {
  // 기존 로직: 외부 자식 재귀
  const childElements = childrenMap.get(elementId);
  if (childElements && childElements.length > 0) {
    // CMD_CHILDREN_BEGIN → 재귀 visitElement → CMD_CHILDREN_END
  }
}
```

**효과**: compositional 컴포넌트당 (N-1)개 `canvas.save()/restore()/translate()` 제거

### Phase 3: Selection Store 연동 (Enter/Exit)

**목표**: 더블클릭으로 Expanded 모드 진입, 클릭 외부/Escape로 Collapsed 복귀

**수정**: `stores/selection.ts`

- **새 상태**: `expandedCompositionalIds: Set<string>`
- **`enterEditingContext` 수정**: `expandedCompositionalIds`에 추가
- **`exitEditingContext` 수정**: `expandedCompositionalIds`에서 제거
- **셀렉터**: `isCompositionalExpanded(elementId): boolean`

기존 `editingContextId` 메커니즘과 자연스럽게 통합:

```
클릭 → 부모 선택 (collapsed 유지)
더블클릭 → enterEditingContext → expanded 전환 → 자식 선택 가능
Escape / 외부 클릭 → exitEditingContext → collapsed 복귀
```

### Phase 4: ElementsLayer 최적화

**목표**: Collapsed 시 자식 React 컴포넌트 마운트 스킵

**수정**: `components/ElementsLayer.tsx` → `renderTree()`

```typescript
if (COMPOSITIONAL_PARENT_TAGS.has(element.tag) && !isExpanded(element.id)) {
  // Collapsed: 자식 DirectContainer + ElementSprite 마운트 스킵
  // 부모의 단일 ElementSprite만 렌더
  return <ElementSprite key={element.id} ... />;
} else {
  // Expanded: 기존대로 자식 개별 렌더
  return renderExistingTree(element);
}
```

**효과**: compositional 컴포넌트당 (N-1)개 React 컴포넌트 인스턴스 절감

### Phase 5: 캐시 무효화 및 Props 동기화

**목표**: 자식 props 변경 시 collapsed 렌더링 자동 갱신

**수정**: `ElementSprite.tsx` — collapsed `useMemo`에 자식 props 의존성 추가

```typescript
const childPropsSignature = useStore(
  useCallback((state) => {
    if (!isCollapsed) return "";
    return hashDescendantProps(elementId, state.childrenMap, state.elementsMap);
  }, [elementId, isCollapsed]),
);

const skiaNodeData = useMemo(() => {
  if (isCollapsed) {
    return buildCollapsedSkiaNodeData(parentElement, ...);
  }
  // 기존 개별 렌더링 경로
  return buildIndividualSkiaNodeData(...);
}, [/* 기존 deps */, childPropsSignature]);
```

### Phase 6: 시각 검증 및 성능 측정

**검증 항목**:

- [ ] Collapsed ↔ Expanded 전환 시 pixel-identical 렌더링
- [ ] 모든 COMPOSITIONAL_PARENT_TAGS 23개 컴포넌트 시각 정합성
- [ ] Dark mode, Tint color 변경 시 정상 갱신
- [ ] Size/Variant props 변경 시 collapsed 갱신
- [ ] 부모 선택 → 더블클릭 진입 → 자식 선택 → Escape 퇴장 워크플로우

**성능 벤치마크** (20개 compositional 컴포넌트, 평균 4자식):

| 지표                         | Before    | After (Collapsed) | 절감     |
| ---------------------------- | --------- | ----------------- | -------- |
| React ElementSprite 인스턴스 | ~100      | ~20               | **80%**  |
| useSkiaNode 레지스트리 호출  | ~100      | ~20               | **80%**  |
| canvas.save/restore 쌍       | ~100+     | ~20+              | **~80%** |
| canvas.translate 호출        | ~100      | ~20               | **80%**  |
| Command Stream 크기          | ~600 cmds | ~120 cmds         | **80%**  |

---

## Consequences

### 긍정적

1. **GPU draw call 대폭 감소**: save/restore/translate 횟수 ~80% 절감 → FPS 개선
2. **React reconciliation 비용 절감**: ElementSprite 인스턴스 수 ~80% 감소
3. **Command Stream 경량화**: 캐시 메모리 사용량 감소, 선형 순회 속도 향상
4. **기존 UX 보존**: 더블클릭 진입/나오기가 이미 구현되어 있어 사용자 경험 변화 없음

### 부정적

1. **Collapsed 모드에서 개별 자식 hover 불가**: 전체 컴포넌트 단위 hover만 → 편집 진입 전까지 세밀한 인터랙션 없음
2. **Prop injection 로직 이중화 리스크**: ElementsLayer의 기존 로직과 collapsedComponentRenderer의 로직 분기 → 공유 유틸 추출로 완화
3. **자식 props 변경 감지 오버헤드**: `childPropsSignature` 셀렉터가 매 store 업데이트마다 실행 → shallow 비교 + 해시 캐싱으로 완화
4. **2가지 렌더링 경로 유지보수**: collapsed/expanded 양쪽 경로의 시각 정합성 지속 검증 필요

### Risk-First 분석

| 리스크                             | 심각도 | 확률   | 완화 전략                                             |
| ---------------------------------- | ------ | ------ | ----------------------------------------------------- |
| 시각 불일치 (Collapsed ≠ Expanded) | High   | Low    | 동일 `specShapesToSkia` 변환기 사용, 시각 회귀 테스트 |
| Stale child props in collapsed     | Medium | Medium | `childPropsSignature` 셀렉터로 자동 감지              |
| Layout 타이밍 (자식 위치 미계산)   | Medium | Low    | `fullTreeLayoutMap`은 렌더 전 useMemo에서 계산 완료   |
| Prop injection 분기 불일치         | High   | Medium | 공유 유틸 추출, 단위 테스트                           |
| 컴포넌트 상태 hover/pressed        | Low    | High   | Collapsed에서 전체 단위 hover 수용 (설계 의도)        |

---

## Alternatives Considered

### A. Offscreen Surface Blitting

각 compositional 컴포넌트를 offscreen CanvasKit Surface에 렌더링 후 단일 이미지로 blit.

**기각 이유**: GPU 메모리 할당(Surface당), sub-pixel 텍스트 품질 손실, AABB culling 불가, DPR 변경 시 재생성 필요.

### B. Spec-Level Composite Shapes

부모 Spec에서 모든 자식 shapes를 단일 호출로 생성.

**기각 이유**: Spec은 layout 위치를 모르며, 자식별 독립 Spec 구조를 파괴. `_hasChildren` fallback은 layout-blind하여 정확한 위치 배치 불가.

### C. Dirty Rectangle + Incremental Update (ADR-012 P3-1)

변경된 요소만 재렌더링하는 incremental approach.

**보완적 관계**: Collapsed rendering과 병행 가능. 향후 ADR-012 P3-1 완성 시 추가 최적화.

---

## Implementation Priority

**P2** — 대량 컴포넌트가 있는 페이지의 FPS 개선에 직접적 영향. ADR-012의 미완 dirty rectangle 최적화보다 ROI가 높음.

## Estimated Effort

| Phase                        | 규모   | 예상 파일 수  |
| ---------------------------- | ------ | ------------- |
| Phase 1 (Collapsed Builder)  | Large  | 3-4 신규/수정 |
| Phase 2 (Command Stream)     | Small  | 1-2 수정      |
| Phase 3 (Selection Store)    | Small  | 1-2 수정      |
| Phase 4 (ElementsLayer)      | Medium | 2-3 수정      |
| Phase 5 (Cache Invalidation) | Medium | 1-2 수정      |
| Phase 6 (Testing)            | Medium | 테스트 파일   |

## Critical Files

| 파일                                               | 역할                                   |
| -------------------------------------------------- | -------------------------------------- |
| `canvas/skia/collapsedComponentRenderer.ts` (신규) | 핵심 병합 엔진                         |
| `canvas/sprites/ElementSprite.tsx`                 | collapsed/expanded 분기 디스패치       |
| `canvas/skia/renderCommands.ts`                    | 자식 DFS 스킵                          |
| `canvas/components/ElementsLayer.tsx`              | 자식 React 마운트 스킵                 |
| `stores/selection.ts`                              | `expandedCompositionalIds` 상태        |
| `canvas/skia/specShapeConverter.ts`                | 각 자식 shapes 변환 (기존 로직 재사용) |
