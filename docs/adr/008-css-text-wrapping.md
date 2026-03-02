# ADR-008: CSS 텍스트 래핑 속성 체계적 지원

## Status
Proposed

## Date
2026-03-02

## Decision Makers
XStudio Team

---

## Executive Summary

CanvasKit 0.40 ParagraphStyle에 `wordBreak`/`breakStrategy` API가 존재하지 않아 CSS 텍스트 래핑 속성(`white-space`, `word-break`, `overflow-wrap`, `text-overflow`, `overflow`)을 **`paragraph.layout(width)`의 width 파라미터 조절**로 에뮬레이션한다. 인스펙터에는 **Preset 기반 UI**를 제공하여 사용자가 복잡한 속성 조합을 직관적으로 선택할 수 있게 한다.

### 발견 경위

`word-break: normal` 에뮬레이션 작업 중, CanvasKit HarfBuzz가 CSS 표준과 다르게 단어 내부에서 문자 단위 분할을 수행하는 문제를 발견. 조사 결과 5개 텍스트 래핑 속성이 렌더러/측정기/인스펙터 간에 비대칭적으로 구현되어 있고, 사용자가 이를 제어할 UI가 없음을 확인.

### 현재 구현 현황

| 속성 | Skia 렌더러 | 측정기 | 인스펙터 |
|------|------------|--------|----------|
| `white-space` | ✅ `nowrap`→단일행, `pre-wrap`→개행 보존 | ✅ `measureTextWithWhiteSpace()` | ❌ |
| `word-break` | ⚠️ `normal` 에뮬레이션만 (ADR-008 선행 작업) | ⚠️ `normal` 에뮬레이션만 | ❌ |
| `overflow-wrap` | ⚠️ `normal` 에뮬레이션만 | ⚠️ `normal` 에뮬레이션만 | ❌ |
| `text-overflow` | ✅ `ellipsis` → CanvasKit `maxLines:1` + `ellipsis:'...'` | ❌ (높이 측정 미반영) | ❌ |
| `overflow` | ❌ (클리핑 없음) | ❌ | ❌ |

---

## Context

### CanvasKit ParagraphStyle API 제약

CanvasKit 0.40의 `ParagraphStyle` / `TextStyle`은 다음 속성만 제공:

```
fontSize, fontFamilies, fontStyle (weight/slant/width),
letterSpacing, wordSpacing, heightMultiplier, halfLeading,
maxLines, ellipsis, textAlign, textDirection, fontFeatures
```

**미제공**: `wordBreak`, `overflowWrap`, `breakStrategy`, `lineBreakStyle`

Skia 소스(`TextWrapper.cpp`)에도 breakStrategy enum이 구현되어 있지 않음 (TODO 주석만 존재). CanvasKit의 기본 줄바꿈 동작은 CSS `overflow-wrap: break-word`에 해당 — 단어가 컨테이너보다 넓으면 글리프 위치에서 분할.

### CSS 텍스트 래핑 속성 상호작용

```
┌─────────────────────────────────────────────────────┐
│ white-space: 줄바꿈 허용 여부 + 공백 처리            │
│   ├─ normal: 줄바꿈 허용, 연속 공백 축소             │
│   ├─ nowrap: 줄바꿈 금지                             │
│   └─ pre-wrap: 줄바꿈 허용, 공백 보존                │
│                                                      │
│ word-break: 단어 내부 줄바꿈 규칙                    │
│   ├─ normal: 단어 경계에서만 분할                    │
│   ├─ break-all: 모든 문자 사이에서 분할 가능         │
│   └─ keep-all: CJK 문자 사이에서도 분할 금지         │
│                                                      │
│ overflow-wrap: 넘침 시 단어 분할 허용                │
│   ├─ normal: 넘침 허용                               │
│   ├─ break-word: 넘침 시 단어 내 분할                │
│   └─ anywhere: break-word + min-content 영향          │
│                                                      │
│ text-overflow: 넘침 텍스트 표시 방식                  │
│   └─ ellipsis: "..." 표시 (overflow:hidden 필수)      │
│                                                      │
│ overflow: 넘침 컨텐츠 처리                            │
│   ├─ visible: 넘침 표시 (기본)                        │
│   └─ hidden/clip: 넘침 클리핑                         │
└─────────────────────────────────────────────────────┘
```

---

## Decision

### 핵심 전략: Layout Width 조절 에뮬레이션

CanvasKit `paragraph.layout(width)`의 `width` 파라미터를 CSS 속성 조합에 따라 조절하여 표준 동작을 에뮬레이션한다.

### 에뮬레이션 조합 테이블

| word-break | overflow-wrap | effectiveLayoutWidth | 이유 |
|-----------|--------------|---------------------|------|
| `normal` | `normal` | `max(maxWidth, ceil(maxWordWidth))` | 단어 내 분할 방지, 넘침 허용 |
| `normal` | `break-word` / `anywhere` | `maxWidth` | CanvasKit 기본 동작 = break-word |
| `break-all` | (any) | `maxWidth` | CanvasKit 기본 동작 = break-all |
| `keep-all` | `normal` | `max(maxWidth, ceil(maxWordWidth_keepall))` | CJK 연속도 하나의 단어로 취급 |
| `keep-all` | `break-word` | 넘침 시 `maxWidth`, 아니면 keep-all | 하이브리드 |

> **부동소수점 정밀도**: `getMaxIntrinsicWidth()`와 `paragraph.layout()` 사이의 미세 차이로 동일 너비에서도 줄바꿈이 발생할 수 있다. `Math.ceil()`로 1px 버퍼를 확보하여 이를 방지한다. (선행 작업에서 검증 완료)

### keep-all CJK 판별 범위

css-line-break 라이브러리(UAX #14)의 패턴을 확장하여 CJK 전체 범위를 커버한다:

```
CJK Unified Ideographs:   U+4E00 ~ U+9FFF  (한자)
CJK Extension A:           U+3400 ~ U+4DBF
Korean Hangul Syllables:   U+AC00 ~ U+D7AF  (한글)
Japanese Hiragana:         U+3040 ~ U+309F
Japanese Katakana:         U+30A0 ~ U+30FF
CJK Compatibility:         U+F900 ~ U+FAFF
```

### 인스펙터 Preset UI

복잡한 속성 조합을 직관적 프리셋으로 제공:

| 프리셋 | white-space | word-break | overflow-wrap | text-overflow | overflow |
|--------|-----------|-----------|--------------|--------------|---------|
| Normal | — | — | — | — | — |
| No Wrap | `nowrap` | — | — | — | — |
| Truncate (...) | `nowrap` | — | — | `ellipsis` | `hidden` |
| Break Words | — | — | `break-word` | — | — |
| Break All | — | `break-all` | — | — | — |
| Keep All (CJK) | — | `keep-all` | `break-word` | — | — |
| Preserve | `pre-wrap` | — | — | — | — |
| Custom | (개별) | (개별) | (개별) | (개별) | (개별) |

"Custom" 선택 시 5개 개별 PropertySelect를 펼쳐 세밀한 제어를 허용한다.

---

## Implementation Phases

### Phase 1: CanvasKit 에뮬레이션 완성

**범위**: 렌더러 + 측정기에 `word-break` × `overflow-wrap` 전체 조합 분기 구현

| 파일 | 변경 |
|------|------|
| `workspace/canvas/utils/textMeasure.ts` | `TextMeasureStyle`에 `wordBreak`, `overflowWrap` 추가 |
| `workspace/canvas/utils/canvaskitTextMeasurer.ts` | `measureWrapped()` 조합별 분기 + `keep-all` 로직 |
| `workspace/canvas/skia/nodeRenderers.ts` | `effectiveLayoutWidth` 조합별 분기 + `keep-all` 헬퍼 |
| `workspace/canvas/layout/engines/utils.ts` | `measureTextWithWhiteSpace` 시그니처 확장, 호출 체인 관통 |

**측정 체인 관통 경로**:
```
calculateContentHeight()
  → measureTextWithWhiteSpace(text, fontSize, fontFamily, fontWeight, whiteSpace, maxWidth, wordBreak, overflowWrap)
    → measureWrappedTextHeight()
      → getTextMeasurer().measureWrapped(text, style{wordBreak, overflowWrap}, maxWidth)
```

> **참고**: `LAYOUT_AFFECTING_PROPS`에 `'style'`이 이미 포함 → `style.wordBreak` 등 변경 시 `layoutVersion` 자동 증가 (추가 등록 불필요)

### Phase 2: 인스펙터 UI

**범위**: Typography 섹션에 Text Behavior Preset 컨트롤 추가

| 파일 | 변경 |
|------|------|
| `panels/styles/atoms/styleAtoms.ts` | 5개 atom + `typographyValuesAtom` 확장 |
| `panels/styles/hooks/useTypographyValuesJotai.ts` | 인터페이스 + `deriveTextBehaviorPreset()` |
| `panels/styles/sections/TypographySection.tsx` | Text Behavior PropertySelect UI |

### Phase 3: 텍스트 overflow 클리핑

**범위**: `overflow: hidden` 시 CanvasKit `clipRect` 적용

| 파일 | 변경 |
|------|------|
| `workspace/canvas/sprites/TextSprite.tsx` | `overflow → clipText` SkiaNodeData 전달 |
| `workspace/canvas/skia/nodeRenderers.ts` | `clipText` 시 `canvas.clipRect()` 적용 |

> `text-overflow: ellipsis`는 CanvasKit의 `maxLines:1` + `ellipsis:'...'`로 이미 처리되므로 clip 불필요.

---

## Alternatives Considered

### 1. CanvasKit 포크 (Rejected)
- Skia `TextWrapper.cpp`에 `breakStrategy` 추가
- 유지보수 부담이 너무 크고, CanvasKit WASM 빌드 파이프라인 구축 필요

### 2. JavaScript 수동 줄 분할 (Rejected)
- HarfBuzz shaping 전에 텍스트를 수동으로 분할하여 여러 paragraph 생성
- 커닝, ligature 등 고급 OpenType 기능과 충돌 위험

### 3. 프리셋 없이 개별 속성만 노출 (Rejected)
- 5개 속성 각각의 PropertySelect → 사용자가 유효하지 않은 조합 선택 가능
- 프리셋은 가장 일반적인 시나리오를 1클릭으로 해결하면서 Custom 모드로 전문가 접근도 허용

---

## Consequences

### Positive
- CSS 표준과 일치하는 텍스트 래핑 동작으로 WebGL Canvas ↔ Preview 시각적 일관성 확보
- 사용자가 텍스트 넘침 제어 가능 (현재는 코드 수정 외 방법 없음)
- `keep-all`으로 CJK 텍스트 자연스러운 줄바꿈 지원

### Negative
- `keep-all` 에뮬레이션은 단어별 paragraph 생성으로 텍스트가 길수록 성능 비용 증가
- CanvasKit이 향후 `breakStrategy` API를 추가하면 에뮬레이션 코드를 네이티브로 전환 필요

### Risks
- CanvasKit 버전 업그레이드 시 기본 줄바꿈 동작이 변경될 수 있음 → 에뮬레이션 테이블 재검증 필요

---

## External Research

### css-line-break (niklasvh/css-line-break)
- UAX #14 (Unicode Line Breaking Algorithm) 구현
- `break-all`: AL/NU/SA 문자 클래스를 ID(Ideographic)로 재매핑 → 모든 위치에서 줄바꿈 허용
- `keep-all`: CJK 코드포인트 범위에서 forbidden breakpoints 생성
- **반영**: CanvasKit 기본 동작이 break-all 재매핑과 동일함을 확인, keep-all CJK 범위를 확장

### Skia TextWrapper (skparagraph/src/TextWrapper.cpp)
- 클러스터 기반 분할: `fTooLongWord` 플래그로 넘침 단어 글리프 위치 분할
- breakStrategy enum 미구현 (TODO 주석만 존재)
- **반영**: CanvasKit의 문자 단위 분할이 break-all/break-word 에뮬레이션에 적합함을 코드 레벨에서 확인

### Figma
- 커스텀 캔버스 렌더러 사용, word-break/overflow-wrap 직접 제어 옵션 미제공
- **반영**: 유사 제약 환경에서 프리셋 기반 접근이 합리적임을 확인

---

## References

- [CanvasKit ParagraphStyle API](https://skia.org/docs/user/modules/canvaskit/#paragraph)
- [CSS Text Module Level 3](https://www.w3.org/TR/css-text-3/)
- [css-line-break](https://github.com/niklasvh/css-line-break) — UAX #14 구현
- [Skia TextWrapper.cpp](https://skia.googlesource.com/skia/+/refs/heads/main/modules/skparagraph/src/TextWrapper.cpp)
- [foliojs/linebreak](https://github.com/foliojs/linebreak) — UAX #14 순수 구현
- ADR-006 P4: word-break:normal 에뮬레이션 (선행 작업)
