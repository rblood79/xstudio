import React from 'react';
import { Type, Binary, CheckSquare } from 'lucide-react';
import { PropertyInput, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';

export function TextFieldEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                label="Value"
                value={String(currentProps.value || '')}
                onChange={(value) => updateProp('value', value)}
                icon={Binary}
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

            <PropertyCheckbox
                label="Read Only"
                checked={Boolean(currentProps.isReadOnly)}
                onChange={(checked) => updateProp('isReadOnly', checked)}
            />
        </div>
    );
}


