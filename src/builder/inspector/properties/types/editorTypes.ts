// React Aria Components 기반 타입 정의
import React from 'react';

// 각 컴포넌트별 편집 가능한 프로퍼티 정의
export interface EditableTextFieldProps {
    label?: string;
    description?: string;
    isRequired?: boolean;
    isDisabled?: boolean;
    isReadOnly?: boolean;
    value?: string;
    defaultValue?: string;
    placeholder?: string;
}

export interface EditableButtonProps {
    children?: React.ReactNode;
    isDisabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    form?: string;
    formAction?: string;
    formMethod?: string;
}

// 기본 Select 속성 (기존 정의는 아래에서 확장)

export interface EditableCheckboxProps {
    children?: React.ReactNode;
    isSelected?: boolean;
    isDisabled?: boolean;
    isReadOnly?: boolean;
    isIndeterminate?: boolean;
}

export interface EditableCheckboxGroupProps {
    label?: string;
    description?: string;
    errorMessage?: string;
    orientation?: 'horizontal' | 'vertical';
    isDisabled?: boolean;
    isRequired?: boolean;
    isReadOnly?: boolean;
    children?: Array<CheckboxItem>;
}

export interface EditableRadioGroupProps {
    label?: string;
    description?: string;
    errorMessage?: string;
    value?: string;
    defaultValue?: string;
    isDisabled?: boolean;
    isRequired?: boolean;
    isReadOnly?: boolean;
    children?: Array<RadioItem>;
}

export interface EditableToggleButtonGroupProps {
    orientation?: 'horizontal' | 'vertical';
    selectionMode?: 'single' | 'multiple';
    defaultSelectedKeys?: Set<string>;
    selectedKeys?: Set<string>;
    disallowEmptySelection?: boolean;
    isDisabled?: boolean;
    children?: Array<ToggleButtonItem>;
}

export interface EditableListBoxProps {
    label?: string;
    description?: string;
    errorMessage?: string;
    selectionMode?: 'single' | 'multiple';
    defaultSelectedKeys?: Set<string>;
    selectedKeys?: Set<string>;
    disallowEmptySelection?: boolean;
    isDisabled?: boolean;
    autoFocus?: boolean;
    children?: Array<ListBoxItem>;
}

export interface EditableGridListProps extends Omit<EditableListBoxProps, 'children'> {
    selectionBehavior?: 'toggle' | 'replace';
    allowsDragging?: boolean;
    renderEmptyState?: boolean;
    children?: Array<GridListItem>;
}

export interface EditableSelectProps {
    label?: string;
    description?: string;
    errorMessage?: string;
    placeholder?: string;
    selectedKey?: string | number;
    defaultSelectedKey?: string | number;
    disallowEmptySelection?: boolean;
    isDisabled?: boolean;
    isRequired?: boolean;
    isReadOnly?: boolean;
    autoFocus?: boolean;
    children?: Array<SelectItem>;
}

export interface EditableComboBoxProps extends Omit<EditableSelectProps, 'children'> {
    allowsCustomValue?: boolean;
    menuTrigger?: 'focus' | 'input' | 'manual';
    inputValue?: string;
    defaultInputValue?: string;
    children?: Array<ComboBoxItem>;
}

export interface EditableTabsProps {
    orientation?: 'horizontal' | 'vertical';
    defaultSelectedKey?: string | number;
    selectedKey?: string | number;
    onSelectionChange?: (key: string | number) => void;
    children?: Array<TabItem>;
}

export interface TabItem {
    id: string;
    title: string;
    variant?: 'default' | 'bordered' | 'underlined' | 'pill';
    appearance?: 'light' | 'dark' | 'solid' | 'bordered';
}

export interface CheckboxItem {
    id: string;
    label: string;
    isSelected?: boolean;
    isDisabled?: boolean;
    isIndeterminate?: boolean;
    value?: string;
}

export interface RadioItem {
    id: string;
    label: string;
    value: string;
    isDisabled?: boolean;
}

export interface ToggleButtonItem {
    id: string;
    title: string;
    isSelected?: boolean;
    isDisabled?: boolean;
    children?: React.ReactNode;
}

export interface ListBoxItem {
    id: string;
    label: string;
    value: string;
    isDisabled?: boolean;
    textValue?: string;
}

export interface GridListItem extends ListBoxItem {
    description?: string;
}

export interface SelectItem {
    id: string;
    label: string;
    value: string;
    isDisabled?: boolean;
    textValue?: string;
}

export interface ComboBoxItem extends SelectItem {
    description?: string;
}

export interface EditablePanelProps {
    title?: string;
    variant?: 'tab' | 'card' | 'bordered' | 'shadow';
    tabIndex?: number;
    isOpen?: boolean;
    isDismissable?: boolean;
    className?: string;
    style?: Record<string, string | number>;
}

export interface EditableSliderProps {
    label?: string;
    value?: number | number[];
    defaultValue?: number | number[];
    minValue?: number;
    maxValue?: number;
    step?: number;
    orientation?: 'horizontal' | 'vertical';
    isDisabled?: boolean;
    thumbLabels?: string[];
}

// 프로퍼티 에디터 공통 인터페이스
export interface PropertyEditorProps {
    elementId: string;
    currentProps: Record<string, unknown>;
    onUpdate: (updatedProps: Record<string, unknown>) => void;
}

// 컴포넌트별 프로퍼티 매핑
export interface ComponentPropsMapping {
    TextField: EditableTextFieldProps;
    Button: EditableButtonProps;
    Select: EditableSelectProps;
    ComboBox: EditableComboBoxProps;
    Checkbox: EditableCheckboxProps;
    CheckboxGroup: EditableCheckboxGroupProps;
    RadioGroup: EditableRadioGroupProps;
    ToggleButtonGroup: EditableToggleButtonGroupProps;
    ListBox: EditableListBoxProps;
    GridList: EditableGridListProps;
    Tabs: EditableTabsProps;
    Panel: EditablePanelProps;
    Slider: EditableSliderProps;
}

// 프로퍼티 필드 정의
export interface PropertyField {
    key: string;
    label: string;
    type: 'text' | 'boolean' | 'select' | 'number' | 'color' | 'array' | 'object';
    icon?: React.ComponentType<any>;
    options?: Array<{ id: string; label: string }>;
    description?: string;
    required?: boolean;
}

// 컴포넌트별 프로퍼티 필드 설정
export const COMPONENT_PROPERTY_FIELDS: Record<string, PropertyField[]> = {
    Select: [
        { key: 'label', label: '라벨', type: 'text' },
        { key: 'description', label: '설명', type: 'text' },
        { key: 'errorMessage', label: '오류 메시지', type: 'text' },
        { key: 'placeholder', label: '플레이스홀더', type: 'text' },
        { key: 'selectedKey', label: '선택된 키', type: 'text' },
        { key: 'defaultSelectedKey', label: '기본 선택 키', type: 'text' },
        { key: 'disallowEmptySelection', label: '빈 선택 허용 안함', type: 'boolean' },
        { key: 'isDisabled', label: '비활성화', type: 'boolean' },
        { key: 'isRequired', label: '필수', type: 'boolean' },
        { key: 'isReadOnly', label: '읽기 전용', type: 'boolean' },
        { key: 'autoFocus', label: '자동 포커스', type: 'boolean' },
        { key: 'children', label: '옵션 목록', type: 'array' },
    ],
    ComboBox: [
        { key: 'label', label: '라벨', type: 'text' },
        { key: 'description', label: '설명', type: 'text' },
        { key: 'errorMessage', label: '오류 메시지', type: 'text' },
        { key: 'placeholder', label: '플레이스홀더', type: 'text' },
        { key: 'selectedKey', label: '선택된 키', type: 'text' },
        { key: 'defaultSelectedKey', label: '기본 선택 키', type: 'text' },
        { key: 'inputValue', label: '입력 값', type: 'text' },
        { key: 'defaultInputValue', label: '기본 입력 값', type: 'text' },
        { key: 'allowsCustomValue', label: '사용자 정의 값 허용', type: 'boolean' },
        {
            key: 'menuTrigger',
            label: '메뉴 트리거',
            type: 'select',
            options: [
                { id: 'focus', label: 'Focus' },
                { id: 'input', label: 'Input' },
                { id: 'manual', label: 'Manual' }
            ]
        },
        { key: 'disallowEmptySelection', label: '빈 선택 허용 안함', type: 'boolean' },
        { key: 'isDisabled', label: '비활성화', type: 'boolean' },
        { key: 'isRequired', label: '필수', type: 'boolean' },
        { key: 'isReadOnly', label: '읽기 전용', type: 'boolean' },
        { key: 'autoFocus', label: '자동 포커스', type: 'boolean' },
        { key: 'children', label: '옵션 목록', type: 'array' },
    ],
    ListBox: [
        { key: 'label', label: '라벨', type: 'text' },
        { key: 'description', label: '설명', type: 'text' },
        { key: 'errorMessage', label: '오류 메시지', type: 'text' },
        {
            key: 'selectionMode',
            label: '선택 모드',
            type: 'select',
            options: [
                { id: 'single', label: 'Single' },
                { id: 'multiple', label: 'Multiple' }
            ]
        },
        { key: 'disallowEmptySelection', label: '빈 선택 허용 안함', type: 'boolean' },
        { key: 'isDisabled', label: '비활성화', type: 'boolean' },
        { key: 'autoFocus', label: '자동 포커스', type: 'boolean' },
        { key: 'children', label: '아이템 목록', type: 'array' },
    ],
    GridList: [
        { key: 'label', label: '라벨', type: 'text' },
        { key: 'description', label: '설명', type: 'text' },
        { key: 'errorMessage', label: '오류 메시지', type: 'text' },
        {
            key: 'selectionMode',
            label: '선택 모드',
            type: 'select',
            options: [
                { id: 'single', label: 'Single' },
                { id: 'multiple', label: 'Multiple' }
            ]
        },
        {
            key: 'selectionBehavior',
            label: '선택 동작',
            type: 'select',
            options: [
                { id: 'toggle', label: 'Toggle' },
                { id: 'replace', label: 'Replace' }
            ]
        },
        { key: 'disallowEmptySelection', label: '빈 선택 허용 안함', type: 'boolean' },
        { key: 'isDisabled', label: '비활성화', type: 'boolean' },
        { key: 'autoFocus', label: '자동 포커스', type: 'boolean' },
        { key: 'allowsDragging', label: '드래그 허용', type: 'boolean' },
        { key: 'renderEmptyState', label: '빈 상태 렌더링', type: 'boolean' },
        { key: 'children', label: '아이템 목록', type: 'array' },
    ],
    ToggleButtonGroup: [
        {
            key: 'orientation',
            label: '방향',
            type: 'select',
            options: [
                { id: 'horizontal', label: 'Horizontal' },
                { id: 'vertical', label: 'Vertical' }
            ]
        },
        {
            key: 'selectionMode',
            label: '선택 모드',
            type: 'select',
            options: [
                { id: 'single', label: 'Single' },
                { id: 'multiple', label: 'Multiple' }
            ]
        },
        { key: 'disallowEmptySelection', label: '빈 선택 허용 안함', type: 'boolean' },
        { key: 'isDisabled', label: '비활성화', type: 'boolean' },
        { key: 'children', label: '버튼 목록', type: 'array' },
    ],
    CheckboxGroup: [
        { key: 'label', label: '라벨', type: 'text' },
        { key: 'description', label: '설명', type: 'text' },
        { key: 'errorMessage', label: '오류 메시지', type: 'text' },
        {
            key: 'orientation',
            label: '방향',
            type: 'select',
            options: [
                { id: 'horizontal', label: 'Horizontal' },
                { id: 'vertical', label: 'Vertical' }
            ]
        },
        { key: 'isDisabled', label: '비활성화', type: 'boolean' },
        { key: 'isRequired', label: '필수', type: 'boolean' },
        { key: 'isReadOnly', label: '읽기 전용', type: 'boolean' },
        { key: 'children', label: '체크박스 목록', type: 'array' },
    ],
    RadioGroup: [
        { key: 'label', label: '라벨', type: 'text' },
        { key: 'description', label: '설명', type: 'text' },
        { key: 'errorMessage', label: '오류 메시지', type: 'text' },
        { key: 'value', label: '선택 값', type: 'text' },
        { key: 'defaultValue', label: '기본 선택 값', type: 'text' },
        { key: 'isDisabled', label: '비활성화', type: 'boolean' },
        { key: 'isRequired', label: '필수', type: 'boolean' },
        { key: 'isReadOnly', label: '읽기 전용', type: 'boolean' },
        { key: 'children', label: '라디오 버튼 목록', type: 'array' },
    ],
    TextField: [
        { key: 'label', label: 'Label', type: 'text', required: true },
        { key: 'value', label: 'Value', type: 'text' },
        { key: 'placeholder', label: 'Placeholder', type: 'text' },
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'isRequired', label: 'Required', type: 'boolean' },
        { key: 'isDisabled', label: 'Disabled', type: 'boolean' },
        { key: 'isReadOnly', label: 'Read Only', type: 'boolean' },
    ],
    Button: [
        { key: 'children', label: 'Text', type: 'text', required: true },
        { key: 'isDisabled', label: 'Disabled', type: 'boolean' },
        {
            key: 'type', label: 'Type', type: 'select', options: [
                { id: 'button', label: 'Button' },
                { id: 'submit', label: 'Submit' },
                { id: 'reset', label: 'Reset' }
            ]
        },
    ],
    // Select는 위에서 이미 정의됨
    Checkbox: [
        { key: 'children', label: 'Text', type: 'text' },
        { key: 'isSelected', label: 'Selected', type: 'boolean' },
        { key: 'isDisabled', label: 'Disabled', type: 'boolean' },
        { key: 'isIndeterminate', label: 'Indeterminate', type: 'boolean' },
    ],
    Tabs: [
        { key: 'defaultSelectedKey', label: '기본 선택 탭', type: 'select' },
        {
            key: 'orientation',
            label: '방향',
            type: 'select',
            options: [
                { id: 'horizontal', label: 'Horizontal' },
                { id: 'vertical', label: 'Vertical' }
            ]
        },
        { key: 'children', label: '탭 목록', type: 'array' },
    ],
    Panel: [
        { key: 'title', label: '제목', type: 'text' },
        {
            key: 'variant',
            label: '스타일',
            type: 'select',
            options: [
                { id: 'tab', label: 'Tab' },
                { id: 'card', label: 'Card' },
                { id: 'bordered', label: 'Bordered' },
                { id: 'shadow', label: 'Shadow' }
            ]
        },
        { key: 'isOpen', label: '열림 상태', type: 'boolean' },
        { key: 'isDismissable', label: '닫기 가능', type: 'boolean' }
    ],
    Slider: [
        { key: 'label', label: '라벨', type: 'text' },
        { key: 'value', label: '기본값', type: 'number' },
        { key: 'minValue', label: '최소값', type: 'number' },
        { key: 'maxValue', label: '최대값', type: 'number' },
        { key: 'step', label: '단계', type: 'number' },
        {
            key: 'orientation',
            label: '방향',
            type: 'select',
            options: [
                { id: 'horizontal', label: 'Horizontal' },
                { id: 'vertical', label: 'Vertical' }
            ]
        },
        { key: 'isDisabled', label: '비활성화', type: 'boolean' }
    ],
};
