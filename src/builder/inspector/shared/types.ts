/* Shared types across inspector components */

// Re-export from existing types to centralize
export { PropertyEditorProps } from '../properties/types/editorTypes';
export type { 
    EditableTextFieldProps,
    EditableButtonProps,
    EditableSelectProps,
    EditableCheckboxProps,
    PropertyField,
    ComponentPropsMapping
} from '../properties/types/editorTypes';

// Inspector specific types
export interface InspectorTab {
    id: string;
    label: string;
    panel: React.ComponentType;
}

export interface InspectorProps {
    className?: string;
}