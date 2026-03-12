import React, { useCallback, useRef, memo } from 'react';
import {
  ColorPicker as AriaColorPicker,
  ColorField as AriaColorField,
  Input,
  DialogTrigger,
  Button as AriaButton,
  type Color,
} from 'react-aria-components';
import { ColorSwatch } from "@xstudio/shared/components/ColorSwatch";
import { ColorArea } from "@xstudio/shared/components/ColorArea";
import { ColorSlider } from "@xstudio/shared/components/ColorSlider";
import { Popover } from "@xstudio/shared/components/Popover";
import { useStore } from "../../stores";

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
 * key prop으로 외부 value 변경 시 재마운트하여 상태 동기화
 * 🚀 Jotai selectAtom equality 체크로 동일 값이면 리렌더 없음 → key 변경 없음
 */
function ColorPickerInner({
  initialValue,
  onChange,
  label,
}: {
  initialValue: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const selectedElementId = useStore((state) => state.selectedElementId);
  const [localColor, setLocalColor] = React.useState<string>(initialValue);
  const [inputValue, setInputValue] = React.useState<string>(initialValue);
  const lastSavedValue = useRef<string>(initialValue);
  const focusedElementIdRef = useRef<string | null>(null);

  React.useEffect(() => {
    setLocalColor(initialValue);
    setInputValue(initialValue);
    lastSavedValue.current = initialValue;
    focusedElementIdRef.current = null;
  }, [initialValue, selectedElementId]);

  // 드래그 중: 로컬 상태만 업데이트 (UI 실시간 반영)
  const handleChange = useCallback((color: Color | null) => {
    if (!color) return;
    const hexValue = color.toString('hex');
    setLocalColor(hexValue);
    setInputValue(hexValue);
  }, []);

  // 드래그 종료: 실제 저장 (onChangeEnd)
  const handleChangeEnd = useCallback((color: Color) => {
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
    const currentElementId = useStore.getState().selectedElementId ?? null;
    if (
      focusedElementIdRef.current !== null &&
      currentElementId !== focusedElementIdRef.current
    ) {
      return;
    }

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
                onFocus={() => {
                  focusedElementIdRef.current = selectedElementId ?? null;
                }}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
              />
            </AriaColorField>
          </div>
        </Popover>
      </DialogTrigger>
    </AriaColorPicker>
  );
}

// 🚀 Phase 21: memo 적용
// 🚀 Jotai selectAtom equality 체크로 동일 값이면 리렌더 없음 → key 변경 없음
export const PropertyColor = memo(function PropertyColor({
  label,
  value,
  onChange,
  className,
}: PropertyColorProps) {
  const selectedElementId = useStore((state) => state.selectedElementId);
  return (
    <fieldset className={`properties-aria property-color-input ${className || ''}`}>
      {label && <legend className="fieldset-legend">{label}</legend>}
      <ColorPickerInner
        key={`${selectedElementId ?? "none"}:${value}`}
        initialValue={value}
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
