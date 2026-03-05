import { memo, useMemo } from "react";
import { Palette, PointerOff } from "lucide-react";
import {
  PropertySwitch,
  PropertySelect,
  PropertyCustomId,
  PropertySection,
  PropertyInput,
  PropertySizeToggle,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const ColorPickerEditor = memo(function ColorPickerEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  const updateProp = (key: string, value: unknown) => {
    const updatedProps = {
      ...currentProps,
      [key]: value,
    };
    onUpdate(updatedProps);
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
          placeholder="colorpicker_1"
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={String(currentProps.label || "")}
          onChange={(value) => updateProp("label", value || undefined)}
          icon={Palette}
        />

        <PropertyInput
          label="Default Value"
          value={String(currentProps.defaultValue || "")}
          onChange={(value) => updateProp("defaultValue", value || undefined)}
          placeholder="#000000"
          icon={Palette}
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
            { value: "neutral", label: "Neutral" },
          ]}
        />

        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "M")}
          onChange={(value) => updateProp("size", value)}
        />
      </PropertySection>
    </>
  );
});
