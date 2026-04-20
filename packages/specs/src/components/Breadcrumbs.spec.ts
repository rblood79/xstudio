/**
 * Breadcrumbs Component Spec
 *
 * React Spectrum S2 API 기반 브레드크럼 컴포넌트
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * RSP API 레퍼런스: https://react-spectrum.adobe.com/react-spectrum/Breadcrumbs.html
 *
 * @packageDocumentation
 */

import type { ComponentSpec, TokenRef } from "../types";
import { PointerOff } from "lucide-react";

/**
 * Breadcrumbs Props — RSP API 기준
 */
export interface BreadcrumbsProps {
  /** Controls spacing and layout size. RSP API: 'S' | 'M' | 'L', default 'M' */
  size?: "S" | "M" | "L";
  /** Always shows root item when collapsed */
  showRoot?: boolean;
  /** Places last item on new line */
  isMultiline?: boolean;
  /** Disables all breadcrumbs */
  isDisabled?: boolean;
  /** Auto-focuses last item on render */
  autoFocusCurrent?: boolean;
  /** Separator character (composition extension) */
  separator?: string;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  style?: Record<string, string | number | undefined>;
  /** @deprecated 레거시 — Skia는 Breadcrumb 자식 spec이 텍스트를 그림 */
  _crumbs?: string[];
}

/**
 * Breadcrumbs Component Spec
 * RSP size default: 'M'
 */
export const BreadcrumbsSpec: ComponentSpec<BreadcrumbsProps> = {
  name: "Breadcrumbs",
  description: "React Spectrum S2 기반 브레드크럼 네비게이션 컴포넌트",
  archetype: "simple",

  // ADR-083 Phase 11: simple archetype base 의 layout primitive 2 필드 리프팅.
  containerStyles: {
    display: "inline-flex",
    alignItems: "center",
  },
  element: "nav",

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
    /* 마지막 항목(현재 페이지)은 레퍼런스대로 흐리지 않음 — opacity는 자손 선택자로만 적용 */
    disabled: {
      opacity: 1,
      pointerEvents: "auto",
      cursor: "default",
    },
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  properties: {
    sections: [
      {
        title: "Appearance",
        fields: [
          { type: "size" },
          {
            key: "showRoot",
            type: "boolean",
            label: "Show Root",
            icon: PointerOff,
          },
          {
            key: "isMultiline",
            type: "boolean",
            label: "Multiline",
            icon: PointerOff,
          },
        ],
      },
      {
        title: "State",
        fields: [{ key: "isDisabled", type: "boolean", icon: PointerOff }],
      },
      {
        title: "Breadcrumb Management",
        fields: [
          {
            key: "items",
            type: "children-manager",
            label: "Breadcrumbs",
            childTag: "Breadcrumb",
            defaultChildProps: {
              children: "Breadcrumb",
              href: "/",
            },
            labelProp: "children",
          },
        ],
      },
    ],
  },

  render: {
    // Skia 텍스트/구분자는 자식 Breadcrumb.spec이 담당 (Taffy 셀과 1:1)
    shapes: () => [],

    react: () => ({
      "aria-label": "Breadcrumb",
    }),
  },
};
