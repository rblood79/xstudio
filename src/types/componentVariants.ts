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
 * - primary: Main call-to-action (uses --button-primary-* tokens)
 * - secondary: Secondary actions (uses --button-secondary-* tokens)
 * - surface: Surface-level actions (uses --button-surface-* tokens)
 * - outline: Outlined style (uses --button-outline-* tokens)
 * - ghost: Minimal style (uses --button-ghost-* tokens)
 */
export type ButtonVariant = "primary" | "secondary" | "surface" | "outline" | "ghost";

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
export type CardVariant = "default" | "primary" | "secondary" | "surface" | "elevated" | "outlined";

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
export type ConvertLegacySize<T extends LegacySize> =
  T extends "small" ? "sm" :
  T extends "medium" ? "md" :
  T extends "large" ? "lg" :
  never;

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
   * @default "md"
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
  return typeof value === "string" && ["xs", "sm", "md", "lg", "xl"].includes(value);
}

/**
 * Type guard to check if a size is a legacy size
 */
export function isLegacySize(value: unknown): value is LegacySize {
  return typeof value === "string" && ["small", "medium", "large"].includes(value);
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
