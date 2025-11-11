import { MessageSquare, Move, MapPin } from "lucide-react";
import { PropertyInput, PropertyCustomId, PropertySelect } from "../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/labels";
import { useStore } from "../../../stores";

export function TooltipEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
        placeholder="tooltip_1"
      />

      {/* Content Section */}
      <fieldset className="properties-group">
        <legend>Content</legend>

        <PropertyInput
          label={PROPERTY_LABELS.TEXT}
          value={String(currentProps.children || "")}
          onChange={(value) => updateProp("children", value)}
          icon={MessageSquare}
        />
      </fieldset>

      {/* Position Section */}
      <fieldset className="properties-group">
        <legend>Position</legend>

        <PropertySelect
          label={PROPERTY_LABELS.PLACEMENT}
          value={String(currentProps.placement || "top")}
          onChange={(value) => updateProp("placement", value || undefined)}
          options={[
            { value: "top", label: PROPERTY_LABELS.PLACEMENT_TOP },
            { value: "bottom", label: PROPERTY_LABELS.PLACEMENT_BOTTOM },
            { value: "left", label: PROPERTY_LABELS.PLACEMENT_LEFT },
            { value: "right", label: PROPERTY_LABELS.PLACEMENT_RIGHT },
            { value: "start", label: PROPERTY_LABELS.PLACEMENT_START },
            { value: "end", label: PROPERTY_LABELS.PLACEMENT_END },
          ]}
          icon={MapPin}
        />

        <PropertyInput
          label={PROPERTY_LABELS.OFFSET}
          value={String(currentProps.offset ?? "")}
          onChange={(value) => updateProp("offset", value ? Number(value) : undefined)}
          icon={Move}
          placeholder="0"
        />
      </fieldset>
    </div>
  );
}
