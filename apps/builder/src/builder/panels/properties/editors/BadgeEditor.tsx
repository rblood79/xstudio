import { memo, useMemo } from "react";
import { Type, Parentheses, Circle, Activity } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertyInput,
  PropertySwitch,
  PropertySelect,
  PropertySizeToggle,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const BadgeEditor = memo(function BadgeEditor({
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
      ...currentProps,
      [key]: value,
    };
    onUpdate(updatedProps);
  };

  return (
    <>
      {/* Basic */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="badge_1"
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.TEXT}
          value={String(currentProps.children || "")}
          onChange={(value) => updateProp("children", value)}
          icon={Type}
          placeholder="5"
        />
      </PropertySection>

      {/* Design Section */}
      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.VARIANT}
          value={String(currentProps.variant || "accent")}
          onChange={(value) => updateProp("variant", value)}
          options={[
            { value: "accent", label: "Accent" },
            { value: "informative", label: "Informative" },
            { value: "neutral", label: "Neutral" },
            { value: "positive", label: "Positive" },
            { value: "notice", label: "Notice" },
            { value: "negative", label: "Negative" },
            { value: "gray", label: "Gray" },
            { value: "red", label: "Red" },
            { value: "orange", label: "Orange" },
            { value: "yellow", label: "Yellow" },
            { value: "green", label: "Green" },
            { value: "blue", label: "Blue" },
            { value: "purple", label: "Purple" },
            { value: "indigo", label: "Indigo" },
            { value: "cyan", label: "Cyan" },
            { value: "pink", label: "Pink" },
            { value: "turquoise", label: "Turquoise" },
            { value: "fuchsia", label: "Fuchsia" },
            { value: "magenta", label: "Magenta" },
          ]}
          icon={Parentheses}
        />

        <PropertySelect
          label="Fill Style"
          value={String(currentProps.fillStyle || "bold")}
          onChange={(value) => updateProp("fillStyle", value)}
          options={[
            { value: "bold", label: "Bold" },
            { value: "subtle", label: "Subtle" },
            { value: "outline", label: "Outline" },
          ]}
          icon={Parentheses}
        />

        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "S")}
          onChange={(value) => updateProp("size", value)}
          scale="5"
        />
      </PropertySection>

      {/* Behavior Section */}
      <PropertySection title="Behavior">
        <PropertySwitch
          label="Dot Badge"
          isSelected={Boolean(currentProps.isDot)}
          onChange={(checked) => updateProp("isDot", checked)}
          icon={Circle}
        />

        <PropertySwitch
          label="Pulsing Animation"
          isSelected={Boolean(currentProps.isPulsing)}
          onChange={(checked) => updateProp("isPulsing", checked)}
          icon={Activity}
        />
      </PropertySection>
    </>
  );
});
