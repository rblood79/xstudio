# @pixi/layout 하이브리드 포크: CSS 호환 레이아웃 구현

> XStudio WebGL 캔버스에서 브라우저 CSS와 유사한 레이아웃 구현

## 목표

**WYSIWYG 보장**: 캔버스에서 보이는 것 ≈ 브라우저에서 보이는 것 (지원 범위 내)

현재 @pixi/layout(Yoga 기반)은 CSS의 일부만 지원합니다. 이 문서는 주요 CSS 레이아웃 기능을 지원하기 위한 하이브리드 엔진 아키텍처를 정의합니다.

### 범위 (Scope)

**P0 지원 대상 (신규 구현):**
- `display: block` - 수직 쌓임, width 100% 기본값
- Margin collapse - 인접 형제 블록 간 (양수/음수/혼합)

**P0 유지 (기존 동작):**
- `display: flex` - Yoga 엔진 위임 (현재 동작 유지)

**P1 지원 대상:**
- `display: inline-block` - 가로 배치, 줄바꿈 (BlockEngine 확장)
- `display: grid` - 기존 GridEngine을 LayoutEngine 인터페이스로 통합
- Margin collapse - 부모-자식, 빈 블록
- BFC 생성 조건 (overflow, flow-root 등)

### Non-goals (지원하지 않음)

다음 기능은 이 문서의 범위에 포함되지 않습니다:

| 기능 | 사유 |
|------|------|
| `display: inline` | 텍스트 흐름 엔진 필요, 복잡도 높음 |
| `float` | 레거시 레이아웃, Flex/Grid로 대체 — 지원하지 않음 |
| `vertical-align` (baseline 정렬) | 폰트 메트릭 계산 필요, P2 이후 검토 |
| `writing-mode` (세로 쓰기) | RTL/세로 쓰기, 노코드 빌더 범위 외 — 지원하지 않음 |
| CSS 단위 `rem`, `em`, `calc()` | 차후 지원 예정 |
| Grid `repeat()`, `minmax()`, auto-placement | 기본 Grid만 지원, 고급 기능은 P2 |
| `z-index` / stacking context | 렌더링 순서만 영향, PixiJS zIndex로 대체 가능 |
| `position: sticky` | 스크롤 컨텍스트 필요, 복잡도 높음 |
| `white-space` 상호작용 | 텍스트 레이아웃 엔진 필요 |
| `inherit`, `initial`, `unset` 키워드 | CSS 캐스케이드 엔진 필요 |
| 폰트 메트릭 기반 baseline 계산 | 텍스트 측정 엔진 필요, P2+ |

---

## 1. CSS vs Yoga 동작 차이 분석

### 1.1 Display 모델 비교

| CSS display | 브라우저 동작 | Yoga 동작 | 지원 상태 |
|-------------|--------------|-----------|----------|
| `block` | 전체 너비, 수직 쌓임, margin collapse | 미지원 | ❌ 신규 구현 필요 |
| `inline-block` | inline + block 혼합, 가로 배치 | 미지원 | ❌ 신규 구현 필요 |
| `inline` | 텍스트처럼 흐름 | 미지원 | ❌ P2 |
| `flex` | Flexbox 레이아웃 | **지원** | ✅ 현재 사용 중 |
| `grid` | 2D 그리드 레이아웃 | 미지원 | ⚠️ 커스텀 구현됨 |
| `none` | 렌더링 안함 | 지원 | ✅ |

### 1.2 Block Formatting Context (BFC)

BFC는 CSS 레이아웃의 핵심 개념. 내부 레이아웃이 외부에 영향을 주지 않는 독립 영역.

#### 1.2.0 BFC 생성 조건 (Chrome 기준)

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

#### 1.2.1 Width 기본값

| 상황 | CSS block | Yoga |
|------|-----------|------|
| width 미지정 | 부모 100% | 콘텐츠 크기 |
| 부모 padding 있음 | 부모 content-box 100% | 콘텐츠 크기 |

```css
/* CSS 예시 */
.parent { width: 400px; padding: 20px; }
.child { /* width 미지정 */ }
/* 결과: child width = 360px (400 - 20 - 20) */
```

```
Yoga 결과: child width = 콘텐츠 너비 (예: 100px)
```

**구현 필요**: BlockEngine에서 width 미지정 시 `100%` 기본값 적용

#### 1.2.2 수직 쌓임 (Vertical Stacking)

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

Yoga는 flexDirection 없이는 모든 요소가 0,0에 쌓임.

**현재 워크어라운드**: BuilderCanvas에서 `flexDirection: 'column'` 자동 적용

```typescript
// BuilderCanvas.tsx
const hasChildren = (pageChildrenMap.get(child.id)?.length ?? 0) > 0;
const containerLayout = hasChildren && !baseLayout.flexDirection
  ? { display: 'flex' as const, flexDirection: 'column' as const, ...baseLayout }
  : baseLayout;
```

**문제점**: Flexbox 시맨틱이 아닌 Block 시맨틱을 원하는 경우 차이 발생

### 1.3 Margin Collapse (마진 병합)

CSS의 가장 복잡한 기능 중 하나. Yoga는 **지원하지 않음**.

> **중요**: 수평(left/right) 마진은 **절대 collapse 안함**. 오직 **수직(top/bottom) 마진만** collapse.

#### 1.3.1 인접 형제 마진 병합

```css
.block1 { margin-bottom: 20px; }
.block2 { margin-top: 30px; }
/* CSS 결과: 간격 = 30px (큰 값) */
/* Yoga 결과: 간격 = 50px (합산) */
```

#### 1.3.2 부모-자식 마진 병합

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
/* Yoga 결과: parent 내부에 20px 마진 */
```

#### 1.3.3 빈 블록의 자기 자신 마진 병합 ⚠️

**문서에서 자주 누락되는 케이스**: 빈 블록 요소는 자신의 top/bottom 마진이 collapse됨.

```css
.empty { margin-top: 20px; margin-bottom: 30px; height: 0; }
/* CSS 결과: 총 30px 공간만 차지 (collapse됨) */
/* Yoga 결과: 50px 공간 차지 (합산) */
```

**빈 블록 collapse 차단 조건**:
- `height` 또는 `min-height` 지정
- `border` 지정
- `padding` 지정
- inline 콘텐츠 있음 (텍스트, 이미지 등)

#### 1.3.4 마진 값 계산 규칙 (Chrome 명세)

| 상황 | 결과 |
|------|------|
| 둘 다 양수 (+20, +30) | 큰 값 = 30 |
| 둘 다 음수 (-20, -10) | 절대값이 큰 값 = -20 |
| 양수/음수 혼합 (+50, -20) | 합산 = 30 |

#### 1.3.5 마진 병합 조건 (CSS 명세)

다음 조건을 **모두** 만족해야 병합:
1. 두 마진 모두 **block-level** 요소 (inline, inline-block 제외)
2. 같은 **BFC(Block Formatting Context)** 내
3. 사이에 line box, clearance, padding, border **없음**
4. float나 absolute positioned **아님**
5. **수직 마진만** (수평 마진은 절대 collapse 안함)

#### 1.3.6 마진 병합 차단 조건

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

### 1.4 Inline-Block 동작

| 특성 | block | inline-block | inline |
|------|-------|--------------|--------|
| 너비 | 부모 100% | 콘텐츠 | 콘텐츠 |
| 높이 | 콘텐츠 | 콘텐츠 | line-height |
| 수직 정렬 | margin/padding | vertical-align | baseline |
| 줄바꿈 | 강제 | 자연 | 자연 |
| margin/padding | 상하좌우 | 상하좌우 | 좌우만 |
| 새 줄 시작 | 항상 | X | X |
| width/height 설정 | O | O | **X** |

#### 1.4.0 CSS Blockification (Flex/Grid 자식 요소) ⚠️

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
- `BlockEngine.computeEffectiveDisplay()` 메서드에서 부모 display에 따라 자식 display 변환
- `LayoutContext.parentDisplay` 필드로 부모 display 전달
- flex, inline-flex, grid, inline-grid 컨테이너에서 blockification 적용

#### 1.4.1 vertical-align 속성 (P2)

`inline-block` 요소의 수직 정렬은 `vertical-align` 속성으로 제어:

| 값 | 동작 |
|----|------|
| `baseline` (기본) | 요소의 baseline을 부모의 baseline에 정렬 |
| `top` | 요소 상단을 line box 상단에 정렬 |
| `bottom` | 요소 하단을 line box 하단에 정렬 |
| `middle` | 요소 중앙을 부모 baseline + x-height/2에 정렬 |
| `text-top` | 요소 상단을 부모 폰트 상단에 정렬 |
| `text-bottom` | 요소 하단을 부모 폰트 하단에 정렬 |

#### 1.4.2 Inline-Block의 Baseline 결정 규칙 ⚠️

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

#### 1.4.3 현재 워크어라운드

BuilderCanvas에서 `flexDirection: 'row'` + `flexWrap: 'wrap'`:

```typescript
// BuilderCanvas.tsx - rootLayout
const rootLayout = useMemo(() => ({
  flexDirection: 'row' as const,      // inline-block 가로 배치
  flexWrap: 'wrap' as const,          // 줄바꿈
  alignItems: 'flex-start' as const,  // 상단 정렬 (baseline 대신)
  // ...
}), []);
```

**문제점**:
- `vertical-align` 지원 안됨 (Flexbox는 `alignItems` 사용)
- baseline 정렬 불가 (Flexbox는 다른 baseline 로직)
- inline 요소와 혼합 시 동작 차이

#### 1.4.4 Inline vs Inline-Block 차이점 (참고)

| 특성 | inline | inline-block |
|------|--------|--------------|
| width/height | **무시됨** | 적용됨 |
| margin-top/bottom | **무시됨** | 적용됨 |
| padding-top/bottom | 시각적 영역만 확장 (line box 높이에 영향 가능) | 레이아웃에 영향 |
| line-height 영향 | 받음 | 자체 height 사용 |

> **참고**: inline 요소의 padding-top/bottom은 배경/테두리 영역만 확장하고 일반적으로 line box 높이에 영향을 주지 않지만, 일부 케이스(replaced elements, 특정 브라우저)에서 line box에 영향을 줄 수 있습니다.

### 1.5 현재 Grid 구현 상태

`GridLayout.utils.ts`에 CSS Grid 파싱 및 계산 로직 구현됨:

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
| `repeat()` | ❌ | 수동 전개 필요 |
| `minmax()` | ❌ | |
| `auto-fit`, `auto-fill` | ❌ | |
| auto-placement (암시적 그리드) | ❌ | 명시적 배치만 |
| subgrid | ❌ | |

**제한**: @pixi/layout과 통합 안됨 (별도 계산)

---

## 2. 포크 수정 필요 항목 (우선순위별)

### P0 (필수 - WYSIWYG 핵심)

| 항목 | 현재 상태 | 목표 | 구현 복잡도 |
|------|----------|------|------------|
| `display: block` 기본 동작 | Flexbox로 에뮬레이션 | 네이티브 Block 엔진 | 중간 |
| Block width 100% 기본값 | 콘텐츠 크기 | 부모 content-box 100% | 낮음 |
| 수직 쌓임 | flexDirection 필요 | 자동 | 낮음 |
| Margin collapse (형제) | 미지원 | 지원 (양수/음수/혼합) | 중간 |
| 수평 마진 collapse 방지 | N/A | 수직만 collapse | 낮음 |

### P1 (중요 - 정확한 레이아웃)

| 항목 | 현재 상태 | 목표 | 구현 복잡도 |
|------|----------|------|------------|
| `display: inline-block` | Flexbox로 에뮬레이션 | 네이티브 지원 | 중간 |
| Margin collapse (부모-자식) | 미지원 | border/padding 차단 조건 포함 | 높음 |
| Margin collapse (빈 블록) | 미지원 | 자기 top/bottom collapse | 중간 |
| BFC 생성 조건 | 미지원 | flow-root, overflow 등 | 높음 |
| Grid 엔진 통합 | 별도 계산 | 엔진 인터페이스 | 낮음 |

### P2 (향후 - 고급 레이아웃)

| 항목 | 현재 상태 | 목표 | 구현 복잡도 |
|------|----------|------|------------|
| `display: inline` | 미지원 | 지원 | 높음 |
| vertical-align (baseline) | ✅ 지원 (Phase 6) | baseline, top, middle 등 | 높음 |
| inline-block baseline 계산 | ✅ 지원 (Phase 6) | overflow에 따른 baseline 변경 | 높음 |
| line-height 영향 | ✅ 지원 | inline 요소 높이 계산 | 중간 |

---

## 3. 하이브리드 엔진 아키텍처

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
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ BlockEngine │  │ FlexEngine  │  │ GridEngine  │
│   (신규)    │  │ (Yoga 래핑) │  │ (기존 확장) │
└─────────────┘  └─────────────┘  └─────────────┘
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

> **입력 규약 (P0)**:
> - `width`, `height`: `px`, `%`, `vh`, `vw`, `number`, `auto` 지원 (`%`는 부모 content-box 기준)
> - `margin`, `padding`, `border-width`: `px`, `number`만 지원 (`%` 미지원)
> - `rem`, `em`, `calc()` 등은 지원하지 않음
>
> **🚀 vh/vw → % 변환 정책 (Yoga/@pixi/layout)**:
> - `styleToLayout.ts`의 `parseCSSValue()`에서 `vh`/`vw`를 `%` 문자열로 변환
> - 예: `100vw` → `"100%"`, `50vh` → `"50%"`
> - **이유**: Yoga는 vh/vw 미지원. 빌더에서 viewport = 페이지 = body이므로 부모 기준 %로 변환하면
>   Yoga가 부모의 padding/border를 자동 차감하여 content area 내에 수용
> - **한계**: 교차 차원(width에 vh, height에 vw)은 부모의 해당 축 기준으로 해석됨 (빌더 한정 trade-off)
>
> **🚀 Pixi 컴포넌트 CSS 단위 해석 규칙 (getButtonLayout 패턴)**:
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
> - 예시 코드는 정규식으로 단위 검증 후 파싱:
>   - px/number: `/^-?\d+(\.\d+)?(px)?$/`
>   - % (width/height만): `/^-?\d+(\.\d+)?%$/`
>   - vh/vw (width/height만): `/^-?\d+(\.\d+)?(vh|vw)$/`
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
 * 요소의 콘텐츠 너비 계산
 *
 * 실제 구현에서는 자식 요소들의 레이아웃을 재귀적으로 계산해야 합니다.
 * 텍스트 요소의 경우 폰트 메트릭 기반 측정이 필요합니다.
 *
 * @returns 콘텐츠 기반 너비 (자식이 없으면 0)
 */
export function calculateContentWidth(element: Element): number {
  // TODO: 실제 구현 시 다음을 고려:
  // 1. 자식 요소들의 너비 합계 (inline-block) 또는 최대값 (block)
  // 2. 텍스트 콘텐츠의 경우 Canvas.measureText() 사용
  // 3. 이미지의 경우 naturalWidth 사용

  // 임시: props에 명시된 width가 있으면 사용
  const style = element.props?.style as Record<string, unknown> | undefined;
  const explicitWidth = parseNumericValue(style?.width);
  if (explicitWidth !== undefined) return explicitWidth;

  // 기본값: 0 (콘텐츠 없음으로 간주)
  return 0;
}

/**
 * 요소의 콘텐츠 높이 계산
 *
 * @returns 콘텐츠 기반 높이 (자식이 없으면 0)
 */
export function calculateContentHeight(element: Element): number {
  // TODO: 실제 구현 시 다음을 고려:
  // 1. 자식 요소들의 높이 합계 (block) 또는 최대값 (inline-block 한 줄)
  // 2. 텍스트 콘텐츠의 경우 lineHeight * 줄 수
  // 3. 이미지의 경우 naturalHeight 사용

  const style = element.props?.style as Record<string, unknown> | undefined;
  const explicitHeight = parseNumericValue(style?.height);
  if (explicitHeight !== undefined) return explicitHeight;

  return 0;
}

/**
 * 요소의 박스 모델 계산
 *
 * @param element - 대상 요소
 * @param availableWidth - 사용 가능한 너비 (% 계산용)
 * @param availableHeight - 사용 가능한 높이 (% 계산용)
 */
export function parseBoxModel(
  element: Element,
  availableWidth: number,
  availableHeight: number
): BoxModel {
  const style = element.props?.style as Record<string, unknown> | undefined;

  // width/height 파싱 (%, px, auto 지원)
  const width = parseSize(style?.width, availableWidth);
  const height = parseSize(style?.height, availableHeight);

  // padding 파싱
  const padding = parsePadding(style);

  // border 파싱
  const border = parseBorder(style);

  // 콘텐츠 크기 계산
  const contentWidth = calculateContentWidth(element);
  const contentHeight = calculateContentHeight(element);

  return {
    width,
    height,
    contentWidth,
    contentHeight,
    padding,
    border,
  };
}

/**
 * 중복 경고 방지용 Set
 *
 * 주의: 모듈 전역이므로 장시간 세션에서 메모리 누적 가능.
 * 필요 시 크기 제한(예: 100개 초과 시 clear) 또는 테스트 시 초기화 권장.
 */
const warnedTokens = new Set<string>();

/**
 * 동일 메시지는 1회만 경고
 *
 * 트레이드오프: 100개 초과 시 전체 clear하므로 동일 경고가 주기적으로 재출력될 수 있음.
 * 메모리 제한을 위한 단순 정책으로, 정밀한 LRU가 필요하면 별도 구현 권장.
 */
function warnOnce(message: string): void {
  if (warnedTokens.size > 100) {
    warnedTokens.clear();
  }
  if (!warnedTokens.has(message)) {
    warnedTokens.add(message);
    console.warn(message);
  }
}

/** 테스트용 초기화 */
export function resetWarnedTokens(): void {
  warnedTokens.clear();
}

/** 허용되는 단위 패턴 */
const PX_NUMBER_PATTERN = /^-?\d+(\.\d+)?(px)?$/;
const PERCENT_PATTERN = /^-?\d+(\.\d+)?%$/;
const VIEWPORT_PATTERN = /^-?\d+(\.\d+)?(vh|vw)$/;

/**
 * 숫자 값 파싱 (px, number만 허용)
 *
 * @returns 파싱된 숫자 또는 undefined (미지원 단위)
 */
function parseNumericValue(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // px 또는 숫자만 허용
    if (!PX_NUMBER_PATTERN.test(value.trim())) {
      return undefined; // rem, em, %, calc 등 미지원
    }
    return parseFloat(value);
  }
  return undefined;
}

/**
 * 크기 값 파싱 (width/height용: px, %, vh, vw, number, auto 허용)
 *
 * @param value - 파싱할 값
 * @param available - % 계산 시 기준값 (부모 content-box)
 * @param viewportWidth - vw 계산 시 기준값
 * @param viewportHeight - vh 계산 시 기준값
 * @returns 파싱된 숫자 또는 undefined (auto 또는 미지원 단위)
 */
function parseSize(
  value: unknown,
  available: number,
  viewportWidth?: number,
  viewportHeight?: number
): number | undefined {
  if (value === undefined || value === 'auto') return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // % 허용 (부모 content-box 기준)
    if (PERCENT_PATTERN.test(trimmed)) {
      return (parseFloat(trimmed) / 100) * available;
    }

    // vh/vw 허용
    // ⚠️ 주의: 이 함수는 커스텀 엔진(BlockEngine/GridEngine)용
    // Yoga/@pixi/layout 경로에서는 styleToLayout.ts의 parseCSSValue()가
    // vh/vw를 % 문자열로 변환하여 Yoga가 부모 기준으로 처리
    // Pixi UI 컴포넌트(PixiButton 등)에서는 parseCSSSize()로
    // parentContentArea 기준 해석 (부모 내 수용 보장)
    if (VIEWPORT_PATTERN.test(trimmed)) {
      const num = parseFloat(trimmed);
      if (trimmed.endsWith('vh') && viewportHeight !== undefined) {
        return (num / 100) * viewportHeight;
      }
      if (trimmed.endsWith('vw') && viewportWidth !== undefined) {
        return (num / 100) * viewportWidth;
      }
      // viewport 크기 미제공 시 undefined
      return undefined;
    }

    // px 또는 숫자만 허용
    if (PX_NUMBER_PATTERN.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // rem, em, calc 등 미지원
    return undefined;
  }
  return undefined;
}

/**
 * shorthand 개별 값 파싱 (px, number만 허용)
 *
 * @returns 파싱된 숫자 또는 undefined
 */
function parseShorthandValue(value: string): number | undefined {
  const trimmed = value.trim();
  if (!PX_NUMBER_PATTERN.test(trimmed)) {
    return undefined; // 미지원 단위
  }
  return parseFloat(trimmed);
}

/**
 * shorthand 속성 파싱 (margin, padding, borderWidth)
 * "10px" → 모두 10
 * "10px 20px" → 상하 10, 좌우 20
 * "10px 20px 30px" → 상 10, 좌우 20, 하 30
 * "10px 20px 30px 40px" → 상 10, 우 20, 하 30, 좌 40
 *
 * 미지원 단위가 포함되면 해당 값은 0으로 처리
 */
function parseShorthand(value: unknown): Margin {
  const zero = { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof value === 'number') {
    return { top: value, right: value, bottom: value, left: value };
  }
  if (typeof value !== 'string') return zero;

  const tokens = value.split(/\s+/);
  const parts = tokens.map((token, i) => {
    const parsed = parseShorthandValue(token);
    if (parsed === undefined) {
      // 개발 모드에서만 경고 (디버깅 용이성, 중복 방지)
      if (import.meta.env.DEV) {
        warnOnce(`[parseShorthand] Unsupported token "${token}", fallback to 0`);
      }
      return 0;
    }
    return parsed;
  });

  switch (parts.length) {
    case 1: return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
    case 2: return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
    case 3: return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
    case 4: return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
    default: return zero;
  }
}
```

### 3.5 엔진 디스패처

```typescript
// layout/engines/index.ts

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
import { BlockEngine } from './BlockEngine';
import { FlexEngine, shouldDelegateToPixiLayout } from './FlexEngine';
import { GridEngine } from './GridEngine';

// Re-export
export { shouldDelegateToPixiLayout };
export type { LayoutEngine, ComputedLayout, LayoutContext };

// 싱글톤 엔진 인스턴스
const blockEngine = new BlockEngine();
const flexEngine = new FlexEngine();
const gridEngine = new GridEngine();

/**
 * display 속성에 따라 적절한 레이아웃 엔진 선택
 *
 * @example
 * const engine = selectEngine('flex');
 * if (shouldDelegateToPixiLayout(engine)) {
 *   // @pixi/layout 사용
 * } else {
 *   // engine.calculate() 호출
 * }
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
 * 주의: Flex 엔진은 shouldDelegate === true이므로
 * 이 함수 대신 @pixi/layout을 직접 사용해야 함
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

  // Flex 엔진은 @pixi/layout에 위임
  if (shouldDelegateToPixiLayout(engine)) {
    if (import.meta.env.DEV) {
      console.warn(
        '[calculateChildrenLayout] Flex layout should use @pixi/layout directly'
      );
    }
    return [];
  }

  return engine.calculate(parent, children, availableWidth, availableHeight, context);
}
```

### 3.6 BlockEngine 상세 설계

```typescript
// layout/engines/BlockEngine.ts

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
import type { Margin, BoxModel } from './types';
import { parseMargin, parseBoxModel } from './utils';

/**
 * CSS Block/Inline-Block 레이아웃 엔진
 *
 * 구현 기능:
 * - Block: 수직 쌓임, width 100% 기본값
 * - Inline-Block: 가로 배치, 콘텐츠 기반 너비
 * - Margin Collapse: 인접 블록 마진 병합, 빈 블록 자기 collapse
 */
export class BlockEngine implements LayoutEngine {
  readonly displayTypes = ['block', 'inline-block'];

  calculate(
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    context?: LayoutContext
  ): ComputedLayout[] {
    if (children.length === 0) return [];

    const layouts: ComputedLayout[] = [];
    let currentY = 0;
    let currentX = 0;
    let lineHeight = 0;
    let prevMarginBottom = context?.prevSiblingMarginBottom ?? 0;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const style = child.props?.style as Record<string, unknown> | undefined;
      const childDisplay = style?.display as string | undefined;

      const isInlineBlock = childDisplay === 'inline-block';
      const margin = parseMargin(style);
      const boxModel = parseBoxModel(child, availableWidth, availableHeight);

      if (isInlineBlock) {
        // Inline-block: 가로 배치 (마진 collapse 없음)
        const childWidth = boxModel.width ?? boxModel.contentWidth;
        // 마진 포함 전체 너비
        const totalWidth = childWidth + margin.left + margin.right;

        // 줄바꿈 필요 여부 확인 (마진 포함)
        if (currentX + totalWidth > availableWidth && currentX > 0) {
          currentY += lineHeight;
          currentX = 0;
          lineHeight = 0;
        }

        layouts.push({
          elementId: child.id,
          x: currentX + margin.left,
          y: currentY + margin.top,
          width: childWidth,
          height: boxModel.height ?? boxModel.contentHeight,
          margin,
        });

        currentX += childWidth + margin.left + margin.right;
        lineHeight = Math.max(
          lineHeight,
          (boxModel.height ?? boxModel.contentHeight) + margin.top + margin.bottom
        );

        // inline-block 이후에는 마진 collapse 리셋
        prevMarginBottom = 0;
      } else {
        // Block: 수직 쌓임 + 마진 collapse

        // 줄바꿈 (inline-block 이후)
        if (currentX > 0) {
          currentY += lineHeight;
          currentX = 0;
          lineHeight = 0;
        }

        // 빈 블록 처리: 자기 top/bottom 마진 collapse
        if (this.isEmptyBlock(child, boxModel)) {
          const collapsedSelfMargin = this.collapseEmptyBlockMargins(margin);
          // 이전 형제 마진과 빈 블록의 collapsed 마진을 다시 collapse
          const finalMargin = this.collapseMargins(prevMarginBottom, collapsedSelfMargin);

          layouts.push({
            elementId: child.id,
            x: margin.left,
            y: currentY + finalMargin,
            width: availableWidth - margin.left - margin.right,
            height: 0,
            margin: {
              ...margin,
              collapsedTop: finalMargin,
              collapsedBottom: 0, // 빈 블록은 하나로 합쳐짐
            },
          });

          // 빈 블록의 collapsed 마진이 다음 형제에게 전달됨
          prevMarginBottom = collapsedSelfMargin;
          continue;
        }

        // 일반 블록: Margin Collapse 계산
        const collapsedMarginTop = this.collapseMargins(prevMarginBottom, margin.top);
        currentY += collapsedMarginTop;

        // Block 너비: 명시적 width 또는 100%
        const childWidth = boxModel.width ?? availableWidth - margin.left - margin.right;
        const childHeight = boxModel.height ?? boxModel.contentHeight;

        layouts.push({
          elementId: child.id,
          x: margin.left,
          y: currentY,
          width: childWidth,
          height: childHeight,
          margin: {
            ...margin,
            collapsedTop: collapsedMarginTop,
          },
        });

        currentY += childHeight;
        prevMarginBottom = margin.bottom;
      }
    }

    return layouts;
  }

  /**
   * 두 마진 값 collapse (CSS 명세)
   *
   * - 둘 다 양수: 큰 값
   * - 둘 다 음수: 절대값이 큰 값 (더 작은 값)
   * - 양수/음수 혼합: 합산
   */
  private collapseMargins(marginA: number, marginB: number): number {
    if (marginA >= 0 && marginB >= 0) {
      return Math.max(marginA, marginB);
    }
    if (marginA < 0 && marginB < 0) {
      return Math.min(marginA, marginB);
    }
    return marginA + marginB;
  }

  /**
   * 빈 블록인지 확인
   *
   * CSS 명세: 다음 조건을 모두 만족하면 빈 블록
   * - height/min-height 없음
   * - border-top/bottom 없음
   * - padding-top/bottom 없음
   * - 콘텐츠 높이 0
   */
  private isEmptyBlock(element: Element, boxModel: BoxModel): boolean {
    const style = element.props?.style as Record<string, unknown> | undefined;

    // height 또는 min-height 있으면 빈 블록 아님
    if (boxModel.height !== undefined && boxModel.height > 0) return false;
    if (style?.minHeight) return false;

    // border 있으면 빈 블록 아님
    if (boxModel.border.top > 0 || boxModel.border.bottom > 0) return false;

    // padding 있으면 빈 블록 아님
    if (boxModel.padding.top > 0 || boxModel.padding.bottom > 0) return false;

    // 콘텐츠 높이가 0이면 빈 블록
    return boxModel.contentHeight === 0;
  }

  /**
   * 빈 블록의 자기 마진 collapse
   *
   * CSS 명세: 빈 블록의 top/bottom 마진은 하나로 collapse
   */
  private collapseEmptyBlockMargins(margin: Margin): number {
    return this.collapseMargins(margin.top, margin.bottom);
  }
}
```

### 3.7 FlexEngine (Yoga 위임)

```typescript
// layout/engines/FlexEngine.ts

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';

/**
 * Flexbox 레이아웃 엔진
 *
 * @pixi/layout(Yoga 기반)이 Flexbox를 완벽히 지원하므로,
 * 이 엔진은 "위임 마커" 역할만 수행합니다.
 *
 * ## 위임 동작 방식
 *
 * BuilderCanvas에서 엔진 선택 시:
 * 1. selectEngine('flex') → FlexEngine 반환
 * 2. FlexEngine.shouldDelegate === true 확인
 * 3. 커스텀 calculate() 호출 대신 @pixi/layout의 layout prop 사용
 *
 * 이 방식의 장점:
 * - 기존 @pixi/layout 동작 유지 (검증된 Yoga 엔진)
 * - 하이브리드 아키텍처 인터페이스 통일
 * - 향후 필요 시 Yoga API 직접 호출로 전환 가능
 */
export class FlexEngine implements LayoutEngine {
  readonly displayTypes = ['flex', 'inline-flex'];

  /**
   * @pixi/layout에 위임해야 함을 표시
   *
   * BuilderCanvas에서 이 플래그를 확인하여
   * calculate() 대신 기존 layout prop 방식 사용
   */
  readonly shouldDelegate = true;

  calculate(
    _parent: Element,
    _children: Element[],
    _availableWidth: number,
    _availableHeight: number,
    _context?: LayoutContext
  ): ComputedLayout[] {
    // 이 메서드는 호출되지 않음 (shouldDelegate === true)
    // 만약 호출된다면 경고 로그 출력 (개발 모드에서만)
    if (import.meta.env.DEV) {
      console.warn(
        '[FlexEngine] calculate() called directly. ' +
        'Use @pixi/layout instead (shouldDelegate === true)'
      );
    }
    return [];
  }
}

/**
 * 엔진이 @pixi/layout에 위임해야 하는지 확인
 */
export function shouldDelegateToPixiLayout(engine: LayoutEngine): boolean {
  return 'shouldDelegate' in engine && (engine as FlexEngine).shouldDelegate;
}
```

### 3.8 GridEngine (기존 로직 통합)

```typescript
// layout/engines/GridEngine.ts

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
import {
  parseGridTemplate,
  parseGap,
  parseGridTemplateAreas,
  calculateGridCellBounds,
} from '../GridLayout.utils';
import type { CSSStyle } from '../../sprites/styleConverter';

/**
 * CSS Grid 레이아웃 엔진
 *
 * GridLayout.utils.ts의 기존 로직을 LayoutEngine 인터페이스로 래핑
 */
export class GridEngine implements LayoutEngine {
  readonly displayTypes = ['grid', 'inline-grid'];

  calculate(
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    _context?: LayoutContext
  ): ComputedLayout[] {
    if (children.length === 0) return [];

    const style = parent.props?.style as CSSStyle | undefined;

    // Grid 트랙 파싱
    const columnTracks = parseGridTemplate(style?.gridTemplateColumns, availableWidth);
    const rowTracks = parseGridTemplate(style?.gridTemplateRows, availableHeight);

    // Gap 파싱
    const gap = parseGap(style?.gap);
    const columnGap = parseGap(style?.columnGap) ?? gap;
    const rowGap = parseGap(style?.rowGap) ?? gap;

    // Template Areas 파싱
    const templateAreas = parseGridTemplateAreas(style?.gridTemplateAreas);

    // 기본 트랙 (없으면 1fr 1개)
    const effectiveColumnTracks = columnTracks.length > 0
      ? columnTracks
      : [{ size: availableWidth, unit: 'fr' as const, originalValue: '1fr' }];
    const effectiveRowTracks = rowTracks.length > 0
      ? rowTracks
      : [{ size: 50, unit: 'auto' as const, originalValue: 'auto' }];

    // 각 자식의 그리드 셀 위치 계산
    return children.map((child, index) => {
      const childStyle = child.props?.style as CSSStyle | undefined;
      const cellBounds = calculateGridCellBounds(
        childStyle,
        effectiveColumnTracks,
        effectiveRowTracks,
        columnGap,
        rowGap,
        templateAreas,
        index
      );

      return {
        elementId: child.id,
        x: cellBounds.x,
        y: cellBounds.y,
        width: cellBounds.width,
        height: cellBounds.height,
      };
    });
  }
}
```

---

## 4. BuilderCanvas 통합 계획

### 4.1 현재 구조

```typescript
// BuilderCanvas.tsx 현재 로직
const renderTree = useCallback((parentId: string | null) => {
  // ...
  const containerLayout = hasChildren && !baseLayout.flexDirection
    ? { display: 'flex', flexDirection: 'column', ...baseLayout }
    : baseLayout;

  return (
    <LayoutContainer layout={containerLayout}>
      <ElementSprite ... />
      {renderTree(child.id)}
    </LayoutContainer>
  );
}, [/* deps */]);
```

### 4.2 하이브리드 통합 후 구조

```typescript
// BuilderCanvas.tsx 하이브리드 로직

import { Container } from '@pixi/react';
import { selectEngine, shouldDelegateToPixiLayout } from './layout/engines';

const renderTree = useCallback((parentId: string | null) => {
  const parent = elementsMap.get(parentId);
  const children = pageChildrenMap.get(parentId) ?? [];
  const style = parent?.props?.style as Record<string, unknown> | undefined;
  const display = style?.display as string | undefined;

  // 엔진 선택
  const engine = selectEngine(display);

  // @pixi/layout 위임 여부 확인 (flex, inline-flex)
  if (shouldDelegateToPixiLayout(engine)) {
    return renderWithPixiLayout(parent, children);
  }

  // 커스텀 엔진 사용 (block, inline-block, grid)
  return renderWithCustomEngine(engine, parent, children);
}, [/* deps */]);

/**
 * @pixi/layout 사용 (기존 로직 유지)
 */
const renderWithPixiLayout = (
  parent: Element | undefined,
  children: Element[]
) => {
  const baseLayout = styleToLayout(parent?.props?.style);

  return (
    <LayoutContainer layout={baseLayout}>
      {children.map((child) => (
        <Fragment key={child.id}>
          <ElementSprite element={child} />
          {renderTree(child.id)}
        </Fragment>
      ))}
    </LayoutContainer>
  );
};

/**
 * 커스텀 엔진 사용 (Block, Grid)
 *
 * 엔진이 계산한 절대 위치를 @pixi/layout의 absolute 포지셔닝으로 적용
 */
const renderWithCustomEngine = (
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
          <LayoutContainer
            key={child.id}
            layout={{
              position: 'absolute',
              left: layout.x,
              top: layout.y,
              width: layout.width,
              height: layout.height,
            }}
          >
            <ElementSprite element={child} />
            {renderTree(child.id)}
          </LayoutContainer>
        );
      })}
    </Container>
  );
};
```

### 4.3 점진적 마이그레이션 전략

```
┌─────────────────────────────────────────────────────────┐
│ Phase 1-4: P0 (필수 - WYSIWYG 핵심)                     │
├─────────────────────────────────────────────────────────┤

Phase 1 (현재 문서)
└── 요구 동작 문서화 ✅

Phase 2 (인터페이스)
├── LayoutEngine 인터페이스 정의
├── FlexEngine (Yoga 래퍼) 구현
└── GridEngine (기존 로직 통합) 구현

Phase 3 (BlockEngine)
├── Block 기본 동작 구현
├── width 100% 기본값
├── 수직 쌓임
└── Margin collapse (형제)

Phase 4 (통합)
├── BuilderCanvas 엔진 디스패처 통합
├── display 속성별 엔진 선택
└── 기존 테스트 통과 확인

├─────────────────────────────────────────────────────────┤
│ Phase 5: P1 (중요 - 정확한 레이아웃)                    │
├─────────────────────────────────────────────────────────┤

Phase 5 (P1 기능)
├── Inline-block 완전 구현
├── Grid 엔진 통합
├── Margin collapse (부모-자식, 빈 블록)
└── BFC 생성 조건 (overflow, flow-root 등)

├─────────────────────────────────────────────────────────┤
│ Phase 6: P2 (향후 - 고급 레이아웃)                      │
├─────────────────────────────────────────────────────────┤

Phase 6 (P2 기능)
├── display: inline
├── vertical-align (baseline, top, middle 등)
├── inline-block baseline 계산
└── line-height 영향 ✅

└─────────────────────────────────────────────────────────┘
```

> **참고**: Phase 6(P2) 완료 후에도 Non-goals(rem/em/vw/calc, Grid repeat/minmax 등)는 미지원

---

## 5. 검증 방법

### 5.1 단위 테스트

```typescript
// BlockEngine.test.ts
describe('BlockEngine', () => {
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

### 5.2 브라우저 비교 테스트

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

### 5.3 실제 사용 테스트

1. 빌더에서 Block/Grid 컴포넌트 배치
2. Preview iframe과 픽셀 단위 비교
3. 캔버스 SelectionBox 위치 정확성 확인

---

## 6. 파일 구조

```
apps/builder/src/builder/workspace/canvas/layout/
├── engines/
│   ├── types.ts               # 공통 타입 (Margin, BoxModel)
│   ├── LayoutEngine.ts        # 엔진 인터페이스 (ComputedLayout, LayoutContext)
│   ├── BlockEngine.ts         # Block/Inline-Block 엔진
│   ├── FlexEngine.ts          # Yoga 위임 마커 (shouldDelegate)
│   ├── GridEngine.ts          # Grid 엔진 (기존 로직 통합)
│   ├── utils.ts               # 공유 유틸리티 (parseMargin, parseBoxModel)
│   └── index.ts               # 엔진 디스패처 (selectEngine, shouldDelegateToPixiLayout)
├── GridLayout.utils.ts        # 기존 Grid 유틸리티 (유지)
├── styleToLayout.ts           # 기존 스타일 변환 (유지)
└── index.ts                   # 공개 API
```

---

## 7. 참조 문서

### 내부 문서
- [PIXI_LAYOUT.md](./PIXI_LAYOUT.md) - @pixi/layout 마이그레이션 기록
- [PIXI_WEBGL.md](./reference/components/PIXI_WEBGL.md) - WebGL 캔버스 아키텍처
- [GridLayout.utils.ts](../apps/builder/src/builder/workspace/canvas/layout/GridLayout.utils.ts) - Grid 계산 로직

### 외부 참조 (CSS 명세)
- [CSS Visual Formatting Model](https://www.w3.org/TR/CSS2/visuren.html) - CSS 명세
- [CSS Box Model](https://www.w3.org/TR/CSS2/box.html) - 박스 모델 명세
- [Block Formatting Context - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Display/Block_formatting_context) - BFC 상세
- [Mastering Margin Collapsing - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Box_model/Margin_collapsing) - Margin Collapse
- [The Rules of Margin Collapse - Josh Comeau](https://www.joshwcomeau.com/css/rules-of-margin-collapse/) - 실용적 가이드
- [vertical-align - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/vertical-align) - vertical-align 상세
- [Vertical-Align: All You Need To Know](https://christopheraue.net/design/vertical-align) - baseline 상세

### 외부 참조 (PixiJS)
- [Yoga Layout](https://yogalayout.dev/) - @pixi/layout 기반 엔진
- [@pixi/layout](https://layout.pixijs.io/) - PixiJS 레이아웃 라이브러리

---

## 8. 이슈 사항 및 해결 내역

### 8.1 Phase 9: CSS/WebGL 레이아웃 정합성 개선 (2026-01-28)

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
const BUTTON_SIZE_CONFIG = {
  xs: { paddingLeft: 8, paddingRight: 8, fontSize: 12, height: 24 },
  sm: { paddingLeft: 12, paddingRight: 12, fontSize: 14, height: 32 },
  md: { paddingLeft: 16, paddingRight: 16, fontSize: 16, height: 40 },
  lg: { paddingLeft: 24, paddingRight: 24, fontSize: 18, height: 48 },
  xl: { paddingLeft: 32, paddingRight: 32, fontSize: 20, height: 56 },
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
- `BuilderCanvas.tsx`의 `renderWithCustomEngine`에서 부모의 padding을 고려하지 않고 `pageWidth`, `pageHeight`를 그대로 사용

**해결:**
```typescript
// BuilderCanvas.tsx - renderWithCustomEngine
function renderWithCustomEngine(...) {
  // 부모의 padding 파싱
  const parentPadding = parsePadding(parentStyle);

  // padding이 적용된 content-box 크기 계산
  const availableWidth = pageWidth - parentPadding.left - parentPadding.right;
  const availableHeight = pageHeight - parentPadding.top - parentPadding.bottom;

  // 레이아웃 계산 시 content-box 크기 사용
  const layouts = engine.calculate(
    parentElement, children,
    availableWidth, availableHeight, ...
  );

  // 자식 위치에 padding offset 적용
  return children.map((child) => (
    <LayoutContainer
      layout={{
        left: layout.x + parentPadding.left,
        top: layout.y + parentPadding.top,
        ...
      }}
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
- `@pixi/layout`이 명시적 `display: 'flex'` 없이는 flex 컨테이너로 인식하지 못함
- `bodyLayout`에서 spread로 `display: 'flex'`가 전달되어도 기본값이 없으면 동작하지 않는 경우 발생

**해결:**
```typescript
// BuilderCanvas.tsx - rootLayout
const rootLayout = useMemo(() => {
  const bodyLayout = bodyElement ? styleToLayout(bodyElement) : {};

  const result = {
    display: 'flex' as const,  // 🚀 Phase 9: 명시적 추가
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'flex-start' as const,
    alignItems: 'flex-start' as const,
    alignContent: 'flex-start' as const,
    ...bodyLayout,  // bodyLayout의 display, flexDirection으로 덮어쓰기
    width: pageWidth,
    height: pageHeight,
    position: 'relative' as const,
  };

  return result;
}, [pageWidth, pageHeight, bodyElement]);
```

```typescript
// styleToLayout.ts - display: flex 처리 추가
if (style.display === 'flex' || style.display === 'inline-flex') {
  layout.display = 'flex';
  layout.flexDirection = (style.flexDirection as LayoutStyle['flexDirection']) ?? 'row';
}
```

---

### 8.2 Phase 10: CSS Blockification 지원 (2026-01-28)

#### 이슈 5: Flex 컨테이너 자식의 display가 WebGL에서 변환되지 않음

**증상:**
- body에 `display: flex` 설정 시
- CSS Preview에서는 button(기본 inline-block)이 block으로 동작
- WebGL 캔버스에서는 여전히 inline-block으로 처리되어 가로 배치됨

**원인:**
- CSS Blockification 규칙 미구현
- `BlockEngine`이 부모 display 값을 고려하지 않고 자식의 명시적 display만 확인
- `LayoutContext`에 parentDisplay 필드 없음

**해결:**
```typescript
// LayoutEngine.ts - LayoutContext에 parentDisplay 추가
export interface LayoutContext {
  bfcId: string;
  // ...
  parentDisplay?: string;  // CSS blockification 계산용
}

// BlockEngine.ts - computeEffectiveDisplay 메서드 추가
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

### 8.3 Phase 11: CSS 명세 누락 케이스 보완 (계획)

CSS 명세와 WebGL 구현 간 불일치 조사 결과 발견된 누락 케이스들입니다.

#### 이슈 6: Position absolute/fixed일 때 Blockification 제외 필요 ✅ (구현 완료)

**CSS 명세:**
- out-of-flow 요소(absolute, fixed)는 부모가 flex/grid라도 blockification이 적용되지 않음

**구현 내용:**
- `BlockEngine.ts`: `computeEffectiveDisplay()`에 `childPosition` 매개변수 추가
- absolute/fixed 요소는 blockification 건너뛰고 원래 display 값 유지
- 호출부에서 `style?.position` 전달

```typescript
// BlockEngine.ts - computeEffectiveDisplay() 수정
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

#### 이슈 7: min/max width/height 크기 제한 미적용 ✅ (구현 완료)

**CSS 명세:**
- 요소 크기는 `clamp(min, base, max)` 형태로 제한됨

**구현 내용:**
- `types.ts`: `BoxModel`에 `minWidth`, `maxWidth`, `minHeight`, `maxHeight` 필드 추가
- `utils.ts`: `parseBoxModel()`에서 `parseSize()`로 min/max 값 파싱
- `BlockEngine.ts`: `clampSize()` 유틸리티 함수 추가, block/inline-block 양쪽에서 적용

```typescript
// BlockEngine.ts - clampSize 유틸리티
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

#### 이슈 8: box-sizing: border-box 미지원 ✅ (구현 완료)

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

#### 이슈 9: overflow-x/y 혼합 처리 안 됨 ✅ (구현 완료)

**CSS 명세:**
- `overflow-x`와 `overflow-y`는 독립적으로 처리 가능
- 둘 중 하나라도 `visible`이 아니면 BFC 생성

**구현 내용:**
- `BlockEngine.ts`: `createsBFC()`에서 개별 overflow 체크 3개를 shorthand fallback cascade로 교체
- `overflowX ?? overflow ?? 'visible'` 패턴으로 CSS cascade 재현

```typescript
// BlockEngine.ts - createsBFC() 수정
// overflow 기반 BFC (visible 외) - overflow-x/y가 shorthand을 올바르게 fallback
const effectiveOverflowX = overflowX ?? overflow ?? 'visible';
const effectiveOverflowY = overflowY ?? overflow ?? 'visible';
if (effectiveOverflowX !== 'visible' || effectiveOverflowY !== 'visible') return true;
```

---

#### 이슈 10: visibility 레이아웃 미적용 ✅ (구현 완료)

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

#### 이슈 11: Grid align-self, justify-self 미지원 ✅ (구현 완료)

**CSS 명세:**
- Grid 자식은 `align-self`, `justify-self`로 셀 내 개별 정렬 가능

**구현 내용:**
- `GridEngine.ts`: `calculate()`에서 셀 바운드 계산 후 `alignSelf`/`justifySelf` 적용
- `parseBoxModel()`로 자식 고유 크기 계산, 셀 크기보다 작으면 정렬 위치 조정
- `start`, `center`, `end` 지원 (stretch/normal은 기존 동작 유지)

```typescript
// GridEngine.ts - calculate() 수정
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
| `BlockEngine.ts` | 6, 7, 9 | ✅ |
| `types.ts` | 7 | ✅ |
| `utils.ts` | 7, 8 | ✅ |
| `GridEngine.ts` | 11 | ✅ |
| `computedStyleExtractor.ts` | 10 | ✅ |

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

### 8.4 Phase 12: 스타일 패널 Alignment 축 매핑 수정 (2026-01-29)

#### 이슈 12: flex-direction: column일 때 Alignment 토글 활성 위치 불일치 ✅ (구현 완료)

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

#### 이슈 13: flex-direction: row + nowrap에서 오버플로 시 버튼 겹침 ✅ (구현 완료)

**증상:**
- body에 `display: flex`, `flex-direction: row`, 버튼 6개 배치
- CSS 웹모드: 버튼이 가로 배치되고, body 너비를 초과하면 스크롤 발생
- WebGL 캔버스: 버튼이 body 안에서 겹쳐서 배치됨 (축소)

**원인:**
- CSS: flex 아이템의 `min-width` 기본값 = `auto` (min-content 크기 이하로 축소 안 됨)
- Yoga(@pixi/layout): `min-width` 기본값 = `0` (아이템이 0까지 축소 가능)
- `flex-shrink: 1` (기본값) + Yoga의 `min-width: 0` → 버튼이 콘텐츠 크기 이하로 압축되어 겹침

**구현 내용:**
- `BuilderCanvas.tsx`: @pixi/layout 경로의 모든 flex 자식에 `flexShrink: 0` 기본값 설정
- 3개 렌더링 경로(containerLayout, childContainerLayout, nestedContainerLayout) 모두 적용
- 사용자가 명시적으로 `flexShrink`를 설정하면 그 값이 우선

```typescript
// BuilderCanvas.tsx - @pixi/layout 경로
const flexShrinkDefault = baseLayout.flexShrink !== undefined ? {} : { flexShrink: 0 };
const containerLayout = hasChildren && !baseLayout.display && !baseLayout.flexDirection
  ? { position: 'relative', flexShrink: 0, display: 'flex', flexDirection: 'column', ...blockLayout, ...baseLayout }
  : { position: 'relative', ...flexShrinkDefault, ...blockLayout, ...baseLayout };
```

---

#### 이슈 14: display: block 시 inline-block 버튼 간 가로/세로 여백 불일치 ✅ (구현 완료)

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
// BUTTON_SIZE_CONFIG - height 제거, paddingY 추가
const BUTTON_SIZE_CONFIG = {
  sm: { paddingLeft: 12, paddingRight: 12, paddingY: 4, fontSize: 14 },
  // ...
};

// calculateTextWidth - Math.ceil → Math.round
return Math.round(textWidth + padding);

// calculateContentHeight - PixiButton과 동일 공식
function estimateTextHeight(fontSize: number): number {
  return Math.round(fontSize * 1.2);
}

// 버튼 높이: max(paddingY*2 + textHeight, MIN_BUTTON_HEIGHT)
// sm: max(4*2 + Math.round(14*1.2), 24) = max(8 + 17, 24) = 25px
```

---

## 9. 변경 이력

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
