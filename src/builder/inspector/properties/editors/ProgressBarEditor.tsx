import { Tag, Binary, BarChart3, ToggleLeft, Layout, PencilRuler } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/labels';
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
    const updateNumberProp = (key: string, value: string, defaultValue: number = 0) => {
        const numericValue = value === '' ? undefined : Number(value) || defaultValue;
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

            <fieldset className="properties-aria">
                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value)}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.VALUE}
                    value={String(currentProps.value ?? '')}
                    onChange={(value) => updateNumberProp('value', value, 0)}
                    type="number"
                    icon={BarChart3}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.MIN_VALUE}
                    value={String(currentProps.minValue ?? '0')}
                    onChange={(value) => updateNumberProp('minValue', value, 0)}
                    type="number"
                    icon={Binary}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.MAX_VALUE}
                    value={String(currentProps.maxValue ?? '100')}
                    onChange={(value) => updateNumberProp('maxValue', value, 100)}
                    type="number"
                    icon={Binary}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.INDETERMINATE}
                    isSelected={Boolean(currentProps.isIndeterminate)}
                    onChange={(checked) => updateProp('isIndeterminate', checked)}
                    icon={ToggleLeft}
                />

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
        </div>
    );
}
