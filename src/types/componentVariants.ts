/**
 * Material Design 3 Component Variant Types
 *
 * Shared type definitions for M3 color variants and sizes across all components.
 *
 * Usage:
 * ```typescript
 * import type { M3Variant, ComponentSize, TextFieldVariant } from '../../types/componentVariants';
 *
 * interface MyComponentProps {
 *   variant?: TextFieldVariant;
 *   size?: ComponentSize;
 * }
 * ```
 */

// ========== Universal M3 Types ==========

/**
 * Universal M3 Color Variant
 * All 5 core M3 color roles supported across components
 */
export type M3Variant = 'primary' | 'secondary' | 'tertiary' | 'error' | 'surface';

/**
 * Component Size Variants
 * Standard sizing system used across all components
 */
export type ComponentSize = 'sm' | 'md' | 'lg';

// ========== Form Components (Phase 1) ==========

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
 * Select Variants
 * Primary, secondary, and surface for dropdown menus
 */
export type SelectVariant = 'primary' | 'secondary' | 'surface';

/**
 * ComboBox Variants
 * Same as Select for consistency
 */
export type ComboBoxVariant = 'primary' | 'secondary' | 'surface';

// ========== Collection Components (Phase 2) ==========

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

/**
 * Table Variants
 * Primary and secondary for data tables
 */
export type TableVariant = 'primary' | 'secondary';

// ========== Overlay Components (Phase 3) ==========

/**
 * Dialog Variants
 * Primary for confirmation, error for destructive
 */
export type DialogVariant = 'primary' | 'error';

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

// ========== Navigation Components (Phase 4) ==========

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

// ========== Feedback Components (Phase 5) ==========

/**
 * Badge Variants
 * All M3 variants plus surface for status indicators
 */
export type BadgeVariant = 'primary' | 'secondary' | 'tertiary' | 'error' | 'surface';

/**
 * Link Variants
 * Primary and secondary for hyperlinks
 */
export type LinkVariant = 'primary' | 'secondary';

// ========== Date/Time Components (Phase 6) ==========

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

// ========== Color Components (Phase 7) ==========

/**
 * ColorField Variants
 * Same as TextField for consistency
 */
export type ColorFieldVariant = 'primary' | 'secondary' | 'tertiary' | 'error' | 'filled';

/**
 * ColorPicker Variants
 * Primary, secondary, tertiary for color selection
 */
export type ColorPickerVariant = 'primary' | 'secondary' | 'tertiary';

// ========== Layout Components (Phase 8) ==========
// Note: Already migrated - included for completeness

/**
 * Card Variants (Already Migrated)
 */
export type CardVariant = 'default' | 'outlined' | 'elevated' | 'primary' | 'secondary' | 'surface';

/**
 * Separator Variants (Already Migrated)
 */
export type SeparatorVariant = 'solid' | 'dashed' | 'dotted' | 'primary' | 'secondary' | 'surface';

// ========== Already Migrated Components ==========
// These are included for reference and consistency

/**
 * Button Variants (Already Migrated)
 * 7 variants: default, primary, secondary, tertiary, error, surface, outline, ghost
 */
export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'tertiary' | 'error' | 'surface' | 'outline' | 'ghost';

/**
 * Checkbox Variants (Already Migrated)
 * Parent-controlled via CheckboxGroup
 */
export type CheckboxVariant = 'default' | 'primary' | 'secondary' | 'surface';

/**
 * Radio Variants (Already Migrated)
 * Parent-controlled via RadioGroup
 */
export type RadioVariant = 'default' | 'primary' | 'secondary' | 'surface';

/**
 * Switch Variants (Already Migrated)
 */
export type SwitchVariant = 'default' | 'primary' | 'secondary' | 'surface';

/**
 * Slider Variants (Already Migrated)
 */
export type SliderVariant = 'default' | 'primary' | 'secondary' | 'surface';

/**
 * ProgressBar Variants (Already Migrated)
 */
export type ProgressBarVariant = 'default' | 'primary' | 'secondary' | 'tertiary' | 'error' | 'surface';

/**
 * Meter Variants (Already Migrated)
 */
export type MeterVariant = 'default' | 'primary' | 'secondary' | 'surface';

/**
 * TagGroup Variants (Already Migrated)
 * Parent-controlled
 */
export type TagVariant = 'default' | 'primary' | 'secondary' | 'surface';

/**
 * ToggleButton Variants (Already Migrated)
 */
export type ToggleButtonVariant = 'default' | 'primary' | 'secondary' | 'surface';

// ========== Utility Types ==========

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

// ========== Type Guards ==========

/**
 * Check if a value is a valid M3Variant
 */
export function isM3Variant(value: unknown): value is M3Variant {
  return typeof value === 'string' &&
    ['primary', 'secondary', 'tertiary', 'error', 'surface'].includes(value);
}

/**
 * Check if a value is a valid ComponentSize
 */
export function isComponentSize(value: unknown): value is ComponentSize {
  return typeof value === 'string' &&
    ['sm', 'md', 'lg'].includes(value);
}

// ========== Conversion Utilities ==========

/**
 * Convert legacy size values to ComponentSize
 * Useful for migration
 */
export function normalizeSize(size: 'small' | 'medium' | 'large' | ComponentSize): ComponentSize {
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
export function getDefaultSize(_componentType: string): ComponentSize {
  // All components default to 'md'
  return 'md';
}
