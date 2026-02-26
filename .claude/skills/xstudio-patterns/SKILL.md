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
- **[domain-structure-change-audit](rules/domain-structure-change-audit.md)** - Element 트리 구조 변경 시 소비자 감사 필수

#### Zustand (zustand-*) - 상태 관리
- **[zustand-childrenmap-staleness](rules/zustand-childrenmap-staleness.md)** - childrenMap은 props 변경 시 갱신 안 됨 → elementsMap 최신 조회, useRef 캐싱 필수

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

#### WASM (wasm-*)
- **CRITICAL**: wasm-pack `--target bundler` 출력은 `import()`만으로 내부 `wasm` 바인딩이 초기화되지 않음 → **반드시 default export(`__wbg_init`)를 명시적으로 호출** 필수. 미호출 시 glue 코드의 `wasm` 전역 변수가 `undefined`로 남아 모든 WASM 함수 호출 실패 (`TypeError: Cannot read properties of undefined`)
  ```typescript
  // ✅ 올바른 초기화 패턴 (rustWasm.ts)
  const mod = await import('./pkg/xstudio_wasm');
  if (typeof mod.default === 'function') {
    await mod.default(); // __wbg_init() → fetch .wasm → instantiate → finalize
  }
  // 이후 mod.ping(), mod.TaffyLayoutEngine 등 사용 가능

  // ❌ import만으로는 wasm 바인딩 미초기화
  const mod = await import('./pkg/xstudio_wasm');
  mod.ping(); // TypeError — wasm 전역 변수가 undefined
  ```

#### Security (postmessage-*)
- **[postmessage-origin-verify](rules/postmessage-origin-verify.md)** - origin 검증 필수

#### Component Spec (spec-*)
- **[spec-build-sync](rules/spec-build-sync.md)** - @xstudio/specs 빌드 동기화 필수
- **[spec-value-sync](rules/spec-value-sync.md)** - Spec ↔ Builder ↔ CSS 값 동기화
- **CRITICAL**: Spec shapes 내 숫자 연산에 TokenRef 값을 직접 사용 금지 → `resolveToken()` 변환 필수 (TokenRef 문자열을 수 연산에 사용하면 NaN 좌표 → 렌더링 실패)
- **CRITICAL**: Spec shapes() 내 `_hasChildren` 체크 패턴 필수 → `const hasChildren = !!(props as Record<string, unknown>)._hasChildren; if (hasChildren) return shapes;` (배경/테두리 shapes 정의 직후, standalone 콘텐츠 shapes 직전에 배치)
- **CRITICAL**: Child Spec 추가 시 반드시 `packages/specs/src/index.ts` (빌드 엔트리) + `packages/specs/src/components/index.ts` 양쪽에 export 추가 후 `pnpm build:specs` 실행 필수
- **CRITICAL**: 자식 Element가 독립 렌더링하려면 `ElementSprite.tsx`의 `TAG_SPEC_MAP`에 해당 태그의 Spec을 등록해야 함

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

#### Monolithic vs Compositional 구분

```typescript
// ✅ Compositional (Card 패턴) — 자식 Element가 store에 존재
// Select, Card, Tabs 등
// - isFormElement: 제외
// - SPEC_SHAPES_INPUT_TAGS: 제외
// - enrichment: CSS padding 경로 (padding 추가)
// - calculateContentHeight: 자식 순회 합산

// ❌ Monolithic (Spec Shapes 기반) — spec shapes가 전체 렌더링
// ComboBox, Dropdown, Breadcrumbs 등
// - SPEC_SHAPES_INPUT_TAGS: 포함
// - enrichment: spec shapes 경로 (padding 미추가, 전체 시각적 높이 반환)
```

#### CSS 값 일관성 규칙

```typescript
// ✅ 0 값이 유효한 CSS 속성 파싱
const gapParsed = typeof gapRaw === 'number' ? gapRaw : parseFloat(String(gapRaw ?? ''));
const gap = isNaN(gapParsed) ? defaultGap : gapParsed;  // 0은 유효

// ❌ falsy 체크로 0이 기본값으로 대체
const gap = parseFloat(gapRaw) || 8;  // gap:0 → 8 (버그!)

// ✅ shorthand + longhand 통합 파싱
const hasUserPadding = cs.padding !== undefined
  || cs.paddingTop !== undefined || cs.paddingBottom !== undefined
  || cs.paddingLeft !== undefined || cs.paddingRight !== undefined;
const pad = hasUserPadding ? parsePadding(cs) : null;

// ❌ longhand만 체크 (shorthand padding 무시)
const padTop = cs.paddingTop ?? specDefault;
```

#### DEFAULT_ELEMENT_HEIGHTS 주의사항

`DEFAULT_ELEMENT_HEIGHTS`의 하드코딩 값은 Tailwind CSS v4 `line-height: 1.5`와 불일치할 수 있습니다.
TEXT_LEAF_TAGS (label, description 등)는 step 7의 동적 계산(`fontSize * 1.5`)을 사용해야 합니다.

```typescript
// ✅ 동적 계산 (step 7) — DEFAULT_ELEMENT_HEIGHTS에서 제외
// label: fontSize 14 → 14 * 1.5 = 21
const fs = fontSize ?? 16;
return estimateTextHeight(fs, fs * 1.5);

// ❌ 하드코딩 (step 6) — Tailwind line-height:1.5와 불일치
DEFAULT_ELEMENT_HEIGHTS['label'] = 20;  // 실제 CSS: 21
```

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

#### `calculateContentHeight` — Card Nested Tree 높이 계산

Card는 3단계 트리 구조로 높이를 재귀 계산합니다:
1. **Card**: childElements(CardHeader, CardContent) 기반 flex column 높이 합산
2. **CardHeader/CardContent**: childElements(Heading/Description/Button 등) 기반 높이 계산 — `flexDirection`에 따라 column=합산, row=max
3. **Heading/Description**: TEXT_LEAF_TAGS로 lineHeight 기반 텍스트 높이

```typescript
// ✅ CardHeader/CardContent: flexDirection에 따라 column=합산+gap, row=max
// 자식의 border-box 높이 사용 (content-box + padding + border)
if (tag === 'cardheader' || tag === 'cardcontent') {
  const isColumn = flexDir === 'column' || flexDir === 'column-reverse';
  const childHeights = childElements.map(child => {
    const contentH = calculateContentHeight(child, ...);
    const childBox = parseBoxModel(child, 0, -1);
    return contentH + childBox.padding.top + childBox.padding.bottom
      + childBox.border.top + childBox.border.bottom;
  });
  return isColumn
    ? childHeights.reduce((sum, h) => sum + h, 0) + gap * (n - 1)  // column: 합산
    : Math.max(...childHeights, 0);  // row: max
}

// ❌ 항상 합산(column 가정) — row 변경 시 높이 초과
// ❌ content-box만 합산 — Button의 padding+border 누락
```

#### `enrichWithIntrinsicSize` — padding/border 주입 규칙 (`utils.ts`)

`enrichWithIntrinsicSize`는 **content-box 높이**를 기본으로 주입합니다.
padding/border 추가 여부는 **CSS에 해당 속성이 정의되어 있는지**와 **태그 유형**으로 결정합니다.

```typescript
// ✅ CSS에 padding이 없으면 spec 기본값을 포함 (레이아웃 엔진이 추가하지 않으므로)
// ✅ INLINE_BLOCK_TAGS는 항상 padding+border 포함 (layoutInlineRun이 border-box로 직접 사용)
if (!isSpecShapesInput && (!hasCSSVerticalPadding || isInlineBlockTag)) {
  injectHeight += box.padding.top + box.padding.bottom;
}
if (!isSpecShapesInput && (!hasCSSVerticalBorder || isInlineBlockTag)) {
  injectHeight += box.border.top + box.border.bottom;
}

// ❌ isTreatedAsBorderBox로 Card/Box/Section에 항상 padding 추가 (제거됨)
// → Dropflow/Taffy가 CSS padding을 또 추가 → 이중 계산
// const isTreatedAsBorderBox = (isCardLike || isSectionLike) && boxSizing !== 'content-box';
// if (isTreatedAsBorderBox || !hasCSSVerticalPadding || isInlineBlockTag) { ... }
```

> **핵심 원칙**: CSS에 padding/border가 있으면 레이아웃 엔진(Dropflow/Taffy)이 처리. enrichment에서 중복 추가 금지.

### TextSprite 렌더링 패턴 (2026-02-26)

TextSprite는 Text, Heading, Description, Label, Paragraph, Link 등 **TEXT_TAGS에 포함된 모든 텍스트 요소**의 Canvas 렌더링을 담당합니다.

#### CSS half-leading 재현 (`nodeRenderers.ts`)

CSS `line-height`는 extra leading을 텍스트 **상하 균등 분배** (half-leading)하여 세로 중앙 정렬합니다.
CanvasKit의 `heightMultiplier`는 기본적으로 extra leading을 **하단에만** 추가하므로, 반드시 `halfLeading: true`를 함께 설정해야 합니다.

```typescript
// ✅ halfLeading: true → CSS line-height와 동일한 상하 균등 분배
{ heightMultiplier: heightMultiplierOpt, halfLeading: true }

// ❌ halfLeading 없음 → extra leading이 하단에만 추가, 텍스트가 위로 치우침
{ heightMultiplier: heightMultiplierOpt }
```

#### 문자열 lineHeight 배수 값 파싱 (`styleConverter.ts`)

CSS `line-height`는 단위 없는 숫자일 때 배수 값입니다 (예: `"1.4"` = fontSize의 1.4배).
`convertToTextStyle()`에서 문자열 배수 값을 픽셀 값으로 오인하면 `leading = 0`이 되어 halfLeading이 적용되지 않습니다.

```typescript
// ✅ 문자열 배수 값도 올바르게 판별 ("1.4", "1.5" 등)
const isMultiplier = lh < 10 && (
  typeof style.lineHeight === 'number' ||
  (typeof style.lineHeight === 'string' && /^\d*\.?\d+$/.test(style.lineHeight.trim()))
);
if (isMultiplier) {
  leading = (lh - 1) * fontSize;  // 배수: (1.4 - 1) * 16 = 6.4
}

// ❌ typeof === 'number' 만 체크 → 문자열 "1.4"가 픽셀로 처리
// leading = max(0, 1.4 - 16) = 0 → lineHeight 미전달 → halfLeading 미적용
```

**영향 범위**: 이 설정은 `renderText()` 함수에 위치하며, TextSprite 경로와 Spec shapes 텍스트 경로 **모두**에 적용됩니다:
- TextSprite → `useSkiaNode` → `renderText()` (Text, Heading, Description 등)
- Spec shapes → `specShapeConverter` → `renderText()` (Button, Badge, Input 등)

#### Text 요소의 display:flex 처리 (`ElementSprite.tsx`, `TextSprite.tsx`)

Text는 leaf 요소이므로 `display: flex`를 적용해도 항상 **TextSprite**로 렌더링해야 합니다.
`getSpriteType()`에서 TEXT_TAGS/IMAGE_TAGS 체크는 flex/grid 체크보다 **위에** 배치합니다.

```typescript
// ✅ TEXT/IMAGE 우선 → leaf 요소는 display 값과 무관하게 전용 Sprite
if (TEXT_TAGS.has(tag)) return 'text';
if (IMAGE_TAGS.has(tag)) return 'image';
if (isFlexContainer(element)) return 'flex';  // 컨테이너만 도달

// ❌ flex/grid 먼저 → Text+display:flex가 BoxSprite로 렌더링, 텍스트 사라짐
if (isFlexContainer(element)) return 'flex';
if (TEXT_TAGS.has(tag)) return 'text';
```

Text에 flex 속성(justify-content, align-items)이 있으면 TextSprite의 `flexAlignment` memo에서 텍스트 수평/수직 정렬로 매핑합니다.

#### width:fit-content 텍스트 측정 (`utils.ts`, `TextSprite.tsx`)

- `calculateContentWidth()`: 실제 fontFamily, fontWeight, letterSpacing을 사용하여 측정 (기본값 사용 금지)
- TextSprite `wordWrapWidth`: 항상 `transform.width` 사용 (FIT_CONTENT sentinel `-2`가 누출되지 않도록)

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

// ✅ Card: title/description → Heading/Description 자식에 주입 (2026-02-26 heading 제거)
if (containerTag === 'Card') {
  const cardProps = containerElement.props;
  if (childEl.tag === 'Heading') {
    const headingText = cardProps?.title;
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
| `Card`   | `title` | `Heading`    | `children`    |
| `Card`   | `description`           | `Description`| `children`    |
| Input Fields (`TextField`, `NumberField`, `SearchField`, `DateField`, `TimeField`, `ColorField`) | `label` | `Label` | `children` |
| Overlay (`Dialog`, `Popover`, `Tooltip`, `Toast`) | `heading` 또는 `title` | `Heading` | `children` |
| Overlay (`Dialog`, `Popover`, `Tooltip`, `Toast`) | `description` 또는 `message` | `Description` | `children` |

**새 컨테이너 컴포넌트에 이 패턴을 적용할 때 체크리스트**:
1. Editor가 업데이트하는 부모 props 키 확인
2. TextSprite가 읽는 자식 Element의 prop 확인 (보통 `children`)
3. `createContainerChildRenderer` 내 `containerTag === 'XXX'` 분기 추가
4. fallback: 부모 props 값이 `null`/`undefined`이면 자식 초기값 유지

상세 내용: [pixi-hybrid-layout-engine](rules/pixi-hybrid-layout-engine.md#container-props-주입-패턴-container_props_injection)

### 자식 조합 패턴 (Child Composition Pattern) (2026-02-24)

Figma, Pencil App, HTML+CSS DOM 구조와 일치하도록 컴포넌트를 자식 조합형으로 전환하는 패턴입니다.
Spec shapes는 배경/테두리/그림자만 담당하고, 자식 Element가 콘텐츠(Label, Input, Description 등)를 렌더링합니다.

#### 핵심 구조

```
Parent Component (spec shapes: 배경/테두리만)
├── Label (자식 Element → TextSprite 렌더링)
├── Input / Content (자식 Element)
└── Description / Footer (자식 Element)
```

#### Child Spec 등록 (2026-02-25 Compositional 전환)

Compositional 전환으로 7개의 독립 child spec이 생성되었습니다:

| Child Spec | 파일 | 용도 | 사용 parent |
|-----------|------|------|-------------|
| `LabelSpec` | `Label.spec.ts` | 라벨 텍스트 | TextField, NumberField, SearchField, DateField, TimeField, Slider |
| `FieldErrorSpec` | `FieldError.spec.ts` | 에러 메시지 | TextField, NumberField, SearchField, DateField |
| `DescriptionSpec` | `Description.spec.ts` | 설명 텍스트 | Card, Dialog, Popover |
| `SliderTrackSpec` | `SliderTrack.spec.ts` | 트랙 바 + fill | Slider, RangeSlider |
| `SliderThumbSpec` | `SliderThumb.spec.ts` | 원형 thumb | Slider, RangeSlider |
| `SliderOutputSpec` | `SliderOutput.spec.ts` | 값 텍스트 표시 | Slider, RangeSlider |
| `DateSegmentSpec` | `DateSegment.spec.ts` | 날짜/시간 세그먼트 | DateField, TimeField |

**TAG_SPEC_MAP 등록** (`ElementSprite.tsx`):
```typescript
'Label': LabelSpec,
'FieldError': FieldErrorSpec,
'Description': DescriptionSpec,
'SliderTrack': SliderTrackSpec,
'SliderThumb': SliderThumbSpec,
'SliderOutput': SliderOutputSpec,
'DateSegment': DateSegmentSpec,
'TimeSegment': DateSegmentSpec,  // DateSegmentSpec 재사용
```

**SPEC_RENDERS_ALL_TAGS 폐기**: 이전에 9개 compound 컴포넌트의 `childElements=[]`를 강제하던 `SPEC_RENDERS_ALL_TAGS` Set은 **완전 제거**되었습니다. 모든 자식 Element가 정상적으로 canvas에서 렌더링됩니다.

#### `_hasChildren` 주입 방식: 2단계 판단 로직 (2026-02-25 Compositional 전환)

`ElementSprite.tsx`에서 `_hasChildren: true` flag를 spec props에 주입합니다.
아래 2단계를 순서대로 평가하며, **1단계에서 제외되면 2단계는 실행되지 않습니다**.

**1단계 — Opt-out 가드 (CHILD_COMPOSITION_EXCLUDE_TAGS)**: 이 Set에 포함된 태그는 주입 자체를 건너뜁니다. synthetic prop 메커니즘(`_crumbs`, `_tabLabels` 등)을 별도로 사용하거나 다단계 중첩이 필요한 컴포넌트가 여기에 속합니다.

**2단계 — 자식 존재 여부**: 1단계를 통과한 모든 컴포넌트는 자식 Element가 실제로 있을 때만 `_hasChildren: true`를 주입합니다. Compositional 전환으로 자식 Element가 독립 spec으로 렌더링하므로, `COMPLEX_COMPONENT_TAGS` 기반 강제 주입은 불필요해졌습니다.

```typescript
// ElementSprite.tsx — 2단계 판단 로직 (2026-02-25 Compositional 전환)

const CHILD_COMPOSITION_EXCLUDE_TAGS = new Set([
  'Tabs',        // _tabLabels synthetic prop 사용 (별도 메커니즘)
  'Breadcrumbs', // _crumbs synthetic prop 사용 (별도 메커니즘)
  'TagGroup',    // _tagItems synthetic prop 사용 (별도 메커니즘)
  'Table',       // 다단계 중첩 구조 (별도 작업)
  'Tree',        // 다단계 중첩 구조 (별도 작업)
]);

// 1단계: CHILD_COMPOSITION_EXCLUDE_TAGS → 포함되면 주입 스킵
if (!CHILD_COMPOSITION_EXCLUDE_TAGS.has(tag)) {
  // 2단계: 실제 자식 존재 여부로만 판단
  if (childElements && childElements.length > 0) {
    specProps = { ...specProps, _hasChildren: true };
  }
}
```

**Compositional 전환 이전(버그)**: `COMPLEX_COMPONENT_TAGS.has(tag)` → 항상 _hasChildren=true → parent monolithic spec이 모든 것을 렌더링, 자식은 ghost element.
**Compositional 전환 이후**: 자식 Element가 독립 spec(LabelSpec, FieldErrorSpec 등)으로 렌더링하므로, _hasChildren는 실제 childElements.length > 0으로만 판단.

**`CHILD_COMPOSITION_EXCLUDE_TAGS`에 등록되는 이유**:
- **synthetic prop 사용 컴포넌트** (Tabs, Breadcrumbs, TagGroup): 자체 prop 주입 메커니즘이 별도로 있어 `_hasChildren` 방식이 필요 없음
- **다단계 중첩 구조** (Table, Tree): 자식 렌더링이 복잡하여 별도 구현 필요

#### Non-complex 컴포넌트: standalone 복귀는 의도된 동작

아래 컴포넌트들은 자식 Element가 없을 때 standalone spec shapes로 렌더링하는 것이 **설계상 올바른 동작**입니다.

| 컴포넌트 | 이유 |
|---------|------|
| `Button` | 자식 없이 단독으로 standalone 텍스트 렌더링 가능 |
| `Badge` | 자식 없이 단독으로 standalone 텍스트 렌더링 가능 |
| `ToggleButton` | 자식 없이 단독으로 standalone 텍스트 렌더링 가능 |
| `Slot` | 단일 플레이스홀더 요소 |
| `Panel` | Tabs 내부 전용, 자체 렌더링 없음 |
| `ProgressBar` | 자식 없이 label+track standalone 렌더링 가능 |
| `Meter` | 자식 없이 label+bar standalone 렌더링 가능 |
| `DropZone` | 자식 없이 standalone 렌더링 가능 |
| `FileTrigger` | 자식 없이 standalone 렌더링 가능 |
| `ScrollBox` | 단순 스크롤 컨테이너 |
| `MaskedFrame` | 단순 마스크 컨테이너 |
| `Section` | 단순 레이아웃 컨테이너 |
| `Group` | 단순 그룹 컨테이너 |

> **주의**: 위 컴포넌트들도 spec 파일에서 `_hasChildren`을 체크합니다. 이는 미래에 자식을 추가했을 때 동작하도록 설계된 것이며, 현재 자식이 없는 상태에서 standalone 렌더링이 정상입니다.

#### Spec shapes() 패턴 — 3가지 카테고리

| 카테고리 | TRANSPARENT | `_hasChildren` 시 반환 | 예시 |
|---------|-------------|---------------------|------|
| Input Fields | ✅ (TRANSPARENT_CONTAINER_TAGS) | bg + border shapes만 | TextField, NumberField, SearchField 등 |
| Overlay / Navigation | ❌ | bg + shadow + border shapes 유지 | Dialog, Popover, Menu, Toolbar 등 |
| Groups (transparent) | ✅ | 빈 배열 `[]` | CheckboxGroup, RadioGroup |
| Date & Color Composites | ❌ | bg shapes 유지, 복합 콘텐츠 스킵 | DatePicker, Calendar, ColorPicker 등 |

**TRANSPARENT 컨테이너 패턴** (Input Fields):
```typescript
// ✅ bg/border 이후 _hasChildren 체크
const shapes: Shape[] = [
  { id: 'bg', type: 'roundRect', ... },  // 배경
  { type: 'border', target: 'bg', ... }, // 테두리
];
const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
if (hasChildren) return shapes; // bg+border만 반환

// 아래부터 standalone 전용 텍스트/콘텐츠 shapes
shapes.push({ type: 'text', ... });
return shapes;
```

**NON-TRANSPARENT 컨테이너 패턴** (Overlay/Navigation):
```typescript
// ✅ shadow + bg + border 이후 _hasChildren 체크
const shapes: Shape[] = [
  { type: 'shadow', target: 'bg', ... },  // 그림자
  { id: 'bg', type: 'roundRect', ... },   // 배경
  { type: 'border', target: 'bg', ... },  // 테두리
];
if (hasChildren) return shapes; // shell만 반환

// 아래부터 standalone 전용 container/text shapes
shapes.push({ type: 'container', ... });
return shapes;
```

**❌ 잘못된 패턴** — 배경 shapes 없이 빈 배열 반환:
```typescript
// ❌ NON-TRANSPARENT 컴포넌트가 빈 배열 반환 → 배경 미렌더링
const shapes: Shape[] = [];
if (hasChildren) return shapes; // 배경도 없음!
```

#### Standalone shapes에서의 label 렌더링 패턴

`_hasChildren: false`일 때(standalone 모드) spec shapes에서 label을 직접 렌더링하는 표준 패턴입니다.
label이 있으면 y=0에 배치하고, 이후 모든 shapes는 `labelOffset`만큼 y를 이동시킵니다.

```typescript
import { resolveToken } from '../renderers/utils/tokenResolver';

// shapes 함수 내부 — resolveToken으로 fontSize 해결 후 label 계산
const rawFontSize = props.style?.fontSize ?? size.fontSize;
const resolvedFs = typeof rawFontSize === 'number'
  ? rawFontSize
  : (typeof rawFontSize === 'string' && rawFontSize.startsWith('{')
      ? resolveToken(rawFontSize as TokenRef)
      : rawFontSize);
const fontSize = typeof resolvedFs === 'number' ? resolvedFs : 16;

// ✅ label 높이 및 offset 계산
const labelFontSize = fontSize - 2;
const labelHeight = Math.ceil(labelFontSize * 1.2);
const labelGap = size.gap ?? 8;
const labelOffset = props.label ? labelHeight + labelGap : 0;

// ✅ label shape — 항상 y=0에 배치
if (props.label) {
  shapes.push({
    type: 'text' as const,
    x: 0,
    y: 0,
    text: props.label,
    fontSize: labelFontSize,
    fontFamily: ff,
    fontWeight,
    fill: variant.text,
    align: textAlign,
    baseline: 'top' as const,
  });
}

// ✅ 이후 모든 shapes는 y에 labelOffset 추가
shapes.push({
  id: 'bg',
  type: 'roundRect' as const,
  x: 0,
  y: labelOffset,  // label이 없으면 0, 있으면 labelHeight + labelGap
  width,
  height,
  ...
});

// ✅ 내부 콘텐츠도 labelOffset 기준으로 배치
shapes.push({
  type: 'text' as const,
  x: paddingX,
  y: labelOffset + height / 2,  // 입력 필드 세로 중앙
  ...
});

// ❌ labelOffset 미적용 — label과 입력 필드가 겹침
shapes.push({
  id: 'bg',
  type: 'roundRect' as const,
  x: 0,
  y: 0,  // label 아래로 내려가지 않음
  ...
});
```

**적용 컴포넌트**: `NumberField.spec.ts`, `SearchField.spec.ts` 등 label prop을 직접 standalone shapes에서 렌더링하는 모든 Input Field 계열.

**주의**: `_hasChildren: true`이면 이 패턴은 실행되지 않습니다. `_hasChildren` 체크 이후의 standalone 전용 경로에 배치해야 합니다.

#### Container Props 주입 확장 (`BuilderCanvas.tsx`)

```typescript
// Input Field 계열: props.label → Label.children
if (['TextField', 'NumberField', 'SearchField', 'DateField', 'TimeField', 'ColorField'].includes(containerTag)) {
  if (childEl.tag === 'Label') {
    const labelText = fieldProps?.label;
    if (labelText != null) {
      effectiveChildEl = { ...childEl, props: { ...childEl.props, children: String(labelText) } };
    }
  }
}

// Overlay 계열: props.heading/description → Heading/Description.children
if (['Dialog', 'Popover', 'Tooltip', 'Toast'].includes(containerTag)) {
  if (childEl.tag === 'Heading') {
    const headingText = overlayProps?.heading ?? overlayProps?.title;
    // ... 주입
  } else if (childEl.tag === 'Description') {
    const descText = overlayProps?.description ?? overlayProps?.message;
    // ... 주입
  }
}
```

확장된 주입 규칙 테이블:

| 컨테이너 | 부모 props 키 | 대상 자식 tag | 주입 대상 prop |
|----------|--------------|--------------|---------------|
| `Tabs` | `_tabLabels` | `Tab` | `_tabLabels` |
| `Card` | `heading` 또는 `title` | `Heading` | `children` |
| `Card` | `description` | `Description` | `children` |
| Input Fields (6종) | `label` | `Label` | `children` |
| Overlay (4종) | `heading` 또는 `title` | `Heading` | `children` |
| Overlay (4종) | `description` 또는 `message` | `Description` | `children` |

#### border-box 높이 계산 수정 (`engines/utils.ts`)

`calculateContentHeight` flex column 분기에서 border-box 이중 계산 방지:

```typescript
// ✅ 자식의 explicit height가 border-box이면 padding+border 미추가
const childIsBorderBox = childBoxSizing === 'border-box' ||
  (childIsFormEl && childExplicitH !== undefined);

if (childExplicitH !== undefined && childIsBorderBox) {
  return childExplicitH; // border-box: explicit height가 이미 padding+border 포함
}
// content-box: padding + border 추가
return contentH + childBox.padding.top + childBox.padding.bottom
  + childBox.border.top + childBox.border.bottom;
```

#### Dropflow fallback flex 처리 (`engines/index.ts`)

Taffy WASM 초기화 실패 시 (`isRustWasmReady() === false`) Dropflow 결과를 flex row/column + gap으로 후처리 (안전 폴백):

```typescript
// ✅ Dropflow fallback: flex-direction + gap 수동 처리
if (!(engine instanceof TaffyFlexEngine) && results.length > 0) {
  if (isRow) {
    let xOffset = 0;
    for (let i = 0; i < results.length; i++) {
      if (i > 0) xOffset += gapVal;
      results[i] = { ...results[i], x: xOffset, y: 0 };
      xOffset += results[i].width;
    }
  } else if (isColumn && gapVal > 0) {
    // column gap 처리...
  }
}
```

#### 하위호환

`_hasChildren`가 `false`이면 (구 데이터, 자식 없음) → spec shapes 전체 렌더링. 신규 데이터 (factory 자식 생성) → `_hasChildren: true` → 자식이 렌더링.

#### 신규 컴포넌트 등록 체크리스트

1. **Spec 파일** (`packages/specs/src/components/XXX.spec.ts`):
   - shapes() 내 배경/테두리/그림자 shapes를 먼저 정의
   - `_hasChildren` 체크 → 배경 shapes만 반환 (TRANSPARENT) 또는 shell shapes만 반환 (NON-TRANSPARENT)
   - standalone 텍스트/콘텐츠 shapes는 체크 이후에 추가
   - **CRITICAL**: `size.fontSize` 또는 `props.style?.fontSize`를 숫자 연산에 사용하기 전 반드시 `resolveToken()` 패턴 적용 (`as unknown as number` 캐스팅 금지 → NaN 발생)
   - label이 있는 standalone shapes는 반드시 `labelOffset` 계산 후 y 좌표 오프셋 적용

2. **`COMPLEX_COMPONENT_TAGS` 등록** (`apps/builder/src/builder/factories/constants.ts`):
   - factory가 자식 Element를 생성하는 복합 컴포넌트라면 Factory 경로 분기 목적으로 이 Set에 추가 (`useElementCreator.ts`가 참조)
   - **Compositional 전환 이후**: `_hasChildren` 주입은 실제 childElements.length > 0으로만 결정되므로, 이 Set 등록이 `_hasChildren`에 영향을 주지 않음
   - `CHILD_COMPOSITION_EXCLUDE_TAGS` 소속 태그(Tabs, TagGroup 등)도 Factory 경로 분기용으로 등록

3. **ElementSprite.tsx**:
   - Child Spec을 독립 렌더링하려면 `TAG_SPEC_MAP`에 해당 태그의 Spec 클래스 등록 (필수)
   - synthetic prop 메커니즘을 별도로 사용하거나 다단계 중첩 구조라면 `CHILD_COMPOSITION_EXCLUDE_TAGS`에 추가
   - 배경/테두리를 spec이 담당하면 `TRANSPARENT_CONTAINER_TAGS`에도 추가
   - spec shapes가 `labelOffset` 기반으로 세로 레이아웃을 자체 계산하면 `SPEC_RENDERS_ALL_TAGS_SET`에도 추가 (`rearrangeShapesForColumn` 이중 변환 방지)

4. **BuilderCanvas.tsx**:
   - 기본적으로 모든 컴포넌트가 컨테이너로 처리됨 — 추가 작업 불필요
   - 단, TEXT_TAGS / void 요소 / Color Sub 컴포넌트처럼 자식 내부 렌더링이 불필요하면 `NON_CONTAINER_TAGS`에 추가
   - `createContainerChildRenderer` 내 props sync 분기 추가 (label, heading, description 등)

5. **레이아웃 엔진** (`apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts`):
   - spec shapes 기반의 자체 높이를 가진 컴포넌트는 `SPEC_SHAPES_INPUT_TAGS`에 추가 (`enrichWithIntrinsicSize`의 contentHeight ≤ 0 early return 우회)

6. **Factory 정의** (`apps/builder/src/builder/factories/definitions/`):
   - ComponentDefinition에 자식 Element 정의 (Label, Input, Description 등)
   - `ComponentFactory.ts`에 creator 등록

7. **검증**:
   - `pnpm build` (specs 빌드)
   - `pnpm type-check` 통과
   - Canvas에서 드래그 앤 드롭 → 배경 + 자식 정상 렌더링
   - Layer 트리에서 자식 선택 → 스타일 편집 → Canvas 반영
   - 구 데이터 (자식 없음) → standalone 렌더링 유지
   - **자식을 모두 삭제해도 빈 shell 유지** (standalone spec shapes로 되돌아가지 않음)
   - fontSize가 TokenRef인 경우 NaN 없이 정상 렌더링 확인


#### Property Editor 자식 동기화 패턴 (2026-02-25)

**왜 필요한가**: 부모 컴포넌트의 spec shapes()는 `_hasChildren: true`일 때 빈 배열(또는 shell만)을 반환합니다. 실제 label, placeholder 등의 텍스트 렌더링은 자식 Element(Label, Input 등)가 담당합니다. 따라서 Properties Panel에서 부모 prop을 변경할 때, 부모 Element의 props 업데이트만으로는 Canvas에 텍스트가 반영되지 않습니다. **자식 Element의 대응 prop도 함께 업데이트해야** 합니다.

**`useSyncChildProp` 훅** (`apps/builder/src/builder/hooks/useSyncChildProp.ts`):

```typescript
interface ChildPropSync {
  childTag: string;  // 자식 Element의 tag (예: 'Label', 'Input')
  propKey: string;   // 자식 Element에서 업데이트할 prop 키
  value: string;     // 적용할 값
}

export function useSyncChildProp(elementId: string) {
  const buildChildUpdates = useCallback(
    (syncs: ChildPropSync[]): BatchPropsUpdate[] => {
      // childrenMap O(1) 탐색으로 직계 자식의 props 업데이트 목록 생성
    },
    [elementId],
  );
  return { buildChildUpdates };
}
```

**`useSyncGrandchildProp` 훅** (`apps/builder/src/builder/hooks/useSyncGrandchildProp.ts`):

Select, ComboBox처럼 직계 자식이 아닌 손자(grandchild)에 prop을 동기화해야 하는 경우에 사용합니다.
2단계 childrenMap 탐색을 수행합니다.

```typescript
// Select: SelectTrigger → SelectValue.children
// ComboBox: ComboBoxWrapper → ComboBoxInput.placeholder
export function useSyncGrandchildProp(elementId: string) {
  const buildGrandchildUpdates = useCallback(
    (syncs: GrandchildPropSync[]): BatchPropsUpdate[] => { ... },
    [elementId],
  );
  return { buildGrandchildUpdates };
}
```

**`updateSelectedPropertiesWithChildren` store 메서드** (`inspectorActions.ts`):

부모 props와 자식 props를 **단일 batch 히스토리 엔트리**로 원자적으로 업데이트합니다.

```typescript
// ✅ 부모 + 자식을 atomic batch로 업데이트 — Undo 1회로 전체 원복
const handleLabelChange = useCallback((value: string) => {
  const updatedProps = { ...currentProps, label: value };
  const childUpdates = buildChildUpdates([
    { childTag: 'Label', propKey: 'children', value },
  ]);
  useStore.getState().updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
}, [currentProps, buildChildUpdates]);

// ❌ 구 패턴 — 2회 호출로 히스토리 엔트리 2개 생성 (Undo 2회 필요)
onUpdate({ label: value });
syncChildProp('Label', 'children', value);
```

**CRITICAL**: 새로운 Complex 컴포넌트의 Property Editor를 만들 때는 반드시 `useSyncChildProp` 훅을 사용하여 자식 동기화를 구현할 것. 인라인 syncChildProp 코드 작성 금지.

#### 에디터별 자식 동기화 매핑

| 에디터 | 부모 prop | 자식 Tag | 자식 propKey | 패턴 |
|--------|----------|----------|-------------|------|
| `TextFieldEditor` | `label` | `Label` | `children` | child |
| `TextFieldEditor` | `placeholder` | `Input` | `placeholder` | child |
| `NumberFieldEditor` | `label` | `Label` | `children` | child |
| `NumberFieldEditor` | `placeholder` | `Input` | `placeholder` | child |
| `SearchFieldEditor` | `label` | `Label` | `children` | child |
| `SearchFieldEditor` | `placeholder` | `Input` | `placeholder` | child |
| `CheckboxEditor` | `children` | `Label` | `children` | child |
| `RadioEditor` | `children` | `Label` | `children` | child |
| `SwitchEditor` | `children` | `Label` | `children` | child |
| `CardEditor` | `heading` | `Heading` | `children` | child |
| `CardEditor` | `description` | `Description` | `children` | child |
| `SliderEditor` | `label` | `Label` | `children` | child |
| `SelectEditor` | `label` | `Label` | `children` | child |
| `SelectEditor` | `placeholder` | `SelectTrigger` → `SelectValue` | `children` | grandchild |
| `ComboBoxEditor` | `label` | `Label` | `children` | child |
| `ComboBoxEditor` | `placeholder` | `ComboBoxWrapper` → `ComboBoxInput` | `placeholder` | grandchild |

상세 내용: [domain-history-integration](rules/domain-history-integration.md#child-composition-pattern-batch-히스토리)

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
이를 `as unknown as number`로 캐스팅하면 NaN이 발생하므로 반드시 안전한 변환 패턴을 사용해야 합니다.
두 가지 패턴이 존재하며, **spec shapes 내부에서는 `resolveToken()` 직접 호출 패턴을 사용합니다**.

#### 패턴 A: `resolveToken()` 직접 호출 (Spec shapes 내부 — 권장)

spec shapes 함수 내에서 `props.style?.fontSize` 또는 `size.fontSize`를 처리할 때 사용합니다.
`resolveToken()`은 TokenRef 문자열을 실제 숫자값으로 변환합니다.

```typescript
import { resolveToken } from '../renderers/utils/tokenResolver';

// ✅ Correct: resolveToken()으로 TokenRef 해결 (NumberField.spec.ts, SearchField.spec.ts 패턴)
const rawFontSize = props.style?.fontSize ?? size.fontSize;
const resolvedFs = typeof rawFontSize === 'number'
  ? rawFontSize
  : (typeof rawFontSize === 'string' && rawFontSize.startsWith('{')
      ? resolveToken(rawFontSize as TokenRef)
      : rawFontSize);
const fontSize = typeof resolvedFs === 'number' ? resolvedFs : 16;

// ❌ Incorrect: as unknown as number 캐스팅 (NaN 발생)
const fontSize = size.fontSize as unknown as number;

// ❌ Incorrect: TokenRef 문자열로 산술 연산 (NaN)
const labelFontSize = (size.fontSize as unknown as number) - 2;
// → '{typography.text-md}' - 2 = NaN → 텍스트 shape y 좌표 NaN → 렌더링 실패
```

**로직 흐름**:
1. `props.style?.fontSize`가 있으면 우선 사용 (인라인 스타일 오버라이드)
2. 없으면 `size.fontSize` 사용
3. 숫자이면 그대로 사용
4. `{...}` 형식의 TokenRef 문자열이면 `resolveToken()`으로 실제 값 추출
5. 변환 결과가 숫자가 아니면 기본값 `16` 사용

#### 패턴 B: height 기반 매핑 fallback (외부 유틸리티 코드)

spec 외부(레이아웃 엔진 등)에서 TokenRef를 받을 수 없는 경우, size 이름 기반으로 매핑합니다.

```typescript
// ✅ TokenRef 여부 확인 후 height 매핑으로 fallback
const rawFontSize = spec.size?.fontSize;
const fontSize =
  typeof rawFontSize === 'number'
    ? rawFontSize
    : ({ sm: 12, md: 14, lg: 16 }[size] ?? 14); // height 기반 매핑
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

Checkbox/Radio/Switch 인라인 폼 컴포넌트의 레이아웃 크기 테이블은 해당 컴포넌트 spec 파일의 실제 치수와 **반드시 일치**해야 합니다.

> **Note**: `toggle` 태그는 spec/factory/types 어디에도 정의되지 않은 dead code였으므로 2026-02-26에 레이아웃 엔진 전체에서 제거됨. ToggleButton(tag: `togglebutton`)은 버튼이므로 phantom indicator 불필요. ToggleButtonGroup의 `indicator` prop은 CSS SelectionIndicator(absolute 배치)로 레이아웃 무관.

**핵심 규칙**: `INLINE_FORM_INDICATOR_WIDTHS`(indicator/track 너비)와 `INLINE_FORM_GAPS`(라벨 간격)가 spec과 다르면 `specShapeConverter`의 `maxWidth` 자동 축소 로직(`shape.x > 0`일 때 `containerWidth - shape.x`)에 의해 텍스트 영역이 줄어들어 **라벨이 불필요하게 줄바꿈**됩니다.

```typescript
// engines/utils.ts — 현행 올바른 값 (2026-02-26: toggle 제거)
const INLINE_FORM_INDICATOR_WIDTHS = {
  checkbox: { sm: 16, md: 20, lg: 24 },  // Checkbox.spec.ts indicatorSize
  radio:    { sm: 16, md: 20, lg: 24 },  // Radio.spec.ts indicatorSize
  switch:   { sm: 36, md: 44, lg: 52 },  // Switch.spec.ts trackWidth
};

const INLINE_FORM_GAPS = {
  checkbox: { sm: 6, md: 8,  lg: 10 },
  radio:    { sm: 6, md: 8,  lg: 10 },
  switch:   { sm: 8, md: 10, lg: 12 },   // Switch.spec.ts gap (checkbox보다 2px 큼)
};
```

**수정 이력**:
- switch `INLINE_FORM_INDICATOR_WIDTHS`: `{ sm: 26, md: 34, lg: 42 }` → `{ sm: 36, md: 44, lg: 52 }` (spec trackWidth보다 10px 작았던 값 정정)
- `INLINE_FORM_GAPS` 테이블 신규 추가: 이전에는 크기(sm/md/lg) 기반 고정값만 사용
- `toggle` dead code 제거 (2026-02-26): 레이아웃 엔진 4개 파일에서 삭제

**새 인라인 폼 컴포넌트 추가 시 체크리스트**:
1. 해당 컴포넌트 spec 파일에서 `trackWidth` / `indicatorSize` / `gap` 값 확인
2. `INLINE_FORM_INDICATOR_WIDTHS`에 spec 값과 동일하게 등록
3. `INLINE_FORM_GAPS`에 spec gap과 동일하게 등록
4. spec shapes의 텍스트 `x` 좌표(`indicatorWidth + gap`)와 합산값이 일치하는지 검증

상세 내용: [pixi-hybrid-layout-engine](rules/pixi-hybrid-layout-engine.md#inline_form_indicator_widths--spec-trackwidth와-반드시-일치-critical), [spec-shape-rendering](rules/spec-shape-rendering.md#specshapeconverter-maxwidth-자동-축소와-레이아웃-너비-정합성-critical)

### Phantom Indicator + Compositional Architecture 너비 정합성 (CRITICAL, 2026-02-26)

Checkbox/Radio/Switch의 indicator는 element tree에 존재하지 않지만 spec shapes(Skia)가 시각적으로 그립니다. Compositional Architecture 전환 후 Label이 독립 Element로 분리되면서 `calculateContentWidth`에 **두 가지 누락**이 발생했습니다.

**문제 A — 부모 intrinsic width에 phantom indicator 누락**:
`calculateContentWidth` Section 2(Flex 컨테이너 + childElements 경로)가 자식 width 합산 시 phantom indicator 공간을 누락. Checkbox의 fit-content 너비가 Label 텍스트만큼만 잡혀, TaffyFlexEngine에서 phantom indicator(28px)를 차감하면 Label 공간이 부족.

**문제 B — TEXT_LEAF_TAGS flex 자식 width 미주입**:
`enrichWithIntrinsicSize`가 `INLINE_BLOCK_TAGS`에만 intrinsic width를 주입. Label은 `TEXT_LEAF_TAGS`에만 속해 Flex 자식일 때 Taffy가 content size=0 → width=0 배정.

**해결**:

```typescript
// ✅ Section 2: phantom indicator 공간을 flex 자식 합산에 반영
const phantomW = getPhantomIndicatorSpace(); // indicatorSize + gap (checkbox: 20+8=28)
if (isRow) {
  return childWidths.reduce((sum, w) => sum + w, 0)
    + gap * Math.max(0, childElements.length - 1)
    + phantomW; // ← 추가
}

// ✅ enrichWithIntrinsicSize: isFlexChild 플래그로 TEXT_LEAF_TAGS도 width 주입
const needsWidth = hasExplicitIntrinsicWidthKeyword ||
  (INLINE_BLOCK_TAGS.has(tag) && (!rawWidth || ...)) ||
  (isFlexChild && TEXT_LEAF_TAGS.has(tag) && (!rawWidth || ...)); // ← 추가

// ❌ Section 2에서 phantom 누락 → Checkbox width = Label만 → 텍스트 잘림
// ❌ TEXT_LEAF_TAGS width 미주입 → Taffy flex에서 Label width=0 → 세로 한 글자씩
```

**영향 범위**: Checkbox, Radio, Switch, Toggle — Compositional Architecture(Label 자식 Element)와 legacy(props.children) 모두 정상 동작. Block layout(Dropflow)은 `isFlexChild` 기본값 `false`로 영향 없음.

### TextMeasurer 스타일 정합성 (CRITICAL, 2026-02-26)

**문제**: 레이아웃 측정용 Paragraph와 Skia 렌더링용 Paragraph의 ParagraphStyle이 불일치하면
fit-content 텍스트에서 마지막 글자 줄바꿈 + height 초과 렌더링 발생.

**원칙**: `CanvasKitTextMeasurer`의 ParagraphStyle은 `nodeRenderers.ts` renderText()와
**동일한 속성**을 사용해야 함.

**정합 대상 속성 (폭에 영향):**
- fontSize, fontFamilies, fontWeight
- fontStyle (slant: italic/oblique)
- fontStretch (width: condensed/expanded)
- letterSpacing, wordSpacing
- fontVariant → fontFeatures (small-caps 등)

**정합 대상 속성 (높이에 영향):**
- 위 속성 전부 (줄바꿈 위치 변경 → 줄 수 변경)
- heightMultiplier + halfLeading: true

**3곳 동시 유지:**
1. `canvaskitTextMeasurer.ts` — 측정용 ParagraphStyle
2. `nodeRenderers.ts` renderText() — 렌더링용 ParagraphStyle
3. `TextMeasureStyle` 인터페이스 — 두 ParagraphStyle에 전달할 스타일 필드

**금지:**
- `calculateTextWidth()`에서 `Math.round`/`Math.ceil` 사용 금지 — float 정밀도 유지 필수
- `estimateTextHeight()`에서 `Math.round` 사용 금지 — 동일 이유
- `calculateContentHeight()`에서 fontWeight 하드코딩 금지 — 실제 element style 사용
- `measureTextWidth()` 호출 시 letterSpacing 수동 가산 금지 — 측정기 내부에서 처리

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

### Complex Component 목록 및 `COMPLEX_COMPONENT_TAGS` 공유 상수

자식 DOM 구조를 factory로 생성하는 복합 컴포넌트입니다.

**`COMPLEX_COMPONENT_TAGS`** (`apps/builder/src/builder/factories/constants.ts`): 두 곳에서 공유하는 Set 상수입니다.

- **`useElementCreator.ts`**: `COMPLEX_COMPONENT_TAGS.has(tag)`로 Factory 경로 분기 — 복합 컴포넌트면 `ComponentFactory.createComplexComponent()` 호출
- **`ElementSprite.tsx`**: `COMPLEX_COMPONENT_TAGS.has(tag)`로 `_hasChildren=true` 강제 주입 — 자식 삭제 후에도 standalone spec shapes로 되돌아가지 않도록 보장

```typescript
// apps/builder/src/builder/factories/constants.ts
export const COMPLEX_COMPONENT_TAGS = new Set([
  // Form Input
  'TextField', 'TextArea', 'NumberField', 'SearchField',
  'DateField', 'TimeField', 'ColorField',
  // Selection
  'Select', 'ComboBox', 'ListBox', 'GridList', 'List',
  // Control
  'Checkbox', 'Radio', 'Switch', 'Slider',
  'ToggleButtonGroup', 'Switcher',
  // Group
  'CheckboxGroup', 'RadioGroup',
  // Layout
  'Card',
  // Navigation
  'Menu', 'Disclosure', 'DisclosureGroup', 'Pagination',
  // Overlay
  'Dialog', 'Popover', 'Tooltip',
  // Feedback
  'Form', 'Toast', 'Toolbar',
  // Date & Color
  'DatePicker', 'DateRangePicker', 'Calendar', 'ColorPicker', 'ColorSwatchPicker',
  // CHILD_COMPOSITION_EXCLUDE_TAGS 소속 (synthetic prop 메커니즘 사용)
  // ElementSprite에서 EXCLUDE 가드가 먼저 평가되므로 _hasChildren 주입 차단 — 안전
  // useElementCreator의 Factory 경로 분기 목적으로만 등록
  'Tabs', 'Tree', 'TagGroup', 'Table',
]);
```

**버그 수정 맥락 (2026-02-24)**: 이전에는 `useElementCreator.ts`에 로컬 `complexComponents` 배열이 있었고, `ElementSprite.tsx`는 `childElements.length > 0`만 체크했습니다. TextField 등에서 자식을 모두 삭제하면 `_hasChildren=false`가 되어 standalone label+input spec shapes가 재활성화되는 버그가 있었습니다. `COMPLEX_COMPONENT_TAGS` 공유 상수 도입으로 두 파일이 동일한 목록을 참조하고, `ElementSprite.tsx`는 complex component에 항상 `_hasChildren=true`를 주입하여 버그를 수정했습니다.

| 컴포넌트 | DOM 구조 | factory 정의 파일 |
|----------|---------|-----------------|
| `Select` | Select > Label, SelectTrigger > SelectValue, SelectIcon | `FormComponents.ts` |
| `ComboBox` | ComboBox > Label, ComboBoxWrapper > ComboBoxInput, ComboBoxTrigger | `FormComponents.ts` |
| `Slider` | Slider > Label, SliderOutput, SliderTrack > SliderThumb | `FormComponents.ts → createSliderDefinition()` |

**Slider factory 참조**: `FormComponents.ts`의 `createSliderDefinition()`

- `ElementSprite.tsx`의 `_hasLabelChild` 체크에 `'Slider'` 포함
- `Slider.css`는 class selector 대신 `[data-size="sm"]`, `[data-variant="primary"]` data-attribute selector 사용
- SLIDER_DIMENSIONS 기준: `{ sm: { trackHeight: 4, thumbSize: 14 }, md: { trackHeight: 6, thumbSize: 18 }, lg: { trackHeight: 8, thumbSize: 22 } }`

### `_hasChildren` 주입 제외 대상: `CHILD_COMPOSITION_EXCLUDE_TAGS`

자식 조합 패턴에서 `_hasChildren` 주입을 건너뛰는 예외 컴포넌트 목록입니다.
`ElementSprite.tsx`의 `CHILD_COMPOSITION_EXCLUDE_TAGS` Set에 등록됩니다.

**기본 원칙**: 모든 컴포넌트에 자식이 있으면(또는 `COMPLEX_COMPONENT_TAGS`에 속하면) `_hasChildren: true`가 주입됩니다.
아래 컴포넌트만 예외적으로 주입을 건너뜁니다.

| 컴포넌트 | 제외 이유 | 대체 메커니즘 |
|---------|---------|-------------|
| `Tabs` | `_tabLabels` synthetic prop 사용 | `effectiveElementWithTabs`로 탭 레이블 주입 |
| `Breadcrumbs` | `_crumbs` synthetic prop 사용 | 자식 Breadcrumb 텍스트 수집 → `_crumbs` 배열 주입 |
| `TagGroup` | `_tagItems` synthetic prop 사용 | 자식 Tag 정보 수집 → `_tagItems` 배열 주입 |
| `Table` | 다단계 중첩 구조 | 별도 구현 예정 |
| `Tree` | 다단계 중첩 구조 | 별도 구현 예정 |

**새 컴포넌트를 `CHILD_COMPOSITION_EXCLUDE_TAGS`에 추가하는 경우**:
- synthetic prop 메커니즘(`_crumbs`, `_tabLabels` 등)을 별도로 사용하는 경우
- 자식 조합이 아닌 복잡한 다단계 중첩이 필요한 경우

### 자식 내부 렌더링 제외 대상: `NON_CONTAINER_TAGS`

`BuilderCanvas.tsx`에서 자식 Element를 내부에 렌더링하지 않는 태그 목록입니다.
**기본 원칙**: 모든 컴포넌트가 컨테이너로 처리됩니다. 아래 카테고리만 제외됩니다.

| 카테고리 | 설명 | 예시 |
|---------|------|------|
| TEXT_TAGS | TextSprite로 렌더링, 자식 배치 불가 | `Text`, `Heading`, `Description`, `Label`, `Paragraph`, `Link`, `Strong`, `Em`, `Code`, `Pre`, `Blockquote` |
| Void 요소 | 자식이 없는 단일 요소 | `Input`, `Textarea`, `Hr`, `Br`, `Img` 등 |
| Color Sub 컴포넌트 | 상위 컨테이너가 렌더링 담당 | `ColorSwatch`, `ColorThumb`, `ColorSlider` 등 |

**이전 컨테이너 태그 목록 (구 opt-in 방식)**:
구 아키텍처에서는 `CONTAINER_TAGS`(화이트리스트)에 등록된 컴포넌트만 자식을 내부에 렌더링했습니다.
현재는 opt-out 방식으로 전환되어, `NON_CONTAINER_TAGS`에 없으면 자동으로 컨테이너로 처리됩니다.

특별 처리가 필요한 컨테이너:
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
  - spec shapes 렌더링 없이 자식 Element를 직접 배치
  - Label은 자식 Element(TEXT_TAGS 경로 → TextSprite)가 렌더링 — spec shapes에서 중복 렌더링 금지
  - TagGroup.spec.ts의 shapes()는 배경/테두리 등 시각 컨테이너 요소만 반환 (label 텍스트 미포함)
  - isYogaSizedContainer로 분류: Yoga가 Label + TagList 높이 합산으로 컨테이너 크기 자동 결정
- **Breadcrumbs**: `filteredContainerChildren = []` — 자식 Breadcrumb 텍스트를 `_crumbs` 배열로 주입하여 spec shapes에서 렌더링
  - 자식 Breadcrumb 요소를 element tree에서 직접 배치하지 않음
  - `ElementSprite.tsx`에서 `tag === 'breadcrumbs'` 분기: 자식 중 `tag === 'Breadcrumb'`인 요소의 `props.children` 수집 → `_crumbs` prop 주입
  - `Breadcrumbs.spec.ts`의 shapes()가 `_crumbs` 배열 기반으로 구분자 포함 텍스트 shape 렌더링
  - SPEC_SHAPES_INPUT_TAGS에 `'breadcrumbs'` 포함 → `enrichWithIntrinsicSize`의 contentHeight ≤ 0 early return 우회

### rearrangeShapesForColumn 가드: SPEC_RENDERS_ALL_TAGS_SET (2026-02-25)

`ElementSprite.tsx`에서 spec shapes를 column 방향으로 재배치하는 `rearrangeShapesForColumn()` 호출 시,
일부 컴포넌트는 이 재배치를 건너뛰어야 합니다.

**왜 필요한가**: `rearrangeShapesForColumn()`은 shapes의 y 좌표를 위에서부터 순서대로 쌓이도록 재배치합니다.
그런데 `NumberField`, `SearchField` 등은 spec shapes 내부에서 이미 `labelOffset`을 통해 세로 레이아웃을
직접 계산합니다. 이 컴포넌트들에 `rearrangeShapesForColumn()`을 적용하면 좌표가 이중으로 변환되어 렌더링이 깨집니다.

```typescript
// ElementSprite.tsx — spec shapes 호출 후 column 재배치 로직

// SPEC_RENDERS_ALL_TAGS_SET: spec shapes가 자체 세로 레이아웃을 포함하는 컴포넌트
// 이 컴포넌트들은 rearrangeShapesForColumn 재배치를 스킵
const SPEC_RENDERS_ALL_TAGS_SET = new Set([
  'TextField', 'NumberField', 'SearchField',
  'DateField', 'TimeField', 'ColorField', 'TextArea',
  'Slider', 'RangeSlider',
]);

// ✅ SPEC_RENDERS_ALL_TAGS_SET 가드 적용
if (isColumn && !SPEC_RENDERS_ALL_TAGS_SET.has(tag)) {
  rearrangeShapesForColumn(shapes, finalWidth, sizeSpec.gap ?? 8);
}

// ❌ 가드 없이 모든 컴포넌트에 rearrangeShapesForColumn 적용
if (isColumn) {
  rearrangeShapesForColumn(shapes, finalWidth, sizeSpec.gap ?? 8);
}
// → NumberField: spec이 이미 y=labelOffset으로 배치한 shapes를
//   rearrangeShapesForColumn이 다시 y=0 기준으로 재배치
//   → label과 입력 필드가 겹치거나 잘못된 위치에 렌더링
```

**등록 기준**: 다음 조건 중 하나라도 해당하면 `SPEC_RENDERS_ALL_TAGS_SET`에 추가:
- spec shapes 내부에서 `labelOffset`을 계산하여 y 좌표를 직접 배치하는 컴포넌트
- spec shapes 내부에서 복수의 서브 컴포넌트(label + input + button 등)를 세로로 직접 배치하는 컴포넌트

**연관 Set 비교**:

| Set 이름 | 위치 | 목적 |
|---------|------|------|
| `SPEC_RENDERS_ALL_TAGS_SET` | `ElementSprite.tsx` (로컬) | `rearrangeShapesForColumn` 재배치 스킵 |
| `SPEC_RENDERS_ALL_TAGS` | `BuilderCanvas.tsx` (로컬) | 자식 이중 렌더링 억제 (자식 sprite 렌더링 건너뜀) |
| `SPEC_SHAPES_INPUT_TAGS` | `engines/utils.ts` | `enrichWithIntrinsicSize`의 contentHeight ≤ 0 early return 우회 |

> 세 Set은 비슷한 컴포넌트 목록을 가지지만 목적이 다릅니다. 새 컴포넌트 추가 시 세 곳 모두 확인해야 합니다.

## 서브에이전트 위임 가이드라인

Spec 파일 일괄 수정 등 병렬 에이전트(Task tool)에 작업을 위임할 때, 아래 규칙을 프롬프트에 **반드시** 포함하세요.

### 수정 금지 패턴 (Protected Patterns)

서브에이전트 프롬프트에 다음을 명시:

```
⚠️ 수정 금지 패턴 — 아래 코드는 절대 변경/삭제/이동하지 마세요:

1. _hasChildren 패턴: 아래 코드 블록을 삭제, 이동, 조건 변경하지 마세요.
   const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
   if (hasChildren) return shapes;

2. CHILD_COMPOSITION_EXCLUDE_TAGS 관련 로직

3. ElementSprite.tsx의 _hasChildren 주입 로직 (2단계 평가)

4. rearrangeShapesForColumn / SPEC_RENDERS_ALL_TAGS_SET 가드 로직

5. TAG_SPEC_MAP 등록 로직 (child spec 렌더링 경로)

요청된 수정 범위만 정확히 수행하고, 그 외 로직은 건드리지 마세요.
```

### 위임 프롬프트 템플릿

```markdown
## 작업 범위
[구체적 수정 내용만 기술]

## 수정 대상 파일
[파일 목록]

## 수정 패턴
[Before → After 예시 코드]

## ⚠️ 수정 금지
- `_hasChildren` 체크 코드 (삭제/이동/변경 금지)
- `COMPLEX_COMPONENT_TAGS` 관련 로직
- shapes 함수의 early return 구조
- 요청 범위 외 리팩토링
```

### 위임 시 체크리스트

| 항목 | 설명 |
|------|------|
| 범위 한정 | "fontSize만 수정", "import만 추가" 등 명시적 범위 |
| 금지 패턴 포함 | 위 수정 금지 패턴을 프롬프트에 복사 |
| Before/After 예시 | 정확한 변경 패턴을 코드로 제시 |
| 검증 지시 | `npx tsc --noEmit` 타입 체크 수행 지시 |

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
