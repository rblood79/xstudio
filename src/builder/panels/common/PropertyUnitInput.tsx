/**
 * PropertyUnitInput - 전역 단위 설정을 사용하는 단순화된 CSS 값 입력
 *
 * 포토샵 스타일: Settings에서 설정한 기본 단위를 사용
 * - 숫자만 입력 → 자동으로 전역 단위 적용
 * - auto, inherit, reset 등 키워드 직접 입력 가능
 */

import React, { useState, useEffect, useRef, memo } from "react";
import { Input } from "react-aria-components";
import { useStore } from "../../stores";

interface PropertyUnitInputProps {
  label?: string;
  value: string; // "100px", "50%", "auto"
  onChange: (value: string) => void;
  icon?: React.ComponentType<{
    color?: string;
    size?: number;
    strokeWidth?: number;
  }>;
  className?: string;
  allowKeywords?: boolean;
  min?: number;
  max?: number;
}

const KEYWORDS = ["reset", "auto", "inherit", "initial", "unset", "normal"];

function parseUnitValue(value: string): {
  numericValue: number | null;
  unit: string;
} {
  const trimmed = value.trim();

  if (KEYWORDS.includes(trimmed)) {
    return { numericValue: null, unit: trimmed };
  }

  // Shorthand 값 처리: "8px 12px" → 첫 번째 값 "8px" 사용
  const firstValue = trimmed.split(/\s+/)[0];

  const match = firstValue.match(/^(-?\d+\.?\d*)([a-z%]+)?$/i);
  if (match) {
    const numericValue = parseFloat(match[1]);
    const unit = match[2] || "";
    return { numericValue, unit };
  }

  return { numericValue: 0, unit: "px" };
}

export const PropertyUnitInput = memo(function PropertyUnitInput({
  label,
  value,
  onChange,
  icon: Icon,
  className,
  allowKeywords = true,
  min = 0,
  max = 9999,
}: PropertyUnitInputProps) {
  // 전역 기본 단위 가져오기
  const defaultUnit = useStore((state) => state.defaultUnit);

  const [inputValue, setInputValue] = useState("");
  const [isKeyword, setIsKeyword] = useState(false);

  // Enter 키로 저장했는지 추적
  const justSavedViaEnterRef = useRef(false);
  // 마지막으로 저장한 값 추적 - 중복 호출 방지
  const lastSavedValueRef = useRef<string>(value);

  useEffect(() => {
    const parsed = parseUnitValue(value);
    setIsKeyword(parsed.numericValue === null);

    // 숫자값이면 숫자만 표시, 키워드면 키워드 그대로 표시
    if (parsed.numericValue !== null) {
      setInputValue(String(parsed.numericValue));
    } else {
      setInputValue(parsed.unit);
    }

    // Reset flags
    justSavedViaEnterRef.current = false;
    lastSavedValueRef.current = value;
  }, [value]);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
  };

  const handleInputBlur = () => {
    // Skip if just saved via Enter
    if (justSavedViaEnterRef.current) {
      justSavedViaEnterRef.current = false;
      return;
    }

    const trimmed = inputValue.trim();

    // 키워드 처리 (auto, inherit, reset 등)
    if (allowKeywords && KEYWORDS.includes(trimmed.toLowerCase())) {
      const keyword = trimmed.toLowerCase();
      // "reset" 선택 시 inline style 제거 (빈 문자열 전달)
      const newValue = keyword === "reset" ? "" : keyword;
      if (newValue !== value && newValue !== lastSavedValueRef.current) {
        lastSavedValueRef.current = newValue;
        onChange(newValue);
      }
      return;
    }

    // 숫자 처리
    const num = parseFloat(trimmed);
    if (isNaN(num)) {
      // Invalid input - revert
      const parsed = parseUnitValue(value);
      if (parsed.numericValue !== null) {
        setInputValue(String(parsed.numericValue));
      } else {
        setInputValue("");
      }
      return;
    }

    if (num < min || num > max) {
      // Out of range - revert
      const parsed = parseUnitValue(value);
      if (parsed.numericValue !== null) {
        setInputValue(String(parsed.numericValue));
      } else {
        setInputValue("");
      }
      return;
    }

    // 전역 단위 사용
    const originalParsed = parseUnitValue(value);
    const valueActuallyChanged =
      originalParsed.numericValue !== num || originalParsed.unit !== defaultUnit;

    const newValue = `${num}${defaultUnit}`;
    if (valueActuallyChanged && newValue !== lastSavedValueRef.current) {
      lastSavedValueRef.current = newValue;
      onChange(newValue);
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    justSavedViaEnterRef.current = false;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = inputValue.trim();
      let shouldSave = false;

      if (allowKeywords && KEYWORDS.includes(trimmed.toLowerCase())) {
        const keyword = trimmed.toLowerCase();
        const newVal = keyword === "reset" ? "" : keyword;
        if (newVal !== value) {
          onChange(newVal);
          shouldSave = true;
        }
      } else {
        const num = parseFloat(trimmed);
        if (!isNaN(num) && num >= min && num <= max) {
          const originalParsed = parseUnitValue(value);
          const valueActuallyChanged =
            originalParsed.numericValue !== num ||
            originalParsed.unit !== defaultUnit;

          if (valueActuallyChanged) {
            const newVal = `${num}${defaultUnit}`;
            onChange(newVal);
            shouldSave = true;
          }
        }
      }

      if (shouldSave) {
        justSavedViaEnterRef.current = true;
      }
      (e.target as HTMLInputElement).blur();
      return;
    }

    if (isKeyword) return;

    // Arrow up/down for incrementing/decrementing
    const step = e.shiftKey ? 10 : 1;
    const parsed = parseUnitValue(value);
    let currentNum = parsed.numericValue || 0;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      currentNum = Math.min(currentNum + step, max);
      onChange(`${currentNum}${defaultUnit}`);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      currentNum = Math.max(currentNum - step, min);
      onChange(`${currentNum}${defaultUnit}`);
    }
  };

  // 단위 표시 (숫자값일 때만)
  const displayUnit = !isKeyword ? defaultUnit : "";

  return (
    <fieldset
      className={`properties-aria property-unit-input ${className || ""}`}
    >
      {label && <legend className="fieldset-legend">{label}</legend>}
      <div className="react-aria-control react-aria-Group">
        {Icon && (
          <label className="control-label">
            <Icon color="var(--color-text-secondary)" size={14} strokeWidth={1.5} />
          </label>
        )}
        <div className="unit-input-wrapper">
          <Input
            className="react-aria-Input"
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            aria-label={label || "Value"}
            placeholder="auto"
          />
          {displayUnit && (
            <span className="unit-suffix">{displayUnit}</span>
          )}
        </div>
      </div>
    </fieldset>
  );
}, (prevProps, nextProps) => {
  // 커스텀 비교: onChange 함수 참조는 무시하고 실제 값만 비교
  return (
    prevProps.label === nextProps.label &&
    prevProps.value === nextProps.value &&
    prevProps.className === nextProps.className &&
    prevProps.icon === nextProps.icon &&
    prevProps.min === nextProps.min &&
    prevProps.max === nextProps.max &&
    prevProps.allowKeywords === nextProps.allowKeywords
  );
});
