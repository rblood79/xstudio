import { CalendarDays, Tag, PointerOff, PenOff, CheckSquare, AlertTriangle, Clock, Globe } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';

export function DatePickerEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
        // Update customId in store (not in props)
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
                placeholder="datepicker_1"
            />

            <fieldset className="properties-aria">
                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value)}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.PLACEHOLDER}
                    value={String(currentProps.placeholderValue || '')}
                    onChange={(value) => updateProp('placeholderValue', value)}
                    placeholder="YYYY-MM-DD"
                />

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

                <PropertySwitch
                    label={PROPERTY_LABELS.AUTO_FOCUS}
                    isSelected={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>{PROPERTY_LABELS.DATE_RANGE}</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.MIN_VALUE}
                    value={String(currentProps.minValue || '')}
                    onChange={(value) => updateProp('minValue', value)}
                    placeholder="YYYY-MM-DD"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.MAX_VALUE}
                    value={String(currentProps.maxValue || '')}
                    onChange={(value) => updateProp('maxValue', value)}
                    placeholder="YYYY-MM-DD"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_VALUE}
                    value={String(currentProps.defaultValue || '')}
                    onChange={(value) => updateProp('defaultValue', value)}
                    placeholder="YYYY-MM-DD"
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>{PROPERTY_LABELS.TIME_SETTINGS}</legend>

                <PropertySelect
                    label={PROPERTY_LABELS.GRANULARITY}
                    value={String(currentProps.granularity || '')}
                    onChange={(value) => updateProp('granularity', value)}
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
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>{PROPERTY_LABELS.CALENDAR_SETTINGS}</legend>

                <PropertySelect
                    label={PROPERTY_LABELS.PAGE_BEHAVIOR}
                    value={String(currentProps.pageBehavior || 'visible')}
                    onChange={(value) => updateProp('pageBehavior', value)}
                    options={[
                        { value: 'visible', label: 'Visible' },
                        { value: 'single', label: 'Single' }
                    ]}
                    icon={CalendarDays}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.FIRST_DAY_OF_WEEK}
                    value={String(currentProps.firstDayOfWeek || '')}
                    onChange={(value) => updateProp('firstDayOfWeek', value)}
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
                    icon={CalendarDays}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.SHOULD_CLOSE_ON_SELECT}
                    isSelected={currentProps.shouldCloseOnSelect !== false}
                    onChange={(checked) => updateProp('shouldCloseOnSelect', checked)}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>{PROPERTY_LABELS.FORM_INTEGRATION}</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.NAME}
                    value={String(currentProps.name || '')}
                    onChange={(value) => updateProp('name', value)}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.FORM}
                    value={String(currentProps.form || '')}
                    onChange={(value) => updateProp('form', value)}
                    placeholder="Form ID"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.AUTOCOMPLETE}
                    value={String(currentProps.autoComplete || '')}
                    onChange={(value) => updateProp('autoComplete', value)}
                    placeholder="bday"
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
            </fieldset>
        </div>
    );
}
