import { Paintbrush, Palette, PointerOff, Type, Hash } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId, PropertySelect, PropertyColorPicker } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export function TailSwatchEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                placeholder="tailswatch_1"
            />

            {/* Color Section */}
            <fieldset className="properties-group">
                <legend>Color Value</legend>

                <PropertyColorPicker
                    label="Color"
                    value={String(currentProps.value || '#3b82f6')}
                    onChange={(value) => updateProp('value', value)}
                    icon={Paintbrush}
                />

                <PropertyInput
                    label="Default Value"
                    value={String(currentProps.defaultValue || '')}
                    onChange={(value) => updateProp('defaultValue', value || undefined)}
                    icon={Palette}
                    placeholder="#3b82f6"
                />
            </fieldset>

            {/* Color Space Section */}
            <fieldset className="properties-design">
                <legend>Color Space</legend>

                <PropertySelect
                    label="Color Space"
                    value={String(currentProps.colorSpace || 'hsb')}
                    onChange={(value) => updateProp('colorSpace', value)}
                    options={[
                        { value: 'rgb', label: 'RGB' },
                        { value: 'hsl', label: 'HSL' },
                        { value: 'hsb', label: 'HSB (Default)' }
                    ]}
                    icon={Palette}
                />
            </fieldset>

            {/* Behavior Section */}
            <fieldset className="properties-group">
                <legend>Behavior</legend>

                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />
            </fieldset>

            {/* Accessibility Section */}
            <fieldset className="properties-group">
                <legend>Accessibility</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Color picker"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABELLEDBY}
                    value={String(currentProps['aria-labelledby'] || '')}
                    onChange={(value) => updateProp('aria-labelledby', value || undefined)}
                    icon={Hash}
                    placeholder="label-element-id"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
                    value={String(currentProps['aria-describedby'] || '')}
                    onChange={(value) => updateProp('aria-describedby', value || undefined)}
                    icon={Hash}
                    placeholder="description-element-id"
                />
            </fieldset>
        </div>
    );
}
