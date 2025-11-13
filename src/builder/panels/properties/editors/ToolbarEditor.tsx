import { Minus, Type, Hash } from "lucide-react";
import { PropertyInput, PropertyCustomId, PropertySelect } from '../../common';
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
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

      {/* Design Section */}
      <fieldset className="properties-design">
        <legend>Design</legend>

        <PropertySelect
          label={PROPERTY_LABELS.ORIENTATION}
          value={String(currentProps.orientation || "horizontal")}
          onChange={(value) => updateProp("orientation", value || undefined)}
          options={[
            { value: "horizontal", label: PROPERTY_LABELS.ORIENTATION_HORIZONTAL },
            { value: "vertical", label: PROPERTY_LABELS.ORIENTATION_VERTICAL },
          ]}
          icon={Minus}
        />
      </fieldset>

      {/* Accessibility Section */}
      <fieldset className="properties-group">
        <legend>Accessibility</legend>

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABEL}
          value={String(currentProps["aria-label"] || "")}
          onChange={(value) => updateProp("aria-label", value || undefined)}
          icon={Type}
          placeholder="Toolbar label for screen readers"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABELLEDBY}
          value={String(currentProps["aria-labelledby"] || "")}
          onChange={(value) => updateProp("aria-labelledby", value || undefined)}
          icon={Hash}
          placeholder="label-element-id"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_DESCRIBEDBY}
          value={String(currentProps["aria-describedby"] || "")}
          onChange={(value) => updateProp("aria-describedby", value || undefined)}
          icon={Hash}
          placeholder="description-element-id"
        />
      </fieldset>
    </div>
  );
}
