import { useEffect, memo, useCallback, useMemo } from "react";
import {
  SquarePlus,
  Trash,
  PointerOff,
  Binary,
  Database,
  Wand2,
  Search,
  Filter,
  Tag,
} from "lucide-react";
import { ListBoxSpec } from "@xstudio/specs";
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
import { useStore } from "../../../stores";
import { useDataTables } from "../../../stores/data";
import { useCollectionItemManager } from "@/builder/hooks";
import { ElementUtils } from "../../../../utils/element/elementUtils";
import { generateCustomId } from "../../../utils/idGeneration";
import { getDB } from "../../../../lib/db";
import type { Element } from "../../../../types/core/store.types";

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

    const addElement = useStore((state) => state.addElement);
    const removeElement = useStore((state) => state.removeElement);
    const currentPageId = useStore((state) => state.currentPageId);

    const dataBindingTableName = useMemo(() => {
      const dataBinding = currentProps.dataBinding as DataBindingValue | undefined;
      if (!dataBinding || dataBinding.source !== "dataTable" || !dataBinding.name) {
        return null;
      }
      return dataBinding.name;
    }, [currentProps.dataBinding]);

    const dataTables = useDataTables();
    const selectedTable = useMemo(() => {
      if (!dataBindingTableName) return null;
      return dataTables.find((table) => table.name === dataBindingTableName) || null;
    }, [dataBindingTableName, dataTables]);
    const selectedSchema = selectedTable?.schema || null;

    const getChildElements = useCallback(() => {
      return useStore.getState().elements.filter((el) => el.parent_id === elementId);
    }, [elementId]);

    const templateItem = useMemo(() => {
      const childElements = getChildElements();
      return childElements.find((el) => el.tag === "ListBoxItem");
    }, [getChildElements]);

    const existingFields = useMemo(() => {
      if (!templateItem?.id) return [];
      return useStore
        .getState()
        .elements.filter((el) => el.parent_id === templateItem.id && el.tag === "Field")
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }, [templateItem]);

    const inferFieldType = useCallback((key: string, schemaType: string): string => {
      const keyLower = key.toLowerCase();
      if (keyLower.includes("email")) return "email";
      if (
        keyLower.includes("url") ||
        keyLower.includes("link") ||
        keyLower.includes("website")
      ) {
        return "url";
      }
      if (
        keyLower.includes("avatar") ||
        keyLower.includes("image") ||
        keyLower.includes("photo") ||
        keyLower.includes("picture")
      ) {
        return "image";
      }
      if (
        keyLower.includes("date") ||
        keyLower.includes("created") ||
        keyLower.includes("updated") ||
        keyLower.includes("time")
      ) {
        return "date";
      }

      if (schemaType === "boolean") return "boolean";
      if (schemaType === "number") return "number";
      if (schemaType === "date" || schemaType === "datetime") return "date";
      if (schemaType === "email") return "email";
      if (schemaType === "url") return "url";
      if (schemaType === "image") return "image";

      return "string";
    }, []);

    const handleAutoGenerateFields = useCallback(async () => {
      if (!selectedSchema || selectedSchema.length === 0) {
        alert("DataTable을 먼저 선택해주세요.");
        return;
      }

      if (!currentPageId) {
        alert("페이지 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.");
        return;
      }

      let targetItemId = templateItem?.id;

      if (!targetItemId) {
        const { elements } = useStore.getState();
        const maxOrderNum = Math.max(0, ...children.map((el) => el.order_num || 0));

        const newItem: Element = {
          id: ElementUtils.generateId(),
          customId: generateCustomId("ListBoxItem", elements),
          page_id: currentPageId,
          tag: "ListBoxItem",
          props: {
            style: {},
            className: "",
          },
          parent_id: elementId,
          order_num: maxOrderNum + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        try {
          const db = await getDB();
          const inserted = await db.elements.insert(newItem);
          addElement(inserted);
          targetItemId = inserted.id;
        } catch (error) {
          console.error("ListBoxItem 생성 실패:", error);
          alert("ListBoxItem 생성 중 오류가 발생했습니다.");
          return;
        }
      }

      if (existingFields.length > 0) {
        const confirmed = window.confirm(
          `기존 ${existingFields.length}개의 Field가 있습니다. 새로 생성하면 기존 Field는 유지됩니다.\n계속하시겠습니까?`,
        );
        if (!confirmed) return;
      }

      const { elements } = useStore.getState();
      const db = await getDB();
      let orderNum =
        existingFields.length > 0
          ? Math.max(...existingFields.map((field) => field.order_num || 0)) + 1
          : 1;

      for (const field of selectedSchema) {
        const fieldType = inferFieldType(field.key, field.type);

        const newField: Element = {
          id: ElementUtils.generateId(),
          customId: generateCustomId("Field", elements),
          page_id: currentPageId,
          tag: "Field",
          props: {
            key: field.key,
            label: field.label || field.key,
            type: fieldType,
            showLabel: true,
            visible: true,
            style: {},
            className: "",
          },
          parent_id: targetItemId,
          order_num: orderNum++,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        try {
          const inserted = await db.elements.insert(newField);
          addElement(inserted);
        } catch (error) {
          console.error(`Field 생성 실패 (${field.key}):`, error);
        }
      }

      alert(`${selectedSchema.length}개의 Field가 자동 생성되었습니다.`);
    }, [
      addElement,
      children,
      currentPageId,
      elementId,
      existingFields,
      inferFieldType,
      selectedSchema,
      templateItem,
    ]);

    useEffect(() => {
      deselectItem();
    }, [deselectItem, elementId]);

    const handleDataBindingChange = useCallback(
      async (binding: DataBindingValue | null) => {
        const prevBinding = currentProps.dataBinding as DataBindingValue | undefined;
        const prevTableName =
          prevBinding?.source === "dataTable" ? prevBinding.name : null;
        const nextTableName =
          binding?.source === "dataTable" ? binding.name : null;

        if (
          prevTableName &&
          nextTableName &&
          prevTableName !== nextTableName &&
          existingFields.length > 0
        ) {
          const shouldReset = window.confirm(
            `DataTable이 "${prevTableName}"에서 "${nextTableName}"으로 변경되었습니다.\n기존 ${existingFields.length}개의 Field를 삭제하시겠습니까?`,
          );

          if (shouldReset) {
            for (const field of existingFields) {
              await removeElement(field.id);
            }
          }
        }

        onUpdate({ dataBinding: binding || undefined });
      },
      [currentProps.dataBinding, existingFields, onUpdate, removeElement],
    );

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
              onUpdate({ filterFields: fields.length > 0 ? fields : undefined });
            }}
            icon={Filter}
            placeholder="label, name, title"
          />
        </PropertySection>
      ),
      [currentProps.filterFields, currentProps.filterText, onUpdate],
    );

    const dataBindingSection = useMemo(
      () => (
        <PropertySection title="Data Binding" icon={Database}>
          <PropertyDataBinding
            label="데이터 소스"
            value={currentProps.dataBinding as DataBindingValue | undefined}
            onChange={handleDataBindingChange}
          />

          {selectedSchema && selectedSchema.length > 0 && (
            <div className="auto-generate-section">
              <div className="schema-info">
                <p className="tab-overview-text">
                  {selectedSchema.length}개의 컬럼이 감지되었습니다
                </p>
              </div>

              <div className="tab-actions">
                <button className="control-button add" onClick={handleAutoGenerateFields}>
                  <Wand2
                    color={iconProps.color}
                    strokeWidth={iconProps.strokeWidth}
                    size={iconProps.size}
                  />
                  Field 자동 생성
                </button>
              </div>

              {existingFields.length > 0 && (
                <p className="section-overview-help">
                  현재 {existingFields.length}개의 Field가 있습니다
                </p>
              )}
            </div>
          )}
        </PropertySection>
      ),
      [
        currentProps.dataBinding,
        existingFields.length,
        handleAutoGenerateFields,
        handleDataBindingChange,
        selectedSchema,
      ],
    );

    const itemManagementSection = useMemo(
      () => (
        <PropertySection title={PROPERTY_LABELS.ITEM_MANAGEMENT}>
          <div className="tab-overview">
            <p className="tab-overview-text">Total items: {children.length || 0}</p>
          </div>

          {children.length > 0 && (
            <div className="react-aria-ListBox">
              {children.map((item, index) => (
                <div key={item.id} className="react-aria-ListBoxItem">
                  <span className="tab-title">
                    {String((item.props as Record<string, unknown>).label || `Item ${index + 1}`)}
                  </span>
                  <button className="tab-edit-button" onClick={() => selectItem(index)}>
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
        {dataBindingSection}
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
