/**
 * PropertyListItem - 읽기 전용 텍스트 + 삭제 버튼 필드셋
 *
 * PropertyUnitInput의 DOM 구조를 그대로 복제하여 기존 CSS 재사용.
 * ComboBox Input → 읽기 전용 텍스트, ChevronDown → X(close) 아이콘.
 *
 * 사용처: FontFamilyGroup (폰트 face 목록), HistoryPanel 등
 */

import React, { memo } from "react";
import { X } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";

interface PropertyListItemProps {
  label?: string;
  value: string;
  onDelete: () => void;
  icon?: React.ComponentType<{
    color?: string;
    size?: number;
    strokeWidth?: number;
  }>;
  className?: string;
  deleteLabel?: string;
}

export const PropertyListItem = memo(function PropertyListItem({
  label,
  value,
  onDelete,
  icon: Icon,
  className,
  deleteLabel = "삭제",
}: PropertyListItemProps) {
  return (
    <fieldset
      className={`properties-aria property-list-item ${className || ""}`}
    >
      {label && <legend className="fieldset-legend">{label}</legend>}
      <div className="react-aria-control react-aria-Group">
        {Icon && (
          <label className="control-label">
            <Icon
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.strokeWidth}
            />
          </label>
        )}
        <div className="react-aria-ComboBox react-aria-UnitComboBox">
          <div className="combobox-container">
            <input
              className="react-aria-Input"
              type="text"
              value={value}
              readOnly
              tabIndex={-1}
            />
            <button
              className="react-aria-Button"
              type="button"
              onClick={onDelete}
              aria-label={deleteLabel}
            >
              <X size={iconProps.size} />
            </button>
          </div>
        </div>
      </div>
    </fieldset>
  );
});
