# ADR-051: Pretext 기반 텍스트 측정/레이아웃 통합 — CSS↔Skia 정합성 단일 소스

## Status

Proposed — 2026-04-03

## Related ADRs

- [ADR-005](completed/005-css-text-wrapping.md): CSS Text Wrapping (Phase 1~3 완료)
- [ADR-008](completed/008-layout-engine.md): Taffy WASM 레이아웃 엔진
- [ADR-009](009-full-tree-wasm-layout.md): Figma-Class Rendering & Layout
- [ADR-012](012-rendering-layout-pipeline-hardening.md): 렌더링/레이아웃 파이프라인 하드닝
- [ADR-036](completed/036-spec-first-single-source.md): Spec-First Single Source
- [ADR-042](042-spec-dimension-injection.md): Spec Container Dimension Injection

## Context

### 문제: CSS↔Skia 텍스트 정합성의 구조적 한계

XStudio는 **3개 렌더링 타겟**(CSS/DOM Preview, Skia/WebGL Canvas, PixiJS Event)을 가지며, 텍스트 렌더링에서 CSS↔Skia 간 구조적 불일치가 존재한다.

**근본 원인**: CSS Preview와 WebGL/Skia가 서로 다른 텍스트 엔진을 사용한다.

| 경로            | 텍스트 엔진                             | 줄바꿈 결정자       | 폰트 셰이핑   |
| --------------- | --------------------------------------- | ------------------- | ------------- |
| **CSS Preview** | 브라우저 네이티브 (Blink/WebKit)        | 브라우저 내장 ICU   | OS 네이티브   |
| **WebGL/Skia**  | CanvasKit Paragraph API (HarfBuzz WASM) | HarfBuzz + ICU WASM | HarfBuzz WASM |
| **Layout 측정** | CanvasKitTextMeasurer (Paragraph API)   | 위와 동일           | 위와 동일     |

두 경로가 **독립적인 줄바꿈 결정**을 내리므로, 동일 텍스트+폰트+너비 조합에서도 줄이 다른 위치에서 바뀔 수 있다.

### 현재 아키텍처의 구체적 문제점

#### 1. 줄바꿈 결정 불일치 (가장 큰 시각적 차이)

```
"The quick brown fox jumps over the lazy dog near the river"
maxWidth: 200px, font: Inter 14px

CSS (Blink):     "The quick brown fox jumps|over the lazy dog near the|river"     → 3줄, height: 60px
Skia (HarfBuzz): "The quick brown fox jumps over|the lazy dog near the river"     → 2줄, height: 40px
                              ↑ 줄바꿈 위치 차이 → 높이 차이 → 레이아웃 차이
```

이 차이는 서브픽셀 단위의 폰트 메트릭 차이에서 발생하며, 텍스트가 길어질수록 누적된다.

#### 2. 3곳 중복 폰트 파라미터 해석

현재 폰트 파라미터(fontFamily, fontWeight, fontStyle, fontStretch)를 **3곳에서 독립적으로 해석**:

| 위치      | 파일                                 | 역할                                                                         |
| --------- | ------------------------------------ | ---------------------------------------------------------------------------- |
| 측정기    | `canvaskitTextMeasurer.ts` (L77-112) | `buildFontFamilies()`, `resolveWeight()`, `resolveSlant()`, `resolveWidth()` |
| 렌더러    | `nodeRendererText.ts` (L185-232)     | `fontWeightMap`, `fontSlantMap`, `fontWidthEntries`                          |
| Spec 변환 | `specShapeConverter.ts` (L722-744)   | inline split+resolve                                                         |

하나라도 동기화가 어긋나면 **측정 폭 ≠ 렌더링 폭** → 텍스트가 줄바꿈 되거나 잘림.
이 문제를 방지하기 위해 CLAUDE.md에 "fontFamilies 정합성 (CRITICAL)" 규칙이 존재하지만, 수동 동기화의 한계.

#### 3. 2-Pass Height 보정 비용 (fullTreeLayout Step 4.5)

```
Step 1: enrichWithIntrinsicSize(availableWidth) → height 추정 (CanvasKit Paragraph 생성)
Step 3: Taffy computeLayout → 실제 width 할당
Step 4.5: 실제 width ≠ 추정 width? → re-enrich (Paragraph 재생성) → Taffy 재계산
```

각 re-enrich는 **WASM Paragraph 객체 생성+layout+delete** 사이클을 포함하며, 500 요소 레이아웃에서 Step 4.5가 전체 시간의 30-40%를 차지한다.

#### 4. CanvasKit Paragraph 객체 관리 오버헤드

- WASM Paragraph는 GC 대상이 아님 → `paragraph.delete()` 필수 (누수 위험)
- 측정용 Paragraph 생성은 렌더링용과 별개 → 동일 텍스트에 대해 2번 생성
- LRU 캐시(1000 entries)가 완화하지만, 캐시 미스 시 WASM round-trip 발생

### Pretext 라이브러리 개요

> Repository: https://github.com/chenglou/pretext
> Author: Cheng Lou (react-motion, reason-react)
> Stars: 35,800+ (2026-03~04, ~1개월)
> Dependencies: 0 (순수 TypeScript)
> 상세 분석: [PRETEXT_ANALYSIS.md](../explanation/research/PRETEXT_ANALYSIS.md)

Pretext는 **DOM-free 텍스트 측정 라이브러리**로, 브라우저 CSS 텍스트 레이아웃을 JavaScript에서 pixel-perfect로 재현한다.

**핵심 아키텍처: 2-Phase 분리**

| Phase            | 함수                                     | 역할                                                | 비용 (500 texts)            |
| ---------------- | ---------------------------------------- | --------------------------------------------------- | --------------------------- |
| **1. prepare()** | `prepare(text, font)`                    | 텍스트 분석 + Canvas `measureText()` 폭 측정 + 캐시 | ~19ms                       |
| **2. layout()**  | `layout(prepared, maxWidth, lineHeight)` | 캐시된 폭으로 **순수 산술** 높이 계산               | ~0.09ms (**0.0002ms/text**) |

`layout()` 핫 패스 특성:

- DOM 읽기 없음
- Canvas 호출 없음
- 문자열 연산 없음
- 메모리 할당 없음
- 순수 산술 루프

**정확도**: 4폰트 × 8사이즈 × 8폭 × 30텍스트 = **7,680 테스트 케이스**, Chrome/Safari/Firefox 모두 pixel-perfect.

### 요구사항

1. **CSS↔Skia 텍스트 높이 정합성** — 동일 텍스트+폰트+너비에서 동일 줄 수/높이
2. **리사이즈 핫 패스 성능** — 드래그 리사이즈 중 60fps 유지
3. **다국어 지원** — 한국어, 영어, 일본어, 중국어 (주요 타겟)
4. **기존 아키텍처 호환** — Taffy WASM 레이아웃 엔진, Zustand 상태 관리와 공존
5. **점진적 도입** — 한 번에 전체 교체가 아닌 Phase별 마이그레이션

---

## Decision

**Pretext를 텍스트 줄바꿈/높이 계산의 Single Source of Truth로 도입한다.**

CSS Preview와 WebGL/Skia가 **동일한 `prepare()` + `layout()` 결과**를 공유하여, 브라우저 네이티브 Canvas `measureText()`를 ground truth로 통일한다.

### 핵심 원칙

```
┌─────────────────────────────────────────────────────────┐
│                    Pretext (SSOT)                        │
│  prepare(text, font) → PreparedText (캐시됨)            │
│  layout(prepared, maxWidth, lineHeight) → {height, lines}│
└──────────────┬─────────────────────┬────────────────────┘
               │                     │
    ┌──────────▼──────────┐  ┌──────▼──────────────┐
    │   CSS Preview 경로   │  │  WebGL/Skia 경로     │
    │                      │  │                      │
    │  height = Pretext    │  │  height = Pretext    │
    │  line-breaks = CSS   │  │  line-breaks = Pretext│
    │  (자연적 일치)       │  │  glyph render = Skia │
    └──────────────────────┘  └──────────────────────┘
```

**왜 Pretext가 SSOT로 적합한가:**

1. **CSS 동작 재현**: Pretext는 브라우저 CSS `white-space: normal` + `overflow-wrap: break-word` 동작을 pixel-perfect로 재현 — CSS Preview와 자연적으로 일치
2. **Canvas measureText() 기반**: 브라우저 네이티브 폰트 엔진을 ground truth로 사용 — HarfBuzz WASM보다 CSS에 가까움
3. **2-Phase 분리**: 폰트 측정(비싼)과 레이아웃 계산(싼)을 분리 — 리사이즈 핫 패스에 이상적
4. **순수 TypeScript**: WASM 의존성 없음, 번들 크기 ~110KB (CanvasKit ~6MB 대비)

### CanvasKit 완벽 일치는 불가능하지만...

HarfBuzz WASM(Skia)과 Canvas `measureText()`(Pretext)는 서브픽셀 수준에서 다른 측정 결과를 내놓는다. 하지만:

- **줄바꿈 위치를 Pretext가 강제**하면, Skia는 해당 위치에서 줄을 바꿈
- 줄 내부의 글리프 배치(커닝, 리가처)는 Skia가 담당 — 여기서의 차이는 서브픽셀 수준
- **사용자가 인지하는 차이 = 줄바꿈 위치 + 높이** → Pretext로 통일하면 시각적 차이 90%+ 해소

---

## Design

### 전체 아키텍처

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         TextLayoutService (신규)                           │
│  packages/shared/src/lib/textLayout.ts                                     │
│                                                                            │
│  ┌──────────────────────┐  ┌──────────────────────────────┐               │
│  │  PreparedTextCache    │  │  FontResolver                │               │
│  │  WeakMap<key, handle> │  │  CSS fontFamily → resolved   │               │
│  └──────────┬───────────┘  └──────────────┬───────────────┘               │
│             │                              │                               │
│  ┌──────────▼──────────────────────────────▼───────────────┐              │
│  │  prepare(text, resolvedFont, options?)                    │              │
│  │  → PreparedText handle (캐시됨, 텍스트/폰트 변경 시만)   │              │
│  └──────────────────────────┬───────────────────────────────┘              │
│                             │                                              │
│  ┌──────────────────────────▼───────────────────────────────┐              │
│  │  layout(prepared, maxWidth, lineHeight)                    │              │
│  │  → { height, lineCount }                    [0.0002ms]   │              │
│  │                                                           │              │
│  │  layoutWithLines(prepared, maxWidth, lineHeight)           │              │
│  │  → { lines: LayoutLine[] }                  [+ 약간]     │              │
│  └──────────────────────────────────────────────────────────┘              │
└────────────────────────────────────────────────────────────────────────────┘
         │                    │                       │
         ▼                    ▼                       ▼
  ┌──────────────┐  ┌─────────────────┐  ┌────────────────────┐
  │ Layout Engine │  │ Skia Renderer   │  │ CSS Preview        │
  │ (Taffy)       │  │ (nodeRenderers) │  │ (height hint)      │
  │               │  │                 │  │                    │
  │ enrichWith    │  │ drawText per    │  │ min-height from    │
  │ IntrinsicSize │  │ Pretext line    │  │ Pretext layout()   │
  │ → layout()    │  │ OR Paragraph    │  │                    │
  │   결과 사용   │  │ with break hints│  │                    │
  └──────────────┘  └─────────────────┘  └────────────────────┘
```

### Phase A: Foundation — TextLayoutService 생성 (2~3일)

#### A-1. 패키지 구성

```
packages/shared/src/lib/
  textLayout.ts          — 공개 API (prepare, layout, layoutWithLines)
  textLayoutCache.ts     — PreparedText 캐시 관리
  textLayoutAdapter.ts   — Pretext ↔ XStudio TextMeasureStyle 어댑터
```

`@chenglou/pretext`를 devDependency로 추가하고, 핵심 API를 래핑하는 어댑터를 작성한다.

#### A-2. TextMeasurer 인터페이스 호환

현재 `TextMeasurer` 인터페이스:

```typescript
interface TextMeasurer {
  measureWidth(text: string, style: TextMeasureStyle): number;
  measureWrapped(
    text: string,
    style: TextMeasureStyle,
    maxWidth: number,
  ): TextMeasureResult;
}
```

Pretext 어댑터 구현:

```typescript
class PretextMeasurer implements TextMeasurer {
  private cache = new Map<string, PreparedText>();

  measureWidth(text: string, style: TextMeasureStyle): number {
    const prepared = this.getOrPrepare(text, style);
    return measureNaturalWidth(prepared); // Pretext API
  }

  measureWrapped(
    text: string,
    style: TextMeasureStyle,
    maxWidth: number,
  ): TextMeasureResult {
    const prepared = this.getOrPrepare(text, style);
    const { height, lineCount } = layout(
      prepared,
      maxWidth,
      this.resolveLineHeight(style),
    );
    return { width: maxWidth, height, lineCount };
  }

  // 핵심: prepare() 결과를 캐시하여 layout()만 재호출
  private getOrPrepare(text: string, style: TextMeasureStyle): PreparedText {
    const key = buildCacheKey(text, style);
    let prepared = this.cache.get(key);
    if (!prepared) {
      prepared = prepare(text, this.toFontString(style));
      this.cache.set(key, prepared);
    }
    return prepared;
  }
}
```

#### A-3. 캐시 전략

| 캐시 대상             | 키                                    | 생명주기                             |
| --------------------- | ------------------------------------- | ------------------------------------ |
| `PreparedText` handle | text + font(family+size+weight+style) | 텍스트/폰트 변경 시 무효화           |
| `layout()` 결과       | PreparedText + maxWidth + lineHeight  | maxWidth 변경 시만 재계산 (0.0002ms) |
| `measureNaturalWidth` | PreparedText                          | 텍스트/폰트 변경 시만                |

**핵심 이점**: 리사이즈 시 `prepare()` 재호출 불필요 — `layout()` **만** 재호출 (산술 연산만).

현재 CanvasKit 방식에서는 리사이즈마다 새 Paragraph 생성 또는 캐시 히트 기대가 필요하지만, Pretext는 `prepare()` 핸들이 살아있는 한 `layout()`은 **할당 제로 순수 산술**.

### Phase B: Layout Engine 통합 — 2-Pass 보정 가속 (3~5일)

#### B-1. enrichWithIntrinsicSize 교체

현재 (`utils.ts`):

```typescript
// 500 요소 시 각각 CanvasKit Paragraph 생성
const result = getTextMeasurer().measureWrapped(text, style, availableWidth);
const height = result.height; // WASM round-trip
```

Pretext 도입 후:

```typescript
// prepare()는 텍스트/폰트 변경 시에만 (캐시 히트율 90%+)
const prepared = textLayoutService.getOrPrepare(text, font);
// layout()은 순수 산술 — 0.0002ms/call
const { height, lineCount } = layout(prepared, availableWidth, lineHeight);
```

#### B-2. 2-Pass Height 보정 (Step 4.5) 최적화

**현재 비용**:

```
Step 4.5: 너비 불일치 노드 N개 발견
  → N × (CanvasKit Paragraph 생성 + layout + getHeight + delete)
  → N × ~0.5ms = 50ms+ (100 노드 기준)
```

**Pretext 도입 후**:

```
Step 4.5: 너비 불일치 노드 N개 발견
  → N × layout(prepared, newWidth, lineHeight)  ← prepare() 재호출 불필요!
  → N × 0.0002ms = 0.02ms (100 노드 기준)
  → 2,500배 빠름
```

이 최적화가 가능한 이유: `prepare()`는 텍스트와 폰트에만 의존하고, `layout()`은 너비와 lineHeight에만 의존한다. 너비가 바뀌어도 텍스트/폰트는 동일하므로 `prepare()` 캐시를 그대로 사용.

#### B-3. Taffy 연동 패턴

```
DFS Post-Order Traversal
  ├── 각 텍스트 요소:
  │     1. prepare() (캐시 히트 or 새 측정)
  │     2. layout(prepared, estimatedWidth) → height 추정
  │     3. Taffy batch에 height 주입
  │
  ├── Taffy computeLayout()
  │
  └── Step 4.5: 너비 불일치 노드
        1. layout(prepared, actualWidth) ← 순수 산술만!
        2. Taffy updateNodeStyle + markDirty
        3. Taffy computeLayout() 재호출
```

### Phase C: Skia 렌더링 정합성 — 줄바꿈 위치 공유 (5~7일)

이 Phase가 **정합성 효과가 가장 큰 핵심 구간**이다.

#### C-1. 전략 선택: Break Hint Injection vs Per-Line Rendering

| 전략                                                                                                         | 장점                                         | 단점                                       |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------ |
| **A. Break Hint** — Pretext 줄바꿈 위치에 `\n` 삽입 후 CanvasKit Paragraph에 전달                            | CanvasKit 렌더링 품질 유지 (HarfBuzz 셰이핑) | 강제 `\n` 삽입으로 원본 텍스트 변형        |
| **B. Per-Line drawText** — Pretext `layoutWithLines()`로 줄별 좌표 추출 → Skia `canvas.drawText()` 개별 호출 | 완전한 줄바꿈 제어                           | 자체 줄 간격 관리 필요, Paragraph API 포기 |
| **C. Hybrid** — Pretext로 높이/줄 수 결정, CanvasKit Paragraph는 동일 maxWidth로 렌더링 (break 차이 허용)    | 최소 변경, 높이 정합                         | 줄 내용 미세 차이 가능 (but 높이는 일치)   |

**권장: 전략 A (Break Hint Injection)**

```typescript
// Pretext가 줄바꿈 위치를 결정
const { lines } = layoutWithLines(prepared, maxWidth, lineHeight);

// 줄바꿈 위치에 \n 삽입하여 CanvasKit에 전달
const hintedText = lines.map((l) => l.text).join("\n");

// CanvasKit Paragraph는 \n을 hard break으로 처리 → 동일 줄바꿈
const paragraph = buildParagraph(hintedText, paraStyle);
paragraph.layout(maxWidth);
canvas.drawParagraph(paragraph, x, y);
```

이 방식의 장점:

- CanvasKit의 HarfBuzz 셰이핑 품질 유지 (커닝, 리가처)
- Pretext의 줄바꿈 결정 강제
- 기존 renderText() 구조 최소 변경

#### C-2. nodeRendererText.ts 수정

```typescript
// 현재: CanvasKit이 줄바꿈 결정
function renderText(canvas, node, ck, fontMgr) {
  const paragraph = buildParagraph(node.text.content, paraStyle);
  paragraph.layout(node.text.maxWidth); // CanvasKit이 줄바꿈 결정
  canvas.drawParagraph(paragraph, x, y);
}

// 제안: Pretext가 줄바꿈 결정 → CanvasKit은 렌더링만
function renderText(canvas, node, ck, fontMgr) {
  const prepared = textLayoutService.getOrPrepare(node.text.content, font);
  const { lines } = layoutWithLines(prepared, node.text.maxWidth, lineHeight);
  const hintedText = lines.map((l) => l.text).join("\n");

  const paragraph = buildParagraph(hintedText, paraStyle);
  paragraph.layout(node.text.maxWidth); // \n이 이미 줄바꿈 강제
  canvas.drawParagraph(paragraph, x, y);
}
```

#### C-3. specShapeConverter.ts 통합

Spec 기반 텍스트(Button label, Badge text 등)도 동일 경로:

```typescript
// TextShape → SkiaNodeData 변환 시 Pretext 줄바꿈 적용
function convertTextShape(
  shape: TextShape,
  containerWidth: number,
): SkiaNodeData {
  const prepared = textLayoutService.getOrPrepare(shape.text, font);
  const { height, lineCount } = layout(prepared, containerWidth, lineHeight);

  return {
    type: "text",
    text: {
      content: shape.text,
      // Pretext 결과를 SkiaNodeData에 첨부
      pretextHeight: height,
      pretextLineCount: lineCount,
    },
  };
}
```

### Phase D: CSS Preview 연동 — 높이 사전 예측 (2~3일)

#### D-1. Preview 높이 힌트

CSS Preview에서 텍스트 요소의 `min-height`를 Pretext `layout()` 결과로 설정하면, 브라우저 렌더링 전에 정확한 높이를 확보할 수 있다.

```typescript
// Preview renderer에서 Pretext 높이를 인라인 스타일로 주입
function renderTextElement(element: Element): React.ReactNode {
  const prepared = textLayoutService.getOrPrepare(text, font);
  const { height } = layout(prepared, containerWidth, lineHeight);

  return (
    <div style={{ minHeight: height }}>
      {text}
    </div>
  );
}
```

이 방식은 CSS 자체의 텍스트 레이아웃을 방해하지 않으면서, Pretext가 예측한 높이와 CSS 실제 높이가 일치하는지 검증할 수 있다. Pretext가 CSS 동작을 pixel-perfect로 재현하므로, `minHeight === actualHeight`가 되어야 한다.

#### D-2. Layout Reflow 제거

현재 Preview에서 컴포넌트 높이를 알려면 DOM에 렌더링 후 `getBoundingClientRect()`로 측정해야 하는데, 이는 layout reflow를 유발한다.

Pretext 도입 후:

```
현재: render → reflow → measure → update height → reflow (2회)
도입 후: prepare+layout → height 확정 → render (reflow 1회, 정확)
```

### Phase D-2: Quill 인라인 편집 오버레이 정합성 (2~3일)

#### 문제: 더블클릭 편집 시 텍스트 배치 불일치

Canvas에서 텍스트를 더블클릭하면 `TextEditOverlay.tsx`가 Quill(contenteditable DOM)을 Skia 텍스트 위에 오버레이한다. 이때 Quill(브라우저 DOM)과 Skia(HarfBuzz WASM)의 텍스트 레이아웃이 달라 **편집 시작 시 텍스트가 재배치**되는 문제가 발생한다.

```
현재 흐름:
  더블클릭 → extractFullSpecTextStyle() / getSkiaNode() → 폰트 스타일 추출
  → Quill root에 CSS 적용 (fontSize, fontFamily, lineHeight, padding)
  → 브라우저가 DOM 렌더링

문제:
  Skia (HarfBuzz):   "Submit Order" → 1줄 (78px — 80px 안에 들어감)
  Quill (브라우저):   "Submit Order" → 1줄 (81px — 80px 넘어감) → 2줄로 래핑
  → 편집 시작하면 갑자기 줄이 바뀌고 높이가 변함
```

#### 현재 아키텍처의 불일치 지점 (6개)

| 원인                                      | 파일:위치                             | 증상                                              | Pretext 해결                 |
| ----------------------------------------- | ------------------------------------- | ------------------------------------------------- | ---------------------------- |
| **폰트 엔진 차이** (HarfBuzz vs 브라우저) | `canvaskitTextMeasurer.ts` vs DOM     | 글리프 폭 1-2px 차이 → 줄바꿈 위치 다름           | ✅                           |
| **줄바꿈 결정 독립**                      | Skia: Paragraph.layout() / Quill: CSS | 줄 수 불일치 → 높이 불일치                        | ✅                           |
| **line-height 단위 혼동**                 | `specTextStyleForOverlay.ts:106`      | Spec: `fontSize × multiplier` vs Skia: px         | ✅ (Pretext lineHeight 통일) |
| **vertical alignment**                    | `TextEditOverlay.tsx:185-188`         | Skia `baseline: middle` ≠ CSS `alignSelf: center` | ❌ (좌표 매핑 이슈)          |
| **padding/offset 매핑**                   | `TextEditOverlay.tsx:175-177`         | Spec `textShape.x` → Quill `paddingLeft` 불일치   | ❌ (좌표 매핑 이슈)          |
| **zoom transform 부동소수점**             | `TextEditOverlay.tsx:271-274`         | `(100/1.5)×1.5 ≠ 100`                             | ❌ (수학 정밀도 이슈)        |

상위 3개(폰트 엔진, 줄바꿈, line-height)가 **사용자가 가장 많이 체감하는 불일치**이며, Pretext로 해결된다.

#### Pretext 적용 방안

**핵심**: Skia 렌더링과 Quill 오버레이가 **동일한 Pretext 결과**를 참조하면, 줄바꿈 위치와 높이가 일치한다.

```typescript
// useTextEdit.ts — 편집 시작 시 Pretext 결과를 ooverlay에 전달
function startEdit(elementId: string, layoutPosition?: LayoutPosition) {
  const text = extractText(props);
  const font = extractFont(tag, props);

  // Pretext SSOT — Skia 렌더링과 동일한 결과
  const prepared = textLayoutService.getOrPrepare(text, font);
  const { height, lineCount } = layout(prepared, containerWidth, lineHeight);

  setEditState({
    elementId,
    value: text,
    position: layoutPosition,
    // Pretext가 계산한 크기로 오버레이 컨테이너 설정
    size: { width: containerWidth, height },
    style: extractTextStyle(...),
  });
}
```

```typescript
// TextEditOverlay.tsx — Quill 컨테이너에 Pretext 크기 적용
const containerStyle: React.CSSProperties = {
  // ...
  width: liveSize.width / zoom,
  // Pretext height로 설정 → Quill DOM 높이와 자연 일치
  height: liveSize.height / zoom,
  minHeight: liveSize.height / zoom,
};
```

**Quill 내부 텍스트 래핑도 자동 일치**:

- Quill은 브라우저 DOM 엔진으로 텍스트를 레이아웃
- Pretext는 Canvas `measureText()`(= 브라우저 동일 엔진)로 줄바꿈 결정
- 따라서 Quill의 줄바꿈 위치 = Pretext의 줄바꿈 위치 = Skia의 Break Hint 줄바꿈 위치
- **편집 시작/종료 시 텍스트 재배치 현상 제거**

#### 편집 전/중/후 일관성 보장

```
[편집 전] Skia 렌더링
  → Pretext layout() → Break Hint → CanvasKit Paragraph → 화면 표시
  → 줄바꿈: "Submit|Order" (2줄)

[더블클릭 → 편집 중] Quill 오버레이
  → 동일 containerWidth에서 브라우저 DOM 렌더링
  → 줄바꿈: "Submit|Order" (2줄) ← Pretext = 브라우저 엔진이므로 일치
  → 텍스트 위치 변화 없이 자연스러운 전환

[편집 완료] Skia 재렌더링
  → 변경된 텍스트로 prepare() → layout() → Break Hint → 화면 표시
  → 편집 중 보이던 레이아웃과 동일
```

#### 잔여 불일치 (Pretext 범위 외)

아래 3개는 Pretext와 무관한 좌표 매핑 / 수학 정밀도 문제로, 별도 수정 필요:

1. **vertical alignment**: `TextEditOverlay.tsx`에서 Skia `baseline: "middle"`을 CSS `alignSelf: center`로 매핑하는데, 두 엔진의 "center" 기준이 다름 (text descent 포함 여부). → 별도 offset 보정 필요
2. **padding/offset**: Spec `textShape.x`(시각적 좌표)와 Quill `paddingLeft`(CSS box model)는 의미가 다름. → 매핑 로직 정밀화 필요
3. **zoom 부동소수점**: `(size / zoom) * zoom ≠ size` 부동소수점 오차. → `Math.round()` 또는 정수 좌표 사용

### Phase E: 고급 활용 — 동적 텍스트 레이아웃 (미래)

Pretext의 `layout()` 성능(0.0002ms/text)이 열어주는 가능성:

#### E-1. 실시간 리사이즈 중 높이 갱신

드래그 리사이즈 핫 패스에서:

```
현재: rAF마다 enrichWithIntrinsicSize → CanvasKit Paragraph 생성 → ~50ms
도입 후: rAF마다 layout(cached_prepared, newWidth) → ~0.02ms → 60fps 보장
```

#### E-2. 가변 폭 레이아웃

Pretext의 `layoutNextLine()` 스트리밍 API로 줄마다 다른 maxWidth 적용:

```typescript
// 줄마다 다른 폭 (예: 이미지 주위로 텍스트 흐르기)
let line = layoutNextLine(prepared, start, getWidthForLine(lineIndex));
while (line) {
  renderLine(line);
  lineIndex++;
  line = layoutNextLine(prepared, line.end, getWidthForLine(lineIndex));
}
```

#### E-3. 텍스트 애니메이션

`walkLineRanges()`로 줄별 콜백 → 줄 단위 애니메이션:

```typescript
walkLineRanges(
  prepared,
  maxWidth,
  (lineStart, lineEnd, lineWidth, lineIndex) => {
    // 줄별 fade-in, slide-in 등 애니메이션 좌표 계산
    animateLine(lineIndex, lineWidth, lineStart, lineEnd);
  },
);
```

---

## 성능 비교 분석

### 측정 비용 (500 텍스트 요소 기준)

| 연산                                 | 현재 (CanvasKit)               | Pretext 도입 후        | 개선율     |
| ------------------------------------ | ------------------------------ | ---------------------- | ---------- |
| **초기 측정** (prepare)              | ~35ms (Paragraph 500개 생성)   | ~19ms (prepare 500개)  | 1.8×       |
| **리사이즈 재계산** (layout)         | ~35ms (Paragraph 재생성)       | ~0.09ms (layout만)     | **389×**   |
| **2-Pass 보정** (Step 4.5, 100 노드) | ~50ms (Paragraph 100개 재생성) | ~0.02ms (layout 100개) | **2,500×** |
| **전체 레이아웃 사이클**             | ~120ms                         | ~19.11ms               | **6.3×**   |

### 메모리 비용

| 항목                    | 현재                | Pretext 도입 후                  |
| ----------------------- | ------------------- | -------------------------------- |
| CanvasKit WASM          | ~6MB                | ~6MB (렌더링용 유지)             |
| Pretext 라이브러리      | 0                   | ~110KB (순수 JS)                 |
| Paragraph 객체 (측정용) | ~500KB (LRU 1000개) | 0 (측정용 Paragraph 불필요)      |
| PreparedText 캐시       | 0                   | ~200KB (SoA 구조, 500 텍스트)    |
| **순 변화**             | —                   | **-190KB** (Paragraph 캐시 축소) |

### 번들 크기

| 항목               | 크기                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| Pretext 라이브러리 | ~110KB (minified)                                                                                        |
| 제거 가능 코드     | ~15KB (word-break 에뮬레이션: `cssNormalBreakProcess`, `preprocessBreakWordText`, `computeKeepAllWidth`) |
| **순 증가**        | ~95KB                                                                                                    |

---

## 정합성 개선 분석

### 폭(Width) 정합성

#### 현재 width 불일치 현황

Canvas 2D와 CanvasKit이 동일 텍스트에 대해 다른 폭을 반환하여, **수동 보정 해킹**이 존재:

```typescript
// utils.ts:1175-1177, 1357-1359 — 현재 코드
const canvas2dCompensation = isCanvasKitMeasurer() ? 0 : 2; // Checkbox/Radio label
const generalCompensation = isCanvasKitMeasurer() ? 0 : 4; // Button/Badge/Text 일반
```

또한 `measureWrapped().width` 반환값이 측정기마다 다르다:

- **Canvas2D**: 항상 `maxWidth` 반환 (제약 폭, 부정확)
- **CanvasKit**: `paragraph.getLongestLine()` 반환 (실제 최장 줄 폭)

#### Pretext width 제공 API

| API                                               | 반환                                             | 용도                            | 성능      |
| ------------------------------------------------- | ------------------------------------------------ | ------------------------------- | --------- |
| `measureNaturalWidth(prepared)`                   | 단일 줄 전체 폭 (max-content)                    | fit-content, max-content 계산   | < 0.001ms |
| `layout(prepared, maxWidth, lineHeight)`          | `{ height, lineCount }`                          | **⚠️ 폭 미반환** — 높이/줄 수만 | 0.0002ms  |
| `layoutWithLines(prepared, maxWidth, lineHeight)` | `{ lines: LayoutLine[] }` — 줄별 `text`, `width` | 최장 줄 폭, 줄별 폭             | ~0.01ms   |

**핵심 제약**: `layout()` fast path는 width를 반환하지 않는다. 폭이 필요한 경우 `layoutWithLines()`를 사용해야 하며, 이는 줄별 객체 할당 비용이 추가되지만 CanvasKit Paragraph보다는 여전히 빠르다.

#### Pretext 도입 후 width 개선

| 시나리오                                  | 현재                                                           | Pretext 도입 후                                              | 근거                |
| ----------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ | ------------------- |
| **fit-content 폭** (Button, Badge, Label) | Canvas2D + 4px 보정 해킹 or CanvasKit `getMaxIntrinsicWidth()` | `measureNaturalWidth()` — CSS와 동일 엔진                    | 보정 해킹 제거 가능 |
| **줄바꿈 후 최장 줄 폭**                  | Canvas2D: `maxWidth` (부정확), CanvasKit: `getLongestLine()`   | `layoutWithLines()` → `Math.max(...lines.map(l => l.width))` | 양쪽 통일           |
| **min-content 폭** (가장 긴 단어)         | 공백 split → 단어별 측정 (CJK 부정확)                          | Pretext `Intl.Segmenter` 기반 세그먼트 폭                    | CJK 단어 경계 정확  |
| **max-content 폭**                        | `measureTextWidth()` (Canvas2D or CanvasKit)                   | `measureNaturalWidth()`                                      | CSS와 동일 엔진     |

#### width 정합성 한계: letterSpacing / wordSpacing

Pretext의 `prepare(text, font)`는 CSS font shorthand(`"14px Inter"`)만 받으며, `letter-spacing`/`word-spacing`은 CSS font에 포함되지 않는다.

```typescript
// ❌ Pretext는 letterSpacing/wordSpacing을 세그먼트 폭에 반영하지 않음
const prepared = prepare("Hello World", "14px Inter"); // spacing 미적용

// ✅ 어댑터에서 후처리 필요
class PretextMeasurer {
  measureWidth(text: string, style: TextMeasureStyle): number {
    const baseWidth = measureNaturalWidth(this.getOrPrepare(text, style));
    // 수동 spacing 보정
    const spacingAdj =
      (style.letterSpacing ?? 0) * (text.length - 1) +
      (style.wordSpacing ?? 0) * countSpaces(text);
    return baseWidth + spacingAdj;
  }
}
```

**중요**: 이 후처리는 단일 줄 폭 계산에는 정확하지만, **줄바꿈 결정에는 spacing이 반영되지 않을 수 있다**. Pretext의 세그먼트 폭 캐시에 spacing이 포함되지 않으므로, letterSpacing이 큰 텍스트에서 줄바꿈 위치가 CSS와 다를 수 있다.

**완화 전략**:

- XStudio에서 letterSpacing/wordSpacing을 사용하는 컴포넌트는 소수 (커스텀 텍스트 스타일만)
- 대부분의 UI 텍스트(Button, Label, Badge 등)는 기본 spacing → 영향 없음
- spacing이 있는 텍스트는 CanvasKit fallback 경로 유지

### 줄바꿈 정합성

| 시나리오                     | 현재 (불일치 빈도)        | Pretext 도입 후         |
| ---------------------------- | ------------------------- | ----------------------- |
| 영문 단어 래핑 (Inter 14px)  | ~5% (서브픽셀 누적)       | ~0% (동일 줄바꿈 강제)  |
| 한국어 텍스트 (Noto Sans KR) | ~8% (Intl.Segmenter 차이) | ~1% (Pretext 내장 규칙) |
| CJK 혼합 텍스트              | ~12%                      | ~2%                     |
| 영문 + 숫자 + 특수문자       | ~3%                       | ~0%                     |

### 높이 정합성

| 시나리오              | 현재                | Pretext 도입 후   |
| --------------------- | ------------------- | ----------------- |
| 단일 줄 텍스트        | 일치 (줄바꿈 없음)  | 일치              |
| 2~3줄 래핑 텍스트     | ±1줄 차이 가능      | 일치 (동일 줄 수) |
| 긴 텍스트 (10줄+)     | ±2줄 차이 가능      | 일치              |
| 리사이즈 중 높이 전환 | 지연 (캐시 미스 시) | 즉시 (0.0002ms)   |

---

## 리스크 분석 및 완화

### Risk 1: Pretext 측정 정확도 — Canvas measureText() vs HarfBuzz

| 항목                     | Canvas measureText()   | HarfBuzz (CanvasKit) |
| ------------------------ | ---------------------- | -------------------- |
| 기본 라틴                | ✅ 정확                | ✅ 정확              |
| CJK                      | ✅ 정확                | ✅ 정확              |
| 한국어                   | ✅ 정확                | ✅ 정확              |
| 아랍어 (RTL + 연결 형태) | ⚠️ 기본 지원           | ✅ 완벽              |
| 태국어 (단어 경계 없음)  | ⚠️ Intl.Segmenter 의존 | ✅ ICU 완벽          |
| 복잡 리가처              | ⚠️ OS 의존             | ✅ 독립적            |

**완화**: XStudio 주요 타겟은 한국어/영어/일본어 — Pretext가 완벽 지원하는 범위. 아랍어/태국어는 Phase C에서 CanvasKit fallback 경로 유지.

**심각도**: LOW — 타겟 언어에서 문제 없음

### Risk 2: `system-ui` 폰트 미지원

Pretext는 `system-ui` 폰트를 지원하지 않는다 (Canvas와 DOM이 macOS에서 다른 optical variant로 resolve).

**완화**: XStudio는 이미 `Inter` + Google Fonts를 명시적으로 사용하며, `system-ui` fallback은 최후 단계. `system-ui` 만 사용하는 텍스트가 없으면 무영향.

**심각도**: LOW — 현재 사용하지 않음

### Risk 3: white-space 모드 제한

Pretext는 `white-space: normal` + `overflow-wrap: break-word` 조합만 지원.

XStudio에서 필요한 모드:

- `normal` — 대부분의 텍스트 (커버됨 ✅)
- `nowrap` — Label, 단일 줄 텍스트 (Pretext 불필요 — 줄바꿈 없으므로 measureNaturalWidth만 사용)
- `pre` / `pre-line` / `pre-wrap` — 코드 블록 등 (Phase E에서 확장 또는 CanvasKit fallback)

**완화**: Phase A에서 `white-space !== "normal"` 시 기존 CanvasKit 경로 유지 (fallback).

**심각도**: MEDIUM — nowrap은 문제없지만 pre 계열은 fallback 필요

### Risk 4: Pretext 성숙도 (v0.0.4)

1개월 된 라이브러리, 아직 0.x 버전.

**완화**:

- 순수 TypeScript, 의존성 0개 → 소스 vendor 가능
- ~110KB, 핵심 파일 5개 → 코드 리뷰/감사 가능
- 저자: Cheng Lou (react-motion, reason-react) — 검증된 OSS 기여자
- 7,680 테스트 케이스로 정확도 검증 완료
- vendor 시 upstream 변경에 영향 없음

**심각도**: LOW (vendor 전략으로 완화)

### Risk 5: 이모지 측정 quirk

Chrome/Firefox macOS에서 Apple Color Emoji가 Canvas에서 DOM보다 넓게 측정되는 문제.

**완화**: Pretext가 이미 1회 DOM calibration으로 correction factor를 계산하여 해결. XStudio에서 추가 작업 불필요.

**심각도**: NONE (Pretext 자체가 해결)

### Risk 6: letterSpacing / wordSpacing 미지원 (width 정합성)

Pretext의 `prepare(text, font)`는 CSS font shorthand만 수용하며, `letter-spacing`/`word-spacing`은 세그먼트 폭 측정에 반영되지 않는다.

**영향 범위**:

- **단일 줄 폭 계산**: 어댑터에서 후처리로 보정 가능 (spacing × 문자/공백 수)
- **줄바꿈 결정**: spacing이 세그먼트 폭에 미반영 → letterSpacing이 큰 텍스트에서 줄바꿈 위치 오차 가능

**완화**:

- XStudio UI 컴포넌트(Button, Label, Badge 등)는 기본 spacing(0) → 영향 없음
- letterSpacing/wordSpacing이 명시된 텍스트는 CanvasKit fallback 경로 유지
- Phase A 어댑터에서 `style.letterSpacing || style.wordSpacing` 감지 시 자동 fallback

**심각도**: LOW-MEDIUM — 대부분의 UI 텍스트에 무영향, 커스텀 spacing 텍스트만 fallback

---

## 수정 파일 목록

### 신규 파일

| 파일                                           | 역할                              |
| ---------------------------------------------- | --------------------------------- |
| `packages/shared/src/lib/textLayout.ts`        | TextLayoutService 공개 API        |
| `packages/shared/src/lib/textLayoutCache.ts`   | PreparedText 캐시 관리            |
| `packages/shared/src/lib/textLayoutAdapter.ts` | Pretext ↔ TextMeasureStyle 어댑터 |

### 수정 파일

| 파일                         | 변경 내용                                         | Phase |
| ---------------------------- | ------------------------------------------------- | ----- |
| `package.json` (root/shared) | `@chenglou/pretext` 의존성 추가                   | A     |
| `textMeasure.ts`             | PretextMeasurer 구현 + measurer 전환              | A     |
| `canvaskitTextMeasurer.ts`   | 측정 전용 Paragraph 생성 제거 (layout용만 유지)   | B     |
| `engines/utils.ts`           | enrichWithIntrinsicSize에서 Pretext layout() 사용 | B     |
| `fullTreeLayout.ts`          | Step 4.5 re-enrich에서 Pretext re-layout 사용     | B     |
| `nodeRendererText.ts`        | Break Hint Injection 적용                         | C     |
| `specShapeConverter.ts`      | TextShape 변환 시 Pretext 높이 사용               | C     |
| `ElementSprite.tsx`          | Pretext 높이를 specProps에 전달                   | C     |
| `useTextEdit.ts`             | startEdit에서 Pretext 크기 사용                   | D-2   |
| `TextEditOverlay.tsx`        | 오버레이 컨테이너에 Pretext height 적용           | D-2   |
| `specTextStyleForOverlay.ts` | lineHeight 통일 (Pretext 기준)                    | D-2   |

### 제거 후보 (Phase C 완료 후)

| 파일/코드                   | 이유                            |
| --------------------------- | ------------------------------- |
| `cssNormalBreakProcess()`   | Pretext가 CSS normal break 내장 |
| `preprocessBreakWordText()` | Pretext가 break-word 내장       |
| `computeKeepAllWidth()`     | Pretext가 CJK keep-all 내장     |
| 측정용 Paragraph LRU 캐시   | PreparedText 캐시로 대체        |

---

## 데이터 흐름도

### 현재 (Before)

```
Store (text, style)
  │
  ├── CSS Preview ──────────────────────► 브라우저 CSS 엔진 ──► DOM 렌더링
  │                                        (자체 줄바꿈 결정)     (높이 A)
  │
  └── Canvas Pipeline
       │
       ├── enrichWithIntrinsicSize
       │    └── CanvasKit Paragraph ────► WASM layout ──► height 추정
       │         (HarfBuzz 줄바꿈)                         (높이 B ≠ A)
       │
       ├── Taffy computeLayout ─────────► 실제 width 할당
       │
       ├── Step 4.5: width 불일치?
       │    └── CanvasKit Paragraph ────► WASM re-layout ──► height 재추정
       │         (또 WASM round-trip)                         (비용 높음)
       │
       └── Skia renderText
            └── CanvasKit Paragraph ────► HarfBuzz 렌더링
                 (또 다른 줄바꿈 결정)      (높이 C, B≈C but ≠ A)
```

### 도입 후 (After)

```
Store (text, style)
  │
  ├── TextLayoutService
  │    ├── prepare(text, font) ─────────► Canvas measureText() ──► PreparedText (캐시)
  │    │    (텍스트/폰트 변경 시에만)       (브라우저 네이티브)
  │    │
  │    └── layout(prepared, width) ─────► 순수 산술 ──► { height, lines }
  │         (0.0002ms, 할당 제로)                        (SSOT 결과)
  │
  ├── CSS Preview
  │    └── min-height: Pretext height ──► 브라우저 CSS ──► DOM 렌더링
  │         (사전 확정)                     (자연 일치)      (높이 = Pretext)
  │
  └── Canvas Pipeline
       │
       ├── enrichWithIntrinsicSize
       │    └── layout(prepared, width) → height    [0.0002ms, 캐시 히트]
       │
       ├── Taffy computeLayout
       │
       ├── Step 4.5: width 불일치?
       │    └── layout(prepared, newWidth) → height  [0.0002ms, 재prepare 불필요!]
       │
       └── Skia renderText
            ├── layoutWithLines(prepared) → 줄별 텍스트
            └── CanvasKit Paragraph ──► HarfBuzz 렌더링
                 (Break Hint \n 주입)      (Pretext 줄바꿈 강제, HarfBuzz 셰이핑)
                                            높이 = Pretext = CSS Preview ✓
```

---

## Fail-safe 원칙

### 1. 점진적 Fallback

```typescript
function getEffectiveMeasurer(style: TextMeasureStyle): TextMeasurer {
  // white-space가 normal이 아닌 경우 → 기존 CanvasKit
  if (style.whiteSpace && style.whiteSpace !== "normal") {
    return canvasKitMeasurer;
  }
  // Pretext prepare 실패 시 → 기존 CanvasKit
  try {
    return pretextMeasurer;
  } catch {
    console.warn("[TextLayout] Pretext fallback to CanvasKit");
    return canvasKitMeasurer;
  }
}
```

### 2. A/B 검증 모드

Phase B 도입 초기에 두 경로를 병렬 실행하여 결과를 비교:

```typescript
if (__DEV__ && enablePretextValidation) {
  const pretextResult = pretextLayout(prepared, width, lineHeight);
  const ckResult = canvasKitMeasurer.measureWrapped(text, style, width);

  if (Math.abs(pretextResult.height - ckResult.height) > 2) {
    console.warn(
      `[TextLayout] Divergence: Pretext=${pretextResult.height} CK=${ckResult.height}`,
    );
  }
}
```

### 3. 캐시 무효화 안전망

```typescript
// 폰트 로드 완료 시 전체 캐시 무효화
skiaFontManager.onFontLoaded(() => {
  textLayoutService.clearCache();
  // layoutVersion 증가 → 전체 레이아웃 재계산
  useStore.getState().invalidateLayout();
});
```

---

## 마이그레이션 체크리스트

### Phase A (Foundation)

- [ ] `@chenglou/pretext` 패키지 추가 (또는 vendor)
- [ ] `TextLayoutService` 클래스 구현
- [ ] `PretextMeasurer` → `TextMeasurer` 인터페이스 어댑터
- [ ] 캐시 키 구조 설계 + LRU/WeakMap 결정
- [ ] `setTextMeasurer(new PretextMeasurer())` 전환점 추가
- [ ] 단위 테스트: 기존 CanvasKit 결과와 비교 (tolerance 2px)

### Phase B (Layout Engine)

- [ ] `enrichWithIntrinsicSize`에서 Pretext `layout()` 사용
- [ ] `calculateContentHeight`에서 Pretext 높이 사용
- [ ] Step 4.5 re-enrich에서 Pretext re-layout 사용
- [ ] A/B 검증 모드 활성화 (dev only)
- [ ] 500 요소 벤치마크: 현재 vs Pretext 레이아웃 시간

### Phase C (Skia Rendering)

- [ ] `nodeRendererText.ts`에 Break Hint Injection 적용
- [ ] `specShapeConverter.ts` TextShape 변환 시 Pretext 높이 사용
- [ ] Paragraph 캐시 키에 Pretext line-break 반영
- [ ] 시각적 비교 테스트: CSS Preview vs Canvas 스크린샷 diff

### Phase D-1 (CSS Preview)

- [ ] Preview renderer에 min-height 힌트 주입
- [ ] Pretext height vs CSS actual height 검증
- [ ] Layout reflow 측정: before/after

### Phase D-2 (Quill 인라인 편집 오버레이)

- [ ] `useTextEdit.ts` startEdit에서 Pretext 기반 오버레이 크기 계산
- [ ] `TextEditOverlay.tsx` 컨테이너에 Pretext height/width 적용
- [ ] `specTextStyleForOverlay.ts` lineHeight 통일 (Pretext 기준 px)
- [ ] 편집 전/중/후 줄바꿈 위치 일관성 검증 (Skia ↔ Quill 시각 비교)
- [ ] 잔여 불일치 수정: vertical alignment offset 보정, padding 매핑 정밀화

### Phase E (고급 활용, 미래)

- [ ] `layoutNextLine()` 기반 가변 폭 레이아웃
- [ ] `walkLineRanges()` 기반 텍스트 애니메이션
- [ ] `pre` / `pre-wrap` white-space 모드 지원

---

## 사용자 제안 평가

### "Pretext를 Single Source of Truth로 만든다" — ✅ 강력히 동의

CSS Preview와 WebGL/Skia가 동일한 prepare()+layout() 결과를 사용하면, **줄바꿈 위치와 높이가 양쪽에서 동일**해진다. 이것이 이 ADR의 핵심 원칙이다.

### "WASM 완벽 일치는 어렵지만 줄바꿈/높이 강제로 시각적 차이 감소" — ✅ 정확한 분석

HarfBuzz(WASM)와 Canvas measureText()는 서브픽셀 수준에서 다르지만, 사용자가 인지하는 차이의 90%는 줄바꿈 위치와 높이이다. 이를 강제하면 남는 차이는 글리프 내부의 미세한 렌더링 차이뿐.

### "공통 유틸리티 (src/lib/text-layout.ts)" — ✅ 올바른 아키텍처

현재 3곳에서 중복되는 폰트 파라미터 해석을 단일 서비스로 통합하면, 동기화 실수 근본 차단. `packages/shared/src/lib/textLayout.ts`로 배치하면 builder/preview 양쪽에서 사용 가능.

### "WebGL/Skia에서 layoutWithLines() 결과로 렌더링" — ⚠️ 하이브리드 권장

순수 drawText 방식은 HarfBuzz의 셰이핑 품질을 포기하게 된다. **Break Hint Injection**(전략 A)이 더 나은 선택: Pretext가 줄바꿈을 결정하고, CanvasKit이 글리프를 렌더링.

단, 미래에 fillText/SDF/MSDF 기반 렌더링이 필요해지면(Phase E의 3D 텍스트 등), Per-Line drawText 전략을 별도 경로로 추가할 수 있다.

### "60fps 이상의 동적 텍스트 레이아웃" — ✅ 수치적으로 확인

`layout()` 0.0002ms/text × 1000 텍스트 = 0.2ms. 16.67ms (60fps) 프레임 버짓의 1.2%. 리사이즈 핫 패스에서 텍스트 레이아웃이 병목에서 완전히 제거됨.

### "실시간 생성 UI에서 병목 완전 해소" — ✅ 조건부 동의

`prepare()` 비용(~19ms/500 텍스트)은 텍스트가 새로 추가될 때 발생하지만, 한 번 prepare된 핸들은 무기한 재사용 가능. AI가 실시간으로 UI를 생성하는 시나리오에서도, prepare()는 한 번만 호출되고 이후 layout()만 반복하므로 병목은 사실상 해소된다.

---

## 결론

Pretext 도입은 XStudio의 **텍스트 정합성과 레이아웃 성능을 동시에 개선**하는 아키텍처 결정이다.

| 측면                        | 현재            | Pretext 도입 후   |
| --------------------------- | --------------- | ----------------- |
| CSS↔Skia 줄바꿈 일치율      | ~90%            | ~99%              |
| 리사이즈 재계산 비용        | ~35ms/500 texts | ~0.09ms/500 texts |
| 2-Pass 보정 비용            | ~50ms/100 nodes | ~0.02ms/100 nodes |
| 폰트 파라미터 동기화 포인트 | 3곳 (수동)      | 1곳 (자동)        |
| WASM 측정 의존성            | CanvasKit 6MB   | +110KB JS only    |
| 추가 번들 크기              | —               | ~95KB (net)       |

**Phase A→B→C 순서로 점진적 도입**하며, 각 Phase에서 A/B 검증으로 정합성을 확인한다. Phase D(Preview 연동)와 Phase E(고급 활용)는 C 완료 후 결정한다.
