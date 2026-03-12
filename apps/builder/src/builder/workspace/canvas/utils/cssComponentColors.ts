/**
 * CSS Component Colors (ADR-035 Phase 6)
 *
 * M3 버튼 색상, variant 색상 매핑.
 * cssVariableReader.ts에서 추출.
 */

import {
  getCSSVariable,
  cssColorToHex,
  mixWithBlack,
  mixWithWhite,
  FALLBACK_COLORS,
} from "./cssVariableCore";

// ============================================
// Types
// ============================================

export interface M3ButtonColors {
  // Default (surface-container-high)
  defaultBg: number;
  defaultBgHover: number;
  defaultBgPressed: number;
  defaultText: number;
  defaultBorder: number;

  // Primary
  primaryBg: number;
  primaryBgHover: number;
  primaryBgPressed: number;
  primaryText: number;

  // Secondary
  secondaryBg: number;
  secondaryBgHover: number;
  secondaryBgPressed: number;
  secondaryText: number;

  // Tertiary
  tertiaryBg: number;
  tertiaryBgHover: number;
  tertiaryBgPressed: number;
  tertiaryText: number;

  // Error
  errorBg: number;
  errorBgHover: number;
  errorBgPressed: number;
  errorText: number;

  // Surface
  surfaceBg: number;
  surfaceBgHover: number;
  surfaceBgPressed: number;
  surfaceText: number;
  surfaceBorder: number;

  // Outline
  outlineBg: number;
  outlineBgHover: number;
  outlineBgPressed: number;
  outlineText: number;
  outlineBorder: number;

  // Ghost
  ghostBg: number;
  ghostBgHover: number;
  ghostBgPressed: number;
  ghostText: number;

  // Card (surface-container 기반)
  cardBg: number;
  cardBgHover: number;
  cardBorder: number;
}

// ============================================
// M3 Button Colors
// ============================================

/**
 * 현재 테마의 M3 버튼 색상을 읽어옴
 */
export function getM3ButtonColors(): M3ButtonColors {
  const primary = cssColorToHex(
    getCSSVariable("--primary"),
    FALLBACK_COLORS.primary,
  );
  const onPrimary = cssColorToHex(
    getCSSVariable("--on-primary"),
    FALLBACK_COLORS.onPrimary,
  );
  const secondary = cssColorToHex(
    getCSSVariable("--secondary"),
    FALLBACK_COLORS.secondary,
  );
  const onSecondary = cssColorToHex(
    getCSSVariable("--on-secondary"),
    FALLBACK_COLORS.onSecondary,
  );
  const tertiary = cssColorToHex(
    getCSSVariable("--tertiary"),
    FALLBACK_COLORS.tertiary,
  );
  const onTertiary = cssColorToHex(
    getCSSVariable("--on-tertiary"),
    FALLBACK_COLORS.onTertiary,
  );
  const error = cssColorToHex(getCSSVariable("--error"), FALLBACK_COLORS.error);
  const onError = cssColorToHex(
    getCSSVariable("--on-error"),
    FALLBACK_COLORS.onError,
  );
  const surfaceContainer = cssColorToHex(
    getCSSVariable("--surface-container"),
    FALLBACK_COLORS.surfaceContainer,
  );
  const surfaceContainerHigh = cssColorToHex(
    getCSSVariable("--surface-container-high"),
    FALLBACK_COLORS.surfaceContainerHigh,
  );
  const surfaceContainerHighest = cssColorToHex(
    getCSSVariable("--surface-container-highest"),
    FALLBACK_COLORS.surfaceContainerHighest,
  );
  const onSurface = cssColorToHex(
    getCSSVariable("--on-surface"),
    FALLBACK_COLORS.onSurface,
  );
  const outline = cssColorToHex(
    getCSSVariable("--outline"),
    FALLBACK_COLORS.outline,
  );
  const outlineVariant = cssColorToHex(
    getCSSVariable("--outline-variant"),
    FALLBACK_COLORS.outlineVariant,
  );

  return {
    defaultBg: surfaceContainerHigh,
    defaultBgHover: mixWithBlack(surfaceContainerHigh, 92),
    defaultBgPressed: mixWithBlack(surfaceContainerHigh, 88),
    defaultText: onSurface,
    defaultBorder: outlineVariant,

    primaryBg: primary,
    primaryBgHover: mixWithBlack(primary, 92),
    primaryBgPressed: mixWithBlack(primary, 88),
    primaryText: onPrimary,

    secondaryBg: secondary,
    secondaryBgHover: mixWithBlack(secondary, 92),
    secondaryBgPressed: mixWithBlack(secondary, 88),
    secondaryText: onSecondary,

    tertiaryBg: tertiary,
    tertiaryBgHover: mixWithBlack(tertiary, 92),
    tertiaryBgPressed: mixWithBlack(tertiary, 88),
    tertiaryText: onTertiary,

    errorBg: error,
    errorBgHover: mixWithBlack(error, 92),
    errorBgPressed: mixWithBlack(error, 88),
    errorText: onError,

    surfaceBg: surfaceContainerHighest,
    surfaceBgHover: mixWithBlack(surfaceContainerHighest, 92),
    surfaceBgPressed: mixWithBlack(surfaceContainerHighest, 88),
    surfaceText: onSurface,
    surfaceBorder: outlineVariant,

    outlineBg: 0xffffff,
    outlineBgHover: mixWithWhite(primary, 8),
    outlineBgPressed: mixWithWhite(primary, 12),
    outlineText: primary,
    outlineBorder: outline,

    ghostBg: 0xffffff,
    ghostBgHover: mixWithWhite(primary, 8),
    ghostBgPressed: mixWithWhite(primary, 12),
    ghostText: primary,

    cardBg: surfaceContainer,
    cardBgHover: mixWithBlack(surfaceContainer, 92),
    cardBorder: outlineVariant,
  };
}

/**
 * --outline-variant 색상 가져오기 (캔버스 경계선 등)
 */
export function getOutlineVariantColor(): number {
  return cssColorToHex(
    getCSSVariable("--outline-variant"),
    FALLBACK_COLORS.outlineVariant,
  );
}

/**
 * variant 이름으로 색상 가져오기
 */
export function getVariantColors(
  variant: string,
  colors: M3ButtonColors,
): {
  bg: number;
  bgHover: number;
  bgPressed: number;
  text: number;
  border?: number;
  bgAlpha?: number;
} {
  switch (variant) {
    case "accent":
    case "primary":
      return {
        bg: colors.primaryBg,
        bgHover: colors.primaryBgHover,
        bgPressed: colors.primaryBgPressed,
        text: colors.primaryText,
      };
    case "secondary":
      return {
        bg: colors.secondaryBg,
        bgHover: colors.secondaryBgHover,
        bgPressed: colors.secondaryBgPressed,
        text: colors.secondaryText,
      };
    case "negative":
    case "error":
      return {
        bg: colors.errorBg,
        bgHover: colors.errorBgHover,
        bgPressed: colors.errorBgPressed,
        text: colors.errorText,
      };
    case "neutral":
    case "tertiary":
      return {
        bg: colors.tertiaryBg,
        bgHover: colors.tertiaryBgHover,
        bgPressed: colors.tertiaryBgPressed,
        text: colors.tertiaryText,
      };
    case "surface":
      return {
        bg: colors.surfaceBg,
        bgHover: colors.surfaceBgHover,
        bgPressed: colors.surfaceBgPressed,
        text: colors.surfaceText,
        border: colors.surfaceBorder,
      };
    case "outline":
      return {
        bg: colors.outlineBg,
        bgHover: colors.outlineBgHover,
        bgPressed: colors.outlineBgPressed,
        text: colors.outlineText,
        border: colors.outlineBorder,
        bgAlpha: 0,
      };
    case "ghost":
      return {
        bg: colors.ghostBg,
        bgHover: colors.ghostBgHover,
        bgPressed: colors.ghostBgPressed,
        text: colors.ghostText,
        bgAlpha: 0,
      };
    case "default":
    default:
      return {
        bg: colors.defaultBg,
        bgHover: colors.defaultBgHover,
        bgPressed: colors.defaultBgPressed,
        text: colors.defaultText,
        border: colors.defaultBorder,
      };
  }
}
