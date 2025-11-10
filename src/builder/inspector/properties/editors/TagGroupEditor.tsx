import { useState, useEffect, useMemo } from 'react';
import { Type, Tag, SquarePlus, Trash, PointerOff, FileText, AlertTriangle, PenOff, MousePointer, ToggleLeft, ToggleRight, Layout, PencilRuler, Hash, FormInput, CheckSquare } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect, PropertyCustomId } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores';
import { ElementUtils } from '../../../../utils/elementUtils';
import { generateCustomId } from '../../../utils/idGeneration';

interface SelectedTagState {
    parentId: string;
    tagIndex: number;
}

export function TagGroupEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedTag, setSelectedTag] = useState<SelectedTagState | null>(null);
    const { addElement, currentPageId, updateElementProps, setElements, elements: storeElements } = useStore();

    // Get customId from element in store
    const element = storeElements.find((el) => el.id === elementId);
    const customId = element?.customId || '';

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedTag(null);
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

    const tagChildren = useMemo(() => {
        return storeElements
            .filter((child) => child.parent_id === elementId && child.tag === 'Tag')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [storeElements, elementId]);

    if (selectedTag && selectedTag.parentId === elementId) {
        const currentTag = tagChildren[selectedTag.tagIndex];
        if (!currentTag) return null;

        return (
            <div className="component-props">
                <fieldset className="properties-aria">
                    <PropertyInput
                        label={PROPERTY_LABELS.TEXT}
                        value={String((currentTag.props as Record<string, unknown>).children || '')}
                        onChange={(value) => {
                            const updatedProps = {
                                ...currentTag.props,
                                children: value
                            };
                            updateElementProps(currentTag.id, updatedProps);
                        }}
                        icon={Type}
                    />

                    <PropertySwitch
                        label={PROPERTY_LABELS.DISABLED}
                        isSelected={Boolean((currentTag.props as Record<string, unknown>).isDisabled)}
                        onChange={(checked) => {
                            const updatedProps = {
                                ...currentTag.props,
                                isDisabled: checked
                            };
                            updateElementProps(currentTag.id, updatedProps);
                        }}
                        icon={PointerOff}
                    />

                    <div className='tab-actions'>
                        <button
                            className='control-button delete'
                            onClick={async () => {
                                try {
                                    const { error } = await supabase
                                        .from('elements')
                                        .delete()
                                        .eq('id', currentTag.id);

                                    if (error) {
                                        console.error('Tag 삭제 에러:', error);
                                        return;
                                    }

                                    const updatedElements = storeElements.filter(el => el.id !== currentTag.id);
                                    setElements(updatedElements);
                                    setSelectedTag(null);
                                } catch (error) {
                                    console.error('Tag 삭제 중 오류:', error);
                                }
                            }}
                        >
                            <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                            Delete Tag
                        </button>
                    </div>
                </fieldset>

                <div className='tab-actions'>
                    <button
                        className='control-button secondary'
                        onClick={() => setSelectedTag(null)}
                    >
                        Back to Tag Group Settings
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="component-props">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="taggroup_1"
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
                        { value: 'default', label: PROPERTY_LABELS.TAG_VARIANT_DEFAULT },
                        { value: 'primary', label: PROPERTY_LABELS.TAG_VARIANT_PRIMARY },
                        { value: 'secondary', label: PROPERTY_LABELS.TAG_VARIANT_SECONDARY },
                        { value: 'surface', label: PROPERTY_LABELS.TAG_VARIANT_SURFACE }
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
                    icon={PencilRuler}
                />
            </fieldset>

            {/* State Section */}
            <fieldset className="properties-group">
                <legend>State</legend>

                <PropertySelect
                    label={PROPERTY_LABELS.SELECTION_MODE}
                    value={String(currentProps.selectionMode || 'none')}
                    onChange={(value) => updateProp('selectionMode', value)}
                    options={[
                        { value: 'none', label: PROPERTY_LABELS.NONE },
                        { value: 'single', label: PROPERTY_LABELS.SINGLE },
                        { value: 'multiple', label: PROPERTY_LABELS.MULTIPLE }
                    ]}
                    icon={MousePointer}
                />

                <PropertySelect
                    label={PROPERTY_LABELS.SELECTION_BEHAVIOR}
                    value={String(currentProps.selectionBehavior || 'toggle')}
                    onChange={(value) => updateProp('selectionBehavior', value)}
                    options={[
                        { value: 'toggle', label: PROPERTY_LABELS.TOGGLE },
                        { value: 'replace', label: PROPERTY_LABELS.REPLACE }
                    ]}
                    icon={ToggleLeft}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.DISALLOW_EMPTY_SELECTION}
                    isSelected={Boolean(currentProps.disallowEmptySelection)}
                    onChange={(checked) => updateProp('disallowEmptySelection', checked)}
                    icon={ToggleRight}
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

                <PropertySwitch
                    label={PROPERTY_LABELS.ALLOWS_REMOVING}
                    isSelected={Boolean(currentProps.allowsRemoving)}
                    onChange={(checked) => updateProp('allowsRemoving', checked)}
                    icon={Trash}
                />

                <PropertySwitch
                    label={PROPERTY_LABELS.ALLOWS_CUSTOM_VALUE}
                    isSelected={Boolean(currentProps.allowsCustomValue)}
                    onChange={(checked) => updateProp('allowsCustomValue', checked)}
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
                    placeholder="tag-group-name"
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
                    placeholder="Tag group label for screen readers"
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
                <legend className='fieldset-legend'>{PROPERTY_LABELS.TAG_MANAGEMENT}</legend>

                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total tags: {tagChildren.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual tags from list to edit text and state
                    </p>
                </div>

                {/* Removed Items Recovery (ColumnMapping 모드) */}
                {Array.isArray(currentProps.removedItemIds) && (currentProps.removedItemIds as string[]).length > 0 && (
                    <div className='tab-overview' style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--color-warning-bg, #fff3cd)', borderRadius: 'var(--radius-md)' }}>
                        <p className='tab-overview-text' style={{ color: 'var(--color-warning-text, #856404)' }}>
                            🗑️ Removed items: {(currentProps.removedItemIds as string[]).length}
                        </p>
                        <button
                            className='control-button secondary'
                            style={{ marginTop: '8px', width: '100%' }}
                            onClick={() => {
                                updateProp('removedItemIds', []);
                                console.log('✅ All removed items restored');
                            }}
                        >
                            ♻️ Restore All Removed Items
                        </button>
                    </div>
                )}

                {tagChildren.length > 0 && (
                    <div className='tabs-list'>
                        {tagChildren.map((tag, index) => (
                            <div key={tag.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {String((tag.props as Record<string, unknown>).children) || `Tag ${index + 1}`}
                                </span>
                                <button
                                    className='tab-edit-button'
                                    onClick={() => setSelectedTag({ parentId: elementId, tagIndex: index })}
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
                                const newTag = {
                                    id: ElementUtils.generateId(),
                                    customId: generateCustomId('Tag', storeElements),
                                    page_id: currentPageId || '1',
                                    tag: 'Tag',
                                    props: {
                                        children: `Tag ${(tagChildren.length || 0) + 1}`,
                                        isDisabled: false,
                                        style: {},
                                        className: '',
                                    },
                                    parent_id: elementId,
                                    order_num: (tagChildren.length || 0) + 1,
                                };

                                // Use ElementUtils.createElement to handle customId conversion
                                const data = await ElementUtils.createElement(newTag);
                                addElement(data);
                                console.log('새 Tag 추가됨:', data);
                            } catch (error) {
                                console.error('Tag 추가 중 오류:', error);
                            }
                        }}
                    >
                        <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        Add Tag
                    </button>
                </div>
            </fieldset>
        </div>
    );
}
