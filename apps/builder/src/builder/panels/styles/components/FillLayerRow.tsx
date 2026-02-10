/**
 * FillLayerRow - 개별 Fill 레이어 행
 *
 * 레이아웃: [toggle] [swatch] [color-input/label] [opacity%] [delete]
 * - 클릭 시 FillDetailPopover 열기
 * - Phase 2: 그래디언트 swatch + 타입 라벨
 *
 * @since 2026-02-10 Color Picker Phase 1
 * @updated 2026-02-10 Gradient Phase 2
 */

import { memo, useCallback, useMemo } from 'react';
import {
  Checkbox as AriaCheckbox,
  DialogTrigger,
  Button as AriaButton,
} from 'react-aria-components';
import { ColorSwatch } from '@xstudio/shared/components/ColorSwatch';
import { Popover } from '@xstudio/shared/components/Popover';
import { Trash2 } from 'lucide-react';
import type { FillItem, ColorFillItem, GradientStop } from '../../../../types/builder/fill.types';
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
  onTypeChange: (fillId: string, newType: FillType) => void;
}

const GRADIENT_TYPE_LABELS: Record<string, string> = {
  [FillType.LinearGradient]: 'Linear',
  [FillType.RadialGradient]: 'Radial',
  [FillType.AngularGradient]: 'Angular',
};

function buildSwatchGradient(stops: GradientStop[]): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const parts = sorted.map(
    (s) => `${s.color.slice(0, 7)} ${(s.position * 100).toFixed(1)}%`,
  );
  return `linear-gradient(90deg, ${parts.join(', ')})`;
}

export const FillLayerRow = memo(function FillLayerRow({
  fill,
  onToggle,
  onUpdate,
  onUpdatePreview,
  onRemove,
  onTypeChange,
}: FillLayerRowProps) {
  const isColor = fill.type === FillType.Color;
  const isGradient =
    fill.type === FillType.LinearGradient ||
    fill.type === FillType.RadialGradient ||
    fill.type === FillType.AngularGradient;

  const colorValue = isColor ? (fill as ColorFillItem).color : '#000000FF';
  const displayHex = isColor ? hex8ToHex6(normalizeToHex8(colorValue)) : '';
  const gradientLabel = isGradient ? GRADIENT_TYPE_LABELS[fill.type] ?? '' : '';
  const opacityPercent = Math.round(fill.opacity * 100);

  const gradientStops = isGradient ? (fill as { stops: GradientStop[] }).stops : [];
  const swatchGradientCss = useMemo(
    () => (isGradient ? buildSwatchGradient(gradientStops) : ''),
    [isGradient, gradientStops],
  );

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

  const handleFillUpdate = useCallback(
    (updates: Partial<FillItem>) => {
      onUpdatePreview(fill.id, updates);
    },
    [fill.id, onUpdatePreview],
  );

  const handleFillUpdateEnd = useCallback(
    (updates: Partial<FillItem>) => {
      onUpdate(fill.id, updates);
    },
    [fill.id, onUpdate],
  );

  const handleTypeChange = useCallback(
    (newType: FillType) => {
      onTypeChange(fill.id, newType);
    },
    [fill.id, onTypeChange],
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
        <AriaButton className="fill-layer-row__swatch-btn" aria-label="Edit fill">
          {isColor && <ColorSwatch color={colorValue} />}
          {isGradient && (
            <div
              className="fill-layer-row__gradient-swatch"
              style={{ background: swatchGradientCss }}
            />
          )}
        </AriaButton>
        <Popover
          placement="bottom start"
          className="fill-detail-popover-container"
          showArrow={false}
        >
          <FillDetailPopover
            fill={fill}
            onColorChange={handleColorChange}
            onColorChangeEnd={handleColorChangeEnd}
            onUpdate={handleFillUpdate}
            onUpdateEnd={handleFillUpdateEnd}
            onTypeChange={handleTypeChange}
          />
        </Popover>
      </DialogTrigger>

      <span className="fill-layer-row__hex">
        {isColor ? displayHex : gradientLabel}
      </span>

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
