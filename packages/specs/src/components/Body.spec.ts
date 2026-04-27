/**
 * Body Component Spec — ADR-902 후속
 *
 * 페이지 루트 컨테이너. theme-aware 배경색 (`{color.base}`) 을 Spec SSOT 로
 * 선언하여 Skia / Preview DOM / Publish DOM 3 consumer 가 동일 소스에서 파생되도록
 * 한다. 이전에는 3곳 (buildBoxNodeData isBody 분기 / preview BODY_THEME_MAP /
 * publish body→div) 에 분산 하드코딩되어 ADR-063 SSOT D3 를 위반했다.
 *
 * element.type 은 "body" (lowercase) 이므로 `BASE_TAG_SPEC_MAP` 에는 PascalCase
 * (`Body`) 로 등록되고, `LOWERCASE_TAG_SPEC_MAP` 이 자동으로 lowercase 키를 생성한다.
 *
 * Single Source of Truth — React DOM 과 CanvasKit/Skia 모두에서 동일한 시각 결과.
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { parsePxValue } from "../primitives";
// ADR-908 Phase 3-A-2: Fill token dual-read seam
import { resolveFillTokens } from "../utils/fillTokens";

/**
 * Body Props — 페이지 루트는 최소 props 만 노출.
 */
export interface BodyProps {
  variant?: "default";
  size?: "md";
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Body Component Spec
 *
 * 단일 default variant + `{color.base}` fill. 페이지 크기는 container (워크스페이스)
 * 가 결정하므로 sizes 는 placeholder 역할.
 */
export const BodySpec: ComponentSpec<BodyProps> = {
  name: "Body",
  description: "HTML <body> 페이지 루트 컨테이너 — theme-aware 배경색",
  element: "body",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      fill: {
        default: {
          base: "{color.base}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    md: {
      height: 0, // auto — 페이지/컨테이너 크기가 결정
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-md}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {},
  },

  render: {
    shapes: (props, _size, state = "default") => {
      const variant =
        BodySpec.variants![
          (props as { variant?: keyof typeof BodySpec.variants }).variant ??
            BodySpec.defaultVariant!
        ];
      const fill = resolveFillTokens(variant);

      // ADR-902: props.style.backgroundColor 은 Preview DOM 용 CSS var 리터럴
      // ("var(--bg)") 을 담고 있으므로 Skia 경로에서는 skip. 사용자가 명시적 hex 를
      // 입력한 경우만 honor (TokenRef / "var(" / "$--" 은 Skia 해석 불가 → Spec 토큰
      // 으로 fallback).
      const rawBg = props.style?.backgroundColor;
      const userBg =
        typeof rawBg === "string" &&
        !rawBg.startsWith("var(") &&
        !rawBg.startsWith("$--") &&
        !rawBg.startsWith("{")
          ? rawBg
          : undefined;
      const bgColor =
        userBg ??
        (state === "hover"
          ? (fill.default.hover ?? fill.default.base)
          : state === "pressed"
            ? (fill.default.pressed ?? fill.default.base)
            : fill.default.base);

      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null ? parsePxValue(styleBr, 0) : 0;

      const shapes: Shape[] = [];

      // 페이지 배경 (theme-aware via TokenRef)
      shapes.push({
        id: "bg",
        type: "roundRect" as const,
        x: 0,
        y: 0,
        width: "auto" as const,
        height: "auto",
        radius: borderRadius as unknown as number,
        fill: bgColor,
        ...(fill.alpha !== undefined && {
          fillAlpha: fill.alpha,
        }),
      });

      // Child Composition: 자식 Element 가 있으면 배경만 반환
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 빈 페이지 placeholder (SHELL_ONLY_CONTAINER_TAGS 등록으로 사실상 도달 안 함)
      shapes.push({
        type: "container" as const,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
        children: [],
        layout: {
          display: "block",
        },
      });

      return shapes;
    },

    react: () => ({}),

    pixi: () => ({
      eventMode: "passive" as const,
      cursor: "default",
    }),
  },
};
