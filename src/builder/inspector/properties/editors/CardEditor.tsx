import { Type, FileText, Layout, EyeOff, PointerOff, PencilRuler } from 'lucide-react';
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
                    { value: 'primary', label: PROPERTY_LABELS.CARD_VARIANT_PRIMARY },
                    { value: 'secondary', label: PROPERTY_LABELS.CARD_VARIANT_SECONDARY },
                    { value: 'surface', label: PROPERTY_LABELS.CARD_VARIANT_SURFACE },
                    { value: 'elevated', label: PROPERTY_LABELS.CARD_VARIANT_ELEVATED },
                    { value: 'outlined', label: PROPERTY_LABELS.CARD_VARIANT_OUTLINED }
                ]}
                icon={Layout}
            />

            <PropertySelect
                label={PROPERTY_LABELS.SIZE}
                value={String(currentProps.size || 'md')}
                onChange={(value) => updateProp('size', value)}
                options={[
                    { value: 'sm', label: PROPERTY_LABELS.SIZE_SM },
                    { value: 'md', label: PROPERTY_LABELS.SIZE_MD },
                    { value: 'lg', label: PROPERTY_LABELS.SIZE_LG }
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
                label={PROPERTY_LABELS.DISABLED}
                isSelected={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
                icon={PointerOff}
            />
        </div>
    );
}
