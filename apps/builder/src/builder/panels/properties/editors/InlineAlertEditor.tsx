import { memo, useMemo } from "react";
import { Type, FileText, Parentheses } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertyInput,
  PropertySelect,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const InlineAlertEditor = memo(function InlineAlertEditor({
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
          placeholder="inline_alert_1"
        />
      </PropertySection>

      <PropertySection title="Content">
        <PropertyInput
          label="Heading"
          value={String(currentProps.heading || "")}
          onChange={(value) => updateProp("heading", value)}
          icon={Type}
          placeholder="Alert heading"
        />

        <PropertyInput
          label={PROPERTY_LABELS.TEXT}
          value={String(currentProps.children || "")}
          onChange={(value) => updateProp("children", value)}
          icon={FileText}
          placeholder="Alert message"
        />
      </PropertySection>

      <PropertySection title="Design">
        <PropertySelect
          label={PROPERTY_LABELS.VARIANT}
          value={String(currentProps.variant || "neutral")}
          onChange={(value) => updateProp("variant", value)}
          options={[
            { value: "neutral", label: "Neutral" },
            { value: "informative", label: "Informative" },
            { value: "positive", label: "Positive" },
            { value: "notice", label: "Notice" },
            { value: "negative", label: "Negative" },
          ]}
          icon={Parentheses}
        />
      </PropertySection>
    </>
  );
});
