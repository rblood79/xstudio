# Component Spec Architecture - 상세 설계 문서

> **작성일**: 2026-01-27
> **상태**: 설계 완료
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
│  │   └── effects.ts        # 그림자, 테두리 등               │
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
       └────────────────────┴────────────────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  동일한 시각적   │
                   │     결과물       │
                   └──────────────────┘
```

### 2.3 핵심 원칙

1. **Single Source of Truth**: 모든 스타일 정보는 Spec에서만 정의
2. **Shape-First**: 도형을 먼저 정의하고, 각 렌더러가 해석
3. **Token Reference**: 값은 토큰으로 참조 (하드코딩 금지)
4. **Renderer Agnostic**: Spec은 렌더러에 독립적
5. **Type Safe**: 모든 Spec은 TypeScript로 타입 검증

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
    │   │   └── effects.ts           # 그림자, 테두리
    │   │
    │   ├── renderers/
    │   │   ├── index.ts
    │   │   ├── ReactRenderer.ts     # Spec → React Props
    │   │   ├── PixiRenderer.ts      # Spec → PIXI Graphics
    │   │   ├── CSSGenerator.ts      # Spec → CSS 파일
    │   │   └── utils/
    │   │       ├── colorResolver.ts # 토큰 → 실제 색상
    │   │       └── sizeResolver.ts  # 토큰 → 실제 크기
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
  element: keyof HTMLElementTagNameMap;

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
 */
export interface VariantSpec {
  /** 배경색 (토큰 참조) */
  background: TokenRef;

  /** 배경색 hover */
  backgroundHover: TokenRef;

  /** 배경색 pressed */
  backgroundPressed: TokenRef;

  /** 텍스트 색상 */
  text: TokenRef;

  /** 테두리 색상 (optional) */
  border?: TokenRef;

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
 * 렌더링 스펙
 */
export interface RenderSpec<Props> {
  /**
   * 공통 도형 정의
   * React와 PIXI 모두에서 사용하는 도형 구조
   */
  shapes: (props: Props, variant: VariantSpec, size: SizeSpec) => Shape[];

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

#### 3.3.2 Shape 타입

```typescript
// packages/specs/src/types/shape.types.ts

/**
 * 기본 도형 타입
 */
export type Shape =
  | RectShape
  | RoundRectShape
  | CircleShape
  | TextShape
  | ShadowShape
  | BorderShape
  | ContainerShape;

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
  fill?: ColorValue;
  align?: 'left' | 'center' | 'right';
  baseline?: 'top' | 'middle' | 'bottom';
}

/**
 * 그림자
 */
export interface ShadowShape {
  type: 'shadow';
  offsetX: number;
  offsetY: number;
  blur: number;
  spread?: number;
  color: ColorValue;
  alpha?: number;
  inset?: boolean;
}

/**
 * 테두리
 */
export interface BorderShape {
  type: 'border';
  width: number;
  color: ColorValue;
  style?: 'solid' | 'dashed' | 'dotted';
  radius?: number | [number, number, number, number];
}

/**
 * 컨테이너 (자식 요소 그룹)
 */
export interface ContainerShape {
  type: 'container';
  x: number;
  y: number;
  children: Shape[];
  clip?: boolean;
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
  md: number;    // 8
  lg: number;    // 12
  xl: number;    // 16
  full: number;  // 9999
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

export function getTypographyToken(name: keyof TypographyTokens): number {
  return typography[name];
}
```

```typescript
// packages/specs/src/primitives/radius.ts

import type { RadiusTokens } from '../types/token.types';

export const radius: RadiusTokens = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export function getRadiusToken(name: keyof RadiusTokens): number {
  return radius[name];
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
}

/**
 * ComponentSpec의 Shapes를 PIXI Graphics로 렌더링
 */
export function renderToPixi<Props extends Record<string, unknown>>(
  spec: ComponentSpec<Props>,
  props: Props,
  context: PixiRenderContext
): void {
  const { graphics, theme, width, height } = context;

  const variant = (props.variant as string) || spec.defaultVariant;
  const size = (props.size as string) || spec.defaultSize;

  const variantSpec = spec.variants[variant];
  const sizeSpec = spec.sizes[size];

  if (!variantSpec || !sizeSpec) {
    console.warn(`Invalid variant/size: ${variant}/${size}`);
    return;
  }

  // Shapes 생성
  const shapes = spec.render.shapes(props, variantSpec, sizeSpec);

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

      g.stroke({
        color: colorNum,
        width: shape.width,
        // TODO: dashed/dotted 지원
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
 * '#ffffff' → 0xffffff
 */
function hexStringToNumber(hex: string): number {
  if (hex.startsWith('#')) {
    return parseInt(hex.slice(1), 16);
  }
  if (hex.startsWith('0x')) {
    return parseInt(hex, 16);
  }
  // rgb() 등은 colord로 처리
  return 0x000000;
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
    lines.push('    &[data-hovered] {');
    lines.push(`      background: ${tokenToCSSVar(variantSpec.backgroundHover)};`);
    if (variantSpec.border) {
      lines.push(`      border-color: ${tokenToCSSVar(variantSpec.backgroundHover)};`);
    }
    lines.push('    }');
    lines.push('');
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

function generateStateStyles<Props>(spec: ComponentSpec<Props>): string[] {
  return [
    `  .react-aria-${spec.name}[data-focus-visible] {`,
    `    outline: 2px solid var(--primary);`,
    `    outline-offset: 2px;`,
    `  }`,
    ``,
    `  .react-aria-${spec.name}[data-disabled] {`,
    `    opacity: 0.38;`,
    `    cursor: not-allowed;`,
    `    pointer-events: none;`,
    `  }`,
  ];
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

import type { ComponentSpec } from '../types';

export interface ButtonProps {
  variant?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'error' | 'surface' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  style?: React.CSSProperties;
}

export const ButtonSpec: ComponentSpec<ButtonProps> = {
  name: 'Button',
  description: 'Material Design 3 기반 버튼 컴포넌트',
  element: 'button',

  defaultVariant: 'default',
  defaultSize: 'sm',

  variants: {
    default: {
      background: '{color.surface-container-high}',
      backgroundHover: '{color.surface-container-highest}',
      backgroundPressed: '{color.surface-container-highest}',
      text: '{color.on-surface}',
      border: '{color.outline-variant}',
    },
    primary: {
      background: '{color.primary}',
      backgroundHover: '{color.primary-hover}',
      backgroundPressed: '{color.primary-pressed}',
      text: '{color.on-primary}',
    },
    secondary: {
      background: '{color.secondary}',
      backgroundHover: '{color.secondary-hover}',
      backgroundPressed: '{color.secondary-pressed}',
      text: '{color.on-secondary}',
    },
    tertiary: {
      background: '{color.tertiary}',
      backgroundHover: '{color.tertiary-hover}',
      backgroundPressed: '{color.tertiary-pressed}',
      text: '{color.on-tertiary}',
    },
    error: {
      background: '{color.error}',
      backgroundHover: '{color.error-hover}',
      backgroundPressed: '{color.error-pressed}',
      text: '{color.on-error}',
    },
    surface: {
      background: '{color.surface-container-highest}',
      backgroundHover: '{color.surface-container-highest}',
      backgroundPressed: '{color.surface-container-highest}',
      text: '{color.on-surface}',
      border: '{color.outline-variant}',
    },
    outline: {
      background: '{color.surface}',
      backgroundHover: '{color.surface-container}',
      backgroundPressed: '{color.surface-container-high}',
      text: '{color.primary}',
      border: '{color.outline}',
      backgroundAlpha: 0,
    },
    ghost: {
      background: '{color.surface}',
      backgroundHover: '{color.surface-container}',
      backgroundPressed: '{color.surface-container-high}',
      text: '{color.primary}',
      backgroundAlpha: 0,
    },
  },

  sizes: {
    xs: {
      height: 24,
      paddingX: 8,
      paddingY: 2,
      fontSize: '{typography.text-xs}',
      borderRadius: '{radius.sm}',
      iconSize: 12,
      gap: 4,
    },
    sm: {
      height: 32,
      paddingX: 12,
      paddingY: 4,
      fontSize: '{typography.text-sm}',
      borderRadius: '{radius.sm}',
      iconSize: 14,
      gap: 6,
    },
    md: {
      height: 40,
      paddingX: 16,
      paddingY: 8,
      fontSize: '{typography.text-md}',
      borderRadius: '{radius.md}',
      iconSize: 16,
      gap: 8,
    },
    lg: {
      height: 48,
      paddingX: 24,
      paddingY: 12,
      fontSize: '{typography.text-lg}',
      borderRadius: '{radius.md}',
      iconSize: 20,
      gap: 10,
    },
    xl: {
      height: 56,
      paddingX: 32,
      paddingY: 16,
      fontSize: '{typography.text-xl}',
      borderRadius: '{radius.lg}',
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
    },
    focusVisible: {
      outline: '2px solid {color.primary}',
      outlineOffset: '2px',
    },
  },

  render: {
    shapes: (props, variant, size) => {
      const width = (props.style?.width as number) || 'auto';
      const height = size.height;
      const borderRadius = size.borderRadius;

      const shapes = [
        // 배경
        {
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius,
          fill: variant.background,
          fillAlpha: variant.backgroundAlpha ?? 1,
        },
      ];

      // 테두리 (있는 경우)
      if (variant.border) {
        shapes.push({
          type: 'border' as const,
          width: 1,
          color: variant.border,
          radius: borderRadius,
        });
      }

      // 텍스트
      if (props.children) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: 0,
          text: props.children,
          fontSize: size.fontSize,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500,
          fill: variant.text,
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

- [ ] Button.spec.ts 작성
- [ ] Button.tsx 마이그레이션
- [ ] PixiButton.tsx 마이그레이션
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
    shapes: (props, variant, size) => {
      const shapes = [];

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
        width: props.isInvalid ? 2 : 1,
        color: props.isInvalid ? '{color.error}' : variant.border!,
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
    shapes: (props, variant, size) => {
      const shapes = [];
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
            width: 1,
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
    shapes: (props, variant, size) => {
      const shapes = [];

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
        width: 1,
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

```typescript
// packages/specs/tests/visual-regression.test.ts

import { test, expect } from '@playwright/test';
import { ButtonSpec } from '../src/components/Button.spec';
import { renderToReact } from '../src/renderers/ReactRenderer';

test.describe('Button Visual Regression', () => {
  const variants = Object.keys(ButtonSpec.variants);
  const sizes = Object.keys(ButtonSpec.sizes);

  for (const variant of variants) {
    for (const size of sizes) {
      test(`Button ${variant}/${size} matches snapshot`, async ({ page }) => {
        // React 버전 렌더링
        await page.goto(`/storybook/button?variant=${variant}&size=${size}`);
        const reactButton = await page.locator('.react-aria-Button');
        const reactScreenshot = await reactButton.screenshot();

        // PIXI 버전 렌더링
        await page.goto(`/builder-preview/button?variant=${variant}&size=${size}`);
        const pixiCanvas = await page.locator('canvas');
        const pixiScreenshot = await pixiCanvas.screenshot();

        // 비교 (픽셀 차이 허용치: 1%)
        expect(reactScreenshot).toMatchSnapshot(`button-${variant}-${size}-react.png`);
        expect(pixiScreenshot).toMatchSnapshot(`button-${variant}-${size}-pixi.png`);

        // React와 PIXI 간 차이 비교
        // TODO: pixelmatch로 정량적 비교
      });
    }
  }
});
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
  "exports": {
    ".": "./src/index.ts",
    "./renderers": "./src/renderers/index.ts",
    "./primitives": "./src/primitives/index.ts",
    "./types": "./src/types/index.ts"
  },
  "dependencies": {
    "colord": "^2.9.3"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@playwright/test": "^1.40.0"
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
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest",
    "test:visual": "playwright test",
    "generate:css": "tsx scripts/generate-css.ts",
    "validate": "tsx scripts/validate-specs.ts",
    "lint": "eslint src/"
  }
}
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
| 18 | Switch | 2 | 중간 |
| 19 | Select | 2 | 높음 |
| 20 | ComboBox | 2 | 높음 |
| 21 | ListBox | 2 | 높음 |
| 22 | Slider | 2 | 높음 |
| 23 | Meter | 2 | 중간 |
| 24 | ProgressBar | 2 | 중간 |
| 25 | Form | 2 | 낮음 |
| 26 | Table | 3 | 매우 높음 |
| 27 | Tree | 3 | 높음 |
| 28 | Tabs | 3 | 높음 |
| 29 | Menu | 3 | 높음 |
| 30 | Breadcrumbs | 3 | 중간 |
| 31 | Pagination | 3 | 중간 |
| 32 | TagGroup | 3 | 중간 |
| 33 | GridList | 3 | 높음 |
| 34 | Disclosure | 3 | 중간 |
| 35 | DisclosureGroup | 3 | 높음 |
| 36 | Toolbar | 3 | 중간 |
| 37 | Toast | 3 | 중간 |
| 38 | Panel | 3 | 중간 |
| 39 | Group | 3 | 낮음 |
| 40 | Slot | 3 | 낮음 |
| 41 | Skeleton | 3 | 낮음 |
| 42 | DropZone | 3 | 중간 |
| 43 | FileTrigger | 3 | 중간 |
| 44 | ScrollBox | 3 | 높음 |
| 45 | MaskedFrame | 3 | 높음 |
| 46 | DatePicker | 4 | 매우 높음 |
| 47 | DateRangePicker | 4 | 매우 높음 |
| 48 | DateField | 4 | 높음 |
| 49 | TimeField | 4 | 높음 |
| 50 | Calendar | 4 | 높음 |
| 51 | ColorPicker | 4 | 매우 높음 |
| 52 | ColorField | 4 | 높음 |
| 53 | ColorSlider | 4 | 높음 |
| 54 | ColorArea | 4 | 높음 |
| 55 | ColorWheel | 4 | 높음 |
| 56 | ColorSwatch | 4 | 중간 |
| 57 | ColorSwatchPicker | 4 | 중간 |
| 58 | List | 4 | 중간 |
| 59 | Input | 4 | 낮음 |
| 60 | FancyButton | 4 | 중간 |
| 61 | Switcher | 4 | 중간 |
| 62 | RangeCalendar | 4 | 높음 |

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
