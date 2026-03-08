/**
 * ComponentStateSection - 컴포넌트 상태 미리보기 섹션
 *
 * 선택된 컴포넌트의 상태(hover, pressed, focused, disabled 등)를
 * 캔버스에서 미리볼 수 있는 드롭다운을 제공한다.
 *
 * spec이 있는 컴포넌트가 선택된 경우에만 표시된다.
 *
 * Phase 23: PropertySection 래퍼 + 내부 Content 분리
 */

import { memo, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { previewComponentStateAtom } from "../atoms/componentStateAtom";
import { selectedElementAtom } from "../atoms/styleAtoms";
import { PropertySection, PropertySelect } from "../../../components";
import { Activity } from "lucide-react";
import type { ComponentState } from "@xstudio/specs";

const STATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "default", label: "Default" },
  { value: "hover", label: "Hover" },
  { value: "pressed", label: "Pressed" },
  { value: "focused", label: "Focused" },
  { value: "disabled", label: "Disabled" },
];

/**
 * 내부 컨텐츠 - 섹션이 열릴 때만 마운트
 */
const ComponentStateSectionContent = memo(
  function ComponentStateSectionContent() {
    const [previewState, setPreviewState] = useAtom(previewComponentStateAtom);
    const selectedElement = useAtomValue(selectedElementAtom);

    const handleChange = useCallback(
      (value: string) => {
        if (!value || value === "default") {
          setPreviewState(null);
        } else {
          const elementId = selectedElement?.id;
          if (!elementId) return;
          setPreviewState({ elementId, state: value as ComponentState });
        }
      },
      [setPreviewState, selectedElement],
    );

    return (
      <PropertySelect
        label="State"
        icon={Activity}
        value={
          previewState?.elementId === selectedElement?.id
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

/**
 * ComponentStateSection - 외부 래퍼
 * - PropertySection만 관리
 * - spec이 있는 컴포넌트가 선택된 경우에만 표시
 */
export const ComponentStateSection = memo(function ComponentStateSection({
  hasSpec,
}: ComponentStateSectionProps) {
  if (!hasSpec) return null;

  const handleReset = () => {
    // State는 리셋 시 default로 복귀
  };

  return (
    <PropertySection id="state" title="State" onReset={handleReset}>
      <ComponentStateSectionContent />
    </PropertySection>
  );
});
