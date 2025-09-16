import { useState, useEffect, useMemo } from 'react';
import { Tag, SquarePlus, Trash, PointerOff, AlertTriangle, List, SquareX, Focus, Binary, FileText } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores';
import { ElementUtils } from '../../../../utils/elementUtils';

interface SelectedItemState {
    parentId: string;
    itemIndex: number;
}

export function ListBoxEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedItem, setSelectedItem] = useState<SelectedItemState | null>(null);
    const { addElement, currentPageId, updateElementProps, setElements, elements: storeElements } = useStore();

    useEffect(() => {
        // 아이템 선택 상태 초기화
        setSelectedItem(null);
    }, [elementId]);

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    // 실제 ListBoxItem 자식 요소들을 찾기 (useMemo로 최적화)
    const listBoxChildren = useMemo(() => {
        return storeElements
            .filter((child) => child.parent_id === elementId && child.tag === 'ListBoxItem')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [storeElements, elementId]);

    // 선택된 아이템이 있고, 현재 ListBox 컴포넌트의 아이템인 경우 개별 아이템 편집 UI 표시
    if (selectedItem && selectedItem.parentId === elementId) {
        const currentItem = listBoxChildren[selectedItem.itemIndex];
        if (!currentItem) return null;

        return (
            <div className="component-props">
                <fieldset className="properties-aria">


                    {/* 아이템 라벨 편집 */}
                    <PropertyInput
                        label={PROPERTY_LABELS.LABEL}
                        value={String((currentItem.props as Record<string, unknown>).label || '')}
                        onChange={(value) => {
                            // 실제 ListBoxItem 컴포넌트의 props 업데이트
                            const updatedProps = {
                                ...currentItem.props,
                                label: value
                            };
                            updateElementProps(currentItem.id, updatedProps);
                        }}
                        icon={Tag}
                    />

                    {/* 아이템 값 편집 */}
                    <PropertyInput
                        label={PROPERTY_LABELS.VALUE}
                        value={String((currentItem.props as Record<string, unknown>).value || '')}
                        onChange={(value) => {
                            // 실제 ListBoxItem 컴포넌트의 props 업데이트
                            const updatedProps = {
                                ...currentItem.props,
                                value: value
                            };
                            updateElementProps(currentItem.id, updatedProps);
                        }}
                        icon={Binary}
                    />

                    {/* 아이템 비활성화 상태 편집 */}
                    <PropertyCheckbox
                        label={PROPERTY_LABELS.DISABLED}
                        checked={Boolean((currentItem.props as Record<string, unknown>).isDisabled)}
                        onChange={(checked) => {
                            // 실제 ListBoxItem 컴포넌트의 props 업데이트
                            const updatedProps = {
                                ...currentItem.props,
                                isDisabled: checked
                            };
                            updateElementProps(currentItem.id, updatedProps);
                        }}
                        icon={PointerOff}
                    />

                    {/* 아이템 삭제 버튼 */}
                    <div className='tab-actions'>
                        <button
                            className='control-button delete'
                            onClick={async () => {
                                try {
                                    // 실제 ListBoxItem 컴포넌트를 데이터베이스에서 삭제
                                    const { error } = await supabase
                                        .from('elements')
                                        .delete()
                                        .eq('id', currentItem.id);

                                    if (error) {
                                        console.error('ListBoxItem 삭제 에러:', error);
                                        return;
                                    }

                                    // 스토어에서도 제거
                                    const updatedElements = storeElements.filter(el => el.id !== currentItem.id);
                                    setElements(updatedElements);
                                    setSelectedItem(null);
                                } catch (error) {
                                    console.error('ListBoxItem 삭제 중 오류:', error);
                                }
                            }}
                        >
                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            Delete This Item
                        </button>
                    </div>
                </fieldset>

                {/* 아이템 편집 모드 종료 버튼 */}
                <div className='tab-actions'>
                    <button
                        className='control-button secondary'
                        onClick={() => setSelectedItem(null)}
                    >
                        Back to ListBox Settings
                    </button>
                </div>
            </div>
        );
    }

    // ListBox 컴포넌트 전체 설정 UI
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

                {/* 선택 모드 설정 */}
                <PropertySelect
                    label={PROPERTY_LABELS.SELECTION_MODE}
                    value={String(currentProps.selectionMode || 'single')}
                    onChange={(value) => updateProp('selectionMode', value)}
                    options={[
                        { id: 'single', label: PROPERTY_LABELS.SELECTION_MODE_SINGLE },
                        { id: 'multiple', label: PROPERTY_LABELS.SELECTION_MODE_MULTIPLE }
                    ]}
                    icon={List}
                />

                {/* 빈 선택 허용 안함 설정 */}
                <PropertyCheckbox
                    label={PROPERTY_LABELS.DISALLOW_EMPTY_SELECTION}
                    checked={Boolean(currentProps.disallowEmptySelection)}
                    onChange={(checked) => updateProp('disallowEmptySelection', checked)}
                    icon={SquareX}
                />

                {/* 비활성화 설정 */}
                <PropertyCheckbox
                    label={PROPERTY_LABELS.DISABLED}
                    checked={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                {/* 자동 포커스 설정 */}
                <PropertyCheckbox
                    label={PROPERTY_LABELS.AUTO_FOCUS}
                    checked={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                    icon={Focus}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Item Management</legend>

                {/* 아이템 개수 표시 */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total items: {listBoxChildren.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual items from list to edit label, value, and state
                    </p>
                </div>

                {/* 아이템 목록 */}
                {listBoxChildren.length > 0 && (
                    <div className='tabs-list'>
                        {listBoxChildren.map((item, index) => (
                            <div key={item.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {String((item.props as Record<string, unknown>).label || `Item ${index + 1}`)}
                                </span>
                                <button
                                    className='tab-edit-button'
                                    onClick={() => setSelectedItem({ parentId: elementId, itemIndex: index })}
                                >
                                    Edit
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 새 아이템 추가 */}
                <div className='tab-actions'>
                    <button
                        className='control-button add'
                        onClick={async () => {
                            try {
                                // 새로운 ListBoxItem 요소를 Supabase에 직접 삽입
                                const newItem = {
                                    id: ElementUtils.generateId(),
                                    page_id: currentPageId || '1',
                                    tag: 'ListBoxItem',
                                    props: {
                                        label: `Item ${(listBoxChildren.length || 0) + 1}`,
                                        value: `item${(listBoxChildren.length || 0) + 1}`,
                                        isDisabled: false,
                                        style: {},
                                        className: '',
                                    },
                                    parent_id: elementId,
                                    order_num: (listBoxChildren.length || 0) + 1,
                                };

                                const data = await ElementUtils.createChildElementWithParentCheck(newItem, currentPageId || '1', elementId); // currentPageId 전달

                                // 스토어에 새 요소 추가
                                addElement(data);
                                console.log('새 ListBoxItem 추가됨:', data);
                            } catch (error) {
                                console.error('ListBoxItem 추가 중 오류:', error);
                            }
                        }}
                    >
                        <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        Add Item
                    </button>
                </div>
            </fieldset>
        </div>
    );
}