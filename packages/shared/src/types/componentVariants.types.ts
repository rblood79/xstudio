/**
 * Component Variant & Size Type Definitions
 *
 * Shared type definitions for M3 component variants and sizes
 * to ensure consistency across the component library.
 *
 * @since 2025-01-02
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
// Universal M3 Types
// ============================================================================

/**
 * Universal M3 Color Variant
 * All 5 core M3 color roles supported across components
 */
export type M3Variant = 'primary' | 'secondary' | 'tertiary' | 'error' | 'surface';

/**
 * Component Variant (simple version)
 * Used by: CommonComponentProps and legacy components
 */
export type ComponentVariant = 'default' | 'primary' | 'secondary' | 'surface';

// ============================================================================
// Button Variants
// ============================================================================

/**
 * Button visual variants
 * Used by: Button component
 *
 * - default: Default style (base button styles)
 * - primary: Main call-to-action (uses M3 --primary token)
 * - secondary: Secondary actions (uses M3 --secondary token)
 * - tertiary: Tertiary actions (uses M3 --tertiary token)
 * - error: Error/destructive actions (uses M3 --error token)
 * - surface: Surface-level actions (uses M3 --surface-container-highest token)
 * - outline: Outlined style (uses M3 --outline token)
 * - ghost: Minimal style (transparent background)
 */
export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "tertiary"
  | "error"
  | "surface"
  | "outline"
  | "ghost";

// ============================================================================
// Field/Input Variants
// ============================================================================

/**
 * Field/Input visual variants
 * Used by: TextField, TextArea, and other form inputs
 */
export type FieldVariant = "default" | "filled" | "outlined";

/**
 * TextField Variants
 * Supports all M3 variants plus filled style
 */
export type TextFieldVariant = 'primary' | 'secondary' | 'tertiary' | 'error' | 'filled';

/**
 * NumberField Variants
 * Same as TextField for consistency
 */
export type NumberFieldVariant = 'primary' | 'secondary' | 'tertiary' | 'error' | 'filled';

/**
 * DateField Variants
 * Same as TextField for consistency
 */
export type DateFieldVariant = 'primary' | 'secondary' | 'tertiary' | 'error' | 'filled';

/**
 * TimeField Variants
 * Same as TextField for consistency
 */
export type TimeFieldVariant = 'primary' | 'secondary' | 'tertiary' | 'error' | 'filled';

/**
 * SearchField Variants
 * Same as TextField for consistency
 */
export type SearchFieldVariant = 'primary' | 'secondary' | 'tertiary' | 'error' | 'filled';

/**
 * ColorField Variants
 * Same as TextField for consistency
 */
export type ColorFieldVariant = 'primary' | 'secondary' | 'tertiary' | 'error' | 'filled';

// ============================================================================
// Selection Variants
// ============================================================================

/**
 * Select Variants
 * Primary, secondary, and surface for dropdown menus
 */
export type SelectVariant = 'primary' | 'secondary' | 'surface';

/**
 * ComboBox Variants
 * Same as Select for consistency
 */
export type ComboBoxVariant = 'primary' | 'secondary' | 'surface';

/**
 * ListBox Variants
 * Primary, secondary, surface for list selections
 */
export type ListBoxVariant = 'primary' | 'secondary' | 'surface';

/**
 * GridList Variants
 * Same as ListBox for consistency
 */
export type GridListVariant = 'primary' | 'secondary' | 'surface';

/**
 * Menu Variants
 * Primary, secondary, surface for context/dropdown menus
 */
export type MenuVariant = 'primary' | 'secondary' | 'surface';

// ============================================================================
// Card/Panel Variants
// ============================================================================

/**
 * Card visual variants
 * Used by: Card component
 */
export type CardVariant =
  | "default"
  | "primary"
  | "secondary"
  | "tertiary"
  | "surface"
  | "elevated"
  | "outlined";

/**
 * Panel visual variants
 * Used by: Panel component
 */
export type PanelVariant = "default" | "tab" | "sidebar" | "card" | "modal";

// ============================================================================
// Separator Variants
// ============================================================================

/**
 * Separator visual variants
 * Used by: Separator component
 */
export type SeparatorVariant = "default" | "solid" | "dashed" | "dotted" | "primary" | "secondary" | "surface";

// ============================================================================
// Overlay Variants
// ============================================================================

/**
 * Dialog Variants
 * Primary for confirmation, error for destructive
 */
export type DialogVariant = 'primary' | 'error';

/**
 * Modal Variants
 * Same as Dialog for consistency
 */
export type ModalVariant = 'primary' | 'secondary' | 'surface';

/**
 * Popover Variants
 * Primary, secondary, surface for floating content
 */
export type PopoverVariant = 'primary' | 'secondary' | 'surface';

/**
 * Tooltip Variants
 * Primary and surface for helper text
 */
export type TooltipVariant = 'primary' | 'surface';

// ============================================================================
// Navigation Variants
// ============================================================================

/**
 * Tabs Variants
 * All M3 variants for tab navigation
 */
export type TabsVariant = 'primary' | 'secondary' | 'tertiary';

/**
 * Breadcrumbs Variants
 * Primary and secondary for navigation trails
 */
export type BreadcrumbsVariant = 'primary' | 'secondary';

/**
 * Tree Variants
 * All M3 variants for hierarchical navigation
 */
export type TreeVariant = 'primary' | 'secondary' | 'tertiary';

/**
 * Disclosure Variants
 * Primary and secondary for expandable content
 */
export type DisclosureVariant = 'primary' | 'secondary';

/**
 * Link Variants
 * Primary and secondary for hyperlinks
 */
export type LinkVariant = 'primary' | 'secondary';

// ============================================================================
// Feedback Variants
// ============================================================================

/**
 * Badge Variants
 * All M3 variants plus surface for status indicators
 */
export type BadgeVariant = 'primary' | 'secondary' | 'tertiary' | 'error' | 'surface';

/**
 * ProgressBar Variants
 * Used by: ProgressBar component
 */
export type ProgressBarVariant =
  | "default"
  | "primary"
  | "secondary"
  | "tertiary"
  | "error"
  | "surface";

/**
 * Meter Variants
 * Used by: Meter component
 */
export type MeterVariant = "default" | "primary" | "secondary" | "surface";

// ============================================================================
// Form Control Variants
// ============================================================================

/**
 * Checkbox visual variants
 */
export type CheckboxVariant = "default" | "primary" | "secondary" | "surface";

/**
 * Radio visual variants
 */
export type RadioVariant = "default" | "primary" | "secondary" | "surface";

/**
 * Switch visual variants
 */
export type SwitchVariant = "default" | "primary" | "secondary" | "surface";

/**
 * Slider visual variants
 */
export type SliderVariant = "default" | "primary" | "secondary" | "surface";

/**
 * Tag visual variants
 */
export type TagVariant = "default" | "primary" | "secondary" | "surface";

/**
 * ToggleButton visual variants
 */
export type ToggleButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "surface";

// ============================================================================
// Date/Time Variants
// ============================================================================

/**
 * Calendar Variants
 * Primary, secondary, tertiary for calendar views
 */
export type CalendarVariant = 'primary' | 'secondary' | 'tertiary';

/**
 * DatePicker Variants
 * Same as DateField for consistency
 */
export type DatePickerVariant = 'primary' | 'secondary' | 'tertiary' | 'error' | 'filled';

/**
 * DateRangePicker Variants
 * Same as DatePicker for consistency
 */
export type DateRangePickerVariant = 'primary' | 'secondary' | 'tertiary' | 'error' | 'filled';

/**
 * ColorPicker Variants
 * Primary, secondary, tertiary for color selection
 */
export type ColorPickerVariant = 'primary' | 'secondary' | 'tertiary';

// ============================================================================
// Table Variants
// ============================================================================

/**
 * Table Variants
 * Primary and secondary for data tables
 */
export type TableVariant = 'primary' | 'secondary';

/**
 * Table Column visual variants
 */
export type TableColumnVariant = "default" | "primary" | "secondary";

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Props for components with M3 variant support
 */
export interface M3VariantProps {
  variant?: M3Variant;
}

/**
 * Props for components with size support
 */
export interface ComponentSizeProps {
  size?: ComponentSize;
}

/**
 * Combined M3 variant and size props
 */
export interface M3ComponentProps extends M3VariantProps, ComponentSizeProps {}

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

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a valid M3Variant
 */
export function isM3Variant(value: unknown): value is M3Variant {
  return typeof value === 'string' &&
    ['primary', 'secondary', 'tertiary', 'error', 'surface'].includes(value);
}

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

// ============================================================================
// Conversion Utilities
// ============================================================================

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

/**
 * Convert legacy size values to ComponentSize
 * Useful for migration
 */
export function normalizeSize(size: 'small' | 'medium' | 'large' | ComponentSizeSubset): ComponentSizeSubset {
  switch (size) {
    case 'small':
      return 'sm';
    case 'medium':
      return 'md';
    case 'large':
      return 'lg';
    default:
      return size;
  }
}

/**
 * Get default variant for a component type
 * @param componentType - Component type name
 * @returns Default variant for that component
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getDefaultVariant(_componentType: string): M3Variant {
  // Most components default to 'primary'
  // Override for specific components if needed
  return 'primary';
}

/**
 * Get default size for a component type
 * @param componentType - Component type name
 * @returns Default size for that component
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getDefaultSize(_componentType: string): ComponentSizeSubset {
  // All components default to 'md'
  return 'md';
}
