/**
 * VS Code Light+ Theme
 * Based on VS Code's default light theme
 * @see https://github.com/microsoft/vscode/tree/main/extensions/theme-defaults
 */
import type { BuilderTheme } from "../types";

export const vsLight: BuilderTheme = {
  id: "vs-light",
  name: "Light+ (VS Code)",
  type: "light",
  author: "Microsoft",
  colors: {
    // Base Colors
    foreground: "#616161",
    disabledForeground: "#61616180",
    focusBorder: "#0090F1",
    "widget.shadow": "#00000029",
    "widget.border": "#D4D4D4",
    "selection.background": "#ADD6FF",
    descriptionForeground: "#717171",
    errorForeground: "#A1260D",
    "icon.foreground": "#424242",

    // Window Border
    "window.activeBorder": "#DDDDDD",
    "window.inactiveBorder": "#DDDDDD",

    // Activity Bar (Panel Nav)
    "activityBar.background": "#2C2C2C",
    "activityBar.foreground": "#FFFFFF",
    "activityBar.inactiveForeground": "#FFFFFF66",
    "activityBar.border": "#2C2C2C",
    "activityBarBadge.background": "#007ACC",
    "activityBarBadge.foreground": "#FFFFFF",

    // Side Bar
    "sideBar.background": "#F3F3F3",
    "sideBar.foreground": "#616161",
    "sideBar.border": "#E7E7E7",
    "sideBarTitle.foreground": "#6F6F6F",
    "sideBarSectionHeader.background": "#00000000",
    "sideBarSectionHeader.foreground": "#616161",
    "sideBarSectionHeader.border": "#61616130",
    "sideBar.dropBackground": "#E8E8E8",

    // Editor / Canvas
    "editor.background": "#FFFFFF",
    "editor.foreground": "#000000",
    "editorWidget.background": "#F3F3F3",
    "editorWidget.foreground": "#616161",
    "editorWidget.border": "#C8C8C8",
    "editorGroup.border": "#E7E7E7",
    "editorGroup.dropBackground": "#2677CB2E",
    "editorPane.background": "#FFFFFF",

    // Title Bar (Header)
    "titleBar.activeBackground": "#DDDDDD",
    "titleBar.activeForeground": "#333333",
    "titleBar.inactiveBackground": "#DDDDDD99",
    "titleBar.inactiveForeground": "#33333399",
    "titleBar.border": "#DDDDDD",

    // Tab (Header)
    "tab.activeBackground": "#FFFFFF",
    "tab.activeForeground": "#333333",
    "tab.inactiveBackground": "#ECECEC",
    "tab.inactiveForeground": "#333333B3",
    "tab.border": "#F3F3F3",
    "tab.activeBorder": "#FFFFFF",
    "tab.hoverBackground": "#E8E8E8",
    "editorGroupHeader.tabsBackground": "#F3F3F3",
    "editorGroupHeader.tabsBorder": "#F3F3F3",

    // Panel (Footer / Monitor)
    "panel.background": "#FFFFFF",
    "panel.border": "#80808059",
    "panelTitle.activeForeground": "#424242",
    "panelTitle.inactiveForeground": "#42424299",
    "panelTitle.activeBorder": "#424242",
    "panelInput.border": "#DDDDDD",

    // Status Bar
    "statusBar.background": "#007ACC",
    "statusBar.foreground": "#FFFFFF",
    "statusBar.border": "#007ACC",
    "statusBar.debuggingBackground": "#CC6633",
    "statusBar.debuggingForeground": "#FFFFFF",
    "statusBar.noFolderBackground": "#68217A",
    "statusBarItem.activeBackground": "#FFFFFF25",
    "statusBarItem.hoverBackground": "#FFFFFF1F",
    "statusBarItem.prominentBackground": "#00000080",

    // Input Controls
    "input.background": "#FFFFFF",
    "input.foreground": "#616161",
    "input.border": "#CECECE",
    "input.placeholderForeground": "#767676",
    "inputOption.activeBorder": "#007ACC",
    "inputOption.activeBackground": "#007ACC40",
    "inputOption.activeForeground": "#000000",
    "inputValidation.infoBackground": "#D6ECF2",
    "inputValidation.infoBorder": "#007ACC",
    "inputValidation.warningBackground": "#F6F5D2",
    "inputValidation.warningBorder": "#B89500",
    "inputValidation.errorBackground": "#F2DEDE",
    "inputValidation.errorBorder": "#BE1100",

    // Dropdown
    "dropdown.background": "#FFFFFF",
    "dropdown.foreground": "#616161",
    "dropdown.border": "#CECECE",
    "dropdown.listBackground": "#FFFFFF",

    // Button
    "button.background": "#007ACC",
    "button.foreground": "#FFFFFF",
    "button.hoverBackground": "#0062A3",
    "button.secondaryBackground": "#5F6A79",
    "button.secondaryForeground": "#FFFFFF",
    "button.secondaryHoverBackground": "#4C5561",

    // Badge
    "badge.background": "#C4C4C4",
    "badge.foreground": "#333333",

    // Scrollbar
    "scrollbar.shadow": "#DDDDDD",
    "scrollbarSlider.background": "#64646466",
    "scrollbarSlider.hoverBackground": "#646464B3",
    "scrollbarSlider.activeBackground": "#00000099",

    // Progress Bar
    "progressBar.background": "#0E70C0",

    // List / Tree
    "list.activeSelectionBackground": "#0060C0",
    "list.activeSelectionForeground": "#FFFFFF",
    "list.activeSelectionIconForeground": "#FFFFFF",
    "list.inactiveSelectionBackground": "#E4E6F1",
    "list.inactiveSelectionForeground": "#222222",
    "list.hoverBackground": "#E8E8E8",
    "list.hoverForeground": "#222222",
    "list.focusBackground": "#D6EBFF",
    "list.focusForeground": "#222222",
    "list.dropBackground": "#D6EBFF",
    "list.highlightForeground": "#0066BF",
    "list.errorForeground": "#B01011",
    "list.warningForeground": "#855F00",
    "tree.indentGuidesStroke": "#A9A9A9",

    // Quick Input / Picker
    "quickInput.background": "#F3F3F3",
    "quickInput.foreground": "#616161",
    "quickInputList.focusBackground": "#0060C0",
    "pickerGroup.border": "#CCCEDB",
    "pickerGroup.foreground": "#0066BF",

    // Menu
    "menu.background": "#FFFFFF",
    "menu.foreground": "#616161",
    "menu.selectionBackground": "#0060C0",
    "menu.selectionForeground": "#FFFFFF",
    "menu.separatorBackground": "#D4D4D4",
    "menu.border": "#D4D4D4",

    // Toolbar
    "toolbar.hoverBackground": "#B8B8B850",
    "toolbar.activeBackground": "#DDDDDD",

    // Notification
    "notificationCenterHeader.background": "#E7E7E7",
    "notifications.background": "#F3F3F3",
    "notifications.border": "#E7E7E7",
    "notificationLink.foreground": "#006AB1",
    "notificationsErrorIcon.foreground": "#E51400",
    "notificationsWarningIcon.foreground": "#BF8803",
    "notificationsInfoIcon.foreground": "#1A85FF",

    // Breadcrumb
    "breadcrumb.background": "#FFFFFF",
    "breadcrumb.foreground": "#616161CC",
    "breadcrumb.focusForeground": "#4E4E4E",
    "breadcrumb.activeSelectionForeground": "#4E4E4E",
    "breadcrumbPicker.background": "#F3F3F3",

    // Text Link
    "textLink.foreground": "#006AB1",
    "textLink.activeForeground": "#006AB1",

    // Settings
    "settings.headerForeground": "#444444",

    // Charts
    "charts.foreground": "#616161",
    "charts.lines": "#61616180",
    "charts.red": "#E51400",
    "charts.blue": "#1A85FF",
    "charts.yellow": "#BF8803",
    "charts.orange": "#D18616",
    "charts.green": "#388A34",
    "charts.purple": "#652D90",

    // Action Bar
    "actionBar.toggledBackground": "#DDDDDD",

    // Extension Button
    "extensionButton.prominentBackground": "#007ACC",
    "extensionButton.prominentForeground": "#FFFFFF",
    "extensionButton.prominentHoverBackground": "#0062A3",
  },
};
