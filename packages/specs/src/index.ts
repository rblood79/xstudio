/**
 * @xstudio/specs
 *
 * Component Spec Architecture - Single Source of Truth
 * Builder(WebGL)와 Publish(React)의 100% 시각적 일치 보장
 *
 * @packageDocumentation
 */

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  // Spec Types
  ComponentSpec,
  ComponentState,
  VariantSpec,
  SizeSpec,
  RenderSpec,
  // Shape Types
  Shape,
  ShapeBase,
  RectShape,
  RoundRectShape,
  CircleShape,
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
  // Token Types
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
  // State Types
  StateStyles,
  StateEffect,
} from './types';

export { isValidTokenRef } from './types';

// ─── Icons ──────────────────────────────────────────────────────────────────
export { LUCIDE_ICONS, getIconData } from './icons/lucideIcons';
export type { LucideIconData } from './icons/lucideIcons';

// ─── Utils ──────────────────────────────────────────────────────────────────
export { resolveStateColors } from './utils/stateEffect';

// ─── Primitives ──────────────────────────────────────────────────────────────
export {
  // Colors
  lightColors,
  darkColors,
  getColorToken,
  getColorTokens,
  // Spacing
  spacing,
  getSpacingToken,
  // Typography
  typography,
  fontFamily,
  fontWeight,
  lineHeight,
  getTypographyToken,
  // Radius
  radius,
  getRadiusToken,
  // Shadows
  shadows,
  getShadowToken,
  parseShadow,
} from './primitives';

export type { ParsedShadow } from './primitives';

// ─── Renderers ───────────────────────────────────────────────────────────────
export {
  // React Renderer
  renderToReact,
  generateCSSVariables,
  generateSizeVariables,
  // PIXI Renderer
  renderToPixi,
  getVariantColors,
  getSizePreset,
  // CSS Generator
  generateCSS,
  generateAllCSS,
  // Token Resolver
  resolveToken,
  resolveColor,
  tokenToCSSVar,
  resolveBoxShadow,
  hexStringToNumber,
} from './renderers';

export type {
  ReactRenderResult,
  PixiRenderContext,
} from './renderers';

// ─── Components ──────────────────────────────────────────────────────────────
export { ButtonSpec } from './components/Button.spec';
export type { ButtonProps } from './components/Button.spec';

export { BadgeSpec } from './components/Badge.spec';
export type { BadgeProps } from './components/Badge.spec';

export { CardSpec } from './components/Card.spec';
export type { CardProps } from './components/Card.spec';

export { DialogSpec } from './components/Dialog.spec';
export type { DialogProps } from './components/Dialog.spec';

export { LinkSpec } from './components/Link.spec';
export type { LinkProps } from './components/Link.spec';

export { PopoverSpec } from './components/Popover.spec';
export type { PopoverProps } from './components/Popover.spec';

export { SectionSpec } from './components/Section.spec';
export type { SectionProps } from './components/Section.spec';

export { SeparatorSpec } from './components/Separator.spec';
export type { SeparatorProps } from './components/Separator.spec';

export { ToggleButtonSpec, TOGGLE_SELECTED_COLORS } from './components/ToggleButton.spec';
export type { ToggleButtonProps } from './components/ToggleButton.spec';

export { ToggleButtonGroupSpec } from './components/ToggleButtonGroup.spec';
export type { ToggleButtonGroupProps } from './components/ToggleButtonGroup.spec';

export { TooltipSpec, TOOLTIP_MAX_WIDTH } from './components/Tooltip.spec';
export type { TooltipProps } from './components/Tooltip.spec';

// ─── Phase 2: Form Components ───────────────────────────────────────────────
export { TextFieldSpec } from './components/TextField.spec';
export type { TextFieldProps } from './components/TextField.spec';

export { TextAreaSpec } from './components/TextArea.spec';
export type { TextAreaProps } from './components/TextArea.spec';

export { NumberFieldSpec } from './components/NumberField.spec';
export type { NumberFieldProps } from './components/NumberField.spec';

export { SearchFieldSpec } from './components/SearchField.spec';
export type { SearchFieldProps } from './components/SearchField.spec';

export { CheckboxSpec, CHECKBOX_BOX_SIZES, CHECKBOX_CHECKED_COLORS } from './components/Checkbox.spec';
export type { CheckboxProps } from './components/Checkbox.spec';

export { CheckboxGroupSpec } from './components/CheckboxGroup.spec';
export type { CheckboxGroupProps } from './components/CheckboxGroup.spec';

export { RadioSpec, RADIO_SELECTED_COLORS, RADIO_DIMENSIONS } from './components/Radio.spec';
export type { RadioProps } from './components/Radio.spec';

export { RadioGroupSpec } from './components/RadioGroup.spec';
export type { RadioGroupProps } from './components/RadioGroup.spec';

export { SwitchSpec, SWITCH_SELECTED_TRACK_COLORS, SWITCH_DIMENSIONS } from './components/Switch.spec';
export type { SwitchProps } from './components/Switch.spec';

export { FormSpec } from './components/Form.spec';
export type { FormProps } from './components/Form.spec';

export { SelectSpec } from './components/Select.spec';
export type { SelectProps } from './components/Select.spec';

export { ComboBoxSpec } from './components/ComboBox.spec';
export type { ComboBoxProps } from './components/ComboBox.spec';

export { ListBoxSpec } from './components/ListBox.spec';
export type { ListBoxProps } from './components/ListBox.spec';

export { SliderSpec, SLIDER_FILL_COLORS, SLIDER_DIMENSIONS } from './components/Slider.spec';
export type { SliderProps } from './components/Slider.spec';

export { MeterSpec, METER_FILL_COLORS, METER_DIMENSIONS } from './components/Meter.spec';
export type { MeterProps } from './components/Meter.spec';

export { ProgressBarSpec, PROGRESSBAR_FILL_COLORS, PROGRESSBAR_DIMENSIONS } from './components/ProgressBar.spec';
export type { ProgressBarProps } from './components/ProgressBar.spec';

// ─── Phase 3: Composite Components ──────────────────────────────────────────
export { TableSpec } from './components/Table.spec';
export type { TableProps, TableColumn, TableRow } from './components/Table.spec';

export { TreeSpec } from './components/Tree.spec';
export type { TreeProps } from './components/Tree.spec';

export { TabsSpec } from './components/Tabs.spec';
export type { TabsProps } from './components/Tabs.spec';

export { MenuSpec } from './components/Menu.spec';
export type { MenuProps } from './components/Menu.spec';

export { BreadcrumbsSpec } from './components/Breadcrumbs.spec';
export type { BreadcrumbsProps } from './components/Breadcrumbs.spec';

export { PaginationSpec } from './components/Pagination.spec';
export type { PaginationProps } from './components/Pagination.spec';

export { TagGroupSpec } from './components/TagGroup.spec';
export type { TagGroupProps } from './components/TagGroup.spec';

export { GridListSpec } from './components/GridList.spec';
export type { GridListProps } from './components/GridList.spec';

export { DisclosureSpec } from './components/Disclosure.spec';
export type { DisclosureProps } from './components/Disclosure.spec';

export { DisclosureGroupSpec } from './components/DisclosureGroup.spec';
export type { DisclosureGroupProps } from './components/DisclosureGroup.spec';

export { ToolbarSpec } from './components/Toolbar.spec';
export type { ToolbarProps } from './components/Toolbar.spec';

export { ToastSpec } from './components/Toast.spec';
export type { ToastProps } from './components/Toast.spec';

export { PanelSpec } from './components/Panel.spec';
export type { PanelProps } from './components/Panel.spec';

export { GroupSpec } from './components/Group.spec';
export type { GroupProps } from './components/Group.spec';

export { SlotSpec } from './components/Slot.spec';
export type { SlotProps } from './components/Slot.spec';

export { SkeletonSpec } from './components/Skeleton.spec';
export type { SkeletonProps } from './components/Skeleton.spec';

export { DropZoneSpec } from './components/DropZone.spec';
export type { DropZoneProps } from './components/DropZone.spec';

export { FileTriggerSpec } from './components/FileTrigger.spec';
export type { FileTriggerProps } from './components/FileTrigger.spec';

export { ScrollBoxSpec } from './components/ScrollBox.spec';
export type { ScrollBoxProps } from './components/ScrollBox.spec';

export { MaskedFrameSpec } from './components/MaskedFrame.spec';
export type { MaskedFrameProps } from './components/MaskedFrame.spec';

// ─── Phase 4: Special Components ────────────────────────────────────────────
export { DatePickerSpec } from './components/DatePicker.spec';
export type { DatePickerProps } from './components/DatePicker.spec';

export { DateRangePickerSpec } from './components/DateRangePicker.spec';
export type { DateRangePickerProps } from './components/DateRangePicker.spec';

export { DateFieldSpec } from './components/DateField.spec';
export type { DateFieldProps } from './components/DateField.spec';

export { TimeFieldSpec } from './components/TimeField.spec';
export type { TimeFieldProps } from './components/TimeField.spec';

export { CalendarSpec } from './components/Calendar.spec';
export type { CalendarProps } from './components/Calendar.spec';

export { ColorPickerSpec } from './components/ColorPicker.spec';
export type { ColorPickerProps } from './components/ColorPicker.spec';

export { ColorFieldSpec } from './components/ColorField.spec';
export type { ColorFieldProps } from './components/ColorField.spec';

export { ColorSliderSpec } from './components/ColorSlider.spec';
export type { ColorSliderProps } from './components/ColorSlider.spec';

export { ColorAreaSpec } from './components/ColorArea.spec';
export type { ColorAreaProps } from './components/ColorArea.spec';

export { ColorWheelSpec } from './components/ColorWheel.spec';
export type { ColorWheelProps } from './components/ColorWheel.spec';

export { ColorSwatchSpec } from './components/ColorSwatch.spec';
export type { ColorSwatchProps } from './components/ColorSwatch.spec';

export { ColorSwatchPickerSpec } from './components/ColorSwatchPicker.spec';
export type { ColorSwatchPickerProps } from './components/ColorSwatchPicker.spec';

export { ListSpec } from './components/List.spec';
export type { ListProps } from './components/List.spec';

export { InputSpec } from './components/Input.spec';
export type { InputProps } from './components/Input.spec';

export { SwitcherSpec } from './components/Switcher.spec';
export type { SwitcherProps } from './components/Switcher.spec';

export { NavSpec } from './components/Nav.spec';
export type { NavProps } from './components/Nav.spec';

// ─── Phase 5: Child Composition Specs (Compositional 전환) ─────────────────
export { LabelSpec } from './components/Label.spec';
export type { LabelProps } from './components/Label.spec';

export { FieldErrorSpec } from './components/FieldError.spec';
export type { FieldErrorProps } from './components/FieldError.spec';

export { DescriptionSpec } from './components/Description.spec';
export type { DescriptionProps } from './components/Description.spec';

export { SliderTrackSpec, SLIDER_TRACK_DIMENSIONS } from './components/SliderTrack.spec';
export type { SliderTrackProps } from './components/SliderTrack.spec';

export { SliderThumbSpec, SLIDER_THUMB_SIZES } from './components/SliderThumb.spec';
export type { SliderThumbProps } from './components/SliderThumb.spec';

export { SliderOutputSpec } from './components/SliderOutput.spec';
export type { SliderOutputProps } from './components/SliderOutput.spec';

export { DateSegmentSpec } from './components/DateSegment.spec';
export type { DateSegmentProps, DateSegmentType } from './components/DateSegment.spec';

export { SelectTriggerSpec } from './components/SelectTrigger.spec';
export type { SelectTriggerProps } from './components/SelectTrigger.spec';

export { SelectValueSpec } from './components/SelectValue.spec';
export type { SelectValueProps } from './components/SelectValue.spec';

export { SelectIconSpec } from './components/SelectIcon.spec';
export type { SelectIconProps } from './components/SelectIcon.spec';
