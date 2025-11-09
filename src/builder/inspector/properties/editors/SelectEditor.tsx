import { useState, useMemo } from 'react';
import { Tag, SquarePlus, Trash, PointerOff, AlertTriangle, Hash, Focus, CheckSquare, PenOff, Menu, SquareX, SpellCheck2, FileText, Binary, Type, FormInput } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores';
import { ElementUtils } from '../../../../utils/elementUtils';

interface SelectedOptionState {
    parentId: string;
    optionId: string;
}

export function SelectEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedOption, setSelectedOption] = useState<SelectedOptionState | null>(null);
    const { addElement, removeElement, elements: storeElements, currentPageId } = useStore();

    // Get customId from element in store
    const element = useStore((state) => state.elements.find((el) => el.id === elementId));
    const customId = element?.customId || '';

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    const updateCustomId = (newCustomId: string) => {
        // Update customId in store (not in props)
        const updateElement = useStore.getState().updateElement;
        if (updateElement && elementId) {
            updateElement(elementId, { customId: newCustomId });
        }
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
                        value={String((currentOption.props as Record<string, unknown>).label || '')}
                        onChange={(value) => {
                            const updatedProps = {
                                ...currentOption.props,
                                label: value
                            };
                            const { updateElementProps } = useStore.getState();
                            updateElementProps(currentOption.id, updatedProps);
                        }}
                        icon={Tag}
                    />

                    {/* 옵션 값 편집 */}
                    <PropertyInput
                        label={PROPERTY_LABELS.VALUE}
                        value={String((currentOption.props as Record<string, unknown>).value || '')}
                        onChange={(value) => {
                            const updatedProps = {
                                ...currentOption.props,
                                value: value
                            };
                            const { updateElementProps } = useStore.getState();
                            updateElementProps(currentOption.id, updatedProps);
                        }}
                        icon={Binary}
                    />

                    {/* 옵션 비활성화 상태 편집 */}
                    <PropertySwitch
                        label={PROPERTY_LABELS.DISABLED}
                        isSelected={Boolean((currentOption.props as Record<string, unknown>).isDisabled)}
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
                        {PROPERTY_LABELS.CLOSE}
                    </button>
                </div>
            </div>
        );
    }

    // Select 컴포넌트 전체 설정 UI
    return (
        <div className="component-props">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="select_1"
            />

            {/* Content Section */}
            <fieldset className="properties-group">
                <legend>Content</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value || undefined)}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DESCRIPTION}
                    value={String(currentProps.description || '')}
                    onChange={(value) => updateProp('description', value || undefined)}
                    icon={FileText}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ERROR_MESSAGE}
                    value={String(currentProps.errorMessage || '')}
                    onChange={(value) => updateProp('errorMessage', value || undefined)}
                    icon={AlertTriangle}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.PLACEHOLDER}
                    value={String(currentProps.placeholder || '')}
                    onChange={(value) => updateProp('placeholder', value || undefined)}
                    icon={SpellCheck2}
                />
            </fieldset>

            {/* State Section */}
            <fieldset className="properties-group">
                <legend>State</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.VALUE}
                    value={String(currentProps.selectedValue || '')}
                    onChange={(value) => updateProp('selectedValue', value || undefined)}
                    icon={Hash}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_SELECTED_KEY}
                    value={String(currentProps.defaultSelectedKey || '')}
                    onChange={(value) => updateProp('defaultSelectedKey', value || undefined)}
                    icon={Hash}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.DISALLOW_EMPTY_SELECTION}
                    isSelected={Boolean(currentProps.disallowEmptySelection)}
                    onChange={(checked) => updateProp('disallowEmptySelection', checked)}
                    icon={SquareX}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.REQUIRED}
                    isSelected={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
                    icon={CheckSquare}
                />
            </fieldset>

            {/* Behavior Section */}
            <fieldset className="properties-group">
                <legend>Behavior</legend>

                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.READONLY}
                    isSelected={Boolean(currentProps.isReadOnly)}
                    onChange={(checked) => updateProp('isReadOnly', checked)}
                    icon={PenOff}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.AUTO_FOCUS}
                    isSelected={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                    icon={Focus}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.MENU_TRIGGER}
                    value={String(currentProps.menuTrigger || 'click')}
                    onChange={(value) => updateProp('menuTrigger', value)}
                    options={[
                        { value: 'click', label: PROPERTY_LABELS.CLICK },
                        { value: 'hover', label: PROPERTY_LABELS.HOVER }
                    ]}
                    icon={Menu}
                />
            </fieldset>

            {/* Form Integration Section */}
            <fieldset className="properties-group">
                <legend>Form Integration</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.NAME}
                    value={String(currentProps.name || '')}
                    onChange={(value) => updateProp('name', value || undefined)}
                    icon={FormInput}
                    placeholder="select-name"
                />

                <PropertySelect
                    label={PROPERTY_LABELS.VALIDATION_BEHAVIOR}
                    value={String(currentProps.validationBehavior || 'native')}
                    onChange={(value) => updateProp('validationBehavior', value)}
                    options={[
                        { value: 'native', label: 'Native' },
                        { value: 'aria', label: 'ARIA' }
                    ]}
                />
            </fieldset>

            {/* Accessibility Section */}
            <fieldset className="properties-group">
                <legend>Accessibility</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Select label for screen readers"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABELLEDBY}
                    value={String(currentProps['aria-labelledby'] || '')}
                    onChange={(value) => updateProp('aria-labelledby', value || undefined)}
                    icon={Hash}
                    placeholder="label-element-id"
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
                    value={String(currentProps['aria-describedby'] || '')}
                    onChange={(value) => updateProp('aria-describedby', value || undefined)}
                    icon={Hash}
                    placeholder="description-element-id"
                />
            </fieldset>

            {/* Item Management Section */}
            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>{PROPERTY_LABELS.ITEM_MANAGEMENT}</legend>

                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total items: {selectItemChildren.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual items from list to edit properties
                    </p>
                </div>

                {selectItemChildren.length > 0 && (
                    <div className='tabs-list'>
                        {selectItemChildren.map((item, index) => (
                            <div key={item.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {String((item.props as Record<string, unknown>).label) || `Item ${index + 1}`}
                                    {currentProps.selectedValue === (item.props as Record<string, unknown>).value && ' ✓'}
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

                <div className='tab-actions'>
                    <button
                        className='control-button add'
                        onClick={async () => {
                            try {
                                const newItemId = ElementUtils.generateId();
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

                                const { data, error } = await supabase
                                    .from("elements")
                                    .upsert(newItem, {
                                        onConflict: 'id'
                                    })
                                    .select();

                                if (error) {
                                    console.error("SelectItem 추가 에러:", error);
                                    return;
                                }

                                if (data && data[0]) {
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