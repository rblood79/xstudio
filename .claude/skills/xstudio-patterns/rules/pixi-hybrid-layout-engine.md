---
title: Use Correct Display Mode for Hybrid Layout Engine
impact: CRITICAL
impactDescription: 올바른 레이아웃 엔진 선택, CSS 호환 배치
tags: [pixi, layout, canvas, hybrid-engine]
---

하이브리드 레이아웃 엔진은 `display` 값에 따라 자동으로 엔진을 선택합니다.
올바른 display를 지정해야 CSS와 동일한 배치 결과를 얻을 수 있습니다.

### 엔진 선택 규칙

| display 값 | 엔진 | 설명 |
|------------|------|------|
| `block` (기본값) | DropflowBlockEngine | 수직 쌓임, width 100%, margin collapse |
| `inline-block` | DropflowBlockEngine | 가로 배치, 줄바꿈, vertical-align |
| `inline` | DropflowBlockEngine | 인라인 포매팅 |
| `flow-root` | DropflowBlockEngine | BFC 생성 (margin collapse 차단) |
| `flex`, `inline-flex` | TaffyFlexEngine (Taffy WASM) | Flexbox 레이아웃 |
| `grid`, `inline-grid` | TaffyGridEngine (Taffy WASM) | 2D 그리드 레이아웃 |

### WASM 활성화 요구사항

Taffy 엔진은 Rust WASM이 로드되어야 활성화됩니다:

- `WASM_FLAGS.LAYOUT_ENGINE`이 `true`여야 `initRustWasm()` 호출
- `isRustWasmReady()`가 `true`일 때만 TaffyFlexEngine/TaffyGridEngine 사용
- WASM 미로드 시 모든 display 모드가 DropflowBlockEngine으로 안전 폴백

```typescript
// engines/index.ts — WASM 폴백 예시
export function selectEngine(display: string | undefined): LayoutEngine {
  const wasmReady = isRustWasmReady();
  switch (display) {
    case 'flex':
    case 'inline-flex':
      return wasmReady ? taffyFlexEngine : dropflowBlockEngine;
    // ...
  }
}
```

### 지원 CSS 속성

- **Box Model**: `boxSizing`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`
- **Intrinsic Sizing**: `width: fit-content` (FIT_CONTENT sentinel, Block/Flex 양쪽 지원)
- **Overflow/BFC**: `overflow`, `overflowX`, `overflowY`
- **Typography**: `lineHeight`, `verticalAlign`
- **Visibility**: `visibility: hidden` (공간 유지, 렌더링 안 함)
- **Grid 자식**: `alignSelf`, `justifySelf`

### fit-content 처리 규칙

`width: fit-content`는 두 가지 경로에서 처리됩니다:

| 경로 | 처리 방식 |
|------|-----------|
| DropflowBlockEngine | `FIT_CONTENT = -2` sentinel → `contentWidth` 사용 |
| TaffyFlexEngine (Taffy WASM) | Taffy가 `width:auto` + Yoga wrapper에서 `flexGrow:0 + flexShrink:0` |
| TaffyGridEngine (Taffy WASM) | Taffy가 `width:auto` 처리 |

```typescript
// ✅ parseSize가 'fit-content' → FIT_CONTENT(-2) 반환
// DropflowBlockEngine: contentWidth 기반 크기 계산
// TaffyFlexEngine: auto + flexGrow:0 + flexShrink:0로 에뮬레이션

// ❌ fit-content를 수동으로 auto나 px로 변환하지 말 것
```

### fit-content와 alignSelf 독립성

CSS에서 `width: fit-content`와 `align-self`는 완전히 독립적인 속성입니다.
Yoga 워크어라운드에서 `alignSelf: 'flex-start'`를 강제 설정하면 부모의 `align-items`가 무시됩니다.

```typescript
// ✅ fit-content 워크어라운드: flexGrow/flexShrink만 설정
// alignSelf는 설정하지 않음 → 부모의 align-items가 교차축 정렬 결정
if (width === undefined && !isFitContentWidth) {
  layout.flexGrow = 0;
  layout.flexShrink = 0;
}

// ❌ alignSelf 강제 설정 → 부모의 align-items: center 등이 무시됨
if (width === undefined && !isFitContentWidth) {
  layout.flexGrow = 0;
  layout.flexShrink = 0;
  layout.alignSelf = 'flex-start'; // 부모 align-items 덮어씀!
}
```

## Incorrect

```tsx
// ❌ block 의도인데 flex로 워크어라운드
<Container style={{
  display: 'flex',
  flexDirection: 'column',
}}>
  <Container style={{ height: 100, marginBottom: 20 }} />
  <Container style={{ height: 100, marginTop: 30 }} />
  {/* flex에서는 margin collapse 안 됨 → 간격 50px */}
</Container>

// ❌ grid 자식에 flex용 alignSelf 사용
<Container style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
  <Container style={{ alignSelf: 'flex-end' }} />
</Container>

// ❌ blockification 무시 (flex 부모의 inline-block 자식)
<Container style={{ display: 'flex' }}>
  <Container style={{ display: 'inline-block', width: 100 }} />
  {/* flex/grid 부모의 자식은 자동 blockify → inline-block이 block으로 변환됨 */}
</Container>
```

## Correct

```tsx
// ✅ block 레이아웃: 수직 쌓임 + margin collapse
<Container style={{ display: 'block' }}>
  <Container style={{ height: 100, marginBottom: 20 }} />
  <Container style={{ height: 100, marginTop: 30 }} />
  {/* margin collapse → 간격 30px (큰 값) */}
</Container>

// ✅ inline-block: 가로 배치 + 줄바꿈
<Container style={{ display: 'block' }}>
  <Container style={{ display: 'inline-block', width: 150, height: 50 }} />
  <Container style={{ display: 'inline-block', width: 150, height: 80 }} />
  {/* 부모 너비에 따라 자동 줄바꿈, vertical-align 적용 */}
</Container>

// ✅ grid 자식에 올바른 self 정렬
<Container style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
  <Container style={{ justifySelf: 'center', alignSelf: 'end' }} />
</Container>

// ✅ BFC로 margin collapse 차단
<Container style={{ display: 'block' }}>
  <Container style={{ height: 100, marginBottom: 20 }} />
  <Container style={{ overflow: 'hidden', height: 100, marginTop: 30 }} />
  {/* BFC 요소는 margin collapse 안 함 → 간격 50px */}
</Container>

// ✅ box-sizing: border-box
<Container style={{
  width: 200,
  padding: 20,
  boxSizing: 'border-box',
  // content width = 200 - 40 = 160px
}} />
```

## Box Model 처리

### availableWidth 계산: padding + border 차감

`renderWithCustomEngine`에서 부모의 content-box 크기를 계산할 때 **padding과 border 모두 차감** 필수:

```typescript
// ✅ availableWidth = 부모 크기 - padding - border
const parentPadding = parsePadding(parentStyle);
const parentBorder = parseBorder(parentStyle);
const availableWidth = pageWidth
  - parentPadding.left - parentPadding.right
  - parentBorder.left - parentBorder.right;
```

### 자식 offset: padding만 적용 (border 제외)

⚠️ Yoga(@pixi/layout)가 `position: absolute` 자식을 padding box 내에 자동 배치하므로, **border offset을 추가하면 이중 적용**:

```typescript
// ✅ padding만 적용 (Yoga가 border offset 자동 처리)
left: layout.x + parentPadding.left,
top: layout.y + parentPadding.top,

// ❌ border 추가 → 이중 적용 (borderWidth만큼 여백 발생)
left: layout.x + parentPadding.left + parentBorder.left,
```

### Flex parent passthrough (center/alignment)

부모가 명시적 `display: flex`일 때, Yoga wrapper에 부모의 flex 속성을 전달하여 center/alignment가 올바르게 동작합니다:

```typescript
// ✅ isParentExplicitFlex일 때 부모 flex 속성을 wrapper에 전달
const parentFlexProps = isParentExplicitFlex ? {
  flexDirection: parentStyle?.flexDirection ?? 'row',
  justifyContent: parentStyle?.justifyContent,
  alignItems: parentStyle?.alignItems,
  gap: parentStyle?.gap,
} : {};

// ❌ 항상 flexDirection: column, alignItems: flex-start 강제
// → 부모의 justify-content: center, align-items: center가 무시됨
```

### 퍼센트 크기 해석 (resolveLayoutSize)

`width: '100%'` 등 퍼센트 문자열은 `resolveLayoutSize()` 헬퍼로 부모 크기 기준 해석:

```typescript
// ✅ resolveLayoutSize로 퍼센트 값 해석
resolveLayoutSize(containerLayout.width, parentWidth)
// '100%' + parentWidth=800 → 800

// ❌ typeof 체크로 0 폴백
typeof containerLayout.width === 'number' ? containerLayout.width : 0
// '100%' → 0 (문자열이므로)
```

### content-box 기준 높이 계산

`calculateContentHeight`는 **순수 텍스트 높이만 반환**, padding/border는 호출 측(DropflowBlockEngine)에서 합산:

```typescript
// ✅ contentHeight = 텍스트 높이만
// MIN_BUTTON_HEIGHT는 border-box → content-box 변환 후 비교
const minContentHeight = Math.max(0, MIN_BUTTON_HEIGHT - paddingY * 2 - borderWidth * 2);
return Math.max(textHeight, minContentHeight);

// ❌ padding 포함 → DropflowBlockEngine에서 이중 계산
return Math.max(paddingY * 2 + textHeight, MIN_BUTTON_HEIGHT);
```

### 폼 요소 자동 border-box (`treatAsBorderBox`)

`button`, `input`, `select`에 명시적 `width`/`height` 설정 시 **border-box로 취급** — `parseBoxModel`이 padding+border를 자동 차감:

```typescript
// ✅ parseBoxModel 내부 — 폼 요소는 명시적 크기를 border-box로 해석
const treatAsBorderBox = boxSizing === 'border-box' ||
  (isFormElement && (width !== undefined || height !== undefined));

if (treatAsBorderBox && width !== undefined) {
  width = Math.max(0, width - paddingH - borderH);  // content-box로 변환
}
```

### CONTAINER_TAGS + inline-block 컴포넌트 Selection 크기

CONTAINER_TAGS(Card, Panel, ToggleButtonGroup 등)는 `renderWithCustomEngine`에서 `containerLayout.width = layout.width`로 Yoga LayoutContainer에 DropflowBlockEngine 계산 결과를 전달합니다.

**문제**: inline-block인 CONTAINER_TAG 컴포넌트의 `contentWidth`가 정확하지 않으면 selection bounds가 잘못됨.

```typescript
// ✅ ToggleButtonGroup: 명시적 width 설정 여부에 따라 분기
// - 명시적 width (100%, 200px 등): DropflowBlockEngine이 계산한 layout.width 사용
// - 기본값 (fit-content/미지정): Yoga가 자식 크기에 맞춰 자동 계산
const hasExplicitWidth = isToggleButtonGroup && childStyle?.width !== undefined
  && childStyle.width !== 'fit-content';
const toggleGroupWidthOverride = isToggleButtonGroup
  ? hasExplicitWidth
    ? { width: layout.width }
    : { width: 'auto', flexGrow: 0, flexShrink: 0 }
  : { width: layout.width };

// ❌ 무조건 'auto' 오버라이드 → width: 100% 등 명시적 설정이 무시됨
const toggleGroupWidthOverride = isToggleButtonGroup
  ? { width: 'auto', flexGrow: 0, flexShrink: 0 }
  : { width: layout.width };
```

**calculateContentWidth에 컴포넌트별 분기 필요**:
`engines/utils.ts`의 `calculateContentWidth()`에서 `props.items` 등 컴포넌트 고유 데이터를 기반으로 실제 콘텐츠 폭을 계산해야 합니다.

### 스타일 패널 display 기본값 (styleAtoms)

`styleAtoms.ts`의 layout atoms는 `getLayoutDefault()` 4단계 우선순위를 따릅니다:
1. inline style → 2. computed style → 3. `DEFAULT_CSS_VALUES[tag]` → 4. global default

```typescript
// ✅ DEFAULT_CSS_VALUES에 컴포넌트별 CSS 기본값 등록
ToggleButtonGroup: { width: 'fit-content', display: 'flex', flexDirection: 'row', alignItems: 'center' }

// ❌ atom에서 하드코딩된 'block' 폴백만 사용
// → 런타임 기본값이 스타일 패널에 반영되지 않음
```

### Factory 정의와 getDefaultProps style 동기화

복합 컴포넌트(children 포함)는 `ComponentFactory` → `factories/definitions/*.ts`로 생성됩니다.
**factory 정의의 `props.style`은 `unified.types.ts`의 `createDefaultXxxProps()` style과 반드시 일치**해야 합니다.

```typescript
// ✅ factory 정의에 CSS 기본값 style 포함
// GroupComponents.ts
{
  tag: "ToggleButtonGroup",
  props: {
    style: { display: "flex", flexDirection: "row", alignItems: "center", width: "fit-content" },
    // ...
  }
}

// ❌ factory 정의에 style 누락 → 생성 시 기본값 미적용
// → 리셋 버튼 클릭 후에만 기본값이 적용되는 버그 발생
{
  tag: "ToggleButtonGroup",
  props: {
    variant: "default",
    // style이 없음!
  }
}
```

**검증 방법**: `unified.types.ts`에서 style이 있는 `createDefaultXxxProps`와 대응하는 factory 정의의 style이 일치하는지 확인.

### 인라인 폼 컨트롤 크기 계산

Checkbox, Radio, Switch, Toggle은 DropflowBlockEngine에서 `inline-block`으로 처리됩니다.
`calculateContentHeight`/`calculateContentWidth`에 Spec 기반 크기 테이블이 내장되어 있습니다:

```typescript
// engines/utils.ts
const INLINE_FORM_HEIGHTS: Record<string, Record<string, number>> = {
  checkbox: { sm: 20, md: 24, lg: 28 },
  radio:    { sm: 20, md: 24, lg: 28 },
  switch:   { sm: 20, md: 24, lg: 28 },
  toggle:   { sm: 20, md: 24, lg: 28 },
};
```

#### flexDirection 지원

`element.props.style.flexDirection`이 `'column'`이면 크기 계산이 변경됩니다:

| 방향 | width | height |
|------|-------|--------|
| row (기본) | indicator + gap + textWidth | `INLINE_FORM_HEIGHTS[tag][size]` |
| column | max(indicator, textWidth) | indicator + gap + textLineHeight |

동일한 분기가 `styleToLayout.ts`(Yoga 경로)와 `engines/utils.ts`(DropflowBlockEngine 경로) **양쪽**에 적용되어야 합니다.

### Spec shapes border-radius 그룹 위치 처리

ToggleButtonGroup 내 ToggleButton은 CSS에서 그룹 내 위치(first/middle/last)에 따라 모서리별 다른 border-radius를 적용합니다.
Spec 기반 Skia 렌더링에서도 동일한 결과를 얻으려면 `_groupPosition` props를 통해 위치 정보를 전달해야 합니다.

```typescript
// ✅ ElementSprite.tsx: toggleGroupPosition을 _groupPosition으로 주입
const specProps = toggleGroupPosition
  ? { ...(props || {}), _groupPosition: toggleGroupPosition }
  : (props || {});

const shapes = spec.render.shapes(specProps, variantSpec, sizeSpec, 'default');

// ✅ ToggleButton.spec.ts shapes(): per-corner border-radius
// horizontal: first → [r,0,0,r], last → [0,r,r,0], middle → [0,0,0,0]
// vertical:   first → [r,r,0,0], last → [0,0,r,r], middle → [0,0,0,0]
const gp = props._groupPosition;
let borderRadius = baseBorderRadius;
if (gp && !gp.isOnly) {
  const r = baseBorderRadius;
  if (gp.orientation === 'horizontal') {
    if (gp.isFirst) borderRadius = [r, 0, 0, r];
    else if (gp.isLast) borderRadius = [0, r, r, 0];
    else borderRadius = [0, 0, 0, 0];
  }
  // vertical도 동일 패턴
}

// ❌ 그룹 위치 무시 → 모든 버튼에 동일한 단일 borderRadius 적용
const borderRadius = size.borderRadius; // [r,0,0,r] 대신 항상 r
```

**필수 조건**: `specShapeConverter.ts`의 `resolveRadius()`가 `number | [number, number, number, number]` 양쪽 타입을 지원해야 함 (현재 지원 확인됨).

> **참고**: 레이아웃 엔진 상세 구현은 [LAYOUT_REQUIREMENTS.md](../../../../docs/LAYOUT_REQUIREMENTS.md) 참조.
