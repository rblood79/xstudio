import { memo, useMemo } from "react";
import { Palette, PointerOff, Type, Hash, SlidersHorizontal } from 'lucide-react';
import { PropertySwitch, PropertySelect, PropertyCustomId, PropertySection, PropertyInput } from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const ColorSliderEditor = memo(function ColorSliderEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                    placeholder="colorslider_1"
                />
            </PropertySection>

            {/* Channel Section */}
            <PropertySection title="Channel">
                <PropertySelect
                    label="Color Space"
                    value={String(currentProps.colorSpace || 'hsb')}
                    onChange={(value) => updateProp('colorSpace', value)}
                    options={[
                        { value: 'rgb', label: 'RGB' },
                        { value: 'hsl', label: 'HSL' },
                        { value: 'hsb', label: 'HSB' }
                    ]}
                    icon={Palette}
                />

                <PropertySelect
                    label="Channel"
                    value={String(currentProps.channel || 'hue')}
                    onChange={(value) => updateProp('channel', value)}
                    options={[
                        { value: 'hue', label: 'Hue' },
                        { value: 'saturation', label: 'Saturation' },
                        { value: 'brightness', label: 'Brightness' },
                        { value: 'lightness', label: 'Lightness' },
                        { value: 'red', label: 'Red' },
                        { value: 'green', label: 'Green' },
                        { value: 'blue', label: 'Blue' },
                        { value: 'alpha', label: 'Alpha' }
                    ]}
                    icon={SlidersHorizontal}
                />

                <PropertySelect
                    label="Orientation"
                    value={String(currentProps.orientation || 'horizontal')}
                    onChange={(value) => updateProp('orientation', value)}
                    options={[
                        { value: 'horizontal', label: 'Horizontal' },
                        { value: 'vertical', label: 'Vertical' }
                    ]}
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
                    placeholder="Color slider"
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
