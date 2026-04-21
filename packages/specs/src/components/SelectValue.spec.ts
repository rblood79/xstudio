/**
 * SelectValue Component Spec
 *
 * Select 컴포넌트의 선택된 값/placeholder 텍스트 렌더링
 * Compositional Architecture: SelectTrigger의 자식 Element로 독립 렌더링
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";

export interface SelectValueProps {
  variant?: "default";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  children?: string;
  placeholder?: string;
  isPlaceholder?: boolean;
  style?: Record<string, string | number | undefined>;
}

export const SelectValueSpec: ComponentSpec<SelectValueProps> = {
  name: "SelectValue",
  description: "선택된 값 또는 placeholder 텍스트 렌더링",
  element: "span",
  archetype: "simple",

  // ADR-083 Phase 11: simple archetype base 의 layout primitive 2 필드 리프팅.
  containerStyles: {
    display: "inline-flex",
    alignItems: "center",
  },

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  // Select.spec.ts `composition.sizeSelectors` prefix="select-btn" 이 per-size `--select-btn-font-size` 를 emit.
  // `composition.staticSelectors` childSelector=".react-aria-SelectValue" 에서
  // `font-size: var(--select-btn-font-size)` 연결 → CSSGenerator 가 size별 SelectValue font-size 자동 emit 중.
  // 수동 동기화 불필요 — ADR-078 childSpec emit 확인, ADR-105-c 자연 해소 확증.
  sizes: {
    xs: {
      height: 14,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-2xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    sm: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    xl: {
      height: 28,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
    },
    focusVisible: {},
  },

  render: {
    shapes: (props, size) => {
      const variant =
        SelectValueSpec.variants![
          (props as { variant?: keyof typeof SelectValueSpec.variants })
            .variant ?? SelectValueSpec.defaultVariant!
        ];
      const text = props.children || props.placeholder || "";
      if (!text) return [];

      // props.size가 명시적으로 설정된 경우 size.fontSize를 우선 사용
      // (propagation이 size prop만 변경하고 style.fontSize는 갱신하지 않으므로)
      const fontSize = resolveSpecFontSize(
        props.size ? size.fontSize : (props.style?.fontSize ?? size.fontSize),
        14,
      );

      const fwRaw = props.style?.fontWeight;
      const fontWeight =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 400
          : 400;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textAlign =
        (props.style?.textAlign as "left" | "center" | "right") || "left";

      // placeholder일 때 muted 색상, 값일 때 텍스트 색상
      const isPlaceholder =
        props.isPlaceholder || (!props.children && !!props.placeholder);
      const textColor =
        props.style?.color ??
        (isPlaceholder
          ? ("{color.neutral-subdued}" as TokenRef)
          : variant.text);

      const shapes: Shape[] = [
        {
          type: "text" as const,
          x: 0,
          y: 0,
          text,
          fontSize,
          fontFamily: ff,
          fontWeight,
          fill: textColor,
          align: textAlign,
          baseline: "middle" as const,
        },
      ];

      return shapes;
    },

    react: () => ({}),

    pixi: () => ({
      eventMode: "none" as const,
    }),
  },
};
