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
  PropertySelect,
  PropertyCustomId,
  PropertySection,
  PropertySizeToggle,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const DatePickerEditor = memo(function DatePickerEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  // Get customId from element in store
  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  const updateProp = (key: string, value: unknown) => {
    onUpdate({ [key]: value });

    // label 변경 → Label 자식의 children 동기화
    if (key === "label") {
      const state = useStore.getState();
      const children = state.childrenMap.get(elementId) ?? [];
      const labelChild = children.find((c) => c.tag === "Label");
      if (labelChild) {
        state.updateElement(labelChild.id, {
          props: { ...labelChild.props, children: value },
        });
      }
    }

    // 자식에 동기화가 필요한 props (@sync CalendarEditor 패턴)
    const syncKeys = new Set([
      "variant",
      "size",
      "locale",
      "calendarSystem",
      "defaultToday",
    ]);
    if (syncKeys.has(key)) {
      const state = useStore.getState();
      const children = state.childrenMap.get(elementId) ?? [];
      const syncChildren = (kids: typeof children) => {
        for (const child of kids) {
          // defaultToday는 CalendarGrid에만 적용
          if (key === "defaultToday" && child.tag !== "CalendarGrid") {
            // Calendar 자식 탐색
            const grandChildren = state.childrenMap.get(child.id) ?? [];
            syncChildren(grandChildren);
            continue;
          }
          // Label은 size/variant만 동기화
          if (child.tag === "Label" && key !== "size" && key !== "variant")
            continue;

          state.updateElement(child.id, {
            props: { ...child.props, [key]: value },
          });

          // Calendar의 자식(CalendarHeader/CalendarGrid)에도 전파
          if (child.tag === "Calendar") {
            const grandChildren = state.childrenMap.get(child.id) ?? [];
            syncChildren(grandChildren);
          }
        }
      };
      syncChildren(children);
    }
  };

  const updateCustomId = (newCustomId: string) => {
    // Update customId in store (not in props)
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
          placeholder="datepicker_1"
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
        <PropertyInput
          label="Timezone"
          value={String(currentProps.timezone || "")}
          onChange={(value) => updateProp("timezone", value || undefined)}
          placeholder="Asia/Seoul"
          icon={Globe}
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
          icon={CalendarDays}
        />
      </PropertySection>

      {/* Form Integration Section */}
      <PropertySection title="Form Integration">
        <PropertyInput
          label={PROPERTY_LABELS.NAME}
          value={String(currentProps.name || "")}
          onChange={(value) => updateProp("name", value || undefined)}
          icon={FormInput}
          placeholder="date-picker-name"
        />

        <PropertyInput
          label={PROPERTY_LABELS.FORM}
          value={String(currentProps.form || "")}
          onChange={(value) => updateProp("form", value || undefined)}
          icon={FormInput}
          placeholder="form-id"
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
