import { Tag, Binary, PointerOff, PenOff } from 'lucide-react';
import { PropertyInput, PropertySwitch } from '../../components';
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
                icon={Tag}
            />

            <PropertyInput
                label={PROPERTY_LABELS.VALUE}
                value={String(currentProps.value || '')}
                onChange={(value) => updateProp('value', value)}
                icon={Binary}
            />

            <PropertySwitch
                label={PROPERTY_LABELS.DISABLED}
                isSelected={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
                icon={PointerOff}
            />

            <PropertySwitch
                label={PROPERTY_LABELS.READONLY}
                isSelected={Boolean(currentProps.isReadOnly)}
                onChange={(checked) => updateProp('isReadOnly', checked)}
                icon={PenOff}
            />
        </div>
    );
}
