import React, { useRef, memo, useState, useMemo, useEffect } from "react";
import {
  ComboBox as AriaComboBox,
  Button,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import { ChevronDown } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { useStore } from "../../stores";

interface PropertyUnitInputProps {
  label?: string;
  value: string; // "100px", "50%", "auto"
  onChange: (value: string) => void;
  /** RAF 스로틀 업데이트 (화살표 키 반복 입력용) */
  onDrag?: (value: string) => void;
  icon?: React.ComponentType<{
    color?: string;
    size?: number;
    strokeWidth?: number;
  }>;
  className?: string;
  units?: string[];
  defaultUnit?: string;
  allowKeywords?: boolean;
  min?: number;
  max?: number;
}

const DEFAULT_UNITS = ["px", "%", "rem", "em", "vh", "vw", "reset"];
const KEYWORDS = [
  "reset",
  "auto",
  "inherit",
  "initial",
  "unset",
  "normal",
  "fit-content",
  "min-content",
  "max-content", // CSS intrinsic sizing
];

/** input 표시용 축약 label (드롭다운 목록은 원본 유지) */
const INPUT_DISPLAY_LABELS: Record<string, string> = {
  "fit-content": "fit",
};

/** 축약 label → 원본 keyword 역매핑 (input 입력값 복원용) */
const INPUT_LABEL_TO_KEYWORD: Record<string, string> = {
  fit: "fit-content",
};

function parseUnitValue(value: string): {
  numericValue: number | null;
  unit: string;
} {
  const trimmed = value.trim();

  if (KEYWORDS.includes(trimmed)) {
    return { numericValue: null, unit: trimmed };
  }

  // ⭐ Shorthand 값 처리: "8px 12px" → 첫 번째 값 "8px" 사용
  // padding, margin 등의 shorthand CSS 속성이 여러 값을 가질 때 첫 번째 값을 파싱
  const firstValue = trimmed.split(/\s+/)[0];

  const match = firstValue.match(/^(-?\d+\.?\d*)([a-z%]+)?$/i);
  if (match) {
    const numericValue = parseFloat(match[1]);
    const unit = match[2] || "";
    return { numericValue, unit };
  }

  return { numericValue: 0, unit: "px" };
}

export const PropertyUnitInput = memo(
  function PropertyUnitInput({
    label,
    value,
    onChange,
    onDrag,
    icon: Icon,
    className,
    units = DEFAULT_UNITS,
    defaultUnit = "",
    allowKeywords = true,
    min = 0,
    max = 9999,
  }: PropertyUnitInputProps) {
    // useMemo로 value prop에서 파생값 계산 (useLayoutEffect + setState 대체)
    const parsed = useMemo(() => parseUnitValue(value), [value]);
    const numericValue = parsed.numericValue;
    const unit =
      parsed.unit || (parsed.numericValue !== null ? defaultUnit : parsed.unit);
    const isKeyword = parsed.numericValue === null;
    const [inputValue, setInputValue] = useState(
      parsed.numericValue !== null
        ? String(parsed.numericValue)
        : (INPUT_DISPLAY_LABELS[parsed.unit] ?? parsed.unit),
    );
    // ⭐ useRef로 변경: Enter 키로 저장했는지 추적 (useState는 비동기!)
    const justSavedViaEnterRef = useRef(false);
    // ⭐ 마지막으로 저장한 값 추적 - 중복 호출 방지
    const lastSavedValueRef = useRef<string>(value);
    // ⭐ focus 시점의 selectedElementId 캡처 — blur 시 요소 전환 감지용
    const focusedElementIdRef = useRef<string | null>(null);

    // 외부 value 변경 시 inputValue 동기화 (prev state 패턴)
    const [prevValue, setPrevValue] = useState(value);
    if (prevValue !== value) {
      setPrevValue(value);
      setInputValue(
        parsed.numericValue !== null
          ? String(parsed.numericValue)
          : (INPUT_DISPLAY_LABELS[parsed.unit] ?? parsed.unit),
      );
    }

    // 외부 value 변경 시 refs 동기화 (렌더 중 ref 쓰기 금지이므로 effect 사용)
    useEffect(() => {
      justSavedViaEnterRef.current = false;
      lastSavedValueRef.current = value;
    }, [value]);

    const handleInputChange = (newValue: string) => {
      setInputValue(newValue);

      // 타이핑 중 실시간 캔버스 프리뷰 (Pencil 앱 동작 방식)
      // onDrag가 있으면 RAF-throttled로 캔버스에 즉시 반영
      if (onDrag) {
        const num = parseFloat(newValue);
        if (!isNaN(num) && num >= min && num <= max) {
          const effectiveUnit = KEYWORDS.includes(unit) ? "px" : unit;
          onDrag(`${num}${effectiveUnit}`);
        }
      }
    };

    // ⭐ ComboBox 컨테이너 ref - 내부 포커스 이동 감지용
    const comboBoxContainerRef = useRef<HTMLDivElement>(null);
    const comboBoxRef = useRef<HTMLDivElement>(null);
    const groupRef = useRef<HTMLDivElement>(null);
    const [popoverMetrics, setPopoverMetrics] = useState({
      width: 0,
      offset: 0,
    });

    useEffect(() => {
      const updatePopoverMetrics = () => {
        const groupElement = groupRef.current;
        const comboBoxElement = comboBoxRef.current;

        if (!groupElement || !comboBoxElement) return;

        const groupRect = groupElement.getBoundingClientRect();
        const comboBoxRect = comboBoxElement.getBoundingClientRect();
        const nextMetrics = {
          width: Math.round(groupRect.width),
          offset: Math.round(groupRect.left - comboBoxRect.left),
        };

        setPopoverMetrics((prev) => {
          if (
            prev.width === nextMetrics.width &&
            prev.offset === nextMetrics.offset
          ) {
            return prev;
          }

          return nextMetrics;
        });
      };

      updatePopoverMetrics();

      if (typeof ResizeObserver === "undefined") {
        window.addEventListener("resize", updatePopoverMetrics);

        return () => {
          window.removeEventListener("resize", updatePopoverMetrics);
        };
      }

      const resizeObserver = new ResizeObserver(() => {
        updatePopoverMetrics();
      });

      if (groupRef.current) {
        resizeObserver.observe(groupRef.current);
      }

      if (comboBoxRef.current) {
        resizeObserver.observe(comboBoxRef.current);
      }

      window.addEventListener("resize", updatePopoverMetrics);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener("resize", updatePopoverMetrics);
      };
    }, []);

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // ⭐ Skip save if we just saved via Enter key (useRef는 즉시 반영됨!)
      if (justSavedViaEnterRef.current) {
        justSavedViaEnterRef.current = false;
        return;
      }

      // ⭐ 요소 전환 감지: focus 시점과 blur 시점의 selectedElementId가 다르면
      // 이전 요소의 값이 새 요소에 적용되는 것을 방지
      const currentElementId = useStore.getState().selectedElementId ?? null;
      if (
        focusedElementIdRef.current !== null &&
        currentElementId !== focusedElementIdRef.current
      ) {
        return;
      }

      // ⭐ ComboBox 내부로 포커스 이동 시 blur 처리 스킵
      // Input → Button 이동 시 불필요한 onChange 방지
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (
        relatedTarget &&
        comboBoxContainerRef.current?.contains(relatedTarget)
      ) {
        return;
      }

      const trimmed = inputValue.trim();
      const resolved =
        INPUT_LABEL_TO_KEYWORD[trimmed.toLowerCase()] ?? trimmed.toLowerCase();

      if (allowKeywords && KEYWORDS.includes(resolved)) {
        const keyword = resolved;
        // "reset" 선택 시 inline style 제거 (빈 문자열 전달)
        const newValue = keyword === "reset" ? "" : keyword;
        // ⭐ 값이 변경된 경우에만 onChange 호출 + 중복 호출 방지
        if (newValue !== value && newValue !== lastSavedValueRef.current) {
          lastSavedValueRef.current = newValue;
          onChange(newValue);
        }
        return;
      }

      const num = parseFloat(trimmed);
      if (isNaN(num)) {
        // Invalid input, revert to previous value
        if (numericValue !== null) {
          setInputValue(String(numericValue));
        } else {
          setInputValue("");
        }
        return;
      }

      if (num < min || num > max) {
        // Out of range, revert to previous value
        if (numericValue !== null) {
          setInputValue(String(numericValue));
        } else {
          setInputValue("");
        }
        return;
      }

      // ⭐ 키워드 단위(auto, fit-content 등)에서 숫자로 전환 시 px로 기본 설정
      const effectiveUnit = KEYWORDS.includes(unit) ? "px" : unit;

      // ⭐ Shorthand 값 비교: "8px 12px" → 첫 번째 값 "8px"와 비교
      // 원본 값을 파싱하여 실제 숫자값/단위가 변경되었는지 확인
      const originalParsed = parseUnitValue(value);
      const valueActuallyChanged =
        originalParsed.numericValue !== num ||
        originalParsed.unit !== effectiveUnit;

      const newValue = `${num}${effectiveUnit}`;
      // 실제로 값이 변경된 경우에만 onChange 호출
      if (valueActuallyChanged && newValue !== lastSavedValueRef.current) {
        lastSavedValueRef.current = newValue;
        onChange(newValue);
      }
    };

    const handleUnitChange = (selectedUnit: string) => {
      if (KEYWORDS.includes(selectedUnit)) {
        // "reset" 선택 시 inline style 제거 (빈 문자열 전달)
        const newValue = selectedUnit === "reset" ? "" : selectedUnit;
        // ⭐ 중복 호출 방지
        if (newValue !== value && newValue !== lastSavedValueRef.current) {
          lastSavedValueRef.current = newValue;
          onChange(newValue);
        }
        return;
      }

      // Use the current input value, not the state numericValue
      const currentNum = parseFloat(inputValue);
      let newValue: string;
      if (!isNaN(currentNum) && currentNum !== 0) {
        // 현재 값이 유효한 숫자이고 0이 아니면 유지
        newValue = `${currentNum}${selectedUnit}`;
      } else if (numericValue !== null && numericValue !== 0) {
        // state에 저장된 값이 있고 0이 아니면 사용
        newValue = `${numericValue}${selectedUnit}`;
      } else {
        // ⭐ %, vh, vw 단위는 100을 기본값으로, 나머지는 0
        const defaultValue = ["%", "vh", "vw"].includes(selectedUnit) ? 100 : 0;
        newValue = `${defaultValue}${selectedUnit}`;
      }

      // ⭐ 중복 호출 방지
      if (newValue !== value && newValue !== lastSavedValueRef.current) {
        lastSavedValueRef.current = newValue;
        onChange(newValue);
      }
    };

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all text on focus for easier editing
      e.target.select();
      // Reset flag on focus (new editing session)
      justSavedViaEnterRef.current = false;
      // ⭐ focus 시점의 selectedElementId 캡처 — blur 시 요소 전환 감지
      focusedElementIdRef.current =
        useStore.getState().selectedElementId ?? null;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // ⭐ Enter로 저장하기 전에 값이 변경되었는지 확인
        const trimmed = inputValue.trim();
        const resolved =
          INPUT_LABEL_TO_KEYWORD[trimmed.toLowerCase()] ??
          trimmed.toLowerCase();
        let shouldSave = false;

        if (allowKeywords && KEYWORDS.includes(resolved)) {
          const keyword = resolved;
          const newVal = keyword === "reset" ? "" : keyword;
          if (newVal !== value) {
            onChange(newVal);
            shouldSave = true;
          }
        } else {
          const num = parseFloat(trimmed);
          if (!isNaN(num) && num >= min && num <= max) {
            // ⭐ 키워드 단위(auto, fit-content 등)에서 숫자로 전환 시 px로 기본 설정
            const effectiveUnit = KEYWORDS.includes(unit) ? "px" : unit;

            // ⭐ Shorthand 값 비교: 실제 숫자값/단위가 변경되었는지 확인
            const originalParsed = parseUnitValue(value);
            const valueActuallyChanged =
              originalParsed.numericValue !== num ||
              originalParsed.unit !== effectiveUnit;

            if (valueActuallyChanged) {
              const newVal = `${num}${effectiveUnit}`;
              onChange(newVal);
              shouldSave = true;
            }
          }
        }

        if (shouldSave) {
          // ⭐ useRef로 즉시 플래그 설정 (setState와 달리 동기적!)
          justSavedViaEnterRef.current = true;
        }
        // Blur the input to confirm the change
        (e.target as HTMLInputElement).blur();
        return;
      }

      if (isKeyword) return;

      const step = e.shiftKey ? 10 : 1;
      let newValue = numericValue || 0;

      // 🚀 Phase 1: onDrag가 있으면 RAF 스로틀 업데이트, 없으면 즉시 업데이트
      const updateFn = onDrag || onChange;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        newValue = Math.min(newValue + step, max);
        updateFn(`${newValue}${unit}`);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        newValue = Math.max(newValue - step, min);
        updateFn(`${newValue}${unit}`);
      }
    };

    return (
      <fieldset
        className={`properties-aria property-unit-input ${className || ""}`}
      >
        {label && <legend className="fieldset-legend">{label}</legend>}
        <div className="react-aria-control react-aria-Group" ref={groupRef}>
          {Icon && (
            <label className="control-label">
              <Icon
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </label>
          )}
          <AriaComboBox
            className="react-aria-ComboBox react-aria-UnitComboBox"
            ref={comboBoxRef}
            inputValue={unit === "" ? "—" : unit}
            onSelectionChange={(key) => {
              if (key !== null) {
                const selectedUnit = key === "—" ? "" : (key as string);
                handleUnitChange(selectedUnit);
              }
            }}
            selectedKey={
              value === "" && units.includes("reset")
                ? "reset"
                : unit === ""
                  ? "—"
                  : unit
            }
            aria-label="Unit"
          >
            <div className="combobox-container" ref={comboBoxContainerRef}>
              <Input
                className="react-aria-Input"
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                aria-label={label || "Value"}
                placeholder="reset"
              />
              <Button className="react-aria-Button">
                <ChevronDown size={iconProps.size} />
              </Button>
            </div>
            <Popover
              className="react-aria-Popover property-unit-input-popover"
              style={{
                width: "max-content",
                minWidth:
                  popoverMetrics.width > 0 ? `${popoverMetrics.width}px` : undefined,
                marginLeft:
                  popoverMetrics.offset !== 0
                    ? `${popoverMetrics.offset}px`
                    : undefined,
              }}
            >
              <ListBox className="react-aria-ListBox">
                {units.map((u) => (
                  <ListBoxItem
                    key={u === "" ? "—" : u}
                    id={u === "" ? "—" : u}
                    className="react-aria-ListBoxItem"
                    textValue={u === "" ? "—" : u}
                  >
                    {u === "" ? "—" : u}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </AriaComboBox>
        </div>
      </fieldset>
    );
  },
  (prevProps, nextProps) => {
    // ⭐ 커스텀 비교: onChange 함수 참조는 무시하고 실제 값만 비교
    return (
      prevProps.label === nextProps.label &&
      prevProps.value === nextProps.value &&
      prevProps.className === nextProps.className &&
      prevProps.icon === nextProps.icon &&
      prevProps.min === nextProps.min &&
      prevProps.max === nextProps.max &&
      prevProps.allowKeywords === nextProps.allowKeywords &&
      JSON.stringify(prevProps.units) === JSON.stringify(nextProps.units)
    );
  },
);
