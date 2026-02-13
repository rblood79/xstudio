---
title: Use isLeaf for Text Components
impact: HIGH
impactDescription: 텍스트 측정 정확성, 레이아웃 계산
tags: [pixi, layout, text]
---

Text 컴포넌트에 isLeaf={true}를 설정하여 레이아웃이 텍스트 크기를 올바르게 계산하도록 합니다.

## Incorrect

```tsx
// ❌ isLeaf 없이 Text 사용
<Container style={{ width: 'auto' }}>
  <Text text="Hello World" style={{ fontSize: 16 }} />
</Container>
// 컨테이너 크기가 0으로 계산될 수 있음

// ❌ 컨테이너로 Text 감싸기
<Container>
  <Container>
    <Text text="Nested" />
  </Container>
</Container>
```

## Correct

```tsx
// ✅ isLeaf로 텍스트 크기 측정 활성화
<Container style={{ width: 'auto', height: 'auto' }}>
  <Text
    text="Hello World"
    isLeaf={true}
    style={{
      fontSize: 16,
      fill: '#000000'
    }}
  />
</Container>

// ✅ PixiText 래퍼 컴포넌트 생성
interface PixiTextProps {
  text: string;
  fontSize?: number;
  color?: string;
}

function PixiText({ text, fontSize = 14, color = '#000' }: PixiTextProps) {
  return (
    <Text
      text={text}
      isLeaf={true}
      style={{
        fontSize,
        fill: color,
        fontFamily: 'Inter, sans-serif'
      }}
    />
  );
}
```

## TextSprite 투명 히트 영역 규칙

TextSprite는 `backgroundColor`가 없는 텍스트 요소에서도 클릭 선택이 가능하도록 **alpha: 0.001의 투명 사각형**으로 히트 영역을 확보합니다.

```tsx
// apps/builder/src/builder/workspace/canvas/sprites/TextSprite.tsx
const drawBackground = useCallback(
  (g: PixiGraphics) => {
    const hasBg = style?.backgroundColor && style.backgroundColor !== 'transparent';
    const hasVisual = hasBg || borderConfig || effectiveBorderRadius;

    if (hasVisual) {
      // 배경이 있으면 정상적으로 box 렌더링
      drawBox(g, { width, height, backgroundColor, ... });
    } else {
      // ✅ 배경이 없어도 투명 히트 영역을 그려서 클릭 선택 가능
      g.clear();
      g.rect(0, 0, transform.width, transform.height);
      g.fill({ color: 0xffffff, alpha: 0.001 });  // ← 거의 보이지 않지만 이벤트 수신 가능
    }
  },
  [style, transform, fill, effectiveBorderRadius, borderConfig]
);
```

**왜 필요한가**: PixiJS는 기본적으로 그래픽이 그려진 영역에서만 포인터 이벤트를 감지합니다. 배경색이 없는 텍스트 요소(Label, Heading 등)는 시각적 배경이 없으므로, 투명 사각형을 그리지 않으면 캔버스에서 텍스트를 클릭해도 선택되지 않습니다.

## useSkiaNode text spriteType skip 규칙

ElementSprite에서 `hasOwnSprite` 조건에 `'text'`가 포함되어 있으며, TextSprite가 자체적으로 Skia 렌더 데이터를 등록하므로 ElementSprite에서 box 데이터로 덮어쓰지 않아야 합니다.

```tsx
// apps/builder/src/builder/workspace/canvas/sprites/ElementSprite.tsx

// box/flex/grid 타입은 BoxSprite가 더 완전한 Skia 데이터를 등록하므로
// ElementSprite의 이중 등록을 방지한다.
// text 타입은 TextSprite가 자체적으로 텍스트 Skia 데이터를 등록하므로
// ElementSprite에서 box 데이터로 덮어쓰지 않도록 방지한다.
const hasOwnSprite = spriteType === 'box' || spriteType === 'text'
  || spriteType === 'flex' || spriteType === 'grid';
useSkiaNode(elementId, hasOwnSprite ? null : skiaNodeData);
```

**동작 원리**:
- `spriteType === 'text'`이면 `hasOwnSprite = true` -> `useSkiaNode(id, null)` 호출로 ElementSprite의 Skia 등록을 건너뜀
- TextSprite 내부에서 `useSkiaNode(element.id, skiaNodeData)` 호출하여 `type: 'text'` Skia 데이터를 직접 등록
- TextSprite의 Skia 데이터에는 폰트, 색상, 정렬, padding, textDecoration 등 텍스트 전용 정보가 포함됨
- ElementSprite에서 이를 box 데이터로 덮어쓰면 텍스트가 아닌 단순 사각형으로 렌더링되는 버그 발생

```tsx
// TextSprite가 직접 등록하는 Skia 데이터 (type: 'text')
const skiaNodeData = useMemo(() => ({
  type: 'text' as const,
  x: transform.x,
  y: transform.y,
  width: transform.width,
  height: transform.height,
  visible: true,
  text: {
    content: textContent,
    fontFamilies: [textStyle.fontFamily.split(',')[0].trim()],
    fontSize: textStyle.fontSize,
    fontWeight: numericFontWeight,
    fontStyle: numericFontStyle,
    color: Float32Array.of(r, g, b, 1),
    align: textStyle.align,
    letterSpacing: textStyle.letterSpacing,
    paddingLeft: padding.left,
    paddingTop: padding.top,
    maxWidth: transform.width - padding.left - padding.right,
  },
}), [...]);

useSkiaNode(element.id, skiaNodeData);  // ← TextSprite가 직접 등록
```

**skip 대상 spriteType 정리**:

| spriteType | Skia 등록 주체 | 이유 |
|------------|---------------|------|
| `box` | BoxSprite | effects, blendMode, 올바른 fillColor 포함 |
| `text` | TextSprite | 텍스트 전용 Skia 데이터 (font, align, decoration 등) |
| `flex` | BoxSprite | flex 컨테이너도 BoxSprite로 렌더링 |
| `grid` | BoxSprite | grid 컨테이너도 BoxSprite로 렌더링 |
| 나머지 | ElementSprite | spec shapes 기반 box 데이터 등록 |
