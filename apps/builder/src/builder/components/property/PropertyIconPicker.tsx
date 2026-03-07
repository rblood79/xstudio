/**
 * PropertyIconPicker - 인라인 아이콘 선택 Property 필드
 *
 * 현재 아이콘 미리보기 + 이름 표시
 * 클릭 시 IconPickerPopover 팝오버 열림
 */

import { memo } from "react";
import { Button } from "react-aria-components";
import { IconPreview } from "../../panels/icons/components/IconPreview";
import { IconPickerPopover } from "../../panels/icons/IconPickerPopover";
import "../../panels/icons/IconPickerPopover.css";

export interface PropertyIconPickerProps {
  label: string;
  value?: string;
  onChange: (iconName: string) => void;
}

export const PropertyIconPicker = memo(function PropertyIconPicker({
  label,
  value = "circle",
  onChange,
}: PropertyIconPickerProps) {
  return (
    <div className="property-field">
      <label className="property-label">
        <span>{label}</span>
      </label>
      <IconPickerPopover value={value} onSelect={onChange}>
        <Button className="icon-picker-trigger" aria-label={`Select ${label}`}>
          <IconPreview name={value} size={14} />
          <span className="icon-picker-trigger-name">{value}</span>
        </Button>
      </IconPickerPopover>
    </div>
  );
});
