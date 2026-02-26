# Layout Engine Redundancy Audit Report

> **감사일**: 2026-02-26
> **대상**: Taffy WASM (Flex+Grid) + Dropflow Fork (Block+Inline) + CanvasKit Text Adapter
> **방법**: 5개 전문 에이전트 병렬 심층 조사 (Taffy / Dropflow / CSS Parser / CanvasKit Text / Cross-engine)

---

## 목차

1. [조사 범위 및 대상 파일](#1-조사-범위-및-대상-파일)
2. [엔진 네이티브 지원인데 불필요하게 커스텀 구현한 항목](#2-엔진-네이티브-지원인데-불필요하게-커스텀-구현한-항목)
3. [엔진 간 코드 중복](#3-엔진-간-코드-중복-445줄)
4. [중복이 아닌 항목 (필수 구현 확인)](#4-중복이-아닌-항목-필수-구현-확인)
5. [발견된 버그](#5-발견된-버그)
6. [권장 개선 우선순위](#6-권장-개선-우선순위)

---

## 1. 조사 범위 및 대상 파일

### Core Layout Engine

| 파일 | 역할 |
|------|------|
| `engines/index.ts` | 엔진 디스패처 (display 기반 라우팅) |
| `engines/LayoutEngine.ts` | 레이아웃 엔진 인터페이스 |
| `engines/TaffyFlexEngine.ts` | Taffy WASM Flex 엔진 (~557줄) |
| `engines/TaffyGridEngine.ts` | Taffy WASM Grid 엔진 (~748줄) |
| `engines/DropflowBlockEngine.ts` | Dropflow Fork Block 엔진 |
| `engines/utils.ts` | 공유 유틸리티 (intrinsic sizing, text measurement) |
| `engines/cssResolver.ts` | CSS cascade/inheritance |
| `engines/cssValueParser.ts` | CSS 값 파서 (단위, calc, var 등) |
| `engines/types.ts` | 타입 정의 |

> 경로 prefix: `apps/builder/src/builder/workspace/canvas/layout/`

### WASM Bindings

| 파일 | 역할 |
|------|------|
| `wasm-bindings/taffyLayout.ts` | Taffy WASM TypeScript 래퍼 |
| `wasm-bindings/rustWasm.ts` | WASM 모듈 로더 |
| `wasm-bindings/init.ts` | 통합 WASM 초기화 |
| `wasm/src/taffy_bridge.rs` | Rust WASM 브릿지 (JSON → Taffy Style) |

> 경로 prefix: `apps/builder/src/builder/workspace/canvas/`

### CanvasKit Text

| 파일 | 역할 |
|------|------|
| `skia/textMeasure.ts` | CanvasKit ParagraphBuilder 기반 텍스트 측정 **(Dead Code)** |
| `layout/canvaskit-shaper.ts` | CanvasKit Shaper 초기화 래퍼 (실제 구현은 `@xstudio/layout-flow` 패키지 내부) |
| `utils/textMeasure.ts` | Canvas 2D 기반 텍스트 측정 **(주력 사용중)** |
| `utils/canvaskitTextMeasurer.ts` | CanvasKit TextMeasurer 구현 **(등록은 수행되나 레이아웃 경로에서 미경유)** |

### Dropflow Fork

| 파일 | 역할 |
|------|------|
| `@xstudio/layout-flow` 패키지 | Block/Inline 레이아웃 엔진 |
| `xstudio-adapter.ts` | Element → Dropflow Style 변환 어댑터 |

---

## 2. 엔진 네이티브 지원인데 불필요하게 커스텀 구현한 항목

### 2.1 CRITICAL

#### 2.1.1 `position:relative` 수동 오프셋 계산

- **위치**: `TaffyFlexEngine.ts`
  - `elementToTaffyStyle()` 내 relative 분기 (~line 100): inset을 TaffyStyle에 전달하지 않음
  - `elementToTaffyStyle()` 내 inset 조건 (~line 264): `absolute`/`fixed`에만 제한
  - `_runTaffyPassRaw()` 내 수동 오프셋 가산 (~line 631): `resolvePxOffset()` 호출
- **현상**: Taffy 0.9는 `Position::Relative` 노드의 inset(top/right/bottom/left)을 네이티브로 처리하여 `layout.location`에 자동 반영함. 그러나 코드에서 `position === 'relative'`일 때 inset을 Taffy에 전달하지 않고, 계산 결과에 수동으로 오프셋을 가산함.
- **영향**: ~30줄의 불필요한 코드 + `resolvePxOffset()` 함수 + % 기반 relative offset을 0으로 처리하는 제한
- **근거**: 코드 주석 "Taffy는 relative offset을 직접 지원하지 않으므로"는 **사실과 다름**. Rust 브릿지의 `parse_lpa()`도 이미 inset 파싱을 지원함.

```typescript
// elementToTaffyStyle() — relative일 때 inset 미전달
} else if (style.position === 'relative') {
    result.position = 'relative';
    // inset을 TaffyStyle에 전달하지 않음
}

// _runTaffyPassRaw() — 수동 후처리 (불필요)
if (childStyle?.position === 'relative') {
    relativeOffsetY = resolvePxOffset(topVal, cssCtx);
    // ...
}
results.push({
    x: layout.x + relativeOffsetX,  // 수동 가산
    y: layout.y + relativeOffsetY,
});
```

**수정 방안**: `elementToTaffyStyle()`에서 `relative`일 때도 inset을 전달하면 Taffy가 자동 처리. `_runTaffyPassRaw()`의 수동 오프셋 코드와 `resolvePxOffset()` 함수 제거 가능.

> **주의**: 현재 수동 오프셋과 inset 미전달이 **동시에** 존재하므로, 수정 시 반드시 **회귀 테스트**가 필요함. inset 전달을 활성화하면서 수동 오프셋을 제거하지 않으면 이중 적용될 수 있고, 수동 오프셋만 제거하면 relative 위치가 무시됨. **별도 PR로 분리**하여 진행 권장.

---

#### 2.1.2 Canvas 2D 텍스트 측정 (CanvasKit 환경에서)

- **위치**:
  - `engines/utils.ts` — `measureTextWidth()`: Canvas 2D `ctx.measureText()` 직접 호출
  - `utils/textMeasure.ts` — `measureWrappedTextHeight()`: Canvas 2D로 수동 줄바꿈 시뮬레이션
- **현상**: CanvasKit ParagraphBuilder가 줄바꿈·높이·너비를 ICU 기반으로 정확히 제공하는데, Canvas 2D `ctx.measureText()`로 수동 측정. 수동 줄바꿈은 공백 기준 `split(/(\s+)/)`만 수행하여 CJK·하이픈·letter-spacing 미지원.
- **영향**: 측정 불일치 → `+2px`/`+4px` 매직 넘버로 보정 (`enrichWithIntrinsicSize()` 내부)
- **근거**: `CanvasKitTextMeasurer` 클래스가 이미 존재하고 `setTextMeasurer(new CanvasKitTextMeasurer())`로 등록됨 (`SkiaOverlay.tsx:691`에서 실제 호출 확인). 그러나 레이아웃 경로의 소비자(`measureTextWidth()`, `measureWrappedTextHeight()`)는 `getTextMeasurer()`를 경유하지 않고 Canvas 2D API를 직접 호출함. 즉, **등록 자체는 수행되지만 레이아웃 계산 경로가 이를 우회**하는 구조.

**3개의 텍스트 측정 시스템 병존 현황**:

| # | 시스템 | 엔진 | 사용 상태 |
|---|--------|------|-----------|
| 1 | `measureTextWidth()` / `measureWrappedTextHeight()` | Canvas 2D | **주력** (레이아웃 경로) |
| 2 | `CanvasKitTextMeasurer` | CanvasKit Paragraph | **등록은 수행되나 레이아웃 경로에서 미경유** (`getTextMeasurer()` 호출 0건) |
| 3 | `skia/textMeasure.ts` | CanvasKit Paragraph | **완전 미사용 (Dead Code, import 0건)** |

```typescript
// 현재: Canvas 2D 수동 줄바꿈 (부정확)
const words = text.split(/(\s+)/);
let lineCount = 1;
for (const word of words) {
    const wordWidth = ctx.measureText(word).width;
    if (currentLineWidth + wordWidth > maxWidth) { lineCount++; }
}
return lineCount * lineHeight;

// CanvasKit 네이티브 (정확, 이미 구현되어 있으나 미사용)
paragraph.layout(maxWidth);
return paragraph.getHeight();
```

**수정 방안**: `utils.ts`의 텍스트 측정이 `TextMeasurer` 인터페이스를 경유하도록 변경. CanvasKit 초기화 전 Canvas 2D fallback, 초기화 후 CanvasKit ParagraphBuilder 사용.

> **Phase 4-1 (2026-02-26)**: `measureTextWidth()`가 `getTextMeasurer()` 경유하도록 변경 완료. `isCanvasKitMeasurer()` 조건부 보정(+2/+4px → 0) 완료.
>
> **Phase 4-1B (2026-02-26)**: Phase 4-1의 미완료 잔여분 수정:
> - `TextMeasureStyle` 인터페이스를 렌더러 ParagraphStyle과 동일하게 확장 (letterSpacing, wordSpacing, fontStyle, fontStretch, fontVariant 추가)
> - `CanvasKitTextMeasurer`의 ParagraphStyle을 `nodeRenderers.ts` renderText()와 완전 일치하도록 완성 (slant, width, fontFeatures, halfLeading 추가)
> - `Canvas2DTextMeasurer`에 letterSpacing/wordSpacing 수동 가산, fontStyle(italic/oblique) 반영
> - `measureWrappedTextHeight()`를 TextMeasurer 경유 래퍼로 변경 (§2.2.3 해소)
> - `calculateTextWidth()`의 `Math.round` 제거 → float 정밀도 유지
> - `estimateTextHeight()`의 `Math.round` 제거 + fontFamily/fontWeight 파라미터화
> - `calculateContentHeight()` 내 fontWeight 하드코딩(500) → 실제 style 값 사용
> - `measureTextWidth()` 시그니처 확장 (5번째 optional `extra` 파라미터)

---

#### 2.1.3 `box-sizing` 수동 변환 (Dropflow)

- **위치**: `DropflowBlockEngine.ts` — `_dropflowCalculate()` 내 `boxSizeConverted` 로직
- **현상**: Dropflow `Style` 클래스는 `boxSizing` 필드와 `getInlineSize()`/`getBlockSize()` 내 box-sizing 보정 로직을 보유. 그러나 `xstudio-adapter.ts`의 `elementStyleToDropflowStyle()`에서 `boxSizing` 속성을 전달하지 않아 기본값 `'content-box'` 사용 → 래퍼에서 % width를 수동으로 content-box pixel로 변환하는 우회 코드 추가.
- **영향**: ~20줄의 우회 코드, % width에서만 작동 (px/auto 등은 미보정)
- **근거**: Dropflow `Style` 클래스에 `boxSizing: BoxSizing` 필드 존재, `getInlineSize()`에서 border-box 보정 구현 완료

```typescript
// 현재 — 래퍼에서 수동 보정 (% width 전용)
if (boxSizing === 'border-box' && widthStr?.endsWith('%')) {
    const resolved = /* ... 수동 content-box 변환 ... */;
}

// Dropflow 네이티브 (사용 안 됨)
// style.ts:getInlineSize()가 boxSizing에 따라 자동 보정
```

**수정 방안**: `xstudio-adapter.ts`에서 `boxSizing: 'border-box'` 전달 → 래퍼의 수동 변환 코드 제거.

> **부분 해소 (Phase 4-1C, 2026-02-26)**: `enrichWithIntrinsicSize()`가 항상 border-box 값(content + padding + border)을 주입하도록 변경. `applyCommonTaffyStyle()`에서 border-box → content-box 변환을 수행하여 Taffy 호환. `DropflowBlockEngine._dropflowCalculate()` 내 `boxSizeConverted` 우회 코드는 enrichment 경로와 독립적이므로 잔존.

---

### 2.2 HIGH

#### 2.2.1 `skia/textMeasure.ts` — 완전 Dead Code

- **위치**: `skia/textMeasure.ts` 전체 파일 — `measureText()`, `createTextMeasureFunc()` export
- **현상**: CanvasKit ParagraphBuilder 기반의 정확한 텍스트 측정 구현이 있으나, import하는 파일이 0곳.
- **Dead Code 검증**: `grep -r "skia/textMeasure" apps/builder/src/` → 결과 0건 (import·require 모두 없음)
- **영향**: Dead code 유지 관리 비용
- **수정 방안**: 파일 삭제. 동일 기능이 `utils/canvaskitTextMeasurer.ts`의 `CanvasKitTextMeasurer` 클래스에도 있음.

#### 2.2.2 `xHeight` 근사 계산

- **위치**: `packages/layout-flow/src/adapters/canvaskit-shaper.ts:312-316`
  > 참고: 앱 측 `apps/.../layout/canvaskit-shaper.ts`(88줄)는 초기화 래퍼일 뿐이며, 실제 xHeight 근사 코드는 `@xstudio/layout-flow` 패키지 내부에 있음.
- **현상**: `const xHeight = Math.round(ascender * 0.52)` — 주석에 "CanvasKit에서 직접 제공하지 않으므로"라고 되어 있으며, **현재 설치된 `canvaskit-wasm@0.40.0`의 `FontMetrics` 인터페이스에는 실제로 `xHeight` 필드가 미노출**임. `FontMetrics`에는 `ascent`, `descent`, `leading`, `bounds`만 정의되어 있음 (검증: `canvaskit-wasm` 패키지의 `types/index.d.ts` 내 `export interface FontMetrics` 참조. 버전 업그레이드 시 재확인 필요).
- **영향**: 폰트마다 xHeight 비율이 다름 (Pretendard ~0.52, Times New Roman ~0.45) → 부정확
- **수정 방안**: `SkFont.getMetrics().xHeight` 직접 교체는 **현재 버전에서 불가**. 대안:
  1. **glyph bounds 기반 측정**: `SkFont.getGlyphBounds()`로 'x' 글리프의 바운딩 박스 높이를 측정하여 정확한 xHeight 획득 (단, `canvaskit-shaper.ts`의 duck-typed `CKFont` 인터페이스에 `getGlyphBounds` 시그니처 추가 필요)
  2. **canvaskit-wasm 업그레이드**: 향후 버전에서 `FontMetrics.xHeight` 노출 시 직접 사용
  3. **현 근사 유지**: 정확도 요구가 낮은 경우 `ascender * 0.52` 유지 (현재 테스트 통과 중)
  > **검증 기준**: xHeight 변경 시 `packages/layout-flow/src/adapters/__tests__/canvaskit-shaper.test.ts:275-284` 테스트 + 빌더 캔버스 텍스트 baseline 스냅샷 확인 필수.

#### 2.2.3 수동 줄바꿈 시뮬레이션

- **위치**: `utils/textMeasure.ts` — `measureWrappedTextHeight()` 함수
- **현상**: 공백 기준 `split(/(\s+)/)`로만 단어를 분리하여 줄바꿈을 시뮬레이션. CJK 문자열, 하이픈, word-break, letter-spacing 미처리.
- **영향**: CanvasKit의 ICU 기반 Unicode line-breaking과 결과 불일치
- **수정 방안**: 2.1.2의 TextMeasurer 전략 패턴 완성으로 해소.

> **해결 (Phase 4-1B, 2026-02-26)**: `measureWrappedTextHeight()`가 `getTextMeasurer().measureWrapped()` 경유로 변경됨. CanvasKit 로드 후에는 `paragraph.layout(maxWidth)` + `paragraph.getHeight()`로 ICU 기반 줄바꿈 + 정확한 높이를 산출. Canvas 2D 폴백은 `Canvas2DTextMeasurer.measureWrapped()` 내부에서 기존 word-wrap 시뮬레이션 유지.

#### 2.2.4 `+2px`/`+4px` 매직 넘버 보정

- **위치**: `engines/utils.ts` — `calculateContentWidth()` 내부 (~line 738: Checkbox/Radio/Switch 레이블 +2px, ~line 785: 일반 텍스트 +4px). `enrichWithIntrinsicSize()`가 이 함수를 간접 호출.
- **현상**: Canvas 2D와 CanvasKit 간 측정 불일치를 매직 넘버로 수동 보정
- **영향**: 폰트/사이즈에 따라 보정값이 부적절할 수 있음
- **수정 방안**: 동일 엔진(CanvasKit) 사용 시 자연스럽게 해소.

> **부분 해소 (Phase 4-1B, 2026-02-26)**: CanvasKit 측정기가 렌더러와 동일한 ParagraphStyle을 사용하게 되어, CanvasKit 경로에서는 보정 불필요(0). Canvas 2D 경로의 +4px 보정은 폴백용으로 유지. `calculateTextWidth()`의 `Math.round` 제거로 소수점 절사 오차도 해소.

#### 2.2.5 `createsBFC()` Dropflow 중복

- **위치**: `DropflowBlockEngine.ts:543` (클래스 메서드) — 외부 공개 래퍼는 `index.ts:96` (`export function createsBFC()`)
- **현상**: 5개 조건(flow-root, inline, overflow:hidden, float, position:absolute)이 Dropflow Fork의 `styleCreatesBfc()`와 완전 동일. 래퍼에서 flex/grid/fixed 추가 조건만 보완.
- **영향**: 한쪽만 수정 시 불일치 위험
- **수정 방안**: `styleCreatesBfc()`를 export하여 import 후 추가 조건만 래퍼에서 보완.
  > **패키지 경계 주의**: `styleCreatesBfc()`는 현재 `@xstudio/layout-flow` 패키지 내부의 private 함수 (`xstudio-adapter.ts` 내). export하려면 패키지의 public API를 수정해야 하며, 이는 패키지 버전/인터페이스 변경을 수반함. 대안으로 `@xstudio/layout-flow`의 barrel export에 추가하거나, 공통 조건만 `@xstudio/shared`로 이동하는 방법도 있음.

### 2.3 MEDIUM

#### 2.3.1 Grid `repeat()` TS 전개

- **위치**: `TaffyGridEngine.ts` — `parseGridTemplateToTrackArray()`, `expandRepeatToken()`, `tokenizeGridTemplate()` (~135줄)
- **현상**: Rust 브릿지의 `parse_track_as_template()`가 항상 `GridTemplateComponent::Single`을 사용하여 `GridTemplateComponent::Repeat` variant를 활용하지 않음 → TS에서 `repeat()` 함수를 수동 파싱/전개해야 함.
- **영향**: `auto-fill`/`auto-fit` 트랙 수 계산이 TS에서 근사적으로 수행됨
- **수정 방안**: Rust 브릿지에서 `repeat()` 구문을 파싱하여 `Repeat(count, tracks)` variant 사용.

#### 2.3.2 `TextMeasurer` 전략 패턴 무효화

- **위치**: `utils/textMeasure.ts` — `setTextMeasurer()` / `getTextMeasurer()` API
- **현상**: `setTextMeasurer(new CanvasKitTextMeasurer())` 호출되지만 `getTextMeasurer()` 소비자가 0곳.
- **영향**: Phase 0 마이그레이션 미완성
- **수정 방안**: 2.1.2에서 통합 해결.

> **해결 (Phase 4-1B, 2026-02-26)**: `measureTextWidth()` + `measureWrappedTextHeight()` 모두 `getTextMeasurer()` 경유. `TextMeasureStyle` 인터페이스 확장으로 전략 패턴이 실질적으로 동작.

#### 2.3.3 `resolveCSSLength()` vs Dropflow `parseCSSSize()` 중복

- **위치**: `DropflowBlockEngine.ts` — `resolveCSSLength()` 함수
- **현상**: px/% 파싱, sentinel 값 처리가 `resolveCSSLength()`, Dropflow 내 `parseCSSSize()`, `cssValueParser.ts`의 `resolveCSSSizeValue()` 세 곳에 분산.
- **영향**: 유지보수 복잡도 증가
- **수정 방안**: `resolveCSSLength()`를 `resolveCSSSizeValue()` 호출로 통합.

#### 2.3.4 Typeface 이중 캐싱

- **위치**: `skia/fontManager.ts` — `SkiaFontManager.typefaces` / `@xstudio/layout-flow`의 `CanvasKitShaper.fontCache`
- **현상**: `SkiaFontManager`와 `CanvasKitShaper`가 각각 typeface 캐시를 보유. 초기화 시 한쪽에서 다른 쪽으로 복사.
- **영향**: 메모리 중복 (typeface 참조)
- **수정 방안**: `registeredFaces`와 `typefaces` 참조 통합 검토. 단, `fontCache`는 `private readonly` 필드이므로 통합 시 public accessor 추가 또는 패키지 API 변경이 전제됨.

---

## 3. 엔진 간 코드 중복 (~445줄)

`TaffyFlexEngine`과 `TaffyGridEngine` 사이에 대량의 코드가 복제되어 있으며, `DropflowBlockEngine`과도 부분적으로 겹침.

### 3.1 CRITICAL — 함수/패턴 완전 복제

#### 3.1.1 `dimStr()` 완전 복제

- **위치**: `TaffyFlexEngine.ts` / `TaffyGridEngine.ts` — 각각 모듈 스코프 `dimStr()` 함수
- **중복 라인**: 10줄
- **내용**: `undefined|null|''|'auto'` 검사 후 number→`"Npx"`, string→그대로 반환. 두 파일에서 완전히 동일.

#### 3.1.2 `parseCSSPropWithContext()` 완전 복제

- **위치**: `TaffyFlexEngine.ts` / `TaffyGridEngine.ts` — 각각 모듈 스코프 `parseCSSPropWithContext()` 함수
- **중복 라인**: 40줄
- **내용**: CSS 값을 파싱하여 number/string/undefined 반환. sentinel 값 처리 포함. 핵심 로직 동일.

#### 3.1.3 Margin/Padding/Border → TaffyStyle 변환

- **위치**: `TaffyFlexEngine.ts` `elementToTaffyStyle()` / `TaffyGridEngine.ts` `elementToTaffyGridStyle()` — 각각 margin/padding/border 매핑 블록
- **중복 라인**: 40줄
- **내용**: `parseMargin()` → 4방향 분리 → `result.marginTop = "${N}px"` 패턴이 완전 동일.

#### 3.1.4 Size(width/height/min/max) → TaffyStyle 변환

- **위치**: `TaffyFlexEngine.ts` `elementToTaffyStyle()` / `TaffyGridEngine.ts` `elementToTaffyGridStyle()` — 각각 size 매핑 블록
- **중복 라인**: 28줄
- **내용**: `parseCSSPropWithContext()` → `dimStr()` → `result.width` 설정 패턴 동일.

#### 3.1.5 Inset 파싱 (absolute/fixed positioning)

- **위치**: `TaffyFlexEngine.ts` `elementToTaffyStyle()` / `TaffyGridEngine.ts` `elementToTaffyGridStyle()` — 각각 inset 조건부 블록
- **중복 라인**: 20줄
- **내용**: `position === 'absolute' || 'fixed'`일 때 top/left/right/bottom → `result.insetTop` 매핑 동일.

#### 3.1.6 Gap 파싱

- **위치**: `TaffyFlexEngine.ts` `elementToTaffyStyle()` / `TaffyGridEngine.ts` `elementToTaffyGridStyle()` — 각각 gap 파싱 블록
- **중복 라인**: 36줄
- **내용**: gap shorthand → rowGap/columnGap 분리 패턴 동일.

#### 3.1.7 CSS 상속 체인 + CSSValueContext 생성

- **위치**: `TaffyFlexEngine.ts` `calculate()` / `TaffyGridEngine.ts` `calculate()` / `DropflowBlockEngine.ts` `calculate()` — 각각 진입부의 context 구성 블록
- **중복 라인**: 36줄
- **내용**: `resolveStyle()` → `parentComputedStyle` 결정 + viewport 크기 조회 + `CSSValueContext` 객체 구성 패턴 동일.

### 3.2 HIGH — 구조적 패턴 중복

#### 3.2.1 Taffy 인스턴스 관리 + Dropflow 폴백

- **위치**: `TaffyFlexEngine.ts` `getTaffyLayout()` + `isTaffyFlexAvailable()` / `TaffyGridEngine.ts` `getTaffyGridLayout()` + `isTaffyGridAvailable()` — 각각 모듈 스코프
- **중복 라인**: 70줄
- **내용**: `let taffyInstance`, `let taffyInitFailed`, lazy init + 실패 감지 + Dropflow 폴백 — 변수명만 다른 동일 패턴.

#### 3.2.2 Taffy 결과 수집 루프

- **위치**: `TaffyFlexEngine.ts` `_runTaffyPassRaw()` / `TaffyGridEngine.ts` `computeWithTaffy()` — 각각 Taffy 결과 → `ComputedLayout[]` 변환 블록
- **중복 라인**: 45줄
- **내용**: `getLayoutsBatch()` → `parseMargin()` → `ComputedLayout` 생성 루프. Flex 버전은 relative offset 추가 처리.

#### 3.2.3 부모 노드 padding/border 리셋

- **위치**: `TaffyFlexEngine.ts` `computeWithTaffy()` / `TaffyGridEngine.ts` `computeWithTaffy()` — 각각 부모 TaffyStyle 구성 블록
- **중복 라인**: 30줄
- **내용**: 부모 TaffyStyle에서 display 강제, available space 설정, padding/border 0 리셋.

#### 3.2.4 Phantom Indicator 설정 이중 정의

- **위치**: `engines/index.ts` `PHANTOM_INDICATOR_WIDTHS` / `TaffyFlexEngine.ts` `INDICATOR_CONFIGS` — 각각 모듈 스코프 상수
- **중복 라인**: 50줄
- **내용**: 동일 컴포넌트(switch/checkbox/radio)의 크기 정보가 다른 형태로 2곳에 정의. 값은 일치하지만(예: switch sm: 36+10=46) 한쪽만 수정 시 불일치 발생.

#### 3.2.5 Shorthand 파싱 삼중 구현 + 불필요한 string↔number 왕복

- **위치**: `engines/utils.ts` `parseMargin()` / `TaffyFlexEngine.ts` `elementToTaffyStyle()` 내 margin 변환 / `xstudio-adapter.ts` `parseMarginShorthand()`
- **중복 라인**: 40줄
- **내용**:
  - `engines/utils.ts` `parseMargin()`: shorthand 파싱 → `{top, right, bottom, left}` 숫자 객체
  - `TaffyFlexEngine` `elementToTaffyStyle()`: 숫자 → `"Npx"` 문자열 → Taffy Rust → `parseFloat("N")` **(불필요한 왕복)**
  - `xstudio-adapter.ts` `parseMarginShorthand()`: 독자적 구현

### 3.3 구조적 근본 원인

#### LayoutEngine이 순수 인터페이스 — 공통 로직 미제공

- **위치**: `LayoutEngine.ts` — `export interface LayoutEngine`
- **현상**: `LayoutEngine`은 순수 `interface`로 정의. 공통 로직을 포함하는 추상 클래스가 아님.
- **영향**: 3.1~3.2의 모든 중복이 각 엔진에 독립적으로 존재하는 근본 원인.

### 3.4 잠재적 누락

#### TaffyGridEngine에서 `enrichWithIntrinsicSize()` 미호출

- **위치**: `TaffyGridEngine.ts` — `calculate()` 메서드 내 children 전처리 블록
- **현상**: Flex(`TaffyFlexEngine.calculate()`)와 Block(`DropflowBlockEngine.calculate()`) 엔진은 자식에 `enrichWithIntrinsicSize()`를 호출하여 intrinsic size를 주입하지만, Grid 엔진은 이를 수행하지 않음.
- **영향**: Grid item이 자체 크기를 가져야 하는 경우(Button in Grid) 크기 미계산 가능성
- **조치 필요**: Grid 컨텍스트에서 self-rendering 요소의 크기 정상 여부 검증

---

## 4. 중복이 아닌 항목 (필수 구현 확인)

WASM 경계 제약, 렌더링 파이프라인 분리, 아키텍처적 필요에 의해 **정당하게 존재**하는 코드.

| 항목 | 위치 (심볼 / 파일) | 필수인 이유 |
|------|---------------------|-------------|
| CSS 단위 변환 (em/rem/vh/vw/calc/clamp/min/max) | `resolveUnitValue()` — `cssValueParser.ts` | Taffy는 px/% 만 이해. WASM 경계 전 사전 해석 필수 |
| CSS Variable (`var()`) 해석 | `resolveVar()` — `cssValueParser.ts` | 두 엔진 모두 CSS custom properties 미지원 |
| CSS 상속/cascade | `resolveStyle()` — `cssResolver.ts` | Skia 렌더링용 computed style (레이아웃 엔진과 목적 분리) |
| CSS 키워드 (inherit/initial/unset/revert) | `resolveCascadeKeyword()` — `cssResolver.ts` | 비레이아웃 속성(color, font)에도 적용. 엔진 전달 전 해석 필수 |
| `currentColor` 해석 | `resolveCurrentColor()` — `cssResolver.ts` | 색상 = Skia 렌더링 관심사. 레이아웃 엔진과 무관 |
| `font` shorthand 파싱 | `parseFontShorthand()` — `cssValueParser.ts` | CSS shorthand → longhand는 파서 책임. 엔진은 개별값만 수신 |
| `flex`/`flex-flow` shorthand 파싱 | `elementToTaffyStyle()` 내 flex 파싱 — `TaffyFlexEngine.ts` | CSS shorthand → longhand 분리. Taffy는 개별 속성만 수신 |
| 2-pass 레이아웃 | `calculate()` 내 re-enrich 로직 — `TaffyFlexEngine.ts` | WASM measure function 콜백 미구현 → 아키텍처 제약 |
| Inline-block 세그먼테이션 | `segmentChildren()` + `layoutInlineRun()` — `DropflowBlockEngine.ts` | Dropflow IFC는 텍스트 Run 기반. XStudio 컴포넌트는 prop 기반 |
| `enrichWithIntrinsicSize()` | `enrichWithIntrinsicSize()` — `engines/utils.ts` | WASM measure function 대체. 현 아키텍처에서 필수 |
| Blockification | `blockifyDisplay()` — `engines/index.ts` | 엔진 선택 디스패치 목적 (Taffy의 blockification과 관심사 분리) |
| Margin collapse | — | Dropflow에 완전 위임됨 (래퍼에서 재구현 없음) |
| Float 처리 | — | Dropflow에 완전 위임됨 (래퍼에서 재구현 없음) |
| 타입 어댑터 | `elementToXElement()` 등 3개 — `DropflowBlockEngine.ts` | 패키지 간 의존 분리를 위한 순수 매핑. 재계산 없음 |
| `grid-template-areas` 파싱 | `parseGridAreaShorthand()` — `TaffyGridEngine.ts` | Taffy 0.9는 named area 미지원. Line-based placement로 변환 필수 |
| `place-items`/`place-content` shorthand | `elementToTaffyGridStyle()` 내 — `TaffyGridEngine.ts` | CSS shorthand 분리 = 파서 책임 |

---

## 5. 발견된 버그

### 5.1 [HIGH] flex `order` 미작동 — Taffy 0.9.2에 `order` 필드 없음

- **소실 경로**:
  1. `TaffyFlexEngine.ts` `elementToTaffyStyle()` — `result.order`를 설정
  2. `taffyLayout.ts` `normalizeStyle()` — order를 JSON에 포함하여 WASM 호출
  3. `taffy_bridge.rs` `struct StyleInput` — `order` 필드 **누락** → serde가 무시
- **현상**: TypeScript에서 `result.order`를 설정하고 JSON으로 직렬화하지만, Rust `StyleInput` struct에 `order` 필드가 없어 역직렬화 시 무시됨.
- **근본 원인**: **Taffy 0.9.2의 `Style` struct에 `order` 필드 자체가 존재하지 않음.** Rust 브릿지에 필드를 추가해도 `style.order = o`가 컴파일 에러. CSS `order`는 Taffy가 미지원하는 속성.
- **영향**: CSS `order` 속성이 레이아웃에 전혀 반영되지 않음
- **재현**: `order: 1` 이상의 값을 가진 flex item이 DOM 순서 그대로 배치됨
- **수정 방안**: Rust 브릿지 수정으로는 해결 불가. TS 레이어에서 children을 `order` 값 기준으로 정렬한 뒤 Taffy에 전달하는 방식으로 우회 구현 필요.

### 5.2 [HIGH — 확정 버그] `margin:auto`가 Taffy에 전달되지 않음

- **소실 경로**:
  1. `engines/utils.ts` `parseMargin()` — `parseNumericValue("auto")` 호출 → `undefined` 반환
  2. `TaffyFlexEngine.ts` `elementToTaffyStyle()` — fallback `0` 적용 → `result.marginTop` 미설정
  3. `taffy_bridge.rs` `parse_lpa("auto")` — **올바르게** `LengthPercentageAuto::auto()` 반환 가능하지만 도달 못함
- **현상**: `parseMargin()`이 CSS "auto" 값을 숫자 파서에 넣어 0으로 소실. Taffy의 margin:auto 기능에 도달하지 못함.
- **영향**: Flexbox `margin: auto` 공간 분배 기능 미작동 (중앙 정렬 등)
- **재현**: `margin: auto`를 가진 flex item이 공간 분배 없이 좌상단에 배치됨
- **수정**: `parseMargin()` 반환 타입(`Margin`)은 숫자 전용이므로 변경하지 않음. 대신 `elementToTaffyStyle()`에서 props의 margin 원본 값을 직접 검사하여 `'auto'`일 때 `StyleInput.marginTop = "auto"` 등으로 Rust 브릿지에 전달.

### 5.3 [MEDIUM] TaffyGridEngine에서 `enrichWithIntrinsicSize()` 미호출

- **위치**: `TaffyGridEngine.ts` `calculate()` 메서드 내 children 전처리 블록
- **현상**: Flex/Block 엔진은 자식에 intrinsic size를 주입하지만, Grid 엔진은 미수행. Grid item이 자체 크기를 가져야 하는 경우 높이가 0으로 collapse될 수 있음.
- **조치**: Grid 컨텍스트에서 Button 등 self-rendering 요소의 크기 정상 여부 검증 후 필요 시 enrichment 추가.

---

## 6. 권장 개선 우선순위

### Phase 1: 즉시 (리스크 없음, 기계적 작업)

| # | 작업 | 절감 | 난이도 |
|---|------|------|--------|
| 1-1 | `dimStr()`를 `utils.ts`로 추출 | 10줄 | 매우 쉬움 |
| 1-2 | `parseCSSPropWithContext()`를 `utils.ts`로 추출 | 40줄 | 쉬움 |
| 1-3 | `skia/textMeasure.ts` dead code 삭제 | 파일 1개 | 매우 쉬움 |

### Phase 2: 단기 — 확정 버그 수정 (반드시 테스트 추가)

| # | 작업 | 영향 | 난이도 |
|---|------|------|--------|
| 2-1 | TS 레이어에서 children을 order 기준 정렬 후 Taffy에 전달 (Taffy 0.9.2에 order 필드 없음) | flex order 기능 활성화 | 중간 |
| 2-2 | `margin:auto` → Taffy에 `"auto"` 문자열 전달 + 테스트 | flexbox margin:auto 활성화 | 쉬움 |
| 2-3 | `position:relative` inset을 Taffy에 위임 | ~30줄 제거 + % offset 지원 | 중간 (**별도 PR, 회귀 테스트 필수**) |

**Phase 2 테스트 계획**:

| 버그 | 추가/갱신 대상 테스트 파일 | 테스트 내용 |
|------|--------------------------|-------------|
| 2-1 order | `engines/__tests__/TaffyFlexEngine.test.ts` | TS 레이어 children 정렬 로직: `order: 1, 2, 3` flex items → 정렬된 순서로 Taffy에 전달되는지 확인 |
| 2-2 margin:auto | `engines/__tests__/` — 신규 `TaffyFlexEngine.test.ts` | `elementToTaffyStyle()` 호출 시 margin `'auto'` 값이 `StyleInput.marginTop = "auto"`로 전달되는지 확인 |
| 2-2 margin:auto | `wasm/src/taffy_bridge.rs` — `#[test]` 추가 | `marginTop: "auto"` 전달 → `style.margin.top == LengthPercentageAuto::auto()` 확인 |
| 2-3 relative inset | `engines/__tests__/` — 신규 테스트 파일 권장 | `position: relative; top: 10px; left: 20px` → 결과 좌표에 오프셋 반영 확인. `position: relative; top: 50%` → % 오프셋 정상 처리 확인 |

> **현재 테스트 현황**: `order` 테스트 0건, `margin:auto` 테스트 0건, `position:relative` 테스트 0건. 세 항목 모두 **신규 테스트 작성 필수**.

### Phase 3: 단기 — 코드 중복 제거

| # | 작업 | 절감 | 난이도 |
|---|------|------|--------|
| 3-1 | `applyCommonTaffyStyle()` 헬퍼: Box model + Size + Gap + Inset 통합 | ~160줄 | 쉬움 |
| 3-2 | `resolveParentContext()` 헬퍼: CSS 상속 체인 + CSSValueContext 생성 | ~36줄 | 쉬움 |
| 3-3 | Phantom Indicator 설정을 단일 소스로 통합 | ~50줄 | 쉬움 |
| 3-4 | ~~`xstudio-adapter.ts`에 `boxSizing: 'border-box'` 전달 → 수동 변환 제거~~ **(부분 해소: Phase 4-1C에서 enrichment 경로 border-box 통일)** | ~20줄 | 부분 완료 |
| 3-5 | `createsBFC()`에서 Dropflow `styleCreatesBfc()` import 사용 | ~15줄 | 쉬움 (단, 패키지 API export 수정 필요) |
| 3-6 | ~~Shorthand 왕복 변환 제거 + `dimStr()` 삭제~~ **(완료)** | ~40줄 | 완료 |

### Phase 4: 중기 — 아키텍처 개선

| # | 작업 | 절감 | 난이도 |
|---|------|------|--------|
| 4-1 | ~~TextMeasurer 전략 패턴 완성~~ **(완료: Phase 4-1 + 4-1B)** | 매직 넘버 제거 + 정확도 향상 + ParagraphStyle 완전 정합 | 완료 |
| 4-2 | ~~`BaseTaffyEngine` 추상 클래스 도입~~ **(완료)** | ~145줄 | 완료 |
| 4-3 | ~~Rust 브릿지에 `GridTemplateComponent::Repeat` 지원~~ **(완료)** | ~110줄 TS 코드 제거 | 완료 |
| 4-4 | ~~TaffyGridEngine에 `enrichWithIntrinsicSize()` 호출 추가~~ **(완료)** | 잠재 버그 수정 | 완료 |
| 4-5 | ~~`xHeight` 근사 개선 — `getGlyphBounds('x')` 기반~~ **(완료)** | 텍스트 baseline 정확도 향상 | 완료 |
| 4-6 | ~~Phantom Indicator CSS 레이아웃 보정~~ **(완료)** | padding/align-items/gap 렌더링 정확도 향상 | 완료 |

### Phase 5: 장기 — 근본 아키텍처 (보류, 2026-02-26 결정)

> **상태: 보류** — 상세 설계 완료, 구현 보류. 아래 비용-이득 분석 참조.

| # | 작업 | 효과 | 난이도 | 상태 |
|---|------|------|--------|------|
| 5-1 | WASM measure function 콜백 구현 → 2-pass layout 제거 | 성능 + 정확도 향상 | 매우 높음 | 보류 |
| 5-2 | Taffy 네이티브 intrinsic sizing 활용 → `enrichWithIntrinsicSize()` 축소 | pre-enrichment 재구조화 | 높음 (5-1 의존) | 보류 |
| 5-3 | Dropflow `styleCreatesBfc()` export + Shorthand 파서 공유 패키지로 이동 | 크로스 패키지 중복 해소 | 높음 | 보류 |

##### 보류 사유: 비용-이득 분석 (2026-02-26)

**정량 비교:**

| 항목 | 5-1 (Measure Callback) | 5-2 (Intrinsic Sizing) | 5-3 (CSS 파서 공유) |
|------|:---:|:---:|:---:|
| 제거 코드 | ~93줄 (2-pass) | ~134줄 (enrichment) | ~220줄 (중복 파서) |
| 신규 코드 | ~175줄 (Rust 130 + TS 45) | ~30줄 | ~패키지 구조 + ~50줄 |
| **순 감소** | **약 80줄 증가** | **~104줄 감소** | **~170줄 감소** |

**Phase 1~4까지의 성과**: ~810줄 감소 + 정확도 향상 + 구조적 개선 달성. 엔진 코드 대비 약 30% 감소 목표의 대부분 달성.

**5-1/5-2 보류 근거:**
- **코드 순감소 거의 없음**: 2-pass + enrichment 제거(~227줄)하지만 Rust measure 인프라 + breakpoints 로직(~205줄)이 대체. `calculateContentWidth()` 188줄, `calculateContentHeight()` 475줄의 비즈니스 로직은 그대로 유지.
- **성능 이득 미미**: 2-pass tree rebuild 제거 시 레이아웃 1회당 ~0.5-1ms 절감 (100노드 기준). 현재 전체 프레임 16ms 내에서 체감 불가, 60fps 유지 중.
- **정확도**: 현재 2-pass + enrichment로 실용적 정확도 확보. Flex row `flex-grow` 자식의 텍스트 줄바꿈 edge case만 개선.
- **위험**: Rust FFI 경계에 새 API 3개 추가 → WASM 빌드 영향, 모든 리프 노드 경로 변경 → 회귀 범위 광범위. `TaffyTree<()>` → `TaffyTree<MeasureData>` 제네릭 변경은 Rust 측 전면 수정.
- **유지보수 부담 증가**: Rust↔TS 양쪽에 measure data 동기화 로직 추가 → 디버깅 복잡도 상승.

**5-3 보류 근거:**
- 단독 가치는 있으나 (중복 ~220줄 제거 + layout-flow calc()/var() 지원), 패키지 구조 변경(신규 패키지 생성, 의존성 추가)의 부담이 현 시점에서 우선순위 낮음.
- `@xstudio/layout-flow`에 첫 런타임 의존성 추가되는 트레이드오프.

**재검토 트리거:**
- 캔버스 노드 수 500+ 이상에서 2-pass가 프레임 드롭 원인으로 측정될 때 → 5-1/5-2 재개
- CSS `calc()`/`var()`가 Block 레이아웃에서 필요해질 때 → 5-3 재개
- Taffy 메이저 버전 업그레이드(0.10+) 시 API 변경에 맞춰 → 5-1/5-2 함께 진행

#### Phase 5-1 상세: WASM Measure Function Callback

**목표**: Taffy의 `compute_layout_with_measure()` API를 활용하여 리프 노드의 intrinsic size를 Taffy 내부에서 동적으로 결정. 현재의 "pre-enrichment → compute → (조건부 2nd pass)" 패턴을 제거.

##### 현재 구조 (문제점)

```
JS: enrichWithIntrinsicSize(child, availableWidth)   ← 사전 계산 (정확한 width 모름)
JS: normalizeStyle({ ...style, width: enrichedW, height: enrichedH })
JS→WASM: createNode(styleJSON)                       ← 고정 width/height로 노드 생성
WASM: TaffyTree<()>.compute_layout()                 ← measure function = Size::ZERO
WASM→JS: getLayoutsBatch() → Float32Array
JS: 할당 width ≠ enriched width?                     ← 2-pass 필요 여부 판단
  → clear() → re-enrich → 재계산                    ← 전체 트리 재구축 오버헤드
```

- `TaffyTree<()>`: NodeContext가 unit 타입 → measure function 항상 `Size::ZERO`
- `compute_layout()`: 내부적으로 `compute_layout_with_measure(node, available, |_,_,_,_,_| Size::ZERO)` 호출
- 리프 노드 크기는 JS에서 주입한 `style.width/height` 고정값에만 의존
- Flex row에서 `flex-grow/shrink`로 자식 width 변경 시 텍스트 줄바꿈 높이 부정확 → 2-pass 필요

##### Taffy 0.9.2 MeasureFunc API

```rust
// taffy::tree::TaffyTree<NodeContext>
pub fn compute_layout_with_measure<MeasureFunction>(
    &mut self,
    node_id: NodeId,
    available_space: Size<AvailableSpace>,
    measure_function: MeasureFunction,
) -> Result<(), TaffyError>
where
    MeasureFunction: FnMut(
        Size<Option<f32>>,           // known_dimensions (Some = 고정, None = 측정 필요)
        Size<AvailableSpace>,        // available_space (Definite/MinContent/MaxContent)
        NodeId,                      // node_id
        Option<&mut NodeContext>,    // node_context (리프 노드에 연결된 데이터)
        &Style,                      // style
    ) -> Size<f32>,
```

- **리프 노드(자식 0개)에서만 호출** (`taffy_tree.rs:384-394`)
- Taffy 내부에서 `known_dimensions`와 `available_space`를 정확하게 제공
- `NodeContext`는 `TaffyTree` 제네릭 파라미터로 임의 데이터 첨부 가능

##### 설계 방안 비교

| 방안 | 설명 | FFI 왕복 | 성능 | 복잡도 |
|------|------|---------|------|--------|
| **A: JS Function 콜백** | `js_sys::Function`으로 JS measure 함수를 Rust에 전달, 매 리프 노드마다 Rust→JS→Rust 왕복 | 리프 수 × 2~3회 | **나쁨** (호출당 ~1-5μs, 100회 = 100-500μs) | 높음 |
| **B: Pre-registered NodeContext** (권장) | `TaffyTree<MeasureData>` + `new_leaf_with_context()`. JS에서 intrinsic size를 Rust NodeContext에 사전 등록, Rust measure function이 context에서 반환 | **0회** | **최적** | 중간 |
| **C: SharedArrayBuffer** | 공유 메모리로 measure 결과 교환 | 0회 | 좋음 | 매우 높음 (COOP/COEP 헤더 필요) |

**방안 B 채택 근거**: FFI 콜백 오버헤드 제로, wasm-bindgen Closure 메모리 관리 불필요, 현재 enrichment 패턴과 구조적으로 유사하여 점진적 전환 가능.

##### 방안 B 구현 설계

**Phase 5-1a: Rust 측 변경** (`taffy_bridge.rs`)

```rust
// 1. NodeContext 타입 정의
#[derive(Clone, Default)]
struct MeasureData {
    width: f32,             // intrinsic content width (border-box)
    height: f32,            // intrinsic content height (border-box)
    // 텍스트 줄바꿈용: (available_width, resulting_height) 엔트리
    // Rust 측에서 available_space에 가장 가까운 엔트리로 보간
    text_breakpoints: Option<Vec<(f32, f32)>>,
}

// 2. TaffyTree 제네릭 변경
pub struct TaffyLayoutEngine {
    tree: TaffyTree<MeasureData>,    // () → MeasureData
    nodes: Vec<Option<NodeId>>,
    free_list: Vec<usize>,
}

// 3. Measure function (Rust 내부, FFI 왕복 없음)
fn measure_from_context(
    known_dimensions: Size<Option<f32>>,
    available_space: Size<AvailableSpace>,
    _node_id: NodeId,
    context: Option<&mut MeasureData>,
    _style: &Style,
) -> Size<f32> {
    let Some(data) = context else { return Size::ZERO };

    let width = known_dimensions.width.unwrap_or(data.width);
    let height = known_dimensions.height.unwrap_or_else(|| {
        // 텍스트 줄바꿈: available_width에 따른 height 보간
        if let (Some(breakpoints), AvailableSpace::Definite(avail_w)) =
            (&data.text_breakpoints, available_space.width)
        {
            interpolate_text_height(breakpoints, avail_w)
        } else {
            data.height
        }
    });

    Size { width, height }
}

// 4. 텍스트 높이 보간 (available_width → height)
fn interpolate_text_height(breakpoints: &[(f32, f32)], available_width: f32) -> f32 {
    // breakpoints는 (width, height) 쌍으로 width 내림차순 정렬
    // available_width 이하인 가장 가까운 엔트리의 height 반환
    for &(w, h) in breakpoints {
        if available_width >= w { return h; }
    }
    breakpoints.last().map(|&(_, h)| h).unwrap_or(0.0)
}

// 5. 새 API 메서드들
#[wasm_bindgen]
impl TaffyLayoutEngine {
    /// 리프 노드 생성 + intrinsic size context 등록
    pub fn create_leaf_with_measure(
        &mut self, style_json: &str,
        intrinsic_w: f32, intrinsic_h: f32,
    ) -> usize { ... }

    /// 기존 노드의 measure data 갱신 (2-pass 대체)
    pub fn set_measure_data(
        &mut self, handle: usize,
        intrinsic_w: f32, intrinsic_h: f32,
    ) { ... }

    /// 텍스트 줄바꿈 breakpoints 등록
    /// breakpoints_flat: [w1, h1, w2, h2, ...] flat Float32Array
    pub fn set_text_breakpoints(
        &mut self, handle: usize,
        breakpoints_flat: &[f32],
    ) { ... }

    /// compute_layout → compute_layout_with_measure로 변경
    pub fn compute_layout(
        &mut self, handle: usize,
        available_width: f32, available_height: f32,
    ) { ... } // 내부: self.tree.compute_layout_with_measure(node, avail, measure_from_context)
}
```

**Phase 5-1b: TS 측 변경** (`taffyLayout.ts` + `BaseTaffyEngine.ts`)

```typescript
// taffyLayout.ts — 새 메서드 래핑
class TaffyLayout {
  createLeafWithMeasure(styleJSON: string, w: number, h: number): number { ... }
  setMeasureData(handle: number, w: number, h: number): void { ... }
  setTextBreakpoints(handle: number, breakpoints: Float32Array): void { ... }
}

// BaseTaffyEngine.ts — computeWithTaffy에서 사용
// 기존: taffy.createNode(styleJSON) + enrichedStyle에 width/height 주입
// 변경: taffy.createLeafWithMeasure(styleJSON, intrinsicW, intrinsicH)
//       (width/height를 style이 아닌 context로 전달)
```

**Phase 5-1c: 2-pass 제거** (`TaffyFlexEngine.ts`)

```
현재 2-pass:
  1차: enrichment → createNode(styleJSON with injected w/h) → compute
  2차: clear() → re-enrich(actualWidth) → 재구축 → 재계산

변경 후 (breakpoints 방식):
  JS: calculateTextBreakpoints(child, [availW, availW*0.75, availW*0.5, ...])
  JS→WASM: setTextBreakpoints(handle, breakpoints)
  WASM: compute_layout_with_measure → measure_from_context가 정확한 height 반환
  → 2-pass 불필요
```

또는 (2-pass 간소화 방식):
```
  1차: createLeafWithMeasure(style, w, h) → compute
  JS: 할당 width 확인 → setMeasureData(handle, actualW, newH) → 재계산
  → tree clear/rebuild 없이 context만 갱신
```

##### 텍스트 Breakpoints 전략

텍스트 줄바꿈이 필요한 요소(`TEXT_LEAF_TAGS`, `INLINE_BLOCK_TAGS`의 텍스트 기반)에 대해:

1. JS에서 3~5개 breakpoint width를 생성: `[availW, availW*0.75, availW*0.5, availW*0.25, minContentW]`
2. 각 width에 대해 `measureWrappedTextHeight()` 호출 → `(width, height)` 쌍
3. `setTextBreakpoints(handle, flatArray)` 로 Rust에 등록
4. Taffy measure function이 `available_space.width`에 가장 가까운 height 반환

**성능**: breakpoint 수 × 텍스트 측정 비용. 리프 노드 50개 × 5 breakpoints = 250회 측정. 현재 2-pass(100회 + 100회 = 200회)와 유사하지만 WASM tree rebuild 비용 제거.

##### 영향 범위

| 파일 | 변경 내용 | 추정 라인 |
|------|----------|----------|
| `taffy_bridge.rs` | `TaffyTree<MeasureData>`, measure function, 새 API 3개 | +80~100줄 |
| `taffyLayout.ts` | 새 메서드 래핑 3개 | +30줄 |
| `BaseTaffyEngine.ts` | `createLeafWithMeasure` 호출 경로 | +15줄 |
| `TaffyFlexEngine.ts` | 2-pass 로직 제거 → breakpoints 등록 | -93줄, +30줄 |
| `TaffyGridEngine.ts` | `createLeafWithMeasure` 사용 | +5줄 |
| `utils.ts` | `enrichWithIntrinsicSize()` → `calculateMeasureData()` 리네임/리팩터 | ±0 (로직 유지, 호출 방식만 변경) |

##### 검증 계획

1. Rust 유닛 테스트: `measure_from_context`, `interpolate_text_height`, `create_leaf_with_measure` API
2. TS 유닛 테스트: `TaffyFlexEngine` 2-pass 시나리오가 1-pass로 동일 결과
3. 통합 검증: Flex row + `flex-grow` Button 텍스트 줄바꿈 높이 정확성
4. 성능 벤치마크: 100노드 트리 레이아웃 시간 비교

##### 위험 요소

- **Taffy measure 호출 횟수**: Taffy는 min-content/max-content/실제 크기에 대해 measure를 최대 3회 호출할 수 있음. breakpoints가 충분하지 않으면 부정확한 보간 가능.
- **하위 호환**: `create_node()` API는 유지하되 내부에서 `MeasureData::default()` 사용. 기존 코드 점진적 전환 가능.
- **Rust 빌드 시간**: `TaffyTree<MeasureData>` 제네릭 변경으로 monomorphization 코드 증가 가능 (미미).

---

#### Phase 5-2 상세: Taffy 네이티브 Intrinsic Sizing

**목표**: 5-1의 NodeContext 기반 measure function을 활용하여 `enrichWithIntrinsicSize()` 호출 패턴을 정리. 측정 비즈니스 로직은 유지하되, 호출 위치와 데이터 흐름을 변경.

**의존**: Phase 5-1 완료 필수 (NodeContext + `compute_layout_with_measure` 인프라)

##### 현재 `enrichWithIntrinsicSize()` 분석

- **위치**: `engines/utils.ts:1569-1702` (134줄)
- **역할**: Taffy 계산 **전에** Element의 `style.width/height`에 intrinsic size를 숫자로 주입
- **주입 조건**:
  - height: `rawHeight`가 없거나 `auto`/`fit-content`/`min-content`/`max-content`
  - width: `INLINE_BLOCK_TAGS` 또는 intrinsic 키워드 또는 Flex 자식 `TEXT_LEAF_TAGS`
- **의존 함수**: `calculateContentWidth()` (188줄), `calculateContentHeight()` (475줄), `parseBoxModel()` (123줄)

##### 요소 타입별 측정 분류

| 카테고리 | 태그 | 측정 방식 | measure callback 적합성 |
|----------|------|----------|----------------------|
| Button 계열 | button, submitbutton, fancybutton, togglebutton | sizeConfig + 텍스트 측정 | 적합 (단순 w/h) |
| Badge 계열 | badge, tag, chip | sizeConfig 고정 높이 | 적합 (고정값) |
| Inline Form | checkbox, radio, switch | PHANTOM_INDICATOR_CONFIGS | phantom 노드는 별도 유지 |
| TEXT_LEAF_TAGS | text, heading, description, label, paragraph | 텍스트 줄바꿈 | 적합 (breakpoints 활용) |
| Spec Shapes | combobox, select, dropdown, breadcrumbs | 하드코딩 높이 | 적합 (고정값) |
| 컨테이너 | card, cardheader, cardcontent | 자식 재귀 합산 | Taffy가 자체 처리 (자식이 Taffy 노드이면) |
| Group 계열 | checkboxgroup, radiogroup, tabs | 자식 재귀 + 추가 요소 | 부분 적합 |

##### 변경 설계

```
[Before]
enrichWithIntrinsicSize(child, availWidth)
  → calculateContentWidth(child)     → inject style.width
  → calculateContentHeight(child, w) → inject style.height
  → createNode(JSON.stringify(enrichedStyle))

[After]
calculateMeasureData(child, availWidth)
  → calculateContentWidth(child)     → intrinsicW
  → calculateContentHeight(child, w) → intrinsicH
  → calculateTextBreakpoints(child)  → breakpoints (텍스트 요소만)
  → createLeafWithMeasure(styleJSON, intrinsicW, intrinsicH)
  → setTextBreakpoints(handle, breakpoints)    (텍스트 요소만)
```

**핵심 차이**: `style.width/height`를 오염시키지 않고, 별도 채널(NodeContext)로 intrinsic size 전달. CSS width/height가 명시된 요소는 Taffy가 style에서 직접 사용하고, 명시되지 않은 리프 노드만 measure function에서 context 값 반환.

##### 삭제 대상 코드

| 코드 | 줄 수 | 이유 |
|------|------|------|
| `enrichWithIntrinsicSize()` 함수 본체 | 134줄 | `calculateMeasureData()`로 대체 |
| `TaffyFlexEngine` 2-pass 로직 | 93줄 | breakpoints 또는 context 갱신으로 대체 |
| `TaffyFlexEngine._runTaffyPassRaw()` 중 tree rebuild | ~30줄 | context 갱신만으로 재계산 가능 |

##### 유지 대상 코드 (비즈니스 로직)

| 코드 | 줄 수 | 이유 |
|------|------|------|
| `calculateContentWidth()` | 188줄 | 측정 비즈니스 로직 자체는 변하지 않음 |
| `calculateContentHeight()` | 475줄 | 동일 |
| `parseBoxModel()` | 123줄 | 동일 |
| size config 상수들 | ~180줄 | 동일 |
| phantom indicator 관련 | ~55줄 | Taffy에 phantom 노드 삽입 패턴 유지 |

##### Phantom Indicator 처리

Phantom indicator(Switch/Checkbox/Radio의 DOM-only indicator)는 element tree에 없으므로 measure callback 대상이 아닙니다. 현재 `_runTaffyPassRaw()`에서 phantom 노드를 `childHandles.unshift()`하는 패턴은 **유지**해야 합니다.

```typescript
// 현재 코드 유지 (TaffyFlexEngine._runTaffyPassRaw 내)
if (phantomConfig) {
  const phantomStyle = { width: phantomW, height: phantomH, flexShrink: 0 };
  const phantomHandle = taffy.createNode(JSON.stringify(phantomStyle));
  childHandles.unshift(phantomHandle);
}
```

##### 위험 요소

- **컨테이너 자식 재귀**: `calculateContentHeight()`의 Card/CardHeader/Tabs 등 자식 재귀 합산은 자식이 Taffy 노드로 표현되지 않은 경우에만 필요. 자식이 Taffy 서브트리에 포함되면 Taffy가 자동 계산하므로 해당 분기 제거 가능 (단, 점진적 전환 필요).
- **`style.width/height` 비오염**: 기존에는 enrichment가 style 객체를 직접 변경했으므로 다른 소비자(CSS resolver 등)가 주입된 값을 볼 수 있었음. NodeContext 방식은 style을 깨끗하게 유지하므로 사이드 이펙트 감소.

---

#### Phase 5-3 상세: CSS 파서 공유 패키지

**목표**: 4개 위치에 분산된 CSS 값 파싱 코드를 `@xstudio/css-parser` 패키지로 통합하여 중복 ~220줄 제거.

##### 현재 CSS 파싱 코드 분포

| 패키지/파일 | 파서 함수 | 지원 범위 | 줄 수 |
|------------|----------|----------|------|
| **builder `cssValueParser.ts`** | `resolveCSSSizeValue()`, `resolveCalc()`, `resolveVar()`, `parseBorderShorthand()`, `parseFontShorthand()` | 완전: px/em/rem/vh/vw/vmin/vmax/%/in/cm/mm/ch/ex, calc(), clamp(), min(), max(), var(), env() | 1007줄 |
| **builder `utils.ts`** | `parseNumericValue()`, `parseShorthand()`, `resolvePercentValue()` | px/number만 (자체 구현, cssValueParser 미사용) | ~70줄 |
| **builder `paddingUtils.ts`** | `parsePaddingShorthand()`, `parseBorderWidthShorthand()` | 1/2/3/4값 shorthand (styleConverter 경유) | ~30줄 |
| **layout-flow `xstudio-adapter.ts`** | `parseCSSSize()`, `parseCSSMargin()`, `parseCSSPadding()`, `parseCSSNumber()`, `parseMarginShorthand()`, `styleCreatesBfc()` | px/%/vh/vw만, **calc() 미지원** | ~120줄 |

##### 중복 매핑

| 기능 | cssValueParser | utils.ts | paddingUtils | xstudio-adapter |
|------|:-:|:-:|:-:|:-:|
| 단위 파싱 (px/number) | 완전 | 자체 | (위임) | 자체 |
| % 해석 | 내부 | 자체 | (위임) | Percentage 객체 |
| calc() | 재귀 하강 | (위임) | — | 미지원 |
| var() | DOM fallback | (위임) | — | — |
| 1/2/3/4값 shorthand | — | 자체 | **중복** | **중복** |
| border shorthand | 있음 | (사용) | **중복** | — |
| BFC 판별 | — | — | — | 고유 |

##### 공유 패키지 설계: `@xstudio/css-parser`

**패키지 특성**: 순수 함수, 외부 런타임 의존 없음, 브라우저/Node 양쪽 호환

```
packages/css-parser/
├── package.json          # name: "@xstudio/css-parser"
├── tsconfig.json
└── src/
    ├── index.ts          # barrel export
    ├── size.ts           # resolveCSSSizeValue, resolveCalc, resolveClamp, resolveCSSMin, resolveCSSMax
    ├── var.ts            # resolveVar, createVariableScopeWithDOMFallback
    ├── shorthand.ts      # parseBoxShorthand (통합 1/2/3/4값), parseBorderShorthand, parseFontShorthand
    ├── units.ts          # resolveUnitValue, parseNumericValue (통합)
    └── types.ts          # CSSValueContext, CSSVariableScope, ParsedBorder, ParsedFont, 센티넬 상수
```

##### Tier별 이동 계획

**Tier 1 (필수, 5-3a)**: 핵심 파서 통합
- `resolveCSSSizeValue()` + 내부 의존 함수 (`resolveCalc`, `resolveClamp`, `resolveCSSMin`, `resolveCSSMax`, `resolveUnitValue`)
- `parseBoxShorthand(value): { top, right, bottom, left }` — 3곳의 1/2/3/4값 shorthand 통합
- 타입 + 센티넬 상수: `CSSValueContext`, `FIT_CONTENT`, `MIN_CONTENT`, `MAX_CONTENT`
- `parseNumericValue()` — `utils.ts`와 `xstudio-adapter.ts`의 px/number 파서 통합

**Tier 2 (권장, 5-3b)**: Shorthand 파서
- `parseBorderShorthand()` — `cssValueParser.ts`에서 이동
- `parseFontShorthand()` — `cssValueParser.ts`에서 이동

**Tier 3 (선택적, 5-3c)**: CSS 사양 상수
- `INHERITABLE_PROPERTIES`, `CSS_INITIAL_VALUES` — `cssResolver.ts`에서 이동
- `resolveCurrentColor()` — 공유 가치가 있으면

##### `xstudio-adapter.ts` 전환 설계

현재 `layout-flow` 패키지의 자체 파서(`parseCSSSize`, `parseCSSMargin` 등)는 **`Percentage` 객체** (`{ value: number, unit: '%' }`)를 반환하는데, `resolveCSSSizeValue()`는 **px 숫자**를 반환합니다.

**해결 방안**: `@xstudio/css-parser`에 두 가지 모드 제공

```typescript
// 기본: px 숫자 반환 (builder 용)
resolveCSSSizeValue(value, context): number | null

// 원시 모드: 단위 정보 보존 (layout-flow 용)
parseCSSSizeRaw(value): { value: number, unit: string } | null
// 예: "50%" → { value: 50, unit: '%' }, "10px" → { value: 10, unit: 'px' }
```

`xstudio-adapter.ts`는 `parseCSSSizeRaw()`를 사용하여 Dropflow의 `Percentage` 타입으로 변환:

```typescript
import { parseCSSSizeRaw } from '@xstudio/css-parser';

function parseCSSMarginValue(value: string | number): number | Percentage | 'auto' {
  if (value === 'auto') return 'auto';
  const parsed = parseCSSSizeRaw(String(value));
  if (!parsed) return 0;
  if (parsed.unit === '%') return new Percentage(parsed.value);
  return parsed.value; // px
}
```

##### 의존성 그래프 변경

```
[Before]
@xstudio/layout-flow  (의존 0개, 자체 CSS 파서)
@xstudio/builder      (cssValueParser.ts 내장)

[After]
@xstudio/css-parser    ← 새 패키지 (순수 함수, 의존 0개)
  ↑                ↑
  │                │
@xstudio/layout-flow   @xstudio/builder
  (자체 파서 제거)        (cssValueParser.ts → re-export)
```

##### 제거 가능 코드량

| 파일 | 제거 대상 | 줄 수 |
|------|----------|------|
| `xstudio-adapter.ts` | `parseCSSSize()`, `parseCSSMargin()`, `parseCSSPadding()`, `parseCSSNumber()`, `parseMarginShorthand()`, `parseCSSConstraint()` | ~120줄 |
| `utils.ts` | `parseNumericValue()`, `parseShorthand()`, `resolvePercentValue()` | ~70줄 |
| `paddingUtils.ts` | `parsePaddingShorthand()`, `parseBorderWidthShorthand()` | ~30줄 |
| **합계** | | **~220줄** |

##### 주의사항

1. **`@xstudio/layout-flow` 첫 runtime dependency**: 현재 외부 의존 0개. `@xstudio/css-parser` 추가 시 첫 번째 런타임 의존. 트레이드오프: 중복 제거 vs 의존성 추가. `css-parser`가 순수 함수 패키지이므로 리스크 낮음.
2. **`resolveVar()` DOM 접근**: `document.documentElement` 접근이 있으며, SSR 환경 가드(`typeof document === 'undefined'`)가 이미 존재. 공유 패키지로 이동해도 동일 가드 유지.
3. **`cssValueParser.ts` 잔여 코드**: `resolveVar()`, `resolveEnv()` 등 `CSSVariableScope` 의존 코드는 빌더 전용 DOM 접근이 포함되어 있어 공유 패키지 이동 시 환경 분리 검토 필요.
4. **테스트 전략**: `@xstudio/css-parser`에 독립 테스트 스위트 신설. 기존 `cssValueParser.ts` 테스트가 없으므로 이동 시 함께 작성.

##### 검증 계획

1. `@xstudio/css-parser` 독립 유닛 테스트: 모든 CSS 단위, calc(), var(), shorthand 파싱
2. `@xstudio/layout-flow` 기존 테스트 통과 확인 (canvaskit-shaper 26개)
3. 빌더 type-check + 전체 테스트 스위트

---

## 부록: 예상 절감 요약

| Phase | 제거 가능 라인(추정) | 비고 |
|-------|---------------------|------|
| Phase 1 | ~50줄 + dead file 1개 | 리스크 없는 즉시 실행 (xHeight는 Phase 4로 이동) |
| Phase 2 | ~30줄 + 버그 2건 수정 | 기능 정상화 |
| Phase 3 | ~320줄 | 중복 코드 대폭 축소 |
| Phase 4 | ~280줄 + 정확도 향상 | 구조적 개선 **(전 항목 완료)** |
| Phase 5 | ~220줄 (5-3 중복 제거) + 2-pass 제거 (5-1/5-2) + 성능 향상 | 근본 아키텍처 변경 |
| **합계** | **~860줄** | 현재 엔진 코드 대비 약 30% 감소 예상 |

---

### Phase 4-1B: TextMeasurer 스타일 정합성 완성 (2026-02-26)

Phase 4-1이 "배관 연결"(measureTextWidth → getTextMeasurer() 경유)만 완료한 반면,
4-1B는 배관을 통해 흐르는 데이터(스타일 속성)의 완전성을 보장합니다.

**수정 파일:**
| 파일 | 주요 변경 |
|------|----------|
| `utils/textMeasure.ts` | TextMeasureStyle 인터페이스 확장, Canvas2DTextMeasurer 스타일 반영, measureWrappedTextHeight → TextMeasurer 경유 |
| `utils/canvaskitTextMeasurer.ts` | ParagraphStyle을 렌더러(nodeRenderers.ts)와 완전 일치 (slant, width, letterSpacing, wordSpacing, fontFeatures, halfLeading) |
| `engines/utils.ts` | measureTextWidth 시그니처 확장, Math.round 제거(width+height), calculateContentWidth/Height 스타일 전달 완성, fontWeight 하드코딩 제거 |

**해소된 ENGINE_re.md 항목:**
- §2.1.2 Canvas 2D 텍스트 측정 → 완전 해결
- §2.2.3 수동 줄바꿈 시뮬레이션 → 완전 해결
- §2.2.4 +2px/+4px 매직 넘버 → CanvasKit 경로 해소 (Canvas 2D 폴백 유지)
- §2.3.2 TextMeasurer 전략 패턴 무효화 → 완전 해결

**신규 발견 및 해결:**
- CanvasKitTextMeasurer ParagraphStyle 불완전성 (letterSpacing/slant/width/fontFeatures 누락)
- calculateTextWidth의 Math.round에 의한 소수점 절사
- estimateTextHeight의 Math.round + fontWeight 하드코딩
- calculateContentHeight의 fontWeight 하드코딩 (500)

---

### Phase 4-1C: box-sizing 근본 수정 (2026-02-26)

`enrichWithIntrinsicSize()`가 content-box/border-box를 조건부로 혼합 주입하던 문제를 근본적으로 해소합니다. 웹 CSS의 `* { box-sizing: border-box }` 관행과 일치하도록 enrichment 경로를 통일합니다.

**문제**: `enrichWithIntrinsicSize()`가 조건부로 content-box/border-box를 혼합 주입.
CSS에 padding이 있으면 content-box (padding 미포함), 없으면 spec default padding 포함.
Dropflow adapter는 `boxSizing: 'border-box'` 고정이므로 content-box 값을 border-box로 해석 → padding 이중 차감.

**현상**: Text 컴포넌트(`width: fit-content`, `padding: 10`)에서 content width=27이 그대로 주입 → Dropflow가 27을 border-box로 해석 → content=27-10-10=7 → padding 적용 불가.

**수정:**

1. `enrichWithIntrinsicSize()` — 항상 border-box 값 주입:
   - 조건부 `hasCSSVerticalPadding`/`hasCSSHorizontalPadding`/`isInlineBlockTag` 분기 제거
   - content + padding + border = border-box 크기를 항상 주입
   - 임시 `boxSizing: 'content-box'` 주입 제거

2. `applyCommonTaffyStyle()` — border-box → content-box 변환 추가:
   - Taffy는 content-box를 사용하므로 numeric width/height에서 padding+border 차감
   - `Math.max(0, width - hInset)` / `Math.max(0, height - vInset)`

3. Dropflow adapter — 변경 없음 (이미 `boxSizing: 'border-box'` 고정)

**수정 파일:**

| 파일 | 변경 |
|------|------|
| `engines/utils.ts` | `enrichWithIntrinsicSize()` 조건부 로직 제거 → 항상 border-box 값 주입 |
| `engines/utils.ts` | `applyCommonTaffyStyle()` border-box → content-box 변환 추가 |

**추가 수정: fontSize 기본값 일관성 통일**

`calculateContentWidth()`에서 수정된 fontSize CSS 상속 패턴을 나머지 측정 경로에도 일관 적용:

| 위치 | 변경 전 | 변경 후 |
|------|---------|---------|
| `calculateContentHeight()` 시그니처 | 4개 파라미터 | `computedStyle?: ComputedStyle` 5번째 파라미터 추가 |
| `calculateContentHeight()` TEXT_LEAF_TAGS (line ~1395) | `?? 16` | `?? computedStyle?.fontSize ?? 16` |
| `calculateContentHeight()` fontWeight/fontFamily | `?? 400` / `?? specFontFamily.sans` | `?? computedStyle?.fontWeight ?? 400` / `?? computedStyle?.fontFamily ?? specFontFamily.sans` |
| `calculateContentHeight()` lineHeight fallback (line ~1414) | `parseNumericValue(style?.fontSize)` | `parseNumericValue(style?.fontSize) ?? computedStyle?.fontSize` |
| `enrichWithIntrinsicSize()` min/max-content (line ~1649) | `14` | `_computedStyle?.fontSize ?? 16` |
| `enrichWithIntrinsicSize()` → `calculateContentHeight()` 호출 | computedStyle 미전달 | `_computedStyle` 전달 |

이로써 width 측정(`calculateContentWidth`)과 height 측정(`calculateContentHeight`) 양쪽 모두 CSS 상속 fontSize를 동일하게 반영합니다.

**해소된 ENGINE_re.md 항목:**
- §2.1.3 box-sizing 수동 변환 (Dropflow) → enrichment 경로에서 근본 해소
- §3-4 `xstudio-adapter.ts`에 `boxSizing: 'border-box'` 전달 → enrichment가 이미 border-box 값을 주입하므로 별도 전달 불필요

---

### Phase 4-6: Phantom Indicator CSS 레이아웃 보정 (2026-02-26)

Switch/Checkbox/Radio의 phantom indicator가 CSS 레이아웃 속성(padding, align-items, gap)을 무시하던 문제를 수정합니다. Phantom indicator는 Element 트리에 존재하지 않고 spec shapes로만 렌더링되기 때문에, Taffy가 계산한 레이아웃 결과를 화면에 그대로 적용하면 CSS 레이아웃 속성의 효과가 반영되지 않았습니다.

#### 문제 상세

**padding 미반영**: Taffy는 padding을 레이아웃 계산에 반영하지만, phantom indicator 자체는 border-box 원점 `(0, 0)`에 고정 배치됩니다. Label 요소는 content area로 이동하므로, 두 요소 사이에 위치 어긋남이 발생합니다.

**align-items: center 무효**: `height: auto` 컨테이너에서 `BuilderCanvas`가 Taffy에 sentinel 값(-1)을 전달하면 Taffy는 콘텐츠 기반 높이를 결정합니다. 이 경우 컨테이너 높이 = 콘텐츠 높이가 되어 `align-items`가 세로 정렬에 효과를 발휘하지 못합니다.

**gap 이중 적용**: Phantom indicator의 너비(`phantomWidth`)는 indicator 크기 + `specGap`을 포함하여 계산됩니다. CSS `gap`을 동시에 설정하면 Taffy가 CSS gap을 별도로 추가하여 간격이 이중으로 적용됩니다.

**Label align-items 미작동**: `height: auto` 컨테이너에 sentinel(-1)이 전달되면 Taffy 내부에서 콘텐츠 기반 높이를 결정하므로 `align-items`가 동작하지 않습니다.

#### 수정 원칙

| 상황 | 동작 |
|------|------|
| CSS `gap` 미설정 | `specGap`으로 기존 동작 유지 |
| CSS `gap` 설정 | `phantomWidth`에서 `specGap` 제거, CSS gap이 간격 담당 |
| `align-items` 계산 | content area 기준 (border-box - padding) |
| `height: auto` + PHANTOM_TAGS | `containerHeight`를 Taffy에 전달하여 align-items 활성화 |

#### 수정 파일 (5개)

| 파일 | 변경 내용 |
|------|----------|
| `sprites/ElementSprite.tsx` | specNode 렌더링 시 padding 오프셋 + align-items 오프셋 적용 |
| `engines/TaffyFlexEngine.ts` | CSS gap 설정 시 `phantomWidth`에서 `specGap` 제거 |
| `engines/index.ts` | Dropflow fallback 경로에 CSS gap 반영 |
| `engines/utils.ts` | `calculateContentWidth/Height` CSS gap 대체 처리, `getPhantomIndicatorSpace`에 `gap` 필드 추가 |
| `BuilderCanvas.tsx` | `PHANTOM_TAGS`의 `height: auto` 컨테이너에 `containerHeight` 전달 |

#### 핵심 변경 로직

**ElementSprite.tsx — padding + align-items 오프셋**

```typescript
// specNode 배치 시 padding을 반영한 오프셋 계산
const paddingLeft = parsePx(style.paddingLeft) ?? 0;
const paddingTop  = parsePx(style.paddingTop)  ?? 0;

// align-items: center 오프셋 (content area 기준)
const contentH    = containerH - paddingTop - (parsePx(style.paddingBottom) ?? 0);
const alignOffset = alignItems === 'center' ? (contentH - specH) / 2 : 0;

// indicator는 content area 원점에서 시작
x = paddingLeft;
y = paddingTop + alignOffset;
```

**TaffyFlexEngine.ts — CSS gap 시 specGap 제거**

```typescript
// CSS gap이 설정된 경우 phantomWidth에서 specGap을 차감
const cssGap = parsePx(style.gap ?? style.columnGap) ?? 0;
const phantomWidth = cssGap > 0
  ? phantomConfig.width - phantomConfig.specGap  // CSS gap이 간격 담당
  : phantomConfig.width;                          // 기존: specGap 포함
```

**BuilderCanvas.tsx — PHANTOM_TAGS height:auto에 containerHeight 전달**

```typescript
// height: auto 컨테이너라도 PHANTOM_TAGS는 실제 컨테이너 높이를 Taffy에 전달
// → Taffy가 align-items 계산에 사용할 수 있는 definite height 확보
const taffyHeight = (isPhantomTag && containerH > 0)
  ? containerH   // 실제 높이 전달
  : -1;          // sentinel (콘텐츠 기반 결정)
```

#### 해소된 ENGINE_re.md 항목

- §3.2.4 Phantom Indicator 설정 이중 정의 → `getPhantomIndicatorSpace`에 `gap` 필드 추가로 CSS gap/specGap 분기를 단일 진입점에서 처리

---

## 부록 B: 검증 커맨드 체크리스트

각 Phase 작업 후 실행하여 회귀를 확인하는 커맨드 목록.

```bash
# 1. 전체 타입 체크 (모든 Phase 공통)
pnpm type-check

# 2. 레이아웃 엔진 유닛 테스트 (Phase 1~3)
pnpm -F @xstudio/builder exec vitest run src/builder/workspace/canvas/layout/engines/__tests__/

# 3. Rust WASM 테스트 (Phase 2: order, margin:auto)
(cd apps/builder/src/builder/workspace/canvas/wasm && cargo test)

# 4. layout-flow 패키지 테스트 (Phase 4-5: xHeight, TextShaper)
# layout-flow에는 자체 vitest 스크립트가 없으나 루트 vitest로 실행 가능
# --dir로 루트를 packages/layout-flow로 고정해 워크트리/외부 경로 매칭을 방지
pnpm exec vitest run --dir packages/layout-flow src/adapters/__tests__/

# 5. Dead Code 검증 (Phase 1-3: skia/textMeasure.ts 삭제 전후)
# import 0건 확인 (grep 매치 0건 시 exit code 1이므로 || true로 보정)
grep -r "skia/textMeasure" apps/builder/src/ --include="*.ts" --include="*.tsx" || true

# 6. 빌드 성공 확인 (모든 Phase 공통)
pnpm build
```

> **라인 번호 참조에 대한 안내**: 이 문서의 위치 정보는 **심볼명(함수/상수/struct명) + 파일명**을 기준으로 기재하고, 라인 번호는 `~line N` 형태로 보조 참고용으로만 포함됨. 코드 변경에 따라 라인 번호는 밀릴 수 있으므로, 검색 시 심볼명을 사용할 것.
>
> **외부 의존 버전 참조에 대한 안내**: `canvaskit-wasm@0.40.0` 등 외부 패키지의 타입 정의에 대한 근거는 해당 버전 기준이며, 패키지 업그레이드 시 재검증 필요. `FontMetrics` 인터페이스 변경 여부는 `canvaskit-wasm` 릴리즈 노트 참조.

---

## Phase 4-6: Select Compositional Architecture 레이아웃 수정 (2026-02-26)

> **근본 원인**: Select를 Monolithic(Spec Shapes) → Compositional(Card 패턴) 아키텍처로 전환 시,
> 레이아웃 파이프라인의 여러 단계에서 Monolithic 가정이 잔존하여 높이/패딩 계산 오류 발생.

### 수정 항목

| # | 파일 | 변경 | 원인 |
|---|------|------|------|
| 1 | `utils.ts` `applyCommonTaffyStyle` | padding/border 차감 제거 | Taffy 0.9는 `style.size`를 border-box로 처리. content-box 변환은 이중 차감 |
| 2 | `BuilderCanvas.tsx` SelectTrigger padding | `parsePadding()` 통합 파싱 | CSS shorthand(`padding:"10px"`) 미감지. `cs.paddingTop ?? default` 패턴은 longhand만 체크 |
| 3 | `SelectionComponents.ts` Factory | `display:flex, flexDirection:column, gap:8` 추가 | Web CSS와 Factory 기본값 불일치 |
| 4 | `utils.ts` `calculateContentHeight` Select | 동적 자식 순회 (Card 패턴) | 하드코딩 LABEL_OFFSETS/SELECT_TRIGGER_HEIGHTS → 실제 자식 높이 합산 |
| 5 | `utils.ts` gap 파싱 | `isNaN(parsed) ? 8 : parsed` | `parseFloat("0") \|\| 8 = 8` falsy 트랩 |
| 6 | `utils.ts` `SPEC_SHAPES_INPUT_TAGS` | `'select'` 제거 | Compositional component는 enrichment padding 경로 사용 |
| 7 | `BuilderCanvas.tsx` Label 필터링 | `hasLabel` 조건부 필터 | Web preview는 `label` prop 없으면 Label 비렌더, canvas 미일치 |
| 8 | `utils.ts` `parseBoxModel` | `isFormElement`에서 `'select'` 제거 | Compositional container ≠ form element. BUTTON_SIZE_CONFIG 패딩(10px) 부적절 적용 |
| 9 | `utils.ts` `DEFAULT_ELEMENT_HEIGHTS` | `'label'` 제거 | 하드코딩 20px ≠ Tailwind v4 `line-height:1.5`(21px@14px). 동적 `fontSize*1.5` 사용 |

### 아키텍처 교훈

**Compositional 전환 시 필수 검증 지점**:

1. **parseBoxModel 분류**: `isFormElement` / `INLINE_UI_SIZE_CONFIGS` — container는 제외
2. **SPEC_SHAPES_INPUT_TAGS**: Compositional은 제외 (padding을 enrichment가 추가)
3. **calculateContentHeight**: 자식 순회 패턴 (childElements 활용, Card 패턴 참조)
4. **BuilderCanvas implicit style**: `??` 패턴으로 사용자 값 우선
5. **Factory 기본값**: Web CSS와 1:1 동기화
6. **자식 가시성**: Web preview 조건과 canvas 필터링 일치
7. **DEFAULT_ELEMENT_HEIGHTS**: TEXT_LEAF_TAGS는 동적 계산 사용
8. **CSS 값 파싱**: `0` 값 falsy 트랩 방지, shorthand+longhand 통합 파싱

### Taffy 0.9 Box Model 확정

```
Taffy 0.9 style.size = border-box
  → Taffy 내부: content = size - padding - border
  → layout.size = border-box (padding+border 포함)
  → applyCommonTaffyStyle: 변환 불필요 (XStudio box-sizing:border-box 그대로 전달)
```

---

## Phase 4-6B: Select Spec Shapes 배경색 수정 (2026-02-27)

> **근본 원인**: Compositional Architecture 전환 시 Factory 기본값과 Spec 토큰이 불일치하여
> spec shapes의 배경 렌더링이 실패.

### 수정 항목

| # | 파일 | 변경 | 원인 |
|---|------|------|------|
| 1 | `SelectTrigger.spec.ts` | `'transparent'` 방어 처리 추가 | Factory `backgroundColor:'transparent'`가 `??`를 통과 못 함 → variant.background 무시 |
| 2 | `SelectIcon.spec.ts` | 배경 `roundRect` shape 추가 | CSS `.select-chevron { background }` 에 대응하는 spec shape 누락 |
| 3 | `SelectIcon.spec.ts` | 토큰 `'{color.accent-container}'` → `'{color.surface-container-high}'` | 미정의 토큰 → resolveToken() undefined → 검은색(0,0,0) |
| 4 | `SelectionComponents.ts` | `backgroundColor:'transparent'` 제거 (5곳) | SelectTrigger, SelectValue, SelectIcon, ComboBoxWrapper |

### 미정의 토큰 → 검은색 렌더링 경로

```
'{color.accent-container}' (미정의)
  → resolveToken() → lightColors['accent-container'] → undefined
  → colorValueToFloat32(undefined) → hex = undefined
  → undefined >> 16 = 0, undefined >> 8 = 0, undefined & 0xff = 0
  → r=0, g=0, b=0, a=1 → 검은색
```

### CSS 변수 → Spec 토큰 매핑 (Select)

| CSS 변수 | variant | Spec 토큰 |
|----------|---------|-----------|
| `--select-accent-container` | default | `'{color.surface-container-high}'` |
| `--select-on-accent-container` | default | `'{color.on-surface}'` |
| `--select-accent-container` | primary | `'{color.primary-container}'` |
| `--select-on-accent-container` | primary | `'{color.on-primary-container}'` |

---

## Phase 4-6C: ComboBox Compositional Architecture 전환 (2026-02-27)

### 근본 원인
ComboBox가 Monolithic 모드에서 Compositional 모드로 전환되었으나, 레이아웃/렌더링 파이프라인의 여러 지점에서 등록이 누락되어 색상/보더 미렌더링 및 높이 계산 오류 발생.

### 수정 항목

| # | 파일 | 수정 내용 |
|---|------|-----------|
| 1 | `ComboBox.spec.ts` | `_hasChildren` 게이팅 추가 — Compositional 모드에서 label/input/border/text/chevron 스킵, dropdown만 렌더링. Select.spec.ts와 동일 패턴 |
| 2 | `ComboBox.spec.ts` | `'transparent'` 방어 패턴 추가 (`userBg !== 'transparent'`) |
| 3 | `SelectionComponents.ts` | ComboBox Factory parent에 `style: { display: 'flex', flexDirection: 'column', gap: 8 }` 추가 |
| 4 | `utils.ts` | `SPEC_SHAPES_INPUT_TAGS`에서 `'combobox'` 제거 |
| 5 | `utils.ts` | `calculateContentHeight`: `isSelect` → `isCompositional` (select+combobox 공통), `wrapperTag` 변수로 SelectTrigger/ComboBoxWrapper 자동 매핑 |
| 6 | `BuilderCanvas.tsx` | Select/ComboBox padding 주입 통합 — `wrapperChildTag` 변수로 분기 제거 |
| 7 | `BuilderCanvas.tsx` | ComboBoxWrapper 컨테이너: 하드코딩 `height:30` 제거 → `??` 패턴 spec 기반 padding |
| 8 | `BuilderCanvas.tsx` | Monolithic 처리 블록(`backgroundColor:'transparent'` + `children:''` 강제) → `'transparent'` 방어만 유지 |
| 9 | `ElementSprite.tsx` | `TAG_SPEC_MAP`: ComboBoxWrapper→SelectTriggerSpec, ComboBoxInput→SelectValueSpec, ComboBoxTrigger→SelectIconSpec (재사용) |
| 10 | `ElementSprite.tsx` | **CRITICAL** `UI_SELECT_CHILD_TAGS`에 ComboBoxWrapper/ComboBoxInput/ComboBoxTrigger 추가 |

### CRITICAL: UI_SELECT_CHILD_TAGS 등록 누락 버그

```
미등록 시 렌더링 경로:
  getSpriteType('ComboBoxWrapper') → 'flex' (일반 컨테이너)
  → isUIComponent = false (box/text/image/flex/grid 제외)
  → spec shapes 렌더링 스킵
  → 색상/보더 미렌더링

등록 후 정상 경로:
  getSpriteType('ComboBoxWrapper') → 'selectChild'
  → isUIComponent = true
  → SelectTriggerSpec.render.shapes() 실행
  → roundRect 배경 + border 정상 렌더링
```

### Spec 재사용 패턴

| ComboBox 자식 | 재사용 Spec | 렌더링 |
|---------------|-------------|--------|
| ComboBoxWrapper | SelectTriggerSpec | roundRect bg + border |
| ComboBoxInput | SelectValueSpec | text (placeholder/value) |
| ComboBoxTrigger | SelectIconSpec | chevron icon + bg |
