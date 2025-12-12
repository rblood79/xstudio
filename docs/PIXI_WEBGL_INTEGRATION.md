# PixiJS WebGL Integration

> Phase 10-11: PixiJS 기반 Figma-like WebGL 캔버스 구현

## 개요

xstudio의 WebGL 기반 캔버스 시스템은 React + PixiJS v8를 사용하여 고성능 2D 렌더링을 제공합니다.

## 설치된 라이브러리

```bash
npm install pixi.js@^8.14.3 @pixi/react@^8.0.5 @pixi/layout@^3.2.0 @pixi/ui@^2.3.2
```

| 패키지 | 버전 | 설명 |
|--------|------|------|
| `pixi.js` | ^8.14.3 | PixiJS 코어 (2D WebGL 렌더링) |
| `@pixi/react` | ^8.0.5 | React 통합 (선언적 렌더링) |
| `@pixi/layout` | ^3.2.0 | Yoga 기반 Flexbox 레이아웃 |
| `@pixi/ui` | ^2.3.2 | UI 컴포넌트 (Button, Checkbox, etc.) |

## 아키텍처

```
src/builder/workspace/canvas/
├── BuilderCanvas.tsx       # 메인 WebGL 캔버스
├── canvasSync.ts           # 캔버스 상태 동기화 Store
├── layout/                 # 레이아웃 시스템
│   ├── FlexLayout.tsx      # @pixi/layout Flexbox
│   ├── GridLayout.tsx      # 커스텀 CSS Grid
│   └── index.ts
├── ui/                     # UI 컴포넌트 래퍼
│   ├── PixiButton.tsx      # @pixi/ui Button
│   ├── PixiCheckbox.tsx    # @pixi/ui CheckBox
│   ├── PixiRadio.tsx       # @pixi/ui RadioGroup
│   └── index.ts
├── sprites/                # 스프라이트 렌더러
│   ├── ElementSprite.tsx   # 메인 디스패처
│   ├── BoxSprite.tsx       # Box/Container
│   ├── TextSprite.tsx      # 텍스트
│   ├── ImageSprite.tsx     # 이미지
│   ├── styleConverter.ts   # CSS → PixiJS 변환
│   └── index.ts
├── selection/              # 선택 시스템
│   ├── SelectionLayer.tsx
│   ├── SelectionBox.tsx
│   ├── TransformHandle.tsx
│   └── ...
├── viewport/               # 뷰포트 컨트롤 (Phase 12 B3.2)
│   ├── ViewportController.ts   # Container 직접 조작
│   ├── useViewportControl.ts   # React hook
│   ├── ViewportControlBridge.tsx
│   └── index.ts
└── grid/                   # 그리드/줌 시스템
    ├── GridLayer.tsx
    ├── useZoomPan.ts       # (레거시, ViewportController로 대체)
    └── index.ts
```

## Phase 10: 기본 WebGL 캔버스 (완료)

### B1.1 BuilderCanvas
- PixiJS Application 초기화
- Feature flag 기반 WebGL/iframe 전환
- WebGL context loss 복구

### B1.2 ElementSprite
- Element tag 기반 스프라이트 타입 감지
- BoxSprite, TextSprite, ImageSprite
- CSS → PixiJS 스타일 변환

### B1.3 SelectionLayer
- 요소 선택 오버레이
- 라쏘 선택
- Transform 핸들

### B1.4 GridLayer
- 그리드 표시
- Zoom/Pan 인터랙션

### B1.5 TextEditOverlay
- 인라인 텍스트 편집

## Phase 11: 레이아웃 & UI (완료)

### B2.1 패키지 설치
```bash
npm install @pixi/layout@^3.2.0 @pixi/ui@^2.3.2
```

### B2.2 FlexLayout (@pixi/layout)

Yoga 엔진 기반 Flexbox 레이아웃:

```tsx
import { FlexLayout, isFlexContainer, convertToPixiLayout } from './layout';

// Element가 Flex 컨테이너인지 확인
if (isFlexContainer(element)) {
  // CSS 스타일을 @pixi/layout 설정으로 변환
  const layoutConfig = convertToPixiLayout(element.props.style);
  // layoutConfig: { flexDirection, justifyContent, alignItems, gap, ... }
}
```

지원 속성:
- `flexDirection`: row | row-reverse | column | column-reverse
- `flexWrap`: nowrap | wrap | wrap-reverse
- `justifyContent`: flex-start | flex-end | center | space-between | space-around | space-evenly
- `alignItems`: flex-start | flex-end | center | stretch | baseline
- `gap`, `rowGap`, `columnGap`
- `flex`, `flexGrow`, `flexShrink`, `flexBasis`

### B2.3 GridLayout (커스텀)

CSS Grid 파싱 및 위치 계산:

```tsx
import { GridLayout, isGridContainer, parseGridTemplate } from './layout';

// Grid 트랙 파싱
const columns = parseGridTemplate('1fr 2fr 1fr', 800);
// columns: [{size: 200, unit: 'fr'}, {size: 400, unit: 'fr'}, {size: 200, unit: 'fr'}]

// Grid 영역 파싱
const areas = parseGridTemplateAreas('"header header" "sidebar main"');
// areas: Map { 'header' => {...}, 'sidebar' => {...}, 'main' => {...} }
```

지원 속성:
- `gridTemplateColumns`, `gridTemplateRows`
- `gridTemplateAreas`
- `gap`, `rowGap`, `columnGap`
- `gridColumn`, `gridRow`, `gridArea`
- `repeat()`, `minmax()` 함수

### B2.4 PixiUI 컴포넌트

@pixi/ui 래퍼 컴포넌트:

```tsx
import { PixiButton, PixiCheckbox, PixiRadio } from './ui';

// Button
<PixiButton element={buttonElement} onClick={handleClick} />

// Checkbox
<PixiCheckbox element={checkboxElement} onChange={handleChange} />

// RadioGroup
<PixiRadio element={radioGroupElement} onChange={handleChange} />
```

지원 태그:
- Button: `Button`, `FancyButton`, `SubmitButton`
- Checkbox: `Checkbox`, `CheckBox`, `Switch`, `Toggle`
- Radio: `RadioGroup`, `Radio`

### B2.5 ElementSprite 확장

Element 타입 감지 확장:

```tsx
type SpriteType = 'box' | 'text' | 'image' | 'button' | 'checkbox' | 'radio' | 'flex' | 'grid';

function getSpriteType(element: Element): SpriteType {
  // UI 컴포넌트
  if (UI_BUTTON_TAGS.has(tag)) return 'button';
  if (UI_CHECKBOX_TAGS.has(tag)) return 'checkbox';
  if (UI_RADIO_TAGS.has(tag)) return 'radio';

  // 레이아웃 컨테이너
  if (isFlexContainer(element)) return 'flex';
  if (isGridContainer(element)) return 'grid';

  // 기본 타입
  if (TEXT_TAGS.has(tag)) return 'text';
  if (IMAGE_TAGS.has(tag)) return 'image';

  return 'box';
}
```

## Phase 12: 안정화 (B3.1~B3.3)

- **B3.1 레이아웃 가드/캐싱**: `layoutCalculator`에 `MAX_LAYOUT_DEPTH`와 `visited` 감시를 추가해 순환 트리로 인한 무한 재귀를 차단하고, 페이지 단위 레이아웃을 한 번만 계산해 Selection/Elements 레이어에서 공유.
- **B3.2 선택/정렬 최적화**: Element 정렬 시 깊이 맵을 메모이즈해 O(n²) 탐색 제거, SelectionLayer가 전달된 레이아웃을 그대로 사용하도록 통합.
- **B3.3 팬/줌 인터랙션 성능**: 팬 드래그를 `requestAnimationFrame`으로 스로틀링하고 드래그 종료 시 플러시하여 상태 업데이트 폭주를 방지. 휠 줌 로그 스팸 제거.

> 메소드 선택: 팬을 드래그 종료 시점에만 동기화하는 방식은 FPS는 높지만 드래그 중 상태 의존 UI(선택 박스 등)와 어긋날 수 있어, rAF 스로틀로 프레임당 업데이트를 유지하는 방식을 채택했습니다.

## 사용 예시

### 기본 캔버스

```tsx
import { BuilderCanvas } from './workspace/canvas/BuilderCanvas';

function Workspace() {
  return (
    <BuilderCanvas
      pageWidth={1920}
      pageHeight={1080}
      backgroundColor={0xf8fafc}
    />
  );
}
```

### Flex 레이아웃 요소

```typescript
// Element with display: flex
const flexContainer: Element = {
  id: 'flex-1',
  tag: 'Flex',
  props: {
    style: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16,
      width: 400,
      height: 100,
    }
  },
  // ...
};
```

### Grid 레이아웃 요소

```typescript
// Element with display: grid
const gridContainer: Element = {
  id: 'grid-1',
  tag: 'Grid',
  props: {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 2fr 1fr',
      gridTemplateRows: 'auto 1fr auto',
      gridTemplateAreas: '"header header header" "sidebar main main" "footer footer footer"',
      gap: 16,
      width: 800,
      height: 600,
    }
  },
  // ...
};
```

### UI 컴포넌트 요소

```typescript
// Button element
const buttonElement: Element = {
  id: 'btn-1',
  tag: 'Button',
  props: {
    children: 'Click Me',
    style: {
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      borderRadius: 8,
      width: 120,
      height: 40,
    }
  },
  // ...
};

// Checkbox element
const checkboxElement: Element = {
  id: 'chk-1',
  tag: 'Checkbox',
  props: {
    label: 'Accept terms',
    isSelected: false,
    style: {
      color: '#000000',
    }
  },
  // ...
};
```

## Feature Flag

WebGL 캔버스는 Feature Flag로 제어됩니다:

```typescript
import { useWebGLCanvas } from '../utils/featureFlags';

const useWebGL = useWebGLCanvas();
// true: WebGL BuilderCanvas 사용
// false: 기존 iframe 캔버스 사용
```

## Phase 12: Layout Calculator & Canvas Resize (완료)

### B3.1 DOM-like Layout Calculator

`src/builder/workspace/canvas/layout/layoutCalculator.ts`

캔버스에서 DOM의 레이아웃 방식을 재현합니다:

#### Block Layout (display: block)
- 수직 스택 배치
- margin, padding 지원
- position: relative/absolute 지원

#### Flexbox Layout (display: flex)
```typescript
// 지원 속성
interface FlexStyle {
  display: 'flex';
  flexDirection: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  gap: number;
}
```

#### 안전 기능
- `MAX_LAYOUT_DEPTH = 1000` - 무한 재귀 방지
- `visited Set` - 순환 참조 감지

### B3.2 Canvas Resize & Viewport (PixiJS 권장 방식)

#### DOM 구조 (최소화)

```
.workspace
└── .canvas-container     ← resizeTo 타겟
    └── canvas            ← PixiJS 생성
```

#### 1. resizeTo 옵션 (자동 리사이즈)

PixiJS 권장 방식으로 `resizeTo` 옵션 사용:

```tsx
// BuilderCanvas.tsx
<Application
  resizeTo={containerEl}     // 컨테이너 크기 자동 추적
  background={backgroundColor}
  antialias={true}
  resolution={window.devicePixelRatio || 1}
  autoDensity={true}
>
```

**장점:**
- ResizeObserver 불필요 (PixiJS 내부 처리)
- CSS transform 해킹 불필요
- 패널 애니메이션 중에도 매끄러운 리사이즈

#### 2. ViewportController (직접 Container 조작)

React 리렌더 없이 팬/줌 처리:

```
src/builder/workspace/canvas/viewport/
├── ViewportController.ts      # 핵심 클래스
├── useViewportControl.ts      # React hook
├── ViewportControlBridge.tsx  # Application 내부 브릿지
└── index.ts
```

```typescript
// ViewportController.ts
class ViewportController {
  private container: Container | null = null;

  // 팬 중: Container 직접 조작 (React state 변경 없음)
  updatePan(clientX: number, clientY: number): void {
    this.container.x += deltaX;
    this.container.y += deltaY;
  }

  // 팬 종료: React state 동기화
  endPan(): void {
    this.options.onStateSync(this.currentState);
  }
}
```

```tsx
// BuilderCanvas.tsx
<Application resizeTo={containerEl}>
  <ViewportControlBridge containerEl={containerEl} />

  {/* Camera - x, y, scale props 제거 (ViewportController가 직접 조작) */}
  <pixiContainer label="Camera" eventMode="static">
    <GridLayer />
    <ElementsLayer />
    <SelectionLayer />
  </pixiContainer>
</Application>
```

#### 성능 비교

| 항목 | useZoomPan (이전) | ViewportController (현재) |
|------|-------------------|---------------------------|
| 팬 중 React 리렌더 | 매 RAF | 없음 |
| 줌 중 React 리렌더 | 매 RAF | 종료 시 1회 |
| Container 업데이트 | React props | 직접 조작 |
| ResizeObserver | 필요 | 불필요 (resizeTo) |

### B3.3 Selection System 개선

#### SelectionBox (컨테이너 요소)
- 자식이 있는 요소도 SelectionBox 테두리 표시
- Transform 핸들: 단일 선택 시 항상 표시 (컨테이너 포함)
- Move 영역: 컨테이너는 비활성화 (자식 요소 클릭 허용)

```tsx
<SelectionBox
  bounds={selectionBounds}
  showHandles={isSingleSelection}        // 컨테이너도 핸들 표시
  enableMoveArea={!isContainerSelected}  // 컨테이너는 이동 영역 비활성화
/>
```

## 성능 최적화

### 권장 사항

1. **useMemo 활용**: 스타일 변환 결과 메모이제이션
2. **RequestAnimationFrame**: 애니메이션에 RAF 사용
3. **요소 수 제한**: 1000+ 요소 시 가상 스크롤 고려
4. **텍스처 캐싱**: 반복 사용 이미지 캐싱
5. **CSS Transform Resize**: 패널 애니메이션 중 CSS transform 사용

### 성능 모니터링

```typescript
// Chrome DevTools > Performance 탭에서 FPS 확인
// 목표: 60 FPS 유지
```

## 참고 문서

- [PixiJS v8 Docs](https://pixijs.com/8.x/)
- [@pixi/react](https://github.com/pixijs/pixi-react)
- [@pixi/layout](https://layout.pixijs.io/)
- [@pixi/ui Storybook](https://pixijs.io/ui/storybook/)
