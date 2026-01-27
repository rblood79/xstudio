/**
 * Shape Types
 *
 * Component Spec에서 사용하는 도형 타입 정의
 * React와 PIXI 렌더러 모두에서 해석 가능한 도형 구조
 *
 * @packageDocumentation
 */

import type { TokenRef } from './token.types';

/**
 * 색상 값 (토큰 참조 또는 직접 값)
 */
export type ColorValue = TokenRef | string | number;

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
 * 컨테이너 레이아웃 설정
 */
export interface ContainerLayout {
  /** 레이아웃 타입 */
  display?: 'flex' | 'block' | 'grid' | 'none';

  /** 포지션 타입 */
  position?: 'relative' | 'absolute';

  /** absolute 포지션일 때 위치 */
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;

  /** z-index (레이어 순서) */
  zIndex?: number;

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

  // ─── 자식 요소용 (flex item) ───
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | 'auto';
  alignSelf?: 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch';
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
