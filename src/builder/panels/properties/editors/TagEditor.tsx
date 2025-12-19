import { memo, useMemo } from "react";
import { Type, PointerOff, Hash, Database, SquarePlus } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId, PropertySection } from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';
import { ElementUtils } from '../../../../utils/element/elementUtils';
import { iconProps } from '../../../../utils/ui/uiConstants';
import { getDB } from '../../../../lib/db';
import { generateCustomId } from '../../../utils/idGeneration';
import type { Element } from '../../../../types/core/store.types';

export const TagEditor = memo(function TagEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
    const { addElement, currentPageId, setSelectedElement } = useStore();
    const storeElements = useStore((state) => state.elements);

    // Get customId from element in store
    const element = storeElements.find((el) => el.id === elementId);
    const customId = element?.customId || "";

    const updateProp = (key: string, value: unknown) => {
        const updatedProps = {
            ...currentProps,
            [key]: value
        };
        onUpdate(updatedProps);
    };

    // Field 자식 요소들을 찾기
    const fieldChildren = useMemo(() => {
        return storeElements
            .filter((child) => child.parent_id === elementId && child.tag === "Field")
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [storeElements, elementId]);

    const hasFieldChildren = fieldChildren.length > 0;

    // Field 자식이 있으면 Field 관리 UI
    if (hasFieldChildren) {
        return (
            <>
                <div className="properties-aria">
                    <legend className="fieldset-legend">
                        <Database size={iconProps.size} /> Field Management
                    </legend>

                    <div className="tab-overview">
                        <p className="tab-overview-text">
                            Total fields: {fieldChildren.length}
                        </p>
                        <p className="section-overview-help">
                            💡 This Tag uses Field elements for dynamic data rendering
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
                                            {String(fieldProps.fieldKey || fieldProps.key || "Unnamed Field")}
                                            {fieldProps.type ? ` (${fieldProps.type})` : ""}
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
                                const pageIdToUse = currentPageId;
                                if (!pageIdToUse) {
                                    alert("페이지 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.");
                                    return;
                                }

                                const { elements } = useStore.getState();
                                const maxOrderNum = Math.max(
                                    0,
                                    ...fieldChildren.map((el) => el.order_num || 0)
                                );

                                const newField: Element = {
                                    id: ElementUtils.generateId(),
                                    customId: generateCustomId("Field", elements),
                                    page_id: pageIdToUse,
                                    tag: "Field",
                                    props: {
                                        fieldKey: `field${fieldChildren.length + 1}`,
                                        label: `Field ${fieldChildren.length + 1}`,
                                        type: "string",
                                        showLabel: false,
                                        visible: true,
                                        style: {},
                                        className: "",
                                    } as Record<string, unknown>,
                                    parent_id: elementId,
                                    order_num: maxOrderNum + 1,
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                };

                                try {
                                    const db = await getDB();
                                    const inserted = await db.elements.insert(newField);
                                    addElement(inserted);
                                    console.log("✅ [IndexedDB] Field created successfully");
                                } catch (err) {
                                    console.error("❌ [IndexedDB] Failed to create Field:", err);
                                    alert("Field 추가 중 오류가 발생했습니다. 다시 시도해주세요.");
                                }
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
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-color-secondary)', marginTop: '8px' }}>
                    💡 Variant and size are controlled by the parent TagGroup
                </p>
            </>
        );
    }

    // Field 자식이 없으면 기존 정적 아이템 편집 UI
    return (
        <>
            {/* Basic */}
            <PropertySection title="Basic">
                <PropertyCustomId
                    label="ID"
                    value={customId}
                    elementId={elementId}
                    placeholder="tag_1"
                />
            </PropertySection>

            <PropertySection title="Static Item Properties">
                <p className="section-overview-help">
                    💡 This is a static Tag. Add Field elements to enable dynamic data rendering.
                </p>
            </PropertySection>

            {/* Content Section */}
            <PropertySection title="Content">
                <PropertyInput
                    label={PROPERTY_LABELS.TEXT}
                    value={String(currentProps.children || '')}
                    onChange={(value) => updateProp('children', value)}
                    icon={Type}
                />

                <PropertyInput
                    label={PROPERTY_LABELS.TEXT_VALUE}
                    value={String(currentProps.textValue || '')}
                    onChange={(value) => updateProp('textValue', value || undefined)}
                    icon={Type}
                    placeholder="Text for accessibility and filtering"
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
            </PropertySection>

            {/* Accessibility Section */}
            <PropertySection title="Accessibility">
                <PropertyInput
                    label={PROPERTY_LABELS.ARIA_LABEL}
                    value={String(currentProps['aria-label'] || '')}
                    onChange={(value) => updateProp('aria-label', value || undefined)}
                    icon={Type}
                    placeholder="Tag label for screen readers"
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

            {/* Add Field Option */}
            <div className="properties-aria">
                <legend className="fieldset-legend">
                    <Database size={iconProps.size} /> Convert to Dynamic Item
                </legend>

                <div className="tab-overview">
                    <p className="section-overview-help">
                        💡 Add Field elements to display dynamic data from DataTable
                    </p>
                </div>

                <div className="tab-actions">
                    <button
                        className="control-button add"
                        onClick={async () => {
                            const pageIdToUse = currentPageId;
                            if (!pageIdToUse) {
                                alert("페이지 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.");
                                return;
                            }

                            const { elements } = useStore.getState();

                            const newField: Element = {
                                id: ElementUtils.generateId(),
                                customId: generateCustomId("Field", elements),
                                page_id: pageIdToUse,
                                tag: "Field",
                                props: {
                                    fieldKey: "name",
                                    label: "Name",
                                    type: "string",
                                    showLabel: false,
                                    visible: true,
                                    style: {},
                                    className: "",
                                } as Record<string, unknown>,
                                parent_id: elementId,
                                order_num: 1,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            };

                            try {
                                const db = await getDB();
                                const inserted = await db.elements.insert(newField);
                                addElement(inserted);
                                console.log("✅ [IndexedDB] Field created successfully");
                            } catch (err) {
                                console.error("❌ [IndexedDB] Failed to create Field:", err);
                                alert("Field 추가 중 오류가 발생했습니다. 다시 시도해주세요.");
                            }
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
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-color-secondary)', marginTop: '8px' }}>
                💡 Variant and size are controlled by the parent TagGroup
            </p>
        </>
    );
});
