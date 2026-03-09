/**
 * SegmentedControlItem Component Spec (자식 컴포넌트)
 *
 * SegmentedControl의 개별 세그먼트 아이템
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * SegmentedControlItem Props
 */
export interface SegmentedControlItemProps {
  id?: string;
  children?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  style?: Record<string, string | number | undefined>;
}

/**
 * SegmentedControlItem Component Spec
 */
export const SegmentedControlItemSpec: ComponentSpec<SegmentedControlItemProps> =
  {
    name: "SegmentedControlItem",
    description: "세그먼트 전환 버튼의 개별 아이템",
    element: "button",

    defaultVariant: "default",
    defaultSize: "md",

    variants: {
      default: {
        background: "{color.transparent}" as TokenRef,
        backgroundHover: "{color.neutral-subtle}" as TokenRef,
        backgroundPressed: "{color.neutral-subtle}" as TokenRef,
        text: "{color.neutral}" as TokenRef,
      },
      selected: {
        background: "{color.elevated}" as TokenRef,
        backgroundHover: "{color.elevated}" as TokenRef,
        backgroundPressed: "{color.elevated}" as TokenRef,
        text: "{color.neutral}" as TokenRef,
      },
    },

    sizes: {
      xs: {
        height: 20,
        paddingX: 8,
        paddingY: 0,
        fontSize: "{typography.text-xs}" as TokenRef,
        borderRadius: "{radius.md}" as TokenRef,
        gap: 0,
      },
      sm: {
        height: 24,
        paddingX: 10,
        paddingY: 0,
        fontSize: "{typography.text-xs}" as TokenRef,
        borderRadius: "{radius.md}" as TokenRef,
        gap: 0,
      },
      md: {
        height: 26,
        paddingX: 12,
        paddingY: 0,
        fontSize: "{typography.text-sm}" as TokenRef,
        borderRadius: "{radius.lg}" as TokenRef,
        gap: 0,
      },
      lg: {
        height: 32,
        paddingX: 16,
        paddingY: 0,
        fontSize: "{typography.text-md}" as TokenRef,
        borderRadius: "{radius.lg}" as TokenRef,
        gap: 0,
      },
      xl: {
        height: 40,
        paddingX: 20,
        paddingY: 0,
        fontSize: "{typography.text-lg}" as TokenRef,
        borderRadius: "{radius.xl}" as TokenRef,
        gap: 0,
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
        const activeVariant = isSelected
          ? { ...variant, background: "{color.elevated}" as TokenRef }
          : variant;

        const bgColor =
          props.style?.backgroundColor ?? activeVariant.background;
        const textColor = props.style?.color ?? activeVariant.text;

        const rawBr = props.style?.borderRadius ?? size.borderRadius;
        const br =
          typeof rawBr === "number" ? rawBr : resolveToken(rawBr as TokenRef);
        const resolvedBr = typeof br === "number" ? br : 6;

        const rawFs = props.style?.fontSize ?? size.fontSize;
        const resolvedFs =
          typeof rawFs === "number"
            ? rawFs
            : typeof rawFs === "string" && rawFs.startsWith("{")
              ? resolveToken(rawFs as TokenRef)
              : rawFs;
        const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;
        const ff = (props.style?.fontFamily as string) || fontFamily.sans;

        const label = props.children ?? "Segment";

        const shapes: Shape[] = [
          // 세그먼트 배경 (selected 시 elevated 배경)
          {
            id: "bg",
            type: "roundRect" as const,
            x: 0,
            y: 0,
            width: "auto",
            height: size.height,
            radius: resolvedBr,
            fill: bgColor,
          },
          // 라벨 텍스트
          {
            id: "label",
            type: "text" as const,
            x: size.paddingX,
            y: size.height / 2,
            text: label,
            fontSize,
            fontFamily: ff,
            fontWeight: isSelected ? 600 : 400,
            fill: textColor,
            baseline: "middle" as const,
          },
        ];

        // 선택 상태 그림자 (미세한 elevation 효과)
        if (isSelected) {
          shapes.push({
            type: "shadow" as const,
            target: "bg",
            offsetX: 0,
            offsetY: 1,
            blur: 3,
            spread: 0,
            color: "{color.black}" as TokenRef,
            alpha: 0.1,
          });
        }

        return shapes;
      },

      react: (props) => ({
        role: "radio",
        "aria-checked": props.isSelected ?? false,
        "aria-disabled": props.isDisabled ?? false,
      }),

      pixi: (props) => ({
        eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
        cursor: props.isDisabled ? "not-allowed" : "pointer",
      }),
    },
  };
