---
title: Absolute Position for Interactive Hit Areas
impact: HIGH
impactDescription: 이벤트 처리 정확성, 클릭 영역 제어
tags: [pixi, layout, interaction]
---

클릭 가능한 오버레이나 히트 영역은 position: 'absolute'를 사용합니다.

## Incorrect

```tsx
// ❌ 일반 레이아웃으로 히트 영역 배치
<Container style={{ flexDirection: 'column' }}>
  <PixiButton label="Button" />
  <Container
    interactive={true}
    onPointerDown={handleResize}
    style={{ width: 10, height: 10 }}  // 위치 제어 불가
  />
</Container>
```

## Correct

```tsx
// ✅ 절대 위치로 히트 영역 배치
<Container style={{ position: 'relative', width: 200, height: 100 }}>
  {/* 메인 콘텐츠 */}
  <PixiButton label="Button" />

  {/* 리사이즈 핸들 - 우하단 */}
  <Container
    interactive={true}
    cursor="se-resize"
    onPointerDown={handleResizeStart}
    style={{
      position: 'absolute',
      right: -5,
      bottom: -5,
      width: 10,
      height: 10
    }}
  />

  {/* 드래그 영역 - 전체 */}
  <Container
    interactive={true}
    cursor="move"
    onPointerDown={handleDragStart}
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      right: 0,
      bottom: 0
    }}
  />
</Container>
```

## Container-only 패턴 (ToggleButtonGroup 등)

자식이 형제(sibling)로 렌더링되는 컴포넌트는 `pixiGraphics`를 직접 반환하여 hit area를 제공합니다.

```tsx
// ✅ Container-only: pixiGraphics 직접 반환 (BoxSprite 패턴)
// - layout 속성 없음 → Yoga flex에 미참여 (자식과 경쟁 없음)
// - LayoutComputedSizeContext로 Yoga 계산 크기 사용
const computedSize = useContext(LayoutComputedSizeContext);

// ⚠️ computedSize.height가 0일 수 있음 → ?? 대신 > 0 체크 필수
const bgWidth = (computedSize?.width && computedSize.width > 0)
  ? computedSize.width : fallbackWidth;

return (
  <pixiGraphics
    draw={drawBackground}
    eventMode="static"
    cursor="pointer"
    onPointerDown={handleClick}
  />
);
```

**주의사항:**
- `??` 연산자는 `0`을 falsy로 취급하지 않음 → `computedSize.height === 0`이면 `bgHeight = 0` → hit area 없음
- `position: absolute` pixiContainer 래퍼는 PixiJS EventBoundary에서 올바른 hit area를 가지지 못할 수 있음
- `eventMode="none"`인 pixiGraphics는 클릭이 관통됨 — 반드시 `eventMode="static"` 설정
