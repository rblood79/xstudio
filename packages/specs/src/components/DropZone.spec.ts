/**
 * DropZone Component Spec
 *
 * React Aria 기반 드롭 존 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import {
  Tag,
  Parentheses,
  PointerOff,
  CheckSquare,
  MessageSquare,
} from "lucide-react";

/**
 * DropZone Props
 */
export interface DropZoneProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  label?: string;
  isDropTarget?: boolean;
  isFilled?: boolean;
  replaceMessage?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * DropZone Component Spec
 */
export const DropZoneSpec: ComponentSpec<DropZoneProps> = {
  name: "DropZone",
  description: "React Aria 기반 파일 드롭 존 컴포넌트",
  element: "div",
  archetype: "simple",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral-subdued}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    accent: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.accent-subtle}" as TokenRef,
      backgroundPressed: "{color.accent-subtle}" as TokenRef,
      text: "{color.accent}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 80,
      paddingX: 16,
      paddingY: 16,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      iconSize: 24,
      gap: 8,
    },
    md: {
      height: 120,
      paddingX: 24,
      paddingY: 24,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      iconSize: 32,
      gap: 12,
    },
    lg: {
      height: 160,
      paddingX: 32,
      paddingY: 32,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      iconSize: 40,
      gap: 16,
    },
  },

  states: {
    hover: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    shapes: (props, variant, size, state = "default") => {
      const label = props.label || "Drop files here";
      const isActive = props.isDropTarget || state === "hover";

      // 사용자 스타일 우선, 없으면 spec 기본값
      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : size.borderRadius;

      const styleBw = props.style?.borderWidth;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : 2;

      const bgColor =
        props.style?.backgroundColor ??
        (isActive ? variant.backgroundHover : variant.background);
      const borderColor =
        props.style?.borderColor ??
        (isActive
          ? ("{color.accent}" as TokenRef)
          : variant.border || ("{color.border}" as TokenRef));

      // 사용자 스타일 padding 우선, 없으면 spec 기본값
      const stylePx =
        props.style?.paddingLeft ??
        props.style?.paddingRight ??
        props.style?.padding;
      const paddingX =
        stylePx != null
          ? typeof stylePx === "number"
            ? stylePx
            : parseFloat(String(stylePx)) || 0
          : size.paddingX;

      // 사용자 스타일 font 속성 우선, 없으면 spec 기본값
      const fontSize = resolveSpecFontSize(props.style?.fontSize ?? size.fontSize, 16);
      const fwRaw = props.style?.fontWeight;
      const fw =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 400
          : 400;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textAlign =
        (props.style?.textAlign as "left" | "center" | "right") || "center";
      const textColor =
        props.style?.color ??
        (isActive ? ("{color.accent}" as TokenRef) : variant.text);

      const shapes: Shape[] = [
        // 배경
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: "auto",
          height: "auto" as unknown as number,
          radius: borderRadius as unknown as number,
          fill: bgColor,
        },
        // 점선 테두리
        {
          type: "border" as const,
          target: "bg",
          borderWidth,
          color: borderColor,
          style: "dashed",
          radius: borderRadius as unknown as number,
        },
      ];

      // Child Composition: 자식 Element가 있으면 bg + border만 반환 (text 스킵)
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 라벨 텍스트
      shapes.push({
        type: "text" as const,
        x: paddingX,
        y: 0,
        text: label,
        fontSize: fontSize,
        fontFamily: ff,
        fontWeight: fw,
        fill: textColor,
        align: textAlign,
        baseline: "middle" as const,
      });

      return shapes;
    },

    react: (props) => ({
      role: "button",
      "data-drop-target": props.isDropTarget || undefined,
    }),

    pixi: () => ({
      eventMode: "static" as const,
      cursor: "pointer",
    }),
  },

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "label",
            type: "string",
            label: "Label",
            placeholder: "Drop files here",
            icon: Tag,
          },
        ],
      },
      {
        title: "Appearance",
        fields: [{ type: "variant", icon: Parentheses }, { type: "size" }],
      },
      {
        title: "State",
        fields: [
          {
            key: "isFilled",
            type: "boolean",
            label: "Filled",
            icon: CheckSquare,
          },
          {
            key: "replaceMessage",
            type: "string",
            label: "Replace Message",
            icon: MessageSquare,
            emptyToUndefined: true,
          },
          { key: "isDisabled", type: "boolean", icon: PointerOff },
        ],
      },
    ],
  },
};
