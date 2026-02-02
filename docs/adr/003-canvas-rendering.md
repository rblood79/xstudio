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

| Phase | 모듈 | 역할 | Feature Flag |
|-------|------|------|-------------|
| **Phase 1** | `SpatialIndex` | Grid-cell 기반 O(k) 뷰포트 컬링, 라쏘 선택, 히트 테스트 | `VITE_WASM_SPATIAL=true` |
| **Phase 2** | `block_layout` / `grid_layout` | Block/Grid 레이아웃 WASM 가속 (children > 10) | `VITE_WASM_LAYOUT=true` |
| **Phase 4** | `layoutWorker` | Web Worker 비동기 레이아웃 + SWR 캐싱 | `VITE_WASM_LAYOUT_WORKER=true` |

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
