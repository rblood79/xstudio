import { Type, CircleDot, PointerOff } from 'lucide-react';
import { PropertyInput, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';

export function ListBoxItemEditor({ currentProps, onUpdate }: PropertyEditorProps) {
    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    return (
        <div className="component-props">
            <PropertyInput
                label="라벨"
                value={String(currentProps.label || '')}
                onChange={(value) => updateProp('label', value)}
                icon={Type}
            />

            <PropertyInput
                label="값"
                value={String(currentProps.value || '')}
                onChange={(value) => updateProp('value', value)}
                icon={CircleDot}
            />

            <PropertyCheckbox
                label="비활성화"
                checked={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
                icon={PointerOff}
            />

            <PropertyCheckbox
                label="읽기 전용"
                checked={Boolean(currentProps.isReadOnly)}
                onChange={(checked) => updateProp('isReadOnly', checked)}
            />
        </div>
    );
}
