import { Tag } from "lucide-react";
import { PropertyInput } from "../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/labels";

export function ToolbarEditor({ currentProps, onUpdate }: PropertyEditorProps) {
  const updateProp = (key: string, value: unknown) => {
    const updatedProps = {
      ...currentProps,
      [key]: value,
    };
    onUpdate(updatedProps);
  };

  return (
    <div className="component-props">
      <fieldset className="properties-aria">
        <PropertyInput
          label="Aria Label"
          value={String(currentProps["aria-label"] || "")}
          onChange={(value) => updateProp("aria-label", value)}
          icon={Tag}
        />
      </fieldset>
    </div>
  );
}
