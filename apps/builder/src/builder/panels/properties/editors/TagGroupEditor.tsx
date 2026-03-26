import { useState, useMemo, memo, useCallback } from "react";
import {
  Type,
  Tag,
  SquarePlus,
  Trash,
  PointerOff,
  FileText,
  AlertTriangle,
  Database,
  Search,
} from "lucide-react";
import { TagGroupSpec } from "@xstudio/specs";
import {
  PropertyInput,
  PropertySwitch,
  PropertySection,
  PropertyDataBinding,
  type DataBindingValue,
} from "../../../components";
import { GenericPropertyEditor } from "../generic";
import { PropertyEditorProps } from "../types/editorTypes";
import { iconProps } from "../../../../utils/ui/uiConstants";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { getDB } from "../../../../lib/db";
import { useStore } from "../../../stores";
import { ElementUtils } from "../../../../utils/element/elementUtils";
import { generateCustomId } from "../../../utils/idGeneration";

export const TagGroupHybridAfterSections = memo(
  function TagGroupHybridAfterSections({
    elementId,
    currentProps,
    onUpdate,
  }: PropertyEditorProps) {
    const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
    const addElement = useStore((state) => state.addElement);
    const currentPageId = useStore((state) => state.currentPageId);
    const updateElementProps = useStore((state) => state.updateElementProps);
    const removeElement = useStore((state) => state.removeElement);
    const storeElements = useStore((state) => state.elements);

    const updateProp = useCallback(
      (key: string, value: unknown) => {
        onUpdate({ [key]: value });
      },
      [onUpdate],
    );

    const tagChildren = useMemo(() => {
      return storeElements
        .filter((child) => child.parent_id === elementId && child.tag === "Tag")
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [storeElements, elementId]);

    const selectedTag = useMemo(
      () => tagChildren.find((tag) => tag.id === selectedTagId) || null,
      [selectedTagId, tagChildren],
    );

    const handleDataBindingChange = useCallback(
      (binding: DataBindingValue | null) => {
        onUpdate({ dataBinding: binding || undefined });
      },
      [onUpdate],
    );

    const contentSection = useMemo(
      () => (
        <PropertySection title="Content">
          <PropertyInput
            label={PROPERTY_LABELS.LABEL}
            value={String(currentProps.label || "")}
            onChange={(value) => {
              updateProp("label", value);
              const labelChild = storeElements.find(
                (el) => el.parent_id === elementId && el.tag === "Label",
              );
              if (labelChild) {
                updateElementProps(labelChild.id, {
                  ...labelChild.props,
                  children: value,
                });
              }
            }}
            icon={Tag}
          />

          <PropertyInput
            label={PROPERTY_LABELS.DESCRIPTION}
            value={String(currentProps.description || "")}
            onChange={(value) => updateProp("description", value)}
            icon={FileText}
          />

          <PropertyInput
            label={PROPERTY_LABELS.ERROR_MESSAGE}
            value={String(currentProps.errorMessage || "")}
            onChange={(value) => updateProp("errorMessage", value)}
            icon={AlertTriangle}
          />
        </PropertySection>
      ),
      [
        currentProps.description,
        currentProps.errorMessage,
        currentProps.label,
        elementId,
        storeElements,
        updateElementProps,
        updateProp,
      ],
    );

    const filteringSection = useMemo(
      () => (
        <PropertySection title="Filtering">
          <PropertyInput
            label="Filter Text"
            value={String(currentProps.filterText || "")}
            onChange={(value) => updateProp("filterText", value || undefined)}
            placeholder="Search..."
            icon={Search}
          />

          <PropertyInput
            label="Filter Fields"
            value={String(((currentProps.filterFields as string[]) || []).join(", "))}
            onChange={(value) => {
              const fields = value
                .split(",")
                .map((field) => field.trim())
                .filter(Boolean);
              updateProp("filterFields", fields.length > 0 ? fields : undefined);
            }}
            placeholder="label, name, title"
            icon={FileText}
          />
        </PropertySection>
      ),
      [currentProps.filterFields, currentProps.filterText, updateProp],
    );

    const dataBindingSection = useMemo(
      () => (
        <PropertySection title="Data Binding" icon={Database}>
          <PropertyDataBinding
            label="데이터 소스"
            value={currentProps.dataBinding as DataBindingValue | undefined}
            onChange={handleDataBindingChange}
          />
        </PropertySection>
      ),
      [currentProps.dataBinding, handleDataBindingChange],
    );

    const tagManagementSection = useMemo(
      () => (
        <PropertySection title={PROPERTY_LABELS.TAG_MANAGEMENT}>
          <div className="tab-overview">
            <p className="tab-overview-text">Total tags: {tagChildren.length || 0}</p>
          </div>

          {Array.isArray(currentProps.removedItemIds) &&
            (currentProps.removedItemIds as string[]).length > 0 && (
              <div
                className="tab-overview"
                style={{
                  marginTop: "12px",
                  padding: "12px",
                  backgroundColor: "var(--color-warning-bg, #fff3cd)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <p className="tab-overview-text">
                  Removed items: {(currentProps.removedItemIds as string[]).length}
                </p>
                <button
                  className="control-button secondary"
                  style={{ marginTop: "8px", width: "100%" }}
                  onClick={() => updateProp("removedItemIds", [])}
                >
                  Restore All Removed Items
                </button>
              </div>
            )}

          {tagChildren.length > 0 && (
            <div className="tabs-list">
              {tagChildren.map((tag, index) => (
                <div key={tag.id} className="tab-list-item">
                  <span className="tab-title">
                    {String((tag.props as Record<string, unknown>).children) ||
                      `Tag ${index + 1}`}
                  </span>
                  <button
                    className="tab-edit-button"
                    onClick={() => setSelectedTagId(tag.id)}
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="tab-actions">
            <button
              className="control-button add"
              onClick={async () => {
                try {
                  const newTag = {
                    id: ElementUtils.generateId(),
                    customId: generateCustomId("Tag", storeElements),
                    page_id: currentPageId || "1",
                    tag: "Tag",
                    props: {
                      children: `Tag ${(tagChildren.length || 0) + 1}`,
                      isDisabled: false,
                      style: {},
                      className: "",
                    },
                    parent_id: elementId,
                    order_num: (tagChildren.length || 0) + 1,
                  };

                  const db = await getDB();
                  const insertedTag = await db.elements.insert(newTag);
                  addElement(insertedTag);
                } catch (error) {
                  console.error("Tag 추가 중 오류:", error);
                }
              }}
            >
              <SquarePlus
                color={iconProps.color}
                strokeWidth={iconProps.strokeWidth}
                size={iconProps.size}
              />
              Add Tag
            </button>
          </div>
        </PropertySection>
      ),
      [
        addElement,
        currentPageId,
        currentProps.removedItemIds,
        elementId,
        storeElements,
        tagChildren,
        updateProp,
      ],
    );

    if (selectedTag) {
      return (
        <>
          <div className="properties-aria">
            <PropertyInput
              label={PROPERTY_LABELS.TEXT}
              value={String(
                (selectedTag.props as Record<string, unknown>).children || "",
              )}
              onChange={(value) => {
                updateElementProps(selectedTag.id, {
                  ...selectedTag.props,
                  children: value,
                });
              }}
              icon={Type}
            />

            <PropertySwitch
              label={PROPERTY_LABELS.DISABLED}
              isSelected={Boolean(
                (selectedTag.props as Record<string, unknown>).isDisabled,
              )}
              onChange={(checked) => {
                updateElementProps(selectedTag.id, {
                  ...selectedTag.props,
                  isDisabled: checked,
                });
              }}
              icon={PointerOff}
            />

            <div className="tab-actions">
              <button
                className="control-button delete"
                onClick={async () => {
                  try {
                    const db = await getDB();
                    await db.elements.delete(selectedTag.id);
                    await removeElement(selectedTag.id);
                    setSelectedTagId(null);
                  } catch (error) {
                    console.error("Tag 삭제 중 오류:", error);
                  }
                }}
              >
                <Trash
                  color={iconProps.color}
                  strokeWidth={iconProps.strokeWidth}
                  size={iconProps.size}
                />
                Delete Tag
              </button>
            </div>
          </div>

          <div className="tab-actions">
            <button
              className="control-button secondary"
              onClick={() => setSelectedTagId(null)}
            >
              Back to Tag Group Settings
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        {contentSection}
        {filteringSection}
        {dataBindingSection}
        {tagManagementSection}
      </>
    );
  },
);

export const TagGroupEditor = memo(function TagGroupEditor(
  props: PropertyEditorProps,
) {
  return (
    <GenericPropertyEditor
      {...props}
      spec={TagGroupSpec}
      renderAfterSections={(sectionProps) => (
        <TagGroupHybridAfterSections {...sectionProps} />
      )}
    />
  );
});
