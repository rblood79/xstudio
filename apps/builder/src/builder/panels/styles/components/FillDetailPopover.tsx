/**
 * FillDetailPopover - Fill 상세 편집 Popover 내용
 *
 * Popover 안에:
 * - FillTypeSelector (상단)
 * - ColorPickerPanel (Color 타입일 때)
 * - GradientEditor (Gradient 타입일 때)
 *
 * @since 2026-02-10 Color Picker Phase 1
 * @updated 2026-02-10 Gradient Phase 2
 */

import { memo, useCallback } from 'react';
import type { FillItem, ColorFillItem } from '../../../../types/builder/fill.types';
import { FillType } from '../../../../types/builder/fill.types';
import { normalizeToHex8 } from '../utils/colorUtils';
import { FillTypeSelector } from './FillTypeSelector';
import { ColorPickerPanel } from './ColorPickerPanel';
import { GradientEditor } from './GradientEditor';

import './FillDetailPopover.css';

interface FillDetailPopoverProps {
  fill: FillItem;
  onColorChange: (color: string) => void;
  onColorChangeEnd: (color: string) => void;
  onUpdate: (updates: Partial<FillItem>) => void;
  onUpdateEnd: (updates: Partial<FillItem>) => void;
  onTypeChange: (newType: FillType) => void;
}

export const FillDetailPopover = memo(function FillDetailPopover({
  fill,
  onColorChange,
  onColorChangeEnd,
  onUpdate,
  onUpdateEnd,
  onTypeChange,
}: FillDetailPopoverProps) {
  const isColor = fill.type === FillType.Color;
  const isGradient =
    fill.type === FillType.LinearGradient ||
    fill.type === FillType.RadialGradient ||
    fill.type === FillType.AngularGradient;

  const colorValue = isColor
    ? normalizeToHex8((fill as ColorFillItem).color)
    : '#000000FF';

  const handleTypeChange = useCallback(
    (newType: FillType) => {
      onTypeChange(newType);
    },
    [onTypeChange],
  );

  return (
    <div className="fill-detail-popover">
      <FillTypeSelector value={fill.type} onChange={handleTypeChange} />
      {isColor && (
        <ColorPickerPanel
          value={colorValue}
          onChange={onColorChange}
          onChangeEnd={onColorChangeEnd}
        />
      )}
      {isGradient && (
        <GradientEditor
          fill={fill as Parameters<typeof GradientEditor>[0]['fill']}
          onChange={onUpdate}
          onChangeEnd={onUpdateEnd}
        />
      )}
    </div>
  );
});
