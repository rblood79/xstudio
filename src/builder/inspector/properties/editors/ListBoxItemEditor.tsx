import { Type, CircleDot, PointerOff } from 'lucide-react';
import { PropertyInput, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';

export function ListBoxItemEditor({ currentProps, onUpdate }: PropertyEditorProps) {
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
                label={PROPERTY_LABELS.LABEL}
                value={String(currentProps.label || '')}
                onChange={(value) => updateProp('label', value)}
                icon={Type}
            />

            <PropertyInput
                label={PROPERTY_LABELS.VALUE}
                value={String(currentProps.value || '')}
                onChange={(value) => updateProp('value', value)}
                icon={CircleDot}
            />

            <PropertyCheckbox
                label={PROPERTY_LABELS.DISABLED}
                checked={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
                icon={PointerOff}
            />

            <PropertyCheckbox
                label={PROPERTY_LABELS.READONLY}
                checked={Boolean(currentProps.isReadOnly)}
                onChange={(checked) => updateProp('isReadOnly', checked)}
            />
        </div>
    );
}
