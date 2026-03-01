# Layout Engine Patterns

## 레이아웃 엔진 핵심 패턴

> Wave 3-4 (2026-02-19) 이후 현행 아키텍처.

### 엔진 선택

| display 값 | 엔진 |
|------------|------|
| `block`, `inline-block`, `inline`, `flow-root` | DropflowBlockEngine (JS) |
| `flex`, `inline-flex` | TaffyFlexEngine (Taffy WASM) |
| `grid`, `inline-grid` | TaffyGridEngine (Taffy WASM) |

### DirectContainer 패턴

@pixi/layout 제거 후, 엔진 계산 결과(x/y/w/h)를 DirectContainer에서 직접 배치합니다:

```typescript
// ✅ 엔진 계산 결과를 DirectContainer x/y로 직접 주입
<DirectContainer x={layout.x} y={layout.y}>
  <ElementSprite element={element} width={layout.width} height={layout.height} />
</DirectContainer>

// ❌ 레이아웃 prop으로 재계산 요청 (구 @pixi/layout 패턴 — 제거됨)
<pixiContainer layout={{ display: 'flex', flexDirection: 'column' }}>
```

### LayoutComputedSizeContext 패턴

컴포넌트 내부 Sprite가 엔진이 계산한 border-box 크기를 읽어야 할 때 사용합니다.
퍼센트(`%`) 크기나 자동 크기(`auto`, `fit-content`) 요소의 최종 픽셀 크기를 엔진에서 전파합니다.

**CRITICAL**: DirectContainer는 엔진 결과를 **항상** computedSize로 전달합니다 (0도 유효한 값).
null로 반환하면 ElementSprite가 `convertToTransform` fallback(width=100, height=100)을 사용하여 잘못된 크기로 렌더링됩니다.

```typescript
// ✅ DirectContainer: 엔진 결과 항상 전달 (0도 유효)
const computedSize = useMemo(() =>
  ({ width: Math.max(width, 0), height: Math.max(height, 0) }),
  [width, height]
);

// ❌ width > 0 && height > 0 일 때만 전달 → height=0이면 null → 100px fallback
const computedSize = width > 0 && height > 0 ? { width, height } : null;
```

```typescript
// ✅ LayoutComputedSizeContext로 엔진 계산 크기 읽기
const computedSize = useContext(LayoutComputedSizeContext);
const width = (computedSize?.width && computedSize.width > 0)
  ? computedSize.width
  : fallbackWidth;

// ❌ props.style?.width를 직접 파싱 (% 값이 100px로 오해석됨)
const width = parseCSSSize(style?.width, undefined) ?? 0;
```

**Provider:** `BuilderCanvas.tsx` DirectContainer 래퍼
**Consumer:** `ElementSprite.tsx`, `BoxSprite.tsx`, 히트 영역 Graphics 컴포넌트

### enrichWithIntrinsicSize (텍스트 크기 주입)

Button, Badge 등 텍스트 기반 intrinsic 크기를 가진 컴포넌트는 `enrichWithIntrinsicSize()`로 엔진에 크기를 주입합니다.
구 `styleToLayout.ts` 방식의 수동 `layout.height` 계산은 삭제됐습니다 (W3-6 완료).

```typescript
// ✅ enrichWithIntrinsicSize — 엔진 layout 호출 전 intrinsic 크기 주입
enrichWithIntrinsicSize(element, availableWidth, cssContext);
// → element.intrinsicWidth / intrinsicHeight 설정
// → TaffyFlexEngine/DropflowBlockEngine이 측정값으로 노드 크기 결정

// ❌ styleToLayout.ts에서 layout.height 직접 설정 (삭제됨)
// layout.height = calculateContentHeight(element, availableWidth);
```

#### contentHeight ≤ 0 early return 우회 조건

`enrichWithIntrinsicSize` 내부에서 `contentHeight ≤ 0`이면 early return하여 intrinsicHeight 주입을 건너뜁니다.
다음 두 경우에 이 검사를 우회합니다:

1. **SPEC_SHAPES_INPUT_TAGS**: spec shapes로 자체 렌더링하는 입력 계열 컴포넌트
2. **childElements가 있는 컨테이너**: CardHeader/CardContent 등 자체 텍스트는 없지만 자식 높이 합산이 필요한 래퍼

```typescript
// ✅ early return 조건 (3가지 우회)
if (box.contentHeight <= 0 && !needsWidth
  && !SPEC_SHAPES_INPUT_TAGS.has(tag)
  && !(childElements && childElements.length > 0))  // 자식 있는 컨테이너 우회
  return element;

// ❌ childElements 체크 없이 early return → CardHeader/CardContent height=0
// → DirectContainer computedSize=null → convertToTransform fallback 100×100
```

새로운 spec shapes 기반 컴포넌트를 추가할 때 `SPEC_SHAPES_INPUT_TAGS`에 태그를 등록해야 합니다.
자식 Element가 있는 투명 컨테이너는 별도 등록 없이 `childElements` 체크로 자동 우회됩니다.

### Card Nested Tree 레이아웃 (2026-02-26)

Card는 복합 트리 구조(Card → CardHeader → Heading, Card → CardContent → Description)를 사용합니다.
CardHeader/CardContent는 투명 래퍼로 자체 텍스트가 없으므로 특별한 레이아웃 처리가 필요합니다.

#### 3-layer default system (Factory / Engine / CSS)
| 계층 | 파일 | 역할 |
|------|------|------|
| Factory | `LayoutComponents.ts` | DB 생성 시 기본 style 설정 |
| Engine implicit | `BuilderCanvas.tsx createContainerChildRenderer` | 기존 DB 요소에 누락된 style 주입 |
| CSS | `Card.css` | Preview iframe 렌더링 |

#### implicit style injection (BuilderCanvas.tsx)
```typescript
// Card → CardHeader/CardContent: width 확보
if (containerTag === 'card') { /* width: '100%' 주입 */ }
// CardHeader → Heading: flex row에서 width 확보
if (containerTag === 'cardheader') { /* flex: 1 주입 */ }
// CardContent → Description: flex column에서 width 확보
if (containerTag === 'cardcontent') { /* width: '100%' 주입 */ }
```

#### calculateContentHeight 컨테이너 브랜치 구조

`childElements`가 있는 컨테이너의 높이 계산 분기:

1. **전용 브랜치** (태그별): CardHeader/CardContent, Card, CheckboxGroup/RadioGroup, Tabs, ComboBox/Select 등
2. **일반 flex 브랜치**: `display:flex/inline-flex` → flexDirection별 column=합산+gap, row=max
3. **일반 block 브랜치**: `display:block` 또는 미지정 → 자식 높이 세로 합산 (gap 없음)

모든 브랜치 공통: 자식 border-box 높이 = content-box(calculateContentHeight) + padding + border.
Button 등 padding이 있는 자식의 높이를 정확히 반영하려면 반드시 border-box로 계산해야 합니다.

```typescript
// ✅ 일반 block 컨테이너: Menu(→MenuItem), Disclosure(→Header+Content) 등
// display:flex가 아닌 모든 컨테이너가 이 경로를 통과
const blockChildHeights = visibleBlockChildren.map(child => {
  const contentH = calculateContentHeight(child, ...);
  const childBox = parseBoxModel(child, 0, -1);
  return contentH + childBox.padding.top + childBox.padding.bottom
    + childBox.border.top + childBox.border.bottom;
});
return blockChildHeights.reduce((sum, h) => sum + h, 0);

// ❌ block 컨테이너에 childElements 합산 핸들러 누락
// → 자식이 있어도 calculateContentHeight가 텍스트 높이 fallback(~24px) 반환
```

### Tabs 컨테이너 높이 계산

Tabs는 컨테이너로 처리되며 (`NON_CONTAINER_TAGS` 미포함), 활성 Panel을 내부에 렌더링하는 복합 컴포넌트입니다.
`calculateContentHeight`에서 Tabs 전용 높이 케이스는 childElements 블록 **밖**에 배치합니다.
Panel은 element tree에 자식이 없기 때문에, childElements 블록 안에서는 높이를 계산할 수 없습니다.

```typescript
// ✅ Tabs 높이 = tabBarHeight + tabPanelPadding * 2 + panelBorderBox
// CSS spec sizes 기준 탭 바 높이: sm=25, md=30, lg=35
// TabPanel padding: 16px (React-Aria 기본값)
const TAB_BAR_HEIGHT = { sm: 25, md: 30, lg: 35 }[size] ?? 30;
const TAB_PANEL_PADDING = 16;
const tabsHeight = TAB_BAR_HEIGHT + TAB_PANEL_PADDING * 2 + panelBorderBoxHeight;

// ❌ childElements 블록 내에서 Tabs 높이 계산 시도
// → Panel은 자식 element가 없어 panelBorderBoxHeight를 구할 수 없음
```

| size | tabBarHeight |
|------|-------------|
| sm   | 25px        |
| md   | 30px        |
| lg   | 35px        |

### Compositional Component 레이아웃 패턴 (CRITICAL)

Monolithic(Spec Shapes 기반) → Compositional(Card 패턴) 아키텍처 전환 시 반드시 준수해야 하는 체크리스트입니다.
Select, ComboBox 등 복합 컴포넌트를 자식 Element 트리 구조로 전환할 때 적용합니다.

#### 전환 체크리스트

| # | 항목 | 검증 |
|---|------|------|
| 1 | **isFormElement 제외** | `parseBoxModel`의 `isFormElement` 배열에서 제거. Compositional container는 BUTTON_SIZE_CONFIG padding/border를 사용하지 않음 |
| 2 | **SPEC_SHAPES_INPUT_TAGS 제외** | `enrichWithIntrinsicSize`의 SPEC_SHAPES_INPUT_TAGS에서 제거. 자식 기반 높이 + CSS padding 경로 사용 |
| 3 | **Factory 기본 스타일** | Factory 정의에 web CSS와 동일한 display/flexDirection/gap 설정 |
| 4 | **BuilderCanvas implicit style** | `createContainerChildRenderer`에서 `??` 패턴으로 기본값 주입 (사용자 값 우선) |
| 5 | **calculateContentHeight 브랜치** | 전용 높이 계산 브랜치에서 실제 visible 자식 순회 (Card 패턴) |
| 6 | **자식 필터링** | web preview 비표시 조건(label prop 삭제 등)과 canvas 필터링 일치 |
| 7 | **DEFAULT_ELEMENT_HEIGHTS 동적화** | 하드코딩 높이 대신 `fontSize * lineHeight` 동적 계산 사용 |
| 8 | **UI_SELECT_CHILD_TAGS 등록** (CRITICAL) | 자식 Element(`ComboBoxWrapper`, `ComboBoxInput`, `ComboBoxTrigger` 등)를 `UI_SELECT_CHILD_TAGS`에 등록. 미등록 시 `getSpriteType()` → 'flex'/'box' → `isUIComponent=false` → spec shapes 스킵 → 색상/보더 미렌더링 |
| 9 | **TAG_SPEC_MAP 등록** | `ElementSprite.tsx`의 `TAG_SPEC_MAP`에 자식 태그 → Spec 클래스 매핑. 기존 Spec 재사용 가능 (아래 참조) |

#### Monolithic vs Compositional 구분

```typescript
// ✅ Compositional (Card 패턴) — 자식 Element가 store에 존재
// Select, ComboBox, Card, Tabs 등
// - isFormElement: 제외
// - SPEC_SHAPES_INPUT_TAGS: 제외
// - enrichment: CSS padding 경로 (padding 추가)
// - calculateContentHeight: 자식 순회 합산

// ❌ Monolithic (Spec Shapes 기반) — spec shapes가 전체 렌더링
// Dropdown, Breadcrumbs 등
// - SPEC_SHAPES_INPUT_TAGS: 포함
// - enrichment: spec shapes 경로 (padding 미추가, 전체 시각적 높이 반환)
```

### 레이아웃 엔진 개선 이력 (2026-02-23)

#### line-height 이중 전략: normal vs 1.5 (2026-02-23)

CSS Preview에서 컴포넌트별로 적용되는 `line-height`가 다르므로, 레이아웃 높이 계산도 이를 구분해야 합니다.

| 컴포넌트 | CSS line-height | 계산 방식 | 적용 위치 |
|---------|----------------|----------|----------|
| **Text, Heading, Description 등** | `1.5` (`:root` 상속, Tailwind CSS v4 기본) | `fontSize * 1.5` 명시 전달 | `calculateContentHeight` step 7 |
| **Button, ToggleButton 등 UI** | `normal` (폰트 메트릭 기반) | `measureFontMetrics().lineHeight` (fontBoundingBox) | `estimateTextHeight()` 기본값 |

```typescript
// ✅ Text/Heading: CSS line-height: 1.5 상속 → 명시적 전달
const fs = fontSize ?? 16;
return estimateTextHeight(fs, fs * 1.5); // 16px → 24px

// ✅ Button: CSS line-height: normal → fontBoundingBox 기반
return estimateTextHeight(fontSize); // lineHeight 미전달 → measureFontMetrics 사용

// ❌ 모든 컴포넌트에 동일한 배율 사용 — Button/Text 높이 불일치
return Math.round(fontSize * 1.5); // Button sm: 31px (CSS 26px과 불일치)
return Math.round(fontSize * 1.2); // Text: 19px (CSS 24px과 불일치)
```

**Skia 텍스트 렌더링 (styleConverter.ts)**: `convertToTextStyle()`에서 `style.lineHeight` 미지정 시 `leading = (1.5 - 1) * fontSize` 기본값 적용. TextSprite 전용이므로 Text/Heading에만 영향.

#### TextSprite CSS 정합성: background/border + line-height (2026-02-23)

TextSprite의 Skia 렌더링에서 CSS와의 정합성을 확보하기 위한 두 가지 수정:

1. **background/border 렌더링**: `skiaNodeData`에 `box` 데이터(fillColor, strokeColor, borderRadius) 추가. `nodeRenderers.ts`의 `case 'text'`에서 `renderBox()` → `renderText()` 순서로 호출하여 배경 위에 텍스트 렌더링.

2. **line-height 기본값**: `convertToTextStyle()`에서 CSS `line-height` 미지정 시 Tailwind CSS v4 기본 `1.5` 배율 적용 (`leading = (1.5 - 1) * fontSize`). CanvasKit `heightMultiplier = 1.5`로 CSS와 동일한 텍스트 줄 간격 보장.

```typescript
// ✅ TextSprite: box + text 데이터 모두 포함 (CSS 정합성)
return {
  type: 'text',
  box: { fillColor, strokeColor, borderRadius }, // background/border
  text: { content, fontSize, lineHeight, ... },   // 텍스트
};

// ✅ nodeRenderers.ts case 'text': 배경 먼저 → 텍스트 위에
case 'text':
  if (node.box) renderBox(ck, canvas, node); // 배경/테두리
  if (fontMgr) renderText(ck, canvas, node, fontMgr); // 텍스트
  break;

// ✅ convertToTextStyle: line-height 미지정 시 CSS 기본값 1.5 적용
let leading: number;
if (style?.lineHeight) {
  // 명시적 lineHeight 파싱
} else {
  leading = (1.5 - 1) * fontSize; // Tailwind CSS v4 :root 상속
}
```

#### INLINE_BLOCK_TAGS border-box 수정

`enrichWithIntrinsicSize`가 `INLINE_BLOCK_TAGS`(button, badge, togglebutton, togglebuttongroup 등)에 항상 padding+border를 포함한 border-box 높이를 반환.

- `layoutInlineRun`이 `style.height`를 border-box 값으로 직접 사용하는 구조이므로 content-box 변환 불필요
- `isInlineBlockTag` 플래그로 CSS padding 존재 여부와 무관하게 항상 padding+border 포함
- 이전에 INLINE_BLOCK_TAGS에서 padding이 누락되어 높이가 축소되던 버그 수정

```typescript
// ✅ INLINE_BLOCK_TAGS: enrichWithIntrinsicSize가 border-box 높이 반환
// layoutInlineRun이 이 값을 그대로 style.height로 사용
const height = contentHeight + paddingY * 2 + borderWidth * 2; // border-box

// ❌ content-box 반환 후 layoutInlineRun이 재계산 → 이중 적용
const height = contentHeight; // content-box만 반환
// → layoutInlineRun에서 padding 재추가 → 실제 높이 = contentHeight + padding * 4
```

#### LayoutContext.getChildElements

`LayoutContext`에 `getChildElements?: (elementId: string) => Element[]` 선택적 메서드 추가.

- `BuilderCanvas.tsx`에서 `pageChildrenMap` 기반으로 context에 주입
- `enrichWithIntrinsicSize`에서 자식 Element 목록을 직접 조회 가능
- ToggleButtonGroup처럼 자식 수와 크기를 기반으로 intrinsic 너비/높이를 계산하는 컴포넌트에 필요

```typescript
// ✅ LayoutContext에 getChildElements 주입 (BuilderCanvas.tsx)
const layoutContext: LayoutContext = {
  // ...기존 필드...
  getChildElements: (elementId) => pageChildrenMap.get(elementId) ?? [],
};

// ✅ enrichWithIntrinsicSize에서 자식 기반 너비 계산
const children = context.getChildElements?.(element.id) ?? [];
const childWidths = children.map((child) => calculateChildWidth(child));
element.intrinsicWidth = childWidths.reduce((sum, w) => sum + w, 0);

// ❌ 자식 정보 없이 고정 fallback → ToggleButtonGroup 너비 부정확
element.intrinsicWidth = 100; // 실제 자식 크기와 무관한 값
```

#### border shorthand 레이아웃 지원

`parseBorder()`가 `border: "1px solid red"` shorthand에서 `borderWidth`를 추출.

- `parseBorderShorthand()` (`cssValueParser.ts`) 연동
- `border` shorthand 사용 시 레이아웃 엔진이 borderWidth를 인식하지 못하던 문제 해결
- `border-top`, `border-right` 등 개별 속성과 동일한 수준으로 지원

```typescript
// ✅ border shorthand 파싱 — parseBorder()가 shorthand 처리
// style = { border: "2px solid blue" }
const { borderWidth } = parseBorder(style);
// borderWidth = 2 (parseBorderShorthand() 연동으로 추출)

// ❌ shorthand 미지원 — borderWidth가 0으로 폴백
// style = { border: "2px solid blue" }
const borderWidth = style.borderWidth ?? 0;
// → 0 반환 (border 속성 무시)
```

#### Switch 라벨 줄바꿈 수정 (2026-02-21)

`INLINE_FORM_INDICATOR_WIDTHS`의 switch 값이 spec `trackWidth`보다 10px 작아 WebGL Canvas에서 라벨이 줄바꿈되던 버그 수정.

- `INLINE_FORM_INDICATOR_WIDTHS` switch: 26/34/42 → 36/44/52 (spec trackWidth 일치)
- `INLINE_FORM_GAPS` 테이블 신규 추가: switch 8/10/12, checkbox/radio 6/8/10
- column 방향 gap도 `INLINE_FORM_GAPS` 테이블로 컴포넌트별 분리
- 근본 원인: 레이아웃 너비가 10px 작으면 `specShapeConverter`의 `shape.x > 0` maxWidth 자동 축소로 텍스트 영역이 추가 손실됨

#### Card 텍스트 변경 미반영 버그 수정 (2026-02-21)

Properties Panel에서 Card의 `heading`/`description`을 변경해도 WebGL Canvas에 반영되지 않던 버그 수정.

- **근본 원인**: CardEditor는 `Card.props.heading/description`을 업데이트하지만, WebGL TextSprite는 자식 Element의 `props.children`을 읽음. 두 데이터 소스 간 동기화 누락.
- **수정 파일**: `BuilderCanvas.tsx` (`createContainerChildRenderer`), `LayoutRenderers.tsx` (CSS Preview)
- **수정 방법**: `containerTag === 'Card'` 분기 추가, `cardProps.heading ?? cardProps.title` → Heading 자식 주입, `cardProps.description` → Description 자식 주입
- **CSS Preview 수정**: `LayoutRenderers.tsx`의 Card 렌더러에 `heading`, `subheading`, `footer` props 전달 추가
- **패턴**: Tabs `_tabLabels`와 동일한 Container Props 주입 방식

#### TagGroup label 두 줄 렌더링 버그 수정 (2026-02-22)

WebGL Canvas에서 TagGroup의 label("Tag Group")이 두 줄로 렌더링되던 버그 수정.

- **근본 원인 1 — Spec shapes 중복 렌더링**: `TagGroupSpec.render.shapes`에서 label 텍스트(fontSize 12px)를 렌더링하고, 동시에 자식 Label 엘리먼트(fontSize 14px)가 별도 렌더링되어 두 줄처럼 보임. Label은 자식 Element가 담당하므로 spec shapes에서 중복 렌더링하면 안 됨.
- **근본 원인 2 — Canvas 2D ↔ CanvasKit 폭 측정 오차**: `calculateContentWidth`의 일반 텍스트 경로(line 759-760)에 `Math.ceil() + 2` 보정이 누락됨. INLINE_FORM 경로(line 718-719)에는 이미 적용되어 있었으나 일반 텍스트 경로에는 없었음.
- **수정 파일 1**: `packages/specs/src/components/TagGroup.spec.ts` — shapes()에서 label 텍스트 shape 제거
- **수정 파일 2**: `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts` (line 759-760) — 일반 텍스트 경로에 `Math.ceil(calculateTextWidth(...)) + 2` 보정 추가
- **교훈**: 자식 Element가 렌더링하는 텍스트를 spec shapes에서 중복 정의하지 말 것. Canvas 2D measureText ↔ CanvasKit paragraph API 간 폭 오차 보정 패턴은 모든 텍스트 경로에 일관 적용 필요.

### 컴포넌트 등급 현황 (Wave 4 완료, 2026-02-19 / Breadcrumbs 승격 2026-02-23)

모든 Pixi 컴포넌트가 A 또는 B+ 등급으로 전환 완료됐습니다.

| 등급 | 의미 | 예시 |
|------|------|------|
| A | Taffy/Dropflow 레이아웃 위임 + 자식 분리 | Button, Badge, ProgressBar, TagGroup, Breadcrumbs |
| B+ | Context 우선 + fallback, 일부 자체 계산 | Checkbox, Radio, Switch, Input |
| B | 엔진 위임하나 자체 텍스트 배치 | Card, Meter |
| D | 캔버스 상호작용 불필요 (프리뷰 전용) | Calendar, DatePicker, ColorPicker |

> C등급 (자체 렌더링 + 수동 배치)은 Wave 4에서 전부 제거됐습니다.
> `SELF_PADDING_TAGS`, `renderWithPixiLayout()` 등 구 패턴도 삭제 완료.
