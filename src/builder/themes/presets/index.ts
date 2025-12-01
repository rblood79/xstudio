/**
 * Builder Theme Presets
 *
 * Collection of VS Code compatible themes for the XStudio Builder.
 * These themes only affect the Builder UI (header, sidebar, inspector),
 * NOT the Preview/Canvas area.
 */

export { vsDark } from "./vs-dark";
export { vsLight } from "./vs-light";
export { tokyoNight } from "./tokyo-night";
export { solarizedDark } from "./solarized-dark";
export { solarizedLight } from "./solarized-light";

import { vsDark } from "./vs-dark";
import { vsLight } from "./vs-light";
import { tokyoNight } from "./tokyo-night";
import { solarizedDark } from "./solarized-dark";
import { solarizedLight } from "./solarized-light";
import type { BuilderTheme } from "../types";

/**
 * All built-in themes as a record
 */
export const BUILDER_THEMES: Record<string, BuilderTheme> = {
  "vs-dark": vsDark,
  "vs-light": vsLight,
  "tokyo-night": tokyoNight,
  "solarized-dark": solarizedDark,
  "solarized-light": solarizedLight,
};

/**
 * Default theme ID
 */
export const DEFAULT_THEME_ID = "vs-dark";

/**
 * Get all theme IDs
 */
export const getThemeIds = (): string[] => Object.keys(BUILDER_THEMES);

/**
 * Get theme by ID
 */
export const getThemeById = (id: string): BuilderTheme | undefined =>
  BUILDER_THEMES[id];

/**
 * Check if theme is dark
 */
export const isThemeDark = (id: string): boolean =>
  BUILDER_THEMES[id]?.type === "dark";

/**
 * Grouped themes by type for UI display
 */
export const THEMES_BY_TYPE = {
  dark: [vsDark, tokyoNight, solarizedDark],
  light: [vsLight, solarizedLight],
};
