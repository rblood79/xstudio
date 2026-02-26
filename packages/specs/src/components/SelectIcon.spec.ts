/**
 * SelectIcon Component Spec
 *
 * Select 컴포넌트의 쉐브론 드롭다운 아이콘
 * Compositional Architecture: SelectTrigger의 자식 Element로 독립 렌더링
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { resolveToken } from '../renderers/utils/tokenResolver';

export interface SelectIconProps {
  variant?: 'default';
  size?: 'sm' | 'md' | 'lg';
  style?: Record<string, string | number | undefined>;
}

export const SelectIconSpec: ComponentSpec<SelectIconProps> = {
  name: 'SelectIcon',
  description: 'Select 드롭다운 쉐브론 아이콘',
  element: 'span',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      // CSS: --select-accent-container: var(--surface-container-high); --select-on-accent-container: var(--on-surface);
      background: '{color.surface-container-high}' as TokenRef,
      backgroundHover: '{color.surface-container-high}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 14,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      iconSize: 14,
      gap: 0,
    },
    md: {
      height: 18,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      iconSize: 18,
      gap: 0,
    },
    lg: {
      height: 22,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      iconSize: 22,
      gap: 0,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
    },
    focusVisible: {},
  },

  render: {
    shapes: (props, variant, size) => {
      const iconSize = size.iconSize ?? 18;

      const rawFontSize = props.style?.fontSize;
      const resolvedFs = rawFontSize != null
        ? (typeof rawFontSize === 'number'
            ? rawFontSize
            : (typeof rawFontSize === 'string' && rawFontSize.startsWith('{')
                ? resolveToken(rawFontSize as TokenRef)
                : rawFontSize))
        : undefined;
      const effectiveSize = (typeof resolvedFs === 'number' ? resolvedFs : undefined) ?? iconSize;

      // 배경색: 사용자 설정 우선, 'transparent'는 미설정으로 처리
      const userBg = props.style?.backgroundColor;
      const bgColor = (userBg != null && userBg !== 'transparent')
                    ? userBg
                    : variant.background;

      const fill = props.style?.color ?? variant.text;

      const borderRadius = size.borderRadius as unknown as number;

      const shapes: Shape[] = [
        {
          id: 'icon-bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: effectiveSize,
          height: effectiveSize,
          radius: borderRadius,
          fill: bgColor,
        },
        {
          type: 'icon_font' as const,
          iconName: 'chevron-down',
          x: effectiveSize / 2,
          y: effectiveSize / 2,
          fontSize: effectiveSize,
          fill,
          strokeWidth: 2,
        },
      ];

      return shapes;
    },

    react: () => ({}),

    pixi: () => ({
      eventMode: 'none' as const,
    }),
  },
};
