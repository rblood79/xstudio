/**
 * React Renderer
 *
 * ComponentSpec을 React Props로 변환
 *
 * @packageDocumentation
 */

import type { ComponentSpec, VariantSpec, SizeSpec } from '../types';
import { tokenToCSSVar } from './utils/tokenResolver';

/**
 * CSS 스타일 속성 타입 (React.CSSProperties와 호환)
 */
export type CSSProperties = Record<string, string | number | undefined>;

export interface ReactRenderResult {
  /** CSS 클래스명 */
  className: string;
  /** data-* 속성 */
  dataAttributes: Record<string, string>;
  /** 인라인 스타일 (Shape에서 계산된 동적 스타일) */
  style?: CSSProperties;
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
  const style = calculateDynamicStyle(props);

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
  props: Props
): CSSProperties | undefined {
  const inlineStyle = (props as { style?: CSSProperties }).style;
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

/**
 * SizeSpec을 CSS 변수로 변환
 */
export function generateSizeVariables(sizeSpec: SizeSpec): Record<string, string> {
  return {
    '--spec-height': `${sizeSpec.height}px`,
    '--spec-padding-x': `${sizeSpec.paddingX}px`,
    '--spec-padding-y': `${sizeSpec.paddingY}px`,
    '--spec-font-size': tokenToCSSVar(sizeSpec.fontSize),
    '--spec-border-radius': tokenToCSSVar(sizeSpec.borderRadius),
    ...(sizeSpec.iconSize && { '--spec-icon-size': `${sizeSpec.iconSize}px` }),
    ...(sizeSpec.gap && { '--spec-gap': `${sizeSpec.gap}px` }),
  };
}
