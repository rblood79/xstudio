import { useState, useEffect } from 'react';
import { Type, Layout, SquarePlus, Trash, PointerOff, HelpCircle, AlertTriangle, Grid, MoveHorizontal, FileText } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertyCheckbox } from '../components';
import { PropertyEditorProps, GridListItem } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores/elements';

interface SelectedItemState {
    parentId: string;
    itemIndex: number;
}

export function GridListEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedItem, setSelectedItem] = useState<SelectedItemState | null>(null);
    const { addElement } = useStore();

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

    // 그리드 리스트 아이템 배열 가져오기
    const gridItems = Array.isArray(currentProps.children) ? currentProps.children as GridListItem[] : [];

    // 선택된 아이템이 있고, 현재 GridList 컴포넌트의 아이템인 경우 개별 아이템 편집 UI 표시
    if (selectedItem && selectedItem.parentId === elementId) {
        const currentItem = gridItems[selectedItem.itemIndex];
        if (!currentItem) return null;

        return (
            <div className="component-props">
                <fieldset className="properties-aria">
                    <legend className='fieldset-legend'>Item Properties</legend>

                    {/* 아이템 라벨 편집 */}
                    <PropertyInput
                        label="라벨"
                        value={String(currentItem.label || '')}
                        onChange={(value) => {
                            const updatedItems = [...gridItems];
                            updatedItems[selectedItem.itemIndex] = {
                                ...updatedItems[selectedItem.itemIndex],
                                label: value
                            };
                            updateProp('children', updatedItems);
                        }}
                        icon={Type}
                    />

                    {/* 아이템 값 편집 */}
                    <PropertyInput
                        label="값"
                        value={String(currentItem.value || '')}
                        onChange={(value) => {
                            const updatedItems = [...gridItems];
                            updatedItems[selectedItem.itemIndex] = {
                                ...updatedItems[selectedItem.itemIndex],
                                value: value
                            };
                            updateProp('children', updatedItems);
                        }}
                        icon={Type}
                    />

                    {/* 아이템 설명 편집 */}
                    <PropertyInput
                        label="설명"
                        value={String(currentItem.description || '')}
                        onChange={(value) => {
                            const updatedItems = [...gridItems];
                            updatedItems[selectedItem.itemIndex] = {
                                ...updatedItems[selectedItem.itemIndex],
                                description: value
                            };
                            updateProp('children', updatedItems);
                        }}
                        icon={FileText}
                    />

                    {/* 아이템 텍스트 값 편집 */}
                    <PropertyInput
                        label="텍스트 값"
                        value={String(currentItem.textValue || '')}
                        onChange={(value) => {
                            const updatedItems = [...gridItems];
                            updatedItems[selectedItem.itemIndex] = {
                                ...updatedItems[selectedItem.itemIndex],
                                textValue: value
                            };
                            updateProp('children', updatedItems);
                        }}
                    />

                    {/* 아이템 비활성화 상태 편집 */}
                    <PropertyCheckbox
                        label="비활성화"
                        checked={Boolean(currentItem.isDisabled)}
                        onChange={(checked) => {
                            const updatedItems = [...gridItems];
                            updatedItems[selectedItem.itemIndex] = {
                                ...updatedItems[selectedItem.itemIndex],
                                isDisabled: checked
                            };
                            updateProp('children', updatedItems);
                        }}
                        icon={PointerOff}
                    />

                    {/* 아이템 삭제 버튼 */}
                    <div className='tab-actions'>
                        <button
                            className='control-button delete'
                            onClick={() => {
                                const updatedItems = [...gridItems];
                                updatedItems.splice(selectedItem.itemIndex, 1);
                                updateProp('children', updatedItems);
                                setSelectedItem(null);
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
                        Back to GridList Settings
                    </button>
                </div>
            </div>
        );
    }

    // GridList 컴포넌트 전체 설정 UI
    return (
        <div className="component-props">
            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>GridList Settings</legend>

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

                {/* 선택 모드 설정 */}
                <PropertySelect
                    label="선택 모드"
                    value={String(currentProps.selectionMode || 'single')}
                    onChange={(value) => updateProp('selectionMode', value)}
                    options={[
                        { id: 'single', label: 'Single' },
                        { id: 'multiple', label: 'Multiple' }
                    ]}
                    icon={Grid}
                />

                {/* 선택 동작 설정 */}
                <PropertySelect
                    label="선택 동작"
                    value={String(currentProps.selectionBehavior || 'toggle')}
                    onChange={(value) => updateProp('selectionBehavior', value)}
                    options={[
                        { id: 'toggle', label: 'Toggle' },
                        { id: 'replace', label: 'Replace' }
                    ]}
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

                {/* 자동 포커스 설정 */}
                <PropertyCheckbox
                    label="자동 포커스"
                    checked={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                />

                {/* 드래그 허용 설정 */}
                <PropertyCheckbox
                    label="드래그 허용"
                    checked={Boolean(currentProps.allowsDragging)}
                    onChange={(checked) => updateProp('allowsDragging', checked)}
                    icon={MoveHorizontal}
                />

                {/* 빈 상태 렌더링 설정 */}
                <PropertyCheckbox
                    label="빈 상태 렌더링"
                    checked={Boolean(currentProps.renderEmptyState)}
                    onChange={(checked) => updateProp('renderEmptyState', checked)}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Item Management</legend>

                {/* 아이템 개수 표시 */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total items: {gridItems.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual items from list to edit label, value, description, and state
                    </p>
                </div>

                {/* 아이템 목록 */}
                {gridItems.length > 0 && (
                    <div className='tabs-list'>
                        {gridItems.map((item, index) => (
                            <div key={item.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {item.label || `Item ${index + 1}`}
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
                        onClick={() => {
                            const newItemId = `item${Date.now()}`;
                            const newItem = {
                                id: newItemId,
                                label: `Item ${(gridItems.length || 0) + 1}`,
                                value: `item${(gridItems.length || 0) + 1}`,
                                description: '',
                                isDisabled: false
                            };

                            const updatedProps = {
                                ...currentProps,
                                children: [...gridItems, newItem]
                            };

                            onUpdate(updatedProps);
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
