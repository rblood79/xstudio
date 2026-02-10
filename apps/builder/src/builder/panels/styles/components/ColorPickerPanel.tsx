/**
 * ColorPickerPanel - 풀 컬러 피커 패널
 *
 * Color Picker Phase 1: HSB ColorArea + Hue/Alpha Slider + Input Fields
 * - 드래그 최적화: 로컬 상태로 UI 업데이트, onChangeEnd에서 부모 콜백
 * - React Aria parseColor 사용
 *
 * @since 2026-02-10 Color Picker Phase 1
 */

import { memo, useState, useCallback, useRef } from 'react';
import {
  ColorPicker as AriaColorPicker,
  parseColor,
  type Color,
} from 'react-aria-components';
import { ColorArea } from '@xstudio/shared/components/ColorArea';
import { ColorSlider } from '@xstudio/shared/components/ColorSlider';
import { ColorInputModeSelector } from './ColorInputModeSelector';
import { ColorInputFields } from './ColorInputFields';
import { EyeDropperButton } from './EyeDropperButton';

import './ColorPickerPanel.css';

interface ColorPickerPanelProps {
  value: string; // "#RRGGBBAA" hex8
  onChange: (color: string) => void;
  onChangeEnd: (color: string) => void;
}

/**
 * 내부 피커 - 드래그 중 로컬 상태 관리
 * key prop으로 외부 value 변경 시 재마운트하여 상태 동기화
 */
function ColorPickerPanelInner({
  initialValue,
  onChange,
  onChangeEnd,
}: {
  initialValue: string;
  onChange: (color: string) => void;
  onChangeEnd: (color: string) => void;
}) {
  const [localColor, setLocalColor] = useState<Color>(() => {
    try {
      return parseColor(initialValue);
    } catch {
      return parseColor('#000000');
    }
  });
  const lastSavedRef = useRef<string>(initialValue);

  // 드래그 중: 로컬 상태만 업데이트 (프리뷰)
  const handleChange = useCallback(
    (color: Color | null) => {
      if (!color) return;
      setLocalColor(color);
      const hex = color.toString('hexa');
      onChange(hex);
    },
    [onChange],
  );

  // 드래그 종료: 실제 저장
  const handleChangeEnd = useCallback(
    (color: Color) => {
      const hex = color.toString('hexa');
      if (hex !== lastSavedRef.current) {
        lastSavedRef.current = hex;
        onChangeEnd(hex);
      }
    },
    [onChangeEnd],
  );

  // InputFields에서 직접 hex8 문자열로 변경
  const handleInputChange = useCallback(
    (hex: string) => {
      try {
        const parsed = parseColor(hex);
        setLocalColor(parsed);
        lastSavedRef.current = hex;
        onChangeEnd(hex);
      } catch {
        // 무효한 입력 무시
      }
    },
    [onChangeEnd],
  );

  const hexValue = localColor.toString('hexa');

  return (
    <AriaColorPicker value={localColor} onChange={handleChange}>
      <div className="color-picker-panel">
        <ColorArea
          colorSpace="hsb"
          xChannel="saturation"
          yChannel="brightness"
          onChangeEnd={handleChangeEnd}
        />
        <ColorSlider
          colorSpace="hsb"
          channel="hue"
          onChangeEnd={handleChangeEnd}
        />
        <ColorSlider
          channel="alpha"
          onChangeEnd={handleChangeEnd}
        />
        <div className="color-picker-panel__inputs">
          <div className="color-picker-panel__inputs-row">
            <EyeDropperButton onColorPick={handleInputChange} />
            <ColorInputModeSelector />
          </div>
          <ColorInputFields value={hexValue} onChange={handleInputChange} />
        </div>
      </div>
    </AriaColorPicker>
  );
}

export const ColorPickerPanel = memo(function ColorPickerPanel({
  value,
  onChange,
  onChangeEnd,
}: ColorPickerPanelProps) {
  return (
    <ColorPickerPanelInner
      key={value}
      initialValue={value}
      onChange={onChange}
      onChangeEnd={onChangeEnd}
    />
  );
});
