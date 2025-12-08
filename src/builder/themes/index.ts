/**
 * Builder Theme System
 *
 * VS Code compatible theme system for the XStudio Builder.
 * Themes affect the Builder UI (header, sidebar, inspector, footer).
 * Preview/Canvas uses separate theme system.
 *
 * Features:
 * - JSON-based themes (VS Code compatible format)
 * - WCAG-compliant color derivation for accessibility
 * - localStorage persistence for theme preference
 * - Auto-derived UI states (pressed, disabled, focus)
 *
 * Available Themes:
 * - VS Code: vs-dark, vs-light
 * - Tokyo Night: tokyo-night
 * - Solarized: solarized-dark, solarized-light
 * - Google Antigravity: antigravity-dark, antigravity-light, antigravity-teal, antigravity-purple
 * - Retro: windows-98, windows-xp, mac-os-9
 *
 * @example
 * ```tsx
 * import { useBuilderThemeStore, useActiveBuilderTheme } from '@/builder/themes';
 *
 * // Set theme
 * const { setTheme } = useBuilderThemeStore();
 * setTheme('tokyo-night');
 *
 * // Get current theme
 * const theme = useActiveBuilderTheme();
 * console.log(theme.name); // "Tokyo Night"
 * ```
 */

// Types
export type {
  BuilderTheme,
  BuilderThemeMetadata,
  VSCodeWorkbenchColors,
  BuilderThemeState,
  BuilderThemeActions,
} from "./types";

// Store
export {
  useBuilderThemeStore,
  useActiveBuilderTheme,
  useBuilderThemeList,
  useIsBuilderDarkTheme,
} from "./builderThemeStore";

// Utilities
export {
  // WCAG Accessibility
  WCAG_RATIOS,
  calculateContrastRatio,
  meetsContrastRequirement,
  adjustForContrast,
  deriveAccessibleColor,
  isColorDark,
  getTextColorForBackground,
  validateThemeContrast,
  type ContrastViolation,
  // Theme Loading
  loadTheme,
  loadAllThemes,
  getAvailableThemeIds,
  themeExists,
  deriveUIColors,
  type DerivedColors,
  type EnhancedBuilderTheme,
} from "./utils";

// Components
export { ThemePreviewCard, ThemeSelector } from "./components";
