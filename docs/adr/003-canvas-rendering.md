# ADR-003: PixiJS for Canvas Rendering

**Status:** Superseded (2026-02-05)
**Date:** 2024-01-01
**Decision Makers:** XStudio Team

> **Superseded By:** Pencil 방식 CanvasKit/Skia 2-pass 렌더러(컨텐츠 캐시 + present(blit) + 오버레이 분리).
> PixiJS는 렌더링이 아니라 **씬 그래프/히트테스트(EventBoundary)/이벤트** 전용 레이어로 유지.
> 상세: `docs/WASM.md`, `docs/PENCIL_VS_XSTUDIO_RENDERING.md`

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

**새 파일:** `apps/builder/src/builder/workspace/canvas/layoutContext.ts` — 순환 참조 방지를 위해 별도 파일로 분리

### 3. @pixi/layout 'layout' 이벤트 기반 타이밍 수정

스타일 패널 변경 후 캔버스에 즉시 반영되지 않고 팬(이동)해야 적용되던 문제 수정:

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **타이밍** | `requestAnimationFrame` 1회 — prerender 전에 실행 가능 | `container.on('layout', handler)` — Yoga 계산 완료 후 정확히 호출 |
| **의존성** | `[elementId, layout]` — layout 변경 시만 트리거 | `[elementId]` — 이벤트 기반이므로 재등록 불필요 |
| **초기값** | rAF에 의존 | rAF fallback + layout 이벤트 구독 |

**상세:** `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx` (LayoutContainer), `apps/builder/src/builder/workspace/canvas/layoutContext.ts`, `apps/builder/src/builder/workspace/canvas/sprites/ElementSprite.tsx`

### 4. Dirty Rect 부분 렌더링 활성화 (Skia 콘텐츠 프레임) — (현재 제거됨)

2026-02-03에 clipRect 기반 Dirty Rect 부분 렌더링을 활성화(좌표 변환 포함)했으나,
2026-02-04~02-05에 "팬/줌/스냅샷/padding" 조합에서 잔상·미반영 리스크가 커서 제거(보류)했다.
현재는 Pencil 방식 2-pass(컨텐츠 캐시 + present blit + 오버레이 분리)로 대체된다.

| 항목 | 당시(2026-02-03) | 현재(2026-02-05) |
|------|------------------|------------------|
| **content 프레임** | `renderContent(..., dirtyRects)` → clipRect 부분 렌더 | 컨텐츠 invalidation은 full rerender로 단순화 |
| **카메라 프레임** | camera-only blit 인프라 보존(비활성) | snapshot 아핀 blit(camera-only) 활성 + cleanup(full) 1회 |

> 기록 목적 참고: `dirtyRectTracker.ts`는 과거 시도 흔적으로 남아 있을 수 있으나, 현재 렌더 경로에는 통합되지 않는다.

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

### 6. Camera-Only Blit (Pencil 방식: padding + cleanup) — ✅ 활성화 (2026-02-05)

Pencil 모델대로 "컨텐츠는 캐시 스냅샷, 카메라만 바뀌면 blit만"을 활성화했다.
핵심은 **contentSurface를 뷰포트보다 크게 생성(padding 512px)** 하여 팬/줌 중 가장자리 클리핑을 막는 것.

| 항목 | 동작 |
|------|------|
| **카메라 변경 프레임** | `camera-only` → `blitWithCameraTransform()` (snapshot 아핀 변환) + 오버레이 렌더 |
| **품질/커버리지 조건** | (1) `camera.zoom > snapshotZoom * 3` 또는 (2) 패딩 포함 스냅샷이 뷰포트를 덮지 못하면 즉시 content 재렌더 |
| **cleanup** | 모션 정지 후 200ms에 cleanup(full) 1회 렌더로 품질 정리 |
| **리샘플링** | zoomRatio != 1이면 `drawImageCubic` 우선 적용(미지원 환경은 `drawImage` 폴백) |

**상세:** `apps/builder/src/.../skia/SkiaRenderer.ts`

## Update: Pencil 기반 Skia 렌더링 최적화 (2026-02-03 → 2026-02-05 반영)

Pencil 앱 분석(`docs/PENCIL_APP_ANALYSIS.md` 섹션 16-19)에서 확인된 미적용 렌더링 기법을 도입:

### 1. Cleanup Render (200ms 디바운스) — ✅ 활성화

Pencil의 `debouncedMoveEnd(200ms) → invalidateContent()` 패턴. Camera-only blit과 함께 사용하여 가장자리 아티팩트를 해소하는 역할.

| 항목 | 설명 |
|------|------|
| **트리거** | camera-only 프레임 이후 `scheduleCleanupRender()` 호출 |
| **디바운스** | 200ms — 연속 팬/줌 중에는 타이머 리셋, 정지 후 1회만 실행 |
| **현재 상태 (2026-02-05)** | camera-only 아핀 blit 활성화. zoom mismatch 또는 snapshot이 화면을 완전히 덮지 못하는 경우(`canBlitWithCameraTransform() === false`)에 cleanup(full) 1회 재렌더로 품질/가장자리 정리 |

### 2. AI Flash 미세 조정

Flash progress > 90%일 때 overlayVersion 증가 중단하여 불필요한 리렌더 방지.

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **flash 종료 직전** | 매 프레임 `overlayVersion++` | progress >= 0.9이면 스킵 |
| **효과** | 리렌더 절약 (flash는 시각적으로 거의 완료된 상태) |

### 3. Pencil 스타일 줌 속도

Pencil 앱의 줌 속도와 동일하게 조정:

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **줌 계수** | `deltaY * 0.001` (12%/클릭) | `clamp(deltaY, ±30) * -0.012` (36%/클릭) |
| **트랙패드 구분** | 없음 | `metaKey` → ±15 클램프 (트랙패드 핀치), `ctrlKey` → ±30 (마우스 휠) |
| **체감** | Pencil 대비 3배 느림 | Pencil과 동일 |

**상세:** `useViewportControl.ts`, `SkiaRenderer.ts`, `SkiaOverlay.tsx`

## Update: Dirty Rect 제거 + Pencil 2-pass 렌더러 완전 교체 (2026-02-05)

Dirty Rect(clipRect) 기반 부분 렌더링은 "팬/줌/스냅샷/padding" 조합에서
좌표계·클리핑 경계 문제가 잔상·미반영 버그로 나타나기 쉬워 제거(보류)했다.

대신 Pencil과 동일한 모델로 정리:
- contentSurface에 **디자인 컨텐츠** 전체 렌더 → `contentSnapshot` 캐시
- present 단계에서 snapshot blit(카메라 델타 아핀 변환) + **오버레이(Selection/AI/PageTitle) 별도 렌더**
- 줌/팬 중에는 camera-only 우선, 정지 후 cleanup(full)로 품질 정리
- Dev 관측: `GPUDebugOverlay`로 `RAF FPS`와 함께 `Present/s`, `Content/s`, `Registry/s`, `Idle%` 등을 분리 관측

## Update: Skia UI 컴포넌트 borderRadius 파싱 수정 (2026-02-03)

`ElementSprite`의 Skia 폴백 렌더링에서 `style.borderRadius`를 `typeof === 'number'`로 직접 검사하여 CSS 문자열 값(`"12px"` 등)이 항상 `0`으로 평가되던 버그 수정:

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **borderRadius 소스** | `style.borderRadius` (raw CSS 문자열) | `convertStyle(style).borderRadius` (파싱된 숫자) |
| **파싱 방식** | `typeof === 'number'` → 문자열이면 `0` | `convertBorderRadius()` → `parseCSSSize()` |
| **영향** | 모든 UI 컴포넌트 borderRadius가 0 또는 기본값 6px | 사용자 설정값 정상 반영 |

> **Note:** `convertStyle()`은 내부적으로 `convertBorderRadius()` → `parseCSSSize()`를 호출하여 CSS 문자열을 숫자로 변환한다. BoxSprite는 이미 이 패턴을 사용하고 있었으나, ElementSprite 폴백에서는 `borderRadius`를 destructuring하지 않아 raw 문자열을 직접 읽고 있었다. 이는 §4.7.4 "typeof === 'number' 금지 패턴"에 해당하는 버그였다.

**상세:** `apps/builder/src/.../sprites/ElementSprite.tsx`

## Update: Multi-Page Canvas Rendering (2026-02-05)

Pencil의 Frame처럼 모든 페이지를 캔버스에 동시 렌더링하는 멀티페이지 지원 추가:

### 씬 그래프 구조 변경

```
변경 전:                          변경 후:
Camera                           Camera
  BodyLayer (단일)                  pages.map(page =>
  CanvasBounds (단일)                 <PageContainer x={pos.x} y={pos.y}>
  ElementsLayer (단일)                  <pixiGraphics /> (타이틀 드래그)
  SelectionLayer                        <BodyLayer />
                                        <CanvasBounds />
                                        {isVisible && <ElementsLayer />}
                                      </PageContainer>
                                    )
                                    <SelectionLayer /> (최상단)
```

### 핵심 설계 결정

| 결정 | 근거 |
|------|------|
| **PageContainer에 x/y 직접 배치** | Yoga layout 외부이므로 x/y prop 예외 허용 |
| **Skia traverse() 수정 불필요** | `worldTransform`이 page container offset 자동 누적 |
| **페이지 전환 시 레지스트리 초기화 제거** | 모든 페이지 동시 마운트 |
| **`setSelectedElements([])` 사용** | `clearSelection()`은 selection 슬라이스만 초기화 — 트리/패널에 잔류 문제 |
| **DOM clientX/clientY 좌표계** | PixiJS global 좌표와 DOM 좌표 불일치 방지 |
| **`invalidateContent()` + ref 기반** | 버전 합산은 충돌 위험, 매 프레임 store 읽기는 성능 부담 |

### 성능 영향

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 페이지별 요소 조회 | O(N*M) `elements.find/filter` | O(1) `pageIndex` |
| elementById | `new Map()` 매 렌더 생성 | `elementsMap` 직접 참조 |
| 페이지 컨테이너 | 인라인 JSX | `PageContainer` memo |
| 뷰포트 밖 페이지 | 전체 렌더링 | `ElementsLayer` 조건부 제외 (200px 마진) |

**상세:** `docs/MULTIPAGE.md`

## Update: Grid Skia 씬 좌표계 렌더링 + Snap to Grid (2026-02-12)

### 1. Grid 렌더러 Screen-Space → Scene-Space 마이그레이션

PixiJS `GridLayer.tsx` 기반 그리드를 CanvasKit/Skia `gridRenderer.ts`로 마이그레이션하면서,
그리드 좌표계를 Screen-Space에서 Scene-Space로 전환하여 Snap to Grid 정합성을 확보:

| 항목 | 수정 전 (Screen-Space) | 수정 후 (Scene-Space) |
|------|----------------------|---------------------|
| **좌표계** | `(0, 0)` ~ `(width, height)` 화면 고정 | `cullingBounds` 기반 씬 좌표 |
| **그리드 정렬** | 카메라 독립 → 요소 snap 위치와 불일치 | 요소의 left/top 값과 동일한 좌표에 그리드선 위치 |
| **선 두께** | 고정 1px | `1 / zoom` 보정으로 화면상 항상 1px |
| **중앙선** | 화면 중앙 | 씬 원점 `(0, 0)` |
| **카메라 변환** | 없음 | `renderScreenOverlay()`에서 DPR + translate + scale 적용 |

**핵심:** 그리드가 씬 좌표계에서 렌더링되므로 Snap to Grid 위치와 시각적 그리드선이 항상 정확히 일치.

### 2. renderScreenOverlay() 카메라 변환 추가

`SkiaRenderer.ts`의 `renderScreenOverlay()`에 카메라 변환을 적용하여 씬 좌표계 오버레이를 지원:

```typescript
private renderScreenOverlay(cullingBounds: DOMRect, camera: CameraState): void {
  this.mainCanvas.save();
  this.mainCanvas.scale(this.dpr, this.dpr);
  this.mainCanvas.translate(camera.panX, camera.panY);
  this.mainCanvas.scale(camera.zoom, camera.zoom);
  this.screenOverlayNode.renderSkia(this.mainCanvas, cullingBounds);
  this.mainCanvas.restore();
}
```

### 3. 페이지 드래그 Snap to Grid 지원

`usePageDrag.ts`에 snap-to-grid 로직 추가 — 기존에는 요소 드래그만 snap을 지원하고 페이지 드래그는 미지원:

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **onPointerMove** | 자유 이동 | `snapToGrid` 활성 시 `gridSize` 단위 스냅 |
| **onPointerUp** | 최종 위치만 업데이트 | 최종 위치 + 스냅 적용 (RAF 취소로 누락된 이동분 반영) |

**상세:** `gridRenderer.ts`, `SkiaRenderer.ts`, `SkiaOverlay.tsx`, `usePageDrag.ts`

## Update: Spec Shapes 기반 Skia UI 컴포넌트 렌더링 (2026-02-12)

62개 UI 컴포넌트(Button, Checkbox, Radio, Switch 등)가 "배경색+텍스트" fallback으로만 Skia 렌더링되던 한계를 **ComponentSpec의 `render.shapes()` 기반 정확한 도형 렌더링**으로 교체:

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **UI 컴포넌트 렌더링** | 배경색+텍스트 fallback (`VARIANT_BG_COLORS` 테이블) | Spec shapes 기반 정확한 도형 렌더링 |
| **지원 Shape 타입** | 없음 | roundRect, rect, circle, line, border, text, shadow, container |
| **Column 레이아웃** | 미지원 | `rearrangeShapesForColumn()` — shapes 좌표 재배치 (indicator 중앙, text 아래) |
| **BlockEngine 크기** | `DEFAULT_HEIGHT` 36px fallback | Spec 기반 24px (md) + `flexDirection` 인식 |

### 1. 렌더링 파이프라인

```
ComponentSpec.render.shapes(props, size, theme)
  → Shape[] (roundRect, rect, circle, line, border, text, shadow, container)
  → specShapesToSkia(shapes, theme, width, height)
  → SkiaNodeData (box, line, text, effects)
  → renderNode() (nodeRenderers.ts)
```

### 2. specShapeConverter.ts (신규)

`Shape[]` → `SkiaNodeData` 제네릭 변환기. Shape 타입별 매핑 규칙:

| Shape 타입 | SkiaNodeData 타입 | 변환 규칙 |
|-----------|-------------------|-----------|
| `roundRect` | `box` | `radius` → `borderRadius`, `auto` 크기 → 컨테이너 크기 |
| `rect` | `box` | `borderRadius: 0` |
| `circle` | `box` | 중심→좌상단 변환 (`x - radius, y - radius`), `borderRadius = radius` |
| `line` | `line` | `x1/y1/x2/y2` + `strokeColor/strokeWidth` (신규 SkiaNodeData 타입) |
| `border` | 기존 노드에 stroke 추가 | `target` ID 또는 직전 노드의 `box.strokeColor/strokeWidth` 설정 |
| `text` | `text` | baseline/align 기반 padding 계산, `TokenRef` fontSize 해석 |
| `shadow` | `effects[]` 추가 | `target` 노드에 `drop-shadow` EffectStyle 부착 |
| `container` | 재귀 호출 | 자식 `Shape[]` → `specShapesToSkia()` 재귀 |

**bgBox 추출 규칙:** 첫 번째 `auto`-sized shape at `(0, 0)`만 컨테이너 배경으로 추출. 고정 크기 shape (예: checkbox indicator 20x20)는 추출하지 않음.

**색상 해석:** `ColorValue` → `resolveColor()` → hex → `Float32Array(r, g, b, a)`
**TokenRef 해석:** `resolveNum()` → `resolveToken()` (예: `'{typography.text-md}'` → `14`)

### 3. ElementSprite.tsx 변경

`TAG_SPEC_MAP`으로 62개 컴포넌트 태그를 ComponentSpec에 매핑:

```typescript
const TAG_SPEC_MAP: Record<string, ComponentSpec<any>> = {
  'Button': ButtonSpec, 'SubmitButton': ButtonSpec,
  'FancyButton': FancyButtonSpec,
  // ... 62개 컴포넌트
};

function getSpecForTag(tag: string): ComponentSpec<any> | null {
  return TAG_SPEC_MAP[tag] ?? null;
}
```

**Column layout 지원:** `rearrangeShapesForColumn()` — `flexDirection: column` 일 때 indicator를 가로 중앙에, text를 indicator 아래에 재배치.

**세로 가운데 정렬:** 컨테이너가 spec 콘텐츠보다 높을 때 `specNode.y = (finalHeight - specHeight) / 2`로 수직 센터링.

### 4. BlockEngine 통합

`engines/utils.ts`의 `calculateContentWidth/Height`에 Checkbox/Radio/Switch/Toggle 전용 크기 계산 추가:

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **기본 높이** | `DEFAULT_HEIGHT` (36px) | Spec 기반 크기 (md: 24px) |
| **flexDirection row** | 미지원 | `indicatorW + gap + textW` |
| **flexDirection column** | 미지원 | `max(indicatorW, textW)`, height: `indicatorH + gap + textH` |
| **styleToLayout.ts** | 기본 flex 없음 | Checkbox/Radio/Switch 기본 flex 레이아웃 + `flexDirection` 인식 크기 계산 |

### 5. 기타 변경

| 파일 | 변경 |
|------|------|
| `skia/nodeRenderers.ts` | `SkiaNodeData`에 `'line'` 타입 추가, `renderLine()` 구현 |
| `skia/aiEffects.ts` | `borderRadius` 튜플 타입 호환성 패치 (`number \| readonly [number, number, number, number]`) |
| `types/builder/unified.types.ts` | `createDefaultCheckboxProps`/`RadioProps`/`SwitchProps`에 `variant`, `size`, `style` 기본값 추가 |

**상세:** `apps/builder/src/.../skia/specShapeConverter.ts`, `apps/builder/src/.../sprites/ElementSprite.tsx`, `apps/builder/src/.../skia/nodeRenderers.ts`, `docs/COMPONENT_SPEC_ARCHITECTURE.md`

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
