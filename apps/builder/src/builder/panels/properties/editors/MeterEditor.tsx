import { memo, useMemo } from "react";
import {
  Tag,
  Gauge,
  Layout,
  ArrowDown,
  ArrowUp,
  Globe,
  DollarSign,
} from "lucide-react";
import {
  PropertySwitch,
  PropertySection,
  PropertyInput,
  PropertyCustomId,
  PropertySelect,
  PropertySizeToggle,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const MeterEditor = memo(function MeterEditor({
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

  const updateCustomId = (newCustomId: string) => {
    // Update customId in store (not in props)
    const updateElement = useStore.getState().updateElement;
    if (updateElement && elementId) {
      updateElement(elementId, { customId: newCustomId });
    }
  };

  // 숫자 프로퍼티 업데이트 함수
  const updateNumberProp = (
    key: string,
    value: string,
    defaultValue?: number,
  ) => {
    const numericValue =
      value === "" ? undefined : Number(value) || defaultValue;
    updateProp(key, numericValue);
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
          placeholder="meter_1"
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={String(currentProps.label || "")}
          onChange={(value) => updateProp("label", value)}
          icon={Tag}
        />

        <PropertyInput
          label={PROPERTY_LABELS.VALUE}
          value={String(currentProps.value ?? "")}
          onChange={(value) => updateNumberProp("value", value)}
          icon={Gauge}
          placeholder="50"
        />
      </PropertySection>

      {/* Number Formatting Section */}
      <PropertySection title="Number Formatting">
        <PropertyInput
          label="Locale"
          value={String(currentProps.locale || "")}
          onChange={(value) => updateProp("locale", value || undefined)}
          placeholder="ko-KR, en-US, etc."
          icon={Globe}
        />

        <PropertySelect
          label="Value Format"
          value={String(currentProps.valueFormat || "number")}
          onChange={(value) => updateProp("valueFormat", value)}
          options={[
            { value: "number", label: "Number" },
            { value: "percent", label: "Percent" },
            { value: "custom", label: "Custom" },
          ]}
          icon={DollarSign}
        />

        <PropertySwitch
          label="Show Value"
          isSelected={currentProps.showValue !== false}
          onChange={(checked) => updateProp("showValue", checked)}
          icon={Gauge}
        />
      </PropertySection>

      {/* Design Section */}
      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.VARIANT}
          value={String(currentProps.variant || "informative")}
          onChange={(value) => updateProp("variant", value)}
          options={[
            { value: "informative", label: "Informative" },
            { value: "positive", label: "Positive" },
            { value: "notice", label: "Notice" },
            { value: "negative", label: "Negative" },
          ]}
          icon={Layout}
        />

        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={(value) => updateProp("size", value)}
        />
      </PropertySection>

      {/* Range Section */}
      <PropertySection title="Range">
        <PropertyInput
          label={PROPERTY_LABELS.MIN_VALUE}
          value={String(currentProps.minValue ?? "")}
          onChange={(value) => updateNumberProp("minValue", value, 0)}
          icon={ArrowDown}
          placeholder="0"
        />

        <PropertyInput
          label={PROPERTY_LABELS.MAX_VALUE}
          value={String(currentProps.maxValue ?? "")}
          onChange={(value) => updateNumberProp("maxValue", value, 100)}
          icon={ArrowUp}
          placeholder="100"
        />
      </PropertySection>
    </>
  );
});
