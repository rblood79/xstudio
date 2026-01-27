---
title: ComponentSpec Single Source of Truth
impact: HIGH
impactDescription: React/PIXI 간 일관성 보장, 중복 코드 제거
tags: [spec, architecture, component]
---

ComponentSpec은 React와 PIXI 렌더링의 **단일 소스**입니다. 컴포넌트 스타일/동작을 Spec에서만 정의합니다.

## Incorrect

```tsx
// ❌ React와 PIXI에서 각각 스타일 정의
// React 컴포넌트
const Button = ({ variant }) => (
  <button className={variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500'}>
    Click
  </button>
);

// PIXI 컴포넌트 - 동일한 로직 중복
const PixiButton = ({ variant }) => {
  const color = variant === 'primary' ? 0x3b82f6 : 0x6b7280;
  // ...
};
```

## Correct

```tsx
// ✅ ComponentSpec에서 단일 정의
// packages/specs/src/components/Button.spec.ts
export const ButtonSpec: ComponentSpec<ButtonProps> = {
  name: 'Button',
  variants: {
    primary: {
      background: '{color.primary}',
      text: '{color.on-primary}',
    },
    secondary: {
      background: '{color.secondary}',
      text: '{color.on-secondary}',
    },
  },
  render: {
    shapes: (props, variant, size, state) => [
      {
        type: 'roundRect',
        fill: variant.background,
        // ...
      },
    ],
  },
};

// React - Spec 사용
import { renderToReact } from '@xstudio/specs/renderers';
const Button = (props) => renderToReact(ButtonSpec, props);

// PIXI - 동일한 Spec 사용
import { renderToPixi } from '@xstudio/specs/renderers';
renderToPixi(ButtonSpec, props, context);
```

## 참조

- `docs/COMPONENT_SPEC_ARCHITECTURE.md` - 전체 설계 문서
- `packages/specs/src/components/Button.spec.ts` - 참조 구현
