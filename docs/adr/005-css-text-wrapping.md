# ADR-005: CSS 텍스트 래핑 속성 체계적 지원

## Status
**Implemented** (Phase 1~3 완료, 2026-03-03)

> Phase 1(CanvasKit 에뮬레이션), Phase 2(인스펙터 UI), Phase 3(overflow 클리핑) 모두 구현 완료.

## Date
2026-03-02

## Decision Makers
XStudio Team

---

## Executive Summary

CanvasKit 0.40 ParagraphStyle에 `wordBreak`/`breakStrategy` API가 존재하지 않아 CSS 텍스트 래핑 속성(`white-space`, `word-break`, `overflow-wrap`, `text-overflow`, `overflow`)을 **`paragraph.layout(width)`의 width 파라미터 조절**로 에뮬레이션한다. 인스펙터에는 **Preset 기반 UI**를 제공하여 사용자가 복잡한 속성 조합을 직관적으로 선택할 수 있게 한다.

### 발견 경위

`word-break: normal` 에뮬레이션 작업 중, CanvasKit HarfBuzz가 CSS 표준과 다르게 단어 내부에서 문자 단위 분할을 수행하는 문제를 발견. 조사 결과 5개 텍스트 래핑 속성이 렌더러/측정기/인스펙터 간에 비대칭적으로 구현되어 있고, 사용자가 이를 제어할 UI가 없음을 확인.

### 구현 현황 (최종)

| 속성 | Skia 렌더러 | 측정기 | 인스펙터 |
|------|------------|--------|----------|
| `white-space` | ✅ `nowrap`→단일행, `pre-wrap`→개행 보존 | ✅ `measureTextWithWhiteSpace()` | ✅ Preset UI |
| `word-break` | ✅ `normal`/`break-all`/`keep-all` 전체 조합 | ✅ `textWrapUtils.ts` 공유 로직 | ✅ Preset UI |
| `overflow-wrap` | ✅ `normal`/`break-word`/`anywhere` 전체 조합 | ✅ `textWrapUtils.ts` 공유 로직 | ✅ Preset UI |
| `text-overflow` | ✅ `ellipsis` → `maxLines:1` + `ellipsis:'…'` (3중 조건) | ✅ 높이 측정 반영 | ✅ Preset UI |
| `overflow` | ✅ `hidden`/`clip` → `canvas.clipRect()` 적용 | ✅ `clipText` 플래그 연동 | ✅ Preset UI |

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

Skia 소스(`TextWrapper.cpp`)에도 breakStrategy enum이 구현되어 있지 않음 (TODO 주석만 존재).

#### CanvasKit 기본 줄바꿈 동작 정의

CanvasKit의 기본 줄바꿈은 CSS `overflow-wrap: break-word`에 해당한다:

1. **단어 경계(공백) 우선**: 단어가 현재 라인에 들어가면 단어 경계에서만 줄바꿈
2. **넘침 시 문자 분할**: 단일 단어가 `maxWidth`보다 넓으면 글리프/클러스터 위치에서 분할

이것은 `word-break: break-all`과 **다르다**:
- `break-all`: 단어 넘침 여부와 무관하게 모든 문자 경계에서 줄바꿈 가능 (라인을 빈틈없이 채움)
- CanvasKit 기본: 단어가 넘칠 때**만** 문자 경계에서 분할 (단어가 들어가면 보존)

> **예시**: "Hello World", maxWidth=70px (Hello=50px, World=50px)
> - CanvasKit 기본 (= break-word): `Hello` / `World` (단어 경계에서 분할)
> - CSS break-all: `Hello W` / `orld` (문자 경계에서 라인을 최대한 채움)

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
│   ├─ normal: 넘침 허용 (분할 안 함)                  │
│   ├─ break-word: 넘침 시 단어 내 분할                │
│   └─ anywhere: break-word와 동일 분할 +              │
│      min-content 계산 시 문자 단위로 축소             │
│                                                      │
│ text-overflow: 넘침 텍스트 표시 방식                  │
│   └─ ellipsis: "..." 표시                             │
│      ⚠️ XStudio 전제조건: overflow:hidden 또는 clip + nowrap 필수 │
│                                                      │
│ overflow: 넘침 컨텐츠 처리                            │
│   ├─ visible: 넘침 표시 (기본)                        │
│   └─ hidden/clip: 넘침 클리핑                         │
└─────────────────────────────────────────────────────┘
```

### overflow-wrap: anywhere vs break-word 차이

CSS 사양에서 `anywhere`와 `break-word`는 줄바꿈 동작은 동일하지만, **min-content 계산**이 다르다:

- `break-word`: min-content = 가장 긴 단어 너비 (현재 `calculateMinContentWidth()` 동작)
- `anywhere`: min-content = 가장 넓은 단일 문자 너비 (모든 문자가 분할 단위)

현재 `calculateMinContentWidth()`(`apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts:2244`)는 longest-word 기반이므로, `anywhere`를 지원하면 flex/grid 컨테이너의 min-content 크기 계산이 Preview CSS와 불일치할 수 있다.

---

## Decision

### 핵심 전략: Layout Width 조절 에뮬레이션

CanvasKit `paragraph.layout(width)`의 `width` 파라미터를 CSS 속성 조합에 따라 조절하여 표준 동작을 에뮬레이션한다.

### 에뮬레이션 조합 테이블

| word-break | overflow-wrap | effectiveLayoutWidth | 에뮬레이션 방식 | 정확도 |
|-----------|--------------|---------------------|----------------|--------|
| `normal` | `normal` | `max(maxWidth, ceil(maxWordWidth))` | 단어 너비 하한 적용 | **정확** (구현 완료) |
| `normal` | `break-word` | `maxWidth` | CanvasKit 기본 동작 = break-word | **정확** |
| `normal` | `anywhere` | `maxWidth` | break-word로 다운그레이드 (아래 참고) | **근사** |
| `break-all` | (any) | `maxWidth` + ZWS 삽입 | 모든 문자 사이에 U+200B 삽입 | **근사** |
| `keep-all` | `normal` | `max(maxWidth, ceil(maxWordWidth_keepall))` | 공백에서만 분할, CJK 연속 보호 | **정확** |
| `keep-all` | `break-word` | 넘침 시 `maxWidth`, 아니면 keep-all | 하이브리드 | **정확** |

> **부동소수점 정밀도**: `getMaxIntrinsicWidth()`와 `paragraph.layout()` 사이의 미세 차이로 동일 너비에서도 줄바꿈이 발생할 수 있다. `Math.ceil()`로 1px 버퍼를 확보하여 이를 방지한다. (선행 작업에서 검증 완료)

#### overflow-wrap: anywhere 처리 방침

v1에서 `anywhere`는 줄바꿈 동작을 `break-word`와 동일하게 처리한다. CSS 사양상 줄바꿈 위치 결정은 동일하며, 차이는 `min-content` 계산뿐이다.

**min-content 차이는 의도적으로 지연한다:**
- 현재 `calculateMinContentWidth()`는 longest-word 기반 (break-word 의미론)
- `anywhere`의 min-content(가장 넓은 단일 문자)는 flex/grid shrink 시에만 차이 발생
- `enrichWithIntrinsicSize()`(`utils.ts:1837`)에서 `min-content` 계산 시 `overflowWrap` 파라미터를 추가로 전달하면 구현 가능하나, 우선순위 낮음
- **향후**: `calculateMinContentWidth(text, fontSize, fontFamily, fontWeight, overflowWrap?)` 확장으로 문자 단위 min-content 지원

#### break-all 에뮬레이션 방식

CanvasKit 기본 동작은 단어 경계 우선 분할(= break-word)이므로, `break-all`은 `maxWidth` 전달만으로는 정확히 에뮬레이션되지 않는다.

**ZWS(Zero-Width Space, U+200B) 삽입 방식**:
- 텍스트의 모든 코드포인트 사이에 `U+200B`를 삽입하여 모든 위치를 줄바꿈 가능 지점으로 만듦
- **코드포인트 단위 분할 (준-안전)**: `Array.from(text).join('\u200B')` 사용 (서로게이트 페어 보존)
  - `text.split('')`은 UTF-16 code unit 기준이라 서로게이트 페어(이모지, CJK Extension B 등)를 분리하므로 **사용 금지**
  - 결합 문자(e.g., 한글 자모 결합, diacritics)는 코드포인트 단위에서도 분리될 수 있으나, UI 빌더의 일반 텍스트에서는 발생 빈도가 극히 낮아 허용
  - 향후 정확한 서기소(grapheme) 단위가 필요하면 `Intl.Segmenter(undefined, { granularity: 'grapheme' })`로 업그레이드 가능
- CanvasKit은 ZWS를 줄바꿈 가능 지점으로 인식하므로, 라인을 빈틈없이 채우는 break-all 동작 달성
- **삽입 위치**: paragraph 빌드 전 텍스트 전처리 단계에서 수행
  - `canvaskitTextMeasurer.measureWrapped()`: `builder.addText(text)` 전에 ZWS 삽입
  - `nodeRenderers.renderText()`: `builder.addText(processedText)` 전에 ZWS 삽입
  - `effectiveLayoutWidth` 계산은 `maxWidth` 그대로 사용 (ZWS가 분할 지점을 만들므로 width 조절 불필요)
- **캐시 영향**: nodeRenderers의 paragraph 캐시 키에 `processedText` + `wordBreak`가 이미 포함(`nodeRenderers.ts:1201, 1219`)되어 있으므로, ZWS 삽입 텍스트와 원본은 자동으로 캐시 분리됨. `wordBreak` 변경 시 캐시 무효화도 정상 동작.
- **한계**: 커닝/ligature에 미세한 영향 가능 (대부분의 UI 텍스트에서는 무시 가능)

### keep-all CJK 판별 범위

css-line-break 라이브러리(UAX #14)의 패턴을 참고하여 주요 CJK 블록을 커버한다.
의도적으로 빈도가 높은 6개 블록으로 제한하며, 희소 블록(CJK Extension B~H, 이두 등)은 제외한다:

```
CJK Unified Ideographs:   U+4E00 ~ U+9FFF  (한자 기본, ~20,992자)
CJK Extension A:           U+3400 ~ U+4DBF  (한자 확장A, ~6,592자)
Korean Hangul Syllables:   U+AC00 ~ U+D7AF  (한글 음절, ~11,172자)
Japanese Hiragana:         U+3040 ~ U+309F  (히라가나, 96자)
Japanese Katakana:         U+30A0 ~ U+30FF  (카타카나, 96자)
CJK Compatibility:         U+F900 ~ U+FAFF  (호환 한자, ~512자)
```

**제외된 범위** (향후 필요 시 확장):
- CJK Extension B~H (`U+20000~U+3134F`): 서로게이트 페어 처리 필요, 일상 텍스트 빈도 극히 낮음
- Hangul Jamo (`U+1100~U+11FF`): 조합형 자모, 완성형(`U+AC00~`)으로 대부분 커버됨
- CJK Symbols/Punctuation (`U+3000~U+303F`): 줄바꿈 허용이 더 자연스러움

### text-overflow: ellipsis CSS 전제조건

CSS 사양에서 `text-overflow: ellipsis`는 다음 조건이 모두 충족될 때만 동작한다:
1. `overflow: hidden` 또는 `clip` (XStudio에서 지원하는 범위, `scroll`/`auto`는 캔버스 렌더러 미지원)
2. `white-space: nowrap` (또는 텍스트가 단일 행으로 제한)

**XStudio 정책: CSS 엄격 모드**
- **Preset 모드**: "Truncate (...)" 프리셋이 `nowrap + ellipsis + overflow:hidden`을 일괄 설정하므로 항상 유효
- **Custom 모드**: 사용자가 임의 조합을 선택할 수 있음. `ellipsis`가 설정되었으나 전제조건 미충족 시:
  - 렌더러: `isEllipsis` 플래그는 `textOverflow === 'ellipsis'`로만 판단 (`nodeRenderers.ts:1195`) — CanvasKit `maxLines:1 + ellipsis:'...'`은 white-space와 무관하게 동작하므로 **시각적 불일치 가능**
  - **수정 (2단계 강화)**:
    - **Phase 1**: `isEllipsis = textOverflow === 'ellipsis' && whiteSpace === 'nowrap'` — `whiteSpace`는 이미 `node.text`에 존재하므로 즉시 적용 가능
    - **Phase 3**: `isEllipsis = textOverflow === 'ellipsis' && whiteSpace === 'nowrap' && node.text.clipText` — Phase 3에서 `clipText`(overflow:hidden/clip)가 SkiaNodeData에 추가된 후 완성
    - 이 2단계 분리는 `overflow` 값이 Phase 3 전까지 SkiaNodeData.text에 전달되지 않기 때문에 필요
- **인스펙터 경고**: Custom 모드에서 ellipsis 선택 시 overflow/nowrap 미설정이면 UI 힌트 표시 (향후)

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

> 모든 파일 경로는 `apps/builder/src/builder/` 기준

### Phase 1: CanvasKit 에뮬레이션 완성 ✅

**범위**: 렌더러 + 측정기에 `word-break` × `overflow-wrap` 전체 조합 분기 구현

| 파일 (apps/builder/src/builder/) | 변경 |
|------|------|
| `workspace/canvas/utils/textWrapUtils.ts` | **신규** — 공유 에뮬레이션 유틸: `cssNormalBreakProcess`, `computeKeepAllWidth`, `preprocessBreakWordText`, `measureTokenWidth`, `measureSpaceWidth` |
| `workspace/canvas/utils/textMeasure.ts` | `TextMeasureStyle`에 `wordBreak`, `overflowWrap` 추가 |
| `workspace/canvas/utils/canvaskitTextMeasurer.ts` | `measureWrapped()` 조합별 분기 — textWrapUtils 공유 함수 호출 |
| `workspace/canvas/skia/nodeRenderers.ts` | `effectiveLayoutWidth` 조합별 분기 — textWrapUtils 공유 함수 호출 + `isEllipsis` 3중 조건(`&& whiteSpace === 'nowrap' && !!clipText`) |
| `workspace/canvas/layout/engines/utils.ts` | `measureTextWithWhiteSpace` 시그니처 확장 (`wordBreak`, `overflowWrap` 추가), 호출 체인 관통 |
| `workspace/canvas/layout/engines/cssResolver.ts` | `wordBreak`, `overflowWrap`, `whiteSpace`를 상속 속성(INHERITED_PROPERTIES)에 등록 + ComputedStyle 인터페이스 + ROOT_COMPUTED_STYLE 초기값 |
| `stores/elements.ts` | `INHERITED_LAYOUT_PROPS`에 `whiteSpace`, `wordBreak`, `overflowWrap` 추가 (dirty tracking) |
| `stores/utils/elementUpdate.ts` | `INHERITED_LAYOUT_PROPS_UPDATE`에 동일 3개 속성 추가 (순환 import 방지용 독립 복사본) |

**측정 체인 관통 경로**:
```
calculateContentHeight()  (utils.ts)
  → measureTextWithWhiteSpace(text, fontSize, fontFamily, fontWeight, whiteSpace, maxWidth, wordBreak, overflowWrap)  (utils.ts)
    → measureWrappedTextHeight()  (textMeasure.ts)
      → getTextMeasurer().measureWrapped(text, style{wordBreak, overflowWrap}, maxWidth)  (canvaskitTextMeasurer.ts)
        → textWrapUtils: cssNormalBreakProcess / preprocessBreakWordText / computeKeepAllWidth
```

**렌더링 체인 관통 경로**:
```
TextSprite.tsx → SkiaNodeData.text에 whiteSpace/wordBreak/overflowWrap/textOverflow/clipText 주입
ElementSprite.tsx → specShapesToSkia 결과의 text children에 수동 주입 (spec shapes는 자동 상속 안 됨)
nodeRenderers.renderText()
  → textWrapUtils: cssNormalBreakProcess / preprocessBreakWordText / computeKeepAllWidth
  → paragraph.layout(effectiveLayoutWidth)
  → nowrap/pre: maxIntrinsicWidth + 1로 재레이아웃 (CanvasKit 큰 width 버그 회피)
  → clipText: canvas.clipRect() 적용
```

> **참고**: `LAYOUT_AFFECTING_PROPS`에 `'style'`이 이미 포함 → `style.wordBreak` 등 변경 시 `layoutVersion` 자동 증가 (추가 등록 불필요).
> 추가로 `INHERITED_LAYOUT_PROPS`(elements.ts) + `INHERITED_LAYOUT_PROPS_UPDATE`(elementUpdate.ts)에 3개 속성을 등록하여 자식 요소 dirty tracking도 보장.

**공유 유틸리티 구조** (`textWrapUtils.ts`):

`canvaskitTextMeasurer.ts`(높이 측정)와 `nodeRenderers.ts`(렌더링) 양쪽에서 동일한 전처리 함수를 호출하여 **측정-렌더링 경로 일치**를 보장한다. 이전에는 각 파일에 중복 로직이 있어 불일치 위험이 있었으나, `textWrapUtils.ts` 추출로 단일 소스를 확보.

### Phase 2: 인스펙터 UI ✅

**범위**: Typography 섹션에 Text Behavior Preset 컨트롤 추가

| 파일 (apps/builder/src/builder/) | 변경 |
|------|------|
| `panels/styles/atoms/styleAtoms.ts` | `typographyValuesAtom` 확장 (5개 필드 + equalityFn) |
| `panels/styles/hooks/useTypographyValuesJotai.ts` | `TypographyStyleValues` 인터페이스에 `whiteSpace`, `wordBreak`, `overflowWrap`, `textOverflow`, `overflow`, `textBehaviorPreset` 추가 + `deriveTextBehaviorPreset()` 역변환 함수 |
| `panels/styles/sections/TypographySection.tsx` | `WrapText` 아이콘 + `PropertySelect` UI (7 프리셋 + Custom) + `handleTextBehaviorChange()` — `updateStyles` batch로 5개 속성 단일 set() 적용 |

### Phase 3: 텍스트 overflow 클리핑 ✅

**범위**: `overflow: hidden` 또는 `clip` 시 CanvasKit `clipRect` 적용

| 파일 (apps/builder/src/builder/) | 변경 |
|------|------|
| `workspace/canvas/sprites/TextSprite.tsx` | `style.overflow === 'hidden' \|\| 'clip'` → `clipText: true` SkiaNodeData.text에 주입 |
| `workspace/canvas/sprites/ElementSprite.tsx` | spec shapes의 text children에 `clipText` 수동 주입 (자동 상속 안 됨) |
| `workspace/canvas/skia/nodeRenderers.ts` | `shouldClip = clipText && !isEllipsis` → `canvas.save()` + `canvas.clipRect(ck.XYWHRect(0, 0, width, height))` + `canvas.restore()` |

**isEllipsis 최종 조건** (Phase 1 + Phase 3 통합):
```typescript
const isEllipsis = node.text.textOverflow === 'ellipsis'
  && whiteSpace === 'nowrap'
  && !!node.text.clipText;
```
CSS 3중 전제조건(`text-overflow:ellipsis` + `white-space:nowrap` + `overflow:hidden|clip`)을 한 번에 체크.

> `text-overflow: ellipsis`는 CanvasKit의 `maxLines:1` + `ellipsis:'…'`로 자체 처리되므로 별도 clip 불필요 (`shouldClip`에서 `!isEllipsis`로 제외).

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

### 4. overflow-wrap: anywhere를 break-word와 완전 동일 처리 (Adopted for v1)
- CSS 사양상 줄바꿈 동작은 동일, 차이는 min-content 계산뿐
- min-content 차이가 발생하는 시나리오(flex/grid shrink)는 제한적
- v1에서 다운그레이드 채택, 향후 `calculateMinContentWidth` 확장으로 정확도 개선

---

## Consequences

### Positive
- CSS 표준에 근사하는 텍스트 래핑 동작으로 WebGL Canvas ↔ Preview 시각적 일관성 개선
- 사용자가 텍스트 넘침 제어 가능 (현재는 코드 수정 외 방법 없음)
- `keep-all`으로 CJK 텍스트 자연스러운 줄바꿈 지원

### Negative
- `keep-all` 에뮬레이션은 단어별 paragraph 생성으로 텍스트가 길수록 성능 비용 증가
- `break-all` ZWS 삽입은 커닝/ligature에 미세한 영향 가능
- CanvasKit이 향후 `breakStrategy` API를 추가하면 에뮬레이션 코드를 네이티브로 전환 필요

### Known Limitations
- `overflow-wrap: anywhere`의 min-content 계산은 break-word와 동일 (flex/grid shrink에서 Preview 불일치 가능)
- `break-all`은 ZWS 삽입 근사 에뮬레이션 (실제 CSS break-all과 미세 차이 가능)
- keep-all CJK 범위는 주요 6개 블록만 커버 (CJK Extension B~H 등 희소 블록 미포함)

### Risks
- CanvasKit 버전 업그레이드 시 기본 줄바꿈 동작이 변경될 수 있음 → 에뮬레이션 테이블 재검증 필요

---

## Verification Plan

### 속성 조합 테스트 매트릭스

**테스트 텍스트**:
- Latin: `"ButtonBBBBDDDAAA"` (공백 없는 긴 단어)
- Latin+Space: `"Hello World FooBar"` (혼합)
- CJK: `"안녕하세요반갑습니다"` (공백 없는 한글)
- Mixed: `"Hello안녕World"` (혼합)

**조합 매트릭스** (고정: width=100px):

| # | word-break | overflow-wrap | 기대 동작 (Latin 긴 단어) |
|---|-----------|--------------|--------------------------|
| 1 | normal | normal | 넘침 허용, 1줄 (컨테이너 초과) |
| 2 | normal | break-word | 넘침 시 문자 분할, 여러 줄 |
| 3 | normal | anywhere | #2와 동일 동작 |
| 4 | break-all | normal | 문자 단위 분할, 여러 줄 (라인 빈틈없이) |
| 5 | break-all | break-word | #4와 동일 |
| 6 | keep-all | normal | 넘침 허용, 1줄 (CJK 포함 단어 보호) |
| 7 | keep-all | break-word | CJK 단어 넘침 시 분할, 아니면 보호 |
| 8 | (any) | (any) + nowrap | 1줄, 넘침 |
| 9 | (any) | (any) + ellipsis+hidden+nowrap | 1줄, "..." 말줄임 |

### 검증 기준

1. **렌더러-측정기 일치**: 각 조합에서 `measureWrapped().height`와 WebGL 시각적 높이가 동일
2. **Canvas-Preview 일치**: WebGL 캔버스와 Preview iframe의 줄바꿈 위치가 동일 (허용 오차: 1px)
3. **프리셋 왕복**: 프리셋 선택 → 저장 → 새로고침 → `deriveTextBehaviorPreset()` 역변환 일치
4. **성능**: keep-all 에뮬레이션 단일 요소 < 1ms (100자 이하 텍스트 기준)

### 성능 한계치

| 에뮬레이션 | 비용 | 임계값 |
|-----------|------|--------|
| normal+normal (기존) | 단어 수 × ParagraphBuilder | < 0.5ms (10단어) |
| keep-all | 단어 수 × ParagraphBuilder | < 1ms (10단어) |
| break-all (ZWS) | 문자열 처리 + 단일 layout | < 0.5ms |

> 성능 초과 시 캐시 전략 검토 (paragraph 캐시는 nodeRenderers에 이미 존재)

### 실행 방법

```bash
# 타입 체크
cd apps/builder && pnpm exec tsc --noEmit

# MCP 브라우저로 시각 검증
# 1. 테스트 요소에 style.wordBreak/overflowWrap 설정
# 2. WebGL 캔버스 스크린샷 vs Preview iframe 비교
# 3. 9가지 조합 순회 확인
```

---

## External Research

### css-line-break (niklasvh/css-line-break)
- UAX #14 (Unicode Line Breaking Algorithm) 구현
- `break-all`: AL/NU/SA 문자 클래스를 ID(Ideographic)로 재매핑 → 모든 위치에서 줄바꿈 허용
- `keep-all`: CJK 코드포인트 범위에서 forbidden breakpoints 생성
- **반영**: keep-all CJK 범위 6개 블록 채택, break-all은 ZWS 삽입 방식으로 전환 (CanvasKit 기본 ≠ break-all 확인)

### Skia TextWrapper (skparagraph/src/TextWrapper.cpp)
- 클러스터 기반 분할: `fTooLongWord` 플래그로 넘침 단어 글리프 위치 분할
- breakStrategy enum 미구현 (TODO 주석만 존재)
- **반영**: CanvasKit 기본 동작 = overflow-wrap: break-word (단어 우선, 넘침 시 문자 분할)를 코드 레벨에서 확인

### Figma
- 커스텀 캔버스 렌더러 사용, word-break/overflow-wrap 직접 제어 옵션 미제공
- **반영**: 유사 제약 환경에서 프리셋 기반 접근이 합리적임을 확인

---

## References

- [CanvasKit ParagraphStyle API](https://skia.org/docs/user/modules/canvaskit/#paragraph)
- [CSS Text Module Level 3](https://www.w3.org/TR/css-text-3/)
- [CSS overflow-wrap anywhere vs break-word](https://www.w3.org/TR/css-text-3/#overflow-wrap-property)
- [css-line-break](https://github.com/niklasvh/css-line-break) — UAX #14 구현
- [Skia TextWrapper.cpp](https://skia.googlesource.com/skia/+/refs/heads/main/modules/skparagraph/src/TextWrapper.cpp)
- [foliojs/linebreak](https://github.com/foliojs/linebreak) — UAX #14 순수 구현
- ADR-012 P4: word-break:normal 에뮬레이션 (선행 작업)
