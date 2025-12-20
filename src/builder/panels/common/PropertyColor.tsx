import React, { useCallback, useRef, useEffect, memo } from 'react';
import {
  ColorPicker as AriaColorPicker,
  ColorField as AriaColorField,
  Input,
  DialogTrigger,
  Button as AriaButton,
  type Color,
} from 'react-aria-components';
import { ColorSwatch } from '../../../shared/components/ColorSwatch';
import { ColorArea } from '../../../shared/components/ColorArea';
import { ColorSlider } from '../../../shared/components/ColorSlider';
import { Popover } from '../../../shared/components/Popover';

interface PropertyColorProps {
  label?: string;
  value: string; // Hex color string (e.g., "#FF0000")
  onChange: (value: string) => void;
  icon?: React.ComponentType<{
    color?: string;
    size?: number;
    strokeWidth?: number;
  }>;
  placeholder?: string;
  className?: string;
}

/**
 * 내부 ColorPicker 컴포넌트 - 드래그 중 로컬 상태 관리
 * 🚀 Phase 4: useEffect로 외부 값 동기화 (key 패턴 제거로 재마운트 방지)
 */
const ColorPickerInner = memo(function ColorPickerInner({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const [localColor, setLocalColor] = React.useState<string>(value);
  const [inputValue, setInputValue] = React.useState<string>(value);
  const lastSavedValue = useRef<string>(value);
  // 🚀 드래그 중인지 추적 (외부 동기화 방지)
  const isDraggingRef = useRef<boolean>(false);

  // 🚀 Phase 4: 외부 value 변경 시 로컬 상태 동기화
  useEffect(() => {
    // 드래그 중이면 외부 동기화 스킵 (드래그 중 깜빡임 방지)
    if (isDraggingRef.current) return;
    // 외부에서 변경된 경우만 동기화
    if (value !== lastSavedValue.current) {
      setLocalColor(value);
      setInputValue(value);
      lastSavedValue.current = value;
    }
  }, [value]);

  // 드래그 중: 로컬 상태만 업데이트 (UI 실시간 반영)
  const handleChange = useCallback((color: Color | null) => {
    if (!color) return;
    isDraggingRef.current = true; // 🚀 드래그 시작
    const hexValue = color.toString('hex');
    setLocalColor(hexValue);
    setInputValue(hexValue);
  }, []);

  // 드래그 종료: 실제 저장 (onChangeEnd)
  const handleChangeEnd = useCallback((color: Color) => {
    isDraggingRef.current = false; // 🚀 드래그 종료
    const hexValue = color.toString('hex');
    if (hexValue !== lastSavedValue.current) {
      lastSavedValue.current = hexValue;
      onChange(hexValue);
    }
  }, [onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    if (inputValue !== lastSavedValue.current) {
      lastSavedValue.current = inputValue;
      setLocalColor(inputValue);
      onChange(inputValue);
    }
  }, [inputValue, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue !== lastSavedValue.current) {
        lastSavedValue.current = inputValue;
        setLocalColor(inputValue);
        onChange(inputValue);
      }
      (e.target as HTMLInputElement).blur();
    }
  }, [inputValue, onChange]);

  return (
    <AriaColorPicker value={localColor} onChange={handleChange}>
      <DialogTrigger>
        <AriaButton className="react-aria-Group color-swatch-button">
          <ColorSwatch />
        </AriaButton>
        <Popover placement="bottom start" className="color-picker-popover">
          <div className="color-picker-content">
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
            <AriaColorField
              className="react-aria-ColorField"
              aria-label={label || "Color"}
            >
              <Input
                className="react-aria-Input"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
              />
            </AriaColorField>
          </div>
        </Popover>
      </DialogTrigger>
    </AriaColorPicker>
  );
}, (prevProps, nextProps) => {
  // 🚀 Phase 4: value만 비교 (onChange는 무시)
  return prevProps.value === nextProps.value && prevProps.label === nextProps.label;
});

// 🚀 Phase 21: memo 적용
// 🚀 Phase 4: key 패턴 제거 - 재마운트 대신 useEffect로 동기화
export const PropertyColor = memo(function PropertyColor({
  label,
  value,
  onChange,
  className,
}: PropertyColorProps) {
  return (
    <fieldset className={`properties-aria property-color-input ${className || ''}`}>
      {label && <legend className="fieldset-legend">{label}</legend>}
      <ColorPickerInner
        value={value}
        onChange={onChange}
        label={label}
      />
    </fieldset>
  );
}, (prevProps, nextProps) => {
  // 커스텀 비교: onChange 함수 참조는 무시하고 실제 값만 비교
  return (
    prevProps.label === nextProps.label &&
    prevProps.value === nextProps.value &&
    prevProps.className === nextProps.className &&
    prevProps.icon === nextProps.icon &&
    prevProps.placeholder === nextProps.placeholder
  );
});
