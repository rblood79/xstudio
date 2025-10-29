import { Type, FileText, Layout, Eye, EyeOff, PointerOff, Focus, PencilRuler } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';

export function CardEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                placeholder="card_1"
            />

            <PropertyInput
                label={PROPERTY_LABELS.TITLE}
                value={String(currentProps.title || '')}
                onChange={(value) => updateProp('title', value)}
                icon={Type}
            />

            <PropertyInput
                label={PROPERTY_LABELS.DESCRIPTION}
                value={String(currentProps.description || '')}
                onChange={(value) => updateProp('description', value)}
                icon={FileText}
            />

            <PropertySelect
                label={PROPERTY_LABELS.VARIANT}
                value={String(currentProps.variant || 'default')}
                onChange={(value) => updateProp('variant', value)}
                options={[
                    { value: 'default', label: PROPERTY_LABELS.CARD_VARIANT_DEFAULT },
                    { value: 'elevated', label: PROPERTY_LABELS.CARD_VARIANT_ELEVATED },
                    { value: 'outlined', label: PROPERTY_LABELS.CARD_VARIANT_OUTLINED }
                ]}
                icon={Layout}
            />

            <PropertySelect
                label={PROPERTY_LABELS.SIZE}
                value={String(currentProps.size || 'medium')}
                onChange={(value) => updateProp('size', value)}
                options={[
                    { value: 'small', label: PROPERTY_LABELS.CARD_SIZE_SMALL },
                    { value: 'medium', label: PROPERTY_LABELS.CARD_SIZE_MEDIUM },
                    { value: 'large', label: PROPERTY_LABELS.CARD_SIZE_LARGE }
                ]}
                icon={PencilRuler}
            />

            <PropertySwitch
                label={PROPERTY_LABELS.IS_QUIET}
                isSelected={Boolean(currentProps.isQuiet)}
                onChange={(checked) => updateProp('isQuiet', checked)}
                icon={EyeOff}
            />

            <PropertySwitch
                label={PROPERTY_LABELS.SELECTED}
                isSelected={Boolean(currentProps.isSelected)}
                onChange={(checked) => updateProp('isSelected', checked)}
                icon={Eye}
            />

            <PropertySwitch
                label={PROPERTY_LABELS.DISABLED}
                isSelected={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
                icon={PointerOff}
            />

            <PropertySwitch
                label={PROPERTY_LABELS.IS_FOCUSED}
                isSelected={Boolean(currentProps.isFocused)}
                onChange={(checked) => updateProp('isFocused', checked)}
                icon={Focus}
            />
        </div>
    );
}
