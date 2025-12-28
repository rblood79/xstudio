/**
 * HCT Color Utilities
 * Google Material Color Utilities based HCT (Hue, Chroma, Tone) color space
 *
 * HCT is a perceptually uniform color space that provides better color
 * manipulation compared to HSL. It's based on CAM16 color appearance model.
 *
 * - Hue: 0-360 degrees (color position on color wheel)
 * - Chroma: 0-150+ (color intensity/saturation)
 * - Tone: 0-100 (lightness, 0=black, 100=white)
 */

import {
  Hct,
  argbFromHex,
  hexFromArgb,
  TonalPalette,
  SchemeContent,
  SchemeTonalSpot,
  SchemeVibrant,
  SchemeExpressive,
  SchemeNeutral,
  SchemeMonochrome,
  SchemeFidelity,
  DynamicScheme,
} from '@material/material-color-utilities';
import type { ColorValueHSL } from '../../types/theme';
import { hexToHsl, hslToHex } from '../color/colorUtils';

// ============================================================================
// Types
// ============================================================================

export interface HctColor {
  hue: number;     // 0-360
  chroma: number;  // 0-150+
  tone: number;    // 0-100
}

export interface TonalPaletteData {
  hue: number;
  chroma: number;
  tones: Record<number, string>; // tone -> hex color
}

export type SchemeVariant =
  | 'tonalSpot'
  | 'vibrant'
  | 'expressive'
  | 'neutral'
  | 'monochrome'
  | 'fidelity'
  | 'content';

export interface MaterialScheme {
  // Primary colors
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;

  // Secondary colors
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // Tertiary colors
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;

  // Error colors
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  // Surface colors
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;

  // Other
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  scrim: string;
  shadow: string;
  background: string;
  onBackground: string;
}

export interface TonalPaletteSet {
  primary: TonalPaletteData;
  secondary: TonalPaletteData;
  tertiary: TonalPaletteData;
  neutral: TonalPaletteData;
  neutralVariant: TonalPaletteData;
  error: TonalPaletteData;
}

// ============================================================================
// Core HCT Functions
// ============================================================================

/**
 * Create HCT color from hex string
 */
export function hctFromHex(hex: string): HctColor {
  const argb = argbFromHex(hex);
  const hct = Hct.fromInt(argb);
  return {
    hue: hct.hue,
    chroma: hct.chroma,
    tone: hct.tone,
  };
}

/**
 * Create hex color from HCT values
 */
export function hexFromHct(hctColor: HctColor): string {
  const hct = Hct.from(hctColor.hue, hctColor.chroma, hctColor.tone);
  return hexFromArgb(hct.toInt());
}

/**
 * Convert HSL to HCT
 */
export function hslToHct(hsl: ColorValueHSL): HctColor {
  const hex = hslToHex(hsl);
  return hctFromHex(hex);
}

/**
 * Convert HCT to HSL
 */
export function hctToHsl(hctColor: HctColor): ColorValueHSL | null {
  const hex = hexFromHct(hctColor);
  return hexToHsl(hex);
}

/**
 * Adjust tone (lightness in HCT)
 * More perceptually uniform than HSL lightness adjustment
 */
export function adjustTone(hctColor: HctColor, amount: number): HctColor {
  return {
    ...hctColor,
    tone: Math.max(0, Math.min(100, hctColor.tone + amount)),
  };
}

/**
 * Adjust chroma (saturation in HCT)
 */
export function adjustChroma(hctColor: HctColor, amount: number): HctColor {
  return {
    ...hctColor,
    chroma: Math.max(0, hctColor.chroma + amount),
  };
}

/**
 * Adjust hue
 */
export function adjustHue(hctColor: HctColor, amount: number): HctColor {
  return {
    ...hctColor,
    hue: (hctColor.hue + amount + 360) % 360,
  };
}

// ============================================================================
// Tonal Palette Generation
// ============================================================================

/**
 * Standard Material 3 tone steps
 */
export const M3_TONES = [0, 4, 6, 10, 12, 17, 20, 22, 24, 30, 40, 50, 60, 70, 80, 87, 90, 92, 94, 95, 96, 98, 99, 100] as const;

/**
 * Common shade steps (similar to Tailwind/Material)
 */
export const SHADE_TONES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/**
 * Map shade numbers to HCT tones
 */
const SHADE_TO_TONE: Record<number, number> = {
  50: 98,   // Lightest
  100: 94,
  200: 87,
  300: 80,
  400: 70,
  500: 60,  // Mid-tone
  600: 50,
  700: 40,
  800: 30,
  900: 20,
  950: 10,  // Darkest
};

/**
 * Generate tonal palette from source color
 */
export function generateTonalPalette(
  sourceHex: string,
  tones: readonly number[] = M3_TONES
): TonalPaletteData {
  const hct = hctFromHex(sourceHex);
  const palette = TonalPalette.fromHueAndChroma(hct.hue, hct.chroma);

  const tonesMap: Record<number, string> = {};
  for (const tone of tones) {
    tonesMap[tone] = hexFromArgb(palette.tone(tone));
  }

  return {
    hue: hct.hue,
    chroma: hct.chroma,
    tones: tonesMap,
  };
}

/**
 * Generate shade palette (50-950) from source color
 * Compatible with existing theme token structure
 */
export function generateShadePalette(sourceHex: string): Record<number, ColorValueHSL> {
  const hct = hctFromHex(sourceHex);
  const palette = TonalPalette.fromHueAndChroma(hct.hue, hct.chroma);

  const shades: Record<number, ColorValueHSL> = {};

  for (const shade of SHADE_TONES) {
    const tone = SHADE_TO_TONE[shade];
    const hex = hexFromArgb(palette.tone(tone));
    const hsl = hexToHsl(hex);
    if (hsl) {
      shades[shade] = hsl;
    }
  }

  return shades;
}

// ============================================================================
// Material 3 Scheme Generation
// ============================================================================

/**
 * Create dynamic scheme based on variant
 */
function createScheme(
  sourceArgb: number,
  variant: SchemeVariant,
  isDark: boolean,
  contrastLevel: number = 0.0
): DynamicScheme {
  switch (variant) {
    case 'tonalSpot':
      return new SchemeTonalSpot(Hct.fromInt(sourceArgb), isDark, contrastLevel);
    case 'vibrant':
      return new SchemeVibrant(Hct.fromInt(sourceArgb), isDark, contrastLevel);
    case 'expressive':
      return new SchemeExpressive(Hct.fromInt(sourceArgb), isDark, contrastLevel);
    case 'neutral':
      return new SchemeNeutral(Hct.fromInt(sourceArgb), isDark, contrastLevel);
    case 'monochrome':
      return new SchemeMonochrome(Hct.fromInt(sourceArgb), isDark, contrastLevel);
    case 'fidelity':
      return new SchemeFidelity(Hct.fromInt(sourceArgb), isDark, contrastLevel);
    case 'content':
      return new SchemeContent(Hct.fromInt(sourceArgb), isDark, contrastLevel);
    default:
      return new SchemeTonalSpot(Hct.fromInt(sourceArgb), isDark, contrastLevel);
  }
}

/**
 * Generate Material 3 color scheme from source color
 *
 * @param sourceHex - Source color in hex format
 * @param variant - Scheme variant (tonalSpot, vibrant, etc.)
 * @param isDark - Generate dark mode scheme
 * @param contrastLevel - Contrast level (-1 to 1, 0 = normal)
 */
export function generateMaterialScheme(
  sourceHex: string,
  variant: SchemeVariant = 'tonalSpot',
  isDark: boolean = false,
  contrastLevel: number = 0.0
): MaterialScheme {
  const sourceArgb = argbFromHex(sourceHex);
  const scheme = createScheme(sourceArgb, variant, isDark, contrastLevel);

  return {
    // Primary
    primary: hexFromArgb(scheme.primary),
    onPrimary: hexFromArgb(scheme.onPrimary),
    primaryContainer: hexFromArgb(scheme.primaryContainer),
    onPrimaryContainer: hexFromArgb(scheme.onPrimaryContainer),

    // Secondary
    secondary: hexFromArgb(scheme.secondary),
    onSecondary: hexFromArgb(scheme.onSecondary),
    secondaryContainer: hexFromArgb(scheme.secondaryContainer),
    onSecondaryContainer: hexFromArgb(scheme.onSecondaryContainer),

    // Tertiary
    tertiary: hexFromArgb(scheme.tertiary),
    onTertiary: hexFromArgb(scheme.onTertiary),
    tertiaryContainer: hexFromArgb(scheme.tertiaryContainer),
    onTertiaryContainer: hexFromArgb(scheme.onTertiaryContainer),

    // Error
    error: hexFromArgb(scheme.error),
    onError: hexFromArgb(scheme.onError),
    errorContainer: hexFromArgb(scheme.errorContainer),
    onErrorContainer: hexFromArgb(scheme.onErrorContainer),

    // Surface
    surface: hexFromArgb(scheme.surface),
    onSurface: hexFromArgb(scheme.onSurface),
    surfaceVariant: hexFromArgb(scheme.surfaceVariant),
    onSurfaceVariant: hexFromArgb(scheme.onSurfaceVariant),
    surfaceContainerLowest: hexFromArgb(scheme.surfaceContainerLowest),
    surfaceContainerLow: hexFromArgb(scheme.surfaceContainerLow),
    surfaceContainer: hexFromArgb(scheme.surfaceContainer),
    surfaceContainerHigh: hexFromArgb(scheme.surfaceContainerHigh),
    surfaceContainerHighest: hexFromArgb(scheme.surfaceContainerHighest),

    // Other
    outline: hexFromArgb(scheme.outline),
    outlineVariant: hexFromArgb(scheme.outlineVariant),
    inverseSurface: hexFromArgb(scheme.inverseSurface),
    inverseOnSurface: hexFromArgb(scheme.inverseOnSurface),
    inversePrimary: hexFromArgb(scheme.inversePrimary),
    scrim: hexFromArgb(scheme.scrim),
    shadow: hexFromArgb(scheme.shadow),
    background: hexFromArgb(scheme.background),
    onBackground: hexFromArgb(scheme.onBackground),
  };
}

/**
 * Generate complete tonal palette set from source color
 */
export function generateTonalPaletteSet(
  sourceHex: string,
  variant: SchemeVariant = 'tonalSpot'
): TonalPaletteSet {
  const sourceArgb = argbFromHex(sourceHex);
  const scheme = createScheme(sourceArgb, variant, false, 0);

  const createPaletteData = (palette: TonalPalette): TonalPaletteData => {
    const tones: Record<number, string> = {};
    for (const tone of M3_TONES) {
      tones[tone] = hexFromArgb(palette.tone(tone));
    }
    // Extract hue/chroma from tone 50
    const midHct = Hct.fromInt(palette.tone(50));
    return {
      hue: midHct.hue,
      chroma: midHct.chroma,
      tones,
    };
  };

  return {
    primary: createPaletteData(scheme.primaryPalette),
    secondary: createPaletteData(scheme.secondaryPalette),
    tertiary: createPaletteData(scheme.tertiaryPalette),
    neutral: createPaletteData(scheme.neutralPalette),
    neutralVariant: createPaletteData(scheme.neutralVariantPalette),
    error: createPaletteData(scheme.errorPalette),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get contrast ratio between two colors using HCT
 * Based on tone difference (more accurate than HSL luminance)
 */
export function getHctContrastRatio(color1Hex: string, color2Hex: string): number {
  const hct1 = hctFromHex(color1Hex);
  const hct2 = hctFromHex(color2Hex);

  const tone1 = hct1.tone / 100;
  const tone2 = hct2.tone / 100;

  const lighter = Math.max(tone1, tone2);
  const darker = Math.min(tone1, tone2);

  // Approximation using tone (0-1 scale)
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Find optimal tone for text on a given background
 * Returns tone that ensures WCAG AA contrast (4.5:1)
 */
export function findAccessibleTone(
  backgroundHex: string
): { lightTone: number; darkTone: number } {
  const bgHct = hctFromHex(backgroundHex);

  // For light backgrounds, use dark text (low tone)
  // For dark backgrounds, use light text (high tone)
  if (bgHct.tone >= 50) {
    return { lightTone: 100, darkTone: Math.min(bgHct.tone - 50, 30) };
  } else {
    return { lightTone: Math.max(bgHct.tone + 50, 80), darkTone: 0 };
  }
}

/**
 * Harmonize a color with a source color
 * Shifts the hue of the target color towards the source color
 */
export function harmonize(targetHex: string, sourceHex: string, amount: number = 0.5): string {
  const targetHct = hctFromHex(targetHex);
  const sourceHct = hctFromHex(sourceHex);

  // Calculate shortest angular distance
  let hueDiff = sourceHct.hue - targetHct.hue;
  if (hueDiff > 180) hueDiff -= 360;
  if (hueDiff < -180) hueDiff += 360;

  const newHue = (targetHct.hue + hueDiff * amount + 360) % 360;

  return hexFromHct({
    hue: newHue,
    chroma: targetHct.chroma,
    tone: targetHct.tone,
  });
}

/**
 * Generate complementary color using HCT
 */
export function getHctComplementary(hex: string): string {
  const hct = hctFromHex(hex);
  return hexFromHct({
    hue: (hct.hue + 180) % 360,
    chroma: hct.chroma,
    tone: hct.tone,
  });
}

/**
 * Generate triadic colors using HCT
 */
export function getHctTriadic(hex: string): [string, string, string] {
  const hct = hctFromHex(hex);
  return [
    hex,
    hexFromHct({ ...hct, hue: (hct.hue + 120) % 360 }),
    hexFromHct({ ...hct, hue: (hct.hue + 240) % 360 }),
  ];
}

/**
 * Generate split complementary colors using HCT
 */
export function getHctSplitComplementary(hex: string, angle: number = 30): [string, string, string] {
  const hct = hctFromHex(hex);
  const complementary = (hct.hue + 180) % 360;
  return [
    hex,
    hexFromHct({ ...hct, hue: (complementary - angle + 360) % 360 }),
    hexFromHct({ ...hct, hue: (complementary + angle) % 360 }),
  ];
}

/**
 * Generate analogous colors using HCT
 */
export function getHctAnalogous(hex: string, angle: number = 30): [string, string, string] {
  const hct = hctFromHex(hex);
  return [
    hexFromHct({ ...hct, hue: (hct.hue - angle + 360) % 360 }),
    hex,
    hexFromHct({ ...hct, hue: (hct.hue + angle) % 360 }),
  ];
}
