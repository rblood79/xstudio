---
title: Non-layout Container Hit Rect for Padded Containers
impact: CRITICAL
impactDescription: 컨테이너 요소 선택 불가 버그 방지, 히트 영역 정확성
tags: [pixi, layout, interaction, container, yoga, hit-area]
---

Yoga 3의 absolute positioning이 부모 padding만큼 자식을 offset하기 때문에, padding이 있는 컨테이너(CONTAINER_TAGS)에서 `position: absolute` BoxSprite의 히트 영역이 컨테이너 실제 bounds와 불일치합니다. **`layout` prop 없는 `pixiGraphics`를 컨테이너 첫 번째 자식으로 추가**하여 해결합니다.

## 문제

CONTAINER_TAGS(TagGroup, TagList, Card 등)가 flex/grid 레이아웃을 사용하고 padding이 있을 때:

1. BoxSprite는 `<pixiContainer layout={{ position: 'absolute', ... }}>` 안에 배치됨
2. Yoga 3이 absolute 자식을 부모 padding 안쪽으로 offset함
3. BoxSprite의 히트 영역이 padding 영역을 커버하지 못함
4. 결과: 컨테이너의 padding 영역 클릭 시 요소 선택 불가

```
┌─────────────────────────────┐  ← 컨테이너 실제 bounds (padding 포함)
│  padding                    │
│  ┌─────────────────────┐    │
│  │  BoxSprite 히트 영역  │    │  ← Yoga가 absolute 자식을 padding만큼 offset
│  │                     │    │
│  └─────────────────────┘    │
│         클릭 불가 영역 ↑      │
└─────────────────────────────┘
```

## 핵심 원리

`@pixi/layout`에서 `layout` prop이 없는 자식 노드는 Yoga 레이아웃 계산에서 **완전히 무시**됩니다. 따라서:

- Yoga가 위치를 offset하지 않음 → 컨테이너 로컬 원점 `(0, 0)`에 고정
- `computedW x computedH` (padding 포함된 Yoga 계산 크기)로 rect를 그리면 컨테이너 전체 bounds를 정확히 커버
- 기존 레이아웃에 영향 없음

## Incorrect

```tsx
// ❌ pixiContainer absolute 래퍼만 사용 → padding 영역에 히트 영역 없음
<>
  <pixiContainer layout={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
    <BoxSprite
      computedW={computedW}
      computedH={computedH}
      eventMode="static"
      cursor="pointer"
      onPointerDown={handleContainerPointerDown}
    />
  </pixiContainer>
  {childElements.map(...)}
</>
```

## Correct

```tsx
// ✅ Non-layout pixiGraphics를 첫 번째 자식으로 추가
// - layout prop 없음 → Yoga 무시 → 컨테이너 원점(0,0) 고정
// - computedW x computedH로 전체 bounds 커버

// Hook (조건부 return 전에 선언 필수):
const drawContainerHitRect = useCallback(
  (g: PixiGraphics) => {
    g.clear();
    const w = computedW ?? 0;
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

// JSX (flex/grid/box 컨테이너에서 childElements가 있을 때):
<>
  <pixiGraphics
    draw={drawContainerHitRect}
    eventMode="static"
    cursor="pointer"
    onPointerDown={handleContainerPointerDown}
  />
  <pixiContainer layout={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
    <BoxSprite ... />
  </pixiContainer>
  {childElements.map(...)}
</>
```

## 적용 위치

- **파일**: `ElementSprite.tsx`의 flex/grid/box 컨테이너 렌더링 케이스
- **조건**: `childElements.length > 0`인 컨테이너 (CONTAINER_TAGS)
- **새 컨테이너 타입 추가 시**: 반드시 이 패턴을 적용해야 padding이 있는 컨테이너에서 클릭이 정상 동작함

## 디버그

`VITE_DEBUG_HIT_AREAS=true` 환경변수로 히트 영역을 시각적으로 확인할 수 있습니다. 활성화 시 `DEBUG_HIT_AREA_COLORS`에 정의된 색상으로 히트 영역이 반투명하게 표시됩니다.

```bash
# .env.local
VITE_DEBUG_HIT_AREAS=true
```

## 체크리스트

새 CONTAINER_TAG 추가 시 확인사항:

- [ ] `drawContainerHitRect` hook이 조건부 return 전에 선언되어 있는가?
- [ ] `<pixiGraphics>`에 `layout` prop이 **없는가**? (있으면 Yoga가 offset 적용)
- [ ] `eventMode="static"`이 설정되어 있는가?
- [ ] `onPointerDown` 핸들러가 연결되어 있는가?
- [ ] `computedW`, `computedH`가 Yoga 계산 크기(padding 포함)를 사용하는가?
- [ ] 디버그 모드에서 히트 영역이 컨테이너 전체를 커버하는지 확인했는가?
