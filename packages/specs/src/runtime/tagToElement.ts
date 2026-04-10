/**
 * tagToElement — ADR-058 Pre-Phase 0
 *
 * 컴포넌트 tag → HTML 요소 이름 매핑 헬퍼.
 * Preview App의 `resolveHtmlTag` fallback 경로가 이 함수를 호출하여
 * spec registry 기반으로 element를 결정한다.
 *
 * Pre-Phase 0 범위: **정적 `spec.element` 문자열만** 지원.
 * 동적(함수형) element는 Phase 2에서 `ComponentSpec.element` 함수형 확장과 함께 추가한다.
 *
 * 등록되지 않은 태그는 `tag.toLowerCase()` fallback (기존 `resolveHtmlTag` default 동작과 동일).
 */

import type { ComponentSpec } from "../types/spec.types";

// 모든 spec을 import하여 태그 → spec registry 구축.
// apps/builder의 TAG_SPEC_MAP과 유사하나, packages/specs의 내부 concern이며
// Preview DOM element resolution 용도로 한정된다.
import { ButtonSpec } from "../components/Button.spec";
import { TextSpec } from "../components/Text.spec";
import { BadgeSpec } from "../components/Badge.spec";
import { CardSpec } from "../components/Card.spec";
import { DialogSpec } from "../components/Dialog.spec";
import { LinkSpec } from "../components/Link.spec";
import { PopoverSpec } from "../components/Popover.spec";
import { SeparatorSpec } from "../components/Separator.spec";
import { TextFieldSpec } from "../components/TextField.spec";
import { TextAreaSpec } from "../components/TextArea.spec";
import { NumberFieldSpec } from "../components/NumberField.spec";
import { SearchFieldSpec } from "../components/SearchField.spec";
import { CheckboxSpec } from "../components/Checkbox.spec";
import { CheckboxGroupSpec } from "../components/CheckboxGroup.spec";
import { RadioSpec } from "../components/Radio.spec";
import { RadioGroupSpec } from "../components/RadioGroup.spec";
import { SwitchSpec } from "../components/Switch.spec";
import { FormSpec } from "../components/Form.spec";
import { SelectSpec } from "../components/Select.spec";
import { ComboBoxSpec } from "../components/ComboBox.spec";
import { ListBoxSpec } from "../components/ListBox.spec";
import { SliderSpec } from "../components/Slider.spec";
import { MeterSpec } from "../components/Meter.spec";
import { ProgressBarSpec } from "../components/ProgressBar.spec";
import { TableSpec } from "../components/Table.spec";
import { TreeSpec } from "../components/Tree.spec";
import { TabsSpec } from "../components/Tabs.spec";
import { TabListSpec } from "../components/TabList.spec";
import { TabPanelsSpec } from "../components/TabPanels.spec";
import { TabSpec } from "../components/Tab.spec";
import { MenuSpec } from "../components/Menu.spec";
import { BreadcrumbsSpec } from "../components/Breadcrumbs.spec";
import { BreadcrumbSpec } from "../components/Breadcrumb.spec";
import { PaginationSpec } from "../components/Pagination.spec";
import { TagGroupSpec } from "../components/TagGroup.spec";
import { TagSpec } from "../components/Tag.spec";
import { GridListSpec } from "../components/GridList.spec";
import { DisclosureSpec } from "../components/Disclosure.spec";
import { DisclosureGroupSpec } from "../components/DisclosureGroup.spec";
import { ToolbarSpec } from "../components/Toolbar.spec";
import { ToastSpec } from "../components/Toast.spec";
import { PanelSpec } from "../components/Panel.spec";
import { GroupSpec } from "../components/Group.spec";
import { SlotSpec } from "../components/Slot.spec";
import { SkeletonSpec } from "../components/Skeleton.spec";
import { DropZoneSpec } from "../components/DropZone.spec";
import { FileTriggerSpec } from "../components/FileTrigger.spec";
import { MaskedFrameSpec } from "../components/MaskedFrame.spec";
import { DatePickerSpec } from "../components/DatePicker.spec";
import { DateRangePickerSpec } from "../components/DateRangePicker.spec";
import { DateFieldSpec } from "../components/DateField.spec";
import { TimeFieldSpec } from "../components/TimeField.spec";
import { DateInputSpec } from "../components/DateInput.spec";
import { CalendarSpec } from "../components/Calendar.spec";
import { CalendarHeaderSpec } from "../components/CalendarHeader.spec";
import { CalendarGridSpec } from "../components/CalendarGrid.spec";
import { RangeCalendarSpec } from "../components/RangeCalendar.spec";
import { ColorPickerSpec } from "../components/ColorPicker.spec";
import { ColorFieldSpec } from "../components/ColorField.spec";
import { ColorSliderSpec } from "../components/ColorSlider.spec";
import { ColorAreaSpec } from "../components/ColorArea.spec";
import { ColorWheelSpec } from "../components/ColorWheel.spec";
import { ColorSwatchSpec } from "../components/ColorSwatch.spec";
import { ColorSwatchPickerSpec } from "../components/ColorSwatchPicker.spec";
import { ListSpec } from "../components/List.spec";
import { InputSpec } from "../components/Input.spec";
import { SwitcherSpec } from "../components/Switcher.spec";
import { NavSpec } from "../components/Nav.spec";
import { LabelSpec } from "../components/Label.spec";
import { FieldErrorSpec } from "../components/FieldError.spec";
import { HeadingSpec } from "../components/Heading.spec";
import { DisclosureHeaderSpec } from "../components/DisclosureHeader.spec";
import { DescriptionSpec } from "../components/Description.spec";
import { SliderOutputSpec } from "../components/SliderOutput.spec";
import { DateSegmentSpec } from "../components/DateSegment.spec";
import { IconSpec } from "../components/Icon.spec";
import { SelectTriggerSpec } from "../components/SelectTrigger.spec";
import { SelectValueSpec } from "../components/SelectValue.spec";
import { SelectIconSpec } from "../components/SelectIcon.spec";
import { AvatarSpec } from "../components/Avatar.spec";
import { AvatarGroupSpec } from "../components/AvatarGroup.spec";
import { InlineAlertSpec } from "../components/InlineAlert.spec";
import { ButtonGroupSpec } from "../components/ButtonGroup.spec";
import { ToggleButtonSpec } from "../components/ToggleButton.spec";
import { ToggleButtonGroupSpec } from "../components/ToggleButtonGroup.spec";
import { TooltipSpec } from "../components/Tooltip.spec";
import { StatusLightSpec } from "../components/StatusLight.spec";
import { ProgressCircleSpec } from "../components/ProgressCircle.spec";
import { SectionSpec } from "../components/Section.spec";
import { SliderTrackSpec } from "../components/SliderTrack.spec";
import { SliderThumbSpec } from "../components/SliderThumb.spec";
import { ProgressBarTrackSpec } from "../components/ProgressBarTrack.spec";
import { ProgressBarValueSpec } from "../components/ProgressBarValue.spec";
import { MeterTrackSpec } from "../components/MeterTrack.spec";
import { MeterValueSpec } from "../components/MeterValue.spec";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TAG_SPEC_MAP: Record<string, ComponentSpec<any>> = {
  Button: ButtonSpec,
  Text: TextSpec,
  Badge: BadgeSpec,
  Card: CardSpec,
  Dialog: DialogSpec,
  Link: LinkSpec,
  Popover: PopoverSpec,
  Section: SectionSpec,
  Separator: SeparatorSpec,
  ToggleButton: ToggleButtonSpec,
  ToggleButtonGroup: ToggleButtonGroupSpec,
  Tooltip: TooltipSpec,
  TextField: TextFieldSpec,
  TextArea: TextAreaSpec,
  NumberField: NumberFieldSpec,
  SearchField: SearchFieldSpec,
  Checkbox: CheckboxSpec,
  CheckboxGroup: CheckboxGroupSpec,
  Radio: RadioSpec,
  RadioGroup: RadioGroupSpec,
  Switch: SwitchSpec,
  Form: FormSpec,
  Select: SelectSpec,
  ComboBox: ComboBoxSpec,
  ListBox: ListBoxSpec,
  Slider: SliderSpec,
  Meter: MeterSpec,
  ProgressBar: ProgressBarSpec,
  ProgressBarTrack: ProgressBarTrackSpec,
  ProgressBarValue: ProgressBarValueSpec,
  MeterTrack: MeterTrackSpec,
  MeterValue: MeterValueSpec,
  SliderTrack: SliderTrackSpec,
  SliderThumb: SliderThumbSpec,
  SliderOutput: SliderOutputSpec,
  Table: TableSpec,
  Tree: TreeSpec,
  Tabs: TabsSpec,
  TabList: TabListSpec,
  TabPanels: TabPanelsSpec,
  Tab: TabSpec,
  Menu: MenuSpec,
  Breadcrumbs: BreadcrumbsSpec,
  Breadcrumb: BreadcrumbSpec,
  Pagination: PaginationSpec,
  TagGroup: TagGroupSpec,
  Tag: TagSpec,
  GridList: GridListSpec,
  Disclosure: DisclosureSpec,
  DisclosureGroup: DisclosureGroupSpec,
  DisclosureHeader: DisclosureHeaderSpec,
  Toolbar: ToolbarSpec,
  Toast: ToastSpec,
  Panel: PanelSpec,
  Group: GroupSpec,
  Slot: SlotSpec,
  Skeleton: SkeletonSpec,
  DropZone: DropZoneSpec,
  FileTrigger: FileTriggerSpec,
  MaskedFrame: MaskedFrameSpec,
  DatePicker: DatePickerSpec,
  DateRangePicker: DateRangePickerSpec,
  DateField: DateFieldSpec,
  TimeField: TimeFieldSpec,
  DateInput: DateInputSpec,
  Calendar: CalendarSpec,
  CalendarHeader: CalendarHeaderSpec,
  CalendarGrid: CalendarGridSpec,
  RangeCalendar: RangeCalendarSpec,
  ColorPicker: ColorPickerSpec,
  ColorField: ColorFieldSpec,
  ColorSlider: ColorSliderSpec,
  ColorArea: ColorAreaSpec,
  ColorWheel: ColorWheelSpec,
  ColorSwatch: ColorSwatchSpec,
  ColorSwatchPicker: ColorSwatchPickerSpec,
  List: ListSpec,
  Input: InputSpec,
  Switcher: SwitcherSpec,
  Nav: NavSpec,
  Label: LabelSpec,
  FieldError: FieldErrorSpec,
  Heading: HeadingSpec,
  Description: DescriptionSpec,
  DateSegment: DateSegmentSpec,
  TimeSegment: DateSegmentSpec,
  Icon: IconSpec,
  SelectTrigger: SelectTriggerSpec,
  SelectValue: SelectValueSpec,
  SelectIcon: SelectIconSpec,
  Avatar: AvatarSpec,
  AvatarGroup: AvatarGroupSpec,
  InlineAlert: InlineAlertSpec,
  ButtonGroup: ButtonGroupSpec,
  StatusLight: StatusLightSpec,
  ProgressCircle: ProgressCircleSpec,
};

/**
 * 컴포넌트 tag에 대응하는 HTML element 이름을 반환한다.
 *
 * - spec이 등록되어 있고 `element`가 정적 문자열이면 그대로 반환
 * - spec이 없거나 `element`가 함수/미설정이면 `tag.toLowerCase()` fallback
 *
 * Phase 2에서 `ComponentSpec.element` 함수형 타입 확장 후 동적 해석(예: Heading level)을
 * 지원하도록 분기가 추가된다. 현재는 정적 해석만 수행.
 */
export function getElementForTag(
  tag: string,
  _props?: Record<string, unknown>,
): string {
  const spec = TAG_SPEC_MAP[tag];
  if (!spec) return tag.toLowerCase();

  if (typeof spec.element === "string") return spec.element;

  // 함수형 element는 Pre-Phase 0 범위 밖 — Phase 2에서 분기 추가
  return tag.toLowerCase();
}

/**
 * 해당 tag가 spec registry에 등록되어 있는지 반환한다.
 * ADR-058 Phase 1: Preview fallback 렌더링이 `react-aria-*` className과
 * `data-size` 등 spec 기반 attribute를 자동 주입할지 판정하는 데 사용.
 */
export function hasSpec(tag: string): boolean {
  return tag in TAG_SPEC_MAP;
}

/**
 * spec registry에서 해당 tag의 defaultSize를 반환한다. 미등록 태그는 undefined.
 */
export function getDefaultSizeForTag(tag: string): string | undefined {
  const spec = TAG_SPEC_MAP[tag];
  return spec?.defaultSize as string | undefined;
}
