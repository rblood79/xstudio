import { memo, useMemo } from "react";
import { Circle, PointerOff, Type, Hash } from 'lucide-react';
import { PropertySwitch, PropertyCustomId, PropertySection, PropertyInput } from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const ColorWheelEditor = memo(function ColorWheelEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                    placeholder="colorwheel_1"
                />
            </PropertySection>

            {/* Size Section */}
            <PropertySection title="Size">
                <PropertyInput
                    label="Outer Radius"
                    value={String(currentProps.outerRadius || '100')}
                    onChange={(value) => updateProp('outerRadius', value ? Number(value) : undefined)}
                    icon={Circle}
                    placeholder="100"
                />

                <PropertyInput
                    label="Inner Radius"
                    value={String(currentProps.innerRadius || '74')}
                    onChange={(value) => updateProp('innerRadius', value ? Number(value) : undefined)}
                    icon={Circle}
                    placeholder="74"
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
