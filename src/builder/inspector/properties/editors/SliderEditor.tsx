import { Type, Binary, TriangleRight, Layout, ToggleLeft } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';

export function SliderEditor({ currentProps, onUpdate }: PropertyEditorProps) {
    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    // 숫자 프로퍼티 업데이트 함수
    const updateNumberProp = (key: string, value: string, defaultValue: number = 0) => {
        const numericValue = value === '' ? undefined : Number(value) || defaultValue;
        updateProp(key, numericValue);
    };

    return (
        <div className="component-props">
            <PropertyInput
                label={PROPERTY_LABELS.LABEL}
                value={String(currentProps.label || '')}
                onChange={(value) => updateProp('label', value)}
                icon={Type}
            />

            <PropertyInput
                label={PROPERTY_LABELS.DEFAULT_VALUE}
                value={String(currentProps.value || '')}
                onChange={(value) => updateNumberProp('value', value)}
                type="number"
                icon={Binary}
            />

            <PropertyInput
                label={PROPERTY_LABELS.MIN_VALUE}
                value={String(currentProps.minValue || '0')}
                onChange={(value) => updateNumberProp('minValue', value, 0)}
                type="number"
                icon={Binary}
            />

            <PropertyInput
                label={PROPERTY_LABELS.MAX_VALUE}
                value={String(currentProps.maxValue || '100')}
                onChange={(value) => updateNumberProp('maxValue', value, 100)}
                type="number"
                icon={Binary}
            />

            <PropertyInput
                label={PROPERTY_LABELS.STEP}
                value={String(currentProps.step || '1')}
                onChange={(value) => updateNumberProp('step', value, 1)}
                type="number"
                icon={TriangleRight}
            />

            <PropertySelect
                label={PROPERTY_LABELS.ORIENTATION}
                value={String(currentProps.orientation || 'horizontal')}
                onChange={(value) => updateProp('orientation', value)}
                options={[
                    { id: 'horizontal', label: PROPERTY_LABELS.ORIENTATION_HORIZONTAL },
                    { id: 'vertical', label: PROPERTY_LABELS.ORIENTATION_VERTICAL }
                ]}
                icon={Layout}
            />

            <PropertyCheckbox
                label={PROPERTY_LABELS.DISABLED}
                checked={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
                icon={ToggleLeft}
            />
        </div>
    );
}
