import { Type, Binary, CheckSquare, HelpCircle, AlertTriangle, PointerOff } from 'lucide-react';
import { PropertyInput, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';

export function TextFieldEditor({ currentProps, onUpdate }: PropertyEditorProps) {
    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    return (
        <div className="component-props">
            <fieldset className="properties-aria">


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
                    icon={Binary}
                />

                <PropertyInput
                    label="기본값"
                    value={String(currentProps.defaultValue || '')}
                    onChange={(value) => updateProp('defaultValue', value)}
                />

                <PropertyInput
                    label="플레이스홀더"
                    value={String(currentProps.placeholder || '')}
                    onChange={(value) => updateProp('placeholder', value)}
                />

                <PropertyInput
                    label="설명"
                    value={String(currentProps.description || '')}
                    onChange={(value) => updateProp('description', value)}
                    icon={HelpCircle}
                />

                <PropertyInput
                    label="오류 메시지"
                    value={String(currentProps.errorMessage || '')}
                    onChange={(value) => updateProp('errorMessage', value)}
                    icon={AlertTriangle}
                />

                <PropertyCheckbox
                    label="필수"
                    checked={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
                    icon={CheckSquare}
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
            </fieldset>
        </div>
    );
}