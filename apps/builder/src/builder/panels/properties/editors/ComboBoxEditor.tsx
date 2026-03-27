import { useEffect, memo, useCallback, useMemo } from "react";
import {
  Tag,
  SquarePlus,
  PointerOff,
  AlertTriangle,
  FileText,
  Trash,
  Binary,
  Menu,
  Parentheses,
} from "lucide-react";
import { ComboBoxSpec } from "@xstudio/specs";
import {
  PropertyInput,
  PropertySwitch,
  PropertySelect,
  PropertySection,
  PropertySizeToggle,
  PropertyIconPicker,
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

const COMBOBOX_FONT_SIZE_BY_SIZE: Record<string, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
};

export const ComboBoxHybridAfterSections = memo(
  function ComboBoxHybridAfterSections({
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
      childTag: "ComboBoxItem",
      defaultItemProps: (index) => ({
        label: `Option ${index + 1}`,
        value: `option${index + 1}`,
        textValue: `Option ${index + 1}`,
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
            parentTag: "ComboBoxWrapper",
            childTag: "ComboBoxInput",
            propKey: "placeholder",
            value,
          },
        ]);
        useStore
          .getState()
          .updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
      },
      [buildGrandchildUpdates],
    );

    const handleVariantChange = useCallback(
      (value: string) => {
        onUpdate({ variant: value });
      },
      [onUpdate],
    );

    const handleSizeChange = useCallback(
      (value: string) => {
        const childUpdates: BatchPropsUpdate[] = [];
        const { childrenMap, elementsMap } = useStore.getState();
        const directChildren = childrenMap.get(elementId) ?? [];
        const fontSize = COMBOBOX_FONT_SIZE_BY_SIZE[value] ?? 14;

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

        const wrapper = directChildren.find(
          (child) => child.tag === "ComboBoxWrapper",
        );
        if (wrapper) {
          const grandchildren = childrenMap.get(wrapper.id) ?? [];
          const comboInput = grandchildren.find(
            (child) => child.tag === "ComboBoxInput",
          );
          if (comboInput) {
            const latestInput = elementsMap.get(comboInput.id);
            const inputStyle =
              ((latestInput ?? comboInput).props?.style as
                | Record<string, unknown>
                | undefined) || {};
            childUpdates.push({
              elementId: comboInput.id,
              props: {
                style: { ...inputStyle, fontSize },
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
        const updatedProps = {
          ...currentOption.props,
          label: value,
        };
        updateItem(optionId, updatedProps as Record<string, unknown>);
      },
      [children, updateItem],
    );

    const handleOptionValueChange = useCallback(
      (optionId: string, value: string) => {
        const currentOption = children.find((item) => item.id === optionId);
        if (!currentOption) return;
        const oldValue = (currentOption.props as Record<string, unknown>).value;
        const updatedProps = {
          ...currentOption.props,
          value,
        };
        updateItem(optionId, updatedProps);

        if (currentProps.defaultSelectedKey === oldValue) {
          onUpdate({ defaultSelectedKey: value || undefined });
        }
      },
      [children, currentProps.defaultSelectedKey, onUpdate, updateItem],
    );

    const handleOptionDescriptionChange = useCallback(
      (optionId: string, value: string) => {
        const currentOption = children.find((item) => item.id === optionId);
        if (!currentOption) return;
        updateItem(optionId, {
          ...currentOption.props,
          description: value,
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
          const { error } = await supabase
            .from("elements")
            .delete()
            .eq("id", optionId);

          if (error) {
            console.error("ComboBoxItem 삭제 에러:", error);
            return;
          }

          deleteItem(optionId);
        } catch (error) {
          console.error("ComboBoxItem 삭제 중 오류:", error);
        }
      },
      [deleteItem],
    );

    const designSection = useMemo(
      () => (
        <PropertySection title="Design">
          <PropertySelect
            label={PROPERTY_LABELS.VARIANT}
            value={String(currentProps.variant || "default")}
            onChange={handleVariantChange}
            options={[
              { value: "default", label: PROPERTY_LABELS.VARIANT_DEFAULT },
              { value: "accent", label: "Accent" },
              { value: "negative", label: "Negative" },
            ]}
            icon={Parentheses}
          />

          <PropertySizeToggle
            label={PROPERTY_LABELS.SIZE}
            value={String(currentProps.size || "md")}
            onChange={handleSizeChange}
          />

          <PropertyIconPicker
            label="Trigger Icon"
            value={String(currentProps.iconName || "chevron-down")}
            onChange={(value) => onUpdate({ iconName: value })}
          />
        </PropertySection>
      ),
      [
        currentProps.iconName,
        currentProps.size,
        currentProps.variant,
        handleSizeChange,
        handleVariantChange,
        onUpdate,
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
            icon={FileText}
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
              { value: "focus", label: "Focus" },
              { value: "input", label: "Input" },
              { value: "manual", label: "Manual" },
            ]}
            icon={Menu}
          />
        </PropertySection>
      ),
      [currentProps.menuTrigger, handleMenuTriggerChange],
    );

    const itemManagementSection = useMemo(
      () => (
        <PropertySection title={PROPERTY_LABELS.ADD_OPTION}>
          {children.length > 0 ? (
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
          ) : (
            <p className="no-options">{PROPERTY_LABELS.NO_OPTIONS}</p>
          )}

          <div className="tab-actions">
            <button className="control-button add" onClick={addItem}>
              <SquarePlus
                color={iconProps.color}
                strokeWidth={iconProps.strokeWidth}
                size={iconProps.size}
              />
              {PROPERTY_LABELS.ADD_OPTION}
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
        <div className="properties-aria">
          <PropertyInput
            label={PROPERTY_LABELS.LABEL}
            value={String(
              (currentOption.props as Record<string, unknown>).label || "",
            )}
            onChange={(value) =>
              handleOptionLabelChange(currentOption.id, value)
            }
            icon={Tag}
          />

          <PropertyInput
            label={PROPERTY_LABELS.VALUE}
            value={String(
              (currentOption.props as Record<string, unknown>).value || "",
            )}
            onChange={(value) =>
              handleOptionValueChange(currentOption.id, value)
            }
            icon={Binary}
          />

          <PropertyInput
            label={PROPERTY_LABELS.DESCRIPTION}
            value={String(
              (currentOption.props as Record<string, unknown>).description ||
                "",
            )}
            onChange={(value) =>
              handleOptionDescriptionChange(currentOption.id, value)
            }
            icon={FileText}
          />

          <PropertySwitch
            label={PROPERTY_LABELS.DISABLED}
            isSelected={Boolean(
              (currentOption.props as Record<string, unknown>).isDisabled,
            )}
            onChange={(checked) =>
              handleOptionDisabledChange(currentOption.id, checked)
            }
            icon={PointerOff}
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

          <div className="tab-actions">
            <button className="control-button secondary" onClick={deselectItem}>
              {PROPERTY_LABELS.CLOSE}
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        {designSection}
        {contentSection}
        {triggerBehaviorSection}
        {itemManagementSection}
      </>
    );
  },
);

export const ComboBoxEditor = memo(function ComboBoxEditor(
  props: PropertyEditorProps,
) {
  return (
    <GenericPropertyEditor
      {...props}
      spec={ComboBoxSpec}
      renderAfterSections={(sectionProps) => (
        <ComboBoxHybridAfterSections {...sectionProps} />
      )}
    />
  );
});
