import { memo, useMemo } from "react";
import { Type, Tag, ToggleLeft, FileText } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertyInput,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const SelectBoxItemEditor = memo(function SelectBoxItemEditor({
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
          placeholder="selectbox_item_1"
        />
      </PropertySection>

      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.LABEL}
          value={String(currentProps.label || "")}
          onChange={(value) => updateProp("label", value)}
          icon={Type}
          placeholder="Option Label"
        />

        <PropertyInput
          label="Description"
          value={String(currentProps.description || "")}
          onChange={(value) => updateProp("description", value)}
          icon={FileText}
          placeholder="Option description"
        />

        <PropertyInput
          label="Value"
          value={String(currentProps.value || "")}
          onChange={(value) => updateProp("value", value)}
          icon={Tag}
          placeholder="option_value"
        />
      </PropertySection>

      <PropertySection title="Behavior">
        <PropertySwitch
          label="Selected"
          isSelected={Boolean(currentProps.isSelected)}
          onChange={(checked) => updateProp("isSelected", checked)}
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
