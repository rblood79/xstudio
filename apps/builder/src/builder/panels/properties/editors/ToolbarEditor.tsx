import { memo, useMemo } from "react";
import { Minus } from "lucide-react";
import { PropertyCustomId, PropertySelect, PropertySection } from '../../../components';
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const ToolbarEditor = memo(function ToolbarEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  // Get customId from element in store
    // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

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
        <>
      {/* Basic */}
      <PropertySection title="Basic">
      <PropertyCustomId
        label="ID"
        value={customId}
        elementId={elementId}
        onChange={updateCustomId}
        placeholder="toolbar_1"
      />
      </PropertySection>

      {/* Design Section */}
      <PropertySection title="Design">

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
      </PropertySection>
    </>
    );
});
