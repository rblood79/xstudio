import { memo, useMemo } from "react";
import { Columns, Parentheses } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertySelect,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const DividerEditor = memo(function DividerEditor({
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
          placeholder="divider_1"
        />
      </PropertySection>

      <PropertySection title="Design">
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
    </>
  );
});
