import { useState, useEffect, useMemo } from 'react';
import { Type, Tag, Ratio, SquarePlus, Trash, CheckSquare, PointerOff, FileText, AlertTriangle, PenOff } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertySwitch } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores';
import { ElementUtils } from '../../../../utils/elementUtils';

interface SelectedCheckboxState {
    parentId: string;
    checkboxIndex: number;
}

export function CheckboxGroupEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedCheckbox, setSelectedCheckbox] = useState<SelectedCheckboxState | null>(null);
    const { addElement, currentPageId, updateElementProps, setElements, elements: storeElements } = useStore();

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

    // 실제 Checkbox 자식 요소들을 찾기 (useMemo로 최적화)
    const checkboxChildren = useMemo(() => {
        return storeElements
            .filter((child) => child.parent_id === elementId && child.tag === 'Checkbox')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [storeElements, elementId]);

    // 선택된 체크박스가 있고, 현재 CheckboxGroup 컴포넌트의 체크박스인 경우 개별 체크박스 편집 UI 표시
    if (selectedCheckbox && selectedCheckbox.parentId === elementId) {
        const currentCheckbox = checkboxChildren[selectedCheckbox.checkboxIndex];
        if (!currentCheckbox) return null;

        return (
            <div className="component-props">
                <fieldset className="properties-aria">


                    {/* 체크박스 라벨 편집 */}
                    <PropertyInput
                        label={PROPERTY_LABELS.LABEL}
                        value={String((currentCheckbox.props as Record<string, unknown>).children || '')}
                        onChange={(value) => {
                            // 실제 Checkbox 컴포넌트의 props 업데이트
                            const updatedProps = {
                                ...currentCheckbox.props,
                                children: value
                            };
                            updateElementProps(currentCheckbox.id, updatedProps);
                        }}
                        icon={Tag}
                    />

                    {/* 체크박스 값 편집 */}
                    <PropertyInput
                        label={PROPERTY_LABELS.VALUE}
                        value={String((currentCheckbox.props as Record<string, unknown>).value || '')}
                        onChange={(value) => {
                            // 실제 Checkbox 컴포넌트의 props 업데이트
                            const updatedProps = {
                                ...currentCheckbox.props,
                                value: value
                            };
                            updateElementProps(currentCheckbox.id, updatedProps);
                        }}
                        icon={Type}
                    />

                    {/* 체크박스 선택 상태 편집 */}
                    <PropertySwitch
                        label={PROPERTY_LABELS.SELECTED}
                        isSelected={Boolean((currentCheckbox.props as Record<string, unknown>).isSelected)}
                        onChange={(checked) => {
                            // 실제 Checkbox 컴포넌트의 props 업데이트
                            const updatedProps = {
                                ...currentCheckbox.props,
                                isSelected: checked
                            };
                            updateElementProps(currentCheckbox.id, updatedProps);
                        }}
                        icon={CheckSquare}
                    />

                    {/* 체크박스 비활성화 상태 편집 */}
                    <PropertySwitch
                        label={PROPERTY_LABELS.DISABLED}
                        isSelected={Boolean((currentCheckbox.props as Record<string, unknown>).isDisabled)}
                        onChange={(checked) => {
                            // 실제 Checkbox 컴포넌트의 props 업데이트
                            const updatedProps = {
                                ...currentCheckbox.props,
                                isDisabled: checked
                            };
                            updateElementProps(currentCheckbox.id, updatedProps);
                        }}
                        icon={PointerOff}
                    />

                    {/* 체크박스 불확실 상태 편집 */}
                    <PropertySwitch
                        label={PROPERTY_LABELS.INDETERMINATE}
                        isSelected={Boolean((currentCheckbox.props as Record<string, unknown>).isIndeterminate)}
                        onChange={(checked) => {
                            // 실제 Checkbox 컴포넌트의 props 업데이트
                            const updatedProps = {
                                ...currentCheckbox.props,
                                isIndeterminate: checked
                            };
                            updateElementProps(currentCheckbox.id, updatedProps);
                        }}
                        icon={CheckSquare}
                    />

                    {/* 체크박스 삭제 버튼 */}
                    <div className='tab-actions'>
                        <button
                            className='control-button delete'
                            onClick={async () => {
                                try {
                                    // 실제 Checkbox 컴포넌트를 데이터베이스에서 삭제
                                    const { error } = await supabase
                                        .from('elements')
                                        .delete()
                                        .eq('id', currentCheckbox.id);

                                    if (error) {
                                        console.error('Checkbox 삭제 에러:', error);
                                        return;
                                    }

                                    // 스토어에서도 제거
                                    const updatedElements = storeElements.filter(el => el.id !== currentCheckbox.id);
                                    setElements(updatedElements, { skipHistory: true });
                                    setSelectedCheckbox(null);
                                } catch (error) {
                                    console.error('Checkbox 삭제 중 오류:', error);
                                }
                            }}
                        >
                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            {PROPERTY_LABELS.DELETE_THIS_CHECKBOX}
                        </button>
                    </div>
                </fieldset>

                {/* 체크박스 편집 모드 종료 버튼 */}
                <div className='tab-actions'>
                    <button
                        className='control-button secondary'
                        onClick={() => setSelectedCheckbox(null)}
                    >
                        {PROPERTY_LABELS.BACK_TO_CHECKBOX_GROUP_SETTINGS}
                    </button>
                </div>
            </div>
        );
    }

    // CheckboxGroup 컴포넌트 전체 설정 UI
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
                    value={String(currentProps.orientation || 'vertical')}
                    onChange={(value) => updateProp('orientation', value)}
                    options={[
                        { value: 'horizontal', label: PROPERTY_LABELS.ORIENTATION_HORIZONTAL },
                        { value: 'vertical', label: PROPERTY_LABELS.ORIENTATION_VERTICAL }
                    ]}
                    icon={Ratio}
                />

                {/* 비활성화 설정 */}
                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                {/* 필수 설정 */}
                <PropertySwitch
                    label={PROPERTY_LABELS.REQUIRED}
                    isSelected={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
                    icon={CheckSquare}
                />

                {/* 읽기 전용 설정 */}
                <PropertySwitch
                    label={PROPERTY_LABELS.READONLY}
                    isSelected={Boolean(currentProps.isReadOnly)}
                    onChange={(checked) => updateProp('isReadOnly', checked)}
                    icon={PenOff}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>{PROPERTY_LABELS.CHECKBOX_MANAGEMENT}</legend>

                {/* 체크박스 개수 표시 */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total checkboxes: {checkboxChildren.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual checkboxes from list to edit label, value, and state
                    </p>
                </div>

                {/* 체크박스 목록 */}
                {checkboxChildren.length > 0 && (
                    <div className='tabs-list'>
                        {checkboxChildren.map((checkbox, index) => (
                            <div key={checkbox.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {String((checkbox.props as Record<string, unknown>).children) || `Option ${index + 1}`}
                                    {Boolean((checkbox.props as Record<string, unknown>).isSelected) && ' ✓'}
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
                        onClick={async () => {
                            try {
                                // 새로운 Checkbox 요소를 Supabase에 직접 삽입
                                const newCheckbox = {
                                    id: ElementUtils.generateId(),
                                    page_id: currentPageId || '1',
                                    tag: 'Checkbox',
                                    props: {
                                        children: `Option ${(checkboxChildren.length || 0) + 1}`,
                                        value: `option${(checkboxChildren.length || 0) + 1}`,
                                        isSelected: false,
                                        isDisabled: false,
                                        isIndeterminate: false,
                                        style: {},
                                        className: '',
                                    },
                                    parent_id: elementId,
                                    order_num: (checkboxChildren.length || 0) + 1,
                                };

                                const { data, error } = await supabase
                                    .from('elements')
                                    .upsert(newCheckbox, {
                                        onConflict: 'id'
                                    })
                                    .select()
                                    .single();

                                if (error) {
                                    console.error('Checkbox 추가 에러:', error);
                                    return;
                                }

                                if (data) {
                                    // 스토어에 새 요소 추가
                                    addElement(data);
                                    console.log('새 Checkbox 추가됨:', data);
                                }
                            } catch (error) {
                                console.error('Checkbox 추가 중 오류:', error);
                            }
                        }}
                    >
                        <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        {PROPERTY_LABELS.ADD_CHECKBOX}
                    </button>
                </div>
            </fieldset>
        </div>
    );
}
