import { Type, Binary, TriangleRight, Layout, ToggleLeft } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';

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
            {/* 라벨 설정 */}
            <PropertyInput
                label="라벨"
                value={String(currentProps.label || '')}
                onChange={(value) => updateProp('label', value)}
                icon={Type}
            />

            {/* 기본값 설정 */}
            <PropertyInput
                label="기본값"
                value={String(currentProps.value || '')}
                onChange={(value) => updateNumberProp('value', value)}
                type="number"
                icon={Binary}
            />

            {/* 최소값 설정 */}
            <PropertyInput
                label="최소값"
                value={String(currentProps.minValue || '0')}
                onChange={(value) => updateNumberProp('minValue', value, 0)}
                type="number"
                icon={Binary}
            />

            {/* 최대값 설정 */}
            <PropertyInput
                label="최대값"
                value={String(currentProps.maxValue || '100')}
                onChange={(value) => updateNumberProp('maxValue', value, 100)}
                type="number"
                icon={Binary}
            />

            {/* 단계 설정 */}
            <PropertyInput
                label="단계"
                value={String(currentProps.step || '1')}
                onChange={(value) => updateNumberProp('step', value, 1)}
                type="number"
                icon={TriangleRight}
            />

            {/* 방향 설정 */}
            <PropertySelect
                label="방향"
                value={String(currentProps.orientation || 'horizontal')}
                onChange={(value) => updateProp('orientation', value)}
                options={[
                    { id: 'horizontal', label: 'Horizontal' },
                    { id: 'vertical', label: 'Vertical' }
                ]}
                icon={Layout}
            />

            {/* 비활성화 설정 */}
            <PropertyCheckbox
                label="비활성화"
                checked={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
                icon={ToggleLeft}
            />
        </div>
    );
}
