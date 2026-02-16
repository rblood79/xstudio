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
    │   └─ parseCSSValue()          (%, vh→%, vw→%, rem, px)
    ├─ styleConverter.ts ─────────→ PixiJS 시각 속성 변환
    │   └─ parseCSSSize()           (px, rem, vh, vw, em, %)
    └─ engines/utils.ts ──────────→ Box Model, 텍스트 측정, 컴포넌트 크기
        └─ parseSize()              (px, %, vh, vw, fit-content)
```

> **주의:** 3개 파일에 독립적인 CSS 값 파서가 존재하며, 각각 지원 단위가 다르다 (→ §0.4 L4 참조).

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
| **전체 가중 평균** | **~83%** | **~95%+** | |

### 0.3 일치율 산정 기준 (추가)

본 문서의 "일치율"은 구현 완료율이 아니라 **브라우저 CSS 결과 대비 정합성**을 의미한다.
산정은 아래 3개 축을 분리하여 추적한다.

| 축 | 기준 | 집계 방식 |
|----|------|-----------|
| 컴포넌트 시각 정합성 | `docs/SPEC_VERIFICATION_CHECKLIST.md` | PASS / WARN / FAIL 분리 집계 |
| 레이아웃 정합성 | `docs/LAYOUT_REQUIREMENTS.md` 체크리스트 + 벤치마크 | 지원 기능 커버리지 + 좌표 오차(±1px) |
| 구현 완료도 | 마이그레이션 문서(`docs/how-to/migration/WEBGL.md`) | 구현/동기화 파일 수 기준 |

> 운영 원칙
>
> - PR/리포트에는 세 지표를 혼합하지 않고 항상 **개별 수치**로 표기한다.
> - "95%+"는 시각+레이아웃 통합 정합성 목표이며, 구현 완료율 100%와 동의어가 아니다.

### 0.4 근본 원인 분석

현재 갭의 근본 원인은 4가지 계층으로 분류된다:

| 계층 | 원인 | 영향 범위 | 해결 난이도 |
|------|------|----------|-----------|
| **L1: Yoga 한계** | Yoga가 CSS 스펙의 일부만 구현 (block, margin collapse, fit-content, grid 미지원) | Block, Grid, intrinsic sizing 전체 | 이미 커스텀 엔진으로 우회 중 |
| **L2: CSS 값 파서 부족** | `calc()`, `em`, `min-content/max-content`, `border` shorthand 미파싱 | 모든 엔진 공통 | 중 — 파서 확장 필요 |
| **L3: 렌더링 피처 부재** | `transform`, 다중 `box-shadow`, `gradient`, `overflow: scroll` 미구현 | 시각 효과 | 상 — Skia API 활용 필요 |
| **L4: CSS 값 파서 파편화** | 3개 독립 파서(`parseSize`, `parseCSSValue`, `parseCSSSize`)가 각각 다른 단위를 지원하여 동일 CSS 값이 경로별로 다르게 해석됨 | 모든 엔진 공통 (파싱 불일치) | 중 — Phase 1 통합 파서로 해결 |

**L4 상세: 파서별 단위 지원 비교**

| 단위 | `parseSize()` (`engines/utils.ts:86`) | `parseCSSValue()` (`styleToLayout.ts:148`) | `parseCSSSize()` (`styleConverter.ts:150`) |
|------|:---:|:---:|:---:|
| px / number | O | O | O |
| % | O (값 해석) | O (문자열 유지) | O (값 해석) |
| vh / vw | O (값 해석) | O (% 문자열 변환) | O (값 해석) |
| rem | X | O (×16) | O (×16) |
| em | X | X | O (parentSize 기반) |
| fit-content | O (sentinel -2) | X (별도 경로) | X |
| calc() | X | X | X |

---

## 1. Phase 1: CSS 값 파서 통합 (L2 해결)

> **목표:** 모든 엔진이 공유하는 CSS 값 파싱 레이어를 강화하여 단위/함수 지원 범위 확대
>
> **일치율 영향:** +5~7% (전체 65% → 75% CSS 단위, Box Model 88% → 93%)

### 현재 파서 현황 (Phase 1 동기)

현재 CSS 값 파싱이 3개 파일에 독립적으로 구현되어 있다 (§0.4 L4 참조):

- `engines/utils.ts` → `parseSize()`: BlockEngine/WASM용. px, %, vh, vw, fit-content만 지원. **em, rem, calc() 미지원** (122행 주석에 명시적 제외)
- `styleToLayout.ts` → `parseCSSValue()`: @pixi/layout Yoga용. %, vh→% 변환, vw→% 변환, rem(×16), px. **em, calc() 미지원**
- `styleConverter.ts` → `parseCSSSize()`: Skia 렌더러용. px, rem, vh, vw, em(parentSize 기반), %. **calc() 미지원**

동일한 CSS 값 `2rem`이 경로에 따라 `parseSize()`에서는 `undefined`(미지원), `parseCSSValue()`에서는 `32`(px)로 해석되는 불일치가 존재한다. Phase 1에서 통합 파서(`cssValueParser.ts`)의 `resolveCSSSizeValue()`를 도입하여 3개 파서 내부에서 공통 호출하는 방식으로 해결한다.

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

**빌드 파이프라인:**

기존 `grid_layout.rs`에 auto-placement 함수를 추가하며, 현재 WASM 빌드 구조를 그대로 활용한다.

| 항목 | 현재 | 변경 후 |
|------|------|---------|
| Rust 소스 | `wasm/src/grid_layout.rs` (`parse_tracks`, `calculate_cell_positions`) | `grid_auto_placement()` 함수 추가 |
| 빌드 명령 | `pnpm wasm:build` (`wasm-pack --target bundler`) | 변경 없음 |
| JS 바인딩 | `wasm-bindings/pkg/xstudio_wasm.js` | 자동 생성 (wasm-bindgen) |
| TS 래퍼 | `wasm-bindings/layoutAccelerator.ts` | Grid 가속 경로 추가 |
| Feature Flag | `WASM_FLAGS.LAYOUT_ENGINE = false` | Grid 아이템 ≥ 20일 때 활성화 |
| Vite 로드 | `vite-plugin-wasm` + `optimizeDeps.exclude` | 변경 없음 |

> 기존 `xstudio-wasm` 크레이트(단일 WASM 모듈)에 Grid 함수를 추가한다.
> 별도 WASM 파일 분리는 초기화 오버헤드 증가로 인해 지양한다.

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

**기존 인프라:** `cssVariableReader.ts` (`canvas/utils/cssVariableReader.ts:84-150`)가 이미 런타임에서 CSS 변수를 읽어 PixiJS hex 값으로 변환하는 기능을 갖추고 있다. `getCSSVariable(name)` → `getComputedStyle(document.documentElement).getPropertyValue(name)` 방식. Phase 3에서 `var()` 파싱 구현 시 이 기존 인프라와 연동하여 디자인 토큰 → CSS 변수 매핑을 활용할 수 있다.

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
| `transform-origin` | `translate(origin) → concat(matrix) → translate(-origin)` | O |

**파일:** `styleConverter.ts` — `parseTransform()`, `parseTransformOrigin()` 신규

```typescript
interface TransformMatrix {
  a: number; b: number; c: number;
  d: number; e: number; f: number;
}

interface TransformSpec {
  matrix: TransformMatrix;
  originX: number;  // px (border-box 기준)
  originY: number;  // px (border-box 기준)
}

function parseTransform(value: string): TransformMatrix;
function parseTransformOrigin(value: string, boxWidth: number, boxHeight: number): { x: number; y: number };
// "rotate(45deg) scale(1.5)" + "50% 50%" → 중심점 기준 행렬 변환
```

**Skia 통합:** `nodeRenderers.ts` — `renderNode()` 에서 transform-origin 반영 후 행렬 적용

```typescript
if (node.transform) {
  canvas.save();
  canvas.translate(node.transform.originX, node.transform.originY);
  canvas.concat(Float32Array.of(
    node.transform.a, node.transform.c, node.transform.e,
    node.transform.b, node.transform.d, node.transform.f,
    0, 0, 1
  ));
  canvas.translate(-node.transform.originX, -node.transform.originY);
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
  const position = style.position;
  const zIndexSpecified = style.zIndex !== undefined && style.zIndex !== 'auto';

  if (style.position === 'fixed' || style.position === 'sticky') return true;
  // CSS: static + z-index는 stacking context를 만들지 않는다.
  if ((position === 'relative' || position === 'absolute') && zIndexSpecified) return true;
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
Phase 0 (현재):          ████████░░ 83%
§8 (구조적 문제):       █████████░ 87%  (+4%) ← P1/P2/P3 수정
§9 (컴포넌트 구조):     █████████░ 89%  (+2%) ← CSS-web 구조 미러링
Phase 1 (값 파서):       █████████▓ 92%  (+3%)
Phase 2 (Grid):          █████████▓ 93%  (+1%)
Phase 3 (캐스케이드):    █████████▓ 94%  (+1%)
Phase 4 (Block):         █████████▓ 95%  (+1%)
Phase 5 (시각):          ██████████ 96%  (+1%)
Phase 6 (Position):      ██████████ 97%+ (+1%)
```

### 7.3 의존성 그래프

```
§8 (구조적 문제 P1/P2/P3) ← 최우선, 독립 실행 가능
  └──→ §9 (컴포넌트 CSS-web 구조) — P1/P2/P3 수정 후 적용
         └──→ Phase 1 (CSS 값 파서) — 컴포넌트 구조 안정화 후
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

### 7.5 Phase Exit Criteria (완료 조건)

각 Phase는 "코드 머지"가 아니라 아래 완료 조건을 만족해야 종료한다.

| Phase | 기능 완료 조건 | 품질/성능 게이트 |
|------|---------------|------------------|
| 1 (값 파서) | `calc/em/min/max-content/border shorthand` 파싱 통합 | 파서 단위 테스트 100% 통과, 레이아웃 100요소 < 5ms 유지 |
| 2 (Grid) | `repeat/minmax/auto-placement/span` 적용 | Grid 벤치마크 케이스 PASS율 85%+ |
| 3 (캐스케이드) | `inherit/var()` 상속 체인 동작 | 회귀 테스트에서 상속 관련 FAIL 0건 |
| 4 (Block 정밀화) | baseline/white-space/word-break 반영 | 텍스트 정렬 오차 ±1px 내 |
| 5 (시각 효과) | multi-shadow/transform/gradient 반영 | Skia 회귀 스냅샷 diff 허용치 이내 |
| 6 (Position) | fixed/z-index/stacking context 동작 | 주요 샘플 시나리오 PASS + FPS 60 유지 |

---

### 7.6 구현 순서 최적화 (스프린트 분할)

리스크를 낮추기 위해 Phase 단위 일괄 투입 대신 세로 슬라이스 방식으로 진행한다.

| Sprint | 범위 | 산출물 |
|--------|------|--------|
| S1 | Phase1-핵심(`calc`, `em`, parser 통합) | `cssValueParser.ts` + 통합 테스트 |
| S2 | Phase2-핵심(`repeat`, `minmax`) + Grid 회귀 | Grid 파서 확장 + 벤치마크 케이스 |
| S3 | Phase3(`inherit`, `var`) + Phase4-기초(baseline) | `cssResolver.ts` + 텍스트 정렬 개선 |
| S4 | Phase5(transform/gradient) + Phase6(z-index/fixed) | 시각 효과/스태킹 정합성 패치 |

각 Sprint는 "기능 + 테스트 + 성능 측정"을 한 묶음으로 머지한다.

---

## 8. 구조적 문제 분석 및 해결 방안 (Self-Rendering 컴포넌트)

> **배경:** Button(width:auto/fit-content/100px, height:auto)에서 텍스트 오버플로 시 높이 자동 조절이 부모의 display, flex-direction, align-items 등에 따라 CSS와 다르게 동작하는 문제 발견

### 8.1 문제 정의

Self-Rendering 컴포넌트(Button, Card, ToggleButton 등)는 `SELF_PADDING_TAGS`로 지정되어 `stripSelfRenderedProps()`가 padding/border를 Yoga에서 제거한다. 이로 인해 Yoga가 정확한 크기 정보를 잃고, CSS와 다른 레이아웃 결과를 생성한다.

**주요 변수/함수 위치 참조:**

| 변수/함수 | 파일 | 행 |
|-----------|------|-----|
| `SELF_PADDING_TAGS` | `BuilderCanvas.tsx` | 642-649 |
| `stripSelfRenderedProps()` | `BuilderCanvas.tsx` | 662-670 |
| `SELF_RENDERING_BTN_TAGS` | `styleToLayout.ts` | 362 |
| `SELF_RENDERING_BUTTON_TAGS` | `styleToLayout.ts` | 602 |
| `BUTTON_PADDING` (height용) | `styleToLayout.ts` | 610-616 |
| `BTN_PAD` (fit-content width용) | `styleToLayout.ts` | 366-368 |
| `BUTTON_SIZE_CONFIG` | `engines/utils.ts` | 290-304 |

### 8.2 P1 — CRITICAL: `layout.height` 고정값 설정

**위치:** `styleToLayout.ts:599-643`

**현상:**
```typescript
// 현재 코드 (styleToLayout.ts:602-625)
const SELF_RENDERING_BUTTON_TAGS = new Set(['button', 'submitbutton', 'fancybutton', 'togglebutton']);
if (SELF_RENDERING_BUTTON_TAGS.has(tag) && height === undefined) {
  // ... BUTTON_PADDING config, fontSize/paddingY/borderW 계산 ...
  const lineHeight = fontSize * 1.2;
  layout.height = paddingY * 2 + lineHeight + borderW * 2;  // ← 고정 px 설정
}
```

self-rendering 버튼 태그에 대해 `layout.height`를 고정 px로 설정한다.
이로 인해 Yoga의 `align-items: stretch`가 무시되어 부모 flex 컨테이너에서 cross-axis 늘리기가 동작하지 않는다.

**부분 수정 존재 (628-642행) — 비효과적:**

625행 이후에 고정 width 버튼에 대한 부분 수정이 이미 존재한다:

```typescript
// styleToLayout.ts:627-642 (부분 수정)
if (typeof width === 'number' && width > 0) {
  const textContent = String(props?.children ?? props?.text ?? props?.label ?? '');
  if (textContent) {
    const paddingX = toNum(style.paddingLeft) ?? toNum(style.padding) ?? bp.px;
    const maxTextWidth = width - paddingX * 2;
    if (maxTextWidth > 0) {
      const wrappedH = measureWrappedTextHeight(textContent, fontSize, 500, 'Pretendard', maxTextWidth);
      if (wrappedH > lineHeight + 0.5) {
        const totalHeight = paddingY * 2 + wrappedH + borderW * 2;
        layout.minHeight = totalHeight;  // ← minHeight 설정
      }
    }
  }
}
```

> **핵심 문제:** 625행에서 `layout.height`가 이미 고정 px 값으로 설정된 상태에서 638행에서 `layout.minHeight`를 추가 설정해도, **Yoga는 `height`(고정값)를 `minHeight`보다 우선 적용**하므로 부분 수정이 실질적 효과를 발휘하지 못한다. `height`가 명시적으로 설정되면 Yoga는 그 값을 최종 높이로 확정하고, `minHeight`/`maxHeight` 제약은 `height`가 `auto`(미설정)일 때만 의미를 갖는다.

**CSS 동작 vs 현재 동작:**

| 시나리오 | CSS 기대값 | 현재 엔진 결과 | 원인 |
|----------|-----------|--------------|------|
| 부모 `flex-direction:row` + `align-items:stretch` | 부모 높이만큼 늘어남 | 고정 높이 유지 | `layout.height = fixed` |
| 부모 `flex-direction:column` + 텍스트 overflow | 텍스트 wrap 높이로 자동 성장 | 1줄 높이 고정 | `layout.height = fixed` (부분 수정 비효과적) |
| `height: auto` + 긴 텍스트 | content 높이 자동 조절 | 1줄 높이로 잘림 | height 고정 선점 |

**해결 방안:**

```typescript
// 수정안: layout.height 삭제 → layout.minHeight만 사용
// 이유: height가 설정되면 Yoga가 minHeight를 무시하므로, height 대신 minHeight만 설정해야
//       align-items:stretch와 텍스트 wrap에 의한 높이 자동 조절이 가능해진다.

// layout.height = paddingY * 2 + lineHeight + borderW * 2;  // ❌ 삭제
layout.minHeight = paddingY * 2 + lineHeight + borderW * 2;   // ✅ 최소 높이로 변경

// height:auto일 때는 Yoga가 자유롭게 높이를 결정하도록 함
if (style.height && style.height !== 'auto') {
  layout.height = parseCSSValue(style.height, parentHeight);
}
```

**효과:** Yoga가 `align-items: stretch`와 `flex-grow`에 따라 높이를 자유롭게 계산할 수 있게 됨. 기존 부분 수정(628-642행)의 minHeight 로직도 height 제약 없이 정상 동작하게 됨.

### 8.3 P2 — HIGH: fit-content 워크어라운드가 stretch 차단

**위치:** `styleToLayout.ts:297-301`, `styleToLayout.ts:362-381`

**현상:**
```typescript
// 현재 코드 (styleToLayout.ts:297-301) — 일반 fit-content 처리
if (isFitContentWidth) {
  layout.width = 'auto';
  if (layout.flexGrow === undefined) layout.flexGrow = 0;    // ← 조건부 설정
  if (layout.flexShrink === undefined) layout.flexShrink = 0; // ← 조건부 설정
}

// 현재 코드 (styleToLayout.ts:362-381) — self-rendering 버튼 fit-content 처리
if (SELF_RENDERING_BTN_TAGS.has(tag) && isFitContentWidth) {
  // ... BTN_PAD config, textWidth 측정 ...
  layout.width = Math.round(measuredTextWidth) + paddingX * 2 + borderW * 2; // 명시적 px 강제
  layout.flexGrow = 0;   // ← 무조건 설정 (297-301의 조건부와 불일치)
  layout.flexShrink = 0; // ← 무조건 설정
}
```

> **참고:** 297-301행의 일반 경로는 `if (layout.flexGrow === undefined)` 조건부로 사용자 명시 설정을 보존하지만, 362-381행의 버튼 경로는 무조건 `flexGrow = 0`을 강제한다. 이는 사용자가 명시적으로 `flex-grow`를 설정한 경우에도 덮어쓰게 되는 비일관적 동작이다.

**Config 파편화 문제:** 버튼 크기 설정이 2벌 존재한다:
- `BTN_PAD` (366-368행): fit-content width 계산용 — `{ px, fs }` 2개 필드
- `BUTTON_PADDING` (610-616행): height 계산용 — `{ px, py, fs }` 3개 필드

두 config가 동일한 버튼 사이즈 프리셋을 나타내지만 독립적으로 정의되어 있어, 하나만 수정하면 width/height 계산 간 불일치가 발생할 수 있다. `engines/utils.ts:290`의 `BUTTON_SIZE_CONFIG`까지 포함하면 총 3벌이다.

`width: fit-content` 처리에서
1) `flexGrow/flexShrink=0` 강제,
2) self-rendering 버튼의 명시적 `layout.width(px)` 강제가 동시에 적용된다.
특히 (2)는 cross-axis `align-items: stretch`를 직접 차단한다.

**CSS 동작 vs 현재 동작:**

| 시나리오 | CSS 기대값 | 현재 엔진 결과 | 원인 |
|----------|-----------|--------------|------|
| 부모 `flex-direction:column` + `align-items:stretch` | width가 부모 너비로 늘어남 | fit-content 너비 유지 | `layout.width(px)` 강제 + `flexGrow=0` |
| 부모 `flex-direction:row` + fit-content width | 콘텐츠 너비 유지 (올바름) | 콘텐츠 너비 유지 | 정상 동작 |

**해결 방안:**

```typescript
// 1) self-rendering fit-content width의 명시적 px 강제 제거
//    (intrinsic size는 measureFunc가 담당)
if (SELF_RENDERING_BTN_TAGS.has(tag) && isFitContentWidth) {
  layout.width = 'auto';
}

// 2) grow/shrink 제한은 row 주축에서만 적용
if (isFitContentWidth) {
  const parentFlexDir = parentStyle?.flexDirection || 'row';
  if (parentFlexDir === 'row' || parentFlexDir === 'row-reverse') {
    layout.flexGrow = 0;
    layout.flexShrink = 0;
  }
  // column 주축에서는 cross-axis stretch 허용
}
```

### 8.4 P3 — HIGH: Yoga measureFunc 미설정

**현상:**

Yoga는 `measureFunc`를 통해 leaf 노드의 intrinsic 크기를 동적으로 계산한다.
현재 self-rendering 컴포넌트에 measureFunc가 설정되지 않아, Yoga가 부모 크기 변경 시 자식의 텍스트 wrap 높이를 재계산하지 못한다.

**measureFunc 구현 현황:**

| 컨텍스트 | measureFunc 여부 | 파일 | 비고 |
|---------|:---:|------|------|
| Skia 텍스트 노드 (CanvasKit Paragraph) | **O** | `skia/textMeasure.ts:91` `createYogaMeasureFunc()` | Skia 렌더러용, CanvasKit paragraph API로 텍스트 측정 |
| @pixi/layout Yoga 버튼 노드 | **X** | (미구현 — **이것이 P3 문제**) | self-rendering 컴포넌트에 measureFunc 미설정 |

> Skia 텍스트 노드에는 이미 `createYogaMeasureFunc()`가 구현되어 있으므로, P3 해결 시 이 구현을 참고하여 @pixi/layout Yoga 버튼 노드에도 유사한 measureFunc를 설정해야 한다.

**CSS에서 일어나는 일:**
```
부모 width 변경 → 브라우저 reflow → 버튼 width 재계산 → 텍스트 wrap 발생 → height 자동 증가
```

**현재 엔진에서 일어나는 일:**
```
부모 width 변경 → Yoga layout 재계산 → 버튼 width는 업데이트됨
→ 하지만 텍스트 wrap 높이가 "이전 width 기준"으로 남아 있음 → height 불일치
```

**해결 방안:**

```typescript
// @pixi/layout의 Yoga 노드에 measureFunc 설정
import Yoga from 'yoga-layout';

function setupMeasureFunc(yogaNode: YogaNode, element: Element) {
  const tag = element.tag;
  if (!SELF_RENDERING_TAGS.has(tag)) return;

  yogaNode.setMeasureFunc((width, widthMode, _height, _heightMode) => {
    const text = extractTextContent(element.props);
    const fontSize = element.props.style?.fontSize || 14;
    const fontWeight = element.props.style?.fontWeight || 400;
    const fontFamily = element.props.style?.fontFamily || 'Pretendard';
    const paddingX = getSizePreset(tag, element.props.size).paddingX;
    const paddingY = getSizePreset(tag, element.props.size).paddingY;
    const borderW = parseBorderWidth(element.props.style);

    // intrinsic width: 줄바꿈 없이 측정
    const intrinsicTextWidth = measureTextWidth(text, fontSize, fontFamily, fontWeight);
    const intrinsicWidth = paddingX * 2 + intrinsicTextWidth + borderW * 2;

    // Yoga 계약:
    // - EXACTLY: width를 그대로 사용
    // - AT_MOST: min(intrinsic, available)
    // - UNDEFINED: intrinsic width 사용
    const resolvedWidth =
      widthMode === Yoga.MEASURE_MODE_EXACTLY
        ? width
        : widthMode === Yoga.MEASURE_MODE_AT_MOST
          ? Math.min(intrinsicWidth, width)
          : intrinsicWidth;

    const textMaxWidth = Math.max(0, resolvedWidth - paddingX * 2 - borderW * 2);
    const textHeight = measureWrappedTextHeight(text, fontSize, fontWeight, fontFamily, textMaxWidth);

    return {
      width: resolvedWidth,
      height: paddingY * 2 + textHeight + borderW * 2,
    };
  });
}
```

**효과:**
- Yoga measure mode 계약(EXACTLY/AT_MOST/UNDEFINED)을 준수하여 intrinsic sizing 오차를 줄임
- available width가 제한될 때만 줄바꿈이 발생하고, 폭/높이 계산이 CSS와 동일한 방향으로 수렴
- 부모 크기 변경 시 자동으로 높이 재조정

### 8.5 10-Case CSS Divergence Matrix

부모 속성 + 자식 `width` 설정 조합에 따른 Button(height:auto, text overflow) 동작 비교:

| # | 부모 display | flex-direction | align-items | 자식 width 설정 | CSS 결과 | 현재 엔진 결과 | 원인 | 상태 | 수정 Phase |
|---|-------------|---------------|-------------|----------------|---------|---------------|------|------|-----------|
| 1 | flex | row | stretch | `100px` | height=부모높이 | height=1줄고정 | P1 | 미수정 | 8.2 |
| 2 | flex | row | center | `100px` | height=auto(wrap) | height=1줄고정 (부분 수정: minHeight 설정하나 height 고정이 우선하여 비효과적) | P1+P3 | 부분 수정(비효과적) | 8.2+8.4 |
| 3 | flex | row | flex-start | `100px` | height=auto(wrap) | height=1줄고정 (부분 수정: minHeight 설정하나 height 고정이 우선하여 비효과적) | P1+P3 | 부분 수정(비효과적) | 8.2+8.4 |
| 4 | flex | column | stretch | `fit-content` | width=부모너비, height=auto | width=fit-content | P2 | 미수정 | 8.3 |
| 5 | flex | column | center | `100px` | width=100px, height=auto | height=1줄고정 (부분 수정: minHeight 설정하나 height 고정이 우선하여 비효과적) | P1+P3 | 부분 수정(비효과적) | 8.2+8.4 |
| 6 | flex | column | flex-start | `100px` | width=100px, height=auto | height=1줄고정 (부분 수정: minHeight 설정하나 height 고정이 우선하여 비효과적) | P1+P3 | 부분 수정(비효과적) | 8.2+8.4 |
| 7 | flex | row | baseline | `100px` | height=auto, baseline정렬 | baseline 무시 | P1+P3 | 미수정 | 8.2+8.4+Phase4 |
| 8 | block | - | - | `auto` | width=100%(block), height=auto | width=100px | P2 | 미수정 | 8.3 |
| 9 | flex | row-reverse | stretch | `100px` | height=부모높이 (역순) | height=1줄고정 | P1 | 미수정 | 8.2 |
| 10 | grid | - | stretch | `100px` | 셀 크기에 맞춤 | height=1줄고정 | P1+P3 | 미수정 | 8.2+8.4 |

> **부분 수정(비효과적)**: Case 2,3,5,6에서 `styleToLayout.ts:628-642`의 코드가 고정 width 버튼에 대해 `layout.minHeight`를 설정하지만, 625행에서 이미 `layout.height`가 고정 px로 설정되어 있어 Yoga가 `minHeight`를 무시한다. §8.2의 해결 방안(height→minHeight 전환) 적용 시 이 부분 수정이 정상 동작하게 된다.

### 8.6 수정 적용 순서

```
Step 1: P1 수정 (layout.height → layout.minHeight)
  ├─ 영향: Case 1,2,3,5,6,7,9,10 부분 해결
  ├─ 위험도: 중 (모든 self-rendering 컴포넌트에 영향)
  └─ 검증: Button/Card 높이 자동 조절 테스트

Step 2: P2 수정 (fit-content px 강제 제거 + 조건부 grow/shrink)
  ├─ 영향: Case 4,8 해결
  ├─ 위험도: 중 (flex-direction 감지 로직 추가)
  └─ 검증: column flex + fit-content 버튼 stretch 테스트

Step 3: P3 수정 (measureFunc 설정)
  ├─ 영향: Case 2,3,5,6,7,10 완전 해결
  ├─ 위험도: 상 (@pixi/layout 내부 Yoga 노드 접근 필요)
  └─ 검증: 부모 width 변경 시 텍스트 wrap + 높이 변경 테스트
```

**§8 관련 파일 요약:**

| 파일 | 경로 | 핵심 역할 (§8 관점) |
|------|------|-------------------|
| `styleToLayout.ts` | `apps/builder/src/builder/workspace/canvas/layout/styleToLayout.ts` | fit-content 워크어라운드(297-301), 버튼 width 계산(362-381), 버튼 height 고정(599-643) |
| `BuilderCanvas.tsx` | `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx` | SELF_PADDING_TAGS 정의(642-649), stripSelfRenderedProps(662-670) |
| `engines/utils.ts` | `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts` | parseSize(86-126), BUTTON_SIZE_CONFIG(290-304), FIT_CONTENT sentinel(53) |
| `styleConverter.ts` | `apps/builder/src/builder/workspace/canvas/sprites/styleConverter.ts` | parseCSSSize — Skia용 CSS 값 파서(150-201) |
| `textMeasure.ts` | `apps/builder/src/builder/workspace/canvas/skia/textMeasure.ts` | createYogaMeasureFunc — Skia 텍스트 노드용 measureFunc(91-102) |

---

## 9. 컴포넌트 CSS-Web 구조 일치 계획

> **원칙:** TagGroup의 CSS-web 구조 매칭 패턴을 레퍼런스로, 모든 컴포넌트가 CSS-web 구조와 동일하게 동작하도록 정비

### 9.1 TagGroup 레퍼런스 패턴 분석

TagGroup은 CSS-web 구조와 WebGL 구현이 올바르게 일치하는 유일한 레퍼런스 컴포넌트이다.

**CSS-Web 구조:**
```
TagGroup (display:flex, flex-direction:column, gap:2px)
  ├─ Label (text)
  └─ TagList (display:flex, flex-wrap:wrap, gap:4px)
       ├─ Tag (display:flex, align-items:center, padding, border-radius)
       │   ├─ text
       │   └─ RemoveButton (optional)
       └─ ...more Tags
```

**WebGL 구현에서 올바른 점:**

| 패턴 | 설명 |
|------|------|
| **Yoga 레이아웃 위임** | `styleToLayout.ts`에서 TagGroup→`flex+column`, TagList→`flex+row+wrap` 기본값 설정 |
| **자식 요소 분리** | Tag를 독립 Element로 표현, 각각 Yoga 레이아웃에 참여 |
| **CSS 속성 매핑** | gap, padding, border-radius가 CSS 변수와 동일한 값 |
| **Spec 기반 통합** | `TagGroupSpec`에서 sizes/variants 공유 → CSS변수와 동일 토큰 |
| **컨테이너 의미 보존** | TagGroup=column container, TagList=row+wrap container 역할 유지 |

**핵심 원칙 (TagGroup에서 추출):**

1. **DOM 구조 미러링**: CSS-web의 DOM 계층 구조를 Element 트리로 동일하게 재현
2. **레이아웃 위임**: 수동 위치 계산 대신 Yoga/엔진에 레이아웃 위임 (display, flexDirection, gap 등)
3. **Spec 기반 토큰 공유**: CSS 변수 값과 동일한 Spec sizes/variants 사용
4. **자식 요소 독립성**: 자식을 별도 Element로 분리하여 각각 레이아웃 참여

### 9.2 전체 컴포넌트 CSS-Web 구조 비교표

63개 Pixi 컴포넌트를 CSS-web 구조와 비교하여 4단계로 분류:

**A등급: CSS-web 구조 일치 (레이아웃 위임 + 자식 분리)**

| 컴포넌트 | CSS-Web 구조 | WebGL 구현 | 상태 |
|----------|-------------|-----------|------|
| TagGroup | flex column → flex row wrap | Yoga flex column + row wrap | ✅ 일치 |
| ToggleButtonGroup | flex row, 자식 ToggleButton | Yoga flex row | ✅ 일치 |
| CheckboxGroup | flex column, 자식 Checkbox | Yoga flex column | ✅ 일치 |
| Form | flex column, 자식 필드들 | Yoga flex column | ✅ 일치 |
| Group | flex column/row | Yoga flex | ✅ 일치 |
| DisclosureGroup | flex column | Yoga flex column | ✅ 일치 |

**B등급: 부분 일치 (레이아웃 위임하나 자식 구조 차이)**

| 컴포넌트 | CSS-Web 구조 | WebGL 구현 | 갭 |
|----------|-------------|-----------|-----|
| Card | block/flex column (header→content→footer) | Yoga flex + 자체 텍스트 배치 | 자체 measureWrappedTextHeight 사용, Yoga에 텍스트 높이 미위임 |
| Disclosure | details/summary + content | Yoga flex column | summary/content 분리 불완전 |
| Panel | flex column (header + body) | Yoga flex | header 영역 고정 높이 |
| Tabs | flex column (tablist + panels) | Yoga flex | 탭 패널 전환 시 높이 재계산 |

**C등급: 구조 불일치 (자체 렌더링 + 수동 배치)**

| 컴포넌트 | CSS-Web 구조 | WebGL 구현 | 갭 |
|----------|-------------|-----------|-----|
| **Button / FancyButton / SubmitButton** | `<button>` intrinsic sizing | Graphics + 고정 px 크기 | P1(height고정), P3(measureFunc없음) |
| **Badge** | `inline-flex` + center | Graphics + 수동 크기 계산 | intrinsic sizing 미위임, min-width 미지원 |
| **Checkbox** | `flex row` (box + label) | Graphics + 수동 위치 | 자식 분리 안됨, label wrap 높이 미반영 |
| **Input/TextField** | `flex column` (label + input + error) | Graphics + 수동 레이아웃 | 전체 수동 배치, label/input 분리 안됨 |
| **Select** | `flex column` (label + button) | Graphics + 수동 레이아웃 | popover 제외해도 trigger 부분 수동 |
| **Radio** | `flex row` (circle + label) | Graphics + 수동 위치 | Checkbox와 동일 패턴 |
| **Switch** | `flex row` (track + label) | Graphics + 수동 위치 | track 크기 고정, label 동적 |
| **ToggleButton** | `<button>` intrinsic sizing | Graphics + 고정 크기 | Button과 동일 문제 |
| **Breadcrumbs** | `flex row` (items + separators) | 수동 위치 계산 | separator 위치 수동 |
| **Link** | `inline` text with decoration | Graphics + 텍스트 | inline 동작 미지원 |
| **Slider** | `flex` (track + thumb) | Graphics + 수동 위치 | track/thumb 위치 수동 |
| **ProgressBar** | block (label + track) | Graphics + 수동 레이아웃 | label/track 분리 안됨 |
| **Meter** | block (label + track) | Graphics + 수동 레이아웃 | ProgressBar와 동일 |

**D등급: 복합/특수 컴포넌트 (CSS-web 구조 매칭 불가능하거나 불필요)**

| 컴포넌트 | 사유 |
|----------|------|
| Calendar, DatePicker, DateRangePicker | 캔버스에서 달력 위젯 상호작용 불필요 (프리뷰 전용) |
| ColorPicker, ColorArea, ColorWheel, ColorSlider, ColorField | 색상 도구 상호작용 불필요 |
| ComboBox, Menu, Popover, Dialog, Toast | 오버레이/팝업은 캔버스 레이어 밖 렌더링 |
| Table, GridList, Tree | 대량 데이터 렌더링, 가상화 필요 → 별도 전략 |
| NumberField, TimeField, DateField | 입력 필드 상호작용은 프리뷰 전용 |

### 9.3 C등급 컴포넌트 구조 개선 계획

C등급 컴포넌트들을 TagGroup 패턴(A등급)으로 개선하는 구체적 방안:

#### 9.3.1 Button → Yoga 레이아웃 위임

**현재:**
```
PixiButton (Graphics로 직접 그리기)
  └─ 수동 계산: textWidth + paddingX*2 + borderW*2
```

**목표 (CSS-web 구조 미러링):**
```
Button Element (Yoga node, display:flex, align-items:center, justify-content:center)
  ├─ padding: CSS에서 그대로 Yoga에 전달 (stripSelfRenderedProps 제거)
  ├─ border: Yoga borderWidth로 전달
  └─ TextChild (Yoga leaf node + measureFunc)
       └─ text content → measureFunc로 intrinsic size 반환
```

**변경 사항:**
1. `SELF_PADDING_TAGS`에서 Button 제거
2. padding/border를 Yoga에 위임 (strip 중단)
3. Skia 렌더러에서 배경/테두리만 그리기 (패딩은 Yoga가 처리)
4. 텍스트를 Yoga leaf node로 설정 + measureFunc

#### 9.3.2 Badge → inline-flex Yoga 노드

**현재:**
```
PixiBadge (Graphics 직접 그리기)
  └─ 수동: textWidth + paddingX*2 → totalWidth
```

**목표:**
```
Badge Element (Yoga node, display:inline-flex, align-items:center, justify-content:center)
  ├─ min-width: sizePreset.minWidth (Yoga minWidth)
  ├─ padding: sizePreset.paddingX/Y (Yoga padding)
  └─ TextChild (measureFunc)
```

#### 9.3.3 Checkbox / Radio → flex row 자식 분리

**현재:**
```
PixiCheckbox (Graphics 직접 그리기)
  └─ 수동: indicatorBox(x=0) + labelText(x=indicatorSize+gap)
```

**목표:**
```
Checkbox Element (Yoga node, display:flex, flex-direction:row, align-items:center, gap)
  ├─ IndicatorChild (Yoga node, fixed width/height)
  │   └─ checkbox box 그래픽 (Skia)
  └─ LabelChild (Yoga leaf node + measureFunc)
       └─ label text → wrap 시 높이 자동 계산
```

#### 9.3.4 Input/TextField → flex column 자식 분리

**현재:**
```
PixiTextField (Graphics 직접 그리기)
  └─ 수동: label(y=0) + inputBox(y=labelHeight+gap) + error(y=...)
```

**목표:**
```
TextField Element (Yoga node, display:flex, flex-direction:column, gap)
  ├─ LabelChild (Yoga leaf + measureFunc)
  ├─ InputChild (Yoga node, padding, border, background)
  │   └─ PlaceholderText (Yoga leaf)
  └─ ErrorChild (Yoga leaf + measureFunc, conditional)
```

#### 9.3.5 Breadcrumbs → flex row + 자식 분리

**현재:**
```
PixiBreadcrumbs (수동 위치 계산)
  └─ items.forEach((item, i) => { x += itemWidth + separatorWidth })
```

**목표:**
```
Breadcrumbs Element (Yoga node, display:flex, flex-direction:row, align-items:center, gap)
  ├─ BreadcrumbItem (Yoga leaf + measureFunc)
  ├─ Separator (Yoga node, fixed width)
  ├─ BreadcrumbItem (Yoga leaf + measureFunc)
  └─ ...
```

### 9.4 구현 우선순위

| 순위 | 컴포넌트 | 사용 빈도 | 구조 변경 규모 | CSS 일치 영향 |
|------|----------|----------|-------------|-------------|
| **1** | Button, ToggleButton | ★★★★★ | 중 | P1+P2+P3 해결로 대폭 개선 |
| **2** | Card | ★★★★☆ | 중 | 높이 자동 조절 + children 렌더링 |
| **3** | Checkbox, Radio | ★★★★☆ | 중 | label wrap + flex row 정확도 |
| **4** | Badge | ★★★☆☆ | 소 | inline-flex + min-width |
| **5** | Input/TextField, Select | ★★★☆☆ | 대 | flex column + 다중 자식 |
| **6** | Switch, Slider | ★★☆☆☆ | 중 | track+thumb flex 배치 |
| **7** | Breadcrumbs, ProgressBar, Meter | ★★☆☆☆ | 소~중 | flex row/column 정리 |

### 9.5 SELF_PADDING_TAGS 전략 변경

현재 `SELF_PADDING_TAGS`는 padding/border/visual 속성을 strip하여 이중 적용을 방지하는 임시 방편이다.
TagGroup 패턴을 적용하면 이 메커니즘이 불필요해진다.

**`stripSelfRenderedProps()` 실제 strip 대상 (`BuilderCanvas.tsx:662-670`):**

| 그룹 | 속성 |
|------|------|
| **Padding** | `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft` |
| **Border** | `borderWidth`, `borderTopWidth`, `borderRightWidth`, `borderBottomWidth`, `borderLeftWidth` |
| **Visual** | `borderRadius`, `borderColor`, `backgroundColor` |

> **주의:** 문서에서 "padding/border를 strip"이라고 요약되지만, 실제로는 `borderRadius`, `borderColor`, `backgroundColor`도 함께 strip된다. 이는 Skia 렌더러에서 배경색, 테두리 색상, 테두리 반경을 자체 렌더링하기 때문이다.

**마이그레이션 계획:**

```
현재:
  SELF_PADDING_TAGS = [Button, SubmitButton, FancyButton, ToggleButton, ToggleButtonGroup, Card]
  → stripSelfRenderedProps()로 padding/border/visual 속성 제거
  → 컴포넌트가 내부에서 padding/border/borderRadius/backgroundColor를 직접 렌더링

목표:
  SELF_PADDING_TAGS = [] (빈 Set)
  → padding/border를 Yoga에 위임
  → Skia 렌더러에서 배경/테두리만 그리기 (content 영역은 Yoga가 계산)
  → 컴포넌트 내부의 수동 크기 계산 로직 제거
```

**점진적 마이그레이션:**
1. 새 패턴을 Button에 먼저 적용 → 검증
2. 검증 후 Card, ToggleButton 등 순차 적용
3. 모든 컴포넌트 마이그레이션 완료 후 `SELF_PADDING_TAGS` 및 `stripSelfRenderedProps()` 제거

### 9.6 CSS-Web 구조 미러링 체크리스트

모든 컴포넌트를 개선할 때 다음 체크리스트를 적용:

- [ ] **DOM 구조 일치**: CSS-web의 HTML 요소 계층이 Element 트리에 반영되었는가?
- [ ] **display 일치**: CSS-web에서 사용하는 display 값(flex, inline-flex, block)이 Yoga에 전달되는가?
- [ ] **flex 속성 일치**: flex-direction, align-items, justify-content, gap, flex-wrap이 CSS와 동일한가?
- [ ] **padding/border 위임**: Yoga가 padding과 border-width를 알고 있는가? (strip하지 않음)
- [ ] **intrinsic sizing**: 텍스트 콘텐츠가 measureFunc를 통해 Yoga에 크기를 알려주는가?
- [ ] **Spec 토큰 동기화**: CSS 변수 값과 Spec의 sizes/variants 값이 동일한가?
- [ ] **자식 독립성**: 자식 요소가 별도 Yoga 노드로 레이아웃에 참여하는가?
- [ ] **반응성**: 부모 크기 변경 시 자식의 크기와 위치가 CSS와 동일하게 재계산되는가?

---

## 10. 아키텍처 결정 사항

### 10.1 CSS 값 파서를 JS vs WASM 중 어디에 구현할 것인가?

**결정: JS (TypeScript)**

| 기준 | JS | WASM |
|------|-----|------|
| 문자열 파싱 성능 | 충분함 (파싱은 1회) | 마샬링 비용이 파싱 이점 상쇄 |
| 디버깅 | 브라우저 devtools 직접 | source-map 필요 |
| 번들 크기 | 0 (기존 번들에 포함) | +30~50KB |
| 개발 속도 | 빠름 | 느림 (빌드 파이프라인) |

파싱은 요소당 1회이고 결과가 캐싱되므로 JS 성능으로 충분하다.
WASM은 레이아웃 계산(N개 자식 순회)에만 사용하는 현재 방침 유지.

### 10.2 스타일 상속을 트리 순회 vs 캐시 중 어떻게 구현할 것인가?

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

### 10.3 CSS 변수를 어디에 저장할 것인가?

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

## 11. 성능 제약 조건

모든 Phase에서 다음 성능 기준을 유지해야 한다:

| 지표 | 기준 | 측정 방법 |
|------|------|----------|
| Canvas FPS | ≥ 60fps | `GPUDebugOverlay` RAF FPS |
| 레이아웃 계산 (100 요소) | < 5ms | `performance.measure()` |
| 스타일 해석 (단일 요소) | < 0.1ms | `performance.now()` |
| 초기 로드 증가량 | < 20KB gzip | `vite-plugin-inspect` |
| WASM 모듈 증가량 | < 30KB | `wasm-opt -Oz` |

### 11.1 성능 최적화 전략

1. **Lazy Parsing:** `calc()` 파서는 해당 값이 실제 사용될 때만 호출
2. **결과 캐싱:** 동일 CSS 값 문자열 → 동일 결과 (LRU 캐시, 1000개)
3. **Batch Invalidation:** 스타일 변경 시 dirty 마킹 후 RAF에서 일괄 재계산
4. **WASM 임계값 엔진별 유지:** BlockEngine은 `children > 10`, GridEngine은 `items >= 20`에서만 WASM 경로 사용 (벤치마크 기반 조정)

### 11.2 관측 지표 대시보드 (추가)

성능/정합성 지표는 아래 항목을 CI 리포트로 축적한다.

| 지표 | 수집 지점 | 경고 임계값 |
|------|-----------|-------------|
| 레이아웃 평균 시간 | `LayoutEngine` 래퍼 `performance.measure()` | > 5ms |
| 렌더 프레임 드랍율 | `GPUDebugOverlay` FPS 샘플링 | 55fps 미만 3초 지속 |
| CSS 정합성 오차율 | 브라우저 vs 캔버스 좌표 비교 스크립트 | 오차 > ±1px 5% 초과 |
| 번들 증가량 | build report | +20KB(gzip) 초과 |

---

## 12. Non-Goals (명시적 제외)

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

## 13. 테스트 전략


> **테스트 파일 위치:**
> - 레이아웃 엔진 단위 테스트: `apps/builder/src/builder/workspace/canvas/layout/engines/__tests__/`
>   (기존 `BlockEngine.test.ts`, `utils.test.ts`와 동일 디렉토리)
> - Storybook stories: `apps/builder/src/stories/` (신규 생성)
> - CSS 정합성 벤치마크: `apps/builder/src/builder/workspace/canvas/layout/__tests__/`

### 13.1 단위 테스트 (Vitest)

각 Phase의 파서/엔진에 대한 단위 테스트:

```
__tests__/
  cssValueParser.test.ts      // Phase 1: calc, em, border shorthand
  gridAutoPlacement.test.ts   // Phase 2: auto-placement 알고리즘
  cssResolver.test.ts         // Phase 3: 상속, CSS 변수
  blockEnginePhase4.test.ts   // Phase 4: baseline, white-space
```

### 13.2 시각 회귀 테스트

Storybook + Chromatic 기반 스크린샷 비교:

```
stories/
  LayoutCSS.stories.tsx       // CSS 속성별 레이아웃 결과 시각 검증
  GridAdvanced.stories.tsx    // repeat, minmax, auto-placement
  TypographyFlow.stories.tsx  // white-space, word-break
```

### 13.3 CSS 정합성 벤치마크

브라우저 CSS 결과와 캔버스 레이아웃 결과를 자동 비교:

```typescript
// 동일한 DOM 구조를 브라우저 iframe과 캔버스 양쪽에 렌더링
// getBoundingClientRect() 결과와 ComputedLayout 결과를 비교
// 허용 오차: ±1px (서브픽셀 반올림 차이)
```

### 13.4 §8 구조적 회귀 테스트 (필수)

`8.5 10-Case Matrix`는 단순 문서가 아니라 자동 테스트 케이스로 관리한다.

```text
__tests__/
  selfRenderingDivergence.test.ts
    - case1_row_stretch_height
    - case2_row_center_wrap_height
    - case3_row_flex_start_wrap_height
    - case4_column_stretch_fit_content_width
    - case5_column_center_fixed_width_wrap_height
    - case6_column_flex_start_fixed_width_wrap_height
    - case7_row_baseline_alignment
    - case8_block_auto_width_100pct
    - case9_row_reverse_stretch_height
    - case10_grid_cell_adaptive_height
```

각 케이스는 CSS-web 기준 스냅샷(기준값)과 Canvas 결과를 비교해 PASS/FAIL을 기록한다.

### 13.5 롤백 기준 (추가)

아래 조건 중 하나라도 충족하면 해당 Phase 변경을 feature flag 뒤로 이동하거나 롤백한다.

- 캔버스 FPS가 기준(60fps) 미만으로 지속 하락하고 1차 최적화 후에도 복구되지 않는 경우
- 레이아웃 정합성 벤치마크에서 기존 대비 FAIL 케이스가 증가하는 경우
- 핵심 편집 플로우(선택/드래그/리사이즈) 회귀가 발생하는 경우

롤백은 "전체 되돌리기"보다 기능 단위 flag off를 우선 적용한다.

---

## 참조

- [LAYOUT_REQUIREMENTS.md](./LAYOUT_REQUIREMENTS.md) — 하이브리드 레이아웃 엔진 CSS 호환 구현
- [ADR-003: Canvas Rendering](./adr/003-canvas-rendering.md) — PixiJS + Skia 이중 렌더러
- [CSS Display Level 3](https://www.w3.org/TR/css-display-3/) — display, blockification
- [CSS Box Sizing Level 3](https://www.w3.org/TR/css-sizing-3/) — fit-content, min-content, max-content
- [CSS Grid Layout Level 1](https://www.w3.org/TR/css-grid-1/) — Grid 명세
- [CSS Values and Units Level 4](https://www.w3.org/TR/css-values-4/) — calc(), min(), max(), clamp()
- [Yoga Layout](https://yogalayout.dev/) — @pixi/layout 기반 엔진
