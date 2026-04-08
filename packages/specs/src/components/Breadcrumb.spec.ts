/**
 * Breadcrumb (아이템) Spec
 *
 * Skia: 각 크럼 + 비-마지막이면 구분자(›)를 이 셀 안에서 그린다.
 * 부모 Breadcrumbs는 컨테이너만 담당(render.shapes 빈 배열).
 * 마지막 항목: buildSpecNodeData가 disabled state를 쓰지 않음 — Preview CSS(마지막은 opacity·비활성 톤 미적용)와 동일.
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";
import { measureSpecTextWidth } from "../renderers/utils/measureText";
import { breadcrumbSeparatorAfterPaddingXPx } from "../primitives/spacing";
import { Type, PointerOff } from "lucide-react";

export interface BreadcrumbItemProps {
  children?: string;
  label?: string;
  title?: string;
  href?: string;
  /** 부모 `Breadcrumbs`의 size 위임 — buildSpecNodeData / Skia 패딩 정합 */
  size?: string;
  /** buildSpecNodeData에서 부모 Breadcrumbs 기준 주입 */
  _isLast?: boolean;
  _separator?: string;
  style?: Record<string, string | number | undefined>;
}

export const BreadcrumbSpec: ComponentSpec<BreadcrumbItemProps> = {
  name: "Breadcrumb",
  description: "Breadcrumbs 내 단일 경로 조각 (Skia는 자식 단위 렌더)",
  archetype: "simple",
  element: "li",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "M",

  variants: {
    default: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      text: "{color.neutral-subdued}" as TokenRef,
      textHover: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    S: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
    M: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
    L: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
  },

  states: {
    hover: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {
      outline: "2px solid var(--accent)",
      outlineOffset: "2px",
    },
  },

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "children",
            type: "string",
            label: "Text",
            placeholder: "Breadcrumb",
            icon: Type,
          },
          {
            key: "href",
            type: "string",
            label: "Href",
            placeholder: "/",
            emptyToUndefined: true,
            icon: Type,
          },
        ],
      },
      {
        title: "State",
        fields: [{ key: "isDisabled", type: "boolean", icon: PointerOff }],
      },
    ],
  },

  render: {
    shapes: (props, _variant, size, state = "default") => {
      const ff = fontFamily.sans;
      const text = String(
        props.children ?? props.label ?? props.title ?? "",
      ).trim();
      const isLast = Boolean(props._isLast);
      const separator = String(props._separator ?? "›");

      const resolvedFontSize =
        typeof size.fontSize === "number"
          ? size.fontSize
          : ((resolveToken(size.fontSize as TokenRef) as number) ?? 16);
      const afterPadX = breadcrumbSeparatorAfterPaddingXPx(
        String(props.size ?? "M"),
      );
      const height = size.height || 24;
      const sepMeasuredWidth = measureSpecTextWidth(
        separator,
        resolvedFontSize,
        ff,
        400,
      );

      const shapes: Shape[] = [];
      let x = 0;

      const labelFw = isLast ? 600 : 400;
      const disabled = state === "disabled";
      const labelFill: TokenRef | string = disabled
        ? ("{color.neutral-subdued}" as TokenRef)
        : isLast
          ? ("{color.accent}" as TokenRef)
          : ("{color.neutral-subdued}" as TokenRef);

      if (text) {
        const estW = measureSpecTextWidth(text, resolvedFontSize, ff, labelFw);
        shapes.push({
          type: "text" as const,
          x,
          y: height / 2,
          text,
          fontSize: resolvedFontSize,
          fontFamily: ff,
          fontWeight: labelFw,
          fill: labelFill,
          align: "left" as const,
          baseline: "middle" as const,
          maxWidth: estW + resolvedFontSize,
        });
        x += estW;
      }

      if (!isLast) {
        x += afterPadX;
        shapes.push({
          type: "text" as const,
          x,
          y: height / 2,
          text: separator,
          fontSize: resolvedFontSize,
          fontFamily: ff,
          fontWeight: 400,
          fill: "{color.neutral-subdued}" as TokenRef,
          align: "left" as const,
          baseline: "middle" as const,
          maxWidth: sepMeasuredWidth + resolvedFontSize,
        });
      }

      return shapes;
    },

    react: () => ({}),
  },
};
