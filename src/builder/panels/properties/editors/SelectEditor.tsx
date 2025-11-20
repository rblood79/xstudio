import { useEffect, memo, useCallback, useMemo } from "react";
import { Tag, SquarePlus, Trash, PointerOff, AlertTriangle, Hash, Focus, CheckSquare, PenOff, Menu, SquareX, SpellCheck2, FileText, Binary, Type, FormInput } from 'lucide-react';
import { PropertyInput, PropertySelect, PropertySwitch, PropertyCustomId , PropertySection} from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { iconProps } from '../../../../utils/ui/uiConstants';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';
import { useCollectionItemManager } from '../../../hooks/useCollectionItemManager';
import { supabase } from '../../../../env/supabase.client';

export const SelectEditor = memo(function SelectEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
        childTag: 'SelectItem',
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

  const handlePlaceholderChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, placeholder: value || undefined });
  }, [currentProps, onUpdate]);

  const handleSelectedValueChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, selectedValue: value || undefined });
  }, [currentProps, onUpdate]);

  const handleDefaultSelectedKeyChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, defaultSelectedKey: value || undefined });
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

  const handleIsReadOnlyChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isReadOnly: checked });
  }, [currentProps, onUpdate]);

  const handleAutoFocusChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, autoFocus: checked });
  }, [currentProps, onUpdate]);

  const handleMenuTriggerChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, menuTrigger: value });
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

  // ⭐ 최적화: 옵션 편집 핸들러들
  const handleOptionLabelChange = useCallback((optionId: string, value: string) => {
    const currentOption = children.find(item => item.id === optionId);
    if (!currentOption) return;
    const updatedProps = {
      ...currentOption.props,
      label: value
    };
    updateItem(optionId, updatedProps);
  }, [children, updateItem]);

  const handleOptionValueChange = useCallback((optionId: string, value: string) => {
    const currentOption = children.find(item => item.id === optionId);
    if (!currentOption) return;
    const updatedProps = {
      ...currentOption.props,
      value: value
    };
    updateItem(optionId, updatedProps);
  }, [children, updateItem]);

  const handleOptionDisabledChange = useCallback((optionId: string, checked: boolean) => {
    const currentOption = children.find(item => item.id === optionId);
    if (!currentOption) return;
    const updatedProps = {
      ...currentOption.props,
      isDisabled: checked
    };
    updateItem(optionId, updatedProps);
  }, [children, updateItem]);

  const handleDeleteOption = useCallback(async (optionId: string) => {
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
  }, [deleteItem]);

  // 선택된 옵션이 있는 경우 개별 옵션 편집 UI 표시
  if (selectedItemIndex !== null) {
    const currentOption = children[selectedItemIndex];
    if (!currentOption) return null;

    return (
      <>
        <div className="properties-aria">
          <PropertyInput
            label={PROPERTY_LABELS.LABEL}
            value={String((currentOption.props as Record<string, unknown>).label || '')}
            onChange={(value) => handleOptionLabelChange(currentOption.id, value)}
            icon={Tag}
          />

          <PropertyInput
            label={PROPERTY_LABELS.VALUE}
            value={String((currentOption.props as Record<string, unknown>).value || '')}
            onChange={(value) => handleOptionValueChange(currentOption.id, value)}
            icon={Binary}
          />

          <PropertySwitch
            label={PROPERTY_LABELS.DISABLED}
            isSelected={Boolean((currentOption.props as Record<string, unknown>).isDisabled)}
            onChange={(checked) => handleOptionDisabledChange(currentOption.id, checked)}
            icon={PointerOff}
          />

          <div className='tab-actions'>
            <button
              className='control-button delete'
              onClick={() => handleDeleteOption(currentOption.id)}
            >
              <Trash color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
              Delete This Item
            </button>
          </div>
        </div>

        <div className='tab-actions'>
          <button
            className='control-button secondary'
            onClick={deselectItem}
          >
            {PROPERTY_LABELS.CLOSE}
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
          placeholder="select_1"
        />
      </PropertySection>
    ),
    [customId, elementId]
  );

  const contentSection = useMemo(
    () => (
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={String(currentProps.label || '')}
          onChange={handleLabelChange}
          icon={Tag}
        />

        <PropertyInput
          label={PROPERTY_LABELS.DESCRIPTION}
          value={String(currentProps.description || '')}
          onChange={handleDescriptionChange}
          icon={FileText}
        />

        <PropertyInput
          label={PROPERTY_LABELS.ERROR_MESSAGE}
          value={String(currentProps.errorMessage || '')}
          onChange={handleErrorMessageChange}
          icon={AlertTriangle}
        />

        <PropertyInput
          label={PROPERTY_LABELS.PLACEHOLDER}
          value={String(currentProps.placeholder || '')}
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
    ]
  );

  const stateSection = useMemo(
    () => (
      <PropertySection title="State">
        <PropertyInput
          label={PROPERTY_LABELS.VALUE}
          value={String(currentProps.selectedValue || '')}
          onChange={handleSelectedValueChange}
          icon={Hash}
        />

        <PropertyInput
          label={PROPERTY_LABELS.DEFAULT_SELECTED_KEY}
          value={String(currentProps.defaultSelectedKey || '')}
          onChange={handleDefaultSelectedKeyChange}
          icon={Hash}
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
      currentProps.selectedValue,
      currentProps.defaultSelectedKey,
      currentProps.disallowEmptySelection,
      currentProps.isRequired,
      handleSelectedValueChange,
      handleDefaultSelectedKeyChange,
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
          value={String(currentProps.menuTrigger || 'click')}
          onChange={handleMenuTriggerChange}
          options={[
            { value: 'click', label: PROPERTY_LABELS.CLICK },
            { value: 'hover', label: PROPERTY_LABELS.HOVER }
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
    ]
  );

  const formIntegrationSection = useMemo(
    () => (
      <PropertySection title="Form Integration">
        <PropertyInput
          label={PROPERTY_LABELS.NAME}
          value={String(currentProps.name || '')}
          onChange={handleNameChange}
          icon={FormInput}
          placeholder="select-name"
        />

        <PropertySelect
          label={PROPERTY_LABELS.VALIDATION_BEHAVIOR}
          value={String(currentProps.validationBehavior || 'native')}
          onChange={handleValidationBehaviorChange}
          options={[
            { value: 'native', label: 'Native' },
            { value: 'aria', label: 'ARIA' }
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
          value={String(currentProps['aria-label'] || '')}
          onChange={handleAriaLabelChange}
          icon={Type}
          placeholder="Select label for screen readers"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABELLEDBY}
          value={String(currentProps['aria-labelledby'] || '')}
          onChange={handleAriaLabelledbyChange}
          icon={Hash}
          placeholder="label-element-id"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
          value={String(currentProps['aria-describedby'] || '')}
          onChange={handleAriaDescribedbyChange}
          icon={Hash}
          placeholder="description-element-id"
        />
      </PropertySection>
    ),
    [
      currentProps['aria-label'],
      currentProps['aria-labelledby'],
      currentProps['aria-describedby'],
      handleAriaLabelChange,
      handleAriaLabelledbyChange,
      handleAriaDescribedbyChange,
    ]
  );

  const itemManagementSection = useMemo(
    () => (
      <PropertySection title="{PROPERTY_LABELS.ITEM_MANAGEMENT}">
        <div className='tab-overview'>
          <p className='tab-overview-text'>
            Total items: {children.length || 0}
          </p>
          <p className='tab-overview-help'>
            💡 Select individual items from list to edit properties
          </p>
        </div>

        {children.length > 0 && (
          <div className='tabs-list'>
            {children.map((item, index) => (
              <div key={item.id} className='tab-list-item'>
                <span className='tab-title'>
                  {String((item.props as Record<string, unknown>).label) || `Item ${index + 1}`}
                  {currentProps.selectedValue === (item.props as Record<string, unknown>).value && ' ✓'}
                </span>
                <button
                  className='tab-edit-button'
                  onClick={() => selectItem(index)}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}

        <div className='tab-actions'>
          <button
            className='control-button add'
            onClick={addItem}
          >
            <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
            Add Item
          </button>
        </div>
      </PropertySection>
    ),
    [children, currentProps.selectedValue, selectItem, addItem]
  );

  // Select 컴포넌트 전체 설정 UI
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