/**
 * Types - Public API
 *
 * @packageDocumentation
 */

// Spec Types
export type {
  ArchetypeId,
  ComponentSpec,
  ComponentState,
  ContainerStylesSchema,
  VariantSpec,
  SizeSpec,
  IndicatorSpec,
  RenderSpec,
  SpecRenderContext,
  CompositionSpec,
  DelegationSpec,
  PropertySchema,
  SectionDef,
  FieldDef,
  BaseFieldDef,
  VisibilityCondition,
  VariantField,
  SizeField,
  BooleanField,
  EnumField,
  StringField,
  NumberField,
  IconField,
  CustomField,
  ChildrenManagerField,
  ItemsManagerField,
  ItemsManagerFieldItemSchema,
  DerivedUpdateFn,
  CustomFieldComponentProps,
  PropagationRule,
  PropagationSpec,
  IndicatorModeSpec,
} from "./spec.types";

// Shape Types
export type {
  Shape,
  ShapeBase,
  RectShape,
  RoundRectShape,
  CircleShape,
  ArcShape,
  TextShape,
  ShadowShape,
  BorderShape,
  ContainerShape,
  ContainerLayout,
  GradientShape,
  ImageShape,
  LineShape,
  IconFontShape,
  ColorValue,
} from "./shape.types";

// Token Types
export type {
  TokenRef,
  ColorTokenRef,
  SpacingTokenRef,
  TypographyTokenRef,
  RadiusTokenRef,
  ShadowTokenRef,
  StrictTokenRef,
  TokenCategories,
  ColorTokens,
  SpacingTokens,
  TypographyTokens,
  RadiusTokens,
  ShadowTokens,
} from "./token.types";

export { isValidTokenRef } from "./token.types";

// State Types
export type { StateStyles, StateEffect } from "./state.types";

// Menu Items Types (ADR-068)
export type { StoredMenuItem, RuntimeMenuItem } from "./menu-items";

// Select Items Types (ADR-073)
export type { StoredSelectItem, RuntimeSelectItem } from "./select-items";
export { toRuntimeSelectItem } from "./select-items";

// ComboBox Items Types (ADR-073)
export type { StoredComboBoxItem, RuntimeComboBoxItem } from "./combobox-items";
export { toRuntimeComboBoxItem } from "./combobox-items";

// ListBox Items Types (ADR-076 + ADR-099 Phase 1 Section union)
export type {
  StoredListBoxItem,
  StoredListBoxSection,
  StoredListBoxEntry,
  RuntimeListBoxItem,
} from "./listbox-items";
export { toRuntimeListBoxItem, isListBoxSectionEntry } from "./listbox-items";

// TagGroup Items Types (ADR-097)
export type { StoredTagItem, RuntimeTagItem } from "./taggroup-items";
export { toRuntimeTagItem } from "./taggroup-items";
