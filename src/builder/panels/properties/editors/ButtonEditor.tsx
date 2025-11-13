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
} from "../../common";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export function ButtonEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  // Get customId from element in store
  const element = useStore((state) =>
    state.elements.find((el) => el.id === elementId)
  );
  const customId = element?.customId || "";

  const updateProp = (key: string, value: unknown) => {
    const updatedProps = {
      ...currentProps,
      [key]: value,
    };
    onUpdate(updatedProps);
  };

  return (
    <>
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="button_1"
        />
      </PropertySection>
      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.TEXT}
          value={String(currentProps.children || "")}
          onChange={(value) => updateProp("children", value)}
          icon={Type}
        />
      </PropertySection>

      {/* Design Section */}
      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.VARIANT}
          value={String(currentProps.variant || "default")}
          onChange={(value) => updateProp("variant", value)}
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
          onChange={(value) => updateProp("size", value)}
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

      {/* Behavior Section */}
      <PropertySection title="Behavior">
        <PropertySelect
          label={PROPERTY_LABELS.TYPE}
          value={String(currentProps.type || "button")}
          onChange={(value) => updateProp("type", value)}
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
          onChange={(checked) => updateProp("autoFocus", checked)}
          icon={Focus}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.IS_PENDING}
          isSelected={Boolean(currentProps.isPending)}
          onChange={(checked) => updateProp("isPending", checked)}
          icon={PointerOff}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.DISABLED}
          isSelected={Boolean(currentProps.isDisabled)}
          onChange={(checked) => updateProp("isDisabled", checked)}
          icon={PointerOff}
        />
      </PropertySection>

      {/* Link Section (when button acts as link) */}
      <PropertySection title="Link">
        <PropertyInput
          label={PROPERTY_LABELS.HREF}
          value={String(currentProps.href || "")}
          onChange={(value) => updateProp("href", value || undefined)}
          icon={Link}
          placeholder="https://example.com"
        />

        {typeof currentProps.href === "string" && currentProps.href && (
          <>
            <PropertySelect
              label={PROPERTY_LABELS.TARGET}
              value={String(currentProps.target || "_self")}
              onChange={(value) => updateProp("target", value)}
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
              onChange={(value) => updateProp("rel", value || undefined)}
              icon={FileText}
              placeholder="noopener noreferrer"
            />
          </>
        )}
      </PropertySection>

      {/* Form Section (for submit/reset buttons) */}
      {(currentProps.type === "submit" || currentProps.type === "reset") && (
        <PropertySection title="Form">
          <PropertyInput
            label={PROPERTY_LABELS.FORM}
            value={String(currentProps.form || "")}
            onChange={(value) => updateProp("form", value || undefined)}
            icon={FileText}
            placeholder="form-id"
          />

          <PropertyInput
            label={PROPERTY_LABELS.NAME}
            value={String(currentProps.name || "")}
            onChange={(value) => updateProp("name", value || undefined)}
            icon={Tag}
            placeholder="button-name"
          />

          <PropertyInput
            label={PROPERTY_LABELS.VALUE}
            value={String(currentProps.value || "")}
            onChange={(value) => updateProp("value", value || undefined)}
            icon={Hash}
            placeholder="button-value"
          />

          {currentProps.type === "submit" && (
            <>
              <PropertyInput
                label={PROPERTY_LABELS.FORM_ACTION}
                value={String(currentProps.formAction || "")}
                onChange={(value) =>
                  updateProp("formAction", value || undefined)
                }
                icon={Link}
                placeholder="/api/submit"
              />

              <PropertySelect
                label={PROPERTY_LABELS.FORM_METHOD}
                value={String(currentProps.formMethod || "get")}
                onChange={(value) => updateProp("formMethod", value)}
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
                onChange={(checked) => updateProp("formNoValidate", checked)}
                icon={PointerOff}
              />

              <PropertySelect
                label={PROPERTY_LABELS.FORM_TARGET}
                value={String(currentProps.formTarget || "_self")}
                onChange={(value) => updateProp("formTarget", value)}
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
      )}

      {/* Accessibility Section */}
      <PropertySection title="Accessibility">
        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABEL}
          value={String(currentProps["aria-label"] || "")}
          onChange={(value) => updateProp("aria-label", value || undefined)}
          icon={Type}
          placeholder="Button label for screen readers"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABELLEDBY}
          value={String(currentProps["aria-labelledby"] || "")}
          onChange={(value) =>
            updateProp("aria-labelledby", value || undefined)
          }
          icon={Hash}
          placeholder="label-element-id"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
          value={String(currentProps["aria-describedby"] || "")}
          onChange={(value) =>
            updateProp("aria-describedby", value || undefined)
          }
          icon={Hash}
          placeholder="description-element-id"
        />
      </PropertySection>
    </>
  );
}
