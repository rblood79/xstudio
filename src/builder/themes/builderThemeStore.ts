/**
 * Builder Theme Store
 *
 * Manages the Builder UI theme state and CSS injection.
 * Uses VS Code compatible theme structure.
 */
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  BuilderTheme,
  BuilderThemeMetadata,
  VSCodeWorkbenchColors,
} from "./types";
import { BUILDER_THEMES, DEFAULT_THEME_ID } from "./presets";

// ==================== Constants ====================

const STORAGE_KEY = "xstudio-builder-theme";
const STYLE_ID = "builder-theme-vars";

// ==================== VS Code → CSS Variable Mapping ====================

/**
 * Maps VS Code color keys to Builder CSS custom property names.
 * Only includes keys that are used in Builder UI.
 */
const VS_CODE_TO_CSS_MAP: Record<keyof VSCodeWorkbenchColors, string> = {
  // Base Colors
  foreground: "--builder-foreground",
  disabledForeground: "--builder-foreground-disabled",
  focusBorder: "--builder-focus-border",
  "widget.shadow": "--builder-widget-shadow",
  "widget.border": "--builder-widget-border",
  "selection.background": "--builder-selection-bg",
  descriptionForeground: "--builder-description-fg",
  errorForeground: "--builder-error-fg",
  "icon.foreground": "--builder-icon-fg",

  // Window Border
  "window.activeBorder": "--builder-window-border",
  "window.inactiveBorder": "--builder-window-border-inactive",

  // Activity Bar (Panel Nav)
  "activityBar.background": "--builder-activity-bar-bg",
  "activityBar.foreground": "--builder-activity-bar-fg",
  "activityBar.inactiveForeground": "--builder-activity-bar-fg-inactive",
  "activityBar.border": "--builder-activity-bar-border",
  "activityBarBadge.background": "--builder-badge-bg",
  "activityBarBadge.foreground": "--builder-badge-fg",

  // Side Bar
  "sideBar.background": "--builder-sidebar-bg",
  "sideBar.foreground": "--builder-sidebar-fg",
  "sideBar.border": "--builder-sidebar-border",
  "sideBarTitle.foreground": "--builder-sidebar-title-fg",
  "sideBarSectionHeader.background": "--builder-sidebar-section-bg",
  "sideBarSectionHeader.foreground": "--builder-sidebar-section-fg",
  "sideBarSectionHeader.border": "--builder-sidebar-section-border",
  "sideBar.dropBackground": "--builder-sidebar-drop-bg",

  // Editor / Canvas
  "editor.background": "--builder-editor-bg",
  "editor.foreground": "--builder-editor-fg",
  "editorWidget.background": "--builder-widget-bg",
  "editorWidget.foreground": "--builder-widget-fg",
  "editorWidget.border": "--builder-widget-border",
  "editorGroup.border": "--builder-editor-group-border",
  "editorGroup.dropBackground": "--builder-editor-drop-bg",
  "editorPane.background": "--builder-editor-pane-bg",

  // Title Bar (Header)
  "titleBar.activeBackground": "--builder-header-bg",
  "titleBar.activeForeground": "--builder-header-fg",
  "titleBar.inactiveBackground": "--builder-header-bg-inactive",
  "titleBar.inactiveForeground": "--builder-header-fg-inactive",
  "titleBar.border": "--builder-header-border",

  // Tab
  "tab.activeBackground": "--builder-tab-active-bg",
  "tab.activeForeground": "--builder-tab-active-fg",
  "tab.inactiveBackground": "--builder-tab-inactive-bg",
  "tab.inactiveForeground": "--builder-tab-inactive-fg",
  "tab.border": "--builder-tab-border",
  "tab.activeBorder": "--builder-tab-active-border",
  "tab.hoverForeground": "--builder-tab-hover-fg",
  "tab.hoverBackground": "--builder-tab-hover-bg",
  "editorGroupHeader.tabsBackground": "--builder-tabs-bg",
  "editorGroupHeader.tabsBorder": "--builder-tabs-border",

  // Panel (Footer / Monitor)
  "panel.background": "--builder-panel-bg",
  "panel.border": "--builder-panel-border",
  "panelTitle.activeForeground": "--builder-panel-title-fg",
  "panelTitle.inactiveForeground": "--builder-panel-title-fg-inactive",
  "panelTitle.activeBorder": "--builder-panel-title-border",
  "panelInput.border": "--builder-panel-input-border",

  // Status Bar
  "statusBar.background": "--builder-statusbar-bg",
  "statusBar.foreground": "--builder-statusbar-fg",
  "statusBar.border": "--builder-statusbar-border",
  "statusBar.debuggingBackground": "--builder-statusbar-debug-bg",
  "statusBar.debuggingForeground": "--builder-statusbar-debug-fg",
  "statusBar.noFolderBackground": "--builder-statusbar-nofolder-bg",
  "statusBarItem.activeBackground": "--builder-statusbar-item-active-bg",
  "statusBarItem.hoverBackground": "--builder-statusbar-item-hover-bg",
  "statusBarItem.prominentBackground": "--builder-statusbar-item-prominent-bg",

  // Input Controls
  "input.background": "--builder-input-bg",
  "input.foreground": "--builder-input-fg",
  "input.border": "--builder-input-border",
  "input.placeholderForeground": "--builder-input-placeholder",
  "inputOption.activeBorder": "--builder-input-option-border",
  "inputOption.activeBackground": "--builder-input-option-bg",
  "inputOption.activeForeground": "--builder-input-option-fg",
  "inputValidation.infoBackground": "--builder-input-info-bg",
  "inputValidation.infoBorder": "--builder-input-info-border",
  "inputValidation.warningBackground": "--builder-input-warning-bg",
  "inputValidation.warningBorder": "--builder-input-warning-border",
  "inputValidation.errorBackground": "--builder-input-error-bg",
  "inputValidation.errorBorder": "--builder-input-error-border",

  // Dropdown
  "dropdown.background": "--builder-dropdown-bg",
  "dropdown.foreground": "--builder-dropdown-fg",
  "dropdown.border": "--builder-dropdown-border",
  "dropdown.listBackground": "--builder-dropdown-list-bg",

  // Button
  "button.background": "--builder-button-bg",
  "button.foreground": "--builder-button-fg",
  "button.hoverBackground": "--builder-button-hover-bg",
  "button.secondaryBackground": "--builder-button-secondary-bg",
  "button.secondaryForeground": "--builder-button-secondary-fg",
  "button.secondaryHoverBackground": "--builder-button-secondary-hover-bg",

  // Badge
  "badge.background": "--builder-badge-bg",
  "badge.foreground": "--builder-badge-fg",

  // Scrollbar
  "scrollbar.shadow": "--builder-scrollbar-shadow",
  "scrollbarSlider.background": "--builder-scrollbar-bg",
  "scrollbarSlider.hoverBackground": "--builder-scrollbar-hover-bg",
  "scrollbarSlider.activeBackground": "--builder-scrollbar-active-bg",

  // Progress Bar
  "progressBar.background": "--builder-progress-bg",

  // List / Tree
  "list.activeSelectionBackground": "--builder-list-active-bg",
  "list.activeSelectionForeground": "--builder-list-active-fg",
  "list.activeSelectionIconForeground": "--builder-list-active-icon-fg",
  "list.inactiveSelectionBackground": "--builder-list-inactive-bg",
  "list.inactiveSelectionForeground": "--builder-list-inactive-fg",
  "list.hoverBackground": "--builder-list-hover-bg",
  "list.hoverForeground": "--builder-list-hover-fg",
  "list.focusBackground": "--builder-list-focus-bg",
  "list.focusForeground": "--builder-list-focus-fg",
  "list.dropBackground": "--builder-list-drop-bg",
  "list.highlightForeground": "--builder-list-highlight-fg",
  "list.errorForeground": "--builder-list-error-fg",
  "list.warningForeground": "--builder-list-warning-fg",
  "tree.indentGuidesStroke": "--builder-tree-indent-stroke",

  // Quick Input / Picker
  "quickInput.background": "--builder-quickinput-bg",
  "quickInput.foreground": "--builder-quickinput-fg",
  "quickInputList.focusBackground": "--builder-quickinput-focus-bg",
  "pickerGroup.border": "--builder-picker-group-border",
  "pickerGroup.foreground": "--builder-picker-group-fg",

  // Menu
  "menu.background": "--builder-menu-bg",
  "menu.foreground": "--builder-menu-fg",
  "menu.selectionBackground": "--builder-menu-selection-bg",
  "menu.selectionForeground": "--builder-menu-selection-fg",
  "menu.separatorBackground": "--builder-menu-separator",
  "menu.border": "--builder-menu-border",

  // Toolbar
  "toolbar.hoverBackground": "--builder-toolbar-hover-bg",
  "toolbar.activeBackground": "--builder-toolbar-active-bg",

  // Notification
  "notificationCenterHeader.background": "--builder-notification-header-bg",
  "notifications.background": "--builder-notification-bg",
  "notifications.border": "--builder-notification-border",
  "notificationLink.foreground": "--builder-notification-link-fg",
  "notificationsErrorIcon.foreground": "--builder-notification-error-icon",
  "notificationsWarningIcon.foreground": "--builder-notification-warning-icon",
  "notificationsInfoIcon.foreground": "--builder-notification-info-icon",

  // Breadcrumb
  "breadcrumb.background": "--builder-breadcrumb-bg",
  "breadcrumb.foreground": "--builder-breadcrumb-fg",
  "breadcrumb.focusForeground": "--builder-breadcrumb-focus-fg",
  "breadcrumb.activeSelectionForeground": "--builder-breadcrumb-active-fg",
  "breadcrumbPicker.background": "--builder-breadcrumb-picker-bg",

  // Text Link
  "textLink.foreground": "--builder-link-fg",
  "textLink.activeForeground": "--builder-link-active-fg",

  // Settings
  "settings.headerForeground": "--builder-settings-header-fg",

  // Charts
  "charts.foreground": "--builder-chart-fg",
  "charts.lines": "--builder-chart-lines",
  "charts.red": "--builder-chart-red",
  "charts.blue": "--builder-chart-blue",
  "charts.yellow": "--builder-chart-yellow",
  "charts.orange": "--builder-chart-orange",
  "charts.green": "--builder-chart-green",
  "charts.purple": "--builder-chart-purple",

  // Action Bar
  "actionBar.toggledBackground": "--builder-actionbar-toggled-bg",

  // Extension Button
  "extensionButton.prominentBackground": "--builder-ext-button-bg",
  "extensionButton.prominentForeground": "--builder-ext-button-fg",
  "extensionButton.prominentHoverBackground": "--builder-ext-button-hover-bg",
};

// ==================== Utility Functions ====================

/**
 * Convert VS Code color key to CSS custom property
 */
function vsCodeKeyToCSSVar(key: string): string {
  return (
    VS_CODE_TO_CSS_MAP[key as keyof VSCodeWorkbenchColors] ||
    `--builder-${key.replace(/\./g, "-")}`
  );
}

/**
 * Generate CSS variables from theme colors
 */
function generateThemeCSS(theme: BuilderTheme): string {
  const cssVars: string[] = [];

  for (const [key, value] of Object.entries(theme.colors)) {
    if (value) {
      const cssVar = vsCodeKeyToCSSVar(key);
      cssVars.push(`  ${cssVar}: ${value};`);
    }
  }

  // Also set semantic aliases that map to existing builder CSS
  const semanticAliases = generateSemanticAliases(theme);

  return `:root[data-builder-theme="${theme.type}"] {\n${cssVars.join("\n")}\n${semanticAliases}\n}`;
}

/**
 * Generate semantic CSS aliases for backward compatibility
 * Maps new builder theme vars to existing CSS variable names
 */
function generateSemanticAliases(theme: BuilderTheme): string {
  const colors = theme.colors;
  const aliases: string[] = [];

  // Map to existing builder-system.css variables
  if (colors["editor.background"])
    aliases.push(`  --background-color: ${colors["editor.background"]};`);
  if (colors["editor.foreground"])
    aliases.push(`  --text-color: ${colors["editor.foreground"]};`);
  if (colors["sideBar.border"])
    aliases.push(`  --border-color: ${colors["sideBar.border"]};`);

  // Button mappings
  if (colors["button.background"])
    aliases.push(`  --button-background: ${colors["button.background"]};`);
  if (colors["button.hoverBackground"])
    aliases.push(
      `  --button-background-hover: ${colors["button.hoverBackground"]};`
    );
  if (colors["button.foreground"])
    aliases.push(`  --highlight-foreground: ${colors["button.foreground"]};`);

  // Input mappings
  if (colors["input.background"])
    aliases.push(`  --field-background: ${colors["input.background"]};`);
  if (colors["input.foreground"])
    aliases.push(`  --field-text-color: ${colors["input.foreground"]};`);

  // Focus ring
  if (colors.focusBorder)
    aliases.push(`  --focus-ring-color: ${colors.focusBorder};`);

  // Highlight (primary action color)
  if (colors["button.background"]) {
    aliases.push(`  --highlight-background: ${colors["button.background"]};`);
    aliases.push(`  --primary: ${colors["button.background"]};`);
  }

  // Surface colors
  if (colors["sideBar.background"])
    aliases.push(`  --surface: ${colors["sideBar.background"]};`);
  if (colors["editor.foreground"])
    aliases.push(`  --on-surface: ${colors["editor.foreground"]};`);

  // Overlay
  if (colors["editorWidget.background"])
    aliases.push(
      `  --overlay-background: ${colors["editorWidget.background"]};`
    );

  return aliases.join("\n");
}

/**
 * Inject theme CSS into the document
 */
function injectThemeCSS(theme: BuilderTheme): void {
  // Remove existing theme style
  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element
  const styleEl = document.createElement("style");
  styleEl.id = STYLE_ID;
  styleEl.textContent = generateThemeCSS(theme);
  document.head.appendChild(styleEl);

  // Set theme type attribute
  document.documentElement.setAttribute("data-builder-theme", theme.type);
  document.documentElement.setAttribute("data-builder-theme-id", theme.id);
}

/**
 * Load theme ID from localStorage
 */
function loadStoredThemeId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && BUILDER_THEMES[stored]) {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return DEFAULT_THEME_ID;
}

/**
 * Save theme ID to localStorage
 */
function saveThemeId(themeId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, themeId);
  } catch {
    // localStorage not available
  }
}

// ==================== Store Interface ====================

interface BuilderThemeStore {
  // State
  activeThemeId: string;
  themes: Record<string, BuilderTheme>;
  loading: boolean;
  error: string | null;

  // Actions
  setTheme: (themeId: string) => void;
  registerTheme: (theme: BuilderTheme) => void;
  removeTheme: (themeId: string) => void;
  getTheme: (themeId: string) => BuilderTheme | undefined;
  getThemeList: () => BuilderThemeMetadata[];
  getActiveTheme: () => BuilderTheme | undefined;
  initialize: () => void;
  resetToDefault: () => void;
}

// ==================== Store Implementation ====================

export const useBuilderThemeStore = create<BuilderThemeStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      activeThemeId: DEFAULT_THEME_ID,
      themes: { ...BUILDER_THEMES },
      loading: false,
      error: null,

      // Set active theme
      setTheme: (themeId: string) => {
        const { themes } = get();
        const theme = themes[themeId];

        if (!theme) {
          set({ error: `Theme not found: ${themeId}` });
          return;
        }

        // Inject CSS
        injectThemeCSS(theme);

        // Save to localStorage
        saveThemeId(themeId);

        // Update state
        set({ activeThemeId: themeId, error: null });
      },

      // Register a new theme
      registerTheme: (theme: BuilderTheme) => {
        set((state) => ({
          themes: { ...state.themes, [theme.id]: theme },
        }));
      },

      // Remove a theme
      removeTheme: (themeId: string) => {
        const { activeThemeId, themes } = get();

        // Can't remove active theme
        if (themeId === activeThemeId) {
          set({ error: "Cannot remove active theme" });
          return;
        }

        // Can't remove built-in themes
        if (BUILDER_THEMES[themeId]) {
          set({ error: "Cannot remove built-in theme" });
          return;
        }

        const { [themeId]: _, ...remainingThemes } = themes;
        set({ themes: remainingThemes, error: null });
      },

      // Get theme by ID
      getTheme: (themeId: string) => {
        return get().themes[themeId];
      },

      // Get all themes as metadata for UI
      getThemeList: () => {
        const { themes } = get();
        return Object.values(themes).map((theme) => ({
          id: theme.id,
          name: theme.name,
          type: theme.type,
          author: theme.author,
          preview: {
            background: theme.colors["editor.background"] || "#1E1E1E",
            foreground: theme.colors["editor.foreground"] || "#D4D4D4",
            accent: theme.colors["button.background"] || "#007ACC",
          },
        }));
      },

      // Get active theme
      getActiveTheme: () => {
        const { activeThemeId, themes } = get();
        return themes[activeThemeId];
      },

      // Initialize from localStorage
      initialize: () => {
        const storedThemeId = loadStoredThemeId();
        const { themes, setTheme } = get();

        if (themes[storedThemeId]) {
          setTheme(storedThemeId);
        } else {
          setTheme(DEFAULT_THEME_ID);
        }
      },

      // Reset to default theme
      resetToDefault: () => {
        get().setTheme(DEFAULT_THEME_ID);
      },
    }),
    { name: "builder-theme-store" }
  )
);

// ==================== Hooks ====================

/**
 * Hook to get current theme
 */
export const useActiveBuilderTheme = () => {
  const activeThemeId = useBuilderThemeStore((state) => state.activeThemeId);
  const themes = useBuilderThemeStore((state) => state.themes);
  return themes[activeThemeId];
};

/**
 * Hook to get theme metadata list
 */
export const useBuilderThemeList = () => {
  const getThemeList = useBuilderThemeStore((state) => state.getThemeList);
  return getThemeList();
};

/**
 * Hook to check if current theme is dark
 */
export const useIsBuilderDarkTheme = () => {
  const theme = useActiveBuilderTheme();
  return theme?.type === "dark";
};
