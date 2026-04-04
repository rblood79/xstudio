# ADR-051: Pretext 기반 텍스트 측정/레이아웃 통합 — CSS↔Skia 정합성 단일 소스

## Status

Proposed — 2026-04-03 (v3: 기본값 normal 유지 + 선택적 SSOT 전략)

## Related ADRs

- [ADR-005](completed/005-css-text-wrapping.md): CSS Text Wrapping (Phase 1~3 완료)
- [ADR-008](completed/008-layout-engine.md): Taffy WASM 레이아웃 엔진
- [ADR-009](009-full-tree-wasm-layout.md): Figma-Class Rendering & Layout
- [ADR-012](012-rendering-layout-pipeline-hardening.md): 렌더링/레이아웃 파이프라인 하드닝
- [ADR-036](completed/036-spec-first-single-source.md): Spec-First Single Source
- [ADR-042](042-spec-dimension-injection.md): Spec Container Dimension Injection

---

## Context

### 문제: CSS↔Skia 텍스트 정합성의 구조적 한계

XStudio는 **3개 렌더링 타겟**(CSS/DOM Preview, Skia/WebGL Canvas, PixiJS Event)을 가지며, 텍스트 렌더링에서 CSS↔Skia 간 구조적 불일치가 존재한다.

**근본 원인**: CSS Preview와 WebGL/Skia가 서로 다른 텍스트 엔진을 사용한다.

| 경로            | 텍스트 엔진                             | 줄바꿈 결정자       | 폰트 셰이핑   |
| --------------- | --------------------------------------- | ------------------- | ------------- |
| **CSS Preview** | 브라우저 네이티브 (Blink/WebKit)        | 브라우저 내장 ICU   | OS 네이티브   |
| **WebGL/Skia**  | CanvasKit Paragraph API (HarfBuzz WASM) | HarfBuzz + ICU WASM | HarfBuzz WASM |
| **Layout 측정** | CanvasKitTextMeasurer (Paragraph API)   | 위와 동일           | 위와 동일     |

### 현재 아키텍처의 구체적 문제점

#### 1. 줄바꿈 결정 불일치 (가장 큰 시각적 차이)

```
"The quick brown fox jumps over the lazy dog near the river"
maxWidth: 200px, font: Inter 14px

CSS (Blink):     "The quick brown fox jumps|over the lazy dog near the|river"     → 3줄, height: 60px
Skia (HarfBuzz): "The quick brown fox jumps over|the lazy dog near the river"     → 2줄, height: 40px
```

서브픽셀 단위의 폰트 메트릭 차이에서 발생하며, 텍스트가 길어질수록 누적된다.

#### 2. 3곳 중복 폰트 파라미터 해석

| 위치      | 파일                                 | 역할                                                                                         |
| --------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
| 측정기    | `canvaskitTextMeasurer.ts` (L40-112) | `resolveSlant()` L40, `resolveWeight()` L48, `buildFontFamilies()` L77, `resolveWidth()` L97 |
| 렌더러    | `nodeRendererText.ts` (L185-232)     | `fontWeightMap`, `fontSlantMap`, `fontWidthEntries`                                          |
| Spec 변환 | `specShapeConverter.ts` (L722-746)   | inline split+resolve                                                                         |

#### 3. 2-Pass Height 보정 비용 (fullTreeLayout Step 4.5)

각 re-enrich는 WASM Paragraph 객체 생성+layout+delete 사이클을 포함하며, 500 요소 레이아웃에서 Step 4.5가 전체 시간의 30-40%를 차지한다.

#### 4. CanvasKit Paragraph 객체 관리 오버헤드

WASM Paragraph는 GC 대상이 아님 → `paragraph.delete()` 필수. 측정용과 렌더링용 별개 생성.

### Pretext 라이브러리 개요

> Repository: https://github.com/chenglou/pretext
> Author: Cheng Lou (react-motion, reason-react, Midjourney)
> Stars: 36,730+ | npm 주간 87,900+ DL | 24 dependents (2026-04-04 기준)
> Version: 0.0.4 (2026-04-01) | Open Issues: 66개
> Dependencies: 0 (순수 TypeScript, ~15KB minified)
> 상세 분석: [PRETEXT_ANALYSIS.md](../explanation/research/PRETEXT_ANALYSIS.md)

Pretext는 **DOM-free 텍스트 측정 라이브러리**로, 브라우저 CSS `white-space: normal` + `overflow-wrap: break-word` 동작을 pixel-perfect로 재현한다.

**핵심 아키텍처: 2-Phase 분리**

| Phase            | 함수                                     | 역할                                                | 비용 (500 texts)            |
| ---------------- | ---------------------------------------- | --------------------------------------------------- | --------------------------- |
| **1. prepare()** | `prepare(text, font)`                    | 텍스트 분석 + Canvas `measureText()` 폭 측정 + 캐시 | ~19ms                       |
| **2. layout()**  | `layout(prepared, maxWidth, lineHeight)` | 캐시된 폭으로 **순수 산술** 높이 계산               | ~0.09ms (**0.0002ms/text**) |

**정확도**: 4폰트 × 8사이즈 × 8폭 × 30텍스트 = 7,680 테스트 케이스, Chrome/Safari/Firefox pixel-perfect.

**커뮤니티 현황** (2026-04-04):

- [Textura](https://github.com/razroo/textura): Yoga + Pretext = DOM-free 레이아웃 (XStudio와 가장 유사한 아키텍처)
- [Typexperiments](https://github.com/pablostanley/typexperiments): Canvas 2D 키네틱 타이포그래피 (60fps 실증)
- **알려진 이슈**: [#77](https://github.com/chenglou/pretext/issues/77) Bidi 78.6px 불일치, [#74](https://github.com/chenglou/pretext/issues/74) keep-all 미지원, [#89](https://github.com/chenglou/pretext/issues/89) CSS 정합성 4건, [#78](https://github.com/chenglou/pretext/issues/78) letterSpacing 미지원, [#96](https://github.com/chenglou/pretext/issues/96) CJK+숫자 줄바꿈

**Pretext 0.0.4 API** (Phase 0 POC에서 실측):

```
exports: prepare, prepareWithSegments, layout, layoutWithLines,
         layoutNextLine, walkLineRanges, clearCache, setLocale, profilePrepare
PrepareOptions: { whiteSpace?: WhiteSpaceMode }
⚠️ measureNaturalWidth: 0.0.4에서 제거됨 (export 없음)
⚠️ overflowWrap/wordBreak 옵션: 미지원 — break-word 시맨틱 하드코딩
```

### Phase 0 POC 결과 — 핵심 발견 (2026-04-04)

Phase 0 Feasibility POC를 실행하여 다음을 확인:

1. **Pretext는 `overflow-wrap: break-word` 동작이 하드코딩** — `PrepareOptions`에 overflowWrap/wordBreak 없음
2. **XStudio 기본값이 `overflowWrap: "normal"`** — 대부분의 텍스트가 Pretext 경로 불가 (SSOT 커버리지 ~29%)
3. **`measureNaturalWidth()` 0.0.4에서 제거** — fit-content 폭 계산에 사용 불가
4. **`layoutWithLines()`는 `prepareWithSegments()` 필요** — 일반 `prepare()` 불가

### 기본값 `break-word` 전환 검토 → 기각

`overflow-wrap: break-word`를 기본값으로 전환하면 Pretext SSOT 커버리지가 ~100%로 상승하지만, **노코드 빌더의 디자인 품질과 충돌**한다:

| 문제                        | 영향                                         |
| --------------------------- | -------------------------------------------- |
| 좁은 컨테이너에서 문자 분할 | `"HelloWorld"` → `"Hel\nloW\norl\nd"`        |
| 디자인 리듬 파괴            | Badge, Button, Tag 등에서 예상치 못한 줄바꿈 |
| 리사이즈 중 문자 재배치     | 매 프레임 텍스트 레이아웃 변동               |
| Word boundary 소실          | 단어 경계 무시 → 가독성 저하                 |

**결론**: 기본값은 `normal` 유지. Pretext는 **사용자가 명시적으로 `break-word`를 선택한 경로에서만 SSOT**로 작동한다.

### 전략: 선택적 SSOT + 2-Pass 가속

| 조합                      | Pretext 적용 | 비고                                   |
| ------------------------- | ------------ | -------------------------------------- |
| `normal` + `normal`       | ❌ CanvasKit | **기본값** — 단어 경계 보존            |
| `normal` + `break-word`   | ✅ Pretext   | "Break Words" 프리셋                   |
| `keep-all` + `break-word` | ❌ CanvasKit | "Keep All" 프리셋 (Pretext #74 미지원) |
| `break-all` + (any)       | ❌ CanvasKit | "Break All" 프리셋                     |
| `nowrap` / `truncate`     | ❌ CanvasKit | 줄바꿈 없음                            |
| `pre-wrap`                | ❌ CanvasKit | "Preserve" 프리셋                      |

**실질 커버리지**: ~29% (break-word + keep-all 프리셋 사용 요소)

**하지만 핵심 가치는 유지된다:**

1. **2-Pass 가속** — `layout()` 0.0002ms는 모든 경로에서 height-only 계산에 활용 가능 (Pretext의 `normal` 결과를 upper/lower bound 추정에 사용)
2. **break-word 경로 정합성** — 가장 시각적 차이가 큰 break-word 경로에서 CSS↔Skia 완전 일치
3. **fit-content 폭 가속** — `layoutWithLines(prepared, 1e6, lh)` → max-content 폭 계산 (모든 텍스트)

### 요구사항

1. **CSS↔Skia 텍스트 높이 정합성** — 동일 텍스트+폰트+너비에서 동일 줄 수/높이
2. **리사이즈 핫 패스 성능** — 드래그 리사이즈 중 60fps 유지
3. **다국어 지원** — 한국어, 영어, 일본어, 중국어 (주요 타겟)
4. **기존 아키텍처 호환** — Taffy WASM, Zustand와 공존
5. **점진적 도입** — Phase별 마이그레이션 + 각 Phase rollback 가능

---

## Decision

**기본값 `normal` 유지. Pretext를 `overflow-wrap: break-word` 경로의 선택적 SSOT + 전체 텍스트의 2-Pass/fit-content 가속기로 도입한다.**

- **break-word 경로** (사용자 명시 선택): Pretext가 줄바꿈/높이 SSOT → CSS↔Skia 완전 일치
- **normal 경로** (기본값): CanvasKit 유지 → 단어 경계 보존, 디자인 리듬 보호
- **모든 경로**: Pretext `layout()` 0.0002ms를 height-only 추정 + fit-content 폭 계산에 활용

### 핵심 원칙

```
┌────────────────────────────────────────────────────────────┐
│               Pretext (선택적 SSOT + 가속기)                │
│  prepareWithSegments(text, font) → PreparedText (캐시됨)    │
│  layout(prepared, maxWidth, lineHeight) → {height, lines}  │
└───────────────┬──────────────────────┬─────────────────────┘
                │                      │
     ┌──────────▼──────────┐  ┌───────▼──────────────┐
     │  break-word 경로     │  │  normal 경로 (기본값) │
     │                      │  │                       │
     │  SSOT: Pretext       │  │  측정: CanvasKit      │
     │  Break Hint → Skia   │  │  가속: Pretext        │
     │  CSS↔Skia 완전 일치  │  │  height-only 추정     │
     └──────────────────────┘  └───────────────────────┘
```

**왜 이 전략이 성립하는가:**

1. **디자인 품질 보호** — 기본값 `normal` 유지 → 단어 경계 보존, 좁은 컨테이너에서 문자 분할 방지
2. **break-word 경로 정합성** — 사용자가 명시적으로 선택한 경우에만 Pretext SSOT → CSS↔Skia 완전 일치
3. **2-Phase 분리 가속** — `layout()` 0.0002ms를 모든 경로의 2-Pass/fit-content에 활용
4. **CanvasKit 렌더링 유지** — Break Hint Injection으로 Pretext 줄바꿈 + HarfBuzz 셰이핑 품질 공존

---

## Design

### 전제: 기본값 `normal` 유지 (코드 변경 없음)

`overflow-wrap: break-word` 기본값 전환은 **디자인 품질 문제로 기각**되었다.

- `cssResolver.ts` L83: `overflowWrap: "normal"` — **변경 없음**
- TypographySection 프리셋: 7개 (Normal, No Wrap, Truncate, Break Words, Break All, Keep All, Preserve) — **변경 없음**

Pretext는 **사용자가 "Break Words" 또는 "Keep All" 프리셋을 선택한 요소**에서만 SSOT로 작동하고, 그 외에는 CanvasKit fallback을 유지한다. 2-Pass 가속과 fit-content 폭 계산은 모든 경로에서 활용한다.

### 전체 아키텍처

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         TextLayoutService (신규)                           │
│  packages/shared/src/lib/textLayout.ts                                     │
│                                                                            │
│  ┌──────────────────────┐  ┌──────────────────────────────┐               │
│  │  PreparedTextCache    │  │  FontResolver                │               │
│  │  Map<cacheKey, handle>│  │  CSS fontFamily → resolved   │               │
│  └──────────┬───────────┘  └──────────────┬───────────────┘               │
│             │                              │                               │
│  ┌──────────▼──────────────────────────────▼───────────────┐              │
│  │  prepareWithSegments(text, resolvedFont, options?)       │              │
│  │  → PreparedTextWithSegments (캐시됨, 텍스트/폰트 변경 시)│              │
│  └──────────────────────────┬───────────────────────────────┘              │
│                             │                                              │
│  ┌──────────────────────────▼───────────────────────────────┐              │
│  │  layout(prepared, maxWidth, lineHeight)                    │              │
│  │  → { height, lineCount }                    [0.0002ms]   │              │
│  │                                                           │              │
│  │  layoutWithLines(prepared, maxWidth, lineHeight)           │              │
│  │  → { lines: LayoutLine[] }                  [~0.01ms]    │              │
│  └──────────────────────────────────────────────────────────┘              │
└────────────────────────────────────────────────────────────────────────────┘
```

> **API 주의** (Phase 0 POC 발견): `layoutWithLines()`는 `prepareWithSegments()` 결과를 요구한다. 일반 `prepare()`로는 호출 불가. `measureNaturalWidth()`는 0.0.4에서 제거됨 — fit-content 폭은 `layoutWithLines()` → `Math.max(...lines.map(l => l.width))`로 대체.

### Phase 진입 조건 / 배포 플래그 / 되돌림 단위

| Phase | 진입 조건                            | 배포 플래그                             | 되돌림 단위                                   |
| ----- | ------------------------------------ | --------------------------------------- | --------------------------------------------- |
| **0** | —                                    | —                                       | vendor 제거                                   |
| **A** | Phase 0 검증 통과                    | `USE_PRETEXT_MEASURER` (env 변수)       | `setTextMeasurer(canvasKitMeasurer)` 1줄 변경 |
| **B** | Phase A 단위 테스트 + A/B 검증 ≤ 2px | 동일 플래그 (A와 공유)                  | measurer 교체로 즉시 rollback                 |
| **C** | Phase B 벤치마크 통과                | `USE_PRETEXT_BREAK_HINTS` (별도 플래그) | Break Hint 분기 `if` 제거 → 기존 경로 복원    |
| **D** | Phase C 시각 비교 통과               | Phase C 플래그에 의존                   | min-height/overlay 원복                       |

### Phase 0: 환경 검증 — Pretext Feasibility (1~2일)

기본값 변경 없음. Pretext 라이브러리가 XStudio 환경에서 정상 작동하는지 검증한다.

#### 0-1. Canvas 2D Context 공존 검증

Pretext `prepare()`는 내부적으로 `OffscreenCanvas` 또는 별도 `<canvas>` element를 생성하여 2D context를 획득한다. XStudio WebGL canvas와 물리적으로 다른 element이므로 충돌하지 않아야 한다.

#### 0-2. 폰트 로딩 타이밍 검증

```typescript
// 이중 감지 패턴
skiaFontManager.onFontLoaded(() => {
  textLayoutService.clearCache();
  useStore.getState().invalidateLayout();
});
document.fonts.addEventListener("loadingdone", () => {
  textLayoutService.clearCache();
  useStore.getState().invalidateLayout();
});
```

#### 0-3. 세그먼트 폭 정확도 검증

한국어+영어 혼합 텍스트에서 Pretext width vs CSS width 오차 ≤ 1px 확인.

```typescript
const testTexts = [
  "Submit Order",
  "제출하기",
  "주문 Submit 완료",
  "2026-04-03 12:00 PM",
  "배송추적: https://track.example.com/KR123456789",
  "가격: ₩1,234,567 (부가세 포함)",
];
```

#### 0-4. CJK+숫자 줄바꿈 검증 ([#96](https://github.com/chenglou/pretext/issues/96) 패턴)

```typescript
const cjkTests = [
  "주문번호: 20260403001234567890",
  "中文11111111111",
  "商品コード：ABC123456789",
];
```

#### 0-5. Break Hint 텍스트 원본 보존 검증

```typescript
const { lines } = layoutWithLines(prepared, 200, 20);
const reconstructed = lines.map((l) => l.text).join("");
// 원본과 동일한 문자 시퀀스인지 확인 (공백 정규화 포함)
```

#### Phase 0 완료 기준

- [ ] Canvas 2D + WebGL 공존 확인
- [ ] 폰트 로딩 이중 감지 작동
- [ ] 한국어+영어 혼합 Pretext width vs CSS width 오차 ≤ 1px (break-word 모드)
- [ ] CJK+숫자 혼합 줄바꿈 정확 (break-word 모드)
- [ ] Break Hint 텍스트 보존 확인
- [ ] 500 요소 `prepareWithSegments()` 벤치마크 (19ms 이내)
- [ ] normal vs break-word 경로에서 Pretext 결과 차이 확인 (정합성 범위 검증)
- [ ] **Go/No-Go 판정**: 전부 통과 시 Phase A 진행

**Phase 0 실패 시**: Pretext 도입 중단. `cssNormalBreakProcess()` 정리/최적화(1~2일)로 CanvasKit 경로 개선.

### Phase A: Foundation — TextLayoutService (2~3일)

#### A-1. 패키지 구성

```
packages/shared/src/lib/
  textLayout.ts          — 공개 API
  textLayoutCache.ts     — PreparedText 캐시 관리
  textLayoutAdapter.ts   — Pretext ↔ TextMeasureStyle 어댑터
```

`@chenglou/pretext`를 **vendor** (`packages/shared/vendor/pretext/`, commit SHA 고정)로 도입한다. npm 전환 조건: 1.0.0 이상 + 핵심 PR([#82](https://github.com/chenglou/pretext/pull/82) Bidi, [#83](https://github.com/chenglou/pretext/pull/83) keep-all) 병합 + Phase C/D 무회귀.

#### A-2. TextMeasurer 인터페이스 확장

**A-2a. `TextMeasureStyle`에 `whiteSpace` 추가**:

현재 `TextMeasureStyle` (textMeasure.ts L28-42)에 `overflowWrap`, `wordBreak`은 있지만 `whiteSpace`가 없다. `PretextMeasurer.needsFallback()`이 `style.whiteSpace`를 참조하므로 추가 필수:

```typescript
export interface TextMeasureStyle {
  // ... 기존 필드
  whiteSpace?: "normal" | "nowrap" | "pre" | "pre-wrap" | "pre-line"; // 신규
}
```

> **현재 아키텍처**: whiteSpace는 상위 레이어(`utils.ts measureTextWithWhiteSpace`)에서 분기 처리. PretextMeasurer에서도 참조하려면 인터페이스 확장 필요.

**A-2b. `TextMeasureResult`에 `lineCount` 추가**:

```typescript
export interface TextMeasureResult {
  width: number;
  height: number;
  lineCount?: number; // 신규 — optional로 기존 호출자 파손 없음
}
```

**lineCount 호출자 영향 범위**:

- `Canvas2DTextMeasurer` — 내부 계산 후 반환 추가 (파손 없음)
- `CanvasKitTextMeasurer` — `paragraph.getLineMetrics().length` 반환
- `enrichWithIntrinsicSize` (utils.ts) — 선택적 활용
- `specShapeConverter.ts` — Phase C에서 TextShape에 전달

#### A-3. PretextMeasurer 어댑터

```typescript
class PretextMeasurer implements TextMeasurer {
  private cache = new Map<string, PreparedTextWithSegments>();

  measureWidth(text: string, style: TextMeasureStyle): number {
    if (this.needsFallback(style)) {
      return canvasKitFallback.measureWidth(text, style);
    }
    const prepared = this.getOrPrepare(text, style);
    // measureNaturalWidth 0.0.4 제거 → layoutWithLines 대체
    const { lines } = layoutWithLines(
      prepared,
      1e6,
      this.resolveLineHeight(style),
    );
    return lines.length > 0 ? Math.max(...lines.map((l) => l.width)) : 0;
  }

  measureWrapped(
    text: string,
    style: TextMeasureStyle,
    maxWidth: number,
  ): TextMeasureResult {
    if (this.needsFallback(style)) {
      return canvasKitFallback.measureWrapped(text, style, maxWidth);
    }
    const prepared = this.getOrPrepare(text, style);
    const lineHeight = this.resolveLineHeight(style);
    const { lines } = layoutWithLines(prepared, maxWidth, lineHeight);
    const longestLineWidth =
      lines.length > 0 ? Math.max(...lines.map((l) => l.width)) : 0;
    return {
      width: longestLineWidth,
      height: lines.length * lineHeight,
      lineCount: lines.length,
    };
  }

  private getOrPrepare(
    text: string,
    style: TextMeasureStyle,
  ): PreparedTextWithSegments {
    const key = buildCacheKey(text, style);
    let prepared = this.cache.get(key);
    if (!prepared) {
      prepared = prepareWithSegments(text, this.toFontString(style));
      this.cache.set(key, prepared);
    }
    return prepared;
  }

  private needsFallback(style: TextMeasureStyle): boolean {
    // letterSpacing/wordSpacing: Canvas measureText()가 무시 (#78)
    if (style.letterSpacing || style.wordSpacing) return true;
    if (style.whiteSpace && style.whiteSpace !== "normal") return true;
    if (style.wordBreak === "break-all" || style.wordBreak === "keep-all")
      return true;
    // overflow-wrap: normal → Pretext는 break-word 하드코딩이므로 줄바꿈 불일치
    // normal은 CanvasKit fallback (단어 경계 보존 = 디자인 품질 보호)
    if (!style.overflowWrap || style.overflowWrap === "normal") return true;
    return false;
  }
}
```

> **`toFontString()` 구현**: CSS font shorthand 형식 — `"${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}"`. fontStyle이 italic/oblique면 포함, 아니면 생략.

#### A-4. 캐시 전략

| 캐시 대상                  | 키                                                       | 생명주기                   |
| -------------------------- | -------------------------------------------------------- | -------------------------- |
| `PreparedTextWithSegments` | `(text, fontString)`                                     | 텍스트/폰트 변경 시 무효화 |
| `layout()` 결과            | 별도 캐시 불필요 — 0.0002ms이므로 재계산이 캐시보다 빠름 | —                          |

**height-only 최적화 경로** (모든 overflow-wrap 값에서 활용 가능):

Pretext `layout()` 0.0002ms를 **높이 추정 upper bound**로 사용. break-word는 normal보다 줄 수가 같거나 많으므로, Pretext 결과는 항상 `height ≥ actualHeight`. Step 4.5 re-enrich에서 "재계산 필요" 판정의 fast path로 활용:

```typescript
// break-word 경로: Pretext가 SSOT → 정확한 값
if (style.overflowWrap === "break-word") {
  return layout(prepared, availableWidth, lineHeight); // 0.0002ms, 정확
}
// normal 경로: Pretext를 upper bound로 사용 → 차이 시에만 CanvasKit 재계산
const pretextHeight = layout(prepared, availableWidth, lineHeight).height;
if (Math.abs(pretextHeight - cachedHeight) < WIDTH_TOLERANCE) {
  return cachedHeight; // 캐시 유효 → CanvasKit 재호출 스킵
}
return canvasKitFallback.measureWrapped(text, style, availableWidth); // 필요 시만
```

fit-content 폭 계산 (모든 경로):

```typescript
const { lines } = layoutWithLines(prepared, 1e6, lineHeight); // ~0.01ms
const contentWidth = Math.max(...lines.map((l) => l.width));
```

### Phase B: Layout Engine 통합 — 2-Pass 가속 (3~5일)

#### B-1. enrichWithIntrinsicSize 교체

```typescript
// 현재: 500 요소 시 각각 CanvasKit Paragraph 생성
const result = getTextMeasurer().measureWrapped(text, style, availableWidth);

// Pretext 도입 후: prepare()는 캐시 히트, layout()은 순수 산술
const prepared = textLayoutService.getOrPrepare(text, font);
const { height, lineCount } = layout(prepared, availableWidth, lineHeight);
```

#### B-2. 2-Pass Height 보정 (Step 4.5) 최적화

```
현재: N × (CanvasKit Paragraph 생성 + layout + delete) = N × ~0.5ms
Pretext: N × layout(prepared, newWidth) = N × 0.0002ms  ← prepare() 재호출 불필요!
```

**E2E 현실적 예측** (Codex 검토 반영):

| 비교 기준                               | 현재  | Pretext | 개선율   |
| --------------------------------------- | ----- | ------- | -------- |
| **Pretext layout() 단독** (이론적 최대) | ~50ms | ~0.02ms | 2,500×   |
| **enrichWithIntrinsicSize 전체** (E2E)  | ~50ms | ~5ms    | **10×**  |
| **Step 4.5 end-to-end** (Taffy 포함)    | ~65ms | ~10ms   | **6.5×** |

> **E2E 측정 전제**: 500 텍스트 요소, PreparedText 캐시 warm, Inter 14px, Taffy `computeLayout()` 1회 재호출, Chrome stable macOS, `performance.now()` 10회 중앙값.

Pretext가 제거하는 것은 WASM Paragraph round-trip이며, JS 연산 + Taffy 재호출은 잔존. 이 개선만으로 **16.67ms 프레임 버짓 내 진입 가능**.

### Phase C: Skia 렌더링 정합성 — Break Hint Injection (5~7일)

**정합성 효과가 가장 큰 핵심 구간.**

#### C-1. 전략: Break Hint Injection

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

장점: CanvasKit HarfBuzz 셰이핑 품질 유지 + Pretext 줄바꿈 강제.

> **기존 선례**: 현재 `cssNormalBreakProcess()`도 동일한 `\n` hard break 패턴을 사용한다 (`text.split(/\s+/)` → `lines.join("\n")`로 CanvasKit에 전달). Break Hint Injection은 이 검증된 메커니즘을 Pretext 줄바꿈으로 대체하는 것이다.

#### C-2. nodeRendererText.ts 수정

```typescript
const usePretextBreakHints = !needsFallback(style) && whiteSpace === "normal";

if (usePretextBreakHints) {
  // Pretext Break Hint 경로 — 줄바꿈 확정, 후처리 스킵
  const hintedText = lines.map((l) => l.text).join("\n");
  const paragraph = buildParagraph(hintedText, paraStyle);
  paragraph.layout(maxWidth);
  canvas.drawParagraph(paragraph, x, y);
} else {
  // 기존 CanvasKit 경로 — cssNormalBreakProcess 등 유지
  // ... 기존 코드 변경 없음
}
```

#### C-3. word-break/overflow-wrap 분기 전략

| 조합                      | 프리셋      | Pretext 도입 후                                                                           | 비고               |
| ------------------------- | ----------- | ----------------------------------------------------------------------------------------- | ------------------ |
| `normal` + `normal`       | **Normal**  | **CanvasKit 유지** (기본값 — 디자인 품질 보호)                                            | 단어 경계 보존     |
| `normal` + `break-word`   | Break Words | **Pretext Break Hint** ✅                                                                 | SSOT 경로          |
| `normal` + `anywhere`     | Custom      | **Pretext Break Hint** ✅ (break-word와 동일 동작)                                        | min-content 차이만 |
| `break-all` + (any)       | Break All   | **CanvasKit 유지**                                                                        | 문자 단위 분할     |
| `keep-all` + `break-word` | Keep All    | **CanvasKit 유지** (PR [#83](https://github.com/chenglou/pretext/pull/83) 병합 후 재평가) | 한국어 단어 보존   |
| nowrap / truncate         | No Wrap 등  | **CanvasKit 유지**                                                                        | 줄바꿈 없음        |

**핵심**: 기본값 `normal`이므로 대부분의 텍스트는 CanvasKit. "Break Words" 프리셋 선택 시에만 Pretext SSOT 경로. 2-Pass 가속은 모든 경로에서 활용.

#### C-4. Break Hint Paragraph 캐시 키 규칙

| 캐시 대상            | 키 구성                                                    | 생명주기            |
| -------------------- | ---------------------------------------------------------- | ------------------- |
| `PreparedText`       | `(originalText, fontString)`                               | 텍스트/폰트 변경 시 |
| `layout()` 결과      | 별도 캐시 불필요 (0.0002ms)                                | —                   |
| `Paragraph` (렌더용) | `(hintedText, maxWidth, fontFamilies, fontSize, ...style)` | hintedText 변경 시  |

기존 nodeRendererText.ts의 캐시 키(L114-136)에서 `processedText` 필드에 `hintedText`를 전달하면 호환.

### Phase D-1: CSS Preview 높이 힌트 (2~3일)

```typescript
// Preview에서 Pretext 높이를 min-height로 주입
<div style={{ minHeight: pretextHeight }}>{text}</div>
```

Pretext = CSS 동일 엔진이므로 `minHeight === actualHeight`가 되어야 한다.

### Phase D-2: Quill 인라인 편집 오버레이 정합성 (2~3일)

**문제**: 더블클릭 편집 시 Quill(DOM)과 Skia의 줄바꿈 불일치로 텍스트 재배치.

**해결**: Skia(Break Hint)와 Quill(DOM)이 모두 `overflow-wrap: break-word` + 동일 폰트를 사용하면, Canvas `measureText()` 기반인 Pretext와 브라우저 DOM의 줄바꿈이 자연적으로 일치.

```
[편집 전] Skia: Pretext Break Hint → "Submit|Order" (2줄)
[편집 중] Quill: DOM break-word → "Submit|Order" (2줄) ← 일치
[편집 후] Skia: 재 prepare → Break Hint → 동일 레이아웃
```

**잔여 불일치** (Pretext 범위 외, 별도 수정):

1. vertical alignment offset 보정
2. padding/offset 매핑 정밀화
3. zoom 부동소수점 `Math.round()` 처리

### Phase E: 고급 활용 (미래)

- `layoutNextLine()`: 가변 폭 레이아웃 (이미지 주변 텍스트 흐름)
- `walkLineRanges()`: 줄별 애니메이션
- `pre-wrap` white-space 지원
- Per-Line `drawText()` 전략 (Phase C 대안 B — HarfBuzz 포기, 완전 Pretext 제어)

---

## 성능 비교

### Pretext API 단독 비교

| 연산                                 | 현재 (CanvasKit)               | Pretext API 단독       | 개선율     |
| ------------------------------------ | ------------------------------ | ---------------------- | ---------- |
| **초기 측정** (prepare)              | ~35ms (Paragraph 500개 생성)   | ~19ms (prepare 500개)  | 1.8×       |
| **리사이즈 재계산** (layout)         | ~35ms (Paragraph 재생성)       | ~0.09ms (layout만)     | **389×**   |
| **2-Pass 보정** (Step 4.5, 100 노드) | ~50ms (Paragraph 100개 재생성) | ~0.02ms (layout 100개) | **2,500×** |

### End-to-End 현실적 예측

| 연산                           | 현재    | Pretext E2E | 개선율   | 비고                          |
| ------------------------------ | ------- | ----------- | -------- | ----------------------------- |
| **초기 전체 레이아웃**         | ~120ms  | ~55ms       | **2.2×** | prepare() 비용 지배적         |
| **리사이즈 전체 사이클**       | ~85ms   | ~8ms        | **10×**  | layout() + 스타일 + Taffy     |
| **2-Pass 전체** (Step 4.5)     | ~65ms   | ~10ms       | **6.5×** | layout() + enrichment + Taffy |
| **프레임 버짓 (16.67ms) 충족** | ❌ 초과 | ✅ 여유     | —        | 60fps 안정화                  |

### 메모리 / 번들

| 항목                    | 현재                | Pretext 도입 후                                                              |
| ----------------------- | ------------------- | ---------------------------------------------------------------------------- |
| Pretext 라이브러리      | 0                   | ~15KB minified (런타임 ~50KB 힙)                                             |
| Paragraph 객체 (측정용) | ~500KB (LRU 1000개) | 0 (측정용 Paragraph 불필요)                                                  |
| PreparedText 캐시       | 0                   | ~200KB (SoA 구조, 500 텍스트)                                                |
| **순 번들 변화**        | —                   | +15KB (Pretext) - 3~4KB (preprocessBreakWordText 40줄 + 헬퍼) = **+11~12KB** |

---

## 리스크 분석

### Risk 1: Pretext 측정 정확도 — 혼합 스크립트

| 항목               | Canvas measureText()  | 커뮤니티 증거                                        |
| ------------------ | --------------------- | ---------------------------------------------------- |
| 기본 라틴 + 한국어 | ✅ 정확               |                                                      |
| CJK + 연속 숫자    | ⚠️ 줄바꿈 버그 가능   | [#96](https://github.com/chenglou/pretext/issues/96) |
| 아랍어 (RTL 혼합)  | ❌ 최대 78.6px 불일치 | [#77](https://github.com/chenglou/pretext/issues/77) |
| URL/하이픈 복합어  | ⚠️ 줄바꿈 위치 차이   | [#89](https://github.com/chenglou/pretext/issues/89) |

**심각도**: HIGH (아랍어), MEDIUM (CJK+숫자)
**완화**: 아랍어는 CanvasKit fallback. CJK+숫자는 Phase 0에서 검증.

### Risk 2: `system-ui` 폰트 미지원

XStudio는 `Inter` + Google Fonts를 명시적으로 사용 → **영향 없음**.

**심각도**: LOW

### Risk 3: white-space 모드 제한

Pretext는 `normal` + `pre-wrap`만 지원. `nowrap`은 `measureNaturalWidth` 대체로 처리 가능, `pre`/`pre-line`은 CanvasKit fallback.

**심각도**: MEDIUM

### Risk 4: Pretext 성숙도 (v0.0.4)

66개 open issues, 핵심 PR 미병합. HN 비판: "edge case를 영원히 쫓게 될 것".

**완화**: vendor 전략 (commit SHA 고정), 소스 5개 파일 (~15KB) 코드 리뷰 가능.

**심각도**: MEDIUM

### Risk 5: letterSpacing / wordSpacing 미지원

Canvas `measureText()` 자체의 한계 ([#78](https://github.com/chenglou/pretext/issues/78)). CanvasKit fallback으로 처리.

**심각도**: MEDIUM — 대부분의 UI 텍스트에 무영향

### Risk 6: `measureNaturalWidth()` 0.0.4 제거

**영향**: fit-content/max-content 폭 계산 API 없음.
**대체**: `layoutWithLines(prepared, 1e6, lineHeight)` → 줄 1개의 width 반환. 또는 `walkLineRanges()` 사용.

**심각도**: MEDIUM — 대체 가능하나 0.0002ms → ~0.01ms로 성능 차이

### Risk 7: Break Hint 렌더링 경로 이중 호출

Phase C에서 Pretext `layoutWithLines()` + CanvasKit `Paragraph.layout()` 이중 호출. 렌더 CPU 증가 가능.

**완화**: Phase B의 `prepareWithSegments()` 캐시를 Phase C에서 재사용. 렌더 CPU 15% 이상 악화 시 Phase C 플래그 비활성화.

**심각도**: MEDIUM

### 리스크 요약

| Risk | 심각도 | 완화 전략                 |
| ---- | ------ | ------------------------- |
| 1    | HIGH   | 아랍어 CanvasKit fallback |
| 2    | LOW    | 영향 없음                 |
| 3    | MEDIUM | CanvasKit fallback        |
| 4    | MEDIUM | vendor + 코드 리뷰        |
| 5    | MEDIUM | CanvasKit fallback        |
| 6    | MEDIUM | layoutWithLines 대체      |
| 7    | MEDIUM | 캐시 연계 + CPU 모니터링  |

---

## 외부 근거 vs 검증 필요 항목

### 외부에서 확인된 사실

| 항목                           | 근거                                                 |
| ------------------------------ | ---------------------------------------------------- |
| Pretext layout() 0.0002ms/text | 저자 벤치마크 + Textura/Typexperiments 재현          |
| break-word 시맨틱 하드코딩     | Phase 0 POC — PrepareOptions에 overflowWrap 미포함   |
| measureNaturalWidth 0.0.4 제거 | Phase 0 POC — export 목록에 없음                     |
| 아랍어 78.6px 불일치           | [#77](https://github.com/chenglou/pretext/issues/77) |
| Canvas 2D ↔ WebGL 공존 가능    | Pretext 소스 — 별도 canvas element 생성              |

### Phase 0에서 검증 필요

| 항목                                   | 가설                              | 실패 시 영향           |
| -------------------------------------- | --------------------------------- | ---------------------- |
| break-word 모드에서 Pretext↔CSS 정합   | width ≤ 1px 오차                  | SSOT 범위 축소         |
| CJK+숫자 줄바꿈 정확 (break-word 모드) | #96 패턴이 한국어에서 재현 안 됨  | 해당 패턴 fallback     |
| Break Hint 텍스트 보존                 | 공백 정규화가 줄바꿈에 영향 안 줌 | Break Hint 전략 재설계 |
| normal 경로 height-only 추정 유용성    | upper bound 추정이 캐시 히트 향상 | 가속 효과 감소         |

---

## 수정 파일 목록

### 신규 파일

| 파일                                           | 역할                              |
| ---------------------------------------------- | --------------------------------- |
| `packages/shared/src/lib/textLayout.ts`        | TextLayoutService 공개 API        |
| `packages/shared/src/lib/textLayoutCache.ts`   | PreparedText 캐시 관리            |
| `packages/shared/src/lib/textLayoutAdapter.ts` | Pretext ↔ TextMeasureStyle 어댑터 |
| `packages/shared/vendor/pretext/`              | Pretext 0.0.4 vendor 소스         |

### 수정 파일

| 파일                                 | 변경 내용                                                                                  | Phase |
| ------------------------------------ | ------------------------------------------------------------------------------------------ | ----- |
| `textMeasure.ts`                     | `TextMeasureStyle.whiteSpace?` + `TextMeasureResult.lineCount?` 추가, PretextMeasurer 구현 | A     |
| `canvaskitTextMeasurer.ts`           | 측정 전용 Paragraph 축소, lineCount 반환 추가                                              | B     |
| `engines/utils.ts`                   | enrichWithIntrinsicSize에서 Pretext layout() 사용                                          | B     |
| `fullTreeLayout.ts`                  | Step 4.5 re-enrich에서 Pretext re-layout                                                   | B     |
| `nodeRendererText.ts`                | Break Hint Injection 분기 추가                                                             | C     |
| `specShapeConverter.ts`              | TextShape 변환 시 Pretext 높이                                                             | C     |
| `ElementSprite.tsx`                  | Pretext 높이를 specProps에 전달                                                            | C     |
| `overlay/useTextEdit.ts`             | Pretext 기반 오버레이 크기                                                                 | D-2   |
| `overlay/TextEditOverlay.tsx`        | Pretext height 적용                                                                        | D-2   |
| `overlay/specTextStyleForOverlay.ts` | lineHeight 통일                                                                            | D-2   |

### 제거 후보

| 코드                        | 제거 조건                                              |
| --------------------------- | ------------------------------------------------------ |
| `preprocessBreakWordText()` | **Phase C 완료 후** — break-word 경로를 Pretext가 대체 |
| `cssNormalBreakProcess()`   | **유지** — normal 기본 경로에 필수                     |
| `computeKeepAllWidth()`     | **보류** — keep-all fallback에 필요                    |
| 측정용 Paragraph LRU 캐시   | **Phase B 완료 후 축소**                               |

---

## 마이그레이션 체크리스트

### Phase 0 — Canonical Go/No-Go 게이트

- [ ] Canvas 2D + WebGL 공존 확인
- [ ] 폰트 로딩 이중 감지 작동
- [ ] 한국어+영어 혼합 Pretext width vs CSS width ≤ 1px (break-word 모드)
- [ ] CJK+숫자 혼합 줄바꿈 정확 (break-word 모드)
- [ ] Break Hint 텍스트 보존 확인
- [ ] normal 경로 height-only 추정 유용성 검증
- [ ] 500 요소 `prepareWithSegments()` 벤치마크 ≤ 19ms

### Phase A

- [ ] Pretext vendor 또는 dependency 추가
- [ ] `TextMeasureStyle`에 `whiteSpace?` 필드 추가 (needsFallback 타입 안전성)
- [ ] `TextMeasureResult`에 `lineCount?` 필드 추가
- [ ] TextLayoutService 구현
- [ ] PretextMeasurer → TextMeasurer 어댑터
- [ ] `setTextMeasurer(new PretextMeasurer())` 전환점
- [ ] 단위 테스트: CanvasKit 결과와 비교 (tolerance 2px)

### Phase B

- [ ] enrichWithIntrinsicSize Pretext layout() 사용
- [ ] Step 4.5 re-enrich Pretext re-layout
- [ ] A/B 검증 모드 (dev only)
- [ ] 500 요소 벤치마크

### Phase C

- [ ] nodeRendererText.ts Break Hint Injection
- [ ] specShapeConverter.ts Pretext 높이
- [ ] Paragraph 캐시 키 hintedText 반영
- [ ] 시각 비교: CSS Preview vs Canvas 스크린샷 diff
- [ ] 렌더 CPU 15% 이상 악화 시 플래그 비활성화

### Phase D

- [ ] Preview min-height 힌트
- [ ] Quill 오버레이 Pretext height
- [ ] 편집 전/중/후 줄바꿈 일관성 검증

---

## 결론

기본값 `normal` 유지 + Pretext 선택적 SSOT + 전체 2-Pass 가속으로 디자인 품질과 성능을 동시에 보호한다.

| 측면                        | 현재       | 도입 후 (E2E)                             |
| --------------------------- | ---------- | ----------------------------------------- |
| CSS↔Skia 줄바꿈 일치율      | ~90%       | break-word: ~99%, normal: ~90% (유지)     |
| 리사이즈 재계산 비용        | ~85ms      | break-word: ~8ms, normal: ~40ms (가속)    |
| 2-Pass 보정 비용            | ~65ms      | ~10~30ms (height-only 추정 활용)          |
| 폰트 파라미터 동기화 포인트 | 3곳 (수동) | break-word: 1곳, normal: 3곳 (유지)       |
| SSOT 적용 범위              | —          | ~29% (break-word/anywhere 선택 요소)      |
| 디자인 품질                 | ✅ 보존    | ✅ 보존 (단어 경계, 텍스트 리듬 유지)     |
| 추가 번들 크기              | —          | +15KB (net, preprocessBreakWordText 유지) |

**Phase 0(환경 검증) → A → B → C → D** 순서로 점진적 도입. 각 Phase에 배포 플래그와 되돌림 단위가 있어 독립적으로 rollback 가능. 기본값 변경 없이 도입하므로 기존 프로젝트 회귀 위험 없음.
