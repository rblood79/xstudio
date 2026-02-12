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

  // RAF 스로틀: setLocalColor + onChange를 프레임당 1회로 제한
  // ColorArea/ColorSlider는 내부적으로 포인터 위치를 직접 추적하므로
  // value prop 업데이트 없이도 thumb이 부드럽게 이동함
  const localRafRef = useRef<number | null>(null);
  const latestColorRef = useRef<Color | null>(null);

  // 드래그 중: RAF 스로틀로 로컬 상태 + 프리뷰 업데이트
  const handleChange = useCallback(
    (color: Color | null) => {
      if (!color) return;
      latestColorRef.current = color;

      if (localRafRef.current !== null) return;

      localRafRef.current = requestAnimationFrame(() => {
        localRafRef.current = null;
        const latest = latestColorRef.current;
        if (!latest) return;
        setLocalColor(latest);
        onChange(latest.toString('hexa'));
      });
    },
    [onChange],
  );

  // 드래그 종료: 보류 중인 RAF 취소 + 최종 값 flush + 실제 저장
  const handleChangeEnd = useCallback(
    (color: Color) => {
      // 보류 중인 RAF 취소 (이중 업데이트 방지)
      if (localRafRef.current !== null) {
        cancelAnimationFrame(localRafRef.current);
        localRafRef.current = null;
      }
      latestColorRef.current = null;

      // 최종 색상으로 로컬 상태 동기화
      setLocalColor(color);

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
