import { useEffect } from 'react';
import { Tag, SquarePlus, PointerOff, AlertTriangle, FileText, Trash, Binary, CheckSquare, PenOff, Focus, Type, Hash, FormInput, Menu } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { useStore } from '../../../stores';
import { useCollectionItemManager } from '../../../hooks/useCollectionItemManager';

export function ComboBoxEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    // Collection Item 관리 훅
    const {
        children,
        selectedItemIndex,
        selectItem,
        deselectItem,
        addItem,
        deleteItem,
        updateItem,
    } = useCollectionItemManager({
        elementId,
        childTag: 'ComboBoxItem',
        defaultItemProps: (index) => ({
            label: `Option ${index + 1}`,
            value: `option${index + 1}`,
            textValue: `Option ${index + 1}`,
        }),
    });

    // Get customId from element in store
    const element = useStore((state) => state.elements.find((el) => el.id === elementId));
    const customId = element?.customId || '';

    useEffect(() => {
        // 옵션 선택 상태 초기화
        deselectItem();
    }, [elementId, deselectItem]);

    const updateProp = (key: string, value: unknown) => {
        console.log('ComboBoxEditor updateProp 호출:', { key, value });
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

    // 선택된 옵션이 있는 경우 개별 옵션 편집 UI 표시
    if (selectedItemIndex !== null) {
        const currentOption = children[selectedItemIndex];
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
                            } as typeof currentOption.props & { label: string };
                            updateItem(currentOption.id, updatedProps);

                            // 부모 ComboBox의 defaultSelectedKey가 현재 옵션의 value와 같다면 업데이트
                            if (currentProps.defaultSelectedKey === (currentOption.props as Record<string, unknown>).value) {
                                updateProp('defaultSelectedKey', (currentOption.props as Record<string, unknown>).value);
                            }
                        }}
                        icon={Tag}
                    />

                    {/* 옵션 값 편집 */}
                    <PropertyInput
                        label={PROPERTY_LABELS.VALUE}
                        value={String((currentOption.props as Record<string, unknown>).value || '')}
                        onChange={(value) => {
                            const oldValue = (currentOption.props as Record<string, unknown>).value;
                            const updatedProps = {
                                ...currentOption.props,
                                value: value
                            };
                            updateItem(currentOption.id, updatedProps);

                            // 부모 ComboBox의 defaultSelectedKey가 이전 값과 같다면 새 값으로 업데이트
                            if (currentProps.defaultSelectedKey === oldValue) {
                                updateProp('defaultSelectedKey', value);
                            }
                        }}
                        icon={Binary}
                    />

                    {/* 옵션 설명 편집 */}
                    <PropertyInput
                        label={PROPERTY_LABELS.DESCRIPTION}
                        value={String((currentOption.props as Record<string, unknown>).description || '')}
                        onChange={(value) => {
                            const updatedProps = {
                                ...currentOption.props,
                                description: value
                            };
                            updateItem(currentOption.id, updatedProps);
                        }}
                        icon={FileText}
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
                            updateItem(currentOption.id, updatedProps);
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
                                    deleteItem(currentOption.id);
                                } catch (error) {
                                    console.error("SelectItem 삭제 중 오류:", error);
                                }
                            }}
                        >
                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            Delete This Item
                        </button>
                    </div>

                    {/* 닫기 버튼 */}
                    <div className='tab-actions'>
                        <button
                            className='control-button secondary'
                            onClick={deselectItem}
                        >
                            {PROPERTY_LABELS.CLOSE}
                        </button>
                    </div>

                </fieldset>
            </div>
        );
    }

    // ComboBox 컴포넌트 자체의 속성 편집 UI
    return (
        <div className="component-props">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="combobox_1"
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
                    icon={FileText}
                />
            </fieldset>

            {/* State Section */}
            <fieldset className="properties-group">
                <legend>State</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.VALUE}
                    value={String(currentProps.selectedValue || '')}
                    onChange={(value) => updateProp('selectedValue', value || undefined)}
                    icon={Tag}
                    placeholder="선택된 값이 여기에 표시됩니다"
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.ALLOWS_CUSTOM_VALUE}
                    isSelected={Boolean(currentProps.allowsCustomValue)}
                    onChange={(checked) => updateProp('allowsCustomValue', checked)}
                    icon={Binary}
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
                    value={String(currentProps.menuTrigger || 'focus')}
                    onChange={(value) => updateProp('menuTrigger', value)}
                    options={[
                        { value: 'focus', label: 'Focus' },
                        { value: 'input', label: 'Input' },
                        { value: 'manual', label: 'Manual' }
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
                    placeholder="combobox-name"
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
                    placeholder="ComboBox label for screen readers"
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
                <legend>{PROPERTY_LABELS.ADD_OPTION}</legend>

                {children.length > 0 ? (
                    <div className="tabs-list">
                        {children.map((item, index) => (
                            <div key={item.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {String((item.props as Record<string, unknown>).label) || `Item ${index + 1}`}
                                    {currentProps.selectedValue === (item.props as Record<string, unknown>).value && ' ✓'}
                                </span>
                                <button
                                    className='tab-edit-button'
                                    onClick={() => selectItem(index)}
                                >
                                    Edit
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-options">{PROPERTY_LABELS.NO_OPTIONS}</p>
                )}

                <div className='tab-actions'>
                    <button
                        className='control-button add'
                        onClick={addItem}
                    >
                        <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        {PROPERTY_LABELS.ADD_OPTION}
                    </button>
                </div>
            </fieldset>
        </div>
    );
}
