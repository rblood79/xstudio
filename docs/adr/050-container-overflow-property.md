# ADR-050: Container Overflow 프로퍼티 — Preview CSS + Figma 스타일 WebGL 시각화

## Status

**Proposed** — 2026-04-03

## Related ADRs

- [ADR-008](completed/008-layout-engine.md): 레이아웃 엔진 전환 — overflow/aspectRatio applyCommonTaffyStyle() 추가 기록
- [ADR-009](009-full-tree-wasm-layout.md): Phase E `overflow: scroll/auto` 완성 계획 — 본 ADR의 선행 인프라
- [ADR-035](completed/035-workspace-canvas-refactor.md): Workspace Canvas Runtime — SharedSceneDerivedData, treeBoundsMap 인프라

## Context

### 문제

XStudio의 컨테이너 컴포넌트(Card, Form, GridList 등)에 CSS `overflow` 프로퍼티를 사용자가 직접 설정할 수 있는 UI가 없다. 현재 overflow는 Typography 섹션의 text truncation 프리셋(`truncate` → `overflow: hidden`)으로만 간접 설정 가능하며, 컨테이너 레이아웃 차원의 overflow 제어는 미제공 상태다.

### 요구사항

1. **에디터 UI**: Layout 패널에서 container의 overflow 값(visible, hidden, scroll, auto, clip)을 직접 선택
2. **Preview (CSS DOM)**: 선택한 overflow 값이 실제 CSS로 적용 — 브라우저 네이티브 동작
3. **WebGL (Skia Canvas)**: Figma 패턴 — overflow 컨테이너의 콘텐츠는 클리핑하되, **컨테이너 hover 시 초과 영역의 outline만 점선으로 표시**

### Figma 레퍼런스

Figma에서 Frame의 "Clip content" 설정 시:

- 평상시: 자식이 Frame 경계로 클리핑
- 마우스 hover: 클리핑된 자식의 원래 전체 영역이 점선 outline으로 표시
- 선택 시: 클리핑 영역 밖 콘텐츠가 반투명으로 표시

XStudio에서는 hover 시 outline 표시까지 구현한다.

### 기존 인프라 현황

| 레이어                      | 상태   | 구현 파일                                              | 비고                                        |
| --------------------------- | ------ | ------------------------------------------------------ | ------------------------------------------- |
| Skia 클리핑 (hidden/clip)   | ✅     | `BoxSprite.tsx:338-342`, `nodeRendererTree.ts:206-210` | `clipChildren: true` → `canvas.clipRect()`  |
| Taffy overflow 전달         | ✅     | `utils.ts:3434-3440` applyCommonTaffyStyle()           | overflowX/Y Taffy 스타일 전달               |
| Scroll offset 렌더링        | ✅     | `nodeRendererTree.ts:212-221`                          | `canvas.translate(-scrollLeft, -scrollTop)` |
| ScrollState store           | ✅     | `scrollState.ts`                                       | scrollTop/Left/max 관리, scrollBy()         |
| maxScroll 계산              | ✅     | `fullTreeLayout.ts:1924-1954`                          | scroll/auto 요소의 content bounds 계산      |
| Preview CSS 추출            | ✅     | `computedStyleExtractor.ts:89-91`                      | overflow/overflowX/overflowY 화이트리스트   |
| Hover 인프라                | ✅     | `useElementHoverInteraction.ts` → `hoverRenderer.ts`   | hoveredElementId, outline 렌더링 파이프라인 |
| **에디터 UI (Container용)** | **❌** | —                                                      | Typography 섹션에만 text truncation용 존재  |
| **Overflow content bounds** | **❌** | —                                                      | 클리핑된 자식의 전체 영역 계산 없음         |
| **Figma 스타일 outline**    | **❌** | —                                                      | hover 시 초과 영역 outline 미표시           |

---

## Decision

### 접근 방식: 기존 인프라 확장

기존 클리핑/hover 인프라를 최대한 재사용하고, 3가지 gap만 채운다:

1. Layout 패널 UI 추가
2. `overflowContentBoundsMap` 계산 (자식 union bounds)
3. hover overlay에 overflow outline 렌더러 연결

### 대안 검토

| 대안                                  | 장점                            | 단점                          | 결정      |
| ------------------------------------- | ------------------------------- | ----------------------------- | --------- |
| A. 기존 인프라 확장 (선택)            | 변경 최소, treeBoundsMap 재사용 | —                             | **채택**  |
| B. ADR-009 Phase E 스크롤바 먼저 구현 | 완전한 overflow 지원            | 스크롤바 UI 복잡, 당장 불필요 | 별도 후속 |
| C. PixiJS overlay layer에서 outline   | React 컴포넌트로 구현 가능      | Skia와 좌표계 이중 관리       | 기각      |

---

## Implementation Plan

### Phase 1: 에디터 UI — Layout 섹션 Overflow 셀렉터

#### Step 1.1: Jotai atom 확장

**파일**: `apps/builder/src/builder/panels/styles/hooks/useLayoutValuesJotai.ts`

- `LayoutStyleValues` 인터페이스에 `overflow: string` 필드 추가

**파일**: `apps/builder/src/builder/panels/styles/atoms/styleAtoms.ts`

- `layoutValuesAtom` selector에서 overflow 값 추출
- equality comparator에 `a.overflow === b.overflow` 추가

#### Step 1.2: 옵션 상수

**파일**: `apps/builder/src/builder/panels/styles/constants/styleOptions.ts`

```typescript
export const OVERFLOW_OPTIONS = [
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
  { value: "scroll", label: "Scroll" },
  { value: "auto", label: "Auto" },
  { value: "clip", label: "Clip" },
];
```

#### Step 1.3: LayoutSection 컨트롤 추가

**파일**: `apps/builder/src/builder/panels/styles/sections/LayoutSection.tsx`

- `LayoutSectionContent` 내부, padding/margin 영역 근처에 overflow select 추가
- `updateStyleImmediate("overflow", value)` 패턴 사용 (기존과 동일)
- `LAYOUT_PROPS` 배열(L546)에 `"overflow"` 추가 → reset 커버리지

---

### Phase 2: Preview CSS — 검증만

**변경 없음**. 이미 동작:

- `element.props.style.overflow` → Preview DOM style 직접 적용
- `computedStyleExtractor.ts` 화이트리스트에 overflow 등록 완료

검증: overflow: hidden 설정 → Preview iframe에서 클리핑 동작 확인.

---

### Phase 3: WebGL — Overflow Content Bounds 계산

#### Step 3.1: buildOverflowContentBoundsMap() 함수

**파일**: `apps/builder/src/builder/workspace/canvas/skia/skiaFrameHelpers.ts`

```typescript
/**
 * overflow가 visible이 아닌 컨테이너의 자식 전체 union bounds를 계산한다.
 * 자식이 컨테이너를 초과하는 경우에만 Map에 저장 (overflow 발생 시에만).
 */
export function buildOverflowContentBoundsMap(
  treeBoundsMap: Map<string, BoundingBox>,
  elementsMap: Map<string, Element>,
  childrenMap: Map<string, Element[]>,
): Map<string, BoundingBox> {
  const result = new Map<string, BoundingBox>();

  for (const [elementId, containerBounds] of treeBoundsMap) {
    const el = elementsMap.get(elementId);
    if (!el) continue;

    const overflow = (el.props?.style as Record<string, unknown>)?.overflow as
      | string
      | undefined;
    if (!overflow || overflow === "visible") continue;

    const children = childrenMap.get(elementId);
    if (!children || children.length === 0) continue;

    // 자식 union bounds 계산
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    for (const child of children) {
      const childBounds = treeBoundsMap.get(child.id);
      if (!childBounds) continue;
      minX = Math.min(minX, childBounds.x);
      minY = Math.min(minY, childBounds.y);
      maxX = Math.max(maxX, childBounds.x + childBounds.width);
      maxY = Math.max(maxY, childBounds.y + childBounds.height);
    }

    if (minX === Infinity) continue;

    // 실제 overflow 발생 여부 확인
    const hasOverflow =
      minX < containerBounds.x ||
      minY < containerBounds.y ||
      maxX > containerBounds.x + containerBounds.width ||
      maxY > containerBounds.y + containerBounds.height;

    if (hasOverflow) {
      result.set(elementId, {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      });
    }
  }

  return result;
}
```

#### Step 3.2: SharedSceneDerivedData 확장

**파일**: `apps/builder/src/builder/workspace/canvas/skia/types.ts`

```typescript
export interface SharedSceneDerivedData {
  treeBoundsMap: Map<string, BoundingBox>;
  overflowContentBoundsMap: Map<string, BoundingBox>; // NEW
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
}
```

#### Step 3.3: Frame Pipeline 연결

**파일**: `apps/builder/src/builder/workspace/canvas/skia/skiaFramePipeline.ts`

`buildSharedSceneDerivedData()`에 파라미터 추가:

```typescript
export function buildSharedSceneDerivedData(
  treeBoundsMap: Map<string, BoundingBox>,
  overflowContentBoundsMap: Map<string, BoundingBox>, // NEW
  cameraX: number,
  cameraY: number,
  cameraZoom: number,
): SharedSceneDerivedData {
  return {
    treeBoundsMap,
    overflowContentBoundsMap,
    cameraX,
    cameraY,
    cameraZoom,
  };
}
```

`buildSkiaFrameContent()`에서 빌드 후 전달:

```typescript
const overflowContentBoundsMap = buildOverflowContentBoundsMap(
  treeBoundsMap,
  elementsMap,
  childrenMap,
);
```

---

### Phase 4: WebGL — Figma 스타일 Hover Outline 렌더링

#### Step 4.1: HoverHighlightTarget 확장

**파일**: `apps/builder/src/builder/workspace/canvas/skia/skiaOverlayHelpers.ts`

```typescript
export interface HoverHighlightTarget {
  dashed: boolean;
  bounds: BoundingBox;
  isOverflowOutline?: boolean; // NEW
}

export function buildHoverHighlightTargets(
  treeBoundsMap: Map<string, BoundingBox>,
  hoveredContextId: string | null,
  hoveredLeafIds: string[],
  isGroupHover: boolean,
  overflowContentBoundsMap?: Map<string, BoundingBox>, // NEW
): HoverHighlightTarget[] {
  const targets: HoverHighlightTarget[] = [];

  if (hoveredContextId) {
    const contextBounds = treeBoundsMap.get(hoveredContextId);
    if (contextBounds) {
      targets.push({ bounds: contextBounds, dashed: false });
    }

    // NEW: overflow content outline
    if (overflowContentBoundsMap) {
      const contentBounds = overflowContentBoundsMap.get(hoveredContextId);
      if (contentBounds) {
        targets.push({
          bounds: contentBounds,
          dashed: true,
          isOverflowOutline: true,
        });
      }
    }
  }

  if (isGroupHover && hoveredLeafIds.length > 0) {
    for (const leafId of hoveredLeafIds) {
      const leafBounds = treeBoundsMap.get(leafId);
      if (leafBounds) {
        targets.push({ bounds: leafBounds, dashed: true });
      }
    }
  }

  return targets;
}
```

#### Step 4.2: Overflow Outline 렌더 함수

**파일**: `apps/builder/src/builder/workspace/canvas/skia/hoverRenderer.ts`

```typescript
// amber-500 계열, alpha 0.4 — 기존 hover blue와 시각적 구분
const OVERFLOW_R = 0xf5 / 255;
const OVERFLOW_G = 0x9e / 255;
const OVERFLOW_B = 0x0b / 255;
const OVERFLOW_ALPHA = 0.4;

export function renderOverflowContentOutline(
  ck: CanvasKit,
  canvas: Canvas,
  bounds: BoundingBox,
  zoom: number,
): void {
  const scope = new SkiaDisposable();
  let dashEffect: ReturnType<typeof ck.PathEffect.MakeDash> | null = null;
  try {
    const sw = 1 / zoom;
    const paint = scope.track(new ck.Paint());
    paint.setAntiAlias(true);
    paint.setStyle(ck.PaintStyle.Stroke);
    paint.setStrokeWidth(sw);
    paint.setColor(
      ck.Color4f(OVERFLOW_R, OVERFLOW_G, OVERFLOW_B, OVERFLOW_ALPHA),
    );

    dashEffect = ck.PathEffect.MakeDash([6 / zoom, 3 / zoom]);
    paint.setPathEffect(dashEffect);

    const rect = ck.LTRBRect(
      bounds.x,
      bounds.y,
      bounds.x + bounds.width,
      bounds.y + bounds.height,
    );
    canvas.drawRect(rect, paint);
  } finally {
    dashEffect?.delete();
    scope.dispose();
  }
}
```

#### Step 4.3: Overlay Builder 연결

**파일**: `apps/builder/src/builder/workspace/canvas/skia/skiaOverlayBuilder.ts`

1. `OverlayBuildInput` 인터페이스에 추가:

```typescript
// Overflow (Figma-style content outline)
overflowContentBoundsMap?: Map<string, BoundingBox>;
```

2. `buildOverlayNode()` L339-353 hover 섹션 수정:

```typescript
const hoverTargets = buildHoverHighlightTargets(
  treeBoundsMap,
  hoveredCtxId,
  hoveredLeafIds,
  isGroupHover,
  input.overflowContentBoundsMap, // NEW
);
for (const target of hoverTargets) {
  if (target.isOverflowOutline) {
    renderOverflowContentOutline(ck, canvas, target.bounds, cameraZoom);
  } else {
    renderHoverHighlight(ck, canvas, target.bounds, cameraZoom, target.dashed);
  }
}
```

#### Step 4.4: SkiaOverlay 데이터 전달

**파일**: `apps/builder/src/builder/workspace/canvas/skia/SkiaOverlay.tsx`

- `sharedScene.overflowContentBoundsMap`을 `buildOverlayNode()` input에 전달
- 별도 ref 불필요 — `sharedScene` 객체 내부에 이미 포함

---

## 수정 파일 요약

| 파일                                          | Phase | 변경 내용                                       |
| --------------------------------------------- | ----- | ----------------------------------------------- |
| `panels/styles/hooks/useLayoutValuesJotai.ts` | 1.1   | overflow 필드 추가                              |
| `panels/styles/atoms/styleAtoms.ts`           | 1.1   | layoutValuesAtom에 overflow 추출/비교           |
| `panels/styles/constants/styleOptions.ts`     | 1.2   | OVERFLOW_OPTIONS 상수                           |
| `panels/styles/sections/LayoutSection.tsx`    | 1.3   | overflow select UI + LAYOUT_PROPS 등록          |
| `skia/skiaFrameHelpers.ts`                    | 3.1   | buildOverflowContentBoundsMap()                 |
| `skia/types.ts`                               | 3.2   | SharedSceneDerivedData.overflowContentBoundsMap |
| `skia/skiaFramePipeline.ts`                   | 3.3   | buildSharedSceneDerivedData() 파라미터 확장     |
| `skia/skiaOverlayHelpers.ts`                  | 4.1   | HoverHighlightTarget 확장 + 빌더 수정           |
| `skia/hoverRenderer.ts`                       | 4.2   | renderOverflowContentOutline() 추가             |
| `skia/skiaOverlayBuilder.ts`                  | 4.3   | OverlayBuildInput + buildOverlayNode 연결       |
| `skia/SkiaOverlay.tsx`                        | 4.4   | sharedScene → overlay input 전달                |

---

## 의존 그래프

```
Phase 1 (에디터 UI) ──────────────────┐
                                       ├──→ 검증
Phase 2 (Preview CSS 검증) ───────────┤
                                       │
Phase 3 (Content Bounds 계산) ────→ Phase 4 (Hover Outline 렌더링)
```

- Phase 1, 2, 3은 독립 병렬 가능
- Phase 4는 Phase 3 완료 후 진행

---

## Risk Assessment

| 리스크                             | 심각도 | 완화 전략                                                               |
| ---------------------------------- | ------ | ----------------------------------------------------------------------- |
| overflowContentBoundsMap 계산 비용 | 낮음   | treeBoundsMap 순회 O(N), registryVersion 기반 캐싱 가능                 |
| 중첩 overflow 컨테이너             | 낮음   | 각 컨테이너가 독립적으로 자기 직계 자식의 union 계산                    |
| Typography text truncation 충돌    | 낮음   | text truncation은 leaf 요소(Text), 본 기능은 container 전용 — 다른 요소 |
| scroll/auto의 스크롤바 UI 미구현   | 중간   | 본 ADR 범위 외 — ADR-009 Phase E에서 후속 처리. 클리핑+outline만 우선   |

---

## Verification

1. **에디터 UI**: 컨테이너 선택 → Layout 패널에서 overflow 드롭다운 표시/변경 확인
2. **Preview**: overflow: hidden 설정 → Preview iframe에서 CSS 클리핑 동작 확인
3. **WebGL 클리핑**: Canvas에서 overflow: hidden 컨테이너의 자식 잘림 확인 (기존 동작)
4. **Figma outline**: overflow 컨테이너 hover 시 amber 점선 outline으로 초과 영역 표시 확인
5. **type-check**: `pnpm type-check` 통과
6. **브라우저**: Chrome MCP로 실제 동작 검증

---

## Future Work (본 ADR 범위 외)

- **ADR-009 Phase E**: `overflow: scroll/auto` 스크롤바 Skia 렌더링 + wheel/touch 이벤트 바인딩
- **overflowX/overflowY 개별 설정**: 현재는 overflow 단일값만 UI 제공, 축별 분리는 후속
- **선택 시 반투명 표시**: Figma의 "선택 시 클리핑 밖 콘텐츠 반투명 표시" 패턴은 후속
