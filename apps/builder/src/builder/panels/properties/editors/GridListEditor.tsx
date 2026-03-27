import { useEffect, memo, useCallback, useMemo } from "react";
import {
  Tag,
  SquarePlus,
  Trash,
  PointerOff,
  FileText,
  Search,
} from "lucide-react";
import { GridListSpec } from "@xstudio/specs";
import {
  PropertyInput,
  PropertySwitch,
  PropertySection,
} from "../../../components";
import { GenericPropertyEditor } from "../generic";
import { PropertyEditorProps } from "../types/editorTypes";
import { iconProps } from "../../../../utils/ui/uiConstants";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useCollectionItemManager } from "@/builder/hooks";

export const GridListHybridAfterSections = memo(
  function GridListHybridAfterSections({
    elementId,
    currentProps,
    onUpdate,
  }: PropertyEditorProps) {
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
      childTag: "GridListItem",
      defaultItemProps: (index) => ({
        label: `Item ${index + 1}`,
        value: `item${index + 1}`,
        description: "",
        textValue: `item${index + 1}`,
      }),
    });

    useEffect(() => {
      deselectItem();
    }, [elementId, deselectItem]);

    const filteringSection = useMemo(
      () => (
        <PropertySection title="Filtering">
          <PropertyInput
            label="Filter Text"
            value={String(currentProps.filterText || "")}
            onChange={(value) => onUpdate({ filterText: value || undefined })}
            placeholder="Search..."
            icon={Search}
          />

          <PropertyInput
            label="Filter Fields"
            value={String(
              ((currentProps.filterFields as string[]) || []).join(", "),
            )}
            onChange={(value) => {
              const fields = value
                .split(",")
                .map((field) => field.trim())
                .filter(Boolean);
              onUpdate({
                filterFields: fields.length > 0 ? fields : undefined,
              });
            }}
            placeholder="label, name, title"
            icon={FileText}
          />
          <p className="property-help">쉼표로 구분하여 검색할 필드 지정</p>
        </PropertySection>
      ),
      [currentProps.filterFields, currentProps.filterText, onUpdate],
    );

    const itemManagementSection = useMemo(
      () => (
        <PropertySection title={PROPERTY_LABELS.ITEM_MANAGEMENT}>
          <div className="tab-overview">
            <p className="tab-overview-text">
              Total items: {children.length || 0}
            </p>
            <p className="section-overview-help">
              Select individual items to edit label, value, description, and
              state
            </p>
          </div>

          {children.length > 0 && (
            <div className="tabs-list">
              {children.map((item, index) => (
                <div key={item.id} className="tab-list-item">
                  <span className="tab-title">
                    {String((item.props as Record<string, unknown>).label) ||
                      `Item ${index + 1}`}
                  </span>
                  <button
                    className="tab-edit-button"
                    onClick={() => selectItem(index)}
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="tab-actions">
            <button className="control-button add" onClick={addItem}>
              <SquarePlus
                color={iconProps.color}
                strokeWidth={iconProps.strokeWidth}
                size={iconProps.size}
              />
              {PROPERTY_LABELS.ADD_ITEM}
            </button>
          </div>
        </PropertySection>
      ),
      [children, selectItem, addItem],
    );

    if (selectedItemIndex !== null) {
      const currentItem = children[selectedItemIndex];
      if (!currentItem) return null;

      return (
        <>
          <PropertySection title={PROPERTY_LABELS.ITEM_PROPERTIES}>
            <PropertyInput
              label={PROPERTY_LABELS.LABEL}
              value={String(
                (currentItem.props as Record<string, unknown>).label || "",
              )}
              onChange={(value) =>
                updateItem(currentItem.id, {
                  ...currentItem.props,
                  label: value,
                })
              }
              icon={Tag}
            />

            <PropertyInput
              label={PROPERTY_LABELS.VALUE}
              value={String(
                (currentItem.props as Record<string, unknown>).value || "",
              )}
              onChange={(value) =>
                updateItem(currentItem.id, {
                  ...currentItem.props,
                  value,
                })
              }
              icon={Tag}
            />

            <PropertyInput
              label={PROPERTY_LABELS.DESCRIPTION}
              value={String(
                (currentItem.props as Record<string, unknown>).description ||
                  "",
              )}
              onChange={(value) =>
                updateItem(currentItem.id, {
                  ...currentItem.props,
                  description: value,
                })
              }
              icon={FileText}
            />

            <PropertyInput
              label={PROPERTY_LABELS.TEXT_VALUE}
              value={String(
                (currentItem.props as Record<string, unknown>).textValue || "",
              )}
              onChange={(value) =>
                updateItem(currentItem.id, {
                  ...currentItem.props,
                  textValue: value,
                })
              }
              icon={FileText}
            />

            <PropertySwitch
              label={PROPERTY_LABELS.DISABLED}
              isSelected={Boolean(
                (currentItem.props as Record<string, unknown>).isDisabled,
              )}
              onChange={(checked) =>
                updateItem(currentItem.id, {
                  ...currentItem.props,
                  isDisabled: checked,
                })
              }
              icon={PointerOff}
            />

            <div className="tab-actions">
              <button
                className="control-button delete"
                onClick={() => deleteItem(currentItem.id)}
              >
                <Trash
                  color={iconProps.color}
                  strokeWidth={iconProps.strokeWidth}
                  size={iconProps.size}
                />
                {PROPERTY_LABELS.DELETE_THIS_ITEM}
              </button>
            </div>
          </PropertySection>

          <div className="tab-actions">
            <button className="control-button secondary" onClick={deselectItem}>
              {PROPERTY_LABELS.BACK_TO_GRID_LIST_SETTINGS}
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        {filteringSection}
        {itemManagementSection}
      </>
    );
  },
);

export const GridListEditor = memo(function GridListEditor(
  props: PropertyEditorProps,
) {
  return (
    <GenericPropertyEditor
      {...props}
      spec={GridListSpec}
      renderAfterSections={(sectionProps) => (
        <GridListHybridAfterSections {...sectionProps} />
      )}
    />
  );
});
