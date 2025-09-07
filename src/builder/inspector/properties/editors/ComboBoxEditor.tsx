import { useState, useEffect, useMemo } from 'react';
import { Type, SquarePlus, Trash, PointerOff, HelpCircle, AlertTriangle, Hash, FileText, Search } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores/elements';

interface SelectedOptionState {
    parentId: string;
    optionId: string;
}

export function ComboBoxEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedOption, setSelectedOption] = useState<SelectedOptionState | null>(null);
    const { addElement, removeElement, setElements, elements: storeElements, currentPageId, updateElementProps } = useStore();

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
                        label="라벨"
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
                        icon={Type}
                    />

                    {/* 옵션 값 편집 */}
                    <PropertyInput
                        label="값"
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
                        icon={Hash}
                    />

                    {/* 옵션 설명 편집 */}
                    <PropertyInput
                        label="설명"
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

                    {/* 옵션 텍스트 값 편집 */}
                    <PropertyInput
                        label="텍스트 값"
                        value={String(currentOption.props.textValue || '')}
                        onChange={(value) => {
                            const updatedProps = {
                                ...currentOption.props,
                                textValue: value
                            };
                            updateElementProps(currentOption.id, updatedProps);
                        }}
                    />

                    {/* 옵션 비활성화 상태 편집 */}
                    <PropertyCheckbox
                        label="비활성화"
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

                    {/* 닫기 버튼 */}
                    <div className='tab-actions'>
                        <button
                            className='control-button close'
                            onClick={() => setSelectedOption(null)}
                        >
                            <HelpCircle {...iconProps} />
                            닫기
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
                <legend>ComboBox 속성</legend>

                {/* 기본 속성들 */}
                <PropertyInput
                    label="라벨"
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value)}
                    icon={Type}
                />

                <PropertyInput
                    label="설명"
                    value={String(currentProps.description || '')}
                    onChange={(value) => updateProp('description', value)}
                    icon={FileText}
                />

                <PropertyInput
                    label="오류 메시지"
                    value={String(currentProps.errorMessage || '')}
                    onChange={(value) => updateProp('errorMessage', value)}
                    icon={AlertTriangle}
                />

                <PropertyInput
                    label="플레이스홀더"
                    value={String(currentProps.placeholder || '')}
                    onChange={(value) => updateProp('placeholder', value)}
                    icon={Search}
                />

                <PropertyInput
                    label="선택된 키"
                    value={String(currentProps.selectedKey || '')}
                    onChange={(value) => updateProp('selectedKey', value)}
                />

                <PropertyInput
                    label="기본 선택 키"
                    value={String(currentProps.defaultSelectedKey || '')}
                    onChange={(value) => updateProp('defaultSelectedKey', value)}
                />

                <PropertyInput
                    label="입력 값"
                    value={String(currentProps.inputValue || '')}
                    onChange={(value) => updateProp('inputValue', value)}
                />

                <PropertyInput
                    label="기본 입력 값"
                    value={String(currentProps.defaultInputValue || '')}
                    onChange={(value) => updateProp('defaultInputValue', value)}
                />

                <PropertyCheckbox
                    label="사용자 정의 값 허용"
                    checked={Boolean(currentProps.allowsCustomValue)}
                    onChange={(checked) => updateProp('allowsCustomValue', checked)}
                />

                <PropertySelect
                    label="메뉴 트리거"
                    value={String(currentProps.menuTrigger || 'focus')}
                    onChange={(value) => updateProp('menuTrigger', value)}
                    options={[
                        { id: 'focus', label: 'Focus' },
                        { id: 'input', label: 'Input' },
                        { id: 'manual', label: 'Manual' }
                    ]}
                />

                <PropertyCheckbox
                    label="빈 선택 허용 안함"
                    checked={Boolean(currentProps.disallowEmptySelection)}
                    onChange={(checked) => updateProp('disallowEmptySelection', checked)}
                />

                <PropertyCheckbox
                    label="비활성화"
                    checked={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                <PropertyCheckbox
                    label="필수"
                    checked={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
                />

                <PropertyCheckbox
                    label="읽기 전용"
                    checked={Boolean(currentProps.isReadOnly)}
                    onChange={(checked) => updateProp('isReadOnly', checked)}
                />

                <PropertyCheckbox
                    label="자동 포커스"
                    checked={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend>ComboBox 옵션 목록</legend>

                {/* 옵션 목록 표시 */}
                {comboBoxItemChildren.length > 0 ? (
                    <div className="options-list">
                        {comboBoxItemChildren.map((item, index) => (
                            <div key={item.id} className="option-item">
                                <button
                                    className="option-button"
                                    onClick={() => setSelectedOption({ parentId: elementId, optionId: item.id })}
                                >
                                    <span className="option-label">{item.props.label || `Option ${index + 1}`}</span>
                                    <span className="option-value">({item.props.value})</span>
                                </button>
                                <button
                                    className="delete-option-button"
                                    onClick={async () => {
                                        await removeElement(item.id);
                                    }}
                                >
                                    <Trash {...iconProps} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-options">옵션이 없습니다.</p>
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
                                        textValue: `option${(comboBoxItemChildren.length || 0) + 1}`,
                                        description: '',
                                        isDisabled: false,
                                        style: {},
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
                        <SquarePlus {...iconProps} />
                        옵션 추가
                    </button>
                </div>
            </fieldset>
        </div>
    );
}
