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

export interface EditableSelectProps {
    label?: string;
    description?: string;
    isRequired?: boolean;
    isDisabled?: boolean;
    isReadOnly?: boolean;
    selectedKey?: string | number;
    defaultSelectedKey?: string | number;
    placeholder?: string;
}

export interface EditableCheckboxProps {
    children?: React.ReactNode;
    isSelected?: boolean;
    isDisabled?: boolean;
    isReadOnly?: boolean;
    isIndeterminate?: boolean;
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

export interface EditablePanelProps {
    title?: string;
    variant?: 'tab' | 'card' | 'bordered' | 'shadow';
    tabIndex?: number;
    isOpen?: boolean;
    isDismissable?: boolean;
    className?: string;
    style?: Record<string, string | number>;
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
    Checkbox: EditableCheckboxProps;
    Tabs: EditableTabsProps;
    Panel: EditablePanelProps;
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
    Select: [
        { key: 'label', label: 'Label', type: 'text', required: true },
        { key: 'selectedKey', label: 'Selected Key', type: 'text' },
        { key: 'placeholder', label: 'Placeholder', type: 'text' },
        { key: 'description', label: 'Description', type: 'text' },
        { key: 'isRequired', label: 'Required', type: 'boolean' },
        { key: 'isDisabled', label: 'Disabled', type: 'boolean' },
        { key: 'items', label: 'Items', type: 'array' },
    ],
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
};
