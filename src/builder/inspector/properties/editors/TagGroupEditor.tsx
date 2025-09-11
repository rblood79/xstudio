import { useState, useEffect, useMemo } from 'react';
import { Type, Tag, SquarePlus, Trash, PointerOff, FileText, AlertTriangle, PenOff, MousePointer, ToggleLeft, ToggleRight } from 'lucide-react';
import { PropertyInput, PropertyCheckbox, PropertySelect } from '../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/labels';
import { supabase } from '../../../../env/supabase.client';
import { useStore } from '../../../stores';

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
                        value={String(currentTag.props.children || '')}
                        onChange={(value) => {
                            const updatedProps = {
                                ...currentTag.props,
                                children: value
                            };
                            updateElementProps(currentTag.id, updatedProps);
                        }}
                        icon={Type}
                    />

                    <PropertyCheckbox
                        label={PROPERTY_LABELS.DISABLED}
                        checked={Boolean(currentTag.props.isDisabled)}
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

                <PropertyCheckbox
                    label="Allows Removing"
                    checked={Boolean(currentProps.allowsRemoving)}
                    onChange={(checked) => updateProp('allowsRemoving', checked)}
                    icon={Trash}
                />

                <PropertyCheckbox
                    label="Allows Custom Value"
                    checked={Boolean(currentProps.allowsCustomValue)}
                    onChange={(checked) => updateProp('allowsCustomValue', checked)}
                    icon={PenOff}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Selection Settings</legend>

                <PropertySelect
                    label="Selection Mode"
                    value={String(currentProps.selectionMode || 'none')}
                    onChange={(value) => updateProp('selectionMode', value)}
                    options={[
                        { id: 'none', label: 'None' },
                        { id: 'single', label: 'Single' },
                        { id: 'multiple', label: 'Multiple' }
                    ]}
                    icon={MousePointer}
                />

                <PropertySelect
                    label="Selection Behavior"
                    value={String(currentProps.selectionBehavior || 'toggle')}
                    onChange={(value) => updateProp('selectionBehavior', value)}
                    options={[
                        { id: 'toggle', label: 'Toggle' },
                        { id: 'replace', label: 'Replace' }
                    ]}
                    icon={ToggleLeft}
                />

                <PropertyCheckbox
                    label="Disallow Empty Selection"
                    checked={Boolean(currentProps.disallowEmptySelection)}
                    onChange={(checked) => updateProp('disallowEmptySelection', checked)}
                    icon={ToggleRight}
                />
            </fieldset>

            <fieldset className="properties-aria">
                <legend className='fieldset-legend'>Tag Management</legend>

                <div className='tab-overview'>
                    <p className='tab-overview-text'>
                        Total tags: {tagChildren.length || 0}
                    </p>
                    <p className='tab-overview-help'>
                        💡 Select individual tags from list to edit text and state
                    </p>
                </div>

                {tagChildren.length > 0 && (
                    <div className='tabs-list'>
                        {tagChildren.map((tag, index) => (
                            <div key={tag.id} className='tab-list-item'>
                                <span className='tab-title'>
                                    {tag.props.children || `Tag ${index + 1}`}
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
                                    id: crypto.randomUUID(),
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
                                    .insert(newTag)
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
