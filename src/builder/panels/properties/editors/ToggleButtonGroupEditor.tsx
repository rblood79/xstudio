import { useState, useEffect, useMemo } from 'react';
import { Tag, SquarePlus, Trash, PointerOff, AlertTriangle, ToggleLeft, Focus, Binary, FileText, Target, Layout, Ruler, Type, Hash, FormInput, CheckSquare } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId , PropertySection} from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/ui/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';
import { getDB } from '../../../../lib/db';
import { ElementUtils } from '../../../../utils/element/elementUtils';
import type { Element } from '../../../../types/core/store.types';

interface SelectedButtonState {
    parentId: string;
    buttonIndex: number;
}

export function ToggleButtonGroupEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedButton, setSelectedButton] = useState<SelectedButtonState | null>(null);
    const { addElement, currentPageId, updateElementProps, setElements } = useStore();

    // 스토어에서 elements를 직접 구독하여 실시간 업데이트
    const storeElements = useStore(state => state.elements);

    // Get customId from element in store
    const element = useStore((state) => state.elements.find((el) => el.id === elementId));
    const customId = element?.customId || '';

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
        <>
                <div className="properties-aria">
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
                            const updatedProps = {
                                ...currentButton.props,
                                isDisabled: isSelected
                            } as Record<string, unknown>;
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
                                    // IndexedDB에서 ToggleButton 삭제
                                    const db = await getDB();
                                    await db.elements.delete(currentButton.id);

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
                </div>

                {/* 버튼 편집 모드 종료 버튼 */}
                <div className='tab-actions'>
                    <button
                        className='control-button secondary'
                        onClick={() => setSelectedButton(null)}
                    >
                        Back to ToggleButtonGroup Settings
                    </button>
                </div>
            </>
        );
    }

    // ToggleButtonGroup 컴포넌트 전체 설정 UI
    return (
        <>
      {/* Basic */}
      <PropertySection title="Basic">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                placeholder="togglebuttongroup_1"
            />
      </PropertySection>

      {/* Content Section */}
            <PropertySection title="Content">

                <PropertyInput
                    label={PROPERTY_LABELS.LABEL}
                    value={String(currentProps.label || '')}
                    onChange={(value) => updateProp('label', value)}
                    icon={Tag}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DESCRIPTION}
                    value={String(currentProps.description || '')}
                    onChange={(value) => updateProp('description', value)}
                    icon={FileText}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.ERROR_MESSAGE}
                    value={String(currentProps.errorMessage || '')}
                    onChange={(value) => updateProp('errorMessage', value)}
                    icon={AlertTriangle}
                />
            </PropertySection>

            {/* Design Section */}
            <PropertySection title="Design">

                <PropertySelect
                    label={PROPERTY_LABELS.VARIANT}
                    value={String(currentProps.variant || 'default')}
                    onChange={(value) => updateProp('variant', value)}
                    options={[
                        { value: 'default', label: PROPERTY_LABELS.TOGGLEBUTTON_VARIANT_DEFAULT },
                        { value: 'primary', label: PROPERTY_LABELS.TOGGLEBUTTON_VARIANT_PRIMARY },
                        { value: 'secondary', label: PROPERTY_LABELS.TOGGLEBUTTON_VARIANT_SECONDARY },
                        { value: 'surface', label: PROPERTY_LABELS.TOGGLEBUTTON_VARIANT_SURFACE }
                    ]}
                    icon={Layout}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.SIZE}
                    value={String(currentProps.size || 'md')}
                    onChange={(value) => updateProp('size', value)}
                    options={[
                        { value: 'sm', label: PROPERTY_LABELS.SIZE_SM },
                        { value: 'md', label: PROPERTY_LABELS.SIZE_MD },
                        { value: 'lg', label: PROPERTY_LABELS.SIZE_LG }
                    ]}
                    icon={Ruler}
                />

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

                <PropertySwitch
                    label={PROPERTY_LABELS.INDICATOR}
                    isSelected={currentProps.indicator === true}
                    onChange={(checked) => {
                        updateProp('indicator', checked);
                    }}
                    icon={Target}
                />
            </PropertySection>

            {/* State Section */}
            <PropertySection title="State">

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

                <PropertySwitch
                    label={PROPERTY_LABELS.REQUIRED}
                    isSelected={Boolean(currentProps.isRequired)}
                    onChange={(checked) => updateProp('isRequired', checked)}
                    icon={CheckSquare}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.INVALID}
                    isSelected={Boolean(currentProps.isInvalid)}
                    onChange={(checked) => updateProp('isInvalid', checked)}
                    icon={AlertTriangle}
                />
            </PropertySection>

            {/* Behavior Section */}
            <PropertySection title="Behavior">

                <PropertySwitch
                    label={PROPERTY_LABELS.DISABLED}
                    isSelected={Boolean(currentProps.isDisabled)}
                    onChange={(checked) => updateProp('isDisabled', checked)}
                    icon={PointerOff}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.AUTO_FOCUS}
                    isSelected={Boolean(currentProps.autoFocus)}
                    onChange={(checked) => updateProp('autoFocus', checked)}
                    icon={Focus}
                />
            </PropertySection>

            {/* Form Integration Section */}
            <PropertySection title="Form Integration">

                <PropertyInput
                    label={PROPERTY_LABELS.NAME}
                    value={String(currentProps.name || '')}
                    onChange={(value) => updateProp('name', value || undefined)}
                    icon={FormInput}
                    placeholder="togglebutton-group-name"
                />
            </PropertySection>

            {/* Accessibility Section */}
            <PropertySection title="Accessibility">

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Toggle button group label for screen readers"
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
            </PropertySection>

            <PropertySection title="{PROPERTY_LABELS.BUTTON_MANAGEMENT}">

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

                                // IndexedDB에 저장
                                const db = await getDB();
                                const insertedButton = await db.elements.insert(newToggleButton);

                                // 스토어에 새 요소 추가
                                addElement(insertedButton);
                                console.log('✅ [IndexedDB] 새 ToggleButton 추가됨:', insertedButton);
                            } catch (error) {
                                console.error('ToggleButton 추가 중 오류:', error);
                            }
                        }}
                    >
                        <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        {PROPERTY_LABELS.ADD_TOGGLE_BUTTON}
                    </button>
                </div>
            </PropertySection>
        </>
    );
}
