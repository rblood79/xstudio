/**
 * TAG_SPEC_MAP — Tag → ComponentSpec 매핑 (ADR-100 Phase 6)
 *
 * ElementSprite.tsx에서 추출. StoreRenderBridge에서도 재사용.
 */

import type { ComponentSpec } from "@composition/specs";
import {
  ButtonSpec,
  BadgeSpec,
  TextSpec,
  CardSpec,
  DialogSpec,
  LinkSpec,
  PopoverSpec,
  SeparatorSpec,
  ToggleButtonSpec,
  ToggleButtonGroupSpec,
  TooltipSpec,
  TextFieldSpec,
  TextAreaSpec,
  NumberFieldSpec,
  SearchFieldSpec,
  CheckboxSpec,
  CheckboxGroupSpec,
  RadioSpec,
  RadioGroupSpec,
  SwitchSpec,
  FormSpec,
  SelectSpec,
  ComboBoxSpec,
  ListBoxSpec,
  SliderSpec,
  MeterSpec,
  ProgressBarSpec,
  TableSpec,
  TreeSpec,
  TabsSpec,
  TabListSpec,
  TabPanelsSpec,
  TabPanelSpec,
  TabSpec,
  MenuSpec,
  BreadcrumbsSpec,
  BreadcrumbSpec,
  PaginationSpec,
  GridListSpec,
  DisclosureSpec,
  DisclosureGroupSpec,
  ToolbarSpec,
  ToastSpec,
  NavSpec,
  GroupSpec,
  SlotSpec,
  SkeletonSpec,
  DropZoneSpec,
  FileTriggerSpec,
  MaskedFrameSpec,
  InputSpec,
  ListSpec,
  SwitcherSpec,
  DatePickerSpec,
  DateRangePickerSpec,
  DateFieldSpec,
  TimeFieldSpec,
  DateInputSpec,
  CalendarSpec,
  CalendarHeaderSpec,
  CalendarGridSpec,
  ColorPickerSpec,
  ColorFieldSpec,
  ColorSliderSpec,
  ColorAreaSpec,
  ColorWheelSpec,
  ColorSwatchSpec,
  ColorSwatchPickerSpec,
  LabelSpec,
  FieldErrorSpec,
  HeadingSpec,
  ParagraphSpec,
  KbdSpec,
  CodeSpec,
  DescriptionSpec,
  SliderTrackSpec,
  ProgressBarTrackSpec,
  ProgressBarValueSpec,
  MeterTrackSpec,
  MeterValueSpec,
  SliderThumbSpec,
  SliderOutputSpec,
  DateSegmentSpec,
  SelectTriggerSpec,
  SelectValueSpec,
  SelectIconSpec,
  TagSpec,
  TagGroupSpec,
  IconSpec,
  AvatarSpec,
  AvatarGroupSpec,
  StatusLightSpec,
  InlineAlertSpec,
  ButtonGroupSpec,
  ProgressCircleSpec,
  IllustratedMessageSpec,
  CardViewSpec,
  TableViewSpec,
} from "@composition/specs";

// ADR-094: 수동 등록 spec 기반 원본. `TAG_SPEC_MAP` 자체는 하단에서
//   `expandChildSpecs(BASE_TAG_SPEC_MAP)` 로 생성되어 각 spec 의 `childSpecs` 가
//   PascalCase 키로 자동 추가된다 (ListBoxItem / GridListItem 등). 수동 등록이
//   우선이므로 기존 중복 entry(예: Label — 현재 Spec 에는 childSpecs 아니지만
//   수동 등록) 는 덮어쓰지 않는다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BASE_TAG_SPEC_MAP: Record<string, ComponentSpec<any>> = {
  // Core components
  Button: ButtonSpec,
  Text: TextSpec,
  CheckboxGroup: CheckboxGroupSpec,
  Checkbox: CheckboxSpec,
  Switch: SwitchSpec,
  RadioGroup: RadioGroupSpec,
  Radio: RadioSpec,
  Slider: SliderSpec,
  Input: InputSpec,
  TextField: TextFieldSpec,
  SearchField: SearchFieldSpec,
  Select: SelectSpec,
  ComboBox: ComboBoxSpec,
  ProgressBar: ProgressBarSpec,
  Switcher: SwitcherSpec,
  TabBar: SwitcherSpec,
  List: ListSpec,
  MaskedFrame: MaskedFrameSpec,
  ToggleButton: ToggleButtonSpec,
  ToggleButtonGroup: ToggleButtonGroupSpec,
  ListBox: ListBoxSpec,
  Badge: BadgeSpec,
  Icon: IconSpec,
  Tag: TagSpec,
  TagGroup: TagGroupSpec,
  Meter: MeterSpec,
  Separator: SeparatorSpec,
  Link: LinkSpec,
  Breadcrumbs: BreadcrumbsSpec,
  Breadcrumb: BreadcrumbSpec,
  Card: CardSpec,
  Nav: NavSpec,
  Menu: MenuSpec,
  Tabs: TabsSpec,
  TabList: TabListSpec,
  TabPanels: TabPanelsSpec,
  TabPanel: TabPanelSpec,
  Tab: TabSpec,
  NumberField: NumberFieldSpec,
  GridList: GridListSpec,
  Tree: TreeSpec,
  Table: TableSpec,
  Disclosure: DisclosureSpec,
  DisclosureGroup: DisclosureGroupSpec,
  Tooltip: TooltipSpec,
  Popover: PopoverSpec,
  Dialog: DialogSpec,
  ColorSwatch: ColorSwatchSpec,
  ColorSlider: ColorSliderSpec,
  TimeField: TimeFieldSpec,
  DateField: DateFieldSpec,
  ColorArea: ColorAreaSpec,
  Calendar: CalendarSpec,
  RangeCalendar: CalendarSpec,
  CalendarHeader: CalendarHeaderSpec,
  CalendarGrid: CalendarGridSpec,
  ColorWheel: ColorWheelSpec,
  DatePicker: DatePickerSpec,
  ColorPicker: ColorPickerSpec,
  DateRangePicker: DateRangePickerSpec,
  TextArea: TextAreaSpec,
  Form: FormSpec,
  Toolbar: ToolbarSpec,
  FileTrigger: FileTriggerSpec,
  DropZone: DropZoneSpec,
  Skeleton: SkeletonSpec,
  Toast: ToastSpec,
  Pagination: PaginationSpec,
  ColorField: ColorFieldSpec,
  ColorSwatchPicker: ColorSwatchPickerSpec,
  Group: GroupSpec,
  Slot: SlotSpec,
  Avatar: AvatarSpec,
  AvatarGroup: AvatarGroupSpec,
  StatusLight: StatusLightSpec,
  InlineAlert: InlineAlertSpec,
  ButtonGroup: ButtonGroupSpec,
  ProgressCircle: ProgressCircleSpec,
  IllustratedMessage: IllustratedMessageSpec,
  CardView: CardViewSpec,
  TableView: TableViewSpec,
  // child specs (compound 컴포넌트 하위 요소)
  Label: LabelSpec,
  FieldError: FieldErrorSpec,
  Heading: HeadingSpec,
  Paragraph: ParagraphSpec,
  Kbd: KbdSpec,
  Code: CodeSpec,
  Description: DescriptionSpec,
  SliderTrack: SliderTrackSpec,
  ProgressBarTrack: ProgressBarTrackSpec,
  ProgressBarValue: ProgressBarValueSpec,
  MeterTrack: MeterTrackSpec,
  MeterValue: MeterValueSpec,
  SliderThumb: SliderThumbSpec,
  SliderOutput: SliderOutputSpec,
  DateSegment: DateSegmentSpec,
  TimeSegment: DateSegmentSpec,
  SelectTrigger: SelectTriggerSpec,
  SelectValue: SelectValueSpec,
  // ADR-102: SelectIcon — RAC 공식 미존재 composition 고유 D3 시각 element (chevron 아이콘).
  //   BC HIGH (tag 저장 직렬화) → 정당화 유지. SelectIconSpec 을 4 tag 공유 (아래 3 포함).
  SelectIcon: SelectIconSpec,
  ComboBoxWrapper: SelectTriggerSpec,
  ComboBoxInput: SelectValueSpec,
  // ADR-101: ComboBoxTrigger — Compositional Architecture 고유 element (selfcontained 정당화).
  ComboBoxTrigger: SelectIconSpec,
  SearchFieldWrapper: SelectTriggerSpec,
  SearchInput: SelectValueSpec,
  // ADR-102: SearchIcon/SearchClearButton — SelectIconSpec 공유 (시각 일관성).
  SearchIcon: SelectIconSpec,
  SearchClearButton: SelectIconSpec,
  DateInput: DateInputSpec,
};

/**
 * ADR-094: `BASE_TAG_SPEC_MAP` 의 각 spec 의 `childSpecs` 를 PascalCase 키로 자동 추가.
 *
 * - 수동 등록 entry 는 그대로 우선 (덮어쓰지 않음).
 * - child spec 이름이 이미 수동 entry 와 겹치면 수동 entry 유지.
 * - child spec 의 `childSpecs` 는 현재 1 단계만 전개 (중첩 childSpecs 사례 없음).
 * - 본 확장으로 ListBoxItem / GridListItem 등 기존 `TAG_SPEC_MAP` 미등록 child spec
 *   이 `getSpecForTag` / `isSpecPath` / `LOWERCASE_TAG_SPEC_MAP` / `specPresetResolver` /
 *   `useLayoutAuxiliary` 등 모든 소비처에서 자동 조회 가능.
 */
function expandChildSpecs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  base: Record<string, ComponentSpec<any>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, ComponentSpec<any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, ComponentSpec<any>> = { ...base };
  for (const spec of Object.values(base)) {
    const children = spec.childSpecs;
    if (!children || children.length === 0) continue;
    for (const child of children) {
      if (out[child.name] === undefined) {
        out[child.name] = child;
      }
    }
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TAG_SPEC_MAP: Record<
  string,
  ComponentSpec<any>
> = expandChildSpecs(BASE_TAG_SPEC_MAP);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSpecForTag(tag: string): ComponentSpec<any> | null {
  return TAG_SPEC_MAP[tag] ?? null;
}

// ADR-058 Phase 4: `TEXT_TAGS` 및 `buildTextNodeData` 경로 완전 폐지.
// 모든 text 컴포넌트(Text/Heading/Paragraph/Kbd/Code/Label/Description/FieldError/InlineAlert)가
// spec 경로(buildSpecNodeData)로 통일됨. `StoreRenderBridge.isSpecPath`는 단순히
// TAG_SPEC_MAP 등록 여부만 확인.

/** 이미지 렌더링 대상 태그 (ImageSprite / buildImageNodeData 경로) */
export const IMAGE_TAGS = new Set(["Image", "Avatar", "Logo", "Thumbnail"]);
