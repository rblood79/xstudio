/**
 * WCAG Accessibility Utilities
 *
 * Provides color contrast calculations and adjustments
 * following WCAG 2.1 guidelines.
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 */

// ==================== Constants ====================

/**
 * WCAG contrast ratio requirements
 * AA: Minimum for normal text
 * AAA: Enhanced for normal text
 * AA_LARGE: Minimum for large text (18pt+ or 14pt bold)
 * UI_COMPONENT: Minimum for UI components and graphical objects
 */
export const WCAG_RATIOS = {
  AA: 4.5,
  AAA: 7,
  AA_LARGE: 3,
  UI_COMPONENT: 3,
} as const;

// ==================== Color Parsing ====================

/**
 * Parse hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, "");

  // Handle 3-digit hex
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split("")
          .map((c) => c + c)
          .join("")
      : cleanHex;

  // Handle 8-digit hex (with alpha)
  const rgbHex = fullHex.slice(0, 6);

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(rgbHex);
  if (!result) return null;

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// ==================== Luminance Calculation ====================

/**
 * Calculate relative luminance according to WCAG 2.1
 * @see https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const { r, g, b } = rgb;

  const toLinear = (c: number) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// ==================== Contrast Calculation ====================

/**
 * Calculate contrast ratio between two colors
 * Returns a value between 1 and 21
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG requirement
 */
export function meetsContrastRequirement(
  color1: string,
  color2: string,
  level: keyof typeof WCAG_RATIOS = "AA"
): boolean {
  const ratio = calculateContrastRatio(color1, color2);
  return ratio >= WCAG_RATIOS[level];
}

// ==================== Color Adjustment ====================

/**
 * Adjust color lightness to meet contrast requirement
 * @param color - Color to adjust
 * @param background - Background color to contrast against
 * @param targetRatio - Target contrast ratio (default: AA for text = 4.5)
 * @returns Adjusted color that meets the contrast requirement
 */
export function adjustForContrast(
  color: string,
  background: string,
  targetRatio: number = WCAG_RATIOS.AA
): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const bgLuminance = getRelativeLuminance(background);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // Determine if we should lighten or darken
  const shouldLighten = bgLuminance < 0.5;

  // Binary search for the right lightness
  let minL = shouldLighten ? hsl.l : 0;
  let maxL = shouldLighten ? 100 : hsl.l;
  let bestL = hsl.l;
  let bestRatio = calculateContrastRatio(color, background);

  for (let i = 0; i < 20; i++) {
    const midL = (minL + maxL) / 2;
    const testRgb = hslToRgb(hsl.h, hsl.s, midL);
    const testHex = rgbToHex(testRgb.r, testRgb.g, testRgb.b);
    const ratio = calculateContrastRatio(testHex, background);

    if (Math.abs(ratio - targetRatio) < Math.abs(bestRatio - targetRatio)) {
      bestL = midL;
      bestRatio = ratio;
    }

    if (ratio >= targetRatio) {
      if (shouldLighten) {
        maxL = midL;
      } else {
        minL = midL;
      }
    } else {
      if (shouldLighten) {
        minL = midL;
      } else {
        maxL = midL;
      }
    }
  }

  const finalRgb = hslToRgb(hsl.h, hsl.s, bestL);
  return rgbToHex(finalRgb.r, finalRgb.g, finalRgb.b);
}

/**
 * Derive accessible color variation
 * Used for states like hover, pressed, disabled, focus
 */
export function deriveAccessibleColor(
  baseColor: string,
  background: string,
  variant: "hover" | "pressed" | "disabled" | "focus"
): string {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return baseColor;

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const bgLuminance = getRelativeLuminance(background);
  const isDarkBg = bgLuminance < 0.5;

  let newL: number;
  let newS: number;

  switch (variant) {
    case "hover":
      // Slightly lighter/darker while maintaining contrast
      newL = isDarkBg ? Math.min(hsl.l + 10, 95) : Math.max(hsl.l - 10, 5);
      newS = hsl.s;
      break;

    case "pressed":
      // More pronounced change than hover
      newL = isDarkBg ? Math.min(hsl.l + 15, 95) : Math.max(hsl.l - 15, 5);
      newS = hsl.s;
      break;

    case "disabled":
      // Reduce saturation and move towards middle lightness
      newL = isDarkBg ? Math.min(hsl.l + 5, 50) : Math.max(hsl.l - 5, 50);
      newS = Math.max(hsl.s - 30, 0);
      break;

    case "focus":
      // Similar to hover but preserve original saturation
      newL = isDarkBg ? Math.min(hsl.l + 8, 95) : Math.max(hsl.l - 8, 5);
      newS = Math.min(hsl.s + 10, 100);
      break;

    default:
      newL = hsl.l;
      newS = hsl.s;
  }

  const newRgb = hslToRgb(hsl.h, newS, newL);
  const derivedColor = rgbToHex(newRgb.r, newRgb.g, newRgb.b);

  // Ensure derived color still meets minimum contrast
  const minRatio = variant === "disabled" ? 2 : WCAG_RATIOS.UI_COMPONENT;
  if (calculateContrastRatio(derivedColor, background) < minRatio) {
    return adjustForContrast(derivedColor, background, minRatio);
  }

  return derivedColor;
}

/**
 * Check if a color is considered "dark"
 */
export function isColorDark(hex: string): boolean {
  const luminance = getRelativeLuminance(hex);
  return luminance < 0.5;
}

/**
 * Get best text color (black or white) for a given background
 */
export function getTextColorForBackground(background: string): string {
  const luminance = getRelativeLuminance(background);
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

// ==================== Validation ====================

/**
 * Validate all colors in a theme meet WCAG requirements
 * Returns array of violations
 */
export interface ContrastViolation {
  colorKey: string;
  foreground: string;
  background: string;
  ratio: number;
  requiredRatio: number;
  suggestion: string;
}

export function validateThemeContrast(
  colors: Record<string, string>,
  backgroundKey: string = "editor.background"
): ContrastViolation[] {
  const violations: ContrastViolation[] = [];
  const background = colors[backgroundKey];

  if (!background) return violations;

  // Keys that should have good contrast against background
  const textKeys = [
    "foreground",
    "editor.foreground",
    "sideBar.foreground",
    "input.foreground",
    "button.foreground",
  ];

  for (const key of textKeys) {
    const color = colors[key];
    if (!color) continue;

    const ratio = calculateContrastRatio(color, background);
    if (ratio < WCAG_RATIOS.AA) {
      violations.push({
        colorKey: key,
        foreground: color,
        background,
        ratio: Math.round(ratio * 100) / 100,
        requiredRatio: WCAG_RATIOS.AA,
        suggestion: adjustForContrast(color, background, WCAG_RATIOS.AA),
      });
    }
  }

  return violations;
}
