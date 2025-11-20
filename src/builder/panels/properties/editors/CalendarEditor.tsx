import { memo, useCallback, useMemo } from "react";
import { Calendar, PointerOff, PenOff, AlertTriangle, Focus, Type, Hash, Globe, CalendarDays } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId , PropertySection} from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const CalendarEditor = memo(function CalendarEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                placeholder="calendar_1"
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

                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_VALUE}
                    value={String(currentProps.defaultValue || '')}
                    onChange={(value) => updateProp('defaultValue', value || undefined)}
                    placeholder="YYYY-MM-DD"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_FOCUSED_VALUE}
                    value={String(currentProps.defaultFocusedValue || '')}
                    onChange={(value) => updateProp('defaultFocusedValue', value || undefined)}
                    placeholder="YYYY-MM-DD"
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
                    label={PROPERTY_LABELS.PAGE_BEHAVIOR}
                    value={String(currentProps.pageBehavior || 'visible')}
                    onChange={(value) => updateProp('pageBehavior', value)}
                    options={[
                        { value: 'visible', label: 'Visible' },
                        { value: 'single', label: 'Single' }
                    ]}
                    icon={Calendar}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.FIRST_DAY_OF_WEEK}
                    value={String(currentProps.firstDayOfWeek || '')}
                    onChange={(value) => updateProp('firstDayOfWeek', value || undefined)}
                    options={[
                        { value: '', label: 'Default (Locale)' },
                        { value: 'sun', label: 'Sunday' },
                        { value: 'mon', label: 'Monday' },
                        { value: 'tue', label: 'Tuesday' },
                        { value: 'wed', label: 'Wednesday' },
                        { value: 'thu', label: 'Thursday' },
                        { value: 'fri', label: 'Friday' },
                        { value: 'sat', label: 'Saturday' }
                    ]}
                    icon={Calendar}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.SELECTION_ALIGNMENT}
                    value={String(currentProps.selectionAlignment || 'center')}
                    onChange={(value) => updateProp('selectionAlignment', value)}
                    options={[
                        { value: 'start', label: 'Start' },
                        { value: 'center', label: 'Center' },
                        { value: 'end', label: 'End' }
                    ]}
                    icon={Calendar}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.VISIBLE_DURATION}
                    value={String(currentProps.visibleDuration || '')}
                    onChange={(value) => updateProp('visibleDuration', value || undefined)}
                    placeholder="e.g., {months: 1}"
                />
            </PropertySection>

            {/* Accessibility Section */}
            <PropertySection title="Accessibility">

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Calendar label for screen readers"
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
            </PropertySection>
        </>
    );
});
