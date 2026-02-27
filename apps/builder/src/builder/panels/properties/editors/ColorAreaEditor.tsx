import { memo, useMemo } from "react";
import { Palette, PointerOff, Move } from 'lucide-react';
import { PropertySwitch, PropertySelect, PropertyCustomId, PropertySection } from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const ColorAreaEditor = memo(function ColorAreaEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                    placeholder="colorarea_1"
                />
            </PropertySection>

            {/* Color Space Section */}
            <PropertySection title="Color Space">
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
                    label="X Channel"
                    value={String(currentProps.xChannel || 'saturation')}
                    onChange={(value) => updateProp('xChannel', value)}
                    options={[
                        { value: 'red', label: 'Red' },
                        { value: 'green', label: 'Green' },
                        { value: 'blue', label: 'Blue' },
                        { value: 'hue', label: 'Hue' },
                        { value: 'saturation', label: 'Saturation' },
                        { value: 'lightness', label: 'Lightness' },
                        { value: 'brightness', label: 'Brightness' }
                    ]}
                    icon={Move}
                />

                <PropertySelect
                    label="Y Channel"
                    value={String(currentProps.yChannel || 'brightness')}
                    onChange={(value) => updateProp('yChannel', value)}
                    options={[
                        { value: 'red', label: 'Red' },
                        { value: 'green', label: 'Green' },
                        { value: 'blue', label: 'Blue' },
                        { value: 'hue', label: 'Hue' },
                        { value: 'saturation', label: 'Saturation' },
                        { value: 'lightness', label: 'Lightness' },
                        { value: 'brightness', label: 'Brightness' }
                    ]}
                    icon={Move}
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
        </>
    );
});
