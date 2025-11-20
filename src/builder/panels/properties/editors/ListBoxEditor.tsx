import { useEffect, memo, useCallback, useMemo } from "react";
import {
  Tag,
  SquarePlus,
  Trash,
  PointerOff,
  AlertTriangle,
  List,
  SquareX,
  Focus,
  Binary,
  FileText,
  Type,
  Hash,
  FormInput,
  CheckSquare,
} from "lucide-react";
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId , PropertySection} from '../../common';
import { PropertyEditorProps } from "../types/editorTypes";
import { iconProps } from "../../../../utils/ui/uiConstants";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";
import { useCollectionItemManager } from "../../../hooks/useCollectionItemManager";

export const ListBoxEditor = memo(function ListBoxEditor({
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
    childTag: 'ListBoxItem',
    defaultItemProps: (index) => ({
      label: `Item ${index + 1}`,
      value: `item${index + 1}`,
    }),
  });

  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || '';
  }, [elementId]);

  useEffect(() => {
    // 아이템 선택 상태 초기화
    deselectItem();
  }, [elementId, deselectItem]);

  // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션
  const handleLabelChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, label: value || undefined });
  }, [currentProps, onUpdate]);

  const handleDescriptionChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, description: value || undefined });
  }, [currentProps, onUpdate]);

  const handleErrorMessageChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, errorMessage: value || undefined });
  }, [currentProps, onUpdate]);

  const handleSelectionModeChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, selectionMode: value });
  }, [currentProps, onUpdate]);

  const handleDisallowEmptySelectionChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, disallowEmptySelection: checked });
  }, [currentProps, onUpdate]);

  const handleIsRequiredChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isRequired: checked });
  }, [currentProps, onUpdate]);

  const handleIsDisabledChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isDisabled: checked });
  }, [currentProps, onUpdate]);

  const handleAutoFocusChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, autoFocus: checked });
  }, [currentProps, onUpdate]);

  const handleNameChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, name: value || undefined });
  }, [currentProps, onUpdate]);

  const handleValidationBehaviorChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, validationBehavior: value });
  }, [currentProps, onUpdate]);

  const handleAriaLabelChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, "aria-label": value || undefined });
  }, [currentProps, onUpdate]);

  const handleAriaLabelledbyChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, "aria-labelledby": value || undefined });
  }, [currentProps, onUpdate]);

  const handleAriaDescribedbyChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, "aria-describedby": value || undefined });
  }, [currentProps, onUpdate]);

  const updateCustomId = useCallback((newCustomId: string) => {
    const updateElement = useStore.getState().updateElement;
    if (updateElement && elementId) {
      updateElement(elementId, { customId: newCustomId });
    }
  }, [elementId]);

  // ⭐ 최적화: 아이템 편집 핸들러들
  const handleItemLabelChange = useCallback((itemId: string, value: string) => {
    const currentItem = children.find(item => item.id === itemId);
    if (!currentItem) return;
    const updatedProps = {
      ...currentItem.props,
      label: value,
    };
    updateItem(itemId, updatedProps);
  }, [children, updateItem]);

  const handleItemValueChange = useCallback((itemId: string, value: string) => {
    const currentItem = children.find(item => item.id === itemId);
    if (!currentItem) return;
    const updatedProps = {
      ...currentItem.props,
      value: value,
    };
    updateItem(itemId, updatedProps);
  }, [children, updateItem]);

  const handleItemDisabledChange = useCallback((itemId: string, checked: boolean) => {
    const currentItem = children.find(item => item.id === itemId);
    if (!currentItem) return;
    const updatedProps = {
      ...currentItem.props,
      isDisabled: checked,
    };
    updateItem(itemId, updatedProps);
  }, [children, updateItem]);

  // 선택된 아이템이 있는 경우 개별 아이템 편집 UI 표시
  if (selectedItemIndex !== null) {
    const currentItem = children[selectedItemIndex];
    if (!currentItem) return null;

    return (
      <>
        <div className="properties-aria">
          <PropertyInput
            label={PROPERTY_LABELS.LABEL}
            value={String(
              (currentItem.props as Record<string, unknown>).label || ""
            )}
            onChange={(value) => handleItemLabelChange(currentItem.id, value)}
            icon={Tag}
          />

          <PropertyInput
            label={PROPERTY_LABELS.VALUE}
            value={String(
              (currentItem.props as Record<string, unknown>).value || ""
            )}
            onChange={(value) => handleItemValueChange(currentItem.id, value)}
            icon={Binary}
          />

          <PropertySwitch
            label={PROPERTY_LABELS.DISABLED}
            isSelected={Boolean(
              (currentItem.props as Record<string, unknown>).isDisabled
            )}
            onChange={(checked) => handleItemDisabledChange(currentItem.id, checked)}
            icon={PointerOff}
          />

          <div className="tab-actions">
            <button
              className="control-button delete"
              onClick={() => deleteItem(currentItem.id)}
            >
              <Trash
                color={iconProps.color}
                strokeWidth={iconProps.stroke}
                size={iconProps.size}
              />
              Delete This Item
            </button>
          </div>
        </div>

        <div className="tab-actions">
          <button
            className="control-button secondary"
            onClick={deselectItem}
          >
            Back to ListBox Settings
          </button>
        </div>
      </>
    );
  }

  // ⭐ 최적화: 각 섹션을 useMemo로 감싸서 불필요한 JSX 재생성 방지
  const basicSection = useMemo(
    () => (
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          onChange={updateCustomId}
          placeholder="listbox_1"
        />
      </PropertySection>
    ),
    [customId, elementId, updateCustomId]
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
      </PropertySection>
    ),
    [
      currentProps.label,
      currentProps.description,
      currentProps.errorMessage,
      handleLabelChange,
      handleDescriptionChange,
      handleErrorMessageChange,
    ]
  );

  const stateSection = useMemo(
    () => (
      <PropertySection title="State">
        <PropertySelect
          label={PROPERTY_LABELS.SELECTION_MODE}
          value={String(currentProps.selectionMode || "single")}
          onChange={handleSelectionModeChange}
          options={[
            { value: "single", label: PROPERTY_LABELS.SELECTION_MODE_SINGLE },
            {
              value: "multiple",
              label: PROPERTY_LABELS.SELECTION_MODE_MULTIPLE,
            },
          ]}
          icon={List}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.DISALLOW_EMPTY_SELECTION}
          isSelected={Boolean(currentProps.disallowEmptySelection)}
          onChange={handleDisallowEmptySelectionChange}
          icon={SquareX}
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
      currentProps.selectionMode,
      currentProps.disallowEmptySelection,
      currentProps.isRequired,
      handleSelectionModeChange,
      handleDisallowEmptySelectionChange,
      handleIsRequiredChange,
    ]
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
          label={PROPERTY_LABELS.AUTO_FOCUS}
          isSelected={Boolean(currentProps.autoFocus)}
          onChange={handleAutoFocusChange}
          icon={Focus}
        />
      </PropertySection>
    ),
    [
      currentProps.isDisabled,
      currentProps.autoFocus,
      handleIsDisabledChange,
      handleAutoFocusChange,
    ]
  );

  const formIntegrationSection = useMemo(
    () => (
      <PropertySection title="Form Integration">
        <PropertyInput
          label={PROPERTY_LABELS.NAME}
          value={String(currentProps.name || "")}
          onChange={handleNameChange}
          icon={FormInput}
          placeholder="listbox-name"
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
    ]
  );

  const accessibilitySection = useMemo(
    () => (
      <PropertySection title="Accessibility">
        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABEL}
          value={String(currentProps["aria-label"] || "")}
          onChange={handleAriaLabelChange}
          icon={Type}
          placeholder="ListBox label for screen readers"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABELLEDBY}
          value={String(currentProps["aria-labelledby"] || "")}
          onChange={handleAriaLabelledbyChange}
          icon={Hash}
          placeholder="label-element-id"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
          value={String(currentProps["aria-describedby"] || "")}
          onChange={handleAriaDescribedbyChange}
          icon={Hash}
          placeholder="description-element-id"
        />
      </PropertySection>
    ),
    [
      currentProps["aria-label"],
      currentProps["aria-labelledby"],
      currentProps["aria-describedby"],
      handleAriaLabelChange,
      handleAriaLabelledbyChange,
      handleAriaDescribedbyChange,
    ]
  );

  const itemManagementSection = useMemo(
    () => (
      <PropertySection title="{PROPERTY_LABELS.ITEM_MANAGEMENT}">
        <div className="tab-overview">
          <p className="tab-overview-text">
            Total items: {children.length || 0}
          </p>
          <p className="tab-overview-help">
            💡 Select individual items from list to edit label, value, and state
          </p>
        </div>

        {children.length > 0 && (
          <div className="react-aria-ListBox">
            {children.map((item, index) => (
              <div key={item.id} className="react-aria-ListBoxItem">
                <span className="tab-title">
                  {String(
                    (item.props as Record<string, unknown>).label ||
                    `Item ${index + 1}`
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
          <button
            className="control-button add"
            onClick={addItem}
          >
            <SquarePlus
              color={iconProps.color}
              strokeWidth={iconProps.stroke}
              size={iconProps.size}
            />
            Add Item
          </button>
        </div>
      </PropertySection>
    ),
    [children, selectItem, addItem]
  );

  // ListBox 컴포넌트 전체 설정 UI
  return (
    <>
      {basicSection}
      {contentSection}
      {stateSection}
      {behaviorSection}
      {formIntegrationSection}
      {accessibilitySection}
      {itemManagementSection}
    </>
  );
}, (prevProps, nextProps) => {
  // ⭐ 기본 비교: id와 properties만 비교
  return (
    prevProps.elementId === nextProps.elementId &&
    JSON.stringify(prevProps.currentProps) === JSON.stringify(nextProps.currentProps)
  );
});
