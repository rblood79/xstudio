/**
 * Tag Component Spec
 *
 * TagGroup 내부의 개별 Tag 컴포넌트
 * CSS TagGroup.css .react-aria-Tag 스타일과 1:1 동기화
 *
 * Badge와 다른 점:
 * - 작은 paddingX (8/12/16 vs Badge 12/16/24)
 * - 연한 배경 + border (vs Badge 진한 배경, border 없음)
 * - borderRadius 가변 (sm/md/lg vs Badge radius-md 고정)
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { parsePxValue } from "../primitives";
import { fontFamily } from "../primitives/typography";
import { resolveStateColors } from "../utils/stateEffect";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import { measureSpecTextWidth } from "../renderers/utils/measureText";

/**
 * Tag Props
 */
export interface TagProps {
  children?: string;
  isDisabled?: boolean;
  isSelected?: boolean;
  allowsRemoving?: boolean;
  style?: Record<string, string | number | undefined>;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  /** ElementSprite 주입: 엔진 계산 최종 높이 */
  _containerHeight?: number;
}

/**
 * Tag Component Spec
 */
export const TagSpec: ComponentSpec<TagProps> = {
  name: "Tag",
  description: "TagGroup 내부 개별 태그 컴포넌트",
  archetype: "simple",

  // ADR-083 Phase 11: simple archetype base 의 layout primitive 2 필드 리프팅.
  containerStyles: {
    display: "inline-flex",
    alignItems: "center",
  },
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      // Colors match TagGroup.css .react-aria-Tag --tag-color/--tag-text/--tag-border defaults.
      // TagGroup.css is spec-token-derived (ADR-106-b G2) — this is intentional alignment.
      fill: {
        default: {
          base: "{color.layer-1}" as TokenRef,
          hover: "{color.layer-1}" as TokenRef,
          pressed: "{color.layer-1}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    selected: {
      // Colors match TagGroup.css .react-aria-Tag[data-selected] --tag-color/--tag-text/--tag-border.
      // TagGroup.css is spec-token-derived (ADR-106-b G2) — this is intentional alignment.
      fill: {
        default: {
          base: "{color.accent}" as TokenRef,
          hover: "{color.accent}" as TokenRef,
          pressed: "{color.accent}" as TokenRef,
        },
      },
      text: "{color.on-accent}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
  },

  // Tag sizes mirror ButtonSpec.sizes (padding/fontSize) — intentional chip=button sizing.
  // TagGroup.css line-height mirrors these lineHeight values — spec-token-derived (ADR-106-b G2).
  // lineHeight = fontSize * multiplier (CSS line-height 정합성)
  // height = lineHeight + paddingY*2 + borderWidth(1)*2
  sizes: {
    xs: {
      height: 18,
      paddingX: 4,
      paddingY: 1,
      fontSize: "{typography.text-2xs}" as TokenRef,
      lineHeight: 16, // 10 * 1.6
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 2,
    },
    sm: {
      height: 20,
      paddingX: 8,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      lineHeight: 16, // 12 * 1.333
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 4,
    },
    md: {
      height: 28,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      lineHeight: 20, // 14 * 1.429
      borderRadius: "{radius.md}" as TokenRef,
      gap: 4,
    },
    lg: {
      height: 40,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      lineHeight: 24, // 16 * 1.5
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 6,
    },
    xl: {
      height: 52,
      paddingX: 24,
      paddingY: 12,
      fontSize: "{typography.text-lg}" as TokenRef,
      lineHeight: 28, // 18 * 1.556
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 8,
    },
  },

  states: {
    disabled: {
      opacity: 0.38,
    },
  },

  render: {
    shapes: (props, size, state = "default") => {
      const variant =
        TagSpec.variants![
          (props as { variant?: keyof typeof TagSpec.variants }).variant ??
            TagSpec.defaultVariant!
        ];
      const parseNumericStyleValue = (
        value: string | number | undefined,
        fallback: number,
      ): number => {
        if (typeof value === "number") return value;
        if (typeof value === "string") {
          const parsed = parseFloat(value);
          return Number.isFinite(parsed) ? parsed : fallback;
        }
        return fallback;
      };

      // 선택 상태면 selected variant 사용
      const effectiveVariant = props.isSelected
        ? {
            fill: {
              default: {
                base: "{color.accent}" as TokenRef,
                hover: "{color.accent}" as TokenRef,
                pressed: "{color.accent}" as TokenRef,
              },
            },
            text: "{color.on-accent}" as TokenRef,
            border: "{color.accent}" as TokenRef,
          }
        : variant;

      const borderRadius = (size.borderRadius as unknown as number) || 4;
      const bgColor =
        props.style?.backgroundColor ??
        resolveStateColors(effectiveVariant, state).background;
      const borderColor =
        props.style?.borderColor ??
        effectiveVariant.border ??
        effectiveVariant.text;

      const shapes: Shape[] = [];

      // 배경 roundRect
      shapes.push({
        id: "bg",
        type: "roundRect" as const,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto" as unknown as number,
        radius: borderRadius,
        fill: bgColor,
      });

      // 테두리 (CSS: border: 1px solid)
      shapes.push({
        type: "border" as const,
        target: "bg",
        borderWidth: 1,
        color: borderColor,
        radius: borderRadius,
      });

      // Child Composition: 자식 Element가 있으면 shell만 반환
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      const text = props.children;
      if (text) {
        const fontSize = resolveSpecFontSize(
          props.style?.fontSize ?? size.fontSize,
          14,
        );

        const paddingX = parsePxValue(props.style?.paddingLeft, size.paddingX);
        const paddingRight =
          props.style?.paddingRight != null
            ? parseNumericStyleValue(props.style.paddingRight, size.paddingX)
            : props.allowsRemoving
              ? size.paddingY
              : size.paddingX;
        const containerWidth =
          typeof props._containerWidth === "number" ? props._containerWidth : 0;
        const containerHeight =
          typeof props._containerHeight === "number"
            ? props._containerHeight
            : size.height + 2;

        const textColor = props.style?.color ?? effectiveVariant.text;

        shapes.push({
          type: "text" as const,
          x: paddingX,
          y: 0,
          text,
          fontSize,
          fontFamily: fontFamily.sans,
          fontWeight: 400,
          fill: textColor,
          align: "left" as const,
          baseline: "middle" as const,
        });

        // Remove 버튼 (X 아이콘) — allowsRemoving 시 텍스트 오른쪽에 표시
        if (props.allowsRemoving) {
          const iconSize = Math.round(fontSize * 0.75);
          const removeButtonGap = 2; // CSS .tag-remove-btn margin-left
          const removeX =
            paddingX +
            measureSpecTextWidth(text, fontSize, fontFamily.sans) +
            removeButtonGap;
          const removePad = 2; // --spacing-2xs
          // containerHeight = size.height + border(1)*2 → 정중앙 보정
          const borderWidth = 1;
          const centerY = containerHeight / 2;

          const cs = iconSize / 4;
          const cx =
            containerWidth > 0
              ? containerWidth -
                borderWidth -
                paddingRight -
                removePad -
                iconSize / 2
              : removeX + removePad + iconSize / 2;

          // X 마크 (두 대각선)
          shapes.push({
            type: "line" as const,
            x1: cx - cs,
            y1: centerY - cs,
            x2: cx + cs,
            y2: centerY + cs,
            stroke: textColor,
            strokeWidth: 1.5,
          });
          shapes.push({
            type: "line" as const,
            x1: cx + cs,
            y1: centerY - cs,
            x2: cx - cs,
            y2: centerY + cs,
            stroke: textColor,
            strokeWidth: 1.5,
          });
        }
      }

      return shapes;
    },

    react: (props) => ({
      "data-selected": props.isSelected || undefined,
      "data-disabled": props.isDisabled || undefined,
    }),

    pixi: () => ({
      eventMode: "static" as const,
    }),
  },
};
