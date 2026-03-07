/**
 * IconEditor - Icon 컴포넌트 프로퍼티 에디터
 *
 * ADR-019: 아이콘 이름, 크기, 선 두께 편집
 */

import { memo, useMemo } from "react";
import { PenLine } from "lucide-react";
import { PropertyEditorProps } from "../types/editorTypes";
import {
  PropertyInput,
  PropertySizeToggle,
  PropertyCustomId,
  PropertySection,
  PropertyIconPicker,
} from "../../../components";
import { useStore } from "../../../stores";

export const IconEditor = memo(function IconEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  const updateProp = (key: string, value: unknown) => {
    onUpdate({
      ...currentProps,
      [key]: value,
    });
  };

  return (
    <>
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="icon_1"
        />
      </PropertySection>

      <PropertySection title="Icon">
        <PropertyIconPicker
          label="Icon"
          value={String(currentProps.iconName || "circle")}
          onChange={(value) => updateProp("iconName", value)}
        />

        <PropertySizeToggle
          label="Size"
          value={String(currentProps.size || "md")}
          onChange={(value) => updateProp("size", value)}
          scale="5"
        />

        <PropertyInput
          label="Stroke Width"
          value={String(currentProps.strokeWidth ?? 2)}
          onChange={(value) => {
            const num = parseFloat(value);
            if (!isNaN(num) && num > 0) updateProp("strokeWidth", num);
          }}
          icon={PenLine}
          placeholder="2"
        />
      </PropertySection>
    </>
  );
});
