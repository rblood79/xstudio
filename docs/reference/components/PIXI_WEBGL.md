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
├── ui/                     # UI 컴포넌트 (Graphics 기반)
│   ├── PixiButton.tsx      # FancyButton + 투명 히트 영역
│   ├── PixiCheckbox.tsx    # Graphics 직접 그리기
│   ├── PixiCheckboxGroup.tsx  # CheckboxGroup (orientation 지원)
│   ├── PixiRadio.tsx       # RadioGroup (orientation 지원)
│   ├── PixiTextField.tsx   # TextField (label + input + description) ✅
│   └── index.ts
├── sprites/                # 스프라이트 렌더러
│   ├── ElementSprite.tsx   # 메인 디스패처
│   ├── BoxSprite.tsx       # Box/Container
│   ├── TextSprite.tsx      # 텍스트
│   ├── ImageSprite.tsx     # 이미지
│   ├── styleConverter.ts   # CSS → PixiJS 변환
│   └── index.ts
├── selection/              # 선택 시스템 (이벤트 + Pixi 모드 렌더링)
│   ├── SelectionLayer.tsx
│   ├── SelectionBox.tsx      # Skia 모드: drawBorder 스킵, moveArea 이벤트만
│   ├── TransformHandle.tsx   # Skia 모드: 투명 히트 영역만
│   ├── LassoSelection.tsx    # Skia 모드: draw 스킵
│   └── ...
├── skia/                   # CanvasKit/Skia WASM 렌더링
│   ├── SkiaOverlay.tsx       # Skia 렌더 루프 + Selection 통합
│   ├── selectionRenderer.ts  # Selection 오버레이 Skia 렌더 함수
│   ├── aiEffects.ts          # AI 생성/완료 이펙트
│   ├── disposable.ts         # CanvasKit 리소스 관리 (SkiaDisposable)
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

> **Skia 모드 (2026-02-01):** `VITE_RENDER_MODE=skia`일 때 Selection 오버레이의 시각적 렌더링은
> `selectionRenderer.ts`를 통해 CanvasKit/Skia 캔버스에서 수행. PixiJS Selection 컴포넌트는
> 투명 히트 영역(`alpha=0.001`)으로만 동작하며, 이벤트 처리(클릭 선택, 드래그, 리사이즈)를 담당.

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

Graphics 기반 UI 컴포넌트 (순수 PixiJS 렌더링):

> **Note**: 초기에는 @pixi/ui를 사용했으나, 렌더링 문제(Checkbox 체크마크 미표시, RadioGroup 빈 화면)로 인해 순수 PixiJS Graphics 기반으로 리팩토링되었습니다. (2025-12-15)

```tsx
import { PixiButton, PixiCheckbox, PixiRadio } from './ui';

// Button - FancyButton 기반 + 투명 히트 영역
<PixiButton element={buttonElement} onClick={handleClick} />

// Checkbox - Graphics 기반 (roundRect + 체크마크 path)
<PixiCheckbox element={checkboxElement} onChange={handleChange} />

// RadioGroup - Graphics 기반 (circle + dot)
<PixiRadio element={radioGroupElement} onChange={handleChange} />
```

지원 태그:
- Button: `Button`, `FancyButton`, `SubmitButton`
- Checkbox: `Checkbox`, `CheckBox`, `Switch`, `Toggle`
- Radio: `RadioGroup`, `Radio`

**렌더링 패턴:**
- **PixiButton**: @pixi/ui FancyButton + 투명 히트 영역 (modifier 키 지원)
- **PixiCheckbox**: Graphics 직접 그리기 (roundRect, lineTo for checkmark)
- **PixiRadio**: Graphics 직접 그리기 (circle, dot) + DEFAULT_OPTIONS placeholder

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

## 스타일 시스템 아키텍처

XStudio의 WebGL 캔버스는 **일관성**과 **커스터마이징**을 분리하는 이중 스타일 시스템을 사용합니다.

### 설계 철학

```
┌─────────────────────────────────────────────────────────────┐
│                    XStudio 스타일 시스템                      │
├──────────────────────┬──────────────────────────────────────┤
│   일관성 (Semantic)   │   커스터마이징 (Inline)               │
│   variant, size      │   style: { ... }                     │
├──────────────────────┼──────────────────────────────────────┤
│   디자인 시스템 준수    │   개별 요소 세부 조정                 │
│   브랜드 일관성 유지    │   특수 케이스 대응                    │
├──────────────────────┴──────────────────────────────────────┤
│              우선순위: style > variant/size                  │
└─────────────────────────────────────────────────────────────┘
```

### Props vs Style 분리

```typescript
// Element 데이터 구조
interface Element {
  props: {
    // Semantic Props (일관성)
    variant: 'primary' | 'secondary' | 'outline' | ...;  // 디자인 시스템
    size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';               // 크기 프리셋

    // Inline Style (커스터마이징)
    style: {
      backgroundColor: '#custom',  // variant 오버라이드 가능
      padding: '20px',             // size 오버라이드 가능
      ...
    }
  }
}
```

### LayoutEngine의 Semantic Props 처리

Button 등 UI 컴포넌트는 `size` prop에 따른 preset을 사용합니다:

```typescript
// LayoutEngine.ts - Button Size Presets (Button.css와 동기화)
const BUTTON_SIZE_PRESETS: Record<string, ButtonSizePreset> = {
  xs: { fontSize: 10, paddingX: 8,  paddingY: 2 },
  sm: { fontSize: 14, paddingX: 12, paddingY: 4 },
  md: { fontSize: 16, paddingX: 24, paddingY: 8 },
  lg: { fontSize: 18, paddingX: 32, paddingY: 12 },
  xl: { fontSize: 20, paddingX: 40, paddingY: 16 },
};

// measureTextSize()에서 우선순위 적용
function measureTextSize(element, style) {
  const isButton = element.tag === 'Button' || element.tag === 'SubmitButton';
  const buttonSize = isButton ? getButtonSizePadding(element) : null;

  // fontSize: inline style > size preset > 기본값
  const fontSize = parseCSSValue(style?.fontSize, buttonSize?.fontSize ?? 16);

  // padding: inline style 우선, 없으면 size preset
  if (buttonSize && !hasInlinePadding) {
    paddingX = buttonSize.paddingX;
    paddingY = buttonSize.paddingY;
  }
}
```

### 우선순위 동작 예시

| 설정 | 적용되는 패딩 | 담당 |
|------|-------------|------|
| `size="md"` | 8px 24px | 일관성 (semantic) |
| `size="md"` + `style: { padding: '20px' }` | 20px | 커스터마이징 (inline) |
| `size="lg"` | 12px 32px | 일관성 (semantic) |
| `size="lg"` + `style: { paddingLeft: '50px' }` | 12px 32px 12px 50px | 혼합 |

### PixiButton의 Variant 처리 (동적 테마 색상)

기존 하드코딩된 `VARIANT_COLORS`는 테마 변경에 반응하지 않는 문제가 있었습니다.
**2025-12-15 업데이트**: CSS 변수를 동적으로 읽어 테마 변경에 실시간 반응하도록 개선.

#### 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    동적 테마 색상 시스템                       │
├─────────────────────────────────────────────────────────────┤
│  CSS 변수                    → cssVariableReader.ts          │
│  (--primary, --secondary)   → hex 숫자 변환                  │
├─────────────────────────────────────────────────────────────┤
│  MutationObserver           → useThemeColors.ts             │
│  (data-theme 변경 감지)      → state 업데이트                 │
├─────────────────────────────────────────────────────────────┤
│  React Component            → PixiButton.tsx                │
│  (useThemeColors hook)      → FancyButton 재생성             │
└─────────────────────────────────────────────────────────────┘
```

#### cssVariableReader.ts

```typescript
// CSS 변수를 런타임에 읽어 PixiJS hex로 변환
export function getM3ButtonColors(): M3ButtonColors {
  const primary = cssColorToHex(getCSSVariable('--primary'), FALLBACK_COLORS.primary);
  const onPrimary = cssColorToHex(getCSSVariable('--on-primary'), FALLBACK_COLORS.onPrimary);
  // ... 모든 M3 토큰

  return {
    primaryBg: primary,
    primaryBgHover: mixWithBlack(primary, 92),   // M3 Hover = 92% + 8% black
    primaryBgPressed: mixWithBlack(primary, 88), // M3 Pressed = 88% + 12% black
    primaryText: onPrimary,
    // outline/ghost는 bgAlpha: 0 (투명 배경)
    outlineBg: 0xffffff,
    outlineBgHover: mixWithWhite(primary, 8),    // 8% primary + 92% white
    ghostBgAlpha: 0,
    // ...
  };
}

// variant별 색상 매핑
export function getVariantColors(variant: string, colors: M3ButtonColors) {
  switch (variant) {
    case 'primary': return { bg: colors.primaryBg, bgHover: colors.primaryBgHover, ... };
    case 'outline': return { bg: colors.outlineBg, bgAlpha: 0, border: colors.outlineBorder, ... };
    // ...
  }
}
```

#### useThemeColors.ts

```typescript
// MutationObserver로 테마 변경 감지
export function useThemeColors(): M3ButtonColors {
  const [colors, setColors] = useState(() => getM3ButtonColors());

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'data-theme' ||
            mutation.attributeName === 'data-builder-theme') {
          requestAnimationFrame(() => setColors(getM3ButtonColors()));
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-builder-theme', 'class'],
    });

    // prefers-color-scheme 미디어 쿼리도 감시
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => { observer.disconnect(); mediaQuery.removeEventListener(...); };
  }, []);

  return colors;
}
```

#### PixiButton.tsx

```typescript
// 동적 테마 색상 사용
const themeColors = useThemeColors();

const variantColors = useMemo(() => {
  const variant = props?.variant || 'default';
  return getVariantColors(variant, themeColors);
}, [props?.variant, themeColors]);

// getButtonLayout()에서 우선순위 적용
const layout = useMemo(() => {
  return getButtonLayout(style, props || {}, buttonText, variantColors);
}, [style, props, buttonText, variantColors]);

function getButtonLayout(style, buttonProps, buttonText, variantColors) {
  // 색상: inline style > variant (동적)
  const hasInlineBg = style?.backgroundColor !== undefined;
  const backgroundColor = hasInlineBg
    ? cssColorToHex(style?.backgroundColor)
    : variantColors.bg;
}
```

#### 테마 변경 흐름

1. 사용자가 테마 토글 클릭
2. `document.documentElement`에 `data-theme="dark"` 설정
3. `MutationObserver`가 변경 감지 (`useThemeColors`)
4. `getM3ButtonColors()` 호출 → CSS 변수 다시 읽기
5. React state 업데이트 → PixiButton 리렌더링
6. `FancyButton` Graphics 재생성 (새 색상 적용)

### Skia 폴백 렌더링의 Variant 색상 매핑 (2026-02-02)

`VITE_RENDER_MODE=skia`일 때 PixiButton/PixiCheckbox 등 UI 컴포넌트는 PixiJS FancyButton 대신
`ElementSprite.tsx`의 Skia 폴백 경로에서 렌더링된다. 이 경로에서는 CSS 변수 대신
하드코딩된 M3 Light Mode 색상 매핑 테이블을 사용한다.

**배경색 매핑 (`VARIANT_BG_COLORS`):**

| variant | 배경색 hex | alpha | M3 Role |
|---------|----------|-------|---------|
| default | `#ece6f0` | 1 | surface-container-high |
| primary | `#6750a4` | 1 | primary |
| secondary | `#625b71` | 1 | secondary |
| tertiary | `#7d5260` | 1 | tertiary |
| error | `#b3261e` | 1 | error |
| surface | `#e6e0e9` | 1 | surface-container-highest |
| outline | `#fef7ff` | 0 | surface (투명) |
| ghost | `#fef7ff` | 0 | surface (투명) |

**테두리색 매핑 (`VARIANT_BORDER_COLORS`):**

| variant | 테두리색 hex | M3 Role |
|---------|-----------|---------|
| default | `#cac4d0` | outline-variant |
| primary | `#6750a4` | primary |
| secondary | `#625b71` | secondary |
| tertiary | `#7d5260` | tertiary |
| error | `#b3261e` | error |
| surface | `#cac4d0` | outline-variant |
| outline | `#79747e` | outline |
| ghost | — | 테두리 없음 |

**우선순위:** `inline style.backgroundColor > VARIANT_BG_COLORS[variant] > 기본값(0xece6f0)`

> **참조:** `ElementSprite.tsx`의 `VARIANT_BG_COLORS`, `VARIANT_BG_ALPHA`, `VARIANT_BORDER_COLORS` 상수.
> PixiJS hybrid 모드에서는 기존 `cssVariableReader.ts` → `useThemeColors` 경로가 사용된다.

### 핵심 원칙

1. **Semantic Props (`variant`, `size`)**: 디자인 시스템 토큰 적용, 일관성 보장
2. **Inline Style (`style: {}`)**: 개별 커스터마이징, Semantic Props 오버라이드 가능
3. **우선순위**: `style > semantic props > 기본값`
4. **동기화**: `LayoutEngine.ts`, `PixiButton.tsx`, `ElementSprite.tsx`, `Button.css` 간 값 동기화 유지

---

## Phase 12: 안정화 (B3.1~B3.4)

- **B3.1 레이아웃 가드/캐싱**: `layoutCalculator`에 `MAX_LAYOUT_DEPTH`와 `visited` 감시를 추가해 순환 트리로 인한 무한 재귀를 차단하고, 페이지 단위 레이아웃을 한 번만 계산해 Selection/Elements 레이어에서 공유.
- **B3.2 선택/정렬 최적화**: Element 정렬 시 깊이 맵을 메모이즈해 O(n²) 탐색 제거, SelectionLayer가 전달된 레이아웃을 그대로 사용하도록 통합.
- **B3.3 팬/줌 인터랙션 성능**: 팬 드래그를 `requestAnimationFrame`으로 스로틀링하고 드래그 종료 시 플러시하여 상태 업데이트 폭주를 방지. 휠 줌 로그 스팸 제거.
- **B3.4 Figma-style Zoom-Independent UI** (2025-12-15):
  - Selection Box, Transform Handle, Lasso Selection, Canvas Bounds가 zoom에 관계없이 화면상 동일한 크기 유지
  - Inverse-scaling 기법: `strokeWidth = 1 / zoom`, `handleSize = HANDLE_SIZE / zoom`
  - 14개 컴포넌트에서 개별 선택 테두리 코드 제거, SelectionBox 공통 컴포넌트로 통합

> 메소드 선택: 팬을 드래그 종료 시점에만 동기화하는 방식은 FPS는 높지만 드래그 중 상태 의존 UI(선택 박스 등)와 어긋날 수 있어, rAF 스로틀로 프레임당 업데이트를 유지하는 방식을 채택했습니다.

## 이벤트 처리 패턴 (2025-12-14)

### Modifier 키 처리 (Cmd/Ctrl+클릭)

PixiJS v8의 `FederatedPointerEvent`에서 modifier 키를 추출하는 표준 패턴:

```typescript
const handleClick = useCallback((e: unknown) => {
  // PixiJS FederatedPointerEvent has modifier keys directly
  const pixiEvent = e as {
    metaKey?: boolean;
    shiftKey?: boolean;
    ctrlKey?: boolean;
    nativeEvent?: MouseEvent | PointerEvent;
  };

  // PixiJS v8: 직접 속성 우선, nativeEvent 폴백
  const metaKey = pixiEvent?.metaKey ?? pixiEvent?.nativeEvent?.metaKey ?? false;
  const shiftKey = pixiEvent?.shiftKey ?? pixiEvent?.nativeEvent?.shiftKey ?? false;
  const ctrlKey = pixiEvent?.ctrlKey ?? pixiEvent?.nativeEvent?.ctrlKey ?? false;

  onClick?.(element.id, { metaKey, shiftKey, ctrlKey });
}, [element.id, onClick]);
```

**적용 파일:**
- `BoxSprite.tsx`, `TextSprite.tsx`, `ImageSprite.tsx`
- `PixiButton.tsx`, `BodyLayer.tsx`

### @pixi/ui FancyButton 클릭 처리

`FancyButton.onPress.connect()`는 modifier 키를 제공하지 않습니다. 대신 투명 히트 영역을 사용:

```typescript
// FancyButton 생성 후 이벤트 모드 비활성화
button.eventMode = 'none';

// 투명 히트 영역으로 클릭 처리
const drawHitArea = useCallback((g: PixiGraphicsClass) => {
  g.clear();
  g.rect(0, 0, width, height);
  g.fill({ color: 0xffffff, alpha: 0 });
}, [width, height]);

<pixiGraphics
  draw={drawHitArea}
  eventMode="static"
  cursor="pointer"
  onPointerDown={handleClick}
/>
```

### 좌표 변환 (Screen → Canvas)

줌/팬 상태에서 라쏘 선택 등의 좌표 변환:

```typescript
// BuilderCanvas.tsx - ClickableBackground
const screenToCanvas = useCallback((screenX: number, screenY: number) => {
  return {
    x: (screenX - panOffset.x) / zoom,
    y: (screenY - panOffset.y) / zoom,
  };
}, [zoom, panOffset]);

// 사용
const handlePointerDown = useCallback((e: { global: { x: number; y: number } }) => {
  const canvasPos = screenToCanvas(e.global.x, e.global.y);
  onLassoStart?.(canvasPos);
}, [onLassoStart, screenToCanvas]);
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
├── ViewportController.ts      # 핵심 클래스 (싱글톤)
├── useViewportControl.ts      # React hook (싱글톤 사용)
├── ViewportControlBridge.tsx  # Application 내부 브릿지
└── index.ts
```

**싱글톤 패턴**: `getViewportController()`로 단일 인스턴스를 관리합니다. `useViewportControl` 훅과 `CanvasScrollbar` 등 외부 컴포넌트가 동일한 인스턴스를 공유하여 상태 동기화를 보장합니다.

```typescript
// ViewportController.ts
class ViewportController {
  private container: Container | null = null;
  private updateListeners: Set<(state: ViewportState) => void> = new Set();

  // 팬 중: Container 직접 조작 (React state 변경 없음)
  updatePan(clientX: number, clientY: number): void {
    this.container.x += deltaX;
    this.container.y += deltaY;
    this.notifyUpdateListeners(); // 스크롤바 등 외부 컴포넌트에 알림
  }

  // 팬 종료: React state 동기화
  endPan(): void {
    this.options.onStateSync(this.currentState);
  }

  // 외부 리스너 등록 (스크롤바, 미니맵 등)
  addUpdateListener(listener): () => void { ... }

  // onStateSync 콜백 지연 바인딩 (싱글톤에서 사용)
  setOnStateSync(callback): void { ... }
}

// 싱글톤 인스턴스
export function getViewportController(options?): ViewportController { ... }
```

```typescript
// useViewportControl.ts — 싱글톤 사용
const controller = useMemo(() => {
  if (!app?.stage) return null;
  return getViewportController({ minZoom, maxZoom }); // 싱글톤 반환
}, [app, minZoom, maxZoom]);

// onStateSync는 지연 바인딩 (싱글톤 생성 후 설정)
useEffect(() => {
  if (controller) controller.setOnStateSync(handleStateSync);
}, [controller, handleStateSync]);
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

#### 외부 리스너 패턴 (스크롤바 연동)

ViewportController의 `addUpdateListener()`를 통해 외부 컴포넌트가 pan/zoom 상태를 실시간으로 추적할 수 있습니다. 상세 설계는 [CANVAS_SCROLLBAR.md](../../CANVAS_SCROLLBAR.md) Phase 1 참조.

```
Pan/Zoom 이벤트 → ViewportController → notifyUpdateListeners()
                                          ├─ CanvasScrollbar (DOM 직접 업데이트)
                                          └─ (향후 미니맵 등 추가 가능)
```

#### 성능 비교

| 항목 | useZoomPan (이전) | ViewportController (현재) |
|------|-------------------|---------------------------|
| 팬 중 React 리렌더 | 매 RAF | 없음 |
| 줌 중 React 리렌더 | 매 RAF | 종료 시 1회 |
| Container 업데이트 | React props | 직접 조작 |
| ResizeObserver | 필요 | 불필요 (resizeTo) |
| 외부 리스너 | 없음 | addUpdateListener() |

### B3.3 Selection System 개선

> **Skia 모드 렌더링 분리 (2026-02-01):** `VITE_RENDER_MODE=skia`일 때 Selection의 시각적 렌더링은
> `canvas/skia/selectionRenderer.ts`에서 CanvasKit API로 수행. PixiJS Selection 컴포넌트는
> 이벤트 처리(클릭, 드래그, 리사이즈)만 담당하며 투명 히트 영역으로 동작.
> Camera 하위 레이어는 `alpha=0`으로 숨김 (`renderable=false` 사용 금지 — EventBoundary 히트 테스팅 비활성화 문제).

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

## Figma-style Zoom-Independent UI (2025-12-15)

### 개요

Figma처럼 줌 레벨에 관계없이 Selection Box, Transform Handle, Lasso Selection, Canvas Bounds가 화면상 동일한 크기를 유지합니다.

### Inverse-Scaling 기법

```typescript
// zoom 레벨의 역수를 사용하여 화면상 일정한 크기 유지
const strokeWidth = 1 / zoom;      // 화면상 항상 1px
const handleSize = 8 / zoom;       // 화면상 항상 8px
```

### 적용 컴포넌트

#### SelectionBox.tsx

```typescript
export const SelectionBox = memo(function SelectionBox({
  bounds,
  zoom = 1,
  // ...
}: SelectionBoxProps) {
  // 줌에 독립적인 선 두께 (화면상 항상 1px)
  const strokeWidth = 1 / zoom;
  const isSkiaMode = getRenderMode() === 'skia';

  const drawBorder = useCallback((g: PixiGraphics) => {
    g.clear();
    if (isSkiaMode) return; // Skia가 Selection 렌더링 담당
    g.setStrokeStyle({ width: strokeWidth, color: SELECTION_COLOR, alpha: 1 });
    g.rect(0, 0, width, height);
    g.stroke();
  }, [width, height, strokeWidth, isSkiaMode]);

  // moveArea: 이벤트용 투명 영역은 모드 무관하게 유지 (alpha: 0.001)
  // TransformHandle에 zoom 전달
  return (
    <>
      <pixiGraphics draw={drawBorder} />
      {showHandles && HANDLES.map((config) => (
        <TransformHandle key={config.position} zoom={zoom} ... />
      ))}
    </>
  );
});
```

#### TransformHandle.tsx

```typescript
const HANDLE_SIZE = 6; // 실제 구현: types.ts에서 6px

export const TransformHandle = memo(function TransformHandle({
  config,
  boundsX, boundsY, boundsWidth, boundsHeight,
  zoom = 1,
  // ...
}: TransformHandleProps) {
  // 줌에 독립적인 핸들 크기
  const cornerSize = HANDLE_SIZE / zoom;
  const strokeWidth = 1 / zoom;
  const isSkiaMode = getRenderMode() === 'skia';

  const draw = useCallback((g: PixiGraphics) => {
    g.clear();
    if (isCorner && isSkiaMode) {
      // Skia 모드: 코너도 투명 히트 영역만 (Skia가 시각적 렌더링 담당)
      g.rect(0, 0, handleW, handleH);
      g.fill({ color: 0x000000, alpha: 0.001 });
      return;
    }
    if (isCorner) {
      // Pixi 모드: 흰색 배경 + 파란 테두리 (시각적으로 표시)
      g.rect(0, 0, handleW, handleH);
      g.fill({ color: HANDLE_FILL_COLOR, alpha: 1 });
      g.setStrokeStyle({ width: strokeWidth, color: HANDLE_STROKE_COLOR, alpha: 1 });
      g.rect(0, 0, handleW, handleH);
      g.stroke();
    } else {
      // 엣지: 투명 히트 영역 (모드 무관)
      g.rect(0, 0, handleW, handleH);
      g.fill({ color: 0x000000, alpha: 0.001 });
    }
  }, [isCorner, handleW, handleH, strokeWidth, isSkiaMode]);
});
```

#### LassoSelection.tsx

```typescript
export const LassoSelection = memo(function LassoSelection({
  start, current, zoom = 1,
}: LassoSelectionProps) {
  const strokeWidth = 1 / zoom;
  const isSkiaMode = getRenderMode() === 'skia';

  const draw = useCallback((g: PixiGraphics) => {
    g.clear();
    if (isSkiaMode) return; // Skia가 Lasso 렌더링 담당
    g.fill({ color: LASSO_COLOR, alpha: LASSO_FILL_ALPHA });
    g.rect(rect.x, rect.y, rect.width, rect.height);
    g.fill();
    g.setStrokeStyle({ width: strokeWidth, color: LASSO_COLOR, alpha: 0.8 });
    g.rect(rect.x, rect.y, rect.width, rect.height);
    g.stroke();
  }, [rect, strokeWidth, isSkiaMode]);
});
```

#### CanvasBounds (BuilderCanvas.tsx)

```typescript
function CanvasBounds({ width, height, zoom = 1 }) {
  useThemeColors();  // 테마 변경 감지
  const strokeWidth = 1 / zoom;

  const draw = useCallback((g: PixiGraphics) => {
    g.clear();
    const outlineColor = getOutlineVariantColor();  // CSS 변수 --outline-variant
    g.setStrokeStyle({ width: strokeWidth, color: outlineColor });
    g.rect(0, 0, w, h);
    g.stroke();
  }, [w, h, strokeWidth]);
}
```

### zoom prop 전달 체인

```
BuilderCanvas
├── CanvasBounds       zoom={zoom}
└── SelectionLayer     zoom={zoom}
    ├── SelectionBox   zoom={zoom}
    │   └── TransformHandle  zoom={zoom}
    └── LassoSelection zoom={zoom}
```

### Skia 모드 렌더 파이프라인 (2026-02-01)

`VITE_RENDER_MODE=skia`일 때 Selection 렌더링은 두 레이어로 분리:

```
[Skia Canvas z:2, pointer-events: none]     [PixiJS Canvas z:3, pointer-events: auto]
├── 디자인 노드 (renderNode)                 ├── 투명 히트 영역 (alpha=0)
├── AI Generating 이펙트                      │   ├── moveArea (alpha:0.001)
├── AI Flash 이펙트                           │   └── corner handles (alpha:0.001)
├── Selection Box (selectionRenderer)   ★    └── 이벤트 처리 (pointerDown 등)
├── Corner Handles (selectionRenderer)  ★
└── Lasso (selectionRenderer)           ★
```

**핵심 파일:**
- `canvas/skia/selectionRenderer.ts` — `renderSelectionBox()`, `renderTransformHandles()`, `renderLasso()`
- `canvas/skia/SkiaOverlay.tsx` — `buildSkiaTreeHierarchical()` + `buildTreeBoundsMap()` + `buildSelectionRenderData()` + renderFrame Phase 4-6

**PixiJS Camera 하위 숨김:** `alpha=0` 사용 (`renderable=false` 금지 — EventBoundary 히트 테스팅 비활성화)

**계층적 Skia 트리 (2026-02-02):** `buildSkiaTreeHierarchical()`가 PixiJS 씬 그래프를 계층적으로 순회하여 부모-자식 상대 좌표 기반의 Skia 렌더 트리를 구성. `buildTreeBoundsMap()`으로 추출된 절대 바운드를 Selection이 참조하여 컨텐츠와 항상 동기화.

### 선택 테두리 통합 (14개 컴포넌트)

기존에 각 UI 컴포넌트(PixiButton, BoxSprite, TextSprite 등)에서 개별적으로 그리던 선택 테두리를 제거하고 SelectionBox 공통 컴포넌트로 통합했습니다.

**제거된 선택 테두리 코드 컴포넌트:**
- BoxSprite.tsx
- TextSprite.tsx
- ImageSprite.tsx
- PixiButton.tsx
- PixiCheckbox.tsx
- PixiRadio.tsx
- PixiInput.tsx
- PixiSlider.tsx
- PixiSwitch.tsx
- PixiProgressBar.tsx
- PixiMeter.tsx
- PixiLink.tsx
- PixiTabs.tsx
- PixiToggleButton.tsx

## @pixi/react v8 컴포넌트 등록 패턴 (2025-12-17)

### 배경

@pixi/react v8에서 `Graphics is not part of the PIXI namespace!` 오류 발생. 원인은 JSX 태그용 prefixed 키(`pixiGraphics`)만 등록하고 클래스 이름 키(`Graphics`)를 등록하지 않았기 때문.

### 해결책: 이중 키 등록

```typescript
// pixiSetup.ts
import { extend } from '@pixi/react';
import { Graphics, Container, Text, Sprite } from 'pixi.js';

// MUST include BOTH prefixed keys (for JSX) AND class name keys (for @pixi/react internal)
export const PIXI_COMPONENTS = {
  // Prefixed keys for JSX: <pixiGraphics />, <pixiContainer />
  pixiGraphics: Graphics,
  pixiContainer: Container,
  pixiText: Text,
  pixiSprite: Sprite,
  // Class name keys for @pixi/react internal lookups
  Graphics,
  Container,
  Text,
  Sprite,
};

// Module-level extend() call - guarantees registration before any render
extend(PIXI_COMPONENTS);
```

### 핵심 원칙

1. **이중 키 등록 필수**: JSX용 prefixed 키 + 내부 조회용 클래스 이름 키
2. **모듈 레벨 extend()**: 렌더링 전에 등록 보장
3. **각 컴포넌트에서 useExtend()**: 런타임 확인용 (중복 방지됨)

---

## TextField 컴포넌트 통합 (2025-12-17)

### PixiTextField

Label, Input, Description을 포함하는 복합 텍스트 필드 컴포넌트.

**파일:** `src/builder/workspace/canvas/ui/PixiTextField.tsx`

```typescript
// CSS preset 동기화
const sizePreset = getTextFieldSizePreset(size);  // fontSize, height, padding, borderRadius
const colorPreset = getTextFieldColorPreset(variant);  // backgroundColor, borderColor, textColor

// 높이 계산
const labelHeight = label ? sizePreset.labelFontSize + sizePreset.gap : 0;
const descriptionHeight = (description || errorMessage) ? sizePreset.descriptionFontSize + sizePreset.gap : 0;
const totalHeight = labelHeight + sizePreset.height + descriptionHeight;
```

### LayoutEngine 통합

TextField의 intrinsic size를 LayoutEngine에서 측정하여 Selection area가 정확히 일치하도록 함:

```typescript
// LayoutEngine.ts
const TEXT_FIELD_TAGS = new Set(['TextField', 'TextInput']);

function measureTextFieldSize(element: Element, style: CSSStyle | undefined): { width: number; height: number } | null {
  const props = element.props;
  const sizeKey = props?.size || 'md';
  const preset = getTextFieldSizePreset(sizeKey);
  const width = props?.width || 240;

  // Label, input, description 높이 계산
  const labelHeight = props?.label ? preset.labelFontSize + preset.gap : 0;
  const hasDescription = props?.description || (props?.isInvalid && props?.errorMessage);
  const descriptionHeight = hasDescription ? preset.descriptionFontSize + preset.gap : 0;
  const totalHeight = labelHeight + preset.height + descriptionHeight;

  return { width, height: totalHeight };
}
```

---

## orientation 속성 지원 (2025-12-17)

### CheckboxGroup / RadioGroup

`orientation` prop이 `style.flexDirection`보다 우선합니다.

```typescript
// LayoutEngine.ts - calculateCheckboxItemPositions(), calculateRadioItemPositions()
const isHorizontal = (() => {
  // 1. orientation prop 우선 (horizontal/vertical)
  const orientation = props?.orientation;
  if (orientation === 'horizontal') return true;
  if (orientation === 'vertical') return false;

  // 2. style.flexDirection 폴백 (row/column)
  const flexDirection = style?.flexDirection;
  return flexDirection === 'row';
})();
```

### 적용 함수 (4개)

- `calculateCheckboxItemPositions()` - CheckboxGroup 자식 위치
- `calculateCheckboxGroupSize()` - CheckboxGroup 전체 크기
- `calculateRadioItemPositions()` - RadioGroup 자식 위치
- `calculateRadioGroupSize()` - RadioGroup 전체 크기

---

## Graphics 기반 UI 컴포넌트 리팩토링 (2025-12-15)

### 배경

@pixi/ui 및 @pixi/layout 기반 컴포넌트에서 렌더링 문제가 발생:
- **Checkbox**: 사각형만 표시되고 체크마크가 안 보임
- **RadioGroup**: 아무것도 표시되지 않음 (빈 화면)

### 해결책

PixiButton과 동일한 패턴으로 순수 PixiJS Graphics를 사용하여 직접 그리는 방식으로 리팩토링.

### PixiCheckbox (Graphics 기반)

```typescript
export const PixiCheckbox = memo(function PixiCheckbox({
  element, isSelected, onChange, onClick,
}: PixiCheckboxProps) {
  const drawBox = useCallback((g: PixiGraphics) => {
    g.clear();

    // 배경 (둥근 사각형)
    g.roundRect(0, 0, boxSize, boxSize, borderRadius);
    g.fill({ color: backgroundColor, alpha: 1 });

    // 테두리
    g.roundRect(0, 0, boxSize, boxSize, borderRadius);
    g.stroke({ width: 2, color: borderColor, alpha: 1 });

    // 체크마크 (체크된 경우)
    if (isChecked) {
      const checkPadding = boxSize * 0.2;
      const checkStartX = checkPadding;
      const checkStartY = boxSize * 0.5;
      const checkMidX = boxSize * 0.4;
      const checkMidY = boxSize - checkPadding;
      const checkEndX = boxSize - checkPadding;
      const checkEndY = checkPadding;

      g.setStrokeStyle({ width: 2.5, color: 0xffffff, cap: 'round', join: 'round' });
      g.moveTo(checkStartX, checkStartY);
      g.lineTo(checkMidX, checkMidY);
      g.lineTo(checkEndX, checkEndY);
      g.stroke();
    }
  }, [boxSize, borderRadius, backgroundColor, borderColor, isChecked]);

  return (
    <pixiContainer x={posX} y={posY}>
      <pixiGraphics draw={drawBox} eventMode="static" cursor="pointer" onPointerDown={handlePointerDown} />
      {labelText && (
        <pixiText text={labelText} style={textStyle} x={boxSize + 8} y={(boxSize - fontSize) / 2} />
      )}
    </pixiContainer>
  );
});
```

### PixiRadio (Graphics 기반)

```typescript
// 기본 옵션 (options가 없을 때 placeholder로 표시)
const DEFAULT_OPTIONS: RadioOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
];

const RadioItem = memo(function RadioItem({
  option, isOptionSelected, x, y, radioSize, primaryColor, textColor, fontSize, fontFamily, onSelect,
}: RadioItemProps) {
  const drawRadio = useCallback((g: PixiGraphics) => {
    g.clear();
    const radius = radioSize / 2;
    const centerX = radius;
    const centerY = radius;

    // 외부 원 (배경)
    g.circle(centerX, centerY, radius);
    g.fill({ color: backgroundColor, alpha: 1 });

    // 테두리
    g.circle(centerX, centerY, radius);
    g.stroke({ width: 2, color: borderColor, alpha: 1 });

    // 내부 dot (선택된 경우)
    if (isOptionSelected) {
      const dotRadius = radioSize * 0.2;
      g.circle(centerX, centerY, dotRadius);
      g.fill({ color: 0xffffff, alpha: 1 });
    }
  }, [radioSize, backgroundColor, borderColor, isOptionSelected]);

  return (
    <pixiContainer x={x} y={y}>
      <pixiGraphics draw={drawRadio} eventMode="static" cursor="pointer" onPointerDown={handlePointerDown} />
      <pixiText text={option.label} style={textStyle} x={radioSize + LABEL_GAP} y={(radioSize - fontSize) / 2} />
    </pixiContainer>
  );
});
```

### cssVariableReader.ts 확장

Canvas 페이지 테두리용 `--outline-variant` CSS 변수 읽기 함수 추가:

```typescript
// src/builder/workspace/canvas/sprites/cssVariableReader.ts

const FALLBACK_OUTLINE_VARIANT = 0xcad4de;  // --outline-variant 기본값

export function getOutlineVariantColor(): number {
  const value = getCSSVariable('--outline-variant');
  return cssColorToHex(value, FALLBACK_OUTLINE_VARIANT);
}
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
