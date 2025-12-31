/**
 * 모든 렌더러를 통합하여 export
 */

import * as FormRenderers from "./FormRenderers";
import * as SelectionRenderers from "./SelectionRenderers";
import * as LayoutRenderers from "./LayoutRenderers";
import * as DateRenderers from "./DateRenderers";
import * as CollectionRenderers from "./CollectionRenderers";
import * as TableRenderer from "./TableRenderer";
import * as DataRenderers from "./DataRenderers";
import { PreviewElement, RenderContext } from "../../preview/types";

/**
 * 태그 이름을 렌더러 함수에 매핑
 */
export const rendererMap: Record<
  string,
  (element: PreviewElement, context: RenderContext) => React.ReactNode
> = {
  // Form 컴포넌트
  TextField: FormRenderers.renderTextField,
  NumberField: FormRenderers.renderNumberField,
  SearchField: FormRenderers.renderSearchField,
  Input: FormRenderers.renderInput,
  Label: FormRenderers.renderLabel,
  Description: FormRenderers.renderDescription,
  FieldError: FormRenderers.renderFieldError,
  Checkbox: FormRenderers.renderCheckbox,
  CheckboxGroup: FormRenderers.renderCheckboxGroup,
  Radio: FormRenderers.renderRadio,
  RadioGroup: FormRenderers.renderRadioGroup,
  Switch: FormRenderers.renderSwitch,
  TailSwatch: FormRenderers.renderTailSwatch,

  // Selection 컴포넌트
  ListBox: SelectionRenderers.renderListBox,
  ListBoxItem: SelectionRenderers.renderListBoxItem,
  GridList: SelectionRenderers.renderGridList,
  GridListItem: SelectionRenderers.renderGridListItem,
  Select: SelectionRenderers.renderSelect,
  ComboBox: SelectionRenderers.renderComboBox,
  Slider: SelectionRenderers.renderSlider,
  Field: SelectionRenderers.renderDataField,

  // Layout 컴포넌트
  Tabs: LayoutRenderers.renderTabs,
  Panel: LayoutRenderers.renderPanel,
  Card: LayoutRenderers.renderCard,
  Button: LayoutRenderers.renderButton,
  Text: LayoutRenderers.renderText,
  Tooltip: LayoutRenderers.renderTooltip,
  ProgressBar: LayoutRenderers.renderProgressBar,
  Meter: LayoutRenderers.renderMeter,
  Separator: LayoutRenderers.renderSeparator,
  Group: LayoutRenderers.renderGroup,
  Modal: LayoutRenderers.renderModal,
  Breadcrumbs: LayoutRenderers.renderBreadcrumbs,
  Breadcrumb: LayoutRenderers.renderBreadcrumb,
  Link: LayoutRenderers.renderLink,
  Badge: LayoutRenderers.renderBadge,
  Slot: LayoutRenderers.renderSlot,

  // Date 컴포넌트
  Calendar: DateRenderers.renderCalendar,
  DatePicker: DateRenderers.renderDatePicker,
  DateRangePicker: DateRenderers.renderDateRangePicker,
  DateField: DateRenderers.renderDateField,
  TimeField: DateRenderers.renderTimeField,

  // Collection 컴포넌트
  Tree: CollectionRenderers.renderTree,
  TreeItem: CollectionRenderers.renderTreeItem,
  TagGroup: CollectionRenderers.renderTagGroup,
  Tag: CollectionRenderers.renderTag,
  ToggleButtonGroup: CollectionRenderers.renderToggleButtonGroup,
  ToggleButton: CollectionRenderers.renderToggleButton,
  Menu: CollectionRenderers.renderMenu,
  MenuItem: CollectionRenderers.renderMenuItem,
  Toolbar: CollectionRenderers.renderToolbar,

  // Table 컴포넌트
  Table: TableRenderer.renderTable,
  TableHeader: TableRenderer.renderTableHeader,
  TableBody: TableRenderer.renderTableBody,
  Column: TableRenderer.renderColumn,
  Row: TableRenderer.renderRow,
  Cell: TableRenderer.renderCell,

  // Data 컴포넌트
  DataTable: DataRenderers.renderDataTable,
};

export {
  FormRenderers,
  SelectionRenderers,
  LayoutRenderers,
  DateRenderers,
  CollectionRenderers,
  TableRenderer,
  DataRenderers,
};
