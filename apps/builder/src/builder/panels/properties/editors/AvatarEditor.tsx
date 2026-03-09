import { memo, useMemo } from "react";
import { Type, Link, ToggleLeft } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertyInput,
  PropertySwitch,
  PropertySizeToggle,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const AvatarEditor = memo(function AvatarEditor({
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
          placeholder="avatar_1"
        />
      </PropertySection>

      <PropertySection title="Content">
        <PropertyInput
          label="Image URL"
          value={String(currentProps.src || "")}
          onChange={(value) => updateProp("src", value)}
          icon={Link}
          placeholder="https://..."
        />

        <PropertyInput
          label="Alt Text"
          value={String(currentProps.alt || "")}
          onChange={(value) => updateProp("alt", value)}
          icon={Type}
          placeholder="Avatar"
        />

        <PropertyInput
          label="Initials"
          value={String(currentProps.initials || "")}
          onChange={(value) => updateProp("initials", value)}
          icon={Type}
          placeholder="A"
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
