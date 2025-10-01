// 통합된 타입 정의 파일
import React from 'react';
import { ElementEvent } from './events';
import { TokenValue } from './theme';

// === 기본 타입 정의 ===
export interface BaseElementProps {
    id?: string;
    className?: string;
    style?: React.CSSProperties;
    'data-element-id'?: string;
    events?: ElementEvent[];
    children?: React.ReactNode; // children 속성 추가
}

// === 통합된 Element 타입 ===
export interface Element {
    id: string;
    tag: string;
    props: ComponentElementProps;
    parent_id?: string | null;
    order_num?: number;
    page_id: string;
    created_at?: string;
    updated_at?: string;
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
}

// === 컴포넌트별 Props 타입 ===
export interface ButtonElementProps extends BaseElementProps {
    children?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'surface';
    size?: 'sm' | 'md' | 'lg';
    isDisabled?: boolean;
    onPress?: () => void;
}

export interface TextFieldElementProps extends BaseElementProps {
    label?: string;
    description?: string;
    errorMessage?: string;
    placeholder?: string;
    value?: string;
    defaultValue?: string;
    type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
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
    isSelected?: boolean;
    defaultSelected?: boolean;
    isDisabled?: boolean;
    onChange?: (isSelected: boolean) => void;
}

export interface ToggleButtonGroupElementProps extends BaseElementProps {
    children?: React.ReactNode;
    value?: string[];
    defaultValue?: string[];
    onChange?: (value: string[]) => void;
    isDisabled?: boolean;
    selectionMode?: 'single' | 'multiple';
    orientation?: 'horizontal' | 'vertical';
}

export interface CheckboxGroupElementProps extends BaseElementProps {
    children?: React.ReactNode;
    value?: string[];
    defaultValue?: string[];
    onChange?: (value: string[]) => void;
    isDisabled?: boolean;
    orientation?: 'horizontal' | 'vertical';
}

export interface RadioGroupElementProps extends BaseElementProps {
    children?: React.ReactNode;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    isDisabled?: boolean;
    orientation?: 'horizontal' | 'vertical';
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
    orientation?: 'horizontal' | 'vertical';
}

export interface TabsElementProps extends BaseElementProps {
    children?: React.ReactNode;
    selectedKey?: string;
    defaultSelectedKey?: string;
    onSelectionChange?: (key: string) => void;
    orientation?: 'horizontal' | 'vertical';
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
    variant?: 'default' | 'tab' | 'sidebar' | 'card' | 'modal';
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
    value?: Date;
    defaultValue?: Date;
    onChange?: (value: Date) => void;
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
    'data-element-id'?: string;
    items?: Array<Record<string, unknown>>;
    // ⚠️ columns는 더 이상 사용하지 않음 - TableHeader > Column Elements를 사용
    selectionMode?: 'none' | 'single' | 'multiple';
    selectedKeys?: string[];
    onSelectionChange?: (keys: string[]) => void;
    variant?: 'default' | 'striped' | 'bordered'; // Table variant 추가
    size?: 'sm' | 'md' | 'lg'; // Table size 추가
    headerVariant?: 'default' | 'dark' | 'primary'; // headerVariant 추가
    cellVariant?: 'default' | 'striped'; // cellVariant 추가
    enableAsyncLoading?: boolean; // 비동기 로딩 활성화 여부 추가
    apiUrlKey?: string; // 전역 API URL 맵핑 키 (예: 'SWAPI_PEOPLE_API')
    endpointPath?: string; // 기본 URL에 추가될 엔드포인트 경로 (예: '/people')
    apiParams?: Record<string, unknown>; // API 호출 시 전달될 추가 파라미터 (예: { search: 'Luke' })
    dataMapping?: { resultPath?: string; idKey?: string }; // API 응답 데이터 매핑 정보
    // 페이지네이션 모드 선택
    paginationMode?: 'pagination' | 'infinite'; // 페이지네이션 또는 무한스크롤 모드
    itemsPerPage?: number; // 페이지당 표시할 행 수 (기본값: 50)
    // 가상화 관련 속성 추가
    height?: number; // 테이블 높이 (px)
    itemHeight?: number; // 각 행의 높이 (px)
    overscan?: number; // 미리 렌더링할 행 수
    // 헤더 고정 관련 속성
    stickyHeader?: boolean; // 헤더 고정 여부
    stickyHeaderOffset?: number; // 헤더 고정 시 오프셋 (px)
    // 정렬 관련 속성
    sortColumn?: string; // 정렬할 컬럼 키
    sortDirection?: 'ascending' | 'descending'; // 정렬 방향
}

export interface TableHeaderElementProps extends BaseElementProps {
    children?: React.ReactNode;
    variant?: 'default' | 'dark' | 'light' | 'bordered';
    sticky?: boolean;
}

export interface TableBodyElementProps extends BaseElementProps {
    children?: React.ReactNode;
    variant?: 'default' | 'striped' | 'bordered' | 'hover';
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

export interface RowElementProps extends BaseElementProps {
    children?: React.ReactNode;
    variant?: 'default' | 'striped' | 'hover';
    height?: string;
    backgroundColor?: string;
}

export interface CellElementProps extends BaseElementProps {
    children?: React.ReactNode;
    textAlign?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'middle' | 'bottom';
    backgroundColor?: string;
    color?: string;
}

export interface CardElementProps extends BaseElementProps {
    children?: React.ReactNode;
    variant?: 'default' | 'outlined' | 'elevated';
    size?: 'small' | 'medium' | 'large';
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
    selectionMode?: 'single' | 'multiple';
}

export interface ListBoxItemElementProps extends BaseElementProps {
    children?: React.ReactNode;
    id?: string;
    isDisabled?: boolean;
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
    selectionMode?: 'single' | 'multiple';
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

// === 통합된 ComponentElementProps ===
export type ComponentElementProps =
    | ButtonElementProps
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
    | RowElementProps
    | CellElementProps
    | CardElementProps
    | TagGroupElementProps
    | TagElementProps
    | ListBoxElementProps
    | ListBoxItemElementProps
    | GridListElementProps
    | GridListItemElementProps
    | TextElementProps
    | DivElementProps
    | SectionElementProps
    | NavElementProps;

// === 테마 관련 타입 ===
export interface DesignToken {
    id: string;
    project_id: string;
    theme_id: string;
    name: string;
    type: 'color' | 'typography' | 'spacing' | 'border' | 'shadow';
    value: TokenValue;
    scope: 'raw' | 'semantic';
    alias_of?: string | null;
    css_variable?: string;
    created_at?: string;
    updated_at?: string;
}

// === 스토어 상태 타입 ===
export interface ElementsState {
    elements: Element[];
    selectedElementId: string | null;
    selectedElementProps: ComponentElementProps;
    selectedTab: { parentId: string, tabIndex: number } | null;
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
    selectionMode: 'single' | 'multi';
}

// === 통합 스토어 타입 ===
export interface Store extends ElementsState, ThemeState, SelectionState {
    // 액션들
    setElements: (elements: Element[], options?: { skipHistory?: boolean }) => void;
    loadPageElements: (elements: Element[], pageId: string) => void;
    addElement: (element: Element) => void;
    updateElementProps: (elementId: string, props: ComponentElementProps) => void;
    setSelectedElement: (elementId: string | null, props?: ComponentElementProps) => void;
    removeElement: (elementId: string) => Promise<void>;

    // 테마 액션들
    loadTheme: (projectId: string) => Promise<void>;
    updateTokenValue: (name: string, scope: 'raw' | 'semantic', value: TokenValue) => void;

    // 히스토리 액션들
    undo: () => void;
    redo: () => void;
    addToHistory: (elements: Element[]) => void;
}

// === 기본 props 생성 함수들 ===
export function createDefaultButtonProps(): ButtonElementProps {
    return {
        children: 'Button',
        variant: 'primary',
        size: 'sm',
        isDisabled: false
    };
}

export function createDefaultTextFieldProps(): TextFieldElementProps {
    return {
        type: 'text',
        isRequired: false,
        isDisabled: false,
        isReadOnly: false
    };
}

export function createDefaultCheckboxProps(): CheckboxElementProps {
    return {
        children: 'Checkbox',
        isSelected: false,
        isDisabled: false
    };
}

export function createDefaultRadioProps(): RadioElementProps {
    return {
        isSelected: false,
        isDisabled: false
    };
}

export function createDefaultToggleButtonProps(): ToggleButtonElementProps {
    return {
        children: 'Toggle Button',
        isSelected: false,
        isDisabled: false
    };
}

export function createDefaultToggleButtonGroupProps(): ToggleButtonGroupElementProps {
    return {
        value: [],
        isDisabled: false,
        selectionMode: 'single',
        orientation: 'horizontal'
    };
}

export function createDefaultCheckboxGroupProps(): CheckboxGroupElementProps {
    return {
        value: [],
        isDisabled: false,
        orientation: 'horizontal'
    };
}

export function createDefaultRadioGroupProps(): RadioGroupElementProps {
    return {
        value: '',
        isDisabled: false,
        orientation: 'horizontal'
    };
}

export function createDefaultSelectProps(): SelectElementProps {
    return {
        isDisabled: false
    };
}

export function createDefaultComboBoxProps(): ComboBoxElementProps {
    return {
        isDisabled: false,
        allowsCustomValue: false
    };
}

export function createDefaultSliderProps(): SliderElementProps {
    return {
        label: 'Slider',
        value: 0,
        minValue: 0,
        maxValue: 100,
        step: 1,
        isDisabled: false,
        orientation: 'horizontal'
    };
}

export function createDefaultTabsProps(): TabsElementProps {
    return {
        orientation: 'horizontal'
    };
}

export function createDefaultTabProps(): TabElementProps {
    return {
        isDisabled: false
    };
}

export function createDefaultPanelProps(): PanelElementProps {
    return {
        variant: 'default'
    };
}

export function createDefaultTreeProps(): TreeElementProps {
    return {
        items: [],
        selectedKeys: [],
        isDisabled: false
    };
}

export function createDefaultTreeItemProps(): TreeItemElementProps {
    return {
        isDisabled: false
    };
}

export function createDefaultCalendarProps(): CalendarElementProps {
    return {
        isDisabled: false,
        isReadOnly: false
    };
}

export function createDefaultDatePickerProps(): DatePickerElementProps {
    return {
        isDisabled: false,
        isReadOnly: false
    };
}

export function createDefaultDateRangePickerProps(): DateRangePickerElementProps {
    return {
        isDisabled: false,
        isReadOnly: false
    };
}

export function createDefaultSwitchProps(): SwitchElementProps {
    return {
        children: 'Switch',
        isSelected: false,
        isDisabled: false
    };
}

export function createDefaultTableProps(): TableElementProps {
    return {
        items: [],
        // ⚠️ columns 배열 제거 - TableHeader > Column Elements 사용
        selectionMode: 'none',
        selectedKeys: [],
        variant: 'default', // 기본값 추가
        size: 'md', // 기본값 추가
        headerVariant: 'default', // 기본값 추가
        cellVariant: 'default', // 기본값 추가
        // 비동기 로딩을 위한 기본값 추가
        enableAsyncLoading: true,
        apiUrlKey: 'MOCK_USER_DATA',
        endpointPath: '/api/mock/users',
        apiParams: {},
        dataMapping: { resultPath: '', idKey: 'id' },
        // 페이지네이션 모드 기본값
        paginationMode: 'infinite', // 기본값은 무한스크롤
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
        sortDirection: 'ascending',
    };
}

export function createDefaultTableHeaderProps(): TableHeaderElementProps {
    return {
        variant: 'default',
        sticky: false,
    };
}

export function createDefaultTableBodyProps(): TableBodyElementProps {
    return {
        variant: 'default',
        selectable: false,
    };
}

export function createDefaultColumnProps(): ColumnElementProps {
    return {
        children: 'Column',
        key: 'column',
        isRowHeader: false,
        allowsSorting: true,
        enableResizing: true,
        width: 150,
    };
}

export function createDefaultRowProps(): RowElementProps {
    return {
        variant: 'default',
        backgroundColor: '#ffffff', // 기본값 추가
    };
}

export function createDefaultCellProps(): CellElementProps {
    return {
        children: 'Cell',
        textAlign: 'left',
        verticalAlign: 'middle',
        backgroundColor: '#ffffff', // 기본값 추가
        color: '#000000', // 기본값 추가
    };
}

export function createDefaultCardProps(): CardElementProps {
    return {
        variant: 'default',
        size: 'medium'
    };
}

export function createDefaultTagGroupProps(): TagGroupElementProps {
    return {
        items: [],
        selectedKeys: [],
        isDisabled: false,
        allowsRemoving: false
    };
}

export function createDefaultTagProps(): TagElementProps {
    return {
        isDisabled: false
    };
}

export function createDefaultListBoxProps(): ListBoxElementProps {
    return {
        items: [],
        selectedKeys: [],
        isDisabled: false,
        selectionMode: 'single'
    };
}

export function createDefaultListBoxItemProps(): ListBoxItemElementProps {
    return {
        isDisabled: false
    };
}

export function createDefaultGridListProps(): GridListElementProps {
    return {
        items: [],
        selectedKeys: [],
        isDisabled: false,
        selectionMode: 'single'
    };
}

export function createDefaultGridListItemProps(): GridListItemElementProps {
    return {
        isDisabled: false
    };
}

export function createDefaultTextProps(): TextElementProps {
    return {
        children: 'Text' // 기본 텍스트 내용 추가
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
        GridList: createDefaultGridListProps,
        GridListItem: createDefaultGridListItemProps,
        Text: createDefaultTextProps,
        Div: createDefaultDivProps,
        Section: createDefaultSectionProps,
        Nav: createDefaultNavProps
    };

    const createProps = defaultPropsMap[tag];
    return createProps ? createProps() : {};
}
