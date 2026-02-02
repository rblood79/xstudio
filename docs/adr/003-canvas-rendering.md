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

### 4. Dirty Rect 좌표계 불일치 수정 (Skia 콘텐츠 프레임)

스타일 패널에서 값(backgroundColor 등)을 변경하면 캔버스에 반영되지 않고 팬(이동)해야 보이던 문제 수정:

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **Dirty rect 좌표** | `SkiaNodeData.x/y` (CSS/style 로컬 좌표) | 사용 안 함 (전체 렌더링) |
| **content 프레임** | `renderContent(cullingBounds, dirtyRects)` → clipRect + 부분 렌더링 | `renderContent(cullingBounds)` → 전체 렌더링 |
| **좌표계 일치** | dirty rect = CSS 로컬, 렌더 = 카메라 변환 후 스크린 → 불일치 | 전체 렌더링으로 좌표 무관 |

**근본 원인:**
- `registerSkiaNode()`이 dirty rect를 `data.x/y` (CSS left/top)로 계산
- `renderContent()`에서 `clipRect()`으로 이 좌표를 사용
- 실제 렌더링은 `renderSkia()` 내부에서 `canvas.translate(cameraX, cameraY)` + `canvas.scale(cameraZoom)` 적용
- clipRect 영역과 실제 렌더 위치가 불일치 → 변경 사항이 클립 밖에 그려져 보이지 않음
- 팬 시 카메라 변경이 content render를 트리거하여 비로소 변경 사항 표시

**상세:** `apps/builder/src/.../skia/SkiaRenderer.ts`

### 5. Skia 렌더 루프 Ticker Priority 수정 (display 전환 플리커)

`display: block ↔ flex` 전환 시 body 내 Button들이 캔버스 (0,0)으로 순간이동했다가 재배치되는 1-프레임 플리커 수정:

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **renderFrame priority** | NORMAL (0) — Application.render() 전에 실행 | UTILITY (-50) — Application.render() 후에 실행 |
| **alpha=0 설정** | renderFrame 내부 (NORMAL 0) | 별도 `syncPixiVisibility` 콜백 (HIGH 25) |
| **worldTransform** | Yoga 미실행 → stale 좌표 읽음 | Yoga 실행 완료 → 최신 좌표 읽음 |

**근본 원인:**
- PixiJS ticker는 priority 순으로 콜백 실행: HIGH(25) → NORMAL(0) → LOW(-25) → UTILITY(-50)
- `Application.render()` (LOW=-25) 내부의 `prerender`에서 @pixi/layout이 Yoga `calculateLayout()` 실행
- `renderFrame` (NORMAL=0)이 Application.render() 전에 실행 → worldTransform 미갱신
- display 전환 시 Yoga가 아직 새 레이아웃을 계산하지 않은 stale 좌표 (0,0) 읽음

**상세:** `apps/builder/src/.../skia/SkiaOverlay.tsx`

## Update: Pan/Zoom 부드러움 최적화 (2026-02-02)

Pencil 앱 대비 팬/줌 끊김 원인 5가지를 분석·수정:

### 1. 정수 스냅 제거 (SelectionBox)

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **좌표 처리** | `Math.round(bounds.x)` — 정수 스냅 | `bounds.x` — 서브픽셀 유지 |
| **증상** | 줌 2x에서 1px 씬 스텝 = 2px 스크린 점프 | 부드러운 서브픽셀 이동 |
| **근거** | PixiJS는 alpha=0 히트 테스팅 전용, 시각적 렌더링은 Skia가 안티앨리어싱 처리 | — |

**상세:** `apps/builder/src/.../selection/SelectionBox.tsx`

### 2. 고정 16ms 드래그 스로틀 제거

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **스로틀** | `performance.now() - last < 16` (60fps 고정) | RAF 스로틀 (디스플레이 주사율 동기화) |
| **증상** | 120Hz/144Hz에서 절반 이하 업데이트율 | 주사율에 맞는 업데이트 |
| **move/resize** | 시간 기반 스로틀 → RAF 스로틀 (이중 스로틀) | 포인터 이벤트 속도로 즉시 반영 (imperative PixiJS) |

**상세:** `apps/builder/src/.../selection/useDragInteraction.ts`

### 3. 인터랙션 중 해상도 하향 비활성화

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **인터랙션 중** | 해상도 하향 (저사양: 1, 고사양: 1.5) | 고정 해상도 유지 |
| **증상** | 줌 시작 시 PixiJS 캔버스 리사이즈 → @pixi/layout 재계산 → React 리렌더 | 리사이즈 없음 |
| **근거** | Skia 모드에서 PixiJS는 이벤트 처리 전용 (시각적 렌더링 없음) | — |

**상세:** `apps/builder/src/.../canvas/pixiSetup.ts`

### 4. Skia 트리 캐시 카메라 비교 제거

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **캐시 조건** | `registryVersion + cameraX + cameraY + cameraZoom` | `registryVersion`만 비교 |
| **카메라 변경 시** | 캐시 MISS → O(N) 트리 순회 (~5-10ms) | 캐시 HIT → O(1) (~0ms) |
| **근거** | 트리 좌표는 `relX = absX - parentAbsX`로 계산, 카메라가 부모-자식 뺄셈에서 상쇄 | — |

**상세:** `apps/builder/src/.../skia/SkiaOverlay.tsx` (`buildSkiaTreeHierarchical`)

### 5. Wheel 팬 Zustand 업데이트 RAF 배칭

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **setPanOffset 호출** | 매 wheel 이벤트 (120Hz+) | requestAnimationFrame 배칭 (프레임당 1회) |
| **PixiJS/Skia 업데이트** | 즉시 (`controller.setPosition`) | 즉시 (변경 없음) |
| **React 리렌더** | 120Hz+ → BuilderCanvas 전체 리렌더 | 60fps 상한 → 불필요한 리렌더 제거 |

**상세:** `apps/builder/src/.../viewport/useViewportControl.ts`

### 6. Camera-Only Blit 제거 → Content Render 전환

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **카메라 변경 프레임** | `camera-only` → `blitWithCameraDelta()` (< 1ms) | `content` → `renderContent() + blitToMain()` |
| **가장자리 클리핑** | 스냅샷 경계 밖 = 배경색 노출 (body 짤림) | 매 프레임 pixel-perfect 렌더링 |
| **성능** | blit < 1ms, 가장자리 아티팩트 발생 | content ~1-3ms (단순 페이지), 아티팩트 없음 |
| **제거된 코드** | `blitWithCameraDelta`, `snapshotCamera`, `needsCleanupRender` | — |

**근본 원인:** `contentSurface`가 뷰포트 크기로 고정되어, 캐시 스냅샷을 아핀 변환으로 이동하면 스냅샷에 없던 가장자리 영역이 배경색으로 노출됨. Fix 4(트리 캐시)로 트리 빌드 비용이 ~0ms가 되었으므로 content render의 실제 비용은 Skia 드로잉 연산만 남아 성능 영향 최소.

**상세:** `apps/builder/src/.../skia/SkiaRenderer.ts`

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
