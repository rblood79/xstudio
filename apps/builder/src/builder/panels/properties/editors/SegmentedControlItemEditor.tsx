import { memo, useMemo } from "react";
import { Type, ToggleLeft } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertyInput,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const SegmentedControlItemEditor = memo(
  function SegmentedControlItemEditor({
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
            placeholder="segment_item_1"
          />
        </PropertySection>

        <PropertySection title="Content">
          <PropertyInput
            label={PROPERTY_LABELS.TEXT}
            value={String(currentProps.children || "")}
            onChange={(value) => updateProp("children", value)}
            icon={Type}
            placeholder="Tab Label"
          />
        </PropertySection>

        <PropertySection title="Behavior">
          <PropertySwitch
            label="Selected"
            isSelected={Boolean(currentProps.isSelected)}
            onChange={(checked) => updateProp("isSelected", checked)}
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
  },
);
