# XStudio Patterns Skill

XStudio Builder 애플리케이션의 코드 패턴, 규칙 및 모범 사례를 정의하는 통합 스킬입니다.

## 목적

- 코드 일관성 및 품질 보장
- 팀 전체 표준화된 패턴 적용
- 보안, 성능, 접근성 요구사항 충족
- 유지보수성 향상

## 규칙 카테고리

### CRITICAL (즉시 적용 필수)

#### Domain (domain-*) - 비즈니스 로직
- **[domain-element-hierarchy](rules/domain-element-hierarchy.md)** - Element 계층 구조 규칙
- **[domain-o1-lookup](rules/domain-o1-lookup.md)** - O(1) 인덱스 기반 검색
- **[domain-history-integration](rules/domain-history-integration.md)** - 히스토리 기록 필수
- **[domain-async-pipeline](rules/domain-async-pipeline.md)** - 비동기 파이프라인 순서
- **[domain-layout-resolution](rules/domain-layout-resolution.md)** - Page/Layout 합성 규칙
- **[domain-delta-messaging](rules/domain-delta-messaging.md)** - Delta 메시징 패턴
- **[domain-component-lifecycle](rules/domain-component-lifecycle.md)** - 컴포넌트 생명주기

#### Validation (validation-*) - 입력 검증/에러 처리
- **[validation-input-boundary](rules/validation-input-boundary.md)** - 경계 입력 검증 (Zod)
- **[validation-error-boundary](rules/validation-error-boundary.md)** - Error Boundary 필수

#### Styling (style-*)
- **[style-no-inline-tailwind](rules/style-no-inline-tailwind.md)** - 인라인 Tailwind 클래스 금지
- **[style-tv-variants](rules/style-tv-variants.md)** - tv() 사용 필수
- **[style-react-aria-prefix](rules/style-react-aria-prefix.md)** - react-aria-* CSS 접두사

#### TypeScript (type-*)
- **[type-no-any](rules/type-no-any.md)** - any 타입 금지
- **[type-explicit-return](rules/type-explicit-return.md)** - 명시적 반환 타입

#### PIXI Layout (pixi-*)
- **[pixi-direct-container](rules/pixi-no-xy-props.md)** - DirectContainer 직접 배치 패턴 (엔진 결과 x/y 사용)
- **[pixi-hybrid-layout-engine](rules/pixi-hybrid-layout-engine.md)** - 하이브리드 레이아웃 엔진 display 선택
- **[pixi-container-hit-rect](rules/pixi-container-hit-rect.md)** - Non-layout 컨테이너 히트 영역 (padding offset 보정)

#### Security (postmessage-*)
- **[postmessage-origin-verify](rules/postmessage-origin-verify.md)** - origin 검증 필수

#### Component Spec (spec-*)
- **[spec-build-sync](rules/spec-build-sync.md)** - @xstudio/specs 빌드 동기화 필수
- **[spec-value-sync](rules/spec-value-sync.md)** - Spec ↔ Builder ↔ CSS 값 동기화
- **CRITICAL**: Spec shapes 내 숫자 연산에 TokenRef 값을 직접 사용 금지 → `resolveToken()` 변환 필수 (TokenRef 문자열을 수 연산에 사용하면 NaN 좌표 → 렌더링 실패)

### HIGH (강력 권장)

#### Architecture (arch-*)
- **[arch-reference-impl](rules/arch-reference-impl.md)** - 참조 구현 모음

#### Component Spec (spec-*)
- **[spec-single-source-truth](rules/spec-single-source-truth.md)** - ComponentSpec 단일 소스 패턴
- **[spec-shape-rendering](rules/spec-shape-rendering.md)** - Shape 기반 렌더링
- **[spec-token-usage](rules/spec-token-usage.md)** - 토큰 참조 형식

#### Styling (style-*)
- **[style-css-reuse](rules/style-css-reuse.md)** - CSS 클래스 재사용

#### React-Aria (react-aria-*)
- **[react-aria-hooks-required](rules/react-aria-hooks-required.md)** - React-Aria 훅 사용
- **[react-aria-no-manual-aria](rules/react-aria-no-manual-aria.md)** - 수동 ARIA 속성 금지
- **[react-aria-stately-hooks](rules/react-aria-stately-hooks.md)** - React-Stately 상태 훅

#### Supabase (supabase-*)
- **[supabase-no-direct-calls](rules/supabase-no-direct-calls.md)** - 컴포넌트 직접 호출 금지
- **[supabase-service-modules](rules/supabase-service-modules.md)** - 서비스 모듈 사용
- **[supabase-rls-required](rules/supabase-rls-required.md)** - Row Level Security 필수

#### Zustand (zustand-*)
- **[zustand-factory-pattern](rules/zustand-factory-pattern.md)** - StateCreator 팩토리 패턴
- **[zustand-modular-files](rules/zustand-modular-files.md)** - 슬라이스별 파일 분리

#### PostMessage (postmessage-*)
- **[postmessage-buffer-ready](rules/postmessage-buffer-ready.md)** - PREVIEW_READY 버퍼링

#### Inspector (inspector-*)
- **[inspector-inline-styles](rules/inspector-inline-styles.md)** - 오버레이 인라인 스타일
- **[inspector-history-sync](rules/inspector-history-sync.md)** - 히스토리 동기화

#### PIXI Layout (pixi-*)
- **[pixi-border-box-model](rules/pixi-border-box-model.md)** - Border-Box 모델 크기 계산 필수
- **[pixi-text-isleaf](rules/pixi-text-isleaf.md)** - Text isLeaf 설정
- **[pixi-hitarea-absolute](rules/pixi-hitarea-absolute.md)** - 히트 영역 absolute 위치
- **[pixi-viewport-culling](rules/pixi-viewport-culling.md)** - Viewport Culling 좌표 시스템 및 부모 가시성 패턴

### MEDIUM-HIGH

#### PIXI Layout (pixi-*)
- **[pixi-no-flex-height](rules/pixi-no-flex-height.md)** - flex + % height 조합 금지

### MEDIUM (권장)

#### Performance (perf-*)
- **[perf-checklist](rules/perf-checklist.md)** - 성능 체크리스트
- **[perf-barrel-imports](rules/perf-barrel-imports.md)** - Barrel import 지양
- **[perf-promise-all](rules/perf-promise-all.md)** - Promise.all 병렬 처리
- **[perf-dynamic-imports](rules/perf-dynamic-imports.md)** - 동적 import 활용
- **[perf-map-set-lookups](rules/perf-map-set-lookups.md)** - Map/Set O(1) 검색

#### Testing (test-*)
- **[test-stories-required](rules/test-stories-required.md)** - Storybook 스토리 필수

## 기술 스택

| 영역 | 기술 |
|------|------|
| UI Framework | React 19, React-Aria Components |
| State | Zustand (메인), Jotai (스타일 패널), TanStack Query |
| Styling | Tailwind CSS v4, tailwind-variants |
| Canvas | **CanvasKit/Skia WASM** (메인 렌더러) + PixiJS 8 (이벤트 전용, DirectContainer 직접 배치), @pixi/react |
| Layout Engine | Taffy WASM (TaffyFlexEngine, TaffyGridEngine) + Dropflow Fork (DropflowBlockEngine) |
| Backend | Supabase (Auth, Database, RLS) |
| Build | Vite, TypeScript 5 |
| Testing | Storybook, Vitest |

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

#### SPEC_SHAPES_INPUT_TAGS — contentHeight ≤ 0 early return 우회

`enrichWithIntrinsicSize` 내부에서 `contentHeight ≤ 0`이면 early return하여 intrinsicHeight 주입을 건너뜁니다.
spec shapes로 자체 렌더링하는 입력 계열 컴포넌트(폼 위젯, Breadcrumbs 등)는 이 검사를 우회해야 합니다.

```typescript
// ✅ SPEC_SHAPES_INPUT_TAGS — contentHeight ≤ 0 early return 우회
const SPEC_SHAPES_INPUT_TAGS = new Set(['combobox', 'select', 'dropdown', 'breadcrumbs']);
// → spec shapes가 자체 높이를 결정하므로 content 텍스트 높이 검사 불필요

// ❌ SPEC_SHAPES_INPUT_TAGS 미포함 — contentHeight = 0 → early return → intrinsicHeight 미주입
// → 엔진이 높이를 0으로 결정 → Breadcrumbs 미표시
```

새로운 spec shapes 기반 컴포넌트를 추가할 때 `SPEC_SHAPES_INPUT_TAGS`에 태그를 등록해야 합니다.

### Tabs 컨테이너 높이 계산

Tabs는 CONTAINER_TAGS에 포함되며, 활성 Panel을 내부에 렌더링하는 복합 컴포넌트입니다.
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

### Breadcrumbs 컴포넌트 높이 계산 (2026-02-23)

Breadcrumbs는 `display: flex; align-items: center`로 렌더링되며, 높이는 lineHeight와 동일합니다.
`calculateContentHeight`에서 tag 분기를 통해 size별 고정 높이를 반환합니다.

```typescript
// ✅ Breadcrumbs: display:flex, align-items:center — 높이 = lineHeight
if (tag === 'breadcrumbs') {
  const BREADCRUMBS_HEIGHTS: Record<string, number> = { sm: 16, md: 24, lg: 24 };
  return BREADCRUMBS_HEIGHTS[sizeName] ?? 24;
}

// ❌ 일반 텍스트 높이 계산 경로 사용 — props.children 기반 측정
// → Breadcrumbs는 _crumbs 배열로 렌더링하므로 props.children이 빈 문자열 → 높이 0
```

| size | height |
|------|--------|
| sm   | 16px   |
| md   | 24px   |
| lg   | 24px   |

### Card 컴포넌트 높이 계산 (2026-02-21)

Card는 Heading + Description을 자식 Element로 생성하는 복합 컴포넌트입니다.
아래 3가지 패치가 적용되어야 Card의 높이가 CSS Preview와 일치합니다.

#### TEXT_TAGS에 'Description' 추가 (`ElementSprite.tsx:187`)

`Description`이 `TEXT_TAGS`에 포함되지 않으면 `BoxSprite`로 렌더링되어 텍스트가 표시되지 않습니다.
`Description`은 Card, Dialog, Popover, Tooltip, Form 등 5개 컴포넌트에서 공통으로 사용됩니다.

```typescript
// ✅ TEXT_TAGS에 'Description' 포함 — TextSprite로 렌더링
const TEXT_TAGS = new Set([
  'Heading',
  'Text',
  'Description', // Card, Dialog, Popover, Tooltip, Form에서 사용
  // ...기타 태그
]);

// ❌ TEXT_TAGS 미포함 — BoxSprite로 폴백되어 텍스트 미표시
// Description 엘리먼트가 빈 박스로만 렌더링됨
```

#### `calculateContentHeight` — Card childElements 우선 처리 (`utils.ts:929-943`)

Card factory는 Heading과 Description을 자식 Element로 생성합니다.
`props.title` / `props.description`만 참조하면 빈 문자열로 폴백되어 높이가 0이 됩니다.
childElements가 존재하는 경우 flex column 방식으로 높이를 합산해야 합니다.

```typescript
// ✅ childElements가 있으면 flex column 높이 합산
if (tag === 'Card' && childElements && childElements.length > 0) {
  const headingEl = childElements.find((el) => el.tag === 'Heading');
  const descriptionEl = childElements.find((el) => el.tag === 'Description');
  const gap = 4; // Card 내부 기본 gap

  const headingHeight = headingEl
    ? calculateContentHeight(headingEl, availableWidth, context)
    : 0;
  const descriptionHeight = descriptionEl
    ? calculateContentHeight(descriptionEl, availableWidth, context)
    : 0;

  return headingHeight + gap + descriptionHeight;
}

// ✅ fallback: childElements 없는 Card — props 기반 높이 계산
// (props.title / props.description 문자열로 직접 측정)

// ❌ props.title / props.description만 참조
// Card factory가 자식 Element로 생성하면 props 값이 빈 문자열 → 높이 0
const titleHeight = measureTextHeight(props.title ?? '', ...);
```

#### `enrichWithIntrinsicSize` — border-box 정합성 (`utils.ts:1363-1375`)

`parseBoxModel`은 Card / Box / Section에 대해 `treatAsBorderBox: true`로 처리합니다.
`enrichWithIntrinsicSize`가 content-box 높이만 주입하면, `parseBoxModel`이 padding과 border를 다시 빼서
최종 높이가 의도보다 작아집니다.
Card / Box / Section에 한해 padding + border를 포함한 border-box 높이를 주입해야 합니다.

```typescript
// ✅ Card/Box/Section: enrichWithIntrinsicSize가 border-box 높이 반환
// parseBoxModel의 treatAsBorderBox와 정합성 유지
const BORDER_BOX_TAGS = new Set(['Card', 'Box', 'Section']);

if (BORDER_BOX_TAGS.has(tag)) {
  element.intrinsicHeight = contentHeight + paddingY * 2 + borderWidth * 2; // border-box
} else {
  element.intrinsicHeight = contentHeight; // content-box (기본 경로)
}

// ❌ Card에도 content-box 높이만 반환
// → parseBoxModel이 padding+border를 다시 빼 → 높이 부족
// 수정 전: Card 높이 51px / 수정 후: 85px (CSS Preview 88px 대비 3px 차이)
element.intrinsicHeight = contentHeight;
```

> **참고**: 수정 후 Card 높이 51px → 85px로 개선. CSS Preview 기준 88px와 3px 차이는 폰트 측정 오차 범위 내.

### Container Props 주입 패턴 (CONTAINER_PROPS_INJECTION)

복합 컨테이너 컴포넌트에서 **부모 element의 props 값을 자식 Element의 `props.children`에 주입**하는 패턴입니다.
Tabs의 `_tabLabels`와 Card의 `heading/description`이 이 패턴을 따릅니다.

**패턴이 필요한 이유**: Editor(Properties Panel)는 부모 컨테이너의 props를 업데이트하지만, WebGL TextSprite는 자식 Element의 `props.children`을 읽어 렌더링합니다. 두 데이터 소스가 분리되어 있으므로, `createContainerChildRenderer` 내부에서 부모 props를 자식 props에 주입해야 동기화됩니다.

```typescript
// BuilderCanvas.tsx — createContainerChildRenderer 내부
// 패턴: containerTag 확인 → 부모 props 추출 → 자식 effectiveChildEl 생성

// ✅ Tabs: _tabLabels 주입 (기존 패턴)
if (containerTag === 'Tabs') {
  effectiveChildEl = {
    ...childEl,
    props: { ...childEl.props, _tabLabels: tabsElement.props._tabLabels },
  };
}

// ✅ Card: heading/description → Heading/Description 자식에 주입 (2026-02-21 추가)
if (containerTag === 'Card') {
  const cardProps = containerElement.props;
  if (childEl.tag === 'Heading') {
    const headingText = cardProps?.heading ?? cardProps?.title;
    if (headingText != null) {
      effectiveChildEl = {
        ...childEl,
        props: { ...childEl.props, children: String(headingText) },
      };
    }
  } else if (childEl.tag === 'Description') {
    const descText = cardProps?.description;
    if (descText != null) {
      effectiveChildEl = {
        ...childEl,
        props: { ...childEl.props, children: String(descText) },
      };
    }
  }
}

// ❌ 주입 없이 자식 element의 초기값(factory 생성 시점 값)만 사용
// → CardEditor에서 heading/description을 변경해도 WebGL Canvas에 반영되지 않음
```

**주입 규칙 요약**:

| 컨테이너 | 부모 props 키 | 대상 자식 tag | 주입 대상 prop |
|----------|--------------|--------------|---------------|
| `Tabs`   | `_tabLabels` | `Tab`        | `_tabLabels`  |
| `Card`   | `heading` 또는 `title` | `Heading`    | `children`    |
| `Card`   | `description`           | `Description`| `children`    |

**새 컨테이너 컴포넌트에 이 패턴을 적용할 때 체크리스트**:
1. Editor가 업데이트하는 부모 props 키 확인
2. TextSprite가 읽는 자식 Element의 prop 확인 (보통 `children`)
3. `createContainerChildRenderer` 내 `containerTag === 'XXX'` 분기 추가
4. fallback: 부모 props 값이 `null`/`undefined`이면 자식 초기값 유지

상세 내용: [pixi-hybrid-layout-engine](rules/pixi-hybrid-layout-engine.md#container-props-주입-패턴-container_props_injection)

### Canvas 2D ↔ CanvasKit 폭 측정 오차 보정 (CRITICAL)

`calculateContentWidth`(utils.ts)는 Canvas 2D `measureText` API로 텍스트 폭을 측정합니다.
그러나 CanvasKit paragraph API는 내부 레이아웃 방식이 달라 동일한 텍스트에 대해 더 넓은 폭이 필요합니다.
보정 없이 Canvas 2D 측정값을 그대로 사용하면 CanvasKit 렌더링 시 텍스트가 wrapping됩니다.

**보정 규칙**: 모든 텍스트 폭 계산 경로에 `Math.ceil() + 2` 보정을 적용합니다.

```typescript
// engines/utils.ts — calculateContentWidth

// ✅ INLINE_FORM 경로: 이미 보정 적용 (line 718-719)
const textWidth = Math.ceil(calculateTextWidth(labelText, fontSize, fontFamily)) + 2;

// ✅ 일반 텍스트 경로: 동일하게 보정 적용 (line 759-760)
// TagGroup label, Button 등 단일 텍스트 측정 경로
const textWidth = Math.ceil(calculateTextWidth(text, fontSize, fontFamily)) + 2;

// ❌ 보정 없이 Canvas 2D 원시 측정값 사용
const textWidth = calculateTextWidth(text, fontSize, fontFamily);
// → CanvasKit paragraph API에서 동일한 폭이 부족 → 텍스트 wrapping 발생
```

**적용 범위**: INLINE_FORM 경로와 일반 텍스트 경로 **모두** 동일한 `Math.ceil() + 2` 보정 패턴을 사용합니다.
새로운 텍스트 폭 계산 경로를 추가할 때 이 보정을 빠뜨리면 CanvasKit에서 줄바꿈이 발생합니다.

**수정 이력 (2026-02-22)**: TagGroup label 두 줄 렌더링 버그 수정 시 일반 텍스트 경로에 보정 누락이 근본 원인 중 하나로 확인됨. INLINE_FORM 경로(line 718-719)에는 이미 적용되어 있었으나 일반 텍스트 경로(line 759-760)에 누락됐었음.

### TokenRef fontSize 해석 (Spec Shapes)

spec의 `size.fontSize`가 TokenRef 문자열(`'{typography.text-md}'`)로 지정될 수 있습니다.
이를 `as unknown as number`로 캐스팅하면 NaN이 발생하므로, 반드시 숫자 여부를 확인한 후 height 기반 fallback으로 변환해야 합니다.

```typescript
// ✅ TokenRef 여부 확인 후 height 매핑으로 fallback
const rawFontSize = spec.size?.fontSize;
const fontSize =
  typeof rawFontSize === 'number'
    ? rawFontSize
    : ({ sm: 12, md: 14, lg: 16 }[size] ?? 14); // height 기반 매핑

// ❌ as unknown as number 캐스팅 — TokenRef 문자열이 NaN으로 변환됨
const fontSize = spec.size?.fontSize as unknown as number;
// → Number('{typography.text-md}') === NaN
// → 텍스트 렌더링 실패 또는 0px 높이
```

| size | fallback fontSize |
|------|------------------|
| sm   | 12px             |
| md   | 14px             |
| lg   | 16px             |

### Breadcrumbs spec shapes 패턴 (2026-02-23)

Breadcrumbs는 자식 Breadcrumb 요소의 텍스트를 `_crumbs` 배열로 주입받아 spec shapes에서 렌더링합니다.
두 가지 패턴을 반드시 함께 적용해야 합니다.

#### TokenRef fontSize 해석 (`Breadcrumbs.spec.ts`)

`size.fontSize`가 TokenRef 문자열로 지정된 경우 `resolveToken()`으로 변환합니다.

```typescript
// ✅ Breadcrumbs.spec.ts — TokenRef fontSize 해석 (NaN 방지)
const resolvedFontSize = typeof size.fontSize === 'number'
  ? size.fontSize
  : (resolveToken(size.fontSize as TokenRef) as number) ?? 14;
// → size.fontSize가 TokenRef 문자열이면 resolveToken()으로 실제 숫자값 추출
// → 추출 실패 시 14px fallback

// ❌ as unknown as number 캐스팅 — NaN 발생
const fontSize = size.fontSize as unknown as number;
// → TokenRef 문자열이 NaN으로 변환 → 텍스트 shape 좌표 전체 NaN
```

#### `_crumbs` prop injection 패턴 (`ElementSprite.tsx`)

자식 Breadcrumb 요소의 텍스트를 추출하여 spec shapes에 `_crumbs` prop으로 주입합니다.

```typescript
// ✅ ElementSprite.tsx — 자식 Breadcrumb 텍스트 추출 → _crumbs 주입
if (tag === 'breadcrumbs' && childElements?.length > 0) {
  const crumbs = childElements
    .filter((c) => c.tag === 'Breadcrumb')
    .map((c) => String(c.props?.children || 'Page'));
  specProps = { ...specProps, _crumbs: crumbs };
}
// → Breadcrumbs.spec.ts shapes()가 _crumbs 배열로 구분자 포함 텍스트 shape 생성

// ❌ _crumbs 미주입 — spec shapes가 빈 배열 기준으로 렌더링
// → Breadcrumbs 텍스트 미표시
```

**Breadcrumbs 전체 렌더링 흐름**:
1. `ElementSprite.tsx`: 자식 Breadcrumb 요소 텍스트 수집 → `_crumbs` prop 주입
2. `Breadcrumbs.spec.ts`: `_crumbs` 배열 기반으로 구분자(`/`) 포함 텍스트 shape 생성
3. `enrichWithIntrinsicSize`: SPEC_SHAPES_INPUT_TAGS 분기 → size별 고정 높이 주입
4. `calculateContentHeight`: `tag === 'breadcrumbs'` 분기 → BREADCRUMBS_HEIGHTS 반환

### INLINE_FORM dimensions는 반드시 Spec과 일치 (CRITICAL, 2026-02-21)

Switch/Toggle 등 인라인 폼 컴포넌트의 레이아웃 크기 테이블은 해당 컴포넌트 spec 파일의 실제 치수와 **반드시 일치**해야 합니다.

**핵심 규칙**: `INLINE_FORM_INDICATOR_WIDTHS`(indicator/track 너비)와 `INLINE_FORM_GAPS`(라벨 간격)가 spec과 다르면 `specShapeConverter`의 `maxWidth` 자동 축소 로직(`shape.x > 0`일 때 `containerWidth - shape.x`)에 의해 텍스트 영역이 줄어들어 **라벨이 불필요하게 줄바꿈**됩니다.

```typescript
// engines/utils.ts — 현행 올바른 값
const INLINE_FORM_INDICATOR_WIDTHS = {
  checkbox: { sm: 16, md: 20, lg: 24 },  // Checkbox.spec.ts indicatorSize
  radio:    { sm: 16, md: 20, lg: 24 },  // Radio.spec.ts indicatorSize
  switch:   { sm: 36, md: 44, lg: 52 },  // Switch.spec.ts trackWidth ← 수정됨 (구: 26/34/42)
  toggle:   { sm: 36, md: 44, lg: 52 },  // Toggle.spec.ts trackWidth  ← 수정됨 (구: 26/34/42)
};

const INLINE_FORM_GAPS = {
  checkbox: { sm: 6, md: 8,  lg: 10 },
  radio:    { sm: 6, md: 8,  lg: 10 },
  switch:   { sm: 8, md: 10, lg: 12 },   // Switch.spec.ts gap (checkbox보다 2px 큼)
  toggle:   { sm: 8, md: 10, lg: 12 },   // Toggle.spec.ts gap
};
```

**수정 이력**:
- switch/toggle `INLINE_FORM_INDICATOR_WIDTHS`: `{ sm: 26, md: 34, lg: 42 }` → `{ sm: 36, md: 44, lg: 52 }` (spec trackWidth보다 10px 작았던 값 정정)
- `INLINE_FORM_GAPS` 테이블 신규 추가: 이전에는 크기(sm/md/lg) 기반 고정값만 사용

**새 인라인 폼 컴포넌트 추가 시 체크리스트**:
1. 해당 컴포넌트 spec 파일에서 `trackWidth` / `indicatorSize` / `gap` 값 확인
2. `INLINE_FORM_INDICATOR_WIDTHS`에 spec 값과 동일하게 등록
3. `INLINE_FORM_GAPS`에 spec gap과 동일하게 등록
4. spec shapes의 텍스트 `x` 좌표(`indicatorWidth + gap`)와 합산값이 일치하는지 검증

상세 내용: [pixi-hybrid-layout-engine](rules/pixi-hybrid-layout-engine.md#inline_form_indicator_widths--spec-trackwidth와-반드시-일치-critical), [spec-shape-rendering](rules/spec-shape-rendering.md#specshapeconverter-maxwidth-자동-축소와-레이아웃-너비-정합성-critical)

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
- block 경로의 `treatAsBorderBox` 변환이 이중 계산을 방지
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

#### Switch/Toggle 라벨 줄바꿈 수정 (2026-02-21)

`INLINE_FORM_INDICATOR_WIDTHS`의 switch/toggle 값이 spec `trackWidth`보다 10px 작아 WebGL Canvas에서 라벨이 줄바꿈되던 버그 수정.

- `INLINE_FORM_INDICATOR_WIDTHS` switch/toggle: 26/34/42 → 36/44/52 (spec trackWidth 일치)
- `INLINE_FORM_GAPS` 테이블 신규 추가: switch/toggle 8/10/12, checkbox/radio 6/8/10
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

### Complex Component 목록

자식 DOM 구조를 factory로 생성하는 복합 컴포넌트입니다.
`useElementCreator.ts`의 `complexComponents` 배열에 등록하고, `ComponentFactory.ts`에 creator를 등록합니다.

| 컴포넌트 | DOM 구조 | factory 정의 파일 |
|----------|---------|-----------------|
| `Select` | Select > Label, SelectTrigger > SelectValue, SelectIcon | `FormComponents.ts` |
| `ComboBox` | ComboBox > Label, ComboBoxWrapper > ComboBoxInput, ComboBoxTrigger | `FormComponents.ts` |
| `Slider` | Slider > Label, SliderOutput, SliderTrack > SliderThumb | `FormComponents.ts → createSliderDefinition()` |

**Slider factory 참조**: `FormComponents.ts`의 `createSliderDefinition()`

- `ElementSprite.tsx`의 `_hasLabelChild` 체크에 `'Slider'` 포함
- `Slider.css`는 class selector 대신 `[data-size="sm"]`, `[data-variant="primary"]` data-attribute selector 사용
- SLIDER_DIMENSIONS 기준: `{ sm: { trackHeight: 4, thumbSize: 14 }, md: { trackHeight: 6, thumbSize: 18 }, lg: { trackHeight: 8, thumbSize: 22 } }`

### CONTAINER_TAGS 컴포넌트 목록

레이아웃 엔진이 내부 자식 배치를 담당하는 컨테이너 태그 목록입니다.
이 태그들은 `enrichWithIntrinsicSize` 흐름에서 자식 렌더링 경로를 별도 처리합니다.

- **Tabs**: Tab bar(spec shapes) + 활성 Panel(container) 렌더링
  - Tab 요소는 spec shapes가 렌더링 (`isSkippedChild` 처리)
  - Panel 요소는 컨테이너 시스템으로 내부 렌더링
  - `effectiveElementWithTabs`: `_tabLabels` prop 주입으로 동적 탭 레이블 지원
  - Panel은 element tree에 자식이 없으므로 Tabs 높이 계산은 childElements 블록 **밖**에서 처리
- **Card**: Heading + Description 자식 Element를 내부에서 렌더링
  - `createContainerChildRenderer`에서 `Card.props.heading/title/description`을 자식에 주입
  - 자식 Heading/Description은 TEXT_TAGS 경로 → TextSprite 렌더링
  - Card spec shapes는 배경/테두리/그림자만 담당 (텍스트 미포함)
- **TagGroup**: Label + TagList를 column 방향으로 배치하는 컨테이너
  - CONTAINER_TAGS로 등록 — spec shapes 렌더링 없이 자식 Element를 직접 배치
  - Label은 자식 Element(TEXT_TAGS 경로 → TextSprite)가 렌더링 — spec shapes에서 중복 렌더링 금지
  - TagGroup.spec.ts의 shapes()는 배경/테두리 등 시각 컨테이너 요소만 반환 (label 텍스트 미포함)
  - isYogaSizedContainer로 분류: Yoga가 Label + TagList 높이 합산으로 컨테이너 크기 자동 결정
- **Breadcrumbs**: `filteredContainerChildren = []` — 자식 Breadcrumb 텍스트를 `_crumbs` 배열로 주입하여 spec shapes에서 렌더링
  - CONTAINER_TAGS로 등록 — 자식 Breadcrumb 요소를 element tree에서 직접 배치하지 않음
  - `ElementSprite.tsx`에서 `tag === 'breadcrumbs'` 분기: 자식 중 `tag === 'Breadcrumb'`인 요소의 `props.children` 수집 → `_crumbs` prop 주입
  - `Breadcrumbs.spec.ts`의 shapes()가 `_crumbs` 배열 기반으로 구분자 포함 텍스트 shape 렌더링
  - SPEC_SHAPES_INPUT_TAGS에 `'breadcrumbs'` 포함 → `enrichWithIntrinsicSize`의 contentHeight ≤ 0 early return 우회

## 사용법

```bash
# 특정 규칙 적용 예시
# 1. rules/ 폴더에서 관련 규칙 확인
# 2. Incorrect 예시 패턴 검색
# 3. Correct 예시로 수정
```

## 규칙 파일 형식

모든 규칙 파일은 Vercel Agent Skills 패턴을 따릅니다:

```markdown
---
title: 규칙 제목
impact: CRITICAL | HIGH | MEDIUM-HIGH | MEDIUM | LOW
impactDescription: 영향 설명
tags: [tag1, tag2]
---

규칙 설명

## Incorrect
잘못된 코드 예시

## Correct
올바른 코드 예시
```

## Deprecated Rules (폐기된 규칙)

- ~~**[pixi-layout-import-first](rules/pixi-layout-import-first.md)**~~ - Phase 11에서 @pixi/layout 제거로 폐기

## 아키텍처 결정 기록 (ADR)

주요 기술 결정의 배경과 근거:
- **[ADR-001](../../../docs/adr/001-state-management.md)** - Zustand 선택 이유
- **[ADR-002](../../../docs/adr/002-styling-approach.md)** - ITCSS + tv() 선택 이유
- **[ADR-003](../../../docs/adr/003-canvas-rendering.md)** - Canvas 렌더링 (CanvasKit/Skia 이중 렌더러 + Taffy/Dropflow 레이아웃 엔진)
- **[ADR-004](../../../docs/adr/004-preview-isolation.md)** - iframe 격리 이유
- **[Component Spec Architecture](../../../docs/COMPONENT_SPEC_ARCHITECTURE.md)** - 단일 소스 컴포넌트 스펙 설계
- **[Engine Upgrade](../../../docs/ENGINE_UPGRADE.md)** - CSS 레이아웃 엔진 설계문서 (아키텍처, Phase별 구현, 이슈 내역)
- **[Engine Strategy D](../../../docs/ENGINE.md)** - 레이아웃 엔진 전환 전략 (Taffy WASM + Dropflow Fork)

## 기여

새 규칙 추가 시:
1. `rules/_template.md` 복사
2. 적절한 접두사 사용 (style-, type-, react-aria- 등)
3. SKILL.md에 규칙 링크 추가
4. impact 레벨 적절히 설정
