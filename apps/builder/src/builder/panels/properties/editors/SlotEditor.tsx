/**
 * Slot Editor
 *
 * Layout 내에서 Page 콘텐츠 삽입 위치를 표시하는 Slot 컴포넌트의 속성 편집기
 *
 * 편집 가능한 속성:
 * - name: Slot 식별자 (예: content, sidebar, navigation)
 * - required: 필수 여부 (true면 Page에서 반드시 채워야 함)
 * - description: Slot 설명 (UI 표시용)
 *
 * 추가 기능:
 * - 콘텐츠 미리보기: Slot 내부 자식 요소 목록 표시
 */

import { memo, useMemo, useCallback } from "react";
import { Layers, FileText, AlertCircle, Type, Box, Eye } from "lucide-react";
import {
  PropertyInput,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
} from "../../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { useStore } from "../../../stores";
import { iconEditProps } from "../../../../utils/ui/uiConstants";

export const SlotEditor = memo(function SlotEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  // Get customId and children from element in store
  const { customId, children } = useMemo(() => {
    const elementsMap = useStore.getState().elementsMap;
    const element = elementsMap.get(elementId);

    // Find children of this slot
    const slotChildren: Array<{ id: string; tag: string; customId?: string }> = [];
    elementsMap.forEach((el) => {
      if (el.parent_id === elementId) {
        slotChildren.push({
          id: el.id,
          tag: el.tag,
          customId: el.customId,
        });
      }
    });

    // Sort by order_num
    slotChildren.sort((a, b) => {
      const elA = elementsMap.get(a.id);
      const elB = elementsMap.get(b.id);
      return (elA?.order_num || 0) - (elB?.order_num || 0);
    });

    return {
      customId: element?.customId || "",
      children: slotChildren,
    };
  }, [elementId]);

  const updateProp = useCallback((key: string, value: unknown) => {
    const updatedProps = {
      ...currentProps,
      [key]: value,
    };
    onUpdate(updatedProps);
  }, [currentProps, onUpdate]);

  const updateCustomId = useCallback((newCustomId: string) => {
    const updateElement = useStore.getState().updateElement;
    if (updateElement && elementId) {
      updateElement(elementId, { customId: newCustomId });
    }
  }, [elementId]);

  // Navigate to child element
  const handleChildClick = useCallback((childId: string) => {
    // 🚀 Single Source of Truth: Builder Store의 setSelectedElement 직접 사용
    useStore.getState().setSelectedElement(childId);
  }, []);

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

      {/* Slot Content Preview Section */}
      <PropertySection title="Slot Content" icon={Eye}>
        {children.length === 0 ? (
          <div className="slot-children-preview">
            <div className="slot-children-empty">
              No content in this slot yet
            </div>
          </div>
        ) : (
          <div className="slot-children-preview">
            {children.map((child) => (
              <div
                key={child.id}
                className="slot-child-item"
                onClick={() => handleChildClick(child.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleChildClick(child.id);
                  }
                }}
              >
                <Box size={iconEditProps.size} className="slot-child-icon" />
                <span className="slot-child-name">
                  {child.customId || child.tag}
                </span>
                <span className="slot-child-type">{child.tag}</span>
              </div>
            ))}
          </div>
        )}
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
