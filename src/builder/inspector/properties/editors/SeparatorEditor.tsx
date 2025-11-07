import { Minus, PencilRuler, Layout } from 'lucide-react';
import { PropertySelect, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';

export function SeparatorEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                placeholder="separator_1"
            />

            <PropertySelect
                label={PROPERTY_LABELS.ORIENTATION}
                value={String(currentProps.orientation || 'horizontal')}
                onChange={(value) => updateProp('orientation', value)}
                options={[
                    { value: 'horizontal', label: PROPERTY_LABELS.ORIENTATION_HORIZONTAL },
                    { value: 'vertical', label: PROPERTY_LABELS.ORIENTATION_VERTICAL }
                ]}
                icon={Minus}
            />

            <PropertySelect
                label={PROPERTY_LABELS.VARIANT}
                value={String(currentProps.variant || 'default')}
                onChange={(value) => updateProp('variant', value)}
                options={[
                    { value: 'default', label: PROPERTY_LABELS.SEPARATOR_VARIANT_DEFAULT },
                    { value: 'dashed', label: PROPERTY_LABELS.SEPARATOR_VARIANT_DASHED },
                    { value: 'dotted', label: PROPERTY_LABELS.SEPARATOR_VARIANT_DOTTED }
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
        </div>
    );
}
