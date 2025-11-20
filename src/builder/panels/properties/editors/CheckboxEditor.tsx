import { memo, useCallback, useMemo } from "react";
import { Tag, CheckSquare, PointerOff, PenOff, Minus, Layout, PencilRuler, Focus, Hash, Type, AlertCircle, FileText } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId, PropertySelect , PropertySection} from '../../common';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const CheckboxEditor = memo(function CheckboxEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  // ⭐ 최적화: parentElement도 getState로 가져오기
  const isChildOfCheckboxGroup = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    if (!element?.parent_id) return false;
    const parentElement = useStore.getState().elementsMap.get(element.parent_id);
    return parentElement?.tag === 'CheckboxGroup';
  }, [elementId]);

  // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션
  const handleChildrenChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, children: value });
  }, [currentProps, onUpdate]);

  const handleVariantChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, variant: value });
  }, [currentProps, onUpdate]);

  const handleSizeChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, size: value });
  }, [currentProps, onUpdate]);

  const handleIsSelectedChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isSelected: checked });
  }, [currentProps, onUpdate]);

  const handleIsIndeterminateChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isIndeterminate: checked });
  }, [currentProps, onUpdate]);

  const handleIsRequiredChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isRequired: checked });
  }, [currentProps, onUpdate]);

  const handleIsInvalidChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isInvalid: checked });
  }, [currentProps, onUpdate]);

  const handleAutoFocusChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, autoFocus: checked });
  }, [currentProps, onUpdate]);

  const handleIsDisabledChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isDisabled: checked });
  }, [currentProps, onUpdate]);

  const handleIsReadOnlyChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isReadOnly: checked });
  }, [currentProps, onUpdate]);

  const handleNameChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, name: value || undefined });
  }, [currentProps, onUpdate]);

  const handleValueChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, value: value || undefined });
  }, [currentProps, onUpdate]);

  const handleFormChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, form: value || undefined });
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

  // ⭐ 최적화: 각 섹션을 useMemo로 감싸서 불필요한 JSX 재생성 방지
  const basicSection = useMemo(
    () => (
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          onChange={updateCustomId}
          placeholder="checkbox_1"
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
          value={String(currentProps.children || '')}
          onChange={handleChildrenChange}
          icon={Tag}
        />
      </PropertySection>
    ),
    [currentProps.children, handleChildrenChange]
  );

  const designSection = useMemo(
    () => !isChildOfCheckboxGroup ? (
      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.VARIANT}
          value={String(currentProps.variant || 'default')}
          onChange={handleVariantChange}
          options={[
            { value: 'default', label: PROPERTY_LABELS.CHECKBOX_VARIANT_DEFAULT },
            { value: 'primary', label: PROPERTY_LABELS.CHECKBOX_VARIANT_PRIMARY },
            { value: 'secondary', label: PROPERTY_LABELS.CHECKBOX_VARIANT_SECONDARY },
            { value: 'surface', label: PROPERTY_LABELS.CHECKBOX_VARIANT_SURFACE }
          ]}
          icon={Layout}
        />

        <PropertySelect
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || 'md')}
          onChange={handleSizeChange}
          options={[
            { value: 'sm', label: PROPERTY_LABELS.SIZE_SM },
            { value: 'md', label: PROPERTY_LABELS.SIZE_MD },
            { value: 'lg', label: PROPERTY_LABELS.SIZE_LG }
          ]}
          icon={PencilRuler}
        />
      </PropertySection>
    ) : null,
    [
      isChildOfCheckboxGroup,
      currentProps.variant,
      currentProps.size,
      handleVariantChange,
      handleSizeChange,
    ]
  );

  const stateSection = useMemo(
    () => (
      <PropertySection title="State">
        <PropertySwitch
          label={PROPERTY_LABELS.SELECTED}
          isSelected={Boolean(currentProps.isSelected)}
          onChange={handleIsSelectedChange}
          icon={CheckSquare}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.INDETERMINATE}
          isSelected={Boolean(currentProps.isIndeterminate)}
          onChange={handleIsIndeterminateChange}
          icon={Minus}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.REQUIRED}
          isSelected={Boolean(currentProps.isRequired)}
          onChange={handleIsRequiredChange}
          icon={CheckSquare}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.INVALID}
          isSelected={Boolean(currentProps.isInvalid)}
          onChange={handleIsInvalidChange}
          icon={AlertCircle}
        />
      </PropertySection>
    ),
    [
      currentProps.isSelected,
      currentProps.isIndeterminate,
      currentProps.isRequired,
      currentProps.isInvalid,
      handleIsSelectedChange,
      handleIsIndeterminateChange,
      handleIsRequiredChange,
      handleIsInvalidChange,
    ]
  );

  const behaviorSection = useMemo(
    () => (
      <PropertySection title="Behavior">
        <PropertySwitch
          label={PROPERTY_LABELS.AUTO_FOCUS}
          isSelected={Boolean(currentProps.autoFocus)}
          onChange={handleAutoFocusChange}
          icon={Focus}
        />

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
      </PropertySection>
    ),
    [
      currentProps.autoFocus,
      currentProps.isDisabled,
      currentProps.isReadOnly,
      handleAutoFocusChange,
      handleIsDisabledChange,
      handleIsReadOnlyChange,
    ]
  );

  const formIntegrationSection = useMemo(
    () => (
      <PropertySection title="Form Integration">
        <PropertyInput
          label={PROPERTY_LABELS.NAME}
          value={String(currentProps.name || '')}
          onChange={handleNameChange}
          icon={Tag}
          placeholder="checkbox-name"
        />

        <PropertyInput
          label={PROPERTY_LABELS.VALUE}
          value={String(currentProps.value || '')}
          onChange={handleValueChange}
          icon={Hash}
          placeholder="checkbox-value"
        />

        <PropertyInput
          label={PROPERTY_LABELS.FORM}
          value={String(currentProps.form || '')}
          onChange={handleFormChange}
          icon={FileText}
          placeholder="form-id"
        />
      </PropertySection>
    ),
    [
      currentProps.name,
      currentProps.value,
      currentProps.form,
      handleNameChange,
      handleValueChange,
      handleFormChange,
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
          placeholder="Checkbox label for screen readers"
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
      currentProps,
      handleAriaLabelChange,
      handleAriaLabelledbyChange,
      handleAriaDescribedbyChange,
    ]
  );

  return (
    <>
      {basicSection}
      {contentSection}
      {designSection}
      {stateSection}
      {behaviorSection}
      {formIntegrationSection}
      {accessibilitySection}
    </>
  );
}, (prevProps, nextProps) => {
  // ⭐ 기본 비교: id와 properties만 비교
  return (
    prevProps.elementId === nextProps.elementId &&
    JSON.stringify(prevProps.currentProps) === JSON.stringify(nextProps.currentProps)
  );
});
