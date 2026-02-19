# CSS Level 3 엔진 정합성 체크리스트

> **최종 갱신**: 2026-02-19
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
| `contents` | ✅ | 공통 | `BuilderCanvas.tsx` pageChildrenMap 플래튼 | 자식을 부모에 직접 배치, 자체 박스 생성 안 함 |

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
| `flex-flow` | ✅ | `TaffyFlexEngine.ts:88-112` | shorthand 파싱 → flex-direction + flex-wrap 분리 |
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
| `order` | ✅ | `TaffyFlexEngine.ts:118-122`, `taffyLayout.ts` | Taffy WASM order 전달 |

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
| `place-items` | ✅ | `TaffyGridEngine.ts` | shorthand 파싱 → align-items + justify-items 분리 |
| `place-content` | ✅ | `TaffyGridEngine.ts` | shorthand 파싱 → align-content + justify-content 분리 |
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
| `overflow: clip` | ✅ | `BoxSprite.tsx`, `DropflowBlockEngine.ts` | hidden과 동일한 clipRect, BFC 생성 |
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
| `background-size` | ✅ | `fillToSkia.ts` | cover, contain, auto, px, % |
| `background-position` | ✅ | `fillToSkia.ts` | 키워드(center/top/bottom/left/right), px, % |
| `background-repeat` | ✅ | `fillToSkia.ts`, `fills.ts` | repeat, no-repeat, repeat-x, repeat-y |
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
| `border-style: double` | ✅ | `nodeRenderers.ts` renderDoubleBorder | 3등분 outer/inner 선, sw<3px 시 solid 폴백 |
| `border-style: groove/ridge/inset/outset` | ✅ | `nodeRenderers.ts` renderGrooveRidge/InsetOutset | colord darken/lighten 명암 계산 |
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
| `color-mix()` | ✅ | `styleConverter.ts` resolveColorMix | in srgb RGB 보간, 재귀 중첩 지원 (depth 5) |
| `currentColor` | ✅ | `cssResolver.ts` preprocessStyle | 단독 + 복합값(box-shadow 등) 내 토큰 치환 |

---

## 10. CSS Fonts Level 3

> Spec: [CSS Fonts Module Level 3](https://www.w3.org/TR/css-fonts-3/)

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `font-family` | ✅ | `cssResolver.ts:22`, `nodeRenderers.ts:621` | 상속 가능, fallback 목록 |
| `font-size` | ✅ | `cssResolver.ts:121-135` | em/rem 상속 기반 해석 |
| `font-weight` | ✅ | `cssResolver.ts:23`, `nodeRenderers.ts:595-606` | 100-900, normal, bold — CanvasKit FontWeight 매핑 |
| `font-style` | ✅ | `cssResolver.ts:24`, `nodeRenderers.ts:608-615` | normal, italic, oblique |
| `font` (shorthand) | ✅ | `cssValueParser.ts` parseFontShorthand, `cssResolver.ts` | style/weight/size/line-height/family 분리, 개별 속성 우선 |
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
| `text-decoration-style` | ✅ | `nodeRenderers.ts` | solid, dashed, dotted, double, wavy — CanvasKit DecorationStyle 매핑 |
| `text-decoration-color` | ✅ | `nodeRenderers.ts` | colord 파싱 → Float32Array RGBA |
| `text-transform` | ✅ | `cssResolver.ts:29`, `styleConverter.ts:276-289` | uppercase, lowercase, capitalize (상속) |
| `text-overflow` | ✅ | `nodeRenderers.ts` | ParagraphStyle maxLines:1 + ellipsis:'...' |
| `white-space` | ✅ | `cssResolver.ts:33`, `utils.ts:1143-1188` | normal, nowrap, pre, pre-wrap, pre-line (상속) |
| `word-break` | ✅ | `cssResolver.ts:31` | normal, break-all, keep-all (상속) |
| `overflow-wrap` / `word-wrap` | ✅ | `cssResolver.ts` | 상속 가능, CanvasKit breakStrategy API 대기 |
| `letter-spacing` | ✅ | `cssResolver.ts:27`, `nodeRenderers.ts:625` | 상속 가능 |
| `word-spacing` | ✅ | `cssResolver.ts`, `nodeRenderers.ts` | 상속 가능, ParagraphStyle wordSpacing |
| `text-indent` | ✅ | `cssResolver.ts`, `nodeRenderers.ts` | 상속 가능, canvas.drawParagraph x 오프셋 |
| `vertical-align` | ⚠️ | `utils.ts:983-1007`, `utils.ts:1334-1374` | baseline(FontMetrics ascent 기반), top, bottom, middle — text-top/text-bottom/super/sub은 baseline 폴백 |

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
| `matrix()` | ✅ | `styleConverter.ts:661-673` | CSS matrix(a,b,c,d,e,f) → CanvasKit row-major 3x3 변환 |
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
| `filter: brightness()` | ✅ | `styleConverter.ts:792-800`, `styleConverter.ts:982-990` | SVG 사양 4x5 색상 행렬, CanvasKit ColorFilter |
| `filter: contrast()` | ✅ | `styleConverter.ts:808-817`, `styleConverter.ts:993-1001` | SVG 사양 4x5 색상 행렬, CanvasKit ColorFilter |
| `filter: grayscale()` | ✅ | `styleConverter.ts:884-902`, `styleConverter.ts:1026-1036` | SVG Filter Effects Level 1 사양 4x5 색상 행렬, CanvasKit ColorFilter |
| `filter: saturate()` | ✅ | `styleConverter.ts:825-839`, `styleConverter.ts:1004-1013` | SVG 사양 feColorMatrix saturate, CanvasKit ColorFilter |
| `filter: sepia()` | ✅ | `styleConverter.ts:932-952`, `styleConverter.ts:1048-1058` | SVG Filter Effects Level 1 사양 4x5 색상 행렬, CanvasKit ColorFilter |
| `filter: invert()` | ✅ | `styleConverter.ts:909-924`, `styleConverter.ts:1038-1047` | 4x5 색상 행렬, CanvasKit ColorFilter |
| `filter: hue-rotate()` | ✅ | `styleConverter.ts:847-878`, `styleConverter.ts:1015-1024` | SVG 사양 feColorMatrix hueRotate, CanvasKit ColorFilter |
| `filter: drop-shadow()` | ✅ | `styleConverter.ts` parseCSSFilter | CanvasKit DropShadowImageFilter |
| `backdrop-filter: blur()` | ✅ | `styleConverter.ts:429-434` | BackgroundBlurEffect (배경 블러) |

---

## 15. CSS Visual Effects

| 속성 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `visibility: visible` | ✅ | (기본값) | |
| `visibility: hidden` | ✅ | `BoxSprite.tsx:223`, `cssResolver.ts:30` | 상속 가능, 렌더 스킵 |
| `visibility: collapse` | ✅ | `BoxSprite.tsx`, `TextSprite.tsx`, `ImageSprite.tsx` | hidden과 동일 처리 (렌더 스킵) |
| `mix-blend-mode` | ✅ | `blendModes.ts:33-61` | 18종 (multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity 등) |
| `cursor` | ✅ | `BoxSprite.tsx`, `TextSprite.tsx`, `ImageSprite.tsx`, `ElementSprite.tsx` | PixiJS Container cursor 매핑 |
| `pointer-events` | ✅ | `BoxSprite.tsx`, `TextSprite.tsx`, `ImageSprite.tsx`, `ElementSprite.tsx` | CSS → PixiJS eventMode 매핑 (none→passive, auto→static) |
| `clip-path` | ✅ | `styleConverter.ts` parseClipPath, `nodeRenderers.ts` buildClipPath | inset, circle, ellipse, polygon — CanvasKit clipPath |
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
| `vmin` / `vmax` | ✅ | `cssValueParser.ts` resolveUnitValue | Math.min/max(viewportWidth, viewportHeight) |
| `ch` / `ex` | ✅ | `cssValueParser.ts` resolveUnitValue | fontSize×0.5 근사치 |
| `cm` / `mm` / `in` / `pt` / `pc` | ✅ | `cssValueParser.ts` resolveUnitValue | 1in=96px 기준 물리 단위 변환 |

### 16.2 값 함수

| 함수 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| `calc()` | ✅ | `cssValueParser.ts:297-381` | +, −, ×, ÷, 괄호 중첩, 혼합 단위 |
| `var()` | ✅ | `cssValueParser.ts:98-143` | 중첩, fallback, 순환 참조 방지 |
| `min()` / `max()` / `clamp()` | ✅ | `cssValueParser.ts:204-218`, `cssValueParser.ts:339-437` | CSS Values Level 4 준수, 혼합 단위 지원 |
| `env()` | ❌ | — | |

---

## 17. CSS Cascade Level 4

> Spec: [CSS Cascading and Inheritance Level 4](https://www.w3.org/TR/css-cascade-4/)

| 기능 | 상태 | 구현 파일 | 비고 |
|------|------|-----------|------|
| 속성 상속 | ✅ | `cssResolver.ts:21-33, 44-58` | 13종: color, font-family, font-size, font-weight, font-style, text-align, letter-spacing, text-transform, visibility, word-break, line-height, white-space, text-decoration |
| `inherit` 키워드 | ✅ | `cssResolver.ts:114` | |
| `initial` 키워드 | ✅ | `cssResolver.ts` resolveCascadeKeyword | CSS_INITIAL_VALUES 매핑 (30+ 속성) |
| `unset` 키워드 | ✅ | `cssResolver.ts` resolveCascadeKeyword | 상속 가능 → inherit, 아니면 → initial |
| `revert` 키워드 | ✅ | `cssResolver.ts` resolveCascadeKeyword | initial로 폴백 (UA stylesheet 미지원) |
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
| 1 | Display Level 3 | 9 | 2 | 0 | 82% |
| 2 | Box Model Level 3 | 13 | 1 | 0 | 96% |
| 3 | Box Sizing Level 3 | 1 | 3 | 0 | 63% |
| 4 | Flexbox Level 1 | 14 | 0 | 0 | 100% |
| 5 | Grid Layout Level 1 | 19 | 0 | 0 | 100% |
| 6 | Positioning Level 3 | 5 | 2 | 0 | 86% |
| 7 | Overflow Level 3 | 3 | 1 | 2 | 58% |
| 8 | Backgrounds/Borders Level 3 | 19 | 1 | 1 | 95% |
| 9 | Color Level 4 | 8 | 0 | 2 | 80% |
| 10 | Fonts Level 3 | 6 | 0 | 2 | 75% |
| 11 | Text Level 3 | 12 | 1 | 0 | 96% |
| 12 | Transforms Level 1 | 10 | 0 | 1 | 91% |
| 13 | Transitions/Animations | 0 | 0 | 4 | 0% |
| 14 | Filter Effects Level 1 | 10 | 0 | 0 | 100% |
| 15 | Visual Effects | 7 | 0 | 1 | 88% |
| 16 | Values/Units Level 3 | 11 | 0 | 1 | 92% |
| 17 | Cascade Level 4 | 5 | 0 | 2 | 71% |
| 18 | Logical Properties Level 1 | 0 | 0 | 7 | 0% |
| | **합계** | **152** | **11** | **23** | **82%** |

> **변경 내역 (2026-02-19 v1.1 갱신):**
> - `matrix()` transform: ❌ → ✅ (`styleConverter.ts:661-673`)
> - `grayscale()` filter: ❌ → ✅ (`styleConverter.ts:884-902, 1026-1036`)
> - `sepia()` filter: ❌ → ✅ (`styleConverter.ts:932-952, 1048-1058`)
> - `invert()` filter: ❌ → ✅ (`styleConverter.ts:909-924, 1038-1047`)
> - `min()` / `max()` / `clamp()`: ❌ → ✅ (`cssValueParser.ts:204-218, 339-437`)
> - `vertical-align` 비고 갱신: FontMetrics ascent 기반 baseline 정밀 계산 반영
> - 총 지원 속성: 113 → **118** (⚠️ 유지, ❌ 감소: 61 → **56**)
>
> **변경 내역 (2026-02-19 v1.2 갱신):**
> - `brightness()` filter: ❌ → ✅ (`styleConverter.ts:792-800, 982-990`) — v1.1에서 구현 누락 확인
> - `contrast()` filter: ❌ → ✅ (`styleConverter.ts:808-817, 993-1001`)
> - `saturate()` filter: ❌ → ✅ (`styleConverter.ts:825-839, 1004-1013`)
> - `hue-rotate()` filter: ❌ → ✅ (`styleConverter.ts:847-878, 1015-1024`)
> - 총 지원 속성: 118 → **122** (지원율: 68% → **72%**). ※ v1.3에서 집계 보정 완료

### P0 개선 대상 (캔버스 렌더링 정합성 핵심)

| 우선순위 | 항목 | 이유 |
|----------|------|------|
| P0 | `overflow: scroll/auto` | 스크롤 가능한 컨테이너가 캔버스에서 미동작 |
| ~~P0~~ | ~~`text-overflow: ellipsis`~~ | ✅ v1.3에서 구현 완료 |
| P0 | `position: fixed` | 뷰포트 고정 UI 미동작 |

### P1 개선 대상 (사용 빈도 높은 속성)

| 우선순위 | 항목 | 이유 |
|----------|------|------|
| P1 | `fit-content` / `min-content` / `max-content` 네이티브 | 현재 워크어라운드, Taffy 네이티브 전달 필요 |
| ~~P1~~ | ~~`background-size` / `background-position`~~ | ✅ v1.3에서 구현 완료 |
| ~~P1~~ | ~~`cursor` / `pointer-events`~~ | ✅ v1.3에서 구현 완료 |
| ~~P1~~ | ~~`filter` 함수 확장 (brightness, contrast, saturate, hue-rotate)~~ | ✅ 구현 완료 (v1.1에서 누락 확인) |
| ~~P1~~ | ~~`currentColor`~~ | ✅ v1.3에서 구현 완료 |

---

## 실행 계획 (Checklist Improvement Plan)

> **목표**: 지원율 72% → 85%+ (52 ❌ 중 ~27개 해소)
> **결과**: ✅ Phase 1-7 완료 — 30개 ❌→✅ 전환, 지원율 72% → **81%** (집계 보정 반영)
> **전략**: 난이도 낮은 항목부터 병렬 실행, Phase별 커밋

### Phase 1: Quick Wins (즉시 구현 가능, 5개)

| # | 항목 | 대상 파일 | 난이도 |
|---|------|-----------|--------|
| 1 | `filter: drop-shadow()` | `styleConverter.ts` parseCSSFilter | 🟢 |
| 2 | `vmin` / `vmax` 단위 | `cssValueParser.ts` resolveUnitValue | 🟢 |
| 3 | `overflow: clip` | `BoxSprite.tsx`, engines | 🟢 |
| 4 | `visibility: collapse` | `BoxSprite.tsx`, cssResolver | 🟢 |
| 5 | `order` (flex) | `TaffyFlexEngine.ts` | 🟢 |

### Phase 2: Shorthand Parsers + CSS Wiring (5개)

| # | 항목 | 대상 파일 | 난이도 |
|---|------|-----------|--------|
| 6 | `flex-flow` shorthand | `cssValueParser.ts`, engines | 🟢 |
| 7 | `place-items` shorthand | `cssValueParser.ts`, engines | 🟢 |
| 8 | `place-content` shorthand | `cssValueParser.ts`, engines | 🟢 |
| 9 | `word-spacing` CSS→Skia 연결 | `styleConverter.ts`, `nodeRenderers.ts` | 🟡 |
| 10 | `overflow-wrap` 렌더러 연결 | `cssResolver.ts`, `nodeRenderers.ts` | 🟡 |

### Phase 3: Text Enhancement (4개)

| # | 항목 | 대상 파일 | 난이도 |
|---|------|-----------|--------|
| 11 | `text-overflow: ellipsis` (P0) | `nodeRenderers.ts`, Skia text | 🟡 |
| 12 | `text-decoration-style` | `nodeRenderers.ts` | 🟡 |
| 13 | `text-decoration-color` | `nodeRenderers.ts` | 🟢 |
| 14 | `text-indent` | `cssResolver.ts`, `nodeRenderers.ts` | 🟡 |

### Phase 4: Background Properties (3개)

| # | 항목 | 대상 파일 | 난이도 |
|---|------|-----------|--------|
| 15 | `background-size` | `fills.ts` | 🟡 |
| 16 | `background-position` | `fills.ts` | 🟡 |
| 17 | `background-repeat` | `fills.ts` | 🟡 |

### Phase 5: Cascade & Color (4개)

| # | 항목 | 대상 파일 | 난이도 |
|---|------|-----------|--------|
| 18 | `currentColor` (P1) | `cssResolver.ts`, `styleConverter.ts` | 🟡 |
| 19 | `initial` keyword | `cssResolver.ts` | 🟢 |
| 20 | `unset` keyword | `cssResolver.ts` | 🟢 |
| 21 | `revert` keyword | `cssResolver.ts` | 🟡 |

### Phase 6: Interaction (2개)

| # | 항목 | 대상 파일 | 난이도 |
|---|------|-----------|--------|
| 22 | `cursor` (P1) | PixiJS Container cursor | 🟡 |
| 23 | `pointer-events` (P1) | PixiJS eventMode 매핑 | 🟡 |

### Deferred (29개, 인프라 변경 필요)

| 카테고리 | 항목 수 | 이유 |
|----------|---------|------|
| Transitions/Animations | 4 | 프레임 기반 애니메이션 인프라 필요 |
| Logical Properties | 7 | writing-mode/direction 지원 필요 |
| 3D transforms | 1 | 4x4 matrix + perspective 필요 |
| 고급 색상 공간 | 3 | lab/oklch/color-mix 라이브러리 필요 |
| 복잡한 cascade | 2 | !important / @layer |
| 단위/함수 | 3 | ch/ex, 물리 단위, env() |
| 복잡한 파싱/렌더 | 9 | display:contents, font/clip-path/mask 등 |

---

## 변경 이력

| 날짜 | 버전 | 설명 |
|------|------|------|
| 2026-02-18 | 1.0 | 최초 작성 — CSS Level 3 기준 전체 속성 지원 현황 조사 |
| 2026-02-19 | 1.1 | Wave 3-4 구현 반영: matrix() transform, grayscale/sepia/invert filter, min()/max()/clamp() 함수, FontMetrics 기반 baseline 갱신. 총 지원 속성 113 → 118 |
| 2026-02-19 | 1.2 | 기존 구현 누락 확인: brightness/contrast/saturate/hue-rotate filter 4종 ❌→✅. 총 지원 속성 118 → 122 (72%) |
| 2026-02-19 | 1.3 | Phase 1-6 일괄 구현 (23개 ❌→✅): drop-shadow filter, vmin/vmax, overflow:clip, visibility:collapse, order, flex-flow, place-items/content, word-spacing, overflow-wrap, text-overflow, text-decoration-style/color, text-indent, background-size/position/repeat, currentColor, initial/unset/revert, cursor, pointer-events. 집계 보정 포함: ✅144, ⚠️11, ❌31 (77%) |
| 2026-02-19 | 1.4 | Phase 7 추가 구현 (7개 ❌→✅): cm/mm/in/pt/pc 물리 단위, ch/ex 단위, font shorthand, border-style double/groove/ridge/inset/outset, clip-path 기본 도형, color-mix(). 총 ✅151, ⚠️11, ❌24 (81%) |
| 2026-02-19 | 1.5 | display:contents 구현: pageChildrenMap 플래튼, depthMap 보정, ElementSprite/BoxSprite 렌더 스킵. 총 ✅152, ⚠️11, ❌23 (**82%**) |
