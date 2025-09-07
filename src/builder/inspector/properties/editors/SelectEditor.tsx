import { useState, useMemo } from 'react';
import { Type, SquarePlus, Trash, PointerOff, HelpCircle, AlertTriangle, Hash, ListFilter } from 'lucide-react';
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

export function SelectEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedOption, setSelectedOption] = useState<SelectedOptionState | null>(null);
    const { addElement, removeElement, setElements, elements: storeElements, currentPageId } = useStore();

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    // 실제 SelectItem 자식 요소들을 찾기
    const selectItemChildren = useMemo(() => {
        return storeElements
            .filter((child) => child.parent_id === elementId && child.tag === 'SelectItem')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [storeElements, elementId]);

    // 선택된 옵션이 있고, 현재 Select 컴포넌트의 옵션인 경우 개별 옵션 편집 UI 표시
    if (selectedOption && selectedOption.parentId === elementId) {
        const currentOption = selectItemChildren.find(child => child.id === selectedOption.optionId);
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
                            const { updateElementProps } = useStore.getState();
                            updateElementProps(currentOption.id, updatedProps);
                        }}
                        icon={Type}
                    />

                    {/* 옵션 값 편집 */}
                    <PropertyInput
                        label={PROPERTY_LABELS.VALUE}
                        value={String(currentOption.props.value || '')}
                        onChange={(value) => {
                            const updatedProps = {
                                ...currentOption.props,
                                value: value
                            };
                            const { updateElementProps } = useStore.getState();
                            updateElementProps(currentOption.id, updatedProps);
                        }}
                        icon={Hash}
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
                            const { updateElementProps } = useStore.getState();
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
                </fieldset>

                {/* 옵션 편집 모드 종료 버튼 */}
                <div className='tab-actions'>
                    <button
                        className='control-button secondary'
                        onClick={() => setSelectedOption(null)}
                    >
                        Back to Select Settings
                    </button>
                </div>
            </div>
        );
    }

    // Select 컴포넌트 전체 설정 UI
    return (
        <div className="component-props">
            <fieldset className="properties-aria">


                {/* 라벨 설정 */}
                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value)}
                    icon={Type}
                />

                {/* 설명 설정 */}
                <PropertyInput
                    label={PROPERTY_LABELS.DESCRIPTION}
                    value={String(currentProps.description || '')}
                    onChange={(value) => updateProp('description', value)}
                    icon={HelpCircle}
                />

                {/* 오류 메시지 설정 */}
                <PropertyInput
                    label={PROPERTY_LABELS.ERROR_MESSAGE}
                    value={String(currentProps.errorMessage || '')}
                    onChange={(value) => updateProp('errorMessage', value)}
                    icon={AlertTriangle}
                />

                {/* 플레이스홀더 설정 */}
                <PropertyInput
                    label={PROPERTY_LABELS.PLACEHOLDER}
                    value={String(currentProps.placeholder || '')}
                    onChange={(value) => updateProp('placeholder', value)}
                />

                {/* 선택된 키 설정 */}
                <PropertyInput
                    label={PROPERTY_LABELS.SELECTED_KEY}
                    value={String(currentProps.selectedKey || '')}
                    onChange={(value) => updateProp('selectedKey', value)}
                    icon={Hash}
                />

                {/* 기본 선택 키 설정 */}
                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_SELECTED_KEY}
                    value={String(currentProps.defaultSelectedKey || '')}
                    onChange={(value) => updateProp('defaultSelectedKey', value)}
                />

                {/* 메뉴 트리거 설정 */}
                <PropertySelect
                    label={PROPERTY_LABELS.MENU_TRIGGER}
                    value={String(currentProps.menuTrigger || 'click')}
                    onChange={(value) => updateProp('menuTrigger', value)}
                    options={[
                        { id: 'click', label: 'Click' },
                        { id: 'hover', label: 'Hover' }
                    ]}
                />

                {/* 빈 선택 허용 안함 설정 */}
                <PropertyCheckbox
                    label={PROPERTY_LABELS.DISALLOW_EMPTY_SELECTION}
                    checked={Boolean(currentProps.disallowEmptySelection)}
                    onChange={(checked) => updateProp('disallowEmptySelection', checked)}
                />

                {/* 비활성화 설정 */}
                <PropertyCheckbox
                    label={PROPERTY_LABELS.DISABLED}
                    checked={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                {/* 필수 설정 */}
                <PropertyCheckbox
                    label={PROPERTY_LABELS.REQUIRED}
                    checked={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
                />

                {/* 읽기 전용 설정 */}
                <PropertyCheckbox
                    label={PROPERTY_LABELS.READONLY}
                    checked={Boolean(currentProps.isReadOnly)}
                    onChange={(checked) => updateProp('isReadOnly', checked)}
                />

                {/* 자동 포커스 설정 */}
                <PropertyCheckbox
                    label={PROPERTY_LABELS.AUTO_FOCUS}
                    checked={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Item Management</legend>

                {/* 아이템 개수 표시 */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total items: {selectItemChildren.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual items from list to edit properties
                    </p>
                </div>

                {/* 아이템 목록 */}
                {selectItemChildren.length > 0 && (
                    <div className='tabs-list'>
                        {selectItemChildren.map((item, index) => (
                            <div key={item.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {item.props.label || `Item ${index + 1}`}
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
                                    tag: 'SelectItem',
                                    props: {
                                        label: `Option ${(selectItemChildren.length || 0) + 1}`,
                                        value: `option${(selectItemChildren.length || 0) + 1}`,
                                        description: '',
                                        isDisabled: false,
                                        isReadOnly: false,
                                        style: {},
                                        className: '',
                                    },
                                    parent_id: elementId,
                                    order_num: (selectItemChildren.length || 0) + 1,
                                };

                                // Supabase에 삽입
                                const { data, error } = await supabase
                                    .from("elements")
                                    .insert(newItem)
                                    .select();

                                if (error) {
                                    console.error("SelectItem 추가 에러:", error);
                                    return;
                                }

                                if (data && data[0]) {
                                    // 로컬 상태에 추가
                                    addElement(data[0]);
                                }
                            } catch (error) {
                                console.error("SelectItem 추가 중 오류:", error);
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