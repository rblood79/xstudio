import { Tag, CheckSquare, PointerOff, PenOff, Minus } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';

export function CheckboxEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                placeholder="checkbox_1"
            />

            <PropertyInput
                label={PROPERTY_LABELS.LABEL}
                value={String(currentProps.children || '')}
                onChange={(value) => updateProp('children', value)}
                icon={Tag}
            />

            <PropertySwitch
                label={PROPERTY_LABELS.SELECTED}
                isSelected={Boolean(currentProps.isSelected)}
                onChange={(checked) => updateProp('isSelected', checked)}
                icon={CheckSquare}
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

            <PropertySwitch
                label={PROPERTY_LABELS.INDETERMINATE}
                isSelected={Boolean(currentProps.isIndeterminate)}
                onChange={(checked) => updateProp('isIndeterminate', checked)}
                icon={Minus}
            />
        </div>
    );
}
