import React from 'react';
import { useStore } from '../../stores';
import { supabase } from '../../../env/supabase.client';
import {
    ButtonEditor,
    TextFieldEditor,
    SelectEditor,
    ComboBoxEditor,
    ComboBoxItemEditor,
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
    TableEditor,
    CardEditor,
    TagGroupEditor, // TagGroupEditor 추가
    TagEditor // TagEditor 추가
} from './editors';
import { PropertyEditorProps } from './types/editorTypes';
// ElementProps import 제거

// 컴포넌트별 에디터 매핑
const COMPONENT_EDITORS: Record<string, React.ComponentType<PropertyEditorProps>> = {
    Button: ButtonEditor,
    TextField: TextFieldEditor,
    Select: SelectEditor,
    Checkbox: CheckboxEditor,
    Radio: RadioEditor,
    RadioGroup: RadioGroupEditor,
    ListBox: ListBoxEditor,
    ListBoxItem: ListBoxItemEditor,
    GridList: GridListEditor,
    GridListItem: GridListItemEditor,
    SelectItem: SelectItemEditor,
    ComboBoxItem: ComboBoxItemEditor,
    Tabs: TabsEditor,
    Tab: TabEditor,
    Panel: PanelEditor,
    Slider: SliderEditor,
    Switch: SwitchEditor,
    Table: TableEditor,
    Card: CardEditor,
    TagGroup: TagGroupEditor, // TagGroup 매핑 추가
    Tag: TagEditor, // Tag 매핑 추가

    // 추가로 지원할 컴포넌트들
    ComboBox: ComboBoxEditor,
    CheckboxGroup: CheckboxGroupEditor,
    ToggleButton: ToggleButtonEditor,
    ToggleButtonGroup: ToggleButtonGroupEditor,

    // 기본 HTML 요소들
    div: () => <div>div 요소에는 특별한 속성이 없습니다.</div>,
    span: () => <div>span 요소에는 특별한 속성이 없습니다.</div>,
    p: () => <div>p 요소에는 특별한 속성이 없습니다.</div>,
    h1: () => <div>h1 요소에는 특별한 속성이 없습니다.</div>,
    h2: () => <div>h2 요소에는 특별한 속성이 없습니다.</div>,
    h3: () => <div>h3 요소에는 특별한 속성이 없습니다.</div>,
    h4: () => <div>h4 요소에는 특별한 속성이 없습니다.</div>,
    h5: () => <div>h5 요소에는 특별한 속성이 없습니다.</div>,
    h6: () => <div>h6 요소에는 특별한 속성이 없습니다.</div>,
    img: () => <div>img 요소에는 특별한 속성이 없습니다.</div>,
    a: () => <div>a 요소에는 특별한 속성이 없습니다.</div>,
    ul: () => <div>ul 요소에는 특별한 속성이 없습니다.</div>,
    ol: () => <div>ol 요소에는 특별한 속성이 없습니다.</div>,
    li: () => <div>li 요소에는 특별한 속성이 없습니다.</div>,
    table: () => <div>table 요소에는 특별한 속성이 없습니다.</div>,
    tr: () => <div>tr 요소에는 특별한 속성이 없습니다.</div>,
    td: () => <div>td 요소에는 특별한 속성이 없습니다.</div>,
    th: () => <div>th 요소에는 특별한 속성이 없습니다.</div>,
    form: () => <div>form 요소에는 특별한 속성이 없습니다.</div>,
    input: () => <div>input 요소에는 특별한 속성이 없습니다.</div>,
    textarea: () => <div>textarea 요소에는 특별한 속성이 없습니다.</div>,
    select: () => <div>select 요소에는 특별한 속성이 없습니다.</div>,
    option: () => <div>option 요소에는 특별한 속성이 없습니다.</div>,
    label: () => <div>label 요소에는 특별한 속성이 없습니다.</div>,
    fieldset: () => <div>fieldset 요소에는 특별한 속성이 없습니다.</div>,
    legend: () => <div>legend 요소에는 특별한 속성이 없습니다.</div>,
    button: () => <div>button 요소에는 특별한 속성이 없습니다.</div>,
    nav: () => <div>nav 요소에는 특별한 속성이 없습니다.</div>,
    header: () => <div>header 요소에는 특별한 속성이 없습니다.</div>,
    footer: () => <div>footer 요소에는 특별한 속성이 없습니다.</div>,
    main: () => <div>main 요소에는 특별한 속성이 없습니다.</div>,
    section: () => <div>section 요소에는 특별한 속성이 없습니다.</div>,
    article: () => <div>article 요소에는 특별한 속성이 없습니다.</div>,
    aside: () => <div>aside 요소에는 특별한 속성이 없습니다.</div>,
    figure: () => <div>figure 요소에는 특별한 속성이 없습니다.</div>,
    figcaption: () => <div>figcaption 요소에는 특별한 속성이 없습니다.</div>,
    time: () => <div>time 요소에는 특별한 속성이 없습니다.</div>,
    mark: () => <div>mark 요소에는 특별한 속성이 없습니다.</div>,
    small: () => <div>small 요소에는 특별한 속성이 없습니다.</div>,
    strong: () => <div>strong 요소에는 특별한 속성이 없습니다.</div>,
    em: () => <div>em 요소에는 특별한 속성이 없습니다.</div>,
    code: () => <div>code 요소에는 특별한 속성이 없습니다.</div>,
    pre: () => <div>pre 요소에는 특별한 속성이 없습니다.</div>,
    blockquote: () => <div>blockquote 요소에는 특별한 속성이 없습니다.</div>,
    cite: () => <div>cite 요소에는 특별한 속성이 없습니다.</div>,
    q: () => <div>q 요소에는 특별한 속성이 없습니다.</div>,
    abbr: () => <div>abbr 요소에는 특별한 속성이 없습니다.</div>,
    address: () => <div>address 요소에는 특별한 속성이 없습니다.</div>,
    del: () => <div>del 요소에는 특별한 속성이 없습니다.</div>,
    ins: () => <div>ins 요소에는 특별한 속성이 없습니다.</div>,
    sub: () => <div>sub 요소에는 특별한 속성이 없습니다.</div>,
    sup: () => <div>sup 요소에는 특별한 속성이 없습니다.</div>,
    b: () => <div>b 요소에는 특별한 속성이 없습니다.</div>,
    i: () => <div>i 요소에는 특별한 속성이 없습니다.</div>,
    u: () => <div>u 요소에는 특별한 속성이 없습니다.</div>,
    s: () => <div>s 요소에는 특별한 속성이 없습니다.</div>,
    strike: () => <div>strike 요소에는 특별한 속성이 없습니다.</div>,
    tt: () => <div>tt 요소에는 특별한 속성이 없습니다.</div>,
    big: () => <div>big 요소에는 특별한 속성이 없습니다.</div>,
    center: () => <div>center 요소에는 특별한 속성이 없습니다.</div>,
    font: () => <div>font 요소에는 특별한 속성이 없습니다.</div>,
    basefont: () => <div>basefont 요소에는 특별한 속성이 없습니다.</div>,
    applet: () => <div>applet 요소에는 특별한 속성이 없습니다.</div>,
    object: () => <div>object 요소에는 특별한 속성이 없습니다.</div>,
    embed: () => <div>embed 요소에는 특별한 속성이 없습니다.</div>,
    param: () => <div>param 요소에는 특별한 속성이 없습니다.</div>,
    iframe: () => <div>iframe 요소에는 특별한 속성이 없습니다.</div>,
    frameset: () => <div>frameset 요소에는 특별한 속성이 없습니다.</div>,
    frame: () => <div>frame 요소에는 특별한 속성이 없습니다.</div>,
    noframes: () => <div>noframes 요소에는 특별한 속성이 없습니다.</div>,
    noscript: () => <div>noscript 요소에는 특별한 속성이 없습니다.</div>,
    script: () => <div>script 요소에는 특별한 속성이 없습니다.</div>,
    style: () => <div>style 요소에는 특별한 속성이 없습니다.</div>,
    link: () => <div>link 요소에는 특별한 속성이 없습니다.</div>,
    meta: () => <div>meta 요소에는 특별한 속성이 없습니다.</div>,
    title: () => <div>title 요소에는 특별한 속성이 없습니다.</div>,
    head: () => <div>head 요소에는 특별한 속성이 없습니다.</div>,
    body: () => <div>body 요소에는 특별한 속성이 없습니다.</div>,
    html: () => <div>html 요소에는 특별한 속성이 없습니다.</div>,
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
            <div className="property-container">
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
        <div className="property-container">
            <div className="panel-header">
                <h3 className="panel-title">{componentTag}</h3>
            </div>
            <div className="panel-content">
                <EditorComponent
                    key={selectedElementId} // 이 줄을 추가
                    elementId={selectedElementId}
                    currentProps={selectedElementProps}
                    onUpdate={handleUpdate}
                />
            </div>
        </div>
    );
}
