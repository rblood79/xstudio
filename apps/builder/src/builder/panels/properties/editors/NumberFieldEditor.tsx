import { memo, useMemo, useCallback } from "react";
import {
  Tag,
  Hash,
  CheckSquare,
  AlertTriangle,
  PointerOff,
  PenOff,
  FileText,
  SpellCheck2,
  ArrowUp,
  ArrowDown,
  Move,
  Focus,
  Type,
  DollarSign,
  MousePointerClick,
  Globe,
  Hash as HashIcon,
  Layout,
} from "lucide-react";
import {
  PropertyInput,
  PropertySwitch,
  PropertyCustomId,
  PropertySelect,
  PropertySection,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";
import { useSyncChildProp } from "../../../hooks/useSyncChildProp";

export const NumberFieldEditor = memo(function NumberFieldEditor({
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
    const updatedProps = {
      [key]: value,
    };
    onUpdate(updatedProps);
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

  const handlePlaceholderChange = useCallback(
    (value: string) => {
      const updatedProps = { placeholder: value };
      const childUpdates = buildChildUpdates([
        { childTag: "Input", propKey: "placeholder", value },
      ]);
      useStore
        .getState()
        .updateSelectedPropertiesWithChildren(updatedProps, childUpdates);
    },
    [buildChildUpdates],
  );

  // formatOptions 업데이트 헬퍼
  const updateFormatOption = (key: string, value: unknown) => {
    const currentFormatOptions = currentProps.formatOptions || {};
    const updatedFormatOptions = {
      ...currentFormatOptions,
      [key]: value,
    };
    updateProp("formatOptions", updatedFormatOptions);
  };

  const formatOptions = (currentProps.formatOptions || {}) as Record<
    string,
    unknown
  >;

  return (
    <>
      {/* Basic */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="numberfield_1"
        />
      </PropertySection>

      {/* Design Section */}
      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.LABEL_POSITION}
          value={String(currentProps.labelPosition || "top")}
          options={[
            { value: "top", label: PROPERTY_LABELS.LABEL_POSITION_TOP },
            { value: "side", label: PROPERTY_LABELS.LABEL_POSITION_SIDE },
          ]}
          onChange={(value) => onUpdate({ labelPosition: value })}
          icon={Layout}
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={String(currentProps.label || "")}
          onChange={handleLabelChange}
          icon={Tag}
        />

        <PropertyInput
          label={PROPERTY_LABELS.VALUE}
          value={String(currentProps.value || "")}
          onChange={(value) =>
            updateProp("value", value ? Number(value) : undefined)
          }
          icon={Hash}
        />

        <PropertyInput
          label={PROPERTY_LABELS.PLACEHOLDER}
          value={String(currentProps.placeholder || "")}
          onChange={handlePlaceholderChange}
          icon={SpellCheck2}
          placeholder="Enter number..."
        />

        <PropertyInput
          label={PROPERTY_LABELS.DESCRIPTION}
          value={String(currentProps.description || "")}
          onChange={(value) => updateProp("description", value)}
          icon={FileText}
        />
      </PropertySection>

      {/* Internationalization Section */}
      <PropertySection title="Internationalization">
        <PropertyInput
          label="Locale"
          value={String(currentProps.locale || "")}
          onChange={(value) => updateProp("locale", value || undefined)}
          placeholder="ko-KR, en-US, etc."
          icon={Globe}
        />

        <PropertySelect
          label="Format Style"
          value={String(currentProps.formatStyle || "decimal")}
          onChange={(value) => updateProp("formatStyle", value)}
          options={[
            { value: "decimal", label: "Decimal" },
            { value: "currency", label: "Currency" },
            { value: "percent", label: "Percent" },
            { value: "unit", label: "Unit" },
          ]}
          icon={DollarSign}
        />

        {currentProps.formatStyle === "currency" && (
          <PropertySelect
            label="Currency"
            value={String(currentProps.currency || "KRW")}
            onChange={(value) => updateProp("currency", value)}
            options={[
              { value: "KRW", label: "KRW (₩)" },
              { value: "USD", label: "USD ($)" },
              { value: "EUR", label: "EUR (€)" },
              { value: "GBP", label: "GBP (£)" },
              { value: "JPY", label: "JPY (¥)" },
              { value: "CNY", label: "CNY (¥)" },
              { value: "AUD", label: "AUD ($)" },
              { value: "CAD", label: "CAD ($)" },
            ]}
            icon={DollarSign}
          />
        )}

        {currentProps.formatStyle === "unit" && (
          <PropertyInput
            label="Unit"
            value={String(currentProps.unit || "")}
            onChange={(value) => updateProp("unit", value || undefined)}
            icon={Type}
            placeholder="kilometer, celsius, megabyte, etc."
          />
        )}

        <PropertySelect
          label="Notation"
          value={String(currentProps.notation || "standard")}
          onChange={(value) => updateProp("notation", value)}
          options={[
            { value: "standard", label: "Standard" },
            { value: "compact", label: "Compact (1.2K, 1.5M)" },
            { value: "scientific", label: "Scientific" },
            { value: "engineering", label: "Engineering" },
          ]}
          icon={HashIcon}
        />

        <PropertyInput
          label="Decimals"
          value={String(currentProps.decimals ?? "")}
          onChange={(value) =>
            updateProp("decimals", value ? Number(value) : undefined)
          }
          icon={Hash}
          placeholder="2"
        />

        <PropertySwitch
          label="Show Group Separator"
          isSelected={currentProps.showGroupSeparator !== false}
          onChange={(checked) => updateProp("showGroupSeparator", checked)}
          icon={Hash}
        />
      </PropertySection>

      {/* Number Format Section (Legacy formatOptions) */}
      <PropertySection title="Advanced Format Options">
        <PropertyInput
          label={PROPERTY_LABELS.MIN_FRACTION_DIGITS}
          value={String(formatOptions.minimumFractionDigits ?? "")}
          onChange={(value) =>
            updateFormatOption(
              "minimumFractionDigits",
              value ? Number(value) : undefined,
            )
          }
          icon={Hash}
          placeholder="0"
        />

        <PropertyInput
          label={PROPERTY_LABELS.MAX_FRACTION_DIGITS}
          value={String(formatOptions.maximumFractionDigits ?? "")}
          onChange={(value) =>
            updateFormatOption(
              "maximumFractionDigits",
              value ? Number(value) : undefined,
            )
          }
          icon={Hash}
          placeholder="3"
        />
      </PropertySection>

      {/* Validation Section */}
      <PropertySection title="Validation">
        <PropertyInput
          label={PROPERTY_LABELS.ERROR_MESSAGE}
          value={String(currentProps.errorMessage || "")}
          onChange={(value) => updateProp("errorMessage", value)}
          icon={AlertTriangle}
        />

        <PropertyInput
          label={PROPERTY_LABELS.MIN_VALUE}
          value={String(currentProps.minValue ?? "")}
          onChange={(value) =>
            updateProp("minValue", value ? Number(value) : undefined)
          }
          icon={ArrowDown}
          placeholder="Minimum value"
        />

        <PropertyInput
          label={PROPERTY_LABELS.MAX_VALUE}
          value={String(currentProps.maxValue ?? "")}
          onChange={(value) =>
            updateProp("maxValue", value ? Number(value) : undefined)
          }
          icon={ArrowUp}
          placeholder="Maximum value"
        />

        <PropertyInput
          label={PROPERTY_LABELS.STEP}
          value={String(currentProps.step ?? "")}
          onChange={(value) =>
            updateProp("step", value ? Number(value) : undefined)
          }
          icon={Move}
          placeholder="1"
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
      </PropertySection>

      {/* Behavior Section */}
      <PropertySection title="Behavior">
        <PropertySwitch
          label={PROPERTY_LABELS.AUTO_FOCUS}
          isSelected={Boolean(currentProps.autoFocus)}
          onChange={(checked) => updateProp("autoFocus", checked)}
          icon={Focus}
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
          label={PROPERTY_LABELS.WHEEL_DISABLED}
          isSelected={Boolean(currentProps.isWheelDisabled)}
          onChange={(checked) => updateProp("isWheelDisabled", checked)}
          icon={MousePointerClick}
        />
      </PropertySection>

      {/* Form Integration Section */}
      <PropertySection title="Form Integration">
        <PropertyInput
          label={PROPERTY_LABELS.NAME}
          value={String(currentProps.name || "")}
          onChange={(value) => updateProp("name", value || undefined)}
          icon={Tag}
          placeholder="field-name"
        />

        <PropertyInput
          label={PROPERTY_LABELS.FORM}
          value={String(currentProps.form || "")}
          onChange={(value) => updateProp("form", value || undefined)}
          icon={FileText}
          placeholder="form-id"
        />
      </PropertySection>
    </>
  );
});
