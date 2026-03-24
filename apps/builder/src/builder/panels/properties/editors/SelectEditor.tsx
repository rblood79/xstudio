import { useEffect, memo, useCallback, useMemo } from "react";
import {
  Tag,
  SquarePlus,
  Trash,
  PointerOff,
  AlertTriangle,
  Hash,
  Focus,
  CheckSquare,
  PenOff,
  Menu,
  SquareX,
  SpellCheck2,
  FileText,
  Binary,
  FormInput,
  Database,
  List,
  LayoutList,
} from "lucide-react";
import {
  PropertyInput,
  PropertySelect,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
  PropertyDataBinding,
  PropertySizeToggle,
  type DataBindingValue,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { iconProps } from "../../../../utils/ui/uiConstants";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";
import { useCollectionItemManager } from "@/builder/hooks";
import { useSyncChildProp } from "../../../hooks/useSyncChildProp";
import { useSyncGrandchildProp } from "../../../hooks/useSyncGrandchildProp";
import { supabase } from "../../../../env/supabase.client";
import type { BatchPropsUpdate } from "../../../stores/utils/elementUpdate";

export const SelectEditor = memo(
  function SelectEditor({
    elementId,
    currentProps,
    onUpdate,
  }: PropertyEditorProps) {
    const SELECT_VALUE_FONT_SIZE_BY_SIZE: Record<string, number> = {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
    };

    // Collection Item 관리 훅
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

    // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
    const customId = useMemo(() => {
      const element = useStore.getState().elementsMap.get(elementId);
      return element?.customId || "";
    }, [elementId]);

    useEffect(() => {
      // 옵션 선택 상태 초기화
      deselectItem();
    }, [elementId, deselectItem]);

    const { buildChildUpdates } = useSyncChildProp(elementId);
    const { buildGrandchildUpdates } = useSyncGrandchildProp(elementId);

    // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션
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

    const handleSelectedValueChange = useCallback(
      (value: string) => {
        onUpdate({ selectedValue: value || undefined });
      },
      [onUpdate],
    );

    const handleDefaultSelectedKeyChange = useCallback(
      (value: string) => {
        onUpdate({ defaultSelectedKey: value || undefined });
      },
      [onUpdate],
    );

    const handleDisallowEmptySelectionChange = useCallback(
      (checked: boolean) => {
        onUpdate({ disallowEmptySelection: checked });
      },
      [onUpdate],
    );

    const handleRequiredChange = useCallback(
      (value: string) => {
        if (value === "") {
          onUpdate({ isRequired: false, necessityIndicator: undefined });
        } else {
          onUpdate({ isRequired: true, necessityIndicator: value });
        }
      },
      [onUpdate],
    );

    const handleIsDisabledChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isDisabled: checked });
      },
      [onUpdate],
    );

    const handleIsReadOnlyChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isReadOnly: checked });
      },
      [onUpdate],
    );

    const handleAutoFocusChange = useCallback(
      (checked: boolean) => {
        onUpdate({ autoFocus: checked });
      },
      [onUpdate],
    );

    const handleSizeChange = useCallback(
      (value: string) => {
        const childUpdates: BatchPropsUpdate[] = [];
        const { childrenMap, elementsMap } = useStore.getState();
        const directChildren = childrenMap.get(elementId) ?? [];
        const fontSize = SELECT_VALUE_FONT_SIZE_BY_SIZE[value] ?? 14;

        // Label 자식의 fontSize 동기화 (WebGL 경로)
        const label = directChildren.find((child) => child.tag === "Label");
        if (label) {
          // elementsMap에서 최신 props 조회 (childrenMap staleness 방지)
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

        // SelectValue 손자의 fontSize 동기화
        const trigger = directChildren.find(
          (child) => child.tag === "SelectTrigger",
        );
        if (trigger) {
          const grandchildren = childrenMap.get(trigger.id) ?? [];
          const selectValue = grandchildren.find(
            (child) => child.tag === "SelectValue",
          );
          if (selectValue) {
            // elementsMap에서 최신 props 조회
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

    const handleMenuTriggerChange = useCallback(
      (value: string) => {
        onUpdate({ menuTrigger: value });
      },
      [onUpdate],
    );

    const handleNameChange = useCallback(
      (value: string) => {
        onUpdate({ name: value || undefined });
      },
      [onUpdate],
    );

    const handleValidationBehaviorChange = useCallback(
      (value: string) => {
        onUpdate({ validationBehavior: value });
      },
      [onUpdate],
    );

    const handleDataBindingChange = useCallback(
      (binding: DataBindingValue | null) => {
        onUpdate({ dataBinding: binding || undefined });
      },
      [onUpdate],
    );

    const handleSelectionModeChange = useCallback(
      (value: string) => {
        onUpdate({
          selectionMode: value as "single" | "multiple",
        });
      },
      [onUpdate],
    );

    const handleMultipleDisplayModeChange = useCallback(
      (value: string) => {
        onUpdate({
          multipleDisplayMode: value as "count" | "list" | "custom",
        });
      },
      [onUpdate],
    );

    // ⭐ 최적화: 옵션 편집 핸들러들
    const handleOptionLabelChange = useCallback(
      (optionId: string, value: string) => {
        const currentOption = children.find((item) => item.id === optionId);
        if (!currentOption) return;
        const updatedProps = {
          ...currentOption.props,
          label: value,
        };
        updateItem(optionId, updatedProps);
      },
      [children, updateItem],
    );

    const handleOptionValueChange = useCallback(
      (optionId: string, value: string) => {
        const currentOption = children.find((item) => item.id === optionId);
        if (!currentOption) return;
        const updatedProps = {
          ...currentOption.props,
          value: value,
        };
        updateItem(optionId, updatedProps);
      },
      [children, updateItem],
    );

    const handleOptionDisabledChange = useCallback(
      (optionId: string, checked: boolean) => {
        const currentOption = children.find((item) => item.id === optionId);
        if (!currentOption) return;
        const updatedProps = {
          ...currentOption.props,
          isDisabled: checked,
        };
        updateItem(optionId, updatedProps);
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

    // ⭐ 최적화: 각 섹션을 useMemo로 감싸서 불필요한 JSX 재생성 방지
    const basicSection = useMemo(
      () => (
        <PropertySection title="Basic">
          <PropertyCustomId
            label="ID"
            value={customId}
            elementId={elementId}
            placeholder="select_1"
          />
        </PropertySection>
      ),
      [customId, elementId],
    );

    const designSection = useMemo(
      () => (
        <PropertySection title="Design">
          <PropertySizeToggle
            label={PROPERTY_LABELS.SIZE}
            value={String(currentProps.size || "md")}
            onChange={handleSizeChange}
          />
        </PropertySection>
      ),
      [currentProps.size, handleSizeChange],
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
        currentProps.label,
        currentProps.description,
        currentProps.errorMessage,
        currentProps.placeholder,
        handleLabelChange,
        handleDescriptionChange,
        handleErrorMessageChange,
        handlePlaceholderChange,
      ],
    );

    const stateSection = useMemo(
      () => (
        <PropertySection title="State">
          <PropertySelect
            label="Selection Mode"
            value={String(currentProps.selectionMode || "single")}
            onChange={handleSelectionModeChange}
            options={[
              { value: "single", label: "Single" },
              { value: "multiple", label: "Multiple" },
            ]}
            icon={List}
          />

          {currentProps.selectionMode === "multiple" && (
            <PropertySelect
              label="Display Mode"
              value={String(currentProps.multipleDisplayMode || "count")}
              onChange={handleMultipleDisplayModeChange}
              options={[
                { value: "count", label: 'Count (e.g., "3 selected")' },
                { value: "list", label: 'List (e.g., "A, B, C")' },
                { value: "custom", label: "Custom" },
              ]}
              icon={LayoutList}
            />
          )}

          <PropertyInput
            label={PROPERTY_LABELS.VALUE}
            value={String(currentProps.selectedValue || "")}
            onChange={handleSelectedValueChange}
            icon={Hash}
          />

          <PropertyInput
            label={PROPERTY_LABELS.DEFAULT_SELECTED_KEY}
            value={String(currentProps.defaultSelectedKey || "")}
            onChange={handleDefaultSelectedKeyChange}
            icon={Hash}
          />

          <PropertySwitch
            label={PROPERTY_LABELS.DISALLOW_EMPTY_SELECTION}
            isSelected={Boolean(currentProps.disallowEmptySelection)}
            onChange={handleDisallowEmptySelectionChange}
            icon={SquareX}
          />

          <PropertySelect
            label={PROPERTY_LABELS.REQUIRED}
            value={String(currentProps.necessityIndicator || "")}
            onChange={handleRequiredChange}
            options={[
              { value: "", label: "None" },
              { value: "icon", label: "Icon (*)" },
              { value: "label", label: "Label (required/optional)" },
            ]}
            icon={CheckSquare}
          />
        </PropertySection>
      ),
      [
        currentProps.selectionMode,
        currentProps.multipleDisplayMode,
        currentProps.selectedValue,
        currentProps.defaultSelectedKey,
        currentProps.disallowEmptySelection,
        currentProps.isRequired,
        currentProps.necessityIndicator,
        handleSelectionModeChange,
        handleMultipleDisplayModeChange,
        handleSelectedValueChange,
        handleDefaultSelectedKeyChange,
        handleDisallowEmptySelectionChange,
        handleRequiredChange,
      ],
    );

    const behaviorSection = useMemo(
      () => (
        <PropertySection title="Behavior">
          <PropertySwitch
            label={PROPERTY_LABELS.DISABLED}
            isSelected={Boolean(currentProps.isDisabled)}
            onChange={handleIsDisabledChange}
            icon={PointerOff}
          />

          <PropertySwitch
            label={PROPERTY_LABELS.READONLY}
            isSelected={Boolean(currentProps.isReadOnly)}
            onChange={handleIsReadOnlyChange}
            icon={PenOff}
          />

          <PropertySwitch
            label={PROPERTY_LABELS.AUTO_FOCUS}
            isSelected={Boolean(currentProps.autoFocus)}
            onChange={handleAutoFocusChange}
            icon={Focus}
          />

          <PropertySelect
            label={PROPERTY_LABELS.MENU_TRIGGER}
            value={String(currentProps.menuTrigger || "click")}
            onChange={handleMenuTriggerChange}
            options={[
              { value: "click", label: PROPERTY_LABELS.CLICK },
              { value: "hover", label: PROPERTY_LABELS.HOVER },
            ]}
            icon={Menu}
          />
        </PropertySection>
      ),
      [
        currentProps.isDisabled,
        currentProps.isReadOnly,
        currentProps.autoFocus,
        currentProps.menuTrigger,
        handleIsDisabledChange,
        handleIsReadOnlyChange,
        handleAutoFocusChange,
        handleMenuTriggerChange,
      ],
    );

    const formIntegrationSection = useMemo(
      () => (
        <PropertySection title="Form Integration">
          <PropertyInput
            label={PROPERTY_LABELS.NAME}
            value={String(currentProps.name || "")}
            onChange={handleNameChange}
            icon={FormInput}
            placeholder="select-name"
          />

          <PropertySelect
            label={PROPERTY_LABELS.VALIDATION_BEHAVIOR}
            value={String(currentProps.validationBehavior || "native")}
            onChange={handleValidationBehaviorChange}
            options={[
              { value: "native", label: "Native" },
              { value: "aria", label: "ARIA" },
            ]}
          />
        </PropertySection>
      ),
      [
        currentProps.name,
        currentProps.validationBehavior,
        handleNameChange,
        handleValidationBehaviorChange,
      ],
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
            <p className="tab-overview-text">
              Total items: {children.length || 0}
            </p>
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

    // 선택된 옵션이 있는 경우 개별 옵션 편집 UI 표시
    if (selectedItemIndex !== null) {
      const currentOption = children[selectedItemIndex];
      if (!currentOption) return null;

      return (
        <>
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
          </div>

          <div className="tab-actions">
            <button className="control-button secondary" onClick={deselectItem}>
              {PROPERTY_LABELS.CLOSE}
            </button>
          </div>
        </>
      );
    }

    // Select 컴포넌트 전체 설정 UI
    return (
      <>
        {basicSection}
        {designSection}
        {contentSection}
        {dataBindingSection}
        {stateSection}
        {behaviorSection}
        {formIntegrationSection}
        {itemManagementSection}
      </>
    );
  },
  (prevProps, nextProps) => {
    // ⭐ 기본 비교: id와 properties만 비교
    return (
      prevProps.elementId === nextProps.elementId &&
      JSON.stringify(prevProps.currentProps) ===
        JSON.stringify(nextProps.currentProps)
    );
  },
);
