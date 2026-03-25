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
  CalendarDays,
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

export const DateFieldEditor = memo(function DateFieldEditor({
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
      {/* Basic */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          onChange={updateCustomId}
          placeholder="datefield_1"
        />
      </PropertySection>

      {/* Content */}
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
          placeholder="YYYY-MM-DD"
        />
      </PropertySection>

      {/* Design */}
      <PropertySection title="Design">
        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={(value) => updateProp("size", value)}
        />

        <PropertySelect
          label={PROPERTY_LABELS.GRANULARITY}
          value={String(currentProps.granularity || "")}
          onChange={(value) => updateProp("granularity", value || undefined)}
          options={[
            { value: "", label: "Date Only" },
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

      {/* Internationalization */}
      <PropertySection title="Internationalization">
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

        <PropertySelect
          label={PROPERTY_LABELS.CALENDAR_SYSTEM}
          value={String(currentProps.calendar || "")}
          onChange={(value) => updateProp("calendar", value || undefined)}
          options={[
            { value: "", label: "Default (Locale)" },
            { value: "gregory", label: "Gregorian" },
            { value: "japanese", label: "Japanese" },
            { value: "buddhist", label: "Buddhist" },
            { value: "hebrew", label: "Hebrew" },
            { value: "islamic-civil", label: "Islamic (Civil)" },
            { value: "islamic-umalqura", label: "Islamic (Umm al-Qura)" },
            { value: "persian", label: "Persian" },
            { value: "indian", label: "Indian" },
            { value: "coptic", label: "Coptic" },
            { value: "ethiopic", label: "Ethiopic" },
          ]}
          icon={CalendarDays}
        />
      </PropertySection>

      {/* State */}
      <PropertySection title="State">
        <PropertyInput
          label="Min Value"
          value={String(currentProps.minValue || "")}
          onChange={(value) => updateProp("minValue", value || undefined)}
          placeholder="2024-01-01"
        />

        <PropertyInput
          label="Max Value"
          value={String(currentProps.maxValue || "")}
          onChange={(value) => updateProp("maxValue", value || undefined)}
          placeholder="2024-12-31"
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
      </PropertySection>

      {/* Form Integration */}
      <PropertySection title="Form Integration">
        <PropertyInput
          label={PROPERTY_LABELS.NAME}
          value={String(currentProps.name || "")}
          onChange={(value) => updateProp("name", value || undefined)}
          icon={FormInput}
          placeholder="date-field-name"
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
