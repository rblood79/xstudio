import { memo, useMemo } from "react";
import {
  CalendarDays,
  Tag,
  PointerOff,
  PenOff,
  CheckSquare,
  AlertTriangle,
  Clock,
  Globe,
  Focus,
  FileText,
  FormInput,
} from "lucide-react";
import {
  PropertyInput,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
  PropertySelect,
  PropertySizeToggle,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

/** 자식에 동기화가 필요한 props (@sync DatePickerEditor 패턴) */
const SYNC_KEYS = new Set([
  "variant",
  "size",
  "locale",
  "calendarSystem",
  "defaultToday",
]);

export const DateRangePickerEditor = memo(function DateRangePickerEditor({
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

    const state = useStore.getState();
    const children = state.childrenMap.get(elementId) ?? [];

    // label 변경 → Label 자식의 children 동기화 (@sync DatePickerEditor)
    if (key === "label") {
      const labelChild = children.find((c) => c.tag === "Label");
      if (labelChild) {
        const freshProps =
          state.elementsMap.get(labelChild.id)?.props ?? labelChild.props;
        state.updateElement(labelChild.id, {
          props: { ...freshProps, children: value },
        });
      }
    }

    if (SYNC_KEYS.has(key)) {
      for (const child of children) {
        const freshProps =
          state.elementsMap.get(child.id)?.props ?? child.props;
        state.updateElement(child.id, {
          props: { ...freshProps, [key]: value },
        });
      }
    }
  };

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
          placeholder="daterangepicker_1"
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={String(currentProps.label || "")}
          onChange={(value) => updateProp("label", value || undefined)}
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

      {/* State Section */}
      <PropertySection title="State">
        <PropertySwitch
          label="Default to Today"
          isSelected={Boolean(currentProps.defaultToday)}
          onChange={(checked) => updateProp("defaultToday", checked)}
          icon={CalendarDays}
        />

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
      </PropertySection>

      {/* Behavior Section */}
      <PropertySection title="Behavior">
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

        <PropertySwitch
          label={PROPERTY_LABELS.SHOULD_CLOSE_ON_SELECT}
          isSelected={currentProps.shouldCloseOnSelect !== false}
          onChange={(checked) => updateProp("shouldCloseOnSelect", checked)}
        />
      </PropertySection>

      {/* Design Section — @sync DatePickerEditor */}
      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.VARIANT}
          value={String(currentProps.variant || "default")}
          onChange={(value) => updateProp("variant", value)}
          options={[
            { value: "default", label: "Default" },
            { value: "accent", label: "Accent" },
          ]}
        />

        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={(value) => updateProp("size", value)}
        />

        <PropertySelect
          label="Locale"
          value={String(currentProps.locale || "")}
          onChange={(value) => updateProp("locale", value || undefined)}
          options={[
            { value: "", label: "Default (Browser)" },
            { value: "ko-KR", label: "한국어 (ko-KR)" },
            { value: "en-US", label: "English (en-US)" },
            { value: "en-GB", label: "English (en-GB)" },
            { value: "ja-JP", label: "日本語 (ja-JP)" },
            { value: "zh-CN", label: "中文 (zh-CN)" },
            { value: "zh-TW", label: "中文 (zh-TW)" },
            { value: "de-DE", label: "Deutsch (de-DE)" },
            { value: "fr-FR", label: "Français (fr-FR)" },
            { value: "es-ES", label: "Español (es-ES)" },
            { value: "pt-BR", label: "Português (pt-BR)" },
            { value: "ar-SA", label: "العربية (ar-SA)" },
          ]}
          icon={Globe}
        />

        <PropertySelect
          label="Calendar System"
          value={String(currentProps.calendarSystem || "")}
          onChange={(value) => updateProp("calendarSystem", value || undefined)}
          options={[
            { value: "", label: "Default (Gregorian)" },
            { value: "buddhist", label: "Buddhist" },
            { value: "hebrew", label: "Hebrew" },
            { value: "indian", label: "Indian" },
            { value: "islamic-civil", label: "Islamic (Civil)" },
            { value: "islamic-umalqura", label: "Islamic (Umm al-Qura)" },
            { value: "japanese", label: "Japanese" },
            { value: "persian", label: "Persian" },
            { value: "roc", label: "Taiwan (ROC)" },
            { value: "coptic", label: "Coptic" },
            { value: "ethiopic", label: "Ethiopic" },
          ]}
          icon={CalendarDays}
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

        <PropertySelect
          label={PROPERTY_LABELS.PAGE_BEHAVIOR}
          value={String(currentProps.pageBehavior || "visible")}
          onChange={(value) => updateProp("pageBehavior", value)}
          options={[
            { value: "visible", label: "Visible" },
            { value: "single", label: "Single" },
          ]}
          icon={CalendarDays}
        />
      </PropertySection>

      {/* Form Integration Section — @sync DatePickerEditor */}
      <PropertySection title="Form Integration">
        <PropertyInput
          label="Start Name"
          value={String(currentProps.startName || "")}
          onChange={(value) => updateProp("startName", value || undefined)}
          icon={FormInput}
          placeholder="start-date"
        />

        <PropertyInput
          label="End Name"
          value={String(currentProps.endName || "")}
          onChange={(value) => updateProp("endName", value || undefined)}
          icon={FormInput}
          placeholder="end-date"
        />

        <PropertyInput
          label={PROPERTY_LABELS.AUTOCOMPLETE}
          value={String(currentProps.autoComplete || "")}
          onChange={(value) => updateProp("autoComplete", value || undefined)}
          icon={FormInput}
          placeholder="bday"
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
