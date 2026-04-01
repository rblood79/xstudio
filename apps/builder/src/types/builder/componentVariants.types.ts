/**
 * Component Variant & Size Type Definitions
 *
 * S2 (Spectrum 2) aligned variant system.
 * Only components that have variant in S2 retain variant prop.
 * Components without S2 variant use isEmphasized/isQuiet/fillStyle instead.
 *
 * @created 2025-11-07
 * @updated 2026-03-05 (ADR-023: S2 variant alignment)
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

// ============================================================================
// S2 Common Props
// ============================================================================

/**
 * Static color for components on colored backgrounds
 * Used by: Button, ToggleButton, Link, Meter, ProgressBar
 */
export type StaticColor = "auto" | "black" | "white";

// ============================================================================
// Button (S2: variant + fillStyle)
// ============================================================================

/**
 * Button visual variants (S2 aligned)
 * - accent: Blue/accent emphasis
 * - primary: Dark/neutral fill
 * - secondary: Neutral outline
 * - negative: Error/destructive
 */
export type ButtonVariant = "accent" | "primary" | "secondary" | "negative";

/**
 * Button fill style (S2)
 */
export type ButtonFillStyle = "fill" | "outline";

// ============================================================================
// Badge (S2: variant + fillStyle)
// ============================================================================

export type BadgeVariant =
  | "accent"
  | "informative"
  | "neutral"
  | "positive"
  | "notice"
  | "negative"
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "indigo"
  | "cyan"
  | "pink"
  | "turquoise"
  | "fuchsia"
  | "magenta";

export type BadgeFillStyle = "bold" | "subtle" | "outline";

// ============================================================================
// Link (S2: variant)
// ============================================================================

export type LinkVariant = "primary" | "secondary";

/**
 * Card visual variants (S2 aligned)
 */
export type S2CardVariant = "primary" | "secondary" | "tertiary" | "quiet";

// ============================================================================
// Meter (S2: variant)
// ============================================================================

export type MeterVariant = "informative" | "positive" | "notice" | "negative";

// ============================================================================
// Panel (XStudio-specific layout variants)
// ============================================================================

export type PanelVariant = "default" | "tab" | "sidebar" | "card" | "modal";

// ============================================================================
// Separator (style variants, not color-based)
// ============================================================================

export type SeparatorVariant = "default" | "dashed" | "dotted";

// ============================================================================
// Table (structural variants)
// ============================================================================

export type TableVariant = "default" | "striped" | "bordered";
export type TableHeaderVariant = "default" | "dark" | "light" | "bordered";
export type TableBodyVariant = "default" | "striped" | "bordered" | "hover";
export type TableColumnVariant = "default" | "primary" | "secondary";

// ============================================================================
// Card (structural only, S2 has no color variant)
// ============================================================================

export type CardVariant = "primary" | "secondary" | "tertiary" | "quiet";

// ============================================================================
// Tabs density (S2: density instead of variant)
// ============================================================================

export type TabsDensity = "compact" | "regular";

// ============================================================================
// Utility Types
// ============================================================================

export interface VariantSizeProps<V = string, S = ComponentSize> {
  variant?: V;
  size?: S;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isComponentSize(value: unknown): value is ComponentSize {
  return (
    typeof value === "string" && ["xs", "sm", "md", "lg", "xl"].includes(value)
  );
}
