# @pixi/layout 하이브리드 포크: CSS 100% 호환 레이아웃 구현

> XStudio WebGL 캔버스에서 브라우저 CSS와 픽셀 단위 동일한 레이아웃 구현

## 목표

**WYSIWYG 보장**: 캔버스에서 보이는 것 = 브라우저에서 보이는 것

현재 @pixi/layout(Yoga 기반)은 CSS의 일부만 지원합니다. 이 문서는 CSS 100% 호환을 위한 하이브리드 엔진 아키텍처를 정의합니다.

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

#### 1.3.6 마진 병합 차단 조건 (BFC 생성)

다음 중 하나라도 해당하면 **새 BFC 생성** → 마진 병합 안됨:

| 조건 | 설명 |
|------|------|
| `overflow: hidden/auto/scroll` | visible 외 모든 값 |
| `display: flex/grid` | Flex/Grid 컨테이너 |
| `display: inline-block` | Inline-block 요소 |
| `display: flow-root` | **모던 방법** (부작용 없음) |
| `float: left/right` | Float 요소 |
| `position: absolute/fixed` | Out-of-flow 요소 |
| 부모에 `padding` 있음 | 물리적 분리 |
| 부모에 `border` 있음 | 물리적 분리 |
| `contain: layout/content/paint` | CSS Containment |

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
| padding-top/bottom | 시각적으로만 (레이아웃 영향 X) | 레이아웃에 영향 |
| line-height 영향 | 받음 | 자체 height 사용 |

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

**장점**: CSS Grid 명세 대부분 지원
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

### P2 (향후 - 완전한 CSS 호환)

| 항목 | 현재 상태 | 목표 | 구현 복잡도 |
|------|----------|------|------------|
| `display: inline` | 미지원 | 지원 | 높음 |
| vertical-align (baseline) | 미지원 | baseline, top, middle 등 | 높음 |
| inline-block baseline 계산 | 미지원 | overflow에 따른 baseline 변경 | 높음 |
| float | 미지원 | 지원 | 매우 높음 |
| writing-mode (세로 쓰기) | 미지원 | 지원 | 높음 |
| line-height 영향 | 미지원 | inline 요소 높이 계산 | 중간 |

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

### 3.2 엔진 인터페이스 설계

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

### 3.3 엔진 디스패처

```typescript
// layout/engines/index.ts

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
import { BlockEngine } from './BlockEngine';
import { FlexEngine } from './FlexEngine';
import { GridEngine } from './GridEngine';

// 싱글톤 엔진 인스턴스
const blockEngine = new BlockEngine();
const flexEngine = new FlexEngine();
const gridEngine = new GridEngine();

/**
 * display 속성에 따라 적절한 레이아웃 엔진 선택
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

### 3.4 BlockEngine 상세 설계

```typescript
// layout/engines/BlockEngine.ts

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
import { parseMargin, parseBoxModel } from './utils';

/**
 * CSS Block/Inline-Block 레이아웃 엔진
 *
 * 구현 기능:
 * - Block: 수직 쌓임, width 100% 기본값
 * - Inline-Block: 가로 배치, 콘텐츠 기반 너비
 * - Margin Collapse: 인접 블록 마진 병합
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
        // Inline-block: 가로 배치
        const childWidth = boxModel.width ?? boxModel.contentWidth;

        // 줄바꿈 필요 여부 확인
        if (currentX + childWidth > availableWidth && currentX > 0) {
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
      } else {
        // Block: 수직 쌓임 + 마진 collapse

        // 줄바꿈 (inline-block 이후)
        if (currentX > 0) {
          currentY += lineHeight;
          currentX = 0;
          lineHeight = 0;
        }

        // Margin Collapse 계산
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
   * 두 마진 중 큰 값 반환 (마진 collapse)
   *
   * CSS 명세: 인접 block 마진은 병합되어 큰 값만 적용
   */
  private collapseMargins(marginA: number, marginB: number): number {
    // 둘 다 양수: 큰 값
    if (marginA >= 0 && marginB >= 0) {
      return Math.max(marginA, marginB);
    }
    // 둘 다 음수: 작은 값 (절대값이 큰 값)
    if (marginA < 0 && marginB < 0) {
      return Math.min(marginA, marginB);
    }
    // 하나만 음수: 합산
    return marginA + marginB;
  }

  /**
   * 빈 블록인지 확인 (자기 마진 collapse 대상)
   *
   * CSS 명세: height/min-height, border, padding, inline 콘텐츠 없는 블록
   */
  private isEmptyBlock(element: Element, boxModel: BoxModel): boolean {
    const style = element.props?.style as Record<string, unknown> | undefined;

    // height 또는 min-height 있으면 빈 블록 아님
    if (boxModel.height !== undefined && boxModel.height > 0) return false;
    if (style?.minHeight) return false;

    // border 있으면 빈 블록 아님
    if (style?.borderTopWidth || style?.borderBottomWidth) return false;
    if (style?.border) return false;

    // padding 있으면 빈 블록 아님
    if (style?.paddingTop || style?.paddingBottom) return false;
    if (style?.padding) return false;

    // 콘텐츠 높이가 0이면 빈 블록
    return boxModel.contentHeight === 0;
  }

  /**
   * 빈 블록의 자기 마진 collapse
   *
   * CSS 명세: 빈 블록의 top/bottom 마진은 하나로 collapse
   */
  private collapseEmptyBlockMargins(margin: Margin): number {
    // 빈 블록은 top/bottom 마진이 collapse되어 하나만 남음
    return this.collapseMargins(margin.top, margin.bottom);
  }
}
```

### 3.5 FlexEngine (Yoga 래퍼)

```typescript
// layout/engines/FlexEngine.ts

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';

/**
 * Flexbox 레이아웃 엔진 (Yoga/@pixi/layout 래퍼)
 *
 * 현재 @pixi/layout이 잘 동작하므로, 이 엔진은 주로
 * 인터페이스 통합 목적으로 사용됩니다.
 *
 * 실제 계산은 @pixi/layout의 Yoga 엔진에 위임됩니다.
 */
export class FlexEngine implements LayoutEngine {
  readonly displayTypes = ['flex', 'inline-flex'];

  calculate(
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    _context?: LayoutContext
  ): ComputedLayout[] {
    // @pixi/layout이 자동으로 처리하므로
    // 이 메서드는 BuilderCanvas의 기존 로직과 연동
    //
    // 하이브리드 아키텍처에서는 다음과 같이 동작:
    // 1. display: flex인 경우 이 엔진 선택
    // 2. @pixi/layout의 layout prop 그대로 사용
    // 3. getBounds()로 결과 레이아웃 조회

    // 현재는 빈 배열 반환 (@pixi/layout에 위임)
    // 향후 필요 시 Yoga API 직접 호출로 전환 가능
    return [];
  }
}
```

### 3.6 GridEngine (기존 로직 통합)

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
    const columnGap = parseGap(style?.columnGap) || gap;
    const rowGap = parseGap(style?.rowGap) || gap;

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
const renderTree = useCallback((parentId: string | null) => {
  const parent = elementsMap.get(parentId);
  const children = pageChildrenMap.get(parentId) ?? [];
  const display = parent?.props?.style?.display;

  // display: flex인 경우 @pixi/layout 사용 (현재와 동일)
  if (display === 'flex' || display === 'inline-flex') {
    return renderWithPixiLayout(parent, children);
  }

  // display: grid인 경우 GridEngine 사용
  if (display === 'grid' || display === 'inline-grid') {
    return renderWithGridEngine(parent, children);
  }

  // display: block/inline-block인 경우 BlockEngine 사용
  return renderWithBlockEngine(parent, children);
}, [/* deps */]);

const renderWithBlockEngine = (parent, children) => {
  const layouts = blockEngine.calculate(
    parent,
    children,
    containerWidth,
    containerHeight
  );

  return (
    <pixiContainer>
      {children.map((child, index) => {
        const layout = layouts[index];
        return (
          <pixiContainer
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
          </pixiContainer>
        );
      })}
    </pixiContainer>
  );
};
```

### 4.3 점진적 마이그레이션 전략

```
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

Phase 5 (고급 기능)
├── Inline-block 완전 구현
├── Margin collapse (부모-자식)
└── BFC 지원
```

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
│   ├── LayoutEngine.ts        # 인터페이스 정의
│   ├── BlockEngine.ts         # Block/Inline-Block 엔진
│   ├── FlexEngine.ts          # Yoga 래퍼
│   ├── GridEngine.ts          # Grid 엔진 (기존 로직 통합)
│   ├── utils.ts               # 공유 유틸리티 (마진 파싱 등)
│   └── index.ts               # 엔진 디스패처
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

## 8. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-28 | 1.0 | 초기 문서 작성 |
| 2026-01-28 | 1.1 | Chrome CSS 동작 검토 후 보완: BFC 생성 조건, 빈 블록 margin collapse, vertical-align/baseline 규칙, 수평 마진 collapse 방지 명시 |
