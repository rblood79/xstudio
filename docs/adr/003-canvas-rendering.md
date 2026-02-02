# ADR-003: PixiJS for Canvas Rendering

**Status:** Accepted
**Date:** 2024-01-01
**Decision Makers:** XStudio Team

## Context

XStudio Builder는 시각적 캔버스 에디터가 필요합니다:
- 수백~수천 개의 요소 렌더링
- 60fps 인터랙션 (드래그, 리사이즈, 선택)
- 줌/팬 뷰포트 변환
- 선택 오버레이, 가이드라인

## Decision

**PixiJS 8 + @pixi/layout + @pixi/react**를 캔버스 렌더링에 사용합니다.

## Alternatives Considered

| 옵션 | 장점 | 단점 |
|------|------|------|
| DOM + CSS Transform | 단순함, 접근성 | 대규모 요소 성능 저하 |
| Canvas 2D | 가벼움 | 인터랙션 구현 복잡 |
| PixiJS | WebGL 성능, 풍부한 API | 학습 곡선 |
| Three.js | 3D 지원 | 2D 에디터에 과도함 |
| Konva | React 통합 좋음 | Canvas 2D 기반 한계 |

## Rationale

1. **WebGL 성능**: GPU 가속으로 수천 개 요소도 60fps
2. **@pixi/layout**: Yoga 기반 Flexbox 레이아웃
3. **@pixi/react**: React 선언적 문법 유지
4. **생태계**: 필터, 마스킹, 텍스처 등 풍부한 기능

## Key Constraints

### @pixi/layout 규칙
```typescript
// ❌ x/y props 금지
<Container x={100} y={50} />

// ✅ style 기반 레이아웃
<Container style={{ marginLeft: 100, marginTop: 50 }} />

// ✅ Text는 isLeaf 필수
<Text text="Hello" isLeaf />

// ✅ @pixi/layout 최우선 import
import '@pixi/layout';
import { Container, Text } from '@pixi/react';
```

## Consequences

### Positive
- 대규모 프로젝트에서도 부드러운 인터랙션
- Yoga 레이아웃으로 CSS-like 레이아웃
- React 패턴과 자연스러운 통합

### Negative
- 접근성 직접 구현 필요
- @pixi/layout 규칙 학습 필요
- 디버깅이 DOM보다 어려움

## Update: CanvasKit/Skia WASM 이중 렌더러 (2026-02-01)

PixiJS 단독 렌더링에서 **Pencil 방식의 이중 렌더러**로 전환 진행 중:

| 레이어 | 역할 |
|--------|------|
| **CanvasKit/Skia 캔버스** (z:2) | 디자인 노드 + AI 이펙트 + Selection 오버레이 렌더링 |
| **PixiJS 캔버스** (z:3, 투명) | 씬 그래프 + EventBoundary 히트 테스팅 + 이벤트 처리 |

**핵심 변경:**
- PixiJS Camera 하위 레이어: `alpha=0`으로 시각적 숨김 (이벤트 유지)
- `renderable=false` 사용 금지 — PixiJS 8 EventBoundary가 히트 테스팅까지 비활성화
- Selection 오버레이: `selectionRenderer.ts`에서 CanvasKit API로 렌더링
- 상세: `docs/WASM.md` §5.7, `docs/reference/components/PIXI_WEBGL.md` 참조

## Update: Rust WASM 성능 가속 (2026-02-02)

Phase 0-4 Rust WASM 모듈을 빌드/활성화하여 캔버스 성능 가속:

| Phase | 모듈 | 역할 |
|-------|------|------|
| **Phase 1** | `SpatialIndex` | Grid-cell 기반 O(k) 뷰포트 컬링, 라쏘 선택, 히트 테스트 |
| **Phase 2** | `block_layout` / `grid_layout` | Block/Grid 레이아웃 WASM 가속 (children > 10) |
| **Phase 4** | `layoutWorker` | Web Worker 비동기 레이아웃 + SWR 캐싱 |

> **Note (2026-02-02):** 기존 환경변수 Feature Flag(`VITE_WASM_SPATIAL`, `VITE_WASM_LAYOUT`, `VITE_WASM_LAYOUT_WORKER`, `VITE_RENDER_MODE`, `VITE_SKIA_DUAL_SURFACE`)는 모두 제거되고 값이 하드코딩됨. `featureFlags.ts`의 `WASM_FLAGS`는 전부 `true`, `getRenderMode()`는 `'skia'` 고정.

**빌드 산출물:** `wasm-bindings/pkg/xstudio_wasm_bg.wasm` (70KB)
**상세:** `docs/WASM.md` Phase 0-4

## Update: Skia Border-Box 렌더링 수정 (2026-02-02)

Skia `renderBox()`의 stroke가 요소 바운드 밖으로 넘쳐 인접 요소 border가 겹치는 문제 수정:

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **Stroke rect** | `(0, 0, width, height)` — strokeWidth/2 밖으로 넘침 | `(inset, inset, width-inset, height-inset)` — 완전 내부 |
| **PixiJS 일치** | 불일치 (PixiJS는 `getBorderBoxOffset` 사용) | 일치 — 동일한 border-box 동작 |
| **Block 레이아웃** | `parentBorder`가 `availableWidth`에서 차감 | border는 시각 전용, 레이아웃 inset 아님 |

**상세:** `apps/builder/src/.../skia/nodeRenderers.ts`, `BuilderCanvas.tsx`

## Update: Skia AABB 뷰포트 컬링 좌표계 수정 (2026-02-02)

캔버스 팬 시 body가 화면 왼쪽/위쪽 가장자리에 닿으면 모든 렌더링이 사라지는 버그 수정:

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **루트 컨테이너** | `{width:0, height:0}` 가상 노드에 AABB 컬링 적용 → 원점 이탈 시 전체 소실 | zero-size 노드는 컬링 스킵, 자식에서 개별 컬링 |
| **자식 cullingBounds** | 씬-로컬 좌표 그대로 전달 → `canvas.translate()` 후 좌표계 불일치 | `(x - node.x, y - node.y)` 역변환으로 로컬 좌표계 일치 |

**상세:** `apps/builder/src/.../skia/nodeRenderers.ts`

## Update: Skia UI 컴포넌트 Variant 색상 매핑 (2026-02-02)

`ElementSprite`의 Skia 폴백 렌더링에서 UI 컴포넌트 배경/테두리 색상을 `#e2e8f0`(slate-200)로 하드코딩하여 variant 변경이 반영되지 않던 문제 수정:

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **배경색** | `#e2e8f0` (slate-200) 하드코딩 | `VARIANT_BG_COLORS[variant]` 테이블 참조 |
| **테두리색** | `#cbd5e1` (slate-300) 하드코딩 | `VARIANT_BORDER_COLORS[variant]` 테이블 참조 |
| **투명 variant** | 미지원 | outline/ghost → `bgAlpha=0`, ghost → 테두리 없음 |
| **우선순위** | 없음 | `style.backgroundColor > variant > 기본값` |

**상세:** `apps/builder/src/.../sprites/ElementSprite.tsx`, `docs/COMPONENT_SPEC_ARCHITECTURE.md` §4.5

## Update: Skia 렌더 트리 계층화 (2026-02-02)

캔버스 팬 시 Body 내 Button이 Body를 뒤따라오는 렌더링 불일치 문제를 근본적으로 해결:

| 항목 | 수정 전 (flat 트리) | 수정 후 (계층적 트리) |
|------|---------|---------|
| **트리 구조** | `buildSkiaTreeFromRegistry` — 모든 노드를 flat siblings로 수집 | `buildSkiaTreeHierarchical` — 부모-자식 계층 보존 |
| **좌표 계산** | `(wt.tx - cameraX) / zoom` — 각 노드 독립 절대 좌표 | `(child.wt.tx - parent.wt.tx) / zoom` — 부모 기준 상대 좌표 |
| **팬 안정성** | worldTransform 갱신 타이밍 차이 → 노드 간 상대 위치 오차 | 뺄셈 시 카메라 오프셋 상쇄 → 상대 위치 항상 정확 |
| **Selection 좌표** | elementRegistry/하드코딩 — 컨텐츠와 다른 좌표 소스 | `buildTreeBoundsMap` — Skia 트리에서 추출, 컨텐츠와 동기화 |
| **AI 이펙트 좌표** | flat 트리에서 직접 `node.x/y` 사용 | `buildNodeBoundsMap`에서 부모 오프셋 누적으로 절대 좌표 복원 |

**핵심 공식:** `relativeX = (child.wt.tx - parent.wt.tx) / cameraZoom`
- `parent.wt.tx`와 `child.wt.tx` 모두 동일한 (stale) cameraX를 포함
- 뺄셈 시 카메라 오프셋이 상쇄 → worldTransform 갱신 타이밍과 무관하게 상대 위치 정확

**상세:** `apps/builder/src/.../skia/SkiaOverlay.tsx`, `apps/builder/src/.../skia/aiEffects.ts`

## Update: Flex Layout CSS 정합성 개선 (2026-02-02)

### 1. 조건부 flexShrink (CSS flex-shrink 에뮬레이션)

`display:flex` 부모에 `width:100%` 자식 2개를 배치하면 body를 벗어나는 문제 수정:

| 항목 | CSS (브라우저) | Yoga (@pixi/layout) |
|------|---------------|---------------------|
| **flex-shrink 기본값** | 1 (축소 허용) | 0 (축소 안 함) |
| **min-width 기본값** | auto (콘텐츠 크기 이하 방지) | 0 (0까지 축소 가능) |

**조건부 분기 적용:**
- 퍼센트 width/flexBasis → `flexShrink: 1` (CSS처럼 비례 축소)
- 고정/미지정 width → `flexShrink: 0` (min-width: auto 에뮬레이션)
- 사용자가 명시적 flexShrink 설정 시 그 값 우선

### 2. LayoutComputedSizeContext (퍼센트 크기 해석)

Yoga가 계산한 컨테이너 크기를 자식 스프라이트에 전달하는 React Context:

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **% width 해석** | `parseCSSSize('100%', undefined, 100)` → 100px | `parseCSSSize('100%', computedWidth, 100)` → 부모 기준 정확 계산 |
| **크기 전파** | 없음 — 각 스프라이트가 raw CSS 값 직접 사용 | `LayoutComputedSizeContext` — Yoga 결과를 Context로 전달 |
| **getBounds() vs computedLayout** | getBounds()는 콘텐츠 bounding box | `_layout.computedLayout`에서 Yoga 결과 직접 읽기 |

**새 파일:** `canvas/layoutContext.ts` — 순환 참조 방지를 위해 별도 파일로 분리

### 3. @pixi/layout 'layout' 이벤트 기반 타이밍 수정

스타일 패널 변경 후 캔버스에 즉시 반영되지 않고 팬(이동)해야 적용되던 문제 수정:

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **타이밍** | `requestAnimationFrame` 1회 — prerender 전에 실행 가능 | `container.on('layout', handler)` — Yoga 계산 완료 후 정확히 호출 |
| **의존성** | `[elementId, layout]` — layout 변경 시만 트리거 | `[elementId]` — 이벤트 기반이므로 재등록 불필요 |
| **초기값** | rAF에 의존 | rAF fallback + layout 이벤트 구독 |

**상세:** `apps/builder/src/.../canvas/BuilderCanvas.tsx` (LayoutContainer), `canvas/layoutContext.ts`, `canvas/sprites/ElementSprite.tsx`

## Implementation

```typescript
import '@pixi/layout';
import { Stage, Container, Text } from '@pixi/react';

function BuilderCanvas() {
  return (
    <Stage>
      <Container style={{ display: 'flex', flexDirection: 'column' }}>
        <Container style={{ flex: 1 }}>
          <Text text="Content" isLeaf />
        </Container>
      </Container>
    </Stage>
  );
}
```

## References

- `apps/builder/src/builder/workspace/canvas/` - Canvas 구현
- `.claude/skills/xstudio-patterns/rules/pixi-*.md` - PIXI 규칙
- `docs/reference/components/PIXI_LAYOUT.md` - 레이아웃 상세
