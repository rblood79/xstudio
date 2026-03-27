import { memo, useCallback, useMemo } from "react";
import {
  Tag,
  CheckSquare,
  PointerOff,
  PenOff,
  Minus,
  Layout,
  Focus,
  Hash,
  AlertCircle,
  FileText,
} from "lucide-react";
import {
  PropertyInput,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
  PropertySizeToggle,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";
import { useSyncChildProp } from "../../../hooks/useSyncChildProp";

export const CheckboxHybridAfterSections = memo(
  function CheckboxHybridAfterSections({
    elementId,
    currentProps,
  }: PropertyEditorProps) {
    const { buildChildUpdates } = useSyncChildProp(elementId);

    const handleChildrenChange = useCallback(
      (value: string) => {
        const childUpdates = buildChildUpdates([
          { childTag: "Label", propKey: "children", value },
        ]);
        useStore
          .getState()
          .updateSelectedPropertiesWithChildren(
            { children: value },
            childUpdates,
          );
      },
      [buildChildUpdates],
    );

    return (
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={String(currentProps.children ?? "")}
          onChange={handleChildrenChange}
          icon={Tag}
        />
      </PropertySection>
    );
  },
);

export const CheckboxEditor = memo(
  function CheckboxEditor({
    elementId,
    currentProps,
    onUpdate,
  }: PropertyEditorProps) {
    // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
    const customId = useMemo(() => {
      const element = useStore.getState().elementsMap.get(elementId);
      return element?.customId || "";
    }, [elementId]);

    // ⭐ 최적화: parentElement도 getState로 가져오기
    const isChildOfCheckboxGroup = useMemo(() => {
      const element = useStore.getState().elementsMap.get(elementId);
      if (!element?.parent_id) return false;
      const parentElement = useStore
        .getState()
        .elementsMap.get(element.parent_id);
      return parentElement?.tag === "CheckboxGroup";
    }, [elementId]);

    // ⭐ 자식 Label 동기화: Child Composition Pattern - useSyncChildProp 훅 사용
    const { buildChildUpdates } = useSyncChildProp(elementId);

    // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션
    const handleChildrenChange = useCallback(
      (value: string) => {
        const updatedProps = { children: value };
        const childUpdates = buildChildUpdates([
          { childTag: "Label", propKey: "children", value },
        ]);
        useStore
          .getState()
          .updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
      },
      [buildChildUpdates],
    );

    const handleIsEmphasizedChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isEmphasized: checked });
      },
      [onUpdate],
    );

    const handleSizeChange = useCallback(
      (value: string) => {
        onUpdate({ size: value });
      },
      [onUpdate],
    );

    const handleIsSelectedChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isSelected: checked });
      },
      [onUpdate],
    );

    const handleIsIndeterminateChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isIndeterminate: checked });
      },
      [onUpdate],
    );

    const handleIsRequiredChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isRequired: checked });
      },
      [onUpdate],
    );

    const handleIsInvalidChange = useCallback(
      (checked: boolean) => {
        onUpdate({ isInvalid: checked });
      },
      [onUpdate],
    );

    const handleAutoFocusChange = useCallback(
      (checked: boolean) => {
        onUpdate({ autoFocus: checked });
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

    const handleNameChange = useCallback(
      (value: string) => {
        onUpdate({ name: value || undefined });
      },
      [onUpdate],
    );

    const handleValueChange = useCallback(
      (value: string) => {
        onUpdate({ value: value || undefined });
      },
      [onUpdate],
    );

    const handleFormChange = useCallback(
      (value: string) => {
        onUpdate({ form: value || undefined });
      },
      [onUpdate],
    );

    const updateCustomId = useCallback(
      (newCustomId: string) => {
        const updateElement = useStore.getState().updateElement;
        if (updateElement && elementId) {
          updateElement(elementId, { customId: newCustomId });
        }
      },
      [elementId],
    );

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
      [customId, elementId, updateCustomId],
    );

    const contentSection = useMemo(
      () => (
        <PropertySection title="Content">
          <PropertyInput
            label={PROPERTY_LABELS.LABEL}
            value={String(currentProps.children || "")}
            onChange={handleChildrenChange}
            icon={Tag}
          />
        </PropertySection>
      ),
      [currentProps.children, handleChildrenChange],
    );

    const designSection = useMemo(
      () =>
        !isChildOfCheckboxGroup ? (
          <PropertySection title="Design">
            <PropertySwitch
              label="Emphasized"
              isSelected={Boolean(currentProps.isEmphasized)}
              onChange={handleIsEmphasizedChange}
              icon={Layout}
            />

            <PropertySizeToggle
              label={PROPERTY_LABELS.SIZE}
              value={String(currentProps.size || "md")}
              onChange={handleSizeChange}
            />
          </PropertySection>
        ) : null,
      [
        isChildOfCheckboxGroup,
        currentProps.isEmphasized,
        currentProps.size,
        handleIsEmphasizedChange,
        handleSizeChange,
      ],
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
      ],
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
      ],
    );

    const formIntegrationSection = useMemo(
      () => (
        <PropertySection title="Form Integration">
          <PropertyInput
            label={PROPERTY_LABELS.NAME}
            value={String(currentProps.name || "")}
            onChange={handleNameChange}
            icon={Tag}
            placeholder="checkbox-name"
          />

          <PropertyInput
            label={PROPERTY_LABELS.VALUE}
            value={String(currentProps.value || "")}
            onChange={handleValueChange}
            icon={Hash}
            placeholder="checkbox-value"
          />

          <PropertyInput
            label={PROPERTY_LABELS.FORM}
            value={String(currentProps.form || "")}
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
      ],
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
