/**
 * BlendModeSelector - Fill 블렌드 모드 선택기
 *
 * 12종 BlendMode 드롭다운.
 * Pencil 앱의 Fill 속성 패턴 준수.
 *
 * @since 2026-02-10 Color Picker Phase 3
 */

import { memo, useCallback } from 'react';
import type { BlendMode } from '../../../../types/builder/fill.types';

import './BlendModeSelector.css';

interface BlendModeSelectorProps {
  value: BlendMode;
  onChange: (mode: BlendMode) => void;
}

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
];

export const BlendModeSelector = memo(function BlendModeSelector({
  value,
  onChange,
}: BlendModeSelectorProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value as BlendMode);
    },
    [onChange],
  );

  return (
    <div className="blend-mode-selector">
      <label className="blend-mode-selector__label">Blend</label>
      <select
        className="blend-mode-selector__select"
        value={value}
        onChange={handleChange}
        aria-label="Blend mode"
      >
        {BLEND_MODES.map(({ value: v, label }) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
});
