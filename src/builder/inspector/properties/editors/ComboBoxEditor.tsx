import { useState, useEffect } from 'react';
import { Type, SquarePlus, Trash, PointerOff, HelpCircle, AlertTriangle, Hash, FileText, Search } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { PropertyEditorProps, ComboBoxItem } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';

interface SelectedOptionState {
    parentId: string;
    optionIndex: number;
}

export function ComboBoxEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedOption, setSelectedOption] = useState<SelectedOptionState | null>(null);

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

    // 콤보박스 옵션 배열 가져오기
    const comboOptions = Array.isArray(currentProps.children) ? currentProps.children as ComboBoxItem[] : [];

    // 선택된 옵션이 있고, 현재 ComboBox 컴포넌트의 옵션인 경우 개별 옵션 편집 UI 표시
    if (selectedOption && selectedOption.parentId === elementId) {
        const currentOption = comboOptions[selectedOption.optionIndex];
        if (!currentOption) return null;

        return (
            <div className="component-props">
                <fieldset className="properties-aria">


                    {/* 옵션 라벨 편집 */}
                    <PropertyInput
                        label="라벨"
                        value={String(currentOption.label || '')}
                        onChange={(value) => {
                            const updatedOptions = [...comboOptions];
                            updatedOptions[selectedOption.optionIndex] = {
                                ...updatedOptions[selectedOption.optionIndex],
                                label: value
                            };
                            updateProp('children', updatedOptions);
                        }}
                        icon={Type}
                    />

                    {/* 옵션 값 편집 */}
                    <PropertyInput
                        label="값"
                        value={String(currentOption.value || '')}
                        onChange={(value) => {
                            const updatedOptions = [...comboOptions];
                            updatedOptions[selectedOption.optionIndex] = {
                                ...updatedOptions[selectedOption.optionIndex],
                                value: value
                            };
                            updateProp('children', updatedOptions);
                        }}
                        icon={Hash}
                    />

                    {/* 옵션 설명 편집 */}
                    <PropertyInput
                        label="설명"
                        value={String(currentOption.description || '')}
                        onChange={(value) => {
                            const updatedOptions = [...comboOptions];
                            updatedOptions[selectedOption.optionIndex] = {
                                ...updatedOptions[selectedOption.optionIndex],
                                description: value
                            };
                            updateProp('children', updatedOptions);
                        }}
                        icon={FileText}
                    />

                    {/* 옵션 텍스트 값 편집 */}
                    <PropertyInput
                        label="텍스트 값"
                        value={String(currentOption.textValue || '')}
                        onChange={(value) => {
                            const updatedOptions = [...comboOptions];
                            updatedOptions[selectedOption.optionIndex] = {
                                ...updatedOptions[selectedOption.optionIndex],
                                textValue: value
                            };
                            updateProp('children', updatedOptions);
                        }}
                    />

                    {/* 옵션 비활성화 상태 편집 */}
                    <PropertyCheckbox
                        label="비활성화"
                        checked={Boolean(currentOption.isDisabled)}
                        onChange={(checked) => {
                            const updatedOptions = [...comboOptions];
                            updatedOptions[selectedOption.optionIndex] = {
                                ...updatedOptions[selectedOption.optionIndex],
                                isDisabled: checked
                            };
                            updateProp('children', updatedOptions);
                        }}
                        icon={PointerOff}
                    />

                    {/* 옵션 삭제 버튼 */}
                    <div className='tab-actions'>
                        <button
                            className='control-button delete'
                            onClick={() => {
                                const updatedOptions = [...comboOptions];
                                updatedOptions.splice(selectedOption.optionIndex, 1);
                                updateProp('children', updatedOptions);
                                setSelectedOption(null);
                            }}
                        >
                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            Delete This Option
                        </button>
                    </div>
                </fieldset>

                {/* 옵션 편집 모드 종료 버튼 */}
                <div className='tab-actions'>
                    <button
                        className='control-button secondary'
                        onClick={() => setSelectedOption(null)}
                    >
                        Back to ComboBox Settings
                    </button>
                </div>
            </div>
        );
    }

    // ComboBox 컴포넌트 전체 설정 UI
    return (
        <div className="component-props">
            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>ComboBox Settings</legend>

                {/* 라벨 설정 */}
                <PropertyInput
                    label="라벨"
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value)}
                    icon={Type}
                />

                {/* 설명 설정 */}
                <PropertyInput
                    label="설명"
                    value={String(currentProps.description || '')}
                    onChange={(value) => updateProp('description', value)}
                    icon={HelpCircle}
                />

                {/* 오류 메시지 설정 */}
                <PropertyInput
                    label="오류 메시지"
                    value={String(currentProps.errorMessage || '')}
                    onChange={(value) => updateProp('errorMessage', value)}
                    icon={AlertTriangle}
                />

                {/* 플레이스홀더 설정 */}
                <PropertyInput
                    label="플레이스홀더"
                    value={String(currentProps.placeholder || '')}
                    onChange={(value) => updateProp('placeholder', value)}
                />

                {/* 선택된 키 설정 */}
                <PropertyInput
                    label="선택된 키"
                    value={String(currentProps.selectedKey || '')}
                    onChange={(value) => updateProp('selectedKey', value)}
                    icon={Hash}
                />

                {/* 기본 선택 키 설정 */}
                <PropertyInput
                    label="기본 선택 키"
                    value={String(currentProps.defaultSelectedKey || '')}
                    onChange={(value) => updateProp('defaultSelectedKey', value)}
                />

                {/* 입력 값 설정 */}
                <PropertyInput
                    label="입력 값"
                    value={String(currentProps.inputValue || '')}
                    onChange={(value) => updateProp('inputValue', value)}
                    icon={Search}
                />

                {/* 기본 입력 값 설정 */}
                <PropertyInput
                    label="기본 입력 값"
                    value={String(currentProps.defaultInputValue || '')}
                    onChange={(value) => updateProp('defaultInputValue', value)}
                />

                {/* 메뉴 트리거 설정 */}
                <PropertySelect
                    label="메뉴 트리거"
                    value={String(currentProps.menuTrigger || 'input')}
                    onChange={(value) => updateProp('menuTrigger', value)}
                    options={[
                        { id: 'focus', label: 'Focus' },
                        { id: 'input', label: 'Input' },
                        { id: 'manual', label: 'Manual' }
                    ]}
                />

                {/* 사용자 정의 값 허용 설정 */}
                <PropertyCheckbox
                    label="사용자 정의 값 허용"
                    checked={Boolean(currentProps.allowsCustomValue)}
                    onChange={(checked) => updateProp('allowsCustomValue', checked)}
                />

                {/* 빈 선택 허용 안함 설정 */}
                <PropertyCheckbox
                    label="빈 선택 허용 안함"
                    checked={Boolean(currentProps.disallowEmptySelection)}
                    onChange={(checked) => updateProp('disallowEmptySelection', checked)}
                />

                {/* 비활성화 설정 */}
                <PropertyCheckbox
                    label="비활성화"
                    checked={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                {/* 필수 설정 */}
                <PropertyCheckbox
                    label="필수"
                    checked={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
                />

                {/* 읽기 전용 설정 */}
                <PropertyCheckbox
                    label="읽기 전용"
                    checked={Boolean(currentProps.isReadOnly)}
                    onChange={(checked) => updateProp('isReadOnly', checked)}
                />

                {/* 자동 포커스 설정 */}
                <PropertyCheckbox
                    label="자동 포커스"
                    checked={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Option Management</legend>

                {/* 옵션 개수 표시 */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total options: {comboOptions.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual options from list to edit label, value, description, and state
                    </p>
                </div>

                {/* 옵션 목록 */}
                {comboOptions.length > 0 && (
                    <div className='tabs-list'>
                        {comboOptions.map((option, index) => (
                            <div key={option.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {option.label || `Option ${index + 1}`}
                                    {currentProps.selectedKey === option.value && ' ✓'}
                                </span>
                                <button
                                    className='tab-edit-button'
                                    onClick={() => setSelectedOption({ parentId: elementId, optionIndex: index })}
                                >
                                    Edit
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 새 옵션 추가 */}
                <div className='tab-actions'>
                    <button
                        className='control-button add'
                        onClick={() => {
                            const newOptionId = `option${Date.now()}`;
                            const newOption = {
                                id: newOptionId,
                                label: `Option ${(comboOptions.length || 0) + 1}`,
                                value: `option${(comboOptions.length || 0) + 1}`,
                                description: '',
                                isDisabled: false
                            };

                            const updatedProps = {
                                ...currentProps,
                                children: [...comboOptions, newOption]
                            };

                            onUpdate(updatedProps);
                        }}
                    >
                        <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        Add Option
                    </button>
                </div>
            </fieldset>
        </div>
    );
}
