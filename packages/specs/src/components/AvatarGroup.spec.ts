/**
 * AvatarGroup Component Spec
 *
 * 아바타 그룹 컨테이너 컴포넌트
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import { Tag, PointerOff } from "lucide-react";
import type { ComponentSpec, Shape, TokenRef } from "../types";

/**
 * AvatarGroup Props
 */
export interface AvatarGroupProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  label?: string;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * AvatarGroup Component Spec
 *
 * 실제 Avatar 자식은 compositional 패턴으로 렌더링되며,
 * AvatarGroup 자체는 투명 컨테이너 역할만 수행합니다.
 */
export const AvatarGroupSpec: ComponentSpec<AvatarGroupProps> = {
  name: "AvatarGroup",
  description: "아바타 그룹 컨테이너 컴포넌트",
  element: "div",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      backgroundAlpha: 0,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    xs: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-2xs}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    sm: {
      height: 28,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 32,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 40,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    xl: {
      height: 48,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
  },

  states: {
    disabled: {
      opacity: 0.38,
    },
  },

  properties: {
    sections: [
      {
        title: "Content",
        fields: [{ key: "label", type: "string", label: "Label", icon: Tag }],
      },
      {
        title: "Appearance",
        fields: [{ type: "size" }],
      },
      {
        title: "State",
        fields: [{ key: "isDisabled", type: "boolean", icon: PointerOff }],
      },
    ],
  },

  render: {
    shapes: (_props, _size, _state = "default") => {
      // AvatarGroup은 투명 컨테이너 — Avatar 자식은 compositional 렌더링
      const shapes: Shape[] = [];

      // Child Composition: 자식 Element가 있으면 shell(빈 배열)만 반환
      // 실제 Avatar 자식 렌더링은 ElementSprite가 담당
      return shapes;
    },

    react: (props) => ({
      role: "group",
      "aria-label": props.label || "Avatar group",
    }),

    pixi: () => ({
      eventMode: "none" as const,
    }),
  },
};
