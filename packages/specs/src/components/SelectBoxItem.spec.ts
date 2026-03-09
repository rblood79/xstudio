/**
 * SelectBoxItem Component Spec (자식 컴포넌트)
 *
 * SelectBoxGroup의 개별 카드형 선택 아이템
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * SelectBoxItem Props
 */
export interface SelectBoxItemProps {
  label?: string;
  description?: string;
  value?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * SelectBoxItem Component Spec
 */
export const SelectBoxItemSpec: ComponentSpec<SelectBoxItemProps> = {
  name: "SelectBoxItem",
  description: "카드형 선택 아이템 (라벨 + 설명)",
  element: "div",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.layer-1}" as TokenRef,
      backgroundHover: "{color.neutral-hover}" as TokenRef,
      backgroundPressed: "{color.neutral-pressed}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    selected: {
      background: "{color.layer-1}" as TokenRef,
      backgroundHover: "{color.neutral-hover}" as TokenRef,
      backgroundPressed: "{color.neutral-pressed}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: "auto" as unknown as number,
      paddingX: 12,
      paddingY: 10,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 4,
    },
    md: {
      height: "auto" as unknown as number,
      paddingX: 16,
      paddingY: 12,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 4,
    },
    lg: {
      height: "auto" as unknown as number,
      paddingX: 20,
      paddingY: 16,
      fontSize: "{typography.text-md}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 6,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {},
  },

  render: {
    shapes: (props, variant, size, _state = "default") => {
      const isSelected = props.isSelected ?? false;
      const borderColor = isSelected
        ? ("{color.accent}" as TokenRef)
        : (variant.border ?? ("{color.border}" as TokenRef));
      const bgColor = props.style?.backgroundColor ?? variant.background;
      const textColor = props.style?.color ?? variant.text;

      const rawBr = props.style?.borderRadius ?? size.borderRadius;
      const br =
        typeof rawBr === "number" ? rawBr : resolveToken(rawBr as TokenRef);
      const resolvedBr = typeof br === "number" ? br : 8;

      const rawFs = props.style?.fontSize ?? size.fontSize;
      const resolvedFs =
        typeof rawFs === "number"
          ? rawFs
          : typeof rawFs === "string" && rawFs.startsWith("{")
            ? resolveToken(rawFs as TokenRef)
            : rawFs;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const label = props.label ?? "Option";
      const description = props.description ?? "";

      const shapes: Shape[] = [
        // 카드 배경
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: "auto",
          height: "auto" as unknown as number,
          radius: resolvedBr,
          fill: bgColor,
        },
        // 테두리 (선택 시 accent)
        {
          type: "border" as const,
          target: "bg",
          borderWidth: isSelected ? 2 : 1,
          color: borderColor,
          radius: resolvedBr,
        },
        // 라벨 텍스트
        {
          id: "label",
          type: "text" as const,
          x: size.paddingX,
          y: size.paddingY,
          text: label,
          fontSize,
          fontFamily: ff,
          fontWeight: 600,
          fill: textColor,
        },
      ];

      // 설명 텍스트 (있을 경우)
      if (description) {
        shapes.push({
          id: "description",
          type: "text" as const,
          x: size.paddingX,
          y: size.paddingY + fontSize + (size.gap ?? 4),
          text: description,
          fontSize: fontSize - 2,
          fontFamily: ff,
          fill: "{color.neutral-subdued}" as TokenRef,
        });
      }

      return shapes;
    },

    react: (props) => ({
      role: "option",
      "aria-selected": props.isSelected ?? false,
      "aria-disabled": props.isDisabled ?? false,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: props.isDisabled ? "not-allowed" : "pointer",
    }),
  },
};
