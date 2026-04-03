---
description: Canvas/Skia/PixiJS 렌더링 관련 파일 작업 시 적용
globs:
  - "apps/builder/src/builder/canvas/**"
  - "packages/specs/**"
  - "**/nodeRenderers*"
  - "**/ElementSprite*"
  - "**/useCentralCanvasPointerHandlers*"
  - "**/useDragInteraction*"
---

# Canvas 렌더링 규칙

## Dual Renderer (Skia + PixiJS)

- **Skia**: 실제 화면 렌더러 (nodeRenderers.ts)
- **PixiJS**: 이벤트 전용 (alpha=0), EventBoundary 히트 테스트
- PixiJS만 수정하면 시각적 변화 없음 → **Skia도 반드시 수정**
- CanvasKit `heightMultiplier`에 `halfLeading: true` 필수 (CSS line-height 상하 균등 분배)

## DirectContainer 패턴

- 엔진 계산 결과(x/y/w/h)를 직접 배치 — @pixi/layout 제거됨
- layout 속성이 아닌 엔진 결과값으로 위치 설정

## Component Spec

- Spec shapes 내 숫자 연산에 TokenRef 값을 직접 사용 금지 → `resolveToken()` 변환 필수
- `_hasChildren` 체크 패턴 필수: 배경/테두리 shapes 직후, standalone 콘텐츠 shapes 직전에 배치
- Child Spec 추가 시 `packages/specs/src/index.ts` + `components/index.ts` 양쪽에 export 후 `pnpm build:specs`
- `TAG_SPEC_MAP`에 해당 태그의 Spec 등록 필수
- **Spec shapes fontSize 우선순위 (Propagation 정합성)**: `props.size`가 명시적으로 설정된 경우 `size.fontSize`를 우선 사용. Propagation은 `size` prop만 변경하고 `style.fontSize`는 갱신하지 않으므로, `props.style?.fontSize`가 우선되면 size 변경이 Canvas에 미반영됨.
  ```typescript
  const rawFontSize = props.size
    ? size.fontSize
    : (props.style?.fontSize ?? size.fontSize);
  ```

## Spec ↔ CSS 경계 (skipCSSGeneration)

- **Leaf 컴포넌트**: Spec이 CSS 자동 생성 — 시각 토큰(색상/크기/상태)의 Preview ↔ Canvas 정합성 보장
- **Container/Composite** (32개): `skipCSSGeneration: true` — 수동 CSS가 구조 담당, Spec `render.shapes()`는 Skia 전용
- 구조(flex/grid/slot)는 Store → CSS와 Store → Taffy가 독립 처리하므로 정합성 문제 없음
- toggle-indicator(Checkbox/Radio/Switch): indicator 시각 속성은 전용 상수(`CHECKBOX_BOX_BORDER`, `RADIO_RING_BORDER` 등), VariantSpec `border`는 label용
- Generated CSS는 `@layer components { ... }`로 래핑 — unlayered 시 수동 CSS의 nested selector override 실패
- 상세: [SPEC_CSS_BOUNDARY.md](docs/reference/components/SPEC_CSS_BOUNDARY.md)

## Field 컴포넌트 입력 영역 배경색 통일 (CRITICAL)

모든 field 컴포넌트의 입력/컨테이너 영역 배경은 **`--bg-inset` / `{color.layer-2}`**로 통일.

- **CSS**: `--bg-inset` (TextField, NumberField, SearchField, DateField, TimeField, ComboBox, Select)
- **Spec**: `{color.layer-2}` (TextField.spec, SelectTrigger.spec, DateInput.spec)
- **금지**: field 입력 영역에 `--bg-raised` / `{color.base}` 사용 금지 (raised는 패널 헤더/section-header용)
- `.inset` 유틸리티 클래스의 기본 배경도 `--bg-inset` fallback

## Select/ComboBox/SearchField gap 정합성

`implicitStyles.ts`에서 이들 컴포넌트의 gap은 CSS `var(--spacing-xs)` = **4px**로 통일.

- 부모 gap (Label ↔ Trigger/Container): `4`
- 내부 gap (SelectTrigger/ComboBoxWrapper/SearchFieldWrapper): `4`
- `SPEC_TRIGGER_GAP` 상수 제거됨 — 모든 경로에서 고정 4px 사용

## Necessity Indicator (Required 표시)

S2 패턴의 필수 필드 표시. 3경로 동기화 필수.

- **Preview (CSS)**: `renderNecessityIndicator()` — Label 내 `<span class="necessity-indicator">` 렌더링
  - `icon` 모드: `*` (빨간색 `--negative`)
  - `label` 모드: `(required)` 또는 `(optional)` (회색 `--fg-muted`)
- **WebGL (Taffy)**: `fullTreeLayout.ts` Label DFS + `implicitStyles.ts` — Label `children` 텍스트에 indicator 추가
- **WebGL (Skia)**: `ElementSprite.tsx` — `specProps.children`에 indicator 추가
- **에디터**: 통합 Required select (None / Icon / Label) — `isRequired` + `necessityIndicator` 동시 설정
- **공유 유틸**: `Field.tsx`의 `renderNecessityIndicator()`, `NecessityIndicator` 타입
- **LAYOUT_AFFECTING_PROPS + LAYOUT_PROP_KEYS**: `necessityIndicator`, `isRequired` 등록 필수

## Label Factory 패턴 (field 컴포넌트 자식)

모든 field 컴포넌트의 Label 자식 factory 정의 표준:

```
{
  tag: "Label",
  props: {
    children: "Label Text",
    variant: "default",
    style: { width: "fit-content", height: "fit-content", fontWeight: 500 },
  },
}
```

- `width/height: "fit-content"` 필수 — Taffy에서 auto 대신 텍스트 크기에 맞춤 (누락 시 height 이상)
- `fontWeight: 500` — Label 기본 굵기
- `fontSize` — DFS Label size delegation이 주입하므로 factory에서는 선택적
- `flexShrink: 0` — implicitStyles에서 공통 주입 (flex-direction: row 시 축소 방지)

## BUTTON_SIZE_CONFIG ↔ CSS 높이 정합성

`BUTTON_SIZE_CONFIG` / `TOGGLEBUTTON_SIZE_CONFIG` (engines/utils.ts)는 `lineHeight` 필드를 필수로 포함해야 함.
CSS Button은 명시적 `line-height: var(--text-*--line-height)`를 사용하므로, `lineHeight` 누락 시
`estimateTextHeight()`가 font metrics 기반 `line-height: normal`로 계산 → CSS와 높이 불일치.

- CSS height = lineHeight + paddingY x 2 + borderWidth x 2
- `calculateContentHeight()`에서 inline lineHeight가 없으면 `sizeConfig.lineHeight` 사용
- 값 변경 시 반드시 `spec-value-sync.md` 레퍼런스 테이블과 대조

## TextMeasurer ↔ nodeRenderers 동기화 (필수)

ParagraphStyle 변경 시 **측정기 + 렌더러 양쪽 동시 업데이트** 필수 (3곳):

1. `canvaskitTextMeasurer.ts` — measureWidth() + measureWrapped()
2. `nodeRenderers.ts` — renderText()
3. `TextMeasureStyle` 인터페이스 — 필드 추가 시

### fontFamilies 정합성 (CRITICAL)

측정기와 렌더러가 **완전히 동일한 `fontFamilies` 배열**을 사용해야 함:

- **측정기**: `canvaskitTextMeasurer.ts`의 `buildFontFamilies()` — CSS 체인 전체를 split(",") → `resolveFamily()` 매핑
- **렌더러**: `specShapeConverter.ts` — `shape.fontFamily.split(",")` → `resolveFamily()` 매핑
- **금지 패턴**: CSS fontFamily 문자열을 단일 배열 요소로 전달 (CanvasKit이 매칭 실패 → fallback 폰트 → 폭 차이)
- **금지 패턴**: 측정기에서 첫 번째 폰트만 추출 (`split(",")[0]`) — fallback chain이 다르면 동일 텍스트도 shaping 결과 다름
- 참조: `docs/bug/skia-button-text-linebreak.md`

### Spec-Driven Text Style (specTextStyle.ts)

Spec 기반 컴포넌트(Button, Badge 등)의 텍스트 폭 측정 시 `extractSpecTextStyle(tag, props)`로 Spec에서 fontSize/fontWeight/fontFamily를 추출하여 사용. 하드코딩된 `BUTTON_SIZE_CONFIG.fontSize`/`fontWeight` 의존 금지.

**extractSpecTextStyle 호출 시 텍스트 props 필수 (CRITICAL)**:

- `extractSpecTextStyle(tag, props)`는 내부에서 `spec.render.shapes(props, ...)` 호출 → TextShape를 찾아 font 속성 반환
- Spec이 TextShape를 생성하려면 `props.children` / `props.text` / `props.label` 중 하나가 truthy여야 함
- **텍스트 props 없이 호출 → TextShape 미생성 → `null` 반환 → fontWeight 등 fallback 값 사용 → 측정 불일치**
- 그룹 컴포넌트에서 자식 폭 합산 시 반드시 더미 텍스트(`children: "x"`)를 전달하여 올바른 font 속성 추출

### strutStyle (CSS line-height 정합성)

- `heightMultiplier > 0` (lineHeight 명시) 시 strutStyle 활성화
- `forceStrutHeight: true` — CSS처럼 line-height를 줄 높이로 강제
- 측정기와 렌더러에 **완전히 동일한 strutStyle** 적용 필수

### Paragraph API 사용 규칙

- 실제 콘텐츠 폭: `getLongestLine()` (fit-content/auto 계산용)
- max-content: `getMaxIntrinsicWidth()` (줄바꿈 없는 전체 폭)
- min-content: `getMinIntrinsicWidth()` (가장 긴 단어 폭)
- `getMaxWidth()` 사용 금지 — layout 제약 폭을 그대로 반환하므로 콘텐츠 폭과 무관

### 측정 결과 캐싱

- WASM Paragraph 객체 캐싱 금지 (GC 대상 아님 → 메모리 누수)
- 결과값 `{ width, height }` 만 LRU 캐싱 (canvaskitTextMeasurer.ts)
- FontMgr 교체 시 캐시 자동 clear
- 렌더러의 Paragraph LRU 캐시(nodeRenderers.ts)와 별도 — 목적이 다름 (렌더 vs 측정)

## Skia color-mix 정합성

- CSS `color-mix(in srgb)` → Skia에서 srgb 채널별 선형 혼합으로 재현
- `tintToSkiaColors.ts`의 `mixWithBlackSrgb()` 사용 (oklch lightness 근사 금지)
- light/dark 모드 무관하게 동일 연산 (CSS `color-mix`는 모드별 분기 없음)

## Dark Mode Spec 텍스트 토큰 정합성 (CRITICAL)

Spec variant `text` 토큰이 CSS의 `--button-text` / `color` 변수와 일치해야 Skia↔CSS dark mode 렌더링이 동기화된다.

- **adaptive 배경 (`{color.neutral}` = `var(--fg)`)**: 텍스트에 `{color.white}` 사용 금지 → `{color.base}` (= `var(--bg)`) 사용
- **adaptive 배경 (`{color.accent}`)**: 텍스트에 `{color.on-accent}` 사용
- **hardcoded 배경 (`{color.purple}`, `{color.negative}` 등)**: 텍스트에 `{color.white}` 사용 가능
- **TextSprite 기본색**: `style.color` 미설정 시 `skiaTheme`에 따라 `darkColors.neutral`/`lightColors.neutral` 사용 (CSS `var(--fg)` 동기화)

## Arc Shape 렌더링 (ProgressCircle 등)

- Spec `arc` shape → specShapeConverter에서 `type: "box"` + `arc` 데이터로 변환
  - 별도 `type: "arc"` 사용 금지 — `React.lazy()` import 체인으로 `renderNodeInternal` switch 미도달 (HMR 이슈)
- `renderBox`에서 `node.arc` 감지 시 `CanvasKit.Path.addArc()` 로 부분 원호 렌더링
- **트랙/인디케이터 정렬 (CRITICAL)**: 트랙 링에 `circle` + stroke 사용 금지
  - `renderSolidBorder`는 `inset = sw/2` 적용 → 스트로크 중심 반지름이 `sw/2` 만큼 안쪽으로 밀림
  - `addArc`는 정확한 반지름에 그림 → 트랙과 인디케이터 `sw/2` 만큼 어긋남
  - **해결**: 트랙도 `arc`(sweepAngle=360°)로 동일 렌더링 경로 사용
- Spec text 중앙 배치: `x: 0, y: 0` + `align: "center"` + `baseline: "middle"` 사용
  - `x: cx, y: cy` 사용 시 specShapeConverter가 paddingLeft/maxWidth를 오계산하여 텍스트 치우침

## CalendarGrid/CalendarHeader 다중 줄 보정 스킵 (CRITICAL)

ElementSprite의 다중 줄 텍스트 paddingTop 보정 로직은 `baseline: "middle" + y > 0` (절대 좌표 배치) 텍스트에 간섭하여 Y 위치를 이탈시킨다.

- **`isCalendarText` 체크**: CalendarGrid/CalendarHeader 태그는 다중 줄 보정 블록에서 스킵
- **`isNowrapTag`에 추가 금지**: `child.text.whiteSpace = "nowrap"` 설정 시 `align: "center"` 정렬 깨짐
- CalendarGrid/CalendarHeader의 `skipCSSGeneration: true` 필수 — Generated CSS의 `display: grid` + `border`가 Taffy 레이아웃 방해

```typescript
// ElementSprite.tsx — 다중 줄 보정 블록
const isCalendarText =
  element.tag === "CalendarGrid" || element.tag === "CalendarHeader";
if (!isCalendarText && ws !== "nowrap" && ws !== "pre") {
  /* 보정 로직 */
}
```

## Compositional Component Size Delegation (Skia 경로)

- Select/ComboBox 등 합성 컴포넌트에서 **부모의 size prop을 자식이 직접 참조** 필수
- Store에는 부모(Select/ComboBox)에만 `size` 저장 → 자식(SelectTrigger, ComboBoxWrapper 등)은 size 없음
- **ElementSprite.tsx `parentDelegatedSize` selector**: 부모/조부모 2단계 탐색으로 size 읽기
  - `PARENT_SIZE_DELEGATION_TAGS`: SelectTrigger, ComboBoxWrapper, SelectValue, SelectIcon, ComboBoxInput, ComboBoxTrigger
  - `SIZE_DELEGATION_PARENT_TAGS`: Select, ComboBox
- **useMemo deps에 `parentDelegatedSize` 포함 필수** — 누락 시 size 변경이 Skia 트리에 전파 안 됨
- size 우선순위: `props.size || parentDelegatedSize || tagGroupAncestorSize || "md"`
- Layout 경로(`fullTreeLayout.ts`)의 `effectiveGetChildElements`도 동일하게 size 주입 (L894-912)

## Label 렌더링 경로 (spec shapes)

Label은 `TEXT_TAGS`에서 제외되어 TextSprite 경로가 아닌 **spec shapes 경로**로 렌더링된다.

- `isUIComponent` 판정: `getSpecForTag(element.tag) != null` 조건으로 Label 포함
- `hasOwnSprite`에서 spec이 있는 "box" 태그 제외 → spec shapes 경로 진입
- Label의 색상은 `LabelSpec.variants`가 단일 소스 — 하드코딩된 `PARENT_VARIANT_TO_LABEL_TOKEN` 제거
- 부모 variant 상속: `PARENT_VARIANT_TO_LABEL` 매핑으로 `isUIComponent` 분기에서 처리
- Factory 기본값: Label에 `variant: "default"` 설정
- Select/ComboBox delegation에서 Label color override 제거 — LabelSpec.variants가 담당

**Label 기본 크기: fit-content (3경로 동기화 필수)**:

- **Spec**: `sizes.*.height: 0` → `skipCSSGeneration: true` (generated CSS 비활성)
- **CSS**: `Label.css` (수동) — `width: fit-content; height: fit-content; white-space: nowrap;`
- **CSS**: `base.css` — `font-size: var(--label-font-size)`, `line-height: var(--label-line-height)` (부모 CSS 변수 상속)
- **Factory**: 모든 Label 자식에 `width: "fit-content", height: "fit-content"` 필수 (WebGL/Taffy 경로)
- `createDefaultLabelProps()`: 독립 생성 시 기본값

**Label size delegation (LabelSpec 단일 소스, 3경로 동기화 필수)**:

- **LabelSpec sizes**: xs=10(text-2xs), sm=12(text-xs), md=14(text-sm), lg=16(text-base), xl=18(text-lg)
- **CSS**: 부모가 `--label-font-size` 변수 설정 → Label이 `var(--label-font-size)` 상속
- **Layout DFS**: `fullTreeLayout.ts` — Label DFS 진입 시 조상 탐색으로 `fontSize`/`lineHeight` 인라인 주입
  - **주입 조건 (CRITICAL)**: `labelStyle.lineHeight == null` 기준으로 주입 여부 결정
  - `fontSize == null` 조건 사용 금지 — factory에서 `fontSize: 14`를 미리 지정한 경우 lineHeight 주입이 스킵되어 `fontSize * 1.5 = 21px` fallback 적용 → CSS Preview(20px)와 불일치
  - CSS 근거: `--text-sm` = 14px, `--text-sm--line-height` = calc(1.25/0.875) = 1.42857 → 14 × 1.42857 = 20px
- **Skia**: `ElementSprite.tsx` — `parentDelegatedSize` → `specProps.size` 주입 → LabelSpec shapes
- **조상 탐색 패턴**: Label → Checkbox(래퍼) → CheckboxItems(래퍼) → CheckboxGroup(size 소유자)
  - `lastDelegationAncestor` 패턴으로 size 없는 standalone 부모도 기본값 "md" 적용
- **LABEL_DELEGATION_PARENT_TAGS**: DatePicker, DateRangePicker 포함 필수 — 누락 시 Label height가 24px(fallback fontSize=16)로 오계산
- **`--text-md` CSS 변수 없음**: Spec의 `{typography.text-md}` → CSS는 `var(--text-base)` 사용 필수
  - `tokenToCSSVar()`에서 `text-md` → `text-base` 자동 매핑

**Checkbox/Radio/Switch 내부 Label nowrap (3경로 동기화 필수)**:

- **CSS**: `Checkbox.css`에 `white-space: nowrap`
- **Taffy**: `implicitStyles.ts` — 자식 Label + Synthetic Label에 `whiteSpace: "nowrap"` 주입
- **Skia**: `isLabelInNowrapParent` primitive selector → useMemo deps 포함 필수
  - `parentElement`를 useMemo 내에서 직접 참조 금지 (deps에 없으므로 stale closure)

**금지 패턴**:

- `TEXT_TAGS`에 `"Label"` 재추가 금지 (TextSprite 경로와 spec shapes 경로 중복 렌더링)
- `PARENT_VARIANT_TO_LABEL_TOKEN` 방식(hex 하드코딩) 부활 금지 → LabelSpec.variants 수정
- Label factory 정의에 `width/height: "fit-content"` 누락 금지 → WebGL에서 auto와 다르게 동작
- Label generated CSS 부활 금지 → `skipCSSGeneration: true` 유지 (부모 `--label-font-size` 상속 필수)
- CSS에 `var(--text-md)` 사용 금지 → `var(--text-base)` 사용 (--text-md CSS 변수 미정의)
- Label lineHeight를 숫자로 전달 금지 → `"20px"` 문자열 필수 (`parseLineHeight`가 숫자를 배율로 해석)
- DFS injection 조건에 `labelStyle.fontSize == null` 사용 금지 → `labelStyle.lineHeight == null` 필수 (factory가 fontSize 미리 설정 가능)
- Label height 계산에 `Math.ceil(fontSize * 1.5)` 사용 금지 → LABEL_SIZE_STYLE lineHeight 역참조 필수

## registryVersion 캐싱

- LayoutContainer 'layout' 이벤트에서 `notifyLayoutChange()` 무조건 호출

## Popover 자식 Taffy 레이아웃 제외

DatePicker/DateRangePicker 내부의 Calendar/RangeCalendar은 Preview에서 Popover로 표시되므로 WebGL Taffy 레이아웃에 참여하면 안 됨.

- `POPOVER_CHILDREN_TAGS` (모듈 스코프 상수): `Set(["Calendar", "RangeCalendar"])`
- `implicitStyles.ts`에서 `filteredChildren`에서 제외하여 `labelPosition: "side"` 시 Label + DateInput만 row 배치

## Spec Container Dimension Injection (CRITICAL)

Spec shapes가 레이아웃 엔진(Taffy) 결과(containerWidth/Height)를 필요로 할 때:

- **`_containerWidth`/`_containerHeight` props 주입** — ElementSprite에서 `finalWidth`/`finalHeight`를 specProps에 전달
- **`CONTAINER_DIMENSION_TAGS` Set** (모듈 상수) — 주입 대상 태그 O(1) 조회. 새 Spec 추가 시 이 Set에 등록 필수
- **2-pass height 교정**: 모든 컨테이너에서 자식 width 제약 → 텍스트 줄바꿈 → height 재계산이 자동 동작 (fullTreeLayout Step 4.5)
- **우측 역산 배치**: `containerWidth - border - paddingRight - pad - iconSize/2` (텍스트 폭 추정 금지)
- **정확한 세로 중앙**: `containerHeight / 2` (`size.height / 2` 사용 금지 — border 미포함)
- **파이프라인 타이밍 수정 금지**: `publishLayoutMap` 동기화, `notifyLayoutChange()` 강제 호출 등 해킹 금지
- **부모 delegation prop 변경 시**: `updateSelectedPropertiesWithChildren`으로 부모+자식 atomic batch update
- 상세: `.claude/skills/xstudio-patterns/rules/spec-container-dimension-injection.md`

## Collection Item 자식 Font 주입 (ListBoxItem/GridListItem)

TextSprite는 store의 원본 `element.props.style`을 직접 읽으므로, implicitStyles(Taffy 전용) 주입만으로는 렌더링에 반영되지 않음.

- **ElementSprite `collectionItemFontStyle` selector**: 부모가 ListBoxItem/GridListItem이면 Text→"14:600", Description→"12:400" 반환
- **`effectiveElementForText` useMemo**: `inlineAlertFontStyle` 또는 `collectionItemFontStyle`로 style override
- 기존 InlineAlert 패턴(`inlineAlertFontStyle`)과 동일 구조
- 새 collection 컴포넌트 추가 시 selector 조건에 부모 태그 추가

## Pointer → Move 대상 ID 규칙 (CRITICAL)

`startMove`에 전달하는 요소 ID는 반드시 **store의 `selectedElementIds`에서 읽어야 한다**.

- `hitElementId` (히트 테스트 최심부 자식)를 `startMove`에 직접 전달 금지
- `handleElementClick` → `resolveClickTarget()` → 올바른 선택 대상 결정 → store 갱신
- rAF 내에서 `useStore.getState().selectedElementIds[0]`로 실제 선택된 ID를 읽어 `startMove` 전달
- Zustand `set()`은 `startTransition` 내에서도 동기 갱신 → rAF 시점에 정확한 값 보장
- 위반 시: 컴포넌트 반복 선택/해제/더블클릭 시 내부 자식이 의도치 않게 이동됨
- 위치: `useCentralCanvasPointerHandlers.ts`
