/**
 * StatusLight Component Spec
 *
 * 상태 표시 라이트 컴포넌트 (Spectrum 2 StatusLight)
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
// ADR-908 Phase 3-A-2: Fill token dual-read seam
import { resolveFillTokens } from "../utils/fillTokens";
import { Type, Parentheses } from "lucide-react";

/**
 * StatusLight Props
 */
export interface StatusLightProps {
  variant?:
    | "neutral"
    | "informative"
    | "positive"
    | "notice"
    | "negative"
    | "celery"
    | "chartreuse"
    | "cyan"
    | "fuchsia"
    | "indigo"
    | "magenta"
    | "purple"
    | "yellow"
    | "seafoam"
    | "pink"
    | "turquoise"
    | "cinnamon"
    | "brown"
    | "silver";
  size?: "sm" | "md" | "lg" | "xl";
  children?: string;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** StatusLight size dimensions (layout engine 공유) */
export const STATUSLIGHT_DIMENSIONS: Record<
  string,
  { height: number; dotSize: number; gap: number; fontSize: number }
> = {
  sm: { height: 20, dotSize: 8, gap: 8, fontSize: 12 },
  md: { height: 24, dotSize: 10, gap: 8, fontSize: 14 },
  lg: { height: 28, dotSize: 12, gap: 8, fontSize: 16 },
  xl: { height: 32, dotSize: 14, gap: 8, fontSize: 18 },
};

/**
 * StatusLight Component Spec
 */
export const StatusLightSpec: ComponentSpec<StatusLightProps> = {
  name: "StatusLight",
  description: "상태 표시 라이트 컴포넌트",
  element: "div",
  archetype: "simple",

  // ADR-083 Phase 11: simple archetype base 의 layout primitive 2 필드 리프팅.
  containerStyles: {
    display: "inline-flex",
    alignItems: "center",
  },

  defaultVariant: "neutral",
  defaultSize: "md",

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "children",
            type: "string",
            label: "Text",
            placeholder: "Status text",
            icon: Type,
          },
        ],
      },
      {
        title: "Appearance",
        fields: [
          {
            type: "variant",
            label: "Variant",
            icon: Parentheses,
          },
          {
            type: "size",
            label: "Size",
            options: [
              { value: "sm", label: "S" },
              { value: "md", label: "M" },
              { value: "lg", label: "L" },
              { value: "xl", label: "XL" },
            ],
          },
          {
            key: "isDisabled",
            type: "boolean",
            label: "Disabled",
            icon: Parentheses,
          },
        ],
      },
      {
        title: "State",
        fields: [],
      },
    ],
  },

  variants: {
    neutral: {
      fill: {
        default: {
          base: "{color.neutral-subdued}" as TokenRef,
          hover: "{color.neutral-subdued}" as TokenRef,
          pressed: "{color.neutral-subdued}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    informative: {
      fill: {
        default: {
          base: "{color.informative}" as TokenRef,
          hover: "{color.informative}" as TokenRef,
          pressed: "{color.informative}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    positive: {
      fill: {
        default: {
          base: "{color.positive}" as TokenRef,
          hover: "{color.positive}" as TokenRef,
          pressed: "{color.positive}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    notice: {
      fill: {
        default: {
          base: "{color.notice}" as TokenRef,
          hover: "{color.notice}" as TokenRef,
          pressed: "{color.notice}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    negative: {
      fill: {
        default: {
          base: "{color.negative}" as TokenRef,
          hover: "{color.negative}" as TokenRef,
          pressed: "{color.negative}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    celery: {
      fill: {
        default: {
          base: "{color.celery}" as TokenRef,
          hover: "{color.celery}" as TokenRef,
          pressed: "{color.celery}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    chartreuse: {
      fill: {
        default: {
          base: "{color.chartreuse}" as TokenRef,
          hover: "{color.chartreuse}" as TokenRef,
          pressed: "{color.chartreuse}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    cyan: {
      fill: {
        default: {
          base: "{color.cyan}" as TokenRef,
          hover: "{color.cyan}" as TokenRef,
          pressed: "{color.cyan}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    fuchsia: {
      fill: {
        default: {
          base: "{color.fuchsia}" as TokenRef,
          hover: "{color.fuchsia}" as TokenRef,
          pressed: "{color.fuchsia}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    indigo: {
      fill: {
        default: {
          base: "{color.indigo}" as TokenRef,
          hover: "{color.indigo}" as TokenRef,
          pressed: "{color.indigo}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    magenta: {
      fill: {
        default: {
          base: "{color.magenta}" as TokenRef,
          hover: "{color.magenta}" as TokenRef,
          pressed: "{color.magenta}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    purple: {
      fill: {
        default: {
          base: "{color.purple}" as TokenRef,
          hover: "{color.purple}" as TokenRef,
          pressed: "{color.purple}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    yellow: {
      fill: {
        default: {
          base: "{color.yellow}" as TokenRef,
          hover: "{color.yellow}" as TokenRef,
          pressed: "{color.yellow}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    seafoam: {
      fill: {
        default: {
          base: "{color.seafoam}" as TokenRef,
          hover: "{color.seafoam}" as TokenRef,
          pressed: "{color.seafoam}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    pink: {
      fill: {
        default: {
          base: "{color.pink}" as TokenRef,
          hover: "{color.pink}" as TokenRef,
          pressed: "{color.pink}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    turquoise: {
      fill: {
        default: {
          base: "{color.turquoise}" as TokenRef,
          hover: "{color.turquoise}" as TokenRef,
          pressed: "{color.turquoise}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    cinnamon: {
      fill: {
        default: {
          base: "{color.cinnamon}" as TokenRef,
          hover: "{color.cinnamon}" as TokenRef,
          pressed: "{color.cinnamon}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    brown: {
      fill: {
        default: {
          base: "{color.brown}" as TokenRef,
          hover: "{color.brown}" as TokenRef,
          pressed: "{color.brown}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    silver: {
      fill: {
        default: {
          base: "{color.silver}" as TokenRef,
          hover: "{color.silver}" as TokenRef,
          pressed: "{color.silver}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 20,
      dotSize: 8,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 8,
    },
    md: {
      height: 24,
      dotSize: 10,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 8,
    },
    lg: {
      height: 28,
      dotSize: 12,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 8,
    },
    xl: {
      height: 32,
      dotSize: 14,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 8,
    },
  },

  states: {
    disabled: {
      opacity: 0.38,
    },
  },

  render: {
    shapes: (props, size, _state = "default") => {
      const variant =
        StatusLightSpec.variants![
          (props as { variant?: keyof typeof StatusLightSpec.variants })
            .variant ?? StatusLightSpec.defaultVariant!
        ];
      const dotSize = size.dotSize ?? 10;
      const dotRadius = dotSize / 2;
      const gap = size.gap ?? 8;
      const h = size.height ?? 24;
      const centerY = h / 2;

      const fill = resolveFillTokens(variant);
      const dotColor = props.style?.backgroundColor ?? fill.default.base;
      const textColor = props.style?.color ?? variant.text;

      const shapes: Shape[] = [
        // 상태 표시 dot (수직 중앙 정렬)
        {
          id: "dot",
          type: "circle" as const,
          x: dotRadius,
          y: centerY,
          radius: dotRadius,
          fill: dotColor,
        },
      ];

      // Child Composition: 자식 Element가 있으면 shell만 반환
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 라벨 텍스트
      const text = props.children;
      if (text) {
        const fontSize = resolveSpecFontSize(
          props.style?.fontSize ?? size.fontSize,
          14,
        );
        const fwRaw = props.style?.fontWeight;
        const fw =
          fwRaw != null
            ? typeof fwRaw === "number"
              ? fwRaw
              : parseInt(String(fwRaw), 10) || 400
            : 400;
        const ff = (props.style?.fontFamily as string) || fontFamily.sans;

        shapes.push({
          type: "text" as const,
          x: dotSize + gap,
          y: centerY,
          text,
          fontSize,
          fontFamily: ff,
          fontWeight: fw,
          fill: textColor,
          align: "left" as const,
          baseline: "middle" as const,
        });
      }

      return shapes;
    },

    react: () => ({}),

    pixi: () => ({
      eventMode: "none" as const,
    }),
  },
};
