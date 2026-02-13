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
| `block` (기본값) | BlockEngine | 수직 쌓임, width 100%, margin collapse |
| `inline-block` | BlockEngine | 가로 배치, 줄바꿈, vertical-align |
| `flex` | FlexEngine (Yoga/@pixi/layout) | Flexbox 레이아웃 |
| `grid` | GridEngine | 2D 그리드 레이아웃 |
| `flow-root` | BlockEngine | BFC 생성 (margin collapse 차단) |

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
| BlockEngine (JS/WASM) | `FIT_CONTENT = -2` sentinel → `contentWidth` 사용 |
| Flex/Yoga (@pixi/layout) | `flexGrow:0 + flexShrink:0` 워크어라운드 |

```typescript
// ✅ parseSize가 'fit-content' → FIT_CONTENT(-2) 반환
// BlockEngine: contentWidth 기반 크기 계산
// Yoga: auto + flexGrow:0 + flexShrink:0로 에뮬레이션

// ❌ fit-content를 수동으로 auto나 px로 변환하지 말 것
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

### content-box 기준 높이 계산

`calculateContentHeight`는 **순수 텍스트 높이만 반환**, padding/border는 호출 측(BlockEngine)에서 합산:

```typescript
// ✅ contentHeight = 텍스트 높이만
// MIN_BUTTON_HEIGHT는 border-box → content-box 변환 후 비교
const minContentHeight = Math.max(0, MIN_BUTTON_HEIGHT - paddingY * 2 - borderWidth * 2);
return Math.max(textHeight, minContentHeight);

// ❌ padding 포함 → BlockEngine에서 이중 계산
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

CONTAINER_TAGS(Card, Panel, ToggleButtonGroup 등)는 `renderWithCustomEngine`에서 `containerLayout.width = layout.width`로 Yoga LayoutContainer에 BlockEngine 계산 결과를 전달합니다.

**문제**: inline-block인 CONTAINER_TAG 컴포넌트의 `contentWidth`가 정확하지 않으면 selection bounds가 잘못됨.

```typescript
// ✅ ToggleButtonGroup: containerLayout width를 'auto'로 오버라이드
// Yoga가 자식 ToggleButton 크기에 맞춰 자동 계산
const toggleGroupWidthOverride = isToggleButtonGroup
  ? { width: 'auto', flexGrow: 0, flexShrink: 0 }
  : { width: layout.width };

// ❌ BlockEngine의 contentWidth(80px 기본값)를 그대로 사용
// → selection 영역이 실제 렌더링보다 작아짐
const containerLayout = { width: layout.width };
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

Checkbox, Radio, Switch, Toggle은 BlockEngine에서 `inline-block`으로 처리됩니다.
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

동일한 분기가 `styleToLayout.ts`(Yoga 경로)와 `engines/utils.ts`(BlockEngine 경로) **양쪽**에 적용되어야 합니다.

> **참고**: 레이아웃 엔진 상세 구현은 [LAYOUT_REQUIREMENTS.md](../../../../docs/LAYOUT_REQUIREMENTS.md) 참조.
