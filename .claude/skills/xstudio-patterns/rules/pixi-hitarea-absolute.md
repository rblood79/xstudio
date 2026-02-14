---
title: Absolute Position for Interactive Hit Areas
impact: HIGH
impactDescription: 이벤트 처리 정확성, 클릭 영역 제어
tags: [pixi, layout, interaction, yoga]
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

## Non-layout 히트 영역 패턴 (padding이 있는 컨테이너)

### 문제: Yoga 3 absolute positioning + padding

@pixi/layout은 Yoga 3 (`yoga-layout ^3.2.1`)을 사용한다. Yoga 3의 기본 errata 동작에서 `position: 'absolute'`이고 `left`/`top` inset이 명시된 자식은 부모의 **content 영역 원점**(paddingLeft, paddingTop)을 기준으로 배치된다:

```
Container (padding: 16px)
┌────────────────────────┐  ← border-box 원점 (0, 0)
│  padding               │
│  ┌──────────────────┐  │  ← content 영역 원점 (16, 16)
│  │ absolute 자식     │  │  ← left:0, top:0이 (16, 16)으로 오프셋됨
│  └──────────────────┘  │
│                        │  ← padding 영역에 히트 영역 없음!
└────────────────────────┘
```

BoxSprite(배경/테두리)가 absolute로 배치되면 padding 영역에 히트 영역이 없어 클릭 불가.

### 해결: layout prop이 없는 pixiGraphics

```tsx
// ✅ Non-layout 히트 영역: 컨테이너 원점(0,0)에 전체 Yoga 크기(padding 포함) 커버
<>
  {/* layout prop 없음 → Yoga가 무시 → 부모 원점(0,0)에 배치 */}
  <pixiGraphics
    draw={drawContainerHitRect}
    eventMode="static"
    cursor="pointer"
    onPointerDown={handleContainerPointerDown}
  />
  {/* BoxSprite: absolute 배치 (시각적 역할) */}
  <pixiContainer layout={{ position: 'absolute' as const, left: 0, top: 0, right: 0, bottom: 0 }}>
    <BoxSprite element={effectiveElement} isSelected={isSelected} onClick={onClick} />
  </pixiContainer>
  {/* 자식 요소들 */}
  {childElements.map((childEl) => renderChildElement(childEl))}
</>
```

```tsx
// ❌ 잘못된 패턴: absolute BoxSprite만으로 히트 영역 처리
// padding이 있으면 content 영역으로 오프셋되어 padding 영역 클릭 불가
<>
  <pixiContainer layout={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
    <BoxSprite element={element} onClick={onClick} />
  </pixiContainer>
  {childElements.map((childEl) => renderChildElement(childEl))}
</>
```

### drawContainerHitRect 구현

```typescript
const drawContainerHitRect = useCallback(
  (g: PixiGraphics) => {
    g.clear();
    const w = computedW ?? 0;  // LayoutComputedSizeContext → Yoga border-box 크기
    const h = computedH ?? 0;
    if (w <= 0 || h <= 0) return;
    g.rect(0, 0, w, h);
    const debug = isDebugHitAreas();
    g.fill(debug
      ? { color: DEBUG_HIT_AREA_COLORS.box.color, alpha: DEBUG_HIT_AREA_COLORS.box.alpha }
      : { color: 0xffffff, alpha: 0.001 });
  },
  [computedW, computedH],
);
```

### 적용 대상

자식 요소가 있는 모든 컨테이너 (`box`, `flex`, `grid` spriteType):
Card, Box, Panel, Form, Group, Dialog, Modal, Disclosure, DisclosureGroup, Accordion, ToggleButtonGroup, TagGroup, TagList

### 디버그

`.env`에 `VITE_DEBUG_HIT_AREAS=true` 설정 시 히트 영역을 반투명 색상으로 시각화.

**관련:** ADR-003 "컨테이너 히트 영역 Non-Layout 패턴 (2026-02-14)" 참조.
