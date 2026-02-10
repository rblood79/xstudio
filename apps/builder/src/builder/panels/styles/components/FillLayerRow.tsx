/**
 * FillLayerRow - 개별 Fill 레이어 행
 *
 * 레이아웃: [toggle] [swatch] [color-input] [opacity%] [delete]
 * - 클릭 시 FillDetailPopover 열기
 *
 * @since 2026-02-10 Color Picker Phase 1
 */

import { memo, useCallback, useState } from 'react';
import {
  Checkbox as AriaCheckbox,
  DialogTrigger,
  Button as AriaButton,
} from 'react-aria-components';
import { ColorSwatch } from '@xstudio/shared/components/ColorSwatch';
import { Popover } from '@xstudio/shared/components/Popover';
import { Trash2 } from 'lucide-react';
import type { FillItem, ColorFillItem } from '../../../../types/builder/fill.types';
import { FillType } from '../../../../types/builder/fill.types';
import { hex8ToHex6, normalizeToHex8 } from '../utils/colorUtils';
import { FillDetailPopover } from './FillDetailPopover';
import { iconSmall } from '../../../../utils/ui/uiConstants';

import './FillLayerRow.css';

interface FillLayerRowProps {
  fill: FillItem;
  onToggle: (fillId: string) => void;
  onUpdate: (fillId: string, updates: Partial<FillItem>) => void;
  onUpdatePreview: (fillId: string, updates: Partial<FillItem>) => void;
  onRemove: (fillId: string) => void;
}

export const FillLayerRow = memo(function FillLayerRow({
  fill,
  onToggle,
  onUpdate,
  onUpdatePreview,
  onRemove,
}: FillLayerRowProps) {
  const isColor = fill.type === FillType.Color;
  const colorValue = isColor ? (fill as ColorFillItem).color : '#000000FF';
  const displayHex = hex8ToHex6(normalizeToHex8(colorValue));
  const opacityPercent = Math.round(fill.opacity * 100);

  const handleToggle = useCallback(() => {
    onToggle(fill.id);
  }, [fill.id, onToggle]);

  const handleRemove = useCallback(() => {
    onRemove(fill.id);
  }, [fill.id, onRemove]);

  const handleOpacityBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const parsed = Number(e.target.value);
      if (!Number.isNaN(parsed)) {
        const clamped = Math.max(0, Math.min(100, Math.round(parsed)));
        onUpdate(fill.id, { opacity: clamped / 100 });
      }
    },
    [fill.id, onUpdate],
  );

  const handleOpacityKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      }
    },
    [],
  );

  const handleColorChange = useCallback(
    (color: string) => {
      if (isColor) {
        onUpdatePreview(fill.id, { color } as Partial<ColorFillItem>);
      }
    },
    [fill.id, isColor, onUpdatePreview],
  );

  const handleColorChangeEnd = useCallback(
    (color: string) => {
      if (isColor) {
        onUpdate(fill.id, { color } as Partial<ColorFillItem>);
      }
    },
    [fill.id, isColor, onUpdate],
  );

  return (
    <div className="fill-layer-row" data-enabled={fill.enabled || undefined}>
      <AriaCheckbox
        className="fill-layer-row__toggle"
        isSelected={fill.enabled}
        onChange={handleToggle}
        aria-label="Toggle fill"
      >
        <div className="fill-layer-row__checkbox" />
      </AriaCheckbox>

      <DialogTrigger>
        <AriaButton className="fill-layer-row__swatch-btn" aria-label="Edit fill color">
          <ColorSwatch color={colorValue} />
        </AriaButton>
        <Popover
          placement="bottom start"
          className="fill-detail-popover-container"
          showArrow={false}
        >
          <FillDetailPopover
            fill={fill}
            onChange={handleColorChange}
            onChangeEnd={handleColorChangeEnd}
          />
        </Popover>
      </DialogTrigger>

      <span className="fill-layer-row__hex">{displayHex}</span>

      <input
        type="text"
        inputMode="numeric"
        className="fill-layer-row__opacity"
        defaultValue={opacityPercent}
        onBlur={handleOpacityBlur}
        onKeyDown={handleOpacityKeyDown}
        aria-label="Fill opacity"
      />

      <button
        type="button"
        className="fill-layer-row__delete"
        onClick={handleRemove}
        aria-label="Remove fill"
      >
        <Trash2
          size={iconSmall.size}
          strokeWidth={iconSmall.strokeWidth}
          color={iconSmall.color}
        />
      </button>
    </div>
  );
});
