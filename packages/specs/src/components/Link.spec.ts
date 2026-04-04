/**
 * Link Component Spec
 *
 * React Aria 기반 링크 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";
import {
  Type,
  Link as LinkIcon,
  Parentheses,
  ExternalLink,
  Eye,
  PointerOff,
  FileText,
} from "lucide-react";

/**
 * Link Props
 */
export interface LinkProps {
  variant?: "primary" | "secondary";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  children?: string;
  text?: string;
  href?: string;
  target?: "_self" | "_blank" | "_parent" | "_top";
  rel?: string;
  isQuiet?: boolean;
  staticColor?: "auto" | "black" | "white";
  isExternal?: boolean;
  showExternalIcon?: boolean;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * Link Component Spec
 *
 * height: 0 = auto (인라인 요소)
 * backgroundAlpha: 0 (배경 없음)
 */
export const LinkSpec: ComponentSpec<LinkProps> = {
  name: "Link",
  description: "React Aria 기반 링크 컴포넌트",
  archetype: "button",
  element: "a",

  defaultVariant: "primary",
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
            placeholder: "Link text",
            icon: Type,
          },
          {
            key: "href",
            type: "string",
            label: "Href",
            placeholder: "https://example.com",
            emptyToUndefined: true,
            icon: LinkIcon,
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
              { value: "xs", label: "XS" },
              { value: "sm", label: "S" },
              { value: "md", label: "M" },
              { value: "lg", label: "L" },
              { value: "xl", label: "XL" },
            ],
          },
          {
            key: "staticColor",
            type: "enum",
            label: "Static Color",
            icon: Parentheses,
            options: [
              { value: "auto", label: "Auto" },
              { value: "white", label: "White" },
              { value: "black", label: "Black" },
            ],
           defaultValue: "auto" },
        ],
      },
      {
        title: "State",
        fields: [
          {
            key: "target",
            type: "enum",
            label: "Target",
            icon: LinkIcon,
            emptyToUndefined: true,
            options: [
              { value: "", label: "None" },
              { value: "_self", label: "Same Window" },
              { value: "_blank", label: "New Window" },
              { value: "_parent", label: "Parent Frame" },
              { value: "_top", label: "Top Frame" },
            ],
          },
          {
            key: "rel",
            type: "string",
            label: "Rel",
            placeholder: "noopener noreferrer",
            emptyToUndefined: true,
            icon: FileText,
          },
          {
            key: "isQuiet",
            type: "boolean",
            label: "Quiet",
            icon: Parentheses,
          },
          {
            key: "isExternal",
            type: "boolean",
            label: "External Link",
            icon: ExternalLink,
          },
          {
            key: "showExternalIcon",
            type: "boolean",
            label: "Show External Icon",
            icon: Eye,
           defaultValue: true },
          {
            key: "isDisabled",
            type: "boolean",
            label: "Disabled",
            icon: PointerOff,
          },
        ],
      },
    ],
  },

  variants: {
    primary: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      backgroundAlpha: 0,
      text: "{color.accent}" as TokenRef,
      textHover: "{color.accent-hover}" as TokenRef,
    },
    secondary: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      backgroundAlpha: 0,
      text: "{color.neutral}" as TokenRef,
      textHover: "{color.accent}" as TokenRef,
    },
  },

  sizes: {
    xs: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-2xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
    xl: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
  },

  states: {
    hover: {
      // textHover는 variants에서 처리
    },
    disabled: {
      opacity: 0.38,
      cursor: "not-allowed",
      pointerEvents: "none",
    },
    focusVisible: {
      outline: "2px solid var(--accent)",
      outlineOffset: "2px",
    },
  },

  render: {
    shapes: (props, variant, size, state = "default") => {
      const text = props.children || props.text || "";

      // 상태에 따른 텍스트색 선택 (사용자 스타일 우선)
      const staticTextColor =
        props.staticColor === "black"
          ? "#000000"
          : props.staticColor === "white"
            ? "#ffffff"
            : undefined;
      const textColor =
        props.style?.color ??
        staticTextColor ??
        (state === "hover" && variant.textHover
          ? variant.textHover
          : variant.text);

      const shapes: Shape[] = [];

      if (text) {
        // 사용자 스타일 font 속성 우선, 없으면 spec 기본값
        const rawFontSize = props.style?.fontSize ?? size.fontSize;
        const resolvedFs =
          typeof rawFontSize === "number"
            ? rawFontSize
            : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
              ? resolveToken(rawFontSize as TokenRef)
              : rawFontSize;
        const fontSize = typeof resolvedFs === "number" ? resolvedFs : 16;
        const fwRaw = props.style?.fontWeight;
        const fw =
          fwRaw != null
            ? typeof fwRaw === "number"
              ? fwRaw
              : parseInt(String(fwRaw), 10) || 500
            : 500;
        const ff = (props.style?.fontFamily as string) || fontFamily.sans;
        const textAlign =
          (props.style?.textAlign as "left" | "center" | "right") || "left";

        shapes.push({
          type: "text" as const,
          x: size.paddingX,
          y: 0,
          text,
          fontSize,
          fontFamily: ff,
          fontWeight: fw,
          fill: textColor,
          align: textAlign,
          baseline: "top" as const,
          textDecoration: "underline",
        });
      }

      return shapes;
    },

    react: (props) => ({
      "data-external": props.isExternal || undefined,
      "data-quiet": props.isQuiet || undefined,
      "data-static-color": props.staticColor,
      target: props.isExternal ? "_blank" : props.target,
      rel: props.isExternal ? "noopener noreferrer" : props.rel,
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "pointer",
    }),
  },
};
