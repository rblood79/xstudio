import { Type, CheckSquare, Hash } from 'lucide-react';
import { PropertyInput, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';

export function SelectEditor({ currentProps, onUpdate }: PropertyEditorProps) {
    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    return (
        <div className="component-props">
            <PropertyInput
                label="Label"
                value={String(currentProps.label || '')}
                onChange={(value) => updateProp('label', value)}
                icon={Type}
            />

            <PropertyInput
                label="Selected Key"
                value={String(currentProps.selectedKey || '')}
                onChange={(value) => updateProp('selectedKey', value)}
                icon={Hash}
            />

            <PropertyInput
                label="Placeholder"
                value={String(currentProps.placeholder || '')}
                onChange={(value) => updateProp('placeholder', value)}
            />

            <PropertyInput
                label="Description"
                value={String(currentProps.description || '')}
                onChange={(value) => updateProp('description', value)}
            />

            <PropertyCheckbox
                label="Required"
                checked={Boolean(currentProps.isRequired)}
                onChange={(checked) => updateProp('isRequired', checked)}
                icon={CheckSquare}
            />

            <PropertyCheckbox
                label="Disabled"
                checked={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
            />
        </div>
    );
}
