import { memo, useMemo } from "react";
import {
    Type, Layout, NotebookTabs, Ruler, Ratio,
    ArrowDown, ArrowUp, Move, Hash, FileText, Tag, PointerOff, Globe, DollarSign
} from 'lucide-react';
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId , PropertySection} from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const SliderEditor = memo(function SliderEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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

    // 숫자 프로퍼티 업데이트 함수
    const updateNumberProp = (key: string, value: string, defaultValue?: number) => {
        const numericValue = value === '' ? undefined : (Number(value) || defaultValue);
        updateProp(key, numericValue);
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
                placeholder="slider_1"
            />
      </PropertySection>

      {/* Content Section */}
            <PropertySection title="Content">

                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value)}
                    icon={Type}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_VALUE}
                    value={String(currentProps.value ?? '')}
                    onChange={(value) => updateNumberProp('value', value)}
                    icon={NotebookTabs}
                    placeholder="0"
                />
            </PropertySection>

            {/* Number Formatting Section */}
            <PropertySection title="Number Formatting">

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
                        { value: 'unit', label: 'Unit' },
                        { value: 'custom', label: 'Custom' }
                    ]}
                    icon={DollarSign}
                />

                {currentProps.valueFormat === 'unit' && (
                    <PropertyInput
                        label="Unit"
                        value={String(currentProps.unit || '')}
                        onChange={(value) => updateProp('unit', value || undefined)}
                        icon={Type}
                        placeholder="kilometer, celsius, meter, etc."
                    />
                )}

                <PropertySwitch
                    label="Show Value"
                    isSelected={currentProps.showValue !== false}
                    onChange={(checked) => updateProp('showValue', checked)}
                    icon={NotebookTabs}
                />
            </PropertySection>

            {/* Design Section */}
            <PropertySection title="Design">

                <PropertySelect
                    label={PROPERTY_LABELS.VARIANT}
                    value={String(currentProps.variant || 'default')}
                    onChange={(value) => updateProp('variant', value)}
                    options={[
                        { value: 'default', label: PROPERTY_LABELS.SLIDER_VARIANT_DEFAULT },
                        { value: 'primary', label: PROPERTY_LABELS.SLIDER_VARIANT_PRIMARY },
                        { value: 'secondary', label: PROPERTY_LABELS.SLIDER_VARIANT_SECONDARY },
                        { value: 'surface', label: PROPERTY_LABELS.SLIDER_VARIANT_SURFACE }
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
                    icon={Ruler}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.ORIENTATION}
                    value={String(currentProps.orientation || 'horizontal')}
                    onChange={(value) => updateProp('orientation', value)}
                    options={[
                        { value: 'horizontal', label: PROPERTY_LABELS.ORIENTATION_HORIZONTAL },
                        { value: 'vertical', label: PROPERTY_LABELS.ORIENTATION_VERTICAL }
                    ]}
                    icon={Ratio}
                />
            </PropertySection>

            {/* Range Section */}
            <PropertySection title="Range">

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

                <PropertyInput
                    label={PROPERTY_LABELS.STEP}
                    value={String(currentProps.step ?? '')}
                    onChange={(value) => updateNumberProp('step', value, 1)}
                    icon={Move}
                    placeholder="1"
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
            </PropertySection>

            {/* Form Integration Section */}
            <PropertySection title="Form Integration">

                <PropertyInput
                    label={PROPERTY_LABELS.NAME}
                    value={String(currentProps.name || '')}
                    onChange={(value) => updateProp('name', value || undefined)}
                    icon={Tag}
                    placeholder="slider-name"
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
                    placeholder="Slider label for screen readers"
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
