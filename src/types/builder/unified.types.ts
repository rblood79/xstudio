// 통합된 타입 정의 파일
import React from "react";
import { ElementEvent } from "../events/events.types";
import { TokenValue, DesignToken } from "../theme";

// === 기본 타입 정의 ===
export interface BaseElementProps {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  computedStyle?: Partial<React.CSSProperties>; // Computed styles from browser
  "data-element-id"?: string;
  events?: ElementEvent[];
  children?: React.ReactNode; // children 속성 추가
}

// === 통합된 Element 타입 ===

// Inspector 데이터 바인딩 타입 (export)
export interface DataBinding {
  type: "collection" | "value" | "field";
  source: "supabase" | "api" | "state" | "static" | "parent";
  config: Record<string, unknown>;
}

// === 컬럼 매핑 타입 (ListBox, Select 등 Collection 컴포넌트용) ===
export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "image"
  | "url"
  | "email";

export interface FieldDefinition {
  key: string; // 데이터 키 (예: "name")
  label?: string; // 표시 레이블 (예: "Full Name")
  type?: FieldType; // 데이터 타입
  visible?: boolean; // 선택 여부 (기본 true)
  order?: number; // 표시 순서
}

export interface ColumnMapping {
  [fieldKey: string]: FieldDefinition;
}

export interface Element {
  id: string;
  customId?: string; // 사용자 정의 ID (예: button_1, input_2) - 이벤트 핸들링, CSS 선택자용
  tag: string;
  props: ComponentElementProps;
  parent_id?: string | null;
  order_num?: number;
  page_id?: string | null; // Layout element면 null (layout_id와 상호 배타적)
  created_at?: string;
  updated_at?: string;
  deleted?: boolean; // 삭제 여부 (UI 필터링용) ⭐
  // Inspector 데이터 바인딩 (선택적)
  dataBinding?: DataBinding;
  // Inspector 이벤트 핸들러 (선택적)
  events?: unknown[]; // EventHandler[] 타입 (순환 참조 방지를 위해 unknown 사용)
  // Layout/Slot System 필드
  layout_id?: string | null; // Layout에 속한 요소면 Layout ID (page_id와 상호 배타적)
  slot_name?: string | null; // Page 요소가 어떤 Slot에 들어갈지 (Page element에만 설정)
}

// === 통합된 Page 타입 ===
export interface Page {
  id: string;
  title: string;
  project_id: string;
  slug: string;
  parent_id?: string | null;
  order_num?: number;
  created_at?: string;
  updated_at?: string;
  // Layout/Slot System 필드
  layout_id?: string | null; // 적용할 Layout ID (optional - 없으면 Layout 없이 렌더링)
}

// === 컴포넌트별 Props 타입 ===
export interface ButtonElementProps extends BaseElementProps {
  children?: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "surface";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isDisabled?: boolean;
  onPress?: () => void;
}

export interface LinkElementProps extends BaseElementProps {
  children?: React.ReactNode;
  href?: string;
  variant?: "default" | "primary" | "secondary" | "surface" | "outline" | "ghost";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isDisabled?: boolean;
  isExternal?: boolean;
  showExternalIcon?: boolean;
  target?: string;
  rel?: string;
}

export interface TextFieldElementProps extends BaseElementProps {
  label?: string;
  description?: string;
  errorMessage?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  type?: "text" | "email" | "password" | "search" | "tel" | "url";
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  onChange?: (value: string) => void;
}

export interface CheckboxElementProps extends BaseElementProps {
  children?: React.ReactNode;
  isSelected?: boolean;
  defaultSelected?: boolean;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  onChange?: (isSelected: boolean) => void;
}

export interface RadioElementProps extends BaseElementProps {
  children?: React.ReactNode;
  value?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  onChange?: (isSelected: boolean) => void;
}

export interface ToggleButtonElementProps extends BaseElementProps {
  children?: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "surface";
  size?: "sm" | "md" | "lg";
  isSelected?: boolean;
  defaultSelected?: boolean;
  isDisabled?: boolean;
  onChange?: (isSelected: boolean) => void;
}

export interface ToggleButtonGroupElementProps extends BaseElementProps {
  children?: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "surface";
  size?: "sm" | "md" | "lg";
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  isDisabled?: boolean;
  selectionMode?: "single" | "multiple";
  orientation?: "horizontal" | "vertical";
}

export interface CheckboxGroupElementProps extends BaseElementProps {
  children?: React.ReactNode;
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  isDisabled?: boolean;
  orientation?: "horizontal" | "vertical";
}

export interface RadioGroupElementProps extends BaseElementProps {
  children?: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  isDisabled?: boolean;
  orientation?: "horizontal" | "vertical";
}

export interface SelectElementProps extends BaseElementProps {
  children?: React.ReactNode;
  selectedKey?: string;
  defaultSelectedKey?: string;
  onSelectionChange?: (key: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
}

export interface ComboBoxElementProps extends BaseElementProps {
  children?: React.ReactNode;
  inputValue?: string;
  defaultInputValue?: string;
  onInputChange?: (value: string) => void;
  selectedKey?: string;
  defaultSelectedKey?: string;
  onSelectionChange?: (key: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
  allowsCustomValue?: boolean;
}

export interface SliderElementProps extends BaseElementProps {
  label?: string;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  isDisabled?: boolean;
  orientation?: "horizontal" | "vertical";
}

export interface TailSwatchElementProps extends BaseElementProps {
  value?: string; // Color value (hex, rgb, hsl)
  defaultValue?: string;
  onChange?: (value: string) => void;
  colorSpace?: "rgb" | "hsl" | "hsb";
  isDisabled?: boolean;
}

export interface TabsElementProps extends BaseElementProps {
  children?: React.ReactNode;
  selectedKey?: string;
  defaultSelectedKey?: string;
  onSelectionChange?: (key: string) => void;
  orientation?: "horizontal" | "vertical";
}

export interface TabElementProps extends BaseElementProps {
  children?: React.ReactNode;
  id?: string;
  tabId?: string; // tabId 속성 추가
  isDisabled?: boolean;
}

export interface PanelElementProps extends BaseElementProps {
  children?: React.ReactNode;
  id?: string;
  tabId?: string; // tabId 속성 추가
  variant?: "default" | "tab" | "sidebar" | "card" | "modal";
}

export interface TreeElementProps extends BaseElementProps {
  children?: React.ReactNode;
  items?: Array<{
    id: string;
    name: string;
    children?: Array<{
      id: string;
      name: string;
    }>;
  }>;
  selectedKeys?: string[];
  defaultSelectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  isDisabled?: boolean;
}

export interface TreeItemElementProps extends BaseElementProps {
  children?: React.ReactNode;
  id?: string;
  isDisabled?: boolean;
}

export interface CalendarElementProps extends BaseElementProps {
  value?: unknown; // DateValue 타입 (런타임에서 처리)
  defaultValue?: unknown; // DateValue 타입 (런타임에서 처리)
  onChange?: (value: unknown) => void; // DateValue 타입 (런타임에서 처리)
  isDisabled?: boolean;
  isReadOnly?: boolean;
  minValue?: Date;
  maxValue?: Date;
}

export interface DatePickerElementProps extends BaseElementProps {
  value?: Date;
  defaultValue?: Date;
  onChange?: (value: Date) => void;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  minValue?: Date;
  maxValue?: Date;
  placeholder?: string;
}

export interface DateRangePickerElementProps extends BaseElementProps {
  value?: { start: Date; end: Date };
  defaultValue?: { start: Date; end: Date };
  onChange?: (value: { start: Date; end: Date }) => void;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  minValue?: Date;
  maxValue?: Date;
  placeholder?: string;
}

export interface SwitchElementProps extends BaseElementProps {
  children?: React.ReactNode;
  isSelected?: boolean;
  defaultSelected?: boolean;
  onChange?: (isSelected: boolean) => void;
  isDisabled?: boolean;
}

export interface TableElementProps extends BaseElementProps {
  children?: React.ReactNode;
  "data-element-id"?: string;
  items?: Array<Record<string, unknown>>;
  // ⚠️ columns는 더 이상 사용하지 않음 - TableHeader > Column Elements를 사용
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  variant?: "default" | "striped" | "bordered"; // Table variant 추가
  size?: "sm" | "md" | "lg"; // Table size 추가
  headerVariant?: "default" | "dark" | "primary"; // headerVariant 추가
  cellVariant?: "default" | "striped"; // cellVariant 추가
  enableAsyncLoading?: boolean; // 비동기 로딩 활성화 여부 추가
  apiUrlKey?: string; // 전역 API URL 맵핑 키 (예: 'SWAPI_PEOPLE_API')
  endpointPath?: string; // 기본 URL에 추가될 엔드포인트 경로 (예: '/people')
  apiParams?: Record<string, unknown>; // API 호출 시 전달될 추가 파라미터 (예: { search: 'Luke' })
  // 높이 관련 속성들
  height?: number; // 테이블 높이 (기본값: 400)
  heightMode?: "auto" | "fixed" | "viewport" | "full"; // 높이 모드
  heightUnit?: "px" | "vh" | "rem" | "em"; // 높이 단위
  viewportHeight?: number; // 뷰포트 높이 비율 (%)
  dataMapping?: { resultPath?: string; idKey?: string; totalKey?: string }; // API 응답 데이터 매핑 정보
  // 페이지네이션 모드 선택
  paginationMode?: "pagination" | "infinite"; // 페이지네이션 또는 무한스크롤 모드
  itemsPerPage?: number; // 페이지당 표시할 행 수 (기본값: 50)
  // 가상화 관련 속성 추가
  itemHeight?: number; // 각 행의 높이 (px)
  overscan?: number; // 미리 렌더링할 행 수
  // 헤더 고정 관련 속성
  stickyHeader?: boolean; // 헤더 고정 여부
  stickyHeaderOffset?: number; // 헤더 고정 시 오프셋 (px)
  // 정렬 관련 속성
  sortColumn?: string; // 정렬할 컬럼 키
  sortDirection?: "ascending" | "descending"; // 정렬 방향
}

export interface TableHeaderElementProps extends BaseElementProps {
  children?: React.ReactNode;
  variant?: "default" | "dark" | "light" | "bordered";
  sticky?: boolean;
}

export interface TableBodyElementProps extends BaseElementProps {
  children?: React.ReactNode;
  variant?: "default" | "striped" | "bordered" | "hover";
  selectable?: boolean;
}

export interface ColumnElementProps extends BaseElementProps {
  children?: React.ReactNode;
  key?: string; // 데이터 필드명 (예: 'id', 'name', 'email')
  isRowHeader?: boolean;
  allowsSorting?: boolean;
  enableResizing?: boolean;
  width?: number; // 픽셀 단위 숫자
  minWidth?: number;
  maxWidth?: number;
}

export interface ColumnGroupElementProps extends BaseElementProps {
  children?: React.ReactNode;
  label?: string; // 그룹 헤더 텍스트
  span?: number; // 합쳐질 컬럼 수 (colspan)
  align?: "left" | "center" | "right";
  variant?: "default" | "primary" | "secondary";
  sticky?: boolean; // 그룹 헤더 고정 여부
}

export interface RowElementProps extends BaseElementProps {
  children?: React.ReactNode;
  variant?: "default" | "striped" | "hover";
  height?: string;
  backgroundColor?: string;
}

export interface CellElementProps extends BaseElementProps {
  children?: React.ReactNode;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  backgroundColor?: string;
  color?: string;
}

export interface CardElementProps extends BaseElementProps {
  children?: React.ReactNode;
  variant?: "default" | "outlined" | "elevated" | "primary" | "secondary" | "surface" | "gallery" | "quiet";
  size?: "sm" | "md" | "lg";
  orientation?: "horizontal" | "vertical";
  title?: string;
  description?: string;
  heading?: string;
  subheading?: string;
  footer?: string;
  isSelectable?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
}

export interface BadgeElementProps extends BaseElementProps {
  children?: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "surface" | "outline" | "ghost";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isDot?: boolean;
  isPulsing?: boolean;
}

export interface TagGroupElementProps extends BaseElementProps {
  children?: React.ReactNode;
  items?: Array<{
    id: string;
    label: string;
    isDisabled?: boolean;
  }>;
  selectedKeys?: string[];
  defaultSelectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  isDisabled?: boolean;
  allowsRemoving?: boolean;
  onRemove?: (key: string) => void;
}

export interface TagElementProps extends BaseElementProps {
  children?: React.ReactNode;
  isDisabled?: boolean;
  onRemove?: () => void;
}

export interface ListBoxElementProps extends BaseElementProps {
  children?: React.ReactNode;
  items?: Array<{
    id: string;
    label: string;
    description?: string;
    isDisabled?: boolean;
  }>;
  selectedKeys?: string[];
  defaultSelectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  isDisabled?: boolean;
  selectionMode?: "single" | "multiple";
  columnMapping?: ColumnMapping; // 컬럼 매핑 정보 (자동 감지된 컬럼)
  autoDetectColumns?: boolean; // 자동 컬럼 감지 활성화
}

export interface ListBoxItemElementProps extends BaseElementProps {
  children?: React.ReactNode;
  id?: string;
  isDisabled?: boolean;
}

export interface FieldElementProps extends BaseElementProps {
  key?: string; // 데이터 키 (예: "name", "email")
  label?: string; // 표시 레이블
  type?: FieldType; // 데이터 타입
  value?: unknown; // 데이터 값 (런타임에서 바인딩)
}

export interface GridListElementProps extends BaseElementProps {
  children?: React.ReactNode;
  items?: Array<{
    id: string;
    label: string;
    description?: string;
    thumbnail?: string;
  }>;
  selectedKeys?: string[];
  defaultSelectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  isDisabled?: boolean;
  selectionMode?: "single" | "multiple";
}

export interface GridListItemElementProps extends BaseElementProps {
  children?: React.ReactNode;
  id?: string;
  isDisabled?: boolean;
}

export interface TextElementProps extends BaseElementProps {
  children?: React.ReactNode;
}

export interface DivElementProps extends BaseElementProps {
  children?: React.ReactNode;
}

export interface SectionElementProps extends BaseElementProps {
  children?: React.ReactNode;
}

export interface NavElementProps extends BaseElementProps {
  children?: React.ReactNode;
}

// === Slot Element Props (Layout System) ===
export interface SlotElementProps extends BaseElementProps {
  /** Slot 식별자 (예: "content", "sidebar", "navigation") */
  name: string;
  /** 필수 여부 - true면 Page에서 반드시 채워야 함 */
  required?: boolean;
  /** Slot 설명 (UI 표시용) */
  description?: string;
}

// === 통합된 ComponentElementProps ===
export type ComponentElementProps =
  | ButtonElementProps
  | LinkElementProps
  | TextFieldElementProps
  | CheckboxElementProps
  | RadioElementProps
  | ToggleButtonElementProps
  | ToggleButtonGroupElementProps
  | CheckboxGroupElementProps
  | RadioGroupElementProps
  | SelectElementProps
  | ComboBoxElementProps
  | SliderElementProps
  | TailSwatchElementProps
  | TabsElementProps
  | TabElementProps
  | PanelElementProps
  | TreeElementProps
  | TreeItemElementProps
  | CalendarElementProps
  | DatePickerElementProps
  | DateRangePickerElementProps
  | SwitchElementProps
  | TableElementProps
  | TableHeaderElementProps
  | TableBodyElementProps
  | ColumnElementProps
  | ColumnGroupElementProps
  | RowElementProps
  | CellElementProps
  | CardElementProps
  | BadgeElementProps
  | TagGroupElementProps
  | TagElementProps
  | ListBoxElementProps
  | ListBoxItemElementProps
  | FieldElementProps
  | GridListElementProps
  | GridListItemElementProps
  | TextElementProps
  | DivElementProps
  | SectionElementProps
  | NavElementProps
  | SlotElementProps;

// === 스토어 상태 타입 ===
export interface ElementsState {
  elements: Element[];
  selectedElementId: string | null;
  selectedElementProps: ComponentElementProps;
  selectedTab: { parentId: string; tabIndex: number } | null;
  pages: Page[];
  currentPageId: string | null;
}

export interface ThemeState {
  activeTheme: Record<string, unknown> | null;
  rawTokens: DesignToken[];
  semanticTokens: DesignToken[];
  loading: boolean;
  dirty: boolean;
  lastError?: string | null;
}

// HistoryState는 새로운 history 시스템으로 대체됨

export interface SelectionState {
  selectedElementId: string | null;
  selectedElementProps: ComponentElementProps;
  multiSelect: string[];
  selectionMode: "single" | "multi";
}

// === 통합 스토어 타입 ===
export interface Store extends ElementsState, ThemeState, SelectionState {
  // 액션들
  setElements: (
    elements: Element[],
    options?: { skipHistory?: boolean }
  ) => void;
  loadPageElements: (elements: Element[], pageId: string) => void;
  addElement: (element: Element) => void;
  updateElementProps: (elementId: string, props: ComponentElementProps) => void;
  setSelectedElement: (
    elementId: string | null,
    props?: ComponentElementProps
  ) => void;
  removeElement: (elementId: string) => Promise<void>;

  // 테마 액션들
  loadTheme: (projectId: string) => Promise<void>;
  updateTokenValue: (
    name: string,
    scope: "raw" | "semantic",
    value: TokenValue
  ) => void;

  // 히스토리 액션들
  undo: () => void;
  redo: () => void;
  addToHistory: (elements: Element[]) => void;
}

// === 기본 props 생성 함수들 ===
export function createDefaultButtonProps(): ButtonElementProps {
  return {
    children: "Button",
    variant: "default",
    size: "sm",
    isDisabled: false,
  };
}

export function createDefaultLinkProps(): LinkElementProps {
  return {
    children: "Link",
    href: "#",
    variant: "default",
    size: "md",
    isDisabled: false,
    isExternal: false,
    showExternalIcon: true,
  };
}

export function createDefaultTextFieldProps(): TextFieldElementProps {
  return {
    type: "text",
    isRequired: false,
    isDisabled: false,
    isReadOnly: false,
  };
}

export function createDefaultCheckboxProps(): CheckboxElementProps {
  return {
    children: "Checkbox",
    isSelected: false,
    isDisabled: false,
  };
}

export function createDefaultRadioProps(): RadioElementProps {
  return {
    isSelected: false,
    isDisabled: false,
  };
}

export function createDefaultToggleButtonProps(): ToggleButtonElementProps {
  return {
    children: "Toggle Button",
    variant: "default",
    size: "sm",
    isSelected: false,
    isDisabled: false,
  };
}

export function createDefaultToggleButtonGroupProps(): ToggleButtonGroupElementProps {
  return {
    variant: "default",
    size: "sm",
    value: [],
    isDisabled: false,
    selectionMode: "single",
    orientation: "horizontal",
  };
}

export function createDefaultCheckboxGroupProps(): CheckboxGroupElementProps {
  return {
    value: [],
    isDisabled: false,
    orientation: "horizontal",
  };
}

export function createDefaultRadioGroupProps(): RadioGroupElementProps {
  return {
    value: "",
    isDisabled: false,
    orientation: "horizontal",
  };
}

export function createDefaultSelectProps(): SelectElementProps {
  return {
    isDisabled: false,
  };
}

export function createDefaultComboBoxProps(): ComboBoxElementProps {
  return {
    isDisabled: false,
    allowsCustomValue: false,
  };
}

export function createDefaultSliderProps(): SliderElementProps {
  return {
    label: "Slider",
    value: 0,
    minValue: 0,
    maxValue: 100,
    step: 1,
    isDisabled: false,
    orientation: "horizontal",
  };
}

export function createDefaultTailSwatchProps(): TailSwatchElementProps {
  return {
    value: "#3b82f6", // Default blue-500
    colorSpace: "hsb",
    isDisabled: false,
  };
}

export function createDefaultTabsProps(): TabsElementProps {
  return {
    orientation: "horizontal",
  };
}

export function createDefaultTabProps(): TabElementProps {
  return {
    isDisabled: false,
  };
}

export function createDefaultPanelProps(): PanelElementProps {
  return {
    variant: "default",
  };
}

export function createDefaultTreeProps(): TreeElementProps {
  return {
    items: [],
    selectedKeys: [],
    isDisabled: false,
  };
}

export function createDefaultTreeItemProps(): TreeItemElementProps {
  return {
    isDisabled: false,
  };
}

export function createDefaultCalendarProps(): CalendarElementProps {
  return {
    isDisabled: false,
    isReadOnly: false,
  };
}

export function createDefaultDatePickerProps(): DatePickerElementProps {
  return {
    isDisabled: false,
    isReadOnly: false,
  };
}

export function createDefaultDateRangePickerProps(): DateRangePickerElementProps {
  return {
    isDisabled: false,
    isReadOnly: false,
  };
}

export function createDefaultSwitchProps(): SwitchElementProps {
  return {
    children: "Switch",
    isSelected: false,
    isDisabled: false,
  };
}

export function createDefaultTableProps(): TableElementProps {
  return {
    items: [],
    // ⚠️ columns 배열 제거 - TableHeader > Column Elements 사용
    selectionMode: "none",
    selectedKeys: [],
    variant: "default", // 기본값 추가
    size: "sm", // 기본값 추가
    headerVariant: "default", // 기본값 추가
    cellVariant: "default", // 기본값 추가
    // 페이지네이션 모드 기본값
    paginationMode: "infinite", // 기본값은 무한스크롤
    itemsPerPage: 10, // 페이지당 표시할 행 수 기본값
    // 가상화 관련 기본값 추가
    height: 400,
    itemHeight: 38,
    overscan: 10,
    // 헤더 고정 관련 기본값 추가
    stickyHeader: false,
    stickyHeaderOffset: 0,
    // 정렬 관련 기본값 추가 (undefined로 설정하여 API 순서 유지)
    sortColumn: undefined,
    sortDirection: "ascending",
  };
}

export function createDefaultTableHeaderProps(): TableHeaderElementProps {
  return {
    variant: "default",
    sticky: false,
  };
}

export function createDefaultTableBodyProps(): TableBodyElementProps {
  return {
    variant: "default",
    selectable: false,
  };
}

export function createDefaultColumnProps(): ColumnElementProps {
  return {
    children: "Column",
    key: "column",
    isRowHeader: false,
    allowsSorting: true,
    enableResizing: true,
    width: 150,
  };
}

export function createDefaultColumnGroupProps(): ColumnGroupElementProps {
  return {
    children: "Column Group",
    label: "Group",
    span: 2,
    align: "center",
    variant: "default",
    sticky: false,
  };
}

export function createDefaultRowProps(): RowElementProps {
  return {
    variant: "default",
    backgroundColor: "#ffffff", // 기본값 추가
  };
}

export function createDefaultCellProps(): CellElementProps {
  return {
    children: "Cell",
    textAlign: "left",
    verticalAlign: "middle",
    backgroundColor: "#ffffff", // 기본값 추가
    color: "#000000", // 기본값 추가
  };
}

export function createDefaultCardProps(): CardElementProps {
  return {
    variant: "default",
    size: "md",
    orientation: "vertical",
    title: "Title",
    description: "Description",
  };
}

export function createDefaultBadgeProps(): BadgeElementProps {
  return {
    children: "Badge",
    variant: "default",
    size: "sm",
    isDot: false,
    isPulsing: false,
  };
}

export function createDefaultTagGroupProps(): TagGroupElementProps {
  return {
    items: [],
    selectedKeys: [],
    isDisabled: false,
    allowsRemoving: false,
  };
}

export function createDefaultTagProps(): TagElementProps {
  return {
    isDisabled: false,
  };
}

export function createDefaultListBoxProps(): ListBoxElementProps {
  return {
    items: [],
    selectedKeys: [],
    isDisabled: false,
    selectionMode: "single",
  };
}

export function createDefaultListBoxItemProps(): ListBoxItemElementProps {
  return {
    isDisabled: false,
  };
}

export function createDefaultFieldProps(): FieldElementProps {
  return {
    key: "field",
    label: "Field",
    type: "string",
  };
}

export function createDefaultGridListProps(): GridListElementProps {
  return {
    items: [],
    selectedKeys: [],
    isDisabled: false,
    selectionMode: "single",
  };
}

export function createDefaultGridListItemProps(): GridListItemElementProps {
  return {
    isDisabled: false,
  };
}

export function createDefaultTextProps(): TextElementProps {
  return {
    children: "Text", // 기본 텍스트 내용 추가
  };
}

export function createDefaultDivProps(): DivElementProps {
  return {};
}

export function createDefaultSectionProps(): SectionElementProps {
  return {};
}

export function createDefaultNavProps(): NavElementProps {
  return {};
}

export function createDefaultSlotProps(): SlotElementProps {
  return {
    name: "content", // 기본 Slot 이름
    required: false,
    description: "",
  };
}

// === 통합된 기본 props 생성 함수 ===
export function getDefaultProps(tag: string): ComponentElementProps {
  const defaultPropsMap: Record<string, () => ComponentElementProps> = {
    Button: createDefaultButtonProps,
    TextField: createDefaultTextFieldProps,
    Checkbox: createDefaultCheckboxProps,
    Radio: createDefaultRadioProps,
    ToggleButton: createDefaultToggleButtonProps,
    ToggleButtonGroup: createDefaultToggleButtonGroupProps,
    CheckboxGroup: createDefaultCheckboxGroupProps,
    RadioGroup: createDefaultRadioGroupProps,
    Select: createDefaultSelectProps,
    ComboBox: createDefaultComboBoxProps,
    Slider: createDefaultSliderProps,
    TailSwatch: createDefaultTailSwatchProps,
    Tabs: createDefaultTabsProps,
    Tab: createDefaultTabProps,
    Panel: createDefaultPanelProps,
    Tree: createDefaultTreeProps,
    TreeItem: createDefaultTreeItemProps,
    Calendar: createDefaultCalendarProps,
    DatePicker: createDefaultDatePickerProps,
    DateRangePicker: createDefaultDateRangePickerProps,
    Switch: createDefaultSwitchProps,
    Table: createDefaultTableProps,
    TableHeader: createDefaultTableHeaderProps,
    TableBody: createDefaultTableBodyProps,
    Column: createDefaultColumnProps,
    Row: createDefaultRowProps,
    Cell: createDefaultCellProps,
    Card: createDefaultCardProps,
    TagGroup: createDefaultTagGroupProps,
    Tag: createDefaultTagProps,
    ListBox: createDefaultListBoxProps,
    ListBoxItem: createDefaultListBoxItemProps,
    Field: createDefaultFieldProps,
    GridList: createDefaultGridListProps,
    GridListItem: createDefaultGridListItemProps,
    Text: createDefaultTextProps,
    Div: createDefaultDivProps,
    Section: createDefaultSectionProps,
    Nav: createDefaultNavProps,
    Slot: createDefaultSlotProps,
  };

  const createProps = defaultPropsMap[tag];
  return createProps ? createProps() : {};
}
