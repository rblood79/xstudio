/**
 * IconEditor - Icon 컴포넌트 프로퍼티 에디터
 *
 * ADR-019: 아이콘 이름, 크기(fontSize 기반 SizeToggle), 선 두께 편집
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

/** Size 토글 값 → fontSize 매핑 */
const SIZE_TO_FONT: Record<string, number> = {
  xs: 16,
  sm: 18,
  md: 24,
  lg: 36,
  xl: 48,
};

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
    onUpdate({ [key]: value });
  };

  // 토글은 size prop으로 추적 (즉시 반영)
  const currentSizeValue = String(currentProps.size || "md");

  const handleSizeChange = (value: string) => {
    const fontSize = SIZE_TO_FONT[value];
    if (fontSize != null) {
      // size prop 업데이트 (토글 indicator 즉시 반영)
      onUpdate({ size: value });
      // style.fontSize 업데이트 (렌더링 크기 반영)
      useStore.getState().updateSelectedStyle("fontSize", String(fontSize));
    }
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
          value={currentSizeValue}
          onChange={handleSizeChange}
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
