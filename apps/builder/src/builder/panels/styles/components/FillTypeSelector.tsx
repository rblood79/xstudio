/**
 * FillTypeSelector - Fill 타입 선택 버튼 그룹
 *
 * Phase 1: Color만 활성, 나머지 타입은 disabled
 *
 * @since 2026-02-10 Color Picker Phase 1
 */

import { memo, useCallback } from 'react';
import { Circle, ArrowUpRight, Target, RotateCw, Image, type LucideIcon } from 'lucide-react';
import { FillType } from '../../../../types/builder/fill.types';

import './FillTypeSelector.css';

interface FillTypeSelectorProps {
  value: FillType;
  onChange: (type: FillType) => void;
}

const FILL_TYPES: { type: FillType; label: string; icon: LucideIcon; disabled: boolean }[] = [
  { type: FillType.Color, label: 'Color', icon: Circle, disabled: false },
  { type: FillType.LinearGradient, label: 'Linear Gradient', icon: ArrowUpRight, disabled: true },
  { type: FillType.RadialGradient, label: 'Radial Gradient', icon: Target, disabled: true },
  { type: FillType.AngularGradient, label: 'Angular Gradient', icon: RotateCw, disabled: true },
  { type: FillType.Image, label: 'Image', icon: Image, disabled: true },
];

export const FillTypeSelector = memo(function FillTypeSelector({
  value,
  onChange,
}: FillTypeSelectorProps) {
  const handleClick = useCallback(
    (type: FillType) => {
      onChange(type);
    },
    [onChange],
  );

  return (
    <div className="fill-type-selector" role="radiogroup" aria-label="Fill type">
      {FILL_TYPES.map(({ type, label, icon: Icon, disabled }) => (
        <button
          key={type}
          type="button"
          className="fill-type-selector__btn"
          role="radio"
          aria-checked={value === type}
          aria-label={label}
          data-active={value === type || undefined}
          disabled={disabled}
          onClick={() => handleClick(type)}
          title={disabled ? `${label} (coming soon)` : label}
        >
          <Icon size={14} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
});
