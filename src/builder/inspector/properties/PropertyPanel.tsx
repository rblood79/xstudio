import React from 'react';
import {
    ButtonEditor,
    TextFieldEditor,
    SelectEditor,
    ComboBoxEditor,
    CheckboxEditor,
    CheckboxGroupEditor,
    RadioEditor,
    RadioGroupEditor,
    ToggleButtonEditor,
    ToggleButtonGroupEditor,
    ListBoxEditor,
    ListBoxItemEditor,
    GridListEditor,
    GridListItemEditor,
    SelectItemEditor,
    TabsEditor,
    TabEditor,
    PanelEditor,
    SliderEditor,
    SwitchEditor,
    TableEditor
} from './editors';
import { PropertyEditorProps } from './types/editorTypes';
import { useSelectedElement, useElementUpdate } from '../shared/hooks';
import { COMPONENT_CATEGORIES } from '../shared/constants';

// Component editor registry for better organization
const COMPONENT_EDITORS: Record<string, React.ComponentType<PropertyEditorProps>> = {
    // Form components
    Button: ButtonEditor,
    TextField: TextFieldEditor,
    Select: SelectEditor,
    Checkbox: CheckboxEditor,
    Radio: RadioEditor,
    RadioGroup: RadioGroupEditor,
    ComboBox: ComboBoxEditor,
    CheckboxGroup: CheckboxGroupEditor,
    
    // Interactive components
    ToggleButton: ToggleButtonEditor,
    ToggleButtonGroup: ToggleButtonGroupEditor,
    Tabs: TabsEditor,
    Tab: TabEditor,
    Panel: PanelEditor,
    
    // Data components
    ListBox: ListBoxEditor,
    ListBoxItem: ListBoxItemEditor,
    GridList: GridListEditor,
    GridListItem: GridListItemEditor,
    SelectItem: SelectItemEditor,
    Table: TableEditor,
    
    // Input components
    Slider: SliderEditor,
    Switch: SwitchEditor,

    // Basic HTML elements - using a generic message for unsupported elements
    ...Object.fromEntries(
        COMPONENT_CATEGORIES.LAYOUT.map(tag => [
            tag, 
            () => <div className="empty-state">
                <p>{tag} 요소에는 특별한 속성이 없습니다.</p>
            </div>
        ])
    )
};

function UnsupportedComponent({ componentTag }: { componentTag?: string }) {
    return (
        <div className="property-container">
            <div className="empty-state">
                <h4>지원되지 않는 컴포넌트</h4>
                <p>컴포넌트: {componentTag || 'unknown'}</p>
                <details>
                    <summary>지원되는 컴포넌트 목록</summary>
                    <ul style={{ textAlign: 'left', marginTop: '1rem' }}>
                        {Object.keys(COMPONENT_EDITORS).map(tag => (
                            <li key={tag}>{tag}</li>
                        ))}
                    </ul>
                </details>
            </div>
        </div>
    );
}

export function PropertyPanel() {
    const { elementId, elementProps, isSelected } = useSelectedElement();
    const { updateElement } = useElementUpdate();

    if (!isSelected) {
        return (
            <div className="property-container">
                <div className="empty-state">
                    <h4>요소를 선택해주세요</h4>
                    <p>편집할 요소를 먼저 선택하세요.</p>
                </div>
            </div>
        );
    }

    const componentTag = elementProps?.tag;
    const EditorComponent = componentTag ? COMPONENT_EDITORS[componentTag] : undefined;

    if (!EditorComponent || !componentTag) {
        return <UnsupportedComponent componentTag={componentTag} />;
    }

    return (
        <div className="property-container">
            <div className="panel-header">
                <h3 className="panel-title">{componentTag}</h3>
            </div>
            <div className="panel-content">
                <EditorComponent
                    key={elementId}
                    elementId={elementId!}
                    currentProps={elementProps}
                    onUpdate={updateElement}
                />
            </div>
        </div>
    );
}
