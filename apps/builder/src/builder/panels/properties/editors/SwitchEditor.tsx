import { memo, useCallback, useMemo } from "react";
import { ToggleLeft, Eye, PointerOff, PenOff, CheckSquare, Layout, PencilRuler, Focus, Hash, AlertCircle, FileText, Tag } from 'lucide-react';
import { PropertyInput, PropertySwitch, PropertyCustomId, PropertySelect , PropertySection} from '../../../components';
import { PropertyEditorProps } from '../types/editorTypes';
import { PROPERTY_LABELS } from '../../../../utils/ui/labels';
import { useStore } from '../../../stores';
import { useSyncChildProp } from '../../../hooks/useSyncChildProp';

export const SwitchEditor = memo(function SwitchEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  // ⭐ 자식 Label 동기화: Child Composition Pattern - useSyncChildProp 훅 사용
  const { buildChildUpdates } = useSyncChildProp(elementId);

  // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션
  const handleChildrenChange = useCallback((value: string) => {
    const updatedProps = { ...currentProps, children: value };
    const childUpdates = buildChildUpdates([
      { childTag: 'Label', propKey: 'children', value },
    ]);
    useStore.getState().updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
  }, [currentProps, buildChildUpdates]);

  const handleVariantChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, variant: value });
  }, [currentProps, onUpdate]);

  const handleSizeChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, size: value });
  }, [currentProps, onUpdate]);

  const handleIsSelectedChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isSelected: checked });
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
          placeholder="switch_1"
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
          icon={ToggleLeft}
        />
      </PropertySection>
    ),
    [currentProps.children, handleChildrenChange]
  );

  const designSection = useMemo(
    () => (
      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.VARIANT}
          value={String(currentProps.variant || 'default')}
          onChange={handleVariantChange}
          options={[
            { value: 'default', label: PROPERTY_LABELS.SWITCH_VARIANT_DEFAULT },
            { value: 'primary', label: PROPERTY_LABELS.SWITCH_VARIANT_PRIMARY },
            { value: 'secondary', label: PROPERTY_LABELS.SWITCH_VARIANT_SECONDARY },
            { value: 'surface', label: PROPERTY_LABELS.SWITCH_VARIANT_SURFACE }
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
    ),
    [currentProps.variant, currentProps.size, handleVariantChange, handleSizeChange]
  );

  const stateSection = useMemo(
    () => (
      <PropertySection title="State">
        <PropertySwitch
          label={PROPERTY_LABELS.SELECTED}
          isSelected={Boolean(currentProps.isSelected)}
          onChange={handleIsSelectedChange}
          icon={Eye}
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
      currentProps.isRequired,
      currentProps.isInvalid,
      handleIsSelectedChange,
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
          placeholder="switch-name"
        />

        <PropertyInput
          label={PROPERTY_LABELS.VALUE}
          value={String(currentProps.value || '')}
          onChange={handleValueChange}
          icon={Hash}
          placeholder="switch-value"
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

  return (
    <>
      {basicSection}
      {contentSection}
      {designSection}
      {stateSection}
      {behaviorSection}
      {formIntegrationSection}
    </>
  );
}, (prevProps, nextProps) => {
  // ⭐ 기본 비교: id와 properties만 비교
  return (
    prevProps.elementId === nextProps.elementId &&
    JSON.stringify(prevProps.currentProps) === JSON.stringify(nextProps.currentProps)
  );
});
