import { useState, useEffect } from 'react';
import { Type, Layout, SquarePlus, Trash, CheckSquare, PointerOff, HelpCircle, AlertTriangle } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { PropertyEditorProps, CheckboxItem } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores/elements';

interface SelectedCheckboxState {
    parentId: string;
    checkboxIndex: number;
}

export function CheckboxGroupEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedCheckbox, setSelectedCheckbox] = useState<SelectedCheckboxState | null>(null);
    const { addElement } = useStore();

    useEffect(() => {
        // 체크박스 선택 상태 초기화
        setSelectedCheckbox(null);
    }, [elementId]);

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    // 체크박스 배열 가져오기
    const checkboxes = Array.isArray(currentProps.children) ? currentProps.children as CheckboxItem[] : [];

    // 선택된 체크박스가 있고, 현재 CheckboxGroup 컴포넌트의 체크박스인 경우 개별 체크박스 편집 UI 표시
    if (selectedCheckbox && selectedCheckbox.parentId === elementId) {
        const currentCheckbox = checkboxes[selectedCheckbox.checkboxIndex];
        if (!currentCheckbox) return null;

        return (
            <div className="component-props">
                <fieldset className="properties-aria">
                    <legend className='fieldset-legend'>Checkbox Properties</legend>

                    {/* 체크박스 라벨 편집 */}
                    <PropertyInput
                        label="라벨"
                        value={String(currentCheckbox.label || '')}
                        onChange={(value) => {
                            const updatedCheckboxes = [...checkboxes];
                            updatedCheckboxes[selectedCheckbox.checkboxIndex] = {
                                ...updatedCheckboxes[selectedCheckbox.checkboxIndex],
                                label: value
                            };
                            updateProp('children', updatedCheckboxes);
                        }}
                        icon={Type}
                    />

                    {/* 체크박스 값 편집 */}
                    <PropertyInput
                        label="값"
                        value={String(currentCheckbox.value || '')}
                        onChange={(value) => {
                            const updatedCheckboxes = [...checkboxes];
                            updatedCheckboxes[selectedCheckbox.checkboxIndex] = {
                                ...updatedCheckboxes[selectedCheckbox.checkboxIndex],
                                value: value
                            };
                            updateProp('children', updatedCheckboxes);
                        }}
                        icon={Type}
                    />

                    {/* 체크박스 선택 상태 편집 */}
                    <PropertyCheckbox
                        label="선택됨"
                        checked={Boolean(currentCheckbox.isSelected)}
                        onChange={(checked) => {
                            const updatedCheckboxes = [...checkboxes];
                            updatedCheckboxes[selectedCheckbox.checkboxIndex] = {
                                ...updatedCheckboxes[selectedCheckbox.checkboxIndex],
                                isSelected: checked
                            };
                            updateProp('children', updatedCheckboxes);
                        }}
                        icon={CheckSquare}
                    />

                    {/* 체크박스 비활성화 상태 편집 */}
                    <PropertyCheckbox
                        label="비활성화"
                        checked={Boolean(currentCheckbox.isDisabled)}
                        onChange={(checked) => {
                            const updatedCheckboxes = [...checkboxes];
                            updatedCheckboxes[selectedCheckbox.checkboxIndex] = {
                                ...updatedCheckboxes[selectedCheckbox.checkboxIndex],
                                isDisabled: checked
                            };
                            updateProp('children', updatedCheckboxes);
                        }}
                        icon={PointerOff}
                    />

                    {/* 체크박스 불확실 상태 편집 */}
                    <PropertyCheckbox
                        label="불확실 상태"
                        checked={Boolean(currentCheckbox.isIndeterminate)}
                        onChange={(checked) => {
                            const updatedCheckboxes = [...checkboxes];
                            updatedCheckboxes[selectedCheckbox.checkboxIndex] = {
                                ...updatedCheckboxes[selectedCheckbox.checkboxIndex],
                                isIndeterminate: checked
                            };
                            updateProp('children', updatedCheckboxes);
                        }}
                        icon={CheckSquare}
                    />

                    {/* 체크박스 삭제 버튼 */}
                    <div className='tab-actions'>
                        <button
                            className='control-button delete'
                            onClick={() => {
                                const updatedCheckboxes = [...checkboxes];
                                updatedCheckboxes.splice(selectedCheckbox.checkboxIndex, 1);
                                updateProp('children', updatedCheckboxes);
                                setSelectedCheckbox(null);
                            }}
                        >
                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            Delete This Checkbox
                        </button>
                    </div>
                </fieldset>

                {/* 체크박스 편집 모드 종료 버튼 */}
                <div className='tab-actions'>
                    <button
                        className='control-button secondary'
                        onClick={() => setSelectedCheckbox(null)}
                    >
                        Back to CheckboxGroup Settings
                    </button>
                </div>
            </div>
        );
    }

    // CheckboxGroup 컴포넌트 전체 설정 UI
    return (
        <div className="component-props">
            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Group Settings</legend>

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

                {/* 방향 설정 */}
                <PropertySelect
                    label="방향"
                    value={String(currentProps.orientation || 'vertical')}
                    onChange={(value) => updateProp('orientation', value)}
                    options={[
                        { id: 'horizontal', label: 'Horizontal' },
                        { id: 'vertical', label: 'Vertical' }
                    ]}
                    icon={Layout}
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
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Checkbox Management</legend>

                {/* 체크박스 개수 표시 */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total checkboxes: {checkboxes.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual checkboxes from list to edit label, value, and state
                    </p>
                </div>

                {/* 체크박스 목록 */}
                {checkboxes.length > 0 && (
                    <div className='tabs-list'>
                        {checkboxes.map((checkbox, index) => (
                            <div key={checkbox.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {checkbox.label || `Option ${index + 1}`}
                                    {checkbox.isSelected && ' ✓'}
                                </span>
                                <button
                                    className='tab-edit-button'
                                    onClick={() => setSelectedCheckbox({ parentId: elementId, checkboxIndex: index })}
                                >
                                    Edit
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 새 체크박스 추가 */}
                <div className='tab-actions'>
                    <button
                        className='control-button add'
                        onClick={() => {
                            const newCheckboxId = `checkbox${Date.now()}`;
                            const newCheckbox = {
                                id: newCheckboxId,
                                label: `Option ${(checkboxes.length || 0) + 1}`,
                                value: `option${(checkboxes.length || 0) + 1}`,
                                isSelected: false
                            };

                            const updatedProps = {
                                ...currentProps,
                                children: [...checkboxes, newCheckbox]
                            };

                            onUpdate(updatedProps);
                        }}
                    >
                        <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        Add Checkbox
                    </button>
                </div>
            </fieldset>
        </div>
    );
}
