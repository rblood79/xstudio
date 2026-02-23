import { memo, useCallback, useMemo } from "react";
import {
  Type,
  PointerOff,
  Parentheses,
  Focus,
  Link,
  FileText,
  Hash,
  Tag,
} from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertyInput,
  PropertySwitch,
  PropertySelect,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const ButtonEditor = memo(function ButtonEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  // useMemo로 캐싱하되, elementId가 변경될 때만 재계산
  // PropertyCustomId는 React.memo로 감싸져 있어서 customId가 실제로 변경될 때만 리렌더링됨
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  // ⭐ 최적화: 각 필드별 onChange 함수를 개별 메모이제이션
  // PropertyEditorWrapper가 이미 깊은 비교를 수행하므로
  // currentProps가 실제로 변경될 때만 ButtonEditor가 리렌더링됨
  // 각 자식 컴포넌트(PropertySwitch, PropertyInput 등)는 React.memo로
  // 실제 value/isSelected가 변경될 때만 리렌더링됨
  const handleChildrenChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, children: value });
  }, [currentProps, onUpdate]);

  const handleVariantChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, variant: value });
  }, [currentProps, onUpdate]);

  const handleSizeChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, size: value });
  }, [currentProps, onUpdate]);

  const handleTypeChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, type: value });
  }, [currentProps, onUpdate]);

  const handleAutoFocusChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, autoFocus: checked });
  }, [currentProps, onUpdate]);

  const handleIsPendingChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isPending: checked });
  }, [currentProps, onUpdate]);

  const handleIsDisabledChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, isDisabled: checked });
  }, [currentProps, onUpdate]);

  const handleHrefChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, href: value || undefined });
  }, [currentProps, onUpdate]);

  const handleTargetChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, target: value });
  }, [currentProps, onUpdate]);

  const handleRelChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, rel: value || undefined });
  }, [currentProps, onUpdate]);

  const handleFormChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, form: value || undefined });
  }, [currentProps, onUpdate]);

  const handleNameChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, name: value || undefined });
  }, [currentProps, onUpdate]);

  const handleValueChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, value: value || undefined });
  }, [currentProps, onUpdate]);

  const handleFormActionChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, formAction: value || undefined });
  }, [currentProps, onUpdate]);

  const handleFormMethodChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, formMethod: value });
  }, [currentProps, onUpdate]);

  const handleFormNoValidateChange = useCallback((checked: boolean) => {
    onUpdate({ ...currentProps, formNoValidate: checked });
  }, [currentProps, onUpdate]);

  const handleFormTargetChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, formTarget: value });
  }, [currentProps, onUpdate]);

  // ⭐ 최적화: 조건부 렌더링을 위한 값들을 useMemo로 캐싱
  const showLinkSection = useMemo(
    () => typeof currentProps.href === "string" && currentProps.href,
    [currentProps.href]
  );

  const showFormSection = useMemo(
    () => currentProps.type === "submit" || currentProps.type === "reset",
    [currentProps.type]
  );

  const showSubmitFields = useMemo(
    () => currentProps.type === "submit",
    [currentProps.type]
  );

  // ⭐ 최적화: 각 섹션을 useMemo로 감싸서 불필요한 JSX 재생성 방지
  // variant를 변경해도 Behavior Section의 JSX는 재생성되지 않음!
  const basicSection = useMemo(
    () => (
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="button_1"
        />
      </PropertySection>
    ),
    [customId, elementId]
  );

  const contentSection = useMemo(
    () => (
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.TEXT}
          value={String(currentProps.children || "")}
          onChange={handleChildrenChange}
          icon={Type}
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
          value={String(currentProps.variant || "default")}
          onChange={handleVariantChange}
          options={[
            { value: "default", label: PROPERTY_LABELS.VARIANT_DEFAULT },
            { value: "primary", label: PROPERTY_LABELS.VARIANT_PRIMARY },
            { value: "secondary", label: PROPERTY_LABELS.VARIANT_SECONDARY },
            { value: "surface", label: PROPERTY_LABELS.VARIANT_SURFACE },
            { value: "outline", label: PROPERTY_LABELS.VARIANT_OUTLINE },
            { value: "ghost", label: PROPERTY_LABELS.VARIANT_GHOST },
          ]}
          icon={Parentheses}
        />

        <PropertySelect
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "sm")}
          onChange={handleSizeChange}
          options={[
            { value: "xs", label: PROPERTY_LABELS.SIZE_XS },
            { value: "sm", label: PROPERTY_LABELS.SIZE_SM },
            { value: "md", label: PROPERTY_LABELS.SIZE_MD },
            { value: "lg", label: PROPERTY_LABELS.SIZE_LG },
            { value: "xl", label: PROPERTY_LABELS.SIZE_XL },
          ]}
          icon={Parentheses}
        />
      </PropertySection>
    ),
    [currentProps.variant, currentProps.size, handleVariantChange, handleSizeChange]
  );

  const behaviorSection = useMemo(
    () => (
      <PropertySection title="Behavior">
        <PropertySelect
          label={PROPERTY_LABELS.TYPE}
          value={String(currentProps.type || "button")}
          onChange={handleTypeChange}
          options={[
            { value: "button", label: PROPERTY_LABELS.BUTTON },
            { value: "submit", label: PROPERTY_LABELS.SUBMIT },
            { value: "reset", label: PROPERTY_LABELS.RESET },
          ]}
          icon={Parentheses}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.AUTO_FOCUS}
          isSelected={Boolean(currentProps.autoFocus)}
          onChange={handleAutoFocusChange}
          icon={Focus}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.IS_PENDING}
          isSelected={Boolean(currentProps.isPending)}
          onChange={handleIsPendingChange}
          icon={PointerOff}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.DISABLED}
          isSelected={Boolean(currentProps.isDisabled)}
          onChange={handleIsDisabledChange}
          icon={PointerOff}
        />
      </PropertySection>
    ),
    [
      currentProps.type,
      currentProps.autoFocus,
      currentProps.isPending,
      currentProps.isDisabled,
      handleTypeChange,
      handleAutoFocusChange,
      handleIsPendingChange,
      handleIsDisabledChange,
    ]
  );

  const linkSection = useMemo(
    () => (
      <PropertySection title="Link">
        <PropertyInput
          label={PROPERTY_LABELS.HREF}
          value={String(currentProps.href || "")}
          onChange={handleHrefChange}
          icon={Link}
          placeholder="https://example.com"
        />

        {showLinkSection && (
          <>
            <PropertySelect
              label={PROPERTY_LABELS.TARGET}
              value={String(currentProps.target || "_self")}
              onChange={handleTargetChange}
              options={[
                { value: "_self", label: PROPERTY_LABELS.TARGET_SELF },
                { value: "_blank", label: PROPERTY_LABELS.TARGET_BLANK },
                { value: "_parent", label: PROPERTY_LABELS.TARGET_PARENT },
                { value: "_top", label: PROPERTY_LABELS.TARGET_TOP },
              ]}
              icon={Parentheses}
            />

            <PropertyInput
              label={PROPERTY_LABELS.REL}
              value={String(currentProps.rel || "")}
              onChange={handleRelChange}
              icon={FileText}
              placeholder="noopener noreferrer"
            />
          </>
        )}
      </PropertySection>
    ),
    [
      currentProps.href,
      currentProps.target,
      currentProps.rel,
      showLinkSection,
      handleHrefChange,
      handleTargetChange,
      handleRelChange,
    ]
  );

  const formSection = useMemo(
    () =>
      showFormSection ? (
        <PropertySection title="Form">
          <PropertyInput
            label={PROPERTY_LABELS.FORM}
            value={String(currentProps.form || "")}
            onChange={handleFormChange}
            icon={FileText}
            placeholder="form-id"
          />

          <PropertyInput
            label={PROPERTY_LABELS.NAME}
            value={String(currentProps.name || "")}
            onChange={handleNameChange}
            icon={Tag}
            placeholder="button-name"
          />

          <PropertyInput
            label={PROPERTY_LABELS.VALUE}
            value={String(currentProps.value || "")}
            onChange={handleValueChange}
            icon={Hash}
            placeholder="button-value"
          />

          {showSubmitFields && (
            <>
              <PropertyInput
                label={PROPERTY_LABELS.FORM_ACTION}
                value={String(currentProps.formAction || "")}
                onChange={handleFormActionChange}
                icon={Link}
                placeholder="/api/submit"
              />

              <PropertySelect
                label={PROPERTY_LABELS.FORM_METHOD}
                value={String(currentProps.formMethod || "get")}
                onChange={handleFormMethodChange}
                options={[
                  { value: "get", label: PROPERTY_LABELS.FORM_METHOD_GET },
                  { value: "post", label: PROPERTY_LABELS.FORM_METHOD_POST },
                  {
                    value: "dialog",
                    label: PROPERTY_LABELS.FORM_METHOD_DIALOG,
                  },
                ]}
                icon={Parentheses}
              />

              <PropertySwitch
                label={PROPERTY_LABELS.FORM_NO_VALIDATE}
                isSelected={Boolean(currentProps.formNoValidate)}
                onChange={handleFormNoValidateChange}
                icon={PointerOff}
              />

              <PropertySelect
                label={PROPERTY_LABELS.FORM_TARGET}
                value={String(currentProps.formTarget || "_self")}
                onChange={handleFormTargetChange}
                options={[
                  { value: "_self", label: PROPERTY_LABELS.TARGET_SELF },
                  { value: "_blank", label: PROPERTY_LABELS.TARGET_BLANK },
                  { value: "_parent", label: PROPERTY_LABELS.TARGET_PARENT },
                  { value: "_top", label: PROPERTY_LABELS.TARGET_TOP },
                ]}
                icon={Parentheses}
              />
            </>
          )}
        </PropertySection>
      ) : null,
    [
      showFormSection,
      showSubmitFields,
      currentProps.form,
      currentProps.name,
      currentProps.value,
      currentProps.formAction,
      currentProps.formMethod,
      currentProps.formNoValidate,
      currentProps.formTarget,
      handleFormChange,
      handleNameChange,
      handleValueChange,
      handleFormActionChange,
      handleFormMethodChange,
      handleFormNoValidateChange,
      handleFormTargetChange,
    ]
  );

  return (
    <>
      {basicSection}
      {contentSection}
      {designSection}
      {behaviorSection}
      {linkSection}
      {formSection}
    </>
  );
});
// ⭐ memo의 기본 shallow 비교 사용 (PropertyEditorWrapper가 깊은 비교 수행)
