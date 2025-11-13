import {
    Tag, Hash, CheckSquare, AlertTriangle, PointerOff, PenOff, FileText,
    SpellCheck2, ArrowUp, ArrowDown, Move, Focus, Type, DollarSign, MousePointerClick, Globe, Hash as HashIcon
} from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId, PropertySelect , PropertySection} from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
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
        <>
      {/* Basic */}
      <PropertySection title="Basic">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="numberfield_1"
            />
      </PropertySection>

      {/* Content Section */}
            <PropertySection title="Content">

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
            </PropertySection>

            {/* Internationalization Section */}
            <PropertySection title="Internationalization">

                <PropertyInput
                    label="Locale"
                    value={String(currentProps.locale || '')}
                    onChange={(value) => updateProp('locale', value || undefined)}
                    placeholder="ko-KR, en-US, etc."
                    icon={Globe}
                />

                <PropertySelect
                    label="Format Style"
                    value={String(currentProps.formatStyle || 'decimal')}
                    onChange={(value) => updateProp('formatStyle', value)}
                    options={[
                        { value: 'decimal', label: 'Decimal' },
                        { value: 'currency', label: 'Currency' },
                        { value: 'percent', label: 'Percent' },
                        { value: 'unit', label: 'Unit' }
                    ]}
                    icon={DollarSign}
                />

                {currentProps.formatStyle === 'currency' && (
                    <PropertySelect
                        label="Currency"
                        value={String(currentProps.currency || 'KRW')}
                        onChange={(value) => updateProp('currency', value)}
                        options={[
                            { value: 'KRW', label: 'KRW (₩)' },
                            { value: 'USD', label: 'USD ($)' },
                            { value: 'EUR', label: 'EUR (€)' },
                            { value: 'GBP', label: 'GBP (£)' },
                            { value: 'JPY', label: 'JPY (¥)' },
                            { value: 'CNY', label: 'CNY (¥)' },
                            { value: 'AUD', label: 'AUD ($)' },
                            { value: 'CAD', label: 'CAD ($)' }
                        ]}
                        icon={DollarSign}
                    />
                )}

                {currentProps.formatStyle === 'unit' && (
                    <PropertyInput
                        label="Unit"
                        value={String(currentProps.unit || '')}
                        onChange={(value) => updateProp('unit', value || undefined)}
                        icon={Type}
                        placeholder="kilometer, celsius, megabyte, etc."
                    />
                )}

                <PropertySelect
                    label="Notation"
                    value={String(currentProps.notation || 'standard')}
                    onChange={(value) => updateProp('notation', value)}
                    options={[
                        { value: 'standard', label: 'Standard' },
                        { value: 'compact', label: 'Compact (1.2K, 1.5M)' },
                        { value: 'scientific', label: 'Scientific' },
                        { value: 'engineering', label: 'Engineering' }
                    ]}
                    icon={HashIcon}
                />

                <PropertyInput
                    label="Decimals"
                    value={String(currentProps.decimals ?? '')}
                    onChange={(value) => updateProp('decimals', value ? Number(value) : undefined)}
                    icon={Hash}
                    placeholder="2"
                />

                <PropertySwitch
                    label="Show Group Separator"
                    isSelected={currentProps.showGroupSeparator !== false}
                    onChange={(checked) => updateProp('showGroupSeparator', checked)}
                    icon={Hash}
                />
            </PropertySection>

            {/* Number Format Section (Legacy formatOptions) */}
            <PropertySection title="Advanced Format Options">

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
            </PropertySection>

            {/* Validation Section */}
            <PropertySection title="Validation">

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
            </PropertySection>

            {/* Behavior Section */}
            <PropertySection title="Behavior">

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
            </PropertySection>

            {/* Form Integration Section */}
            <PropertySection title="Form Integration">

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
            </PropertySection>

            {/* Accessibility Section */}
            <PropertySection title="Accessibility">

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
            </PropertySection>
        </>
    );
}
