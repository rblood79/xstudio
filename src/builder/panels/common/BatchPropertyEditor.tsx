/**
 * BatchPropertyEditor - 다중 요소 공통 속성 편집기
 *
 * Phase 2: Multi-Element Editing - Batch Property Editor
 * 여러 요소의 공통 속성을 한 번에 편집하는 컴포넌트
 */

import { useState, useMemo, useCallback } from "react";
import type { Element } from "../../../types/core/store.types";
import { PropertyInput, PropertySelect, PropertySwitch, PropertyFieldset } from "../common";
import { Button } from "../../components";
import { RefreshCw, Check } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { findCommonProperties, filterPropertiesByCategory, isBatchEditable, getPropertyType } from "../properties/utils/batchPropertyUtils";
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
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, unknown>>({});
  const [showMixedOnly, setShowMixedOnly] = useState(false);

  // Find common properties
  const commonPropsData = useMemo(() => {
    return findCommonProperties(selectedElements);
  }, [selectedElements]);

  // Filter by category
  const filteredProps = useMemo(() => {
    const filtered = filterPropertiesByCategory(commonPropsData.commonProps, category);
    if (showMixedOnly) {
      return filtered.filter((prop) => prop.isMixed);
    }
    return filtered;
  }, [commonPropsData.commonProps, category, showMixedOnly]);

  // Batch-editable properties
  const editableProps = useMemo(() => {
    return filteredProps.filter((prop) => isBatchEditable(prop.key));
  }, [filteredProps]);

  // Count of mixed properties
  const mixedCount = useMemo(() => {
    return commonPropsData.commonProps.filter((prop) => prop.isMixed).length;
  }, [commonPropsData.commonProps]);

  // Handle property update (staged)
  const handleUpdate = useCallback((key: string, value: unknown) => {
    setPendingUpdates((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Apply all pending updates
  const handleApplyAll = useCallback(() => {
    if (Object.keys(pendingUpdates).length > 0) {
      onBatchUpdate(pendingUpdates);
      setPendingUpdates({});
    }
  }, [pendingUpdates, onBatchUpdate]);

  // Reset pending updates
  const handleReset = useCallback(() => {
    setPendingUpdates({});
  }, []);

  // Get current value (pending or original)
  const getCurrentValue = useCallback(
    (key: string, originalValue: unknown) => {
      return key in pendingUpdates ? pendingUpdates[key] : originalValue;
    },
    [pendingUpdates]
  );

  // Render property input based on type
  const renderPropertyInput = (prop: PropertyValue) => {
    const { key, value, isMixed } = prop;
    const currentValue = getCurrentValue(key, value);
    const isPending = key in pendingUpdates;
    const propType = getPropertyType(key);

    // Label with mixed indicator
    const labelElement = (
      <span className="batch-property-label">
        {key}
        {isMixed && <span className="mixed-badge">Mixed</span>}
        {isPending && <span className="pending-badge">Pending</span>}
      </span>
    );

    // Boolean properties
    if (propType === "boolean" || typeof value === "boolean") {
      return (
        <PropertySwitch
          key={key}
          label={labelElement as unknown as string}
          isSelected={currentValue as boolean}
          onChange={(checked) => handleUpdate(key, checked)}
        />
      );
    }

    // Number properties
    if (propType === "number" || typeof value === "number") {
      return (
        <PropertyInput
          key={key}
          label={labelElement as unknown as string}
          value={isMixed && !isPending ? "" : String(currentValue)}
          onChange={(newValue) => {
            if (newValue === "") {
              return; // Keep mixed state
            }
            const numValue = Number(newValue);
            if (!isNaN(numValue)) {
              handleUpdate(key, numValue);
            }
          }}
          placeholder={
            isMixed && !isPending
              ? `Mixed (${prop.uniqueValues?.length} values)`
              : undefined
          }
        />
      );
    }

    // Color properties
    if (propType === "color") {
      return (
        <PropertyInput
          key={key}
          label={labelElement as unknown as string}
          value={isMixed && !isPending ? "" : String(currentValue)}
          onChange={(newValue) => handleUpdate(key, newValue)}
          placeholder={isMixed && !isPending ? "Mixed colors" : undefined}
          type="color"
        />
      );
    }

    // Select properties
    if (propType === "select") {
      return (
        <PropertySelect
          key={key}
          label={labelElement as unknown as string}
          value={String(currentValue)}
          onChange={(newValue) => handleUpdate(key, newValue)}
          options={[
            { value: String(currentValue), label: String(currentValue) },
          ]}
        />
      );
    }

    // String or other types
    return (
      <PropertyInput
        key={key}
        label={labelElement as unknown as string}
        value={isMixed && !isPending ? "" : String(currentValue)}
        onChange={(newValue) => handleUpdate(key, newValue)}
        placeholder={
          isMixed && !isPending
            ? `Mixed (${prop.uniqueValues?.length} values)`
            : undefined
        }
      />
    );
  };

  if (commonPropsData.elementCount === 0) {
    return null;
  }

  const hasPendingUpdates = Object.keys(pendingUpdates).length > 0;

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
          {mixedCount > 0 && (
            <p className="batch-mixed">
              <span className="mixed-indicator">⚠</span>
              {mixedCount}개 속성이 다른 값을 가지고 있습니다
            </p>
          )}
        </div>

        <div className="batch-controls">
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

          {mixedCount > 0 && (
            <PropertySwitch
              label="Mixed만 표시"
              isSelected={showMixedOnly}
              onChange={setShowMixedOnly}
            />
          )}
        </div>
      </div>

      <PropertyFieldset legend="공통 속성">
        {editableProps.length === 0 ? (
          <p className="batch-empty">
            {showMixedOnly
              ? "Mixed 상태인 공통 속성이 없습니다."
              : "편집 가능한 공통 속성이 없습니다."}
          </p>
        ) : (
          editableProps.map((prop) => renderPropertyInput(prop))
        )}
      </PropertyFieldset>

      {hasPendingUpdates && (
        <div className="batch-actions">
          <Button
            variant="ghost"
            size="sm"
            onPress={handleApplyAll}
            aria-label="Apply all pending changes"
          >
            <Check
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
            <span>모두 적용 ({Object.keys(pendingUpdates).length}개)</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onPress={handleReset}
            aria-label="Reset all pending changes"
          >
            <RefreshCw
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
            <span>초기화</span>
          </Button>
        </div>
      )}

      <div className="batch-footer">
        <p className="batch-hint">
          💡 변경사항은 "모두 적용" 버튼을 눌러야 반영됩니다.
        </p>
        {hasPendingUpdates && (
          <p className="batch-warning">
            ⚠️ {Object.keys(pendingUpdates).length}개의 변경사항이 대기 중입니다.
          </p>
        )}
      </div>
    </div>
  );
}
