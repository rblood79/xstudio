import { memo, useMemo } from "react";
import { BarChart3, Parentheses, ToggleLeft } from "lucide-react";
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

export const ProgressCircleEditor = memo(function ProgressCircleEditor({
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
          placeholder="progress_circle_1"
        />
      </PropertySection>

      <PropertySection title="Content">
        <PropertyInput
          label={PROPERTY_LABELS.VALUE}
          value={String(currentProps.value ?? "")}
          onChange={(value) => {
            const num = value === "" ? undefined : Number(value);
            updateProp("value", num);
          }}
          icon={BarChart3}
          placeholder="50"
        />
      </PropertySection>

      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.SIZE}
          value={String(currentProps.size || "M")}
          onChange={(value) => updateProp("size", value)}
          options={[
            { value: "S", label: "Small" },
            { value: "M", label: "Medium" },
            { value: "L", label: "Large" },
          ]}
          icon={Parentheses}
        />

        <PropertySelect
          label="Static Color"
          value={String(currentProps.staticColor || "")}
          onChange={(value) => updateProp("staticColor", value || undefined)}
          options={[
            { value: "", label: "Auto" },
            { value: "white", label: "White" },
            { value: "black", label: "Black" },
          ]}
          icon={Parentheses}
        />
      </PropertySection>

      <PropertySection title="Behavior">
        <PropertySwitch
          label="Indeterminate"
          isSelected={Boolean(currentProps.isIndeterminate)}
          onChange={(checked) => updateProp("isIndeterminate", checked)}
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
