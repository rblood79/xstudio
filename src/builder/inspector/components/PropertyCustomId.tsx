import React, { useState, useEffect } from "react";
import { Hash } from "lucide-react";
import { PropertyFieldset } from "./PropertyFieldset";
import { useStore } from "../../stores";
import { useInspectorState } from "../hooks/useInspectorState";
import { validateCustomId } from "../../utils/idValidation";

interface PropertyCustomIdProps {
  label?: string;
  value: string;
  elementId: string; // Current element ID (to exclude from uniqueness check)
  placeholder?: string;
  className?: string;
}

export function PropertyCustomId({
  label = "ID",
  value,
  elementId,
  placeholder = "button_1",
  className,
}: PropertyCustomIdProps) {
  // Local state for input value (debounced save)
  const [inputValue, setInputValue] = useState<string>(value || "");
  const [error, setError] = useState<string | undefined>(undefined);

  // Get all elements from store for validation
  const elements = useStore((state) => state.elements);

  // Use Inspector state to update customId (triggers useSyncWithBuilder)
  const updateCustomIdInInspector = useInspectorState((state) => state.updateCustomId);

  // Sync local state with prop value when it changes externally
  useEffect(() => {
    setInputValue(value || "");
    setError(undefined);
  }, [value]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all text on focus for easier editing
    e.target.select();
  };

  const handleChange = (newValue: string) => {
    // Update local state immediately for responsive UI
    setInputValue(newValue);
    // Clear error on change
    setError(undefined);
  };

  const handleBlur = () => {
    // Validate before saving
    const validation = validateCustomId(inputValue, elementId, elements);

    if (!validation.isValid) {
      setError(validation.error);
      // Revert to original value if invalid
      setInputValue(value || "");
      return;
    }

    // Save to Inspector state (triggers useSyncWithBuilder) if valid and changed
    if (inputValue !== (value || "")) {
      // IMPORTANT: Only update Inspector state, NOT calling onChange
      // onChange would bypass Inspector state and directly update Builder store
      // which prevents useSyncWithBuilder from detecting changes
      updateCustomIdInInspector(inputValue);
      setError(undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Save on Enter
      e.preventDefault();

      // Validate before saving
      const validation = validateCustomId(inputValue, elementId, elements);

      if (!validation.isValid) {
        setError(validation.error);
        // Revert to original value if invalid
        setInputValue(value || "");
        return;
      }

      if (inputValue !== (value || "")) {
        // IMPORTANT: Only update Inspector state, NOT calling onChange
        // onChange would bypass Inspector state and directly update Builder store
        // which prevents useSyncWithBuilder from detecting changes
        updateCustomIdInInspector(inputValue);
        setError(undefined);
      }

      // Blur the input to confirm the change
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      // Revert on Escape
      e.preventDefault();
      setInputValue(value || "");
      setError(undefined);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <>
    <PropertyFieldset legend={label} icon={Hash} className={className}>
      <input
        className="react-aria-Input"
        type="text"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? "customid-error" : undefined}
      />
      
    </PropertyFieldset>
    {error && (
        <div
          id="customid-error"
          className="react-aria-FieldError"
          role="alert"
        >
          {error}
        </div>
      )}
    </>
  );
}
