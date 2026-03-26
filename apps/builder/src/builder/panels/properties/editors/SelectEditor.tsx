import { useEffect, memo, useCallback, useMemo } from "react";
import {
  Tag,
  SquarePlus,
  Trash,
  AlertTriangle,
  Menu,
  SpellCheck2,
  FileText,
  Binary,
  Database,
  Layout,
  SquareX,
} from "lucide-react";
import {
  PropertyInput,
  PropertySelect,
  PropertySection,
  PropertyDataBinding,
  PropertySizeToggle,
  PropertySwitch,
  type DataBindingValue,
} from "../../../components";
import { GenericPropertyEditor } from "../generic";
import { PropertyEditorProps } from "../types/editorTypes";
import { iconProps } from "../../../../utils/ui/uiConstants";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";
import { useCollectionItemManager } from "@/builder/hooks";
import { useSyncChildProp } from "../../../hooks/useSyncChildProp";
import { useSyncGrandchildProp } from "../../../hooks/useSyncGrandchildProp";
import { supabase } from "../../../../env/supabase.client";
import type { BatchPropsUpdate } from "../../../stores/utils/elementUpdate";
import { SelectSpec } from "@xstudio/specs";
import { LABEL_POSITION_OPTIONS } from "./editorUtils";

const SELECT_VALUE_FONT_SIZE_BY_SIZE: Record<string, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
};

export const SelectHybridAfterSections = memo(function SelectHybridAfterSections({
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
    childTag: "SelectItem",
    defaultItemProps: (index) => ({
      label: `Option ${index + 1}`,
      value: `option${index + 1}`,
    }),
  });

  useEffect(() => {
    deselectItem();
  }, [elementId, deselectItem]);

  const { buildChildUpdates } = useSyncChildProp(elementId);
  const { buildGrandchildUpdates } = useSyncGrandchildProp(elementId);

  const handleLabelChange = useCallback(
    (value: string) => {
      const updatedProps = { label: value || undefined };
      const childUpdates = buildChildUpdates([
        { childTag: "Label", propKey: "children", value },
      ]);
      useStore
        .getState()
        .updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
    },
    [buildChildUpdates],
  );

  const handleDescriptionChange = useCallback(
    (value: string) => {
      onUpdate({ description: value || undefined });
    },
    [onUpdate],
  );

  const handleErrorMessageChange = useCallback(
    (value: string) => {
      onUpdate({ errorMessage: value || undefined });
    },
    [onUpdate],
  );

  const handlePlaceholderChange = useCallback(
    (value: string) => {
      const updatedProps = {
        placeholder: value || undefined,
      };
      const childUpdates = buildGrandchildUpdates([
        {
          parentTag: "SelectTrigger",
          childTag: "SelectValue",
          propKey: "children",
          value,
        },
      ]);
      useStore
        .getState()
        .updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
    },
    [buildGrandchildUpdates],
  );

  const handleSizeChange = useCallback(
    (value: string) => {
      const childUpdates: BatchPropsUpdate[] = [];
      const { childrenMap, elementsMap } = useStore.getState();
      const directChildren = childrenMap.get(elementId) ?? [];
      const fontSize = SELECT_VALUE_FONT_SIZE_BY_SIZE[value] ?? 14;

      const label = directChildren.find((child) => child.tag === "Label");
      if (label) {
        const latestLabel = elementsMap.get(label.id);
        const labelStyle =
          ((latestLabel ?? label).props?.style as
            | Record<string, unknown>
            | undefined) || {};
        childUpdates.push({
          elementId: label.id,
          props: {
            style: { ...labelStyle, fontSize },
          },
        });
      }

      const trigger = directChildren.find(
        (child) => child.tag === "SelectTrigger",
      );
      if (trigger) {
        const grandchildren = childrenMap.get(trigger.id) ?? [];
        const selectValue = grandchildren.find(
          (child) => child.tag === "SelectValue",
        );
        if (selectValue) {
          const latestSV = elementsMap.get(selectValue.id);
          const svStyle =
            ((latestSV ?? selectValue).props?.style as
              | Record<string, unknown>
              | undefined) || {};
          childUpdates.push({
            elementId: selectValue.id,
            props: {
              style: { ...svStyle, fontSize },
            },
          });
        }
      }

      useStore
        .getState()
        .updateSelectedPropertiesWithChildren({ size: value }, childUpdates);
    },
    [elementId],
  );

  const handleLabelPositionChange = useCallback(
    (value: string) => {
      onUpdate({ labelPosition: value });
    },
    [onUpdate],
  );

  const handleDataBindingChange = useCallback(
    (binding: DataBindingValue | null) => {
      onUpdate({ dataBinding: binding || undefined });
    },
    [onUpdate],
  );

  const handleMenuTriggerChange = useCallback(
    (value: string) => {
      onUpdate({ menuTrigger: value });
    },
    [onUpdate],
  );

  const handleOptionLabelChange = useCallback(
    (optionId: string, value: string) => {
      const currentOption = children.find((item) => item.id === optionId);
      if (!currentOption) return;
      updateItem(optionId, {
        ...currentOption.props,
        label: value,
      });
    },
    [children, updateItem],
  );

  const handleOptionValueChange = useCallback(
    (optionId: string, value: string) => {
      const currentOption = children.find((item) => item.id === optionId);
      if (!currentOption) return;
      updateItem(optionId, {
        ...currentOption.props,
        value,
      });
    },
    [children, updateItem],
  );

  const handleOptionDisabledChange = useCallback(
    (optionId: string, checked: boolean) => {
      const currentOption = children.find((item) => item.id === optionId);
      if (!currentOption) return;
      updateItem(optionId, {
        ...currentOption.props,
        isDisabled: checked,
      });
    },
    [children, updateItem],
  );

  const handleDeleteOption = useCallback(
    async (optionId: string) => {
      try {
        const { error } = await supabase.from("elements").delete().eq("id", optionId);
        if (error) {
          console.error("SelectItem 삭제 에러:", error);
          return;
        }
        deleteItem(optionId);
      } catch (error) {
        console.error("SelectItem 삭제 중 오류:", error);
      }
    },
    [deleteItem],
  );

  const designSection = useMemo(
    () => (
      <PropertySection title="Design">
        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={handleSizeChange}
        />
        <PropertySelect
          label={PROPERTY_LABELS.LABEL_POSITION}
          value={String(currentProps.labelPosition || "top")}
          options={LABEL_POSITION_OPTIONS}
          onChange={handleLabelPositionChange}
          icon={Layout}
        />
      </PropertySection>
    ),
    [
      currentProps.labelPosition,
      currentProps.size,
      handleLabelPositionChange,
      handleSizeChange,
    ],
  );

  const contentSection = useMemo(
    () => (
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={String(currentProps.label || "")}
          onChange={handleLabelChange}
          icon={Tag}
        />
        <PropertyInput
          label={PROPERTY_LABELS.DESCRIPTION}
          value={String(currentProps.description || "")}
          onChange={handleDescriptionChange}
          icon={FileText}
        />
        <PropertyInput
          label={PROPERTY_LABELS.ERROR_MESSAGE}
          value={String(currentProps.errorMessage || "")}
          onChange={handleErrorMessageChange}
          icon={AlertTriangle}
        />
        <PropertyInput
          label={PROPERTY_LABELS.PLACEHOLDER}
          value={String(currentProps.placeholder || "")}
          onChange={handlePlaceholderChange}
          icon={SpellCheck2}
        />
      </PropertySection>
    ),
    [
      currentProps.description,
      currentProps.errorMessage,
      currentProps.label,
      currentProps.placeholder,
      handleDescriptionChange,
      handleErrorMessageChange,
      handleLabelChange,
      handlePlaceholderChange,
    ],
  );

  const triggerBehaviorSection = useMemo(
    () => (
      <PropertySection title="Trigger Behavior">
        <PropertySelect
          label={PROPERTY_LABELS.MENU_TRIGGER}
          value={String(currentProps.menuTrigger || "focus")}
          onChange={handleMenuTriggerChange}
          options={[
            { value: "focus", label: PROPERTY_LABELS.HOVER },
            { value: "input", label: PROPERTY_LABELS.MENU_TRIGGER_INPUT },
            { value: "manual", label: PROPERTY_LABELS.MENU_TRIGGER_MANUAL },
          ]}
          icon={Menu}
        />
      </PropertySection>
    ),
    [currentProps.menuTrigger, handleMenuTriggerChange],
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

  const itemManagementSection = useMemo(
    () => (
      <PropertySection title={PROPERTY_LABELS.ITEM_MANAGEMENT}>
        <div className="tab-overview">
          <p className="tab-overview-text">Total items: {children.length || 0}</p>
          <p className="section-overview-help">
            💡 Select individual items from list to edit properties
          </p>
        </div>

        {children.length > 0 && (
          <div className="tabs-list">
            {children.map((item, index) => (
              <div key={item.id} className="tab-list-item">
                <span className="tab-title">
                  {String((item.props as Record<string, unknown>).label) ||
                    `Item ${index + 1}`}
                  {currentProps.selectedValue ===
                    (item.props as Record<string, unknown>).value && " ✓"}
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
    [children, currentProps.selectedValue, selectItem, addItem],
  );

  if (selectedItemIndex !== null) {
    const currentOption = children[selectedItemIndex];
    if (!currentOption) return null;

    return (
      <>
        <div className="properties-aria">
          <PropertyInput
            label={PROPERTY_LABELS.LABEL}
            value={String((currentOption.props as Record<string, unknown>).label || "")}
            onChange={(value) => handleOptionLabelChange(currentOption.id, value)}
            icon={Tag}
          />

          <PropertyInput
            label={PROPERTY_LABELS.VALUE}
            value={String((currentOption.props as Record<string, unknown>).value || "")}
            onChange={(value) => handleOptionValueChange(currentOption.id, value)}
            icon={Binary}
          />

          <PropertySwitch
            label={PROPERTY_LABELS.DISABLED}
            isSelected={Boolean(
              (currentOption.props as Record<string, unknown>).isDisabled,
            )}
            onChange={(checked) =>
              handleOptionDisabledChange(currentOption.id, checked)
            }
            icon={SquareX}
          />

          <div className="tab-actions">
            <button
              className="control-button delete"
              onClick={() => handleDeleteOption(currentOption.id)}
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
            {PROPERTY_LABELS.CLOSE}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {designSection}
      {contentSection}
      {triggerBehaviorSection}
      {dataBindingSection}
      {itemManagementSection}
    </>
  );
});

export const SelectEditor = memo(function SelectEditor(
  props: PropertyEditorProps,
) {
  return (
    <GenericPropertyEditor
      {...props}
      spec={SelectSpec}
      renderAfterSections={(sectionProps) => (
        <SelectHybridAfterSections {...sectionProps} />
      )}
    />
  );
});
