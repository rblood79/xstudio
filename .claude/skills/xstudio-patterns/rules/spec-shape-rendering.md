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
        // 배경 (height: 'auto' 필수 -- Yoga 레이아웃 높이 사용)
        {
          id: 'bg',
          type: 'roundRect',
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',   // <- 고정 높이 금지
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
          x: paddingX,       // <- padding 오버라이드 반영
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

// React 렌더러가 Shape -> JSX 변환
// Skia 렌더러: specShapesToSkia(shapes) -> SkiaNodeData -> nodeRenderers.ts
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
- **배경 roundRect의 `width`와 `height`는 반드시 `'auto'`** -- `props.style?.width` 사용 금지
- `state` 파라미터로 상태별 스타일 분기 (기본값: 'default')
- Spec `shapes()` 함수는 항상 row 레이아웃 좌표를 생성. column 방향에서는 `rearrangeShapesForColumn()`으로 좌표를 변환해야 함

### 배경 roundRect width/height 규칙 (CRITICAL)

`specShapesToSkia`는 첫 번째 roundRect/rect에서 bgBox를 추출할 때 **`shape.width === 'auto' && shape.height === 'auto'`** 조건을 사용합니다. `props.style?.width`를 배경 roundRect에 사용하면 사용자가 px/% 크기를 설정할 때 숫자 값이 되어 bgBox 추출이 실패하고 배경이 렌더링되지 않습니다.

```typescript
// ❌ 배경 roundRect에 props.style?.width 사용 금지
const width = (props.style?.width as number) || 'auto';
// → 사용자가 width: 200px 설정 시 width = 200 → bgBox 추출 실패

// ✅ 배경 roundRect는 항상 'auto' 사용
const width = 'auto' as const;
// → specShapesToSkia가 containerWidth로 대체하여 bgBox 정상 추출
```

**영향 범위**: Button, Section, ToggleButton, Card, Form, List, FancyButton, ScrollBox, MaskedFrame 등 모든 spec의 배경 roundRect

### props.style 오버라이드 (2026-02-12)

모든 49개 spec의 `render.shapes()`는 시각 속성에서 `props.style` 인라인 스타일을 우선 참조합니다:

- **우선순위**: `props.style > state variant color > variant default > spec size default`
- **텍스트 padding**: `props.style?.paddingLeft ?? props.style?.padding ?? size.paddingX`
- **maxWidth 자동 감소**: `shape.x > 0`이고 `maxWidth` 미지정 시, center -> `containerWidth - x*2`, left/right -> `containerWidth - x`
- **safety clamp**: `maxWidth < 1`이면 `containerWidth`로 폴백 (padding=0 안전 처리)

## TagGroup/TagList: TAG_SPEC_MAP 제거 -> CONTAINER_TAGS 전환 (2026-02-13)

TagGroup과 TagList는 기존에 TAG_SPEC_MAP에 등록되어 spec shapes로 렌더링되었으나, 이제 **CONTAINER_TAGS로 전환**되어 자식 요소를 내부에서 직접 렌더링하는 컨테이너 방식으로 변경되었습니다.

### 변경 이유

TagGroup/TagList는 웹 CSS의 flex container 구조와 동일하게 동작해야 합니다:
- **TagGroup**: `flexDirection: column` -- Label과 TagList를 세로로 배치
- **TagList**: `flexDirection: row, flexWrap: wrap` -- Tag 칩들을 가로로 배치하되 줄바꿈 허용

spec shapes는 고정된 시각 도형을 반환하므로 자식 요소의 동적 배치(wrap, 줄바꿈)를 처리할 수 없습니다. CONTAINER_TAGS로 등록하면 Yoga 레이아웃 엔진이 자식 요소를 실제 flex 규칙에 따라 배치합니다.

### 코드 변경

```typescript
// apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx

// CONTAINER_TAGS에 추가 (자식을 내부에서 렌더링하는 컨테이너 태그)
const CONTAINER_TAGS = useMemo(() => new Set([
  'Card', 'Box', 'Panel', 'Form', 'Group', 'Dialog', 'Modal',
  'Disclosure', 'DisclosureGroup', 'Accordion',
  'ToggleButtonGroup',
  'TagGroup', 'TagList',  // <- 웹 CSS 구조 동일: TagGroup (column) -> Label + TagList (row wrap) -> Tags
]), []);

// TAG_SPEC_MAP에서는 TagGroup, TagList 항목이 제거됨
// (ElementSprite.tsx의 TAG_SPEC_MAP에 해당 태그 없음)
```

## isYogaSizedContainer 패턴 (2026-02-13)

ToggleButtonGroup, TagGroup, TagList는 `isYogaSizedContainer`로 분류되어, Yoga가 자식 크기에 맞춰 컨테이너 크기를 자동 계산합니다.

### 대상 태그

| 태그 | 레이아웃 | 설명 |
|------|---------|------|
| `ToggleButtonGroup` | row | 자식 ToggleButton 너비 합산 |
| `TagGroup` | column | Label + TagList 높이 합산 |
| `TagList` | row wrap | Tag 칩들의 가로 배치 + 줄바꿈 |

### 동작 방식

```typescript
// apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx

const isToggleButtonGroup = child.tag === 'ToggleButtonGroup';
const isFlexContainerTag = child.tag === 'TagGroup' || child.tag === 'TagList';
const isYogaSizedContainer = isToggleButtonGroup || isFlexContainerTag;

// Yoga 크기 결정 컨테이너: 명시적 width 설정 여부에 따라 분기
const hasExplicitWidth = isYogaSizedContainer && childStyle?.width !== undefined
  && childStyle.width !== 'fit-content';

const containerWidthOverride = isYogaSizedContainer
  ? hasExplicitWidth
    ? { width: layout.width }                                        // 명시적 width -> BlockEngine 계산값
    : { width: 'auto', flexGrow: 0, flexShrink: 0 }                 // 기본 -> Yoga 자동 계산
  : { width: layout.width };
```

**핵심 규칙**:
- `width: 'auto'` + `flexGrow: 0` + `flexShrink: 0` = Yoga가 자식 요소의 intrinsic 크기를 기반으로 컨테이너 크기를 결정
- `flexGrow: 0`은 남은 공간을 차지하지 않도록 방지
- `flexShrink: 0`은 부모 공간이 부족해도 자식 크기를 축소하지 않도록 방지
- `height: 'auto'`로 항상 설정되며, `minHeight`도 적용하지 않음 (`isYogaSizedContainer ? {} : { minHeight: layout.height }`)
- 사용자가 명시적으로 `width: '100%'` 등을 설정한 경우에는 BlockEngine이 계산한 `layout.width`를 사용

## 참조

- `docs/COMPONENT_SPEC_ARCHITECTURE.md` - Shape 타입 정의
- `apps/builder/src/.../skia/specShapeConverter.ts` - Shape[] -> SkiaNodeData 변환
- `apps/builder/src/.../sprites/ElementSprite.tsx` - getSpecForTag(), spec shapes 통합, TAG_SPEC_MAP
- `apps/builder/src/.../skia/nodeRenderers.ts` - renderLine() 포함 Skia 렌더
- `apps/builder/src/.../canvas/BuilderCanvas.tsx` - CONTAINER_TAGS, isYogaSizedContainer 정의
