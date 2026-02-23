import { memo, useMemo } from "react";
import { CalendarDays, PointerOff, PenOff, Type, Hash } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId, PropertySection } from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const RangeCalendarEditor = memo(function RangeCalendarEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                    placeholder="rangecalendar_1"
                />
            </PropertySection>

            {/* State Section */}
            <PropertySection title="State">
                <PropertyInput
                    label="Min Date"
                    value={String(currentProps.minDate || '')}
                    onChange={(value) => updateProp('minDate', value || undefined)}
                    placeholder="2024-01-01"
                    icon={CalendarDays}
                />

                <PropertyInput
                    label="Max Date"
                    value={String(currentProps.maxDate || '')}
                    onChange={(value) => updateProp('maxDate', value || undefined)}
                    placeholder="2024-12-31"
                    icon={CalendarDays}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ERROR_MESSAGE}
                    value={String(currentProps.errorMessage || '')}
                    onChange={(value) => updateProp('errorMessage', value || undefined)}
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

                <PropertySwitch
                    label={PROPERTY_LABELS.READONLY}
                    isSelected={Boolean(currentProps.isReadOnly)}
                    onChange={(checked) => updateProp('isReadOnly', checked)}
                    icon={PenOff}
                />

                <PropertySwitch
                    label="Allow Non-Contiguous Ranges"
                    isSelected={Boolean(currentProps.allowsNonContiguousRanges)}
                    onChange={(checked) => updateProp('allowsNonContiguousRanges', checked)}
                />
            </PropertySection>

            {/* Design Section */}
            <PropertySection title="Design">
                <PropertySelect
                    label={PROPERTY_LABELS.VARIANT}
                    value={String(currentProps.variant || 'primary')}
                    onChange={(value) => updateProp('variant', value)}
                    options={[
                        { value: 'primary', label: 'Primary' },
                        { value: 'secondary', label: 'Secondary' },
                        { value: 'tertiary', label: 'Tertiary' }
                    ]}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.SIZE}
                    value={String(currentProps.size || 'md')}
                    onChange={(value) => updateProp('size', value)}
                    options={[
                        { value: 'sm', label: 'Small' },
                        { value: 'md', label: 'Medium' },
                        { value: 'lg', label: 'Large' }
                    ]}
                />

                <PropertySelect
                    label="Visible Duration"
                    value={String(currentProps.visibleDuration || '')}
                    onChange={(value) => updateProp('visibleDuration', value || undefined)}
                    options={[
                        { value: '', label: 'Default (1 month)' },
                        { value: '{months: 2}', label: '2 Months' },
                        { value: '{months: 3}', label: '3 Months' }
                    ]}
                    icon={CalendarDays}
                />
            </PropertySection>
        </>
    );
});
