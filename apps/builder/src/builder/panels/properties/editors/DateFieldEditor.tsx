import { memo, useMemo } from "react";
import { CalendarDays, Tag, PointerOff, PenOff, CheckSquare, AlertTriangle, Clock, Globe, Focus, FileText, FormInput } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId, PropertySection } from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const DateFieldEditor = memo(function DateFieldEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get customId from element in store
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
                    placeholder="datefield_1"
                />
            </PropertySection>

            {/* Content Section */}
            <PropertySection title="Content">
                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value || undefined)}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DESCRIPTION}
                    value={String(currentProps.description || '')}
                    onChange={(value) => updateProp('description', value || undefined)}
                    icon={FileText}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ERROR_MESSAGE}
                    value={String(currentProps.errorMessage || '')}
                    onChange={(value) => updateProp('errorMessage', value || undefined)}
                    icon={AlertTriangle}
                />
            </PropertySection>

            {/* State Section */}
            <PropertySection title="State">
                <PropertyInput
                    label="Timezone"
                    value={String(currentProps.timezone || '')}
                    onChange={(value) => updateProp('timezone', value || undefined)}
                    placeholder="Asia/Seoul"
                    icon={Globe}
                />

                <PropertySwitch
                    label="Default to Today"
                    isSelected={Boolean(currentProps.defaultToday)}
                    onChange={(checked) => updateProp('defaultToday', checked)}
                    icon={CalendarDays}
                />

                <PropertyInput
                    label="Min Date"
                    value={String(currentProps.minDate || '')}
                    onChange={(value) => updateProp('minDate', value || undefined)}
                    placeholder="2024-01-01"
                />

                <PropertyInput
                    label="Max Date"
                    value={String(currentProps.maxDate || '')}
                    onChange={(value) => updateProp('maxDate', value || undefined)}
                    placeholder="2024-12-31"
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.REQUIRED}
                    isSelected={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
                    icon={CheckSquare}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.INVALID}
                    isSelected={Boolean(currentProps.isInvalid)}
                    onChange={(checked) => updateProp('isInvalid', checked)}
                    icon={AlertTriangle}
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
                    label={PROPERTY_LABELS.AUTO_FOCUS}
                    isSelected={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                    icon={Focus}
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
                        { value: 'tertiary', label: 'Tertiary' },
                        { value: 'error', label: 'Error' },
                        { value: 'filled', label: 'Filled' }
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
                    label={PROPERTY_LABELS.GRANULARITY}
                    value={String(currentProps.granularity || '')}
                    onChange={(value) => updateProp('granularity', value || undefined)}
                    options={[
                        { value: '', label: 'Date Only' },
                        { value: 'hour', label: 'Hour' },
                        { value: 'minute', label: 'Minute' },
                        { value: 'second', label: 'Second' }
                    ]}
                    icon={Clock}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.HOUR_CYCLE}
                    value={String(currentProps.hourCycle || '')}
                    onChange={(value) => updateProp('hourCycle', value ? Number(value) : undefined)}
                    options={[
                        { value: '', label: 'Default (Locale)' },
                        { value: '12', label: '12 Hour' },
                        { value: '24', label: '24 Hour' }
                    ]}
                    icon={Clock}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.HIDE_TIMEZONE}
                    isSelected={Boolean(currentProps.hideTimeZone)}
                    onChange={(checked) => updateProp('hideTimeZone', checked)}
                    icon={Globe}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.FORCE_LEADING_ZEROS}
                    isSelected={Boolean(currentProps.shouldForceLeadingZeros)}
                    onChange={(checked) => updateProp('shouldForceLeadingZeros', checked)}
                    icon={Clock}
                />
            </PropertySection>

            {/* Form Integration Section */}
            <PropertySection title="Form Integration">
                <PropertyInput
                    label={PROPERTY_LABELS.NAME}
                    value={String(currentProps.name || '')}
                    onChange={(value) => updateProp('name', value || undefined)}
                    icon={FormInput}
                    placeholder="date-field-name"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.FORM}
                    value={String(currentProps.form || '')}
                    onChange={(value) => updateProp('form', value || undefined)}
                    icon={FormInput}
                    placeholder="form-id"
                />

                <PropertySelect
                    label={PROPERTY_LABELS.VALIDATION_BEHAVIOR}
                    value={String(currentProps.validationBehavior || 'native')}
                    onChange={(value) => updateProp('validationBehavior', value)}
                    options={[
                        { value: 'native', label: 'Native' },
                        { value: 'aria', label: 'ARIA' }
                    ]}
                />
            </PropertySection>
        </>
    );
});
