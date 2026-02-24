/**
 * Form Component Spec
 *
 * Material Design 3 기반 폼 컨테이너 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Form Props
 */
export interface FormProps {
  variant?: 'default' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  children?: string;
  title?: string;
  description?: string;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * Form Component Spec
 */
export const FormSpec: ComponentSpec<FormProps> = {
  name: 'Form',
  description: 'Material Design 3 기반 폼 컨테이너 컴포넌트',
  element: 'form',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
    },
    outlined: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 12,
      paddingY: 12,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 12,
    },
    md: {
      height: 0,
      paddingX: 20,
      paddingY: 20,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 16,
    },
    lg: {
      height: 0,
      paddingX: 28,
      paddingY: 28,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      gap: 20,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: 'none',
    },
    focusVisible: {},
  },

  render: {
    shapes: (props, variant, size, _state = 'default') => {
      // 배경 roundRect는 항상 'auto'를 사용하여 specShapesToSkia의 containerWidth에 맞춤
      const width = 'auto' as const;

      // 사용자 스타일 우선, 없으면 spec 기본값
      const bgColor = props.style?.backgroundColor ?? variant.background;

      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      const textColor = props.style?.color ?? variant.text;
      const fontSize = props.style?.fontSize ?? size.fontSize;
      const fwRaw = props.style?.fontWeight;
      const fw = fwRaw != null
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 600)
        : 600;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';

      const shapes: Shape[] = [];

      // 배경
      shapes.push({
        id: 'bg',
        type: 'roundRect' as const,
        x: 0,
        y: 0,
        width,
        height: 'auto',
        radius: borderRadius as unknown as number,
        fill: bgColor,
      });

      // 테두리 (outlined variant)
      const borderColor = props.style?.borderColor ?? variant.border;
      const styleBw = props.style?.borderWidth;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : 1;
      if (borderColor) {
        shapes.push({
          type: 'border' as const,
          target: 'bg',
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        });
      }

      // 자식 Element가 콘텐츠 렌더링 담당 (Heading, Description, FormField 등)
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // fallback: 자식이 없는 레거시 데이터 → 전체 렌더링
      // 타이틀
      if (props.title) {
        shapes.push({
          type: 'text' as const,
          x: size.paddingX,
          y: size.paddingY,
          text: props.title,
          fontSize: (fontSize as unknown as number) + 4,
          fontFamily: ff,
          fontWeight: fw,
          fill: textColor,
          align: textAlign,
          baseline: 'top' as const,
        });
      }

      // 설명
      if (props.description) {
        shapes.push({
          type: 'text' as const,
          x: size.paddingX,
          y: size.paddingY + (props.title ? (fontSize as unknown as number) + 12 : 0),
          text: props.description,
          fontSize: (fontSize as unknown as number) - 2,
          fontFamily: ff,
          fill: '{color.on-surface-variant}' as TokenRef,
          align: textAlign,
          baseline: 'top' as const,
        });
      }

      // 폼 필드 컨테이너
      const stylePad = props.style?.padding;
      const padding = stylePad != null
        ? (typeof stylePad === 'number' ? stylePad : parseFloat(String(stylePad)) || 0)
        : size.paddingY;
      shapes.push({
        type: 'container' as const,
        x: 0,
        y: 0,
        width: 'auto',
        height: 'auto',
        children: [],
        layout: {
          display: 'flex',
          flexDirection: 'column',
          gap: size.gap,
          padding,
        },
      });

      return shapes;
    },

    react: (props) => ({
      'data-disabled': props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('passive' as const),
    }),
  },
};
