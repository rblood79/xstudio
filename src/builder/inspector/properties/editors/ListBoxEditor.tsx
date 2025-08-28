import { Type } from 'lucide-react';
import { PropertyInput, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';

export function ListBoxEditor({ currentProps, onUpdate }: PropertyEditorProps) {
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
                label="Description"
                value={String(currentProps.description || '')}
                onChange={(value) => updateProp('description', value)}
            />

            <PropertyCheckbox
                label="Disabled"
                checked={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
            />

            <PropertyCheckbox
                label="Auto Focus"
                checked={Boolean(currentProps.autoFocus)}
                onChange={(checked) => updateProp('autoFocus', checked)}
            />
        </div>
    );
}
