import React from 'react';
import { PropertyInput } from '../components/PropertyInput';
import { PropertyCheckbox } from '../components/PropertyCheckbox';
import { useStore } from '../../../stores/elements';

interface SelectItemEditorProps {
    elementId: string;
}

export function SelectItemEditor({ elementId }: SelectItemEditorProps) {
    const element = useStore((state) =>
        state.elements.find((el) => el.id === elementId)
    );
    const { updateElementProps } = useStore();

    if (!element) {
        return <div>요소를 찾을 수 없습니다.</div>;
    }

    const handlePropertyChange = (key: string, value: unknown) => {
        const updatedProps = {
            ...element.props,
            [key]: value
        };
        updateElementProps(elementId, updatedProps as any);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Select Item</h3>

            <PropertyInput
                label="라벨"
                value={String(element.props.label || '')}
                onChange={(value) => handlePropertyChange('label', value)}
            />

            <PropertyInput
                label="값"
                value={String(element.props.value || '')}
                onChange={(value) => handlePropertyChange('value', value)}
            />

            <PropertyInput
                label="설명"
                value={String(element.props.description || '')}
                onChange={(value) => handlePropertyChange('description', value)}
            />

            <PropertyCheckbox
                label="비활성화"
                checked={Boolean(element.props.isDisabled)}
                onChange={(checked) => handlePropertyChange('isDisabled', checked)}
            />

            <PropertyCheckbox
                label="읽기 전용"
                checked={Boolean(element.props.isReadOnly)}
                onChange={(checked) => handlePropertyChange('isReadOnly', checked)}
            />
        </div>
    );
}
