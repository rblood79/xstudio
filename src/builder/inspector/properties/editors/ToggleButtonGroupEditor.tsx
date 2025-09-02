import { useState, useEffect } from 'react';
import { Type, Layout, SquarePlus, Trash, PointerOff, ToggleLeft } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { PropertyEditorProps, ToggleButtonItem } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores/elements';

interface SelectedButtonState {
    parentId: string;
    buttonIndex: number;
}

export function ToggleButtonGroupEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedButton, setSelectedButton] = useState<SelectedButtonState | null>(null);
    const { addElement, currentPageId } = useStore(); // 👈 이것만 사용

    useEffect(() => {
        // 버튼 선택 상태 초기화
        setSelectedButton(null);
    }, [elementId]);

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    // 토글 버튼 배열 가져오기
    const buttonItems = Array.isArray(currentProps.children) ? currentProps.children as ToggleButtonItem[] : [];

    // 선택된 토글 버튼이 있고, 현재 ToggleButtonGroup 컴포넌트의 버튼인 경우 개별 버튼 편집 UI 표시
    if (selectedButton && selectedButton.parentId === elementId) {
        const currentButton = buttonItems[selectedButton.buttonIndex];
        if (!currentButton) return null;

        return (
            <div className="component-props">
                <fieldset className="properties-aria">
                    <legend className='fieldset-legend'>Toggle Button Properties</legend>

                    {/* 토글 버튼 제목 편집 */}
                    <PropertyInput
                        label="제목"
                        value={String(currentButton.title || '')}
                        onChange={(value) => {
                            const updatedButtons = [...buttonItems];
                            updatedButtons[selectedButton.buttonIndex] = {
                                ...updatedButtons[selectedButton.buttonIndex],
                                title: value
                            };
                            updateProp('children', updatedButtons);
                        }}
                        icon={Type}
                    />

                    {/* 토글 버튼 선택 상태 편집 */}
                    <PropertyCheckbox
                        label="선택됨"
                        checked={Boolean(currentButton.isSelected)}
                        onChange={(checked) => {
                            const updatedButtons = [...buttonItems];
                            updatedButtons[selectedButton.buttonIndex] = {
                                ...updatedButtons[selectedButton.buttonIndex],
                                isSelected: checked
                            };
                            updateProp('children', updatedButtons);
                        }}
                        icon={ToggleLeft}
                    />

                    {/* 토글 버튼 비활성화 상태 편집 */}
                    <PropertyCheckbox
                        label="비활성화"
                        checked={Boolean(currentButton.isDisabled)}
                        onChange={(checked) => {
                            const updatedButtons = [...buttonItems];
                            updatedButtons[selectedButton.buttonIndex] = {
                                ...updatedButtons[selectedButton.buttonIndex],
                                isDisabled: checked
                            };
                            updateProp('children', updatedButtons);
                        }}
                        icon={PointerOff}
                    />

                    {/* 토글 버튼 삭제 버튼 */}
                    <div className='tab-actions'>
                        <button
                            className='control-button delete'
                            onClick={() => {
                                const updatedButtons = [...buttonItems];
                                updatedButtons.splice(selectedButton.buttonIndex, 1);
                                updateProp('children', updatedButtons);
                                setSelectedButton(null);
                            }}
                        >
                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            Delete This Button
                        </button>
                    </div>
                </fieldset>

                {/* 토글 버튼 편집 모드 종료 버튼 */}
                <div className='tab-actions'>
                    <button
                        className='control-button secondary'
                        onClick={() => setSelectedButton(null)}
                    >
                        Back to ToggleButtonGroup Settings
                    </button>
                </div>
            </div>
        );
    }

    // ToggleButtonGroup 컴포넌트 전체 설정 UI
    return (
        <div className="component-props">
            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Group Settings</legend>

                {/* 방향 설정 */}
                <PropertySelect
                    label="방향"
                    value={String(currentProps.orientation || 'horizontal')}
                    onChange={(value) => updateProp('orientation', value)}
                    options={[
                        { id: 'horizontal', label: 'Horizontal' },
                        { id: 'vertical', label: 'Vertical' }
                    ]}
                    icon={Layout}
                />

                {/* 선택 모드 설정 */}
                <PropertySelect
                    label="선택 모드"
                    value={String(currentProps.selectionMode || 'single')}
                    onChange={(value) => updateProp('selectionMode', value)}
                    options={[
                        { id: 'single', label: 'Single' },
                        { id: 'multiple', label: 'Multiple' }
                    ]}
                    icon={ToggleLeft}
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
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Button Management</legend>

                {/* 토글 버튼 개수 표시 */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total buttons: {buttonItems.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual buttons from list to edit title and state
                    </p>
                </div>

                {/* 토글 버튼 목록 */}
                {buttonItems.length > 0 && (
                    <div className='tabs-list'>
                        {buttonItems.map((button, index) => (
                            <div key={button.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {button.title || `Button ${index + 1}`}
                                    {button.isSelected && ' ✓'}
                                </span>
                                <button
                                    className='tab-edit-button'
                                    onClick={() => setSelectedButton({ parentId: elementId, buttonIndex: index })}
                                >
                                    Edit
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 새 토글 버튼 추가 */}
                <div className='tab-actions'>
                    <button
                        className='control-button add'
                        onClick={async () => {
                            if (!currentPageId) {
                                console.error("페이지 ID를 찾을 수 없습니다.");
                                return;
                            }

                            const newToggleButton = {
                                id: crypto.randomUUID(),
                                page_id: currentPageId, // 👈 직접 사용
                                tag: 'ToggleButton',
                                props: {
                                    isSelected: false,
                                    defaultSelected: false,
                                    children: `Button ${(buttonItems.length || 0) + 1}`,
                                    style: {},
                                    className: '',
                                },
                                parent_id: elementId,
                                order_num: (buttonItems.length || 0) + 1,
                            };

                            console.log("새 ToggleButton 추가 시도:", {
                                newToggleButton,
                                currentPageId,
                                elementId
                            });

                            const { data, error } = await supabase
                                .from("elements")
                                .insert([newToggleButton])
                                .select();

                            if (error) {
                                console.error("ToggleButton 추가 에러:", error);
                            } else if (data) {
                                console.log("ToggleButton 추가 성공:", data[0]);
                                addElement(data[0]);
                            }
                        }}
                    >
                        <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        Add Toggle Button
                    </button>
                </div>
            </fieldset>
        </div>
    );
}
