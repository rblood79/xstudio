import { memo, useMemo } from "react";
import { Link, Type, Layout, ToggleLeft } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertyInput,
  PropertySwitch,
  PropertySelect,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const ImageEditor = memo(function ImageEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  // 변경된 key만 전달 — updateAndSave가 element.props와 merge하므로 stale props 전파 방지
  const updateProp = (key: string, value: unknown) => {
    onUpdate({ [key]: value });
  };

  return (
    <>
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="image_1"
        />
      </PropertySection>

      <PropertySection title="Content">
        <PropertyInput
          label="Source URL"
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
          placeholder="Image description"
        />
      </PropertySection>

      <PropertySection title="Design">
        <PropertySelect
          label="Object Fit"
          value={String(currentProps.objectFit || "cover")}
          onChange={(value) => updateProp("objectFit", value)}
          options={[
            { value: "cover", label: "Cover" },
            { value: "contain", label: "Contain" },
            { value: "fill", label: "Fill" },
            { value: "none", label: "None" },
          ]}
          icon={Layout}
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
