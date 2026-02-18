# CSS 레이아웃 엔진 설계문서

> Status: Phase 9-11 Complete, Ongoing Refinement
> Date: 2026-02-18
> 현재 엔진: TaffyFlexEngine (Taffy WASM) + TaffyGridEngine (Taffy WASM) + DropflowBlockEngine (Dropflow Fork JS)

---

## 0. 현재 상태 요약

### 0.1 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│                    Style Resolution                      │
│              (CSS style → computed style)                │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Engine Dispatcher                       │
│          selectEngine(display) → LayoutEngine            │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│DropflowBlockEng. │  │ TaffyFlexEngine  │  │ TaffyGridEngine  │
│ (Dropflow Fork)  │  │ (Taffy WASM)     │  │ (Taffy WASM)     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
          │              │              │
          └──────────────┼──────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   ComputedLayout[]                       │
│          { x, y, width, height, ... }                    │
└─────────────────────────────────────────────────────────┘
```

> **Phase 9-11 변경:** 기존 3개 독립 파서(parseSize, parseCSSValue, parseCSSSize)가 `resolveCSSSizeValue()`로 통합됨. Yoga/@pixi/layout 완전 제거.

### 0.2 카테고리별 일치율 현황

| 카테고리 | 현재 일치율 | 목표 | 핵심 갭 |
|----------|-----------|------|---------|
| Flexbox | 93% | 98% | order, baseline 정밀도, % gap |
| Block Layout | 90% | 95% | margin %, 텍스트+블록 혼합 |
| Box Model | **95%** | 95% | ~~calc(), border shorthand~~ → ~~inherit/var()~~ 구현 완료. padding/margin % 잔여 |
| Typography | **92%** | 92% | ~~white-space, word-break, verticalAlign, fontStyle~~ → 폰트 메트릭 baseline 정밀화 잔여 |
| Visual Effects | **90%** | 90% | ~~다중 box-shadow, transform~~ → gradient 고급, filter 잔여 |
| Grid | **85%** | 85% | ~~repeat(), minmax(), auto-placement, span~~ → subgrid, named lines 잔여 |
| CSS 단위 | **85%** | 85% | ~~em, calc(), min/max-content~~ → clamp(), env() 잔여 |
| Position | **80%** | 80% | ~~fixed, z-index stacking context~~ 구현 완료 |
| Spec 렌더링 정합성 | **100%** | **100%** | 62/62 전체 PASS 달성 |
| **전체 가중 평균** | **~96%** | **~95%+** | S1~S6 스프린트 완료, 목표 달성 |

> **Spec 렌더링 정합성** (`docs/SPEC_VERIFICATION_CHECKLIST.md` 기준): 62개 컴포넌트 중 PASS **62개(100%)**, FAIL **0개**, WARN **0개**. shadow-before-target 순서 오류(7개), gradient Skia 미지원(4개), 배열 borderRadius(1개), line auto cast(2개), dashed/dotted border(2건), 고정 width bg 미추출(3건), TokenRef 중첩 해석(3건), Radio circle column 변환(1건)이 모두 구현 완료되었다.

### 0.3 일치율 산정 기준

본 문서의 "일치율"은 구현 완료율이 아니라 **브라우저 CSS 결과 대비 정합성**을 의미한다.
산정은 아래 3개 축을 분리하여 추적한다.

| 축 | 기준 | 집계 방식 |
|----|------|-----------|
| 컴포넌트 시각 정합성 | `docs/SPEC_VERIFICATION_CHECKLIST.md` | PASS / WARN / FAIL 분리 집계 |
| 레이아웃 정합성 | 본 문서 §2 체크리스트 + 벤치마크 | 지원 기능 커버리지 + 좌표 오차(±1px) |
| 구현 완료도 | 마이그레이션 문서(`docs/how-to/migration/WEBGL.md`) | 구현/동기화 파일 수 기준 |

> 운영 원칙
>
> - PR/리포트에는 세 지표를 혼합하지 않고 항상 **개별 수치**로 표기한다.
> - "95%+"는 시각+레이아웃 통합 정합성 목표이며, 구현 완료율 100%와 동의어가 아니다.

### 0.4 근본 원인 분석

현재 갭의 근본 원인은 5가지 계층으로 분류된다:

| 계층 | 원인 | 영향 범위 | 해결 상태 |
|------|------|----------|-----------|
| ~~**L1: Yoga 한계**~~ | ~~Yoga가 CSS 스펙의 일부만 구현~~ | ~~Block, Grid 전체~~ | ✅ **해결됨** — Taffy WASM(Flex/Grid) + Dropflow Fork(Block) |
| **L1': Taffy/Dropflow 제한** | Dropflow IFC는 DOM 텍스트 노드 필요. XStudio prop 기반 컴포넌트와 직접 호환 불가 | Block 레이아웃의 inline-block 처리 | DropflowBlockEngine에서 inline-block 에뮬레이션(layoutInlineRun)으로 우회 중 |
| **L2: CSS 값 파서 부족** | ~~`calc()`, `em`, `min-content/max-content`, `border` shorthand 미파싱~~ → 대부분 해결 | 모든 엔진 공통 | ✅ Phase 1 완료 — `resolveCSSSizeValue()` 통합. 잔여: `clamp()`, `env()` |
| **L3: 렌더링 피처 부재** | `transform`, 다중 `box-shadow`, `overflow: scroll` 미구현 | 시각 효과 | 부분 완료 — ✅ gradient, shadow 순서, 배열 borderRadius 완료. 미완: transform, multi-shadow, overflow scroll |
| ~~**L4: CSS 값 파서 파편화**~~ | ~~3개 독립 파서가 각각 다른 단위를 지원~~ | ~~모든 엔진 공통~~ | ✅ **해결됨** — `cssValueParser.ts`의 `resolveCSSSizeValue()`로 통합 |
| ~~**L5: @pixi/layout formatStyles 캐싱**~~ | ~~`formatStyles()`가 이전 프레임 스타일 병합~~ | ~~Yoga 경로 전체~~ | ✅ **해결됨** — @pixi/layout 완전 제거 (Phase 11), 문제 자체 소멸 |

---

## 1. 목표 & 범위

### 1.1 WYSIWYG 보장

**WYSIWYG 보장**: 캔버스에서 보이는 것 ≈ 브라우저에서 보이는 것 (지원 범위 내)

TaffyFlexEngine/TaffyGridEngine(Taffy WASM) + DropflowBlockEngine(Dropflow Fork)으로 주요 CSS 레이아웃 기능을 지원한다.

### 1.2 P0/P1 지원 대상

**P0 지원 대상 (신규 구현):**
- `display: block` - 수직 쌓임, width 100% 기본값
- Margin collapse - 인접 형제 블록 간 (양수/음수/혼합)

**P0 유지 (기존 동작):**
- `display: flex` - TaffyFlexEngine (Taffy WASM) ✅

**P1 지원 대상:**
- `display: inline-block` - DropflowBlockEngine 에뮬레이션 (layoutInlineRun) ✅
- `display: grid` - TaffyGridEngine (Taffy WASM) ✅
- Margin collapse - 부모-자식, 빈 블록
- BFC 생성 조건 (overflow, flow-root 등)

### 1.3 Non-Goals (명시적 제외)

다음 기능은 이 설계안의 범위에 포함되지 않는다:

| 기능 | 상태 | 사유 |
|------|------|------|
| `display: inline` (완전한 인라인 텍스트 흐름, IFC) | 기본 inline 지원됨 (DropflowBlockEngine) | 완전한 Inline Formatting Context (line breaking, bidi 등)는 미지원 |
| `float` 고급 시나리오 (`shape-outside` 등) | 기본 float 지원됨 (DropflowBlockEngine) | `shape-outside` 등 고급 float 시나리오는 미지원 |
| `vertical-align` (baseline 정렬) | Phase 6에서 지원됨 | 폰트 메트릭 계산 기반 지원 완료. P2 이후 정밀화 검토 |
| `writing-mode` (세로 쓰기) / RTL | 미지원 | 노코드 빌더 1차 범위 외 |
| CSS 단위 `rem`, `em`, `calc()` | ✅ 구현 완료 | `resolveCSSSizeValue()`로 지원 |
| Grid `repeat()`, `minmax()`, auto-placement | ✅ 지원 | TaffyGridEngine에서 지원 |
| `z-index` / stacking context | ✅ 지원 | Phase 6에서 구현 완료 |
| `position: sticky` | 미지원 | 스크롤 컨텍스트 필요, 복잡도 높음. z-index paint order 정합성을 위해 stacking context 생성 규칙만 반영 |
| `white-space` 상호작용 | 기본 지원 | 텍스트 레이아웃 엔진 필요. Phase 4에서 기본 지원 |
| `inherit`, `initial`, `unset` 키워드 | ✅ 지원 | cssResolver.ts에서 CSS 캐스케이드 + 상속 지원 |
| 폰트 메트릭 기반 baseline 계산 | Phase 6에서 지원됨 | 텍스트 측정 엔진 기반 구현 완료 |
| CSS `@media` queries | 미지원 | 반응형은 빌더의 브레이크포인트 시스템으로 처리 |
| CSS `transition` / `animation` | 미지원 | 캔버스 에디터에서는 정적 레이아웃만 표시 (프리뷰에서 지원) |
| CSS `@container` queries | 미지원 | CSS Containment Level 3, 복잡도 매우 높음 |
| `::before` / `::after` pseudo-elements | 미지원 | 노코드 빌더에서 직접 요소로 표현 |
| `table` display (table, table-row, table-cell) | 미지원 | HTML table 전용 레이아웃, Grid로 대체 |

---

## 2. CSS vs 현재 엔진 동작 차이

### 2.1 Display 모델 비교

| CSS display | 브라우저 동작 | 현재 엔진 동작 | 지원 상태 |
|-------------|--------------|---------------|----------|
| `block` | 전체 너비, 수직 쌓임, margin collapse | DropflowBlockEngine ✅ | ✅ |
| `inline-block` | inline + block 혼합, 가로 배치 | DropflowBlockEngine (에뮬레이션) ✅ | ✅ |
| `inline` | 텍스트처럼 흐름 | DropflowBlockEngine (기본) ⚠️ | ⚠️ 기본 지원 |
| `flex` | Flexbox 레이아웃 | TaffyFlexEngine ✅ | ✅ |
| `grid` | 2D 그리드 레이아웃 | TaffyGridEngine ✅ | ✅ |
| `none` | 렌더링 안함 | 지원 | ✅ |

### 2.2 Block Formatting Context (BFC)

BFC는 CSS 레이아웃의 핵심 개념. 내부 레이아웃이 외부에 영향을 주지 않는 독립 영역.

#### 2.2.0 BFC 생성 조건 (Chrome 기준)

| 조건 | 설명 |
|------|------|
| `<html>` 루트 요소 | 문서 전체가 하나의 BFC |
| `float: left/right` | float 요소 |
| `position: absolute/fixed` | out-of-flow 요소 |
| `display: inline-block` | inline-block 요소 |
| `display: table-cell` | 테이블 셀 |
| `display: table-caption` | 테이블 캡션 |
| `display: flow-root` | **모던 방법** (권장) |
| `display: flex/inline-flex` | Flex 컨테이너 |
| `display: grid/inline-grid` | Grid 컨테이너 |
| `overflow: hidden/auto/scroll` | visible 외 |
| `contain: layout/content/paint` | CSS Containment |
| `column-count` 또는 `column-width` | 다단 컨테이너 |

> **`display: flow-root`**: 부작용 없이 BFC를 생성하는 모던 방법. `overflow: hidden`의 스크롤바나 클리핑 문제 없음.

#### 2.2.1 Width 기본값

| 상황 | CSS block | DropflowBlockEngine |
|------|-----------|---------------------|
| width 미지정 | 부모 100% | 부모 100% ✅ |
| 부모 padding 있음 | 부모 content-box 100% | 부모 content-box 100% ✅ |

```css
/* CSS 예시 */
.parent { width: 400px; padding: 20px; }
.child { /* width 미지정 */ }
/* 결과: child width = 360px (400 - 20 - 20) */
```

```
레거시 Yoga 결과: child width = 콘텐츠 너비 (예: 100px) — 현재는 DropflowBlockEngine이 100% 기본값을 올바르게 적용
```

**✅ 구현 완료**: DropflowBlockEngine에서 width 미지정 시 `100%` 기본값 적용

#### 2.2.2 수직 쌓임 (Vertical Stacking)

CSS block 요소는 자동으로 수직 쌓임:

```
┌─────────────────────────┐
│ Block 1                 │
├─────────────────────────┤
│ Block 2                 │
├─────────────────────────┤
│ Block 3                 │
└─────────────────────────┘
```

레거시 Yoga는 flexDirection 없이는 모든 요소가 0,0에 쌓였으나, 현재 DropflowBlockEngine은 네이티브 수직 쌓임을 지원합니다.

**✅ 해결됨**: DropflowBlockEngine이 block 요소의 수직 쌓임을 네이티브로 처리. 레거시 `flexDirection: 'column'` 워크어라운드는 제거됨.

### 2.3 Margin Collapse (마진 병합)

CSS의 가장 복잡한 기능 중 하나. DropflowBlockEngine이 CSS 명세에 부합하는 margin collapse를 지원합니다.

> **중요**: 수평(left/right) 마진은 **절대 collapse 안함**. 오직 **수직(top/bottom) 마진만** collapse.

#### 2.3.1 인접 형제 마진 병합

```css
.block1 { margin-bottom: 20px; }
.block2 { margin-top: 30px; }
/* CSS 결과: 간격 = 30px (큰 값) */
/* 레거시 Yoga 결과: 간격 = 50px (합산) — DropflowBlockEngine은 CSS 명세대로 30px */
```

#### 2.3.2 부모-자식 마진 병합

**첫 번째 자식의 margin-top이 부모로 흘러나오는 조건**:
- 부모에 `border-top` 없음
- 부모에 `padding-top` 없음
- 부모와 자식 사이에 inline 콘텐츠 없음
- clearance 없음

**마지막 자식의 margin-bottom이 부모로 흘러나오는 조건**:
- 부모에 `border-bottom` 없음
- 부모에 `padding-bottom` 없음
- 부모에 `height`, `min-height` 없음

```css
.parent { margin-top: 0; }
.child:first-child { margin-top: 20px; }
/* CSS 결과: parent 상단에 20px 마진 (자식 마진이 부모로 "흘러나옴") */
/* 레거시 Yoga 결과: parent 내부에 20px 마진 — DropflowBlockEngine은 CSS 명세대로 처리 */
```

#### 2.3.3 빈 블록의 자기 자신 마진 병합 ⚠️

**문서에서 자주 누락되는 케이스**: 빈 블록 요소는 자신의 top/bottom 마진이 collapse됨.

```css
.empty { margin-top: 20px; margin-bottom: 30px; height: 0; }
/* CSS 결과: 총 30px 공간만 차지 (collapse됨) */
/* 레거시 Yoga 결과: 50px 공간 차지 (합산) — DropflowBlockEngine은 CSS 명세대로 30px */
```

**빈 블록 collapse 차단 조건**:
- `height` 또는 `min-height` 지정
- `border` 지정
- `padding` 지정
- inline 콘텐츠 있음 (텍스트, 이미지 등)

#### 2.3.4 마진 값 계산 규칙 (Chrome 명세)

| 상황 | 결과 |
|------|------|
| 둘 다 양수 (+20, +30) | 큰 값 = 30 |
| 둘 다 음수 (-20, -10) | 절대값이 큰 값 = -20 |
| 양수/음수 혼합 (+50, -20) | 합산 = 30 |

#### 2.3.5 마진 병합 조건 (CSS 명세)

다음 조건을 **모두** 만족해야 병합:
1. 두 마진 모두 **block-level** 요소 (inline, inline-block 제외)
2. 같은 **BFC(Block Formatting Context)** 내
3. 사이에 line box, clearance, padding, border **없음**
4. float나 absolute positioned **아님**
5. **수직 마진만** (수평 마진은 절대 collapse 안함)

#### 2.3.6 마진 병합 차단 조건

마진 병합을 막는 조건은 두 가지로 분류됩니다:

**A. 새 BFC(Block Formatting Context) 생성:**

| 조건 | 설명 |
|------|------|
| `overflow: hidden/auto/scroll` | visible 외 모든 값 |
| `display: flex/grid` | Flex/Grid 컨테이너 |
| `display: inline-block` | Inline-block 요소 |
| `display: flow-root` | **모던 방법** (부작용 없음) |
| `float: left/right` | Float 요소 |
| `position: absolute/fixed` | Out-of-flow 요소 |
| `contain: layout/content/paint` | CSS Containment |

**B. 물리적 분리 (부모-자식 마진 병합만 차단):**

| 조건 | 설명 |
|------|------|
| 부모에 `padding-top/bottom` 있음 | 마진 사이에 공간 생성 |
| 부모에 `border-top/bottom` 있음 | 마진 사이에 경계 생성 |

> **참고**: padding/border는 BFC를 생성하지 않습니다. 부모-자식 간 마진 병합만 막으며, 형제 간 마진 병합에는 영향 없습니다.

### 2.4 Inline-Block 동작

| 특성 | block | inline-block | inline |
|------|-------|--------------|--------|
| 너비 | 부모 100% | 콘텐츠 | 콘텐츠 |
| 높이 | 콘텐츠 | 콘텐츠 | line-height |
| 수직 정렬 | margin/padding | vertical-align | baseline |
| 줄바꿈 | 강제 | 자연 | 자연 |
| margin/padding | 상하좌우 | 상하좌우 | 좌우만 |
| 새 줄 시작 | 항상 | X | X |
| width/height 설정 | O | O | **X** |

#### 2.4.0 CSS Blockification (Flex/Grid 자식 요소) ⚠️

**CSS Display Level 3 명세**: Flex 또는 Grid 컨테이너의 자식 요소들은 자동으로 "blockified" 됩니다.

| 원래 display | blockified display |
|--------------|-------------------|
| `inline` | `block` |
| `inline-block` | `block` |
| `inline-table` | `table` |
| `inline-flex` | `flex` |
| `inline-grid` | `grid` |

```css
/* 예시 */
.parent { display: flex; }
.child { display: inline-block; }  /* 브라우저에서는 block으로 계산됨 */
```

**브라우저 동작 확인:**
```javascript
// button은 기본적으로 inline-block
const parent = document.body;
parent.style.display = 'block';
console.log(getComputedStyle(button).display); // "inline-block"

parent.style.display = 'flex';
console.log(getComputedStyle(button).display); // "block" (blockified!)
```

**XStudio 구현:**
- `DropflowBlockEngine`의 Dropflow Fork가 부모 display에 따라 자식 display 변환 처리
- `LayoutContext.parentDisplay` 필드로 부모 display 전달
- flex, inline-flex, grid, inline-grid 컨테이너에서 blockification 적용

#### 2.4.1 vertical-align 속성 (P2)

`inline-block` 요소의 수직 정렬은 `vertical-align` 속성으로 제어:

| 값 | 동작 |
|----|------|
| `baseline` (기본) | 요소의 baseline을 부모의 baseline에 정렬 |
| `top` | 요소 상단을 line box 상단에 정렬 |
| `bottom` | 요소 하단을 line box 하단에 정렬 |
| `middle` | 요소 중앙을 부모 baseline + x-height/2에 정렬 |
| `text-top` | 요소 상단을 부모 폰트 상단에 정렬 |
| `text-bottom` | 요소 하단을 부모 폰트 하단에 정렬 |

#### 2.4.2 Inline-Block의 Baseline 결정 규칙 ⚠️

**Chrome의 baseline 결정 로직** (복잡함):

| 상황 | Baseline 위치 |
|------|--------------|
| 일반적인 경우 | 마지막 줄의 텍스트 baseline |
| `overflow: hidden/auto/scroll` | **margin-box 하단** (baseline 아님!) |
| 콘텐츠 없음 | **margin-box 하단** |
| 여러 줄 텍스트 | 마지막 줄의 baseline |

```css
/* 예시: 두 inline-block의 baseline이 다르게 계산됨 */
.box1 { display: inline-block; height: 100px; }
.box2 { display: inline-block; height: 100px; overflow: hidden; }
/* box1: 내부 텍스트의 baseline 사용 */
/* box2: 하단 edge가 baseline (overflow 때문) */
```

**구현 복잡도**: 높음 - baseline 계산 로직 필요

#### 2.4.3 현재 구현 (레거시 워크어라운드 제거됨)

**✅ 해결됨**: DropflowBlockEngine의 `layoutInlineRun` 2-pass 알고리즘이 inline-block 가로 배치와 줄바꿈을 네이티브로 처리합니다. 레거시 `flexDirection: 'row'` + `flexWrap: 'wrap'` 워크어라운드는 제거됨.

**남은 제한사항**:
- `vertical-align` baseline 정렬은 P2 (현재 top 정렬)
- 완전한 inline 요소와의 혼합은 부분 지원

#### 2.4.4 Inline vs Inline-Block 차이점 (참고)

| 특성 | inline | inline-block |
|------|--------|--------------|
| width/height | **무시됨** | 적용됨 |
| margin-top/bottom | **무시됨** | 적용됨 |
| padding-top/bottom | 시각적 영역만 확장 (line box 높이에 영향 가능) | 레이아웃에 영향 |
| line-height 영향 | 받음 | 자체 height 사용 |

> **참고**: inline 요소의 padding-top/bottom은 배경/테두리 영역만 확장하고 일반적으로 line box 높이에 영향을 주지 않지만, 일부 케이스(replaced elements, 특정 브라우저)에서 line box에 영향을 줄 수 있습니다.

### 2.5 현재 Grid 구현 상태

TaffyGridEngine(Taffy WASM)이 CSS Grid 레이아웃을 네이티브로 처리합니다:

```typescript
// 지원 속성
gridTemplateColumns: string;  // '1fr 2fr 1fr', '100px auto 100px'
gridTemplateRows: string;
gridTemplateAreas: string;    // '"header header" "sidebar main"'
gap, rowGap, columnGap: number | string;
gridColumn, gridRow, gridArea: string;
```

**지원 범위 (체크리스트):**

| 기능 | 지원 | 비고 |
|------|:----:|------|
| `fr` 단위 | ✅ | |
| `px`, `auto` | ✅ | |
| `%` 단위 | ✅ | |
| `gridTemplateAreas` | ✅ | |
| `gap`, `rowGap`, `columnGap` | ✅ | |
| `gridColumn`, `gridRow` | ✅ | span 포함 |
| `repeat()` | ✅ | TaffyGridEngine 네이티브 지원 |
| `minmax()` | ✅ | TaffyGridEngine 네이티브 지원 |
| `auto-fit`, `auto-fill` | ✅ | TaffyGridEngine 네이티브 지원 |
| auto-placement (암시적 그리드) | ✅ | TaffyGridEngine 네이티브 지원 |
| subgrid | ❌ | Taffy 미지원 |

**✅ 해결됨**: TaffyGridEngine이 Taffy WASM을 통해 CSS Grid를 네이티브로 계산. 레거시 `@pixi/layout` 별도 계산 패턴은 제거됨.

---

## 3. 엔진 아키텍처

### 3.1 설계 철학

브라우저 CSS 엔진과 유사한 아키텍처 채택:

```
┌─────────────────────────────────────────────────────────┐
│                    Style Resolution                      │
│              (CSS style → computed style)                │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Engine Dispatcher                       │
│          selectEngine(display) → LayoutEngine            │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│DropflowBlockEng. │  │ TaffyFlexEngine  │  │ TaffyGridEngine  │
│ (Dropflow Fork)  │  │ (Taffy WASM)     │  │ (Taffy WASM)     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
          │              │              │
          └──────────────┼──────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   ComputedLayout[]                       │
│          { x, y, width, height, ... }                    │
└─────────────────────────────────────────────────────────┘
```

### 3.2 공통 타입 정의

```typescript
// layout/engines/types.ts

/**
 * 마진 값
 */
export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * 박스 모델 계산 결과
 */
export interface BoxModel {
  /** 명시적 width (undefined면 auto) */
  width?: number;
  /** 명시적 height (undefined면 auto) */
  height?: number;
  /** 콘텐츠 기반 너비 (자식/텍스트 등) */
  contentWidth: number;
  /** 콘텐츠 기반 높이 */
  contentHeight: number;
  /** padding */
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** border width */
  border: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}
```

### 3.3 엔진 인터페이스 설계

```typescript
// layout/engines/LayoutEngine.ts

/**
 * 계산된 레이아웃 결과
 */
export interface ComputedLayout {
  /** 부모 기준 x 좌표 */
  x: number;
  /** 부모 기준 y 좌표 */
  y: number;
  /** 계산된 너비 */
  width: number;
  /** 계산된 높이 */
  height: number;
  /** 요소 ID (추적용) */
  elementId: string;
  /** 마진 정보 (collapse 계산용) */
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    /** collapse된 상단 마진 */
    collapsedTop?: number;
    /** collapse된 하단 마진 */
    collapsedBottom?: number;
  };
}

/**
 * 레이아웃 엔진 인터페이스
 *
 * 각 display 타입별로 구현
 */
export interface LayoutEngine {
  /**
   * 자식 요소들의 레이아웃 계산
   *
   * @param parent - 부모 요소
   * @param children - 자식 요소 배열
   * @param availableWidth - 사용 가능한 너비 (부모 content-box)
   * @param availableHeight - 사용 가능한 높이
   * @param context - 레이아웃 컨텍스트 (BFC 정보 등)
   * @returns 각 자식의 계산된 레이아웃
   */
  calculate(
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    context?: LayoutContext
  ): ComputedLayout[];

  /**
   * 엔진이 처리하는 display 타입
   */
  readonly displayTypes: string[];
}

/**
 * 레이아웃 컨텍스트 (BFC, 마진 collapse 등)
 */
export interface LayoutContext {
  /** Block Formatting Context ID */
  bfcId: string;
  /** 이전 형제의 하단 마진 (collapse 계산용) */
  prevSiblingMarginBottom?: number;
  /** 부모 요소의 마진 collapse 참여 여부 */
  parentMarginCollapse?: boolean;
}
```

### 3.4 유틸리티 함수

> **입력 규약 (현재)**:
> - `width`, `height`: `px`, `%`, `vh`, `vw`, `number`, `auto`, `calc()`, `em`, `rem` 지원 (`resolveCSSSizeValue()` 통합 파서)
> - `margin`, `padding`, `border-width`: `px`, `number`, `%`, `calc()` 지원
> - `rem`, `em`, `calc()`, `var()`: `resolveCSSSizeValue()`로 지원 ✅
>
> **CSS 값 파싱 정책 (resolveCSSSizeValue)**:
> - `cssValueParser.ts`의 `resolveCSSSizeValue()`가 모든 CSS 값을 통합 파싱
> - 지원 단위: `calc()`, `em`, `rem`, `vh`, `vw`, `%`, `var()`
> - 각 엔진(TaffyFlexEngine, TaffyGridEngine, DropflowBlockEngine)이 내부적으로 활용
> - **한계**: 교차 차원(width에 vh, height에 vw)은 부모의 해당 축 기준으로 해석됨 (빌더 한정 trade-off)
>
> **Pixi 컴포넌트 CSS 단위 해석 규칙 (getButtonLayout 패턴)**:
> - 모든 Pixi UI 컴포넌트(PixiButton, PixiToggleButton 등)는 CSS 문자열 값을 `parseCSSSize()`로 파싱해야 함
> - `typeof style?.width === 'number'` 패턴 사용 금지 → CSS 문자열 값("200px", "50%")을 무시함
> - **% 해석 기준**: 부모의 content area (부모 width - padding - border), viewport가 아님
> - **vw/vh 해석 기준**: 부모의 content area (빌더에서 부모 내 수용 보장)
> - **부모 content area 계산**: `useStore`로 부모 요소 조회 → `parsePadding()` + `parseBorderWidth()` 차감
> - px, rem: viewport/부모 무관하게 절대값으로 파싱
>
> **미지원 값 처리 정책**:
> - 개별 속성(`marginTop` 등): 미지원 단위 → `undefined` 반환 → 기본값(0 또는 auto) 적용
> - shorthand 내부 토큰(`margin: "10px 1rem"`): 미지원 단위 → 해당 토큰만 `0`으로 폴백
> - 파싱 불가 문자열(`"invalid"`): `undefined` 반환
>
> **운영 가이드**: shorthand 0 폴백은 조용히 처리되어 디버깅이 어려울 수 있음.
> 구현 시 `import.meta.env.DEV`에서 미지원 토큰 경고 로그 권장.
> 경고가 반복될 수 있으니 동일 토큰은 1회만 경고하도록 Set 등으로 중복 방지 권장.
>
> **스타일 입력 전제**: 빌더는 개별 속성으로 스타일을 저장합니다.
> - `borderTopWidth: 1` (O) - 개별 속성
> - `border: "1px solid red"` (X) - CSS shorthand 미지원

```typescript
// layout/engines/utils.ts

import type { Margin, BoxModel } from './types';
import type { Element } from '../../../../../types/core/store.types';

/**
 * 스타일에서 마진 파싱
 *
 * 개별 속성(marginTop 등)이 shorthand(margin)보다 우선합니다.
 * shorthand는 개별 속성이 없는 방향에만 적용됩니다.
 */
export function parseMargin(
  style: Record<string, unknown> | undefined
): Margin {
  if (!style) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  // shorthand를 기본값으로 파싱
  const base = style.margin !== undefined
    ? parseShorthand(style.margin)
    : { top: 0, right: 0, bottom: 0, left: 0 };

  // 개별 속성으로 override
  return {
    top: parseNumericValue(style.marginTop) ?? base.top,
    right: parseNumericValue(style.marginRight) ?? base.right,
    bottom: parseNumericValue(style.marginBottom) ?? base.bottom,
    left: parseNumericValue(style.marginLeft) ?? base.left,
  };
}

/**
 * 스타일에서 패딩 파싱
 */
export function parsePadding(
  style: Record<string, unknown> | undefined
): Margin {
  if (!style) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const base = style.padding !== undefined
    ? parseShorthand(style.padding)
    : { top: 0, right: 0, bottom: 0, left: 0 };

  return {
    top: parseNumericValue(style.paddingTop) ?? base.top,
    right: parseNumericValue(style.paddingRight) ?? base.right,
    bottom: parseNumericValue(style.paddingBottom) ?? base.bottom,
    left: parseNumericValue(style.paddingLeft) ?? base.left,
  };
}

/**
 * 스타일에서 보더 너비 파싱
 *
 * 주의: CSS shorthand `border: "1px solid red"`는 지원하지 않습니다.
 * 빌더는 개별 속성(borderTopWidth 등)으로 저장하는 것을 전제로 합니다.
 * borderWidth shorthand("1px" 또는 "1px 2px")는 지원합니다.
 */
export function parseBorder(
  style: Record<string, unknown> | undefined
): Margin {
  if (!style) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  // borderWidth shorthand (숫자만, "1px solid red" 형태 미지원)
  const base = style.borderWidth !== undefined
    ? parseShorthand(style.borderWidth)
    : { top: 0, right: 0, bottom: 0, left: 0 };

  return {
    top: parseNumericValue(style.borderTopWidth) ?? base.top,
    right: parseNumericValue(style.borderRightWidth) ?? base.right,
    bottom: parseNumericValue(style.borderBottomWidth) ?? base.bottom,
    left: parseNumericValue(style.borderLeftWidth) ?? base.left,
  };
}

/**
 * resolveCSSSizeValue — 통합 CSS 값 파서
 *
 * cssValueParser.ts에서 제공하는 통합 파서.
 * 지원 단위: calc(), em, rem, vh, vw, %, var()
 */
// 상세 구현: apps/builder/src/builder/workspace/canvas/layout/engines/cssValueParser.ts

/**
 * 요소의 박스 모델 계산
 */
export function parseBoxModel(
  element: Element,
  availableWidth: number,
  availableHeight: number
): BoxModel;
```

### 3.5 엔진 디스패처 (selectEngine)

```typescript
// layout/engines/index.ts

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
import { DropflowBlockEngine } from './DropflowBlockEngine';
import { TaffyFlexEngine } from './TaffyFlexEngine';
import { TaffyGridEngine } from './TaffyGridEngine';

// Re-export
export type { LayoutEngine, ComputedLayout, LayoutContext };

// 싱글톤 엔진 인스턴스
const blockEngine = new DropflowBlockEngine();
const flexEngine = new TaffyFlexEngine();
const gridEngine = new TaffyGridEngine();

/**
 * display 속성에 따라 적절한 레이아웃 엔진 선택
 *
 * @example
 * const engine = selectEngine('flex');
 * // 모든 엔진이 직접 calculate()를 호출
 * const layouts = engine.calculate(parent, children, w, h, ctx);
 */
export function selectEngine(display: string | undefined): LayoutEngine {
  switch (display) {
    case 'flex':
    case 'inline-flex':
      return flexEngine;

    case 'grid':
    case 'inline-grid':
      return gridEngine;

    case 'block':
    case 'inline-block':
    case undefined: // 기본값은 block
      return blockEngine;

    default:
      // 알 수 없는 display는 block으로 폴백
      return blockEngine;
  }
}

/**
 * 요소의 자식들에 대한 레이아웃 계산
 *
 * 모든 엔진(TaffyFlexEngine, TaffyGridEngine, DropflowBlockEngine)이
 * 직접 calculate()를 호출합니다. 레거시 shouldDelegateToPixiLayout 패턴은 제거됨.
 */
export function calculateChildrenLayout(
  parent: Element,
  children: Element[],
  availableWidth: number,
  availableHeight: number,
  context?: LayoutContext
): ComputedLayout[] {
  const style = parent.props?.style as Record<string, unknown> | undefined;
  const display = style?.display as string | undefined;

  const engine = selectEngine(display);
  return engine.calculate(parent, children, availableWidth, availableHeight, context);
}
```

#### Phase 9-11 이후 현재 아키텍처

> Phase 9-11에서 Yoga/@pixi/layout이 완전히 제거되고 Taffy WASM + Dropflow Fork로 전환되었다.

엔진 디스패처(`selectEngine`)는 **레이아웃 계산 엔진 선택**을 담당하며, 렌더링과 무관하다:

| 항목 | 현재 구현 | 비고 |
|------|----------|------|
| `selectEngine()` | TaffyFlex/TaffyGrid/DropflowBlock 선택 | 레거시 Yoga 제거 |
| `calculateChildrenLayout()` | 모든 엔진이 직접 calculate() 호출 | shouldDelegate 패턴 제거 |
| **렌더링 경로** | 엔진 결과 → CanvasKit Surface | PixiJS는 이벤트 전용 |

- 모든 레이아웃 엔진이 자체적으로 레이아웃을 계산하고 ComputedLayout[]을 반환한다.
- 레거시 `shouldDelegateToPixiLayout()` 패턴은 제거됨. Yoga WASM 의존성 없음.

### 3.6 DropflowBlockEngine 상세

> **참고**: 아래 코드 예시는 레거시 BlockEngine의 설계 참조용입니다.
> 실제 구현은 `DropflowBlockEngine.ts`에서 Dropflow Fork(`@xstudio/layout-flow`)를 사용합니다.
> DropflowBlockEngine은 margin collapse, float, replaced elements 등을 CSS 명세에 더 부합하게 처리합니다.

```typescript
// layout/engines/DropflowBlockEngine.ts (현재 구현)
// Dropflow Fork(@xstudio/layout-flow)의 calculateBlockLayout()을 호출하여 블록 레이아웃 계산
// 상세: apps/builder/src/builder/workspace/canvas/layout/engines/DropflowBlockEngine.ts

// 주요 기능:
// - Block: CSS 명세 준수 수직 쌓임 + margin collapse
// - Inline-Block: layoutInlineRun() 2-pass 에뮬레이션
// - Flow-Root: BFC 생성 (margin collapse 차단)
// - enrichWithIntrinsicSize(): 리프 UI 컴포넌트 intrinsic size 정적 주입
```

> **레거시 BlockEngine 참조:** Phase 9-11에서 제거된 자체 구현 `BlockEngine.ts`는 margin collapse, inline-block 가로 배치, 빈 블록 self-collapse를 직접 구현했으나, CSS 명세와의 괴리(float, replaced elements, BFC 미지원)로 인해 Dropflow Fork 기반 `DropflowBlockEngine`으로 교체되었다.

### 3.7 TaffyFlexEngine (레거시 FlexEngine/Yoga 대체)

> **참고**: 레거시 FlexEngine의 설계 참조용입니다.
> 실제 구현은 `TaffyFlexEngine.ts`에서 Taffy WASM을 직접 호출합니다.
> 레거시 `shouldDelegateToPixiLayout()` 패턴과 Yoga 위임은 완전히 제거되었습니다.

```typescript
// layout/engines/TaffyFlexEngine.ts (실제 구현)
// Taffy WASM의 네이티브 Flexbox 지원을 사용하여 레이아웃 계산
// Element style → TaffyStyle 변환 후 Taffy에 위임
// 상세: apps/builder/src/builder/workspace/canvas/layout/engines/TaffyFlexEngine.ts

// TaffyFlexEngine은 LayoutEngine 인터페이스를 구현하며
// calculate()를 직접 호출하여 ComputedLayout[]을 반환합니다.
// 레거시 shouldDelegate 패턴은 사용하지 않습니다.
```

### 3.8 TaffyGridEngine (레거시 GridEngine 대체)

> **참고**: 레거시 GridEngine의 설계 참조용입니다.
> 실제 구현은 `TaffyGridEngine.ts`에서 Taffy WASM의 네이티브 Grid 지원을 사용합니다.
> `repeat()`, `minmax()`, auto-placement 등 고급 Grid 기능도 Taffy가 네이티브로 지원합니다.
> 상세: `apps/builder/src/builder/workspace/canvas/layout/engines/TaffyGridEngine.ts`

```typescript
// layout/engines/TaffyGridEngine.ts (실제 구현)
// Taffy WASM의 네이티브 Grid 지원을 사용하여 레이아웃 계산
// GridLayout.utils.ts의 기존 로직을 LayoutEngine 인터페이스로 래핑

// TaffyGridEngine은 LayoutEngine 인터페이스를 구현하며
// calculate()를 직접 호출하여 ComputedLayout[]을 반환합니다.
```

---

## 4. BuilderCanvas 통합

> **Phase 9-11 이후 업데이트:** @pixi/layout, Yoga, @pixi/ui는 완전 제거되었다.
> 현재 레이아웃 엔진은 **TaffyFlexEngine** (Taffy WASM), **TaffyGridEngine** (Taffy WASM),
> **DropflowBlockEngine** (Dropflow Fork JS)이며, 컨테이너는 **DirectContainer**를 사용한다.

### 4.1 레거시 구조 (Phase 1-8, 제거됨)

> 아래 코드는 @pixi/layout의 `LayoutContainer`를 사용하던 레거시 구조이다.
> Phase 9-10에서 @pixi/layout이 제거되면서 이 패턴은 더 이상 사용되지 않는다.

```typescript
// [레거시] BuilderCanvas.tsx — @pixi/layout 시대
const renderTree = useCallback((parentId: string | null) => {
  // ...
  const containerLayout = hasChildren && !baseLayout.flexDirection
    ? { display: 'flex', flexDirection: 'column', ...baseLayout }
    : baseLayout;

  return (
    <LayoutContainer layout={containerLayout}>  {/* ← 제거됨 */}
      <ElementSprite ... />
      {renderTree(child.id)}
    </LayoutContainer>
  );
}, [/* deps */]);
```

### 4.2 현재 구조 (Phase 11+)

```typescript
// BuilderCanvas.tsx — 현재 엔진 디스패처

import { Container } from '@pixi/react';
import { selectEngine } from './layout/engines';

const renderTree = useCallback((parentId: string | null) => {
  const parent = elementsMap.get(parentId);
  const children = pageChildrenMap.get(parentId) ?? [];
  const style = parent?.props?.style as Record<string, unknown> | undefined;
  const display = style?.display as string | undefined;

  // 엔진 선택 (TaffyFlexEngine / TaffyGridEngine / DropflowBlockEngine)
  const engine = selectEngine(display);

  // 모든 display 타입에 대해 엔진이 직접 레이아웃 계산
  return renderWithEngine(engine, parent, children);
}, [/* deps */]);

/**
 * 엔진이 계산한 절대 위치를 DirectContainer로 적용
 */
const renderWithEngine = (
  engine: LayoutEngine,
  parent: Element | undefined,
  children: Element[]
) => {
  if (!parent || children.length === 0) return null;

  const layouts = engine.calculate(
    parent,
    children,
    containerWidth,
    containerHeight
  );

  // 레이아웃 결과를 Map으로 변환 (O(1) 조회)
  const layoutMap = new Map(
    layouts.map((layout) => [layout.elementId, layout])
  );

  return (
    <Container>
      {children.map((child) => {
        const layout = layoutMap.get(child.id);
        if (!layout) return null;

        return (
          <DirectContainer
            key={child.id}
            x={layout.x}
            y={layout.y}
            width={layout.width}
            height={layout.height}
          >
            <ElementSprite element={child} />
            {renderTree(child.id)}
          </DirectContainer>
        );
      })}
    </Container>
  );
};
```

### 4.3 마이그레이션 전략 (완료)

> **Phase 11 이후 상태:** Phase 1-8의 레거시 엔진(Yoga, @pixi/layout, 자체 BlockEngine/FlexEngine/GridEngine)은
> 모두 제거되었으며, Taffy WASM + Dropflow Fork 기반으로 전환 완료되었다.

```
┌─────────────────────────────────────────────────────────┐
│ Phase 1-4: P0 (필수 - WYSIWYG 핵심) ✅ 완료             │
├─────────────────────────────────────────────────────────┤

Phase 1 (요구 동작 문서화) ✅
Phase 2 (인터페이스 정의) ✅
Phase 3 (BlockEngine 구현) ✅
Phase 4 (BuilderCanvas 통합) ✅

├─────────────────────────────────────────────────────────┤
│ Phase 5-6: P1/P2 (정확한 레이아웃 + 고급 기능) ✅ 완료   │
├─────────────────────────────────────────────────────────┤

Phase 5 (P1 기능) ✅
Phase 6 (P2 기능) ✅

├─────────────────────────────────────────────────────────┤
│ Phase 9-11: 엔진 교체 ✅ 완료                            │
├─────────────────────────────────────────────────────────┤

Phase 9-10 (@pixi/layout, Yoga, @pixi/ui 제거) ✅
Phase 11 (레거시 엔진 삭제, Taffy WASM + Dropflow Fork 전환) ✅
├── TaffyFlexEngine (flex/inline-flex) — Taffy WASM
├── TaffyGridEngine (grid/inline-grid) — Taffy WASM
├── DropflowBlockEngine (block/inline-block/inline/flow-root) — Dropflow Fork JS
├── enrichWithIntrinsicSize() — 리프 UI 컴포넌트 intrinsic size 주입
├── DirectContainer — x/y/width/height 직접 설정
└── cssResolver.ts — CSS 캐스케이드 + 상속

└─────────────────────────────────────────────────────────┘
```

### 4.4 CanvasKit/Skia 렌더 파이프라인

> PixiJS 렌더링은 CanvasKit으로 대체되었다.
> PixiJS는 씬 그래프 관리 + EventBoundary(Hit Testing)에만 사용된다.
> 상세: `docs/WASM.md` Phase 5.3-5.7 참조

#### 4.4.1 렌더 파이프라인 전환

**Phase 5 이전 (레거시, 제거됨):**
```
Store → ElementsLayer → ElementSprite → useResolvedElement → effectiveElement
  → PixiJS LayoutContainer(layout props) → PixiJS Graphics 렌더링  [← 제거됨]
```

**Phase 5 (CanvasKit 기본 렌더링):**
```
Store → ElementsLayer → ElementSprite → useResolvedElement → effectiveElement
  → skiaNodeData 생성 → useSkiaNode(전역 레지스트리 등록)
  → SkiaOverlay.buildSkiaTreeHierarchical() → nodeRenderers → CanvasKit Surface
```

**Phase 6 (이중 Surface 2-pass — 현재 구현):**
```
Store → ElementSprite → useResolvedElement($-- 변수 resolve 포함)
  → skiaNodeData 생성 → useSkiaNode(레지스트리 등록 + registryVersion 증가)
  → SkiaOverlay render loop:
      1. classifyFrame(registryVersion, camera, overlayVersion) → idle | present | camera-only | content | full
      2. idle → 렌더링 스킵 (0ms)
      3. present → snapshot blit + 오버레이(Selection/AI/PageTitle) 렌더
      4. camera-only → snapshot 아핀 blit + 오버레이 렌더 (<2ms)
      5. content/full → contentSurface에 **디자인 컨텐츠 전체 재렌더** → snapshot 갱신 → present
```

#### 4.4.2 구조 다이어그램

```
┌───────────────────────────────────────────────────────────────────┐
│ BuilderCanvas (React)                                             │
│ ├── <Application> (PixiJS — 씬 그래프 + 이벤트만, Camera.alpha=0) │
│ │   ├── <Camera> (뷰포트 변환)                                     │
│ │   │   └── <ElementsLayer>                                       │
│ │   │       └── <ElementSprite> (각 디자인 노드)                    │
│ │   │           ├── useResolvedElement() → effectiveElement        │
│ │   │           │   └── resolveElementVariables($-- → 실값 변환)   │
│ │   │           ├── skiaNodeData = useMemo(...)                    │
│ │   │           │   { type, x, y, w, h, fills[], effects[], ... } │
│ │   │           └── useSkiaNode(element.id, skiaNodeData)         │
│ │   │               → 레지스트리 등록 + registryVersion++           │
│ │   └── <SelectionLayer>, <ToolLayer> 등 (이벤트 전용)             │
│ │                                                                 │
│ └── <SkiaOverlay> (CanvasKit — Phase 6 이중 Surface)               │
│     ├── CanvasKit <canvas> (z-index: 2, pointer-events: none)     │
│     ├── SkiaRenderer (이중 Surface 관리)                            │
│     │   ├── mainSurface   — 최종 출력 (화면에 표시)                  │
│     │   ├── contentSurface — 콘텐츠 캐시 (변경 시에만 다시 그림)      │
│     │   └── classifyFrame(registryVersion, camera, overlayVersion) │
│     │       ├── 'idle'        → 렌더링 완전 스킵 (0ms)              │
│     │       ├── 'present'     → snapshot blit + 오버레이 렌더       │
│     │       ├── 'camera-only' → snapshot 아핀 blit + 오버레이 렌더  │
│     │       ├── 'content'     → 컨텐츠 전체 재렌더 + snapshot 갱신  │
│     │       └── 'full'        → 전체 재렌더링 (리사이즈/cleanup)     │
│     │                                                              │
│     ├── render loop (PixiJS ticker 기반)                            │
│     │   ├── registryVersion: useSkiaNode 레지스트리 변경 감지       │
│     │   ├── overlayVersion: selection/AI/pageTitle 상태 변경 감지    │
│     │   ├── buildSkiaTree(AABB 뷰포트 컬링 적용)                    │
│     │   │   └── 화면 밖 노드 스킵, 화면 안 노드만 트리 구성          │
│     │   ├── renderNode(canvas, nodeData) — 콘텐츠 렌더링             │
│     │   │   ├── 'box'  → fills[] + drawRRect/drawPath + stroke     │
│     │   │   │   └── solid/linear/radial/angular/mesh-gradient      │
│     │   │   ├── 'text' → ParagraphBuilder → drawParagraph          │
│     │   │   ├── 'image'→ drawImageRect                             │
│     │   │   └── 'container' → effects[] 적용 + children 재귀       │
│     │   │       └── opacity/background-blur/drop-shadow/layer-blur │
│     │   ├── AI 시각 피드백 렌더링                                    │
│     │   │   ├── renderGeneratingEffects() — 생성 중 애니메이션       │
│     │   │   └── renderFlashes() — 완료 플래시 효과                   │
│     │   └── Selection 오버레이 렌더링                                │
│     │       ├── renderSelectionBox() — 선택 영역 바운딩 박스         │
│     │       ├── renderTransformHandles() — 리사이즈 핸들             │
│     │       └── renderLasso() — 다중 선택 올가미                     │
│     │                                                              │
│     └── (eventBridge 불필요) PixiJS 캔버스가 DOM 이벤트 직접 수신    │
└───────────────────────────────────────────────────────────────────┘
```

#### 4.4.3 핵심 변경 사항

| 기존 (Phase 1-4) | Phase 5-6 (CanvasKit) | 비고 |
|------------------|----------------------|------|
| `LayoutContainer` + `layout` props (레거시, 제거됨) | Taffy/Dropflow 계산 결과를 `skiaNodeData.x/y/width/height`로 전달 | DirectContainer 사용 |
| `ElementSprite` → PixiJS Graphics 렌더링 | `ElementSprite` → `useSkiaNode()` 레지스트리 등록 | Sprite 컴포넌트는 렌더 데이터 생성만 담당 |
| PixiJS `<canvas>` 단일 사용 | PixiJS `<canvas>` (이벤트 전용) + CanvasKit `<canvas>` (렌더 전용) | PixiJS 캔버스가 DOM 이벤트 직접 수신 (브리징 불필요) |
| 매 프레임 전체 렌더링 | Phase 6 이중 Surface + `classifyFrame()` 프레임 분류 | idle: 0ms, camera-only: ~2ms |
| PixiJS SelectionBox 컴포넌트 | Skia `selectionRenderer.ts` 직접 렌더링 | Box/Handle/Lasso 모두 Skia |
| 없음 | AI 시각 피드백 (`aiEffects.ts`) Skia 오버레이 | generating + flash 효과 |
| 없음 | AABB 뷰포트 컬링 — 화면 밖 노드 스킵 | `buildSkiaTreeHierarchical` + `renderNode` |
| `renderWithPixiLayout()` / `renderWithCustomEngine()` (레거시, 제거됨) | `renderWithEngine()` 단일 경로 — 렌더링은 SkiaOverlay가 담당 | §4.2 현재 구조 참조 |

#### 4.4.4 레이아웃 → 렌더링 데이터 흐름

```typescript
// ElementSprite.tsx — Phase 5+ skiaNodeData 생성 예시
// UI 컴포넌트의 경우 variant 기반 색상 매핑 적용 (2026-02-02)
const props = effectiveElement.props as Record<string, unknown> | undefined;
const variant = isUIComponent ? String(props?.variant || 'default') : '';

// variant 기반 배경색 (inline style 미지정 시)
const bgColor = isUIComponent && !hasBgColor
  ? VARIANT_BG_COLORS[variant] ?? 0xece6f0
  : parseFillColor(effectiveElement);
const bgAlpha = VARIANT_BG_ALPHA[variant] ?? 1;
const borderColor = isUIComponent && !hasBorderColor
  ? VARIANT_BORDER_COLORS[variant] ?? 0xcac4d0
  : parseBorderColor(effectiveElement);

const skiaNodeData: SkiaNodeData = useMemo(() => ({
  type: 'box',
  x: 0, y: 0,  // PixiJS worldTransform에서 SkiaOverlay가 보정
  width: effectiveElement.props?.style?.width ?? 100,
  height: effectiveElement.props?.style?.height ?? 100,
  visible: true,
  box: {
    fillColor: bgColor,
    fillAlpha: bgAlpha,
    borderRadius: parseBorderRadius(effectiveElement),
    borderWidth: parseBorderWidth(effectiveElement),
    borderColor: borderColor,
  },
  children: textChildren,  // UI 컴포넌트의 텍스트 노드
}), [effectiveElement]);

useSkiaNode(element.id, skiaNodeData);
```

> **주의:** Phase 11 이후 `LayoutContainer`는 `DirectContainer`로 교체되었고,
> `renderWithPixiLayout`/`renderWithCustomEngine`은 `renderWithEngine` 단일 경로로 통합되었다.
> 레이아웃 계산은 Taffy/Dropflow 엔진이 수행하고, CanvasKit은 계산된 결과를 받아 렌더링한다.

#### 4.4.5 Phase 6 이중 Surface 캐싱 아키텍처

> `SkiaRenderer.ts` — 콘텐츠 변경이 없을 때 렌더링을 스킵하여 idle 프레임 비용을 0ms로 줄인다.

**Surface 구조:**
- `mainSurface`: 최종 출력용. 매 프레임 화면에 flush
- `contentSurface`: 콘텐츠 캐시. 콘텐츠가 변경될 때만 다시 그림

**프레임 분류 (`classifyFrame`):**

| 분류 | 조건 | 동작 | 비용 |
|------|------|------|------|
| `idle` | registry 동일 + camera 동일 + overlay 동일 | 렌더링 완전 스킵 | 0ms |
| `present` | registry 동일 + camera 동일 + overlay 변경 | snapshot blit + 오버레이 렌더 | ~1-2ms |
| `camera-only` | registry 동일 + camera 변경 | snapshot 아핀 blit + 오버레이 렌더 | ~1-2ms |
| `content` | registry 변경 | 컨텐츠 전체 재렌더 + snapshot 갱신 + present | ~8-16ms |
| `full` | contentDirty/cleanup/resize | 컨텐츠 전체 재렌더 + snapshot 갱신 + present | 전체 비용 |

**버전/변경 감지:**
- `registryVersion`: `useSkiaNode()` 레지스트리 변경 횟수 (컨텐츠 변경)
- `overlayVersionRef`: selection/AI/pageTitle 등 오버레이 상태 변경 횟수
- `SkiaRenderer.render(cullingBounds, registryVersion, camera, overlayVersion)`로 둘을 분리 전달하여 프레임 분류

#### 4.4.6 Selection / AI 오버레이 렌더링

> Skia 모드에서는 PixiJS SelectionBox 컴포넌트 대신 CanvasKit에서 직접 Selection UI를 렌더링한다.

**Selection 렌더링** (`selectionRenderer.ts`):
- `buildSelectionRenderData()` — Zustand store에서 선택 상태 + 카메라 변환 → 월드 좌표 바운딩 박스 계산
- `renderSelectionBox()` — 파란색 바운딩 박스 (1px stroke, 반투명 fill)
- `renderTransformHandles()` — 8방향 리사이즈 핸들 (모서리 4 + 변 중간 4)
- `renderLasso()` — 다중 선택 드래그 영역 (점선 사각형)

**AI 시각 피드백** (`aiEffects.ts`):
- `renderGeneratingEffects()` — 생성 중 노드에 펄스 애니메이션 오버레이
- `renderFlashes()` — 작업 완료 시 녹색/파란색 플래시 효과
- `buildNodeBoundsMap()` — Skia 트리에서 대상 노드의 바운딩 박스 조회

렌더링 순서: 콘텐츠 → AI 피드백 → Selection (최상위)

#### 4.4.7 AABB 뷰포트 컬링

> `buildSkiaTreeHierarchical()` 에서 PixiJS 씬 그래프를 계층적으로 순회하여 Skia 렌더 트리를 구성하고,
> `renderNode()`에서 AABB 컬링으로 뷰포트 밖 노드를 스킵한다.

```
cullingBounds = { x: -cameraX/zoom, y: -cameraY/zoom,
                  w: canvasWidth/zoom, h: canvasHeight/zoom }
```

- 각 노드의 worldTransform 위치 + skiaNodeData 크기로 AABB 계산
- `intersects(nodeBounds, cullingBounds)` → false이면 해당 서브트리 스킵
- 루트 컨테이너(body)는 크기 0으로 보고될 수 있으므로 항상 포함 (zero-size 예외 처리)

#### 4.4.8 변수 Resolve 렌더링 경로

> `$--` 변수 참조가 Skia 렌더링에 도달하기 전에 실값으로 변환되는 경로.

```
ElementSprite
  → useResolvedElement(element)
    → resolveInstanceOverrides()  // 인스턴스 오버라이드 적용
    → resolveElementVariables()   // $-- 변수 → 실값 변환
      → resolveStyleVariables()   // style 객체 내 재귀 resolve
  → effectiveElement (resolved)
  → skiaNodeData 생성 (Float32Array 색상값 등)
```

- `resolveElementVariables()`: props의 모든 `$--`로 시작하는 문자열을 변수 store에서 조회하여 치환
- `resolveStyleVariables()`: `props.style` 객체 내부의 `$--` 참조를 재귀적으로 resolve
- Sprite 컴포넌트가 skiaNodeData를 생성할 때는 이미 모든 변수가 실값으로 변환된 상태


---

## 5. Phase별 구현 계획

### 5.1 Phase 1: CSS 값 파서 통합 (L2 해결) — ✅ 구현 완료

> **목표:** 모든 엔진이 공유하는 CSS 값 파싱 레이어를 강화하여 단위/함수 지원 범위 확대
>
> **일치율 영향:** +5~7% (전체 65% → 75% CSS 단위, Box Model 88% → 93%)

#### 이전 파서 현황 (Phase 1 동기)

Phase 1 이전에는 CSS 값 파싱이 3개 파일에 독립적으로 구현되어 있었다 (§0.4 L4 참조):

- `engines/utils.ts` → `parseSize()`: DropflowBlockEngine/WASM용. px, %, vh, vw, fit-content만 지원. **em, rem, calc() 미지원** (122행 주석에 명시적 제외)
- `styleToLayout.ts` → `parseCSSValue()`: TaffyFlexEngine/TaffyGridEngine용. %, vh→% 변환, vw→% 변환, rem(×16), px. **em, calc() 미지원**
- `styleConverter.ts` → `parseCSSSize()`: Skia 렌더러용. px, rem, vh, vw, em(parentSize 기반), %. **calc() 미지원**

동일한 CSS 값 `2rem`이 경로에 따라 `parseSize()`에서는 `undefined`(미지원), `parseCSSValue()`에서는 `32`(px)로 해석되는 불일치가 존재했다. Phase 1에서 통합 파서(`cssValueParser.ts`)의 `resolveCSSSizeValue()`를 도입하여 3개 파서 내부에서 공통 호출하는 방식으로 해결하였다.

> ✅ **구현 완료** — `cssValueParser.ts`의 `resolveCSSSizeValue()`로 3개 파서 통합 완료.

#### 5.1.1 `calc()` 파서

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

**파일:** `engines/cssValueParser.ts` (구현 완료)

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

**통합 지점 (✅ 구현 완료):**
- `engines/utils.ts` → `parseSize()`, `parseNumericValue()` 내부에서 `resolveCSSSizeValue()` 호출 완료
- `styleToLayout.ts` → `parseCSSValue()` 내부에서 동일 함수 호출 완료
- `styleConverter.ts` → `parseCSSSize()` 교체 완료

#### 5.1.2 `em` 단위 완전 지원

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
- `DropflowBlockEngine.ts` — 자식 순회 시 fontSize 상속 전파

#### 5.1.3 `border` shorthand 파싱

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

#### 5.1.4 `min-content` / `max-content`

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

### 5.2 Phase 2: Grid 엔진 고급 기능 (L1 해결) — ✅ TaffyGridEngine으로 완료

> **목표:** CSS Grid Level 1 스펙의 핵심 기능 구현
>
> **일치율 영향:** Grid 60% → 85%

#### 5.2.1 TaffyGridEngine 현재 지원 상태

TaffyGridEngine(Taffy WASM 네이티브)이 Grid Level 1 핵심 기능을 모두 처리한다.

| 기능 | TaffyGridEngine 상태 | 비고 |
|------|----------------------|------|
| `grid-template-columns/rows` (px, fr, %, auto) | ✅ 지원 | Taffy 네이티브 |
| `repeat(N, track)` | ✅ 지원 | Taffy 네이티브 |
| `repeat(auto-fill/auto-fit, minmax())` | ✅ 지원 | Taffy 네이티브 |
| `minmax(min, max)` | ✅ 지원 | Taffy 네이티브 |
| `span` 키워드 | ✅ 지원 | Taffy 네이티브 |
| `grid-auto-flow: dense` | ✅ 지원 | Taffy 네이티브 |
| `grid-auto-rows/columns` | ✅ 지원 | Taffy 네이티브 |
| `subgrid` | ❌ 미지원 | 잔여 과제 |
| named grid lines | ❌ 미지원 | 잔여 과제 |

#### 5.2.2 `repeat()` + `minmax()` 파서 — ✅ TaffyGridEngine 네이티브 처리

> TaffyGridEngine이 Taffy WASM 네이티브로 `repeat()`, `minmax()`, `auto-fill/auto-fit`를 처리하므로 커스텀 `GridLayout.utils.ts` 구현은 불필요하다.

#### 5.2.3 Auto-Placement 알고리즘 — ✅ TaffyGridEngine 네이티브 처리

> TaffyGridEngine이 Taffy WASM 네이티브로 `grid-auto-flow: row | column | dense` 및 auto-placement를 처리하므로 커스텀 `autoPlaceItems()` 구현은 불필요하다.

#### 5.2.4 `span` 키워드 — ✅ TaffyGridEngine 네이티브 처리

> TaffyGridEngine이 Taffy WASM 네이티브로 `span` 키워드를 처리하므로 커스텀 `parseGridArea()` 확장은 불필요하다.

#### 5.2.5 WASM 가속 — ✅ TaffyGridEngine 네이티브 처리

> TaffyGridEngine 자체가 Taffy WASM으로 구동되므로, 별도 `grid_layout.rs` Grid 가속 구현은 불필요하다. Grid 레이아웃 계산 전체가 Taffy WASM 내부에서 처리된다.

**잔여 미지원 기능:**
- `subgrid`: Taffy에서 미지원, 향후 과제
- named grid lines: Taffy에서 미지원, 향후 과제

### 5.3 Phase 3: CSS 캐스케이드 경량화 (L2 해결)

> **목표:** `inherit`, CSS 변수(`var()`), 기본 스타일 상속을 지원하는 경량 캐스케이드 시스템
>
> **일치율 영향:** +3~4% (Box Model, Typography 전반)

#### 5.3.1 스타일 상속 체인

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

**파일:** `engines/cssResolver.ts` (부분 구현 — `inherit`, `var()` 기본 지원 완료, `initial` 값 전파 OPEN)

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

**통합 지점:** `DropflowBlockEngine.calculate()`, `TaffyFlexEngine/TaffyGridEngine 스타일 resolve` 에서 자식 순회 시 `resolveStyle()` 호출하여 computed style 전파

#### 5.3.2 CSS 변수 (`var()`)

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

### 5.4 Phase 4: 블록 레이아웃 정밀도 향상 (L1 강화)

> **목표:** DropflowBlockEngine의 CSS 명세 정합성을 높여 block/inline-block 혼합 배치 정밀도 향상
>
> **일치율 영향:** Block 90% → 95%, Typography 85% → 90%

#### 5.4.1 텍스트 + 블록 혼합 (Inline Formatting Context)

현재 DropflowBlockEngine은 block과 inline-block을 IFC 에뮬레이션(`layoutInlineRun`)으로 처리한다.
CSS에서는 텍스트 노드와 inline-block이 같은 줄에 혼합 배치될 수 있다. Dropflow IFC는 DOM 텍스트 노드 기반이므로 XStudio prop 기반 컴포넌트와의 완전한 호환은 에뮬레이션으로 우회한다.

```html
<div>
  텍스트 앞 <button>버튼</button> 텍스트 뒤
</div>
```

**구현 범위 (제한적):**
- 컴포넌트 레벨에서 텍스트+inline-block 혼합은 제한적으로 지원
- 순수 텍스트 노드(anonymous inline box)는 별도 Element로 표현
- 텍스트 노드를 inline-block처럼 LineBox에 참여시킴

**파일:** `DropflowBlockEngine.ts` — `layoutInlineRun()`에서 `type: 'text' | 'element'` 구분 처리

#### 5.4.2 폰트 메트릭 기반 Baseline 계산

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

#### 5.4.3 `white-space` 기본 지원

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

#### 5.4.4 `word-break` / `overflow-wrap`

| 속성 | 값 | 동작 |
|------|-----|------|
| `word-break: break-all` | 모든 문자에서 줄바꿈 허용 |
| `word-break: keep-all` | CJK 텍스트 단어 단위 줄바꿈 |
| `overflow-wrap: break-word` | 단어가 컨테이너를 넘을 때만 줄바꿈 |

**구현:** `measureWrappedTextHeight()` 확장 — 줄바꿈 규칙 파라미터 추가

#### 5.4.5 `vertical-align` 동기화

CSS의 `vertical-align`은 inline/inline-block 요소의 수직 정렬을 제어한다. `DropflowBlockEngine.ts`의 `layoutInlineRun()`에서 레이아웃 계산은 구현 완료, Skia 렌더러 동기화는 진행 중.

| 값 | CSS 동작 | 현재 Skia 구현 | 상태 |
|-----|---------|--------------|------|
| `top` | 줄 상단 정렬 | layoutInlineRun에서 계산 | ✅ 레이아웃 계산: 구현 완료 / Skia 렌더러 동기화: OPEN |
| `middle` | 줄 중앙 정렬 | layoutInlineRun에서 계산 | ✅ 레이아웃 계산: 구현 완료 / Skia 렌더러 동기화: OPEN |
| `bottom` | 줄 하단 정렬 | layoutInlineRun에서 계산 | ✅ 레이아웃 계산: 구현 완료 / Skia 렌더러 동기화: OPEN |
| `baseline` | 기준선 정렬 (기본값) | layoutInlineRun에서 FontMetrics 기반 계산 | ✅ 레이아웃 계산: 구현 완료 / Skia 렌더러 동기화: OPEN |

**구현:** `nodeRenderers.ts`의 텍스트 렌더링에서 `vertical-align` 값에 따라 `y` 오프셋 조정. `layoutInlineRun()`이 전달하는 `FontMetrics.ascent/descent` 기반 정렬 위치를 Skia 렌더러에서 반영한다.

#### 5.4.6 `font-style` (italic/oblique) 동기화

현재 `styleConverter.ts`에서 `font-style` 파싱은 가능하지만, CanvasKit Paragraph API의 `fontStyle` 매핑이 불완전하다.

| 값 | CSS 동작 | 현재 Skia 구현 | 상태 |
|-----|---------|--------------|------|
| `normal` | 정자체 | O | PASS |
| `italic` | 이탤릭체 | CanvasKit `TextStyle.fontStyle.slant = Italic` 매핑 필요 | OPEN |
| `oblique` | 경사체 | CanvasKit `TextStyle.fontStyle.slant = Oblique` 매핑 필요 | OPEN |

**구현:** `skia/textMeasure.ts`의 `createParagraphStyle()`에서 `fontStyle.slant` 매핑 추가. 폰트 파일에 italic variant가 없는 경우 CanvasKit이 자동으로 synthetic italic을 적용한다.

---

### 5.5 Phase 5: 시각 효과 확장 (L3 해결)

> **목표:** Skia 렌더러의 시각 효과 범위 확대
>
> **일치율 영향:** Visual 80% → 90%

#### 5.5.0 타입/파이프라인 선행 작업 (필수)

웹 CSS와 동일한 결과를 얻으려면 렌더 단계 전에 데이터 모델 확장이 선행되어야 한다.

- `CSSStyle` 확장: `transform`, `transformOrigin`, `zIndex`, `position` 필드 추가
- `ConvertedStyle`/`SkiaNodeData` 확장: 변환된 transform 행렬 + origin 전달 필드 추가
- `styleConverter.ts`에서 style → transform/z-index 파싱 결과를 `SkiaNodeData`로 전달
- `nodeRenderers.ts`는 `SkiaNodeData`의 transform/stacking 정보를 기준으로 렌더 순서 적용

> 이 선행 작업이 없으면 5.5.2/5.6.2의 코드 스니펫을 그대로 적용해도 타입/데이터 흐름에서 구현이 끊긴다.

#### 5.5.1 다중 `box-shadow`

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

#### 5.5.2 CSS `transform`

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

#### 5.5.3 CSS `gradient`

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

**Spec Shape 변환 경로:**

> ✅ **구현 완료** — `specShapeConverter.ts:395-445`에서 linear/radial gradient 변환 구현됨. CanvasKit `Shader.MakeLinearGradient`/`MakeRadialGradient`를 사용하여 gradient shape을 Skia 노드로 변환하고 `nodeById`에 등록한다. 이로써 FancyButton, ColorPicker, ColorSlider, ColorArea 4개 컴포넌트의 FAIL이 해소되었다.

**구현 경로:**
1. `styleConverter.ts`의 `parseGradient()`로 CSS gradient 문법 파싱 (위 코드)
2. `specShapeConverter.ts`의 `case 'gradient'`에서 CanvasKit Shader 생성 + `nodeById` 등록
3. Spec의 gradient shape 구조: `{ type: 'gradient', gradient: 'linear-gradient(...)', ...rect }` → CanvasKit `MakeLinearGradient`/`MakeRadialGradient` 변환

#### 5.5.4 `overflow: scroll` / `auto`

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

#### 5.5.5 Spec Shape 렌더 순서 (shadow-before-target) — ✅ 구현 완료

> ✅ **구현 완료** — `specShapeConverter.ts:88-105`에서 2-pass 처리 구현됨 (target 참조 shadow/border를 Pass 2로 defer). Pass 1에서 모든 shape의 id를 `nodeById`에 선등록하고, Pass 2에서 실제 Skia 노드를 생성하여 shadow가 target을 참조할 수 있게 되었다. 이로써 7개 컴포넌트의 FAIL이 해소되었다.

**영향:** Select, ComboBox, Menu, Toast, DatePicker, DateRangePicker, ColorPicker — **7개 컴포넌트** ~~FAIL~~ → **PASS** (2-pass 처리로 해결)

**원인:**
```
Spec shapes 배열: [shadow(target="bg"), bg(id="bg"), ...]
                    ↑ target 참조 시점에 bg가 아직 미등록
```

**해결 방안:**
```typescript
// specShapeConverter.ts — 2-pass 변환
// Pass 1: 모든 shape를 nodeById에 등록 (렌더링 없이 id만 수집)
for (const shape of shapes) {
  if (shape.id) nodeById.set(shape.id, createPlaceholder(shape));
}
// Pass 2: 실제 Skia 노드 생성 (shadow가 target을 참조 가능)
for (const shape of shapes) {
  const node = convertShapeToSkia(shape, nodeById);
  if (shape.id) nodeById.set(shape.id, node); // placeholder 교체
}
```

**효과:** SPEC FAIL 7건 → 0건, 정합성 67.7% → **78.7%+** (실제: §5.5.3/§5.5.6과 함께 **85.5%** 달성)

#### 5.5.6 배열 `borderRadius` 지원 — ✅ 구현 완료

> ✅ **구현 완료** — `specShapeConverter.ts:30-43`의 `resolveRadius()` 함수가 배열 borderRadius 처리. `[TL, TR, BR, BL]` 배열을 그대로 전달하여 CanvasKit `MakeRRect` (4-corner)로 변환한다.

**영향:** NumberField — **1개 컴포넌트** ~~FAIL~~ → **PASS**

**해결 방안:**
```typescript
// specShapeConverter.ts — resolveNum 배열 지원 확장
function resolveRadius(
  value: number | [number, number, number, number] | undefined
): number | [number, number, number, number] {
  if (Array.isArray(value)) return value; // 배열은 그대로 전달
  return typeof value === 'number' ? value : 0;
}

// Skia rrect 변환: CanvasKit.RRectXY → CanvasKit.MakeRRect (4-corner)
function makeSkiaRRect(
  rect: Float32Array,
  radius: number | [number, number, number, number]
): Float32Array {
  if (typeof radius === 'number') {
    return CanvasKit.RRectXY(rect, radius, radius);
  }
  const [tl, tr, br, bl] = radius;
  // CanvasKit RRect: [x, y, right, bottom, tlX, tlY, trX, trY, brX, brY, blX, blY]
  return Float32Array.of(
    rect[0], rect[1], rect[2], rect[3],
    tl, tl, tr, tr, br, br, bl, bl
  );
}
```

#### 5.5.7 `border-style: dashed / dotted`

**현상:** `nodeRenderers.ts`에서 `border-style`이 `solid`만 지원되어, `dashed`/`dotted` 테두리가 실선으로 렌더링된다.

**영향:** Slot, DropZone — **2개 컴포넌트 WARN**

**구현:**
```typescript
// nodeRenderers.ts — Skia dash 효과
import { CanvasKit } from 'canvaskit-wasm';

function applyBorderStyle(paint: SkPaint, style: string, width: number) {
  if (style === 'dashed') {
    const dashLen = Math.max(width * 3, 4);
    const gapLen = Math.max(width * 2, 3);
    paint.setPathEffect(CanvasKit.PathEffect.MakeDash([dashLen, gapLen]));
  } else if (style === 'dotted') {
    paint.setPathEffect(CanvasKit.PathEffect.MakeDash([width, width * 1.5]));
    paint.setStrokeCap(CanvasKit.StrokeCap.Round);
  }
  // 'solid'는 기본값 — PathEffect 없음
}
```

**파일:** `nodeRenderers.ts` — `renderBox()` 내 `paint.setStroke()` 직후 `applyBorderStyle()` 호출 추가

---

### 5.6 Phase 6: Position 및 Stacking Context (L1+L3)

> **목표:** `position: fixed`, `z-index`, stacking context 정확도 향상
>
> **일치율 영향:** Position 65% → 80%

#### 5.6.1 `position: fixed`

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

#### 5.6.2 `z-index` + Stacking Context

CSS stacking context 생성 조건:

```typescript
interface StackingContextMeta {
  isFlexItem?: boolean;
  isGridItem?: boolean;
}

function createsStackingContext(style: CSSStyle, meta: StackingContextMeta): boolean {
  const position = style.position;
  const zIndexSpecified = style.zIndex !== undefined && style.zIndex !== 'auto';
  const isFlexOrGridItem = Boolean(meta.isFlexItem || meta.isGridItem);

  if (position === 'fixed') return true;
  // sticky의 스크롤/위치 계산 자체는 Non-Goal이지만,
  // paint order 정합성을 위해 stacking context 판정은 유지한다.
  if (position === 'sticky') return true;

  // positioned + z-index
  if ((position === 'relative' || position === 'absolute') && zIndexSpecified) return true;
  // CSS: flex/grid item은 position이 static이어도 z-index가 auto가 아니면 stacking context 생성
  if (isFlexOrGridItem && zIndexSpecified) return true;

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

## 6. 구조적 문제 분석 및 해결 방안 (Self-Rendering 컴포넌트)

> **배경:** Button(width:auto/fit-content/100px, height:auto)에서 텍스트 오버플로 시 높이 자동 조절이 부모의 display, flex-direction, align-items 등에 따라 CSS와 다르게 동작하는 문제 발견

> **아키텍처 현황 (Phase 11 이후):** Yoga/@pixi/layout이 완전히 제거되었다. `enrichWithIntrinsicSize()` + `DropflowBlockEngine`이 Yoga measureFunc를 대체하여 리프 UI 컴포넌트의 intrinsic size를 계산한다. 단, `styleToLayout.ts`에는 Yoga 시절 잔여코드(`SELF_RENDERING_BTN_TAGS`, `BUTTON_PADDING` 등)가 남아 있어 정리가 필요하다.

### 6.1 문제 정의

Self-Rendering 컴포넌트(Button, Card, ToggleButton 등)는 `SELF_PADDING_TAGS`로 지정되어 `stripSelfRenderedProps()`가 padding/border를 제거한다. Yoga가 제거된 현재, `DropflowBlockEngine`의 `enrichWithIntrinsicSize()`가 리프 UI 컴포넌트에 intrinsic width/height를 주입하는 방식으로 대체되었다. 그러나 `styleToLayout.ts`에는 아직 Yoga 시절 잔여코드(`SELF_RENDERING_BTN_TAGS`, `SELF_RENDERING_BUTTON_TAGS`, `BUTTON_PADDING`, `BTN_PAD`)가 남아 있어, 이 코드들이 `TaffyFlexEngine` 경로에서 참조될 가능성이 있으며 정리가 필요하다.

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

### 6.2 P1 — CRITICAL: `layout.height` 고정값 설정

**위치:** `styleToLayout.ts:599-643` (Yoga 시절 잔여코드)

**현상:**
```typescript
// 잔여코드 (styleToLayout.ts:602-625) — Yoga 시절 작성, 현재 TaffyFlexEngine 경로에서 참조 가능
const SELF_RENDERING_BUTTON_TAGS = new Set(['button', 'submitbutton', 'fancybutton', 'togglebutton']);
if (SELF_RENDERING_BUTTON_TAGS.has(tag) && height === undefined) {
  // ... BUTTON_PADDING config, fontSize/paddingY/borderW 계산 ...
  const lineHeight = fontSize * 1.2;
  layout.height = paddingY * 2 + lineHeight + borderW * 2;  // ← 고정 px 설정
}
```

Yoga 제거 이후 이 고정 height 설정은 `enrichWithIntrinsicSize()` 패턴으로 대체되어야 한다. `enrichWithIntrinsicSize()`는 `INLINE_BLOCK_TAGS`(button, badge, checkbox 등)에 대해 `parseBoxModel()`의 contentHeight + spec padding/border 합산으로 height를 주입하고, fit-content 에뮬레이션으로 width를 결정한다.

**부분 수정 존재 (628-642행) — 제한적 효과:**

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

> **핵심 문제:** 625행에서 `layout.height`가 고정 px로 설정된 상태에서 638행 `layout.minHeight`는 **하한값 보완**으로는 동작할 수 있다. 다만 `height`가 명시되어 있는 동안에는 부모 `align-items: stretch`나 폭 변화에 따른 `auto` 재계산 경로가 제한되어, 웹 CSS와 동일한 동적 동작을 재현하기 어렵다.

**CSS 동작 vs 현재 동작:**

| 시나리오 | CSS 기대값 | 현재 엔진 결과 | 원인 |
|----------|-----------|--------------|------|
| 부모 `flex-direction:row` + `align-items:stretch` | 부모 높이만큼 늘어남 | 고정 높이 유지 | `layout.height = fixed` |
| 부모 `flex-direction:column` + 텍스트 overflow | 텍스트 wrap 높이로 자동 성장 | 조건부 확장만 발생 | `layout.height = fixed` (minHeight는 일부 케이스만 보완) |
| `height: auto` + 긴 텍스트 | content 높이 자동 조절 | 1줄 높이로 잘림 | height 고정 선점 |

**해결 방안:** `styleToLayout.ts` 잔여코드 정리 + `enrichWithIntrinsicSize` 통합

```typescript
// 수정안: styleToLayout.ts 잔여코드 제거 후 enrichWithIntrinsicSize 위임
// SELF_RENDERING_BUTTON_TAGS / BUTTON_PADDING 블록 삭제
// intrinsic height는 enrichWithIntrinsicSize()에서 아래 방식으로 계산:
//   height = parseBoxModel(element).contentHeight + paddingY * 2 + borderW * 2

// height:auto일 때는 엔진이 자유롭게 높이를 결정하도록 함
if (style.height && style.height !== 'auto') {
  layout.height = resolveCSSSizeValue(style.height, context);
}
```

> **상태:** Yoga 경로 소멸로 직접적 영향이 축소됨. 그러나 잔여코드가 TaffyFlexEngine 경로에서 여전히 실행될 경우 동일한 고정 height 문제가 재현되므로, 잔여코드 정리가 필요하다.

**효과:** `enrichWithIntrinsicSize()`가 `align-items: stretch`와 `flex-grow`에 따라 높이를 자유롭게 계산할 수 있게 됨. 기존 부분 수정(628-642행)의 minHeight 로직도 height 제약 없이 정상 동작하게 됨.

### 6.3 P2 — HIGH: fit-content 워크어라운드가 stretch 차단

**위치:** `styleToLayout.ts:297-301`, `styleToLayout.ts:362-381`

**현상:**
```typescript
// 잔여코드 (styleToLayout.ts:297-301) — TaffyFlexEngine 경로에서 fit-content 처리
if (isFitContentWidth) {
  layout.width = 'auto';
  if (layout.flexGrow === undefined) layout.flexGrow = 0;    // ← 조건부 설정
  if (layout.flexShrink === undefined) layout.flexShrink = 0; // ← 조건부 설정
}

// 잔여코드 (styleToLayout.ts:362-381) — Yoga 시절 작성, TaffyFlexEngine 경로에서 참조 가능
if (SELF_RENDERING_BTN_TAGS.has(tag) && isFitContentWidth) {
  // ... BTN_PAD config, textWidth 측정 ...
  layout.width = Math.round(measuredTextWidth) + paddingX * 2 + borderW * 2; // 명시적 px 강제
  layout.flexGrow = 0;   // ← 무조건 설정 (297-301의 조건부와 불일치)
  layout.flexShrink = 0; // ← 무조건 설정
}
```

> **참고:** 297-301행의 일반 경로는 `if (layout.flexGrow === undefined)` 조건부로 사용자 명시 설정을 보존하지만, 362-381행의 버튼 경로(Yoga 시절 잔여코드)는 무조건 `flexGrow = 0`을 강제한다. 이는 사용자가 명시적으로 `flex-grow`를 설정한 경우에도 덮어쓰게 되는 비일관적 동작이다. `styleToLayout.ts`의 잔여코드 정리 시 이 코드를 TaffyFlexEngine 컨텍스트 기준으로 재작성하거나 제거해야 한다.

**Config 파편화 문제:** 버튼 크기 설정이 2벌 존재한다 (모두 Yoga 시절 잔여코드):
- `BTN_PAD` (366-368행): fit-content width 계산용 — `{ px, fs }` 2개 필드
- `BUTTON_PADDING` (610-616행): height 계산용 — `{ px, py, fs }` 3개 필드

두 config가 동일한 버튼 사이즈 프리셋을 나타내지만 독립적으로 정의되어 있어, 하나만 수정하면 width/height 계산 간 불일치가 발생할 수 있다. `engines/utils.ts:290`의 `BUTTON_SIZE_CONFIG`까지 포함하면 총 3벌이다. 잔여코드 정리 시 `BUTTON_SIZE_CONFIG` 단일 소스로 통합해야 한다.

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
// 선행 변경: 부모 컨텍스트를 styleToLayout에 전달
interface LayoutResolveContext {
  parentFlexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
}

function styleToLayoutInternal(
  element: Element,
  context: LayoutResolveContext
): LayoutStyle;

// 외부 호출은 래퍼로만 사용 (호출부 누락 리스크 제거)
function styleToLayoutRoot(element: Element): LayoutStyle;
function styleToLayoutChild(
  child: Element,
  parentElement: Element,
  parentLayout: LayoutStyle
): LayoutStyle;

// 1) self-rendering fit-content width의 명시적 px 강제 제거
//    (intrinsic size는 enrichWithIntrinsicSize가 담당 — Yoga measureFunc 대체)
if (SELF_RENDERING_BTN_TAGS.has(tag) && isFitContentWidth) {
  layout.width = 'auto';
}

// 2) grow/shrink 제한은 row 주축에서만 적용
if (isFitContentWidth) {
  const parentFlexDir = context.parentFlexDirection || 'row';
  if (parentFlexDir === 'row' || parentFlexDir === 'row-reverse') {
    layout.flexGrow = 0;
    layout.flexShrink = 0;
  }
  // column 주축에서는 cross-axis stretch 허용
}
```

`BuilderCanvas.tsx`의 `styleToLayout(child)` 호출 지점은 부모의 `flexDirection`(effective 값)을 함께 전달하도록 수정한다.

**호출부 마이그레이션 강제 절차 (잔여 리스크 해소):**

1. `styleToLayout.ts`에 `styleToLayoutInternal`(context 필수) + `styleToLayoutRoot`/`styleToLayoutChild` 래퍼를 추가한다.
2. 기존 직접 호출을 전면 교체한다.
   - 루트 계산: `styleToLayoutRoot(element)`만 허용
   - 자식 계산: `styleToLayoutChild(child, parentElement, parentLayout)`만 허용
3. 호출부 교체 대상:
   - `BuilderCanvas.tsx`의 모든 `styleToLayout(...)` 호출
   - `PixiTabs.tsx`의 `styleToLayout(childEl)` 호출
4. 정적 게이트를 CI에 추가한다.
   - `rg -n "styleToLayout\\(" apps/builder/src/builder/workspace/canvas`
   - 허용 패턴은 `styleToLayoutRoot(`, `styleToLayoutChild(`만 통과
5. 위 1~4를 **단일 PR**로 머지한다 (부분 반영 금지).

이 절차를 적용하면 "호출부 일부만 context 전달" 상태가 구조적으로 불가능해진다.

### 6.4 P3 — HIGH: intrinsic size 정적 주입 한계

**배경:**

Yoga/@pixi/layout 제거 후, self-rendering 컴포넌트의 intrinsic size는 `enrichWithIntrinsicSize()`가 담당한다. 이는 Yoga `measureFunc`(동적 콜백)를 대체하는 **정적 주입** 방식이다.

**`enrichWithIntrinsicSize()` 패턴:**

```typescript
// DropflowBlockEngine 내부에서 INLINE_BLOCK_TAGS에 대해 호출
// INLINE_BLOCK_TAGS: button, badge, checkbox, togglebutton 등
function enrichWithIntrinsicSize(element: Element): void {
  const tag = element.tag;
  if (!INLINE_BLOCK_TAGS.has(tag)) return;

  const text = extractTextContent(element.props);
  const fontSize = getSizePreset(tag, element.props.size).fontSize;
  const paddingX = getSizePreset(tag, element.props.size).paddingX;
  const paddingY = getSizePreset(tag, element.props.size).paddingY;
  const borderW = parseBorderWidth(element.props.style);

  // height: parseBoxModel()의 contentHeight + spec padding/border
  const contentHeight = parseBoxModel(element).contentHeight ?? fontSize * 1.2;
  element._intrinsicHeight = paddingY * 2 + contentHeight + borderW * 2;

  // width: INLINE_BLOCK_TAGS에 대해 fit-content 에뮬레이션
  const intrinsicTextWidth = measureTextWidth(text, fontSize, 'Pretendard', 400);
  element._intrinsicWidth = paddingX * 2 + intrinsicTextWidth + borderW * 2;
}
```

**intrinsic size 구현 현황:**

| 컨텍스트 | 방식 | 파일 | 비고 |
|---------|------|------|------|
| Skia 텍스트 노드 (CanvasKit Paragraph) | `createYogaMeasureFunc()` (동적 콜백) | `skia/textMeasure.ts:91` | Yoga 시절 구현, 현재도 Skia 텍스트 측정용으로 유지됨 |
| INLINE_BLOCK_TAGS (button, badge 등) | `enrichWithIntrinsicSize()` (정적 주입) | `DropflowBlockEngine.ts` | Yoga measureFunc 대체 패턴 |

> `skia/textMeasure.ts:91`의 `createYogaMeasureFunc()`는 Yoga 제거 후에도 Skia 텍스트 측정 용도로 파일에 남아있다. 이 함수 자체는 Yoga 노드에 설정하는 콜백이 아니라 Skia CanvasKit Paragraph API 기반 텍스트 측정 헬퍼이므로, `enrichWithIntrinsicSize()`에서 텍스트 측정 시 재활용할 수 있다.

**CSS에서 일어나는 일:**
```
부모 width 변경 → 브라우저 reflow → 버튼 width 재계산 → 텍스트 wrap 발생 → height 자동 증가
```

**현재 엔진에서 일어나는 일:**
```
부모 width 변경 → DropflowBlockEngine 재계산 → 버튼 width 업데이트됨
→ enrichWithIntrinsicSize()는 이전 레이아웃 사이클의 availableWidth 값 참조
→ 텍스트 wrap 높이 재계산이 1 사이클 지연 → height 일시 불일치
```

**잔여 과제 (현재 한계):**

- `enrichWithIntrinsicSize()`는 레이아웃 실행 전에 호출되므로, 현재 사이클의 `availableWidth`가 아닌 **이전 레이아웃 사이클의 값**을 참조한다.
- 부모 width가 급격히 변경되는 경우(예: 패널 크기 조절) 1 사이클 동안 height 불일치가 발생할 수 있다.
- 완전한 해결을 위해서는 레이아웃 엔진 내부에서 availableWidth 확정 후 intrinsic size를 재주입하는 **2-pass 레이아웃** 또는 Taffy의 measure callback 연동이 필요하다.

**해결 방안:**

```typescript
// 현재 구조 개선안: enrichWithIntrinsicSize에 availableWidth 전달
function enrichWithIntrinsicSize(
  element: Element,
  availableWidth: number  // 현재 레이아웃 사이클의 실제 가용 너비
): void {
  // ... 동일한 로직, 단 availableWidth를 기반으로 wrap 높이 계산
  const textMaxWidth = Math.max(0, availableWidth - paddingX * 2 - borderW * 2);
  const textHeight = measureWrappedTextHeight(text, fontSize, 400, 'Pretendard', textMaxWidth);
  element._intrinsicHeight = paddingY * 2 + textHeight + borderW * 2;
}
```

**효과:**
- `enrichWithIntrinsicSize()`가 현재 사이클의 실제 `availableWidth`를 사용하면 wrap 높이 불일치가 해소됨
- 동적 availableWidth 반영 전까지는 이전 사이클 값 사용으로 대부분 케이스에서 오차 1px 이내
- `createYogaMeasureFunc()`의 Skia 텍스트 측정 로직을 `enrichWithIntrinsicSize()`에서 재활용하면 측정 일관성 향상

### 6.5 10-Case CSS Divergence Matrix

부모 속성 + 자식 `width` 설정 조합에 따른 Button(height:auto, text overflow) 동작 비교:

| # | 부모 display | flex-direction | align-items | 자식 width 설정 | CSS 결과 | 현재 엔진 결과 | 원인 | 상태 | 수정 Phase |
|---|-------------|---------------|-------------|----------------|---------|---------------|------|------|-----------|
| 1 | flex | row | stretch | `100px` | height=부모높이 | height=1줄고정 | P1 — enrichWithIntrinsicSize 한계 (styleToLayout.ts 잔여코드의 고정 height 설정) | 미수정 | 6.2 |
| 2 | flex | row | center | `100px` | height=auto(wrap) | 조건부 확장만 발생 (부분 수정: minHeight 하한은 적용되나 stretch/auto 경로는 제한) | P1+P3 — enrichWithIntrinsicSize 한계 + intrinsic size 정적 주입 한계 | 부분 수정(제한적 효과) | 6.2+6.4 |
| 3 | flex | row | flex-start | `100px` | height=auto(wrap) | 조건부 확장만 발생 (부분 수정: minHeight 하한은 적용되나 stretch/auto 경로는 제한) | P1+P3 — enrichWithIntrinsicSize 한계 + intrinsic size 정적 주입 한계 | 부분 수정(제한적 효과) | 6.2+6.4 |
| 4 | flex | column | stretch | `fit-content` | width=부모너비, height=auto | width=fit-content | P2 — styleToLayout.ts 잔여코드의 px 강제 + flexGrow=0 | 미수정 | 6.3 |
| 5 | flex | column | center | `100px` | width=100px, height=auto | 조건부 확장만 발생 (부분 수정: minHeight 하한은 적용되나 stretch/auto 경로는 제한) | P1+P3 — enrichWithIntrinsicSize 한계 + intrinsic size 정적 주입 한계 | 부분 수정(제한적 효과) | 6.2+6.4 |
| 6 | flex | column | flex-start | `100px` | width=100px, height=auto | 조건부 확장만 발생 (부분 수정: minHeight 하한은 적용되나 stretch/auto 경로는 제한) | P1+P3 — enrichWithIntrinsicSize 한계 + intrinsic size 정적 주입 한계 | 부분 수정(제한적 효과) | 6.2+6.4 |
| 7 | flex | row | baseline | `100px` | height=auto, baseline정렬 | baseline 무시 | P1+P3 — enrichWithIntrinsicSize 한계 + intrinsic size 정적 주입 한계 | 미수정 | 6.2+6.4+Phase4 |
| 8 | block | - | - | `auto` | width=100%(block), height=auto | width=100px | P2 — styleToLayout.ts 잔여코드의 px 강제 (TaffyFlexEngine 경로) | 미수정 | 6.3 |
| 9 | flex | row-reverse | stretch | `100px` | height=부모높이 (역순) | height=1줄고정 | P1 — enrichWithIntrinsicSize 한계 (styleToLayout.ts 잔여코드의 고정 height 설정) | 미수정 | 6.2 |
| 10 | grid | - | stretch | `100px` | 셀 크기에 맞춤 | height=1줄고정 | P1+P3 — enrichWithIntrinsicSize 한계 + intrinsic size 정적 주입 한계 | 미수정 | 6.2+6.4 |

> **부분 수정(제한적 효과)**: Case 2,3,5,6에서 `styleToLayout.ts:628-642`의 코드가 고정 width 버튼에 대해 `layout.minHeight`를 설정하므로 하한 보완은 적용될 수 있다. 다만 625행의 `layout.height` 고정 때문에 stretch/auto 재계산 경로가 제한되어 CSS-web 기준과는 여전히 차이가 남는다. §6.2의 해결 방안(styleToLayout.ts 잔여코드 정리 + enrichWithIntrinsicSize 통합) 적용 시 부분 수정의 효과가 완전하게 살아난다.

### 6.6 수정 적용 순서

```
Step 1: styleToLayout.ts 레거시 정리
  ├─ 영향: Case 1,2,3,5,6,7,9,10 부분 해결
  ├─ 작업: SELF_RENDERING_BTN_TAGS, SELF_RENDERING_BUTTON_TAGS, BTN_PAD, BUTTON_PADDING 블록 제거
  │         고정 layout.height 설정 제거 → enrichWithIntrinsicSize 위임
  ├─ 위험도: 중 (모든 self-rendering 컴포넌트에 영향)
  └─ 검증: Button/Card 높이 자동 조절 테스트

Step 2: P2 수정 (fit-content px 강제 제거 + 조건부 grow/shrink, Taffy 컨텍스트)
  ├─ 영향: Case 4,8 해결
  ├─ 작업: styleToLayout.ts 잔여코드를 TaffyFlexEngine 컨텍스트 기준으로 재작성
  │         부모 flexDirection 감지 후 row 주축에서만 grow/shrink 제한 적용
  ├─ 위험도: 중 (flex-direction 감지 로직 추가)
  └─ 검증: column flex + fit-content 버튼 stretch 테스트

Step 3: SELF_PADDING_TAGS 점진적 축소
  ├─ 영향: Case 2,3,5,6,7,10 완전 해결
  ├─ 작업: enrichWithIntrinsicSize에 현재 레이아웃 사이클 availableWidth 전달
  │         Button → 검증 후 Card, ToggleButton 순차 적용
  │         SELF_PADDING_TAGS를 빈 Set으로 점진적 축소
  ├─ 위험도: 중 (enrichWithIntrinsicSize 확장, 컴포넌트별 검증 필요)
  └─ 검증: 부모 width 변경 시 텍스트 wrap + 높이 변경 테스트
```

**§6 관련 파일 요약:**

| 파일 | 경로 | 핵심 역할 (§6 관점) |
|------|------|-------------------|
| `styleToLayout.ts` | `apps/builder/src/builder/workspace/canvas/layout/styleToLayout.ts` | Yoga 시절 잔여코드: fit-content 처리(297-301), 버튼 width 계산(362-381), 버튼 height 고정(599-643) → Step 1~2에서 정리 대상 |
| `BuilderCanvas.tsx` | `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx` | SELF_PADDING_TAGS 정의(642-649), stripSelfRenderedProps(662-670) → Step 3에서 점진적 축소 |
| `engines/utils.ts` | `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts` | parseSize(86-126), BUTTON_SIZE_CONFIG(290-304), FIT_CONTENT sentinel(53) → BTN_PAD/BUTTON_PADDING 통합 후 단일 소스 |
| `styleConverter.ts` | `apps/builder/src/builder/workspace/canvas/sprites/styleConverter.ts` | parseCSSSize — Skia용 CSS 값 파서(150-201) |
| `textMeasure.ts` | `apps/builder/src/builder/workspace/canvas/skia/textMeasure.ts` | `createYogaMeasureFunc` — Yoga 시절 구현이나 Skia 텍스트 측정 헬퍼로 유지됨. enrichWithIntrinsicSize에서 텍스트 측정 재활용 가능(91-102) |

---

## 7. 컴포넌트 CSS-Web 구조 일치 계획

> **원칙:** TagGroup의 CSS-web 구조 매칭 패턴을 레퍼런스로, 모든 컴포넌트가 CSS-web 구조와 동일하게 동작하도록 정비

### 7.1 현재 구조 매핑 (A/B/C/D 등급)

#### TagGroup 레퍼런스 패턴 분석

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
| **Taffy 레이아웃 위임** | TaffyFlexEngine에서 TagGroup→`flex+column`, TagList→`flex+row+wrap` 처리 |
| **자식 요소 분리** | Tag를 독립 Element로 표현, 각각 Taffy 레이아웃에 참여 |
| **CSS 속성 매핑** | gap, padding, border-radius가 CSS 변수와 동일한 값 |
| **Spec 기반 통합** | `TagGroupSpec`에서 sizes/variants 공유 → CSS변수와 동일 토큰 |
| **컨테이너 의미 보존** | TagGroup=column container, TagList=row+wrap container 역할 유지 |

**핵심 원칙 (TagGroup에서 추출):**

1. **DOM 구조 미러링**: CSS-web의 DOM 계층 구조를 Element 트리로 동일하게 재현
2. **레이아웃 위임**: 수동 위치 계산 대신 Taffy/Dropflow 엔진에 레이아웃 위임 (display, flexDirection, gap 등)
3. **Spec 기반 토큰 공유**: CSS 변수 값과 동일한 Spec sizes/variants 사용
4. **자식 요소 독립성**: 자식을 별도 Element로 분리하여 각각 레이아웃 참여

#### 전체 컴포넌트 CSS-Web 구조 비교표

63개 Pixi 컴포넌트를 CSS-web 구조와 비교하여 4단계로 분류:

**A등급: CSS-web 구조 일치 (레이아웃 위임 + 자식 분리)**

| 컴포넌트 | CSS-Web 구조 | WebGL 구현 | 상태 |
|----------|-------------|-----------|------|
| TagGroup | flex column → flex row wrap | Taffy flex column + row wrap | ✅ 일치 |
| ToggleButtonGroup | flex row, 자식 ToggleButton | Taffy flex row | ✅ 일치 |
| CheckboxGroup | flex column, 자식 Checkbox | Taffy flex column | ✅ 일치 |
| Form | flex column, 자식 필드들 | Taffy flex column | ✅ 일치 |
| Group | flex column/row | Taffy flex | ✅ 일치 |
| DisclosureGroup | flex column | Taffy flex column | ✅ 일치 |

**B등급: 부분 일치 (레이아웃 위임하나 자식 구조 차이)**

| 컴포넌트 | CSS-Web 구조 | WebGL 구현 | 갭 |
|----------|-------------|-----------|-----|
| Card | block/flex column (header→content→footer) | Taffy flex + 자체 텍스트 배치 | 자체 measureWrappedTextHeight 사용, 엔진에 텍스트 높이 미위임 |
| Disclosure | details/summary + content | Taffy flex column | summary/content 분리 불완전 |
| Panel | flex column (header + body) | Taffy flex | header 영역 고정 높이 |
| Tabs | flex column (tablist + panels) | Taffy flex | 탭 패널 전환 시 높이 재계산 |

**C등급: 구조 불일치 (자체 렌더링 + 수동 배치)**

| 컴포넌트 | CSS-Web 구조 | WebGL 구현 | 갭 |
|----------|-------------|-----------|-----|
| **Button / FancyButton / SubmitButton** | `<button>` intrinsic sizing | Graphics + enrichWithIntrinsicSize | enrichWithIntrinsicSize 한계 (정적 주입, 동적 재계산 미지원) |
| **Badge** | `inline-flex` + center | Graphics + 수동 크기 계산 | intrinsic sizing 미위임, min-width 미지원 |
| **Checkbox** | `flex row` (box + label) | Graphics + 수동 위치 | 자식 분리 안됨, label wrap 높이 미반영 |
| **Input/TextField** | `flex column` (label + input + error) | Graphics + 수동 레이아웃 | 전체 수동 배치, label/input 분리 안됨 |
| **Select** | `flex column` (label + button) | Graphics + 수동 레이아웃 | popover 제외해도 trigger 부분 수동 |
| **Radio** | `flex row` (circle + label) | Graphics + 수동 위치 | Checkbox와 동일 패턴 + `rearrangeShapesForColumn()`이 circle shape 미감지 → column 배치 깨짐 (SPEC FAIL) |
| **Switch** | `flex row` (track + label) | Graphics + 수동 위치 | track 크기 고정, label 동적 |
| **ToggleButton** | `<button>` intrinsic sizing | Graphics + 고정 크기 | Button과 동일 문제 |
| **Breadcrumbs** | `flex row` (items + separators) | 수동 위치 계산 | separator 위치 수동 |
| **Link** | `inline` text with decoration | Graphics + 텍스트 | inline 동작 미지원 |
| **Slider** | `flex` (track + thumb) | Graphics + 수동 위치 | track/thumb 위치 수동 |
| **ProgressBar** | block (label + track) | Graphics + 수동 레이아웃 | label/track 분리 안됨 |
| **Meter** | block (label + track) | Graphics + 수동 레이아웃 | ProgressBar와 동일 |

> **참고:** C등급 목록은 `docs/how-to/development/PIXI_REFACTORING.md`의 "수동 좌표 컴포넌트 21개"와 대응된다. 위 13개 외에 Calendar, ColorArea, ColorSlider, ColorPicker, DatePicker, DateRangePicker, ComboBox, NumberField이 추가로 수동 좌표를 사용하나, 이들은 D등급(캔버스 상호작용 불필요)으로 분류한다.

**D등급: 복합/특수 컴포넌트 (CSS-web 구조 매칭 불가능하거나 불필요)**

| 컴포넌트 | 사유 |
|----------|------|
| Calendar, DatePicker, DateRangePicker | 캔버스에서 달력 위젯 상호작용 불필요 (프리뷰 전용) |
| ColorPicker, ColorArea, ColorWheel, ColorSlider, ColorField | 색상 도구 상호작용 불필요 |
| ComboBox, Menu, Popover, Dialog, Toast | 오버레이/팝업은 캔버스 레이어 밖 렌더링 |
| Table, GridList, Tree | 대량 데이터 렌더링, 가상화 필요 → 별도 전략 |
| NumberField, TimeField, DateField | 입력 필드 상호작용은 프리뷰 전용 |

### 7.2 C등급 컴포넌트 구조 개선 계획

C등급 컴포넌트들을 TagGroup 패턴(A등급)으로 개선하는 구체적 방안:

#### 7.2.1 Button → Taffy/Dropflow 레이아웃 위임

**현재:**
```
PixiButton (Graphics로 직접 그리기)
  └─ 수동 계산: textWidth + paddingX*2 + borderW*2
```

**목표 (CSS-web 구조 미러링):**
```
Button Element (Taffy flex node, display:flex, align-items:center, justify-content:center)
  ├─ padding: CSS에서 그대로 Taffy에 전달 (stripSelfRenderedProps 제거)
  ├─ border: Taffy borderWidth로 전달
  └─ TextChild (Taffy leaf node + enrichWithIntrinsicSize)
       └─ text content → intrinsic size 주입
```

**변경 사항:**
1. `SELF_PADDING_TAGS`에서 Button 제거
2. padding/border를 Taffy/Dropflow에 위임 (strip 중단)
3. Skia 렌더러에서 배경/테두리만 그리기 (패딩은 엔진이 처리)
4. enrichWithIntrinsicSize로 intrinsic size 주입 통합

#### 7.2.2 Badge → inline-flex Taffy 노드

**현재:**
```
PixiBadge (Graphics 직접 그리기)
  └─ 수동: textWidth + paddingX*2 → totalWidth
```

**목표:**
```
Badge Element (DropflowBlockEngine inline-block, enrichWithIntrinsicSize로 크기 주입)
  ├─ min-width: sizePreset.minWidth
  ├─ padding: sizePreset.paddingX/Y
  └─ TextChild (intrinsic size 주입)
```

#### 7.2.3 Checkbox / Radio → flex row 자식 분리

**현재:**
```
PixiCheckbox (Graphics 직접 그리기)
  └─ 수동: indicatorBox(x=0) + labelText(x=indicatorSize+gap)
```

**목표:**
```
Checkbox Element (Taffy flex node, display:flex, flex-direction:row, align-items:center, gap)
  ├─ IndicatorChild (Taffy node, fixed width/height)
  │   └─ checkbox box 그래픽 (Skia)
  └─ LabelChild (Taffy leaf node + enrichWithIntrinsicSize)
       └─ label text → wrap 시 높이 자동 계산
```

#### 7.2.4 Input/TextField → flex column 자식 분리

**현재:**
```
PixiTextField (Graphics 직접 그리기)
  └─ 수동: label(y=0) + inputBox(y=labelHeight+gap) + error(y=...)
```

**목표:**
```
TextField Element (Taffy flex node, display:flex, flex-direction:column, gap)
  ├─ LabelChild (Taffy leaf + enrichWithIntrinsicSize)
  ├─ InputChild (Taffy node, padding, border, background)
  │   └─ PlaceholderText (Taffy leaf)
  └─ ErrorChild (Taffy leaf + enrichWithIntrinsicSize, conditional)
```

#### 7.2.5 Breadcrumbs → flex row + 자식 분리

**현재:**
```
PixiBreadcrumbs (수동 위치 계산)
  └─ items.forEach((item, i) => { x += itemWidth + separatorWidth })
```

**목표:**
```
Breadcrumbs Element (Taffy flex node, display:flex, flex-direction:row, align-items:center, gap)
  ├─ BreadcrumbItem (Taffy leaf + enrichWithIntrinsicSize)
  ├─ Separator (Taffy node, fixed width)
  ├─ BreadcrumbItem (Taffy leaf + enrichWithIntrinsicSize)
  └─ ...
```

#### 구현 우선순위

| 순위 | 컴포넌트 | 사용 빈도 | 구조 변경 규모 | CSS 일치 영향 |
|------|----------|----------|-------------|-------------|
| **1** | Button, ToggleButton | ★★★★★ | 중 | P1+P2+P3 해결로 대폭 개선 |
| **2** | Card | ★★★★☆ | 중 | 높이 자동 조절 + children 렌더링 |
| **3** | Checkbox, Radio | ★★★★☆ | 중 | label wrap + flex row 정확도 |
| **4** | Badge | ★★★☆☆ | 소 | inline-flex + min-width |
| **5** | Input/TextField, Select | ★★★☆☆ | 대 | flex column + 다중 자식 |
| **6** | Switch, Slider | ★★☆☆☆ | 중 | track+thumb flex 배치 |
| **7** | Breadcrumbs, ProgressBar, Meter | ★★☆☆☆ | 소~중 | flex row/column 정리 |

### 7.3 SELF_PADDING_TAGS 전략 변경

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
  → padding/border를 Taffy/Dropflow에 위임
  → Skia 렌더러에서 배경/테두리만 그리기 (content 영역은 엔진이 계산)
  → 컴포넌트 내부의 수동 크기 계산 로직 제거
```

**점진적 마이그레이션:**
1. 새 패턴을 Button에 먼저 적용 → 검증
2. 검증 후 Card, ToggleButton 등 순차 적용
3. 모든 컴포넌트 마이그레이션 완료 후 `SELF_PADDING_TAGS` 및 `stripSelfRenderedProps()` 제거

### 7.4 StylePanel computedStyle 동기화

#### 7.4.1 Style Panel computedStyle 미반영 이슈

**문제:** 스타일 패널(Inspector)의 Typography 섹션 및 다른 섹션들이 WebGL 컴포넌트의 실제 렌더링 값과 일치하지 않는다. WebGL 요소는 실제 DOM 노드가 아니므로 `window.getComputedStyle()`을 사용할 수 없고, StylePanel이 요소 선택 시 보여주는 속성 값이 실제 Skia 렌더링 결과와 불일치한다.

**예시:** Button `size="sm"`일 때
- 실제 렌더링: `14px` (정상)
- 스타일 패널 표시: `16px` (잘못됨)

**스타일 패널의 현재 값 읽기 방식:**

```typescript
// apps/builder/src/builder/panels/styles/atoms/styleAtoms.ts:365-368
export const fontSizeAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.fontSize ?? element?.computedStyle?.fontSize ?? '16px'),
);
```

**우선순위:**
1. `element.style.fontSize` (inline 스타일)
2. `element.computedStyle.fontSize` (computed 스타일)
3. `'16px'` (fallback)

WebGL 컴포넌트는 **실제 DOM 요소가 아니므로**:
- `element.style`: inline 스타일만 존재 (size prop에서 파생된 fontSize 없음)
- `element.computedStyle`: CSS computed style 없음 (DOM이 아니므로 브라우저가 계산하지 않음)
- 결과: fallback 값이 표시됨

**아키텍처 갭:**

```
┌─────────────────────────────────────────────────────────────┐
│ PixiJS/Skia 렌더링                                          │
│  → getSizePreset(size) → CSS 변수 → 14px ✅                 │
├─────────────────────────────────────────────────────────────┤
│ 스타일 패널                                                  │
│  → element.style.fontSize ?? computedStyle.fontSize ?? 16px │
│  → 없음 → 없음 → 16px ❌                                    │
└─────────────────────────────────────────────────────────────┘
```

PixiJS/Skia는 `getSizePreset()`을 통해 CSS 변수에서 정확한 값을 읽어온다:
- `size="sm"` → `getSizePreset('sm')` → `--text-sm` → `0.875rem` → `14px`

**영향받는 속성:**

Button, Input, Checkbox, Radio 등 **size/variant prop을 사용하는 모든 컴포넌트**의:
- `fontSize`
- `padding` (paddingX, paddingY)
- `borderRadius`
- `color` (variant에서 파생)
- `backgroundColor` (variant에서 파생)

#### 7.4.2 해결 방안 비교

| 방안 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **방안 1: computedStyle 자동 채우기** | 요소 선택 시 `size`/`variant` prop에서 파생되는 값들을 `computedStyle`에 자동 채움 | 기존 스타일 패널 로직 변경 최소화 | 모든 컴포넌트별 preset 매핑 필요 |
| **방안 2: 스타일 패널에서 preset 인식** | 스타일 패널이 `size`/`variant` prop을 인식하여 preset 값을 직접 표시 | 정확한 값 표시 | 스타일 패널 로직 복잡해짐 |
| **방안 3: CSS 변수 표시** | 값 대신 CSS 변수 참조를 표시 (예: `var(--text-sm)`) | 간단 | 사용자가 실제 픽셀 값을 알기 어려움 |

**방안 1 구현 예시 (권장):**

```typescript
// 요소 선택 시 컴포넌트의 size, variant prop에서 파생되는 값들을 computedStyle에 자동으로 채움
function computeStyleFromProps(element: Element): Partial<CSSProperties> {
  const { size, variant } = element.props;
  const sizePreset = getSizePreset(size);
  const variantColors = getVariantColors(variant);

  return {
    fontSize: `${sizePreset.fontSize}px`,
    paddingTop: `${sizePreset.paddingY}px`,
    paddingRight: `${sizePreset.paddingX}px`,
    // ...
  };
}
```

**방안 2 구현 예시:**

```typescript
// 스타일 패널에서 직접 preset 인식
const fontSize = useMemo(() => {
  if (element?.style?.fontSize) return element.style.fontSize;
  if (element?.props?.size) {
    const preset = getSizePreset(element.props.size);
    return `${preset.fontSize}px`;
  }
  return '16px';
}, [element]);
```

#### 7.4.3 합성 computedStyle 구현 전략

방안 1을 기반으로 `computeSyntheticStyle()` 서비스를 구현한다:

```typescript
// 합성 computedStyle 생성: 렌더링에 사용된 실제 해석값을 StylePanel에 전달
interface SyntheticComputedStyle {
  // Spec 프리셋에서 해석된 실제 값
  fontSize: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  borderRadius: number | [number, number, number, number];
  backgroundColor: string;
  color: string;
  // ... 기타 시각 속성
}

function computeSyntheticStyle(element: Element): SyntheticComputedStyle {
  const tag = element.tag;
  const props = element.props;
  const style = props?.style ?? {};
  const sizePreset = getSizePreset(tag, props?.size);

  return {
    fontSize: style.fontSize ?? sizePreset.fontSize,
    paddingTop: style.paddingTop ?? style.padding ?? sizePreset.paddingY,
    // ... Skia 렌더링과 동일한 해석 로직 적용
  };
}
```

**신규 파일:** `services/computedStyleService.ts` → StylePanel에서 `computeSyntheticStyle()` 호출

**관련 파일:**

| 파일 | 경로 | 역할 |
|------|------|------|
| `styleAtoms.ts` | `apps/builder/src/builder/panels/styles/atoms/styleAtoms.ts` | 스타일 패널 atom 정의 (fontSizeAtom 등) — computedStyle fallback 수정 지점 |
| `useTypographyValuesJotai.ts` | `apps/builder/src/builder/panels/styles/hooks/useTypographyValuesJotai.ts` | Typography 섹션 값 훅 — preset 인식 로직 추가 지점 |
| `TypographySection.tsx` | `apps/builder/src/builder/panels/styles/sections/TypographySection.tsx` | Typography UI 컴포넌트 — 표시 값 소스 변경 |
| `cssVariableReader.ts` | `apps/builder/src/builder/workspace/canvas/utils/cssVariableReader.ts` | CSS 변수 읽기 (`getSizePreset()` 등) — computeSyntheticStyle에서 재활용 |
| `PixiButton.tsx` | `apps/builder/src/builder/workspace/canvas/ui/PixiButton.tsx` | 렌더링 측 getSizePreset 사용 레퍼런스 |

**우선순위:** 중 — UI 표시 문제이며 실제 렌더링에는 영향 없음. C등급 컴포넌트 구조 개선(§7.2) 후 적용. 구조 개선 시 Taffy/Dropflow가 padding/border를 직접 관리하게 되면 엔진의 `getComputedLayout()`에서 실제 computed 값을 가져올 수 있어 합성 로직이 단순화된다.

#### CSS-Web 구조 미러링 체크리스트

모든 컴포넌트를 개선할 때 다음 체크리스트를 적용:

- [ ] **DOM 구조 일치**: CSS-web의 HTML 요소 계층이 Element 트리에 반영되었는가?
- [ ] **display 일치**: CSS-web에서 사용하는 display 값(flex, inline-flex, block)이 Taffy/Dropflow 엔진에 전달되는가?
- [ ] **flex 속성 일치**: flex-direction, align-items, justify-content, gap, flex-wrap이 CSS와 동일한가?
- [ ] **padding/border 위임**: Taffy/Dropflow가 padding과 border-width를 알고 있는가? (strip하지 않음)
- [ ] **intrinsic sizing**: 텍스트 콘텐츠가 enrichWithIntrinsicSize를 통해 엔진에 크기를 알려주는가?
- [ ] **Spec 토큰 동기화**: CSS 변수 값과 Spec의 sizes/variants 값이 동일한가?
- [ ] **자식 독립성**: 자식 요소가 별도 Taffy/Dropflow 노드로 레이아웃에 참여하는가?
- [ ] **반응성**: 부모 크기 변경 시 자식의 크기와 위치가 CSS와 동일하게 재계산되는가?

#### Spec 렌더링 파이프라인 이슈 (SPEC_VERIFICATION 기준)

`docs/SPEC_VERIFICATION_CHECKLIST.md`에서 발견된 FAIL/WARN 이슈 중 컴포넌트 구조와 직접 관련된 항목:

| 이슈 | 영향 컴포넌트 | 원인 파일 | 해결 Phase |
|------|-------------|----------|-----------|
| circle shape column 변환 실패 | Radio | `ElementSprite.tsx:488-536` `rearrangeShapesForColumn()` | §7.2.3 (Radio 구조 개선) 시 함께 해결 |
| 고정 width bg 미추출 | Input, TextField, SearchField | `specShapeConverter.ts:89-90` | §7.2.4 (Input/TextField 구조 개선) 시 함께 해결 |
| TokenRef cast 이슈 | List, Switcher, Meter | `specShapeConverter.ts:16-24` | Spec 토큰 시스템 정비 시 해결 |

> ~~나머지 SPEC FAIL(shadow 순서, gradient, 배열 radius)은 §5.5.5, §5.5.3, §5.5.6에서 해결한다.~~ → ✅ **모두 구현 완료**됨. 잔여 SPEC FAIL은 Radio의 circle shape column 변환(1건, §7.2.3)만 남음.

---

## 8. 구현 로드맵

### 8.1 우선순위 매트릭스

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

### 8.2 Phase별 예상 일치율 변화

```
Phase 0 (초기):           ████████░░ 83%
§6+§7+§5 (완료):         █████████░ 89%  (+6%) ← SPEC 100%, dashed/bg/TokenRef/Button
S1 (CSS 파서 통합):       █████████▓ 91%  (+2%) ← ✅ calc, em, border shorthand, min/max-content
S2 (Grid 확장):           █████████▓ 92%  (+1%) ← ✅ repeat, minmax, auto-placement, span
S3 (Visual Effects):      █████████▓ 93%  (+1%) ← ✅ 다중 box-shadow, transform
S4 (Cascade):             █████████▓ 94%  (+1%) ← ✅ inherit, var(), ComputedStyle 전파
S5 (Block Precision):     █████████▓ 95%  (+1%) ← ✅ verticalAlign, white-space, word-break
S6 (Position):            ██████████ 96%  (+1%) ← ✅ fixed, z-index, stacking context
─── 현재 위치 ─── 목표 달성 (~96%) ───────────────

Spec 렌더링 정합성: ██████████ 100% (62/62 PASS) ← ✅ 완료
```

### 8.3 의존성 그래프

```
§6 (구조적 문제 P1/P2/P3) ← 최우선, 독립 실행 가능
  └──→ §7 (컴포넌트 CSS-web 구조) — P1/P2/P3 수정 후 적용
  │      └──→ §7.4 (computedStyle 동기화) — 구조 개선 후 적용
  └──→ Phase 1 (CSS 값 파서) — ✅ 완료 (cssValueParser.ts + resolveCSSSizeValue)
         ├──→ Phase 2 (Grid) — ✅ 완료 (TaffyGridEngine 네이티브, repeat/minmax/span 지원)
         ├──→ Phase 3 (캐스케이드) — em 해석에 fontSize 상속 필요 (cssResolver.ts 부분 구현)
         └──→ Phase 4 (DropflowBlockEngine + §5.4.5/5.4.6) — min-content/max-content + verticalAlign/fontStyle
                └──→ Phase 5 (시각 + §5.5.5/5.5.6/5.5.7) — transform + shadow순서/radius/dashed
                       └──→ Phase 6 (Position) — stacking context

§5.5.5 (shadow 렌더 순서) ← ✅ 구현 완료 (SPEC FAIL 7건 해소됨)
```

### 8.4 스프린트 계획 (S1-S6)

#### Phase 1 세부 태스크

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
| 1.10 | DropflowBlockEngine `FIT_CONTENT` 분기에 min/max-content 추가 | `DropflowBlockEngine.ts` | 1.9 |
| 1.11 | DropflowBlockEngine의 intrinsic size 계산에 min/max-content sentinel 추가 | `engines/utils.ts` | 1.10 |
| 1.12 | 단위 테스트 (calc, em, border shorthand, min/max-content) | `__tests__/cssValueParser.test.ts` | 1.1~1.11 |

#### Phase Exit Criteria (완료 조건)

각 Phase는 "코드 머지"가 아니라 아래 완료 조건을 만족해야 종료한다.

| Phase | 기능 완료 조건 | 품질/성능 게이트 |
|------|---------------|------------------|
| 1 (값 파서) | ✅ `calc/em/min/max-content/border shorthand` 파싱 통합 | ✅ 파서 단위 테스트 100% 통과, 레이아웃 100요소 < 5ms 유지 |
| 2 (Grid) | ✅ TaffyGridEngine 네이티브로 `repeat/minmax/auto-placement/span` 지원 | ✅ Grid 벤치마크 케이스 PASS율 85%+ |
| 3 (캐스케이드) | `inherit/var()` 상속 체인 동작 | 회귀 테스트에서 상속 관련 FAIL 0건 |
| 4 (DropflowBlockEngine) + §5.4.5/5.4.6 | baseline/white-space/word-break + **verticalAlign/fontStyle** 반영 | 텍스트 정렬 오차 ±1px 내, italic 렌더 확인 |
| 5 (시각 효과) + §5.5.5/5.5.6/5.5.7 | ✅ multi-shadow/transform + ~~shadow순서/배열 radius/dashed border~~ (구현 완료) | ✅ SPEC FAIL 0건, multi box-shadow + CSS transform 구현 완료 |
| 6 (Position) | fixed/z-index/stacking context 동작 | 주요 샘플 시나리오 PASS + FPS 60 유지 |
| §6-P2 (컨텍스트 전파) | `styleToLayoutRoot/Child` 래퍼 전환 + 호출부 마이그레이션 완료 | direct `styleToLayout(` 호출 0건 + `styleToLayoutContextPropagation.test.ts` PASS |
| §7.4 (computedStyle) | `computeSyntheticStyle()` 구현 + StylePanel 연동 | StylePanel 표시 값과 Skia 렌더링 값 일치율 95%+ |

---

#### 구현 순서 최적화 (스프린트 분할)

리스크를 낮추기 위해 Phase 단위 일괄 투입 대신 세로 슬라이스 방식으로 진행한다.

| Sprint | 범위 | 산출물 |
|--------|------|--------|
| S1 | Phase1-핵심(`calc`, `em`, parser 통합) | `cssValueParser.ts` + 통합 테스트 |
| S2 | Phase2-핵심(`repeat`, `minmax`) + Grid 회귀 | Grid 파서 확장 + 벤치마크 케이스 |
| S3 | Phase3(`inherit`, `var`) + Phase4-기초(baseline) | `cssResolver.ts` + 텍스트 정렬 개선 |
| S4 | Phase5(transform/gradient) + Phase6(z-index/fixed) | 시각 효과/스태킹 정합성 패치 |

각 Sprint는 "기능 + 테스트 + 성능 측정"을 한 묶음으로 머지한다.

#### S1 실행 계획: CSS 값 파서 통합 (Phase 1) — ✅ 구현 완료

**목표:** CSS 단위 65% → 85%, Box Model 88% → 93% — **달성**

**S1-T1: `cssValueParser.ts` 신규 생성**

**파일:** `apps/builder/src/builder/workspace/canvas/layout/engines/cssValueParser.ts`

```typescript
// 통합 CSS 값 해석 함수
export interface CSSValueContext {
  parentSize?: number;         // em 단위 기준 (부모 fontSize)
  containerSize?: number;      // % 단위 기준 (부모 content-box)
  viewportWidth?: number;      // vw 단위 기준
  viewportHeight?: number;     // vh 단위 기준
  rootFontSize?: number;       // rem 단위 기준 (기본 16)
}

export function resolveCSSSizeValue(
  value: string | number | undefined,
  ctx: CSSValueContext,
  fallback?: number,
): number | string | undefined;

// calc() 재귀 하강 파서
export function resolveCalc(expr: string, ctx: CSSValueContext): number;
```

**calc() 파서 문법:**
```
calcExpr → term (('+' | '-') term)*
term     → factor (('*' | '/') factor)*
factor   → number unit | '(' calcExpr ')'
unit     → 'px' | '%' | 'vh' | 'vw' | 'em' | 'rem' | (unitless)
```

**S1-T2: 기존 3개 파서 통합**

| 기존 파서 | 파일 | 변경 |
|-----------|------|------|
| `parseSize()` | `engines/utils.ts:86-126` | 내부에서 `resolveCSSSizeValue()` 호출 |
| `parseCSSValue()` | `styleToLayout.ts:148-184` | 내부에서 `resolveCSSSizeValue()` 호출 |
| `parseCSSSize()` | `styleConverter.ts:150-201` | 내부에서 `resolveCSSSizeValue()` 호출 |

**S1-T3: `min-content`/`max-content` sentinel**

**파일:** `engines/utils.ts`
```typescript
export const MIN_CONTENT = -3;
export const MAX_CONTENT = -4;
```
- `calculateMinContentWidth()`: 가장 긴 단어 너비
- `calculateMaxContentWidth()`: 줄바꿈 없는 전체 너비
- DropflowBlockEngine의 intrinsic size 계산에 sentinel 분기 추가

**S1-T4: `border` shorthand 파싱**

**파일:** `engines/utils.ts`
```typescript
export function parseBorderShorthand(value: string): {
  width: number; style: string; color: string;
};
// "1px solid #ccc" → { width: 1, style: 'solid', color: '#ccc' }
```

**S1 검증**
1. `npx tsc --noEmit` 통과
2. `calc(100% - 40px)`, `2em`, `min-content` 등 단위 테스트
3. 기존 px/rem/vh/vw 회귀 없음 확인
4. 레이아웃 100요소 < 5ms 성능 유지

---

#### S2 실행 계획: Grid 엔진 고급 기능 (Phase 2) — ✅ 구현 완료

**목표:** Grid 60% → 85% — **달성**

**S2-T1: `repeat()` + `minmax()` 파서 — ✅ TaffyGridEngine 네이티브 처리**

> TaffyGridEngine(Taffy WASM)이 `repeat()`, `minmax()`, `auto-fill/auto-fit`를 네이티브로 처리하므로 커스텀 `GridLayout.utils.ts` 파서 구현은 불필요하였다. CSS Grid 문자열을 Taffy 스타일 구조체로 변환하는 어댑터만 구현되었다.

**S2-T2: Auto-Placement 확장 — ✅ TaffyGridEngine 네이티브 처리**

> TaffyGridEngine이 `grid-auto-flow: row | column | dense`를 네이티브로 처리한다. 커스텀 `autoPlaceItems()` 구현 불필요.

**S2-T3: `span` 키워드 — ✅ TaffyGridEngine 네이티브 처리**

> TaffyGridEngine이 `span` 키워드를 네이티브로 처리한다. 커스텀 `parseGridLine()` 확장 불필요.

**S2-T4: WASM 가속 — ✅ TaffyGridEngine 자체가 Taffy WASM**

> TaffyGridEngine 자체가 Taffy WASM 기반이므로 별도 `grid_layout.rs` 가속 구현은 불필요하였다.

**S2 검증 (완료 기록)**
1. `npx tsc --noEmit` 통과 ✅
2. `repeat(3, 1fr)`, `minmax(200px, 1fr)` 레이아웃 확인 ✅
3. `span 2` 셀 병합 확인 ✅
4. auto-fill/auto-fit 동적 트랙 생성 확인 ✅

---

#### S3 실행 계획: Visual Effects 확장 (Phase 5) — ✅ 구현 완료

**목표:** Visual Effects 80% → 90% — **달성**

**S3-T1: 다중 `box-shadow`**

**파일:** `styleConverter.ts:465-518`

```typescript
// 현재: parseFirstBoxShadow() — 첫 번째만
// 목표: parseAllBoxShadows() — 모든 shadow
function parseAllBoxShadows(raw: string): DropShadowEffect[] {
  const shadows = raw.split(/,(?![^(]*\))/);
  return shadows
    .map(s => parseOneShadow(s.trim()))
    .filter(Boolean) as DropShadowEffect[];
}
```

- `buildSkiaEffects()`에서 모든 shadow를 effects 배열에 추가
- nodeRenderers.ts는 이미 effects 배열 순회하므로 변경 불필요

**S3-T2: CSS `transform`**

**파일 변경 (4곳):**

1. **`types.ts`** — CSSStyle에 transform 필드 추가:
   ```typescript
   transform?: string;
   transformOrigin?: string;
   ```

2. **`styleConverter.ts`** — `parseTransform()` 신규:
   ```typescript
   function parseTransform(value: string): Float32Array | null {
     // translate(x, y), rotate(deg), scale(x, y), skew(x, y)
     // → CanvasKit 3x3 Matrix 합성
   }
   ```

3. **`nodeRenderers.ts`** — SkiaNodeData에 transform 추가:
   ```typescript
   transform?: Float32Array;  // 3x3 matrix
   ```

4. **`nodeRenderers.ts`** — renderNode에서 적용:
   ```typescript
   if (node.transform) {
     canvas.concat(node.transform);
   }
   ```

**S3-T3: filter 함수 확장 (선택)**

**파일:** `styleConverter.ts`

- `brightness()`, `contrast()`, `saturate()` → CanvasKit `ColorFilter.MakeMatrix()`
- `hue-rotate()` → CanvasKit 색상 행렬 변환
- 우선순위 낮음 — blur 이외 필터 사용 빈도 낮아 선택적 구현

**S3 검증**
1. `npx tsc --noEmit` 통과
2. 다중 box-shadow CSS 캔버스 렌더링 확인
3. `transform: rotate(45deg) scale(1.2)` 캔버스 반영 확인
4. FPS 60 유지 확인

#### 롤백 기준

아래 조건 중 하나라도 충족하면 해당 Phase 변경을 feature flag 뒤로 이동하거나 롤백한다.

- 캔버스 FPS가 기준(60fps) 미만으로 지속 하락하고 1차 최적화 후에도 복구되지 않는 경우
- 레이아웃 정합성 벤치마크에서 기존 대비 FAIL 케이스가 증가하는 경우
- 핵심 편집 플로우(선택/드래그/리사이즈) 회귀가 발생하는 경우
- `styleToLayoutContextPropagation.test.ts` 실패 또는 direct `styleToLayout(` 호출이 남아있는 경우

롤백은 "전체 되돌리기"보다 기능 단위 flag off를 우선 적용한다.


---

## 9. 아키텍처 결정 사항

### 9.1 CSS 값 파서를 JS vs WASM 중 어디에 구현할 것인가?

**결정: JS (TypeScript)**

| 기준 | JS | WASM |
|------|-----|------|
| 문자열 파싱 성능 | 충분함 (파싱은 1회) | 마샬링 비용이 파싱 이점 상쇄 |
| 디버깅 | 브라우저 devtools 직접 | source-map 필요 |
| 번들 크기 | 0 (기존 번들에 포함) | +30~50KB |
| 개발 속도 | 빠름 | 느림 (빌드 파이프라인) |

파싱은 요소당 1회이고 결과가 캐싱되므로 JS 성능으로 충분하다.
WASM은 레이아웃 계산(N개 자식 순회)에만 사용하는 현재 방침 유지.

### 9.2 스타일 상속을 트리 순회 vs 캐시 중 어떻게 구현할 것인가?

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

### 9.3 CSS 변수를 어디에 저장할 것인가?

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

## 10. 성능 & 테스트

### 10.1 성능 제약

모든 Phase에서 다음 성능 기준을 유지해야 한다:

| 지표 | 기준 | 측정 방법 |
|------|------|----------|
| Canvas FPS | ≥ 60fps | `GPUDebugOverlay` RAF FPS |
| 레이아웃 계산 (100 요소) | < 5ms | `performance.measure()` |
| 스타일 해석 (단일 요소) | < 0.1ms | `performance.now()` |
| 초기 로드 증가량 | < 20KB gzip | `vite-plugin-inspect` |
| WASM 모듈 증가량 | < 30KB | `wasm-opt -Oz` |

#### 10.1.1 성능 최적화 전략

1. **Lazy Parsing:** `calc()` 파서는 해당 값이 실제 사용될 때만 호출
2. **결과 캐싱:** 동일 CSS 값 문자열 → 동일 결과 (LRU 캐시, 1000개)
3. **Batch Invalidation:** 스타일 변경 시 dirty 마킹 후 RAF에서 일괄 재계산
4. **엔진별 런타임 분리:** DropflowBlockEngine은 순수 JS로 동작. TaffyFlexEngine/TaffyGridEngine은 항상 Taffy WASM 경로를 사용하며, WASM 미로드 시 Dropflow 폴백

#### 10.1.2 관측 지표 대시보드

성능/정합성 지표는 아래 항목을 CI 리포트로 축적한다.

| 지표 | 수집 지점 | 경고 임계값 |
|------|-----------|-------------|
| 레이아웃 평균 시간 | `LayoutEngine` 래퍼 `performance.measure()` | > 5ms |
| 렌더 프레임 드랍율 | `GPUDebugOverlay` FPS 샘플링 | 55fps 미만 3초 지속 |
| CSS 정합성 오차율 | 브라우저 vs 캔버스 좌표 비교 스크립트 | 오차 > ±1px 5% 초과 |
| 번들 증가량 | build report | +20KB(gzip) 초과 |

#### 10.1.3 이중 Surface 캐싱 아키텍처

> §4.4.5 참조 — Surface 구조, 프레임 분류(`classifyFrame`), 버전/변경 감지 상세는 §4.4.5에 정의되어 있다.

#### 10.1.4 롤백 기준

아래 조건 중 하나라도 충족하면 해당 Phase 변경을 feature flag 뒤로 이동하거나 롤백한다.

- 캔버스 FPS가 기준(60fps) 미만으로 지속 하락하고 1차 최적화 후에도 복구되지 않는 경우
- 레이아웃 정합성 벤치마크에서 기존 대비 FAIL 케이스가 증가하는 경우
- 핵심 편집 플로우(선택/드래그/리사이즈) 회귀가 발생하는 경우
- `styleToLayoutContextPropagation.test.ts` 실패 또는 direct `styleToLayout(` 호출이 남아있는 경우

롤백은 "전체 되돌리기"보다 기능 단위 flag off를 우선 적용한다.

### 10.2 테스트 전략

> **테스트 파일 위치:**
> - 레이아웃 엔진 단위 테스트: `apps/builder/src/builder/workspace/canvas/layout/engines/__tests__/`
>   (`DropflowBlockEngine.test.ts`, `TaffyFlexEngine.test.ts`, `TaffyGridEngine.test.ts`, `utils.test.ts`)
> - Storybook stories: `apps/builder/src/stories/` (신규 생성)
> - CSS 정합성 벤치마크: `apps/builder/src/builder/workspace/canvas/layout/__tests__/`

#### 10.2.1 단위 테스트 (Vitest)

각 Phase의 파서/엔진에 대한 단위 테스트:

```
__tests__/
  cssValueParser.test.ts                // Phase 1: calc, em, border shorthand
  gridAutoPlacement.test.ts             // Phase 2: auto-placement 알고리즘 (TaffyGridEngine 네이티브)
  cssResolver.test.ts                   // Phase 3: 상속, CSS 변수
  dropflowBlockEnginePhase4.test.ts     // Phase 4: baseline, white-space (DropflowBlockEngine)
```

```typescript
// DropflowBlockEngine.test.ts (Phase 11 이후 — 레거시 BlockEngine에서 이전)
describe('DropflowBlockEngine', () => {
  describe('Block Layout', () => {
    it('should stack blocks vertically', () => {
      const layouts = blockEngine.calculate(parent, [
        { id: '1', props: { style: { height: 100 } } },
        { id: '2', props: { style: { height: 200 } } },
      ], 400, 800);

      expect(layouts[0].y).toBe(0);
      expect(layouts[1].y).toBe(100);
    });

    it('should apply width 100% by default', () => {
      const layouts = blockEngine.calculate(parent, [
        { id: '1', props: { style: { height: 100 } } }, // width 미지정
      ], 400, 800);

      expect(layouts[0].width).toBe(400);
    });
  });

  describe('Margin Collapse', () => {
    it('should collapse adjacent positive margins', () => {
      const layouts = blockEngine.calculate(parent, [
        { id: '1', props: { style: { marginBottom: 20, height: 100 } } },
        { id: '2', props: { style: { marginTop: 30, height: 100 } } },
      ], 400, 800);

      // 두 번째 요소는 첫 번째 + collapsed margin 위치
      expect(layouts[1].y).toBe(100 + 30); // 30 (큰 값), not 50
    });

    it('should collapse adjacent negative margins', () => {
      const layouts = blockEngine.calculate(parent, [
        { id: '1', props: { style: { marginBottom: -20, height: 100 } } },
        { id: '2', props: { style: { marginTop: -10, height: 100 } } },
      ], 400, 800);

      // 음수끼리는 절대값이 큰 값
      expect(layouts[1].y).toBe(100 - 20); // -20 (절대값이 큰 값)
    });
  });

  describe('Inline-Block Layout', () => {
    it('should place inline-blocks horizontally', () => {
      const layouts = blockEngine.calculate(parent, [
        { id: '1', props: { style: { display: 'inline-block', width: 100 } } },
        { id: '2', props: { style: { display: 'inline-block', width: 100 } } },
      ], 400, 800);

      expect(layouts[0].x).toBe(0);
      expect(layouts[1].x).toBe(100);
      expect(layouts[0].y).toBe(layouts[1].y); // 같은 줄
    });

    it('should wrap inline-blocks to next line', () => {
      const layouts = blockEngine.calculate(parent, [
        { id: '1', props: { style: { display: 'inline-block', width: 300 } } },
        { id: '2', props: { style: { display: 'inline-block', width: 200 } } },
      ], 400, 800);

      expect(layouts[0].y).toBe(0);
      expect(layouts[1].y).toBeGreaterThan(0); // 다음 줄
      expect(layouts[1].x).toBe(0); // 줄 시작
    });
  });
});
```

#### 10.2.2 브라우저 비교 테스트

```typescript
// browser-comparison.test.ts
describe('Browser CSS Comparison', () => {
  it('should match browser block layout', async () => {
    // 1. HTML 렌더링
    const html = `
      <div style="width: 400px;">
        <div style="height: 100px; margin-bottom: 20px;"></div>
        <div style="height: 100px; margin-top: 30px;"></div>
      </div>
    `;
    const browserLayout = await measureBrowserLayout(html);

    // 2. BlockEngine 계산
    const engineLayout = blockEngine.calculate(...);

    // 3. 비교
    expect(engineLayout[1].y).toBe(browserLayout[1].y);
  });
});
```

#### 10.2.3 실제 사용 테스트

1. 빌더에서 Block/Grid 컴포넌트 배치
2. Preview iframe과 픽셀 단위 비교
3. 캔버스 SelectionBox 위치 정확성 확인

#### 10.2.4 CanvasKit 렌더링 정확성 검증

> 레이아웃 검증(§10.2.1-10.2.3)에 더하여 **렌더링 정확성** 검증이 필요하다.
> Taffy/Dropflow 레이아웃 계산 결과는 §10.2.1-10.2.3 테스트로 검증되며, CanvasKit 렌더링 정확성은 별도 검증한다.
> 상세: `docs/WASM.md` Phase 5.3 참조

**검증 대상:**

| 렌더링 기능 | CanvasKit API | 검증 포인트 |
|------------|---------------|------------|
| border-radius | `canvas.drawRRect()` | 4방향 개별 반경, 타원형 반경 정확성 |
| 텍스트 렌더링 | `ParagraphBuilder` → `drawParagraph` | 서브픽셀 렌더링, 폰트 메트릭, 줄바꿈 위치 |
| 그래디언트 (basic) | `Shader.MakeLinearGradient` / `MakeTwoPointConicalGradient` / `MakeSweepGradient` | 방향, 색상 정지점, 반복 모드 |
| 메시 그래디언트 | `MakeLinearGradient` × 2 + `MakeBlend` (bilinear 근사) | 4코너 색상 보간 정확성, top/bottom 그래디언트 블렌딩 |
| 그림자/블러 | `ImageFilter.MakeDropShadow/MakeBlur` | offset, sigma, inner/outer shadow |
| 레이어 블러 | `ImageFilter.MakeBlur` + `saveLayer()` | 전경 콘텐츠 가우시안 블러, sigma 정확성 |
| 이미지 | `canvas.drawImageRect()` | fit/fill/crop 모드, 비율 유지 |
| Selection 오버레이 | `drawRRect` + `drawLine` (selectionRenderer.ts) | 바운딩 박스, 핸들, 올가미 위치 정확성 |

**비교 방법론:**

> **현재 상태:** 아래 방법론은 Phase 5+ 안정화 단계에서 구현 예정이다.
> §10.2.4의 CanvasKit API는 모두 구현 완료되어 있으나, 자동화된 픽셀 비교 테스트 인프라는 아직 미구축이다.

```
React CSS 렌더링 (Preview iframe) ↔ CanvasKit 렌더링 (Builder Canvas)
                                  ↓
                         픽셀 단위 비교 테스트
```

1. **동일 element를 CSS와 CanvasKit으로 각각 렌더링**
2. **스크린샷 기반 비교**: Playwright 스크린샷 캡처 (구현 예정)
3. **허용 오차**: 안티앨리어싱 차이로 인해 SSIM >= 0.95 또는 픽셀 차이 < 2%
4. **테스트 케이스 우선순위**:
   - P0: 단색 박스, border-radius, 텍스트 기본 렌더링
   - P1: 그래디언트(linear, radial), 그림자, 이미지, selection 오버레이
   - P2: angular/mesh 그래디언트, 복합 이펙트(layer-blur + shadow), AI 시각 피드백

**텍스트 렌더링 전용 검증:**

> **현재 상태:** 텍스트 측정 인프라(`textMeasure.ts`)는 구현 완료. 아래 테스트 코드는 비교 검증 구현 예정 시점의 설계 예시이다.

```typescript
// CanvasKit ParagraphBuilder 텍스트 측정 vs CSS 텍스트 측정 비교
describe('CanvasKit Text Rendering', () => {
  it('should match CSS text metrics within tolerance', () => {
    // CanvasKit Paragraph로 측정
    const ckMetrics = measureWithCanvasKit(text, fontSize, fontFamily);
    // CSS로 측정 (hidden DOM element)
    const cssMetrics = measureWithCSS(text, fontSize, fontFamily);

    expect(Math.abs(ckMetrics.width - cssMetrics.width)).toBeLessThan(2);
    expect(Math.abs(ckMetrics.height - cssMetrics.height)).toBeLessThan(2);
  });
});
```

#### 10.2.5 시각 회귀 테스트

Storybook + Chromatic 기반 스크린샷 비교:

```
stories/
  LayoutCSS.stories.tsx       // CSS 속성별 레이아웃 결과 시각 검증
  GridAdvanced.stories.tsx    // repeat, minmax, auto-placement
  TypographyFlow.stories.tsx  // white-space, word-break
```

#### 10.2.6 CSS 정합성 벤치마크

브라우저 CSS 결과와 캔버스 레이아웃 결과를 자동 비교:

```typescript
// 동일한 DOM 구조를 브라우저 iframe과 캔버스 양쪽에 렌더링
// getBoundingClientRect() 결과와 ComputedLayout 결과를 비교
// 허용 오차: ±1px (서브픽셀 반올림 차이)
```

#### 10.2.7 구조적 회귀 테스트 (필수)

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

**추가 필수 테스트 (호출부 컨텍스트 전파):**

```text
layout/styleToLayoutContextPropagation.test.ts
  - row 부모 + fit-content 자식: grow/shrink 제한 적용 확인
  - column 부모 + fit-content 자식: stretch 허용 확인
  - context 누락 시(직접 호출) 테스트 실패하도록 가드
```

**정적 검증 (CI):**

```bash
rg -n "styleToLayout\\(" apps/builder/src/builder/workspace/canvas
# 허용: styleToLayoutRoot(, styleToLayoutChild(
# 금지: direct styleToLayout(
```

### 10.3 파일 구조

> **Phase 11 이후 업데이트:** 레거시 엔진 파일(BlockEngine.ts, FlexEngine.ts, GridEngine.ts)은 삭제되었고,
> Taffy/Dropflow 기반 엔진으로 교체되었다.

```
apps/builder/src/builder/workspace/canvas/layout/
├── engines/
│   ├── types.ts                 # 공통 타입 (Margin, BoxModel)
│   ├── LayoutEngine.ts          # 엔진 인터페이스 (ComputedLayout, LayoutContext)
│   ├── TaffyFlexEngine.ts       # Flex/Inline-Flex 엔진 (Taffy WASM)
│   ├── TaffyGridEngine.ts       # Grid/Inline-Grid 엔진 (Taffy WASM)
│   ├── DropflowBlockEngine.ts   # Block/Inline-Block/Inline/Flow-Root 엔진 (Dropflow Fork JS)
│   ├── utils.ts                 # 공유 유틸리티 (parseMargin, parseBoxModel)
│   └── index.ts                 # 엔진 디스패처 (selectEngine)
├── enrichWithIntrinsicSize.ts   # 리프 UI 컴포넌트 intrinsic size 주입
├── cssValueParser.ts            # 통합 CSS 값 파서 (resolveCSSSizeValue)
├── cssResolver.ts               # CSS 캐스케이드 + 상속
├── DirectContainer.ts           # x/y/width/height 직접 설정 컨테이너
├── GridLayout.utils.ts          # Grid 유틸리티
├── styleToLayout.ts             # 스타일 변환 (레거시 잔여 코드 포함)
└── index.ts                     # 공개 API
```

---

## 11. 이슈 해결 내역 (부록)

### 11.1 Phase 9: CSS/WebGL 레이아웃 정합성 개선 (2026-01-28)

#### 이슈 1: Button 크기 CSS/WebGL 불일치

**증상:**
- WebGL 캔버스에서 버튼들이 겹치거나 잘못된 위치에 렌더링됨
- CSS에서는 정상적으로 배치되지만 WebGL에서는 레이아웃이 깨짐

**원인:**
- `utils.ts`의 `BUTTON_SIZE_CONFIG` 값이 `@xstudio/specs ButtonSpec`과 일치하지 않음
- 예: md 사이즈가 padding: 50, height: 36으로 설정되어 있었으나 실제 ButtonSpec은 padding: 32, height: 40

**해결:**
```typescript
// utils.ts - BUTTON_SIZE_CONFIG를 ButtonSpec과 동기화
// ⚠️ 최신 형태는 Phase 12(이슈 14) 및 v1.12 참조: height→paddingY, borderWidth 추가, paddingX CSS 동기화
const BUTTON_SIZE_CONFIG = {
  xs: { paddingLeft: 8, paddingRight: 8, paddingY: 2, fontSize: 12, borderWidth: 1 },
  sm: { paddingLeft: 12, paddingRight: 12, paddingY: 4, fontSize: 14, borderWidth: 1 },
  md: { paddingLeft: 24, paddingRight: 24, paddingY: 8, fontSize: 16, borderWidth: 1 },
  lg: { paddingLeft: 32, paddingRight: 32, paddingY: 12, fontSize: 18, borderWidth: 1 },
  xl: { paddingLeft: 40, paddingRight: 40, paddingY: 16, fontSize: 20, borderWidth: 1 },
};
```

---

#### 이슈 2: StylesPanel에서 width가 0으로 표시됨

**증상:**
- Button 등 컴포넌트 선택 시 StylesPanel의 width 필드에 0이 표시됨
- height는 정상적으로 "auto"로 표시됨

**원인:**
- `PropertyUnitInput.tsx`의 `KEYWORDS` 배열에 CSS intrinsic sizing 키워드가 없음
- `fit-content` 값이 키워드로 인식되지 않아 숫자 파싱 실패 → 0으로 폴백

**해결:**
```typescript
// PropertyUnitInput.tsx
const KEYWORDS = [
  "reset", "auto", "inherit", "initial", "unset", "normal",
  "fit-content", "min-content", "max-content",  // CSS intrinsic sizing 추가
];
```

---

#### 이슈 3: Page padding이 WebGL에 적용되지 않음

**증상:**
- CSS Preview에서는 page에 설정한 padding이 적용됨
- WebGL 캔버스에서는 padding이 무시되어 자식 요소가 좌상단에 붙음

**원인:**
- `BuilderCanvas.tsx`의 `renderWithEngine`(당시 `renderWithCustomEngine`)에서 부모의 padding을 고려하지 않고 `pageWidth`, `pageHeight`를 그대로 사용

**해결:**
```typescript
// BuilderCanvas.tsx - renderWithEngine (당시 renderWithCustomEngine)
function renderWithEngine(...) {
  // 부모의 padding + border 파싱
  const parentPadding = parsePadding(parentStyle);
  const parentBorder = parseBorder(parentStyle);

  // padding + border가 적용된 content-box 크기 계산
  const availableWidth = pageWidth
    - parentPadding.left - parentPadding.right
    - parentBorder.left - parentBorder.right;
  const availableHeight = pageHeight
    - parentPadding.top - parentPadding.bottom
    - parentBorder.top - parentBorder.bottom;

  // 레이아웃 계산 시 content-box 크기 사용
  const layouts = engine.calculate(
    parentElement, children,
    availableWidth, availableHeight, ...
  );

  // 자식 위치에 padding offset 적용
  // ⚠️ border offset은 포함하지 않음 — 레이아웃 엔진이 position:absolute 자식의
  //    border offset을 자동 처리하므로 여기서 추가하면 이중 적용됨
  return children.map((child) => (
    <DirectContainer
      x={layout.x + parentPadding.left}
      y={layout.y + parentPadding.top}
      width={layout.width}
      height={layout.height}
    />
  ));
}
```

---

#### 이슈 4: display: flex가 WebGL에서 작동하지 않음

**증상:**
- Page나 Component에 `display: flex`와 `flexDirection: column` 설정
- CSS Preview에서는 정상 동작
- WebGL 캔버스에서는 여전히 가로 배치 (flex 적용 안됨)

**원인:**
- `rootLayout`의 기본값에 `display: 'flex'`가 명시되지 않음
- 당시 @pixi/layout이 명시적 `display: 'flex'` 없이는 flex 컨테이너로 인식하지 못했음 (현재는 TaffyFlexEngine으로 교체됨)
- `bodyLayout`에서 spread로 `display: 'flex'`가 전달되어도 기본값이 없으면 동작하지 않는 경우 발생

**해결 (당시 코드 — Phase 10에서 renderWithEngine 단일 경로로 통합됨):**

`rootLayout`에 `display: 'flex'`를 명시적으로 추가하고, `styleToLayout.ts`에서 flex/inline-flex display 값을 처리하도록 수정.

---

### 11.2 Phase 10: CSS Blockification 지원 (2026-01-28)

#### 이슈 5: Flex 컨테이너 자식의 display가 WebGL에서 변환되지 않음

**증상:**
- body에 `display: flex` 설정 시
- CSS Preview에서는 button(기본 inline-block)이 block으로 동작
- WebGL 캔버스에서는 여전히 inline-block으로 처리되어 가로 배치됨

**원인:**
- CSS Blockification 규칙 미구현
- 당시 `BlockEngine`(현재 `DropflowBlockEngine`으로 교체됨)이 부모 display 값을 고려하지 않고 자식의 명시적 display만 확인
- `LayoutContext`에 parentDisplay 필드 없음

**해결:**
```typescript
// LayoutEngine.ts - LayoutContext에 parentDisplay 추가
export interface LayoutContext {
  bfcId: string;
  // ...
  parentDisplay?: string;  // CSS blockification 계산용
}

// DropflowBlockEngine.ts (당시 BlockEngine.ts) - computeEffectiveDisplay 메서드 추가
private computeEffectiveDisplay(
  childDisplay: string | undefined,
  childTag: string,
  parentDisplay: string | undefined
): 'block' | 'inline-block' {
  const baseDisplay = childDisplay ??
    (DEFAULT_INLINE_BLOCK_TAGS.has(childTag) ? 'inline-block' : 'block');

  // CSS Blockification: flex/grid 자식의 inline-block → block
  if (
    parentDisplay === 'flex' ||
    parentDisplay === 'inline-flex' ||
    parentDisplay === 'grid' ||
    parentDisplay === 'inline-grid'
  ) {
    if (baseDisplay === 'inline' || baseDisplay === 'inline-block') {
      return 'block';
    }
  }

  return baseDisplay === 'inline-block' ? 'inline-block' : 'block';
}

// BuilderCanvas.tsx - parentDisplay 전달
const layouts = engine.calculate(
  parentElement, children, availableWidth, availableHeight,
  { bfcId: parentElement.id, parentDisplay }
);
```

---

### 11.3 Phase 11: CSS 명세 누락 케이스 보완 (구현 완료)

CSS 명세와 WebGL 구현 간 불일치 조사 결과 발견된 누락 케이스들입니다.

#### 이슈 6: Position absolute/fixed일 때 Blockification 제외 필요 (구현 완료)

**CSS 명세:**
- out-of-flow 요소(absolute, fixed)는 부모가 flex/grid라도 blockification이 적용되지 않음

**구현 내용:**
- `DropflowBlockEngine.ts` (당시 `BlockEngine.ts`): `computeEffectiveDisplay()`에 `childPosition` 매개변수 추가
- absolute/fixed 요소는 blockification 건너뛰고 원래 display 값 유지
- 호출부에서 `style?.position` 전달

```typescript
// DropflowBlockEngine.ts (당시 BlockEngine.ts) - computeEffectiveDisplay() 수정
private computeEffectiveDisplay(
  childDisplay: string | undefined,
  childTag: string,
  parentDisplay: string | undefined,
  childPosition: string | undefined  // 추가
): 'block' | 'inline-block' {
  const baseDisplay = childDisplay ??
    (DEFAULT_INLINE_BLOCK_TAGS.has(childTag) ? 'inline-block' : 'block');

  // out-of-flow 요소는 blockification 제외
  if (childPosition === 'absolute' || childPosition === 'fixed') {
    return baseDisplay === 'inline-block' ? 'inline-block' : 'block';
  }

  // 기존 blockification 로직...
}
```

---

#### 이슈 7: min/max width/height 크기 제한 미적용 (구현 완료)

**CSS 명세:**
- 요소 크기는 `clamp(min, base, max)` 형태로 제한됨

**구현 내용:**
- `types.ts`: `BoxModel`에 `minWidth`, `maxWidth`, `minHeight`, `maxHeight` 필드 추가
- `utils.ts`: `parseBoxModel()`에서 `parseSize()`로 min/max 값 파싱
- `DropflowBlockEngine.ts` (당시 `BlockEngine.ts`): `clampSize()` 유틸리티 함수 추가, block/inline-block 양쪽에서 적용

```typescript
// DropflowBlockEngine.ts (당시 BlockEngine.ts) - clampSize 유틸리티
function clampSize(value: number, min?: number, max?: number): number {
  let result = value;
  if (min !== undefined) result = Math.max(result, min);
  if (max !== undefined) result = Math.min(result, max);
  return result;
}

// block 경로
const childWidth = clampSize(
  boxModel.width ?? availableWidth - margin.left - margin.right,
  boxModel.minWidth, boxModel.maxWidth
);
const childHeight = clampSize(
  boxModel.height ?? boxModel.contentHeight,
  boxModel.minHeight, boxModel.maxHeight
);

// inline-block 경로도 동일하게 적용
```

---

#### 이슈 8: box-sizing: border-box 미지원 (구현 완료)

**CSS 명세:**
- `border-box`: width/height가 padding + border 포함
- `content-box` (기본): width/height가 콘텐츠만

**구현 내용:**
- `utils.ts`: `parseBoxModel()`에서 `boxSizing === 'border-box'` 확인 후 padding + border 제외

```typescript
// utils.ts - parseBoxModel() 내부
const boxSizing = style?.boxSizing as string | undefined;
if (boxSizing === 'border-box') {
  const paddingH = padding.left + padding.right;
  const borderH = border.left + border.right;
  const paddingV = padding.top + padding.bottom;
  const borderV = border.top + border.bottom;

  if (width !== undefined) {
    width = Math.max(0, width - paddingH - borderH);
  }
  if (height !== undefined) {
    height = Math.max(0, height - paddingV - borderV);
  }
}
```

---

#### 이슈 9: overflow-x/y 혼합 처리 안 됨 (구현 완료)

**CSS 명세:**
- `overflow-x`와 `overflow-y`는 독립적으로 처리 가능
- 둘 중 하나라도 `visible`이 아니면 BFC 생성

**구현 내용:**
- `DropflowBlockEngine.ts` (당시 `BlockEngine.ts`): `createsBFC()`에서 개별 overflow 체크 3개를 shorthand fallback cascade로 교체
- `overflowX ?? overflow ?? 'visible'` 패턴으로 CSS cascade 재현

```typescript
// DropflowBlockEngine.ts (당시 BlockEngine.ts) - createsBFC() 수정
// overflow 기반 BFC (visible 외) - overflow-x/y가 shorthand을 올바르게 fallback
const effectiveOverflowX = overflowX ?? overflow ?? 'visible';
const effectiveOverflowY = overflowY ?? overflow ?? 'visible';
if (effectiveOverflowX !== 'visible' || effectiveOverflowY !== 'visible') return true;
```

---

#### 이슈 10: visibility 레이아웃 미적용 (구현 완료)

**CSS 명세:**
- `visibility: hidden`은 요소를 숨기지만 공간은 차지함
- `display: none`과 다름

**구현 내용:**
- `computedStyleExtractor.ts`: `COMPUTED_STYLE_WHITELIST`에 `'visibility'` 추가
- 레이아웃 계산에는 영향 없음 (공간 차지) — 렌더링 단계에서 숨김 처리 가능

```typescript
// computedStyleExtractor.ts - WHITELIST에 추가
// Visibility
'visibility',
```

---

#### 이슈 11: Grid align-self, justify-self 미지원 (구현 완료)

**CSS 명세:**
- Grid 자식은 `align-self`, `justify-self`로 셀 내 개별 정렬 가능

**구현 내용:**
- `TaffyGridEngine.ts` (당시 `GridEngine.ts`): `calculate()`에서 셀 바운드 계산 후 `alignSelf`/`justifySelf` 적용
- `parseBoxModel()`로 자식 고유 크기 계산, 셀 크기보다 작으면 정렬 위치 조정
- `start`, `center`, `end` 지원 (stretch/normal은 기존 동작 유지)

```typescript
// TaffyGridEngine.ts (당시 GridEngine.ts) - calculate() 수정
const alignSelf = childStyle?.alignSelf as string | undefined;
const justifySelf = childStyle?.justifySelf as string | undefined;

// justify-self (가로 정렬)
if (justifySelf && justifySelf !== 'stretch' && justifySelf !== 'normal') {
  const boxModel = parseBoxModel(child, cellBounds.width, cellBounds.height);
  const childWidth = boxModel.width ?? boxModel.contentWidth;
  if (childWidth < cellBounds.width) {
    finalWidth = childWidth;
    if (justifySelf === 'center') {
      finalX = cellBounds.x + (cellBounds.width - childWidth) / 2;
    } else if (justifySelf === 'end') {
      finalX = cellBounds.x + cellBounds.width - childWidth;
    }
  }
}

// align-self (세로 정렬) - 동일 패턴
```

---

#### 수정 파일 요약

| 파일 | 이슈 | 상태 |
|------|------|------|
| `DropflowBlockEngine.ts` (당시 `BlockEngine.ts`) | 6, 7, 9 | 완료 |
| `types.ts` | 7 | 완료 |
| `utils.ts` | 7, 8 | 완료 |
| `TaffyGridEngine.ts` (당시 `GridEngine.ts`) | 11 | 완료 |
| `computedStyleExtractor.ts` | 10 | 완료 |

---

#### 검증 방법

| 이슈 | 테스트 케이스 | 기대 결과 |
|------|--------------|----------|
| 6 | body(flex) + button(absolute) | button이 inline-block 유지 (blockification 안 됨) |
| 7 | 요소에 min-width: 100px, max-width: 200px 설정 | 너비가 100~200px 범위로 제한됨 |
| 8 | width: 200px, padding: 20px, box-sizing: border-box | content width가 160px (200 - 20*2)로 계산됨 |
| 9 | overflow-x: hidden, overflow-y: visible 설정 | BFC 생성됨 (둘 중 하나라도 visible 아니면) |
| 10 | visibility: hidden 설정 | 공간은 차지하지만 렌더링에서 숨겨짐 |
| 11 | Grid 자식에 align-self: center, justify-self: end 설정 | 셀 내에서 세로 중앙, 가로 끝 정렬됨 |

---

### 11.4 Phase 12: 스타일 패널 Alignment 축 매핑 수정 (2026-01-29)

#### 이슈 12: flex-direction: column일 때 Alignment 토글 활성 위치 불일치 (구현 완료)

**증상:**
- `flex-direction: row`에서는 Alignment 9-grid 토글의 활성 위치와 화면 배치가 일치
- `flex-direction: column`에서는 활성 위치와 실제 화면 배치가 불일치

**원인:**
- `flexAlignmentKeysAtom`에서 활성 버튼 키를 도출할 때, `column` 방향의 축 교환이 누락
- `handleFlexAlignment`(쓰기)에서는 `column`일 때 `justifyContent ↔ alignItems`를 올바르게 교환
- `flexAlignmentKeysAtom`(읽기)에서는 `column`에서도 `row`와 동일한 매핑 사용

**CSS 축 동작:**

| 방향 | justifyContent 제어 축 | alignItems 제어 축 |
|------|----------------------|-------------------|
| `row` | 가로 (main axis) | 세로 (cross axis) |
| `column` | 세로 (main axis) | 가로 (cross axis) |

**구현 내용:**
- `styleAtoms.ts`: `flexAlignmentKeysAtom`에서 `column` 방향일 때 매핑 교환

```typescript
// styleAtoms.ts - flexAlignmentKeysAtom
if (flexDirection === 'column') {
  // column: justifyContent = main axis (세로), alignItems = cross axis (가로)
  vertical = verticalMap[justifyContent] || '';
  horizontal = horizontalMap[alignItems] || '';
} else {
  // row: justifyContent = main axis (가로), alignItems = cross axis (세로)
  vertical = verticalMap[alignItems] || '';
  horizontal = horizontalMap[justifyContent] || '';
}
```

#### 이슈 13: flex-direction: row + nowrap에서 오버플로 시 버튼 겹침 (구현 완료)

**증상:**
- body에 `display: flex`, `flex-direction: row`, 버튼 6개 배치
- CSS 웹모드: 버튼이 가로 배치되고, body 너비를 초과하면 스크롤 발생
- WebGL 캔버스: 버튼이 body 안에서 겹쳐서 배치됨 (축소)

**원인:**
- CSS: flex 아이템의 `min-width` 기본값 = `auto` (min-content 크기 이하로 축소 안 됨)
- 당시 Yoga(@pixi/layout, 현재 제거됨): `min-width` 기본값 = `0` (아이템이 0까지 축소 가능)
- `flex-shrink: 1` (기본값) + 당시 Yoga의 `min-width: 0` → 버튼이 콘텐츠 크기 이하로 압축되어 겹침

**구현 내용 (당시 코드 — Phase 10에서 renderWithEngine 단일 경로로 통합됨):**
- `BuilderCanvas.tsx`: 모든 flex 자식에 `flexShrink: 0` 기본값 설정 (CSS `min-width: auto` 에뮬레이션)
- 3개 렌더링 경로(containerLayout, childContainerLayout, nestedContainerLayout) 모두 적용
- 사용자가 명시적으로 `flexShrink`를 설정하면 그 값이 우선
- **현재 상태:** TaffyFlexEngine이 CSS `min-width: auto`를 네이티브로 지원하므로 이 워크어라운드는 불필요해짐

---

#### 이슈 14: display: block 시 inline-block 버튼 간 가로/세로 여백 불일치 (구현 완료)

**증상:**
- body에 `display: block`, 버튼 5개 배치 → 2줄로 정상 줄바꿈
- CSS 웹모드: 버튼이 가로/세로 모두 간격 없이 밀착 렌더링
- WebGL 캔버스: 가로 ~1px 여백, 세로 큰 여백(~7px) 발생

**원인 1 - 가로 ~1px 여백:**
- `calculateTextWidth()`의 `Math.ceil(textWidth + padding)`이 항상 올림하여 각 버튼마다 ~1px 초과
- 인접 버튼 간 시각적 갭 누적

**원인 2 - 세로 큰 여백:**
- `calculateContentHeight()`가 `BUTTON_SIZE_CONFIG[size].height` 고정값 반환 (sm = 32px)
- `PixiButton`의 실제 렌더링 높이 = `max(paddingY*2 + textHeight, 24)` ≈ 25px
- LineBox 높이 32px vs 실제 버튼 25px → 행 간 ~7px 시각적 갭

**구현 내용:**
- `utils.ts`: `BUTTON_SIZE_CONFIG`에서 `height` 필드 제거, `paddingY` 추가 (ButtonSpec.paddingY와 동기화)
- `utils.ts`: `calculateTextWidth()`에서 `Math.ceil` → `Math.round` (±0.5px 오차로 축소)
- `utils.ts`: `calculateContentHeight()`에서 버튼 높이를 PixiButton과 동일 공식으로 계산
- `utils.ts`: `estimateTextHeight()` 헬퍼 추가 (`fontSize * 1.2`, CSS default line-height와 동일)

```typescript
// BUTTON_SIZE_CONFIG - height 제거, paddingY 추가, borderWidth 추가 (v1.12)
const BUTTON_SIZE_CONFIG = {
  sm: { paddingLeft: 12, paddingRight: 12, paddingY: 4, fontSize: 14, borderWidth: 1 },
  // ...
};

// calculateTextWidth - Math.ceil → Math.round
return Math.round(textWidth + padding);

// calculateContentHeight - 순수 텍스트 높이만 반환 (v1.29)
// padding/border는 BlockEngine이 parseBoxModel 결과로 합산하므로 여기서 포함하면 이중 계산
function estimateTextHeight(fontSize: number, lineHeight?: number): number {
  return lineHeight ?? Math.round(fontSize * 1.2);
}

// MIN_BUTTON_HEIGHT는 border-box 기준 → content-box 최소값으로 변환
// minContentHeight = max(0, MIN_BUTTON_HEIGHT - paddingY*2 - borderWidth*2)
// 최종: max(textHeight, minContentHeight)
// sm: minContentHeight = max(0, 24 - 4*2 - 1*2) = 14, textHeight = 17 → max(17, 14) = 17px
```

---

## 12. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-28 | 1.0 | 초기 문서 작성 |
| 2026-01-28 | 1.1 | Chrome CSS 동작 검토 후 보완: BFC 생성 조건, 빈 블록 margin collapse, vertical-align/baseline 규칙, 수평 마진 collapse 방지 명시 |
| 2026-01-28 | 1.2 | 코드 리뷰 반영: 공통 타입 정의(Margin, BoxModel), 유틸리티 함수 명세, BlockEngine 빈 블록 처리 통합, FlexEngine 위임 방식 명확화, BuilderCanvas 통합 코드 수정 |
| 2026-01-28 | 1.3 | 추가 리뷰 반영: 범위/Non-goals 섹션 추가, BFC/물리적 분리 용어 정리, Grid 지원 범위 체크리스트, utils.ts 누락 함수 추가(parsePadding, parseBorder, calculateContentWidth/Height), 입력 규약(px/number만) 명시, inline padding 표현 완화, console.warn dev-only 처리 |
| 2026-01-28 | 1.4 | 최종 리뷰 반영: 스코프 P0/P1 구분 명확화(inline-block/grid → P1), 입력 규약 세분화(margin/padding/border는 %미지원), inline-block 줄바꿈 조건에 마진 포함, parseBorder CSS shorthand 미지원 명시, 스타일 입력 전제 추가 |
| 2026-01-28 | 1.5 | 경미 리뷰 반영: Non-goals % 지원 범위 명확화(width/height만), 미지원 값 처리 정책 추가(undefined 반환, parseFloat 함정 경고) |
| 2026-01-28 | 1.6 | 정책-코드 일치: parseNumericValue/parseSize/parseShorthand에 정규식 기반 단위 검증 추가, 미지원 단위는 undefined 반환 |
| 2026-01-28 | 1.7 | 정책 정합성: shorthand 내부 토큰 0 폴백 정책 명시 |
| 2026-01-28 | 1.8 | 운영 가이드: shorthand 0 폴백 시 dev 모드 경고 로그 권장, parseShorthand 예시에 경고 추가 |
| 2026-01-28 | 1.9 | 정책에 % 패턴 추가, warnOnce 헬퍼로 중복 경고 방지 |
| 2026-01-28 | 1.10 | warnedTokens 크기 제한(100개) 및 테스트용 초기화 함수 추가 |
| 2026-01-28 | 1.11 | warnOnce 트레이드오프 명시 (주기적 재출력 가능성) |
| 2026-01-28 | 1.12 | P2 제목 수정: "완전한 CSS 호환" → "고급 레이아웃" (Non-goals 존재로 100% 호환 아님) |
| 2026-01-28 | 1.13 | 마이그레이션 전략에 Phase 6(P2) 추가, Phase와 P0/P1/P2 매핑 명시 |
| 2026-01-28 | 1.14 | vh/vw 단위 지원 추가, rem/em은 차후 지원으로 Non-goals 이동 |
| 2026-01-28 | 1.15 | Phase 6 구현 완료: vertical-align (baseline/top/bottom/middle), LineBox 기반 inline-block 배치 |
| 2026-01-28 | 1.16 | Phase 9 CSS/WebGL 정합성 개선: BUTTON_SIZE_CONFIG를 ButtonSpec과 동기화, PropertyUnitInput에 fit-content/min-content/max-content 키워드 추가, renderWithCustomEngine에 부모 padding 처리 추가, rootLayout에 display: 'flex' 기본값 명시 |
| 2026-01-28 | 1.17 | Phase 10 CSS Blockification 지원: flex/grid 컨테이너 자식의 inline-block → block 변환 구현, LayoutContext.parentDisplay 필드 추가, BlockEngine.computeEffectiveDisplay() 메서드 추가 |
| 2026-01-28 | 1.18 | Phase 11 CSS 명세 누락 케이스 계획 추가: position absolute/fixed blockification 제외, min/max width/height, box-sizing border-box, overflow-x/y 혼합, visibility, Grid align-self/justify-self. Non-goals에 z-index, sticky, white-space, inherit/initial/unset 추가. 검증 방법 테이블 추가 |
| 2026-01-29 | 1.19 | Phase 11 이슈 7+8 구현 완료: BoxModel에 min/max 필드 추가, parseBoxModel에서 min/max 파싱 및 box-sizing: border-box 처리, BlockEngine에 clampSize 적용 (block/inline-block 양쪽) |
| 2026-01-29 | 1.20 | Phase 12 이슈 12 구현 완료: flex-direction: column일 때 flexAlignmentKeysAtom의 축 매핑 교환 (justifyContent↔alignItems), 스타일 패널 Alignment 토글 활성 위치가 화면 배치와 일치하도록 수정 |
| 2026-01-29 | 1.21 | Phase 12 이슈 13 구현 완료: flex nowrap 오버플로 시 Yoga 축소로 인한 버튼 겹침 수정. @pixi/layout 경로의 flex 자식에 flexShrink: 0 기본값 설정 (CSS min-width: auto 에뮬레이션), 3개 렌더링 경로 모두 적용 |
| 2026-01-29 | 1.22 | Phase 12 이슈 14 구현 완료: inline-block 버튼 가로/세로 여백 불일치 수정. BUTTON_SIZE_CONFIG에서 height→paddingY 변경, calculateTextWidth Math.ceil→Math.round, calculateContentHeight를 PixiButton과 동일 공식(max(paddingY*2+textHeight, 24))으로 변경 |
| 2026-01-29 | 1.23 | Phase 11 이슈 6+9 구현 완료: computeEffectiveDisplay()에 childPosition 매개변수 추가하여 absolute/fixed 요소의 blockification 제외, createsBFC()의 overflow-x/y 처리를 shorthand fallback cascade 방식으로 개선 |
| 2026-01-29 | 1.24 | Phase 11 이슈 10+11 구현 완료: COMPUTED_STYLE_WHITELIST에 visibility 추가, GridEngine에 align-self/justify-self 셀 내 정렬 지원 (start/center/end, parseBoxModel 기반 자식 크기 계산) |
| 2026-01-29 | 1.25 | P2 line-height 레이아웃 반영: estimateTextHeight에 lineHeight 매개변수 추가, calculateContentHeight에서 parseLineHeight 결과 우선 반영, LineBoxItem에 lineHeight 필드 추가, calculateLineBox에서 lineHeight 기반 line box 최소 높이 계산 |
| 2026-01-29 | 1.26 | SelectionLayer bounds 갱신 버그 수정: 스타일/display 변경 시 selectionLayer가 0,0에 고정되는 문제 해결. elementRegistry에 layoutBoundsRegistry 추가하여 layout bounds 직접 저장, LayoutContainer에서 layout prop 변경 시 RAF로 bounds 캐싱, SelectionLayer에 selectedStyleSignature 구독 추가로 스타일 변경 감지 |
| 2026-01-29 | 1.27 | Pixi UI 컴포넌트 CSS 단위 해석 규칙 추가: (1) vh/vw → % 변환 정책 (styleToLayout.ts parseCSSValue에서 Yoga가 부모 기준으로 처리), (2) Pixi 컴포넌트 getButtonLayout 패턴 (parseCSSSize + parentContentArea 기준 해석, typeof === 'number' 사용 금지), (3) 부모 content area 계산 필수 (useStore → parsePadding + parseBorderWidth 차감), (4) padding shorthand + border width 4방향 계산 포함 |
| 2026-01-30 | 1.28 | Button borderWidth/레이아웃 이중 계산 수정: (1) BUTTON_SIZE_CONFIG에 borderWidth:1 필드 추가, (2) Phase 9 BUTTON_SIZE_CONFIG 코드 최신화 (paddingY + borderWidth + CSS paddingX 동기화), (3) parseBoxModel에 폼 요소 BUTTON_SIZE_CONFIG 기본값 적용 (inline style 미지정 시), (4) calculateContentWidth가 폼 요소에서 순수 텍스트 너비만 반환 (padding/border를 parseBoxModel으로 분리하여 이중 계산 제거), (5) 상세: docs/COMPONENT_SPEC_ARCHITECTURE.md §4.7.4.4~4.7.4.8 |
| 2026-01-31 | 1.29 | 버튼/Body 레이아웃 버그 수정 3건: (1) calculateContentHeight padding 이중 계산 제거 — content-box 기준 textHeight만 반환, MIN_BUTTON_HEIGHT도 content-box로 변환 후 비교, (2) renderWithCustomEngine availableWidth에 border 차감 추가 — parseBorder()로 부모 border를 padding과 함께 차감 (자식 offset은 padding만 — Yoga가 border offset 자동 처리), (3) parseBoxModel에 treatAsBorderBox 로직 추가 — box-sizing: border-box 또는 폼 요소 명시적 width/height 시 padding+border 차감으로 content-box 변환 |
| 2026-02-01 | 1.30 | Phase 5 CanvasKit/Skia 통합 문서 추가: (1) §3.5 엔진 디스패처에 Phase 5+ 렌더링 전환 주석 (레이아웃 계산 불변, 렌더링만 CanvasKit), (2) §4.4 CanvasKit 렌더 파이프라인 추가 (Store → ElementSprite → useSkiaNode → SkiaOverlay → nodeRenderers → CanvasKit Surface), (3) §5.4 CanvasKit 렌더링 정확성 검증 방법 추가 (border-radius, 텍스트, 그래디언트, 그림자, 픽셀 비교), (4) §7 CanvasKit/Skia 외부 참조 문서 추가, (5) 상세: docs/WASM.md Phase 5, docs/WASM_DOC_IMPACT_ANALYSIS.md §A |
| 2026-02-01 | 1.31 | §5.4 코드 검증 반영: (1) §5.4.1 Radial gradient API명 수정 (MakeRadialGradient → MakeTwoPointConicalGradient, fills.ts:51-61 실제 구현과 일치), (2) §5.4.2 픽셀 비교 테스트 인프라 미구현 상태 명시 (Playwright 구현 예정), (3) §5.4.3 텍스트 측정 인프라(textMeasure.ts) 존재 / 비교 테스트 미구현 상태 명시 |
| 2026-02-02 | 1.32 | Phase 6 Skia 렌더링 완성 반영: (1) §4.4.1 렌더 파이프라인에 Phase 6 이중 Surface 경로 추가 (classifyFrame → idle/camera-only/content/full 분류), (2) §4.4.2 구조 다이어그램 전면 재작성 (이중 Surface, AABB 컬링, Selection/AI 오버레이, eventBridge, overlayVersion), (3) §4.4.3 테이블에 Selection/AI/AABB 컬링 행 추가, (4) §4.4.5 Phase 6 이중 Surface 캐싱 아키텍처 신규 (effectiveVersion 계산, overlayVersionRef 설계 의도), (5) §4.4.6 Selection/AI 오버레이 렌더링 신규, (6) §4.4.7 AABB 뷰포트 컬링 신규, (7) §4.4.8 변수 Resolve 렌더링 경로 신규, (8) §5.4.1에 메시 그래디언트·레이어 블러·Selection 오버레이 검증 행 추가, (9) §5.4 P2 테스트에 mesh gradient·layer-blur·AI 피드백 추가 |
| 2026-02-05 | 1.33 | Phase 6 렌더 파이프라인 정정: (1) Dirty Rect 경로 제거(보류) 및 2-pass(content cache + present blit + overlay 분리)로 대체, (2) classifyFrame을 registryVersion/overlayVersion 분리 입력으로 갱신(idle/present/camera-only/content/full), (3) eventBridge 삭제 및 PixiJS 캔버스 DOM 이벤트 직접 수신 모델로 정리, (4) CanvasKit 캔버스 pointer-events: none으로 명확화 |
| 2026-02-06 | 1.34 | renderWithCustomEngine CONTAINER_TAGS 지원: (1) `display: 'block'` CONTAINER_TAGS 지원 — childElements/renderChildElement props 전달로 children 내부 렌더링, (2) padding 이중 적용 수정 — calculateContentHeight를 content-only로 변경 (Yoga/BlockEngine이 별도 padding 추가), (3) flex column 래퍼 — absolute→relative 변환으로 CONTAINER_TAGS height 변경 시 siblings 자동 재배치, (4) 상세: CHANGELOG.md "Card display: block 완전 지원" |
| 2026-02-06 | 1.35 | Block 레이아웃 라인 기반 렌더링 + 사이즈 통일: (1) inline 요소 가로 배치 — 같은 y 값을 가진 요소들을 라인(flex row)으로 그룹화하여 계단식 배치 수정, (2) ToggleButton/ToggleButtonGroup borderRadius 통일 — Button과 동일하게 sm:4/md:6/lg:8로 변경, (3) 상세: `.claude/plans/giggly-wibbling-mango.md` Phase 5-6 |
| 2026-02-13 | 1.36 | width: fit-content 네이티브 구현: (1) FIT_CONTENT=-2 sentinel 도입 (AUTO=-1 패턴 확장), (2) parseSize()에서 'fit-content' 감지→FIT_CONTENT 반환, parseBoxModel()에서 border-box 변환 건너뜀, (3) BlockEngine JS/WASM 경로에서 FIT_CONTENT일 때 contentWidth 사용, (4) block_layout.rs에 FIT_CONTENT 상수+로직+6개 테스트 추가, (5) styleToLayout.ts에서 모든 요소 대상 Yoga fit-content 워크어라운드 일반화 (flexGrow:0, flexShrink:0), (6) TransformSection.tsx Width/Height units에 'fit-content' 옵션 추가 |
| 2026-02-13 | 1.37 | ToggleButtonGroup 스타일 패널 + Selection 수정: (1) styleAtoms.ts에 `getLayoutDefault()` 4단계 우선순위 헬퍼 도입 (inline→computed→tag default→global), DEFAULT_CSS_VALUES에 display/flexDirection/alignItems 확장, displayAtom 외 4개 atom 수정, (2) calculateContentWidth()에 ToggleButtonGroup 전용 분기 추가 — props.items에서 자식 버튼 텍스트 폭 합산, (3) BuilderCanvas.tsx containerLayout에 ToggleButtonGroup width 'auto' 오버라이드 — Yoga가 자식 크기 기반 자동 계산하여 selection bounds 정확도 보장, (4) 동일 패턴 분석: CONTAINER_TAGS∩DEFAULT_INLINE_BLOCK_TAGS = ToggleButtonGroup만 해당, 다른 CONTAINER_TAGS는 block→영향 없음 |
| 2026-02-13 | 1.38 | Factory 정의 style 기본값 동기화: (1) GroupComponents.ts — ToggleButtonGroup/Checkbox/Radio factory 정의에 CSS 기본 style 추가 (display:flex, flexDirection:row, alignItems:center 등), (2) unified.types.ts — createDefaultToggleButtonGroupProps에 alignItems/width:fit-content 추가, (3) BuilderCanvas.tsx — ToggleButtonGroup containerLayout width를 명시적 width 설정 시 layout.width 사용, 기본값 시 auto 유지 (width:100% 지원), (4) 전수 조사: factory 사용 복합 컴포넌트 중 style 누락은 ToggleButtonGroup+Checkbox+Radio만 해당 |
| 2026-02-13 | 1.39 | ToggleButton spec border-radius 그룹 위치 처리: (1) ToggleButton.spec.ts에 `_groupPosition` props 추가 (orientation, isFirst, isLast, isOnly), shapes()에서 그룹 위치별 per-corner border-radius 계산 — horizontal: first→[r,0,0,r]/last→[0,r,r,0]/middle→[0,0,0,0], vertical: first→[r,r,0,0]/last→[0,0,r,r]/middle→[0,0,0,0], (2) ElementSprite.tsx에서 toggleGroupPosition 객체를 _groupPosition key로 spec shapes props에 주입, (3) specShapeConverter.ts resolveRadius()는 이미 [tl,tr,br,bl] 4-tuple 지원 확인 |
| 2026-02-13 | 1.40 | ToggleButtonGroup alignSelf 강제 설정 제거: styleToLayout.ts에서 ToggleButtonGroup fit-content 워크어라운드의 `alignSelf: 'flex-start'` 2줄 제거 — CSS에서 width: fit-content와 align-self는 독립적 속성이므로, 부모의 align-items (center, flex-end 등)가 정상 적용되도록 수정. flexGrow:0 + flexShrink:0만으로 주축 방향 너비 확장 방지 충분. 동일 패턴 조사: Pixi*.tsx 10개 파일은 내부 렌더링 컴포넌트 자체 레이아웃용으로 수정 불필요, Checkbox/Radio/Switch/Badge/Tag/Chip은 alignSelf 미사용 |
| 2026-02-17 | 1.41 | Phase 9-10 엔진 교체: @pixi/layout, yoga-layout, @pixi/ui 완전 제거. LayoutContainer → DirectContainer 교체. shouldDelegateToPixiLayout() 삭제, renderWithPixiLayout()/renderWithCustomEngine() → renderWithEngine() 단일 경로 통합 |
| 2026-02-18 | 1.42 | Phase 11 엔진 전환 완료 및 문서 현행화: (1) 레거시 엔진 삭제 (BlockEngine.ts, FlexEngine.ts, GridEngine.ts), (2) Taffy WASM 기반 TaffyFlexEngine(flex/inline-flex) + TaffyGridEngine(grid/inline-grid) 도입, (3) Dropflow Fork JS 기반 DropflowBlockEngine(block/inline-block/inline/flow-root) 도입, (4) enrichWithIntrinsicSize()로 Yoga measureFunc 대체, (5) cssValueParser.ts의 resolveCSSSizeValue() 통합 CSS 값 파서 도입, (6) cssResolver.ts CSS 캐스케이드 + 상속 도입, (7) 문서 §4-§9 전면 현행화: LayoutContainer→DirectContainer, Yoga→Taffy/Dropflow, @pixi/layout 참조 제거/레거시 표시, §6 파일 구조 갱신, §7 참조 문서에 Taffy/Dropflow 추가 |

---

## 참조

### 내부 참조
- [PIXI_LAYOUT.md](./PIXI_LAYOUT.md) - @pixi/layout 마이그레이션 기록 (역사적 참조, Phase 9-10에서 제거됨)
- [PIXI_WEBGL.md](./reference/components/PIXI_WEBGL.md) - WebGL 캔버스 아키텍처
- [GridLayout.utils.ts](../apps/builder/src/builder/workspace/canvas/layout/GridLayout.utils.ts) - Grid 계산 로직
- [ADR-003: Canvas Rendering](./adr/003-canvas-rendering.md) — PixiJS + Skia 이중 렌더러
- [WASM.md](./WASM.md) - XStudio WASM 렌더링 아키텍처 전환 계획 (Phase 5-6)
- [PENCIL_APP_ANALYSIS.md](./PENCIL_APP_ANALYSIS.md) - Pencil Desktop 아키텍처 분석 (renderSkia() 패턴 원본, §11)
- [PENCIL_VS_XSTUDIO_RENDERING.md](./PENCIL_VS_XSTUDIO_RENDERING.md) - Pencil vs XStudio 렌더링 아키텍처 비교

### 외부 참조 (레이아웃 엔진)
- [Taffy Layout](https://github.com/DioxusLabs/taffy) - Taffy WASM Flexbox/Grid 레이아웃 엔진 (현재 flex/grid 담당)
- Dropflow Fork (`packages/layout-flow`) - Block/Inline-Block/Inline/Flow-Root 레이아웃 엔진 (현재 block 계열 담당)
- ~~[Yoga Layout](https://yogalayout.dev/)~~ — 제거됨 (Phase 9-10)
- ~~[@pixi/layout](https://layout.pixijs.io/)~~ — 제거됨 (Phase 9-10)

### 외부 참조 (CSS 명세)
- [CSS Display Level 3](https://www.w3.org/TR/css-display-3/) — display, blockification
- [CSS Box Sizing Level 3](https://www.w3.org/TR/css-sizing-3/) — fit-content, min-content, max-content
- [CSS Grid Layout Level 1](https://www.w3.org/TR/css-grid-1/) — Grid 명세
- [CSS Values and Units Level 4](https://www.w3.org/TR/css-values-4/) — calc(), min(), max(), clamp()
- [CSS Visual Formatting Model](https://www.w3.org/TR/CSS2/visuren.html) - CSS 명세
- [CSS Box Model](https://www.w3.org/TR/CSS2/box.html) - 박스 모델 명세
- [Block Formatting Context - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Display/Block_formatting_context) - BFC 상세
- [Mastering Margin Collapsing - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Box_model/Margin_collapsing) - Margin Collapse
- [The Rules of Margin Collapse - Josh Comeau](https://www.joshwcomeau.com/css/rules-of-margin-collapse/) - 실용적 가이드
- [vertical-align - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/vertical-align) - vertical-align 상세
- [Vertical-Align: All You Need To Know](https://christopheraue.net/design/vertical-align) - baseline 상세

### 외부 참조 (CanvasKit/Skia)
- [canvaskit-wasm (npm)](https://www.npmjs.com/package/canvaskit-wasm) - Google 공식 CanvasKit WASM 패키지
- [CanvasKit API Reference](https://skia.org/docs/user/modules/canvaskit/) - CanvasKit 공식 API 문서
- [Skia Official Docs](https://skia.org/) - Skia 그래픽 엔진 공식 문서
