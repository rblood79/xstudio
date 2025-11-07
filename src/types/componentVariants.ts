/**
 * Component Variant & Size Type Definitions
 *
 * This file defines shared type definitions for component variants and sizes
 * to ensure consistency across the component library.
 *
 * @created 2025-11-07
 * @see {@link /docs/implementation/COMPONENT_MIGRATION_PLAN.md}
 */

// ============================================================================
// Size Types
// ============================================================================

/**
 * Full size scale for components
 * Used by: Button, and potentially other interactive components
 */
export type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Subset of sizes (3 options)
 * Used by: Separator, and components with limited size variations
 */
export type ComponentSizeSubset = "sm" | "md" | "lg";

/**
 * Density-based sizing for layouts
 * Used by: Tables, Lists, and layout components
 */
export type DensitySize = "compact" | "comfortable" | "relaxed" | "spacious";

/**
 * Legacy size values (to be migrated)
 * @deprecated Use ComponentSize or ComponentSizeSubset instead
 */
export type LegacySize = "small" | "medium" | "large";

// ============================================================================
// Button Variants
// ============================================================================

/**
 * Button visual variants
 * Used by: Button component
 *
 * - default: Default style (base button styles)
 * - primary: Main call-to-action (uses --button-primary-* tokens)
 * - secondary: Secondary actions (uses --button-secondary-* tokens)
 * - surface: Surface-level actions (uses --button-surface-* tokens)
 * - outline: Outlined style (uses --button-outline-* tokens)
 * - ghost: Minimal style (uses --button-ghost-* tokens)
 */
export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "surface"
  | "outline"
  | "ghost";

// ============================================================================
// Field/Input Variants
// ============================================================================

/**
 * Field/Input visual variants
 * Used by: TextField, TextArea, and other form inputs
 *
 * - default: Standard field style
 * - filled: Filled background style (uses --field-background-filled)
 * - outlined: Outlined border style
 */
export type FieldVariant = "default" | "filled" | "outlined";

// ============================================================================
// Card/Panel Variants
// ============================================================================

/**
 * Card visual variants
 * Used by: Card component
 *
 * - default: Standard card style
 * - primary: Primary action card (uses --action-primary-* tokens)
 * - secondary: Secondary action card (uses --action-secondary-* tokens)
 * - surface: Surface action card (uses --action-surface-* tokens)
 * - elevated: Card with shadow elevation
 * - outlined: Card with border outline
 */
export type CardVariant =
  | "default"
  | "primary"
  | "secondary"
  | "surface"
  | "elevated"
  | "outlined";

/**
 * Panel visual variants
 * Used by: Panel component
 *
 * - default: Standard panel
 * - tab: Tab panel style
 * - sidebar: Sidebar panel style
 * - card: Card-like panel
 * - modal: Modal panel style
 */
export type PanelVariant = "default" | "tab" | "sidebar" | "card" | "modal";

// ============================================================================
// Separator Variants
// ============================================================================

/**
 * Separator visual variants
 * Used by: Separator component
 *
 * - default: Solid line
 * - dashed: Dashed line
 * - dotted: Dotted line
 */
export type SeparatorVariant = "default" | "dashed" | "dotted";

// ============================================================================
// Tag Variants
// ============================================================================

/**
 * Tag visual variants
 * Used by: Tag component (within TagGroup)
 *
 * - default: Standard tag style
 * - primary: Primary action tag (uses --action-primary-* tokens)
 * - secondary: Secondary action tag (uses --action-secondary-* tokens)
 * - surface: Surface action tag (uses --action-surface-* tokens)
 */
export type TagVariant = "default" | "primary" | "secondary" | "surface";

// ============================================================================
// ProgressBar Variants
// ============================================================================

/**
 * ProgressBar visual variants
 * Used by: ProgressBar component
 *
 * - default: Standard progress bar style
 * - primary: Primary progress (uses --action-primary-bg token)
 * - secondary: Secondary progress (uses --action-secondary-bg token)
 * - surface: Surface progress (uses --action-surface-bg token)
 */
export type ProgressBarVariant =
  | "default"
  | "primary"
  | "secondary"
  | "surface";

// ============================================================================
// Meter Variants
// ============================================================================

/**
 * Meter visual variants
 * Used by: Meter component
 *
 * - default: Standard meter style
 * - primary: Primary meter (uses --action-primary-bg token)
 * - secondary: Secondary meter (uses --action-secondary-bg token)
 * - surface: Surface meter (uses --action-surface-bg token)
 */
export type MeterVariant = "default" | "primary" | "secondary" | "surface";

// ============================================================================
// Switch Variants
// ============================================================================

/**
 * Switch visual variants
 * Used by: Switch component
 *
 * - default: Standard switch style
 * - primary: Primary switch (uses --action-primary-bg token when selected)
 * - secondary: Secondary switch (uses --action-secondary-bg token when selected)
 * - surface: Surface switch (uses --action-surface-bg token when selected)
 */
export type SwitchVariant = "default" | "primary" | "secondary" | "surface";

// ============================================================================
// Checkbox Variants
// ============================================================================

/**
 * Checkbox visual variants
 * Used by: Checkbox component
 *
 * - default: Standard checkbox style
 * - primary: Primary checkbox (uses --action-primary-bg token when selected)
 * - secondary: Secondary checkbox (uses --action-secondary-bg token when selected)
 * - surface: Surface checkbox (uses --action-surface-bg token when selected)
 */
export type CheckboxVariant = "default" | "primary" | "secondary" | "surface";

// ============================================================================
// Radio Variants
// ============================================================================

/**
 * Radio visual variants
 * Used by: RadioGroup component (controls child Radio buttons)
 *
 * - default: Standard radio style
 * - primary: Primary radio (uses --action-primary-bg token when selected)
 * - secondary: Secondary radio (uses --action-secondary-bg token when selected)
 * - surface: Surface radio (uses --action-surface-bg token when selected)
 */
export type RadioVariant = "default" | "primary" | "secondary" | "surface";

// ============================================================================
// Slider Variants
// ============================================================================

/**
 * Slider visual variants
 * Used by: Slider component
 *
 * - default: Standard slider style
 * - primary: Primary slider (uses --action-primary-bg token for thumb)
 * - secondary: Secondary slider (uses --action-secondary-bg token for thumb)
 * - surface: Surface slider (uses --action-surface-bg token for thumb)
 */
export type SliderVariant = "default" | "primary" | "secondary" | "surface";

// ============================================================================
// ToggleButton Variants
// ============================================================================

/**
 * ToggleButton visual variants
 * Used by: ToggleButtonGroup component (controls child ToggleButton styling)
 *
 * - default: Standard toggle button style
 * - primary: Primary toggle button (uses --action-primary-bg token when selected)
 * - secondary: Secondary toggle button (uses --action-secondary-bg token when selected)
 * - surface: Surface toggle button (uses --action-surface-bg token when selected)
 */
export type ToggleButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "surface";

// ============================================================================
// Table Column Variants
// ============================================================================

/**
 * Table Column visual variants
 * Used by: Table Column component
 *
 * - default: Standard column
 * - primary: Primary emphasis column
 * - secondary: Secondary emphasis column
 */
export type TableColumnVariant = "default" | "primary" | "secondary";

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Convert legacy size to standard size
 * Helper type for migration
 */
export type ConvertLegacySize<T extends LegacySize> = T extends "small"
  ? "sm"
  : T extends "medium"
  ? "md"
  : T extends "large"
  ? "lg"
  : never;

/**
 * Props interface for components with variant and size
 * Generic interface that can be extended by components
 */
export interface VariantSizeProps<V = string, S = ComponentSize> {
  /**
   * Visual variant of the component
   * @default "default"
   */
  variant?: V;

  /**
   * Size of the component
   * @default "sm"
   */
  size?: S;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a size is a valid ComponentSize
 */
export function isComponentSize(value: unknown): value is ComponentSize {
  return (
    typeof value === "string" && ["xs", "sm", "md", "lg", "xl"].includes(value)
  );
}

/**
 * Type guard to check if a size is a legacy size
 */
export function isLegacySize(value: unknown): value is LegacySize {
  return (
    typeof value === "string" && ["small", "medium", "large"].includes(value)
  );
}

/**
 * Convert legacy size to standard size
 */
export function convertLegacySize(size: LegacySize): ComponentSizeSubset {
  switch (size) {
    case "small":
      return "sm";
    case "medium":
      return "md";
    case "large":
      return "lg";
    default:
      return "md";
  }
}
