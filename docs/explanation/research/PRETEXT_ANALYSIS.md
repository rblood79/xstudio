# Pretext — DOM-Free 텍스트 측정 라이브러리 분석

> **Repository**: https://github.com/chenglou/pretext
> **Author**: Cheng Lou (react-motion, reason-react 저자)
> **License**: MIT | **Stars**: 35,800+ (2026-03 ~ 04, 약 1개월)
> **Dependencies**: 0 (순수 TypeScript)

## 1. 해결하는 문제

DOM 기반 텍스트 측정(`getBoundingClientRect`, `offsetHeight`)은 **layout reflow**를 유발하며, 이는 브라우저에서 가장 비싼 연산 중 하나이다. 500개 텍스트 블록을 독립적으로 측정하면 read/write interleaving이 발생하여 프레임당 30ms+ 소비.

Pretext는 이를 **2-Phase 아키텍처**로 분리한다:

- **`prepare()`** — 텍스트 분석 + Canvas `measureText()`로 폭 측정 + 캐싱
- **`layout()`** — 캐시된 폭을 이용한 순수 산술 연산으로 높이 계산 (DOM/Canvas 호출 없음)

## 2. 핵심 아키텍처: 2-Phase

| Phase            | 함수                                     | 역할                                                | 성능 (500 texts)            |
| ---------------- | ---------------------------------------- | --------------------------------------------------- | --------------------------- |
| **1. prepare()** | `prepare(text, font)`                    | 텍스트 분석 + Canvas `measureText()` 폭 측정 + 캐시 | ~19ms                       |
| **2. layout()**  | `layout(prepared, maxWidth, lineHeight)` | 캐시된 폭으로 **순수 산술** 높이 계산               | ~0.09ms (**0.0002ms/text**) |

`layout()` 핫 패스 특성:

- DOM 읽기 없음
- Canvas 호출 없음
- 문자열 연산 없음
- 메모리 할당 없음
- 순수 산술 루프

## 3. 소스 구조

```
src/
  analysis.ts     (27KB) — 텍스트 정규화, Intl.Segmenter 기반 세그먼테이션, 접착 규칙
  measurement.ts   (7KB) — Canvas 측정, 세그먼트 캐시, 이모지 보정, 브라우저 프로파일
  line-break.ts   (31KB) — 줄바꿈 코어: simple/full 경로 분기, 탐욕적 알고리즘
  layout.ts       (25KB) — 퍼블릭 API (prepare/layout/layoutWithLines)
  bidi.ts          (7KB) — 간소화된 UAX #9 BiDi 메타데이터
  inline-flow.ts  (11KB) — 실험적 혼합 인라인 플로우
```

총 ~110KB, 핵심 파일 5개의 간결한 구조.

## 4. 텍스트 분석 파이프라인 (analysis.ts)

```
원본 텍스트
  → 공백 정규화 (CSS white-space: normal 동작)
  → Intl.Segmenter 단어 분할 (CJK/Thai/Arabic 등 12개 스크립트)
  → 구두점 선행 단어 병합 ("better." = 1단위)
  → CJK 개별 grapheme 분할 (문자 단위 줄바꿈)
  → Kinsoku(禁則) 처리 (일본어 줄 시작/끝 금지 문자)
  → URL/숫자 런 병합
  → Canvas measureText()로 세그먼트 폭 측정 + 캐시
```

### 데이터 구조: SoA (Structure of Arrays)

```typescript
type MergedSegmentation = {
  len: number;
  texts: string[]; // 세그먼트 텍스트
  isWordLike: boolean[]; // 단어 여부
  kinds: SegmentBreakKind[]; // 8가지 break 종류
  starts: number[]; // 원본 내 오프셋
};
```

8가지 `SegmentBreakKind`:

| Kind               | 설명                             |
| ------------------ | -------------------------------- |
| `text`             | 일반 텍스트 세그먼트             |
| `space`            | 공백                             |
| `preserved-space`  | 보존 공백 (pre-wrap)             |
| `tab`              | 탭 문자                          |
| `glue`             | NBSP 등 비파괴 공백 (break 불가) |
| `zero-width-break` | ZWSP (폭 없는 break 기회)        |
| `soft-hyphen`      | 조건부 하이픈                    |
| `hard-break`       | 강제 줄바꿈                      |

### 스크립트별 전처리 규칙

- **일본어**: Kinsoku(禁則) — 줄 시작/끝 금지 문자 처리
- **아랍어**: 구두점+마크 클러스터 병합, RTL 특수 처리
- **CJK 공통**: 개별 grapheme 분할 (문자 단위 줄바꿈)
- **태국어/미얀마어/크메르어**: 단어 경계 감지 (공백 미사용 스크립트)
- **URL/숫자 런**: 원자적 단위로 병합

## 5. 측정 시스템 (measurement.ts)

### 캐시 구조

```typescript
Map<font, Map<segment, SegmentMetrics>>;
```

```typescript
type SegmentMetrics = {
  width: number;
  containsCJK: boolean;
  emojiCount?: number; // lazy 계산
  graphemeWidths?: number[] | null; // lazy 계산 (overflow-wrap용)
  graphemePrefixWidths?: number[] | null; // Safari용 lazy 계산
};
```

### 이모지 보정

Chrome/Firefox macOS에서 Apple Color Emoji가 Canvas에서 DOM보다 넓게 측정되는 quirk. 한 번의 DOM calibration으로 correction factor를 계산하여 전체 세션에 캐시.

### 브라우저 EngineProfile

```typescript
type EngineProfile = {
  lineFitEpsilon: number; // Safari: 1/64, Chrome/Firefox: 0.005
  carryCJKAfterClosingQuote: boolean; // Chromium only
  preferPrefixWidthsForBreakableRuns: boolean; // Safari only
  preferEarlySoftHyphenBreak: boolean; // Safari only
};
```

브라우저별 줄바꿈 미세 차이를 정확히 재현하기 위한 shim 시스템.

## 6. 줄바꿈 엔진 (line-break.ts)

**탐욕적(Greedy) 알고리즘** — CSS 브라우저 동작을 pixel-perfect로 재현하기 위해 의도적 선택 (Knuth-Plass 아님).

### 두 가지 경로

| 경로                 | 조건                            | 특성                                                    |
| -------------------- | ------------------------------- | ------------------------------------------------------- |
| **Simple fast path** | hard break 없음 + pre-wrap 아님 | 최적화된 단순 루프                                      |
| **Full path**        | 그 외                           | soft hyphen, tab stop, hard break, break-word 전부 지원 |

### 핵심 데이터 (prepared 핸들)

```typescript
type PreparedCore = {
  widths: number[]; // 세그먼트 폭
  lineEndFitAdvances: number[]; // 줄 끝 fitting 폭 (공백 = 0)
  lineEndPaintAdvances: number[]; // 줄 끝 paint 폭
  kinds: SegmentBreakKind[]; // break 종류
  breakableWidths: (number[] | null)[]; // overflow-wrap용 grapheme 폭
  breakablePrefixWidths: (number[] | null)[]; // Safari prefix width shim
  discretionaryHyphenWidth: number; // soft hyphen '-' 폭
  tabStopAdvance: number; // tab stop 간격 (spaceWidth * 8)
  chunks: PreparedLineChunk[]; // hard break 기반 청크
};
```

### CSS 정합 포인트

- trailing whitespace는 줄 끝에 걸쳐도 break를 트리거하지 않음
- `maxWidth`를 초과하는 세그먼트는 grapheme 단위로 분할 (`overflow-wrap: break-word`)
- `pendingBreak` 패턴으로 "지연된 break point" 추적

## 7. 공개 API

### 기본 사용 (DOM-free 높이 예측)

```typescript
// Phase 1: 한 번 (또는 텍스트/폰트 변경 시)
const prepared = prepare(text, font, options?)

// Phase 2: 리사이즈마다 (할당 제로)
const { height, lineCount } = layout(prepared, maxWidth, lineHeight)
```

### 리치 경로 (수동 줄 레이아웃)

```typescript
const prepared = prepareWithSegments(text, font, options?)
const { lines } = layoutWithLines(prepared, maxWidth, lineHeight)
// lines: LayoutLine[] — 줄별 텍스트, 폭, 세그먼트 정보
```

### 스트리밍/가변 폭

```typescript
// 콜백 기반 (문자열 미생성, 폭/커서만)
walkLineRanges(prepared, maxWidth, onLine) → lineCount

// 스트리밍 (가변 폭 지원)
layoutNextLine(prepared, start, maxWidth) → LayoutLine | null

// 고유 폭 (intrinsic width)
measureNaturalWidth(prepared) → number
```

### 실험적 inline-flow 사이드카

```typescript
prepareInlineFlow(items: InlineFlowItem[]) → PreparedInlineFlow
walkInlineFlowLines(prepared, maxWidth, onLine) → lineCount
layoutNextInlineFlowLine(prepared, maxWidth, start?) → InlineFlowLine | null
```

## 8. 테스트 및 정확도 검증

### 브라우저 정확도 기반 테스트

- `accuracy/chrome.json`, `safari.json`, `firefox.json`
- **4폰트 × 8사이즈 × 8폭 × 30텍스트 = 7,680 테스트 케이스**
- 브라우저 자동화로 실제 DOM 렌더링과 비교

### 다국어 코퍼스 (12개 언어)

아랍어, 히브리어, 힌디어, 일본어, 중국어, 한국어, 태국어, 크메르어, 미얀마어, 우르두어 등의 장편 텍스트로 정확도 검증.

## 9. 기술 스택

| 항목           | 내용                                                                               |
| -------------- | ---------------------------------------------------------------------------------- |
| Runtime 의존성 | **0개** (순수 TypeScript)                                                          |
| Web API        | `Intl.Segmenter`, Canvas `measureText()`, `OffscreenCanvas`                        |
| Build          | Bun + tsc                                                                          |
| TypeScript     | 6.0.2, strict mode 전부 (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Lint           | oxlint (type-aware)                                                                |
| Test           | `bun:test` + deterministic fake canvas backend                                     |

## 10. 설계 결정 및 트레이드오프

| 결정                                       | 이유                                                      |
| ------------------------------------------ | --------------------------------------------------------- |
| **Greedy line breaking** (Knuth-Plass X)   | CSS 브라우저 동작과 pixel-perfect 일치가 목표             |
| **Opaque PreparedText** (branded type)     | 내부 구현 변경 자유도 확보, `unique symbol`로 opaque 유지 |
| **`layout()` vs `layoutWithLines()` 분리** | 리사이즈 핫 패스에서 줄 정보 미생성 → 할당 제로           |
| **`system-ui` 폰트 미지원**                | Canvas와 DOM이 macOS에서 다른 optical variant로 resolve   |
| **스크립트별 전처리를 prepare()에 집중**   | layout() 핫 패스는 범용 산술만 실행                       |
| **이모지 1회 DOM calibration**             | Chrome/Firefox macOS Canvas→DOM 폭 차이 해결              |
| **SoA 레이아웃**                           | 캐시 친화적 메모리 배치, 핫 패스 성능 극대화              |
| **WeakMap 캐시**                           | GC 친화적, 폰트/컨텍스트 해제 시 자동 정리                |

## 11. 코드 품질 특성

- **함수형 지향** — 클래스 없음, 상태 최소화
- **SoA (Structure of Arrays)** — 메모리 효율 + 캐시 친화
- **Lazy computation** — grapheme 폭은 `overflow-wrap: break-word` 필요 시에만 계산
- **서술적 함수명**: `carryTrailingForwardStickyAcrossCJKBoundary()`, `isLeftStickyPunctuationSegment()`
- **Branded type으로 API 안전성 확보**

## 12. XStudio 연관성 분석

Pretext는 **XStudio의 `canvaskitTextMeasurer.ts`가 해결하는 것과 동일한 문제**를 다룬다.

| 측면          | XStudio (현재)               | Pretext                             |
| ------------- | ---------------------------- | ----------------------------------- |
| 측정 엔진     | CanvasKit WASM Paragraph API | 브라우저 Canvas `measureText()`     |
| 줄바꿈        | CanvasKit 내장 (ICU)         | 자체 구현 (Intl.Segmenter + greedy) |
| 의존성        | CanvasKit WASM (~6MB)        | 없음 (순수 JS)                      |
| 성능 (layout) | WASM Paragraph 생성 비용     | 0.0002ms/text (순수 산술)           |
| 다국어        | ICU 기반 (포괄적)            | 12개 스크립트 전용 규칙             |
| 캐싱          | 결과값 LRU 캐시              | 세그먼트 폭 + prepare 핸들 캐시     |

### 잠재적 활용 시나리오

1. **Preview(CSS) 경로의 텍스트 높이 사전 예측** — DOM reflow 없이 컴포넌트 높이 추정
2. **Canvas 경로의 보조 측정기** — CanvasKit Paragraph 생성 전 빠른 높이/줄 수 추정
3. **리사이즈 핫 패스 최적화** — `layout()` 0.0002ms/text 성능으로 드래그 중 실시간 높이 갱신
4. **2-Pass layout 보정 가속** — fullTreeLayout Step 4.5의 re-enrich 비용 절감

### 제약사항

- 브라우저 Canvas API 의존 (서버사이드 미지원)
- `system-ui` 폰트 미지원
- CanvasKit의 font shaping 정확도에는 미달 (복잡한 스크립트)
- `white-space: normal` + `overflow-wrap: break-word` 조합만 지원 (pre, nowrap 등 제한적)

## 13. 참고

- **저자**: Cheng Lou — `react-motion`, `reason-react` 저자, Meta ReasonML/BuckleScript 리드
- **영감**: Sebastian Markbage(React 핵심 아키텍트)의 `text-layout` 연구 기반
- **철학**: "CSS 스펙의 80%는 userland에서 텍스트를 더 잘 제어할 수 있으면 불필요해진다" (thoughts.md)
- **npm**: `@chenglou/pretext` (v0.0.4)
- **분석일**: 2026-04-03
