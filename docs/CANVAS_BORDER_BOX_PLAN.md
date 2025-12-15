# Canvas Border-Box Implementation Plan v2

> CSS `box-sizing: border-box` 동작을 PixiJS Canvas에 구현하는 계획
> **v2**: 잠재적 오류 분석 후 전면 재설계 (2025-12-15)

## 배경

현재 PixiJS Canvas에서 border가 요소 바깥으로 그려져 레이아웃이 겹치는 문제가 있음.
CSS의 `box-sizing: border-box` 동작을 구현하여 border가 요소 안쪽으로 그려지도록 수정 필요.

## 핵심 원칙

### CSS border-box 동작

```
┌──────────────────────────┐
│ border (안쪽으로)         │
│  ┌────────────────────┐  │
│  │ padding            │  │
│  │  ┌──────────────┐  │  │
│  │  │   content    │  │  │
│  │  └──────────────┘  │  │
│  └────────────────────┘  │
└──────────────────────────┘

width = border + padding + content + padding + border
(border가 width 안에 포함됨)
```

### PixiJS stroke 기본 동작

```
PixiJS stroke는 선의 중앙이 경계에 위치
→ borderWidth 4px이면 2px가 바깥으로 튀어나감
→ border-box를 위해 rect를 borderWidth/2 만큼 안쪽으로 이동 필요
```

---

## v1 계획의 문제점 분석

| 문제 | 심각도 | 원인 |
|------|--------|------|
| Yoga `setBorder()` ≠ border-box | 🔴 높음 | Yoga는 content-box 기반으로 border 공간 추가 |
| borderRadius 음수 위험 | 🔴 높음 | `radius - offset` 계산 시 음수 가능 |
| 순환 의존성 | 🟡 중간 | 파일 이동 시 import 순서 문제 |
| Auto-size 중복 | 🟡 중간 | PixiButton vs LayoutEngine 로직 차이 |
| 기존 요소 호환성 | 🟡 중간 | 마이그레이션 없이 시각적 변화 |
| dashed/dotted 복잡성 | 🟢 낮음 | borderRadius > 0일 때 fallback 로직 |

---

## 수정된 구현 전략

### 핵심 변경: Yoga `setBorder()` 사용 안함

**이유**:
- Yoga의 `setBorder()`는 content-box 방식 (width 바깥에 border 추가)
- border-box는 width 안에 border 포함
- 두 방식이 충돌함

**대안**:
- Yoga 레이아웃은 **변경 없이** 유지 (padding만 사용)
- **렌더링 단계에서만** border-box offset 적용
- 기존 레이아웃 계산 결과와 100% 호환

---

## Phase 0: 공통 유틸리티 (신규)

### 0.1 `utils/borderUtils.ts` 생성

```typescript
/**
 * Border 관련 유틸리티
 * - border-box offset 계산
 * - borderRadius 안전 처리
 */

import type { CSSStyle } from '../sprites/styleConverter';
import { parseCSSSize } from '../sprites/styleConverter';

export interface BorderConfig {
  width: number;
  color: number;
  alpha: number;
  style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  radius: number;
}

/**
 * CSS 스타일에서 border 정보 추출
 */
export function parseBorderConfig(style: CSSStyle | undefined): BorderConfig | null {
  if (!style?.borderWidth && !style?.borderColor) {
    return null;
  }

  const width = parseCSSSize(style.borderWidth, undefined, 0);
  if (width <= 0) return null;

  return {
    width,
    color: cssColorToHex(style.borderColor, 0x000000),
    alpha: cssColorToAlpha(style.borderColor),
    style: parseBorderStyle(style.borderStyle),
    radius: parseCSSSize(style.borderRadius, undefined, 0),
  };
}

/**
 * border-box offset 계산
 * stroke가 선 중앙에 그려지므로 width/2 만큼 안쪽으로 이동
 */
export function getBorderBoxOffset(borderWidth: number): number {
  return borderWidth / 2;
}

/**
 * border-box 적용 시 안전한 borderRadius 계산
 * radius가 offset보다 작으면 0 반환 (음수 방지)
 */
export function getSafeBorderRadius(radius: number, offset: number): number {
  return Math.max(0, radius - offset);
}

/**
 * border-box 내부 영역 계산
 */
export interface BorderBoxInnerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

export function getBorderBoxInnerBounds(
  width: number,
  height: number,
  borderWidth: number,
  borderRadius: number
): BorderBoxInnerBounds {
  const offset = getBorderBoxOffset(borderWidth);
  return {
    x: offset,
    y: offset,
    width: Math.max(0, width - borderWidth),
    height: Math.max(0, height - borderWidth),
    radius: getSafeBorderRadius(borderRadius, offset),
  };
}
```

### 0.2 `utils/graphicsUtils.ts` 생성

```typescript
/**
 * PixiJS Graphics 유틸리티
 * - border-box 방식 도형 그리기
 * - 텍스트 기반 자동 크기 계산
 */

import { Graphics as PixiGraphics } from 'pixi.js';
import { getBorderBoxInnerBounds, type BorderConfig } from './borderUtils';

export interface DrawBoxOptions {
  width: number;
  height: number;
  backgroundColor?: number;
  backgroundAlpha?: number;
  border?: BorderConfig | null;
}

/**
 * border-box 방식으로 Box 그리기
 *
 * @example
 * drawBox(g, {
 *   width: 100,
 *   height: 50,
 *   backgroundColor: 0xffffff,
 *   border: { width: 2, color: 0x000000, alpha: 1, style: 'solid', radius: 8 }
 * });
 */
export function drawBox(g: PixiGraphics, options: DrawBoxOptions): void {
  g.clear();

  const { width, height, backgroundColor = 0xffffff, backgroundAlpha = 1, border } = options;
  const borderWidth = border?.width ?? 0;
  const borderRadius = border?.radius ?? 0;

  // 1. Fill (전체 영역)
  if (borderRadius > 0) {
    g.roundRect(0, 0, width, height, borderRadius);
  } else {
    g.rect(0, 0, width, height);
  }
  g.fill({ color: backgroundColor, alpha: backgroundAlpha });

  // 2. Stroke (border-box 방식: 안쪽으로 offset)
  if (border && border.style !== 'none' && borderWidth > 0) {
    const inner = getBorderBoxInnerBounds(width, height, borderWidth, borderRadius);

    switch (border.style) {
      case 'dashed':
        drawDashedStroke(g, inner, border);
        break;
      case 'dotted':
        drawDottedStroke(g, inner, border);
        break;
      case 'double':
        drawDoubleStroke(g, width, height, border);
        break;
      case 'solid':
      default:
        drawSolidStroke(g, inner, border);
        break;
    }
  }
}

function drawSolidStroke(
  g: PixiGraphics,
  inner: BorderBoxInnerBounds,
  border: BorderConfig
): void {
  if (inner.radius > 0) {
    g.roundRect(inner.x, inner.y, inner.width, inner.height, inner.radius);
  } else {
    g.rect(inner.x, inner.y, inner.width, inner.height);
  }
  g.stroke({ width: border.width, color: border.color, alpha: border.alpha });
}

// dashed, dotted, double 구현은 기존 BoxSprite.tsx 로직 활용
// inner bounds 기준으로 수정
```

### 0.3 의존성 그래프 (순환 참조 방지)

```
styleConverter.ts (독립)
       ↓
paddingUtils.ts (styleConverter만 import)
       ↓
borderUtils.ts (styleConverter만 import)
       ↓
graphicsUtils.ts (borderUtils import)
```

**규칙**: 같은 레벨 또는 하위 레벨만 import 가능

---

## Phase 1: 유틸리티 구현 및 테스트

### 1.1 파일 생성 (이동 없음)

| 작업 | 파일 |
|------|------|
| 신규 | `utils/borderUtils.ts` |
| 신규 | `utils/graphicsUtils.ts` |
| 수정 | `utils/index.ts` (export 추가) |

**중요**: `styleConverter.ts`, `paddingUtils.ts`는 **이동하지 않음**
- import 경로 변경 최소화
- 기존 코드 호환성 유지

### 1.2 Unit Test 작성

```typescript
// __tests__/borderUtils.test.ts

describe('getBorderBoxInnerBounds', () => {
  it('borderWidth 0이면 원본 크기 유지', () => {
    const result = getBorderBoxInnerBounds(100, 50, 0, 8);
    expect(result).toEqual({ x: 0, y: 0, width: 100, height: 50, radius: 8 });
  });

  it('borderWidth 4이면 offset 2 적용', () => {
    const result = getBorderBoxInnerBounds(100, 50, 4, 8);
    expect(result).toEqual({ x: 2, y: 2, width: 96, height: 46, radius: 6 });
  });

  it('radius < offset이면 radius 0', () => {
    const result = getBorderBoxInnerBounds(100, 50, 20, 8);
    expect(result.radius).toBe(0); // 8 - 10 = -2 → 0
  });

  it('width/height 음수 방지', () => {
    const result = getBorderBoxInnerBounds(10, 10, 20, 0);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });
});
```

### 1.3 검증

- [ ] `npm run type-check` 통과
- [ ] `npm run test` 통과 (새 테스트 포함)
- [ ] 순환 의존성 없음 확인

---

## Phase 2: Sprite 컴포넌트 적용

### 2.1 적용 순서 (의존성 낮은 순)

| 순서 | 파일 | 복잡도 | 이유 |
|------|------|--------|------|
| 1 | `BoxSprite.tsx` | 낮음 | 가장 단순, 기준 구현 |
| 2 | `TextSprite.tsx` | 낮음 | BoxSprite와 유사 |
| 3 | `ImageSprite.tsx` | 낮음 | 배경만 있음 |
| 4 | `BodyLayer.tsx` | 낮음 | 단순 배경 |

### 2.2 BoxSprite.tsx 수정 예시

```typescript
// Before
const draw = useCallback((g: PixiGraphics) => {
  g.clear();
  const radius = typeof borderRadius === 'number' ? borderRadius : 0;

  if (radius > 0) {
    g.roundRect(0, 0, transform.width, transform.height, radius);
  } else {
    g.rect(0, 0, transform.width, transform.height);
  }
  g.fill({ color: fill.color, alpha: fill.alpha });

  // stroke 로직...
}, [...]);

// After
import { drawBox, type DrawBoxOptions } from '../utils/graphicsUtils';
import { parseBorderConfig } from '../utils/borderUtils';

const borderConfig = useMemo(
  () => parseBorderConfig(style),
  [style]
);

const draw = useCallback((g: PixiGraphics) => {
  drawBox(g, {
    width: transform.width,
    height: transform.height,
    backgroundColor: fill.color,
    backgroundAlpha: fill.alpha,
    border: borderConfig,
  });
}, [transform.width, transform.height, fill, borderConfig]);
```

### 2.3 기존 borderStyle 로직 마이그레이션

`BoxSprite.tsx`의 `drawDashedBorder()`, `drawDottedBorder()`, `drawDoubleBorder()` 함수를
`graphicsUtils.ts`로 이동하고 border-box offset 적용.

### 2.4 검증

- [ ] 각 컴포넌트 수정 후 시각적 테스트
- [ ] border 있는 요소가 겹치지 않음 확인
- [ ] borderRadius 0, 작은 값, 큰 값 테스트

---

## Phase 3: @pixi/ui 컴포넌트 적용

### 3.1 적용 대상 (8개)

| 파일 | 현재 방식 | 수정 방향 |
|------|-----------|-----------|
| `PixiButton.tsx` | `createButtonGraphics()` | `drawBox()` 사용 |
| `PixiCheckbox.tsx` | 직접 Graphics | `drawBox()` 사용 |
| `PixiRadio.tsx` | 직접 Graphics (circle) | `drawCircle()` 추가 필요 |
| `PixiInput.tsx` | 직접 Graphics | `drawBox()` 사용 |
| `PixiSelect.tsx` | 직접 Graphics | `drawBox()` 사용 |
| `PixiList.tsx` | 직접 Graphics | `drawBox()` 사용 |
| `PixiScrollBox.tsx` | 직접 Graphics | `drawBox()` 사용 |
| `PixiSlider.tsx` | 핸들 (circle) | `drawCircle()` 사용 |

### 3.2 Circle 유틸리티 추가

```typescript
// utils/graphicsUtils.ts

export interface DrawCircleOptions {
  x: number;
  y: number;
  radius: number;
  backgroundColor?: number;
  backgroundAlpha?: number;
  border?: {
    width: number;
    color: number;
    alpha?: number;
  } | null;
}

/**
 * border-box 방식으로 Circle 그리기
 */
export function drawCircle(g: PixiGraphics, options: DrawCircleOptions): void {
  const { x, y, radius, backgroundColor = 0xffffff, backgroundAlpha = 1, border } = options;
  const borderWidth = border?.width ?? 0;

  // border-box: 실제 반지름은 border 포함
  const innerRadius = Math.max(0, radius - borderWidth / 2);

  g.circle(x, y, innerRadius);
  g.fill({ color: backgroundColor, alpha: backgroundAlpha });

  if (border && borderWidth > 0) {
    g.circle(x, y, innerRadius);
    g.stroke({ width: borderWidth, color: border.color, alpha: border.alpha ?? 1 });
  }
}
```

### 3.3 PixiButton 호환성

**문제**: PixiButton은 variant/size preset 기반으로 색상/패딩 결정
**해결**: `drawBox()` 사용하되, 색상은 기존 로직 유지

```typescript
// PixiButton.tsx 수정
import { drawBox } from '../utils/graphicsUtils';

function createButtonGraphics(...): PixiGraphicsClass {
  const graphics = new PixiGraphicsClass();

  drawBox(graphics, {
    width,
    height,
    backgroundColor,
    backgroundAlpha: options?.alpha ?? 1,
    border: options?.borderColor ? {
      width: options?.borderWidth ?? 1,
      color: options.borderColor,
      alpha: 1,
      style: 'solid',
      radius: borderRadius,
    } : null,
  });

  return graphics;
}
```

---

## Phase 4: Auto-size 통합 (선택적)

### 4.1 현재 중복

| 위치 | 용도 |
|------|------|
| `PixiButton.tsx:218-239` | 버튼 텍스트 크기 측정 |
| `LayoutEngine.ts:328-400` | Yoga 레이아웃용 텍스트 크기 |

### 4.2 통합 방안

```typescript
// utils/textMeasure.ts

export interface TextMeasureOptions {
  text: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  letterSpacing?: number;
}

export interface TextMeasureResult {
  width: number;
  height: number;
}

/**
 * PixiJS CanvasTextMetrics로 텍스트 크기 측정
 */
export function measureText(options: TextMeasureOptions): TextMeasureResult {
  const textStyle = new TextStyle({
    fontSize: options.fontSize,
    fontFamily: options.fontFamily || 'Pretendard, sans-serif',
    fontWeight: options.fontWeight || 'normal',
    fontStyle: options.fontStyle || 'normal',
    letterSpacing: options.letterSpacing || 0,
  });

  const metrics = CanvasTextMetrics.measureText(options.text, textStyle);

  return {
    width: metrics.width,
    height: metrics.height,
  };
}

/**
 * padding과 border를 포함한 자동 크기 계산
 */
export interface AutoSizeOptions extends TextMeasureOptions {
  padding: { top: number; right: number; bottom: number; left: number };
  borderWidth?: number;
  minWidth?: number;
  minHeight?: number;
}

export function calculateAutoSize(options: AutoSizeOptions): { width: number; height: number } {
  const textSize = measureText(options);
  const borderWidth = options.borderWidth ?? 0;

  const width = Math.max(
    options.minWidth ?? 0,
    options.padding.left + borderWidth + textSize.width + borderWidth + options.padding.right
  );

  const height = Math.max(
    options.minHeight ?? 0,
    options.padding.top + borderWidth + textSize.height + borderWidth + options.padding.bottom
  );

  return { width, height };
}
```

### 4.3 적용 (Phase 4는 선택적)

- PixiButton, LayoutEngine에서 공통 함수 사용
- 기존 동작과 100% 호환되도록 기본값 조정

---

## 검증 체크리스트

### Phase 0 검증
- [ ] `npm run type-check` 통과
- [ ] 순환 의존성 없음 (`madge` 또는 수동 확인)
- [ ] Unit test 통과

### Phase 1 검증
- [ ] `utils/borderUtils.ts` 테스트 통과
- [ ] `utils/graphicsUtils.ts` 테스트 통과

### Phase 2 검증
- [ ] BoxSprite border가 요소 안쪽으로 그려짐
- [ ] TextSprite border 정상
- [ ] ImageSprite border 정상
- [ ] borderRadius 0/작은값/큰값 정상

### Phase 3 검증
- [ ] PixiButton variant별 정상 렌더링
- [ ] PixiCheckbox 체크 상태 정상
- [ ] PixiRadio 선택 상태 정상
- [ ] PixiSlider 핸들 크기 정상

### 회귀 테스트
- [ ] 기존 저장된 프로젝트 열기 테스트
- [ ] 새 요소 추가 후 렌더링 테스트
- [ ] Yoga 레이아웃 계산 결과 동일

---

## 파일 변경 요약

| 구분 | 파일 수 | 내용 |
|------|---------|------|
| 신규 | 3 | `borderUtils.ts`, `graphicsUtils.ts`, `textMeasure.ts` |
| 수정 | 12 | sprites(4), ui(8) |
| 이동 | 0 | ❌ 파일 이동 없음 (호환성) |
| 테스트 | 3 | 각 유틸리티 테스트 파일 |

---

## 롤백 계획

문제 발생 시:
1. `graphicsUtils.ts`의 `drawBox()` 내부에서 border-box offset 제거
2. 또는 feature flag로 border-box 비활성화

```typescript
// graphicsUtils.ts
const ENABLE_BORDER_BOX = true; // false로 변경하면 기존 동작

export function drawBox(g: PixiGraphics, options: DrawBoxOptions): void {
  // ...
  if (border && ENABLE_BORDER_BOX) {
    const inner = getBorderBoxInnerBounds(...);
    // border-box 방식
  } else if (border) {
    // 기존 방식 (stroke at edge)
  }
}
```

---

## v1 대비 주요 변경점

| 항목 | v1 | v2 |
|------|----|----|
| Yoga `setBorder()` | 사용 | ❌ 사용 안함 |
| 파일 이동 | sprites → utils | ❌ 이동 없음 |
| Import 변경 | 20개+ | 12개 |
| borderRadius 처리 | 미고려 | `getSafeBorderRadius()` |
| 테스트 | 미포함 | Unit test 필수 |
| 롤백 계획 | 없음 | Feature flag |
