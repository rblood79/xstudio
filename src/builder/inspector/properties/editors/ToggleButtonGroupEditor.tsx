import { useState, useEffect, useMemo } from 'react';
import { Tag, SquarePlus, Trash, PointerOff, AlertTriangle, ToggleLeft, Focus, Binary, FileText, Target } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertySwitch } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/labels';
//import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores';
import { ElementUtils } from '../../../../utils/elementUtils';

interface SelectedButtonState {
    parentId: string;
    buttonIndex: number;
}

export function ToggleButtonGroupEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedButton, setSelectedButton] = useState<SelectedButtonState | null>(null);
    const { addElement, currentPageId, updateElementProps, setElements } = useStore();

    // 스토어에서 elements를 직접 구독하여 실시간 업데이트
    const storeElements = useStore(state => state.elements);

    useEffect(() => {
        // 버튼 선택 상태 초기화
        setSelectedButton(null);
    }, [elementId]);

    const updateProp = (key: string, value: unknown) => {
        console.log('Updating prop:', {
            key,
            value,
            currentProps,
            stringifiedProps: JSON.stringify(currentProps)
        });

        // 디버깅용 스택 트레이스 추가
        console.trace('Prop update stack trace');

        const updatedProps = {
            ...currentProps,
            [key]: value
        };

        console.log('Updated props:', {
            updatedProps,
            stringifiedUpdatedProps: JSON.stringify(updatedProps)
        });

        onUpdate(updatedProps);
    };

    // 실제 ToggleButton 자식 요소들을 찾기 (useMemo로 최적화)
    const toggleButtonChildren = useMemo(() => {
        return storeElements
            .filter((child) => child.parent_id === elementId && child.tag === 'ToggleButton')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [storeElements, elementId]);

    // 선택된 토글 버튼이 있고, 현재 ToggleButtonGroup 컴포넌트의 버튼인 경우 개별 버튼 편집 UI 표시
    if (selectedButton && selectedButton.parentId === elementId) {
        const currentButton = toggleButtonChildren[selectedButton.buttonIndex];
        if (!currentButton) return null;

        return (
            <div className="component-props">
                <fieldset className="properties-aria">
                    {/* 버튼 텍스트 편집 */}
                    <PropertyInput
                        label={PROPERTY_LABELS.CHILDREN}
                        value={String((currentButton.props as Record<string, unknown>).children || '')}
                        onChange={(value) => {
                            // 실제 ToggleButton 컴포넌트의 props 업데이트
                            const updatedProps = {
                                ...currentButton.props,
                                children: value
                            };
                            updateElementProps(currentButton.id, updatedProps);
                        }}
                        icon={Tag}
                    />

                    {/* 버튼 비활성화 상태 편집 */}
                    <PropertySwitch
                        label={PROPERTY_LABELS.DISABLED}
                        isSelected={Boolean((currentButton.props as Record<string, unknown>).isDisabled)}
                        onChange={(isSelected: boolean) => {
                            const updatedProps: any = {
                                ...currentButton.props,
                                isDisabled: isSelected
                            };
                            updateElementProps(currentButton.id, updatedProps);
                        }}
                        icon={PointerOff}
                    />

                    {/* 버튼 삭제 버튼 */}
                    <div className='tab-actions'>
                        <button
                            className='control-button delete'
                            onClick={async () => {
                                try {
                                    // 실제 ToggleButton 컴포넌트를 데이터베이스에서 삭제
                                    await ElementUtils.deleteElement(currentButton.id);

                                    // 스토어에서도 제거
                                    const updatedElements = storeElements.filter(el => el.id !== currentButton.id);
                                    setElements(updatedElements);
                                    setSelectedButton(null);
                                } catch (error) {
                                    console.error('ToggleButton 삭제 중 오류:', error);
                                }
                            }}
                        >
                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            Delete This Button
                        </button>
                    </div>
                </fieldset>

                {/* 버튼 편집 모드 종료 버튼 */}
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
                {/* 라벨 설정 */}
                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value)}
                    icon={Tag}
                />

                {/* 설명 설정 */}
                <PropertyInput
                    label={PROPERTY_LABELS.DESCRIPTION}
                    value={String(currentProps.description || '')}
                    onChange={(value) => updateProp('description', value)}
                    icon={FileText}
                />

                {/* 오류 메시지 설정 */}
                <PropertyInput
                    label={PROPERTY_LABELS.ERROR_MESSAGE}
                    value={String(currentProps.errorMessage || '')}
                    onChange={(value) => updateProp('errorMessage', value)}
                    icon={AlertTriangle}
                />

                {/* 방향 설정 */}
                <PropertySelect
                    label={PROPERTY_LABELS.ORIENTATION}
                    value={String(currentProps.orientation || 'horizontal')}
                    onChange={(value) => updateProp('orientation', value)}
                    options={[
                        { value: 'horizontal', label: PROPERTY_LABELS.ORIENTATION_HORIZONTAL },
                        { value: 'vertical', label: PROPERTY_LABELS.ORIENTATION_VERTICAL }
                    ]}
                    icon={ToggleLeft}
                />

                {/* 선택 모드 설정 */}
                <PropertySelect
                    label={PROPERTY_LABELS.SELECTION_MODE}
                    value={String(currentProps.selectionMode || 'single')}
                    onChange={(value) => updateProp('selectionMode', value)}
                    options={[
                        { value: 'single', label: PROPERTY_LABELS.SELECTION_MODE_SINGLE },
                        { value: 'multiple', label: PROPERTY_LABELS.SELECTION_MODE_MULTIPLE }
                    ]}
                    icon={Binary}
                />

                {/* 비활성화 설정 */}
                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                {/* 자동 포커스 설정 */}
                <PropertySwitch
                    label={PROPERTY_LABELS.AUTO_FOCUS}
                    isSelected={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                    icon={Focus}
                />

                {/* Indicator 설정 */}
                <PropertySwitch
                    label={PROPERTY_LABELS.INDICATOR}
                    isSelected={currentProps.indicator === true}
                    onChange={(checked) => {
                        console.log('Indicator switch changed:', {
                            checked,
                            currentProps,
                            currentIndicator: currentProps.indicator
                        });
                        updateProp('indicator', checked);
                    }}
                    icon={Target}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Button Management</legend>

                {/* 버튼 개수 표시 */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total buttons: {toggleButtonChildren.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual buttons from list to edit text and state
                    </p>
                </div>

                {/* 버튼 목록 */}
                {toggleButtonChildren.length > 0 && (
                    <div className='tabs-list'>
                        {toggleButtonChildren.map((button, index) => (
                            <div key={button.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {String((button.props as Record<string, unknown>).children || `Button ${index + 1}`)}
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
                            try {
                                // 새로운 ToggleButton 요소를 Supabase에 직접 삽입
                                const newToggleButton = {
                                    id: ElementUtils.generateId(),
                                    page_id: currentPageId || '1',
                                    tag: 'ToggleButton',
                                    props: {
                                        isSelected: false,
                                        defaultSelected: false,
                                        children: `Toggle ${(toggleButtonChildren.length || 0) + 1}`,
                                        style: {},
                                        className: '',
                                    },
                                    parent_id: elementId,
                                    order_num: (toggleButtonChildren.length || 0) + 1,
                                };

                                const data = await ElementUtils.createChildElementWithParentCheck(newToggleButton, currentPageId || '1', elementId);

                                // 스토어에 새 요소 추가
                                addElement(data);
                                //console.log('새 ToggleButton 추가됨:', data);
                            } catch (error) {
                                console.error('ToggleButton 추가 중 오류:', error);
                            }
                        }}
                    >
                        <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        {PROPERTY_LABELS.ADD_TOGGLE_BUTTON}
                    </button>
                </div>
            </fieldset>
        </div>
    );
}
