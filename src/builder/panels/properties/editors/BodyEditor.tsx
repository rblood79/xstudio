/**
 * BodyEditor - Body 컴포넌트 속성 편집기
 *
 * Body는 페이지의 루트 컨테이너로 모든 요소의 부모 역할을 합니다.
 * 각 페이지마다 하나의 body 요소가 자동 생성됩니다.
 */

import { Type, Layout, Hash } from "lucide-react";
import { PropertyCustomId, PropertyInput, PropertySection } from "../../common";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";

export function BodyEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  // Get customId from element in store
  const element = useStore((state) => state.elements.find((el) => el.id === elementId));
  const customId = element?.customId || "";

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
          placeholder="body"
        />
      </PropertySection>

      {/* Layout */}
      <PropertySection title="Layout">
        <PropertyInput
          label="Class Name"
          value={String(currentProps.className || "")}
          onChange={(value) => updateProp("className", value || undefined)}
          placeholder="page-container"
          icon={Layout}
        />
      </PropertySection>

      {/* Accessibility */}
      <PropertySection title="Accessibility">
        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABEL}
          value={String(currentProps["aria-label"] || "")}
          onChange={(value) => updateProp("aria-label", value || undefined)}
          icon={Type}
          placeholder="Main page content"
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
}
