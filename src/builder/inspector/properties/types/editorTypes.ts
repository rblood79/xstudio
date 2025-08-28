// React Aria Components 기반 타입 정의
import { TextFieldProps, ButtonProps, SelectProps, CheckboxProps } from 'react-aria-components';

// 각 컴포넌트별 편집 가능한 프로퍼티 정의
export interface EditableTextFieldProps extends Pick<TextFieldProps,
    'label' | 'description' | 'isRequired' | 'isDisabled' | 'isReadOnly' | 'value' | 'defaultValue' | 'placeholder'
> { }

export interface EditableButtonProps extends Pick<ButtonProps,
    'children' | 'isDisabled' | 'type' | 'form' | 'formAction' | 'formMethod'
> { }

export interface EditableSelectProps extends Pick<SelectProps<any>,
    'label' | 'description' | 'isRequired' | 'isDisabled' | 'isReadOnly' | 'selectedKey' | 'defaultSelectedKey' | 'placeholder'
> { }

export interface EditableCheckboxProps extends Pick<CheckboxProps,
    'children' | 'isSelected' | 'isDisabled' | 'isReadOnly' | 'isIndeterminate'
> { }

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
};
