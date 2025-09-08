import { useState, useEffect, useMemo } from 'react';
import { Tag, SquarePlus, PointerOff, AlertTriangle, Hash, FileText, SpellCheck2, Trash, Binary, SquareMousePointer, Menu, SquareX, CheckSquare, PenOff, Focus } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores/elements';

interface SelectedOptionState {
    parentId: string;
    optionId: string;
}

export function ComboBoxEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedOption, setSelectedOption] = useState<SelectedOptionState | null>(null);
    const { addElement, removeElement, elements: storeElements, currentPageId, updateElementProps } = useStore();

    useEffect(() => {
        // 옵션 선택 상태 초기화
        setSelectedOption(null);
    }, [elementId]);

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    // 실제 ComboBoxItem 자식 요소들을 찾기
    const comboBoxItemChildren = useMemo(() => {
        return storeElements
            .filter((child) => child.parent_id === elementId && child.tag === 'ComboBoxItem')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [storeElements, elementId]);

    // 선택된 옵션이 있고, 현재 ComboBox 컴포넌트의 옵션인 경우 개별 옵션 편집 UI 표시
    if (selectedOption && selectedOption.parentId === elementId) {
        const currentOption = comboBoxItemChildren.find(item => item.id === selectedOption.optionId);
        if (!currentOption) return null;

        return (
            <div className="component-props">
                <fieldset className="properties-aria">
                    {/* 옵션 라벨 편집 */}
                    <PropertyInput
                        label={PROPERTY_LABELS.LABEL}
                        value={String(currentOption.props.label || '')}
                        onChange={(value) => {
                            const updatedProps = {
                                ...currentOption.props,
                                label: value
                            };
                            updateElementProps(currentOption.id, updatedProps);

                            // 부모 ComboBox의 defaultSelectedKey가 현재 옵션의 value와 같다면 업데이트
                            if (currentProps.defaultSelectedKey === currentOption.props.value) {
                                updateProp('defaultSelectedKey', currentOption.props.value);
                            }
                        }}
                        icon={Tag}
                    />

                    {/* 옵션 값 편집 */}
                    <PropertyInput
                        label={PROPERTY_LABELS.VALUE}
                        value={String(currentOption.props.value || '')}
                        onChange={(value) => {
                            const oldValue = currentOption.props.value;
                            const updatedProps = {
                                ...currentOption.props,
                                value: value
                            };
                            updateElementProps(currentOption.id, updatedProps);

                            // 부모 ComboBox의 defaultSelectedKey가 이전 값과 같다면 새 값으로 업데이트
                            if (currentProps.defaultSelectedKey === oldValue) {
                                updateProp('defaultSelectedKey', value);
                            }
                        }}
                        icon={Binary}
                    />

                    {/* 옵션 설명 편집 */}
                    <PropertyInput
                        label={PROPERTY_LABELS.DESCRIPTION}
                        value={String(currentOption.props.description || '')}
                        onChange={(value) => {
                            const updatedProps = {
                                ...currentOption.props,
                                description: value
                            };
                            updateElementProps(currentOption.id, updatedProps);
                        }}
                        icon={FileText}
                    />

                    {/* 옵션 비활성화 상태 편집 */}
                    <PropertyCheckbox
                        label={PROPERTY_LABELS.DISABLED}
                        checked={Boolean(currentOption.props.isDisabled)}
                        onChange={(checked) => {
                            const updatedProps = {
                                ...currentOption.props,
                                isDisabled: checked
                            };
                            updateElementProps(currentOption.id, updatedProps);
                        }}
                        icon={PointerOff}
                    />

                    {/* 옵션 삭제 버튼 */}
                    <div className='tab-actions'>
                        <button
                            className='control-button delete'
                            onClick={async () => {
                                try {
                                    // Supabase에서 삭제
                                    const { error } = await supabase
                                        .from("elements")
                                        .delete()
                                        .eq("id", currentOption.id);

                                    if (error) {
                                        console.error("SelectItem 삭제 에러:", error);
                                        return;
                                    }

                                    // 로컬 상태에서 제거
                                    removeElement(currentOption.id);
                                    setSelectedOption(null);
                                } catch (error) {
                                    console.error("SelectItem 삭제 중 오류:", error);
                                }
                            }}
                        >
                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            Delete This Item
                        </button>
                    </div>

                    {/* 닫기 버튼 */}
                    <div className='tab-actions'>
                        <button
                            className='control-button secondary'
                            onClick={() => setSelectedOption(null)}
                        >
                            {PROPERTY_LABELS.CLOSE}
                        </button>
                    </div>

                </fieldset>
            </div>
        );
    }

    // ComboBox 컴포넌트 자체의 속성 편집 UI
    return (
        <div className="component-props">
            <fieldset className="properties-aria">
                {/* 기본 속성들 */}
                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value)}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DESCRIPTION}
                    value={String(currentProps.description || '')}
                    onChange={(value) => updateProp('description', value)}
                    icon={FileText}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ERROR_MESSAGE}
                    value={String(currentProps.errorMessage || '')}
                    onChange={(value) => updateProp('errorMessage', value)}
                    icon={AlertTriangle}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.PLACEHOLDER}
                    value={String(currentProps.placeholder || '')}
                    onChange={(value) => updateProp('placeholder', value)}
                    icon={SpellCheck2}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.SELECTED_KEY}
                    value={String(currentProps.selectedKey || '')}
                    onChange={(value) => updateProp('selectedKey', value)}
                    icon={Hash}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_SELECTED_KEY}
                    value={String(currentProps.defaultSelectedKey || '')}
                    onChange={(value) => updateProp('defaultSelectedKey', value)}
                    icon={Hash}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.INPUT_VALUE}
                    value={String(currentProps.inputValue || '')}
                    onChange={(value) => updateProp('inputValue', value)}
                    icon={Hash}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_INPUT_VALUE}
                    value={String(currentProps.defaultInputValue || '')}
                    onChange={(value) => updateProp('defaultInputValue', value)}
                    icon={Hash}
                />

                <PropertyCheckbox
                    label={PROPERTY_LABELS.ALLOWS_CUSTOM_VALUE}
                    checked={Boolean(currentProps.allowsCustomValue)}
                    onChange={(checked) => updateProp('allowsCustomValue', checked)}
                    icon={SquareMousePointer}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.MENU_TRIGGER}
                    value={String(currentProps.menuTrigger || 'focus')}
                    onChange={(value) => updateProp('menuTrigger', value)}
                    options={[
                        { id: 'focus', label: PROPERTY_LABELS.MENU_TRIGGER_FOCUS },
                        { id: 'input', label: PROPERTY_LABELS.MENU_TRIGGER_INPUT },
                        { id: 'manual', label: PROPERTY_LABELS.MENU_TRIGGER_MANUAL }
                    ]}
                    icon={Menu}
                />

                <PropertyCheckbox
                    label={PROPERTY_LABELS.DISALLOW_EMPTY_SELECTION}
                    checked={Boolean(currentProps.disallowEmptySelection)}
                    onChange={(checked) => updateProp('disallowEmptySelection', checked)}
                    icon={SquareX}
                />

                <PropertyCheckbox
                    label={PROPERTY_LABELS.DISABLED}
                    checked={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                <PropertyCheckbox
                    label={PROPERTY_LABELS.REQUIRED}
                    checked={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
                    icon={CheckSquare}
                />

                <PropertyCheckbox
                    label={PROPERTY_LABELS.READONLY}
                    checked={Boolean(currentProps.isReadOnly)}
                    onChange={(checked) => updateProp('isReadOnly', checked)}
                    icon={PenOff}
                />

                <PropertyCheckbox
                    label={PROPERTY_LABELS.AUTO_FOCUS}
                    checked={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                    icon={Focus}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend>{PROPERTY_LABELS.ADD_OPTION}</legend>


                {/* 옵션 목록 표시 */}
                {comboBoxItemChildren.length > 0 ? (
                    <div className="tabs-list">
                        {comboBoxItemChildren.map((item, index) => (
                            <div key={item.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {String(item.props.label) || `Item ${index + 1}`}
                                    {currentProps.selectedKey === item.props.value && ' ✓'}
                                </span>
                                <button
                                    className='tab-edit-button'
                                    onClick={() => setSelectedOption({ parentId: elementId, optionId: item.id })}
                                >
                                    Edit
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-options">{PROPERTY_LABELS.NO_OPTIONS}</p>
                )}

                {/* 새 아이템 추가 */}
                <div className='tab-actions'>
                    <button
                        className='control-button add'
                        onClick={async () => {
                            try {
                                const newItemId = crypto.randomUUID();
                                const newItem = {
                                    id: newItemId,
                                    page_id: currentPageId || '1',
                                    tag: 'ComboBoxItem',
                                    props: {
                                        label: `Option ${(comboBoxItemChildren.length || 0) + 1}`,
                                        value: `option${(comboBoxItemChildren.length || 0) + 1}`,
                                        description: '',
                                        isDisabled: false,
                                    },
                                    parent_id: elementId,
                                    order_num: (comboBoxItemChildren.length || 0) + 1,
                                };

                                // Supabase에 삽입
                                const { data, error } = await supabase
                                    .from("elements")
                                    .insert(newItem)
                                    .select();

                                if (error) {
                                    console.error("ComboBoxItem 추가 에러:", error);
                                    return;
                                }

                                if (data && data[0]) {
                                    addElement(data[0]);
                                }
                            } catch (err) {
                                console.error("ComboBoxItem 추가 중 오류:", err);
                            }
                        }}
                    >
                        <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        {PROPERTY_LABELS.ADD_OPTION}
                    </button>
                </div>
            </fieldset>
        </div>
    );
}
