import { memo, useMemo } from "react";
import {
  Calendar,
  PointerOff,
  PenOff,
  AlertTriangle,
  Focus,
  Globe,
  CalendarDays,
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

export const CalendarEditor = memo(function CalendarEditor({
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

    // CalendarHeader/CalendarGrid 자식에 variant/size/defaultToday 동기화
    if (key === "variant" || key === "size" || key === "defaultToday") {
      const state = useStore.getState();
      const children = state.childrenMap.get(elementId) ?? [];
      for (const child of children) {
        if (child.tag === "CalendarHeader" || child.tag === "CalendarGrid") {
          const childUpdate: Record<string, unknown> =
            key === "defaultToday" && child.tag !== "CalendarGrid"
              ? {}
              : { [key]: value };
          if (Object.keys(childUpdate).length > 0) {
            state.updateElement(child.id, {
              props: { ...child.props, ...childUpdate },
            });
          }
        }
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
          placeholder="calendar_1"
        />
      </PropertySection>

      {/* Design Section */}
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
      </PropertySection>

      {/* State Section */}
      <PropertySection title="State">
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

        <PropertySwitch
          label="Default to Today"
          isSelected={Boolean(currentProps.defaultToday)}
          onChange={(checked) => updateProp("defaultToday", checked)}
          icon={CalendarDays}
        />

        <PropertyInput
          label="Min Date"
          value={String(currentProps.minDate || "")}
          onChange={(value) => updateProp("minDate", value || undefined)}
          placeholder="2024-01-01"
        />

        <PropertyInput
          label="Max Date"
          value={String(currentProps.maxDate || "")}
          onChange={(value) => updateProp("maxDate", value || undefined)}
          placeholder="2024-12-31"
        />

        <PropertyInput
          label={PROPERTY_LABELS.DEFAULT_VALUE}
          value={String(currentProps.defaultValue || "")}
          onChange={(value) => updateProp("defaultValue", value || undefined)}
          placeholder="YYYY-MM-DD"
        />

        <PropertyInput
          label={PROPERTY_LABELS.DEFAULT_FOCUSED_VALUE}
          value={String(currentProps.defaultFocusedValue || "")}
          onChange={(value) =>
            updateProp("defaultFocusedValue", value || undefined)
          }
          placeholder="YYYY-MM-DD"
        />

        <PropertySwitch
          label={PROPERTY_LABELS.INVALID}
          isSelected={Boolean(currentProps.isInvalid)}
          onChange={(checked) => updateProp("isInvalid", checked)}
          icon={AlertTriangle}
        />

        <PropertyInput
          label={PROPERTY_LABELS.ERROR_MESSAGE}
          value={String(currentProps.errorMessage || "")}
          onChange={(value) => updateProp("errorMessage", value || undefined)}
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

        <PropertySelect
          label={PROPERTY_LABELS.PAGE_BEHAVIOR}
          value={String(currentProps.pageBehavior || "visible")}
          onChange={(value) => updateProp("pageBehavior", value)}
          options={[
            { value: "visible", label: "Visible" },
            { value: "single", label: "Single" },
          ]}
          icon={Calendar}
        />

        <PropertySelect
          label={PROPERTY_LABELS.FIRST_DAY_OF_WEEK}
          value={String(currentProps.firstDayOfWeek || "")}
          onChange={(value) => updateProp("firstDayOfWeek", value || undefined)}
          options={[
            { value: "", label: "Default (Locale)" },
            { value: "sun", label: "Sunday" },
            { value: "mon", label: "Monday" },
            { value: "tue", label: "Tuesday" },
            { value: "wed", label: "Wednesday" },
            { value: "thu", label: "Thursday" },
            { value: "fri", label: "Friday" },
            { value: "sat", label: "Saturday" },
          ]}
          icon={Calendar}
        />

        <PropertySelect
          label={PROPERTY_LABELS.SELECTION_ALIGNMENT}
          value={String(currentProps.selectionAlignment || "center")}
          onChange={(value) => updateProp("selectionAlignment", value)}
          options={[
            { value: "start", label: "Start" },
            { value: "center", label: "Center" },
            { value: "end", label: "End" },
          ]}
          icon={Calendar}
        />

        <PropertySelect
          label="Visible Months"
          value={String(currentProps.visibleMonths || "1")}
          onChange={(value) => updateProp("visibleMonths", Number(value))}
          options={[
            { value: "1", label: "1 Month" },
            { value: "2", label: "2 Months" },
            { value: "3", label: "3 Months" },
          ]}
          icon={Calendar}
        />
      </PropertySection>
    </>
  );
});
