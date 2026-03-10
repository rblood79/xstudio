import { memo, useMemo } from "react";
import { Columns, ToggleLeft, Layout } from "lucide-react";
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

export const ActionButtonGroupEditor = memo(function ActionButtonGroupEditor({
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
          placeholder="action_btn_group_1"
        />
      </PropertySection>

      <PropertySection title="Design">
        <PropertySizeToggle
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "md")}
          onChange={(value) => updateProp("size", value)}
          scale="5"
        />

        <PropertySelect
          label={PROPERTY_LABELS.ORIENTATION}
          value={String(currentProps.orientation || "horizontal")}
          onChange={(value) => updateProp("orientation", value)}
          options={[
            { value: "horizontal", label: "Horizontal" },
            { value: "vertical", label: "Vertical" },
          ]}
          icon={Columns}
        />

        <PropertySelect
          label="Density"
          value={String(currentProps.density || "regular")}
          onChange={(value) => updateProp("density", value)}
          options={[
            { value: "compact", label: "Compact" },
            { value: "regular", label: "Regular" },
          ]}
          icon={Layout}
        />
      </PropertySection>

      <PropertySection title="Behavior">
        <PropertySwitch
          label="Justified"
          isSelected={Boolean(currentProps.isJustified)}
          onChange={(checked) => updateProp("isJustified", checked)}
          icon={Columns}
        />

        <PropertySwitch
          label="Quiet"
          isSelected={Boolean(currentProps.isQuiet)}
          onChange={(checked) => updateProp("isQuiet", checked)}
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
