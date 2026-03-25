/**
 * Element Sprite
 *
 * 🚀 Phase 10 B1.2: Element 타입별 스프라이트 디스패처
 * 🚀 Phase 11 B2.5: Layout 컨테이너 및 UI 컴포넌트 확장
 *
 * Element의 tag와 style에 따라 적절한 Sprite 컴포넌트로 렌더링합니다.
 *
 * @since 2025-12-11 Phase 10 B1.2
 * @updated 2025-12-11 Phase 11 B2.5 - Layout/UI 확장
 */

import { useExtend } from "@pixi/react";
import { PIXI_COMPONENTS } from "../pixiSetup";
import { memo, useMemo, useContext, useCallback, useRef } from "react";
import type { Element } from "../../../../types/core/store.types";
// 🚀 Phase 7: registry 등록은 LayoutContainer에서 처리
// import { registerElement, unregisterElement } from '../elementRegistry';
import { useSkiaNode } from "../skia/useSkiaNode";
import type { SkiaNodeData } from "../skia/nodeRenderers";
import { LayoutComputedSizeContext } from "../layoutContext";
import {
  convertStyle,
  cssColorToHex,
  parseCSSSize,
  type CSSStyle,
} from "./styleConverter";
import { Graphics as PixiGraphics } from "pixi.js";
import { useAtomValue, useSetAtom } from "jotai";
import { selectAtom } from "jotai/utils";
import { previewComponentStateAtom } from "../../../panels/styles/atoms/componentStateAtom";
import { isFillV2Enabled } from "../../../../utils/featureFlags";
import { fillsToSkiaFillStyle } from "../../../panels/styles/utils/fillToSkia";
import type { FillStyle } from "../skia/types";
import { BoxSprite } from "./BoxSprite";
import { TextSprite } from "./TextSprite";
import { ImageSprite } from "./ImageSprite";
import { specShapesToSkia } from "../skia/specShapeConverter";
import { withAccentOverride } from "../../../../utils/theme/tintToSkiaColors";
import type { TintPreset } from "../../../../utils/theme/tintToSkiaColors";
import type {
  ComponentSpec,
  ComponentState,
  Shape,
  TokenRef,
} from "@xstudio/specs";
import { resolveToken } from "@xstudio/specs";
import { getNecessityIndicatorSuffix } from "@xstudio/shared/components";
import {
  ButtonSpec,
  BadgeSpec,
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
  SLIDER_DIMENSIONS,
  MeterSpec,
  ProgressBarSpec,
  TableSpec,
  TreeSpec,
  TabsSpec,
  MenuSpec,
  BreadcrumbsSpec,
  PaginationSpec,
  GridListSpec,
  DisclosureSpec,
  DisclosureGroupSpec,
  ToolbarSpec,
  ToastSpec,
  NavSpec,
  PanelSpec,
  GroupSpec,
  SlotSpec,
  SkeletonSpec,
  DropZoneSpec,
  FileTriggerSpec,
  ScrollBoxSpec,
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
  IconSpec,
  AvatarSpec,
  AvatarGroupSpec,
  StatusLightSpec,
  InlineAlertSpec,
  ButtonGroupSpec,
  ProgressCircleSpec,
  // ImageSpec removed — ImageSprite handles rendering directly
  IllustratedMessageSpec,
  CardViewSpec,
  TableViewSpec,
} from "@xstudio/specs";
import {
  PixiButton,
  PixiCheckbox,
  PixiCheckboxGroup,
  PixiCheckboxItem,
  PixiRadio,
  PixiRadioItem,
  PixiSlider,
  PixiInput,
  PixiSelect,
  PixiProgressBar,
  PixiSwitcher,
  PixiScrollBox,
  PixiList,
  PixiMaskedFrame,
  // Phase 1 WebGL Migration Components
  PixiToggleButton,
  PixiToggleButtonGroup,
  PixiListBox,
  PixiBadge,
  PixiMeter,
  // Phase 2 WebGL Migration Components
  PixiSeparator,
  PixiLink,
  PixiBreadcrumbs,
  PixiCard,
  PixiMenu,
  PixiTabs,
  // Phase 3 WebGL Migration Components
  PixiNumberField,
  PixiSearchField,
  PixiComboBox,
  // Phase 4 WebGL Migration Components
  PixiGridList,
  PixiTree,
  PixiTable,
  // Phase 5 WebGL Migration Components
  PixiDisclosure,
  PixiDisclosureGroup,
  PixiTooltip,
  PixiPopover,
  PixiDialog,
  // Phase 6 WebGL Migration Components
  PixiColorSwatch,
  PixiColorSlider,
  PixiTimeField,
  PixiDateField,
  PixiColorArea,
  PixiCalendar,
  PixiColorWheel,
  PixiDatePicker,
  PixiColorPicker,
  PixiDateRangePicker,
  // Phase 7 WebGL Migration Components
  PixiTextField,
  PixiSwitch,
  PixiTextArea,
  PixiForm,
  PixiToolbar,
  PixiFileTrigger,
  PixiDropZone,
  PixiSkeleton,
  // Phase 8 WebGL Migration Components
  PixiToast,
  PixiPagination,
  PixiColorField,
  PixiColorSwatchPicker,
  PixiGroup,
  PixiSlot,
  PixiPanel,
} from "../ui";
import { useStore } from "../../../stores";
import { shallow } from "zustand/shallow";
import {
  useThemeConfigVersion,
  useResolvedSkiaTheme,
} from "../../../../stores/themeConfigStore";
import { useResolvedElement } from "./useResolvedElement";
import { isFlexContainer, isGridContainer } from "../layout";
import { measureWrappedTextHeight } from "../utils/textMeasure";
import { PHANTOM_INDICATOR_CONFIGS } from "../layout/engines/utils";

// ============================================
// Constants
// ============================================

/**
 * UI 컴포넌트 size별 기본 borderRadius (ButtonSpec radius 토큰 기준)
 * xs/sm → radius.sm(4), md → radius.md(6), lg/xl → radius.lg(8)
 * @see packages/specs/src/primitives/radius.ts
 * @see packages/specs/src/components/Button.spec.ts sizes
 */
const UI_COMPONENT_DEFAULT_BORDER_RADIUS: Record<string, number> = {
  xs: 4, // radius.sm
  sm: 4, // radius.sm
  md: 6, // radius.md
  lg: 8, // radius.lg
  xl: 8, // radius.lg
};

// ============================================
// Types
// ============================================

export interface LayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementSpriteProps {
  element: Element;
  /** 레이아웃 계산된 위치 (있으면 style보다 우선) */
  layoutPosition?: LayoutPosition;
  onChange?: (elementId: string, value: unknown) => void;
  /** 🚀 Phase 10: Container 타입 컴포넌트의 children 요소들 */
  childElements?: Element[];
  /** 🚀 Phase 10: children 요소 렌더링 함수 */
  renderChildElement?: (element: Element) => React.ReactNode;
}

// ============================================
// Tag to Sprite Mapping
// ============================================

const EMPTY_CHILDREN: Element[] = [];

/**
 * 텍스트 관련 태그들
 */
const TEXT_TAGS = new Set([
  "Text",
  "Heading",
  "Description",
  "Paragraph",
  "Link",
  "Strong",
  "Em",
  "Code",
  "Pre",
  "Blockquote",
  "ListItem",
]);

/**
 * 이미지 관련 태그들
 */
const IMAGE_TAGS = new Set(["Image", "Avatar", "Logo", "Thumbnail"]);

/**
 * UI 컴포넌트 태그들 (Phase 11 B2.4)
 */
const UI_BUTTON_TAGS = new Set(["Button", "SubmitButton"]);

const UI_CHECKBOX_GROUP_TAGS = new Set(["CheckboxGroup"]); // CheckboxGroup 컨테이너
const UI_CHECKBOX_ITEM_TAGS = new Set(["Checkbox", "CheckBox"]); // Checkbox 개별 아이템 (Switch/Toggle은 UI_SWITCH_TAGS로 분리)
const UI_RADIO_GROUP_TAGS = new Set(["RadioGroup"]); // RadioGroup 컨테이너
const UI_RADIO_ITEM_TAGS = new Set(["Radio"]); // Radio 개별 아이템 (투명 hit area만)

/**
 * UI 컴포넌트 태그들 (Phase 6)
 */
const UI_SLIDER_TAGS = new Set(["Slider"]);
const UI_INPUT_TAGS = new Set(["Input"]); // TextField/TextInput은 UI_TEXTFIELD_TAGS, SearchField는 UI_SEARCHFIELD_TAGS로 분리
const UI_SELECT_TAGS = new Set(["Select", "Dropdown"]); // ComboBox는 UI_COMBOBOX_TAGS로 분리
const UI_PROGRESS_TAGS = new Set([
  "ProgressBar",
  "Progress",
  "LoadingBar",
  "ProgressCircle",
]);
const UI_SWITCHER_TAGS = new Set(["Switcher", "SegmentedControl", "TabBar"]);
const UI_SCROLLBOX_TAGS = new Set([
  "ScrollBox",
  "ScrollContainer",
  "ScrollView",
]);
const UI_LIST_TAGS = new Set(["List", "ItemList", "VirtualList"]);
const UI_MASKEDFRAME_TAGS = new Set([
  "MaskedFrame",
  "ClippedImage",
  "MaskedImage",
  "AvatarImage",
]);

/**
 * Phase 1 WebGL Migration 컴포넌트 태그들
 */
const UI_TOGGLEBUTTON_TAGS = new Set(["ToggleButton"]);
const UI_TOGGLEBUTTONGROUP_TAGS = new Set(["ToggleButtonGroup"]);
const UI_LISTBOX_TAGS = new Set(["ListBox"]);
const UI_BADGE_TAGS = new Set(["Badge", "Tag", "Chip", "Icon"]);
const UI_METER_TAGS = new Set(["Meter", "Gauge"]);
const UI_STATUSLIGHT_TAGS = new Set(["StatusLight"]);

/**
 * Phase 2 WebGL Migration 컴포넌트 태그들
 */
const UI_SEPARATOR_TAGS = new Set(["Separator", "Divider", "Hr"]);
const UI_LINK_TAGS = new Set(["Link", "Anchor", "A"]);
const UI_BREADCRUMBS_TAGS = new Set(["Breadcrumbs"]);
const UI_CARD_TAGS = new Set(["Card", "Box"]);
const UI_PANEL_TAGS = new Set(["Panel"]);
const UI_MENU_TAGS = new Set(["Menu", "ContextMenu", "DropdownMenu"]);
const UI_TABS_TAGS = new Set(["Tabs", "TabList"]);

/**
 * Phase 3 WebGL Migration 컴포넌트 태그들
 */
const UI_NUMBERFIELD_TAGS = new Set(["NumberField"]);
const UI_SEARCHFIELD_TAGS = new Set(["SearchField"]);
const UI_COMBOBOX_TAGS = new Set(["ComboBox"]);

/**
 * Phase 4 WebGL Migration 컴포넌트 태그들
 */
const UI_GRIDLIST_TAGS = new Set(["GridList"]);
const UI_TREE_TAGS = new Set(["Tree", "TreeView"]);
const UI_TABLE_TAGS = new Set(["Table", "DataTable", "DataGrid"]);

/**
 * Phase 5 WebGL Migration 컴포넌트 태그들
 */
const UI_DISCLOSURE_TAGS = new Set(["Disclosure"]);
const UI_DISCLOSUREGROUP_TAGS = new Set(["DisclosureGroup", "Accordion"]);
const UI_TOOLTIP_TAGS = new Set(["Tooltip"]);
const UI_POPOVER_TAGS = new Set(["Popover"]);
const UI_DIALOG_TAGS = new Set(["Dialog", "Modal", "AlertDialog"]);

/**
 * Phase 6 WebGL Migration 컴포넌트 태그들 - Date/Color Components
 */
const UI_COLORSWATCH_TAGS = new Set(["ColorSwatch"]);
const UI_COLORSLIDER_TAGS = new Set(["ColorSlider"]);
// DateField/TimeField: compositional 컴포넌트 전환 — 전용 Pixi 라우팅 제거, spec shapes 경로 사용
const UI_COLORAREA_TAGS = new Set(["ColorArea"]);
const UI_CALENDAR_TAGS = new Set([
  "Calendar",
  "RangeCalendar",
  "CalendarHeader",
  "CalendarGrid",
]);
const UI_COLORWHEEL_TAGS = new Set(["ColorWheel"]);
const UI_DATEPICKER_TAGS = new Set(["DatePicker"]);
const UI_COLORPICKER_TAGS = new Set(["ColorPicker"]);
const UI_DATERANGEPICKER_TAGS = new Set(["DateRangePicker"]);

/**
 * Phase 7 WebGL Migration 컴포넌트 태그들 - Form & Utility Components
 */
const UI_TEXTFIELD_TAGS = new Set(["TextField", "TextInput"]);
const UI_SWITCH_TAGS = new Set(["Switch", "Toggle"]);
const UI_TEXTAREA_TAGS = new Set(["TextArea", "Textarea"]);
const UI_FORM_TAGS = new Set(["Form"]);
const UI_TOOLBAR_TAGS = new Set(["Toolbar"]);
const UI_FILETRIGGER_TAGS = new Set(["FileTrigger", "FileUpload", "FileInput"]);
const UI_DROPZONE_TAGS = new Set(["DropZone", "FileDropZone"]);
const UI_SKELETON_TAGS = new Set(["Skeleton", "SkeletonLoader"]);

/**
 * Phase 8 WebGL Migration 컴포넌트 태그들 - Notification & Color Utility Components
 */
const UI_TOAST_TAGS = new Set(["Toast"]);
const UI_PAGINATION_TAGS = new Set(["Pagination"]);
const UI_COLORFIELD_TAGS = new Set(["ColorField"]);
const UI_COLORSWATCHPICKER_TAGS = new Set(["ColorSwatchPicker"]);
const UI_GROUP_TAGS = new Set(["Group"]);
const UI_SLOT_TAGS = new Set(["Slot"]);

/**
 * Select child composition 태그들
 */
const UI_SELECT_CHILD_TAGS = new Set([
  "SelectTrigger",
  "SelectValue",
  "SelectIcon",
  "ComboBoxWrapper",
  "ComboBoxInput",
  "ComboBoxTrigger",
]);

// Note: TEXT_TAGS, IMAGE_TAGS, UI_*_TAGS에 포함되지 않은 모든 태그는 BoxSprite로 렌더링됨

// ============================================
// ADR-022 Phase 5d: Label ← Field 부모 색상 상속
// CSS --field-accent cascade를 Skia TextSprite에 반영
// ============================================

/** Label을 자식으로 가지는 field 컴포넌트 태그 */
const FIELD_PARENT_TAGS = new Set([
  "TextField",
  "NumberField",
  "SearchField",
  "TextArea",
  "Select",
  "ComboBox",
  "DateField",
  "TimeField",
  "DatePicker",
  "DateRangePicker",
  "ColorField",
]);

// ============================================
// QW-3: Outline parsing helper for focus ring
// ============================================

/**
 * CSS outline shorthand → Skia outline 속성 파싱
 * "2px solid var(--accent)" → { width, color (Float32Array), offset }
 */
function parseOutlineShorthand(
  outline: string,
  outlineOffset?: string | number,
): { width: number; color: Float32Array; offset: number } | null {
  // "2px solid #6750A4" or "2px solid var(--accent)"
  const parts = outline.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const width = parseFloat(parts[0]);
  if (isNaN(width) || width <= 0) return null;

  // 색상: 마지막 파트 (style 토큰 "solid" 등 건너뛰기)
  let colorStr = parts.length >= 3 ? parts.slice(2).join(" ") : parts[1];

  // var(--xxx) → CSS custom property 해석 시도
  const varMatch = colorStr.match(/^var\(\s*(--.+?)\s*\)$/);
  if (varMatch) {
    try {
      const resolved = getComputedStyle(document.documentElement)
        .getPropertyValue(varMatch[1])
        .trim();
      if (resolved) colorStr = resolved;
    } catch {
      /* ignore */
    }
    // 해석 실패 시 기본 primary 색상
    if (colorStr.startsWith("var(")) colorStr = "#6750A4";
  }

  // hex → Float32Array RGBA
  const hex = cssColorToHex(colorStr, 0x6750a4);
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;

  const offset =
    typeof outlineOffset === "number"
      ? outlineOffset
      : typeof outlineOffset === "string"
        ? parseFloat(outlineOffset) || 0
        : 0;

  return { width, color: Float32Array.of(r, g, b, 1), offset };
}

// ============================================
// Sprite Type Detection
// ============================================

type SpriteType =
  | "box"
  | "text"
  | "image"
  | "button"
  | "checkboxGroup"
  | "checkboxItem"
  | "radioGroup"
  | "radioItem"
  | "slider"
  | "input"
  | "select"
  | "progressBar"
  | "switcher"
  | "scrollBox"
  | "list"
  | "maskedFrame"
  | "flex"
  | "grid"
  | "toggleButton"
  | "toggleButtonGroup"
  | "listBox"
  | "badge"
  | "meter"
  | "separator"
  | "link"
  | "breadcrumbs"
  | "card"
  | "panel"
  | "menu"
  | "tabs"
  | "numberField"
  | "searchField"
  | "comboBox"
  | "gridList"
  | "tree"
  | "table"
  | "disclosure"
  | "disclosureGroup"
  | "tooltip"
  | "popover"
  | "dialog"
  | "colorSwatch"
  | "colorSlider"
  | "colorArea"
  | "calendar"
  | "colorWheel"
  | "datePicker"
  | "colorPicker"
  | "dateRangePicker"
  | "textField"
  | "switch"
  | "textArea"
  | "form"
  | "toolbar"
  | "fileTrigger"
  | "dropZone"
  | "skeleton"
  | "toast"
  | "pagination"
  | "colorField"
  | "colorSwatchPicker"
  | "group"
  | "slot"
  | "selectChild"
  | "statusLight";

function getSpriteType(element: Element): SpriteType {
  const tag = element.tag;

  // UI 컴포넌트 우선 체크 (Phase 11 B2.4 + Phase 6)
  if (UI_BUTTON_TAGS.has(tag)) return "button";

  if (UI_CHECKBOX_GROUP_TAGS.has(tag)) return "checkboxGroup";
  if (UI_CHECKBOX_ITEM_TAGS.has(tag)) return "checkboxItem";
  if (UI_RADIO_GROUP_TAGS.has(tag)) return "radioGroup";
  if (UI_RADIO_ITEM_TAGS.has(tag)) return "radioItem";
  if (UI_SLIDER_TAGS.has(tag)) return "slider";
  if (UI_INPUT_TAGS.has(tag)) return "input";
  if (UI_SELECT_TAGS.has(tag)) return "select";
  // ProgressBar/ProgressCircle: TAG_SPEC_MAP에 등록 → spriteType "box" + hasSpecShapes로 표준 경로 사용
  // if (UI_PROGRESS_TAGS.has(tag)) return "progressBar";  // 제거: 전용 경로 대신 표준 spec shapes 경로
  if (UI_SWITCHER_TAGS.has(tag)) return "switcher";
  if (UI_SCROLLBOX_TAGS.has(tag)) return "scrollBox";
  if (UI_LIST_TAGS.has(tag)) return "list";
  if (UI_MASKEDFRAME_TAGS.has(tag)) return "maskedFrame";

  // Phase 1 WebGL Migration 컴포넌트
  if (UI_TOGGLEBUTTON_TAGS.has(tag)) return "toggleButton";
  if (UI_TOGGLEBUTTONGROUP_TAGS.has(tag)) return "toggleButtonGroup";
  if (UI_LISTBOX_TAGS.has(tag)) return "listBox";
  if (UI_BADGE_TAGS.has(tag)) return "badge";
  if (UI_METER_TAGS.has(tag)) return "meter";
  if (UI_STATUSLIGHT_TAGS.has(tag)) return "statusLight";

  // Phase 2 WebGL Migration 컴포넌트
  // Separator: 전용 spriteType 제거 → "box" + hasSpecShapes 표준 경로 (ProgressBar와 동일)
  if (UI_LINK_TAGS.has(tag)) return "link";
  if (UI_BREADCRUMBS_TAGS.has(tag)) return "breadcrumbs";
  if (UI_CARD_TAGS.has(tag)) return "card";
  if (UI_PANEL_TAGS.has(tag)) return "panel";
  if (UI_MENU_TAGS.has(tag)) return "menu";
  if (UI_TABS_TAGS.has(tag)) return "tabs";

  // Phase 3 WebGL Migration 컴포넌트
  if (UI_NUMBERFIELD_TAGS.has(tag)) return "numberField";
  if (UI_SEARCHFIELD_TAGS.has(tag)) return "searchField";
  if (UI_COMBOBOX_TAGS.has(tag)) return "comboBox";

  // Phase 4 WebGL Migration 컴포넌트
  if (UI_GRIDLIST_TAGS.has(tag)) return "gridList";
  if (UI_TREE_TAGS.has(tag)) return "tree";
  if (UI_TABLE_TAGS.has(tag)) return "table";

  // Phase 5 WebGL Migration 컴포넌트
  if (UI_DISCLOSURE_TAGS.has(tag)) return "disclosure";
  if (UI_DISCLOSUREGROUP_TAGS.has(tag)) return "disclosureGroup";
  if (UI_TOOLTIP_TAGS.has(tag)) return "tooltip";
  if (UI_POPOVER_TAGS.has(tag)) return "popover";
  if (UI_DIALOG_TAGS.has(tag)) return "dialog";

  // Phase 6 WebGL Migration 컴포넌트 - Date/Color Components
  if (UI_COLORSWATCH_TAGS.has(tag)) return "colorSwatch";
  if (UI_COLORSLIDER_TAGS.has(tag)) return "colorSlider";
  // DateField/TimeField: compositional — getComponentCategory 미분류 → spec shapes 경로
  if (UI_COLORAREA_TAGS.has(tag)) return "colorArea";
  if (UI_CALENDAR_TAGS.has(tag)) return "calendar";
  if (UI_COLORWHEEL_TAGS.has(tag)) return "colorWheel";
  if (UI_DATEPICKER_TAGS.has(tag)) return "datePicker";
  if (UI_COLORPICKER_TAGS.has(tag)) return "colorPicker";
  if (UI_DATERANGEPICKER_TAGS.has(tag)) return "dateRangePicker";

  // Phase 7 WebGL Migration 컴포넌트 - Form & Utility Components
  if (UI_TEXTFIELD_TAGS.has(tag)) return "textField";
  if (UI_SWITCH_TAGS.has(tag)) return "switch";
  if (UI_TEXTAREA_TAGS.has(tag)) return "textArea";
  if (UI_FORM_TAGS.has(tag)) return "form";
  if (UI_TOOLBAR_TAGS.has(tag)) return "toolbar";
  if (UI_FILETRIGGER_TAGS.has(tag)) return "fileTrigger";
  if (UI_DROPZONE_TAGS.has(tag)) return "dropZone";
  if (UI_SKELETON_TAGS.has(tag)) return "skeleton";

  // Phase 8 WebGL Migration 컴포넌트 - Notification & Color Utility Components
  if (UI_TOAST_TAGS.has(tag)) return "toast";
  if (UI_PAGINATION_TAGS.has(tag)) return "pagination";
  if (UI_COLORFIELD_TAGS.has(tag)) return "colorField";
  if (UI_COLORSWATCHPICKER_TAGS.has(tag)) return "colorSwatchPicker";
  if (UI_GROUP_TAGS.has(tag)) return "group";
  if (UI_SLOT_TAGS.has(tag)) return "slot";

  // Select child composition 컴포넌트
  if (UI_SELECT_CHILD_TAGS.has(tag)) return "selectChild";

  // TEXT/IMAGE: leaf 요소이므로 display 값과 무관하게 항상 전용 Sprite 사용
  if (TEXT_TAGS.has(tag)) return "text";
  if (IMAGE_TAGS.has(tag)) return "image";

  // 레이아웃 컨테이너 체크 (Phase 11 B2.5)
  // display: flex/grid인 경우에도 현재는 BoxSprite로 렌더링
  // (레이아웃 계산은 별도로 처리)
  if (isFlexContainer(element)) return "flex";
  if (isGridContainer(element)) return "grid";

  return "box";
}

// ============================================
// Tag → ComponentSpec Mapping
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TAG_SPEC_MAP: Record<string, ComponentSpec<any>> = {
  Button: ButtonSpec,
  SubmitButton: ButtonSpec,
  CheckboxGroup: CheckboxGroupSpec,
  Checkbox: CheckboxSpec,
  CheckBox: CheckboxSpec,
  Switch: SwitchSpec,
  Toggle: SwitchSpec,
  RadioGroup: RadioGroupSpec,
  Radio: RadioSpec,
  Slider: SliderSpec,
  Input: InputSpec,
  TextField: TextFieldSpec,
  TextInput: TextFieldSpec,
  SearchField: SearchFieldSpec,
  Select: SelectSpec,
  Dropdown: SelectSpec,
  ComboBox: ComboBoxSpec,
  ProgressBar: ProgressBarSpec,
  Progress: ProgressBarSpec,
  LoadingBar: ProgressBarSpec,
  Switcher: SwitcherSpec,
  SegmentedControl: SwitcherSpec,
  TabBar: SwitcherSpec,
  ScrollBox: ScrollBoxSpec,
  ScrollContainer: ScrollBoxSpec,
  ScrollView: ScrollBoxSpec,
  List: ListSpec,
  ItemList: ListSpec,
  VirtualList: ListSpec,
  MaskedFrame: MaskedFrameSpec,
  ClippedImage: MaskedFrameSpec,
  MaskedImage: MaskedFrameSpec,
  AvatarImage: MaskedFrameSpec,
  ToggleButton: ToggleButtonSpec,
  ToggleButtonGroup: ToggleButtonGroupSpec,
  ListBox: ListBoxSpec,
  Badge: BadgeSpec,
  Icon: IconSpec,
  Tag: TagSpec,
  Chip: BadgeSpec,
  Meter: MeterSpec,
  Gauge: MeterSpec,
  Separator: SeparatorSpec,
  Hr: SeparatorSpec,
  Link: LinkSpec,
  Anchor: LinkSpec,
  A: LinkSpec,
  Breadcrumbs: BreadcrumbsSpec,
  Card: CardSpec,
  Box: CardSpec,
  Nav: NavSpec,
  Navigation: NavSpec,
  Panel: PanelSpec,
  Menu: MenuSpec,
  ContextMenu: MenuSpec,
  DropdownMenu: MenuSpec,
  Tabs: TabsSpec,
  TabList: TabsSpec,
  NumberField: NumberFieldSpec,
  GridList: GridListSpec,
  Tree: TreeSpec,
  TreeView: TreeSpec,
  Table: TableSpec,
  DataTable: TableSpec,
  DataGrid: TableSpec,
  Disclosure: DisclosureSpec,
  DisclosureGroup: DisclosureGroupSpec,
  Accordion: DisclosureGroupSpec,
  Tooltip: TooltipSpec,
  Popover: PopoverSpec,
  Dialog: DialogSpec,
  Modal: DialogSpec,
  AlertDialog: DialogSpec,
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
  Textarea: TextAreaSpec,
  Form: FormSpec,
  Toolbar: ToolbarSpec,
  FileTrigger: FileTriggerSpec,
  FileUpload: FileTriggerSpec,
  FileInput: FileTriggerSpec,
  DropZone: DropZoneSpec,
  FileDropZone: DropZoneSpec,
  Skeleton: SkeletonSpec,
  SkeletonLoader: SkeletonSpec,
  Toast: ToastSpec,
  Pagination: PaginationSpec,
  ColorField: ColorFieldSpec,
  ColorSwatchPicker: ColorSwatchPickerSpec,
  Group: GroupSpec,
  Slot: SlotSpec,
  // Phase 1: Display/Feedback
  Avatar: AvatarSpec,
  AvatarGroup: AvatarGroupSpec,
  StatusLight: StatusLightSpec,
  InlineAlert: InlineAlertSpec,
  // Phase 2: Action/Group components (ADR-030)
  ButtonGroup: ButtonGroupSpec,
  ActionMenu: ButtonSpec,
  // Phase 3: Extended Controls (ADR-030)
  ProgressCircle: ProgressCircleSpec,
  // Image: ImageSprite handles rendering directly (not spec-based)
  // Phase 4: Advanced Components (ADR-030)
  IllustratedMessage: IllustratedMessageSpec,
  CardView: CardViewSpec,
  TableView: TableViewSpec,
  // child specs (compound 컴포넌트 하위 요소)
  Label: LabelSpec,
  FieldError: FieldErrorSpec,
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
  SelectIcon: SelectIconSpec,
  ComboBoxWrapper: SelectTriggerSpec,
  ComboBoxInput: SelectValueSpec,
  ComboBoxTrigger: SelectIconSpec,
  SearchFieldWrapper: SelectTriggerSpec,
  SearchInput: SelectValueSpec,
  SearchIcon: SelectIconSpec,
  SearchClearButton: SelectIconSpec,
  DateInput: DateInputSpec,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpecForTag(tag: string): ComponentSpec<any> | null {
  return TAG_SPEC_MAP[tag] ?? null;
}

/**
 * Spec shapes 내 텍스트가 word-wrap될 때 필요한 최소 높이를 계산한다.
 * 텍스트가 한 줄에 들어가면 undefined 반환 (auto-height 불필요).
 */
function measureSpecTextMinHeight(
  shapes: Shape[],
  containerWidth: number,
  sizeSpec: Record<string, unknown>,
  whiteSpace?: string,
  wordBreak?: string,
  overflowWrap?: string,
): number | undefined {
  // ADR-008: nowrap/pre → 텍스트 줄바꿈 없음 → 높이 확장 불필요
  if (whiteSpace === "nowrap" || whiteSpace === "pre") return undefined;

  const paddingY = (sizeSpec.paddingY as number) ?? 8;

  // CSS border-box 보정: border shape에서 borderWidth 추출
  const borderShape = shapes.find((s) => s.type === "border");
  const bgBorderWidth = borderShape
    ? (((borderShape as Record<string, unknown>).borderWidth as number) ?? 0)
    : 0;

  for (const shape of shapes) {
    if (shape.type !== "text" || !shape.text) continue;

    // fontSize: TokenRef일 수 있으므로 resolveToken으로 해석
    let fontSize = 14;
    if (shape.fontSize !== undefined) {
      if (typeof shape.fontSize === "number") {
        fontSize = shape.fontSize;
      } else if (
        typeof (shape.fontSize as unknown) === "string" &&
        (shape.fontSize as unknown as string).startsWith("{")
      ) {
        const resolved = resolveToken(shape.fontSize as unknown as TokenRef);
        fontSize =
          typeof resolved === "number"
            ? resolved
            : parseFloat(String(resolved)) || 14;
      }
    }

    const fontWeight =
      typeof shape.fontWeight === "number" ? shape.fontWeight : 500;
    const fontFamily = shape.fontFamily || "Pretendard";

    // maxWidth 계산: specShapesToSkia와 동일한 로직 + border-box 보정
    let maxWidth = shape.maxWidth ?? containerWidth;
    if (shape.x > 0 && shape.maxWidth == null) {
      const effectiveX = shape.x + bgBorderWidth;
      if (shape.align === "center") {
        maxWidth = containerWidth - effectiveX * 2;
      } else {
        maxWidth = containerWidth - effectiveX;
      }
      if (maxWidth < 1) maxWidth = containerWidth;
    }

    const lineHeight = fontSize * 1.2;
    const wrappedHeight = measureWrappedTextHeight(
      shape.text,
      fontSize,
      fontWeight,
      fontFamily,
      maxWidth,
      undefined,
      wordBreak as "normal" | "break-all" | "keep-all" | undefined,
      overflowWrap as "normal" | "break-word" | "anywhere" | undefined,
    );

    // 한 줄이면 auto-height 불필요
    if (wrappedHeight <= lineHeight + 0.5) return undefined;

    // 다중 줄: paddingY * 2 + wrappedHeight
    return paddingY * 2 + wrappedHeight;
  }

  return undefined;
}

/**
 * Column layout: shapes 위치를 세로 쌓기로 재배치
 *
 * Spec shapes는 항상 row 레이아웃(가로 배치)으로 생성됨.
 * flexDirection: column일 때 indicator 그룹을 상단 중앙에,
 * 텍스트를 그 아래에 배치하도록 좌표를 변환한다.
 *
 * 수정 이력 (W4-9):
 * Radio circle shape column 변환 수정.
 * 기존: 모든 circle에 `x = centerX + shape.radius` 적용 →
 *   outer/inner circle의 radius가 달라 center X가 불일치 (dot이 ring 중심에서 이탈).
 * 수정: indicator 블록의 center X = `centerX + boxSize / 2`를 고정하여
 *   모든 circle(ring, dot)이 동일한 center X를 공유하도록 변경.
 */
function rearrangeShapesForColumn(
  shapes: Shape[],
  containerWidth: number,
  gap: number,
): void {
  // indicator 크기 찾기 (첫 번째 고정 크기 roundRect/rect/circle)
  let boxSize = 0;
  for (const shape of shapes) {
    if (
      (shape.type === "roundRect" || shape.type === "rect") &&
      typeof shape.width === "number" &&
      shape.width > 0 &&
      shape.width !== containerWidth
    ) {
      boxSize = shape.width;
      break;
    }
    if (shape.type === "circle" && shape.radius > 0) {
      boxSize = shape.radius * 2;
      break;
    }
  }
  if (boxSize === 0) return;

  // indicator 블록 top-left X (box 전체를 수평 중앙 배치)
  const centerX = Math.round((containerWidth - boxSize) / 2);
  // indicator 블록 center X: circle의 center 좌표로 사용 (모든 circle 공통)
  // 수정(W4-9): 각 circle의 radius가 달라도 indicator 중앙(centerX + boxSize/2)에 고정
  const indicatorCenterX = centerX + boxSize / 2;

  for (const shape of shapes) {
    switch (shape.type) {
      case "roundRect":
      case "rect":
        if (typeof shape.width === "number" && shape.width <= boxSize) {
          shape.x = centerX;
        }
        break;
      case "circle":
        // specShapeConverter가 center → top-left 변환(x - radius)을 수행하므로
        // shape.x에는 center X를 유지해야 한다.
        // ring(outer)과 dot(inner) 모두 indicator 블록의 중앙 X를 공유한다.
        shape.x = indicatorCenterX;
        shape.y = boxSize / 2;
        break;
      case "line":
        shape.x1 += centerX;
        shape.x2 += centerX;
        break;
      case "text":
        // 텍스트를 indicator 아래에 배치, 가운데 정렬
        shape.x = 0;
        shape.y = boxSize + gap;
        shape.baseline = "top";
        shape.align = "center";
        shape.maxWidth = containerWidth;
        break;
      case "border":
      case "shadow":
        // target 참조 shape — 위치는 target을 따름
        break;
    }
  }
}

// ============================================
// Component
// ============================================

/**
 * ElementSprite
 *
 * Element의 tag와 style에 따라 적절한 Sprite를 렌더링합니다.
 *
 * @example
 * <ElementSprite
 *   element={element}
 *   isSelected={selectedIds.includes(element.id)}
 * />
 */
export const ElementSprite = memo(function ElementSprite({
  element,
  layoutPosition,
  onChange,
  childElements,
  renderChildElement,
}: ElementSpriteProps) {
  useExtend(PIXI_COMPONENTS);

  // Phase A: 미리보기 컴포넌트 상태 구독 (selectAtom으로 자신의 elementId만 구독 → O(1) 리렌더)
  const myPreviewStateAtom = useMemo(
    () =>
      selectAtom(previewComponentStateAtom, (s) =>
        s?.elementId === element.id ? s.state : null,
      ),
    [element.id],
  );
  const previewState = useAtomValue(myPreviewStateAtom);
  const setPreviewState = useSetAtom(previewComponentStateAtom);

  // 🚀 Phase 7: registry 등록은 LayoutContainer에서 처리
  // layout이 적용된 Container를 등록해야 SelectionBox 위치가 일치함
  const elementId = element.id;

  // 🚀 Store에서 최신 element 구독 — childrenMap/pageChildrenMap에서 전달된
  // prop element는 stale할 수 있으므로 elementsMap에서 최신 참조 사용
  const storeElement = useStore((state) => state.elementsMap.get(elementId));
  const latestElement = storeElement ?? element;

  // 🚀 성능 최적화: 각 ElementSprite가 자신의 선택 상태만 구독
  // 기존: ElementsLayer가 selectedElementIds 구독 → 전체 리렌더 O(n)
  // 개선: 각 ElementSprite가 자신의 선택 여부만 구독 → 변경된 요소만 리렌더 O(2)
  // selector가 boolean을 반환하므로 값이 변경될 때만 리렌더 트리거
  // 🚀 O(1) 최적화: Set.has() 사용 (includes() 대신)
  const isSelected =
    useStore((state) => state.selectedElementIdsSet.has(elementId)) ?? false;

  // ADR-021: Tint/DarkMode 변경 시 SkiaNodeData 재생성 트리거
  const themeVersion = useThemeConfigVersion();
  const skiaTheme = useResolvedSkiaTheme();

  // 부모 요소 확인 (CheckboxGroup 자식 여부 판단용)
  // 🚀 최적화: elements 배열 대신 elementsMap 사용 (O(1) 조회)
  // elements 배열 전체 구독 → 다른 요소 변경 시에도 리렌더링 발생
  // elementsMap.get() → 해당 부모 요소만 조회, 불필요한 리렌더링 방지
  const parentElement = useStore((state) => {
    if (!element.parent_id) return null;
    return state.elementsMap.get(element.parent_id) ?? null;
  });

  // Tag → TagGroup 조상 size/allowsRemoving 상속 (CSS parent delegation 에뮬레이션)
  // Tag > TagList > TagGroup 구조에서 TagGroup의 props를 Tag에 전파
  const tagGroupAncestorSize = useStore((state) => {
    if (element.tag !== "Tag" || !element.parent_id) return null;
    const tagList = state.elementsMap.get(element.parent_id);
    if (!tagList?.parent_id) return null;
    const ancestor =
      tagList.tag === "TagList"
        ? state.elementsMap.get(tagList.parent_id)
        : tagList.tag === "TagGroup"
          ? tagList
          : null;
    if (!ancestor || ancestor.tag !== "TagGroup") return null;
    return (
      ((ancestor.props as Record<string, unknown> | undefined)
        ?.size as string) || "md"
    );
  });

  const tagGroupAllowsRemoving = useStore((state) => {
    if (element.tag !== "Tag" || !element.parent_id) return false;
    const tagList = state.elementsMap.get(element.parent_id);
    if (!tagList?.parent_id) return false;
    const ancestor =
      tagList.tag === "TagList"
        ? state.elementsMap.get(tagList.parent_id)
        : tagList.tag === "TagGroup"
          ? tagList
          : null;
    if (!ancestor || ancestor.tag !== "TagGroup") return false;
    return Boolean(
      (ancestor.props as Record<string, unknown> | undefined)?.allowsRemoving,
    );
  });

  // Select/ComboBox → SelectTrigger/ComboBoxWrapper/SelectValue 조상 size 상속
  // Store에는 부모 Select/ComboBox에만 size prop이 있고,
  // 자식 wrapper/value element에는 없으므로 부모에서 읽어 전파
  const PARENT_SIZE_DELEGATION_TAGS = new Set([
    "SelectTrigger",
    "ComboBoxWrapper",
    "SelectValue",
    "SelectIcon",
    "ComboBoxInput",
    "ComboBoxTrigger",
    "ProgressBarTrack",
    "ProgressBarValue",
    "MeterTrack",
    "MeterValue",
    "SliderTrack",
    "SliderOutput",
    "SliderThumb",
    "SearchFieldWrapper",
    "SearchIcon",
    "SearchInput",
    "SearchClearButton",
    "DateInput",
    "DateSegment",
    "TimeSegment",
    "Checkbox",
    "Radio",
    "Label",
  ]);
  const SIZE_DELEGATION_PARENT_TAGS = new Set([
    "Select",
    "ComboBox",
    "SearchField",
    "ProgressBar",
    "Meter",
    "Switch",
    "Checkbox",
    "Radio",
    "CheckboxGroup",
    "RadioGroup",
    "TagGroup",
    "TextField",
    "TextArea",
    "NumberField",
    "DateField",
    "TimeField",
    "ColorField",
    "Slider",
  ]);
  // Group 래퍼 태그: 구조적 중간 컨테이너 (size 없이 통과)
  const GROUP_WRAPPER_TAGS = new Set(["CheckboxItems", "RadioItems"]);
  const parentDelegatedSize = useStore((state) => {
    if (!PARENT_SIZE_DELEGATION_TAGS.has(element.tag) || !element.parent_id)
      return null;
    // 직접 부모 확인
    const parent = state.elementsMap.get(element.parent_id);
    if (!parent) return null;
    if (SIZE_DELEGATION_PARENT_TAGS.has(parent.tag)) {
      const parentSize =
        ((parent.props as Record<string, unknown> | undefined)
          ?.size as string) ?? null;
      if (parentSize) return parentSize;
      // 부모(Checkbox/Radio)에 size 없으면 → 조부모(CheckboxGroup/RadioGroup) 탐색
      if (parent.parent_id) {
        const gp = state.elementsMap.get(parent.parent_id);
        if (gp) {
          // 조부모가 Group 래퍼(CheckboxItems 등)면 → 증조부모 탐색
          if (GROUP_WRAPPER_TAGS.has(gp.tag) && gp.parent_id) {
            const ggp = state.elementsMap.get(gp.parent_id);
            if (ggp && SIZE_DELEGATION_PARENT_TAGS.has(ggp.tag)) {
              return (
                ((ggp.props as Record<string, unknown> | undefined)
                  ?.size as string) ?? null
              );
            }
          }
          if (SIZE_DELEGATION_PARENT_TAGS.has(gp.tag)) {
            return (
              ((gp.props as Record<string, unknown> | undefined)
                ?.size as string) ?? null
            );
          }
        }
      }
      return parentSize;
    }
    // 2단계 상위 (SelectValue → SelectTrigger → Select)
    if (parent.parent_id) {
      const grandParent = state.elementsMap.get(parent.parent_id);
      if (grandParent && SIZE_DELEGATION_PARENT_TAGS.has(grandParent.tag)) {
        return (
          ((grandParent.props as Record<string, unknown> | undefined)
            ?.size as string) ?? null
        );
      }
    }
    return null;
  });

  // 🚀 DateField/TimeField → DateInput: 부모의 parentTag/granularity/hourCycle/locale 전파
  const isDateInput = element.tag === "DateInput";
  const dateInputParentTag = useStore((state) => {
    if (!isDateInput || !element.parent_id) return null;
    const p = state.elementsMap.get(element.parent_id);
    return p && (p.tag === "DateField" || p.tag === "TimeField") ? p.tag : null;
  });
  const dateInputGranularity = useStore((state) => {
    if (!isDateInput || !element.parent_id) return null;
    const p = state.elementsMap.get(element.parent_id);
    return (
      ((p?.props as Record<string, unknown> | undefined)
        ?.granularity as string) ?? null
    );
  });
  const dateInputHourCycle = useStore((state) => {
    if (!isDateInput || !element.parent_id) return null;
    const p = state.elementsMap.get(element.parent_id);
    return (
      ((p?.props as Record<string, unknown> | undefined)
        ?.hourCycle as number) ?? null
    );
  });
  const dateInputLocale = useStore((state) => {
    if (!isDateInput || !element.parent_id) return null;
    const p = state.elementsMap.get(element.parent_id);
    return (
      ((p?.props as Record<string, unknown> | undefined)?.locale as string) ??
      null
    );
  });

  // 🚀 Label → 부모 field의 necessityIndicator/isRequired 전파 (단일 selector)
  // primitive 반환으로 객체 비교 비용 제거 (Zustand Object.is 안정성)
  const isLabel = element.tag === "Label";
  const labelNecessityKey = useStore((state) => {
    if (!isLabel || !element.parent_id) return null;
    const p = state.elementsMap.get(element.parent_id);
    const pProps = p?.props as Record<string, unknown> | undefined;
    const ni = (pProps?.necessityIndicator as string) ?? null;
    if (!ni) return null;
    return `${ni}:${Boolean(pProps?.isRequired)}`;
  });
  const labelNecessityIndicator = labelNecessityKey
    ? labelNecessityKey.split(":")[0]
    : null;
  const labelIsRequired = labelNecessityKey
    ? labelNecessityKey.split(":")[1] === "true"
    : null;

  // 🚀 Select/ComboBox → SelectIcon/ComboBoxTrigger: 부모의 iconName 전파
  const ICON_DELEGATION_TAGS = new Set(["SelectIcon", "ComboBoxTrigger"]);
  const parentDelegatedIconName = useStore((state) => {
    if (!ICON_DELEGATION_TAGS.has(element.tag) || !element.parent_id)
      return null;
    // SelectIcon → SelectTrigger → Select (2단계)
    // ComboBoxTrigger → ComboBoxWrapper → ComboBox (2단계)
    const parent = state.elementsMap.get(element.parent_id);
    if (!parent) return null;
    const parentProps = parent.props as Record<string, unknown> | undefined;
    if (parentProps?.iconName) return parentProps.iconName as string;
    if (parent.parent_id) {
      const grandParent = state.elementsMap.get(parent.parent_id);
      if (grandParent) {
        const gp = grandParent.props as Record<string, unknown> | undefined;
        if (gp?.iconName) return gp.iconName as string;
      }
    }
    return null;
  });

  // 🚀 ProgressBar/Meter → Track/Value: 부모의 value/isIndeterminate/variant/size 전파
  // Zustand v5: 객체 반환 → 매번 새 ref → 무한 루프. primitive string으로 직렬화.
  const isProgressBarTrack =
    element.tag === "ProgressBarTrack" || element.tag === "MeterTrack";
  const isProgressBarValue =
    element.tag === "ProgressBarValue" || element.tag === "MeterValue";
  const isProgressBarChild = isProgressBarTrack || isProgressBarValue;
  const isSliderTrack = element.tag === "SliderTrack";
  const parentProgressValue = useStore((state) => {
    if (!isProgressBarChild || !element.parent_id) return null;
    const parent = state.elementsMap.get(element.parent_id);
    return (
      ((parent?.props as Record<string, unknown> | undefined)?.value as
        | number
        | undefined) ?? null
    );
  });
  const parentProgressIndeterminate = useStore((state) => {
    if (!isProgressBarChild || !element.parent_id) return false;
    const parent = state.elementsMap.get(element.parent_id);
    return !!(parent?.props as Record<string, unknown> | undefined)
      ?.isIndeterminate;
  });
  const parentProgressVariant = useStore((state) => {
    if (!isProgressBarChild || !element.parent_id) return null;
    const parent = state.elementsMap.get(element.parent_id);
    return (
      ((parent?.props as Record<string, unknown> | undefined)?.variant as
        | string
        | undefined) ?? null
    );
  });
  const parentProgressSize = useStore((state) => {
    if (!isProgressBarChild || !element.parent_id) return null;
    const parent = state.elementsMap.get(element.parent_id);
    return (
      ((parent?.props as Record<string, unknown> | undefined)?.size as
        | string
        | undefined) ?? null
    );
  });
  const parentProgressValueFormat = useStore((state) => {
    if (!isProgressBarValue || !element.parent_id) return null;
    const parent = state.elementsMap.get(element.parent_id);
    return (
      ((parent?.props as Record<string, unknown> | undefined)?.valueFormat as
        | string
        | undefined) ?? null
    );
  });
  const parentProgressShowValue = useStore((state) => {
    if (!isProgressBarValue || !element.parent_id) return true;
    const parent = state.elementsMap.get(element.parent_id);
    const pp = parent?.props as Record<string, unknown> | undefined;
    return pp?.showValue !== false;
  });
  const parentProgressMinValue = useStore((state) => {
    if (!isProgressBarChild || !element.parent_id) return null;
    const parent = state.elementsMap.get(element.parent_id);
    return (
      ((parent?.props as Record<string, unknown> | undefined)?.minValue as
        | number
        | undefined) ?? null
    );
  });
  const parentProgressMaxValue = useStore((state) => {
    if (!isProgressBarChild || !element.parent_id) return null;
    const parent = state.elementsMap.get(element.parent_id);
    return (
      ((parent?.props as Record<string, unknown> | undefined)?.maxValue as
        | number
        | undefined) ?? null
    );
  });

  // 🚀 Slider → SliderTrack: 부모의 value/minValue/maxValue/variant 전파
  const parentSliderValueSerialized = useStore((state) => {
    if (!isSliderTrack || !element.parent_id) return null;
    const parent = state.elementsMap.get(element.parent_id);
    const val = (parent?.props as Record<string, unknown> | undefined)?.value;
    return val !== undefined ? JSON.stringify(val) : null;
  });
  const parentSliderMinValue = useStore((state) => {
    if (!isSliderTrack || !element.parent_id) return null;
    const parent = state.elementsMap.get(element.parent_id);
    return (
      ((parent?.props as Record<string, unknown> | undefined)?.minValue as
        | number
        | undefined) ?? null
    );
  });
  const parentSliderMaxValue = useStore((state) => {
    if (!isSliderTrack || !element.parent_id) return null;
    const parent = state.elementsMap.get(element.parent_id);
    return (
      ((parent?.props as Record<string, unknown> | undefined)?.maxValue as
        | number
        | undefined) ?? null
    );
  });
  const parentSliderVariant = useStore((state) => {
    if (!isSliderTrack || !element.parent_id) return null;
    const parent = state.elementsMap.get(element.parent_id);
    return (
      ((parent?.props as Record<string, unknown> | undefined)?.variant as
        | string
        | undefined) ?? null
    );
  });

  // Checkbox/Radio/Switch 내부 Label: white-space: nowrap 동기화 (Skia 텍스트 렌더링용)
  // primitive 값으로 useMemo deps에 포함 가능
  const isLabelInNowrapParent = useStore((state) => {
    if (element.tag !== "Label" || !element.parent_id) return false;
    const parent = state.elementsMap.get(element.parent_id);
    if (!parent) return false;
    const NOWRAP_PARENTS = new Set([
      "Checkbox",
      "CheckBox",
      "CheckboxGroup",
      "Radio",
      "RadioGroup",
      "Switch",
      "Toggle",
    ]);
    return NOWRAP_PARENTS.has(parent.tag);
  });

  // 🚀 InlineAlert 자식 Heading/Description: 부모 spec에서 font 스타일 위임
  // 🚀 InlineAlert 자식 Heading/Description: 부모 spec에서 font 스타일 위임
  const inlineAlertFontStyle = useStore((state) => {
    const tag = element.tag;
    if (tag !== "Heading" && tag !== "Description") return null;
    if (!element.parent_id) return null;
    const parent = state.elementsMap.get(element.parent_id);
    if (parent?.tag !== "InlineAlert") return null;
    const sizeName =
      ((parent.props as Record<string, unknown> | undefined)?.size as string) ??
      "md";
    const specSize = (InlineAlertSpec.sizes[sizeName] ??
      InlineAlertSpec.sizes[InlineAlertSpec.defaultSize]) as Record<
      string,
      unknown
    >;
    if (tag === "Heading")
      return `${specSize.headingFontSize ?? 16}:${specSize.headingFontWeight ?? 700}`;
    return `${specSize.descFontSize ?? 14}:${specSize.descFontWeight ?? 400}`;
  });

  // 🚀 ToggleButtonGroup 내 ToggleButton의 위치 정보 (borderRadius 계산용)
  // CSS에서는 그룹 내 첫/끝 버튼만 외곽 모서리에 borderRadius 적용
  // 개별 selector로 분리하여 primitive 비교 (useShallow 대체)
  const isToggleInGroup = useStore((state) => {
    if (element.tag !== "ToggleButton" || !element.parent_id) return false;
    const parent = state.elementsMap.get(element.parent_id);
    return parent?.tag === "ToggleButtonGroup";
  });

  const toggleGroupOrientation = useStore((state) => {
    if (!isToggleInGroup || !element.parent_id) return "horizontal";
    const parent = state.elementsMap.get(element.parent_id);
    if (!parent) return "horizontal";
    return (
      ((parent.props as Record<string, unknown>)?.orientation as string) ||
      "horizontal"
    );
  });

  const togglePositionIndex = useStore((state) => {
    if (!isToggleInGroup || !element.parent_id) return -1;
    const parent = state.elementsMap.get(element.parent_id);
    if (!parent) return -1;
    const siblings = (state.childrenMap.get(parent.id) || [])
      .slice()
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    return siblings.findIndex((s) => s.id === element.id);
  });

  const toggleSiblingCount = useStore((state) => {
    if (!isToggleInGroup || !element.parent_id) return 0;
    const parent = state.elementsMap.get(element.parent_id);
    if (!parent) return 0;
    return (state.childrenMap.get(parent.id) || []).length;
  });

  const toggleGroupPosition = useMemo(
    () =>
      isToggleInGroup && togglePositionIndex !== -1
        ? {
            orientation: toggleGroupOrientation,
            isFirst: togglePositionIndex === 0,
            isLast: togglePositionIndex === toggleSiblingCount - 1,
            isOnly: toggleSiblingCount === 1,
          }
        : null,
    [
      isToggleInGroup,
      togglePositionIndex,
      toggleGroupOrientation,
      toggleSiblingCount,
    ],
  );

  // layoutPosition이 있으면 style을 오버라이드한 새 element 생성
  // G.1/G.2: Instance resolution + Variable resolution
  const resolvedElement = useResolvedElement(latestElement);

  // 🚀 레이아웃 엔진(Taffy/Dropflow)이 계산한 pixel 크기 수신
  // 퍼센트 기반 width/height를 실제 pixel 값으로 해석하는 데 사용
  const computedContainerSize = useContext(LayoutComputedSizeContext);

  const effectiveElement = useMemo(() => {
    if (layoutPosition) {
      const currentStyle = (resolvedElement.props?.style || {}) as Record<
        string,
        unknown
      >;
      return {
        ...resolvedElement,
        props: {
          ...resolvedElement.props,
          style: {
            ...currentStyle,
            left: layoutPosition.x,
            top: layoutPosition.y,
            width: layoutPosition.width,
            height: layoutPosition.height,
          },
        },
      };
    }

    // 🚀 CSS 키워드(%, fit-content 등)를 엔진 계산 결과 pixel 값으로 해석
    // DirectContainer가 Taffy/Dropflow를 통해 계산한 실제 pixel 크기를 직접 사용
    // computedContainerSize는 엔진이 키워드 값을 이미 resolve한 결과이므로
    // 키워드를 다시 적용하면 spec shapes가 문자열을 받아 렌더링 실패
    // (예: 'fit-content' → spec이 숫자 width 기대 → 배경/보더 미렌더링)
    if (computedContainerSize) {
      const currentStyle = (resolvedElement.props?.style || {}) as Record<
        string,
        unknown
      >;
      const w = currentStyle.width;
      const h = currentStyle.height;
      const INTRINSIC_KEYWORDS = ["fit-content", "min-content", "max-content"];
      const needsResolveWidth =
        typeof w === "string" &&
        (w.endsWith("%") || INTRINSIC_KEYWORDS.includes(w));
      const needsResolveHeight =
        typeof h === "string" &&
        (h.endsWith("%") || INTRINSIC_KEYWORDS.includes(h));

      if (needsResolveWidth || needsResolveHeight) {
        return {
          ...resolvedElement,
          props: {
            ...resolvedElement.props,
            style: {
              ...currentStyle,
              ...(needsResolveWidth
                ? { width: computedContainerSize.width }
                : {}),
              ...(needsResolveHeight
                ? { height: computedContainerSize.height }
                : {}),
            },
          },
        };
      }
    }

    return resolvedElement;
  }, [resolvedElement, layoutPosition, computedContainerSize]);

  // 🚀 InlineAlert 자식: spec 기반 font 스타일 주입 (WebGL TextSprite용)
  const effectiveElementForText = useMemo(() => {
    if (!inlineAlertFontStyle) return effectiveElement;
    const [fs, fw] = inlineAlertFontStyle.split(":").map(Number);
    const currentStyle = (effectiveElement.props?.style || {}) as Record<
      string,
      unknown
    >;
    if (currentStyle.fontSize != null && currentStyle.fontWeight != null)
      return effectiveElement;
    return {
      ...effectiveElement,
      props: {
        ...effectiveElement.props,
        style: {
          ...currentStyle,
          fontSize: currentStyle.fontSize ?? fs,
          fontWeight: currentStyle.fontWeight ?? fw,
        },
      },
    } as Element;
  }, [effectiveElement, inlineAlertFontStyle]);

  // Label은 spec shapes 경로(isUIComponent=true)에서 variant.text로 색상 결정
  // 부모 variant 상속은 L1489-1499의 PARENT_VARIANT_TO_LABEL에서 처리

  // Tabs/Breadcrumbs: 실제 자식 레이블을 spec shapes에 전달
  // 문제: childrenMap은 props 변경 시 갱신되지 않아 stale Element 참조
  // 해결: childrenMap(구조/ID) + elementsMap(최신 props) 조합
  // useRef 캐싱: useSyncExternalStore가 요구하는 참조 안정성 보장
  const syntheticLabelsRef = useRef<string[] | null>(null);
  const syntheticChildLabels = useStore(
    useCallback(
      (state) => {
        let next: string[] | null = null;
        if (element.tag === "Tabs") {
          const children = state.childrenMap.get(element.id) ?? [];
          let tabChildren = children.filter((c) => c.tag === "Tab");
          if (tabChildren.length === 0) {
            const tabList = children.find((c) => c.tag === "TabList");
            if (tabList) {
              tabChildren = (state.childrenMap.get(tabList.id) ?? []).filter(
                (c) => c.tag === "Tab",
              );
            }
          }
          next = tabChildren
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
            .map((t) => {
              const fresh = state.elementsMap.get(t.id) ?? t;
              const p = fresh.props as Record<string, unknown> | undefined;
              return String(p?.children || p?.label || p?.title || "Tab");
            });
        } else if (element.tag === "Breadcrumbs") {
          const children = state.childrenMap.get(element.id) ?? [];
          const crumbChildren = children.filter((c) => c.tag === "Breadcrumb");
          next = crumbChildren.map((c) => {
            const fresh = state.elementsMap.get(c.id) ?? c;
            const p = fresh.props as Record<string, unknown> | undefined;
            return String(p?.children || p?.label || p?.title || "Page");
          });
        }
        if (shallow(syntheticLabelsRef.current, next)) {
          return syntheticLabelsRef.current;
        }
        syntheticLabelsRef.current = next;
        return next;
      },
      [element.id, element.tag],
    ),
  );
  const effectiveElementWithTabs = useMemo(() => {
    if (syntheticChildLabels && syntheticChildLabels.length > 0) {
      const tag = (effectiveElement.tag ?? "").toLowerCase();
      const propKey = tag === "tabs" ? "_tabLabels" : "_crumbs";
      return {
        ...effectiveElement,
        props: { ...effectiveElement.props, [propKey]: syntheticChildLabels },
      } as Element;
    }
    return effectiveElement;
  }, [effectiveElement, syntheticChildLabels]);

  const spriteType = getSpriteType(effectiveElementWithTabs);

  // Phase 5: Skia 렌더 데이터 등록 (모든 요소 타입 공통)
  // 🚀 rules-of-hooks: 조건부 early return 전에 모든 훅을 실행해야 함
  const elementStyle = effectiveElementWithTabs.props?.style;
  const elementProps = effectiveElementWithTabs.props;
  const computedW = computedContainerSize?.width;
  const computedH = computedContainerSize?.height;

  const skiaNodeData = useMemo(() => {
    const style = elementStyle as CSSStyle | undefined;

    const isUIComponent =
      (spriteType !== "box" &&
        spriteType !== "text" &&
        spriteType !== "image" &&
        spriteType !== "flex" &&
        spriteType !== "grid") ||
      getSpecForTag(element.tag) != null;

    // Collection Item 태그: 카드형 배경/border를 기본 적용 (CSS 동기화)
    const isCardItem = element.tag === "GridListItem";
    const isListItem = element.tag === "ListBoxItem";
    const isCollectionItem = isCardItem || isListItem;

    if (!style && !isUIComponent && !isCollectionItem) return null;

    // display: none → 레이아웃에서 제외, 렌더링 스킵
    if (style?.display === "none") return null;

    const {
      transform,
      fill,
      stroke,
      borderRadius: convertedBorderRadius,
    } = convertStyle(style || {});
    const br =
      typeof convertedBorderRadius === "number"
        ? convertedBorderRadius
        : (convertedBorderRadius?.[0] ?? 0);

    // FIT_CONTENT(-2), MIN_CONTENT(-3), MAX_CONTENT(-4) sentinel 값이
    // transform.width/height에 들어올 수 있으므로 음수일 때 0으로 클램프
    const rawFallbackW = transform.width;
    const rawFallbackH = transform.height;
    // computedW != null → 레이아웃 엔진이 크기를 확정함 (0이어도 의도적)
    // computedW == null → 엔진 미확정, CSS fallback 사용
    const finalWidth =
      computedW != null
        ? computedW > 0
          ? computedW
          : 0
        : rawFallbackW > 0
          ? rawFallbackW
          : 0;
    const finalHeight =
      computedH != null
        ? computedH > 0
          ? computedH
          : 0
        : rawFallbackH > 0
          ? rawFallbackH
          : 0;

    const hasBgColor =
      style?.backgroundColor !== undefined &&
      style?.backgroundColor !== null &&
      style?.backgroundColor !== "";

    // 복합 form 컴포넌트: CSS 컨테이너가 transparent → WebGL 컨테이너도 transparent
    const tag = effectiveElementWithTabs.tag;

    const TRANSPARENT_CONTAINER_TAGS = new Set([
      "TextField",
      "NumberField",
      "SearchField",
      "DateField",
      "TimeField",
      "ColorField",
      "TextArea",
      "Textarea",
      "ComboBox",
      "Select",
      "Dropdown",
      "DatePicker",
      "Slider",
      "CheckboxGroup",
      "RadioGroup",
      "Switch",
      "Toggle",
      // ProgressBar/Meter: spec shapes가 track+fill 렌더링 → 컨테이너 투명 필수
      "ProgressBar",
      "Progress",
      "LoadingBar",
      "Meter",
      "Gauge",
      // StatusLight: 배경 없이 dot + text만 렌더링 → 컨테이너 투명 필수
      "StatusLight",
    ]);
    const isTransparentContainer =
      isUIComponent && TRANSPARENT_CONTAINER_TAGS.has(tag);

    const VARIANT_BG_COLORS: Record<string, number> = {
      default: 0xece6f0,
      primary: 0x6750a4,
      secondary: 0x625b71,
      tertiary: 0x7d5260,
      error: 0xb3261e,
      surface: 0xe6e0e9,
      outline: 0xfef7ff,
      ghost: 0xfef7ff,
    };
    const VARIANT_BG_ALPHA: Record<string, number> = {
      outline: 0,
      ghost: 0,
    };
    const VARIANT_BORDER_COLORS: Record<string, number> = {
      default: 0xcac4d0,
      primary: 0x6750a4,
      secondary: 0x625b71,
      tertiary: 0x7d5260,
      error: 0xb3261e,
      surface: 0xcac4d0,
      outline: 0x79747e,
    };

    const props = elementProps as Record<string, unknown> | undefined;
    // Label child variant 상속: spec shapes 경로
    // Label은 isUIComponent=true → 부모 variant에서 색상 상속
    const PARENT_VARIANT_TO_LABEL: Record<string, string> = {
      default: "default",
      primary: "default",
      secondary: "neutral",
      tertiary: "purple",
      error: "negative",
    };
    const variant = isUIComponent
      ? tag === "Label" &&
        parentElement?.tag &&
        FIELD_PARENT_TAGS.has(parentElement.tag)
        ? (PARENT_VARIANT_TO_LABEL[
            String(
              (parentElement.props as Record<string, unknown> | undefined)
                ?.variant || "default",
            )
          ] ?? "default")
        : String(props?.variant || "default")
      : "";

    let r: number, g: number, b: number;
    let effectiveAlpha: number;

    if (isUIComponent && !hasBgColor) {
      if (isTransparentContainer) {
        // 복합 form 컴포넌트: spec shapes가 내부 배경 렌더링 → 컨테이너는 투명
        r = 1;
        g = 1;
        b = 1;
        effectiveAlpha = 0;
      } else {
        const bgColor = VARIANT_BG_COLORS[variant] ?? 0xece6f0;
        r = ((bgColor >> 16) & 0xff) / 255;
        g = ((bgColor >> 8) & 0xff) / 255;
        b = (bgColor & 0xff) / 255;
        effectiveAlpha = VARIANT_BG_ALPHA[variant] ?? 1;
      }
    } else if (isCollectionItem && !hasBgColor) {
      // Collection Item (GridListItem, ListBoxItem): 카드형 밝은 배경
      // CSS: background: var(--bg-overlay) ≈ #fafafa (light) / #3f3f46 (dark)
      r = 0.98;
      g = 0.98;
      b = 0.98;
      effectiveAlpha = 1;
    } else {
      r = ((fill.color >> 16) & 0xff) / 255;
      g = ((fill.color >> 8) & 0xff) / 255;
      b = (fill.color & 0xff) / 255;
      // Fill V2: gradient/image fill이 있으면 shader가 alpha를 처리하므로 fillColor alpha=1
      const hasFillV2NonColor =
        isFillV2Enabled() &&
        effectiveElementWithTabs.fills?.some(
          (f) => f.enabled && f.type !== "color",
        );
      effectiveAlpha =
        hasBgColor || hasFillV2NonColor
          ? (fill.alpha ?? 1)
          : isUIComponent
            ? fill.alpha
            : 0;
    }

    const hasBorderRadiusSet =
      style?.borderRadius !== undefined &&
      style?.borderRadius !== null &&
      style?.borderRadius !== "";
    const size = isUIComponent
      ? String(
          props?.size || parentDelegatedSize || tagGroupAncestorSize || "md",
        )
      : "";
    const defaultBorderRadius = UI_COMPONENT_DEFAULT_BORDER_RADIUS[size] ?? 6;
    const collectionItemBorderRadius = isCardItem ? 8 : 0;
    let effectiveBorderRadius: number | [number, number, number, number] =
      hasBorderRadiusSet
        ? br
        : isUIComponent && !hasBgColor
          ? defaultBorderRadius
          : collectionItemBorderRadius;

    if (toggleGroupPosition && typeof effectiveBorderRadius === "number") {
      const { orientation, isFirst, isLast, isOnly } = toggleGroupPosition;
      const r = effectiveBorderRadius;

      if (!isOnly) {
        if (orientation === "horizontal") {
          if (isFirst) {
            effectiveBorderRadius = [r, 0, 0, r];
          } else if (isLast) {
            effectiveBorderRadius = [0, r, r, 0];
          } else {
            effectiveBorderRadius = [0, 0, 0, 0];
          }
        } else {
          if (isFirst) {
            effectiveBorderRadius = [r, r, 0, 0];
          } else if (isLast) {
            effectiveBorderRadius = [0, 0, r, r];
          } else {
            effectiveBorderRadius = [0, 0, 0, 0];
          }
        }
      }
    }

    const boxData: {
      fillColor: Float32Array;
      fill?: FillStyle;
      borderRadius: number | [number, number, number, number];
      strokeColor?: Float32Array;
      strokeWidth?: number;
    } = {
      fillColor: Float32Array.of(r, g, b, effectiveAlpha),
      borderRadius: effectiveBorderRadius,
    };

    const fills = effectiveElementWithTabs.fills;
    if (isFillV2Enabled() && fills && fills.length > 0) {
      const fillV2Style = fillsToSkiaFillStyle(fills, finalWidth, finalHeight);
      if (fillV2Style && fillV2Style.type !== "color") {
        boxData.fill = fillV2Style;
      }
    }

    if (stroke) {
      const sr = ((stroke.color >> 16) & 0xff) / 255;
      const sg = ((stroke.color >> 8) & 0xff) / 255;
      const sb = (stroke.color & 0xff) / 255;
      boxData.strokeColor = Float32Array.of(sr, sg, sb, stroke.alpha);
      boxData.strokeWidth = stroke.width;
    } else if (isCardItem && !stroke) {
      // GridListItem 카드형 border: 1px solid #d4d4d4 (CSS var(--border) 동기화)
      boxData.strokeColor = Float32Array.of(0.83, 0.83, 0.83, 1);
      boxData.strokeWidth = 1;
    } else if (isUIComponent && !hasBgColor && !isTransparentContainer) {
      const borderColor = VARIANT_BORDER_COLORS[variant];
      if (borderColor !== undefined) {
        const sr = ((borderColor >> 16) & 0xff) / 255;
        const sg = ((borderColor >> 8) & 0xff) / 255;
        const sb = (borderColor & 0xff) / 255;
        boxData.strokeColor = Float32Array.of(sr, sg, sb, 1);
        boxData.strokeWidth = 1;
      }
    }

    let textChildren: SkiaNodeData[] | undefined;

    let cardCalculatedHeight: number | undefined;

    if (isUIComponent) {
      const VARIANT_TEXT_COLORS: Record<string, number> = {
        default: 0x1d1b20,
        primary: 0xffffff,
        secondary: 0xffffff,
        surface: 0x1d1b20,
        outline: 0x6750a4,
        ghost: 0x6750a4,
        tertiary: 0xffffff,
        error: 0xffffff,
      };

      {
        // 🟢 Spec shapes 기반 렌더링
        // Card는 복합 컴포넌트로 전환: 자식 Element(Heading, Description)가 별도 렌더링됨
        const spec = getSpecForTag(tag);
        // compositional 전환 완료: 모든 요소가 자신의 spec을 독립 렌더링
        // backgroundColor: 'transparent'는 단순 투명 배경일 뿐, spec 렌더링 스킵 조건이 아님
        const skipChildSpecShapes = false;
        if (spec && !skipChildSpecShapes) {
          // ⚡ 엔진 크기 확정 전에는 spec shapes 계산을 건너뛴다.
          // computedW가 null인 상태에서 CSS 기본값으로 shapes를 계산하면
          // 엔진 완료 후 다른 크기로 재계산되어 시각적 깜빡임이 발생한다.
          // 엔진은 같은 프레임의 prerender에서 실행되므로 1프레임 내에 확정된다.
          if (computedW == null && finalWidth <= 0) {
            // 엔진 미확정 + CSS 크기도 없음 → 렌더링 보류
          } else {
            const variantSpec =
              spec.variants[variant] || spec.variants[spec.defaultVariant];
            const sizeSpec = spec.sizes[size] || spec.sizes[spec.defaultSize];
            if (variantSpec && sizeSpec) {
              const elementStyle = (props?.style || {}) as Record<
                string,
                unknown
              >;
              const flexDir = (elementStyle.flexDirection as string) || "";
              const isColumn =
                flexDir === "column" || flexDir === "column-reverse";

              // 실제 레이아웃 높이 사용: 레이아웃 엔진이 padding/content 포함하여 계산한 높이
              // → baseline='middle' 텍스트가 CSS와 동일하게 중앙 배치됨
              // → 사용자의 paddingTop/paddingBottom 변경이 자동 반영됨
              let specHeight = finalHeight;

              // 🚀 ToggleButton: 그룹 내 위치 정보를 props에 주입하여 spec shapes에서 border-radius 분기 가능
              // 🚀 TagGroup: 자식 Tag 텍스트를 주입하여 spec shapes에서 label + tag chips 렌더링
              let specProps: Record<string, unknown> = props || {};
              // parentDelegatedSize가 있고 props.size가 없으면 size 주입
              // CheckboxSpec 등이 props.size로 indicator 크기를 결정하므로 필수
              if (parentDelegatedSize && !specProps.size) {
                specProps = { ...specProps, size: parentDelegatedSize };
              }
              if (toggleGroupPosition) {
                specProps = {
                  ...specProps,
                  _groupPosition: toggleGroupPosition,
                };
              }
              // DateInput: 부모 DateField/TimeField의 granularity/hourCycle/locale 주입
              if (dateInputParentTag) {
                specProps = {
                  ...specProps,
                  _parentTag: dateInputParentTag,
                  ...(dateInputGranularity != null && {
                    _granularity: dateInputGranularity,
                  }),
                  ...(dateInputHourCycle != null && {
                    _hourCycle: dateInputHourCycle,
                  }),
                  ...(dateInputLocale != null && {
                    _locale: dateInputLocale,
                  }),
                };
              }

              // Label: 부모 field의 necessityIndicator → children 텍스트에 indicator 추가
              if (isLabel && labelNecessityIndicator) {
                const originalText =
                  (specProps.children as string) ||
                  (specProps.label as string) ||
                  "";
                const indicatorText = getNecessityIndicatorSuffix(
                  labelNecessityIndicator,
                  labelIsRequired ?? false,
                );
                if (indicatorText) {
                  specProps = {
                    ...specProps,
                    children: originalText + indicatorText,
                    _necessityIndicator: labelNecessityIndicator,
                    _isRequired: labelIsRequired,
                  };
                }
              }

              // ComboBox/Select: spec shapes가 props.style.width로 입력 영역 너비 결정
              // 기본값 200px → 실제 레이아웃 width로 교체하여 CSS 정합성 확보
              if (
                ["ComboBox", "Select", "Dropdown"].includes(tag) &&
                finalWidth > 0
              ) {
                const existingStyle = (specProps.style || {}) as Record<
                  string,
                  unknown
                >;
                if (!existingStyle.width) {
                  specProps = {
                    ...specProps,
                    style: { ...existingStyle, width: finalWidth },
                  };
                }
              }

              // Slider: spec shapes에 실제 width 주입 + specHeight 보정
              // track/thumb가 label 아래에 위치하므로 전체 높이 필요
              if (tag === "Slider") {
                const existingStyle = (specProps.style || {}) as Record<
                  string,
                  unknown
                >;
                if (finalWidth > 0 && !existingStyle.width) {
                  specProps = {
                    ...specProps,
                    style: { ...existingStyle, width: finalWidth },
                  };
                }
                // Slider specHeight 보정: label + gap + thumbSize
                const sliderDims =
                  SLIDER_DIMENSIONS[size] || SLIDER_DIMENSIONS["md"];
                const hasLabel = specProps.label || specProps.showValue;
                if (hasLabel) {
                  const fSize = resolveToken(sizeSpec.fontSize as TokenRef);
                  const fontSize = typeof fSize === "number" ? fSize : 14;
                  const gap = sizeSpec.gap ?? 10;
                  const totalH =
                    Math.ceil(fontSize * 1.2) + gap + sliderDims.thumbSize;
                  if (totalH > specHeight) specHeight = totalH;
                } else {
                  if (sliderDims.thumbSize > specHeight)
                    specHeight = sliderDims.thumbSize;
                }
              }

              // 자식 조합 패턴 (opt-out): 자식 Element가 있으면 spec shapes에서 자체 렌더링 스킵
              // Figma/HTML 구조와 일치: spec은 배경/테두리만, 자식이 콘텐츠 담당
              // Opt-out: 자체 synthetic prop 메커니즘 또는 복잡한 다단계 중첩으로 _hasChildren 주입 제외
              const CHILD_COMPOSITION_EXCLUDE_TAGS = new Set([
                "Tabs", // _tabLabels synthetic prop
                "Breadcrumbs", // _crumbs synthetic prop
                "TagGroup", // _tagItems synthetic prop
                "Table", // 3단계 중첩 (별도 작업)
                "Tree", // 다단계 중첩 (별도 작업)
              ]);

              if (!CHILD_COMPOSITION_EXCLUDE_TAGS.has(tag)) {
                // 실제 자식 유무 기반: 자식이 있으면 _hasChildren=true → spec은 shell만 반환
                // 자식이 모두 삭제되면 _hasChildren=false → spec이 standalone 모드로 복귀하여 자체 콘텐츠 렌더링
                // 이전: COMPLEX_COMPONENT_TAGS는 항상 true → 삭제 후에도 shell만 남는 버그
                if (childElements && childElements.length > 0) {
                  specProps = { ...specProps, _hasChildren: true };
                }
              }

              // _hasLabelChild 패턴 제거 완료: CHILD_COMPOSITION_TAGS로 통합됨
              // Checkbox/Radio/Switch/ComboBox/Select/Slider → _hasChildren 단일 패턴

              // Tag: TagGroup의 allowsRemoving 전파 → spec shapes에서 X 아이콘 렌더
              if (tag === "Tag" && tagGroupAllowsRemoving) {
                specProps = { ...specProps, allowsRemoving: true };
              }
              if (tag === "Tag") {
                specProps = {
                  ...specProps,
                  _containerWidth: finalWidth,
                  _containerHeight: specHeight,
                };
              }

              // SelectIcon/ComboBoxTrigger: 부모의 iconName 전파 (specProps에 없으면 주입)
              if (parentDelegatedIconName && !specProps.iconName) {
                specProps = { ...specProps, iconName: parentDelegatedIconName };
              }

              // ProgressBarTrack: 부모 ProgressBar의 value/isIndeterminate/variant/size 전파
              // min/max를 0-100 퍼센트로 정규화하여 전달
              if (isProgressBarTrack) {
                const rawVal = parentProgressValue ?? 0;
                const minV = parentProgressMinValue ?? 0;
                const maxV = parentProgressMaxValue ?? 100;
                const normalizedValue =
                  maxV > minV
                    ? Math.max(
                        0,
                        Math.min(100, ((rawVal - minV) / (maxV - minV)) * 100),
                      )
                    : 0;
                specProps = {
                  ...specProps,
                  value: specProps.value ?? normalizedValue,
                  isIndeterminate:
                    specProps.isIndeterminate || parentProgressIndeterminate,
                  variant:
                    specProps.variant ?? parentProgressVariant ?? undefined,
                  size: specProps.size ?? parentProgressSize ?? undefined,
                };
              }

              // SliderTrack: 부모 Slider의 value/minValue/maxValue/variant 전파
              if (isSliderTrack) {
                const parsedValue =
                  parentSliderValueSerialized != null
                    ? JSON.parse(parentSliderValueSerialized)
                    : (specProps.value ?? 50);
                specProps = {
                  ...specProps,
                  value: parsedValue,
                  minValue: parentSliderMinValue ?? specProps.minValue ?? 0,
                  maxValue: parentSliderMaxValue ?? specProps.maxValue ?? 100,
                  variant:
                    specProps.variant ?? parentSliderVariant ?? "default",
                };
              }

              // ProgressBarValue: 부모 ProgressBar의 value를 포맷팅하여 children에 주입
              // delegation 값이 항상 우선 (factory의 초기 "50%"보다 부모의 실시간 value 우선)
              if (isProgressBarValue && parentProgressShowValue) {
                const rawVal = parentProgressValue ?? 0;
                const minV = parentProgressMinValue ?? 0;
                const maxV = parentProgressMaxValue ?? 100;
                const percent =
                  maxV > minV ? ((rawVal - minV) / (maxV - minV)) * 100 : 0;
                const clampedPercent = Math.max(0, Math.min(100, percent));
                const formatted =
                  parentProgressValueFormat === "number"
                    ? String(Math.round(rawVal))
                    : `${Math.round(clampedPercent)}%`;
                const existingStyle = (specProps.style || {}) as Record<
                  string,
                  unknown
                >;
                specProps = {
                  ...specProps,
                  children: formatted,
                  size: specProps.size ?? parentProgressSize ?? undefined,
                  style: {
                    ...existingStyle,
                    fontSize: undefined, // sizeSpec.fontSize가 결정하도록 제거
                  },
                };
              }

              // 동적 컴포넌트 상태: preview > disabled prop > default
              // selectAtom으로 자신의 elementId만 구독 → previewState는 이미 필터됨
              const componentState: ComponentState = (() => {
                if (previewState && previewState !== "default")
                  return previewState;
                if (specProps.isDisabled || specProps.disabled)
                  return "disabled";
                return "default";
              })();

              // Inject computed dimensions so spec shapes use actual layout size
              // ?? ensures explicit style values take priority; only fills in when absent
              if (finalWidth > 0 || finalHeight > 0) {
                const existingStyle = (specProps.style || {}) as Record<
                  string,
                  unknown
                >;
                // spec shapes는 width/height를 숫자로 기대 — CSS 키워드/% 문자열은 pixel로 해석
                const existingW = existingStyle.width;
                const resolvedWidth =
                  typeof existingW === "number"
                    ? existingW
                    : finalWidth > 0
                      ? finalWidth
                      : undefined;
                specProps = {
                  ...specProps,
                  style: {
                    ...existingStyle,
                    width: resolvedWidth,
                    height:
                      existingStyle.height ??
                      (finalHeight > 0 ? finalHeight : undefined),
                  },
                };
              }

              const shapes = spec.render.shapes(
                specProps as Record<string, unknown>,
                variantSpec,
                sizeSpec,
                componentState,
              );
              // Column layout: shapes를 세로 쌓기로 재배치
              if (isColumn) {
                rearrangeShapesForColumn(shapes, finalWidth, sizeSpec.gap ?? 8);
              }

              // 텍스트 줄바꿈 시 높이 자동 확장: 명시적 height가 없을 때만
              const hasExplicitHeight =
                style?.height !== undefined && style?.height !== "auto";
              if (!hasExplicitHeight && finalWidth > 0) {
                const textMinHeight = measureSpecTextMinHeight(
                  shapes,
                  finalWidth,
                  sizeSpec,
                  style?.whiteSpace as string | undefined,
                  style?.wordBreak as string | undefined,
                  style?.overflowWrap as string | undefined,
                );
                if (textMinHeight !== undefined && textMinHeight > specHeight) {
                  specHeight = textMinHeight;
                  cardCalculatedHeight = textMinHeight;
                }
              }

              // Per-element accent override (ADR-021 Phase E)
              // 요소 자체 또는 부모 체인에서 accentColor 탐색
              const elementAccent = specProps.accentColor as
                | TintPreset
                | undefined;
              const resolvedAccent: TintPreset | undefined =
                elementAccent ||
                (() => {
                  let pid = element.parent_id;
                  while (pid) {
                    const p = useStore.getState().elementsMap.get(pid);
                    if (!p) break;
                    const ac = (p.props as Record<string, unknown> | undefined)
                      ?.accentColor;
                    if (ac) return ac as TintPreset;
                    pid = p.parent_id;
                  }
                  return undefined;
                })();

              const specNode = withAccentOverride(resolvedAccent, () =>
                specShapesToSkia(
                  shapes,
                  skiaTheme,
                  finalWidth,
                  specHeight,
                  elementId,
                ),
              );

              // Phantom indicator 레이아웃 보정: Switch/Checkbox/Radio의 indicator는
              // spec shapes가 border-box 원점(0,0)에 그리지만, CSS 레이아웃 속성
              // (padding, align-items)을 반영하지 못함.
              // 1) padding: specNode를 content area로 오프셋
              // 2) align-items: center → indicator를 container 내 세로 중앙 정렬
              const tagLower = tag.toLowerCase();
              const indicatorConfig = PHANTOM_INDICATOR_CONFIGS[tagLower];
              if (indicatorConfig && style) {
                const padFallback =
                  style.padding !== undefined ? parseCSSSize(style.padding) : 0;
                const padTop =
                  style.paddingTop !== undefined
                    ? parseCSSSize(style.paddingTop)
                    : padFallback;
                const padBottom =
                  style.paddingBottom !== undefined
                    ? parseCSSSize(style.paddingBottom)
                    : padFallback;
                const padLeft =
                  style.paddingLeft !== undefined
                    ? parseCSSSize(style.paddingLeft)
                    : padFallback;

                // content area 높이 = border-box - padding (align-items 계산 기준)
                const contentH = specHeight - padTop - padBottom;

                // align-items 세로 정렬: content area 내에서 indicator 위치 결정
                const s = (size as "sm" | "md" | "lg") || "md";
                const indicatorH =
                  indicatorConfig.heights[s] ?? indicatorConfig.heights.md;
                const alignItems = style.alignItems as string | undefined;
                let alignOffsetY = 0;
                if (alignItems === "center" && contentH > indicatorH) {
                  alignOffsetY = (contentH - indicatorH) / 2;
                } else if (alignItems === "flex-end" && contentH > indicatorH) {
                  alignOffsetY = contentH - indicatorH;
                }

                // padding + align-items 합산 오프셋
                specNode.x = (specNode.x ?? 0) + padLeft;
                specNode.y = (specNode.y ?? 0) + padTop + alignOffsetY;
              }

              // QW-2: disabled 상태 opacity 적용
              if (componentState === "disabled") {
                const opacityVal =
                  (spec.states?.disabled?.opacity as number | undefined) ??
                  0.38;
                specNode.effects = [
                  ...(specNode.effects ?? []),
                  { type: "opacity" as const, value: opacityVal },
                ];
              }

              // QW-3: focusVisible/focused 상태 outline (focus ring) 적용
              // focused: spec.states.focused.outline 우선, 없으면 focusVisible로 fallback
              // focusVisible: spec.states.focusVisible.outline 사용
              if (
                (componentState === "focusVisible" ||
                  componentState === "focused") &&
                specNode.box
              ) {
                const focusState =
                  componentState === "focused"
                    ? spec.states?.focused?.outline
                      ? spec.states.focused
                      : spec.states?.focusVisible
                    : spec.states?.focusVisible;
                if (focusState?.outline) {
                  const parsed = parseOutlineShorthand(
                    focusState.outline as string,
                    focusState.outlineOffset as string | number | undefined,
                  );
                  if (parsed) {
                    specNode.box.outlineColor = parsed.color;
                    specNode.box.outlineWidth = parsed.width;
                    specNode.box.outlineOffset = parsed.offset;
                  }
                }
              }

              // 다중 줄 텍스트 paddingTop 보정: specShapesToSkia는 한 줄 lineHeight 기준으로
              // (height - lineHeight) / 2를 계산하지만, 다중 줄일 때는 wrappedHeight 기준으로 보정
              // 명시적 height(예: 100px)에서도 보정이 필요하므로 cardCalculatedHeight 조건 제거
              if (specNode.children) {
                for (const child of specNode.children) {
                  if (child.type === "text" && child.text) {
                    // ADR-008: element style → spec text child에 텍스트 래핑 속성 주입
                    // Checkbox/Radio/Switch 내부 Label: CSS white-space: nowrap 동기화
                    // Tag/Badge: CSS white-space: nowrap 동기화
                    const isNowrapTag =
                      element.tag === "Tag" || element.tag === "Badge";
                    const effectiveWhiteSpace =
                      style?.whiteSpace ??
                      (isLabelInNowrapParent || isNowrapTag
                        ? "nowrap"
                        : undefined);
                    if (effectiveWhiteSpace)
                      child.text.whiteSpace =
                        effectiveWhiteSpace as typeof child.text.whiteSpace;
                    if (style?.wordBreak)
                      child.text.wordBreak =
                        style.wordBreak as typeof child.text.wordBreak;
                    if (style?.overflowWrap)
                      child.text.overflowWrap =
                        style.overflowWrap as typeof child.text.overflowWrap;
                    if (style?.textOverflow)
                      child.text.textOverflow =
                        style.textOverflow as typeof child.text.textOverflow;
                    const overflow = style?.overflow as string | undefined;
                    child.text.clipText =
                      overflow === "hidden" || overflow === "clip";

                    // ADR-008: nowrap/pre → 단일 줄 → paddingTop 보정 불필요
                    // CalendarGrid/CalendarHeader: 절대 좌표 배치 → 다중 줄 보정 스킵
                    const isCalendarText =
                      element.tag === "CalendarGrid" ||
                      element.tag === "CalendarHeader";
                    const ws = child.text.whiteSpace;
                    if (!isCalendarText && ws !== "nowrap" && ws !== "pre") {
                      const wrappedH = measureWrappedTextHeight(
                        child.text.content,
                        child.text.fontSize,
                        child.text.fontWeight || 500,
                        child.text.fontFamilies[0] || "Pretendard",
                        child.text.maxWidth,
                        undefined,
                        style?.wordBreak as
                          | "normal"
                          | "break-all"
                          | "keep-all"
                          | undefined,
                        style?.overflowWrap as
                          | "normal"
                          | "break-word"
                          | "anywhere"
                          | undefined,
                      );
                      const lineHeight = child.text.fontSize * 1.2;
                      if (wrappedH > lineHeight + 0.5) {
                        child.text.paddingTop = Math.max(
                          0,
                          (specHeight - wrappedH) / 2,
                        );
                      }
                    }
                  }
                }
              }

              // Gradient fill을 specNode 배경으로 이전 (fills v2)
              if (boxData.fill && specNode.box) {
                specNode.box.fill = boxData.fill;
              }

              // Outer box becomes transparent container — spec shapes handle all visuals
              boxData.fillColor = Float32Array.of(0, 0, 0, 0);
              boxData.borderRadius = 0;
              boxData.strokeColor = undefined;
              boxData.strokeWidth = undefined;
              boxData.fill = undefined;

              // Put entire specNode as a single child for rendering isolation
              textChildren = [specNode];
            }
          }
        } else if (!skipChildSpecShapes) {
          // Fallback: Spec이 없는 컴포넌트 - 기존 텍스트 렌더링
          // skipChildSpecShapes인 경우 부모 spec shapes가 텍스트도 렌더링하므로 스킵
          const textContent = String(
            props?.children ||
              props?.text ||
              props?.label ||
              props?.value ||
              props?.placeholder ||
              props?.count ||
              "",
          );
          if (textContent) {
            const defaultTextColor = VARIANT_TEXT_COLORS[variant] ?? 0x1d1b20;

            const isPlaceholder =
              !props?.children &&
              !props?.text &&
              !props?.label &&
              !props?.value &&
              !!props?.placeholder;
            const placeholderColor = 0x9ca3af;
            const baseTextColor = isPlaceholder
              ? placeholderColor
              : defaultTextColor;
            const textColorHex = style?.color
              ? cssColorToHex(style.color, baseTextColor)
              : baseTextColor;
            const tcR = ((textColorHex >> 16) & 0xff) / 255;
            const tcG = ((textColorHex >> 8) & 0xff) / 255;
            const tcB = (textColorHex & 0xff) / 255;

            const SIZE_FONT: Record<string, number> = {
              xs: 12,
              sm: 14,
              md: 16,
              lg: 18,
              xl: 20,
            };
            const defaultFontSize = SIZE_FONT[size] ?? 14;
            const fontSize =
              style?.fontSize !== undefined
                ? parseCSSSize(style.fontSize, undefined, defaultFontSize)
                : defaultFontSize;

            const CENTER_ALIGN_TAGS = new Set([
              "Button",
              "SubmitButton",
              "Badge",
              "Tag",
              "Chip",
              "ToggleButton",
            ]);
            const textAlign = CENTER_ALIGN_TAGS.has(tag)
              ? ("center" as const)
              : ("left" as const);

            const INPUT_TAGS = new Set([
              "Input",
              "TextField",
              "TextInput",
              "SearchField",
              "TextArea",
              "Textarea",
              "NumberField",
              "ComboBox",
              "Select",
              "Dropdown",
              "DateField",
              "TimeField",
              "ColorField",
            ]);
            const paddingLeft = INPUT_TAGS.has(tag) ? 8 : 0;

            const lineHeight = fontSize * 1.2;
            const paddingTop = Math.max(0, (finalHeight - lineHeight) / 2);

            textChildren = [
              {
                type: "text" as const,
                x: 0,
                y: 0,
                width: finalWidth,
                height: finalHeight,
                visible: true,
                text: {
                  content: textContent,
                  fontFamilies: [
                    "Pretendard",
                    "Inter",
                    "system-ui",
                    "sans-serif",
                  ],
                  fontSize,
                  color: Float32Array.of(tcR, tcG, tcB, 1),
                  align: textAlign,
                  paddingLeft,
                  paddingTop,
                  maxWidth: finalWidth - paddingLeft * 2,
                },
              },
            ];
          }
        }
      }
    }

    const contentMinHeight = cardCalculatedHeight;

    return {
      type: "box" as const,
      x: transform.x,
      y: transform.y,
      width: finalWidth,
      height: finalHeight,
      visible: true,
      box: boxData,
      children: textChildren,
      contentMinHeight,
    };
  }, [
    effectiveElementWithTabs,
    spriteType,
    elementStyle,
    elementProps,
    computedW,
    computedH,
    toggleGroupPosition,
    childElements,
    previewState,
    themeVersion,
    skiaTheme,
    parentDelegatedSize,
    parentDelegatedIconName,
    parentProgressValue,
    parentProgressIndeterminate,
    parentProgressVariant,
    parentProgressSize,
    parentProgressValueFormat,
    parentProgressShowValue,
    parentProgressMinValue,
    parentProgressMaxValue,
    parentSliderValueSerialized,
    parentSliderMinValue,
    parentSliderMaxValue,
    parentSliderVariant,
    isLabelInNowrapParent,
    tagGroupAncestorSize,
    tagGroupAllowsRemoving,
    dateInputParentTag,
    dateInputGranularity,
    dateInputHourCycle,
    dateInputLocale,
    labelNecessityKey,
  ]);

  // box/flex/grid 타입은 BoxSprite가 더 완전한 Skia 데이터를 등록하므로
  // ElementSprite의 이중 등록을 방지한다. (effects, blendMode, 올바른 fillColor 포함)
  // text 타입은 TextSprite가 자체적으로 텍스트 Skia 데이터를 등록하므로
  // ElementSprite에서 box 데이터로 덮어쓰지 않도록 방지한다.
  // 단, TAG_SPEC_MAP에 등록된 태그(Label, ProgressBar 등)는 spec shapes로 렌더링하므로 제외
  const hasSpecShapes = getSpecForTag(element.tag) != null;
  const hasOwnSprite =
    (spriteType === "box" && !hasSpecShapes) ||
    spriteType === "text" ||
    spriteType === "image" ||
    (spriteType === "flex" && !hasSpecShapes) ||
    (spriteType === "grid" && !hasSpecShapes);

  // 렌더링 단계에서 skip될 요소는 Skia node도 등록하지 않음
  // (Tab in Tabs, Breadcrumb in Breadcrumbs, display:contents)
  // Panel-in-Tabs는 컨테이너 시스템으로 렌더링되므로 Skia 데이터 등록 필요
  const isSkippedChild =
    (element.tag === "Tab" && parentElement?.tag === "Tabs") ||
    (element.tag === "Breadcrumb" && parentElement?.tag === "Breadcrumbs") ||
    (element.props?.style as Record<string, unknown> | undefined)?.display ===
      "contents";

  useSkiaNode(elementId, hasOwnSprite || isSkippedChild ? null : skiaNodeData);

  // Phase 6: Interaction 속성 (컨테이너 히트 영역용)
  const containerIsPointerEventsNone =
    (elementStyle as CSSStyle | undefined)?.pointerEvents === "none";
  const containerPixiCursor =
    (elementStyle as CSSStyle | undefined)?.cursor ?? "default";

  // 🚀 Non-layout 컨테이너 히트 영역: 엔진 계산된 전체 크기(padding 포함)를 커버
  // layout prop 없이 렌더링하므로 엔진 padding에 의한 offset 없이 컨테이너 원점(0,0)에 배치됨
  const drawContainerHitRect = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      const w = computedW ?? 0;
      const h = computedH ?? 0;
      if (w <= 0 || h <= 0) return;
      g.rect(0, 0, w, h);
      g.fill({ color: 0xffffff, alpha: 0.001 });
    },
    [computedW, computedH],
  );

  // Pencil-style: 선택/더블클릭은 BuilderCanvas 중앙 핸들러가 처리
  // PixiJS 이벤트는 hover/pressed 시각 효과만 담당
  const handleContainerPointerDown = useCallback(() => {
    // 포인터 누름 상태로 즉시 전환 (시각 효과만)
    setPreviewState({ elementId: element.id, state: "pressed" });
  }, [element.id, setPreviewState]);

  // Phase A: 포인터 진입 — hover 상태로 전환
  const handlePointerOver = useCallback(() => {
    setPreviewState({ elementId: element.id, state: "hover" });
  }, [element.id, setPreviewState]);

  // Phase A: 포인터 버튼 해제 — 여전히 hover 위에 있으므로 hover로 복귀
  const handlePointerUp = useCallback(() => {
    setPreviewState({ elementId: element.id, state: "hover" });
  }, [element.id, setPreviewState]);

  // Phase A: 포인터 이탈 — 상태 초기화 (pointerleave: 자식으로의 이동 시 버블링 없음)
  const handlePointerLeave = useCallback(() => {
    setPreviewState(null);
  }, [setPreviewState]);

  // SelectChild leaf: hover를 부모 wrapper(SelectTrigger/ComboBoxWrapper)로 전파
  // leaf(SelectValue, SelectIcon, ComboBoxInput, ComboBoxTrigger)가 자신의 ID로 hover를 설정하면
  // 부모 wrapper의 hover가 풀려 배경 overlay가 사라지는 문제 방지
  const handleSelectChildLeafPointerOver = useCallback(() => {
    if (parentElement) {
      setPreviewState({ elementId: parentElement.id, state: "hover" });
    } else {
      setPreviewState({ elementId: element.id, state: "hover" });
    }
  }, [element.id, parentElement, setPreviewState]);

  // CheckboxGroup의 자식 Checkbox인지 확인
  const isCheckboxInGroup =
    spriteType === "checkboxItem" && parentElement?.tag === "CheckboxGroup";

  // 🚀 Tabs 자식 요소 처리:
  // - Tab 요소는 spec shapes가 렌더링하므로 여기서 skip
  // - Panel은 컨테이너 시스템(createContainerChildRenderer)으로 렌더링
  const isTabsChild = parentElement?.tag === "Tabs";
  const isTabElement = element.tag === "Tab";

  // Tab 요소는 spec shapes가 렌더링하므로 skip
  if (isTabElement && isTabsChild) {
    return null;
  }

  // display:contents 요소는 자체 박스를 생성하지 않음 — 렌더링 스킵
  const elementDisplay = (
    element.props?.style as Record<string, unknown> | undefined
  )?.display;
  if (elementDisplay === "contents") {
    return null;
  }

  // 🚀 Breadcrumbs 자식 요소 처리:
  // - Breadcrumb 요소는 PixiBreadcrumbs에서 직접 렌더링하므로 skip
  const isBreadcrumbsChild = parentElement?.tag === "Breadcrumbs";
  const isBreadcrumbElement = element.tag === "Breadcrumb";

  if (isBreadcrumbElement && isBreadcrumbsChild) {
    return null;
  }

  // 🚀 Panel의 자손 요소들은 ElementsLayer에서 layoutPosition과 함께 렌더링됨
  // selectionBox와 렌더링 위치가 일치하도록 함

  // 🚀 Phase 1: 스프라이트 콘텐츠를 변수에 저장하여 pixiContainer로 감싸기
  const content = (() => {
    switch (spriteType) {
      // UI 컴포넌트 (Phase 11 B2.4)
      // P5: PixiButton 활성화 (pixiContainer 래퍼로 이벤트 처리)
      case "button":
        return (
          <PixiButton element={effectiveElement} isSelected={isSelected} />
        );

      case "checkboxGroup":
        return (
          <PixiCheckboxGroup
            element={effectiveElement}
            isSelected={isSelected}
            onChange={
              onChange ? (id, values) => onChange(id, values) : undefined
            }
          />
        );

      case "checkboxItem":
        // CheckboxGroup의 자식이면 투명 hit area + children 렌더링
        if (isCheckboxInGroup) {
          if (childElements && childElements.length > 0 && renderChildElement) {
            return (
              <>
                <PixiCheckboxItem
                  element={effectiveElement}
                  isSelected={isSelected}
                />
                {childElements.map((childEl) => renderChildElement(childEl))}
              </>
            );
          }
          return (
            <PixiCheckboxItem
              element={effectiveElement}
              isSelected={isSelected}
            />
          );
        }
        // 독립 Checkbox는 전체 렌더링
        return (
          <PixiCheckbox
            element={effectiveElement}
            isSelected={isSelected}
            onChange={
              onChange ? (id, checked) => onChange(id, checked) : undefined
            }
          />
        );

      case "radioGroup":
        return (
          <PixiRadio
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, value) => onChange(id, value) : undefined}
          />
        );

      case "radioItem":
        if (childElements && childElements.length > 0 && renderChildElement) {
          return (
            <>
              <PixiRadioItem
                element={effectiveElement}
                isSelected={isSelected}
              />
              {childElements.map((childEl) => renderChildElement(childEl))}
            </>
          );
        }
        return (
          <PixiRadioItem element={effectiveElement} isSelected={isSelected} />
        );

      // Phase 6: @pixi/ui 컴포넌트
      case "slider":
        return (
          <PixiSlider
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, value) => onChange(id, value) : undefined}
          />
        );

      case "input":
        return (
          <PixiInput
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, value) => onChange(id, value) : undefined}
          />
        );

      case "select":
        return (
          <PixiSelect
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, value) => onChange(id, value) : undefined}
          />
        );

      // case "progressBar": 제거 — 표준 spec shapes 경로("box" + hasSpecShapes)로 통합

      case "switcher":
        return (
          <PixiSwitcher
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, value) => onChange(id, value) : undefined}
          />
        );

      case "scrollBox":
        return (
          <PixiScrollBox element={effectiveElement} isSelected={isSelected} />
        );

      case "list":
        return <PixiList element={effectiveElement} isSelected={isSelected} />;

      case "maskedFrame":
        return (
          <PixiMaskedFrame element={effectiveElement} isSelected={isSelected} />
        );

      // Phase 1 WebGL Migration 컴포넌트
      case "toggleButton":
        return (
          <PixiToggleButton
            element={effectiveElement}
            isSelected={isSelected}
          />
        );

      case "toggleButtonGroup":
        return (
          <PixiToggleButtonGroup
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, keys) => onChange(id, keys) : undefined}
            childElements={childElements}
            renderChildElement={renderChildElement}
          />
        );

      case "listBox":
        return (
          <PixiListBox
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, keys) => onChange(id, keys) : undefined}
          />
        );

      case "badge":
        return <PixiBadge element={effectiveElement} isSelected={isSelected} />;

      case "meter":
        return <PixiMeter element={effectiveElement} isSelected={isSelected} />;

      // Phase 2 WebGL Migration 컴포넌트
      // Separator: "box" + hasSpecShapes 표준 경로로 이동 (case "box" default에서 처리)

      case "link":
        return <PixiLink element={effectiveElement} isSelected={isSelected} />;

      case "breadcrumbs":
        return (
          <PixiBreadcrumbs element={effectiveElement} isSelected={isSelected} />
        );

      case "card":
        return <PixiCard element={effectiveElement} isSelected={isSelected} />;

      case "panel":
        return <PixiPanel element={effectiveElement} isSelected={isSelected} />;

      case "menu":
        return <PixiMenu element={effectiveElement} isSelected={isSelected} />;

      case "tabs":
        return (
          <PixiTabs
            element={effectiveElement}
            isSelected={isSelected}
            childElements={childElements}
            renderChildElement={renderChildElement}
          />
        );

      // Phase 3 WebGL Migration 컴포넌트
      case "numberField":
        return (
          <PixiNumberField element={effectiveElement} isSelected={isSelected} />
        );

      case "searchField":
        return (
          <PixiSearchField element={effectiveElement} isSelected={isSelected} />
        );

      case "comboBox":
        return (
          <PixiComboBox
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, value) => onChange(id, value) : undefined}
          />
        );

      // Phase 4 WebGL Migration 컴포넌트
      case "gridList":
        return (
          <PixiGridList
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, value) => onChange(id, value) : undefined}
          />
        );

      case "tree":
        return (
          <PixiTree
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, value) => onChange(id, value) : undefined}
          />
        );

      case "table":
        return (
          <PixiTable
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, value) => onChange(id, value) : undefined}
          />
        );

      // Phase 5 WebGL Migration 컴포넌트
      case "disclosure":
        return (
          <PixiDisclosure
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, value) => onChange(id, value) : undefined}
          />
        );

      case "disclosureGroup":
        return (
          <PixiDisclosureGroup
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, value) => onChange(id, value) : undefined}
          />
        );

      case "tooltip":
        return (
          <PixiTooltip
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, value) => onChange(id, value) : undefined}
          />
        );

      case "popover":
        return (
          <PixiPopover
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, value) => onChange(id, value) : undefined}
          />
        );

      case "dialog":
        return (
          <PixiDialog
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, value) => onChange(id, value) : undefined}
          />
        );

      // Phase 6 WebGL Migration 컴포넌트 - Date/Color Components
      case "colorSwatch":
        return (
          <PixiColorSwatch element={effectiveElement} isSelected={isSelected} />
        );

      case "colorSlider":
        return (
          <PixiColorSlider element={effectiveElement} isSelected={isSelected} />
        );

      // dateField/timeField: compositional — spec shapes 경로로 처리

      case "colorArea":
        return (
          <PixiColorArea element={effectiveElement} isSelected={isSelected} />
        );

      case "calendar":
        return (
          <PixiCalendar element={effectiveElement} isSelected={isSelected} />
        );

      case "colorWheel":
        return (
          <PixiColorWheel element={effectiveElement} isSelected={isSelected} />
        );

      case "datePicker":
        return (
          <PixiDatePicker element={effectiveElement} isSelected={isSelected} />
        );

      case "colorPicker":
        return (
          <PixiColorPicker element={effectiveElement} isSelected={isSelected} />
        );

      case "dateRangePicker":
        return (
          <PixiDateRangePicker
            element={effectiveElement}
            isSelected={isSelected}
          />
        );

      // Phase 7 WebGL Migration 컴포넌트 - Form & Utility Components
      case "textField":
        return (
          <PixiTextField element={effectiveElement} isSelected={isSelected} />
        );

      case "switch":
        return (
          <PixiSwitch element={effectiveElement} isSelected={isSelected} />
        );

      case "textArea":
        return (
          <PixiTextArea element={effectiveElement} isSelected={isSelected} />
        );

      case "form":
        return <PixiForm element={effectiveElement} isSelected={isSelected} />;

      case "toolbar":
        return (
          <PixiToolbar element={effectiveElement} isSelected={isSelected} />
        );

      case "fileTrigger":
        return (
          <PixiFileTrigger element={effectiveElement} isSelected={isSelected} />
        );

      case "dropZone":
        return (
          <PixiDropZone element={effectiveElement} isSelected={isSelected} />
        );

      case "skeleton":
        return (
          <PixiSkeleton element={effectiveElement} isSelected={isSelected} />
        );

      // Phase 8 WebGL Migration 컴포넌트 - Notification & Color Utility Components
      case "toast":
        return <PixiToast element={effectiveElement} isSelected={isSelected} />;

      case "pagination":
        return (
          <PixiPagination
            element={effectiveElement}
            isSelected={isSelected}
            onChange={onChange ? (id, value) => onChange(id, value) : undefined}
          />
        );

      case "colorField":
        return (
          <PixiColorField element={effectiveElement} isSelected={isSelected} />
        );

      case "colorSwatchPicker":
        return (
          <PixiColorSwatchPicker
            element={effectiveElement}
            isSelected={isSelected}
          />
        );

      case "group":
        return <PixiGroup element={effectiveElement} isSelected={isSelected} />;

      case "slot":
        return <PixiSlot element={effectiveElement} isSelected={isSelected} />;

      // Select child composition: 투명 히트 영역 (Skia spec shapes가 시각 렌더링)
      // SelectTrigger: 컨테이너 — 자식(SelectValue, SelectIcon) DirectContainer 렌더링
      // SelectValue/SelectIcon: leaf → children 없음
      case "selectChild":
        if (childElements && childElements.length > 0 && renderChildElement) {
          return (
            <>
              <pixiGraphics
                draw={drawContainerHitRect}
                eventMode="static"
                cursor={containerPixiCursor}
                onPointerDown={handleContainerPointerDown}
                onPointerOver={handlePointerOver}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
              />
              {childElements.map((childEl) => renderChildElement(childEl))}
            </>
          );
        }
        // Leaf selectChild: hover를 부모 wrapper로 전파 (overlay 유지)
        return (
          <pixiGraphics
            draw={drawContainerHitRect}
            eventMode="static"
            cursor={containerPixiCursor}
            onPointerDown={handleContainerPointerDown}
            onPointerOver={handleSelectChildLeafPointerOver}
            onPointerUp={handleSelectChildLeafPointerOver}
            onPointerLeave={handlePointerLeave}
          />
        );

      // 레이아웃 컨테이너 (Phase 11 B2.5)
      // Flex/Grid 컨테이너도 BoxSprite로 렌더링 (배경/테두리 표시)
      // 실제 레이아웃 계산은 BuilderCanvas의 renderWithCustomEngine()에서 Taffy/Dropflow로 처리
      case "flex":
      case "grid":
        if (childElements && childElements.length > 0 && renderChildElement) {
          return (
            <>
              {/* Non-layout 히트 영역: 컨테이너 원점(0,0)에 전체 레이아웃 크기(padding 포함) 커버 */}
              <pixiGraphics
                draw={drawContainerHitRect}
                eventMode={containerIsPointerEventsNone ? "none" : "static"}
                cursor={containerPixiCursor}
                {...(!containerIsPointerEventsNone && {
                  onPointerDown: handleContainerPointerDown,
                  onPointerOver: handlePointerOver,
                  onPointerUp: handlePointerUp,
                  onPointerLeave: handlePointerLeave,
                })}
              />
              <pixiContainer x={0} y={0}>
                <BoxSprite element={effectiveElement} isSelected={isSelected} />
              </pixiContainer>
              {childElements.map((childEl) => renderChildElement(childEl))}
            </>
          );
        }
        return <BoxSprite element={effectiveElement} isSelected={isSelected} />;

      // 기본 타입
      case "text":
        return (
          <TextSprite
            element={effectiveElementForText}
            isSelected={isSelected}
          />
        );

      case "image":
        return (
          <ImageSprite element={effectiveElement} isSelected={isSelected} />
        );

      case "box":
      default:
        // spec shapes 경로를 타는 "box" 태그(Label, ProgressBar 등)는
        // BoxSprite가 useSkiaNode를 덮어쓰므로 BoxSprite 렌더링 skip
        if (hasSpecShapes) {
          if (childElements && childElements.length > 0 && renderChildElement) {
            return (
              <>
                <pixiGraphics
                  draw={drawContainerHitRect}
                  eventMode={containerIsPointerEventsNone ? "none" : "static"}
                  cursor={containerPixiCursor}
                  {...(!containerIsPointerEventsNone && {
                    onPointerDown: handleContainerPointerDown,
                    onPointerOver: handlePointerOver,
                    onPointerUp: handlePointerUp,
                    onPointerLeave: handlePointerLeave,
                  })}
                />
                {childElements.map((childEl) => renderChildElement(childEl))}
              </>
            );
          }
          return (
            <pixiGraphics
              draw={drawContainerHitRect}
              eventMode={containerIsPointerEventsNone ? "none" : "static"}
              cursor={containerPixiCursor}
              {...(!containerIsPointerEventsNone && {
                onPointerDown: handleContainerPointerDown,
                onPointerOver: handlePointerOver,
                onPointerUp: handlePointerUp,
                onPointerLeave: handlePointerLeave,
              })}
            />
          );
        }
        if (childElements && childElements.length > 0 && renderChildElement) {
          return (
            <>
              {/* 히트 영역: 컨테이너 원점(0,0)에 전체 크기 커버 */}
              <pixiGraphics
                draw={drawContainerHitRect}
                eventMode={containerIsPointerEventsNone ? "none" : "static"}
                cursor={containerPixiCursor}
                {...(!containerIsPointerEventsNone && {
                  onPointerDown: handleContainerPointerDown,
                  onPointerOver: handlePointerOver,
                  onPointerUp: handlePointerUp,
                  onPointerLeave: handlePointerLeave,
                })}
              />
              <pixiContainer x={0} y={0}>
                <BoxSprite element={effectiveElement} isSelected={isSelected} />
              </pixiContainer>
              {childElements.map((childEl) => renderChildElement(childEl))}
            </>
          );
        }
        return <BoxSprite element={effectiveElement} isSelected={isSelected} />;
    }
  })();

  // 🚀 Container children rendering for custom UI sprite types
  // 'flex'/'grid'/'box' cases already render children internally in the switch above.
  // 'toggleButtonGroup' renders modified children internally (size inheritance, margin offsets).
  // Custom UI sprite types (card, panel, form, dialog, etc.) only provide Pixi hit areas
  // and rely on this wrapper to render their container children via renderChildElement.
  // childElements is only set for elements in CONTAINER_TAGS (from BuilderCanvas).
  if (
    childElements &&
    childElements.length > 0 &&
    renderChildElement &&
    spriteType !== "box" &&
    spriteType !== "flex" &&
    spriteType !== "grid" &&
    spriteType !== "toggleButtonGroup"
  ) {
    return (
      <>
        {content}
        {childElements.map((childEl) => renderChildElement(childEl))}
      </>
    );
  }

  return content;
});

export default ElementSprite;
