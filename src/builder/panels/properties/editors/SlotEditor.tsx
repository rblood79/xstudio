/**
 * Slot Editor
 *
 * Layout 내에서 Page 콘텐츠 삽입 위치를 표시하는 Slot 컴포넌트의 속성 편집기
 *
 * 편집 가능한 속성:
 * - name: Slot 식별자 (예: content, sidebar, navigation)
 * - required: 필수 여부 (true면 Page에서 반드시 채워야 함)
 * - description: Slot 설명 (UI 표시용)
 */

import { memo, useMemo } from "react";
import { Layers, FileText, AlertCircle, Type } from "lucide-react";
import {
  PropertyInput,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
} from "../../common";
import { PropertyEditorProps } from "../types/editorTypes";
import { useStore } from "../../../stores";

export const SlotEditor = memo(function SlotEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  // Get customId from element in store
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

  const updateCustomId = (newCustomId: string) => {
    const updateElement = useStore.getState().updateElement;
    if (updateElement && elementId) {
      updateElement(elementId, { customId: newCustomId });
    }
  };

  return (
    <>
      {/* Basic Section */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          onChange={updateCustomId}
          placeholder="slot_main"
        />
      </PropertySection>

      {/* Slot Settings Section */}
      <PropertySection title="Slot Settings" icon={Layers}>
        <PropertyInput
          label="Name"
          value={String(currentProps.name || "")}
          onChange={(value) => updateProp("name", value || "content")}
          placeholder="content"
          icon={FileText}
          description="Unique identifier (e.g., content, sidebar, navigation)"
        />

        <PropertyInput
          label="Description"
          value={String(currentProps.description || "")}
          onChange={(value) => updateProp("description", value || undefined)}
          placeholder="Main content area"
          icon={Type}
          description="Optional description for this slot"
        />

        <PropertySwitch
          label="Required"
          isSelected={Boolean(currentProps.required)}
          onChange={(checked) => updateProp("required", checked)}
          icon={AlertCircle}
          description="Pages must provide content for this slot"
        />
      </PropertySection>

      {/* Info Section */}
      <PropertySection title="Usage Info">
        <div className="slot-editor-info">
          <p className="slot-editor-info-text">
            Slots are placeholders in Layouts where Page content will be inserted.
          </p>
          <ul className="slot-editor-info-list">
            <li>Each Slot should have a unique name within the Layout</li>
            <li>Common names: content, sidebar, header, footer, navigation</li>
            <li>Required slots must be filled by all Pages using this Layout</li>
          </ul>
        </div>
      </PropertySection>
    </>
  );
});

export default SlotEditor;
