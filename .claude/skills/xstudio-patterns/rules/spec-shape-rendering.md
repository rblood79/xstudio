---
title: Shape-based Rendering Pattern
impact: HIGH
impactDescription: React/PIXI 공통 렌더링 로직, 일관된 시각적 결과
tags: [spec, shape, rendering, pixi]
---

ComponentSpec의 `render.shapes`는 **플랫폼 독립적 도형**을 반환합니다. React와 PIXI 렌더러가 이를 각각 해석합니다.

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
// ✅ Shape 기반 정의
const ButtonSpec: ComponentSpec<ButtonProps> = {
  render: {
    shapes: (props, variant, size, state = 'default') => {
      // 상태에 따른 색상 결정
      const bgColor = state === 'hover' ? variant.backgroundHover
                    : state === 'pressed' ? variant.backgroundPressed
                    : variant.background;

      return [
        // 배경
        {
          type: 'roundRect',
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          radius: size.radius,
          fill: bgColor,
        },
        // 텍스트
        {
          type: 'text',
          content: props.children,
          fill: variant.text,
          fontSize: size.fontSize,
          fontWeight: size.fontWeight,
          align: 'center',
        },
      ];
    },
  },
};

// React 렌더러가 Shape → JSX 변환
// PIXI 렌더러가 Shape → Graphics API 호출
```

## Shape 타입

| 타입 | 용도 |
|------|------|
| `rect` | 사각형 |
| `roundRect` | 둥근 모서리 사각형 |
| `circle` | 원 |
| `text` | 텍스트 |
| `shadow` | 그림자 (배경 뒤) |
| `border` | 테두리 (배경 위) |
| `container` | 자식 요소 그룹 |

## 주의사항

- Shape의 `x`, `y`는 저수준 Graphics API용 (pixi-no-xy-props와 다른 컨텍스트)
- `width: 'auto'`, `height: 'auto'`는 컨테이너 크기에 맞춤
- `state` 파라미터로 상태별 스타일 분기 (기본값: 'default')

## 참조

- `docs/COMPONENT_SPEC_ARCHITECTURE.md` - Shape 타입 정의
- `packages/specs/src/renderers/PixiRenderer.ts` - PIXI 렌더링 구현
