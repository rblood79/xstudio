# CSS Level 3 엔진 정합성 체크리스트

> **최종 갱신**: 2026-02-18
> **목적**: XStudio 레이아웃/렌더링 엔진의 CSS Level 3 속성 지원 현황 추적
> **엔진**: TaffyFlexEngine (Taffy WASM) · TaffyGridEngine (Taffy WASM) · DropflowBlockEngine (Dropflow Fork JS)
> **렌더러**: CanvasKit/Skia WASM

---

## 상태 표기

| 표기 | 의미 |
|------|------|
| ✅ | 완전 지원 |
| ⚠️ | 부분 지원 (제한 사항 있음) |
| ❌ | 미지원 |

---

## 1. CSS Display Level 3

> Spec: [CSS Display Module Level 3](https://www.w3.org/TR/css-display-3/)

| 속성값 | 상태 | 엔진 | 구현 파일 | 비고 |
|--------|------|------|-----------|------|
| `block` | ✅ | DropflowBlock | `DropflowBlockEngine.ts:409` | |
| `inline` | ✅ | DropflowBlock | `DropflowBlockEngine.ts:409` | |
| `inline-block` | ✅ | DropflowBlock | `DropflowBlockEngine.ts:91-96` | `layoutInlineRun()` 2-pass |
| `flex` | ✅ | TaffyFlex | `TaffyFlexEngine.ts:210` | |
| `inline-flex` | ⚠️ | TaffyFlex | `styleToLayout.ts:527` | `flex`로 정규화됨 — inline 특성(주변 텍스트와 한 줄 배치) 미반영 |
| `grid` | ✅ | TaffyGrid | `TaffyGridEngine.ts:520` | |
| `inline-grid` | ⚠️ | TaffyGrid | `TaffyGridEngine.ts:520` | `grid`로 정규화됨 — inline 특성 미반영 |
| `flow-root` | ✅ | DropflowBlock | `DropflowBlockEngine.ts:539` | BFC 생성 |
| `none` | ✅ | 공통 | `TaffyFlexEngine.ts:52`, `nodeRenderers.ts:219` | 레이아웃 제외 + 렌더 스킵 |
| `contents` | ❌ | — | — | |

---

## 2. CSS Box Model Level 3

> Spec: [CSS Box Model Module Level 3](https://www.w3.org/TR/css-box-3/)

### 2.1 크기

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `width` | ✅ | `styleToLayout.ts:296-301`, `utils.ts:863` | px, %, em, rem, vh, vw, calc() |
| `height` | ✅ | `styleToLayout.ts:296-301`, `utils.ts:864` | 동상 |
| `min-width` | ✅ | `styleToLayout.ts:501-508`, `TaffyFlexEngine.ts:71` | |
| `max-width` | ✅ | `styleToLayout.ts:501-508`, `TaffyFlexEngine.ts:73` | |
| `min-height` | ✅ | `styleToLayout.ts:501-508`, `TaffyFlexEngine.ts:72` | |
| `max-height` | ✅ | `styleToLayout.ts:501-508`, `TaffyFlexEngine.ts:74` | |

### 2.2 여백

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `margin` (shorthand) | ✅ | `utils.ts:178-196` | 1값/2값/3값/4값 |
| `margin-top/right/bottom/left` | ✅ | `styleToLayout.ts:579-588` | |
| `padding` (shorthand) | ✅ | `utils.ts:201-217` | 1값/2값/3값/4값 |
| `padding-top/right/bottom/left` | ✅ | `styleToLayout.ts:591-600` | |

### 2.3 박스 사이징

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `box-sizing: border-box` | ✅ | `utils.ts:924-954` | |
| `box-sizing: content-box` | ⚠️ | `utils.ts:924-954` | 일부 폼 요소에서만 명시적 처리 |

---

## 3. CSS Box Sizing Level 3

> Spec: [CSS Box Sizing Module Level 3](https://www.w3.org/TR/css-sizing-3/)

| 키워드 | 상태 | 구현 파일 | 비고 |
|--------|------|-----------|------|
| `auto` | ✅ | `styleToLayout.ts:301`, `TaffyFlexEngine.ts:28` | |
| `fit-content` | ⚠️ | `styleToLayout.ts:297-313`, `cssValueParser.ts:192` | 태그별 픽셀 계산 워크어라운드 — Taffy 네이티브 `fit-content` 미전달 |
| `min-content` | ⚠️ | `cssValueParser.ts:193`, `utils.ts:1206-1227` | 텍스트 측정만 구현, 레이아웃 엔진에 직접 전달 안됨 |
| `max-content` | ⚠️ | `cssValueParser.ts:194`, `utils.ts:1241-1249` | 텍스트 측정만 구현, 레이아웃 엔진에 직접 전달 안됨 |

---

## 4. CSS Flexbox Level 1

> Spec: [CSS Flexible Box Layout Module Level 1](https://www.w3.org/TR/css-flexbox-1/)

### 4.1 컨테이너 속성

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `flex-direction` | ✅ | `TaffyFlexEngine.ts:81-83` | row, column, row-reverse, column-reverse |
| `flex-wrap` | ✅ | `TaffyFlexEngine.ts:85-88` | nowrap, wrap, wrap-reverse |
| `flex-flow` | ❌ | — | shorthand 미파싱 — `flex-direction` + `flex-wrap` 개별 사용 필요 |
| `justify-content` | ✅ | `TaffyFlexEngine.ts:90-93` | flex-start, flex-end, center, space-between, space-around, space-evenly |
| `align-items` | ✅ | `TaffyFlexEngine.ts:95-98` | stretch, flex-start, flex-end, center, baseline |
| `align-content` | ✅ | `TaffyFlexEngine.ts:100-103` | |
| `gap` / `row-gap` / `column-gap` | ✅ | `TaffyFlexEngine.ts:140-157` | |

### 4.2 아이템 속성

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `flex` (shorthand) | ✅ | `styleToLayout.ts:238-269` | none, auto, 숫자, 3값 형식 |
| `flex-grow` | ✅ | `TaffyFlexEngine.ts:106` | |
| `flex-shrink` | ✅ | `TaffyFlexEngine.ts:107` | |
| `flex-basis` | ✅ | `TaffyFlexEngine.ts:108-111` | |
| `align-self` | ✅ | `TaffyFlexEngine.ts:113-116` | |
| `order` | ❌ | — | |

---

## 5. CSS Grid Layout Level 1

> Spec: [CSS Grid Layout Module Level 1](https://www.w3.org/TR/css-grid-1/)

### 5.1 컨테이너 속성

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `grid-template-columns` | ✅ | `TaffyGridEngine.ts:349-361` | px, fr, auto, minmax(), repeat() |
| `grid-template-rows` | ✅ | `TaffyGridEngine.ts:349-362` | 동상 |
| `grid-template-areas` | ✅ | `TaffyGridEngine.ts:272-300` | 문자열 이름 기반 영역 |
| `grid-auto-flow` | ✅ | `TaffyGridEngine.ts:365-368` | row, column, dense |
| `grid-auto-columns` | ✅ | `TaffyGridEngine.ts:352` | |
| `grid-auto-rows` | ✅ | `TaffyGridEngine.ts:353` | |
| `justify-items` | ✅ | `TaffyGridEngine.ts:374-376` | |
| `align-items` | ✅ | `TaffyGridEngine.ts:372-373` | |
| `gap` / `row-gap` / `column-gap` | ✅ | `TaffyGridEngine.ts:369-371` | |
| `place-items` | ❌ | — | shorthand 미파싱 — `align-items` + `justify-items` 개별 사용 필요 |
| `place-content` | ❌ | — | shorthand 미파싱 |
| `repeat(auto-fill)` | ✅ | `TaffyGridEngine.ts:99-163` | containerSize 기반 동적 계산 |
| `repeat(auto-fit)` | ✅ | `TaffyGridEngine.ts:99-163` | |
| `minmax()` | ✅ | `TaffyGridEngine.ts:165-200` | |

### 5.2 아이템 속성

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `grid-column` | ✅ | `TaffyGridEngine.ts:423-435` | "1/3", "span 2" |
| `grid-row` | ✅ | `TaffyGridEngine.ts:423-436` | |
| `grid-column-start/end` | ✅ | `TaffyGridEngine.ts:439-450` | |
| `grid-row-start/end` | ✅ | `TaffyGridEngine.ts:445-450` | |
| `grid-area` | ✅ | `TaffyGridEngine.ts:405-419` | 숫자 + 이름 기반 |
| `justify-self` | ✅ | `TaffyGridEngine.ts:456-458` | |
| `align-self` | ✅ | `TaffyGridEngine.ts:453-455` | |

---

## 6. CSS Positioning Level 3

> Spec: [CSS Positioned Layout Module Level 3](https://www.w3.org/TR/css-position-3/)

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `position: static` | ✅ | (기본값) | |
| `position: relative` | ✅ | `cssStackingContext.ts:23` | stacking context 판정 |
| `position: absolute` | ✅ | `styleToLayout.ts:513`, `TaffyFlexEngine.ts:58-59` | |
| `position: fixed` | ⚠️ | `styleToLayout.ts:513` | `absolute`로 정규화 — 뷰포트 기준 고정 동작 없음 |
| `position: sticky` | ⚠️ | `cssStackingContext.ts:22` | stacking context만 생성, 실제 sticky 스크롤 동작 없음 |
| `top` / `right` / `bottom` / `left` | ✅ | `TaffyFlexEngine.ts:161-169` | absolute/relative 요소에 적용 |
| `z-index` | ✅ | `cssStackingContext.ts:38-43`, `nodeRenderers.ts:155` | auto/숫자, stacking context 렌더 정렬 |

---

## 7. CSS Overflow Level 3

> Spec: [CSS Overflow Module Level 3](https://www.w3.org/TR/css-overflow-3/)

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `overflow: visible` | ✅ | (기본값) | |
| `overflow: hidden` | ✅ | `BoxSprite.tsx:224`, `nodeRenderers.ts:282-308` | CanvasKit `clipRect` |
| `overflow: scroll` | ❌ | — | 스크롤바 UI 미구현 |
| `overflow: auto` | ❌ | — | |
| `overflow: clip` | ❌ | — | |
| `overflow-x` / `overflow-y` | ⚠️ | `utils.ts:1088-1097` | BFC baseline 계산에만 사용 |

---

## 8. CSS Backgrounds and Borders Level 3

> Spec: [CSS Backgrounds and Borders Module Level 3](https://www.w3.org/TR/css-backgrounds-3/)

### 8.1 배경

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `background-color` | ✅ | `fills.ts:44-51` | hex, rgb, rgba, hsl, hsla, named 색상 |
| `background-image: linear-gradient()` | ✅ | `fills.ts:54-74` | `CanvasKit.Shader.MakeLinearGradient` |
| `background-image: radial-gradient()` | ✅ | `fills.ts:76-98` | `MakeTwoPointConicalGradient` |
| `background-image: conic-gradient()` | ✅ | `fills.ts:100-124` | `MakeSweepGradient` (−90° 보정) |
| `background-image: url()` | ✅ | `fills.ts:126-143` | `Image.makeShaderOptions` |
| `background-size` | ❌ | — | |
| `background-position` | ❌ | — | |
| `background-repeat` | ❌ | — | |
| `background-attachment` | ❌ | — | |
| mesh-gradient (비표준) | ✅ | `fills.ts:146-188` | SkSL RuntimeEffect |

### 8.2 테두리

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `border-width` (4방향) | ✅ | `utils.ts:226-243`, `styleToLayout.ts:603-612` | shorthand + 개별 |
| `border-color` (4방향) | ✅ | `styleToLayout.ts:618-620` | |
| `border-style: solid` | ✅ | `nodeRenderers.ts:449-486` | |
| `border-style: dashed` | ✅ | `nodeRenderers.ts:449-486` | |
| `border-style: dotted` | ✅ | `nodeRenderers.ts:449-486` | |
| `border-style: double` | ❌ | — | |
| `border-style: groove/ridge/inset/outset` | ❌ | — | |
| `border` (shorthand) | ⚠️ | `cssValueParser.ts:499-535` | 파서 존재하나 레이아웃에서 미사용 |

### 8.3 모서리

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `border-radius` | ✅ | `styleConverter.ts:323-349`, `nodeRenderers.ts:324-386` | 단일값, 4방향, 각 모서리 path |
| `border-top-left-radius` 등 (4개) | ✅ | `styleConverter.ts:323-349` | |

### 8.4 그림자

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `box-shadow` | ✅ | `styleConverter.ts:458-521` | 다중 shadow, inset 지원 |

---

## 9. CSS Color Level 4

> Spec: [CSS Color Module Level 4](https://www.w3.org/TR/css-color-4/)

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `color` | ✅ | `cssResolver.ts:21`, `nodeRenderers.ts:624` | 상속 가능 |
| `opacity` | ✅ | `styleConverter.ts:405-409` | CanvasKit `saveLayer` (OpacityEffect) |
| hex 색상 (`#rgb`, `#rrggbb`, `#rrggbbaa`) | ✅ | `styleConverter.ts:126-145` | colord 라이브러리 |
| `rgb()` / `rgba()` | ✅ | `styleConverter.ts:126-145` | |
| `hsl()` / `hsla()` | ✅ | `styleConverter.ts:126-145` | |
| Named colors | ✅ | `styleConverter.ts:126-145` | CSS named colors 전체 |
| `lab()` / `lch()` / `oklch()` | ❌ | — | |
| `color()` 함수 | ❌ | — | |
| `color-mix()` | ❌ | — | |
| `currentColor` | ❌ | — | |

---

## 10. CSS Fonts Level 3

> Spec: [CSS Fonts Module Level 3](https://www.w3.org/TR/css-fonts-3/)

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `font-family` | ✅ | `cssResolver.ts:22`, `nodeRenderers.ts:621` | 상속 가능, fallback 목록 |
| `font-size` | ✅ | `cssResolver.ts:121-135` | em/rem 상속 기반 해석 |
| `font-weight` | ✅ | `cssResolver.ts:23`, `nodeRenderers.ts:595-606` | 100-900, normal, bold — CanvasKit FontWeight 매핑 |
| `font-style` | ✅ | `cssResolver.ts:24`, `nodeRenderers.ts:608-615` | normal, italic, oblique |
| `font` (shorthand) | ❌ | — | |
| `font-variant` | ❌ | — | |
| `font-stretch` | ❌ | — | |
| `line-height` | ✅ | `utils.ts:1019-1052`, `nodeRenderers.ts:537` | 배수, px, normal |

---

## 11. CSS Text Level 3

> Spec: [CSS Text Module Level 3](https://www.w3.org/TR/css-text-3/)

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `text-align` | ✅ | `cssResolver.ts:28`, `nodeRenderers.ts:581-591` | left, center, right, justify (상속) |
| `text-decoration` | ✅ | `nodeRenderers.ts:627-633` | underline, overline, line-through (비트마스크) |
| `text-decoration-style` | ❌ | — | solid만 지원 |
| `text-decoration-color` | ❌ | — | |
| `text-transform` | ✅ | `cssResolver.ts:29`, `styleConverter.ts:276-289` | uppercase, lowercase, capitalize (상속) |
| `text-overflow` | ❌ | — | ellipsis 미지원 |
| `white-space` | ✅ | `cssResolver.ts:33`, `utils.ts:1143-1188` | normal, nowrap, pre, pre-wrap, pre-line (상속) |
| `word-break` | ✅ | `cssResolver.ts:31` | normal, break-all, keep-all (상속) |
| `overflow-wrap` / `word-wrap` | ❌ | — | |
| `letter-spacing` | ✅ | `cssResolver.ts:27`, `nodeRenderers.ts:625` | 상속 가능 |
| `word-spacing` | ❌ | — | |
| `text-indent` | ❌ | — | |
| `vertical-align` | ⚠️ | `utils.ts:983-1007` | baseline, top, bottom, middle만 — text-top/text-bottom/super/sub은 baseline 폴백 |

---

## 12. CSS Transforms Level 1

> Spec: [CSS Transforms Module Level 1](https://www.w3.org/TR/css-transforms-1/)

| 함수 / 속성 | 상태 | 구현 파일 | 비고 |
|-------------|------|-----------|------|
| `translate(x, y)` | ✅ | `styleConverter.ts:609-613` | |
| `translateX()` / `translateY()` | ✅ | `styleConverter.ts:615-621` | |
| `rotate()` | ✅ | `styleConverter.ts:623-625` | deg, rad, turn, grad |
| `scale()` | ✅ | `styleConverter.ts:627-631` | |
| `scaleX()` / `scaleY()` | ✅ | `styleConverter.ts:633-641` | |
| `skew()` | ✅ | `styleConverter.ts:643-647` | |
| `skewX()` / `skewY()` | ✅ | `styleConverter.ts:649-655` | |
| `matrix()` | ❌ | `styleConverter.ts:657` | TODO |
| `transform-origin` | ✅ | `styleConverter.ts:679-728` | px, %, 키워드(left/center/right/top/bottom) |
| 다중 함수 조합 | ✅ | `styleConverter.ts:594-668` | 3x3 행렬 곱셈 (좌→우) |
| 3D transforms (`matrix3d`, `perspective`, `rotate3d`) | ❌ | — | |

---

## 13. CSS Transitions / Animations

> Spec: [CSS Transitions Level 1](https://www.w3.org/TR/css-transitions-1/), [CSS Animations Level 1](https://www.w3.org/TR/css-animations-1/)

| 속성 | 상태 | 비고 |
|------|------|------|
| `transition` | ❌ | CanvasKit 정적 렌더링 — 프레임 기반 애니메이션 인프라 없음 |
| `animation` | ❌ | |
| `@keyframes` | ❌ | |
| `transition-*` 개별 속성 | ❌ | |

---

## 14. CSS Filter Effects Level 1

> Spec: [Filter Effects Module Level 1](https://www.w3.org/TR/filter-effects-1/)

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `filter: blur()` | ✅ | `styleConverter.ts:421-426` | LayerBlurEffect (전경 블러) |
| `filter: brightness()` | ❌ | — | |
| `filter: contrast()` | ❌ | — | |
| `filter: grayscale()` | ❌ | — | |
| `filter: saturate()` | ❌ | — | |
| `filter: sepia()` | ❌ | — | |
| `filter: invert()` | ❌ | — | |
| `filter: hue-rotate()` | ❌ | — | |
| `filter: drop-shadow()` | ❌ | — | `box-shadow`로 대체 가능 |
| `backdrop-filter: blur()` | ✅ | `styleConverter.ts:429-434` | BackgroundBlurEffect (배경 블러) |

---

## 15. CSS Visual Effects

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `visibility: visible` | ✅ | (기본값) | |
| `visibility: hidden` | ✅ | `BoxSprite.tsx:223`, `cssResolver.ts:30` | 상속 가능, 렌더 스킵 |
| `visibility: collapse` | ❌ | — | |
| `mix-blend-mode` | ✅ | `blendModes.ts:33-61` | 18종 (multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity 등) |
| `cursor` | ❌ | — | PixiJS 커서 미연동 |
| `pointer-events` | ❌ | — | PixiJS eventMode 고정 |
| `clip-path` | ❌ | — | |
| `mask` / `mask-image` | ❌ | — | |

---

## 16. CSS Values and Units Level 3

> Spec: [CSS Values and Units Module Level 3](https://www.w3.org/TR/css-values-3/)

### 16.1 단위

| 단위 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `px` | ✅ | `cssValueParser.ts:217-220` | |
| `%` | ✅ | `cssValueParser.ts:254-263` | containerSize 기준 |
| `em` | ✅ | `cssValueParser.ts:223-230` | 부모 fontSize 상속 기반 |
| `rem` | ✅ | `cssValueParser.ts:232-237` | rootFontSize 기반 |
| `vw` / `vh` | ✅ | `cssValueParser.ts:239-253` | |
| `vmin` / `vmax` | ❌ | — | |
| `ch` / `ex` | ❌ | — | |
| `cm` / `mm` / `in` / `pt` / `pc` | ❌ | — | |

### 16.2 값 함수

| 함수 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `calc()` | ✅ | `cssValueParser.ts:297-381` | +, −, ×, ÷, 괄호 중첩, 혼합 단위 |
| `var()` | ✅ | `cssValueParser.ts:98-143` | 중첩, fallback, 순환 참조 방지 |
| `min()` / `max()` / `clamp()` | ❌ | — | |
| `env()` | ❌ | — | |

---

## 17. CSS Cascade Level 4

> Spec: [CSS Cascading and Inheritance Level 4](https://www.w3.org/TR/css-cascade-4/)

| 기능 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| 속성 상속 | ✅ | `cssResolver.ts:21-33, 44-58` | 13종: color, font-family, font-size, font-weight, font-style, text-align, letter-spacing, text-transform, visibility, word-break, line-height, white-space, text-decoration |
| `inherit` 키워드 | ✅ | `cssResolver.ts:114` | |
| `initial` 키워드 | ❌ | — | |
| `unset` 키워드 | ❌ | — | |
| `revert` 키워드 | ❌ | — | |
| `!important` | ❌ | — | |
| `@layer` | ❌ | — | |

---

## 18. CSS Logical Properties Level 1

> Spec: [CSS Logical Properties and Values Level 1](https://www.w3.org/TR/css-logical-1/)

| 속성 | 상태 | 비고 |
|------|------|------|
| `margin-inline-start/end` | ❌ | 물리적 방향 속성만 지원 |
| `margin-block-start/end` | ❌ | |
| `padding-inline-start/end` | ❌ | |
| `padding-block-start/end` | ❌ | |
| `border-inline-*` / `border-block-*` | ❌ | |
| `inset-inline` / `inset-block` | ❌ | |
| `inline-size` / `block-size` | ❌ | |

---

## 요약

### 카테고리별 지원율

| # | CSS Spec Module | ✅ | ⚠️ | ❌ | 지원율 |
|---|----------------|-----|-----|-----|--------|
| 1 | Display Level 3 | 8 | 2 | 1 | 82% |
| 2 | Box Model Level 3 | 13 | 1 | 0 | 96% |
| 3 | Box Sizing Level 3 | 1 | 3 | 0 | 63% |
| 4 | Flexbox Level 1 | 12 | 0 | 2 | 86% |
| 5 | Grid Layout Level 1 | 17 | 0 | 2 | 89% |
| 6 | Positioning Level 3 | 5 | 2 | 0 | 86% |
| 7 | Overflow Level 3 | 2 | 1 | 3 | 42% |
| 8 | Backgrounds/Borders Level 3 | 14 | 2 | 5 | 71% |
| 9 | Color Level 4 | 6 | 0 | 3 | 67% |
| 10 | Fonts Level 3 | 5 | 0 | 3 | 63% |
| 11 | Text Level 3 | 6 | 1 | 5 | 54% |
| 12 | Transforms Level 1 | 10 | 0 | 3 | 77% |
| 13 | Transitions/Animations | 0 | 0 | 4 | 0% |
| 14 | Filter Effects Level 1 | 2 | 0 | 8 | 20% |
| 15 | Visual Effects | 3 | 0 | 5 | 38% |
| 16 | Values/Units Level 3 | 7 | 0 | 5 | 58% |
| 17 | Cascade Level 4 | 2 | 0 | 5 | 29% |
| 18 | Logical Properties Level 1 | 0 | 0 | 7 | 0% |
| | **합계** | **113** | **12** | **61** | **66%** |

### P0 개선 대상 (캔버스 렌더링 정합성 핵심)

| 우선순위 | 항목 | 이유 |
|----------|------|------|
| P0 | `overflow: scroll/auto` | 스크롤 가능한 컨테이너가 캔버스에서 미동작 |
| P0 | `text-overflow: ellipsis` | 텍스트 잘림 시각화 불가 |
| P0 | `position: fixed` | 뷰포트 고정 UI 미동작 |

### P1 개선 대상 (사용 빈도 높은 속성)

| 우선순위 | 항목 | 이유 |
|----------|------|------|
| P1 | `fit-content` / `min-content` / `max-content` 네이티브 | 현재 워크어라운드, Taffy 네이티브 전달 필요 |
| P1 | `background-size` / `background-position` | 이미지 배경 제어 불가 |
| P1 | `cursor` / `pointer-events` | 인터랙션 힌트 부재 |
| P1 | `filter` 함수 확장 (brightness, contrast 등) | 디자인 도구 필수 기능 |
| P1 | `currentColor` | CSS 변수 시스템과 연동 필요 |

---

## 변경 이력

| 날짜 | 버전 | 설명 |
|------|------|------|
| 2026-02-18 | 1.0 | 최초 작성 — CSS Level 3 기준 전체 속성 지원 현황 조사 |
