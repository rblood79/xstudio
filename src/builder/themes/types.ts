/**
 * Builder Theme Types - VS Code Compatible
 *
 * Uses VS Code's standard color key naming conventions for compatibility
 * with existing VS Code themes. Themes can be imported directly or
 * converted from VS Code theme JSON files.
 *
 * @see https://code.visualstudio.com/api/references/theme-color
 */

/**
 * VS Code compatible workbench colors
 * Only includes colors relevant to Builder UI (not code editor syntax)
 */
export interface VSCodeWorkbenchColors {
  // ==================== Base Colors ====================
  /** Overall foreground color */
  foreground?: string;
  /** Overall foreground for disabled elements */
  disabledForeground?: string;
  /** Overall border color for focused elements */
  focusBorder?: string;
  /** Shadow color of widgets */
  "widget.shadow"?: string;
  /** Border color of widgets */
  "widget.border"?: string;
  /** Background color of text selections */
  "selection.background"?: string;
  /** Foreground color for description text */
  descriptionForeground?: string;
  /** Foreground color for error messages */
  errorForeground?: string;
  /** Foreground color for icons */
  "icon.foreground"?: string;

  // ==================== Window Border ====================
  "window.activeBorder"?: string;
  "window.inactiveBorder"?: string;

  // ==================== Activity Bar ====================
  /** Activity Bar background color */
  "activityBar.background"?: string;
  /** Activity Bar foreground color (icons) */
  "activityBar.foreground"?: string;
  /** Activity Bar inactive foreground */
  "activityBar.inactiveForeground"?: string;
  /** Activity Bar border color */
  "activityBar.border"?: string;
  /** Activity Bar badge background */
  "activityBarBadge.background"?: string;
  /** Activity Bar badge foreground */
  "activityBarBadge.foreground"?: string;

  // ==================== Side Bar ====================
  /** Side Bar background color */
  "sideBar.background"?: string;
  /** Side Bar foreground color */
  "sideBar.foreground"?: string;
  /** Side Bar border color */
  "sideBar.border"?: string;
  /** Side Bar title foreground */
  "sideBarTitle.foreground"?: string;
  /** Side Bar section header background */
  "sideBarSectionHeader.background"?: string;
  /** Side Bar section header foreground */
  "sideBarSectionHeader.foreground"?: string;
  /** Side Bar section header border */
  "sideBarSectionHeader.border"?: string;
  /** Side Bar drop background */
  "sideBar.dropBackground"?: string;

  // ==================== Editor / Canvas ====================
  /** Editor background color */
  "editor.background"?: string;
  /** Editor foreground color */
  "editor.foreground"?: string;
  /** Editor widget background */
  "editorWidget.background"?: string;
  /** Editor widget foreground */
  "editorWidget.foreground"?: string;
  /** Editor widget border */
  "editorWidget.border"?: string;
  /** Editor group border */
  "editorGroup.border"?: string;
  /** Editor group drop background */
  "editorGroup.dropBackground"?: string;
  /** Editor pane background */
  "editorPane.background"?: string;

  // ==================== Title Bar ====================
  /** Title Bar active background */
  "titleBar.activeBackground"?: string;
  /** Title Bar active foreground */
  "titleBar.activeForeground"?: string;
  /** Title Bar inactive background */
  "titleBar.inactiveBackground"?: string;
  /** Title Bar inactive foreground */
  "titleBar.inactiveForeground"?: string;
  /** Title Bar border */
  "titleBar.border"?: string;

  // ==================== Tab (Header) ====================
  /** Active tab background */
  "tab.activeBackground"?: string;
  /** Active tab foreground */
  "tab.activeForeground"?: string;
  /** Inactive tab background */
  "tab.inactiveBackground"?: string;
  /** Inactive tab foreground */
  "tab.inactiveForeground"?: string;
  /** Tab border */
  "tab.border"?: string;
  /** Active tab border */
  "tab.activeBorder"?: string;
  /** Tab hover foreground */
  "tab.hoverForeground"?: string;
  /** Tab hover background */
  "tab.hoverBackground"?: string;
  /** Editor group header tabs background */
  "editorGroupHeader.tabsBackground"?: string;
  /** Editor group header tabs border */
  "editorGroupHeader.tabsBorder"?: string;

  // ==================== Panel (Footer / Monitor) ====================
  /** Panel background color */
  "panel.background"?: string;
  /** Panel border color */
  "panel.border"?: string;
  /** Panel title active foreground */
  "panelTitle.activeForeground"?: string;
  /** Panel title inactive foreground */
  "panelTitle.inactiveForeground"?: string;
  /** Panel title active border */
  "panelTitle.activeBorder"?: string;
  /** Panel input border */
  "panelInput.border"?: string;

  // ==================== Status Bar ====================
  /** Status Bar background */
  "statusBar.background"?: string;
  /** Status Bar foreground */
  "statusBar.foreground"?: string;
  /** Status Bar border */
  "statusBar.border"?: string;
  /** Status Bar debugging background */
  "statusBar.debuggingBackground"?: string;
  /** Status Bar debugging foreground */
  "statusBar.debuggingForeground"?: string;
  /** Status Bar no folder background */
  "statusBar.noFolderBackground"?: string;
  /** Status Bar item active background */
  "statusBarItem.activeBackground"?: string;
  /** Status Bar item hover background */
  "statusBarItem.hoverBackground"?: string;
  /** Status Bar item prominent background */
  "statusBarItem.prominentBackground"?: string;

  // ==================== Input Controls ====================
  /** Input background */
  "input.background"?: string;
  /** Input foreground */
  "input.foreground"?: string;
  /** Input border */
  "input.border"?: string;
  /** Input placeholder foreground */
  "input.placeholderForeground"?: string;
  /** Input option active border */
  "inputOption.activeBorder"?: string;
  /** Input option active background */
  "inputOption.activeBackground"?: string;
  /** Input option active foreground */
  "inputOption.activeForeground"?: string;
  /** Input validation info background */
  "inputValidation.infoBackground"?: string;
  /** Input validation info border */
  "inputValidation.infoBorder"?: string;
  /** Input validation warning background */
  "inputValidation.warningBackground"?: string;
  /** Input validation warning border */
  "inputValidation.warningBorder"?: string;
  /** Input validation error background */
  "inputValidation.errorBackground"?: string;
  /** Input validation error border */
  "inputValidation.errorBorder"?: string;

  // ==================== Dropdown ====================
  /** Dropdown background */
  "dropdown.background"?: string;
  /** Dropdown foreground */
  "dropdown.foreground"?: string;
  /** Dropdown border */
  "dropdown.border"?: string;
  /** Dropdown list background */
  "dropdown.listBackground"?: string;

  // ==================== Button ====================
  /** Button background */
  "button.background"?: string;
  /** Button foreground */
  "button.foreground"?: string;
  /** Button hover background */
  "button.hoverBackground"?: string;
  /** Button secondary background */
  "button.secondaryBackground"?: string;
  /** Button secondary foreground */
  "button.secondaryForeground"?: string;
  /** Button secondary hover background */
  "button.secondaryHoverBackground"?: string;

  // ==================== Badge ====================
  /** Badge background */
  "badge.background"?: string;
  /** Badge foreground */
  "badge.foreground"?: string;

  // ==================== Scrollbar ====================
  /** Scrollbar shadow */
  "scrollbar.shadow"?: string;
  /** Scrollbar slider background */
  "scrollbarSlider.background"?: string;
  /** Scrollbar slider hover background */
  "scrollbarSlider.hoverBackground"?: string;
  /** Scrollbar slider active background */
  "scrollbarSlider.activeBackground"?: string;

  // ==================== Progress Bar ====================
  /** Progress bar background */
  "progressBar.background"?: string;

  // ==================== List / Tree ====================
  /** List active selection background */
  "list.activeSelectionBackground"?: string;
  /** List active selection foreground */
  "list.activeSelectionForeground"?: string;
  /** List active selection icon foreground */
  "list.activeSelectionIconForeground"?: string;
  /** List inactive selection background */
  "list.inactiveSelectionBackground"?: string;
  /** List inactive selection foreground */
  "list.inactiveSelectionForeground"?: string;
  /** List hover background */
  "list.hoverBackground"?: string;
  /** List hover foreground */
  "list.hoverForeground"?: string;
  /** List focus background */
  "list.focusBackground"?: string;
  /** List focus foreground */
  "list.focusForeground"?: string;
  /** List drop background */
  "list.dropBackground"?: string;
  /** List highlight foreground */
  "list.highlightForeground"?: string;
  /** List error foreground */
  "list.errorForeground"?: string;
  /** List warning foreground */
  "list.warningForeground"?: string;
  /** Tree indent guides stroke */
  "tree.indentGuidesStroke"?: string;

  // ==================== Quick Input / Picker ====================
  /** Quick input background */
  "quickInput.background"?: string;
  /** Quick input foreground */
  "quickInput.foreground"?: string;
  /** Quick input list focus background */
  "quickInputList.focusBackground"?: string;
  /** Picker group border */
  "pickerGroup.border"?: string;
  /** Picker group foreground */
  "pickerGroup.foreground"?: string;

  // ==================== Menu ====================
  /** Menu background */
  "menu.background"?: string;
  /** Menu foreground */
  "menu.foreground"?: string;
  /** Menu selection background */
  "menu.selectionBackground"?: string;
  /** Menu selection foreground */
  "menu.selectionForeground"?: string;
  /** Menu separator background */
  "menu.separatorBackground"?: string;
  /** Menu border */
  "menu.border"?: string;

  // ==================== Toolbar ====================
  /** Toolbar hover background */
  "toolbar.hoverBackground"?: string;
  /** Toolbar active background */
  "toolbar.activeBackground"?: string;

  // ==================== Notification ====================
  /** Notification center header background */
  "notificationCenterHeader.background"?: string;
  /** Notifications background */
  "notifications.background"?: string;
  /** Notifications border */
  "notifications.border"?: string;
  /** Notification link foreground */
  "notificationLink.foreground"?: string;
  /** Notifications error icon foreground */
  "notificationsErrorIcon.foreground"?: string;
  /** Notifications warning icon foreground */
  "notificationsWarningIcon.foreground"?: string;
  /** Notifications info icon foreground */
  "notificationsInfoIcon.foreground"?: string;

  // ==================== Breadcrumb ====================
  /** Breadcrumb background */
  "breadcrumb.background"?: string;
  /** Breadcrumb foreground */
  "breadcrumb.foreground"?: string;
  /** Breadcrumb focus foreground */
  "breadcrumb.focusForeground"?: string;
  /** Breadcrumb active selection foreground */
  "breadcrumb.activeSelectionForeground"?: string;
  /** Breadcrumb picker background */
  "breadcrumbPicker.background"?: string;

  // ==================== Text Link ====================
  /** Text link foreground */
  "textLink.foreground"?: string;
  /** Text link active foreground */
  "textLink.activeForeground"?: string;

  // ==================== Settings ====================
  /** Settings header foreground */
  "settings.headerForeground"?: string;

  // ==================== Charts ====================
  /** Charts foreground */
  "charts.foreground"?: string;
  /** Charts lines */
  "charts.lines"?: string;
  /** Charts red */
  "charts.red"?: string;
  /** Charts blue */
  "charts.blue"?: string;
  /** Charts yellow */
  "charts.yellow"?: string;
  /** Charts orange */
  "charts.orange"?: string;
  /** Charts green */
  "charts.green"?: string;
  /** Charts purple */
  "charts.purple"?: string;

  // ==================== Action Bar ====================
  /** Action bar toggled background */
  "actionBar.toggledBackground"?: string;

  // ==================== Extension Button ====================
  /** Extension button prominent background */
  "extensionButton.prominentBackground"?: string;
  /** Extension button prominent foreground */
  "extensionButton.prominentForeground"?: string;
  /** Extension button prominent hover background */
  "extensionButton.prominentHoverBackground"?: string;
}

/**
 * Builder Theme Definition
 * Compatible with VS Code theme JSON structure
 */
export interface BuilderTheme {
  /** Unique theme identifier (e.g., "tokyo-night", "vs-dark") */
  id: string;

  /** Display name (e.g., "Tokyo Night", "Dark+") */
  name: string;

  /** Theme type - determines base styling behavior */
  type: "dark" | "light";

  /** VS Code compatible workbench colors */
  colors: VSCodeWorkbenchColors;

  /** Optional: Theme this extends from */
  include?: string;

  /** Optional: Theme author */
  author?: string;

  /** Optional: Theme version */
  version?: string;
}

/**
 * Theme metadata for display in UI
 */
export interface BuilderThemeMetadata {
  id: string;
  name: string;
  type: "dark" | "light";
  author?: string;
  preview?: {
    background: string;
    foreground: string;
    accent: string;
  };
}

/**
 * Mapping from VS Code color keys to CSS custom properties
 * Used for injecting theme colors into the DOM
 */
export type VSCodeToCSSMapping = {
  [K in keyof VSCodeWorkbenchColors]?: string;
};

/**
 * Builder Theme Store State
 */
export interface BuilderThemeState {
  /** Currently active theme ID */
  activeThemeId: string;

  /** All available themes */
  themes: Record<string, BuilderTheme>;

  /** Loading state */
  loading: boolean;

  /** Error message */
  error: string | null;
}

/**
 * Builder Theme Store Actions
 */
export interface BuilderThemeActions {
  /** Set the active theme */
  setTheme: (themeId: string) => void;

  /** Register a new theme */
  registerTheme: (theme: BuilderTheme) => void;

  /** Remove a theme */
  removeTheme: (themeId: string) => void;

  /** Get theme by ID */
  getTheme: (themeId: string) => BuilderTheme | undefined;

  /** Get all theme metadata for UI display */
  getThemeList: () => BuilderThemeMetadata[];

  /** Initialize themes from localStorage */
  initialize: () => void;

  /** Reset to default theme */
  resetToDefault: () => void;
}
