/**
 * BatchPropertyEditor - 다중 요소 공통 속성 편집기
 *
 * Phase 2: Multi-Element Editing - Batch Property Editor
 * 여러 요소의 공통 속성을 한 번에 편집하는 컴포넌트
 */

import { useState, useMemo } from "react";
import type { Element } from "../../../types/core/store.types";
import { PropertyInput, PropertySelect, PropertySwitch, PropertyFieldset } from "../common";
import { findCommonProperties, filterPropertiesByCategory, isBatchEditable } from "../properties/utils/batchPropertyUtils";
import type { PropertyValue } from "../properties/utils/batchPropertyUtils";

export interface BatchPropertyEditorProps {
  /** 선택된 요소 배열 */
  selectedElements: Element[];
  /** 속성 업데이트 핸들러 */
  onBatchUpdate: (updates: Record<string, unknown>) => void;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 다중 요소 공통 속성 편집기
 *
 * @example
 * ```tsx
 * <BatchPropertyEditor
 *   selectedElements={selectedElements}
 *   onBatchUpdate={(updates) => {
 *     // Apply updates to all selected elements
 *     selectedElements.forEach((el) => {
 *       updateElementProps(el.id, updates);
 *     });
 *   }}
 * />
 * ```
 */
export function BatchPropertyEditor({
  selectedElements,
  onBatchUpdate,
  className = "",
}: BatchPropertyEditorProps) {
  const [category, setCategory] = useState<"all" | "layout" | "style" | "content">("all");

  // Find common properties
  const commonPropsData = useMemo(() => {
    return findCommonProperties(selectedElements);
  }, [selectedElements]);

  // Filter by category
  const filteredProps = useMemo(() => {
    return filterPropertiesByCategory(commonPropsData.commonProps, category);
  }, [commonPropsData.commonProps, category]);

  // Batch-editable properties
  const editableProps = useMemo(() => {
    return filteredProps.filter((prop) => isBatchEditable(prop.key));
  }, [filteredProps]);

  // Handle property update
  const handleUpdate = (key: string, value: unknown) => {
    onBatchUpdate({ [key]: value });
  };

  // Render property input based on type
  const renderPropertyInput = (prop: PropertyValue) => {
    const { key, value, isMixed } = prop;

    // Determine input type based on value type
    const valueType = typeof value;

    if (valueType === "boolean") {
      return (
        <PropertySwitch
          key={key}
          label={key}
          isSelected={value as boolean}
          onChange={(checked) => handleUpdate(key, checked)}
        />
      );
    }

    if (valueType === "number") {
      return (
        <PropertyInput
          key={key}
          label={key}
          value={isMixed ? "Mixed" : String(value)}
          onChange={(newValue) => {
            const numValue = Number(newValue);
            if (!isNaN(numValue)) {
              handleUpdate(key, numValue);
            }
          }}
          placeholder={isMixed ? `Mixed (${prop.uniqueValues?.length} values)` : undefined}
        />
      );
    }

    // String or other types
    return (
      <PropertyInput
        key={key}
        label={key}
        value={isMixed ? "" : String(value)}
        onChange={(newValue) => handleUpdate(key, newValue)}
        placeholder={isMixed ? `Mixed (${prop.uniqueValues?.length} values)` : undefined}
      />
    );
  };

  if (commonPropsData.elementCount === 0) {
    return null;
  }

  return (
    <div className={`batch-property-editor ${className}`.trim()}>
      <div className="batch-header">
        <div className="batch-info">
          <p className="batch-count">
            {commonPropsData.elementCount}개 요소의 공통 속성
          </p>
          <p className="batch-types">
            타입: {commonPropsData.elementTypes.join(", ")}
          </p>
        </div>

        <PropertySelect
          label="카테고리"
          value={category}
          onChange={(value) => setCategory(value as typeof category)}
          options={[
            { value: "all", label: "전체" },
            { value: "layout", label: "레이아웃" },
            { value: "style", label: "스타일" },
            { value: "content", label: "콘텐츠" },
          ]}
        />
      </div>

      <PropertyFieldset legend="공통 속성">
        {editableProps.length === 0 ? (
          <p className="batch-empty">편집 가능한 공통 속성이 없습니다.</p>
        ) : (
          editableProps.map((prop) => renderPropertyInput(prop))
        )}
      </PropertyFieldset>

      <div className="batch-footer">
        <p className="batch-hint">
          💡 변경사항은 선택된 모든 요소에 적용됩니다.
        </p>
      </div>
    </div>
  );
}
