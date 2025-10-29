import { Tag } from "lucide-react";
import { PropertyInput, PropertyCustomId } from "../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/labels";
import { useStore } from "../../../stores";

export function ToolbarEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  // Get customId from element in store
  const element = useStore((state) => state.elements.find((el) => el.id === elementId));
  const customId = element?.customId || '';

  const updateProp = (key: string, value: unknown) => {
    const updatedProps = {
      ...currentProps,
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

  return (
    <div className="component-props">
      <PropertyCustomId
        label="ID"
        value={customId}
        elementId={elementId}
        onChange={updateCustomId}
        placeholder="toolbar_1"
      />

      <fieldset className="properties-aria">
        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABEL}
          value={String(currentProps["aria-label"] || "")}
          onChange={(value) => updateProp("aria-label", value)}
          icon={Tag}
        />
      </fieldset>
    </div>
  );
}
