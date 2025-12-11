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
└── grid/                   # 그리드/줌 시스템
    ├── GridLayer.tsx
    ├── useZoomPan.ts
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

## 성능 최적화

### 권장 사항

1. **useMemo 활용**: 스타일 변환 결과 메모이제이션
2. **RequestAnimationFrame**: 애니메이션에 RAF 사용
3. **요소 수 제한**: 1000+ 요소 시 가상 스크롤 고려
4. **텍스처 캐싱**: 반복 사용 이미지 캐싱

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
