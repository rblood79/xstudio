/**
 * Theme Loader Utility
 *
 * Loads theme JSON files and applies WCAG-compliant color derivation
 * for missing UI states (pressed, disabled, focus).
 */

import type { BuilderTheme, VSCodeWorkbenchColors } from "../types";
import {
  deriveAccessibleColor,
  isColorDark,
  calculateContrastRatio,
  adjustForContrast,
  WCAG_RATIOS,
} from "./wcag";

// ==================== JSON Theme Imports ====================

// Import JSON themes statically for Vite bundling
import vsDarkJson from "../json/vs-dark.json";
import vsLightJson from "../json/vs-light.json";
import tokyoNightJson from "../json/tokyo-night.json";
import solarizedDarkJson from "../json/solarized-dark.json";
import solarizedLightJson from "../json/solarized-light.json";
import antigravityDarkJson from "../json/antigravity-dark.json";
import antigravityLightJson from "../json/antigravity-light.json";
import antigravityTealJson from "../json/antigravity-teal.json";
import antigravityPurpleJson from "../json/antigravity-purple.json";

// ==================== Types ====================

export interface DerivedColors {
  // Button states
  "button.pressedBackground"?: string;
  "button.disabledBackground"?: string;
  "button.disabledForeground"?: string;

  // Secondary button states
  "button.secondaryPressedBackground"?: string;
  "button.secondaryDisabledBackground"?: string;
  "button.secondaryDisabledForeground"?: string;

  // Input states
  "input.focusBorder"?: string;
  "input.disabledBackground"?: string;
  "input.disabledForeground"?: string;

  // Checkbox/Switch states (XStudio extensions)
  "checkbox.background"?: string;
  "checkbox.foreground"?: string;
  "checkbox.border"?: string;
  "checkbox.checkedBackground"?: string;
  "checkbox.checkedForeground"?: string;
  "checkbox.disabledBackground"?: string;
  "checkbox.disabledForeground"?: string;

  // Switch states (XStudio extensions)
  "switch.background"?: string;
  "switch.foreground"?: string;
  "switch.checkedBackground"?: string;
  "switch.thumbBackground"?: string;

  // Slider states (XStudio extensions)
  "slider.trackBackground"?: string;
  "slider.trackFillBackground"?: string;
  "slider.thumbBackground"?: string;
  "slider.thumbBorder"?: string;

  // Radio states (XStudio extensions)
  "radio.background"?: string;
  "radio.border"?: string;
  "radio.checkedBackground"?: string;
  "radio.checkedForeground"?: string;
}

export interface EnhancedBuilderTheme extends BuilderTheme {
  derivedColors: DerivedColors;
}

// ==================== Color Derivation ====================

/**
 * Derive WCAG-compliant colors for missing UI states
 */
export function deriveUIColors(
  theme: BuilderTheme
): DerivedColors {
  const colors = theme.colors;
  const isDark = theme.type === "dark";
  const background = colors["editor.background"] || (isDark ? "#1E1E1E" : "#FFFFFF");

  const derived: DerivedColors = {};

  // Button states
  const buttonBg = colors["button.background"];
  const buttonFg = colors["button.foreground"];
  if (buttonBg && buttonFg) {
    derived["button.pressedBackground"] = deriveAccessibleColor(
      buttonBg,
      background,
      "pressed"
    );
    derived["button.disabledBackground"] = deriveAccessibleColor(
      buttonBg,
      background,
      "disabled"
    );
    derived["button.disabledForeground"] = deriveAccessibleColor(
      buttonFg,
      derived["button.disabledBackground"] || buttonBg,
      "disabled"
    );
  }

  // Secondary button states
  const secondaryBg = colors["button.secondaryBackground"];
  const secondaryFg = colors["button.secondaryForeground"];
  if (secondaryBg && secondaryFg) {
    derived["button.secondaryPressedBackground"] = deriveAccessibleColor(
      secondaryBg,
      background,
      "pressed"
    );
    derived["button.secondaryDisabledBackground"] = deriveAccessibleColor(
      secondaryBg,
      background,
      "disabled"
    );
    derived["button.secondaryDisabledForeground"] = deriveAccessibleColor(
      secondaryFg,
      derived["button.secondaryDisabledBackground"] || secondaryBg,
      "disabled"
    );
  }

  // Input states
  const inputBg = colors["input.background"];
  const inputFg = colors["input.foreground"];
  const focusBorder = colors.focusBorder;
  if (inputBg) {
    derived["input.focusBorder"] = focusBorder || (isDark ? "#007FD4" : "#0090F1");
    derived["input.disabledBackground"] = deriveAccessibleColor(
      inputBg,
      background,
      "disabled"
    );
    if (inputFg) {
      derived["input.disabledForeground"] = deriveAccessibleColor(
        inputFg,
        derived["input.disabledBackground"] || inputBg,
        "disabled"
      );
    }
  }

  // Checkbox (derive from button if not present)
  const checkboxBg = inputBg || (isDark ? "#3C3C3C" : "#FFFFFF");
  const accentColor = buttonBg || colors["activityBarBadge.background"] || "#007ACC";

  derived["checkbox.background"] = checkboxBg;
  derived["checkbox.foreground"] = inputFg || colors.foreground || "#CCCCCC";
  derived["checkbox.border"] = colors["input.border"] || colors["sideBar.border"] || "#3C3C3C";
  derived["checkbox.checkedBackground"] = accentColor;
  derived["checkbox.checkedForeground"] = ensureContrast(
    buttonFg || "#FFFFFF",
    accentColor,
    WCAG_RATIOS.AA
  );
  derived["checkbox.disabledBackground"] = deriveAccessibleColor(
    checkboxBg,
    background,
    "disabled"
  );
  derived["checkbox.disabledForeground"] = deriveAccessibleColor(
    derived["checkbox.foreground"] || "#CCCCCC",
    derived["checkbox.disabledBackground"] || checkboxBg,
    "disabled"
  );

  // Switch (derive from checkbox/button)
  derived["switch.background"] = colors["scrollbarSlider.background"] || (isDark ? "#79797966" : "#64646466");
  derived["switch.foreground"] = inputFg || colors.foreground;
  derived["switch.checkedBackground"] = accentColor;
  derived["switch.thumbBackground"] = isDark ? "#FFFFFF" : "#FFFFFF";

  // Slider
  derived["slider.trackBackground"] = colors["scrollbarSlider.background"] || (isDark ? "#5F636844" : "#80868B44");
  derived["slider.trackFillBackground"] = accentColor;
  derived["slider.thumbBackground"] = isDark ? "#FFFFFF" : "#FFFFFF";
  derived["slider.thumbBorder"] = accentColor;

  // Radio (similar to checkbox)
  derived["radio.background"] = checkboxBg;
  derived["radio.border"] = derived["checkbox.border"];
  derived["radio.checkedBackground"] = accentColor;
  derived["radio.checkedForeground"] = derived["checkbox.checkedForeground"];

  return derived;
}

/**
 * Ensure foreground color has sufficient contrast against background
 */
function ensureContrast(
  foreground: string,
  background: string,
  targetRatio: number
): string {
  const ratio = calculateContrastRatio(foreground, background);
  if (ratio >= targetRatio) {
    return foreground;
  }
  return adjustForContrast(foreground, background, targetRatio);
}

// ==================== Theme Loading ====================

/**
 * All available JSON themes
 */
const JSON_THEMES: Record<string, unknown> = {
  "vs-dark": vsDarkJson,
  "vs-light": vsLightJson,
  "tokyo-night": tokyoNightJson,
  "solarized-dark": solarizedDarkJson,
  "solarized-light": solarizedLightJson,
  "antigravity-dark": antigravityDarkJson,
  "antigravity-light": antigravityLightJson,
  "antigravity-teal": antigravityTealJson,
  "antigravity-purple": antigravityPurpleJson,
};

/**
 * Parse JSON theme to BuilderTheme
 */
function parseThemeJson(json: unknown): BuilderTheme | null {
  if (!json || typeof json !== "object") return null;

  const obj = json as Record<string, unknown>;

  if (
    typeof obj.id !== "string" ||
    typeof obj.name !== "string" ||
    (obj.type !== "dark" && obj.type !== "light") ||
    !obj.colors ||
    typeof obj.colors !== "object"
  ) {
    return null;
  }

  return {
    id: obj.id,
    name: obj.name,
    type: obj.type,
    author: typeof obj.author === "string" ? obj.author : undefined,
    colors: obj.colors as VSCodeWorkbenchColors,
  };
}

/**
 * Load and enhance a theme with derived colors
 */
export function loadTheme(themeId: string): EnhancedBuilderTheme | null {
  const json = JSON_THEMES[themeId];
  if (!json) return null;

  const theme = parseThemeJson(json);
  if (!theme) return null;

  return {
    ...theme,
    derivedColors: deriveUIColors(theme),
  };
}

/**
 * Load all available themes
 */
export function loadAllThemes(): Record<string, EnhancedBuilderTheme> {
  const themes: Record<string, EnhancedBuilderTheme> = {};

  for (const themeId of Object.keys(JSON_THEMES)) {
    const theme = loadTheme(themeId);
    if (theme) {
      themes[themeId] = theme;
    }
  }

  return themes;
}

/**
 * Get list of available theme IDs
 */
export function getAvailableThemeIds(): string[] {
  return Object.keys(JSON_THEMES);
}

/**
 * Check if theme exists
 */
export function themeExists(themeId: string): boolean {
  return themeId in JSON_THEMES;
}
