import { memo, useCallback, useMemo } from "react";
import { Minus, Type, Hash } from "lucide-react";
import { PropertyInput, PropertyCustomId, PropertySelect , PropertySection} from '../../common';
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

      {/* Accessibility Section */}
      <PropertySection title="Accessibility">

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
      </PropertySection>
    </>
    );
});
