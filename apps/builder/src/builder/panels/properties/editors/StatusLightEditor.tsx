import { memo, useMemo } from "react";
import { Type, Parentheses, ToggleLeft } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertyInput,
  PropertySwitch,
  PropertySelect,
  PropertyCustomId,
  PropertySection,
  PropertySizeToggle,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const StatusLightEditor = memo(function StatusLightEditor({
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

  return (
    <>
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="status_light_1"
        />
      </PropertySection>

      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.TEXT}
          value={String(currentProps.children || "")}
          onChange={(value) => updateProp("children", value)}
          icon={Type}
          placeholder="Status text"
        />
      </PropertySection>

      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.VARIANT}
          value={String(currentProps.variant || "neutral")}
          onChange={(value) => updateProp("variant", value)}
          options={[
            { value: "neutral", label: "Neutral" },
            { value: "informative", label: "Informative" },
            { value: "positive", label: "Positive" },
            { value: "notice", label: "Notice" },
            { value: "negative", label: "Negative" },
            { value: "celery", label: "Celery" },
            { value: "chartreuse", label: "Chartreuse" },
            { value: "cyan", label: "Cyan" },
            { value: "fuchsia", label: "Fuchsia" },
            { value: "indigo", label: "Indigo" },
            { value: "magenta", label: "Magenta" },
            { value: "purple", label: "Purple" },
            { value: "yellow", label: "Yellow" },
          ]}
          icon={Parentheses}
        />

        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "M")}
          onChange={(value) => updateProp("size", value)}
          options={[
            { id: "S", label: "S" },
            { id: "M", label: "M" },
            { id: "L", label: "L" },
          ]}
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
