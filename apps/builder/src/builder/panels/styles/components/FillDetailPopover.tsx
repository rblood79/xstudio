/**
 * FillDetailPopover - Fill 상세 편집 Popover 내용
 *
 * Popover 안에:
 * - FillTypeSelector (상단)
 * - ColorPickerPanel (Color 타입일 때)
 *
 * @since 2026-02-10 Color Picker Phase 1
 */

import { memo } from 'react';
import type { FillItem, ColorFillItem } from '../../../../types/builder/fill.types';
import { FillType } from '../../../../types/builder/fill.types';
import { normalizeToHex8 } from '../utils/colorUtils';
import { FillTypeSelector } from './FillTypeSelector';
import { ColorPickerPanel } from './ColorPickerPanel';

import './FillDetailPopover.css';

interface FillDetailPopoverProps {
  fill: FillItem;
  onChange: (color: string) => void;
  onChangeEnd: (color: string) => void;
}

export const FillDetailPopover = memo(function FillDetailPopover({
  fill,
  onChange,
  onChangeEnd,
}: FillDetailPopoverProps) {
  const isColor = fill.type === FillType.Color;
  const colorValue = isColor
    ? normalizeToHex8((fill as ColorFillItem).color)
    : '#000000FF';

  return (
    <div className="fill-detail-popover">
      <FillTypeSelector
        value={fill.type}
        onChange={() => {
          // Phase 1: Color 타입만 지원, 타입 변경 비활성
        }}
      />
      {isColor && (
        <ColorPickerPanel
          value={colorValue}
          onChange={onChange}
          onChangeEnd={onChangeEnd}
        />
      )}
    </div>
  );
});
