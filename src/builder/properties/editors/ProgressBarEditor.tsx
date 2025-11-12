import { Tag, BarChart3, ToggleLeft, Layout, PencilRuler, Hash, Type, ArrowDown, ArrowUp, Globe, DollarSign } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export function ProgressBarEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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

    // 숫자 프로퍼티 업데이트 함수
    const updateNumberProp = (key: string, value: string, defaultValue?: number) => {
        const numericValue = value === '' ? undefined : (Number(value) || defaultValue);
        updateProp(key, numericValue);
    };

    return (
        <div className="component-props">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="progressbar_1"
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
                    value={String(currentProps.value ?? '')}
                    onChange={(value) => updateNumberProp('value', value)}
                    icon={BarChart3}
                    placeholder="50"
                />
            </fieldset>

            {/* Number Formatting Section */}
            <fieldset className="properties-group">
                <legend>Number Formatting</legend>

                <PropertyInput
                    label="Locale"
                    value={String(currentProps.locale || '')}
                    onChange={(value) => updateProp('locale', value || undefined)}
                    placeholder="ko-KR, en-US, etc."
                    icon={Globe}
                />

                <PropertySelect
                    label="Value Format"
                    value={String(currentProps.valueFormat || 'number')}
                    onChange={(value) => updateProp('valueFormat', value)}
                    options={[
                        { value: 'number', label: 'Number' },
                        { value: 'percent', label: 'Percent' },
                        { value: 'custom', label: 'Custom' }
                    ]}
                    icon={DollarSign}
                />

                <PropertySwitch
                    label="Show Value"
                    isSelected={currentProps.showValue !== false}
                    onChange={(checked) => updateProp('showValue', checked)}
                    icon={BarChart3}
                />
            </fieldset>

            {/* Design Section */}
            <fieldset className="properties-design">
                <legend>Design</legend>

                <PropertySelect
                    label={PROPERTY_LABELS.VARIANT}
                    value={String(currentProps.variant || 'default')}
                    onChange={(value) => updateProp('variant', value)}
                    options={[
                        { value: 'default', label: PROPERTY_LABELS.PROGRESSBAR_VARIANT_DEFAULT },
                        { value: 'primary', label: PROPERTY_LABELS.PROGRESSBAR_VARIANT_PRIMARY },
                        { value: 'secondary', label: PROPERTY_LABELS.PROGRESSBAR_VARIANT_SECONDARY },
                        { value: 'surface', label: PROPERTY_LABELS.PROGRESSBAR_VARIANT_SURFACE }
                    ]}
                    icon={Layout}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.SIZE}
                    value={String(currentProps.size || 'md')}
                    onChange={(value) => updateProp('size', value)}
                    options={[
                        { value: 'sm', label: PROPERTY_LABELS.SIZE_SM },
                        { value: 'md', label: PROPERTY_LABELS.SIZE_MD },
                        { value: 'lg', label: PROPERTY_LABELS.SIZE_LG }
                    ]}
                    icon={PencilRuler}
                />
            </fieldset>

            {/* Range Section */}
            <fieldset className="properties-group">
                <legend>Range</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.MIN_VALUE}
                    value={String(currentProps.minValue ?? '')}
                    onChange={(value) => updateNumberProp('minValue', value, 0)}
                    icon={ArrowDown}
                    placeholder="0"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.MAX_VALUE}
                    value={String(currentProps.maxValue ?? '')}
                    onChange={(value) => updateNumberProp('maxValue', value, 100)}
                    icon={ArrowUp}
                    placeholder="100"
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.INDETERMINATE}
                    isSelected={Boolean(currentProps.isIndeterminate)}
                    onChange={(checked) => updateProp('isIndeterminate', checked)}
                    icon={ToggleLeft}
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
                    placeholder="Progress indicator for screen readers"
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
