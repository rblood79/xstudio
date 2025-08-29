import React from 'react';
import { useStore } from '../../stores/elements';
import { supabase } from '../../../env/supabase.client';
import {
    ButtonEditor,
    TextFieldEditor,
    SelectEditor,
    CheckboxEditor,
    RadioGroupEditor,
    ListBoxEditor,
    TabsEditor,
    PanelEditor,
    SliderEditor
} from './editors';
import { PropertyEditorProps } from './types/editorTypes';
// ElementProps import 제거

// 컴포넌트별 에디터 매핑
const COMPONENT_EDITORS: Record<string, React.ComponentType<PropertyEditorProps>> = {
    Button: ButtonEditor,
    TextField: TextFieldEditor,
    Select: SelectEditor,
    Checkbox: CheckboxEditor,
    RadioGroup: RadioGroupEditor,
    ListBox: ListBoxEditor,
    Tabs: TabsEditor,
    Panel: PanelEditor,
    Slider: SliderEditor,

    // 추가로 지원할 컴포넌트들
    ComboBox: SelectEditor, // Select와 유사한 props
    CheckboxGroup: RadioGroupEditor, // RadioGroup과 유사한 props
    GridList: ListBoxEditor, // ListBox와 유사한 props
    ToggleButton: ButtonEditor, // Button과 유사한 props
    ToggleButtonGroup: RadioGroupEditor, // RadioGroup과 유사한 props

    // 기본 HTML 요소들
    div: () => <div>div 요소에는 특별한 속성이 없습니다.</div>,
    span: () => <div>span 요소에는 특별한 속성이 없습니다.</div>,
    p: () => <div>p 요소에는 특별한 속성이 없습니다.</div>,
    h1: () => <div>h1 요소에는 특별한 속성이 없습니다.</div>,
    h2: () => <div>h2 요소에는 특별한 속성이 없습니다.</div>,
    h3: () => <div>h3 요소에는 특별한 속성이 없습니다.</div>,
};

export function PropertyPanel() {
    const { selectedElementId, selectedElementProps, updateElementProps } = useStore();

    if (!selectedElementId) {
        return <div>요소를 선택해주세요</div>;
    }

    const handleUpdate = async (updatedProps: Record<string, unknown>) => {
        // Store 업데이트 - 타입 단언으로 처리
        updateElementProps(selectedElementId, updatedProps as Record<string, string | number | boolean | undefined>);

        // Supabase 업데이트
        try {
            await supabase
                .from('elements')
                .update({ props: updatedProps })
                .eq('id', selectedElementId);
        } catch (err) {
            console.error('Update error:', err);
        }
    };

    const componentTag = selectedElementProps?.tag;
    const EditorComponent = componentTag ? COMPONENT_EDITORS[componentTag] : undefined;

    if (!EditorComponent || !componentTag) {
        return (
            <div className="property-panel">
                <div>지원되지 않는 컴포넌트입니다: {componentTag || 'unknown'}</div>
                <div>현재 지원되는 컴포넌트:</div>
                <ul>
                    {Object.keys(COMPONENT_EDITORS).map(tag => (
                        <li key={tag}>{tag}</li>
                    ))}
                </ul>
            </div>
        );
    }

    return (
        <div className="property-panel">
            <h4>Properties: {componentTag}</h4>
            <EditorComponent
                elementId={selectedElementId}
                currentProps={selectedElementProps}
                onUpdate={handleUpdate}
            />
        </div>
    );
}
