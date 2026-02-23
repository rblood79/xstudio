import { memo, useMemo } from "react";
import { Clock, Tag, PointerOff, PenOff, CheckSquare, AlertTriangle, Globe, Focus, FileText, Type, Hash, FormInput } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId , PropertySection} from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const TimeFieldEditor = memo(function TimeFieldEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Get customId from element in store
      // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
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
        // Update customId in store (not in props)
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
                placeholder="timefield_1"
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

                <PropertyInput
                    label={PROPERTY_LABELS.PLACEHOLDER}
                    value={String(currentProps.placeholderValue || '')}
                    onChange={(value) => updateProp('placeholderValue', value || undefined)}
                    placeholder="00:00"
                />
            </PropertySection>

            {/* State Section */}
            <PropertySection title="State">

                <PropertyInput
                    label={PROPERTY_LABELS.MIN_VALUE}
                    value={String(currentProps.minValue || '')}
                    onChange={(value) => updateProp('minValue', value || undefined)}
                    placeholder="00:00"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.MAX_VALUE}
                    value={String(currentProps.maxValue || '')}
                    onChange={(value) => updateProp('maxValue', value || undefined)}
                    placeholder="23:59"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_VALUE}
                    value={String(currentProps.defaultValue || '')}
                    onChange={(value) => updateProp('defaultValue', value || undefined)}
                    placeholder="12:00"
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

                <PropertySelect
                    label={PROPERTY_LABELS.GRANULARITY}
                    value={String(currentProps.granularity || 'minute')}
                    onChange={(value) => updateProp('granularity', value)}
                    options={[
                        { value: 'hour', label: 'Hour' },
                        { value: 'minute', label: 'Minute' },
                        { value: 'second', label: 'Second' }
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
                    placeholder="time-field-name"
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
