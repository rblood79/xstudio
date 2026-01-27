/**
 * PIXI Renderer
 *
 * ComponentSpec의 Shapes를 PIXI Graphics로 렌더링
 *
 * @packageDocumentation
 */

import type { Graphics } from 'pixi.js';
import type { ComponentSpec, Shape, VariantSpec, SizeSpec, ComponentState } from '../types';
import { resolveColor, resolveToken, hexStringToNumber } from './utils/tokenResolver';

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
      const fill = shape.fill ? resolveColor(shape.fill, theme) : undefined;
      const radiusValue = typeof shape.radius === 'number'
        ? shape.radius
        : shape.radius[0]; // 단순화: 첫 번째 값만 사용

      g.roundRect(shape.x, shape.y, width, height, radiusValue);

      if (fill !== undefined) {
        if (typeof fill === 'string') {
          g.fill({ color: hexStringToNumber(fill), alpha: shape.fillAlpha ?? 1 });
        } else {
          g.fill({ color: fill, alpha: shape.fillAlpha ?? 1 });
        }
      }
      break;
    }

    case 'rect': {
      const width = shape.width === 'auto' ? containerWidth : shape.width;
      const height = shape.height === 'auto' ? containerHeight : shape.height;
      const fill = shape.fill ? resolveColor(shape.fill, theme) : undefined;

      g.rect(shape.x, shape.y, width, height);

      if (fill !== undefined) {
        if (typeof fill === 'string') {
          g.fill({ color: hexStringToNumber(fill), alpha: shape.fillAlpha ?? 1 });
        } else {
          g.fill({ color: fill, alpha: shape.fillAlpha ?? 1 });
        }
      }
      break;
    }

    case 'circle': {
      const fill = shape.fill ? resolveColor(shape.fill, theme) : undefined;

      g.circle(shape.x, shape.y, shape.radius);

      if (fill !== undefined) {
        if (typeof fill === 'string') {
          g.fill({ color: hexStringToNumber(fill), alpha: shape.fillAlpha ?? 1 });
        } else {
          g.fill({ color: fill, alpha: shape.fillAlpha ?? 1 });
        }
      }
      break;
    }

    case 'line': {
      const stroke = resolveColor(shape.stroke, theme);
      const strokeNum = typeof stroke === 'string' ? hexStringToNumber(stroke) : stroke;

      g.moveTo(shape.x1, shape.y1);
      g.lineTo(shape.x2, shape.y2);
      g.stroke({
        color: strokeNum,
        width: shape.strokeWidth,
      });
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
        width: shape.borderWidth,
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
    case 'gradient':
    case 'image':
      // PixiButton.tsx 등에서 별도 처리
      break;
  }
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
    bg: typeof bg === 'string' ? hexStringToNumber(bg) : (bg as number),
    bgHover: typeof bgHover === 'string' ? hexStringToNumber(bgHover) : (bgHover as number),
    bgPressed: typeof bgPressed === 'string' ? hexStringToNumber(bgPressed) : (bgPressed as number),
    text: typeof text === 'string' ? hexStringToNumber(text) : (text as number),
    border: border !== undefined
      ? (typeof border === 'string' ? hexStringToNumber(border) : (border as number))
      : undefined,
    bgAlpha: variantSpec.backgroundAlpha ?? 1,
  };
}

/**
 * Size 프리셋 가져오기
 */
export function getSizePreset(
  sizeSpec: SizeSpec,
  theme: 'light' | 'dark' = 'light'
): {
  height: number;
  paddingX: number;
  paddingY: number;
  fontSize: number;
  borderRadius: number;
  iconSize?: number;
  gap?: number;
} {
  const fontSize = resolveToken(sizeSpec.fontSize, theme);
  const borderRadius = resolveToken(sizeSpec.borderRadius, theme);

  return {
    height: sizeSpec.height,
    paddingX: sizeSpec.paddingX,
    paddingY: sizeSpec.paddingY,
    fontSize: typeof fontSize === 'number' ? fontSize : 14,
    borderRadius: typeof borderRadius === 'number' ? borderRadius : 4,
    iconSize: sizeSpec.iconSize,
    gap: sizeSpec.gap,
  };
}
