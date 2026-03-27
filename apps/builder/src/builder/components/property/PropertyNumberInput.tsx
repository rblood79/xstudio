import React, { useState, useEffect, useRef, memo } from "react";
import { NumberField, Input, Group, Button } from "react-aria-components";
import { Minus, Plus } from "lucide-react";
import { PropertyFieldset } from "./PropertyFieldset";
import { useStore } from "../../stores";

interface PropertyNumberInputProps {
  label?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  icon?: React.ComponentType<{
    color?: string;
    size?: number;
    strokeWidth?: number;
  }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  /** true 시 빈 입력을 undefined로 처리. 기본값: true */
  allowEmpty?: boolean;
}

export const PropertyNumberInput = memo(
  function PropertyNumberInput({
    label,
    value,
    onChange,
    icon,
    min,
    max,
    step = 1,
    placeholder,
    className,
    allowEmpty = true,
  }: PropertyNumberInputProps) {
    const selectedElementId = useStore((state) => state.selectedElementId);
    const [localValue, setLocalValue] = useState<number | undefined>(value);
    const committedRef = useRef(false);
    const focusedElementIdRef = useRef<string | null>(null);

    useEffect(() => {
      setLocalValue(value);
      committedRef.current = false;
      focusedElementIdRef.current = null;
    }, [value, selectedElementId]);

    const commit = (val: number | undefined) => {
      if (val !== value) {
        onChange(val);
      }
      committedRef.current = true;
    };

    return (
      <PropertyFieldset legend={label} icon={icon} className={className}>
        <NumberField
          aria-label={label || "Number"}
          value={localValue ?? NaN}
          onChange={(val) => {
            const resolved = isNaN(val)
              ? allowEmpty
                ? undefined
                : (min ?? 0)
              : val;
            setLocalValue(resolved);
          }}
          minValue={min}
          maxValue={max}
          step={step}
          isWheelDisabled={false}
        >
          <Group className="react-aria-NumberField-group">
            <Input
              className="react-aria-Input react-aria-NumberField-input"
              placeholder={placeholder}
              onFocus={(e) => {
                e.target.select();
                committedRef.current = false;
                focusedElementIdRef.current =
                  useStore.getState().selectedElementId ?? null;
              }}
              onBlur={() => {
                if (committedRef.current) {
                  committedRef.current = false;
                  return;
                }
                const currentId = useStore.getState().selectedElementId ?? null;
                if (
                  focusedElementIdRef.current !== null &&
                  currentId !== focusedElementIdRef.current
                ) {
                  return;
                }
                commit(localValue);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit(localValue);
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
            <span className="react-aria-NumberField-steppers">
              <Button
                slot="decrement"
                className="react-aria-NumberField-button"
                aria-label="Decrease"
              >
                <Minus size={10} />
              </Button>
              <Button
                slot="increment"
                className="react-aria-NumberField-button"
                aria-label="Increase"
              >
                <Plus size={10} />
              </Button>
            </span>
          </Group>
        </NumberField>
      </PropertyFieldset>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.label === nextProps.label &&
      prevProps.value === nextProps.value &&
      prevProps.min === nextProps.min &&
      prevProps.max === nextProps.max &&
      prevProps.step === nextProps.step &&
      prevProps.placeholder === nextProps.placeholder &&
      prevProps.className === nextProps.className &&
      prevProps.icon === nextProps.icon &&
      prevProps.allowEmpty === nextProps.allowEmpty
    );
  },
);
