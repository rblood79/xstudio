> **⚠️ 레거시 문서 (2026-02-19)**: Phase 11에서 @pixi/layout, @pixi/ui 완전 제거됨. 역사적 참조 목적으로 보관.
> 최신 아키텍처는 [ADR-003](../../../adr/003-canvas-rendering.md), [ENGINE.md](../../../ENGINE.md) 참조

# Pixi.js 사용 개선 Phase Plan

> **생성일**: 2025-12-13
> **최종 적용일**: 2025-12-13
> **기반**: Pixi.js 생태계 라이브러리 사용 감사 보고서 + 공식 레퍼런스 교차 검증
> **목표**: 공식 레퍼런스 준수, 코드 품질 향상, 성능 최적화
> **상태**: ✅ **P1-P7.9 전체 완료**

---

## 개요

### 설치된 패키지

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `pixi.js` | ^8.14.3 | Core 2D WebGL 렌더링 엔진 |
| `@pixi/react` | ^8.0.5 | React 바인딩 (JSX 컴포넌트) |
| `@pixi/layout` | ^3.2.0 | UI 컴포넌트 내부 레이아웃 |
| `@pixi/ui` | ^2.3.2 | UI 컴포넌트 라이브러리 |
| `yoga-layout` | ^3.0.0 | **P7.8**: Flexbox 레이아웃 엔진 (직접 사용) |

### Phase 요약

| Phase | 우선순위 | 작업 내용 | 상태 |
|-------|---------|----------|----------|
| **P1** | High | 이벤트 핸들러 일관성 통일 | ✅ **적용됨** (2025-12-13) |
| **P2** | High | extend() 중복 제거 | ✅ **적용됨** (2025-12-13) |
| **P3** | Critical | Graphics fill()/stroke() 순서 수정 | ✅ **적용됨** (2025-12-13) |
| **P4** | Medium | useExtend 훅 도입 | ✅ **적용됨** (2025-12-13) |
| **P5** | Medium | PixiButton layoutContainer 이슈 해결 | ✅ **적용됨** (2025-12-13) |
| **P6** | High | @pixi/ui 전체 컴포넌트 지원 | ✅ **완료** (9개 컴포넌트, 2025-12-13) |
| **P7** | High | StylePanel ↔ Canvas 스타일 동기화 | ✅ **완료** (P7.1-P7.9, 2025-12-13) |

---

## Phase 1: 이벤트 핸들러 일관성 통일

### 현재 문제점

프로젝트 내에서 **두 가지 이벤트 핸들러 명명 패턴이 혼용**되고 있음:

```
전체 파일 분석 결과:
├─ onPointerDown (camelCase): 12개 파일에서 사용
└─ onpointerdown (lowercase): 2개 파일에서 사용 ❌
```

**문제 파일**:
- `apps/builder/src/builder/workspace/canvas/selection/TransformHandle.tsx:106-108`
- `apps/builder/src/builder/workspace/canvas/selection/SelectionBox.tsx:121-123`

```tsx
// 현재 코드 (TransformHandle.tsx)
<pixiGraphics
  onpointerdown={handlePointerDown}   // ❌ lowercase
  onpointerover={handlePointerOver}   // ❌ lowercase
  onpointerout={handlePointerOut}     // ❌ lowercase
/>
```

### 변경 방안

**`onpointerdown` → `onPointerDown` (camelCase)로 통일**

```tsx
// 변경 후 (TransformHandle.tsx)
<pixiGraphics
  onPointerDown={handlePointerDown}   // ✅ camelCase
  onPointerOver={handlePointerOver}   // ✅ camelCase
  onPointerOut={handlePointerOut}     // ✅ camelCase
/>
```

### 변경 근거

| 출처 | 내용 | 링크 |
|------|------|------|
| @pixi/react GitHub README | `onClick` camelCase 패턴 사용 예시 | [GitHub](https://github.com/pixijs/pixi-react) |
| 프로젝트 내부 일관성 | 12개 파일이 이미 `onPointerDown` 사용 중 | 내부 분석 |
| React 표준 규칙 | React는 모든 이벤트에 camelCase 사용 | [React Docs](https://react.dev/learn/responding-to-events) |

**참고**: PixiJS Core는 lowercase (`pointerdown`)를 사용하지만, @pixi/react JSX에서는 React 규칙을 따르는 것이 일관성 있음.

### 대상 파일

| 파일 | 변경 라인 | 변경 내용 |
|------|----------|----------|
| `selection/TransformHandle.tsx` | 106-108 | `onpointerdown` → `onPointerDown` 외 2개 |
| `selection/SelectionBox.tsx` | 121-123 | `onpointerdown` → `onPointerDown` 외 2개 |

### 커밋 메시지

```
fix(workspace): standardize event handler naming to camelCase

- TransformHandle: onpointerdown → onPointerDown (3 handlers)
- SelectionBox: onpointerdown → onPointerDown (3 handlers)
- Aligns with React convention and existing codebase pattern
```

---

## Phase 2: extend() 중복 제거 및 정리

### 현재 문제점

**동일한 컴포넌트를 여러 파일에서 중복 등록**하고 있음:

```
extend() 호출 위치:
├─ pixiSetup.ts:32-44      (전역 설정 - 의도된 진입점)
└─ BuilderCanvas.tsx:28-33  (컴포넌트 내 중복 호출) ❌
```

```tsx
// pixiSetup.ts - 이미 등록됨
extend({
  Container: PixiContainer,
  Graphics: PixiGraphics,
  Text: PixiText,
  TextStyle: PixiTextStyle,  // ⚠️ DisplayObject 아님
  LayoutContainer,
  LayoutText,
  LayoutGraphics,            // ⚠️ 미사용
  LayoutSprite,              // ⚠️ 미사용
});

// BuilderCanvas.tsx - 중복 등록 ❌
extend({
  Container: PixiContainer,
  Graphics: PixiGraphics,
  Text: PixiText,
  TextStyle: PixiTextStyle,
});
```

### 변경 방안

**1. BuilderCanvas.tsx에서 중복 extend() 제거**
**2. pixiSetup.ts에서 미사용/불필요 항목 정리**

```tsx
// pixiSetup.ts - 정리 후
import { extend } from '@pixi/react';
import {
  Container as PixiContainer,
  Graphics as PixiGraphics,
  Sprite as PixiSprite,
  Text as PixiText,
  // TextStyle 제거 - DisplayObject가 아닌 스타일 객체
} from 'pixi.js';
import {
  LayoutContainer,
  LayoutText,
  // LayoutGraphics, LayoutSprite 제거 - 현재 미사용
} from '@pixi/layout/components';

extend({
  Container: PixiContainer,
  Graphics: PixiGraphics,
  Sprite: PixiSprite,
  Text: PixiText,
  LayoutContainer,
  LayoutText,
});

// BuilderCanvas.tsx - extend 제거, import만 유지
import './pixiSetup';  // extend 완료
import { Application, useApplication } from "@pixi/react";
```

### 변경 근거

| 항목 | 근거 | 출처 |
|------|------|------|
| 중복 extend 제거 | extend()는 이미 등록된 컴포넌트 무시하지만 불필요한 코드 | 코드 정리 |
| TextStyle 제거 | DisplayObject가 아닌 스타일 객체, JSX 태그로 사용 안 함 | [@pixi/react extend](https://react.pixijs.io/extend/) |
| LayoutGraphics/Sprite 제거 | 전역 검색 결과 0회 사용 | 내부 분석 |

### 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `canvas/pixiSetup.ts` | TextStyle, LayoutGraphics, LayoutSprite 제거 |
| `canvas/BuilderCanvas.tsx` | extend() 블록 제거, `import './pixiSetup'` 추가 |

### 커밋 메시지

```
refactor(workspace): consolidate extend() and remove unused registrations

- Remove duplicate extend() in BuilderCanvas.tsx
- Remove TextStyle from extend (not a DisplayObject)
- Remove unused LayoutGraphics/LayoutSprite
- Centralize all registrations in pixiSetup.ts
```

---

## Phase 3: Graphics fill()/stroke() 순서 수정 (Critical)

### 현재 문제점

**Pixi.js v8 API 패턴을 따르지 않는 코드**가 존재:

```tsx
// 현재 코드 (TextSprite.tsx:70-77) ❌
g.fill({ color: fill.color, alpha: fill.alpha });  // 1. fill 먼저 호출
if (borderRadius > 0) {
  g.roundRect(0, 0, width, height, borderRadius);  // 2. shape 나중
} else {
  g.rect(0, 0, width, height);
}
g.fill();  // 3. fill 다시 호출 (중복)
```

```tsx
// 현재 코드 (ImageSprite.tsx:87-94) ❌
g.fill({ color: PLACEHOLDER_COLOR, alpha: 1 });  // 1. fill 먼저
if (borderRadius > 0) {
  g.roundRect(0, 0, width, height, borderRadius);
} else {
  g.rect(0, 0, width, height);
}
g.fill();  // 2. fill 다시 호출 (중복)
```

### 변경 방안

**Shape 정의 → fill()/stroke() 호출 순서로 수정**

```tsx
// 변경 후 (TextSprite.tsx) ✅
if (borderRadius > 0) {
  g.roundRect(0, 0, width, height, borderRadius);  // 1. shape 먼저
} else {
  g.rect(0, 0, width, height);
}
g.fill({ color: fill.color, alpha: fill.alpha });  // 2. fill 나중 (1회만)

// Stroke도 동일 패턴
if (stroke) {
  if (borderRadius > 0) {
    g.roundRect(0, 0, width, height, borderRadius);
  } else {
    g.rect(0, 0, width, height);
  }
  g.stroke({ width: stroke.width, color: stroke.color, alpha: stroke.alpha });
}
```

### 변경 근거

**공식 문서에서 명확히 정의된 패턴**:

| 출처 | 패턴 | 링크 |
|------|------|------|
| PixiJS v8 Migration Guide | "Draw shape first, then apply styling" | [Migration Guide](https://pixijs.com/8.x/guides/migrations/v8) |
| PixiJS Graphics Guide | `.rect().fill().stroke()` 체이닝 예시 | [Graphics Guide](https://pixijs.com/8.x/guides/components/scene-objects/graphics) |

**공식 예시 코드**:
```javascript
// v8 공식 패턴
const graphics = new Graphics()
  .rect(50, 50, 100, 100)              // 1. Shape
  .fill('blue')                        // 2. Fill
  .stroke({ width: 2, color: 'white' }); // 3. Stroke
```

### 대상 파일

| 파일 | 변경 라인 | 변경 내용 |
|------|----------|----------|
| `sprites/TextSprite.tsx` | 60-98 | fill() 순서 수정, 중복 제거 |
| `sprites/ImageSprite.tsx` | 82-124 | fill() 순서 수정, 중복 제거 |

### 커밋 메시지

```
fix(sprites): correct Graphics fill/stroke order per Pixi.js v8 API

- TextSprite: shape → fill() → stroke() order
- ImageSprite: shape → fill() order
- Remove redundant fill() calls
- Follows official v8 migration guide pattern
```

---

## Phase 4: useExtend 훅 도입 (선택적)

### 현재 문제점

**모듈 레벨 extend() 호출은 메모이제이션되지 않음**:

```tsx
// 현재 코드 (pixiSetup.ts)
import { extend } from '@pixi/react';

// 모듈 로드 시 즉시 실행 - 메모이제이션 없음
extend({
  Container: PixiContainer,
  // ...
});
```

### 변경 방안

**useExtend 훅으로 전환 (메모이제이션 적용)**

```tsx
// pixiSetup.ts - 컴포넌트 카탈로그만 export
export const PIXI_COMPONENTS = {
  Container: PixiContainer,
  Graphics: PixiGraphics,
  Sprite: PixiSprite,
  Text: PixiText,
  LayoutContainer,
  LayoutText,
};

// BuilderCanvas.tsx - 컴포넌트 내에서 useExtend 호출
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from './pixiSetup';

function BuilderCanvasContent() {
  useExtend(PIXI_COMPONENTS);  // ✅ 메모이제이션됨

  return (
    <>
      <pixiContainer>...</pixiContainer>
    </>
  );
}
```

### 변경 근거

| 항목 | 근거 | 출처 |
|------|------|------|
| useExtend 메모이제이션 | "useExtend hook is memoised, while extend function is not" | [@pixi/react extend](https://react.pixijs.io/extend/) |
| 성능 최적화 | 컴포넌트 리렌더 시 중복 실행 방지 | 공식 문서 |

**참고**: 현재 구조에서도 정상 동작하므로 **선택적 최적화** 항목임.

### 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `canvas/pixiSetup.ts` | `PIXI_COMPONENTS` export로 변경 |
| `canvas/BuilderCanvas.tsx` | `useExtend(PIXI_COMPONENTS)` 호출 추가 |

### 커밋 메시지

```
refactor(workspace): adopt useExtend hook for memoized registration

- Export PIXI_COMPONENTS catalog from pixiSetup.ts
- Use useExtend() inside BuilderCanvasContent
- Enables memoization for performance optimization
```

---

## Phase 5: PixiButton layoutContainer 이벤트 해결

### ✅ 해결됨 (2025-12-13)

**GitHub Issue #126**: LayoutContainer가 eventMode 파라미터를 무시하고 항상 'static'으로 설정하는 버그
- 링크: https://github.com/pixijs/layout/issues/126
- 영향 버전: @pixi/layout v3.2.0 + PixiJS 8.13.2+

### Workaround 적용

**pixiContainer 래퍼로 이벤트 처리** - layoutContainer 대신 pixiContainer에서 이벤트 핸들러 설정

```tsx
// 변경 전 (이벤트 동작 안 함)
<layoutContainer eventMode="static" onPointerDown={handleClick}>
  ...
</layoutContainer>

// 변경 후 (workaround)
<pixiContainer eventMode="static" onPointerDown={handleClick}>
  <layoutContainer layout={{...}}>
    ...
  </layoutContainer>
</pixiContainer>
```

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `ui/PixiButton.tsx` | pixiContainer 래퍼로 이벤트 처리 |
| `ui/PixiCheckbox.tsx` | pixiContainer 래퍼로 이벤트 처리 |
| `ui/PixiRadio.tsx` | pixiContainer 래퍼로 이벤트 처리 (그룹 + 개별 옵션) |
| `sprites/ElementSprite.tsx` | PixiButton 활성화 (BoxSprite fallback 제거) |

### 커밋 메시지

```
fix(canvas): apply pixiContainer wrapper workaround for layoutContainer event issue (P5)

- Workaround for @pixi/layout GitHub #126 (eventMode ignored)
- PixiButton, PixiCheckbox, PixiRadio: wrap layoutContainer in pixiContainer for events
- Enable PixiButton in ElementSprite (remove BoxSprite fallback)
```

---

## Phase 6: @pixi/ui 전체 컴포넌트 지원 (신규)

### 현재 문제점

**@pixi/ui 라이브러리가 설치되어 있지만 거의 활용되지 않음**:

```
@pixi/ui 컴포넌트 사용 현황:
├─ Button       → 커스텀 PixiButton (미사용)
├─ FancyButton  → ❌ 미사용
├─ CheckBox     → 커스텀 PixiCheckbox
├─ RadioGroup   → 커스텀 PixiRadio
├─ Slider       → ❌ 미사용
├─ Input        → ❌ 미사용
├─ ScrollBox    → ❌ 미사용
├─ List         → ❌ 미사용
├─ ProgressBar  → ❌ 미사용
├─ Select       → ❌ 미사용
├─ Switcher     → ❌ 미사용
└─ MaskedFrame  → ❌ 미사용
```

### 변경 방안

**@pixi/ui 네이티브 컴포넌트 래퍼 시스템 구축**

#### 6.1 디렉토리 구조

```
apps/builder/src/builder/workspace/canvas/ui/
├─ index.ts              # Export all
├─ types.ts              # 공통 타입 정의
├─ PixiUIBase.tsx        # 기본 래퍼 (공통 로직)
│
├─ buttons/
│   ├─ PixiButton.tsx       # @pixi/ui Button 래퍼
│   └─ PixiFancyButton.tsx  # @pixi/ui FancyButton 래퍼
│
├─ inputs/
│   ├─ PixiCheckbox.tsx     # @pixi/ui CheckBox 래퍼
│   ├─ PixiRadio.tsx        # @pixi/ui RadioGroup 래퍼
│   ├─ PixiSlider.tsx       # @pixi/ui Slider 래퍼 (신규)
│   ├─ PixiInput.tsx        # @pixi/ui Input 래퍼 (신규)
│   └─ PixiSelect.tsx       # @pixi/ui Select 래퍼 (신규)
│
├─ display/
│   ├─ PixiProgressBar.tsx  # @pixi/ui ProgressBar 래퍼 (신규)
│   └─ PixiSwitcher.tsx     # @pixi/ui Switcher 래퍼 (신규)
│
└─ containers/
    ├─ PixiScrollBox.tsx    # @pixi/ui ScrollBox 래퍼 (신규)
    ├─ PixiList.tsx         # @pixi/ui List 래퍼 (신규)
    └─ PixiMaskedFrame.tsx  # @pixi/ui MaskedFrame 래퍼 (신규)
```

#### 6.2 @pixi/ui 컴포넌트 상세

| 컴포넌트 | @pixi/ui 클래스 | 기능 | 우선순위 |
|----------|----------------|------|---------|
| **Button** | `Button` | 기본 버튼, onPress 시그널 | P1 |
| **FancyButton** | `FancyButton` | 애니메이션 버튼, 스프라이트/텍스트 지원 | P2 |
| **CheckBox** | `CheckBox` | 체크박스, checked 상태 | P1 |
| **RadioGroup** | `RadioGroup` | 라디오 버튼 그룹 | P1 |
| **Slider** | `Slider` | 슬라이더, min/max/step | P1 |
| **Input** | `Input` | 텍스트 입력 필드 | P1 |
| **Select** | `Select` | 드롭다운 선택 | P2 |
| **ProgressBar** | `ProgressBar` | 진행률 표시 (선형/원형) | P2 |
| **Switcher** | `Switcher` | 토글 스위치 | P2 |
| **ScrollBox** | `ScrollBox` | 스크롤 가능 컨테이너 | P2 |
| **List** | `List` | 아이템 리스트 | P3 |
| **MaskedFrame** | `MaskedFrame` | 마스킹 프레임 | P3 |

#### 6.3 컴포넌트 래퍼 기본 구조

```tsx
// ui/inputs/PixiSlider.tsx (신규)
import { Slider } from '@pixi/ui';
import { memo, useCallback, useEffect, useRef } from 'react';
import type { Element } from '../../../../../types/core/store.types';

export interface PixiSliderProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: number) => void;
}

export const PixiSlider = memo(function PixiSlider({
  element,
  isSelected,
  onClick,
  onChange,
}: PixiSliderProps) {
  const sliderRef = useRef<Slider | null>(null);
  const props = element.props as Record<string, unknown> | undefined;

  // Props 추출
  const min = Number(props?.min ?? 0);
  const max = Number(props?.max ?? 100);
  const value = Number(props?.value ?? 50);
  const step = Number(props?.step ?? 1);

  // Slider 인스턴스 생성
  useEffect(() => {
    const slider = new Slider({
      min,
      max,
      value,
      step,
      // @pixi/ui Slider 옵션
      bg: 'slider-bg',        // 배경 텍스처/스프라이트
      fill: 'slider-fill',    // 채우기 텍스처/스프라이트
      slider: 'slider-handle', // 핸들 텍스처/스프라이트
    });

    // 이벤트 연결
    slider.onUpdate.connect((value) => {
      onChange?.(element.id, value);
    });

    sliderRef.current = slider;

    return () => {
      slider.destroy();
    };
  }, [element.id, min, max, step]);

  // 값 동기화
  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.value = value;
    }
  }, [value]);

  // @pixi/react와 통합을 위한 렌더링
  // TODO: pixiContainer로 래핑하거나 useApplication으로 stage에 추가
  return null;
});
```

#### 6.4 ElementSprite 태그 매핑 확장

```tsx
// sprites/ElementSprite.tsx - 태그 매핑 확장

// 기존 UI 컴포넌트 태그
const UI_BUTTON_TAGS = new Set(['Button', 'FancyButton', 'SubmitButton']);
const UI_CHECKBOX_TAGS = new Set(['Checkbox', 'CheckBox', 'Switch', 'Toggle']);
const UI_RADIO_TAGS = new Set(['RadioGroup', 'Radio']);

// 신규 @pixi/ui 태그 (Phase 6)
const UI_SLIDER_TAGS = new Set(['Slider', 'RangeSlider']);
const UI_INPUT_TAGS = new Set(['Input', 'TextField', 'TextInput']);
const UI_SELECT_TAGS = new Set(['Select', 'Dropdown', 'ComboBox']);
const UI_PROGRESS_TAGS = new Set(['ProgressBar', 'Progress', 'LoadingBar']);
const UI_SWITCHER_TAGS = new Set(['Switcher', 'ToggleSwitch']);
const UI_SCROLLBOX_TAGS = new Set(['ScrollBox', 'ScrollView', 'ScrollContainer']);
const UI_LIST_TAGS = new Set(['List', 'ListView']);
const UI_MASKED_TAGS = new Set(['MaskedFrame', 'ClippedView']);

// SpriteType 확장
type SpriteType =
  | 'box' | 'text' | 'image'
  | 'button' | 'fancyButton'
  | 'checkbox' | 'radio'
  | 'slider' | 'input' | 'select'
  | 'progressBar' | 'switcher'
  | 'scrollBox' | 'list' | 'maskedFrame'
  | 'flex' | 'grid';

function getSpriteType(element: Element): SpriteType {
  const tag = element.tag;

  // Phase 6 신규 컴포넌트
  if (UI_SLIDER_TAGS.has(tag)) return 'slider';
  if (UI_INPUT_TAGS.has(tag)) return 'input';
  if (UI_SELECT_TAGS.has(tag)) return 'select';
  if (UI_PROGRESS_TAGS.has(tag)) return 'progressBar';
  if (UI_SWITCHER_TAGS.has(tag)) return 'switcher';
  if (UI_SCROLLBOX_TAGS.has(tag)) return 'scrollBox';
  if (UI_LIST_TAGS.has(tag)) return 'list';
  if (UI_MASKED_TAGS.has(tag)) return 'maskedFrame';

  // 기존 컴포넌트
  if (UI_BUTTON_TAGS.has(tag)) return 'button';
  if (UI_CHECKBOX_TAGS.has(tag)) return 'checkbox';
  if (UI_RADIO_TAGS.has(tag)) return 'radio';

  // ... 기존 로직
}
```

#### 6.5 구현 하위 Phase

| Sub-Phase | 컴포넌트 | 설명 |
|-----------|----------|------|
| **6.1** | PixiSlider | 슬라이더 (값 입력) |
| **6.2** | PixiInput | 텍스트 입력 필드 |
| **6.3** | PixiSelect | 드롭다운 선택 |
| **6.4** | PixiProgressBar | 진행률 표시 |
| **6.5** | PixiFancyButton | 애니메이션 버튼 |
| **6.6** | PixiSwitcher | 토글 스위치 |
| **6.7** | PixiScrollBox | 스크롤 컨테이너 |
| **6.8** | PixiList | 리스트 뷰 |
| **6.9** | PixiMaskedFrame | 마스킹 프레임 |

### 변경 근거

| 항목 | 근거 | 출처 |
|------|------|------|
| @pixi/ui 활용 | 이미 설치된 라이브러리 (v2.3.2), 풍부한 UI 컴포넌트 제공 | [npm](https://www.npmjs.com/package/@pixi/ui) |
| 래퍼 패턴 | xstudio Element 시스템과 @pixi/ui 통합 필요 | 프로젝트 아키텍처 |
| 점진적 구현 | Sub-Phase로 나누어 우선순위별 구현 | 리스크 관리 |

### 커밋 메시지 (예시)

```
feat(workspace): add @pixi/ui Slider component wrapper

- Create PixiSlider wrapper for @pixi/ui Slider
- Add slider tag mapping in ElementSprite
- Support min/max/step/value props
- Connect onChange event to Element system
```

---

## Phase 7: StylePanel ↔ Canvas 스타일 속성 동기화

### 현재 분석

#### 구현 현황 매트릭스

**파일 위치:**
- **StylePanel 섹션**: `src/builder/panels/styles/sections/`
- **Canvas 스타일 변환**: `apps/builder/src/builder/workspace/canvas/sprites/styleConverter.ts`
- **Canvas 레이아웃 계산**: `apps/builder/src/builder/workspace/canvas/layout/layoutCalculator.ts`

| 섹션 | 속성 | Canvas 구현 | 상태 | 비고 |
|------|------|-------------|------|------|
| **TransformSection** | | | | |
| | width | styleConverter | ✅ 구현됨 | parseCSSSize() |
| | height | styleConverter | ✅ 구현됨 | parseCSSSize() |
| | left | styleConverter | ✅ 구현됨 | position offset |
| | top | styleConverter | ✅ 구현됨 | position offset |
| **LayoutSection** | | | | |
| | display | layoutCalculator | ✅ 구현됨 | flex, block 지원 |
| | flexDirection | layoutCalculator | ✅ 구현됨 | row, column, *-reverse |
| | alignItems | layoutCalculator | ✅ 구현됨 | flex-start/center/end/stretch |
| | justifyContent | layoutCalculator | ✅ 구현됨 | 모든 값 지원 |
| | gap | layoutCalculator | ✅ 구현됨 | |
| | **padding*** | 불일치 | ⚠️ 불일치 | TextSprite ✅, BoxSprite ❌ (아래 상세) |
| | margin* | layoutCalculator | ✅ 구현됨 | 4방향 지원 |
| | **flexWrap** | - | ❌ 미구현 | wrap/nowrap 미지원 |
| **TypographySection** | | | | |
| | fontFamily | styleConverter | ✅ 구현됨 | PixiTextStyle |
| | fontSize | styleConverter | ✅ 구현됨 | PixiTextStyle |
| | fontWeight | styleConverter | ✅ 구현됨 | PixiTextStyle |
| | color | styleConverter | ✅ 구현됨 | → fill 변환 |
| | textAlign | styleConverter | ✅ 구현됨 | → align 변환 |
| | **fontStyle** | - | ❌ 미구현 | italic, oblique |
| | **lineHeight** | - | ❌ 미구현 | 줄 간격 (PixiJS leading 지원) |
| | **letterSpacing** | - | ❌ 미구현 | 자간 (PixiJS 직접 지원) |
| | **textDecoration** | - | ❌ 미구현 | underline, line-through (Graphics 필요) |
| | **textTransform** | - | ❌ 미구현 | uppercase, lowercase |
| | **verticalAlign** | - | ❌ 미구현 | top, middle, bottom |
| **AppearanceSection** | | | | |
| | backgroundColor | styleConverter | ✅ 구현됨 | cssColorToHex() |
| | borderRadius | styleConverter | ✅ 구현됨 | roundRect() |
| | borderWidth | styleConverter | ✅ 구현됨 | PixiStrokeStyle |
| | borderColor | styleConverter | ✅ 구현됨 | PixiStrokeStyle |
| | **borderStyle** | - | ❌ 미구현 | dashed, dotted 등 (커스텀 필요) |
| | **opacity** | styleConverter | ⚠️ 부분 | fill alpha만, Container.alpha 미적용 |
| | **boxShadow** | - | ❌ 미구현 | @pixi/filter 또는 커스텀 필요 |

### ⚠️ padding 불일치 상세 분석

**현재 상태:**
- **TextSprite.tsx** (lines 111-120): ✅ **구현됨** - paddingLeft, paddingTop을 텍스트 위치에 적용
- **BoxSprite.tsx** (lines 84-86): ❌ **미구현** - 텍스트가 항상 중앙 고정 (padding 무시)
- **PixiButton.tsx**: ✅ **구현됨** - @pixi/layout의 layout.padding* 사용

**문제:**
```typescript
// TextSprite.tsx - padding 적용됨 ✅
const paddingLeft = useMemo(() => {
  const p = style?.paddingLeft || style?.padding;
  return typeof p === 'number' ? p : parseInt(String(p) || '0', 10);
}, [style]);
<pixiText x={paddingLeft} y={paddingTop} ... />

// BoxSprite.tsx - padding 무시됨 ❌
const textX = transform.width / 2;  // 항상 중앙
const textY = transform.height / 2;
```

**해결 방안:** BoxSprite에 TextSprite와 동일한 padding 로직 추가

### 미구현 항목 상세 분석

#### 7.1 TypographySection 미구현 (6개 속성)

**7.1.1 fontStyle (italic, oblique)**

```typescript
// 현재 PixiTextStyle (styleConverter.ts:58-66)
export interface PixiTextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fill: number;
  align: 'left' | 'center' | 'right';
  wordWrap: boolean;
  wordWrapWidth: number;
  // fontStyle 없음 ❌
}

// 변경 후
export interface PixiTextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: 'normal' | 'italic' | 'oblique';  // ✅ 추가
  fill: number;
  // ...
}

// convertToTextStyle 수정
export function convertToTextStyle(style: CSSStyle | undefined): PixiTextStyle {
  return {
    // ...
    fontStyle: (style?.fontStyle as 'normal' | 'italic' | 'oblique') || 'normal',
  };
}
```

**7.1.2 lineHeight**

```typescript
// PixiJS TextStyle 지원 확인 (v8)
// PixiJS에서는 leading으로 지원됨

export interface PixiTextStyle {
  // ...
  leading: number;  // ✅ 줄 간격 (line-height 대응)
}

// CSS lineHeight → PixiJS leading 변환
const lineHeight = parseCSSSize(style?.lineHeight, undefined, 1.2);
const leading = (lineHeight - 1) * fontSize;  // 배수 기반 계산
```

**7.1.3 letterSpacing**

```typescript
// PixiJS TextStyle에서 직접 지원됨
export interface PixiTextStyle {
  // ...
  letterSpacing: number;  // ✅ 직접 지원
}
```

**7.1.4 textDecoration (underline, line-through, overline)**

```typescript
// PixiJS에서 직접 지원하지 않음 → Graphics로 직접 그리기 필요

// TextSprite.tsx 수정 필요
function drawTextDecoration(g: PixiGraphics, text: PixiText, decoration: string) {
  if (decoration === 'none') return;

  const { x, y, width } = text.getBounds();
  const lineY = decoration === 'underline'
    ? y + text.height
    : decoration === 'line-through'
      ? y + text.height / 2
      : y;  // overline

  g.setStrokeStyle({ width: 1, color: text.style.fill });
  g.moveTo(x, lineY);
  g.lineTo(x + width, lineY);
  g.stroke();
}
```

**7.1.5 textTransform**

```typescript
// CSS textTransform은 실제 텍스트 변환이므로 render 전 적용

function applyTextTransform(text: string, transform: string): string {
  switch (transform) {
    case 'uppercase': return text.toUpperCase();
    case 'lowercase': return text.toLowerCase();
    case 'capitalize': return text.replace(/\b\w/g, c => c.toUpperCase());
    default: return text;
  }
}

// TextSprite에서 사용
const transformedText = applyTextTransform(textContent, style?.textTransform || 'none');
```

**7.1.6 verticalAlign**

```typescript
// 컨테이너 내 텍스트 수직 정렬
// 현재 paddingTop으로만 처리됨 → 개선 필요

function calculateTextY(
  containerHeight: number,
  textHeight: number,
  verticalAlign: string,
  paddingTop: number
): number {
  switch (verticalAlign) {
    case 'top': return paddingTop;
    case 'middle': return (containerHeight - textHeight) / 2;
    case 'bottom': return containerHeight - textHeight - paddingTop;
    default: return paddingTop;  // baseline
  }
}
```

#### 7.2 LayoutSection 미구현/불일치 (2개 속성)

**7.2.1 padding (BoxSprite 불일치 해결)**

> **Note:** TextSprite에서는 이미 구현됨 (lines 111-120). BoxSprite만 수정 필요.

```typescript
// BoxSprite.tsx 현재 코드 (padding 미사용) ❌
const textX = transform.width / 2;  // 중앙 고정
const textY = transform.height / 2;

// 변경 후 - TextSprite와 동일한 padding 로직 적용 ✅
const paddingLeft = useMemo(() => {
  const p = style?.paddingLeft || style?.padding;
  return typeof p === 'number' ? p : parseInt(String(p) || '0', 10);
}, [style]);

const paddingTop = useMemo(() => {
  const p = style?.paddingTop || style?.padding;
  return typeof p === 'number' ? p : parseInt(String(p) || '0', 10);
}, [style]);

const paddingRight = useMemo(() => {
  const p = style?.paddingRight || style?.padding;
  return typeof p === 'number' ? p : parseInt(String(p) || '0', 10);
}, [style]);

const paddingBottom = useMemo(() => {
  const p = style?.paddingBottom || style?.padding;
  return typeof p === 'number' ? p : parseInt(String(p) || '0', 10);
}, [style]);

// 텍스트 영역 계산 (padding 제외)
const contentWidth = transform.width - paddingLeft - paddingRight;
const contentHeight = transform.height - paddingTop - paddingBottom;

// 텍스트 위치 (content 영역 중앙) - TextSprite와 달리 BoxSprite는 중앙 정렬 유지
const textX = paddingLeft + contentWidth / 2;
const textY = paddingTop + contentHeight / 2;
```

**7.2.2 flexWrap**

```typescript
// layoutCalculator.ts 수정 필요

function calculateFlexLayout(
  // ...
  flexStyle: { flexWrap: string; /* ... */ }
) {
  const { flexDirection, flexWrap, alignItems, justifyContent, gap } = flexStyle;
  const isRow = flexDirection.startsWith('row');

  if (flexWrap === 'nowrap') {
    // 현재 구현 (단일 라인)
    calculateSingleLineLayout(/* ... */);
  } else {
    // ✅ 추가 필요: wrap/wrap-reverse
    calculateMultiLineLayout(/* ... */);
  }
}

function calculateMultiLineLayout(
  children: ChildSize[],
  isRow: boolean,
  parentWidth: number,
  parentHeight: number,
  gap: number,
  isWrapReverse: boolean
): LayoutPosition[] {
  const lines: ChildSize[][] = [];
  let currentLine: ChildSize[] = [];
  let lineSize = 0;
  const maxSize = isRow ? parentWidth : parentHeight;

  // 라인별로 분할
  for (const child of children) {
    const childSize = isRow ? child.totalWidth : child.totalHeight;
    if (lineSize + childSize > maxSize && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [child];
      lineSize = childSize + gap;
    } else {
      currentLine.push(child);
      lineSize += childSize + gap;
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);

  // wrap-reverse: 라인 순서 반전
  if (isWrapReverse) lines.reverse();

  // 각 라인별 위치 계산
  // ...
}
```

#### 7.3 AppearanceSection 미구현 (3개 속성)

**7.3.1 borderStyle (dashed, dotted 등)**

```typescript
// PixiJS v8 Graphics에서 직접 지원하지 않음
// 대안 1: 커스텀 점선 그리기
// 대안 2: @pixi/graphics-extras 사용

// 대안 1: 커스텀 점선 그리기
function drawDashedRect(
  g: PixiGraphics,
  x: number, y: number, w: number, h: number,
  borderStyle: string,
  strokeStyle: PixiStrokeStyle
) {
  g.setStrokeStyle(strokeStyle);

  if (borderStyle === 'dashed') {
    const dashLength = 6;
    const gapLength = 4;
    drawDashedLine(g, x, y, x + w, y, dashLength, gapLength);
    drawDashedLine(g, x + w, y, x + w, y + h, dashLength, gapLength);
    drawDashedLine(g, x + w, y + h, x, y + h, dashLength, gapLength);
    drawDashedLine(g, x, y + h, x, y, dashLength, gapLength);
  } else if (borderStyle === 'dotted') {
    // 1px 점선
    drawDottedLine(g, x, y, x + w, y);
    // ...
  } else {
    // solid (기본)
    g.rect(x, y, w, h);
    g.stroke();
  }
}

function drawDashedLine(
  g: PixiGraphics,
  x1: number, y1: number, x2: number, y2: number,
  dashLen: number, gapLen: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const nx = dx / len;
  const ny = dy / len;

  let drawn = 0;
  let isDash = true;

  while (drawn < len) {
    const segLen = isDash ? dashLen : gapLen;
    const endDraw = Math.min(drawn + segLen, len);

    if (isDash) {
      g.moveTo(x1 + nx * drawn, y1 + ny * drawn);
      g.lineTo(x1 + nx * endDraw, y1 + ny * endDraw);
    }

    drawn = endDraw;
    isDash = !isDash;
  }
  g.stroke();
}
```

**7.3.2 opacity (전체 요소)**

```typescript
// 현재: fill alpha만 적용
// 개선: Container.alpha로 전체 요소 투명도 적용

// BoxSprite.tsx, TextSprite.tsx 등에서
<pixiContainer
  x={transform.x}
  y={transform.y}
  alpha={parseCSSSize(style?.opacity, undefined, 1)}  // ✅ 추가
>
  {/* children */}
</pixiContainer>
```

**7.3.3 boxShadow**

```typescript
// PixiJS에서 직접 지원하지 않음
// 대안: DropShadowFilter 사용 (@pixi/filter-drop-shadow)
// 또는 Graphics로 그림자 시뮬레이션

import { DropShadowFilter } from '@pixi/filter-drop-shadow';

// styleConverter.ts 확장
export interface PixiShadowStyle {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: number;
  alpha: number;
}

export function parseBoxShadow(boxShadow: string): PixiShadowStyle | null {
  if (!boxShadow || boxShadow === 'none') return null;

  // CSS boxShadow 파싱: "2px 4px 8px rgba(0,0,0,0.3)"
  const match = boxShadow.match(/(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s+(.+)/);
  if (!match) return null;

  return {
    offsetX: parseInt(match[1]),
    offsetY: parseInt(match[2]),
    blur: parseInt(match[3]),
    color: cssColorToHex(match[4]),
    alpha: cssColorToAlpha(match[4]),
  };
}

// 스프라이트에서 필터 적용
const shadowStyle = parseBoxShadow(style?.boxShadow);
const filters = shadowStyle ? [
  new DropShadowFilter({
    offset: { x: shadowStyle.offsetX, y: shadowStyle.offsetY },
    blur: shadowStyle.blur,
    color: shadowStyle.color,
    alpha: shadowStyle.alpha,
  })
] : [];

<pixiContainer filters={filters}>
```

### 구현 우선순위

> **Note:** opacity, boxShadow는 CSSStyle 인터페이스에 정의되어 있지만 AppearanceSection UI에는 아직 노출되지 않음.
> 아래 표는 **StylePanel UI에 존재하지만 Canvas에서 미구현인 항목**만 포함.

| Sub-Phase | 속성 | 대상 파일 | 난이도 | 우선순위 | 비고 |
|-----------|------|----------|--------|----------|------|
| **7.1** | padding (BoxSprite) | BoxSprite.tsx | 🟢 Easy | P0 | TextSprite와 일관성 맞춤 |
| **7.2** | fontStyle | styleConverter.ts, TextSprite.tsx | 🟢 Easy | P1 | italic, oblique |
| **7.3** | letterSpacing | styleConverter.ts, TextSprite.tsx | 🟢 Easy | P1 | PixiJS 직접 지원 |
| **7.4** | lineHeight (leading) | styleConverter.ts, TextSprite.tsx | 🟡 Medium | P1 | fontSize 계산 필요 |
| **7.5** | verticalAlign | TextSprite.tsx, BoxSprite.tsx | 🟡 Medium | P1 | 텍스트 높이 계산 필요 |
| **7.6** | textTransform | TextSprite.tsx, BoxSprite.tsx | 🟢 Easy | P2 | 렌더링 전 문자열 변환 |
| **7.7** | textDecoration | TextSprite.tsx | 🟡 Medium | P2 | Graphics 선 그리기 |
| **7.8** | flexWrap | LayoutEngine.ts (Yoga) | ✅ 완료 | P2 | Yoga 기반 리팩토링 |
| **7.9** | borderStyle | BoxSprite.tsx, TextSprite.tsx | 🟡 Medium | P3 | 점선/대시선 커스텀 |

**향후 확장 (UI 추가 시):**
| 속성 | CSSStyle 정의 | UI 노출 | Canvas 구현 |
|------|--------------|---------|-------------|
| opacity | ✅ (line 23) | ❌ 미노출 | ⚠️ fill alpha만 |
| boxShadow | ✅ (line 34) | ❌ 미노출 | ❌ 미구현 |

### 파일 수정 계획

| 파일 | 수정 내용 | Sub-Phase |
|------|----------|-----------|
| `BoxSprite.tsx` | padding 로직 추가 (TextSprite와 동일) | 7.1 |
| `styleConverter.ts` | PixiTextStyle 확장 (fontStyle, letterSpacing, leading) | 7.2-7.4 |
| `TextSprite.tsx` | 텍스트 스타일 적용 + textDecoration Graphics | 7.2-7.7 |
| `BoxSprite.tsx` | verticalAlign, textTransform, borderStyle | 7.5-7.6, 7.9 |
| `LayoutEngine.ts` | Yoga 기반 레이아웃 (flexWrap 포함) | 7.8 ✅ |

### 커밋 메시지 (예시)

```
feat(canvas): add full opacity support to all sprites (P7.1)

- Add alpha prop to pixiContainer in BoxSprite, TextSprite, ImageSprite
- Parse CSS opacity value in styleConverter
- Opacity now affects entire element, not just fill
```

```
feat(canvas): add typography style support - fontStyle, letterSpacing (P7.2-7.3)

- Extend PixiTextStyle interface with fontStyle and letterSpacing
- Update convertToTextStyle to extract these properties
- TextSprite now renders italic/oblique text correctly
```

```
feat(canvas): implement Yoga-based layout engine with flexWrap (P7.8)

- Replace layoutCalculator.ts with LayoutEngine.ts (Yoga-based)
- Add yoga-layout v3.0.0 as direct dependency
- Support full CSS Flexbox spec: flexWrap, alignContent, gap
- Delete unused FlexLayout.tsx component
- Add async initYoga() initialization in BuilderCanvas
```

---

## 실행 계획

### ✅ 완료 (2025-12-13)

- [x] Phase Plan 문서 작성
- [x] **Phase 1**: 이벤트 핸들러 camelCase 통일 (2파일, 6줄)
- [x] **Phase 2**: extend() 정리 (2파일)
- [x] **Phase 3**: Graphics fill() 순서 수정 (4파일) ⚠️ Critical
- [x] **Phase 4**: useExtend 훅 도입
- [x] **Phase 5**: PixiButton layoutContainer 이슈 해결 (pixiContainer 래퍼)
- [x] **Phase 6.1-6.9**: @pixi/ui 컴포넌트 9개 구현
  - PixiSlider, PixiInput, PixiSelect, PixiProgressBar
  - PixiFancyButton, PixiSwitcher, PixiScrollBox, PixiList, PixiMaskedFrame
- [x] **Phase 7.1-7.6**: StylePanel ↔ Canvas 동기화 (타이포그래피)
  - BoxSprite padding, fontStyle, letterSpacing, lineHeight, verticalAlign, textTransform

### ✅ 완료 (P7.7-P7.9)

- [x] **Phase 7.7**: textDecoration 구현 (🟡 Medium) ✅ **완료** (2025-12-13)
- [x] **Phase 7.8**: flexWrap 구현 (🔴 Hard) ✅ **완료** (2025-12-13)
  - Yoga 기반 LayoutEngine.ts로 리팩토링
  - layoutCalculator.ts, FlexLayout.tsx 삭제
  - yoga-layout v3.0.0 직접 사용
- [x] **Phase 7.9**: borderStyle 구현 (🟡 Medium) ✅ **완료** (2025-12-13)

---

## Phase 7.7: textDecoration 구현 상세 계획

### 목표

CSS `textDecoration` 속성 (underline, line-through, overline)을 Canvas에서 지원

### 구현 방식

PixiJS TextStyle은 textDecoration을 직접 지원하지 않으므로 **Graphics로 선 그리기** 필요

```typescript
// TextSprite.tsx에 추가할 함수
function drawTextDecoration(
  g: PixiGraphics,
  textBounds: { x: number; y: number; width: number; height: number },
  decoration: string,
  color: number,
  fontSize: number
): void {
  if (!decoration || decoration === 'none') return;

  const decorations = decoration.split(/\s+/);
  const lineWidth = Math.max(1, fontSize / 12);

  decorations.forEach((dec) => {
    let lineY: number;
    switch (dec) {
      case 'underline':
        lineY = textBounds.y + textBounds.height + 2;
        break;
      case 'line-through':
        lineY = textBounds.y + textBounds.height / 2;
        break;
      case 'overline':
        lineY = textBounds.y - 2;
        break;
      default:
        return;
    }

    g.moveTo(textBounds.x, lineY);
    g.lineTo(textBounds.x + textBounds.width, lineY);
    g.stroke({ width: lineWidth, color, alpha: 1 });
  });
}
```

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `styleConverter.ts` | textDecoration 타입 이미 CSSStyle에 정의됨 ✅ |
| `TextSprite.tsx` | drawTextDecoration() 함수 추가, 렌더링 로직에 적용 |
| `BoxSprite.tsx` | (선택적) 텍스트가 있는 경우 동일하게 적용 |

### 커밋 메시지

```
feat(canvas): add textDecoration support (underline, line-through, overline) (P7.7)

- Add drawTextDecoration() helper in TextSprite
- Support multiple decorations (e.g., "underline line-through")
- Calculate line position based on text bounds and decoration type
```

---

## Phase 7.8: flexWrap 구현 ✅ 완료

### 목표

CSS `flexWrap` 속성 (wrap, wrap-reverse, nowrap)을 Canvas 레이아웃에서 지원

### 구현 결과

✅ **Yoga 기반 LayoutEngine으로 완전 리팩토링** (2025-12-13)

기존 수동 구현(`layoutCalculator.ts`)을 삭제하고, yoga-layout v3를 직접 사용하는 `LayoutEngine.ts`로 교체했습니다.

### 변경 사항

| 작업 | 내용 |
|------|------|
| **삭제** | `layoutCalculator.ts` (수동 구현, 549줄) |
| **삭제** | `FlexLayout.tsx` (미사용 컴포넌트, 248줄) |
| **신규** | `LayoutEngine.ts` (Yoga 기반, 455줄) |
| **의존성** | `yoga-layout: ^3.0.0` 추가 |

### 지원 속성 (전체)

```typescript
// Flexbox Container
flexDirection: 'row' | 'row-reverse' | 'column' | 'column-reverse'
flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse'  // ✅ 신규
justifyContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
alignItems: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
alignContent: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around'  // ✅ 신규
gap, rowGap, columnGap  // ✅ 신규

// Flexbox Item
flex, flexGrow, flexShrink, flexBasis, alignSelf
```

### 아키텍처

```
Before:
├── layoutCalculator.ts  (수동 JS, 549줄) ❌ 삭제
├── FlexLayout.tsx       (미사용, 248줄) ❌ 삭제
└── @pixi/layout         (UI 컴포넌트 내부만)

After:
├── LayoutEngine.ts      (Yoga 기반, 455줄) ✅
└── yoga-layout v3       (Facebook Yoga 직접 사용) ✅
```

### 초기화 방식

```typescript
// BuilderCanvas.tsx
const [yogaReady, setYogaReady] = useState(false);

useEffect(() => {
  initYoga().then(() => setYogaReady(true));
}, []);

const layoutResult = useMemo(() => {
  if (!currentPageId || !yogaReady) return { positions: new Map() };
  return calculateLayout(elements, currentPageId, pageWidth, pageHeight);
}, [elements, currentPageId, pageWidth, pageHeight, yogaReady]);
```

---

## Phase 7.9: borderStyle 구현 상세 계획

### 목표

CSS `borderStyle` 속성 (solid, dashed, dotted, double)을 Canvas에서 지원

### 구현 방식

PixiJS Graphics는 점선/대시선을 직접 지원하지 않으므로 **커스텀 그리기** 필요

```typescript
// styleConverter.ts 또는 BoxSprite.tsx에 추가
function drawStyledBorder(
  g: PixiGraphics,
  x: number, y: number, width: number, height: number,
  borderStyle: string,
  strokeStyle: { width: number; color: number; alpha: number },
  borderRadius: number
): void {
  g.setStrokeStyle(strokeStyle);

  switch (borderStyle) {
    case 'dashed':
      drawDashedRect(g, x, y, width, height, 8, 4, borderRadius);
      break;
    case 'dotted':
      drawDottedRect(g, x, y, width, height, borderRadius);
      break;
    case 'double':
      drawDoubleRect(g, x, y, width, height, strokeStyle.width, borderRadius);
      break;
    case 'solid':
    default:
      if (borderRadius > 0) {
        g.roundRect(x, y, width, height, borderRadius);
      } else {
        g.rect(x, y, width, height);
      }
      g.stroke();
      break;
  }
}

function drawDashedRect(
  g: PixiGraphics,
  x: number, y: number, w: number, h: number,
  dashLen: number, gapLen: number, radius: number
): void {
  // 4개 변을 점선으로 그리기
  drawDashedLine(g, x, y, x + w, y, dashLen, gapLen);           // Top
  drawDashedLine(g, x + w, y, x + w, y + h, dashLen, gapLen);   // Right
  drawDashedLine(g, x + w, y + h, x, y + h, dashLen, gapLen);   // Bottom
  drawDashedLine(g, x, y + h, x, y, dashLen, gapLen);           // Left
}

function drawDashedLine(
  g: PixiGraphics,
  x1: number, y1: number, x2: number, y2: number,
  dashLen: number, gapLen: number
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const nx = dx / len;
  const ny = dy / len;

  let drawn = 0;
  let isDash = true;

  while (drawn < len) {
    const segLen = isDash ? dashLen : gapLen;
    const endDraw = Math.min(drawn + segLen, len);

    if (isDash) {
      g.moveTo(x1 + nx * drawn, y1 + ny * drawn);
      g.lineTo(x1 + nx * endDraw, y1 + ny * endDraw);
      g.stroke();
    }

    drawn = endDraw;
    isDash = !isDash;
  }
}
```

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `styleConverter.ts` | borderStyle 타입 이미 CSSStyle에 정의됨 ✅, drawStyledBorder() 추가 |
| `BoxSprite.tsx` | stroke 로직을 drawStyledBorder()로 교체 |
| `TextSprite.tsx` | 동일하게 적용 |

### 커밋 메시지

```
feat(canvas): add borderStyle support (dashed, dotted, double) (P7.9)

- Add drawStyledBorder() helper function
- Implement drawDashedLine() for dashed/dotted borders
- Support solid, dashed, dotted, double border styles
```

---

## 최종 아키텍처 요약

### Canvas 폴더 구조 (P1-P7.9 완료 후)

```
apps/builder/src/builder/workspace/canvas/
├── pixiSetup.ts              # P2,P4: PIXI_COMPONENTS 카탈로그 + useExtend
├── BuilderCanvas.tsx         # P7.8: initYoga() 초기화
├── canvasSync.ts             # Canvas 상태 동기화
│
├── layout/
│   ├── index.ts              # 레이아웃 모듈 exports
│   ├── LayoutEngine.ts       # P7.8: Yoga 기반 Flexbox 레이아웃
│   └── GridLayout.tsx        # CSS Grid 지원
│
├── sprites/
│   ├── index.ts              # 스프라이트 모듈 exports
│   ├── ElementSprite.tsx     # 요소 렌더링 라우터
│   ├── BoxSprite.tsx         # P7.5,P7.6,P7.9: Box 요소 (verticalAlign, borderStyle)
│   ├── TextSprite.tsx        # P7.2-P7.7: 텍스트 (fontStyle, letterSpacing, textDecoration)
│   ├── ImageSprite.tsx       # 이미지 렌더링
│   └── styleConverter.ts     # CSS → PixiJS 스타일 변환
│
├── selection/
│   ├── SelectionLayer.tsx    # P1,P3: 선택 오버레이
│   ├── SelectionBox.tsx      # P1,P3: camelCase 이벤트
│   └── TransformHandle.tsx   # P1,P3: camelCase 이벤트
│
├── ui/                       # P5,P6: @pixi/ui 컴포넌트
│   ├── PixiButton.tsx        # P5: layoutContainer 래퍼
│   ├── PixiSlider.tsx        # P6.1
│   ├── PixiInput.tsx         # P6.2
│   ├── PixiSelect.tsx        # P6.3
│   ├── PixiProgressBar.tsx   # P6.4
│   ├── PixiFancyButton.tsx   # P6.5
│   ├── PixiSwitcher.tsx      # P6.6
│   ├── PixiScrollBox.tsx     # P6.7
│   ├── PixiList.tsx          # P6.8
│   └── PixiMaskedFrame.tsx   # P6.9
│
├── grid/                     # 그리드 레이어
├── viewport/                 # 뷰포트 컨트롤
└── layers/                   # 레이어 관리
```

### 의존성 정리

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `pixi.js` | ^8.14.3 | Core WebGL 렌더링 |
| `@pixi/react` | ^8.0.5 | React JSX 바인딩 |
| `@pixi/ui` | ^2.3.2 | UI 컴포넌트 (P6) |
| `@pixi/layout` | ^3.2.0 | UI 내부 레이아웃 |
| `yoga-layout` | ^3.0.0 | **Flexbox 엔진 (P7.8)** |

### 코드 변경 통계

| 항목 | Before | After | 변화 |
|------|--------|-------|------|
| layoutCalculator.ts | 549줄 | 삭제 | -549 |
| FlexLayout.tsx | 248줄 | 삭제 | -248 |
| LayoutEngine.ts | 없음 | 455줄 | +455 |
| **총 레이아웃 코드** | 797줄 | 455줄 | **-43%** |

### API 패턴 준수 현황

| 패턴 | 준수 | 적용 위치 |
|------|------|----------|
| camelCase 이벤트 | ✅ | P1: TransformHandle, SelectionBox |
| extend() 중앙 집중 | ✅ | P2: pixiSetup.ts |
| fill() → stroke() 순서 | ✅ | P3: 모든 Graphics 컴포넌트 |
| useExtend 훅 | ✅ | P4: PixiExtendBridge |
| @pixi/ui imperative | ✅ | P5-P6: 모든 UI 컴포넌트 |
| yoga-layout 직접 사용 | ✅ | P7.8: LayoutEngine.ts |

---

## 참조 문서

### 공식 문서

- [PixiJS v8 Migration Guide](https://pixijs.com/8.x/guides/migrations/v8)
- [PixiJS Graphics Guide](https://pixijs.com/8.x/guides/components/scene-objects/graphics)
- [PixiJS Events Guide](https://pixijs.com/8.x/guides/components/events)
- [@pixi/react Documentation](https://react.pixijs.io/)
- [@pixi/react extend API](https://react.pixijs.io/extend/)
- [@pixi/layout Documentation](https://layout.pixijs.io/)
- [@pixi/ui GitHub](https://github.com/pixijs/ui)
- [@pixi/ui Storybook](https://pixijs.io/ui/)

### 프로젝트 내부 문서

- `CLAUDE.md` - 프로젝트 가이드라인
- `docs/COMPLETED_FEATURES.md` - 완료된 기능 목록
- `docs/PLANNED_FEATURES.md` - 계획된 기능 목록
