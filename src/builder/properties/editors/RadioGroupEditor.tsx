import { useState, useEffect, useMemo } from 'react';
import { Tag, SquarePlus, Trash, FileText, PointerOff, AlertTriangle, CheckSquare, PenOff, CheckCheck, Binary, Ratio, Layout, Ruler, Type, Hash, FormInput } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/ui/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores';
import { ElementUtils } from '../../../../utils/element/elementUtils';

interface SelectedRadioState {
    parentId: string;
    radioIndex: number;
}

export function RadioGroupEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedRadio, setSelectedRadio] = useState<SelectedRadioState | null>(null);
    const { addElement, currentPageId, updateElementProps, setElements, elements: storeElements } = useStore();

    // Get customId from element in store
    const element = useStore((state) => state.elements.find((el) => el.id === elementId));
    const customId = element?.customId || '';

    useEffect(() => {
        // 라디오 선택 상태 초기화
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedRadio(null);
    }, [elementId]);

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

    // 실제 Radio 자식 요소들을 찾기 (useMemo로 최적화)
    const radioChildren = useMemo(() => {
        return storeElements
            .filter((child) => child.parent_id === elementId && child.tag === 'Radio')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [storeElements, elementId]);

    // 선택된 라디오 버튼이 있고, 현재 RadioGroup 컴포넌트의 라디오인 경우 개별 라디오 편집 UI 표시
    if (selectedRadio && selectedRadio.parentId === elementId) {
        const currentRadio = radioChildren[selectedRadio.radioIndex];
        if (!currentRadio) return null;

        return (
            <div className="component-props">
                <fieldset className="properties-aria">


                    {/* 라디오 버튼 라벨 편집 */}
                    <PropertyInput
                        label={PROPERTY_LABELS.LABEL}
                        value={String((currentRadio.props as Record<string, unknown>).children || '')}
                        onChange={(value) => {
                            // 실제 Radio 컴포넌트의 props 업데이트
                            const updatedProps = {
                                ...currentRadio.props,
                                children: value
                            };
                            updateElementProps(currentRadio.id, updatedProps);
                        }}
                        icon={Tag}
                    />

                    {/* 라디오 버튼 값 편집 */}
                    <PropertyInput
                        label={PROPERTY_LABELS.VALUE}
                        value={String((currentRadio.props as Record<string, unknown>).value || '')}
                        onChange={(value) => {
                            // 실제 Radio 컴포넌트의 props 업데이트
                            const updatedProps = {
                                ...currentRadio.props,
                                value: value
                            };
                            updateElementProps(currentRadio.id, updatedProps);
                        }}
                        icon={Binary}
                    />

                    {/* 라디오 버튼 비활성화 상태 편집 */}
                    <PropertySwitch
                        label={PROPERTY_LABELS.DISABLED}
                        isSelected={Boolean((currentRadio.props as Record<string, unknown>).isDisabled)}
                        onChange={(checked) => {
                            // 실제 Radio 컴포넌트의 props 업데이트
                            const updatedProps = {
                                ...currentRadio.props,
                                isDisabled: checked
                            };
                            updateElementProps(currentRadio.id, updatedProps);
                        }}
                        icon={PointerOff}
                    />

                    {/* 라디오 버튼 삭제 버튼 */}
                    <div className='tab-actions'>
                        <button
                            className='control-button delete'
                            onClick={async () => {
                                try {
                                    // 실제 Radio 컴포넌트를 데이터베이스에서 삭제
                                    const { error } = await supabase
                                        .from('elements')
                                        .delete()
                                        .eq('id', currentRadio.id);

                                    if (error) {
                                        console.error('Radio 삭제 에러:', error);
                                        return;
                                    }

                                    // 스토어에서도 제거
                                    const updatedElements = storeElements.filter(el => el.id !== currentRadio.id);
                                    setElements(updatedElements);
                                    setSelectedRadio(null);
                                } catch (error) {
                                    console.error('Radio 삭제 중 오류:', error);
                                }
                            }}
                        >
                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            {PROPERTY_LABELS.DELETE_THIS_RADIO}
                        </button>
                    </div>
                </fieldset>

                {/* 라디오 버튼 편집 모드 종료 버튼 */}
                <div className='tab-actions'>
                    <button
                        className='control-button secondary'
                        onClick={() => setSelectedRadio(null)}
                    >
                        {PROPERTY_LABELS.BACK_TO_RADIO_GROUP_SETTINGS}
                    </button>
                </div>
            </div>
        );
    }

    // RadioGroup 컴포넌트 전체 설정 UI
    return (
        <div className="component-props">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="radiogroup_1"
            />

            {/* Content Section */}
            <fieldset className="properties-group">
                <legend>Content</legend>

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
            </fieldset>

            {/* Design Section */}
            <fieldset className="properties-design">
                <legend>Design</legend>

                <PropertySelect
                    label={PROPERTY_LABELS.VARIANT}
                    value={String(currentProps.variant || 'default')}
                    onChange={(value) => updateProp('variant', value)}
                    options={[
                        { value: 'default', label: PROPERTY_LABELS.RADIO_VARIANT_DEFAULT },
                        { value: 'primary', label: PROPERTY_LABELS.RADIO_VARIANT_PRIMARY },
                        { value: 'secondary', label: PROPERTY_LABELS.RADIO_VARIANT_SECONDARY },
                        { value: 'surface', label: PROPERTY_LABELS.RADIO_VARIANT_SURFACE }
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
                    value={String(currentProps.orientation || 'vertical')}
                    options={[
                        { value: 'vertical', label: PROPERTY_LABELS.ORIENTATION_VERTICAL },
                        { value: 'horizontal', label: PROPERTY_LABELS.ORIENTATION_HORIZONTAL },
                    ]}
                    onChange={(value) => updateProp('orientation', value)}
                    icon={Ratio}
                />
            </fieldset>

            {/* State Section */}
            <fieldset className="properties-group">
                <legend>State</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.VALUE}
                    value={String(currentProps.value || '')}
                    onChange={(value) => updateProp('value', value)}
                    icon={Binary}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DEFAULT_VALUE}
                    value={String(currentProps.defaultValue || '')}
                    onChange={(value) => updateProp('defaultValue', value)}
                    icon={CheckCheck}
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
            </fieldset>

            {/* Form Integration Section */}
            <fieldset className="properties-group">
                <legend>Form Integration</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.NAME}
                    value={String(currentProps.name || '')}
                    onChange={(value) => updateProp('name', value || undefined)}
                    icon={FormInput}
                    placeholder="radio-group-name"
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
                    placeholder="Radio group label for screen readers"
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

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>{PROPERTY_LABELS.RADIO_MANAGEMENT}</legend>

                {/* 라디오 버튼 개수 표시 */}
                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total radio options: {radioChildren.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual radio options from list to edit label, value, and state
                    </p>
                </div>

                {/* 라디오 버튼 목록 */}
                {radioChildren.length > 0 && (
                    <div className='tabs-list'>
                        {radioChildren.map((radio, index) => (
                            <div key={radio.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {String((radio.props as Record<string, unknown>).children) || `Option ${index + 1}`}
                                    {currentProps.value === (radio.props as Record<string, unknown>).value && ' ✓'}
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
                        onClick={async () => {
                            try {
                                // 새로운 Radio 요소를 Supabase에 직접 삽입
                                const newRadio = {
                                    id: ElementUtils.generateId(),
                                    page_id: currentPageId || '1',
                                    tag: 'Radio',
                                    props: {
                                        children: `Option ${(radioChildren.length || 0) + 1}`,
                                        value: `option${(radioChildren.length || 0) + 1}`,
                                        isDisabled: false,
                                        style: {},
                                        className: '',
                                    },
                                    parent_id: elementId,
                                    order_num: (radioChildren.length || 0) + 1,
                                };

                                const { data, error } = await supabase
                                    .from('elements')
                                    .upsert(newRadio, {
                                        onConflict: 'id'
                                    })
                                    .select()
                                    .single();

                                if (error) {
                                    console.error('Radio 추가 에러:', error);
                                    return;
                                }

                                if (data) {
                                    // 스토어에 새 요소 추가
                                    addElement(data);
                                    console.log('새 Radio 추가됨:', data);
                                }
                            } catch (error) {
                                console.error('Radio 추가 중 오류:', error);
                            }
                        }}
                    >
                        <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        {PROPERTY_LABELS.ADD_RADIO}
                    </button>
                </div>
            </fieldset>
        </div>
    );
}