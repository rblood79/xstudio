import { Tag, Binary, PointerOff, PenOff } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';

export function GridListItemEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get customId from element in store
    const element = useStore((state) => state.elements.find((el) => el.id === elementId));
    const customId = element?.customId || '';
    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    const updateCustomId = (newCustomId: string) => {
        // Update customId in store (not in props)
        const updateElement = useStore.getState().updateElement;
        if (updateElement && elementId) {
            updateElement(elementId, { customId: newCustomId });
        }
    };

    return (
        <div className="component-props">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="gridlistitem_1"
            />

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
