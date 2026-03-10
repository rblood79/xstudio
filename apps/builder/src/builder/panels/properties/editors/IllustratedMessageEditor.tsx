import { memo, useMemo } from "react";
import { Type, FileText, Columns } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertyInput,
  PropertySelect,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const IllustratedMessageEditor = memo(function IllustratedMessageEditor({
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
          placeholder="illustrated_msg_1"
        />
      </PropertySection>

      <PropertySection title="Content">
        <PropertyInput
          label="Heading"
          value={String(currentProps.heading || "")}
          onChange={(value) => updateProp("heading", value)}
          icon={Type}
          placeholder="No content"
        />

        <PropertyInput
          label="Description"
          value={String(currentProps.description || "")}
          onChange={(value) => updateProp("description", value)}
          icon={FileText}
          placeholder="There is nothing to display."
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
          icon={Columns}
        />

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
      </PropertySection>
    </>
  );
});
