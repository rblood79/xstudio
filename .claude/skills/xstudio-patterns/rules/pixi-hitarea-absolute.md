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
