import { memo, useMemo } from "react";
import { MessageSquare, Move, MapPin } from "lucide-react";
import { PropertyInput, PropertyCustomId, PropertySelect , PropertySection} from '../../common';
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const TooltipEditor = memo(function TooltipEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
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
        placeholder="tooltip_1"
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

      {/* Position Section */}
      <PropertySection title="Position">

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
      </PropertySection>
    </>
    );
});
