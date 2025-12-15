# Canvas Border-Box Implementation Plan

> CSS `box-sizing: border-box` 동작을 PixiJS Canvas에 구현하는 계획

## 배경

현재 PixiJS Canvas에서 border가 요소 바깥으로 그려져 레이아웃이 겹치는 문제가 있음.
CSS의 `box-sizing: border-box` 동작을 구현하여 border가 요소 안쪽으로 그려지도록 수정 필요.

## 목표

1. **border-box 렌더링**: stroke가 요소 안쪽으로 그려지도록 수정
2. **Yoga 레이아웃 연동**: `node.setBorder()` 호출로 레이아웃 계산에 border 포함
3. **텍스트 자동 크기**: 텍스트 + padding + border 기반 자동 크기 계산 (PixiButton 외 컴포넌트 확장)
4. **코드 구조 최적화**: 공통 유틸리티로 중복 제거

---

## Phase 1: 구조 리팩토링 및 공통 유틸리티

### 1.1 파일 이동

| From | To | 파일 |
|------|-----|------|
| `sprites/styleConverter.ts` | `utils/styleConverter.ts` | CSS → PixiJS 변환 |
| `sprites/paddingUtils.ts` | `utils/paddingUtils.ts` | padding 파싱 |

### 1.2 신규 파일 생성

**`utils/graphicsUtils.ts`**

```typescript
// border-box 방식 Graphics 유틸리티

export interface BoxOptions {
  width: number;
  height: number;
  borderRadius?: number;
  backgroundColor?: number;
  backgroundAlpha?: number;
  borderWidth?: number;
  borderColor?: number;
  borderAlpha?: number;
}

export interface CircleOptions {
  x: number;
  y: number;
  radius: number;
  backgroundColor?: number;
  backgroundAlpha?: number;
  borderWidth?: number;
  borderColor?: number;
}

export interface AutoSizeOptions {
  text: string;
  fontSize: number;
  fontFamily?: string;
  padding: { top: number; right: number; bottom: number; left: number };
  borderWidth?: number;
  minWidth?: number;
  minHeight?: number;
}

// border-box 방식으로 Box 그리기
export function drawBox(g: PixiGraphics, options: BoxOptions): void;

// border-box 방식으로 Circle 그리기
export function drawCircle(g: PixiGraphics, options: CircleOptions): void;

// 텍스트 기반 자동 크기 계산
export function calculateAutoSize(options: AutoSizeOptions): { width: number; height: number };
```

### 1.3 paddingUtils.ts 확장

```typescript
// 기존
export function parsePadding(style): PaddingValues;
export function getContentBounds(width, height, padding): ContentBounds;

// 신규 추가
export function parseBorder(style): number;
export function getContentBoundsWithBorder(width, height, padding, borderWidth): ContentBounds;
```

### 1.4 utils/index.ts 업데이트

```typescript
export * from './styleConverter';
export * from './paddingUtils';
export * from './graphicsUtils';
export * from './cssVariableReader';
export * from './gpuProfilerCore';
```

### 1.5 Import 경로 수정

모든 파일에서 import 경로 업데이트:
- `from './styleConverter'` → `from '../utils/styleConverter'`
- `from './paddingUtils'` → `from '../utils/paddingUtils'`

**영향 파일 (20개+)**:
- sprites/BoxSprite.tsx, TextSprite.tsx, ImageSprite.tsx
- ui/PixiButton.tsx 외 11개
- layers/BodyLayer.tsx
- layout/LayoutEngine.ts, GridLayout.tsx

---

## Phase 2: border-box 렌더링 적용

### 2.1 Sprite 컴포넌트 (4개)

| 파일 | 수정 내용 |
|------|-----------|
| `BoxSprite.tsx` | `drawBox()` 사용으로 교체 |
| `TextSprite.tsx` | `drawBox()` 사용으로 교체 |
| `ImageSprite.tsx` | `drawBox()` 사용으로 교체 |
| `BodyLayer.tsx` | `drawBox()` 사용으로 교체 |

### 2.2 @pixi/ui 컴포넌트 (8개)

| 파일 | 수정 내용 |
|------|-----------|
| `PixiButton.tsx` | `createButtonGraphics()` → `drawBox()` |
| `PixiCheckbox.tsx` | 직접 Graphics → `drawBox()` |
| `PixiRadio.tsx` | 직접 Graphics → `drawCircle()` |
| `PixiInput.tsx` | 직접 Graphics → `drawBox()` |
| `PixiSelect.tsx` | 직접 Graphics → `drawBox()` |
| `PixiList.tsx` | 직접 Graphics → `drawBox()` |
| `PixiScrollBox.tsx` | 직접 Graphics → `drawBox()` |
| `PixiSlider.tsx` | 핸들 → `drawCircle()` |

### 2.3 LayoutEngine.ts border 지원

```typescript
// 기존
node.setPadding(Edge.Top, padding.top);

// 추가
const borderWidth = parseBorder(style);
if (borderWidth > 0) {
  node.setBorder(Edge.All, borderWidth);
}
```

---

## Phase 3: 텍스트 자동 크기 확장

현재 `PixiButton`만 텍스트 기반 자동 크기 계산이 구현됨.
다른 컴포넌트에도 확장 적용.

### 3.1 적용 대상 (7개)

| 컴포넌트 | 텍스트 소스 |
|----------|-------------|
| `PixiFancyButton.tsx` | label/text |
| `PixiCheckbox.tsx` | label |
| `PixiRadio.tsx` | label |
| `PixiInput.tsx` | placeholder (min-width) |
| `PixiSelect.tsx` | 선택값 |
| `PixiList.tsx` | 아이템 텍스트 |
| `PixiSwitcher.tsx` | 탭 텍스트 |

### 3.2 공통 패턴

```typescript
import { calculateAutoSize } from '../utils/graphicsUtils';

// width/height가 auto일 때
if (isWidthAuto || isHeightAuto) {
  const autoSize = calculateAutoSize({
    text: labelText,
    fontSize,
    fontFamily,
    padding: { top, right, bottom, left },
    borderWidth,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
  });

  if (isWidthAuto) width = autoSize.width;
  if (isHeightAuto) height = autoSize.height;
}
```

---

## 검증 체크리스트

### Phase 1 검증
- [ ] `npm run type-check` 통과
- [ ] 모든 import 경로 정상 작동
- [ ] 기존 기능 regression 없음

### Phase 2 검증
- [ ] border가 요소 안쪽으로 그려짐
- [ ] border 있는 요소들이 겹치지 않음
- [ ] Yoga 레이아웃에 border 반영됨

### Phase 3 검증
- [ ] 텍스트 기반 자동 크기 정상 작동
- [ ] padding + border + text 크기 정확히 계산
- [ ] 명시적 width/height 설정 시 자동 크기 무시

---

## 파일 변경 요약

| 구분 | 파일 수 | 내용 |
|------|---------|------|
| 신규 | 1 | `utils/graphicsUtils.ts` |
| 이동 | 2 | styleConverter, paddingUtils |
| 수정 | 14+ | sprites(4), ui(8), layers(1), layout(1) |
| import 수정 | 20+ | 경로 변경 |

---

## 일정

| Phase | 작업 | 예상 |
|-------|------|------|
| Phase 1 | 구조 리팩토링 | 파일 이동 + 유틸리티 생성 |
| Phase 2 | border-box 적용 | 12개 컴포넌트 수정 |
| Phase 3 | 자동 크기 확장 | 7개 컴포넌트 수정 |

---

## 참고

### CSS box-sizing: border-box 동작

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
