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

// Skia - 동일한 Spec 사용 (ElementSprite.tsx)
import { specShapesToSkia } from '../skia/specShapeConverter';
const shapes = ButtonSpec.render.shapes(props, variant, size, state);
const skiaNode = specShapesToSkia(shapes, theme, width, height);
// → nodeRenderers.ts → CanvasKit Canvas API
```

## Self-Rendering 컴포넌트 레이아웃 규칙

Button 등 self-rendering 컴포넌트는 Spec 기본값과 inline style이 올바르게 분리되어야 합니다:

- `calculateContentWidth()` → 순수 텍스트 너비만 반환 (padding/border 미포함)
- `parseBoxModel()` → inline style이 없으면 `BUTTON_SIZE_CONFIG` 기본값 적용
- `PixiButton` → `specDefaultBorderWidth = 1` (CSS base `border: 1px solid`와 동기화)
- 모든 variant에 `border`/`borderHover` 정의 필요 (CSS가 모든 variant에 border 적용하므로)

**Note**: PixiButton 등 Pixi*.tsx 컴포넌트는 이벤트 처리(alpha=0) 전용. 실제 화면 렌더링은 `ElementSprite.tsx`의 `getSpecForTag()` → `specShapesToSkia()` 경로를 사용.

## 참조

- `docs/COMPONENT_SPEC_ARCHITECTURE.md` - 전체 설계 문서 (§4.7.4.4~4.7.4.8)
- `packages/specs/src/components/Button.spec.ts` - 참조 구현
- `apps/builder/src/.../skia/specShapeConverter.ts` - Shape[] → SkiaNodeData 변환
- `apps/builder/src/.../sprites/ElementSprite.tsx` - getSpecForTag() + TAG_SPEC_MAP
- [spec-build-sync](spec-build-sync.md) - Spec 수정 후 빌드 필수
- [spec-value-sync](spec-value-sync.md) - Spec ↔ Builder ↔ CSS 값 동기화
