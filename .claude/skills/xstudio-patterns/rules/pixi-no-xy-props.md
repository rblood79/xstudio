---
title: DirectContainer 직접 배치 패턴
impact: CRITICAL
impactDescription: 레이아웃 엔진 결과의 올바른 적용, 이중 계산 방지
tags: [pixi, layout, canvas, direct-container]
---

레이아웃 엔진(Taffy/Dropflow)이 계산한 결과를 `DirectContainer`의 x/y/width/height props로 직접 배치합니다.
일반 PixiJS 컴포넌트에서는 x/y를 수동으로 설정하지 않습니다.

> **Phase 11 이후:** `@pixi/layout`(Yoga)이 완전 제거됨.
> PixiJS는 alpha=0 이벤트 전용 레이어이며, 시각적 렌더링은 CanvasKit/Skia가 담당.
> 레이아웃 엔진 결과를 `DirectContainer`의 props로 직접 전달하는 것이 유일한 배치 방법.

## Incorrect

```tsx
// ❌ 수동으로 x, y 계산하여 설정
<Container x={100} y={50}>
  <ElementSprite element={child} />
</Container>

// ❌ position 객체로 설정
<Sprite texture={tex} position={{ x: 10, y: 20 }} />

// ❌ 레이아웃 엔진 결과 무시하고 자체 좌표 계산
<Container x={parentX + offsetX} y={parentY + offsetY}>
  <ElementSprite element={child} />
</Container>
```

## Correct

```tsx
// ✅ DirectContainer: 레이아웃 엔진 계산 결과를 x/y/width/height로 직접 배치
<DirectContainer
  elementId={child.id}
  x={layout.x}
  y={layout.y}
  width={layout.width}
  height={layout.height}
>
  <ElementSprite element={child} />
</DirectContainer>

// ✅ PageContainer: 캔버스 상 페이지 위치 (엔진 외부, 예외 허용)
<PageContainer x={pagePosition.x} y={pagePosition.y}>
  <BodyLayer />
  <ElementsLayer />
</PageContainer>

// ✅ Non-layout 히트 영역: layout prop 없이 컨테이너 원점(0,0)에 배치
<pixiGraphics
  draw={drawContainerHitRect}
  eventMode="static"
  cursor="pointer"
  onPointerDown={handleContainerPointerDown}
/>
```

## 허용되는 x/y 사용 예외

| 상황 | 근거 |
|------|------|
| `DirectContainer` props | 레이아웃 엔진 결과 직접 적용 (이 패턴의 핵심) |
| `PageContainer` | 캔버스 상 페이지 배치 — 레이아웃 엔진 외부 |
| Selection 오버레이 | CanvasKit/Skia에서 직접 렌더링 |

## 금지되는 x/y 사용

| 상황 | 대안 |
|------|------|
| 요소 간 상대 배치 | `selectEngine()` → `engine.calculate()` 결과 사용 |
| 자식 요소 수동 offset | `DirectContainer`가 엔진 결과를 전달 |
| 시각적 보정 | Skia 렌더러에서 처리 (PixiJS는 이벤트 전용) |

> **참고**: PixiJS `renderable=false` 사용 금지 — PixiJS 8 EventBoundary가 히트 테스팅까지 비활성화함.
> alpha=0으로 시각적으로 숨기되 이벤트는 유지해야 함. [ADR-003](../../../../docs/adr/003-canvas-rendering.md) 참조.
>
> **레이아웃 엔진 상세:** [pixi-hybrid-layout-engine](pixi-hybrid-layout-engine.md), [ENGINE_UPGRADE.md](../../../../docs/ENGINE_UPGRADE.md) 참조.
