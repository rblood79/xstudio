import { memo, useMemo } from "react";
import { Tag, ArrowDown, ArrowUp, ToggleLeft } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertyInput,
  PropertySwitch,
  PropertySizeToggle,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const RangeSliderEditor = memo(function RangeSliderEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  const updateProp = (key: string, value: unknown) => {
    onUpdate({ ...currentProps, [key]: value });
  };

  const updateNumberProp = (key: string, value: string, fallback?: number) => {
    const num = value === "" ? undefined : Number(value) || fallback;
    updateProp(key, num);
  };

  return (
    <>
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="range_slider_1"
        />
      </PropertySection>

      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={String(currentProps.label || "")}
          onChange={(value) => updateProp("label", value)}
          icon={Tag}
          placeholder="Range"
        />
      </PropertySection>

      <PropertySection title="Design">
        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={(value) => updateProp("size", value)}
        />
      </PropertySection>

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

      <PropertySection title="Behavior">
        <PropertySwitch
          label={PROPERTY_LABELS.DISABLED}
          isSelected={Boolean(currentProps.isDisabled)}
          onChange={(checked) => updateProp("isDisabled", checked)}
          icon={ToggleLeft}
        />
      </PropertySection>
    </>
  );
});
