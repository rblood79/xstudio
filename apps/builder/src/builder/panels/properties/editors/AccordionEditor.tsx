import { memo, useMemo } from "react";
import { ToggleLeft } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const AccordionEditor = memo(function AccordionEditor({
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
          placeholder="accordion_1"
        />
      </PropertySection>

      <PropertySection title="Behavior">
        <PropertySwitch
          label="Allow Multiple Expanded"
          isSelected={Boolean(currentProps.allowsMultipleExpanded)}
          onChange={(checked) => updateProp("allowsMultipleExpanded", checked)}
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
