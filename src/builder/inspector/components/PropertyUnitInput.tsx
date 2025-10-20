import React, { useState, useEffect } from "react";
import {
  ComboBox as AriaComboBox,
  Button,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import { ChevronDown } from "lucide-react";
import { iconProps } from "../../../utils/uiConstants";

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
  units?: string[];
  allowKeywords?: boolean;
  min?: number;
  max?: number;
}

const DEFAULT_UNITS = ["px", "%", "rem", "em", "vh", "vw", "auto"];
const KEYWORDS = ["auto", "inherit", "initial", "unset", "normal"];

function parseUnitValue(value: string): {
  numericValue: number | null;
  unit: string;
} {
  const trimmed = value.trim();

  if (KEYWORDS.includes(trimmed)) {
    return { numericValue: null, unit: trimmed };
  }

  const match = trimmed.match(/^(-?\d+\.?\d*)([a-z%]+)?$/i);
  if (match) {
    const numericValue = parseFloat(match[1]);
    const unit = match[2] || "";
    return { numericValue, unit };
  }

  return { numericValue: 0, unit: "px" };
}

export function PropertyUnitInput({
  label,
  value,
  onChange,
  icon: Icon,
  className,
  units = DEFAULT_UNITS,
  allowKeywords = true,
  min = 0,
  max = 9999,
}: PropertyUnitInputProps) {
  const [numericValue, setNumericValue] = useState<number | null>(null);
  const [unit, setUnit] = useState<string>("px");
  const [isKeyword, setIsKeyword] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const parsed = parseUnitValue(value);
    setNumericValue(parsed.numericValue);
    setUnit(parsed.unit);
    setIsKeyword(parsed.numericValue === null);
    setInputValue(
      parsed.numericValue !== null ? String(parsed.numericValue) : parsed.unit
    );
  }, [value]);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
  };

  const handleInputBlur = () => {
    const trimmed = inputValue.trim();

    if (allowKeywords && KEYWORDS.includes(trimmed.toLowerCase())) {
      onChange(trimmed.toLowerCase());
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

    onChange(`${num}${unit}`);
  };

  const handleUnitChange = (selectedUnit: string) => {
    if (KEYWORDS.includes(selectedUnit)) {
      onChange(selectedUnit);
      return;
    }

    // Use the current input value, not the state numericValue
    const currentNum = parseFloat(inputValue);
    if (!isNaN(currentNum)) {
      onChange(`${currentNum}${selectedUnit}`);
    } else if (numericValue !== null) {
      onChange(`${numericValue}${selectedUnit}`);
    } else {
      onChange(`0${selectedUnit}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInputBlur();
      return;
    }

    if (isKeyword) return;

    const step = e.shiftKey ? 10 : 1;
    let newValue = numericValue || 0;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      newValue = Math.min(newValue + step, max);
      onChange(`${newValue}${unit}`);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      newValue = Math.max(newValue - step, min);
      onChange(`${newValue}${unit}`);
    }
  };

  return (
    <fieldset
      className={`properties-aria property-unit-input ${className || ""}`}
    >
      {label && <legend className="fieldset-legend">{label}</legend>}
      <div className="react-aria-control react-aria-Group">
        {Icon && (
          <label className="control-label">
            <Icon
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
          </label>
        )}
        <AriaComboBox
          className="react-aria-ComboBox react-aria-UnitComboBox"
          inputValue={unit === "" ? "—" : unit}
          onSelectionChange={(key) => {
            if (key !== null) {
              const selectedUnit = key === "—" ? "" : (key as string);
              handleUnitChange(selectedUnit);
            }
          }}
          selectedKey={unit === "" ? "—" : unit}
          aria-label="Unit"
        >
          <div className="combobox-container">
            <Input
              className="react-aria-Input"
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              aria-label={label || "Value"}
              placeholder="auto"
            />
            <Button className="react-aria-Button">
              <ChevronDown size={16} />
            </Button>
          </div>
          <Popover className="react-aria-Popover">
            <ListBox className="react-aria-ListBox">
              {units.map((u) => (
                <ListBoxItem key={u === "" ? "—" : u} id={u === "" ? "—" : u} className="react-aria-ListBoxItem">
                  {u === "" ? "—" : u}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </AriaComboBox>
      </div>
    </fieldset>
  );
}
