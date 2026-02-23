import { memo, useMemo } from "react";
import { Palette, Type, Hash } from 'lucide-react';
import { PropertyCustomId, PropertySection, PropertyInput, PropertySelect } from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const ColorSwatchEditor = memo(function ColorSwatchEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                    placeholder="colorswatch_1"
                />
            </PropertySection>

            {/* Color Section */}
            <PropertySection title="Color">
                <PropertyInput
                    label="Color Value"
                    value={String(currentProps.color || '')}
                    onChange={(value) => updateProp('color', value || undefined)}
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
        </>
    );
});
