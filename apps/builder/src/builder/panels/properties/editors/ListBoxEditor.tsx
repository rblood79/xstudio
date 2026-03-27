import { useEffect, memo, useMemo } from "react";
import {
  SquarePlus,
  Trash,
  PointerOff,
  Binary,
  Search,
  Filter,
  Tag,
} from "lucide-react";
import { ListBoxSpec } from "@xstudio/specs";
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

export const ListBoxHybridAfterSections = memo(
  function ListBoxHybridAfterSections({
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
      childTag: "ListBoxItem",
      defaultItemProps: (index) => ({
        label: `Item ${index + 1}`,
        value: `item${index + 1}`,
      }),
    });

    useEffect(() => {
      deselectItem();
    }, [deselectItem, elementId]);

    const filteringSection = useMemo(
      () => (
        <PropertySection title="Filtering" icon={Filter}>
          <PropertyInput
            label="필터 텍스트"
            value={String(currentProps.filterText || "")}
            onChange={(value) => onUpdate({ filterText: value || undefined })}
            icon={Search}
            placeholder="검색어 입력..."
          />

          <PropertyInput
            label="필터 대상 필드"
            value={
              Array.isArray(currentProps.filterFields)
                ? currentProps.filterFields.join(", ")
                : ""
            }
            onChange={(value) => {
              const fields = value
                .split(",")
                .map((field) => field.trim())
                .filter((field) => field.length > 0);
              onUpdate({
                filterFields: fields.length > 0 ? fields : undefined,
              });
            }}
            icon={Filter}
            placeholder="label, name, title"
          />
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
          </div>

          {children.length > 0 && (
            <div className="react-aria-ListBox">
              {children.map((item, index) => (
                <div key={item.id} className="react-aria-ListBoxItem">
                  <span className="tab-title">
                    {String(
                      (item.props as Record<string, unknown>).label ||
                        `Item ${index + 1}`,
                    )}
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
              Add Item
            </button>
          </div>
        </PropertySection>
      ),
      [addItem, children, selectItem],
    );

    if (selectedItemIndex !== null) {
      const currentItem = children[selectedItemIndex];
      if (!currentItem) return null;

      return (
        <>
          <div className="properties-aria">
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
              icon={Binary}
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
                Delete This Item
              </button>
            </div>
          </div>

          <div className="tab-actions">
            <button className="control-button secondary" onClick={deselectItem}>
              {PROPERTY_LABELS.BACK_TO_LISTBOX_SETTINGS}
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

export const ListBoxEditor = memo(function ListBoxEditor(
  props: PropertyEditorProps,
) {
  return (
    <GenericPropertyEditor
      {...props}
      spec={ListBoxSpec}
      renderAfterSections={(sectionProps) => (
        <ListBoxHybridAfterSections {...sectionProps} />
      )}
    />
  );
});
