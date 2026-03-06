import { memo, useCallback } from "react";
import { ToggleButton, ToggleButtonGroup } from "@xstudio/shared/components";

interface PropertySizeToggleProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Size options: "3" = S/M/L, "5" = XS/S/M/L/XL */
  scale?: "3" | "5";
}

const SIZE_3 = [
  { id: "sm", label: "S" },
  { id: "md", label: "M" },
  { id: "lg", label: "L" },
];

const SIZE_5 = [
  { id: "xs", label: "XS" },
  { id: "sm", label: "S" },
  { id: "md", label: "M" },
  { id: "lg", label: "L" },
  { id: "xl", label: "XL" },
];

export const PropertySizeToggle = memo(function PropertySizeToggle({
  label,
  value,
  onChange,
  scale = "3",
}: PropertySizeToggleProps) {
  const items = scale === "5" ? SIZE_5 : SIZE_3;

  const handleChange = useCallback(
    (keys: Set<string>) => {
      const selected = Array.from(keys)[0] as string;
      if (selected) onChange(selected);
    },
    [onChange],
  );

  return (
    <fieldset className="properties-aria">
      <legend className="fieldset-legend">{label}</legend>
      <ToggleButtonGroup
        aria-label={label}
        selectionMode="single"
        indicator
        selectedKeys={[value]}
        onSelectionChange={handleChange}
      >
        {items.map((item) => (
          <ToggleButton key={item.id} id={item.id}>
            {item.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </fieldset>
  );
});
