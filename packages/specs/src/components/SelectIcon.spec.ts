/**
 * SelectIcon Component Spec
 *
 * Select 컴포넌트의 쉐브론 드롭다운 아이콘
 * Compositional Architecture: SelectTrigger의 자식 Element로 독립 렌더링
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
// ADR-908 Phase 3-A-2: Fill token dual-read seam
import { resolveFillTokens } from "../utils/fillTokens";

export interface SelectIconProps {
  variant?: "default";
  size?: "sm" | "md" | "lg";
  iconName?: string;
  style?: Record<string, string | number | undefined>;
}

export const SelectIconSpec: ComponentSpec<SelectIconProps> = {
  name: "SelectIcon",
  description: "Select 드롭다운 쉐브론 아이콘",
  element: "span",
  archetype: "simple",

  // ADR-083 Phase 11: simple archetype base 의 layout primitive 2 필드 리프팅.
  containerStyles: {
    display: "inline-flex",
    alignItems: "center",
  },

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-2}" as TokenRef,
      text: "{color.neutral-subdued}" as TokenRef,
    },
  },

  // FIELD_FAMILY_SIZES.iconSize (primitives/fieldSizes.ts) 와 동일 metric. (ADR-105-b)
  sizes: {
    xs: {
      height: 10,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-2xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      iconSize: 10,
      gap: 0,
    },
    sm: {
      height: 14,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      iconSize: 14,
      gap: 0,
    },
    md: {
      height: 18,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      iconSize: 18,
      gap: 0,
    },
    lg: {
      height: 22,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      iconSize: 22,
      gap: 0,
    },
    xl: {
      height: 28,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xl}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      iconSize: 28,
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
    shapes: (props, size) => {
      const variant =
        SelectIconSpec.variants![
          (props as { variant?: keyof typeof SelectIconSpec.variants })
            .variant ?? SelectIconSpec.defaultVariant!
        ];
      const iconSize = size.iconSize ?? 18;

      const effectiveSize =
        props.style?.fontSize != null
          ? resolveSpecFontSize(props.style.fontSize, iconSize)
          : iconSize;

      // 배경색: 사용자 설정 우선, 'transparent'는 미설정으로 처리
      const fill = resolveFillTokens(variant);
      const userBg = props.style?.backgroundColor;
      const bgColor =
        userBg != null && userBg !== "transparent" ? userBg : fill.default.base;

      const fill = props.style?.color ?? variant.text;

      const borderRadius = size.borderRadius as unknown as number;

      const shapes: Shape[] = [
        {
          id: "icon-bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: effectiveSize,
          height: effectiveSize,
          radius: borderRadius,
          fill: bgColor,
        },
        {
          type: "icon_font" as const,
          iconName: props.iconName ?? "chevron-down",
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
      eventMode: "none" as const,
    }),
  },
};
