import { memo, useMemo } from "react";
import { Type, Link, ExternalLink, ToggleLeft } from "lucide-react";
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

export const LinkButtonEditor = memo(function LinkButtonEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  const updateProp = (key: string, value: unknown) => {
    onUpdate({ ...currentProps, [key]: value });
  };

  return (
    <>
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="link_btn_1"
        />
      </PropertySection>

      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.TEXT}
          value={String(currentProps.children || "")}
          onChange={(value) => updateProp("children", value)}
          icon={Type}
          placeholder="Link text"
        />

        <PropertyInput
          label="URL"
          value={String(currentProps.href || "")}
          onChange={(value) => updateProp("href", value)}
          icon={Link}
          placeholder="https://..."
        />

        <PropertySelect
          label="Target"
          value={String(currentProps.target || "_self")}
          onChange={(value) => updateProp("target", value)}
          options={[
            { value: "_self", label: "Same Window" },
            { value: "_blank", label: "New Window" },
          ]}
          icon={ExternalLink}
        />
      </PropertySection>

      <PropertySection title="Design">
        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={(value) => updateProp("size", value)}
          scale="5"
        />
      </PropertySection>

      <PropertySection title="Behavior">
        <PropertySwitch
          label={PROPERTY_LABELS.DISABLED}
          isSelected={Boolean(currentProps.isDisabled)}
          onChange={(checked) => updateProp("isDisabled", checked)}
          icon={ToggleLeft}
        />
      </PropertySection>
    </>
  );
});
