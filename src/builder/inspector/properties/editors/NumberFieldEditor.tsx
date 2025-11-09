import {
    Tag, Hash, CheckSquare, AlertTriangle, PointerOff, PenOff, FileText,
    SpellCheck2, ArrowUp, ArrowDown, Move, Focus, Type, DollarSign, Percent, MousePointerClick
} from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId, PropertySelect } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';

export function NumberFieldEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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

    // formatOptions 업데이트 헬퍼
    const updateFormatOption = (key: string, value: unknown) => {
        const currentFormatOptions = currentProps.formatOptions || {};
        const updatedFormatOptions = {
            ...currentFormatOptions,
            [key]: value
        };
        updateProp('formatOptions', updatedFormatOptions);
    };

    const formatOptions = currentProps.formatOptions || {};

    return (
        <div className="component-props">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="numberfield_1"
            />

            {/* Content Section */}
            <fieldset className="properties-group">
                <legend>Content</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value)}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.VALUE}
                    value={String(currentProps.value || '')}
                    onChange={(value) => updateProp('value', value ? Number(value) : undefined)}
                    icon={Hash}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.PLACEHOLDER}
                    value={String(currentProps.placeholder || '')}
                    onChange={(value) => updateProp('placeholder', value)}
                    icon={SpellCheck2}
                    placeholder="Enter number..."
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DESCRIPTION}
                    value={String(currentProps.description || '')}
                    onChange={(value) => updateProp('description', value)}
                    icon={FileText}
                />
            </fieldset>

            {/* Number Format Section */}
            <fieldset className="properties-group">
                <legend>Number Format</legend>

                <PropertySelect
                    label={PROPERTY_LABELS.NUMBER_FORMAT_STYLE}
                    value={String(formatOptions.style || 'decimal')}
                    onChange={(value) => updateFormatOption('style', value)}
                    options={[
                        { value: 'decimal', label: PROPERTY_LABELS.NUMBER_STYLE_DECIMAL },
                        { value: 'currency', label: PROPERTY_LABELS.NUMBER_STYLE_CURRENCY },
                        { value: 'percent', label: PROPERTY_LABELS.NUMBER_STYLE_PERCENT },
                        { value: 'unit', label: PROPERTY_LABELS.NUMBER_STYLE_UNIT }
                    ]}
                    icon={DollarSign}
                />

                {formatOptions.style === 'currency' && (
                    <PropertySelect
                        label={PROPERTY_LABELS.CURRENCY}
                        value={String(formatOptions.currency || 'USD')}
                        onChange={(value) => updateFormatOption('currency', value)}
                        options={[
                            { value: 'USD', label: 'USD ($)' },
                            { value: 'EUR', label: 'EUR (€)' },
                            { value: 'GBP', label: 'GBP (£)' },
                            { value: 'JPY', label: 'JPY (¥)' },
                            { value: 'KRW', label: 'KRW (₩)' },
                            { value: 'CNY', label: 'CNY (¥)' }
                        ]}
                        icon={DollarSign}
                    />
                )}

                {formatOptions.style === 'unit' && (
                    <PropertyInput
                        label={PROPERTY_LABELS.UNIT}
                        value={String(formatOptions.unit || '')}
                        onChange={(value) => updateFormatOption('unit', value || undefined)}
                        icon={Type}
                        placeholder="meter, kilogram, etc."
                    />
                )}

                <PropertyInput
                    label={PROPERTY_LABELS.MIN_FRACTION_DIGITS}
                    value={String(formatOptions.minimumFractionDigits ?? '')}
                    onChange={(value) => updateFormatOption('minimumFractionDigits', value ? Number(value) : undefined)}
                    icon={Hash}
                    placeholder="0"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.MAX_FRACTION_DIGITS}
                    value={String(formatOptions.maximumFractionDigits ?? '')}
                    onChange={(value) => updateFormatOption('maximumFractionDigits', value ? Number(value) : undefined)}
                    icon={Hash}
                    placeholder="3"
                />
            </fieldset>

            {/* Validation Section */}
            <fieldset className="properties-group">
                <legend>Validation</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.ERROR_MESSAGE}
                    value={String(currentProps.errorMessage || '')}
                    onChange={(value) => updateProp('errorMessage', value)}
                    icon={AlertTriangle}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.MIN_VALUE}
                    value={String(currentProps.minValue ?? '')}
                    onChange={(value) => updateProp('minValue', value ? Number(value) : undefined)}
                    icon={ArrowDown}
                    placeholder="Minimum value"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.MAX_VALUE}
                    value={String(currentProps.maxValue ?? '')}
                    onChange={(value) => updateProp('maxValue', value ? Number(value) : undefined)}
                    icon={ArrowUp}
                    placeholder="Maximum value"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.STEP}
                    value={String(currentProps.step ?? '')}
                    onChange={(value) => updateProp('step', value ? Number(value) : undefined)}
                    icon={Move}
                    placeholder="1"
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.REQUIRED}
                    isSelected={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
                    icon={CheckSquare}
                />
            </fieldset>

            {/* Behavior Section */}
            <fieldset className="properties-group">
                <legend>Behavior</legend>

                <PropertySwitch
                    label={PROPERTY_LABELS.AUTO_FOCUS}
                    isSelected={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                    icon={Focus}
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
                    label={PROPERTY_LABELS.WHEEL_DISABLED}
                    isSelected={Boolean(currentProps.isWheelDisabled)}
                    onChange={(checked) => updateProp('isWheelDisabled', checked)}
                    icon={MousePointerClick}
                />
            </fieldset>

            {/* Form Integration Section */}
            <fieldset className="properties-group">
                <legend>Form Integration</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.NAME}
                    value={String(currentProps.name || '')}
                    onChange={(value) => updateProp('name', value || undefined)}
                    icon={Tag}
                    placeholder="field-name"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.FORM}
                    value={String(currentProps.form || '')}
                    onChange={(value) => updateProp('form', value || undefined)}
                    icon={FileText}
                    placeholder="form-id"
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
                    placeholder="Number field label for screen readers"
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

                <PropertyInput
                    label={PROPERTY_LABELS.INCREMENT_ARIA_LABEL}
                    value={String(currentProps.incrementAriaLabel || '')}
                    onChange={(value) => updateProp('incrementAriaLabel', value || undefined)}
                    icon={ArrowUp}
                    placeholder="Increment"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DECREMENT_ARIA_LABEL}
                    value={String(currentProps.decrementAriaLabel || '')}
                    onChange={(value) => updateProp('decrementAriaLabel', value || undefined)}
                    icon={ArrowDown}
                    placeholder="Decrement"
                />
            </fieldset>
        </div>
    );
}
