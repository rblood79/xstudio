import { memo, useMemo } from "react";
import { Palette, PointerOff, Type, Hash, LayoutGrid } from 'lucide-react';
import { PropertySwitch, PropertySelect, PropertyCustomId, PropertySection, PropertyInput } from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const ColorSwatchPickerEditor = memo(function ColorSwatchPickerEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const customId = useMemo(() => {
        const element = useStore.getState().elementsMap.get(elementId);
        return element?.customId || "";
    }, [elementId]);

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    const updateCustomId = (newCustomId: string) => {
        const updateElement = useStore.getState().updateElement;
        if (updateElement && elementId) {
            updateElement(elementId, { customId: newCustomId });
        }
    };

    return (
        <>
            {/* Basic */}
            <PropertySection title="Basic">
                <PropertyCustomId
                    label="ID"
                    value={customId}
                    elementId={elementId}
                    onChange={updateCustomId}
                    placeholder="colorswatchpicker_1"
                />
            </PropertySection>

            {/* Layout Section */}
            <PropertySection title="Layout">
                <PropertySelect
                    label="Layout"
                    value={String(currentProps.layout || 'grid')}
                    onChange={(value) => updateProp('layout', value)}
                    options={[
                        { value: 'grid', label: 'Grid' },
                        { value: 'stack', label: 'Stack' }
                    ]}
                    icon={LayoutGrid}
                />
            </PropertySection>

            {/* Color Section */}
            <PropertySection title="Colors">
                <PropertyInput
                    label="Default Value"
                    value={String(currentProps.defaultValue || '')}
                    onChange={(value) => updateProp('defaultValue', value || undefined)}
                    icon={Palette}
                    placeholder="#ff0000"
                />

                <PropertySelect
                    label="Color Space"
                    value={String(currentProps.colorSpace || '')}
                    onChange={(value) => updateProp('colorSpace', value || undefined)}
                    options={[
                        { value: '', label: 'Default' },
                        { value: 'rgb', label: 'RGB' },
                        { value: 'hsl', label: 'HSL' },
                        { value: 'hsb', label: 'HSB' }
                    ]}
                    icon={Palette}
                />
            </PropertySection>

            {/* Behavior Section */}
            <PropertySection title="Behavior">
                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />
            </PropertySection>

            {/* Accessibility Section */}
            <PropertySection title="Accessibility">
                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Color swatch picker"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABELLEDBY}
                    value={String(currentProps['aria-labelledby'] || '')}
                    onChange={(value) => updateProp('aria-labelledby', value || undefined)}
                    icon={Hash}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
                    value={String(currentProps['aria-describedby'] || '')}
                    onChange={(value) => updateProp('aria-describedby', value || undefined)}
                    icon={Hash}
                />
            </PropertySection>
        </>
    );
});
