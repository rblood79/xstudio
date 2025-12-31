import { memo, useCallback, useMemo } from "react";
import {
    Tag, Binary, CheckSquare, AlertTriangle, PointerOff, PenOff, FileText,
    SpellCheck2, Hash, Focus, Type, Keyboard, Shield
} from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId, PropertySelect , PropertySection} from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';

export const TextFieldEditor = memo(function TextFieldEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션
  const handleLabelChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, label: value });
  }, [currentProps, onUpdate]);

  const handleValueChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, value: value });
  }, [currentProps, onUpdate]);

  const handlePlaceholderChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, placeholder: value });
  }, [currentProps, onUpdate]);

  const handleDescriptionChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, description: value });
  }, [currentProps, onUpdate]);

  const handleTypeChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, type: value });
  }, [currentProps, onUpdate]);

  const handleInputModeChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, inputMode: value || undefined });
  }, [currentProps, onUpdate]);

  const handleAutoCompleteChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, autoComplete: value || undefined });
  }, [currentProps, onUpdate]);

  const handleErrorMessageChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, errorMessage: value });
  }, [currentProps, onUpdate]);

  const handlePatternChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, pattern: value || undefined });
  }, [currentProps, onUpdate]);

  const handleMinLengthChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, minLength: value ? Number(value) : undefined });
  }, [currentProps, onUpdate]);

  const handleMaxLengthChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, maxLength: value ? Number(value) : undefined });
  }, [currentProps, onUpdate]);

  const handleIsRequiredChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isRequired: checked });
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

  const handleSpellCheckChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, spellCheck: checked });
  }, [currentProps, onUpdate]);

  const handleAutoCorrectChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, autoCorrect: checked });
  }, [currentProps, onUpdate]);

  const handleNameChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, name: value || undefined });
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

  // ⭐ 최적화: 각 섹션을 useMemo로 감싸서 불필요한 JSX 재생성 방지
  const basicSection = useMemo(
    () => (
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="textfield_1"
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
          label={PROPERTY_LABELS.VALUE}
          value={String(currentProps.value || '')}
          onChange={handleValueChange}
          icon={Binary}
        />

        <PropertyInput
          label={PROPERTY_LABELS.PLACEHOLDER}
          value={String(currentProps.placeholder || '')}
          onChange={handlePlaceholderChange}
          icon={SpellCheck2}
          placeholder="Enter text..."
        />

        <PropertyInput
          label={PROPERTY_LABELS.DESCRIPTION}
          value={String(currentProps.description || '')}
          onChange={handleDescriptionChange}
          icon={FileText}
        />
      </PropertySection>
    ),
    [
      currentProps.label,
      currentProps.value,
      currentProps.placeholder,
      currentProps.description,
      handleLabelChange,
      handleValueChange,
      handlePlaceholderChange,
      handleDescriptionChange,
    ]
  );

  const inputTypeSection = useMemo(
    () => (
      <PropertySection title="Input Type">
        <PropertySelect
          label={PROPERTY_LABELS.INPUT_TYPE}
          value={String(currentProps.type || 'text')}
          onChange={handleTypeChange}
          options={[
            { value: 'text', label: PROPERTY_LABELS.INPUT_TYPE_TEXT },
            { value: 'email', label: PROPERTY_LABELS.INPUT_TYPE_EMAIL },
            { value: 'password', label: PROPERTY_LABELS.INPUT_TYPE_PASSWORD },
            { value: 'search', label: PROPERTY_LABELS.INPUT_TYPE_SEARCH },
            { value: 'tel', label: PROPERTY_LABELS.INPUT_TYPE_TEL },
            { value: 'url', label: PROPERTY_LABELS.INPUT_TYPE_URL },
            { value: 'number', label: PROPERTY_LABELS.INPUT_TYPE_NUMBER }
          ]}
          icon={Keyboard}
        />

        <PropertySelect
          label={PROPERTY_LABELS.INPUT_MODE}
          value={String(currentProps.inputMode || '')}
          onChange={handleInputModeChange}
          options={[
            { value: '', label: PROPERTY_LABELS.INPUT_MODE_NONE },
            { value: 'text', label: PROPERTY_LABELS.INPUT_MODE_TEXT },
            { value: 'numeric', label: PROPERTY_LABELS.INPUT_MODE_NUMERIC },
            { value: 'decimal', label: PROPERTY_LABELS.INPUT_MODE_DECIMAL },
            { value: 'tel', label: PROPERTY_LABELS.INPUT_MODE_TEL },
            { value: 'email', label: PROPERTY_LABELS.INPUT_MODE_EMAIL },
            { value: 'url', label: PROPERTY_LABELS.INPUT_MODE_URL },
            { value: 'search', label: PROPERTY_LABELS.INPUT_MODE_SEARCH }
          ]}
          icon={Keyboard}
        />

        <PropertySelect
          label={PROPERTY_LABELS.AUTOCOMPLETE}
          value={String(currentProps.autoComplete || '')}
          onChange={handleAutoCompleteChange}
          options={[
            { value: '', label: PROPERTY_LABELS.AUTO_COMPLETE_OFF },
            { value: 'on', label: PROPERTY_LABELS.AUTO_COMPLETE_ON },
            { value: 'name', label: PROPERTY_LABELS.AUTO_COMPLETE_NAME },
            { value: 'email', label: PROPERTY_LABELS.AUTO_COMPLETE_EMAIL },
            { value: 'username', label: PROPERTY_LABELS.AUTO_COMPLETE_USERNAME },
            { value: 'new-password', label: PROPERTY_LABELS.AUTO_COMPLETE_NEW_PASSWORD },
            { value: 'current-password', label: PROPERTY_LABELS.AUTO_COMPLETE_CURRENT_PASSWORD },
            { value: 'tel', label: PROPERTY_LABELS.AUTO_COMPLETE_TEL },
            { value: 'url', label: PROPERTY_LABELS.AUTO_COMPLETE_URL }
          ]}
          icon={SpellCheck2}
        />
      </PropertySection>
    ),
    [
      currentProps.type,
      currentProps.inputMode,
      currentProps.autoComplete,
      handleTypeChange,
      handleInputModeChange,
      handleAutoCompleteChange,
    ]
  );

  const validationSection = useMemo(
    () => (
      <PropertySection title="Validation">
        <PropertyInput
          label={PROPERTY_LABELS.ERROR_MESSAGE}
          value={String(currentProps.errorMessage || '')}
          onChange={handleErrorMessageChange}
          icon={AlertTriangle}
        />

        <PropertyInput
          label={PROPERTY_LABELS.PATTERN}
          value={String(currentProps.pattern || '')}
          onChange={handlePatternChange}
          icon={Shield}
          placeholder="Regular expression"
        />

        <PropertyInput
          label={PROPERTY_LABELS.MIN_LENGTH}
          value={String(currentProps.minLength || '')}
          onChange={handleMinLengthChange}
          icon={Hash}
          placeholder="0"
        />

        <PropertyInput
          label={PROPERTY_LABELS.MAX_LENGTH}
          value={String(currentProps.maxLength || '')}
          onChange={handleMaxLengthChange}
          icon={Hash}
          placeholder="100"
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
      currentProps.errorMessage,
      currentProps.pattern,
      currentProps.minLength,
      currentProps.maxLength,
      currentProps.isRequired,
      handleErrorMessageChange,
      handlePatternChange,
      handleMinLengthChange,
      handleMaxLengthChange,
      handleIsRequiredChange,
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

        <PropertySwitch
          label={PROPERTY_LABELS.SPELL_CHECK}
          isSelected={Boolean(currentProps.spellCheck)}
          onChange={handleSpellCheckChange}
          icon={SpellCheck2}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.AUTO_CORRECT}
          isSelected={Boolean(currentProps.autoCorrect)}
          onChange={handleAutoCorrectChange}
          icon={SpellCheck2}
        />
      </PropertySection>
    ),
    [
      currentProps.autoFocus,
      currentProps.isDisabled,
      currentProps.isReadOnly,
      currentProps.spellCheck,
      currentProps.autoCorrect,
      handleAutoFocusChange,
      handleIsDisabledChange,
      handleIsReadOnlyChange,
      handleSpellCheckChange,
      handleAutoCorrectChange,
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
          placeholder="field-name"
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
      currentProps.form,
      handleNameChange,
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
          placeholder="Field label for screen readers"
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
      {inputTypeSection}
      {validationSection}
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