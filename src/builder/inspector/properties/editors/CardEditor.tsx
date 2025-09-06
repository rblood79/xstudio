
import { Type, FileText, Layout, Eye, EyeOff, PointerOff, Focus } from 'lucide-react';
import { PropertyInput, PropertyCheckbox, PropertySelect } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';

export function CardEditor({ currentProps, onUpdate }: PropertyEditorProps) {
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
                label="제목"
                value={String(currentProps.title || '')}
                onChange={(value) => updateProp('title', value)}
                icon={Type}
            />

            <PropertyInput
                label="설명"
                value={String(currentProps.description || '')}
                onChange={(value) => updateProp('description', value)}
                icon={FileText}
            />

            <PropertySelect
                label="변형"
                value={String(currentProps.variant || 'default')}
                onChange={(value) => updateProp('variant', value)}
                options={[
                    { id: 'default', label: '기본' },
                    { id: 'elevated', label: '들림' },
                    { id: 'outlined', label: '테두리' }
                ]}
                icon={Layout}
            />

            <PropertySelect
                label="크기"
                value={String(currentProps.size || 'medium')}
                onChange={(value) => updateProp('size', value)}
                options={[
                    { id: 'small', label: '작음' },
                    { id: 'medium', label: '보통' },
                    { id: 'large', label: '큼' }
                ]}
            />

            <PropertyCheckbox
                label="조용한 모드"
                checked={Boolean(currentProps.isQuiet)}
                onChange={(checked) => updateProp('isQuiet', checked)}
                icon={EyeOff}
            />

            <PropertyCheckbox
                label="선택됨"
                checked={Boolean(currentProps.isSelected)}
                onChange={(checked) => updateProp('isSelected', checked)}
                icon={Eye}
            />

            <PropertyCheckbox
                label="비활성화"
                checked={Boolean(currentProps.isDisabled)}
                onChange={(checked) => updateProp('isDisabled', checked)}
                icon={PointerOff}
            />

            <PropertyCheckbox
                label="포커스됨"
                checked={Boolean(currentProps.isFocused)}
                onChange={(checked) => updateProp('isFocused', checked)}
                icon={Focus}
            />
        </div>
    );
}
