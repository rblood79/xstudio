import { Tag, PointerOff, CheckCheck, PenOff, Binary } from 'lucide-react';
import { PropertyInput, PropertySwitch } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';

export function RadioEditor({ currentProps, onUpdate }: PropertyEditorProps) {
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
                value={String(currentProps.children || '')}
                onChange={(value) => updateProp('children', value)}
                icon={Tag}
            />

            <PropertyInput
                label={PROPERTY_LABELS.VALUE}
                value={String(currentProps.value || '')}
                onChange={(value) => updateProp('value', value)}
                icon={Binary}
            />

            <PropertySwitch
                label={PROPERTY_LABELS.SELECTED}
                isSelected={Boolean(currentProps.isSelected)}
                onChange={(checked) => updateProp('isSelected', checked)}
                icon={CheckCheck}
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
