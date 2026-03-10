import { memo, useMemo } from "react";
import {
  Type,
  Link as LinkIcon,
  ExternalLink,
  Parentheses,
  PointerOff,
  Eye,
} from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertyInput,
  PropertySwitch,
  PropertySelect,
  PropertySizeToggle,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const LinkEditor = memo(function LinkEditor({
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
          placeholder="link_1"
        />
      </PropertySection>

      {/* Content Section */}
      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.TEXT}
          value={String(currentProps.children || "")}
          onChange={(value) => updateProp("children", value)}
          icon={Type}
          placeholder="Link text"
        />

        <PropertyInput
          label={PROPERTY_LABELS.HREF}
          value={String(currentProps.href || "")}
          onChange={(value) => updateProp("href", value || undefined)}
          icon={LinkIcon}
          placeholder="https://example.com"
        />
      </PropertySection>

      {/* Design Section */}
      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.VARIANT}
          value={String(currentProps.variant || "primary")}
          onChange={(value) => updateProp("variant", value)}
          options={[
            { value: "primary", label: "Primary" },
            { value: "secondary", label: "Secondary" },
          ]}
          icon={Parentheses}
        />

        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={(value) => updateProp("size", value)}
          scale="5"
        />
      </PropertySection>

      {/* Behavior Section */}
      <PropertySection title="Behavior">
        <PropertySwitch
          label="External Link"
          isSelected={Boolean(currentProps.isExternal)}
          onChange={(checked) => updateProp("isExternal", checked)}
          icon={ExternalLink}
        />

        <PropertySwitch
          label="Show External Icon"
          isSelected={currentProps.showExternalIcon !== false}
          onChange={(checked) => updateProp("showExternalIcon", checked)}
          icon={Eye}
        />

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
