/**
 * Builder Theme System
 *
 * VS Code compatible theme system for the XStudio Builder.
 * Themes affect the Builder UI (header, sidebar, inspector, footer).
 * Preview/Canvas uses separate theme system.
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

// Presets
export {
  BUILDER_THEMES,
  DEFAULT_THEME_ID,
  getThemeIds,
  getThemeById,
  isThemeDark,
  THEMES_BY_TYPE,
  vsDark,
  vsLight,
  tokyoNight,
  solarizedDark,
  solarizedLight,
} from "./presets";
