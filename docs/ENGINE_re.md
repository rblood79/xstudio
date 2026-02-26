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

#### 2.2.4 `+2px`/`+4px` 매직 넘버 보정

- **위치**: `engines/utils.ts` — `calculateContentWidth()` 내부 (~line 738: Checkbox/Radio/Switch 레이블 +2px, ~line 785: 일반 텍스트 +4px). `enrichWithIntrinsicSize()`가 이 함수를 간접 호출.
- **현상**: Canvas 2D와 CanvasKit 간 측정 불일치를 매직 넘버로 수동 보정
- **영향**: 폰트/사이즈에 따라 보정값이 부적절할 수 있음
- **수정 방안**: 동일 엔진(CanvasKit) 사용 시 자연스럽게 해소.

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
| 3-4 | `xstudio-adapter.ts`에 `boxSizing: 'border-box'` 전달 → 수동 변환 제거 | ~20줄 | 쉬움 |
| 3-5 | `createsBFC()`에서 Dropflow `styleCreatesBfc()` import 사용 | ~15줄 | 쉬움 (단, 패키지 API export 수정 필요) |
| 3-6 | Shorthand 왕복 변환 제거 (CSS 값 직접 전달) | ~40줄 | 중간 |

### Phase 4: 중기 — 아키텍처 개선

| # | 작업 | 절감 | 난이도 |
|---|------|------|--------|
| 4-1 | `TextMeasurer` 전략 패턴 완성 → Canvas 2D / CanvasKit 자동 전환 | 매직 넘버 제거 + 정확도 향상 | 중간 |
| 4-2 | `BaseTaffyEngine` 추상 클래스 도입 → 인스턴스 관리 / 결과 수집 / 부모 설정 공통화 | ~145줄 | 중간 |
| 4-3 | Rust 브릿지에 `GridTemplateComponent::Repeat` 지원 → TS repeat() 파싱 제거 | ~135줄 | 높음 |
| 4-4 | TaffyGridEngine에 `enrichWithIntrinsicSize()` 호출 추가 (검증 후) | 잠재 버그 수정 | 중간 |
| 4-5 | `xHeight` 근사 개선 — glyph bounds 기반 측정 또는 canvaskit-wasm 업그레이드 후 교체 (`@xstudio/layout-flow` 패키지 내부) | 텍스트 baseline 정확도 향상 | 중간 (측정 방식 재설계 + `canvaskit-shaper.test.ts` 갱신 필요) |

### Phase 5: 장기 — 근본 아키텍처

| # | 작업 | 효과 | 난이도 |
|---|------|------|--------|
| 5-1 | WASM measure function 콜백 구현 → 2-pass layout 제거 | 성능 + 정확도 대폭 향상 | 매우 높음 |
| 5-2 | Taffy 네이티브 intrinsic sizing 활용 → `enrichWithIntrinsicSize()` 축소 | ~134줄의 pre-enrichment 로직이 measure function 콜백으로 재구조화 + 2-pass 루프 (~57줄) 제거 | 높음 |
| 5-3 | Dropflow `styleCreatesBfc()` export + Shorthand 파서 공유 패키지로 이동 | 크로스 패키지 중복 해소 | 높음 (패키지 public API 변경 수반). `@xstudio/shared`는 UI 컴포넌트 패키지이므로 별도 `@xstudio/css-utils` 신설 또는 `@xstudio/layout-flow` barrel export 확장 검토 |

---

## 부록: 예상 절감 요약

| Phase | 제거 가능 라인(추정) | 비고 |
|-------|---------------------|------|
| Phase 1 | ~50줄 + dead file 1개 | 리스크 없는 즉시 실행 (xHeight는 Phase 4로 이동) |
| Phase 2 | ~30줄 + 버그 2건 수정 | 기능 정상화 |
| Phase 3 | ~320줄 | 중복 코드 대폭 축소 |
| Phase 4 | ~280줄 + 정확도 향상 | 구조적 개선 |
| Phase 5 | ~130줄 + 성능 향상 | 근본 아키텍처 변경 |
| **합계** | **~810줄** | 현재 엔진 코드 대비 약 30% 감소 예상 |

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
