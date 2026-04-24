/**
 * FileTrigger Component Spec
 *
 * React Aria 기반 파일 트리거 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { parsePxValue, parseBorderWidth } from "../primitives";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
// ADR-908 Phase 3-A-2: Fill token dual-read seam
import { resolveFillTokens } from "../utils/fillTokens";
import { FileCheck, ToggleLeft, Folder, Camera } from "lucide-react";

/**
 * FileTrigger Props
 */
export interface FileTriggerProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  children?: string;
  text?: string;
  label?: string;
  acceptedFileTypes?: string[];
  allowsMultiple?: boolean;
  acceptDirectory?: boolean;
  defaultCamera?: "user" | "environment";
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * FileTrigger Component Spec
 */
export const FileTriggerSpec: ComponentSpec<FileTriggerProps> = {
  name: "FileTrigger",
  description: "React Aria 기반 파일 선택 트리거 컴포넌트",
  element: "button",
  archetype: "button",

  // ADR-083 Phase 8: button archetype base 의 layout primitive 4 필드 리프팅.
  containerStyles: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
  },

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.layer-1}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    accent: {
      background: "{color.accent}" as TokenRef,
      backgroundHover: "{color.accent-hover}" as TokenRef,
      backgroundPressed: "{color.accent-pressed}" as TokenRef,
      text: "{color.on-accent}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 32,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      iconSize: 14,
      gap: 6,
    },
    md: {
      height: 40,
      paddingX: 24,
      paddingY: 8,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      iconSize: 16,
      gap: 8,
    },
    lg: {
      height: 48,
      paddingX: 32,
      paddingY: 12,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      iconSize: 20,
      gap: 10,
    },
  },

  states: {
    hover: {},
    pressed: {
      boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
    },
    disabled: {
      opacity: 0.38,
      cursor: "not-allowed",
      pointerEvents: "none",
    },
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  composition: {
    containerStyles: {
      display: "inline-block",
    },
    staticSelectors: {
      "input[type='file']": {
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        "white-space": "nowrap",
        border: "0",
      },
    },
    delegation: [],
  },

  render: {
    shapes: (props, size, state = "default") => {
      const variant =
        FileTriggerSpec.variants![
          (props as { variant?: keyof typeof FileTriggerSpec.variants })
            .variant ?? FileTriggerSpec.defaultVariant!
        ];
      // ADR-908 Phase 3-A-2: fill token dual-read seam
      const fill = resolveFillTokens(variant);
      // 사용자 스타일 우선, 없으면 spec 기본값
      const borderRadius = parsePxValue(
        props.style?.borderRadius,
        size.borderRadius,
      );
      const borderWidth = parseBorderWidth(props.style?.borderWidth, 1);

      // 상태에 따른 배경색 선택 (사용자 스타일 우선)
      const bgColor =
        props.style?.backgroundColor ??
        (state === "hover"
          ? (fill.default.hover ?? fill.default.base)
          : state === "pressed"
            ? (fill.default.pressed ?? fill.default.base)
            : fill.default.base);

      // 상태에 따른 테두리색 선택 (사용자 스타일 우선)
      const borderColor =
        props.style?.borderColor ??
        (variant.border || ("{color.border}" as TokenRef));

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
        // 테두리
        {
          type: "border" as const,
          target: "bg",
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        },
      ];

      // Child Composition: 자식 Element가 있으면 bg + border만 반환 (text 스킵)
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 텍스트
      const text = props.children || props.text || props.label || "Choose file";

      // 사용자 스타일 padding 우선, 없으면 spec 기본값
      const paddingX = parsePxValue(
        props.style?.paddingLeft ??
          props.style?.paddingRight ??
          props.style?.padding,
        size.paddingX,
      );

      // 사용자 스타일 font 속성 우선, 없으면 spec 기본값
      const fontSize = resolveSpecFontSize(
        props.style?.fontSize ?? size.fontSize,
        16,
      );
      const fwRaw = props.style?.fontWeight;
      const fw =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 500
          : 500;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textAlign =
        (props.style?.textAlign as "left" | "center" | "right") || "center";
      const textColor = props.style?.color ?? variant.text;

      shapes.push({
        type: "text" as const,
        x: paddingX,
        y: 0,
        text,
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
      "data-loading": undefined,
      "aria-disabled": props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "pointer",
    }),
  },

  properties: {
    sections: [
      {
        title: "File Selection",
        fields: [
          {
            key: "acceptedFileTypes",
            type: "string",
            label: "Accepted File Types",
            icon: FileCheck,
            placeholder: "image/*, .pdf, .docx",
          },
          {
            key: "allowsMultiple",
            type: "boolean",
            label: "Allow Multiple",
            icon: ToggleLeft,
          },
          {
            key: "acceptDirectory",
            type: "boolean",
            label: "Accept Directory",
            icon: Folder,
          },
        ],
      },
      {
        title: "Camera (Mobile)",
        fields: [
          {
            key: "defaultCamera",
            type: "enum",
            label: "Default Camera",
            icon: Camera,
            emptyToUndefined: true,
            options: [
              { value: "", label: "None" },
              { value: "user", label: "User" },
              { value: "environment", label: "Environment" },
            ],
          },
        ],
      },
    ],
  },
};
