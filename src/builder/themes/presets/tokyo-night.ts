/**
 * Tokyo Night Theme
 * A clean, dark theme that celebrates the lights of Downtown Tokyo at night.
 * @see https://github.com/tokyo-night/tokyo-night-vscode-theme
 */
import type { BuilderTheme } from "../types";

export const tokyoNight: BuilderTheme = {
  id: "tokyo-night",
  name: "Tokyo Night",
  type: "dark",
  author: "enkia",
  colors: {
    // Base Colors
    foreground: "#787c99",
    disabledForeground: "#545c7e",
    focusBorder: "#545c7e33",
    "widget.shadow": "#ffffff00",
    "widget.border": "#101014",
    "selection.background": "#515c7e40",
    descriptionForeground: "#515670",
    errorForeground: "#515670",
    "icon.foreground": "#787c99",

    // Window Border
    "window.activeBorder": "#0d0f17",
    "window.inactiveBorder": "#0d0f17",

    // Activity Bar (Panel Nav)
    "activityBar.background": "#16161e",
    "activityBar.foreground": "#787c99",
    "activityBar.inactiveForeground": "#3b3e52",
    "activityBar.border": "#16161e",
    "activityBarBadge.background": "#3d59a1",
    "activityBarBadge.foreground": "#ffffff",

    // Side Bar
    "sideBar.background": "#16161e",
    "sideBar.foreground": "#787c99",
    "sideBar.border": "#101014",
    "sideBarTitle.foreground": "#787c99",
    "sideBarSectionHeader.background": "#16161e",
    "sideBarSectionHeader.foreground": "#a9b1d6",
    "sideBarSectionHeader.border": "#101014",
    "sideBar.dropBackground": "#1e202e",

    // Editor / Canvas
    "editor.background": "#1a1b26",
    "editor.foreground": "#a9b1d6",
    "editorWidget.background": "#16161e",
    "editorWidget.foreground": "#787c99",
    "editorWidget.border": "#101014",
    "editorGroup.border": "#101014",
    "editorGroup.dropBackground": "#1e202e",
    "editorPane.background": "#1a1b26",

    // Title Bar (Header)
    "titleBar.activeBackground": "#16161e",
    "titleBar.activeForeground": "#787c99",
    "titleBar.inactiveBackground": "#16161e",
    "titleBar.inactiveForeground": "#787c99",
    "titleBar.border": "#101014",

    // Tab (Header)
    "tab.activeBackground": "#16161e",
    "tab.activeForeground": "#a9b1d6",
    "tab.inactiveBackground": "#16161e",
    "tab.inactiveForeground": "#787c99",
    "tab.border": "#101014",
    "tab.activeBorder": "#3d59a1",
    "tab.hoverForeground": "#a9b1d6",
    "editorGroupHeader.tabsBackground": "#16161e",
    "editorGroupHeader.tabsBorder": "#101014",

    // Panel (Footer / Monitor)
    "panel.background": "#16161e",
    "panel.border": "#101014",
    "panelTitle.activeForeground": "#787c99",
    "panelTitle.inactiveForeground": "#42465d",
    "panelTitle.activeBorder": "#16161e",
    "panelInput.border": "#16161e",

    // Status Bar
    "statusBar.background": "#16161e",
    "statusBar.foreground": "#787c99",
    "statusBar.border": "#101014",
    "statusBar.debuggingBackground": "#16161e",
    "statusBar.debuggingForeground": "#787c99",
    "statusBar.noFolderBackground": "#16161e",
    "statusBarItem.activeBackground": "#101014",
    "statusBarItem.hoverBackground": "#20222c",
    "statusBarItem.prominentBackground": "#101014",

    // Input Controls
    "input.background": "#14141b",
    "input.foreground": "#a9b1d6",
    "input.border": "#0f0f14",
    "input.placeholderForeground": "#787c998A",
    "inputOption.activeBorder": "#3d59a1",
    "inputOption.activeBackground": "#3d59a144",
    "inputOption.activeForeground": "#c0caf5",
    "inputValidation.infoBackground": "#3d59a15c",
    "inputValidation.infoBorder": "#3d59a1",
    "inputValidation.warningBackground": "#c2985b",
    "inputValidation.warningBorder": "#e0af68",
    "inputValidation.errorBackground": "#85353e",
    "inputValidation.errorBorder": "#963c47",

    // Dropdown
    "dropdown.background": "#14141b",
    "dropdown.foreground": "#787c99",
    "dropdown.border": "#0f0f14",
    "dropdown.listBackground": "#14141b",

    // Button
    "button.background": "#3d59a1dd",
    "button.foreground": "#ffffff",
    "button.hoverBackground": "#3d59a1AA",
    "button.secondaryBackground": "#3b3e52",
    "button.secondaryForeground": "#a9b1d6",
    "button.secondaryHoverBackground": "#4a4f6a",

    // Badge
    "badge.background": "#7e83b230",
    "badge.foreground": "#acb0d0",

    // Scrollbar
    "scrollbar.shadow": "#00000033",
    "scrollbarSlider.background": "#868bc415",
    "scrollbarSlider.hoverBackground": "#868bc410",
    "scrollbarSlider.activeBackground": "#868bc422",

    // Progress Bar
    "progressBar.background": "#3d59a1",

    // List / Tree
    "list.activeSelectionBackground": "#202330",
    "list.activeSelectionForeground": "#a9b1d6",
    "list.inactiveSelectionBackground": "#1c1d29",
    "list.inactiveSelectionForeground": "#a9b1d6",
    "list.hoverBackground": "#13131a",
    "list.hoverForeground": "#a9b1d6",
    "list.focusBackground": "#1c1d29",
    "list.focusForeground": "#a9b1d6",
    "list.dropBackground": "#1e202e",
    "list.highlightForeground": "#668ac4",
    "list.errorForeground": "#bb616b",
    "list.warningForeground": "#c49a5a",
    "tree.indentGuidesStroke": "#2b2b3b",

    // Quick Input / Picker
    "quickInput.background": "#16161e",
    "quickInput.foreground": "#787c99",
    "quickInputList.focusBackground": "#20222c",
    "pickerGroup.border": "#101014",
    "pickerGroup.foreground": "#a9b1d6",

    // Menu
    "menu.background": "#16161e",
    "menu.foreground": "#787c99",
    "menu.selectionBackground": "#1e202e",
    "menu.selectionForeground": "#a9b1d6",
    "menu.separatorBackground": "#101014",
    "menu.border": "#101014",

    // Toolbar
    "toolbar.hoverBackground": "#202330",
    "toolbar.activeBackground": "#202330",

    // Notification
    "notificationCenterHeader.background": "#101014",
    "notifications.background": "#101014",
    "notifications.border": "#101014",
    "notificationLink.foreground": "#6183bb",
    "notificationsErrorIcon.foreground": "#bb616b",
    "notificationsWarningIcon.foreground": "#bba461",
    "notificationsInfoIcon.foreground": "#0da0ba",

    // Breadcrumb
    "breadcrumb.background": "#16161e",
    "breadcrumb.foreground": "#515670",
    "breadcrumb.focusForeground": "#a9b1d6",
    "breadcrumb.activeSelectionForeground": "#a9b1d6",
    "breadcrumbPicker.background": "#16161e",

    // Text Link
    "textLink.foreground": "#6183bb",
    "textLink.activeForeground": "#7dcfff",

    // Settings
    "settings.headerForeground": "#6183bb",

    // Charts
    "charts.foreground": "#9AA5CE",
    "charts.lines": "#16161e",
    "charts.red": "#f7768e",
    "charts.blue": "#7aa2f7",
    "charts.yellow": "#e0af68",
    "charts.orange": "#ff9e64",
    "charts.green": "#41a6b5",
    "charts.purple": "#9d7cd8",

    // Action Bar
    "actionBar.toggledBackground": "#202330",

    // Extension Button
    "extensionButton.prominentBackground": "#3d59a1DD",
    "extensionButton.prominentForeground": "#ffffff",
    "extensionButton.prominentHoverBackground": "#3d59a1AA",
  },
};
