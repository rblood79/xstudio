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
import {
  buildRequiredUpdate,
  NECESSITY_INDICATOR_OPTIONS,
  LOCALE_OPTIONS,
  CALENDAR_SYSTEM_OPTIONS,
  GRANULARITY_OPTIONS,
  HOUR_CYCLE_OPTIONS,
  PAGE_BEHAVIOR_OPTIONS,
  VALIDATION_BEHAVIOR_OPTIONS,
} from "./editorUtils";

/**
 * DateRangePickerEditor
 *
 * DatePickerEditor와 동일한 구조 (@sync editorUtils.ts).
 * 차이: Form section (startName/endName), defaultValue 없음.
 */
export const DateRangePickerEditor = memo(function DateRangePickerEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  // ADR-048: propagation은 PropertiesPanel handleUpdate에서 자동 처리
  const updateProp = (key: string, value: unknown) => {
    onUpdate({ [key]: value });
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
          onChange={(value) => onUpdate(buildRequiredUpdate(value))}
          options={NECESSITY_INDICATOR_OPTIONS}
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
          options={LOCALE_OPTIONS}
          icon={Globe}
        />

        <PropertySelect
          label="Calendar System"
          value={String(currentProps.calendarSystem || "")}
          onChange={(value) => updateProp("calendarSystem", value || undefined)}
          options={CALENDAR_SYSTEM_OPTIONS}
          icon={CalendarDays}
        />

        <PropertySelect
          label={PROPERTY_LABELS.GRANULARITY}
          value={String(currentProps.granularity || "")}
          onChange={(value) => updateProp("granularity", value || undefined)}
          options={GRANULARITY_OPTIONS}
          icon={Clock}
        />

        <PropertySelect
          label={PROPERTY_LABELS.HOUR_CYCLE}
          value={String(currentProps.hourCycle || "")}
          onChange={(value) =>
            updateProp("hourCycle", value ? Number(value) : undefined)
          }
          options={HOUR_CYCLE_OPTIONS}
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
          options={PAGE_BEHAVIOR_OPTIONS}
          icon={CalendarDays}
        />
      </PropertySection>

      {/* Form Integration Section — DateRangePicker: startName/endName */}
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
          options={VALIDATION_BEHAVIOR_OPTIONS}
        />
      </PropertySection>
    </>
  );
});
