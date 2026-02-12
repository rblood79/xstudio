---
title: Shape-based Rendering Pattern
impact: HIGH
impactDescription: React/Skia 공통 렌더링 로직, 일관된 시각적 결과
tags: [spec, shape, rendering, skia]
---

ComponentSpec의 `render.shapes`는 **플랫폼 독립적 도형**을 반환합니다. React와 Skia 렌더러가 이를 각각 해석합니다.

## Incorrect

```tsx
// ❌ 렌더러별 직접 구현
// React
const Button = () => (
  <div style={{ borderRadius: 8, background: 'blue' }}>Click</div>
);

// PIXI - 별도 로직
const draw = (g: Graphics) => {
  g.roundRect(0, 0, 100, 40, 8);
  g.fill({ color: 0x0000ff });
};
```

## Correct

```tsx
// ✅ Shape 기반 정의 + props.style 오버라이드 패턴
const ButtonSpec: ComponentSpec<ButtonProps> = {
  render: {
    shapes: (props, variant, size, state = 'default') => {
      // props.style 우선, 없으면 state/variant 기본값
      const bgColor = props.style?.backgroundColor
                    ?? (state === 'hover' ? variant.backgroundHover
                    : state === 'pressed' ? variant.backgroundPressed
                    : variant.background);
      const textColor = props.style?.color ?? variant.text;
      const borderRadius = props.style?.borderRadius ?? size.borderRadius;
      const borderWidth = props.style?.borderWidth ?? 1;
      const paddingX = props.style?.paddingLeft ?? props.style?.padding ?? size.paddingX;
      const fontSize = props.style?.fontSize ?? size.fontSize;

      return [
        // 배경 (height: 'auto' 필수 — Yoga 레이아웃 높이 사용)
        {
          id: 'bg',
          type: 'roundRect',
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',   // ← 고정 높이 금지
          radius: borderRadius,
          fill: bgColor,
        },
        // 테두리
        {
          type: 'border',
          target: 'bg',
          borderWidth,
          color: props.style?.borderColor ?? variant.border,
        },
        // 텍스트
        {
          type: 'text',
          x: paddingX,       // ← padding 오버라이드 반영
          y: 0,
          text: props.children,
          fill: textColor,
          fontSize,
          fontWeight: props.style?.fontWeight ?? 500,
          fontFamily: props.style?.fontFamily ?? fontFamily.sans,
          align: props.style?.textAlign ?? 'center',
          baseline: 'middle',
        },
      ];
    },
  },
};

// React 렌더러가 Shape → JSX 변환
// Skia 렌더러: specShapesToSkia(shapes) → SkiaNodeData → nodeRenderers.ts
```

## Shape 타입

| 타입 | 용도 |
|------|------|
| `rect` | 사각형 |
| `roundRect` | 둥근 모서리 사각형 |
| `circle` | 원 |
| `text` | 텍스트 |
| `line` | 선분 (체크마크, 구분선 등) |
| `shadow` | 그림자 (배경 뒤) |
| `border` | 테두리 (배경 위) |
| `container` | 자식 요소 그룹 |
| `gradient` | 그라데이션 배경 (linear/radial) |

## 주의사항

- Shape의 `x`, `y`는 저수준 Graphics API용 (pixi-no-xy-props와 다른 컨텍스트)
- `width: 'auto'`, `height: 'auto'`는 컨테이너 크기에 맞춤
- **배경 roundRect의 `height`는 반드시 `'auto'`** — 고정 높이 사용 금지 (Yoga 레이아웃 높이와 불일치 발생)
- `state` 파라미터로 상태별 스타일 분기 (기본값: 'default')
- Spec `shapes()` 함수는 항상 row 레이아웃 좌표를 생성. column 방향에서는 `rearrangeShapesForColumn()`으로 좌표를 변환해야 함

### props.style 오버라이드 (2026-02-12)

모든 49개 spec의 `render.shapes()`는 시각 속성에서 `props.style` 인라인 스타일을 우선 참조합니다:

- **우선순위**: `props.style > state variant color > variant default > spec size default`
- **텍스트 padding**: `props.style?.paddingLeft ?? props.style?.padding ?? size.paddingX`
- **maxWidth 자동 감소**: `shape.x > 0`이고 `maxWidth` 미지정 시, center → `containerWidth - x*2`, left/right → `containerWidth - x`
- **safety clamp**: `maxWidth < 1`이면 `containerWidth`로 폴백 (padding=0 안전 처리)

## 참조

- `docs/COMPONENT_SPEC_ARCHITECTURE.md` - Shape 타입 정의
- `apps/builder/src/.../skia/specShapeConverter.ts` - Shape[] → SkiaNodeData 변환
- `apps/builder/src/.../sprites/ElementSprite.tsx` - getSpecForTag(), spec shapes 통합
- `apps/builder/src/.../skia/nodeRenderers.ts` - renderLine() 포함 Skia 렌더
