import { useMemo } from 'react';
import { Tag, Binary, PointerOff, SquarePlus, Database, FileText, Type, Hash } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId } from '../../../inspector/components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';
import { ElementUtils } from '../../../../utils/element/elementUtils';
import { iconProps } from '../../../../utils/ui/uiConstants';

export function ListBoxItemEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const { addElement, currentPageId, setSelectedElement } = useStore();
    const storeElements = useStore((state) => state.elements);

    // Get customId from element in store
    const element = storeElements.find((el) => el.id === elementId);
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

    // Field 자식 요소들을 찾기
    const fieldChildren = useMemo(() => {
        return storeElements
            .filter((child) => child.parent_id === elementId && child.tag === 'Field')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [storeElements, elementId]);

    const hasFieldChildren = fieldChildren.length > 0;

    // Field 자식이 있으면 Field 관리 UI
    if (hasFieldChildren) {
        return (
            <div className="component-props">
                <fieldset className="properties-aria">
                    <legend className="fieldset-legend">
                        <Database size={16} /> Field Management
                    </legend>

                    <div className="tab-overview">
                        <p className="tab-overview-text">
                            Total fields: {fieldChildren.length}
                        </p>
                        <p className="tab-overview-help">
                            💡 This ListBoxItem uses Field elements for dynamic data rendering
                        </p>
                    </div>

                    {/* Field List */}
                    {fieldChildren.length > 0 && (
                        <div className="react-aria-ListBox">
                            {fieldChildren.map((field) => {
                                const fieldProps = field.props as Record<string, unknown>;
                                return (
                                    <div key={field.id} className="react-aria-ListBoxItem">
                                        <span className="tab-title">
                                            {String(fieldProps.key || 'Unnamed Field')}
                                            {fieldProps.type ? ` (${fieldProps.type})` : ''}
                                        </span>
                                        <button
                                            className="tab-edit-button"
                                            onClick={() => {
                                                setSelectedElement(
                                                    field.id,
                                                    fieldProps,
                                                    fieldProps.style as React.CSSProperties | undefined
                                                );
                                            }}
                                        >
                                            Edit
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add Field */}
                    <div className="tab-actions">
                        <button
                            className="control-button add"
                            onClick={async () => {
                                const newField = {
                                    id: ElementUtils.generateId(),
                                    page_id: currentPageId || '1',
                                    tag: 'Field',
                                    props: {
                                        key: `field${fieldChildren.length + 1}`,
                                        label: `Field ${fieldChildren.length + 1}`,
                                        type: 'string',
                                        showLabel: true,
                                        visible: true,
                                        style: {},
                                        className: '',
                                    },
                                    parent_id: elementId,
                                    order_num: (fieldChildren.length || 0) + 1,
                                };

                                const data = await ElementUtils.createChildElementWithParentCheck(
                                    newField,
                                    currentPageId || '1',
                                    elementId
                                );

                                addElement(data);
                            }}
                        >
                            <SquarePlus
                                color={iconProps.color}
                                strokeWidth={iconProps.stroke}
                                size={iconProps.size}
                            />
                            Add Field
                        </button>
                    </div>
                </fieldset>
            </div>
        );
    }

    // Field 자식이 없으면 기존 정적 아이템 편집 UI
    return (
        <div className="component-props">
            <PropertyCustomId
                label="ID"
                value={customId}
                elementId={elementId}
                onChange={updateCustomId}
                placeholder="listboxitem_1"
            />

            <fieldset className="properties-aria">
                <legend className="fieldset-legend">Static Item Properties</legend>
                <p className="tab-overview-help">
                    💡 This is a static ListBoxItem. Add Field elements to enable dynamic data rendering.
                </p>
            </fieldset>

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
                    label={PROPERTY_LABELS.VALUE}
                    value={String(currentProps.value || '')}
                    onChange={(value) => updateProp('value', value || undefined)}
                    icon={Binary}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.DESCRIPTION}
                    value={String(currentProps.description || '')}
                    onChange={(value) => updateProp('description', value || undefined)}
                    icon={FileText}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.TEXT_VALUE}
                    value={String(currentProps.textValue || '')}
                    onChange={(value) => updateProp('textValue', value || undefined)}
                    icon={Binary}
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
            </fieldset>

            {/* Accessibility Section */}
            <fieldset className="properties-group">
                <legend>Accessibility</legend>

                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="List box item label for screen readers"
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

            {/* Add Field Option */}
            <fieldset className="properties-aria">
                <legend className="fieldset-legend">
                    <Database size={16} /> Convert to Dynamic Item
                </legend>

                <div className="tab-overview">
                    <p className="tab-overview-help">
                        💡 Add Field elements to display dynamic data from API/Database
                    </p>
                </div>

                <div className="tab-actions">
                    <button
                        className="control-button add"
                        onClick={async () => {
                            const newField = {
                                id: ElementUtils.generateId(),
                                page_id: currentPageId || '1',
                                tag: 'Field',
                                props: {
                                    key: 'field1',
                                    label: 'Field 1',
                                    type: 'string',
                                    showLabel: true,
                                    visible: true,
                                    style: {},
                                    className: '',
                                },
                                parent_id: elementId,
                                order_num: 1,
                            };

                            const data = await ElementUtils.createChildElementWithParentCheck(
                                newField,
                                currentPageId || '1',
                                elementId
                            );

                            addElement(data);
                        }}
                    >
                        <SquarePlus
                            color={iconProps.color}
                            strokeWidth={iconProps.stroke}
                            size={iconProps.size}
                        />
                        Add First Field
                    </button>
                </div>
            </fieldset>
        </div>
    );
}
