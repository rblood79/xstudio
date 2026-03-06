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
import { fontFamily } from "../primitives/typography";
import { resolveStateColors } from "../utils/stateEffect";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * Tag Props
 */
export interface TagProps {
  children?: string;
  isDisabled?: boolean;
  isSelected?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * Tag Component Spec
 */
export const TagSpec: ComponentSpec<TagProps> = {
  name: "Tag",
  description: "TagGroup 내부 개별 태그 컴포넌트",
  element: "div",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      // @sync TagGroup.css .react-aria-Tag 기본 색상
      background: "{color.layer-1}" as TokenRef, // --overlay-background
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef, // --text-color
      border: "{color.border}" as TokenRef, // --border-color
    },
    selected: {
      // @sync TagGroup.css .react-aria-Tag[data-selected]
      background: "{color.accent}" as TokenRef, // --highlight-background
      backgroundHover: "{color.accent}" as TokenRef,
      backgroundPressed: "{color.accent}" as TokenRef,
      text: "{color.on-accent}" as TokenRef, // --highlight-foreground
      border: "{color.accent}" as TokenRef, // --highlight-background
    },
  },

  // @sync Button.css/BUTTON_SIZE_CONFIG — padding/fontSize 동일
  sizes: {
    xs: {
      height: 18,
      paddingX: 8,
      paddingY: 1,
      fontSize: "{typography.text-2xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 2,
    },
    sm: {
      height: 20,
      paddingX: 12,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 4,
    },
    md: {
      height: 28,
      paddingX: 16,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 4,
    },
    lg: {
      height: 40,
      paddingX: 24,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 6,
    },
    xl: {
      height: 52,
      paddingX: 32,
      paddingY: 12,
      fontSize: "{typography.text-lg}" as TokenRef,
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
    shapes: (props, variant, size, state = "default") => {
      // 선택 상태면 selected variant 사용
      const effectiveVariant = props.isSelected
        ? {
            background: "{color.accent}" as TokenRef,
            backgroundHover: "{color.accent}" as TokenRef,
            backgroundPressed: "{color.accent}" as TokenRef,
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
        const rawFontSize = props.style?.fontSize ?? size.fontSize;
        const resolvedFs =
          typeof rawFontSize === "number"
            ? rawFontSize
            : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
              ? resolveToken(rawFontSize as TokenRef)
              : rawFontSize;
        const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;

        const paddingX =
          props.style?.paddingLeft != null
            ? typeof props.style.paddingLeft === "number"
              ? props.style.paddingLeft
              : parseFloat(String(props.style.paddingLeft)) || 0
            : size.paddingX;

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
