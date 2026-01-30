# Component Spec Architecture - 상세 설계 문서

> **작성일**: 2026-01-27
> **상태**: Phase 1 구현 진행 중 (Button 완료)
> **목표**: Builder(WebGL)와 Publish(React)의 100% 시각적 일치

---

## 목차

1. [Executive Summary](#1-executive-summary)
2. [아키텍처 개요](#2-아키텍처-개요)
3. [Phase 0: 인프라 구축](#3-phase-0-인프라-구축)
4. [Phase 1: 핵심 컴포넌트 마이그레이션](#4-phase-1-핵심-컴포넌트-마이그레이션)
5. [Phase 2: Form 컴포넌트 마이그레이션](#5-phase-2-form-컴포넌트-마이그레이션)
6. [Phase 3: 복합 컴포넌트 마이그레이션](#6-phase-3-복합-컴포넌트-마이그레이션)
7. [Phase 4: 특수 컴포넌트 마이그레이션](#7-phase-4-특수-컴포넌트-마이그레이션)
8. [Phase 5: 검증 및 최적화](#8-phase-5-검증-및-최적화)
9. [기술 명세](#9-기술-명세)
10. [마이그레이션 전략](#10-마이그레이션-전략)

---

## 1. Executive Summary

### 1.1 현재 문제

```
현재: 3개 소스 분리
├── Button.css (CSS 스타일)
├── cssVariableReader.ts (런타임 변환)
└── PixiButton.tsx (PIXI 렌더링)

문제점:
- 시각적 일치율: 70-80%
- hover 계산 불일치 (CSS: color-mix vs PIXI: mixWithBlack)
- 62개 컴포넌트 × 3파일 = 186개 파일 유지보수
- 새 variant 추가 시 3곳 수정 필요
```

### 1.2 목표 아키텍처

```
목표: 1개 소스 (Component Spec)
└── Button.spec.ts
    ├── tokens (값)
    ├── render.shape (도형 정의)
    ├── render.react (React 변환)
    └── render.pixi (PIXI 변환)

기대효과:
- 시각적 일치율: 95-98%
- 단일 소스 = 완벽한 동기화
- 72개 컴포넌트 × 1파일 = 72개 파일
- 새 variant 추가 시 1곳만 수정
```

### 1.3 Phase 요약

| Phase | 내용 | 기간 | 산출물 |
|-------|------|------|--------|
| 0 | 인프라 구축 | 2주 | specs/, 렌더러, 타입 시스템 |
| 1 | 핵심 컴포넌트 (10개) | 2주 | Button, Card, Badge 등 |
| 2 | Form 컴포넌트 (15개) | 3주 | TextField, Select, Checkbox 등 |
| 3 | 복합 컴포넌트 (20개) | 3주 | Table, Tree, Tabs 등 |
| 4 | 특수 컴포넌트 (17개) | 2주 | DatePicker, ColorPicker 등 |
| 5 | 검증 및 최적화 | 2주 | 테스트, 성능 최적화 |

**총 기간: 14주 (약 3.5개월)**

---

## 2. 아키텍처 개요

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    Component Spec Architecture               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  packages/specs/                                             │
│  ├── primitives/           # 기본 토큰                       │
│  │   ├── colors.ts         # 색상 토큰                       │
│  │   ├── spacing.ts        # 간격 토큰                       │
│  │   ├── typography.ts     # 타이포그래피 토큰               │
│  │   └── shadows.ts        # 그림자 토큰                     │
│  │                                                           │
│  ├── components/           # 컴포넌트 스펙                   │
│  │   ├── Button.spec.ts                                      │
│  │   ├── TextField.spec.ts                                   │
│  │   └── ... (72개)                                          │
│  │                                                           │
│  ├── renderers/            # 렌더러                          │
│  │   ├── ReactRenderer.ts  # Spec → React Props              │
│  │   ├── PixiRenderer.ts   # Spec → PIXI Graphics            │
│  │   └── CSSGenerator.ts   # Spec → CSS 파일                 │
│  │                                                           │
│  └── types/                # 타입 정의                       │
│      ├── spec.types.ts                                       │
│      ├── shape.types.ts                                      │
│      └── token.types.ts                                      │
│                                                              │
│  ┌─────────────────┐       ┌─────────────────┐               │
│  │ shared/         │       │ builder/canvas/ │               │
│  │ components/     │       │ ui/             │               │
│  │                 │       │                 │               │
│  │ Button.tsx      │       │ PixiButton.tsx  │               │
│  │ (ReactRenderer  │       │ (PixiRenderer   │               │
│  │  사용)          │       │  사용)          │               │
│  └─────────────────┘       └─────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름

```
┌──────────────┐
│ Button.spec  │ (Single Source of Truth)
└──────┬───────┘
       │
       ├────────────────────┬────────────────────┐
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ CSSGenerator │     │ ReactRenderer│     │ PixiRenderer │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Button.css   │     │ Button.tsx   │     │ PixiButton   │
│ (빌드 시 생성)│     │ (Props 적용) │     │ (Graphics)   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │              브라우저 CSS               │
       │              레이아웃 엔진              │
       │                    │           ┌────────┴────────┐
       │                    │           │ Hybrid Layout   │
       │                    │           │ Engine          │
       │                    │           │ ┌─────────────┐ │
       │                    │           │ │ BlockEngine │ │
       │                    │           │ │ FlexEngine  │ │
       │                    │           │ │ GridEngine  │ │
       │                    │           │ └─────────────┘ │
       │                    │           └────────┬────────┘
       │                    │                    │
       └────────────────────┴────────────────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  동일한 시각적   │
                   │     결과물       │
                   └──────────────────┘
```

> **레이아웃 계층 분리**: Spec은 컴포넌트 **내부** Shape 배치를 정의하고,
> **외부** 컨테이너 간 배치는 하이브리드 레이아웃 엔진(BlockEngine/FlexEngine/GridEngine)이 담당합니다.
> React 경로는 브라우저 CSS 레이아웃을, PIXI 경로는 하이브리드 엔진을 사용하여 동일한 결과를 보장합니다.
> 자세한 내용은 [LAYOUT_REQUIREMENTS.md](./LAYOUT_REQUIREMENTS.md)를 참조하세요.

### 2.3 핵심 원칙

1. **Single Source of Truth**: 모든 스타일 정보는 Spec에서만 정의
2. **Shape-First**: 도형을 먼저 정의하고, 각 렌더러가 해석
3. **Token Reference**: 값은 토큰으로 참조 (하드코딩 금지)
4. **Renderer Agnostic**: Spec은 렌더러에 독립적
5. **Type Safe**: 모든 Spec은 TypeScript로 타입 검증
6. **Build-Sync**: Spec 소스 변경 후 반드시 `@xstudio/specs` 빌드 실행 (dist 미갱신 시 소비자가 구 버전 참조)

---

## 3. Phase 0: 인프라 구축

### 3.1 목표

- Spec 타입 시스템 구축
- Primitive 토큰 정의
- React/PIXI 렌더러 구현
- CSS 생성기 구현

### 3.2 디렉토리 구조

```
packages/
└── specs/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts
    │   │
    │   ├── types/
    │   │   ├── index.ts
    │   │   ├── spec.types.ts        # ComponentSpec 인터페이스
    │   │   ├── shape.types.ts       # Shape 정의
    │   │   ├── token.types.ts       # 토큰 참조 타입
    │   │   └── state.types.ts       # 상태 (hover, pressed 등)
    │   │
    │   ├── primitives/
    │   │   ├── index.ts
    │   │   ├── colors.ts            # 색상 토큰
    │   │   ├── spacing.ts           # 간격 토큰
    │   │   ├── typography.ts        # 폰트 토큰
    │   │   ├── radius.ts            # 둥근 모서리 토큰
    │   │   └── shadows.ts           # 그림자 토큰
    │   │
    │   ├── renderers/
    │   │   ├── index.ts
    │   │   ├── ReactRenderer.ts     # Spec → React Props
    │   │   ├── PixiRenderer.ts      # Spec → PIXI Graphics
    │   │   ├── CSSGenerator.ts      # Spec → CSS 파일
    │   │   └── utils/
    │   │       └── tokenResolver.ts # 토큰 → 실제 값 (색상, 크기, 그림자 등)
    │   │
    │   └── components/
    │       └── (Phase 1에서 추가)
    │
    └── scripts/
        ├── generate-css.ts          # CSS 생성 스크립트
        └── validate-specs.ts        # Spec 검증 스크립트
```

### 3.3 핵심 타입 정의

#### 3.3.1 ComponentSpec 인터페이스

```typescript
// packages/specs/src/types/spec.types.ts

import type { Shape } from './shape.types';
import type { TokenRef } from './token.types';
import type { StateStyles } from './state.types';

/**
 * 컴포넌트 스펙 - 단일 소스
 */
export interface ComponentSpec<Props = Record<string, unknown>> {
  /** 컴포넌트 이름 */
  name: string;

  /** 컴포넌트 설명 */
  description?: string;

  /** 기본 HTML 태그 (React용) */
  element: keyof HTMLElementTagNameMap | 'fragment';

  /**
   * 포털/오버레이 설정 (Dialog, Tooltip, Popover 등)
   * React에서는 createPortal, PIXI에서는 별도 레이어로 처리
   */
  overlay?: {
    /** 포털 사용 여부 */
    usePortal: boolean;

    /** 포털 컨테이너 (기본: document.body) */
    portalContainer?: string;

    /** 오버레이 타입 */
    type: 'modal' | 'popover' | 'tooltip' | 'drawer' | 'toast';

    /** 백드롭 표시 여부 */
    hasBackdrop?: boolean;

    /** 백드롭 클릭 시 닫기 */
    closeOnBackdropClick?: boolean;

    /** ESC 키로 닫기 */
    closeOnEscape?: boolean;

    /** 포커스 트랩 사용 */
    trapFocus?: boolean;

    /** PIXI에서의 렌더링 레이어 (z-index 개념) */
    pixiLayer?: 'content' | 'overlay' | 'modal' | 'toast';
  };

  /** Variant 정의 */
  variants: Record<string, VariantSpec>;

  /** Size 정의 */
  sizes: Record<string, SizeSpec>;

  /** 기본 variant */
  defaultVariant: string;

  /** 기본 size */
  defaultSize: string;

  /** 상태별 스타일 (hover, pressed, disabled 등) */
  states: StateStyles;

  /** 렌더링 정의 */
  render: RenderSpec<Props>;
}

/**
 * Variant 스펙
 *
 * [상태 스타일 우선순위 규칙]
 * VariantSpec의 색상은 "variant별 색상 토큰"을 정의합니다.
 * states의 스타일은 "공통 상태 효과"(transform, shadow, opacity 등)를 정의합니다.
 *
 * 우선순위: VariantSpec 색상 > states 효과 (합성)
 * - hover 시: VariantSpec.backgroundHover + states.hover 효과
 * - pressed 시: VariantSpec.backgroundPressed + states.pressed 효과
 */
export interface VariantSpec {
  /** 배경색 (토큰 참조) - default 상태 */
  background: TokenRef;

  /** 배경색 hover - hover 상태의 색상 (states.hover와 합성됨) */
  backgroundHover: TokenRef;

  /** 배경색 pressed - pressed 상태의 색상 (states.pressed와 합성됨) */
  backgroundPressed: TokenRef;

  /** 텍스트 색상 */
  text: TokenRef;

  /** 텍스트 색상 hover (optional, 미지정 시 text 사용) */
  textHover?: TokenRef;

  /** 테두리 색상 (optional) */
  border?: TokenRef;

  /** 테두리 색상 hover (optional) */
  borderHover?: TokenRef;

  /** 배경 투명도 (optional, 0-1) */
  backgroundAlpha?: number;
}

/**
 * Size 스펙
 */
export interface SizeSpec {
  /** 높이 (px) */
  height: number;

  /** 가로 패딩 (px) */
  paddingX: number;

  /** 세로 패딩 (px) */
  paddingY: number;

  /** 폰트 크기 (토큰 참조) */
  fontSize: TokenRef;

  /** 둥근 모서리 (토큰 참조) */
  borderRadius: TokenRef;

  /** 아이콘 크기 (optional) */
  iconSize?: number;

  /** 간격 (optional) */
  gap?: number;
}

/**
 * 컴포넌트 상태
 * - default: 기본 상태
 * - hover: 마우스 오버
 * - pressed: 클릭/터치 중
 * - focused: 포커스 (마우스/터치)
 * - focusVisible: 키보드 포커스 (접근성)
 * - disabled: 비활성화
 */
export type ComponentState = 'default' | 'hover' | 'pressed' | 'focused' | 'focusVisible' | 'disabled';

/**
 * 렌더링 스펙
 */
export interface RenderSpec<Props> {
  /**
   * 공통 도형 정의
   * React와 PIXI 모두에서 사용하는 도형 구조
   *
   * @param props - 컴포넌트 props
   * @param variant - 현재 variant 스펙
   * @param size - 현재 size 스펙
   * @param state - 현재 상태 (default, hover, pressed, focused, focusVisible, disabled)
   * @returns 렌더링할 도형 배열
   */
  shapes: (props: Props, variant: VariantSpec, size: SizeSpec, state: ComponentState) => Shape[];

  /**
   * React 특화 속성
   * className, data-* 속성 등
   */
  react?: (props: Props) => Record<string, unknown>;

  /**
   * PIXI 특화 속성
   * hitArea, eventMode 등
   */
  pixi?: (props: Props) => Record<string, unknown>;
}
```

```typescript
// packages/specs/src/types/state.types.ts

/**
 * 상태별 스타일 정의
 *
 * [역할 분리]
 * - VariantSpec: variant별 "색상" 정의 (background, text, border)
 * - StateStyles: 상태별 "효과" 정의 (transform, shadow, opacity 등)
 *
 * 두 가지가 합성되어 최종 스타일이 결정됩니다.
 */
export interface StateStyles {
  /** hover 상태 효과 (VariantSpec.backgroundHover와 합성) */
  hover?: StateEffect;

  /** pressed 상태 효과 (VariantSpec.backgroundPressed와 합성) */
  pressed?: StateEffect;

  /** focused 상태 효과 */
  focused?: StateEffect;

  /** disabled 상태 효과 */
  disabled?: StateEffect;

  /** focus-visible 상태 효과 (키보드 포커스) */
  focusVisible?: StateEffect;
}

/**
 * 상태 효과 (색상 제외 - 색상은 VariantSpec에서 정의)
 */
export interface StateEffect {
  /** 변형 */
  transform?: string;

  /** 그림자 (CSS box-shadow 형식 또는 토큰 참조 {shadow.md}) */
  boxShadow?: string | ShadowTokenRef;

  /** 투명도 (0-1) */
  opacity?: number;

  /** 스케일 (1 = 100%) */
  scale?: number;

  /** 아웃라인 (focus ring) */
  outline?: string;
  outlineOffset?: string;

  /** 커서 */
  cursor?: string;

  /** 트랜지션 (기본값 사용 시 생략) */
  transition?: string;

  /** 포인터 이벤트 */
  pointerEvents?: 'none' | 'auto';
}
```

#### 3.3.2 Shape 타입

```typescript
// packages/specs/src/types/shape.types.ts

/**
 * 기본 도형 타입
 */
/**
 * 모든 Shape의 공통 속성
 * Border/Shadow 타겟팅을 위한 id 포함
 */
export interface ShapeBase {
  /** 고유 식별자 (Border/Shadow 적용 대상 지정용) */
  id?: string;
}

/**
 * Shape 유니온 타입
 * 모든 Shape는 ShapeBase를 포함 (& 교차 타입)
 */
export type Shape =
  | (RectShape & ShapeBase)
  | (RoundRectShape & ShapeBase)
  | (CircleShape & ShapeBase)
  | (TextShape & ShapeBase)
  | (ShadowShape & ShapeBase)
  | (BorderShape & ShapeBase)
  | (ContainerShape & ShapeBase)
  | (GradientShape & ShapeBase)
  | (ImageShape & ShapeBase)
  | (LineShape & ShapeBase);

/**
 * 사각형
 */
export interface RectShape {
  type: 'rect';
  x: number;
  y: number;
  width: number | 'auto';
  height: number | 'auto';
  fill?: ColorValue;
  fillAlpha?: number;
}

/**
 * 둥근 사각형
 */
export interface RoundRectShape {
  type: 'roundRect';
  x: number;
  y: number;
  width: number | 'auto';
  height: number | 'auto';
  radius: number | [number, number, number, number]; // [tl, tr, br, bl]
  fill?: ColorValue;
  fillAlpha?: number;
}

/**
 * 원
 */
export interface CircleShape {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
  fill?: ColorValue;
  fillAlpha?: number;
}

/**
 * 텍스트
 */
export interface TextShape {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  fill?: ColorValue;
  align?: 'left' | 'center' | 'right';
  baseline?: 'top' | 'middle' | 'bottom';

  /** 줄 높이 (배수, 예: 1.5) */
  lineHeight?: number;

  /** 자간 (px) */
  letterSpacing?: number;

  /** 텍스트 장식 */
  textDecoration?: 'none' | 'underline' | 'line-through';

  /** 텍스트 변환 */
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';

  /** 최대 너비 (말줄임 처리) */
  maxWidth?: number;

  /** 오버플로우 처리 */
  overflow?: 'visible' | 'ellipsis' | 'clip';

  /** 줄 수 제한 (multiline 텍스트) */
  maxLines?: number;
}

/**
 * 그림자
 *
 * [적용 방식]
 * - target이 없으면: shapes 배열에서 바로 앞의 도형에 적용
 * - target이 있으면: 해당 id를 가진 도형에 적용
 */
export interface ShadowShape {
  type: 'shadow';

  /** 적용 대상 shape의 id (없으면 이전 shape에 적용) */
  target?: string;

  /** 그림자가 적용될 영역 (target 없이 직접 지정 시) */
  x?: number;
  y?: number;
  width?: number | 'auto';
  height?: number | 'auto';
  radius?: number | [number, number, number, number];

  /** 그림자 오프셋 */
  offsetX: number;
  offsetY: number;

  /** 블러 반경 */
  blur: number;

  /** 확산 (CSS spread) */
  spread?: number;

  /** 그림자 색상 */
  color: ColorValue;

  /** 투명도 */
  alpha?: number;

  /** 내부 그림자 여부 */
  inset?: boolean;
}

/**
 * 테두리
 *
 * [적용 방식]
 * - target이 없으면: shapes 배열에서 바로 앞의 도형 윤곽에 적용
 * - target이 있으면: 해당 id를 가진 도형에 적용
 */
export interface BorderShape {
  type: 'border';

  /** 적용 대상 shape의 id (없으면 이전 shape에 적용) */
  target?: string;

  /** 테두리가 적용될 영역 (target 없이 직접 지정 시) */
  x?: number;
  y?: number;
  width?: number | 'auto';
  height?: number | 'auto';

  /** 테두리 두께 */
  borderWidth: number;

  /** 테두리 색상 */
  color: ColorValue;

  /** 테두리 스타일 */
  style?: 'solid' | 'dashed' | 'dotted';

  /** 모서리 반경 */
  radius?: number | [number, number, number, number];

  /** 특정 변만 적용 */
  sides?: {
    top?: boolean;
    right?: boolean;
    bottom?: boolean;
    left?: boolean;
  };
}

/**
 * 컨테이너 (자식 요소 그룹)
 */
export interface ContainerShape {
  type: 'container';
  x: number;
  y: number;
  width?: number | 'auto';
  height?: number | 'auto';
  children: Shape[];
  clip?: boolean;

  /** 레이아웃 설정 (@pixi/layout 연동) */
  layout?: ContainerLayout;
}

/**
 * 컨테이너 레이아웃 설정
 */
export interface ContainerLayout {
  /** 레이아웃 타입 (하이브리드 엔진: block/inline-block→BlockEngine, flex→FlexEngine, grid→GridEngine) */
  display?: 'flex' | 'block' | 'inline-block' | 'grid' | 'flow-root' | 'none';

  /** 포지션 타입 */
  position?: 'relative' | 'absolute' | 'fixed';

  /** absolute/fixed 포지션일 때 위치 */
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;

  /** z-index (레이어 순서) */
  zIndex?: number;

  // ─── Box Model (Phase 11) ───
  boxSizing?: 'content-box' | 'border-box';
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;

  // ─── Overflow / BFC ───
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowX?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowY?: 'visible' | 'hidden' | 'scroll' | 'auto';

  // ─── Typography / Inline ───
  lineHeight?: number | string;
  verticalAlign?: 'baseline' | 'top' | 'middle' | 'bottom';
  visibility?: 'visible' | 'hidden';

  // ─── Flex 레이아웃 ───
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  alignContent?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'space-between' | 'space-around';

  // ─── Grid 레이아웃 ───
  gridTemplateColumns?: string; // "1fr 1fr" | "repeat(3, 100px)"
  gridTemplateRows?: string;
  gridGap?: number | [number, number]; // [rowGap, columnGap]
  gridAutoFlow?: 'row' | 'column' | 'dense';

  // ─── 공통 ───
  gap?: number;
  rowGap?: number;
  columnGap?: number;
  padding?: number | [number, number, number, number];
  margin?: number | [number, number, number, number];

  // ─── 자식 요소용 (flex/grid item) ───
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | 'auto';
  alignSelf?: 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'start' | 'end';
  justifySelf?: 'auto' | 'start' | 'center' | 'end' | 'stretch' | 'normal';
}

/**
 * 그라디언트 (ColorPicker, Slider 등에서 사용)
 */
export interface GradientShape {
  type: 'gradient';
  x: number;
  y: number;
  width: number | 'auto';
  height: number | 'auto';
  radius?: number | [number, number, number, number];
  gradient: {
    type: 'linear' | 'radial';
    angle?: number; // linear gradient 각도 (0-360)
    stops: Array<{
      offset: number; // 0-1
      color: ColorValue;
    }>;
  };
}

/**
 * 이미지
 */
export interface ImageShape {
  type: 'image';
  x: number;
  y: number;
  width: number | 'auto';
  height: number | 'auto';
  src: string;
  fit?: 'contain' | 'cover' | 'fill' | 'none';
  radius?: number | [number, number, number, number];
}

/**
 * 선
 */
export interface LineShape {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: ColorValue;
  strokeWidth: number;
  strokeDasharray?: number[];
}

/**
 * 색상 값 (토큰 참조 또는 직접 값)
 */
export type ColorValue = TokenRef | string | number;
```

#### 3.3.3 토큰 타입

```typescript
// packages/specs/src/types/token.types.ts

/**
 * 토큰 참조 문자열
 * 예: '{color.primary}', '{spacing.md}', '{radius.lg}'
 */
export type TokenRef = `{${string}}`;

/**
 * 타입 안전한 토큰 참조 (권장)
 * 컴파일 타임에 유효한 토큰만 허용
 */
export type ColorTokenRef = `{color.${keyof ColorTokens}}`;
export type SpacingTokenRef = `{spacing.${keyof SpacingTokens}}`;
export type TypographyTokenRef = `{typography.${keyof TypographyTokens}}`;
export type RadiusTokenRef = `{radius.${keyof RadiusTokens}}`;
export type ShadowTokenRef = `{shadow.${keyof ShadowTokens}}`;

/**
 * 모든 유효한 토큰 참조 유니온
 */
export type StrictTokenRef =
  | ColorTokenRef
  | SpacingTokenRef
  | TypographyTokenRef
  | RadiusTokenRef
  | ShadowTokenRef;

/**
 * 토큰 참조 유효성 검사 유틸리티
 */
export function isValidTokenRef(ref: string): ref is TokenRef {
  const pattern = /^\{(color|spacing|typography|radius|shadow)\.[a-zA-Z0-9-]+\}$/;
  return pattern.test(ref);
}

/**
 * 토큰 카테고리
 */
export interface TokenCategories {
  color: ColorTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  radius: RadiusTokens;
  shadow: ShadowTokens;
}

/**
 * 색상 토큰
 */
export interface ColorTokens {
  // Primary
  primary: string;
  'primary-hover': string;
  'primary-pressed': string;
  'on-primary': string;

  // Secondary
  secondary: string;
  'secondary-hover': string;
  'secondary-pressed': string;
  'on-secondary': string;

  // Tertiary
  tertiary: string;
  'tertiary-hover': string;
  'tertiary-pressed': string;
  'on-tertiary': string;

  // Error
  error: string;
  'error-hover': string;
  'error-pressed': string;
  'on-error': string;

  // Surface
  surface: string;
  'surface-container': string;
  'surface-container-high': string;
  'surface-container-highest': string;
  'on-surface': string;

  // Outline
  outline: string;
  'outline-variant': string;
}

/**
 * 간격 토큰
 */
export interface SpacingTokens {
  xs: number;  // 4
  sm: number;  // 8
  md: number;  // 16
  lg: number;  // 24
  xl: number;  // 32
  '2xl': number; // 48
}

/**
 * 타이포그래피 토큰
 */
export interface TypographyTokens {
  'text-xs': number;   // 12
  'text-sm': number;   // 14
  'text-md': number;   // 16
  'text-lg': number;   // 18
  'text-xl': number;   // 20
  'text-2xl': number;  // 24
}

/**
 * 둥근 모서리 토큰
 */
export interface RadiusTokens {
  none: number;  // 0
  sm: number;    // 4
  md: number;    // 6
  lg: number;    // 8
  xl: number;    // 12
  full: number;  // 9999
}

/**
 * 그림자 토큰
 */
export interface ShadowTokens {
  /** 그림자 없음 */
  none: string;

  /** 작은 그림자 (elevation 1) */
  sm: string;

  /** 중간 그림자 (elevation 2) */
  md: string;

  /** 큰 그림자 (elevation 3) */
  lg: string;

  /** 매우 큰 그림자 (elevation 4) */
  xl: string;

  /** 내부 그림자 (inset) */
  inset: string;

  /** 포커스 링 */
  'focus-ring': string;
}
```

### 3.4 Primitive 토큰 정의

```typescript
// packages/specs/src/primitives/colors.ts

import type { ColorTokens } from '../types/token.types';

/**
 * Light 모드 색상 토큰
 * Material Design 3 기반
 */
export const lightColors: ColorTokens = {
  // Primary (Purple)
  primary: '#6750a4',
  'primary-hover': '#5c4799',
  'primary-pressed': '#523e8e',
  'on-primary': '#ffffff',

  // Secondary
  secondary: '#625b71',
  'secondary-hover': '#584f66',
  'secondary-pressed': '#4e455c',
  'on-secondary': '#ffffff',

  // Tertiary
  tertiary: '#7d5260',
  'tertiary-hover': '#714956',
  'tertiary-pressed': '#65404c',
  'on-tertiary': '#ffffff',

  // Error
  error: '#b3261e',
  'error-hover': '#a1221b',
  'error-pressed': '#8f1e18',
  'on-error': '#ffffff',

  // Surface
  surface: '#fef7ff',
  'surface-container': '#f3edf7',
  'surface-container-high': '#ece6f0',
  'surface-container-highest': '#e6e0e9',
  'on-surface': '#1d1b20',

  // Outline
  outline: '#79747e',
  'outline-variant': '#cac4d0',
};

/**
 * Dark 모드 색상 토큰
 */
export const darkColors: ColorTokens = {
  // Primary
  primary: '#d0bcff',
  'primary-hover': '#c4aff7',
  'primary-pressed': '#b8a2ef',
  'on-primary': '#381e72',

  // Secondary
  secondary: '#ccc2dc',
  'secondary-hover': '#c0b5d0',
  'secondary-pressed': '#b4a8c4',
  'on-secondary': '#332d41',

  // Tertiary
  tertiary: '#efb8c8',
  'tertiary-hover': '#e3acbc',
  'tertiary-pressed': '#d7a0b0',
  'on-tertiary': '#492532',

  // Error
  error: '#f2b8b5',
  'error-hover': '#e6acab',
  'error-pressed': '#daa0a1',
  'on-error': '#601410',

  // Surface
  surface: '#141218',
  'surface-container': '#211f26',
  'surface-container-high': '#2b2930',
  'surface-container-highest': '#36343b',
  'on-surface': '#e6e0e9',

  // Outline
  outline: '#938f99',
  'outline-variant': '#49454f',
};

/**
 * 현재 테마에 따른 색상 반환
 */
export function getColorToken(name: keyof ColorTokens, theme: 'light' | 'dark' = 'light'): string {
  return theme === 'dark' ? darkColors[name] : lightColors[name];
}
```

```typescript
// packages/specs/src/primitives/spacing.ts

import type { SpacingTokens } from '../types/token.types';

export const spacing: SpacingTokens = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

export function getSpacingToken(name: keyof SpacingTokens): number {
  return spacing[name];
}
```

```typescript
// packages/specs/src/primitives/typography.ts

import type { TypographyTokens } from '../types/token.types';

export const typography: TypographyTokens = {
  'text-xs': 12,
  'text-sm': 14,
  'text-md': 16,
  'text-lg': 18,
  'text-xl': 20,
  'text-2xl': 24,
};

export const fontFamily = {
  sans: 'Inter, system-ui, -apple-system, sans-serif',
  mono: 'JetBrains Mono, Consolas, monospace',
};

/**
 * 폰트 두께
 */
export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

/**
 * 줄 높이 (배수)
 */
export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
};

export function getTypographyToken(name: keyof TypographyTokens): number {
  return typography[name];
}
```

```typescript
// packages/specs/src/primitives/radius.ts

import type { RadiusTokens } from '../types/token.types';

/**
 * CSS 변수 기준:
 * --radius-sm: 0.25rem = 4px
 * --radius-md: 0.375rem = 6px
 * --radius-lg: 0.5rem = 8px
 * --radius-xl: 0.75rem = 12px
 */
export const radius: RadiusTokens = {
  none: 0,
  sm: 4,    // 0.25rem
  md: 6,    // 0.375rem
  lg: 8,    // 0.5rem
  xl: 12,   // 0.75rem
  full: 9999,
};

export function getRadiusToken(name: keyof RadiusTokens): number {
  return radius[name];
}
```

```typescript
// packages/specs/src/primitives/shadows.ts

import type { ShadowTokens } from '../types/token.types';

/**
 * Light 모드 그림자 토큰
 * Material Design 3 elevation 기반
 */
export const lightShadows: ShadowTokens = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.1)',
  md: '0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  lg: '0 4px 8px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
  xl: '0 8px 16px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06)',
  inset: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
  'focus-ring': '0 0 0 2px var(--primary)',
};

/**
 * Dark 모드 그림자 토큰
 */
export const darkShadows: ShadowTokens = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
  lg: '0 4px 8px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
  xl: '0 8px 16px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.2)',
  inset: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
  'focus-ring': '0 0 0 2px var(--primary)',
};

/**
 * 테마별 그림자 객체
 */
export const shadows = {
  light: lightShadows,
  dark: darkShadows,
};

export function getShadowToken(name: keyof ShadowTokens, theme: 'light' | 'dark' = 'light'): string {
  return theme === 'dark' ? darkShadows[name] : lightShadows[name];
}
```

### 3.5 렌더러 구현

#### 3.5.1 Token Resolver

```typescript
// packages/specs/src/renderers/utils/tokenResolver.ts

import type { TokenRef, ColorValue } from '../../types';
import { lightColors, darkColors } from '../../primitives/colors';
import { spacing } from '../../primitives/spacing';
import { typography } from '../../primitives/typography';
import { radius } from '../../primitives/radius';
import { shadows } from '../../primitives/shadows';

/**
 * 토큰 참조를 실제 값으로 변환
 */
export function resolveToken(ref: TokenRef, theme: 'light' | 'dark' = 'light'): string | number {
  // '{color.primary}' → 'primary'
  const match = ref.match(/^\{(\w+)\.(.+)\}$/);
  if (!match) {
    console.warn(`Invalid token reference: ${ref}`);
    return ref;
  }

  const [, category, name] = match;

  switch (category) {
    case 'color':
      return theme === 'dark'
        ? darkColors[name as keyof typeof darkColors]
        : lightColors[name as keyof typeof lightColors];
    case 'spacing':
      return spacing[name as keyof typeof spacing];
    case 'typography':
      return typography[name as keyof typeof typography];
    case 'radius':
      return radius[name as keyof typeof radius];
    case 'shadow':
      return theme === 'dark'
        ? shadows.dark[name as keyof typeof shadows.dark]
        : shadows.light[name as keyof typeof shadows.light];
    default:
      console.warn(`Unknown token category: ${category}`);
      return ref;
  }
}

/**
 * ColorValue를 실제 색상으로 변환
 */
export function resolveColor(value: ColorValue, theme: 'light' | 'dark' = 'light'): string | number {
  if (typeof value === 'string' && value.startsWith('{')) {
    return resolveToken(value as TokenRef, theme);
  }
  return value;
}

/**
 * CSS 변수명으로 변환
 */
export function tokenToCSSVar(ref: TokenRef): string {
  // '{color.primary}' → 'var(--primary)'
  // '{color.on-primary}' → 'var(--on-primary)'
  const match = ref.match(/^\{(\w+)\.(.+)\}$/);
  if (!match) return ref;

  const [, category, name] = match;

  switch (category) {
    case 'color':
      return `var(--${name})`;
    case 'spacing':
      return `var(--spacing-${name})`;
    case 'typography':
      return `var(--${name})`;
    case 'radius':
      return `var(--radius-${name})`;
    case 'shadow':
      return `var(--shadow-${name})`;
    default:
      return `var(--${name})`;
  }
}
```

#### 3.5.2 React Renderer

```typescript
// packages/specs/src/renderers/ReactRenderer.ts

import type { ComponentSpec, Shape, VariantSpec, SizeSpec } from '../types';
import { tokenToCSSVar } from './utils/tokenResolver';

export interface ReactRenderResult {
  /** CSS 클래스명 */
  className: string;
  /** data-* 속성 */
  dataAttributes: Record<string, string>;
  /** 인라인 스타일 (Shape에서 계산된 동적 스타일) */
  style?: React.CSSProperties;
}

/**
 * ComponentSpec을 React Props로 변환
 */
export function renderToReact<Props extends Record<string, unknown>>(
  spec: ComponentSpec<Props>,
  props: Props
): ReactRenderResult {
  const variant = (props.variant as string) || spec.defaultVariant;
  const size = (props.size as string) || spec.defaultSize;

  const variantSpec = spec.variants[variant];
  const sizeSpec = spec.sizes[size];

  if (!variantSpec || !sizeSpec) {
    console.warn(`Invalid variant/size: ${variant}/${size}`);
  }

  // 기본 data 속성
  const dataAttributes: Record<string, string> = {
    'data-variant': variant,
    'data-size': size,
  };

  // 컴포넌트별 추가 속성
  if (spec.render.react) {
    const customAttrs = spec.render.react(props);
    Object.entries(customAttrs).forEach(([key, value]) => {
      if (key.startsWith('data-') && value !== undefined) {
        dataAttributes[key] = String(value);
      }
    });
  }

  // 동적 스타일 계산 (inline style override용)
  const style = calculateDynamicStyle(spec, props, variantSpec, sizeSpec);

  return {
    className: `react-aria-${spec.name}`,
    dataAttributes,
    style,
  };
}

/**
 * Shapes에서 동적 스타일 계산
 * inline style prop으로 오버라이드된 경우에만 사용
 */
function calculateDynamicStyle<Props>(
  spec: ComponentSpec<Props>,
  props: Props,
  variantSpec: VariantSpec,
  sizeSpec: SizeSpec
): React.CSSProperties | undefined {
  const inlineStyle = (props as { style?: React.CSSProperties }).style;
  if (!inlineStyle) return undefined;

  // inline style이 있으면 그대로 반환 (CSS보다 우선)
  return inlineStyle;
}

/**
 * ComponentSpec에서 CSS 변수 스타일 생성
 */
export function generateCSSVariables(variantSpec: VariantSpec): Record<string, string> {
  return {
    '--spec-bg': tokenToCSSVar(variantSpec.background),
    '--spec-bg-hover': tokenToCSSVar(variantSpec.backgroundHover),
    '--spec-bg-pressed': tokenToCSSVar(variantSpec.backgroundPressed),
    '--spec-text': tokenToCSSVar(variantSpec.text),
    ...(variantSpec.border && { '--spec-border': tokenToCSSVar(variantSpec.border) }),
  };
}
```

#### 3.5.3 PIXI Renderer

```typescript
// packages/specs/src/renderers/PixiRenderer.ts

import type { Graphics } from 'pixi.js';
import type { ComponentSpec, Shape, VariantSpec, SizeSpec } from '../types';
import { resolveColor, resolveToken } from './utils/tokenResolver';

export interface PixiRenderContext {
  graphics: Graphics;
  theme: 'light' | 'dark';
  width: number;
  height: number;
  /** 현재 상태 (기본값: 'default') */
  state?: ComponentState;
}

/**
 * ComponentSpec의 Shapes를 PIXI Graphics로 렌더링
 */
export function renderToPixi<Props extends Record<string, unknown>>(
  spec: ComponentSpec<Props>,
  props: Props,
  context: PixiRenderContext
): void {
  const { graphics, theme, width, height, state = 'default' } = context;

  const variant = (props.variant as string) || spec.defaultVariant;
  const size = (props.size as string) || spec.defaultSize;

  const variantSpec = spec.variants[variant];
  const sizeSpec = spec.sizes[size];

  if (!variantSpec || !sizeSpec) {
    console.warn(`Invalid variant/size: ${variant}/${size}`);
    return;
  }

  // Shapes 생성 (state 파라미터 전달)
  const shapes = spec.render.shapes(props, variantSpec, sizeSpec, state);

  // Graphics 초기화
  graphics.clear();

  // 각 Shape 렌더링
  shapes.forEach(shape => {
    renderShape(graphics, shape, theme, width, height);
  });
}

/**
 * 개별 Shape 렌더링
 */
function renderShape(
  g: Graphics,
  shape: Shape,
  theme: 'light' | 'dark',
  containerWidth: number,
  containerHeight: number
): void {
  switch (shape.type) {
    case 'roundRect': {
      const width = shape.width === 'auto' ? containerWidth : shape.width;
      const height = shape.height === 'auto' ? containerHeight : shape.height;
      const fill = resolveColor(shape.fill!, theme);
      const radius = typeof shape.radius === 'number'
        ? shape.radius
        : shape.radius[0]; // 단순화: 첫 번째 값만 사용

      g.roundRect(shape.x, shape.y, width, height, radius);

      if (typeof fill === 'string') {
        g.fill({ color: hexStringToNumber(fill), alpha: shape.fillAlpha ?? 1 });
      } else {
        g.fill({ color: fill, alpha: shape.fillAlpha ?? 1 });
      }
      break;
    }

    case 'rect': {
      const width = shape.width === 'auto' ? containerWidth : shape.width;
      const height = shape.height === 'auto' ? containerHeight : shape.height;
      const fill = resolveColor(shape.fill!, theme);

      g.rect(shape.x, shape.y, width, height);

      if (typeof fill === 'string') {
        g.fill({ color: hexStringToNumber(fill), alpha: shape.fillAlpha ?? 1 });
      } else {
        g.fill({ color: fill, alpha: shape.fillAlpha ?? 1 });
      }
      break;
    }

    case 'circle': {
      const fill = resolveColor(shape.fill!, theme);

      g.circle(shape.x, shape.y, shape.radius);

      if (typeof fill === 'string') {
        g.fill({ color: hexStringToNumber(fill), alpha: shape.fillAlpha ?? 1 });
      } else {
        g.fill({ color: fill, alpha: shape.fillAlpha ?? 1 });
      }
      break;
    }

    case 'border': {
      const color = resolveColor(shape.color, theme);
      const colorNum = typeof color === 'string' ? hexStringToNumber(color) : color;

      // 타겟 영역 또는 이전 shape 영역에 테두리 그리기
      const borderX = shape.x ?? 0;
      const borderY = shape.y ?? 0;
      const borderW = shape.width === 'auto' ? containerWidth : (shape.width ?? containerWidth);
      const borderH = shape.height === 'auto' ? containerHeight : (shape.height ?? containerHeight);
      const borderR = typeof shape.radius === 'number' ? shape.radius : (shape.radius?.[0] ?? 0);

      g.roundRect(borderX, borderY, borderW, borderH, borderR);
      g.stroke({
        color: colorNum,
        width: shape.borderWidth, // borderWidth 필드 사용
        // TODO: dashed/dotted 지원 (PIXI v8 Graphics API)
      });
      break;
    }

    case 'container': {
      // 자식 요소들 렌더링
      shape.children.forEach(child => {
        renderShape(g, child, theme, containerWidth, containerHeight);
      });
      break;
    }

    // text와 shadow는 별도 처리 필요 (Graphics가 아닌 다른 객체)
    case 'text':
    case 'shadow':
      // PixiButton.tsx 등에서 별도 처리
      break;
  }
}

/**
 * CSS 색상 문자열 → PixiJS hex 숫자 변환
 * colord 라이브러리로 모든 CSS 색상 포맷 지원
 */
import { colord, extend } from 'colord';
import mixPlugin from 'colord/plugins/mix';

// color-mix() 지원을 위한 플러그인 확장
extend([mixPlugin]);

function cssColorToPixiHex(color: string, fallback: number = 0x000000): number {
  // 1. 빈 값 처리
  if (!color || color === 'transparent') {
    return fallback;
  }

  // 2. 이미 숫자인 경우
  if (typeof color === 'number') {
    return color;
  }

  // 3. 0x 접두사 hex
  if (color.startsWith('0x')) {
    return parseInt(color, 16);
  }

  // 4. # 접두사 hex
  if (color.startsWith('#')) {
    const parsed = colord(color);
    if (parsed.isValid()) {
      return parseInt(parsed.toHex().slice(1), 16);
    }
    return fallback;
  }

  // 5. rgb(), rgba(), hsl(), hsla() 등
  const parsed = colord(color);
  if (parsed.isValid()) {
    return parseInt(parsed.toHex().slice(1), 16);
  }

  // 6. color-mix() 처리 (브라우저 계산값 읽기)
  if (color.includes('color-mix')) {
    return parseColorMix(color, fallback);
  }

  return fallback;
}

/**
 * color-mix() CSS 함수 파싱
 * 브라우저의 계산된 값을 읽어서 변환
 */
function parseColorMix(colorMixStr: string, fallback: number): number {
  // 서버 사이드에서는 fallback 반환
  if (typeof document === 'undefined') {
    return fallback;
  }

  try {
    // 임시 DOM 요소로 브라우저 계산값 읽기
    const temp = document.createElement('div');
    temp.style.color = colorMixStr;
    document.body.appendChild(temp);
    const computed = getComputedStyle(temp).color;
    document.body.removeChild(temp);

    // rgb(r, g, b) 형식 파싱
    const match = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      return (r << 16) | (g << 8) | b;
    }
  } catch (e) {
    console.warn('color-mix parsing failed:', e);
  }

  return fallback;
}

/**
 * Variant 색상 세트 가져오기
 */
export function getVariantColors(
  variantSpec: VariantSpec,
  theme: 'light' | 'dark' = 'light'
): {
  bg: number;
  bgHover: number;
  bgPressed: number;
  text: number;
  border?: number;
  bgAlpha: number;
} {
  const bg = resolveColor(variantSpec.background, theme);
  const bgHover = resolveColor(variantSpec.backgroundHover, theme);
  const bgPressed = resolveColor(variantSpec.backgroundPressed, theme);
  const text = resolveColor(variantSpec.text, theme);
  const border = variantSpec.border ? resolveColor(variantSpec.border, theme) : undefined;

  return {
    bg: typeof bg === 'string' ? hexStringToNumber(bg) : bg,
    bgHover: typeof bgHover === 'string' ? hexStringToNumber(bgHover) : bgHover,
    bgPressed: typeof bgPressed === 'string' ? hexStringToNumber(bgPressed) : bgPressed,
    text: typeof text === 'string' ? hexStringToNumber(text) : text,
    border: border ? (typeof border === 'string' ? hexStringToNumber(border) : border) : undefined,
    bgAlpha: variantSpec.backgroundAlpha ?? 1,
  };
}

/**
 * Size 프리셋 가져오기
 */
export function getSizePreset(
  sizeSpec: SizeSpec
): {
  height: number;
  paddingX: number;
  paddingY: number;
  fontSize: number;
  borderRadius: number;
  iconSize?: number;
  gap?: number;
} {
  return {
    height: sizeSpec.height,
    paddingX: sizeSpec.paddingX,
    paddingY: sizeSpec.paddingY,
    fontSize: resolveToken(sizeSpec.fontSize) as number,
    borderRadius: resolveToken(sizeSpec.borderRadius) as number,
    iconSize: sizeSpec.iconSize,
    gap: sizeSpec.gap,
  };
}
```

#### 3.5.4 CSS Generator

```typescript
// packages/specs/src/renderers/CSSGenerator.ts

import type { ComponentSpec, VariantSpec, SizeSpec } from '../types';
import { tokenToCSSVar } from './utils/tokenResolver';

/**
 * ComponentSpec에서 CSS 파일 내용 생성
 */
export function generateCSS<Props>(spec: ComponentSpec<Props>): string {
  const lines: string[] = [];

  // 파일 헤더
  lines.push(`/* Generated from ${spec.name}.spec.ts */`);
  lines.push(`/* DO NOT EDIT MANUALLY */`);
  lines.push('');
  lines.push('@layer components {');

  // 기본 스타일
  lines.push(`  .react-aria-${spec.name} {`);
  lines.push(...generateBaseStyles(spec));
  lines.push('  }');
  lines.push('');

  // Variant 스타일
  Object.entries(spec.variants).forEach(([variantName, variantSpec]) => {
    lines.push(`  .react-aria-${spec.name}[data-variant="${variantName}"] {`);
    lines.push(...generateVariantStyles(variantSpec));
    lines.push('');

    // hover 상태
    lines.push('    &[data-hovered] {');
    lines.push(`      background: ${tokenToCSSVar(variantSpec.backgroundHover)};`);
    if (variantSpec.textHover) {
      lines.push(`      color: ${tokenToCSSVar(variantSpec.textHover)};`);
    }
    if (variantSpec.borderHover) {
      lines.push(`      border-color: ${tokenToCSSVar(variantSpec.borderHover)};`);
    } else if (variantSpec.border) {
      lines.push(`      border-color: ${tokenToCSSVar(variantSpec.backgroundHover)};`);
    }
    lines.push('    }');
    lines.push('');

    // pressed 상태
    lines.push('    &[data-pressed] {');
    lines.push(`      background: ${tokenToCSSVar(variantSpec.backgroundPressed)};`);
    if (variantSpec.border) {
      lines.push(`      border-color: ${tokenToCSSVar(variantSpec.backgroundPressed)};`);
    }
    lines.push('    }');
    lines.push('  }');
    lines.push('');
  });

  // Size 스타일
  Object.entries(spec.sizes).forEach(([sizeName, sizeSpec]) => {
    lines.push(`  .react-aria-${spec.name}[data-size="${sizeName}"] {`);
    lines.push(...generateSizeStyles(sizeSpec));
    lines.push('  }');
    lines.push('');
  });

  // 상태 스타일
  lines.push(...generateStateStyles(spec));

  lines.push('}');

  return lines.join('\n');
}

function generateBaseStyles<Props>(spec: ComponentSpec<Props>): string[] {
  const defaultVariant = spec.variants[spec.defaultVariant];
  const defaultSize = spec.sizes[spec.defaultSize];

  return [
    `    /* Base styles */`,
    `    display: inline-flex;`,
    `    align-items: center;`,
    `    justify-content: center;`,
    `    box-sizing: border-box;`,
    `    cursor: pointer;`,
    `    user-select: none;`,
    `    transition: background 0.15s ease, border-color 0.15s ease;`,
    `    font-family: var(--font-sans);`,
    ``,
    `    /* Default variant */`,
    `    background: ${tokenToCSSVar(defaultVariant.background)};`,
    `    color: ${tokenToCSSVar(defaultVariant.text)};`,
    defaultVariant.border
      ? `    border: 1px solid ${tokenToCSSVar(defaultVariant.border)};`
      : `    border: none;`,
    ``,
    `    /* Default size */`,
    `    height: ${defaultSize.height}px;`,
    `    padding: ${defaultSize.paddingY}px ${defaultSize.paddingX}px;`,
    `    font-size: ${tokenToCSSVar(defaultSize.fontSize)};`,
    `    border-radius: ${tokenToCSSVar(defaultSize.borderRadius)};`,
  ];
}

function generateVariantStyles(variant: VariantSpec): string[] {
  const lines = [
    `    background: ${tokenToCSSVar(variant.background)};`,
    `    color: ${tokenToCSSVar(variant.text)};`,
  ];

  if (variant.border) {
    lines.push(`    border-color: ${tokenToCSSVar(variant.border)};`);
  }

  if (variant.backgroundAlpha !== undefined && variant.backgroundAlpha < 1) {
    lines.push(`    background: transparent;`);
  }

  return lines;
}

function generateSizeStyles(size: SizeSpec): string[] {
  return [
    `    height: ${size.height}px;`,
    `    padding: ${size.paddingY}px ${size.paddingX}px;`,
    `    font-size: ${tokenToCSSVar(size.fontSize)};`,
    `    border-radius: ${tokenToCSSVar(size.borderRadius)};`,
    ...(size.gap ? [`    gap: ${size.gap}px;`] : []),
  ];
}

/**
 * boxShadow 값 해석 (토큰 또는 CSS 문자열)
 *
 * ShadowTokenRef는 `{shadow.${keyof ShadowTokens}}` 형식의 문자열 리터럴 타입이므로
 * 모든 값이 문자열로 처리됩니다.
 */
function resolveBoxShadow(value: string | ShadowTokenRef | undefined): string | undefined {
  if (!value) return undefined;

  // ShadowTokenRef도 문자열 리터럴 타입이므로 동일하게 처리
  // 토큰 참조 형식 {shadow.md}, {shadow.lg} 등
  if (value.startsWith('{shadow.')) {
    const name = value.slice(8, -1); // "md", "lg" 등
    return `var(--shadow-${name})`;
  }

  // 일반 CSS box-shadow 문자열
  return value;
}

function generateStateStyles<Props>(spec: ComponentSpec<Props>): string[] {
  const lines: string[] = [];
  const states = spec.states;

  // hover 상태 효과 (색상은 variant에서 처리, 여기선 효과만)
  if (states?.hover) {
    lines.push(`  .react-aria-${spec.name}[data-hovered] {`);
    if (states.hover.boxShadow) {
      lines.push(`    box-shadow: ${resolveBoxShadow(states.hover.boxShadow)};`);
    }
    if (states.hover.transform) {
      lines.push(`    transform: ${states.hover.transform};`);
    }
    if (states.hover.scale !== undefined) {
      lines.push(`    transform: scale(${states.hover.scale});`);
    }
    if (states.hover.opacity !== undefined) {
      lines.push(`    opacity: ${states.hover.opacity};`);
    }
    lines.push(`  }`);
    lines.push(``);
  }

  // focused 상태 효과
  if (states?.focused) {
    lines.push(`  .react-aria-${spec.name}[data-focused] {`);
    if (states.focused.outline) {
      lines.push(`    outline: ${states.focused.outline};`);
    }
    if (states.focused.outlineOffset) {
      lines.push(`    outline-offset: ${states.focused.outlineOffset};`);
    }
    if (states.focused.boxShadow) {
      lines.push(`    box-shadow: ${resolveBoxShadow(states.focused.boxShadow)};`);
    }
    if (states.focused.transform) {
      lines.push(`    transform: ${states.focused.transform};`);
    }
    lines.push(`  }`);
    lines.push(``);
  }

  // focusVisible 상태 (키보드 포커스 - 기본값 제공)
  lines.push(`  .react-aria-${spec.name}[data-focus-visible] {`);
  if (states?.focusVisible) {
    if (states.focusVisible.outline) {
      lines.push(`    outline: ${states.focusVisible.outline};`);
    } else {
      lines.push(`    outline: 2px solid var(--primary);`);
    }
    if (states.focusVisible.outlineOffset) {
      lines.push(`    outline-offset: ${states.focusVisible.outlineOffset};`);
    } else {
      lines.push(`    outline-offset: 2px;`);
    }
    if (states.focusVisible.boxShadow) {
      lines.push(`    box-shadow: ${resolveBoxShadow(states.focusVisible.boxShadow)};`);
    }
  } else {
    lines.push(`    outline: 2px solid var(--primary);`);
    lines.push(`    outline-offset: 2px;`);
  }
  lines.push(`  }`);
  lines.push(``);

  // pressed 상태 효과 (색상 외의 효과)
  if (states?.pressed) {
    lines.push(`  .react-aria-${spec.name}[data-pressed] {`);
    if (states.pressed.boxShadow) {
      lines.push(`    box-shadow: ${resolveBoxShadow(states.pressed.boxShadow)};`);
    }
    if (states.pressed.transform) {
      lines.push(`    transform: ${states.pressed.transform};`);
    }
    if (states.pressed.scale !== undefined) {
      lines.push(`    transform: scale(${states.pressed.scale});`);
    }
    lines.push(`  }`);
    lines.push(``);
  }

  // disabled 상태
  lines.push(`  .react-aria-${spec.name}[data-disabled] {`);
  if (states?.disabled) {
    lines.push(`    opacity: ${states.disabled.opacity ?? 0.38};`);
    lines.push(`    cursor: ${states.disabled.cursor ?? 'not-allowed'};`);
    if (states.disabled.pointerEvents) {
      lines.push(`    pointer-events: ${states.disabled.pointerEvents};`);
    } else {
      lines.push(`    pointer-events: none;`);
    }
  } else {
    lines.push(`    opacity: 0.38;`);
    lines.push(`    cursor: not-allowed;`);
    lines.push(`    pointer-events: none;`);
  }
  lines.push(`  }`);

  return lines;
}

/**
 * 모든 스펙에서 CSS 파일 생성
 */
export async function generateAllCSS(
  specs: ComponentSpec[],
  outputDir: string
): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  for (const spec of specs) {
    const css = generateCSS(spec);
    const filePath = path.join(outputDir, `${spec.name}.css`);
    await fs.writeFile(filePath, css, 'utf-8');
    console.log(`Generated: ${filePath}`);
  }
}
```

### 3.6 Phase 0 산출물

| 산출물 | 파일 | 설명 |
|--------|------|------|
| 타입 시스템 | `specs/src/types/*.ts` | ComponentSpec, Shape, Token 타입 |
| Primitive 토큰 | `specs/src/primitives/*.ts` | 색상, 간격, 타이포그래피, 둥근모서리 |
| React 렌더러 | `specs/src/renderers/ReactRenderer.ts` | Spec → React Props |
| PIXI 렌더러 | `specs/src/renderers/PixiRenderer.ts` | Spec → PIXI Graphics |
| CSS 생성기 | `specs/src/renderers/CSSGenerator.ts` | Spec → CSS 파일 |
| 빌드 스크립트 | `specs/scripts/*.ts` | CSS 생성, 검증 |

### 3.7 Phase 0 체크리스트

- [ ] `packages/specs` 패키지 생성
- [ ] `package.json`, `tsconfig.json` 설정
- [ ] 타입 시스템 구현 (`types/*.ts`)
- [ ] Primitive 토큰 정의 (`primitives/*.ts`)
- [ ] Token Resolver 구현
- [ ] React Renderer 구현
- [ ] PIXI Renderer 구현
- [ ] CSS Generator 구현
- [ ] 빌드 스크립트 작성
- [ ] 단위 테스트 작성

### 3.8 Phase 0 → Phase 1 검증 게이트

**Phase 1 시작 전 반드시 통과해야 하는 검증 항목:**

#### 3.8.1 필수 통과 조건 (Blocking)

| # | 검증 항목 | 기준 | 검증 방법 |
|---|----------|------|----------|
| 1 | 타입 시스템 완전성 | 모든 타입 export | `tsc --noEmit` 성공 |
| 2 | 토큰 일관성 | CSS 변수와 1:1 매핑 | 자동화 검증 스크립트 |
| 3 | React Renderer 동작 | Button Props 변환 | 단위 테스트 100% |
| 4 | PIXI Renderer 동작 | Button Graphics 생성 | 단위 테스트 100% |
| 5 | CSS Generator 동작 | Button.css 자동 생성 | diff 검증 |
| 6 | 빌드 성공 | pnpm build 성공 | CI 파이프라인 |

#### 3.8.2 품질 게이트 (Quality Gates)

```typescript
// scripts/validate-phase0.ts

interface Phase0ValidationResult {
  passed: boolean;
  blockers: string[];
  warnings: string[];
}

async function validatePhase0(): Promise<Phase0ValidationResult> {
  const result: Phase0ValidationResult = {
    passed: true,
    blockers: [],
    warnings: [],
  };

  // 1. 타입 검사
  const tscResult = await runCommand('pnpm tsc --noEmit');
  if (!tscResult.success) {
    result.blockers.push('TypeScript 컴파일 실패');
    result.passed = false;
  }

  // 2. 토큰 검증 - CSS 변수와 매핑 확인
  const tokenValidation = await validateTokenMapping();
  if (!tokenValidation.allMapped) {
    result.blockers.push(`누락된 토큰: ${tokenValidation.missing.join(', ')}`);
    result.passed = false;
  }

  // 3. Renderer 테스트
  const testResult = await runCommand('pnpm vitest run --coverage');
  if (testResult.coverage < 80) {
    result.blockers.push(`테스트 커버리지 부족: ${testResult.coverage}% (최소 80%)`);
    result.passed = false;
  }

  // 4. CSS 생성 검증
  const cssValidation = await validateGeneratedCSS();
  if (!cssValidation.valid) {
    result.blockers.push('생성된 CSS 검증 실패');
    result.passed = false;
  }

  // 5. 성능 벤치마크
  const perfResult = await runPerformanceBenchmark();
  if (perfResult.renderTime > 16) { // 60fps 기준
    result.warnings.push(`렌더링 성능 저하: ${perfResult.renderTime}ms (권장 <16ms)`);
  }

  return result;
}

// 토큰 매핑 검증
async function validateTokenMapping(): Promise<{ allMapped: boolean; missing: string[] }> {
  const cssVariables = await extractCSSVariables('packages/shared/src/styles/tokens.css');
  const specTokens = await extractSpecTokens('packages/specs/src/primitives');

  const missing: string[] = [];

  for (const cssVar of cssVariables) {
    const tokenName = cssVarToTokenName(cssVar); // --primary → color.primary
    if (!specTokens.includes(tokenName)) {
      missing.push(tokenName);
    }
  }

  return { allMapped: missing.length === 0, missing };
}
```

#### 3.8.3 검증 자동화

```yaml
# .github/workflows/phase0-gate.yml
name: Phase 0 Validation Gate

on:
  pull_request:
    paths:
      - 'packages/specs/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2

      - name: Install dependencies
        run: pnpm install

      - name: Type Check
        run: pnpm --filter @xstudio/specs tsc --noEmit

      - name: Unit Tests
        run: pnpm --filter @xstudio/specs test:coverage
        env:
          MIN_COVERAGE: 80

      - name: Token Validation
        run: pnpm --filter @xstudio/specs validate:tokens

      - name: CSS Generation Test
        run: pnpm --filter @xstudio/specs generate:css --dry-run

      - name: Phase 0 Gate Check
        run: pnpm --filter @xstudio/specs validate:phase0
```

#### 3.8.4 검증 리포트 템플릿

```markdown
## Phase 0 검증 리포트

**날짜**: YYYY-MM-DD
**검증자**: @username

### 필수 항목 (Blockers)

| 항목 | 상태 | 비고 |
|------|------|------|
| TypeScript 컴파일 | ✅ / ❌ | |
| 토큰 매핑 완전성 | ✅ / ❌ | 누락: |
| React Renderer 테스트 | ✅ / ❌ | Coverage: %|
| PIXI Renderer 테스트 | ✅ / ❌ | Coverage: % |
| CSS Generator 검증 | ✅ / ❌ | |
| 빌드 성공 | ✅ / ❌ | |

### 품질 항목 (Warnings)

| 항목 | 값 | 권장 | 상태 |
|------|-----|------|------|
| 테스트 커버리지 | % | ≥80% | |
| 렌더링 시간 | ms | <16ms | |
| 번들 크기 증가 | KB | <50KB | |

### 결론

- [ ] **Phase 1 진행 승인**
- [ ] **수정 후 재검증 필요**

### 서명

- 기술 리드: _______________
- QA 담당: _______________
```

---

## 4. Phase 1: 핵심 컴포넌트 마이그레이션

### 4.1 목표

- 가장 많이 사용되는 10개 컴포넌트 마이그레이션
- Spec 패턴 검증 및 안정화

### 4.2 대상 컴포넌트 (10개)

| # | 컴포넌트 | 현재 상태 | 복잡도 | 우선순위 |
|---|----------|----------|--------|---------|
| 1 | Button | ✅ 정상 | 중간 | 최우선 |
| 2 | Badge | ⚠️ 부분 | 낮음 | 높음 |
| 3 | Card | ✅ 정상 | 중간 | 높음 |
| 4 | Link | ✅ 정상 | 낮음 | 높음 |
| 5 | Separator | ✅ 정상 | 낮음 | 중간 |
| 6 | ToggleButton | ⚠️ 부분 | 중간 | 높음 |
| 7 | ToggleButtonGroup | ⚠️ 부분 | 높음 | 높음 |
| 8 | Tooltip | ✅ 정상 | 중간 | 중간 |
| 9 | Popover | ✅ 정상 | 중간 | 중간 |
| 10 | Dialog | ✅ 정상 | 높음 | 중간 |

### 4.3 Button Spec 예시 (상세)

```typescript
// packages/specs/src/components/Button.spec.ts

import type { ComponentSpec, Shape, TokenRef } from '../types';

export interface ButtonProps {
  variant?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'error' | 'surface' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children?: string;
  text?: string;
  label?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  style?: Record<string, string | number | undefined>;
}

export const ButtonSpec: ComponentSpec<ButtonProps> = {
  name: 'Button',
  description: 'Material Design 3 기반 버튼 컴포넌트',
  element: 'button',

  defaultVariant: 'default',
  defaultSize: 'sm',

  variants: {
    default: {
      background: '{color.surface-container-high}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.primary}' as TokenRef,
      backgroundHover: '{color.primary-hover}' as TokenRef,
      backgroundPressed: '{color.primary-pressed}' as TokenRef,
      text: '{color.on-primary}' as TokenRef,
    },
    secondary: {
      background: '{color.secondary}' as TokenRef,
      backgroundHover: '{color.secondary-hover}' as TokenRef,
      backgroundPressed: '{color.secondary-pressed}' as TokenRef,
      text: '{color.on-secondary}' as TokenRef,
    },
    tertiary: {
      background: '{color.tertiary}' as TokenRef,
      backgroundHover: '{color.tertiary-hover}' as TokenRef,
      backgroundPressed: '{color.tertiary-pressed}' as TokenRef,
      text: '{color.on-tertiary}' as TokenRef,
    },
    error: {
      background: '{color.error}' as TokenRef,
      backgroundHover: '{color.error-hover}' as TokenRef,
      backgroundPressed: '{color.error-pressed}' as TokenRef,
      text: '{color.on-error}' as TokenRef,
    },
    surface: {
      background: '{color.surface-container-highest}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    outline: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.primary}' as TokenRef,
      border: '{color.outline}' as TokenRef,
      backgroundAlpha: 0,
    },
    ghost: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.primary}' as TokenRef,
      backgroundAlpha: 0,
    },
  },

  sizes: {
    xs: {
      height: 24,
      paddingX: 8,
      paddingY: 2,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      iconSize: 12,
      gap: 4,
    },
    sm: {
      height: 32,
      paddingX: 12,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      iconSize: 14,
      gap: 6,
    },
    md: {
      height: 40,
      paddingX: 24,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 16,
      gap: 8,
    },
    lg: {
      height: 48,
      paddingX: 32,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 20,
      gap: 10,
    },
    xl: {
      height: 56,
      paddingX: 40,
      paddingY: 16,
      fontSize: '{typography.text-xl}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 24,
      gap: 12,
    },
  },

  states: {
    hover: {
      // variant별 hover는 variants에서 정의
    },
    pressed: {
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
    },
    disabled: {
      opacity: 0.38,
      cursor: 'not-allowed',
      pointerEvents: 'none',
    },
    focusVisible: {
      outline: '2px solid var(--primary)',
      outlineOffset: '2px',
    },
  },

  render: {
    shapes: (props, variant, size, state = 'default') => {
      const width = (props.style?.width as number) || 'auto';
      const height = size.height;
      const borderRadius = size.borderRadius;

      // 상태에 따른 배경색 선택
      const bgColor = state === 'hover' ? variant.backgroundHover
                    : state === 'pressed' ? variant.backgroundPressed
                    : variant.background;

      // 상태에 따른 텍스트색 선택
      const textColor = (state === 'hover' && variant.textHover)
                      ? variant.textHover
                      : variant.text;

      // 상태에 따른 테두리색 선택
      const borderColor = (state === 'hover' && variant.borderHover)
                        ? variant.borderHover
                        : variant.border;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius,
          fill: bgColor,
          fillAlpha: variant.backgroundAlpha ?? 1,
        },
      ];

      // 테두리 (있는 경우)
      if (borderColor) {
        shapes.push({
          type: 'border' as const,
          target: 'bg', // 배경 shape에 적용
          borderWidth: 1,
          color: borderColor,
          radius: borderRadius,
        });
      }

      // 텍스트
      const text = props.children || props.text || props.label;
      if (text) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: 0,
          text,
          fontSize: size.fontSize,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500,
          fill: textColor,
          align: 'center' as const,
          baseline: 'middle' as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      'data-loading': props.isLoading || undefined,
      'aria-busy': props.isLoading || undefined,
    }),

    pixi: (props) => ({
      eventMode: 'static',
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
```

### 4.4 마이그레이션된 React 컴포넌트

```typescript
// packages/shared/src/components/Button.tsx (마이그레이션 후)

import { forwardRef } from 'react';
import { Button as RACButton, type ButtonProps as RACButtonProps } from 'react-aria-components';
import { ButtonSpec, type ButtonProps as SpecButtonProps } from '@xstudio/specs';
import { renderToReact } from '@xstudio/specs/renderers';
import { Skeleton } from './Skeleton';

export interface ButtonProps extends RACButtonProps, SpecButtonProps {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const {
      isLoading,
      loadingLabel = 'Loading...',
      children,
      variant = 'default',
      size = 'sm',
      ...restProps
    } = props;

    // Spec에서 렌더링 정보 가져오기
    const { className, dataAttributes, style } = renderToReact(ButtonSpec, {
      variant,
      size,
      children: children as string,
      isDisabled: props.isDisabled,
      isLoading,
      style: props.style,
    });

    return (
      <RACButton
        ref={ref}
        {...restProps}
        {...dataAttributes}
        className={className}
        style={style}
        isDisabled={isLoading || props.isDisabled}
      >
        {isLoading ? (
          <>
            <Skeleton componentVariant="button" size={size} />
            <span className="sr-only">{loadingLabel}</span>
          </>
        ) : (
          children
        )}
      </RACButton>
    );
  }
);
```

### 4.5 마이그레이션된 PIXI 컴포넌트

```typescript
// apps/builder/src/builder/workspace/canvas/ui/PixiButton.tsx (마이그레이션 후)

import { memo, useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { Graphics as PixiGraphicsClass } from 'pixi.js';
import { FancyButton } from '@pixi/ui';
import { ButtonSpec, type ButtonProps } from '@xstudio/specs';
import { getVariantColors, getSizePreset, renderToPixi } from '@xstudio/specs/renderers';
import { useTheme } from '../hooks/useTheme';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Element } from '../../../../types/core/store.types';

export interface PixiButtonProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

export const PixiButton = memo(function PixiButton({ element, onClick }: PixiButtonProps) {
  useExtend(PIXI_COMPONENTS);

  const theme = useTheme(); // 'light' | 'dark'
  const props = element.props as ButtonProps;

  const variant = props.variant || ButtonSpec.defaultVariant;
  const size = props.size || ButtonSpec.defaultSize;

  // Spec에서 색상 가져오기
  const variantSpec = ButtonSpec.variants[variant];
  const sizeSpec = ButtonSpec.sizes[size];

  const colors = useMemo(() =>
    getVariantColors(variantSpec, theme),
    [variantSpec, theme]
  );

  const sizePreset = useMemo(() =>
    getSizePreset(sizeSpec),
    [sizeSpec]
  );

  // 버튼 텍스트
  const buttonText = useMemo(() => {
    return String(props.children || props.text || props.label || 'Button');
  }, [props.children, props.text, props.label]);

  // Graphics 그리기
  const drawButton = useCallback((g: PixiGraphicsClass, state: 'default' | 'hover' | 'pressed') => {
    const bgColor = state === 'hover' ? colors.bgHover
                  : state === 'pressed' ? colors.bgPressed
                  : colors.bg;

    g.clear();
    g.roundRect(0, 0, width, sizePreset.height, sizePreset.borderRadius);
    g.fill({ color: bgColor, alpha: colors.bgAlpha });

    if (colors.border) {
      g.stroke({ color: colors.border, width: 1 });
    }
  }, [colors, sizePreset, width]);

  // ... FancyButton 생성 로직

  return (
    <pixiContainer layout={layout}>
      {/* FancyButton은 useEffect에서 추가 */}
    </pixiContainer>
  );
});
```

### 4.6 Phase 1 체크리스트

- [x] Button.spec.ts 작성 ✅
- [x] Button.tsx 마이그레이션 ✅
- [x] PixiButton.tsx 마이그레이션 ✅
- [ ] Badge.spec.ts 작성 및 마이그레이션
- [ ] Card.spec.ts 작성 및 마이그레이션
- [ ] Link.spec.ts 작성 및 마이그레이션
- [ ] Separator.spec.ts 작성 및 마이그레이션
- [ ] ToggleButton.spec.ts 작성 및 마이그레이션
- [ ] ToggleButtonGroup.spec.ts 작성 및 마이그레이션
- [ ] Tooltip.spec.ts 작성 및 마이그레이션
- [ ] Popover.spec.ts 작성 및 마이그레이션
- [ ] Dialog.spec.ts 작성 및 마이그레이션
- [ ] Visual Regression Test 작성

### 4.7 구현 진행 내역 (2026-01-27)

#### 4.7.1 packages/specs 패키지 생성

Spec 아키텍처의 핵심 패키지 구조 완성:

```
packages/specs/
├── src/
│   ├── types/           # 타입 정의
│   │   └── index.ts     # ComponentSpec, SizeSpec 등
│   ├── primitives/      # 기본 토큰
│   │   └── index.ts     # spacing, radius 등
│   ├── renderers/       # 렌더러 유틸리티
│   │   └── index.ts     # getSizePreset, resolveRadius 등
│   ├── components/      # 컴포넌트 스펙
│   │   └── Button.spec.ts
│   └── index.ts         # 통합 export
├── package.json
└── tsconfig.json
```

#### 4.7.2 ButtonSpec 구현

- **파일**: `packages/specs/src/components/Button.spec.ts`
- **구현 내용**:
  - 8개 variant 정의 (default, primary, secondary, tertiary, error, surface, outline, ghost)
  - 5개 size 정의 (xs, sm, md, lg, xl)
  - size별 borderRadius 매핑 (CSS 변수 기준)
  - `getSizePreset()` 함수로 렌더러에서 통합 조회

#### 4.7.3 PixiButton.tsx Feature Flag 마이그레이션

- **ENABLE_BUTTON_SPEC** 플래그로 점진적 전환
- 기존 cssVariableReader 방식과 새 Spec 방식 병행
- `getSizePreset(ButtonSpec, size, theme)`로 통합 스타일 조회

```typescript
// Feature Flag 기반 마이그레이션
if (ENABLE_BUTTON_SPEC) {
  const sizePreset = getSizePreset(ButtonSpec.sizes[size], theme);
  // Spec 기반 렌더링
} else {
  // 기존 cssVariableReader 방식
}
```

#### 4.7.4 Pixi UI 컴포넌트 CSS 단위 해석 규칙 (CRITICAL)

모든 Pixi UI 컴포넌트(PixiButton, PixiToggleButton, PixiSlider 등)에서 inline style의 CSS 값을
WebGL 그래픽 크기로 변환할 때 반드시 아래 규칙을 따라야 합니다.

**❌ 금지 패턴 (버그 원인)**:
```typescript
// typeof === 'number'는 CSS 문자열 값("200px", "50%", "100vw")을 무시함
const width = typeof style?.width === 'number' ? style.width : fallback;
```

**✅ 필수 패턴**:
```typescript
import { parseCSSSize } from "../sprites/styleConverter";
import { parsePadding, parseBorderWidth } from "../sprites/paddingUtils";
import { useStore } from "../../../stores";
import { useCanvasSyncStore } from "../canvasSync";

// 1. 뷰포트 + 부모 요소 조회
const canvasSize = useCanvasSyncStore((s) => s.canvasSize);
const parentElement = useStore((state) => {
  if (!element.parent_id) return null;
  return state.elementsMap.get(element.parent_id) ?? null;
});

// 2. 부모 content area 계산 (% 및 vw/vh 해석 기준)
const parentContentArea = useMemo(() => {
  if (!parentElement) return { width: canvasSize.width, height: canvasSize.height };
  const parentStyle = parentElement.props?.style;
  const isBody = parentElement.tag.toLowerCase() === 'body';
  const pw = isBody ? canvasSize.width : parseCSSSize(parentStyle?.width, canvasSize.width, canvasSize.width, canvasSize);
  const ph = isBody ? canvasSize.height : parseCSSSize(parentStyle?.height, canvasSize.height, canvasSize.height, canvasSize);
  const pp = parsePadding(parentStyle);
  const pb = parseBorderWidth(parentStyle);
  return {
    width: Math.max(0, pw - pp.left - pp.right - pb.left - pb.right),
    height: Math.max(0, ph - pp.top - pp.bottom - pb.top - pb.bottom),
  };
}, [parentElement, canvasSize]);

// 3. CSS 값 파싱 (% → parentContentArea, vw/vh → parentContentArea, px → 절대값)
const width = parseCSSSize(style?.width, parentContentArea.width, fallback, parentContentArea);
const height = parseCSSSize(style?.height, parentContentArea.height, fallback, parentContentArea);

// 4. padding shorthand + 개별 속성 지원
const parsedPadding = parsePadding(style);  // "8px" → 4방향, paddingTop 등으로 override

// 5. border width 4방향 파싱
const parsedBorder = parseBorderWidth(style);  // "2px" → 4방향, borderTopWidth 등으로 override
```

**단위별 해석 기준**:

| 단위 | parseCSSSize 해석 | Yoga (styleToLayout) 해석 |
|------|------------------|--------------------------|
| `px` | 절대 픽셀값 | 절대 픽셀값 |
| `%` | parentContentArea 기준 | 부모 content area 기준 (문자열 유지) |
| `vw` | parentContentArea.width 기준 | `%` 문자열로 변환 → 부모 기준 |
| `vh` | parentContentArea.height 기준 | `%` 문자열로 변환 → 부모 기준 |
| `rem` | × 16 (절대값) | × 16 (절대값) |
| `auto` | fallback 값 | undefined (Yoga 자동 계산) |

**적용 필수 컴포넌트 목록** (18개):

| 컴포넌트 | CSS 단위 파싱 | SELF_PADDING_TAGS | 잔여 작업 |
|----------|:----------:|:-----------------:|----------|
| **PixiButton** | ✅ 완료 | ✅ 등록됨 | — |
| **PixiFancyButton** | ❌ typeof 사용 중 | ✅ 등록됨 | parseCSSSize/parsePadding/parseBorderWidth 전환 필요 |
| **PixiToggleButton** | ❌ typeof 사용 중 | ✅ 등록됨 | parseCSSSize/parsePadding/parseBorderWidth 전환 필요 |
| PixiToggleButtonGroup | ❌ | — | 전체 마이그레이션 |
| PixiSlider | ❌ | — | 전체 마이그레이션 |
| PixiSwitcher | ❌ | — | 전체 마이그레이션 |
| PixiSelect | ❌ | — | 전체 마이그레이션 |
| PixiSeparator | ❌ | — | 전체 마이그레이션 |
| PixiMeter | ❌ | — | 전체 마이그레이션 |
| PixiProgressBar | ❌ | — | 전체 마이그레이션 |
| PixiRadio | ❌ | — | 전체 마이그레이션 |
| PixiRadioItem | ❌ | — | 전체 마이그레이션 |
| PixiScrollBox | ❌ | — | 전체 마이그레이션 |
| PixiList | ❌ | — | 전체 마이그레이션 |
| PixiListBox | ❌ | — | 전체 마이그레이션 |
| PixiMaskedFrame | ❌ | — | 전체 마이그레이션 |
| PixiCheckbox | ❌ | — | 전체 마이그레이션 |
| PixiCheckboxGroup | ❌ | — | 전체 마이그레이션 |
| PixiCheckboxItem | ❌ | — | 전체 마이그레이션 |

> **Note**: PixiFancyButton, PixiToggleButton은 `SELF_PADDING_TAGS` 등록으로 이중 padding 방지는 완료.
> 그러나 `typeof === 'number'` → `parseCSSSize()`/`parsePadding()`/`parseBorderWidth()` 전환은 미완료 상태.
> CSS 문자열 값("16px", "50%", "100vw")이 무시되는 버그가 잔존.

#### 4.7.4.0 `@xstudio/specs` 빌드 동기화 (CRITICAL)

`@xstudio/specs` 패키지는 **tsup으로 빌드된 `dist/`** 를 통해 내보냅니다.
`src/` 파일을 수정한 후 빌드하지 않으면, 소비자(`@xstudio/builder` 등)는
**이전 dist의 값을 계속 참조**합니다.

```
⚠️ 실제 발생한 버그 사례 (Button auto width 불일치):

1. Button.spec.ts (src) paddingX: 16 → 24 수정  ✅ 소스 변경
2. utils.ts (builder 내부) BUTTON_SIZE_CONFIG padding: 16 → 24  ✅ 즉시 반영
3. pnpm --filter @xstudio/specs build 미실행  ❌ dist 미갱신
4. PixiButton이 import하는 ButtonSpec은 dist/의 구 버전 (paddingX=16)
5. Layout 엔진은 새 padding(24) 적용, PixiButton은 구 padding(16) → 공백 발생

원인: dist/ 와 src/ 의 값 불일치 (layout=새값, rendering=구값)
```

**규칙**:

| 변경 대상 | 필요 작업 |
|-----------|----------|
| `packages/specs/src/**` 파일 수정 | `pnpm --filter @xstudio/specs build` 실행 필수 |
| `apps/builder/src/**` 파일 수정 | 추가 빌드 불필요 (Vite HMR 즉시 반영) |
| specs + builder 동시 수정 | specs 빌드 후 builder 개발 서버 재시작 |

**개발 시 권장**: `pnpm --filter @xstudio/specs dev` (watch 모드)를 별도 터미널에서 실행하면
소스 변경 시 자동으로 dist가 갱신됩니다.

```bash
# 터미널 1: specs watch 모드
pnpm --filter @xstudio/specs dev

# 터미널 2: builder 개발 서버
pnpm --filter @xstudio/builder dev
```

**새 컴포넌트 Spec 작성 시 체크리스트**:

1. ✅ `packages/specs/src/components/Xxx.spec.ts` 작성
2. ✅ `packages/specs/src/index.ts`에서 export 추가
3. ✅ `pnpm --filter @xstudio/specs build` 실행
4. ✅ builder에서 import 후 동작 확인
5. ✅ `BUTTON_SIZE_CONFIG` 등 builder 내부 상수와 Spec 값이 **동일한지** 확인

**값 동기화 대상** (`@sync` 주석으로 표시):

| Spec 값 | Builder 내부 상수 | CSS 토큰 |
|---------|-------------------|----------|
| `ButtonSpec.sizes[size].paddingX` | `BUTTON_SIZE_CONFIG[size].paddingLeft/Right` | `Button.css [data-size] padding` |
| `ButtonSpec.sizes[size].fontSize` | `BUTTON_SIZE_CONFIG[size].fontSize` | `Button.css [data-size] font-size` |
| `fontFamily.sans` (typography.ts) | `measureTextWidth()` 기본 폰트 | `body { font-family }` |

위 3곳의 값이 불일치하면 CSS↔WebGL 렌더링 차이가 발생합니다.
코드에 `// @sync` 주석이 있는 곳은 반드시 연관된 다른 소스와 값을 맞춰야 합니다.

#### 4.7.4.1 Padding/Border 이중 적용 방지 (CRITICAL)

자체적으로 padding/border를 그래픽 크기에 반영하는 Pixi UI 컴포넌트(PixiButton 등)는
외부 LayoutContainer(Yoga)에 padding/border를 전달하면 **이중 적용**됩니다.

- **Yoga 경로**: `styleToLayout()`이 padding/border를 LayoutContainer에 전달
  → Yoga가 내부 콘텐츠를 해당 값만큼 오프셋
- **컴포넌트 자체**: padding/border를 Graphics 크기에 반영
- **결과**: 위치 이동 + 크기 변경 이중 발생

**해결**: `BuilderCanvas.tsx`의 `stripSelfRenderedProps()` + `SELF_PADDING_TAGS`

```typescript
// 자체 padding/border 렌더링 컴포넌트 (leaf UI)
const SELF_PADDING_TAGS = new Set([
  'Button', 'SubmitButton', 'FancyButton', 'ToggleButton',
]);

// 외부 LayoutContainer에서 padding/border/visual 속성 제거
function stripSelfRenderedProps(layout: LayoutStyle): LayoutStyle {
  const {
    padding: _p, paddingTop: _pt, paddingRight: _pr, paddingBottom: _pb, paddingLeft: _pl,
    borderWidth: _bw, borderTopWidth: _btw, borderRightWidth: _brw,
    borderBottomWidth: _bbw, borderLeftWidth: _blw,
    borderRadius: _br, borderColor: _bc, backgroundColor: _bg,
    ...rest
  } = layout;
  return rest;
}

// renderTree에서 적용
const effectiveLayout = SELF_PADDING_TAGS.has(child.tag)
  ? stripSelfRenderedProps(baseLayout)
  : baseLayout;
```

**새 컴포넌트가 자체 padding/border 렌더링을 구현하면 반드시 `SELF_PADDING_TAGS`에 추가**

#### 4.7.4.2 BlockEngine Border-Box 크기 계산 (CRITICAL)

`BlockEngine.calculate()`에서 `parseBoxModel()`이 반환하는 **content-box** 크기를
그대로 사용하면 padding/border를 포함한 실제 차지 공간이 누락되어 요소가 겹칩니다.

**해결**: content-box → border-box 변환 (`BlockEngine.ts`)

```typescript
// border-box 크기 = content + padding + border
const { padding, border } = boxModel;
const padBorderH = padding.left + padding.right + border.left + border.right;
const padBorderV = padding.top + padding.bottom + border.top + border.bottom;

// Block: Auto-width는 이미 border-box, Explicit width는 content-box + padding/border
const childWidth = boxModel.width !== undefined
  ? childContentWidth + padBorderH
  : childContentWidth;  // auto: availableWidth - margins (이미 border-box)
const childHeight = childContentHeight + padBorderV;

currentY += childHeight;  // border-box 높이로 진행
```

inline-block 경로도 동일하게 border-box 크기 사용.

#### 4.7.4.3 Baseline 정렬: 버튼 수직 중앙 정렬

`display: block` 부모에서 다른 높이의 inline-block 버튼들이 배치될 때,
CSS 웹 모드에서는 텍스트가 수직 중앙 정렬된 버튼들이 서로 중앙 정렬됩니다.

**원인**: 기존 `calculateBaseline()`이 `height * 0.8` (일반 텍스트 블록용)을 사용하여
버튼처럼 텍스트가 수직 중앙 정렬된 요소에 맞지 않음.

**해결**: `VERTICALLY_CENTERED_TAGS`에 해당하는 요소는 `height / 2` 반환 (`utils.ts`)

```typescript
const VERTICALLY_CENTERED_TAGS = new Set([
  'button', 'submitbutton', 'fancybutton', 'togglebutton',
  'input', 'select',
]);

// calculateBaseline 내부
if (VERTICALLY_CENTERED_TAGS.has(tag)) {
  return height / 2;  // 수직 중앙 정렬 요소: baseline ≈ 중앙
}
```

**검증**: Button 1(h=100), Button 2(h=200)
- baseline: 50, 100 → Button 1 y = 100 - 50 = **50** (수직 중앙 ✓)

#### 4.7.4.4 Spec 기본 borderWidth 적용

CSS 모드에서는 `.react-aria-Button { border: 1px solid var(--outline-variant); }`가
기본 border를 제공하지만, WebGL 모드는 inline style만 읽으므로 기본 border가 누락됩니다.

**해결**: padding fallback 패턴과 동일하게 적용 (`PixiButton.tsx`)

```typescript
// inline style에 borderWidth가 없으면 spec 기본값 사용
const hasBorderWidthStyle = style?.borderWidth !== undefined ||
  style?.borderTopWidth !== undefined || /* ... */;
const parsedBorder = hasBorderWidthStyle ? parseBorderWidth(style) : null;
const specDefaultBorderWidth = variantColors.border != null ? 1 : 0;
const borderWidthTop = parsedBorder?.top ?? specDefaultBorderWidth;
// ... (4방향 동일)
```

#### 4.7.5 WebGL computedStyle 동기화 수정

**문제**: WebGL 요소 선택 시 Style Panel의 borderRadius가 업데이트되지 않음

**원인 분석**:
- React 컴포넌트: Preview iframe에서 `window.getComputedStyle()` → postMessage로 전송
- WebGL 컴포넌트: `createCompleteProps()`에 computedStyle 미포함

**해결**:
1. `computeCanvasElementStyle()` 함수 생성 (`elementHelpers.ts`)
   - inline style에서 borderRadius 추출 (우선순위 1)
   - 컴포넌트별 Spec에서 size 기반 계산 (우선순위 2)

2. `scheduleHydrateSelectedProps()`에서 computedStyle 포함
   ```typescript
   const computedStyle = computeCanvasElementStyle(element);
   set({ selectedElementProps: { ...createCompleteProps(element), computedStyle } });
   ```

#### 4.7.6 smoothRoundRect 구현 (WebGL 렌더링 품질 개선)

**문제**: PixiJS 기본 `roundRect()`이 제한된 bezier 세그먼트로 확대 시 계단 현상 발생

**해결**: `smoothRoundRect()` 함수 구현 (`graphicsUtils.ts`)

```typescript
export function smoothRoundRect(
  g: PixiGraphics,
  x: number, y: number,
  width: number, height: number,
  radius: number,
  segments?: number
): void
```

**특징**:
- 반경 기반 동적 세그먼트 계산 (8~48개)
- 저사양 기기 대응 (6~24개)
- devicePixelRatio 고려한 품질 조정
- 모든 border style (solid, dashed, dotted, double)에 적용

**참고**: Figma는 "squircle" 방식으로 3개의 bezier 곡선으로 부드러운 곡률 전환 구현

#### 4.7.7 수정된 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `packages/specs/` | 새 패키지 생성 |
| `packages/shared/src/components/Button.tsx` | size별 borderRadius 인라인 스타일 |
| `packages/shared/src/components/styles/Button.css` | size별 borderRadius CSS |
| `apps/builder/.../stores/elements.ts` | computedStyle 포함 |
| `apps/builder/.../stores/utils/elementHelpers.ts` | computeCanvasElementStyle 추가 |
| `apps/builder/.../canvas/ui/PixiButton.tsx` | Feature Flag 마이그레이션, spec 기본 borderWidth 적용 (v1.10) |
| `apps/builder/.../canvas/utils/graphicsUtils.ts` | smoothRoundRect 구현 |
| `apps/builder/.../canvas/BuilderCanvas.tsx` | `SELF_PADDING_TAGS` + `stripSelfRenderedProps` 추가 (v1.10) |
| `apps/builder/.../canvas/layout/engines/BlockEngine.ts` | content-box → border-box 크기 변환 (v1.10) |
| `apps/builder/.../canvas/layout/engines/utils.ts` | `VERTICALLY_CENTERED_TAGS` baseline 수정 (v1.10), `BUTTON_SIZE_CONFIG` padding 동기화 + fontFamily specs 참조 (v1.11) |
| `packages/specs/src/components/Button.spec.ts` | paddingX md:16→24, lg:24→32, xl:32→40, fontFamily specs 상수 사용 (v1.11) |
| `packages/specs/src/primitives/typography.ts` | fontFamily.sans에 Pretendard 추가 (v1.11) |
| `apps/builder/.../canvas/ui/PixiButton.tsx` | fontFamily를 specs 상수로 교체 (v1.11) |

---

## 5. Phase 2: Form 컴포넌트 마이그레이션

### 5.1 대상 컴포넌트 (15개)

| # | 컴포넌트 | 현재 상태 | 복잡도 |
|---|----------|----------|--------|
| 1 | TextField | ✅ 정상 | 중간 |
| 2 | TextArea | ✅ 정상 | 중간 |
| 3 | NumberField | ✅ 정상 | 중간 |
| 4 | SearchField | ✅ 정상 | 중간 |
| 5 | Checkbox | ⚠️ 부분 | 중간 |
| 6 | CheckboxGroup | ✅ 정상 | 높음 |
| 7 | Radio | ⚠️ 부분 | 중간 |
| 8 | Switch | ✅ 정상 | 중간 |
| 9 | Select | ⚠️ 부분 | 높음 |
| 10 | ComboBox | ✅ 정상 | 높음 |
| 11 | ListBox | ✅ 정상 | 높음 |
| 12 | Slider | ✅ 정상 | 높음 |
| 13 | Meter | ⚠️ 부분 | 중간 |
| 14 | ProgressBar | ⚠️ 부분 | 중간 |
| 15 | Form | ⚠️ 부분 | 낮음 |

### 5.2 TextField Spec 예시

```typescript
// packages/specs/src/components/TextField.spec.ts

import type { ComponentSpec } from '../types';

export interface TextFieldProps {
  variant?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'error' | 'success';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  description?: string;
  errorMessage?: string;
  placeholder?: string;
  value?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isReadOnly?: boolean;
  orientation?: 'horizontal' | 'vertical';
  style?: React.CSSProperties;
}

export const TextFieldSpec: ComponentSpec<TextFieldProps> = {
  name: 'TextField',
  description: 'Material Design 3 기반 텍스트 입력 필드',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface-container}',
      backgroundHover: '{color.surface-container-high}',
      backgroundPressed: '{color.surface-container-high}',
      text: '{color.on-surface}',
      border: '{color.outline-variant}',
    },
    primary: {
      background: '{color.surface-container}',
      backgroundHover: '{color.surface-container-high}',
      backgroundPressed: '{color.surface-container-high}',
      text: '{color.on-surface}',
      border: '{color.primary}',
    },
    // ... 나머지 variants
  },

  sizes: {
    sm: {
      height: 36,
      paddingX: 12,
      paddingY: 8,
      fontSize: '{typography.text-sm}',
      borderRadius: '{radius.sm}',
    },
    md: {
      height: 44,
      paddingX: 16,
      paddingY: 10,
      fontSize: '{typography.text-md}',
      borderRadius: '{radius.md}',
    },
    lg: {
      height: 52,
      paddingX: 20,
      paddingY: 14,
      fontSize: '{typography.text-lg}',
      borderRadius: '{radius.md}',
    },
  },

  states: {
    focus: {
      borderColor: '{color.primary}',
      borderWidth: 2,
    },
    invalid: {
      borderColor: '{color.error}',
    },
    disabled: {
      opacity: 0.38,
    },
  },

  render: {
    shapes: (props, variant, size, state = 'default') => {
      const shapes: Shape[] = [];

      // 상태에 따른 테두리 스타일
      const isFocused = state === 'focused' || state === 'focusVisible';
      const borderWidth = isFocused ? 2 : (props.isInvalid ? 2 : 1);
      const borderColor = props.isInvalid ? '{color.error}'
                        : isFocused ? '{color.primary}'
                        : variant.border!;

      // 레이블
      if (props.label) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: 0,
          text: props.label,
          fontSize: '{typography.text-sm}',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500,
          fill: '{color.on-surface}',
        });
      }

      // 입력 필드 배경
      shapes.push({
        id: 'input-bg',
        type: 'roundRect' as const,
        x: 0,
        y: props.label ? 24 : 0,
        width: 'auto',
        height: size.height,
        radius: size.borderRadius,
        fill: variant.background,
      });

      // 테두리
      shapes.push({
        type: 'border' as const,
        target: 'input-bg',
        borderWidth,
        color: borderColor,
        radius: size.borderRadius,
      });

      // 플레이스홀더 또는 값
      shapes.push({
        type: 'text' as const,
        x: size.paddingX,
        y: (props.label ? 24 : 0) + size.height / 2,
        text: props.value || props.placeholder || '',
        fontSize: size.fontSize,
        fontFamily: 'Inter, system-ui, sans-serif',
        fill: props.value ? variant.text : '{color.on-surface-variant}',
        baseline: 'middle' as const,
      });

      // 설명 또는 에러 메시지
      if (props.errorMessage || props.description) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: (props.label ? 24 : 0) + size.height + 4,
          text: props.errorMessage || props.description || '',
          fontSize: '{typography.text-xs}',
          fontFamily: 'Inter, system-ui, sans-serif',
          fill: props.errorMessage ? '{color.error}' : '{color.on-surface-variant}',
        });
      }

      return shapes;
    },

    react: (props) => ({
      'data-invalid': props.isInvalid || undefined,
      'data-readonly': props.isReadOnly || undefined,
      'data-orientation': props.orientation || 'vertical',
    }),

    pixi: (props) => ({
      eventMode: 'static',
      cursor: props.isDisabled ? 'not-allowed' : 'text',
    }),
  },
};
```

### 5.3 Phase 2 체크리스트

- [ ] TextField.spec.ts
- [ ] TextArea.spec.ts
- [ ] NumberField.spec.ts
- [ ] SearchField.spec.ts
- [ ] Checkbox.spec.ts
- [ ] CheckboxGroup.spec.ts
- [ ] Radio.spec.ts
- [ ] Switch.spec.ts
- [ ] Select.spec.ts
- [ ] ComboBox.spec.ts
- [ ] ListBox.spec.ts
- [ ] Slider.spec.ts
- [ ] Meter.spec.ts
- [ ] ProgressBar.spec.ts
- [ ] Form.spec.ts
- [ ] 각 컴포넌트 React/PIXI 마이그레이션
- [ ] Visual Regression Test

---

## 6. Phase 3: 복합 컴포넌트 마이그레이션

### 6.1 대상 컴포넌트 (20개)

| # | 컴포넌트 | 현재 상태 | 복잡도 |
|---|----------|----------|--------|
| 1 | Table | ✅ 정상 | 매우 높음 |
| 2 | Tree | ✅ 정상 | 높음 |
| 3 | Tabs | ⚠️ 부분 | 높음 |
| 4 | Menu | ⚠️ 부분 | 높음 |
| 5 | Breadcrumbs | ⚠️ 부분 | 중간 |
| 6 | Pagination | ⚠️ 부분 | 중간 |
| 7 | TagGroup | ⚠️ 부분 | 중간 |
| 8 | GridList | ✅ 정상 | 높음 |
| 9 | Disclosure | ✅ 정상 | 중간 |
| 10 | DisclosureGroup | 🔵 PIXI전용 | 높음 |
| 11 | Toolbar | ⚠️ 부분 | 중간 |
| 12 | Toast | ⚠️ 부분 | 중간 |
| 13 | Panel | ✅ 정상 | 중간 |
| 14 | Group | ⚠️ 부분 | 낮음 |
| 15 | Slot | ⚠️ 부분 | 낮음 |
| 16 | Skeleton | ✅ 정상 | 낮음 |
| 17 | DropZone | ✅ 정상 | 중간 |
| 18 | FileTrigger | ❌ 문제 | 중간 |
| 19 | ScrollBox | ⚠️ 부분 | 높음 |
| 20 | MaskedFrame | ⚠️ 부분 | 높음 |

### 6.2 Table Spec 예시 (복합 구조)

```typescript
// packages/specs/src/components/Table.spec.ts

import type { ComponentSpec } from '../types';

export interface TableProps {
  variant?: 'default' | 'striped' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
  columns: TableColumn[];
  rows: TableRow[];
  selectionMode?: 'none' | 'single' | 'multiple';
  sortDescriptor?: { column: string; direction: 'ascending' | 'descending' };
  style?: React.CSSProperties;
}

export interface TableColumn {
  id: string;
  label: string;
  width?: number;
  allowsSorting?: boolean;
}

export interface TableRow {
  id: string;
  cells: Record<string, unknown>;
  isSelected?: boolean;
}

export const TableSpec: ComponentSpec<TableProps> = {
  name: 'Table',
  description: 'Material Design 3 기반 데이터 테이블',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}',
      backgroundHover: '{color.surface-container}',
      backgroundPressed: '{color.surface-container-high}',
      text: '{color.on-surface}',
      border: '{color.outline-variant}',
    },
    striped: {
      background: '{color.surface}',
      backgroundHover: '{color.surface-container}',
      backgroundPressed: '{color.surface-container-high}',
      text: '{color.on-surface}',
      border: '{color.outline-variant}',
      // 홀수 행 배경
      // alternateBackground: '{color.surface-container}',
    },
    bordered: {
      background: '{color.surface}',
      backgroundHover: '{color.surface-container}',
      backgroundPressed: '{color.surface-container-high}',
      text: '{color.on-surface}',
      border: '{color.outline}',
    },
  },

  sizes: {
    sm: {
      height: 36,
      paddingX: 8,
      paddingY: 4,
      fontSize: '{typography.text-sm}',
      borderRadius: '{radius.sm}',
    },
    md: {
      height: 44,
      paddingX: 12,
      paddingY: 8,
      fontSize: '{typography.text-md}',
      borderRadius: '{radius.md}',
    },
    lg: {
      height: 52,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-lg}',
      borderRadius: '{radius.md}',
    },
  },

  // 테이블은 복합 shapes 구조
  render: {
    shapes: (props, variant, size, state = 'default') => {
      const shapes: Shape[] = [];
      const { columns, rows } = props;

      // 컨테이너
      shapes.push({
        type: 'container' as const,
        x: 0,
        y: 0,
        children: [
          // 테두리
          {
            type: 'border' as const,
            borderWidth: 1,
            color: variant.border!,
            radius: size.borderRadius,
          },
        ],
        clip: true,
      });

      // 헤더 행
      let yOffset = 0;
      shapes.push({
        type: 'container' as const,
        x: 0,
        y: yOffset,
        children: [
          {
            type: 'rect' as const,
            x: 0,
            y: 0,
            width: 'auto',
            height: size.height,
            fill: '{color.surface-container}',
          },
          // 각 컬럼 헤더
          ...columns.map((col, i) => ({
            type: 'text' as const,
            x: i * (col.width || 100) + size.paddingX,
            y: size.height / 2,
            text: col.label,
            fontSize: size.fontSize,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 600,
            fill: variant.text,
            baseline: 'middle' as const,
          })),
        ],
      });

      yOffset += size.height;

      // 데이터 행
      rows.forEach((row, rowIndex) => {
        const isEven = rowIndex % 2 === 0;
        const rowBg = props.variant === 'striped' && !isEven
          ? '{color.surface-container}'
          : variant.background;

        shapes.push({
          type: 'container' as const,
          x: 0,
          y: yOffset,
          children: [
            {
              type: 'rect' as const,
              x: 0,
              y: 0,
              width: 'auto',
              height: size.height,
              fill: row.isSelected ? '{color.primary-container}' : rowBg,
            },
            // 각 셀
            ...columns.map((col, i) => ({
              type: 'text' as const,
              x: i * (col.width || 100) + size.paddingX,
              y: size.height / 2,
              text: String(row.cells[col.id] || ''),
              fontSize: size.fontSize,
              fontFamily: 'Inter, system-ui, sans-serif',
              fill: variant.text,
              baseline: 'middle' as const,
            })),
          ],
        });

        yOffset += size.height;
      });

      return shapes;
    },
  },
};
```

### 6.3 Phase 3 체크리스트

- [ ] Table.spec.ts (복합 구조)
- [ ] Tree.spec.ts
- [ ] Tabs.spec.ts
- [ ] Menu.spec.ts
- [ ] Breadcrumbs.spec.ts
- [ ] Pagination.spec.ts
- [ ] TagGroup.spec.ts
- [ ] GridList.spec.ts
- [ ] Disclosure.spec.ts
- [ ] DisclosureGroup.spec.ts
- [ ] Toolbar.spec.ts
- [ ] Toast.spec.ts
- [ ] Panel.spec.ts
- [ ] Group.spec.ts
- [ ] Slot.spec.ts
- [ ] Skeleton.spec.ts
- [ ] DropZone.spec.ts
- [ ] FileTrigger.spec.ts
- [ ] ScrollBox.spec.ts
- [ ] MaskedFrame.spec.ts

---

## 7. Phase 4: 특수 컴포넌트 마이그레이션

### 7.1 대상 컴포넌트 (17개)

| # | 컴포넌트 | 현재 상태 | 복잡도 |
|---|----------|----------|--------|
| 1 | DatePicker | ⚠️ 부분 | 매우 높음 |
| 2 | DateRangePicker | ⚠️ 부분 | 매우 높음 |
| 3 | DateField | ❌ 문제 | 높음 |
| 4 | TimeField | ❌ 문제 | 높음 |
| 5 | Calendar | ⚠️ 부분 | 높음 |
| 6 | ColorPicker | ⚠️ 부분 | 매우 높음 |
| 7 | ColorField | ❌ 문제 | 높음 |
| 8 | ColorSlider | ⚠️ 부분 | 높음 |
| 9 | ColorArea | ⚠️ 부분 | 높음 |
| 10 | ColorWheel | ⚠️ 부분 | 높음 |
| 11 | ColorSwatch | ⚠️ 부분 | 중간 |
| 12 | ColorSwatchPicker | ⚠️ 부분 | 중간 |
| 13 | List | ❌ 문제 | 중간 |
| 14 | Input | ✅ 정상 | 낮음 |
| 15 | FancyButton | ✅ 정상 | 중간 |
| 16 | Switcher | ✅ 정상 | 중간 |

### 7.2 ColorPicker Spec 예시

```typescript
// packages/specs/src/components/ColorPicker.spec.ts

import type { ComponentSpec } from '../types';

export interface ColorPickerProps {
  variant?: 'default' | 'compact' | 'expanded';
  size?: 'sm' | 'md' | 'lg';
  value?: string; // hex color
  defaultValue?: string;
  onChange?: (color: string) => void;
  showAlpha?: boolean;
  showInput?: boolean;
  swatches?: string[];
  style?: React.CSSProperties;
}

export const ColorPickerSpec: ComponentSpec<ColorPickerProps> = {
  name: 'ColorPicker',
  description: '색상 선택기',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface-container}',
      backgroundHover: '{color.surface-container-high}',
      backgroundPressed: '{color.surface-container-high}',
      text: '{color.on-surface}',
      border: '{color.outline-variant}',
    },
    compact: {
      background: '{color.surface-container}',
      backgroundHover: '{color.surface-container-high}',
      backgroundPressed: '{color.surface-container-high}',
      text: '{color.on-surface}',
      border: '{color.outline-variant}',
    },
    expanded: {
      background: '{color.surface}',
      backgroundHover: '{color.surface-container}',
      backgroundPressed: '{color.surface-container}',
      text: '{color.on-surface}',
      border: '{color.outline-variant}',
    },
  },

  sizes: {
    sm: {
      height: 200,
      paddingX: 8,
      paddingY: 8,
      fontSize: '{typography.text-sm}',
      borderRadius: '{radius.md}',
    },
    md: {
      height: 260,
      paddingX: 12,
      paddingY: 12,
      fontSize: '{typography.text-md}',
      borderRadius: '{radius.md}',
    },
    lg: {
      height: 320,
      paddingX: 16,
      paddingY: 16,
      fontSize: '{typography.text-lg}',
      borderRadius: '{radius.lg}',
    },
  },

  render: {
    shapes: (props, variant, size, state = 'default') => {
      const shapes: Shape[] = [];

      // 컨테이너 배경
      shapes.push({
        type: 'roundRect' as const,
        x: 0,
        y: 0,
        width: 'auto',
        height: size.height,
        radius: size.borderRadius,
        fill: variant.background,
      });

      // 테두리
      shapes.push({
        type: 'border' as const,
        borderWidth: 1,
        color: variant.border!,
        radius: size.borderRadius,
      });

      // ColorArea (그라디언트 영역)
      const areaSize = size.height - size.paddingY * 2 - 60;
      shapes.push({
        type: 'container' as const,
        x: size.paddingX,
        y: size.paddingY,
        children: [
          {
            type: 'roundRect' as const,
            x: 0,
            y: 0,
            width: areaSize,
            height: areaSize,
            radius: '{radius.sm}',
            fill: props.value || '#ff0000',
            // 실제로는 그라디언트 구현 필요
          },
        ],
      });

      // Hue 슬라이더
      shapes.push({
        type: 'roundRect' as const,
        x: size.paddingX,
        y: size.paddingY + areaSize + 8,
        width: areaSize,
        height: 16,
        radius: '{radius.full}',
        fill: '#ff0000', // 실제로는 hue 그라디언트
      });

      // Alpha 슬라이더 (옵션)
      if (props.showAlpha) {
        shapes.push({
          type: 'roundRect' as const,
          x: size.paddingX,
          y: size.paddingY + areaSize + 32,
          width: areaSize,
          height: 16,
          radius: '{radius.full}',
          fill: props.value || '#ffffff',
        });
      }

      // 현재 색상 미리보기
      shapes.push({
        type: 'circle' as const,
        x: size.paddingX + areaSize + 20,
        y: size.paddingY + 20,
        radius: 16,
        fill: props.value || '#ff0000',
      });

      return shapes;
    },
  },
};
```

### 7.3 Phase 4 체크리스트

- [ ] DatePicker.spec.ts
- [ ] DateRangePicker.spec.ts
- [ ] DateField.spec.ts
- [ ] TimeField.spec.ts
- [ ] Calendar.spec.ts
- [ ] ColorPicker.spec.ts
- [ ] ColorField.spec.ts
- [ ] ColorSlider.spec.ts
- [ ] ColorArea.spec.ts
- [ ] ColorWheel.spec.ts
- [ ] ColorSwatch.spec.ts
- [ ] ColorSwatchPicker.spec.ts
- [ ] List.spec.ts
- [ ] Input.spec.ts
- [ ] FancyButton.spec.ts
- [ ] Switcher.spec.ts

---

## 8. Phase 5: 검증 및 최적화

### 8.1 Visual Regression Testing

#### 8.1.1 Playwright 설정 (플래키 방지)

```typescript
// packages/specs/playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false, // 순차 실행으로 리소스 경쟁 방지

  // 플래키 방지 설정
  retries: 2, // 실패 시 2회 재시도
  timeout: 30000,

  expect: {
    // 스냅샷 비교 허용치
    toMatchSnapshot: {
      maxDiffPixels: 50, // 최대 50픽셀 차이 허용
      maxDiffPixelRatio: 0.01, // 또는 1% 비율
    },
  },

  use: {
    // 일관된 뷰포트
    viewport: { width: 1280, height: 720 },

    // 디바이스 스케일 고정
    deviceScaleFactor: 1,

    // 애니메이션 비활성화
    actionTimeout: 10000,

    // 스크린샷 설정
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // 일관된 폰트 렌더링을 위한 설정
        launchOptions: {
          args: [
            '--font-render-hinting=none',
            '--disable-font-subpixel-positioning',
          ],
        },
      },
    },
  ],
});
```

#### 8.1.2 테스트 헬퍼 (플래키 가드)

```typescript
// packages/specs/tests/visual/helpers.ts

import { Page } from '@playwright/test';

/**
 * 폰트 로딩 대기
 */
export async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    // 추가 대기 (폰트 렌더링 완료)
    await new Promise(resolve => setTimeout(resolve, 100));
  });
}

/**
 * 애니메이션 완료 대기
 */
export async function waitForAnimations(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise<void>(resolve => {
      // CSS 애니메이션 완료 대기
      const animations = document.getAnimations();
      if (animations.length === 0) {
        resolve();
        return;
      }
      Promise.all(animations.map(a => a.finished)).then(() => resolve());
    });
  });
}

/**
 * PIXI 캔버스 렌더링 완료 대기
 */
export async function waitForPixiRender(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    // WebGL 컨텍스트 확인
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return gl !== null;
  });
  // 추가 프레임 대기 (렌더링 안정화)
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/**
 * 안정적인 스크린샷 촬영
 */
export async function stableScreenshot(
  page: Page,
  selector: string
): Promise<Buffer> {
  await waitForFonts(page);
  await waitForAnimations(page);

  const element = page.locator(selector);
  await element.waitFor({ state: 'visible' });

  // 레이아웃 안정화 대기
  await page.waitForTimeout(50);

  return element.screenshot({
    animations: 'disabled',
    caret: 'hide',
  });
}
```

#### 8.1.3 테스트 코드 (플래키 가드 적용)

```typescript
// packages/specs/tests/visual/button.test.ts

import { test, expect } from '@playwright/test';
import { ButtonSpec } from '../../src/components/Button.spec';
import {
  waitForFonts,
  waitForPixiRender,
  stableScreenshot,
} from './helpers';

// 테스트 전 공통 설정
test.beforeEach(async ({ page }) => {
  // CSS 애니메이션/트랜지션 비활성화
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
});

test.describe('Button Visual Regression', () => {
  const variants = Object.keys(ButtonSpec.variants);
  const sizes = Object.keys(ButtonSpec.sizes);

  for (const variant of variants) {
    for (const size of sizes) {
      test(`Button ${variant}/${size} matches snapshot`, async ({ page }) => {
        // React 버전 렌더링
        await page.goto(`/storybook/button?variant=${variant}&size=${size}`);
        await waitForFonts(page);
        const reactScreenshot = await stableScreenshot(page, '.react-aria-Button');

        // PIXI 버전 렌더링
        await page.goto(`/builder-preview/button?variant=${variant}&size=${size}`);
        await waitForPixiRender(page);
        const pixiScreenshot = await stableScreenshot(page, 'canvas');

        // 스냅샷 비교
        expect(reactScreenshot).toMatchSnapshot(`button-${variant}-${size}-react.png`);
        expect(pixiScreenshot).toMatchSnapshot(`button-${variant}-${size}-pixi.png`);

        // React와 PIXI 간 차이 비교
        const diffResult = await compareScreenshots(reactScreenshot, pixiScreenshot);
        expect(diffResult.diffPercent).toBeLessThan(1);
      });
    }
  }
});

/**
 * 두 스크린샷 간 픽셀 비교
 */
async function compareScreenshots(
  img1: Buffer,
  img2: Buffer
): Promise<{ diffPercent: number; diffImage: Buffer }> {
  const { PNG } = await import('pngjs');
  const pixelmatch = (await import('pixelmatch')).default;

  const png1 = PNG.sync.read(img1);
  const png2 = PNG.sync.read(img2);

  // 크기가 다르면 리사이즈
  const width = Math.max(png1.width, png2.width);
  const height = Math.max(png1.height, png2.height);

  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    png1.data,
    png2.data,
    diff.data,
    width,
    height,
    { threshold: 0.1, includeAA: false }
  );

  const totalPixels = width * height;
  const diffPercent = (numDiffPixels / totalPixels) * 100;

  return {
    diffPercent,
    diffImage: PNG.sync.write(diff),
  };
}
```

### 8.2 성능 최적화

```typescript
// packages/specs/src/renderers/PixiRenderer.ts

// 캐싱 추가
const variantColorCache = new Map<string, VariantColors>();
const sizePresetCache = new Map<string, SizePreset>();

export function getVariantColors(
  variantSpec: VariantSpec,
  theme: 'light' | 'dark'
): VariantColors {
  const cacheKey = `${JSON.stringify(variantSpec)}-${theme}`;

  if (variantColorCache.has(cacheKey)) {
    return variantColorCache.get(cacheKey)!;
  }

  const colors = computeVariantColors(variantSpec, theme);
  variantColorCache.set(cacheKey, colors);

  return colors;
}

// 테마 변경 시 캐시 무효화
export function invalidateCache(): void {
  variantColorCache.clear();
  sizePresetCache.clear();
}
```

### 8.3 번들 크기 최적화

```typescript
// packages/specs/src/index.ts

// Tree-shaking을 위한 개별 export
export { ButtonSpec } from './components/Button.spec';
export { TextFieldSpec } from './components/TextField.spec';
// ... 개별 export

// 타입만 export (번들에 포함 안 됨)
export type { ComponentSpec, Shape, TokenRef } from './types';
```

### 8.4 Phase 5 체크리스트

- [ ] Visual Regression Test 설정 (Playwright)
- [ ] 모든 컴포넌트 스냅샷 생성
- [ ] React ↔ PIXI 비교 자동화
- [ ] 성능 프로파일링
- [ ] 캐싱 최적화
- [ ] 번들 크기 분석 및 최적화
- [ ] 문서화 완료
- [ ] 마이그레이션 가이드 작성

---

## 9. 기술 명세

### 9.1 패키지 의존성

```json
// packages/specs/package.json
{
  "name": "@xstudio/specs",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./renderers": {
      "types": "./dist/renderers/index.d.ts",
      "import": "./dist/renderers/index.js"
    },
    "./primitives": {
      "types": "./dist/primitives/index.d.ts",
      "import": "./dist/primitives/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/types/index.js"
    },
    "./adapters": {
      "types": "./dist/adapters/index.d.ts",
      "import": "./dist/adapters/index.js"
    }
  },
  "files": ["dist"],
  "dependencies": {
    "colord": "^2.9.3"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "tsup": "^8.0.0",
    "tsx": "^4.7.0",
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "@playwright/test": "^1.40.0",
    "pixelmatch": "^5.3.0",
    "pngjs": "^7.0.0"
  }
}
```

### 9.2 빌드 설정

```json
// packages/specs/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 9.3 스크립트

```json
// packages/specs/package.json (scripts)
// ⚠️ 빌드 도구: tsup (tsc가 아님). dist/ 출력이 esm + cjs + dts
{
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "dev": "tsup src/index.ts --format esm,cjs --dts --watch",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:visual": "playwright test",
    "generate:css": "tsx scripts/generate-css.ts",
    "validate": "tsx scripts/validate-specs.ts",
    "validate:tokens": "tsx scripts/validate-tokens.ts",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  }
}
```

> **CRITICAL**: `@xstudio/specs`는 `dist/`를 통해 내보내므로, 소스 수정 후 반드시
> `pnpm --filter @xstudio/specs build`를 실행해야 합니다. 미실행 시 소비자 앱이
> 구 버전을 참조하여 레이아웃↔렌더링 불일치가 발생합니다.
> 자세한 내용은 [4.7.4.0 빌드 동기화](#4740-xstudiospecs-빌드-동기화-critical) 참조.

### 9.4 Zustand 상태 관리 연동

#### 9.4.1 Store와 Spec 연동 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                 Zustand Store ↔ Spec 연동                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Zustand Store                                               │
│  ├── elementsMap: Map<string, Element>                      │
│  │   └── element.props: { variant, size, children, ... }    │
│  │                                                          │
│  └── selectedElementId: string                              │
│                                                              │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────┐                                        │
│  │ Spec Adapter    │ ← element.props 를 Spec Props로 변환   │
│  └────────┬────────┘                                        │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐                                        │
│  │ Component Spec  │ ← ButtonSpec, TextFieldSpec 등         │
│  └────────┬────────┘                                        │
│           │                                                  │
│    ┌──────┴──────┐                                          │
│    ▼             ▼                                          │
│  React         PIXI                                         │
│  Renderer      Renderer                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 9.4.2 Spec Adapter 구현

```typescript
// packages/specs/src/adapters/storeAdapter.ts

import type { Element } from '@xstudio/builder/types';
import type { ComponentSpec } from '../types';
import { ButtonSpec } from '../components/Button.spec';
import { TextFieldSpec } from '../components/TextField.spec';

/**
 * Element 타입 → Component Spec 매핑
 */
const specRegistry: Record<string, ComponentSpec<unknown>> = {
  Button: ButtonSpec,
  TextField: TextFieldSpec,
  // ... 추가 컴포넌트
};

/**
 * Zustand Element를 Spec Props로 변환
 */
export function elementToSpecProps<T>(element: Element): T {
  const spec = specRegistry[element.type];
  if (!spec) {
    console.warn(`No spec found for element type: ${element.type}`);
    return element.props as T;
  }

  // props 정규화 (기본값 적용)
  return {
    variant: element.props.variant || spec.defaultVariant,
    size: element.props.size || spec.defaultSize,
    ...element.props,
  } as T;
}

/**
 * Element 타입에 해당하는 Spec 반환
 */
export function getSpecForElement(element: Element): ComponentSpec<unknown> | undefined {
  return specRegistry[element.type];
}

/**
 * Spec 변경 시 Element 업데이트 (역방향)
 */
export function specPropsToElement<T>(
  elementId: string,
  specProps: T,
  updateElement: (id: string, props: Partial<Element['props']>) => void
): void {
  updateElement(elementId, specProps as Partial<Element['props']>);
}
```

#### 9.4.3 PixiButton에서 사용 예시

```typescript
// apps/builder/src/builder/workspace/canvas/ui/PixiButton.tsx

import { useEditorStore } from '../../../../store/editorStore';
import { elementToSpecProps, getSpecForElement } from '@xstudio/specs/adapters';
import { renderToPixi, getVariantColors, getSizePreset } from '@xstudio/specs/renderers';
import type { ButtonProps } from '@xstudio/specs';

export const PixiButton = memo(function PixiButton({ elementId }: { elementId: string }) {
  // Zustand에서 element 가져오기
  const element = useEditorStore(state => state.elementsMap.get(elementId));

  if (!element) return null;

  // Spec Adapter로 props 변환
  const props = elementToSpecProps<ButtonProps>(element);
  const spec = getSpecForElement(element);

  if (!spec) return null;

  // Spec에서 variant/size 정보 가져오기
  const variantSpec = spec.variants[props.variant!];
  const sizeSpec = spec.sizes[props.size!];

  const colors = getVariantColors(variantSpec, theme);
  const sizePreset = getSizePreset(sizeSpec);

  // ... 렌더링 로직
});
```

#### 9.4.4 히스토리 연동

```typescript
// Spec 변경 시 히스토리 기록 (CRITICAL 규칙 준수)

import { useEditorStore } from '../../../../store/editorStore';

function updateElementFromSpec(elementId: string, newProps: Partial<ButtonProps>) {
  const store = useEditorStore.getState();

  // 1. 히스토리 기록 (상태 변경 전)
  store.recordHistory();

  // 2. Memory Update (즉시)
  store.updateElement(elementId, { props: newProps });

  // 3. Index Rebuild (자동)
  // 4. DB Persist (백그라운드)
  // 5. Preview Sync (백그라운드)
}
```

### 9.5 테스트 전략

#### 9.5.1 테스트 피라미드

```
                    ┌─────────────┐
                    │   E2E      │  Playwright (Visual Regression)
                    │   Tests    │  - React ↔ PIXI 비교
                    └─────────────┘  - 5% of tests
                   ┌───────────────┐
                   │  Integration  │  Vitest + React Testing Library
                   │    Tests      │  - Renderer + Store 연동
                   └───────────────┘  - 15% of tests
              ┌─────────────────────────┐
              │       Unit Tests        │  Vitest
              │   (render.shapes 함수)  │  - 순수 함수 테스트
              └─────────────────────────┘  - 80% of tests
```

#### 9.5.2 Unit Test 범위

```typescript
// packages/specs/tests/unit/Button.spec.test.ts

import { describe, it, expect } from 'vitest';
import { ButtonSpec } from '../../src/components/Button.spec';

describe('ButtonSpec', () => {
  describe('variants', () => {
    it('모든 variant가 필수 속성을 가짐', () => {
      const requiredKeys = ['background', 'backgroundHover', 'backgroundPressed', 'text'];

      Object.entries(ButtonSpec.variants).forEach(([name, variant]) => {
        requiredKeys.forEach(key => {
          expect(variant).toHaveProperty(key);
          expect(variant[key]).toMatch(/^\{color\./);
        });
      });
    });

    it('모든 토큰 참조가 유효함', () => {
      Object.values(ButtonSpec.variants).forEach(variant => {
        expect(isValidTokenRef(variant.background)).toBe(true);
        expect(isValidTokenRef(variant.text)).toBe(true);
      });
    });
  });

  describe('sizes', () => {
    it('모든 size가 필수 속성을 가짐', () => {
      Object.entries(ButtonSpec.sizes).forEach(([name, size]) => {
        expect(size.height).toBeGreaterThan(0);
        expect(size.paddingX).toBeGreaterThan(0);
        expect(size.fontSize).toMatch(/^\{typography\./);
        expect(size.borderRadius).toMatch(/^\{radius\./);
      });
    });

    it('size 순서가 오름차순임', () => {
      const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];
      const heights = sizes.map(s => ButtonSpec.sizes[s].height);

      for (let i = 1; i < heights.length; i++) {
        expect(heights[i]).toBeGreaterThan(heights[i - 1]);
      }
    });
  });

  describe('render.shapes()', () => {
    it('기본 shapes를 반환함 (default state)', () => {
      const props = { variant: 'primary', size: 'md', children: 'Click' };
      const variant = ButtonSpec.variants.primary;
      const size = ButtonSpec.sizes.md;

      const shapes = ButtonSpec.render.shapes(props, variant, size, 'default');

      expect(shapes.length).toBeGreaterThan(0);
      expect(shapes[0].type).toBe('roundRect');
    });

    it('hover state에서 올바른 색상 사용', () => {
      const props = { variant: 'primary', size: 'md', children: 'Click' };
      const variant = ButtonSpec.variants.primary;
      const size = ButtonSpec.sizes.md;

      const shapes = ButtonSpec.render.shapes(props, variant, size, 'hover');

      const bgShape = shapes.find(s => s.type === 'roundRect');
      expect(bgShape?.fill).toBe(variant.backgroundHover);
    });

    it('border variant는 border shape 포함', () => {
      const props = { variant: 'outline', size: 'md' };
      const variant = ButtonSpec.variants.outline;
      const size = ButtonSpec.sizes.md;

      const shapes = ButtonSpec.render.shapes(props, variant, size, 'default');

      const borderShape = shapes.find(s => s.type === 'border');
      expect(borderShape).toBeDefined();
      expect(borderShape?.borderWidth).toBe(1);
    });

    it('children이 있으면 text shape 포함', () => {
      const props = { variant: 'primary', size: 'md', children: 'Submit' };
      const variant = ButtonSpec.variants.primary;
      const size = ButtonSpec.sizes.md;

      const shapes = ButtonSpec.render.shapes(props, variant, size, 'default');

      const textShape = shapes.find(s => s.type === 'text');
      expect(textShape).toBeDefined();
      expect(textShape?.text).toBe('Submit');
    });

    it('focusVisible state에서 올바른 처리', () => {
      const props = { variant: 'primary', size: 'md', children: 'Focus' };
      const variant = ButtonSpec.variants.primary;
      const size = ButtonSpec.sizes.md;

      // focusVisible state 지원 확인
      const shapes = ButtonSpec.render.shapes(props, variant, size, 'focusVisible');
      expect(shapes.length).toBeGreaterThan(0);
    });
  });
});
```

#### 9.5.3 Integration Test 범위

```typescript
// packages/specs/tests/integration/ReactRenderer.test.ts

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderToReact } from '../../src/renderers/ReactRenderer';
import { ButtonSpec } from '../../src/components/Button.spec';

describe('ReactRenderer Integration', () => {
  it('renderToReact가 올바른 className 반환', () => {
    const result = renderToReact(ButtonSpec, { variant: 'primary', size: 'md' });

    expect(result.className).toBe('react-aria-Button');
  });

  it('data-* 속성이 올바르게 설정됨', () => {
    const result = renderToReact(ButtonSpec, { variant: 'primary', size: 'lg' });

    expect(result.dataAttributes['data-variant']).toBe('primary');
    expect(result.dataAttributes['data-size']).toBe('lg');
  });
});
```

#### 9.5.4 Visual Regression Test (확장)

```typescript
// packages/specs/tests/visual/consistency.test.ts

import { test, expect } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

test.describe('React ↔ PIXI Visual Consistency', () => {
  const MAX_DIFF_PERCENT = 1; // 최대 1% 차이 허용

  test('Button primary/md가 일치함', async ({ page }) => {
    // React 버전 캡처
    await page.goto('/test/button-react?variant=primary&size=md');
    const reactScreenshot = await page.locator('.react-aria-Button').screenshot();

    // PIXI 버전 캡처
    await page.goto('/test/button-pixi?variant=primary&size=md');
    await page.waitForSelector('canvas');
    const pixiScreenshot = await page.locator('canvas').screenshot();

    // 픽셀 비교
    const reactImg = PNG.sync.read(reactScreenshot);
    const pixiImg = PNG.sync.read(pixiScreenshot);

    const diff = new PNG({ width: reactImg.width, height: reactImg.height });
    const numDiffPixels = pixelmatch(
      reactImg.data,
      pixiImg.data,
      diff.data,
      reactImg.width,
      reactImg.height,
      { threshold: 0.1 }
    );

    const totalPixels = reactImg.width * reactImg.height;
    const diffPercent = (numDiffPixels / totalPixels) * 100;

    expect(diffPercent).toBeLessThan(MAX_DIFF_PERCENT);
  });
});
```

#### 9.5.5 테스트 커버리지 목표

| 영역 | 최소 커버리지 | 목표 커버리지 |
|------|-------------|-------------|
| types/*.ts | 100% | 100% |
| primitives/*.ts | 100% | 100% |
| renderers/*.ts | 80% | 90% |
| components/*.spec.ts | 80% | 95% |
| adapters/*.ts | 70% | 85% |
| **전체** | **80%** | **90%** |

#### 9.5.6 CI 테스트 파이프라인

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm --filter @xstudio/specs test:coverage
      - uses: codecov/codecov-action@v3

  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm --filter @xstudio/specs build
      - run: npx playwright install --with-deps
      - run: pnpm --filter @xstudio/specs test:visual
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: visual-diff-report
          path: packages/specs/test-results/
```

---

## 10. 마이그레이션 전략

### 10.1 점진적 마이그레이션

```
기존 코드와 병행 운영:

1. Spec이 없는 컴포넌트: 기존 방식 유지
2. Spec이 있는 컴포넌트: 새 방식 사용
3. Feature flag로 전환 제어

// 예시
const USE_SPEC_RENDERER = {
  Button: true,
  TextField: true,
  Table: false, // 아직 마이그레이션 안 됨
};

function PixiButton({ element }) {
  if (USE_SPEC_RENDERER.Button) {
    return <PixiButtonFromSpec element={element} />;
  }
  return <LegacyPixiButton element={element} />;
}
```

### 10.2 롤백 계획

```
문제 발생 시:

1. Feature flag OFF → 기존 방식으로 즉시 롤백
2. Spec 버그 수정 후 재배포
3. Visual Regression Test로 검증
4. Feature flag ON
```

### 10.3 성공 기준

| 기준 | 목표 | 측정 방법 |
|------|------|----------|
| 시각적 일치율 | > 95% | Playwright 픽셀 비교 |
| 성능 | 60fps 유지 | Chrome DevTools |
| 번들 크기 | +10% 이하 | webpack-bundle-analyzer |
| 테스트 커버리지 | > 80% | Vitest |
| 마이그레이션 완료 | 72개 전체 | 체크리스트 |

---

## 부록

### A. 전체 컴포넌트 목록 (72개)

<details>
<summary>클릭하여 펼치기</summary>

| # | 컴포넌트 | Phase | 복잡도 |
|---|----------|-------|--------|
| 1 | Button | 1 | 중간 |
| 2 | Badge | 1 | 낮음 |
| 3 | Card | 1 | 중간 |
| 4 | Link | 1 | 낮음 |
| 5 | Separator | 1 | 낮음 |
| 6 | ToggleButton | 1 | 중간 |
| 7 | ToggleButtonGroup | 1 | 높음 |
| 8 | Tooltip | 1 | 중간 |
| 9 | Popover | 1 | 중간 |
| 10 | Dialog | 1 | 높음 |
| 11 | TextField | 2 | 중간 |
| 12 | TextArea | 2 | 중간 |
| 13 | NumberField | 2 | 중간 |
| 14 | SearchField | 2 | 중간 |
| 15 | Checkbox | 2 | 중간 |
| 16 | CheckboxGroup | 2 | 높음 |
| 17 | Radio | 2 | 중간 |
| 18 | RadioGroup | 2 | 높음 |
| 19 | Switch | 2 | 중간 |
| 20 | Select | 2 | 높음 |
| 21 | ComboBox | 2 | 높음 |
| 22 | ListBox | 2 | 높음 |
| 23 | Slider | 2 | 높음 |
| 24 | Meter | 2 | 중간 |
| 25 | ProgressBar | 2 | 중간 |
| 26 | Form | 2 | 낮음 |
| 27 | Label | 2 | 낮음 |
| 28 | Table | 3 | 매우 높음 |
| 29 | Tree | 3 | 높음 |
| 30 | Tabs | 3 | 높음 |
| 31 | Menu | 3 | 높음 |
| 32 | Breadcrumbs | 3 | 중간 |
| 33 | Pagination | 3 | 중간 |
| 34 | TagGroup | 3 | 중간 |
| 35 | GridList | 3 | 높음 |
| 36 | Disclosure | 3 | 중간 |
| 37 | DisclosureGroup | 3 | 높음 |
| 38 | Toolbar | 3 | 중간 |
| 39 | Toast | 3 | 중간 |
| 40 | Panel | 3 | 중간 |
| 41 | Group | 3 | 낮음 |
| 42 | Slot | 3 | 낮음 |
| 43 | Skeleton | 3 | 낮음 |
| 44 | DropZone | 3 | 중간 |
| 45 | FileTrigger | 3 | 중간 |
| 46 | ScrollBox | 3 | 높음 |
| 47 | MaskedFrame | 3 | 높음 |
| 48 | Avatar | 3 | 낮음 |
| 49 | IconButton | 3 | 중간 |
| 50 | Spinner | 3 | 낮음 |
| 51 | Alert | 3 | 중간 |
| 52 | DatePicker | 4 | 매우 높음 |
| 53 | DateRangePicker | 4 | 매우 높음 |
| 54 | DateField | 4 | 높음 |
| 55 | TimeField | 4 | 높음 |
| 56 | Calendar | 4 | 높음 |
| 57 | RangeCalendar | 4 | 높음 |
| 58 | ColorPicker | 4 | 매우 높음 |
| 59 | ColorField | 4 | 높음 |
| 60 | ColorSlider | 4 | 높음 |
| 61 | ColorArea | 4 | 높음 |
| 62 | ColorWheel | 4 | 높음 |
| 63 | ColorSwatch | 4 | 중간 |
| 64 | ColorSwatchPicker | 4 | 중간 |
| 65 | List | 4 | 중간 |
| 66 | Input | 4 | 낮음 |
| 67 | FancyButton | 4 | 중간 |
| 68 | Switcher | 4 | 중간 |
| 69 | Modal | 4 | 높음 |
| 70 | Drawer | 4 | 높음 |
| 71 | Accordion | 4 | 중간 |
| 72 | Overlay | 4 | 중간 |

</details>

### B. 참조 문서

- [PIXI_COMPONENT_PLAN.md](./PIXI_COMPONENT_PLAN.md) - 현재 구현 상태
- [ADR-002: Styling Approach](./adr/002-styling-approach.md) - 스타일링 결정
- [ADR-003: Canvas Rendering](./adr/003-canvas-rendering.md) - 캔버스 렌더링 결정
- [CSS_ARCHITECTURE.md](./reference/components/CSS_ARCHITECTURE.md) - CSS 아키텍처

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2026-01-27 | 1.0 | 초기 설계 문서 작성 |
| 2026-01-27 | 1.1 | 문서 보완: Shape 타입 확장, TokenRef 타입 강화, Phase 0 검증 게이트, Zustand 연동, 테스트 전략 보강 |
| 2026-01-27 | 1.2 | 리뷰 반영: states/VariantSpec 역할 분리, ShadowTokens 추가, 컴포넌트 72개 완성, Shape target 속성, TextShape 확장, ContainerLayout grid/position, overlay 설정, 패키지 exports 수정, Visual test 플래키 가드 |
| 2026-01-27 | 1.3 | 2차 리뷰 반영: (1) ComponentState에 'focusVisible' 추가, (2) Shape 유니온에 ShapeBase 교차 타입 결합, (3) resolveToken에 shadow 카테고리 처리 + shadows primitive 추가, (4) BorderShape.borderWidth로 PIXI 렌더러 통일, (5) 모든 shapes 호출부에 state 파라미터 추가 (기본값 'default'), (6) CSS 생성기에 textHover/borderHover 반영, (7) generateStateStyles가 spec.states를 동적으로 사용, (8) 테스트 코드 state 파라미터 추가 + focusVisible 테스트 케이스 |
| 2026-01-27 | 1.4 | 3차 리뷰 반영: (1) PixiRenderContext에 state 필드 추가, (2) renderToPixi에서 shapes 호출 시 state 파라미터 전달, (3) generateStateStyles에 hover/focused 상태 처리 추가, (4) StateEffect.boxShadow에 ShadowTokenRef 지원 + resolveBoxShadow 헬퍼 함수 추가, (5) RenderSpec JSDoc에 'focusVisible' 추가 |
| 2026-01-27 | 1.5 | 4차 리뷰 반영: (1) 디렉토리 구조 effects.ts → shadows.ts 수정, (2) renderers/utils를 tokenResolver.ts 단일 파일로 통일, (3) resolveBoxShadow에서 ShadowTokenRef가 문자열 리터럴 타입임을 반영하여 불필요한 .ref 분기 제거 |
| 2026-01-27 | 1.6 | 5차 리뷰 반영: (1) 아키텍처 개요 다이어그램 effects.ts → shadows.ts 수정, (2) tokenToCSSVar에 shadow 카테고리 처리 추가 |
| 2026-01-29 | 1.7 | 하이브리드 레이아웃 엔진 완료 반영: (1) ContainerLayout 인터페이스에 레이아웃 엔진 지원 CSS 속성 추가 (inline-block, flow-root, box-sizing, min/max 크기, overflow-x/y, lineHeight, verticalAlign, visibility, justifySelf), (2) 데이터 흐름 다이어그램에 하이브리드 레이아웃 엔진 계층(BlockEngine/FlexEngine/GridEngine) 추가 및 내부/외부 레이아웃 계층 분리 설명 |
| 2026-01-29 | 1.8 | Button 구현 점검 — 코드↔문서 동기화: (1) RadiusTokens 값 교정 (md:8→6, lg:12→8, xl:16→12, CSS 변수 기준), (2) typography에 fontWeight/lineHeight 객체 추가, (3) ButtonProps에 text/label 필드 추가 및 style 타입을 Record로 변경, (4) ButtonSpec variants/sizes에 `as TokenRef` 캐스트 추가, (5) lg size borderRadius를 `{radius.lg}`로 수정, (6) disabled state에 pointerEvents 추가, (7) focusVisible outline을 var(--primary) 형식으로 수정, (8) render.shapes에 text 폴백 체인(children → text → label) 반영 |
| 2026-01-29 | 1.9 | Pixi UI 컴포넌트 CSS 단위 해석 규칙 추가 (Section 4.7.4): (1) typeof === 'number' 패턴 사용 금지 → parseCSSSize() 필수, (2) % / vw / vh는 부모 content area 기준 해석 (parentContentArea = 부모 width - padding - border), (3) padding shorthand(parsePadding) + border width 4방향(parseBorderWidth) 파싱 필수, (4) 적용 필수 컴포넌트 18개 목록 명시, (5) Yoga 경로에서 vh/vw → % 문자열 변환 정책 (styleToLayout.ts) |
| 2026-01-29 | 1.10 | Button 레이아웃 버그 패치 4건 + 컴포넌트 상태 추적표 (Section 4.7.4.1~4.7.4.4): (1) padding/border 이중 적용 방지 — SELF_PADDING_TAGS(Button, SubmitButton, FancyButton, ToggleButton) + stripSelfRenderedProps (BuilderCanvas.tsx), (2) BlockEngine border-box 크기 계산 — content-box → border-box 변환으로 block/inline-block 요소 겹침 해결 (BlockEngine.ts), (3) baseline 정렬 수정 — VERTICALLY_CENTERED_TAGS(button/fancybutton/togglebutton/input/select) height/2 반환으로 CSS 웹 모드와 동일한 수직 중앙 정렬 (utils.ts), (4) spec 기본 borderWidth 적용 — inline style 미지정 시 variantColors.border 존재하면 1px 기본값 (PixiButton.tsx), (5) 적용 필수 컴포넌트 18개 상태 추적표 추가 — PixiFancyButton/PixiToggleButton은 SELF_PADDING_TAGS 등록 완료, typeof 패턴 전환은 미완료(잔여 작업) |
| 2026-01-30 | 1.11 | Button auto width 불일치 수정 + Spec 빌드 동기화 규칙 (Section 4.7.4.0): (1) ButtonSpec sizes paddingX 수정 — md:16→24, lg:24→32, xl:32→40 (CSS 토큰과 일치), (2) BUTTON_SIZE_CONFIG paddingLeft/Right 동기화, (3) fontFamily 통일 — Pretendard를 specs fontFamily.sans에 추가, PixiButton·utils.ts·Button.spec.ts에서 specs 상수 참조로 교체, (4) `@xstudio/specs` 빌드 동기화 규칙 추가 (CRITICAL) — dist/ 미갱신 시 layout↔rendering 값 불일치 발생 사례 문서화, (5) 핵심 원칙에 Build-Sync 추가, (6) 9.3 스크립트 섹션을 실제 tsup 빌드 도구와 동기화, (7) 값 동기화 대상 테이블 (Spec↔Builder 내부 상수↔CSS 토큰) 및 @sync 주석 정책 명시 |
