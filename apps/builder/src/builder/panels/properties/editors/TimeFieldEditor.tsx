import { memo, useMemo, useCallback } from "react";
import {
  Tag,
  PointerOff,
  PenOff,
  CheckSquare,
  AlertTriangle,
  Clock,
  FileText,
  FormInput,
  Globe,
  Layout,
  Focus,
} from "lucide-react";
import {
  PropertyInput,
  PropertySwitch,
  PropertySelect,
  PropertyCustomId,
  PropertySection,
  PropertySizeToggle,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";
import { useSyncChildProp } from "../../../hooks/useSyncChildProp";
import { LABEL_POSITION_OPTIONS } from "./editorUtils";

export const TimeFieldEditor = memo(function TimeFieldEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  const updateProp = (key: string, value: unknown) => {
    onUpdate({ [key]: value });
  };

  const { buildChildUpdates } = useSyncChildProp(elementId);

  const handleLabelChange = useCallback(
    (value: string) => {
      const updatedProps = { label: value };
      const childUpdates = buildChildUpdates([
        { childTag: "Label", propKey: "children", value },
      ]);
      useStore
        .getState()
        .updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
    },
    [buildChildUpdates],
  );

  const updateCustomId = (newCustomId: string) => {
    const updateElement = useStore.getState().updateElement;
    if (updateElement && elementId) {
      updateElement(elementId, { customId: newCustomId });
    }
  };

  return (
    <>
      {/* Content */}
      <PropertySection title="Content">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          onChange={updateCustomId}
          placeholder="timefield_1"
        />
        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={String(currentProps.label || "")}
          onChange={handleLabelChange}
          icon={Tag}
        />

        <PropertyInput
          label={PROPERTY_LABELS.DESCRIPTION}
          value={String(currentProps.description || "")}
          onChange={(value) => updateProp("description", value || undefined)}
          icon={FileText}
        />

        <PropertyInput
          label={PROPERTY_LABELS.ERROR_MESSAGE}
          value={String(currentProps.errorMessage || "")}
          onChange={(value) => updateProp("errorMessage", value || undefined)}
          icon={AlertTriangle}
        />

        <PropertyInput
          label={PROPERTY_LABELS.PLACEHOLDER}
          value={String(currentProps.placeholderValue || "")}
          onChange={(value) =>
            updateProp("placeholderValue", value || undefined)
          }
          placeholder="HH:MM"
        />
      </PropertySection>

      {/* Appearance */}
      <PropertySection title="Appearance">
        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={(value) => updateProp("size", value)}
        />

        <PropertySelect
          label={PROPERTY_LABELS.GRANULARITY}
          value={String(currentProps.granularity || "minute")}
          onChange={(value) => updateProp("granularity", value)}
          options={[
            { value: "hour", label: "Hour" },
            { value: "minute", label: "Minute" },
            { value: "second", label: "Second" },
          ]}
          icon={Clock}
        />

        <PropertySelect
          label={PROPERTY_LABELS.HOUR_CYCLE}
          value={String(currentProps.hourCycle || "")}
          onChange={(value) =>
            updateProp("hourCycle", value ? Number(value) : undefined)
          }
          options={[
            { value: "", label: "Default (Locale)" },
            { value: "12", label: "12 Hour" },
            { value: "24", label: "24 Hour" },
          ]}
          icon={Clock}
        />

        <PropertySelect
          label={PROPERTY_LABELS.LABEL_POSITION}
          value={String(currentProps.labelPosition || "top")}
          options={LABEL_POSITION_OPTIONS}
          onChange={(value) => updateProp("labelPosition", value)}
          icon={Layout}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.HIDE_TIMEZONE}
          isSelected={Boolean(currentProps.hideTimeZone)}
          onChange={(checked) => updateProp("hideTimeZone", checked)}
          icon={Globe}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.FORCE_LEADING_ZEROS}
          isSelected={Boolean(currentProps.shouldForceLeadingZeros)}
          onChange={(checked) => updateProp("shouldForceLeadingZeros", checked)}
          icon={Clock}
        />
      </PropertySection>

      {/* Locale */}
      <PropertySection title="Locale">
        <PropertySelect
          label={PROPERTY_LABELS.LOCALE}
          value={String(currentProps.locale || "")}
          onChange={(value) => updateProp("locale", value || undefined)}
          options={[
            { value: "", label: "Default (System)" },
            { value: "en-US", label: "English (US)" },
            { value: "en-GB", label: "English (UK)" },
            { value: "ko-KR", label: "한국어" },
            { value: "ja-JP", label: "日本語" },
            { value: "zh-CN", label: "中文 (简体)" },
            { value: "zh-TW", label: "中文 (繁體)" },
            { value: "de-DE", label: "Deutsch" },
            { value: "fr-FR", label: "Français" },
            { value: "es-ES", label: "Español" },
            { value: "pt-BR", label: "Português (BR)" },
            { value: "it-IT", label: "Italiano" },
            { value: "ru-RU", label: "Русский" },
            { value: "ar-SA", label: "العربية" },
            { value: "hi-IN", label: "हिन्दी" },
            { value: "th-TH", label: "ไทย" },
            { value: "vi-VN", label: "Tiếng Việt" },
          ]}
          icon={Globe}
        />
      </PropertySection>

      {/* State */}
      <PropertySection title="State">
        <PropertyInput
          label="Min Value"
          value={String(currentProps.minValue || "")}
          onChange={(value) => updateProp("minValue", value || undefined)}
          placeholder="09:00"
        />

        <PropertyInput
          label="Max Value"
          value={String(currentProps.maxValue || "")}
          onChange={(value) => updateProp("maxValue", value || undefined)}
          placeholder="18:00"
        />

        <PropertySelect
          label={PROPERTY_LABELS.REQUIRED}
          value={String(currentProps.necessityIndicator || "")}
          onChange={(value) => {
            if (value === "") {
              onUpdate({ isRequired: false, necessityIndicator: undefined });
            } else {
              onUpdate({ isRequired: true, necessityIndicator: value });
            }
          }}
          options={[
            { value: "", label: "None" },
            { value: "icon", label: "Icon (*)" },
            { value: "label", label: "Label (required/optional)" },
          ]}
          icon={CheckSquare}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.INVALID}
          isSelected={Boolean(currentProps.isInvalid)}
          onChange={(checked) => updateProp("isInvalid", checked)}
          icon={AlertTriangle}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.DISABLED}
          isSelected={Boolean(currentProps.isDisabled)}
          onChange={(checked) => updateProp("isDisabled", checked)}
          icon={PointerOff}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.READONLY}
          isSelected={Boolean(currentProps.isReadOnly)}
          onChange={(checked) => updateProp("isReadOnly", checked)}
          icon={PenOff}
        />

        <PropertySwitch
          label={PROPERTY_LABELS.AUTO_FOCUS}
          isSelected={Boolean(currentProps.autoFocus)}
          onChange={(checked) => updateProp("autoFocus", checked)}
          icon={Focus}
        />

        <PropertyInput
          label={PROPERTY_LABELS.NAME}
          value={String(currentProps.name || "")}
          onChange={(value) => updateProp("name", value || undefined)}
          icon={FormInput}
          placeholder="time-field-name"
        />

        <PropertySelect
          label={PROPERTY_LABELS.VALIDATION_BEHAVIOR}
          value={String(currentProps.validationBehavior || "native")}
          onChange={(value) => updateProp("validationBehavior", value)}
          options={[
            { value: "native", label: "Native" },
            { value: "aria", label: "ARIA" },
          ]}
        />
      </PropertySection>
    </>
  );
});
