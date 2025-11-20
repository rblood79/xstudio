import { memo, useMemo } from "react";
/**
 * GroupEditor - Group 컴포넌트 속성 편집기
 *
 * Phase 4: Grouping & Organization
 * Based on React Aria Group component
 *
 * @see https://react-spectrum.adobe.com/react-aria/Group.html
 */

import { Type, Info, Lock, Eye, AlertCircle, Hash } from "lucide-react";
import { PropertyInput, PropertyCustomId, PropertySwitch, PropertySelect, PropertySection } from "../../common";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export const GroupEditor = memo(function GroupEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  // Get customId from element in store
    // ⭐ 최적화: customId를 현재 시점에만 가져오기 (Zustand 구독 방지)
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  const updateProp = (key: string, value: unknown) => {
    const updatedProps = {
      ...currentProps,
      [key]: value,
    };
    onUpdate(updatedProps);
  };

  return (
    <>
      {/* Basic */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="group_1"
        />
      </PropertySection>

      {/* Content */}
      <PropertySection title="Content">
        <PropertyInput
          label="Label"
          value={String(currentProps.label || "")}
          onChange={(value) => updateProp("label", value || undefined)}
          placeholder="Group label (builder display only)"
          icon={Type}
        />
      </PropertySection>

      {/* ARIA Role */}
      <PropertySection title="ARIA Role">
        <PropertySelect
          label="Role"
          value={String(currentProps.role || "group")}
          onChange={(value) => updateProp("role", value)}
          options={[
            { value: "group", label: "Group (default)" },
            { value: "region", label: "Region (landmark)" },
            { value: "presentation", label: "Presentation (visual only)" },
          ]}
          icon={Info}
        />
      </PropertySection>

      {/* States */}
      <PropertySection title="States">
        <PropertySwitch
          label={PROPERTY_LABELS.DISABLED}
          isSelected={Boolean(currentProps.isDisabled)}
          onChange={(checked) => updateProp("isDisabled", checked)}
          icon={Lock}
        />

        <PropertySwitch
          label="Invalid"
          isSelected={Boolean(currentProps.isInvalid)}
          onChange={(checked) => updateProp("isInvalid", checked)}
          icon={AlertCircle}
        />

        <PropertySwitch
          label="Read Only"
          isSelected={Boolean(currentProps.isReadOnly)}
          onChange={(checked) => updateProp("isReadOnly", checked)}
          icon={Eye}
        />
      </PropertySection>

      {/* Accessibility */}
      <PropertySection title="Accessibility">
        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABEL}
          value={String(currentProps["aria-label"] || "")}
          onChange={(value) => updateProp("aria-label", value || undefined)}
          icon={Type}
          placeholder="Descriptive label for screen readers"
        />

        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABELLEDBY}
          value={String(currentProps["aria-labelledby"] || "")}
          onChange={(value) => updateProp("aria-labelledby", value || undefined)}
          icon={Hash}
          placeholder="ID of labeling element"
        />
      </PropertySection>
    </>
  );
});
