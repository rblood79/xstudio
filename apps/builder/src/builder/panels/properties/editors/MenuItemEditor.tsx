import { memo, useMemo } from "react";
import { Type, PointerOff, FileText, Link2, Binary } from "lucide-react";
import {
  PropertyInput,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const MenuItemEditor = memo(function MenuItemEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  // Get customId from element in store
  // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
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
      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          onChange={updateCustomId}
          placeholder="menuitem_1"
        />

        <PropertyInput
          label={PROPERTY_LABELS.TEXT}
          value={String(currentProps.children || "")}
          onChange={(value) => updateProp("children", value || undefined)}
          icon={Type}
        />

        <PropertyInput
          label={PROPERTY_LABELS.VALUE}
          value={String(currentProps.value || "")}
          onChange={(value) => updateProp("value", value || undefined)}
          icon={Binary}
        />

        <PropertyInput
          label={PROPERTY_LABELS.TEXT_VALUE}
          value={String(currentProps.textValue || "")}
          onChange={(value) => updateProp("textValue", value || undefined)}
          icon={FileText}
        />

        <PropertyInput
          label={PROPERTY_LABELS.HREF}
          value={String(currentProps.href || "")}
          onChange={(value) => updateProp("href", value || undefined)}
          icon={Link2}
          placeholder="https://example.com"
        />
      </PropertySection>

      {/* State Section */}
      <PropertySection title="State">
        <PropertySwitch
          label={PROPERTY_LABELS.DISABLED}
          isSelected={Boolean(currentProps.isDisabled)}
          onChange={(checked) => updateProp("isDisabled", checked)}
          icon={PointerOff}
        />
      </PropertySection>
    </>
  );
});
