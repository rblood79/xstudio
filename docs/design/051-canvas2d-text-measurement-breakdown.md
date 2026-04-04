# ADR-051 구현 설계: Canvas 2D 텍스트 측정 내재화

> ADR: [051-pretext-text-measurement-integration.md](../adr/051-pretext-text-measurement-integration.md)
> 상태: 설계 완료, Phase 0 대기

---

## 아키텍처

```
┌───────────────────────────────────────────────────────────┐
│            canvas2dSegmentCache.ts (신규)                   │
│  OffscreenCanvas.getContext("2d").measureText()             │
│  Map<fontKey, Map<token, width>>                            │
│  Intl.Segmenter 토큰화 + greedy line-breaking              │
│  → CSS Preview와 동일 브라우저 폰트 엔진                    │
└──────────┬────────────────────────────┬───────────────────┘
           │                            │
    ┌──────▼─────────────┐    ┌────────▼──────────────┐
    │  !needsFallback     │    │  needsFallback         │
    │  Canvas 2D 경로     │    │  CanvasKit 기존 경로   │
    │  ~90% 텍스트        │    │  ~10% 텍스트           │
    │                     │    │  (letterSpacing,        │
    │  캐시된 폭 선형주행 │    │   break-all, nowrap,    │
    │  → lineCount, height│    │   pre-wrap)             │
    └──────────┬──────────┘    └─────────────────────────┘
               │
    ┌──────────▼──────────────────────┐
    │  Break Hint Injection            │
    │  lines.join("\n") → CanvasKit    │
    │  CanvasKit = 렌더링 전용         │
    │  HarfBuzz shaping 품질 유지      │
    └──────────────────────────────────┘
```

**측정기 2개 유지** (3개 금지):

- `Canvas2DTextMeasurer` — CanvasKit 초기화 전 fallback (기존)
- `CanvasKitTextMeasurer` — 내부에서 `needsFallback()` 분기, !fallback 시 `canvas2dSegmentCache` 유틸 사용

`isCanvasKitMeasurer()` 보정 로직 변경 불필요.

---

## needsFallback() — CanvasKit fallback 경계

```typescript
function needsFallback(style: TextMeasureStyle): boolean {
  if (style.letterSpacing || style.wordSpacing) return true;
  if (style.whiteSpace && style.whiteSpace !== "normal") return true;
  if (style.wordBreak === "break-all") return true;
  return false;
}
```

| 경로                          | 프리셋      | 측정 엔진 | CSS 정합성 |
| ----------------------------- | ----------- | --------- | ---------- |
| `normal + normal` (~70%)      | Normal      | Canvas 2D | ~98%       |
| `normal + break-word` (~15%)  | Break Words | Canvas 2D | ~98%       |
| `keep-all + break-word` (~5%) | Keep All    | Canvas 2D | ~98%       |
| `break-all` (~5%)             | Break All   | CanvasKit | ~90%       |
| `nowrap/truncate` (~5%)       | No Wrap 등  | CanvasKit | ~90%       |
| `letterSpacing` 사용          | Custom      | CanvasKit | ~90%       |

---

## 신규 모듈: canvas2dSegmentCache.ts

### 1. Intl.Segmenter 기반 토큰화

```typescript
interface Token {
  text: string;
  breakable: boolean; // true: 줄바꿈 가능 단위, false: 공백/구두점
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

function tokenize(text: string, wordBreak: string): Token[] {
  const segments = [...segmenter.segment(text)];
  const tokens: Token[] = [];
  for (const seg of segments) {
    if (!seg.isWordLike) {
      tokens.push({ text: seg.segment, breakable: false });
    } else if (isCJKSegment(seg.segment) && wordBreak !== "keep-all") {
      // CJK word-break:normal — 각 문자 사이 줄바꿈 허용
      for (const char of seg.segment) {
        tokens.push({ text: char, breakable: true });
      }
    } else {
      tokens.push({ text: seg.segment, breakable: true });
    }
  }
  return tokens;
}

function isCJKSegment(text: string): boolean {
  const cp = text.codePointAt(0) ?? 0;
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified
    (cp >= 0x3040 && cp <= 0x309f) || // Hiragana
    (cp >= 0x30a0 && cp <= 0x30ff) || // Katakana
    (cp >= 0xac00 && cp <= 0xd7af) || // Hangul
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Extension A
    (cp >= 0x20000 && cp <= 0x2a6df) || // CJK Extension B
    (cp >= 0xff00 && cp <= 0xffef) // Fullwidth
  );
}
```

### 2. 세그먼트 폭 캐시

```typescript
const segmentCaches = new Map<string, Map<string, number>>();
let sharedCtx:
  | OffscreenCanvasRenderingContext2D
  | CanvasRenderingContext2D
  | null = null;
let fontsReady = false;

// 초기화
if (typeof document !== "undefined") {
  document.fonts.ready.then(() => {
    fontsReady = true;
  });
  document.fonts.addEventListener("loadingdone", () => {
    segmentCaches.clear(); // 폰트 로드 후 캐시 전체 무효화
  });
}

function getCtx() {
  if (!sharedCtx) {
    if (typeof OffscreenCanvas !== "undefined") {
      sharedCtx = new OffscreenCanvas(1, 1).getContext("2d")!;
    } else {
      sharedCtx = document.createElement("canvas").getContext("2d")!;
    }
  }
  return sharedCtx;
}

export function getOrMeasureWidth(
  token: string,
  fontKey: string,
  fontString: string,
): number {
  // 폰트 미로드 시 캐싱 스킵 (fallback 폰트 결과 캐시 방지)
  if (!fontsReady) {
    const ctx = getCtx();
    ctx.font = fontString;
    return ctx.measureText(token).width;
  }

  let cache = segmentCaches.get(fontKey);
  if (!cache) {
    cache = new Map();
    segmentCaches.set(fontKey, cache);
  }
  const cached = cache.get(token);
  if (cached !== undefined) return cached;

  const ctx = getCtx();
  ctx.font = fontString;
  const width = ctx.measureText(token).width;
  cache.set(token, width);
  return width;
}

export function clearSegmentCaches(): void {
  segmentCaches.clear();
}
```

**fontKey 생성**: 기존 `buildWidthCacheKey()`에서 텍스트 부분을 제외한 스타일 키.

```typescript
export function buildFontKey(style: TextMeasureStyle): string {
  return [
    style.fontSize,
    style.fontFamily,
    style.fontWeight ?? 400,
    style.fontStyle ?? 0,
    style.fontVariant ?? "",
    style.fontStretch ?? "",
  ].join("\0");
}

export function buildFontString(style: TextMeasureStyle): string {
  const fs =
    style.fontStyle === 1 || style.fontStyle === "italic"
      ? "italic "
      : style.fontStyle === 2 || style.fontStyle === "oblique"
        ? "oblique "
        : "";
  return `${fs}${style.fontWeight ?? 400} ${style.fontSize}px ${style.fontFamily}`;
}
```

### 3. Greedy Line-Breaking (Pending Space 패턴)

```typescript
export interface ComputedLines {
  lineCount: number;
  lines: string[][];
  maxLineWidth: number;
}

export function computeLines(
  tokens: Token[],
  widths: number[],
  maxWidth: number,
  overflowWrap: string,
  fontKey: string,
  fontString: string,
): ComputedLines {
  const lines: string[][] = [[]];
  let lineW = 0;
  let maxLineW = 0;
  let pendingSpace = 0; // CSS trailing whitespace = hangable

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const w = widths[i];

    if (!token.breakable) {
      // 공백 → 보류 (lineW에 즉시 더하지 않음)
      pendingSpace = w;
      lines[lines.length - 1].push(token.text);
      continue;
    }

    if (lineW > 0 && lineW + pendingSpace + w > maxWidth) {
      // overflow-wrap: break-word — maxWidth 초과 단어 grapheme 분할
      if (overflowWrap === "break-word" && w > maxWidth) {
        maxLineW = Math.max(maxLineW, lineW);
        lines.push([]);
        lineW = 0;
        pendingSpace = 0;
        const graphemes = Array.from(token.text);
        for (const g of graphemes) {
          const gw = getOrMeasureWidth(g, fontKey, fontString);
          if (lineW > 0 && lineW + gw > maxWidth) {
            maxLineW = Math.max(maxLineW, lineW);
            lines.push([]);
            lineW = 0;
          }
          lines[lines.length - 1].push(g);
          lineW += gw;
        }
        continue;
      }
      // 새 줄 → 보류된 공백 폐기 (CSS: trailing space hang)
      maxLineW = Math.max(maxLineW, lineW);
      lines.push([]);
      lineW = w;
      pendingSpace = 0;
    } else {
      // 같은 줄 → 보류된 공백 확정
      lineW += pendingSpace + w;
      pendingSpace = 0;
    }
    lines[lines.length - 1].push(token.text);
  }
  maxLineW = Math.max(maxLineW, lineW);
  return { lineCount: lines.length, lines, maxLineWidth: maxLineW };
}

export function buildHintedText(lines: string[][]): string {
  return lines.map((line) => line.join("")).join("\n");
}
```

---

## 수정 파일 상세

### Phase A: 측정 경로 교체

**`textMeasure.ts`**:

- `TextMeasureStyle`에 `whiteSpace?` 추가
- `Canvas2DTextMeasurer.measureWrapped()` 내부에서 `canvas2dSegmentCache` 유틸 사용으로 확장

**`canvaskitTextMeasurer.ts`**:

```typescript
// measureWrapped() 내부 분기
measureWrapped(text, style, maxWidth) {
  if (!needsFallback(style)) {
    const tokens = tokenize(text, style.wordBreak ?? "normal");
    const fontKey = buildFontKey(style);
    const fontString = buildFontString(style);
    const widths = tokens.map((t) => getOrMeasureWidth(t.text, fontKey, fontString));
    const result = computeLines(tokens, widths, maxWidth, style.overflowWrap ?? "normal", fontKey, fontString);
    const lineHeight = style.lineHeight ?? style.fontSize * 1.2;
    return {
      width: result.maxLineWidth,
      height: result.lineCount * Math.max(lineHeight, style.fontSize * 1.2),
    };
  }
  // 기존 CanvasKit Paragraph 경로 (변경 없음)
  ...
}
```

**`textWrapUtils.ts`**:

- `cssNormalBreakProcess()` 내부의 단어 측정을 `getOrMeasureWidth()` 호출로 교체
- `measureTokenWidth()`, `measureSpaceWidth()`를 Canvas 2D 캐시 경유로 변경

### Phase B: Step 4.5 가속

**`engines/utils.ts`** (`enrichWithIntrinsicSize`):

- `needsFallback()` false 시 `computeLines()` 직접 호출
- 캐시된 세그먼트 폭 재사용 → WASM 호출 0

**`fullTreeLayout.ts`** (Step 4.5):

- width 변경 시 `computeLines(tokens, cachedWidths, newMaxWidth)` 재호출
- 토큰화 + 폭 측정은 1차 패스에서 완료 → 2차 패스는 순수 산술만

### Phase C: Break Hint Injection

**`nodeRendererText.ts`** (L296-370):

```typescript
if (!needsFallback(style)) {
  const tokens = tokenize(processedText, wordBreak);
  const fontKey = buildFontKey(textStyle);
  const fontString = buildFontString(textStyle);
  const widths = tokens.map((t) =>
    getOrMeasureWidth(t.text, fontKey, fontString),
  );
  const { lines } = computeLines(
    tokens,
    widths,
    layoutMaxWidth,
    overflowWrap,
    fontKey,
    fontString,
  );
  const hintedText = buildHintedText(lines);

  // hintedText를 processedText로 사용 → 기존 캐시 키에 자연 반영
  processedText = hintedText;
  effectiveLayoutWidth = layoutMaxWidth;
  // 기존 word-break 분기 스킵 → Break Hint가 줄바꿈을 결정
} else {
  // 기존 CanvasKit 경로 (변경 없음)
}
```

기존 `cssNormalBreakProcess()`도 동일한 `\n` hard break 메커니즘 사용 (검증된 패턴).

Paragraph 캐시 키(L114-136)의 `processedText` 필드에 `hintedText`가 자연스럽게 반영됨.

---

## Phase 구성

| Phase | 내용                                                                  | 기간  | 배포 플래그                | 되돌림                    |
| ----- | --------------------------------------------------------------------- | :---: | -------------------------- | ------------------------- |
| **0** | Canvas 2D vs CSS 정합도 벤치마크 (100+ 텍스트)                        |  1일  | —                          | 데이터만                  |
| **A** | `canvas2dSegmentCache` + `needsFallback` 분기 → `measureWrapped` 교체 | 2~3일 | `USE_CANVAS2D_MEASURE`     | 플래그 off                |
| **B** | Step 4.5 re-enrich 가속 (캐시된 폭으로 `computeLines` 직접 호출)      | 1~2일 | Phase A 플래그 공유        | Phase A 원복 시 동시 원복 |
| **C** | `nodeRendererText.ts` Break Hint Injection                            | 2~3일 | `USE_CANVAS2D_BREAK_HINTS` | 플래그 off                |

---

## 검증 기준

### Phase 0 Go/No-Go

- [ ] Canvas 2D `measureText()` vs CSS DOM width ≤ 1px (라틴 50 + CJK 30 + 혼합 20문장)
- [ ] `Intl.Segmenter` CJK 분할 vs CSS 줄바꿈 일치 (한중일 50문장)
- [ ] Canvas 2D + WebGL(CanvasKit) 공존 확인 (별도 canvas element)
- [ ] 세그먼트 캐시 500 토큰 warm 후 `computeLines()` ≤ 0.1ms
- [ ] Break Hint `\n` 삽입 후 CanvasKit `drawParagraph()` 정상 렌더링

### Phase A 완료

- [ ] `USE_CANVAS2D_MEASURE` 플래그 on/off A/B 비교
- [ ] 기존 프로젝트 시각 회귀 0건 (스크린샷 diff)
- [ ] 500 텍스트 리사이즈 벤치마크 (목표: Phase 0 실측 기반)

### Phase C 완료

- [ ] CSS Preview vs Canvas 스크린샷 diff (100개 텍스트)
- [ ] 렌더 CPU 15% 이상 악화 시 플래그 비활성화

---

## 리스크 상세

| Risk                           | 심각도 | 내용                                                              | 완화                                             |
| ------------------------------ | ------ | ----------------------------------------------------------------- | ------------------------------------------------ |
| Canvas 2D vs CSS 서브픽셀 차이 | MEDIUM | `measureText().width`와 DOM `offsetWidth` 반올림 차이 ~0.01-0.5px | Phase 0 실측, 1px 초과 시 해당 패턴 fallback     |
| CJK `Intl.Segmenter` 정확도    | MEDIUM | 한국어 형태소 경계 vs CSS 줄바꿈 위치 차이                        | Phase 0 검증, 불일치 시 CJK grapheme 분할로 보완 |
| 커닝 컨텍스트 변화             | MEDIUM | 단어 개별 측정 → 경계 커닝 미반영 → 누적 오차                     | Phase 0 오차 규모 실측, 누적 substring 측정 옵션 |
| Break Hint 후 multi-line 보정  | MEDIUM | `\n` 삽입 후 `getMaxIntrinsicWidth()` 동작 변경                   | Phase C에서 E2E 비교 테스트                      |
| 폰트 미로드 상태 캐싱          | HIGH   | fallback 폰트로 측정 → 잘못된 캐시                                | `document.fonts.ready` 체크 + 캐시 클리어        |
| 세그먼트 캐시 메모리           | LOW    | 폰트 10 × 토큰 500 = 5,000 entries ~640KB                         | 상한 설정 또는 LRU                               |

---

## 기대 효과

| 측면                  | 현재 (CanvasKit) | 적용 후                       |
| --------------------- | ---------------- | ----------------------------- |
| CSS↔Canvas 정합성     | ~90%             | ~98% (동일 엔진, ~90% 텍스트) |
| 리사이즈 (500 텍스트) | ~85ms            | ~5ms (추정)                   |
| Step 4.5 re-enrich    | ~65ms            | ~1ms (추정)                   |
| 외부 의존             | —                | 0                             |
| 번들 추가             | —                | ~2KB                          |
| 코드 레퍼런스         | —                | Pretext 소스 5개 파일         |

---

## Pretext 레퍼런스 매핑

| Pretext 원리                      | XStudio 적용                             | 파일                    |
| --------------------------------- | ---------------------------------------- | ----------------------- |
| 2-Phase 분리 (prepare/layout)     | 세그먼트 캐시 warm / computeLines 재호출 | canvas2dSegmentCache.ts |
| SoA (Structure of Arrays)         | `Map<fontKey, Map<token, width>>`        | canvas2dSegmentCache.ts |
| Lazy computation (graphemeWidths) | break-word 시에만 grapheme 분할          | computeLines()          |
| Greedy line-breaking              | Pending Space 패턴 + 선형 주행           | computeLines()          |
| EngineProfile (브라우저 shim)     | 미구현 (Phase E 후보)                    | —                       |
| Kinsoku (일본어 금칙)             | 미구현 (Phase E 후보)                    | —                       |
| 이모지 보정                       | 미구현 (Phase E 후보)                    | —                       |
