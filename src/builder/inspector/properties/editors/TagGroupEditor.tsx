import { useState, useEffect, useMemo } from 'react';
import { Type, Tag, SquarePlus, Trash, PointerOff, FileText, AlertTriangle, PenOff, MousePointer, ToggleLeft, ToggleRight } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertySelect } from '../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores';
import { ElementUtils } from '../../../../utils/elementUtils';

interface SelectedTagState {
    parentId: string;
    tagIndex: number;
}

export function TagGroupEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const [selectedTag, setSelectedTag] = useState<SelectedTagState | null>(null);
    const { addElement, currentPageId, updateElementProps, setElements, elements: storeElements } = useStore();

    useEffect(() => {
        setSelectedTag(null);
    }, [elementId]);

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
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
            <fieldset className="properties-aria">
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

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>{PROPERTY_LABELS.SELECTION_SETTINGS}</legend>

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

                                const { data, error } = await supabase
                                    .from('elements')
                                    .upsert(newTag, {
                                        onConflict: 'id'
                                    })
                                    .select()
                                    .single();

                                if (error) {
                                    console.error('Tag 추가 에러:', error);
                                    return;
                                }

                                if (data) {
                                    addElement(data);
                                    console.log('새 Tag 추가됨:', data);
                                }
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
