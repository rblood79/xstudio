import { Type, PointerOff, Parentheses } from 'lucide-react';
import { PropertyEditorProps } from '../types/editorTypes';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId } from '../../components';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';

export function ButtonEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                placeholder="button_1"
            />

            <PropertyInput
                label={PROPERTY_LABELS.TEXT}
                value={String(currentProps.children || '')}
                onChange={(value) => updateProp('children', value)}
                icon={Type}
            />

            <PropertySwitch
                label={PROPERTY_LABELS.DISABLED}
                isSelected={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
                icon={PointerOff}
            />

            <PropertySelect
                label={PROPERTY_LABELS.TYPE}
                value={String(currentProps.type || 'button')}
                onChange={(value) => updateProp('type', value)}
                options={[
                    { value: 'button', label: PROPERTY_LABELS.BUTTON },
                    { value: 'submit', label: PROPERTY_LABELS.SUBMIT },
                    { value: 'reset', label: PROPERTY_LABELS.RESET }
                ]}
                icon={Parentheses}
            />

            <PropertySelect
                label={PROPERTY_LABELS.VARIANT}
                value={String(currentProps.variant || 'primary')}
                onChange={(value) => updateProp('variant', value)}
                options={[
                    { value: 'primary', label: PROPERTY_LABELS.VARIANT_PRIMARY },
                    { value: 'secondary', label: PROPERTY_LABELS.VARIANT_SECONDARY },
                    { value: 'surface', label: PROPERTY_LABELS.VARIANT_SURFACE },
                    { value: 'outline', label: PROPERTY_LABELS.VARIANT_OUTLINE },
                    { value: 'ghost', label: PROPERTY_LABELS.VARIANT_GHOST },
                ]}
                icon={Parentheses}
            />

            <PropertySelect
                label={PROPERTY_LABELS.SIZE}
                value={String(currentProps.size || 'sm')}
                onChange={(value) => updateProp('size', value)}
                options={[
                    { value: 'xs', label: PROPERTY_LABELS.SIZE_XS },
                    { value: 'sm', label: PROPERTY_LABELS.SIZE_SM },
                    { value: 'md', label: PROPERTY_LABELS.SIZE_MD },
                    { value: 'lg', label: PROPERTY_LABELS.SIZE_LG },
                    { value: 'xl', label: PROPERTY_LABELS.SIZE_XL },
                ]}
                icon={Parentheses}
            />
        </div>
    );
}


