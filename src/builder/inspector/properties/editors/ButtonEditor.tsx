import { Type, PointerOff } from 'lucide-react';
import { PropertyInput, PropertyCheckbox, PropertySelect } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';

export function ButtonEditor({ currentProps, onUpdate }: PropertyEditorProps) {
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
                label="Text"
                value={String(currentProps.children || '')}
                onChange={(value) => updateProp('children', value)}
                icon={Type}
            />

            <PropertyCheckbox
                label="Disabled"
                checked={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
                icon={PointerOff}
            />

            <PropertySelect
                label="Type"
                value={String(currentProps.type || 'button')}
                onChange={(value) => updateProp('type', value)}
                options={[
                    { id: 'button', label: 'Button' },
                    { id: 'submit', label: 'Submit' },
                    { id: 'reset', label: 'Reset' }
                ]}
            />
        </div>
    );
}


