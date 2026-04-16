/**
 * ComponentStateSection - 컴포넌트 상태 미리보기 섹션
 */

import { memo, useCallback } from "react";
import { useComponentStatePreviewStore } from "../hooks/useComponentStatePreview";
import { useStore } from "../../../stores";
import { PropertySection, PropertySelect } from "../../../components";
import { Activity } from "lucide-react";
import type { ComponentState } from "@composition/specs";

const STATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "default", label: "Default" },
  { value: "hover", label: "Hover" },
  { value: "pressed", label: "Pressed" },
  { value: "focused", label: "Focused" },
  { value: "disabled", label: "Disabled" },
];

const ComponentStateSectionContent = memo(
  function ComponentStateSectionContent() {
    const previewState = useComponentStatePreviewStore((s) => s.preview);
    const setPreviewState = useComponentStatePreviewStore((s) => s.setPreview);
    const selectedId = useStore((s) => s.selectedElementId);

    const handleChange = useCallback(
      (value: string) => {
        if (!value || value === "default") {
          setPreviewState(null);
        } else {
          if (!selectedId) return;
          setPreviewState({
            elementId: selectedId,
            state: value as ComponentState,
          });
        }
      },
      [setPreviewState, selectedId],
    );

    return (
      <PropertySelect
        label="State"
        icon={Activity}
        value={
          previewState?.elementId === selectedId
            ? (previewState?.state ?? "default")
            : "default"
        }
        onChange={handleChange}
        options={STATE_OPTIONS}
      />
    );
  },
);

interface ComponentStateSectionProps {
  hasSpec: boolean;
}

export const ComponentStateSection = memo(function ComponentStateSection({
  hasSpec,
}: ComponentStateSectionProps) {
  if (!hasSpec) return null;

  return (
    <PropertySection id="state" title="State">
      <ComponentStateSectionContent />
    </PropertySection>
  );
});
