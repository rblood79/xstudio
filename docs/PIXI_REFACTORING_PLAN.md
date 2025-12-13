# Pixi.js 사용 개선 Phase Plan

> **생성일**: 2025-12-13
> **최종 검증일**: 2025-12-13
> **기반**: Pixi.js 생태계 라이브러리 사용 감사 보고서 + 공식 레퍼런스 교차 검증
> **목표**: 공식 레퍼런스 준수, 코드 품질 향상, 성능 최적화

---

## 개요

### 설치된 패키지

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `pixi.js` | ^8.14.3 | Core 2D WebGL 렌더링 엔진 |
| `@pixi/react` | ^8.0.5 | React 바인딩 (JSX 컴포넌트) |
| `@pixi/layout` | ^3.2.0 | Yoga 기반 Flexbox 레이아웃 |
| `@pixi/ui` | ^2.3.2 | UI 컴포넌트 라이브러리 |

### Phase 요약

| Phase | 우선순위 | 작업 내용 | 검증 상태 |
|-------|---------|----------|----------|
| **P1** | High | 이벤트 핸들러 일관성 통일 | ⚠️ 프로젝트 일관성 기준 |
| **P2** | High | extend() 중복 제거 | ✅ 검증됨 |
| **P3** | Critical | Graphics fill()/stroke() 순서 수정 | ✅ 공식 문서 확인 |
| **P4** | Medium | useExtend 훅 도입 | ✅ 선택적 최적화 |
| **P5** | Medium | PixiButton layoutContainer 이슈 해결 | 조사 필요 |
| **P6** | High | @pixi/ui 전체 컴포넌트 지원 | 신규 |

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
- `src/builder/workspace/canvas/selection/TransformHandle.tsx:106-108`
- `src/builder/workspace/canvas/selection/SelectionBox.tsx:121-123`

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

### 현재 문제점

**@pixi/layout layoutContainer의 이벤트 전파 이슈**로 PixiButton이 비활성화됨:

```tsx
// ElementSprite.tsx:154-162
// TODO: @pixi/layout layoutContainer 이벤트 문제로 임시 BoxSprite 사용
case 'button':
  return (
    <BoxSprite ... />  // ❌ PixiButton 대신 BoxSprite 사용 중
  );
```

**PixiButton.tsx는 구현되어 있지만 실제 렌더링에서 사용되지 않음.**

### 변경 방안

**이슈 조사 후 해결책 적용**

```tsx
// 해결 후 ElementSprite.tsx
case 'button':
  return (
    <PixiButton    // ✅ PixiButton 활성화
      element={effectiveElement}
      isSelected={isSelected}
      onClick={onClick}
    />
  );
```

### 조사 항목

- [ ] @pixi/layout GitHub Issues에서 이벤트 관련 이슈 검색
- [ ] layoutContainer eventMode 설정 테스트
- [ ] 이벤트 버블링/캡처링 동작 확인
- [ ] @pixi/layout v3.2.0 릴리즈 노트 확인

### 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `ui/PixiButton.tsx` | 이벤트 처리 수정 (조사 후 결정) |
| `sprites/ElementSprite.tsx` | PixiButton 활성화 (154-162) |

### 커밋 메시지

```
fix(workspace): resolve layoutContainer event issue and enable PixiButton

- Fix eventMode configuration for @pixi/layout
- Enable PixiButton in ElementSprite dispatcher
- Remove BoxSprite fallback for button type
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
src/builder/workspace/canvas/ui/
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

## 실행 계획

### 즉시 실행 (Day 1-2)

- [x] Phase Plan 문서 작성
- [ ] **Phase 1**: 이벤트 핸들러 camelCase 통일 (2파일, 6줄)
- [ ] **Phase 2**: extend() 정리 (2파일)
- [ ] **Phase 3**: Graphics fill() 순서 수정 (2파일) ⚠️ Critical

### 단기 (Week 1)

- [ ] **Phase 4**: useExtend 훅 도입 (선택적)
- [ ] **Phase 5**: PixiButton layoutContainer 이슈 조사

### 중기 (Week 2-4)

- [ ] **Phase 6.1**: PixiSlider 구현
- [ ] **Phase 6.2**: PixiInput 구현
- [ ] **Phase 6.3**: PixiSelect 구현
- [ ] **Phase 6.4**: PixiProgressBar 구현

### 장기 (Month 2+)

- [ ] **Phase 6.5-6.9**: 나머지 @pixi/ui 컴포넌트

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
