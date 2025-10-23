import { MessageSquare } from "lucide-react";
import { PropertyInput } from "../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/labels";

export function TooltipEditor({ currentProps, onUpdate }: PropertyEditorProps) {
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
          label={PROPERTY_LABELS.TEXT}
          value={String(currentProps.children || "")}
          onChange={(value) => updateProp("children", value)}
          icon={MessageSquare}
        />
      </fieldset>
    </div>
  );
}
