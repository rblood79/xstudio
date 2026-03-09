import { memo, useMemo } from "react";
import { ToggleLeft, Columns, Layout } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertySwitch,
  PropertySelect,
  PropertySizeToggle,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const SelectBoxGroupEditor = memo(function SelectBoxGroupEditor({
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
          placeholder="selectbox_group_1"
        />
      </PropertySection>

      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.ORIENTATION}
          value={String(currentProps.orientation || "vertical")}
          onChange={(value) => updateProp("orientation", value)}
          options={[
            { value: "vertical", label: "Vertical" },
            { value: "horizontal", label: "Horizontal" },
          ]}
          icon={Columns}
        />

        <PropertySelect
          label="Selection Mode"
          value={String(currentProps.selectionMode || "single")}
          onChange={(value) => updateProp("selectionMode", value)}
          options={[
            { value: "single", label: "Single" },
            { value: "multiple", label: "Multiple" },
          ]}
          icon={Layout}
        />

        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={(value) => updateProp("size", value)}
        />
      </PropertySection>

      <PropertySection title="Behavior">
        <PropertySwitch
          label="Emphasized"
          isSelected={Boolean(currentProps.isEmphasized)}
          onChange={(checked) => updateProp("isEmphasized", checked)}
          icon={ToggleLeft}
        />

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
