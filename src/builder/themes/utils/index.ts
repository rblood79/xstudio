/**
 * Builder Theme Utilities
 *
 * WCAG accessibility utilities and theme loading functions.
 */

// WCAG Accessibility Utilities
export {
  // Constants
  WCAG_RATIOS,
  // Color parsing
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  // Luminance & Contrast
  getRelativeLuminance,
  calculateContrastRatio,
  meetsContrastRequirement,
  // Color adjustment
  adjustForContrast,
  deriveAccessibleColor,
  isColorDark,
  getTextColorForBackground,
  // Validation
  validateThemeContrast,
  type ContrastViolation,
} from "./wcag";

// Theme Loading
export {
  loadTheme,
  loadAllThemes,
  getAvailableThemeIds,
  themeExists,
  deriveUIColors,
  type DerivedColors,
  type EnhancedBuilderTheme,
} from "./themeLoader";
