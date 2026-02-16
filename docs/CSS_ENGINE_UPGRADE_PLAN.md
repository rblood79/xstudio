# CSS 커스텀 엔진 업그레이드 설계안

> PixiJS/@pixi/layout 기반 WebGL 레이아웃의 CSS 일치율을 **83% → 95%+** 로 끌어올리기 위한 근본적 커스터마이징 계획

**Status:** Draft
**Date:** 2026-02-16
**Target:** XStudio Builder Canvas (CanvasKit/Skia 렌더러 + PixiJS 이벤트 레이어)

---

## 0. 현재 상태 요약

### 0.1 아키텍처

```
CSS Style (사용자 입력)
    │
    ├─ display: flex/inline-flex ──→ FlexEngine (Yoga/@pixi/layout 위임)
    ├─ display: block/inline-block → BlockEngine (커스텀 JS + WASM)
    ├─ display: grid ─────────────→ GridEngine (커스텀)
    │
    ├─ styleToLayout.ts ──────────→ Yoga layout prop 변환
    ├─ styleConverter.ts ─────────→ PixiJS 시각 속성 변환
    └─ engines/utils.ts ──────────→ Box Model, 텍스트 측정, 컴포넌트 크기
```

### 0.2 카테고리별 일치율 현황

| 카테고리 | 현재 일치율 | 목표 | 핵심 갭 |
|----------|-----------|------|---------|
| Flexbox | 93% | 98% | order, baseline 정밀도, % gap |
| Block Layout | 90% | 95% | margin %, 텍스트+블록 혼합 |
| Box Model | 88% | 95% | padding/margin %, calc(), border shorthand |
| Typography | 85% | 92% | white-space, word-break, 폰트 메트릭 baseline |
| Visual Effects | 80% | 90% | 다중 box-shadow, transform, gradient |
| Grid | 60% | 85% | repeat(), minmax(), auto-placement, span |
| CSS 단위 | 65% | 85% | em, calc(), min/max-content |
| Position | 65% | 80% | fixed(viewport), z-index stacking context |
| **전체 가중 평균** | **~83%** | **~93%** | |

### 0.3 근본 원인 분석

현재 갭의 근본 원인은 3가지 계층으로 분류된다:

| 계층 | 원인 | 영향 범위 | 해결 난이도 |
|------|------|----------|-----------|
| **L1: Yoga 한계** | Yoga가 CSS 스펙의 일부만 구현 (block, margin collapse, fit-content, grid 미지원) | Block, Grid, intrinsic sizing 전체 | 이미 커스텀 엔진으로 우회 중 |
| **L2: CSS 값 파서 부족** | `calc()`, `em`, `min-content/max-content`, `border` shorthand 미파싱 | 모든 엔진 공통 | 중 — 파서 확장 필요 |
| **L3: 렌더링 피처 부재** | `transform`, 다중 `box-shadow`, `gradient`, `overflow: scroll` 미구현 | 시각 효과 | 상 — Skia API 활용 필요 |

---

## 1. Phase 1: CSS 값 파서 통합 (L2 해결)

> **목표:** 모든 엔진이 공유하는 CSS 값 파싱 레이어를 강화하여 단위/함수 지원 범위 확대
>
> **일치율 영향:** +5~7% (전체 65% → 75% CSS 단위, Box Model 88% → 93%)

### 1.1 `calc()` 파서

현재 `parseSize()`와 `parseCSSValue()`는 `calc()` 를 완전히 무시한다. CSS에서 가장 빈번하게 사용되는 동적 값 계산 함수이므로 최우선 지원 대상이다.

**지원 범위:**

```
calc(100% - 40px)          // 기본 사칙연산
calc(100vh - 64px)         // viewport 단위 혼합
calc(var(--sidebar) + 16px) // CSS 변수 (Phase 3에서 지원)
```

**구현 방식:**

```
파서 구조:
  calcExpr  → term (('+' | '-') term)*
  term      → factor (('*' | '/') factor)*
  factor    → number unit | '(' calcExpr ')' | 'calc(' calcExpr ')'
  unit      → 'px' | '%' | 'vh' | 'vw' | 'em' | 'rem' | (unitless)
```

**파일:** `engines/cssValueParser.ts` (신규)

핵심 API:

```typescript
interface CSSValueContext {
  parentSize: number;       // % 기준
  viewportWidth: number;    // vw 기준
  viewportHeight: number;   // vh 기준
  fontSize: number;         // em 기준
  rootFontSize: number;     // rem 기준 (기본 16)
}

function resolveCSSSizeValue(
  value: string | number | undefined,
  context: CSSValueContext
): number | undefined;
```

**통합 지점:**
- `engines/utils.ts` → `parseSize()`, `parseNumericValue()` 내부에서 `resolveCSSSizeValue()` 호출
- `styleToLayout.ts` → `parseCSSValue()` 내부에서 동일 함수 호출
- `styleConverter.ts` → `parseCSSSize()` 교체

### 1.2 `em` 단위 완전 지원

현재 `styleConverter.ts`에서만 `em` 부분 지원. `engines/utils.ts`에서는 미지원.

**구현:** `CSSValueContext.fontSize`를 상속 체인으로 전파

```
Body (fontSize: 16px)
  └─ Section (fontSize: 1.25em → 20px)
       └─ Button (padding: 0.5em → 10px, fontSize: inherit → 20px)
```

**파일 변경:**
- `engines/utils.ts` — `parseSize()`, `parseNumericValue()`에 fontSize 컨텍스트 추가
- `LayoutEngine.ts` — `LayoutContext`에 `fontSize` 필드 추가
- `BlockEngine.ts` — 자식 순회 시 fontSize 상속 전파

### 1.3 `border` shorthand 파싱

현재 `border: 1px solid red` 형태를 파싱하지 못한다.

```typescript
// 신규: parseBorderShorthand()
// "1px solid red" → { width: 1, style: 'solid', color: 'red' }
// "2px dashed #333" → { width: 2, style: 'dashed', color: '#333' }
function parseBorderShorthand(value: string): {
  width: number;
  style: string;
  color: string;
} | null;
```

**파일:** `engines/utils.ts` — `parseBorder()` 내부에서 shorthand 감지 후 분리 파싱

### 1.4 `min-content` / `max-content`

현재 `fit-content`만 sentinel(-2)로 지원. `min-content`/`max-content`도 동일 패턴으로 추가.

```typescript
export const FIT_CONTENT = -2;
export const MIN_CONTENT = -3;  // 신규
export const MAX_CONTENT = -4;  // 신규
```

**의미:**
- `min-content`: 가장 긴 단어의 너비 (줄바꿈 최대)
- `max-content`: 줄바꿈 없이 한 줄로 펼친 너비
- `fit-content`: `clamp(min-content, available, max-content)`

**구현:** `calculateContentWidth()`를 확장하여 단어 단위 측정 추가

```typescript
function calculateMinContentWidth(element: Element): number {
  const text = extractTextContent(element.props);
  if (!text) return 0;
  const words = text.split(/\s+/);
  return Math.max(...words.map(w => measureTextWidth(w, fontSize)));
}

function calculateMaxContentWidth(element: Element): number {
  const text = extractTextContent(element.props);
  return measureTextWidth(text, fontSize); // 줄바꿈 없는 전체 너비
}
```

---

## 2. Phase 2: Grid 엔진 고급 기능 (L1 해결)

> **목표:** CSS Grid Level 1 스펙의 핵심 기능 구현
>
> **일치율 영향:** Grid 60% → 85%

### 2.1 현재 Grid 한계

| 기능 | 현재 | 목표 |
|------|------|------|
| `grid-template-columns/rows` (px, fr, %, auto) | O | 유지 |
| `repeat(N, track)` | X | O |
| `repeat(auto-fill/auto-fit, minmax())` | X | O |
| `minmax(min, max)` | X | O |
| `span` 키워드 | X | O |
| `grid-auto-flow: dense` | X | O |
| `grid-auto-rows/columns` | X | O |

### 2.2 `repeat()` + `minmax()` 파서

**파일:** `GridLayout.utils.ts` — `parseGridTemplate()` 확장

```typescript
// 현재: "1fr 200px 1fr" → [{ type: 'fr', value: 1 }, ...]
// 목표: "repeat(3, 1fr)" → 3개의 { type: 'fr', value: 1 }
//       "repeat(auto-fill, minmax(200px, 1fr))" → 동적 트랙 생성

interface GridTrack {
  type: 'px' | 'fr' | '%' | 'auto' | 'minmax';
  value: number;
  min?: number;      // minmax()의 최솟값
  max?: number;      // minmax()의 최댓값
  maxUnit?: string;  // minmax()의 최댓값 단위
}

function parseRepeat(expr: string): GridTrack[];
function parseMinmax(expr: string): GridTrack;
```

### 2.3 Auto-Placement 알고리즘

CSS Grid 명세의 auto-placement 알고리즘 구현:

```
1. 명시적 grid-area/column/row가 있는 아이템 배치
2. grid-auto-flow 방향 결정 (row | column | dense)
3. 나머지 아이템을 빈 셀에 순서대로 배치
4. dense 모드: 이전 빈 셀로 되돌아가며 채우기
```

**파일:** `GridLayout.utils.ts` — `autoPlaceItems()` 신규

### 2.4 `span` 키워드

```css
.item { grid-column: span 2; }       /* 2칸 차지 */
.item { grid-column: 1 / span 3; }   /* 1번부터 3칸 */
```

**구현:** `parseGridArea()` 확장

### 2.5 WASM 가속

Grid 아이템이 20개 이상일 때 Rust WASM으로 위임 (기존 `grid_layout.rs` 확장):

```rust
// wasm/src/grid_layout.rs 확장
pub fn grid_auto_placement(
    items: &[GridItem],
    template_cols: &[TrackSize],
    template_rows: &[TrackSize],
    auto_flow: AutoFlow,
    available_width: f32,
    available_height: f32,
) -> Vec<GridCellBounds>;
```

---

## 3. Phase 3: CSS 캐스케이드 경량화 (L2 해결)

> **목표:** `inherit`, CSS 변수(`var()`), 기본 스타일 상속을 지원하는 경량 캐스케이드 시스템
>
> **일치율 영향:** +3~4% (Box Model, Typography 전반)

### 3.1 스타일 상속 체인

CSS에서 일부 속성은 부모로부터 자동 상속된다 (color, font-*, line-height, text-align 등).
현재 XStudio는 각 요소가 독립적으로 스타일을 해석하여 상속이 전혀 동작하지 않는다.

**상속 가능 속성 목록 (CSS 명세):**

```typescript
const INHERITABLE_PROPERTIES = new Set([
  'color', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
  'lineHeight', 'letterSpacing', 'textAlign', 'textTransform',
  'visibility', 'cursor', 'wordBreak', 'overflowWrap',
  'whiteSpace', 'direction', 'textIndent',
]);
```

**구현 방식:**

```
resolveStyle(element, parentComputedStyle):
  1. element.props.style에서 명시적 값 추출
  2. 각 속성에 대해:
     a. 명시적 값이 'inherit' → parentComputedStyle[prop]
     b. 명시적 값이 있음 → 그 값 사용
     c. 명시적 값이 없음 + INHERITABLE → parentComputedStyle[prop]
     d. 명시적 값이 없음 + non-inheritable → initial value
  3. 단위 해석 (em → px, % → px 등)
  4. ComputedStyle 반환
```

**파일:** `engines/cssResolver.ts` (신규)

```typescript
interface ComputedStyle {
  // 모든 CSS 속성의 resolved(px) 값
  width?: number;
  height?: number;
  fontSize: number;          // 상속됨, 기본 16
  color: string;             // 상속됨, 기본 '#000'
  lineHeight?: number;       // 상속됨
  // ... 전체 속성
}

function resolveStyle(
  element: Element,
  parentComputed: ComputedStyle,
  context: CSSValueContext
): ComputedStyle;
```

**통합 지점:** `BlockEngine.calculate()`, `styleToLayout()` 에서 자식 순회 시 `resolveStyle()` 호출하여 computed style 전파

### 3.2 CSS 변수 (`var()`)

```css
:root { --spacing: 16px; }
.box { padding: var(--spacing); }
.box2 { padding: calc(var(--spacing) * 2); }
```

**구현:**

```typescript
interface CSSVariableScope {
  variables: Map<string, string>;
  parent?: CSSVariableScope;
}

function resolveVar(
  value: string,
  scope: CSSVariableScope
): string;
// "var(--spacing)" → "16px"
// "calc(var(--spacing) * 2)" → "calc(16px * 2)"
```

**변수 소스:** 빌더의 디자인 토큰 시스템 (spacing, color, typography 토큰)을 CSS 변수로 노출

---

## 4. Phase 4: 블록 레이아웃 정밀도 향상 (L1 강화)

> **목표:** BlockEngine의 CSS 명세 정합성을 높여 block/inline-block 혼합 배치 정밀도 향상
>
> **일치율 영향:** Block 90% → 95%, Typography 85% → 90%

### 4.1 텍스트 + 블록 혼합 (Inline Formatting Context)

현재 BlockEngine은 block과 inline-block을 완전히 분리하여 처리한다.
CSS에서는 텍스트 노드와 inline-block이 같은 줄에 혼합 배치될 수 있다.

```html
<div>
  텍스트 앞 <button>버튼</button> 텍스트 뒤
</div>
```

**구현 범위 (제한적):**
- 컴포넌트 레벨에서 텍스트+inline-block 혼합은 제한적으로 지원
- 순수 텍스트 노드(anonymous inline box)는 별도 Element로 표현
- 텍스트 노드를 inline-block처럼 LineBox에 참여시킴

**파일:** `BlockEngine.ts` — `LineBoxItem`에 `type: 'text' | 'element'` 추가

### 4.2 폰트 메트릭 기반 Baseline 계산

현재 `calculateBaseline()`은 추정값(height * 0.8)을 사용한다.
정확한 baseline을 위해 Canvas 2D `TextMetrics`의 `alphabeticBaseline`을 활용한다.

```typescript
function measureFontMetrics(
  fontFamily: string,
  fontSize: number,
  fontWeight: string | number
): FontMetrics {
  const ctx = getMeasureContext();
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText('Mg');  // 기준 문자
  return {
    ascent: metrics.actualBoundingBoxAscent,
    descent: metrics.actualBoundingBoxDescent,
    baseline: metrics.alphabeticBaseline ?? metrics.actualBoundingBoxAscent,
  };
}
```

**캐싱:** `Map<string, FontMetrics>` 키 = `${fontFamily}:${fontSize}:${fontWeight}`

### 4.3 `white-space` 기본 지원

| 값 | 줄바꿈 | 공백 축소 | 텍스트 줄바꿈 | 구현 대상 |
|----|--------|----------|-------------|----------|
| `normal` | O | O | O | 현재 기본 동작 |
| `nowrap` | X | O | X | O |
| `pre` | O (manual) | X | X | O |
| `pre-wrap` | O | X | O | O |
| `pre-line` | O | O | O | O |

**구현:** `calculateContentWidth()` / `calculateContentHeight()`에 white-space 모드별 텍스트 측정 분기

```typescript
function measureTextWithWhiteSpace(
  text: string,
  fontSize: number,
  fontFamily: string,
  whiteSpace: string,
  maxWidth: number
): { width: number; height: number; lines: number };
```

### 4.4 `word-break` / `overflow-wrap`

| 속성 | 값 | 동작 |
|------|-----|------|
| `word-break: break-all` | 모든 문자에서 줄바꿈 허용 |
| `word-break: keep-all` | CJK 텍스트 단어 단위 줄바꿈 |
| `overflow-wrap: break-word` | 단어가 컨테이너를 넘을 때만 줄바꿈 |

**구현:** `measureWrappedTextHeight()` 확장 — 줄바꿈 규칙 파라미터 추가

---

## 5. Phase 5: 시각 효과 확장 (L3 해결)

> **목표:** Skia 렌더러의 시각 효과 범위 확대
>
> **일치율 영향:** Visual 80% → 90%

### 5.1 다중 `box-shadow`

현재 `parseFirstBoxShadow()`로 첫 번째 shadow만 파싱한다.

```css
box-shadow:
  0 1px 3px rgba(0,0,0,0.12),   /* 외부 그림자 1 */
  0 1px 2px rgba(0,0,0,0.24),   /* 외부 그림자 2 */
  inset 0 -2px 0 rgba(0,0,0,0.1); /* 내부 그림자 */
```

**구현:**

```typescript
function parseAllBoxShadows(raw: string): DropShadowEffect[] {
  // 괄호 내 콤마를 제외하고 콤마 분리
  const shadows = raw.split(/,(?![^(]*\))/);
  return shadows
    .map(s => parseOneShadow(s.trim()))
    .filter(Boolean) as DropShadowEffect[];
}
```

**Skia 렌더링:** `renderBox()` 에서 `effects[]` 순회하며 각 shadow를 별도 레이어로 렌더

### 5.2 CSS `transform`

```css
transform: rotate(45deg) scale(1.5) translateX(10px);
```

**지원 범위:**

| 함수 | Skia API | 구현 |
|------|----------|------|
| `translate(x, y)` | `canvas.translate()` | O |
| `rotate(deg)` | `canvas.rotate()` | O |
| `scale(x, y)` | `canvas.scale()` | O |
| `skew(x, y)` | `canvas.concat(matrix)` | O |
| `matrix(a,b,c,d,e,f)` | `canvas.concat(matrix)` | O |

**파일:** `styleConverter.ts` — `parseTransform()` 신규, `PixiTransform`에 rotation/scale 추가

```typescript
interface TransformMatrix {
  a: number; b: number; c: number;
  d: number; e: number; f: number;
}

function parseTransform(value: string): TransformMatrix;
// "rotate(45deg) scale(1.5)" → 행렬 곱 결과
```

**Skia 통합:** `nodeRenderers.ts` — `renderNode()` 에서 transform 행렬 적용

```typescript
if (node.transform) {
  canvas.save();
  canvas.concat(Float32Array.of(
    node.transform.a, node.transform.c, node.transform.e,
    node.transform.b, node.transform.d, node.transform.f,
    0, 0, 1
  ));
  // ... 렌더링 ...
  canvas.restore();
}
```

### 5.3 CSS `gradient`

```css
background: linear-gradient(45deg, #f00, #00f);
background: radial-gradient(circle, #f00, #00f);
```

**Skia API:**

```typescript
// linear-gradient → CanvasKit.Shader.MakeLinearGradient
const shader = CanvasKit.Shader.MakeLinearGradient(
  [x1, y1], [x2, y2],
  [color1, color2],
  [0, 1],  // positions
  CanvasKit.TileMode.Clamp
);
paint.setShader(shader);
```

**파일:** `styleConverter.ts` — `parseGradient()` 신규

### 5.4 `overflow: scroll` / `auto`

현재 `overflow`는 BFC 생성에만 사용되고 실제 클리핑/스크롤은 미구현이다.

**구현 범위:**
- `overflow: hidden` → Skia `canvas.clipRect()` (클리핑만)
- `overflow: scroll/auto` → 클리핑 + 스크롤 위치 상태 관리

```typescript
// Skia 클리핑
if (style.overflow === 'hidden' || style.overflow === 'scroll') {
  canvas.save();
  canvas.clipRect(
    Float32Array.of(x, y, x + width, y + height),
    CanvasKit.ClipOp.Intersect,
    true // anti-alias
  );
  // ... 자식 렌더링 ...
  canvas.restore();
}
```

**스크롤 상태:** Zustand slice로 관리 (`elementScrollOffsets: Map<string, {x, y}>`)

---

## 6. Phase 6: Position 및 Stacking Context (L1+L3)

> **목표:** `position: fixed`, `z-index`, stacking context 정확도 향상
>
> **일치율 영향:** Position 65% → 80%

### 6.1 `position: fixed`

현재 `fixed`를 `absolute`와 동일하게 처리한다. 빌더 캔버스에서는 viewport = body이므로,
fixed 요소를 body의 직접 자식으로 재배치하여 에뮬레이션한다.

```typescript
// fixed 요소를 body 레벨로 "끌어올리기"
if (style.position === 'fixed') {
  // 1. 부모 체인에서 분리
  // 2. body의 직접 자식으로 재배치
  // 3. viewport 크기 기준 top/left/right/bottom 해석
}
```

### 6.2 `z-index` + Stacking Context

CSS stacking context 생성 조건:

```typescript
function createsStackingContext(style: CSSStyle): boolean {
  if (style.position === 'fixed' || style.position === 'sticky') return true;
  if (style.position !== undefined && style.zIndex !== undefined) return true;
  if (style.opacity !== undefined && parseFloat(String(style.opacity)) < 1) return true;
  if (style.transform) return true;
  if (style.filter) return true;
  if (style.mixBlendMode && style.mixBlendMode !== 'normal') return true;
  return false;
}
```

**Skia 렌더링 순서:**

```
renderNode(node):
  1. stacking context가 아닌 자식을 z-index 순으로 정렬
  2. z-index < 0 자식 렌더 (뒤)
  3. 현재 노드 렌더
  4. z-index >= 0 자식 렌더 (앞)
  5. 각 stacking context 자식은 재귀적으로 독립 정렬
```

---

## 7. 구현 우선순위 및 로드맵

### 7.1 우선순위 매트릭스

```
영향도 (일치율 개선 %)
  ▲
  │  P1-calc    P2-grid
  │  ■■■■■     ■■■■
  │
  │  P1-em     P4-baseline   P5-transform
  │  ■■■       ■■■           ■■■
  │
  │  P3-inherit  P5-gradient  P6-zindex
  │  ■■          ■■           ■■
  │
  └──────────────────────────────────▶ 구현 난이도
       낮음         중간          높음
```

### 7.2 Phase별 예상 일치율 변화

```
Phase 0 (현재):    ████████░░ 83%
Phase 1 (값 파서): █████████░ 88%  (+5%)
Phase 2 (Grid):    █████████░ 90%  (+2%)
Phase 3 (캐스케이드): █████████░ 91%  (+1%)
Phase 4 (Block):   █████████▓ 93%  (+2%)
Phase 5 (시각):    █████████▓ 95%  (+2%)
Phase 6 (Position): █████████▓ 95%+ (+1%)
```

### 7.3 의존성 그래프

```
Phase 1 (CSS 값 파서)
  ├──→ Phase 2 (Grid) — calc()와 minmax() 파서 공유
  ├──→ Phase 3 (캐스케이드) — em 해석에 fontSize 상속 필요
  └──→ Phase 4 (Block) — min-content/max-content 계산
         └──→ Phase 5 (시각) — transform 파서
                └──→ Phase 6 (Position) — stacking context
```

### 7.4 Phase 1 세부 태스크

| # | 태스크 | 파일 | 의존성 |
|---|--------|------|--------|
| 1.1 | `CSSValueContext` 인터페이스 정의 | `engines/cssValueParser.ts` | 없음 |
| 1.2 | `calc()` 토크나이저 + 재귀 하강 파서 | `engines/cssValueParser.ts` | 1.1 |
| 1.3 | `resolveCSSSizeValue()` 구현 (px, %, vh, vw, em, rem, calc) | `engines/cssValueParser.ts` | 1.2 |
| 1.4 | `parseSize()` → `resolveCSSSizeValue()` 통합 | `engines/utils.ts` | 1.3 |
| 1.5 | `parseCSSValue()` → `resolveCSSSizeValue()` 통합 | `styleToLayout.ts` | 1.3 |
| 1.6 | `parseCSSSize()` → `resolveCSSSizeValue()` 통합 | `styleConverter.ts` | 1.3 |
| 1.7 | `parseBorderShorthand()` 구현 | `engines/utils.ts` | 없음 |
| 1.8 | `MIN_CONTENT(-3)`, `MAX_CONTENT(-4)` sentinel 추가 | `engines/utils.ts` | 없음 |
| 1.9 | `calculateMinContentWidth()`, `calculateMaxContentWidth()` | `engines/utils.ts` | 1.8 |
| 1.10 | BlockEngine `FIT_CONTENT` 분기에 min/max-content 추가 | `BlockEngine.ts` | 1.9 |
| 1.11 | WASM `block_layout.rs`에 min/max-content sentinel 추가 | `wasm/src/block_layout.rs` | 1.10 |
| 1.12 | 단위 테스트 (calc, em, border shorthand, min/max-content) | `__tests__/cssValueParser.test.ts` | 1.1~1.11 |

---

## 8. 아키텍처 결정 사항

### 8.1 CSS 값 파서를 JS vs WASM 중 어디에 구현할 것인가?

**결정: JS (TypeScript)**

| 기준 | JS | WASM |
|------|-----|------|
| 문자열 파싱 성능 | 충분함 (파싱은 1회) | 마샬링 비용이 파싱 이점 상쇄 |
| 디버깅 | 브라우저 devtools 직접 | source-map 필요 |
| 번들 크기 | 0 (기존 번들에 포함) | +30~50KB |
| 개발 속도 | 빠름 | 느림 (빌드 파이프라인) |

파싱은 요소당 1회이고 결과가 캐싱되므로 JS 성능으로 충분하다.
WASM은 레이아웃 계산(N개 자식 순회)에만 사용하는 현재 방침 유지.

### 8.2 스타일 상속을 트리 순회 vs 캐시 중 어떻게 구현할 것인가?

**결정: 트리 순회 + WeakMap 캐시**

```typescript
const computedStyleCache = new WeakMap<Element, ComputedStyle>();

function getComputedStyle(element: Element, parent: Element | null): ComputedStyle {
  const cached = computedStyleCache.get(element);
  if (cached) return cached;

  const parentComputed = parent ? getComputedStyle(parent, ...) : ROOT_STYLE;
  const computed = resolveStyle(element, parentComputed, context);
  computedStyleCache.set(element, computed);
  return computed;
}
```

- 요소 변경 시 해당 요소 + 하위 트리의 캐시만 무효화
- WeakMap이므로 요소 삭제 시 자동 GC

### 8.3 CSS 변수를 어디에 저장할 것인가?

**결정: 디자인 토큰 스토어 연동**

빌더의 기존 디자인 토큰 시스템(spacing, color, typography)을 CSS 변수로 매핑.
사용자가 `:root`에 CSS 변수를 정의하는 것은 Phase 3 범위에서는 지원하지 않음.

```typescript
// 디자인 토큰 → CSS 변수 매핑
const designTokensAsCSS: Map<string, string> = new Map([
  ['--spacing-sm', '8px'],
  ['--spacing-md', '12px'],
  ['--color-primary', '#3b82f6'],
  // ...
]);
```

---

## 9. 성능 제약 조건

모든 Phase에서 다음 성능 기준을 유지해야 한다:

| 지표 | 기준 | 측정 방법 |
|------|------|----------|
| Canvas FPS | ≥ 60fps | `GPUDebugOverlay` RAF FPS |
| 레이아웃 계산 (100 요소) | < 5ms | `performance.measure()` |
| 스타일 해석 (단일 요소) | < 0.1ms | `performance.now()` |
| 초기 로드 증가량 | < 20KB gzip | `vite-plugin-inspect` |
| WASM 모듈 증가량 | < 30KB | `wasm-opt -Oz` |

### 9.1 성능 최적화 전략

1. **Lazy Parsing:** `calc()` 파서는 해당 값이 실제 사용될 때만 호출
2. **결과 캐싱:** 동일 CSS 값 문자열 → 동일 결과 (LRU 캐시, 1000개)
3. **Batch Invalidation:** 스타일 변경 시 dirty 마킹 후 RAF에서 일괄 재계산
4. **WASM 임계값 유지:** children > 10일 때만 WASM 경로 사용

---

## 10. Non-Goals (명시적 제외)

다음 기능은 이 설계안의 범위에 포함되지 않는다:

| 기능 | 사유 |
|------|------|
| `display: inline` (완전한 텍스트 흐름) | 텍스트 레이아웃 엔진 전체 구현 필요, ROI 낮음 |
| `float: left/right` | 레거시 레이아웃, flex/grid로 대체 |
| `position: sticky` | 스크롤 컨텍스트 필요, 노코드 빌더에서 사용 빈도 극히 낮음 |
| CSS `@media` queries | 반응형은 빌더의 브레이크포인트 시스템으로 처리 |
| CSS `transition` / `animation` | 캔버스 에디터에서는 정적 레이아웃만 표시 (프리뷰에서 지원) |
| `writing-mode` (세로 쓰기) / RTL | 노코드 빌더 1차 범위 외 |
| CSS `@container` queries | CSS Containment Level 3, 복잡도 매우 높음 |
| `::before` / `::after` pseudo-elements | 노코드 빌더에서 직접 요소로 표현 |
| `table` display (table, table-row, table-cell) | HTML table 전용 레이아웃, Grid로 대체 |

---

## 11. 테스트 전략

### 11.1 단위 테스트 (Vitest)

각 Phase의 파서/엔진에 대한 단위 테스트:

```
__tests__/
  cssValueParser.test.ts      // Phase 1: calc, em, border shorthand
  gridAutoPlacement.test.ts   // Phase 2: auto-placement 알고리즘
  cssResolver.test.ts         // Phase 3: 상속, CSS 변수
  blockEnginePhase4.test.ts   // Phase 4: baseline, white-space
```

### 11.2 시각 회귀 테스트

Storybook + Chromatic 기반 스크린샷 비교:

```
stories/
  LayoutCSS.stories.tsx       // CSS 속성별 레이아웃 결과 시각 검증
  GridAdvanced.stories.tsx    // repeat, minmax, auto-placement
  TypographyFlow.stories.tsx  // white-space, word-break
```

### 11.3 CSS 정합성 벤치마크

브라우저 CSS 결과와 캔버스 레이아웃 결과를 자동 비교:

```typescript
// 동일한 DOM 구조를 브라우저 iframe과 캔버스 양쪽에 렌더링
// getBoundingClientRect() 결과와 ComputedLayout 결과를 비교
// 허용 오차: ±1px (서브픽셀 반올림 차이)
```

---

## 참조

- [LAYOUT_REQUIREMENTS.md](./LAYOUT_REQUIREMENTS.md) — 하이브리드 레이아웃 엔진 CSS 호환 구현
- [ADR-003: Canvas Rendering](./adr/003-canvas-rendering.md) — PixiJS + Skia 이중 렌더러
- [CSS Display Level 3](https://www.w3.org/TR/css-display-3/) — display, blockification
- [CSS Box Sizing Level 3](https://www.w3.org/TR/css-sizing-3/) — fit-content, min-content, max-content
- [CSS Grid Layout Level 1](https://www.w3.org/TR/css-grid-1/) — Grid 명세
- [CSS Values and Units Level 4](https://www.w3.org/TR/css-values-4/) — calc(), min(), max(), clamp()
- [Yoga Layout](https://yogalayout.dev/) — @pixi/layout 기반 엔진
