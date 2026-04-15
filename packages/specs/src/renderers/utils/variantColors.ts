/**
 * Variant/Size preset resolvers — Skia/Canvas 공용 (렌더러 무관)
 *
 * ADR-100 Phase 10+: PixiRenderer.ts 제거 시 helper 보존용으로 분리.
 */

import type { VariantSpec, SizeSpec } from "../../types";
import { resolveColor, resolveToken, hexStringToNumber } from "./tokenResolver";

/**
 * Variant 색상 세트 (numeric hex — Skia/Canvas 공용)
 */
export function getVariantColors(
  variantSpec: VariantSpec,
  theme: "light" | "dark" = "light",
): {
  bg: number;
  bgHover: number;
  bgPressed: number;
  text: number;
  border?: number;
  borderHover?: number;
  bgAlpha: number;
} {
  const bg = resolveColor(variantSpec.background, theme);
  const bgHover = resolveColor(variantSpec.backgroundHover, theme);
  const bgPressed = resolveColor(variantSpec.backgroundPressed, theme);
  const text = resolveColor(variantSpec.text, theme);
  const border = variantSpec.border
    ? resolveColor(variantSpec.border, theme)
    : undefined;
  const borderHover = variantSpec.borderHover
    ? resolveColor(variantSpec.borderHover, theme)
    : undefined;

  const toNum = (v: string | number): number =>
    typeof v === "string" ? hexStringToNumber(v) : (v as number);

  return {
    bg: toNum(bg),
    bgHover: toNum(bgHover),
    bgPressed: toNum(bgPressed),
    text: toNum(text),
    border: border !== undefined ? toNum(border) : undefined,
    borderHover: borderHover !== undefined ? toNum(borderHover) : undefined,
    bgAlpha: variantSpec.backgroundAlpha ?? 1,
  };
}

/**
 * Size 프리셋 (numeric — Skia/Canvas 공용)
 */
export function getSizePreset(
  sizeSpec: SizeSpec,
  theme: "light" | "dark" = "light",
): {
  height: number;
  paddingX: number;
  paddingY: number;
  fontSize: number;
  borderRadius: number;
  iconSize: number;
  gap: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
} {
  const fontSize = resolveToken(sizeSpec.fontSize, theme);
  const borderRadius = resolveToken(sizeSpec.borderRadius, theme);

  const extra: Record<string, number | undefined> = {};
  const standardKeys = new Set([
    "height",
    "paddingX",
    "paddingY",
    "fontSize",
    "borderRadius",
    "iconSize",
    "gap",
  ]);
  for (const [key, value] of Object.entries(sizeSpec)) {
    if (!standardKeys.has(key) && typeof value === "number") {
      extra[key] = value;
    }
  }

  return {
    height: sizeSpec.height,
    paddingX: sizeSpec.paddingX,
    paddingY: sizeSpec.paddingY,
    fontSize: typeof fontSize === "number" ? fontSize : 14,
    borderRadius: typeof borderRadius === "number" ? borderRadius : 4,
    iconSize: sizeSpec.iconSize ?? 0,
    gap: sizeSpec.gap ?? 0,
    ...extra,
  };
}
