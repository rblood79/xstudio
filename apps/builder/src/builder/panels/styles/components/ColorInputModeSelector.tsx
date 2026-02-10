/**
 * ColorInputModeSelector - 색상 입력 모드 선택기
 *
 * 5가지 모드: RGBA, HEX, CSS, HSL, HSB
 * Jotai colorInputModeAtom에서 읽기/쓰기
 *
 * @since 2026-02-10 Color Picker Phase 1
 */

import { memo, useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import type { ColorInputMode } from '../../../../types/builder/fill.types';
import { colorInputModeAtom } from '../atoms/fillAtoms';

import './ColorInputModeSelector.css';

const MODES: { value: ColorInputMode; label: string }[] = [
  { value: 'hex', label: 'HEX' },
  { value: 'rgba', label: 'RGBA' },
  { value: 'css', label: 'CSS' },
  { value: 'hsl', label: 'HSL' },
  { value: 'hsb', label: 'HSB' },
];

export const ColorInputModeSelector = memo(function ColorInputModeSelector() {
  const mode = useAtomValue(colorInputModeAtom);
  const setMode = useSetAtom(colorInputModeAtom);

  const handleChange = useCallback(
    (newMode: ColorInputMode) => {
      setMode(newMode);
    },
    [setMode],
  );

  return (
    <div className="color-input-mode-selector" role="radiogroup" aria-label="Color input mode">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          className="color-input-mode-selector__btn"
          data-active={m.value === mode || undefined}
          role="radio"
          aria-checked={m.value === mode}
          onClick={() => handleChange(m.value)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
});
