import { Calendar, Tag, PointerOff, PenOff, AlertTriangle } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';

export function CalendarEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
                placeholder="calendar_1"
            />

            <fieldset className="properties-aria">
                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value)}
                    icon={Tag}
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
                    label={PROPERTY_LABELS.AUTO_FOCUS}
                    isSelected={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.INVALID}
                    isSelected={Boolean(currentProps.isInvalid)}
                    onChange={(checked) => updateProp('isInvalid', checked)}
                    icon={AlertTriangle}
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

                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_FOCUSED_VALUE}
                    value={String(currentProps.defaultFocusedValue || '')}
                    onChange={(value) => updateProp('defaultFocusedValue', value)}
                    placeholder="YYYY-MM-DD"
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>{PROPERTY_LABELS.DISPLAY_SETTINGS}</legend>

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
                    onChange={(value) => updateProp('visibleDuration', value)}
                    placeholder="e.g., {months: 1}"
                />
            </fieldset>
        </div>
    );
}
