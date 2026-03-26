import { memo, useMemo } from "react";
import { MessageSquare, Parentheses, ToggleLeft } from "lucide-react";
import {
  PropertyInput,
  PropertyCustomId,
  PropertySection,
  PropertySelect,
  PropertySwitch,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const DialogEditor = memo(function DialogEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  // Get customId from element in store
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  const updateProp = (key: string, value: unknown) => {
    const updatedProps = {
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
    <>
      {/* Basic */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          onChange={updateCustomId}
          placeholder="dialog_1"
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.TEXT}
          value={String(currentProps.children || "")}
          onChange={(value) => updateProp("children", value)}
          icon={MessageSquare}
        />
      </PropertySection>

      <PropertySection title="Behavior">
        <PropertySwitch
          label={PROPERTY_LABELS.IS_DISMISSABLE}
          isSelected={Boolean(currentProps.isDismissable)}
          onChange={(checked) => updateProp("isDismissable", checked)}
          icon={ToggleLeft}
        />

        <PropertySelect
          label="Role"
          value={String(currentProps.role || "dialog")}
          onChange={(value) => updateProp("role", value || undefined)}
          options={[
            { value: "dialog", label: "Dialog" },
            { value: "alertdialog", label: "Alert Dialog" },
          ]}
          icon={Parentheses}
        />
      </PropertySection>
    </>
  );
});
