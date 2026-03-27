import { memo, useCallback, useMemo } from "react";
import {
  PointerOff,
  Parentheses,
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
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";

export const ButtonHybridAfterSections = memo(
  function ButtonHybridAfterSections({
    currentProps,
    onUpdate,
  }: PropertyEditorProps) {
    const handleHrefChange = useCallback(
      (value: string) => {
        onUpdate({ href: value || undefined });
      },
      [onUpdate],
    );

    const handleTargetChange = useCallback(
      (value: string) => {
        onUpdate({ target: value });
      },
      [onUpdate],
    );

    const handleRelChange = useCallback(
      (value: string) => {
        onUpdate({ rel: value || undefined });
      },
      [onUpdate],
    );

    const handleFormChange = useCallback(
      (value: string) => {
        onUpdate({ form: value || undefined });
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

    const handleFormActionChange = useCallback(
      (value: string) => {
        onUpdate({ formAction: value || undefined });
      },
      [onUpdate],
    );

    const handleFormMethodChange = useCallback(
      (value: string) => {
        onUpdate({ formMethod: value });
      },
      [onUpdate],
    );

    const handleFormNoValidateChange = useCallback(
      (checked: boolean) => {
        onUpdate({ formNoValidate: checked });
      },
      [onUpdate],
    );

    const handleFormTargetChange = useCallback(
      (value: string) => {
        onUpdate({ formTarget: value });
      },
      [onUpdate],
    );

    const showLinkSection = useMemo(
      () => typeof currentProps.href === "string" && currentProps.href,
      [currentProps.href],
    );

    const showFormSection = useMemo(
      () => currentProps.type === "submit" || currentProps.type === "reset",
      [currentProps.type],
    );

    const showSubmitFields = useMemo(
      () => currentProps.type === "submit",
      [currentProps.type],
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
      ],
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
      ],
    );

    return (
      <>
        {linkSection}
        {formSection}
      </>
    );
  },
);
