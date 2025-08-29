import { useState, useEffect } from 'react';
import { Type, Layout, SquarePlus, Trash, CircleDot, PointerOff, HelpCircle, AlertTriangle } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { PropertyEditorProps, RadioItem } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores/elements';

interface SelectedRadioState {
    parentId: string;
    radioIndex: number;
}

export function RadioGroupEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedRadio, setSelectedRadio] = useState<SelectedRadioState | null>(null);
    const { addElement } = useStore();

    useEffect(() => {
        // 라디오 선택 상태 초기화
        setSelectedRadio(null);
    }, [elementId]);

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    // 라디오 버튼 배열 가져오기
    const radioItems = Array.isArray(currentProps.children) ? currentProps.children as RadioItem[] : [];

    // 선택된 라디오 버튼이 있고, 현재 RadioGroup 컴포넌트의 라디오인 경우 개별 라디오 편집 UI 표시
    if (selectedRadio && selectedRadio.parentId === elementId) {
        const currentRadio = radioItems[selectedRadio.radioIndex];
        if (!currentRadio) return null;

        return (
            <div className="component-props">
                <fieldset className="properties-aria">
                    <legend className='fieldset-legend'>Radio Properties</legend>

                    {/* 라디오 버튼 라벨 편집 */}
                    <PropertyInput
                        label="라벨"
                        value={String(currentRadio.label || '')}
                        onChange={(value) => {
                            const updatedRadios = [...radioItems];
                            updatedRadios[selectedRadio.radioIndex] = {
                                ...updatedRadios[selectedRadio.radioIndex],
                                label: value
                            };
                            updateProp('children', updatedRadios);
                        }}
                        icon={Type}
                    />

                    {/* 라디오 버튼 값 편집 */}
                    <PropertyInput
                        label="값"
                        value={String(currentRadio.value || '')}
                        onChange={(value) => {
                            const updatedRadios = [...radioItems];
                            updatedRadios[selectedRadio.radioIndex] = {
                                ...updatedRadios[selectedRadio.radioIndex],
                                value: value
                            };
                            updateProp('children', updatedRadios);
                        }}
                        icon={Type}
                    />

                    {/* 라디오 버튼 비활성화 상태 편집 */}
                    <PropertyCheckbox
                        label="비활성화"
                        checked={Boolean(currentRadio.isDisabled)}
                        onChange={(checked) => {
                            const updatedRadios = [...radioItems];
                            updatedRadios[selectedRadio.radioIndex] = {
                                ...updatedRadios[selectedRadio.radioIndex],
                                isDisabled: checked
                            };
                            updateProp('children', updatedRadios);
                        }}
                        icon={PointerOff}
                    />

                    {/* 라디오 버튼 삭제 버튼 */}
                    <div className='tab-actions'>
                        <button
                            className='control-button delete'
                            onClick={() => {
                                const updatedRadios = [...radioItems];
                                updatedRadios.splice(selectedRadio.radioIndex, 1);
                                updateProp('children', updatedRadios);
                                setSelectedRadio(null);
                            }}
                        >
                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            Delete This Radio
                        </button>
                    </div>
                </fieldset>

                {/* 라디오 버튼 편집 모드 종료 버튼 */}
                <div className='tab-actions'>
                    <button
                        className='control-button secondary'
                        onClick={() => setSelectedRadio(null)}
                    >
                        Back to RadioGroup Settings
                    </button>
                </div>
            </div>
        );
    }

    // RadioGroup 컴포넌트 전체 설정 UI
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

                {/* 선택 값 설정 */}
                <PropertyInput
                    label="선택 값"
                    value={String(currentProps.value || '')}
                    onChange={(value) => updateProp('value', value)}
                    icon={CircleDot}
                />

                {/* 기본 선택 값 설정 */}
                <PropertyInput
                    label="기본 선택 값"
                    value={String(currentProps.defaultValue || '')}
                    onChange={(value) => updateProp('defaultValue', value)}
                    icon={CircleDot}
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
                <legend className='fieldset-legend'>Radio Management</legend>

                {/* 라디오 버튼 개수 표시 */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total radio options: {radioItems.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual radio options from list to edit label, value, and state
                    </p>
                </div>

                {/* 라디오 버튼 목록 */}
                {radioItems.length > 0 && (
                    <div className='tabs-list'>
                        {radioItems.map((radio, index) => (
                            <div key={radio.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {radio.label || `Option ${index + 1}`}
                                    {currentProps.value === radio.value && ' ✓'}
                                </span>
                                <button
                                    className='tab-edit-button'
                                    onClick={() => setSelectedRadio({ parentId: elementId, radioIndex: index })}
                                >
                                    Edit
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 새 라디오 버튼 추가 */}
                <div className='tab-actions'>
                    <button
                        className='control-button add'
                        onClick={() => {
                            const newRadioId = `radio${Date.now()}`;
                            const newRadio = {
                                id: newRadioId,
                                label: `Option ${(radioItems.length || 0) + 1}`,
                                value: `option${(radioItems.length || 0) + 1}`
                            };

                            const updatedProps = {
                                ...currentProps,
                                children: [...radioItems, newRadio]
                            };

                            onUpdate(updatedProps);
                        }}
                    >
                        <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        Add Radio Option
                    </button>
                </div>
            </fieldset>
        </div>
    );
}