import { CalendarDays, Tag, PointerOff, PenOff, CheckSquare, AlertTriangle, Globe, Focus, FileText, Type, Hash } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId } from '../../../inspector/components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export function DateRangePickerEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                placeholder="daterangepicker_1"
            />

            {/* Content Section */}
            <fieldset className="properties-group">
                <legend>Content</legend>

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
                    value={String(currentProps.placeholder || '')}
                    onChange={(value) => updateProp('placeholder', value || undefined)}
                    placeholder="Select date range"
                />
            </fieldset>

            {/* State Section */}
            <fieldset className="properties-group">
                <legend>State</legend>

                <PropertyInput
                    label="Timezone"
                    value={String(currentProps.timezone || '')}
                    onChange={(value) => updateProp('timezone', value || undefined)}
                    placeholder="Asia/Seoul, America/New_York"
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
            </fieldset>

            {/* Options Section */}
            <fieldset className="properties-group">
                <legend>Options</legend>

                <PropertySwitch
                    label="Show Week Numbers"
                    isSelected={Boolean(currentProps.showWeekNumbers)}
                    onChange={(checked) => updateProp('showWeekNumbers', checked)}
                    icon={CalendarDays}
                />

                <PropertySwitch
                    label="Highlight Today"
                    isSelected={currentProps.highlightToday !== false}
                    onChange={(checked) => updateProp('highlightToday', checked)}
                    icon={CalendarDays}
                />

                <PropertySwitch
                    label="Allow Clear"
                    isSelected={currentProps.allowClear !== false}
                    onChange={(checked) => updateProp('allowClear', checked)}
                    icon={Type}
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
            </fieldset>

            {/* Accessibility Section */}
            <fieldset className="properties-group">
                <legend>Accessibility</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Date range picker"
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

export default DateRangePickerEditor;
