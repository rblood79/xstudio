import { useEffect, memo, useCallback, useMemo } from "react";
import {
  Tag,
  SquarePlus,
  PointerOff,
  AlertTriangle,
  FileText,
  Trash,
  Binary,
  CheckSquare,
  PenOff,
  Focus,
  FormInput,
  Menu,
  Database,
  Parentheses,
} from "lucide-react";
import {
  PropertyInput,
  PropertySwitch,
  PropertySelect,
  PropertyCustomId,
  PropertySection,
  PropertyDataBinding,
  PropertySizeToggle,
  PropertyIconPicker,
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

export const ComboBoxEditor = memo(
  function ComboBoxEditor({
    elementId,
    currentProps,
    onUpdate,
  }: PropertyEditorProps) {
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
      childTag: "ComboBoxItem",
      defaultItemProps: (index) => ({
        label: `Option ${index + 1}`,
        value: `option${index + 1}`,
        textValue: `Option ${index + 1}`,
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

    const handleSelectedValueChange = useCallback(
      (value: string) => {
        onUpdate({ selectedValue: value || undefined });
      },
      [onUpdate],
    );

    const handleAllowsCustomValueChange = useCallback(
      (checked: boolean) => {
        onUpdate({ allowsCustomValue: checked });
      },
      [onUpdate],
    );

    const handleIsRequiredChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isRequired: checked });
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

    const handleVariantChange = useCallback(
      (value: string) => {
        onUpdate({ variant: value });
      },
      [onUpdate],
    );

    const COMBOBOX_FONT_SIZE_BY_SIZE: Record<string, number> = {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
    };

    const handleSizeChange = useCallback(
      (value: string) => {
        const childUpdates: BatchPropsUpdate[] = [];
        const { childrenMap, elementsMap } = useStore.getState();
        const directChildren = childrenMap.get(elementId) ?? [];
        const fontSize = COMBOBOX_FONT_SIZE_BY_SIZE[value] ?? 14;

        // Label 자식의 fontSize 동기화 (WebGL 경로)
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

        // ComboBoxInput 손자의 fontSize 동기화
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

    const handleDefaultSelectedKeyChange = useCallback(
      (value: string) => {
        onUpdate({ defaultSelectedKey: value || undefined });
      },
      [onUpdate],
    );

    const handleDataBindingChange = useCallback(
      (binding: DataBindingValue | null) => {
        onUpdate({ dataBinding: binding || undefined });
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
        updateItem(optionId, updatedProps as Record<string, unknown>);

        // 부모 ComboBox의 defaultSelectedKey가 현재 옵션의 value와 같다면 업데이트
        if (
          currentProps.defaultSelectedKey ===
          (currentOption.props as Record<string, unknown>).value
        ) {
          handleDefaultSelectedKeyChange(
            (currentOption.props as Record<string, unknown>).value as string,
          );
        }
      },
      [
        children,
        currentProps.defaultSelectedKey,
        updateItem,
        handleDefaultSelectedKeyChange,
      ],
    );

    const handleOptionValueChange = useCallback(
      (optionId: string, value: string) => {
        const currentOption = children.find((item) => item.id === optionId);
        if (!currentOption) return;
        const oldValue = (currentOption.props as Record<string, unknown>).value;
        const updatedProps = {
          ...currentOption.props,
          value: value,
        };
        updateItem(optionId, updatedProps);

        // 부모 ComboBox의 defaultSelectedKey가 이전 값과 같다면 새 값으로 업데이트
        if (currentProps.defaultSelectedKey === oldValue) {
          handleDefaultSelectedKeyChange(value);
        }
      },
      [
        children,
        currentProps.defaultSelectedKey,
        updateItem,
        handleDefaultSelectedKeyChange,
      ],
    );

    const handleOptionDescriptionChange = useCallback(
      (optionId: string, value: string) => {
        const currentOption = children.find((item) => item.id === optionId);
        if (!currentOption) return;
        const updatedProps = {
          ...currentOption.props,
          description: value,
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

    // ⭐ 최적화: 각 섹션을 useMemo로 감싸서 불필요한 JSX 재생성 방지
    const basicSection = useMemo(
      () => (
        <PropertySection title="Basic">
          <PropertyCustomId
            label="ID"
            value={customId}
            elementId={elementId}
            placeholder="combobox_1"
          />
        </PropertySection>
      ),
      [customId, elementId],
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
        currentProps.variant,
        currentProps.size,
        currentProps.iconName,
        handleVariantChange,
        handleSizeChange,
        onUpdate,
        currentProps,
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
          <PropertyInput
            label={PROPERTY_LABELS.VALUE}
            value={String(currentProps.selectedValue || "")}
            onChange={handleSelectedValueChange}
            icon={Tag}
            placeholder="선택된 값이 여기에 표시됩니다"
          />

          <PropertySwitch
            label={PROPERTY_LABELS.ALLOWS_CUSTOM_VALUE}
            isSelected={Boolean(currentProps.allowsCustomValue)}
            onChange={handleAllowsCustomValueChange}
            icon={Binary}
          />

          <PropertySwitch
            label={PROPERTY_LABELS.REQUIRED}
            isSelected={Boolean(currentProps.isRequired)}
            onChange={handleIsRequiredChange}
            icon={CheckSquare}
          />
        </PropertySection>
      ),
      [
        currentProps.selectedValue,
        currentProps.allowsCustomValue,
        currentProps.isRequired,
        handleSelectedValueChange,
        handleAllowsCustomValueChange,
        handleIsRequiredChange,
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
            placeholder="combobox-name"
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
              <button
                className="control-button secondary"
                onClick={deselectItem}
              >
                {PROPERTY_LABELS.CLOSE}
              </button>
            </div>
          </div>
        </>
      );
    }

    // ComboBox 컴포넌트 자체의 속성 편집 UI
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
