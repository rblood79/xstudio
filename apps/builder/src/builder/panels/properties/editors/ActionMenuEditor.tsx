import { memo, useMemo } from "react";
import { Type, ToggleLeft, Layout } from "lucide-react";
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

export const ActionMenuEditor = memo(function ActionMenuEditor({
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
          placeholder="action_menu_1"
        />
      </PropertySection>

      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.TEXT}
          value={String(currentProps.children || "")}
          onChange={(value) => updateProp("children", value)}
          icon={Type}
          placeholder="Menu"
        />
      </PropertySection>

      <PropertySection title="Design">
        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={(value) => updateProp("size", value)}
          scale="5"
        />

        <PropertySelect
          label="Align"
          value={String(currentProps.align || "start")}
          onChange={(value) => updateProp("align", value)}
          options={[
            { value: "start", label: "Start" },
            { value: "end", label: "End" },
          ]}
          icon={Layout}
        />
      </PropertySection>

      <PropertySection title="Behavior">
        <PropertySwitch
          label="Quiet"
          isSelected={Boolean(currentProps.isQuiet)}
          onChange={(checked) => updateProp("isQuiet", checked)}
          icon={ToggleLeft}
        />

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
