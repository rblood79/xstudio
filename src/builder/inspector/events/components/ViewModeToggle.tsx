import { ToggleButton, ToggleButtonGroup } from "react-aria-components";

export type ViewMode = "list" | "visual";

export interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/**
 * ViewModeToggle - Toggle between List and Visual modes
 */
export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <ToggleButtonGroup
      className="react-aria-ToggleButtonGroup view-mode-toggle"
      value={value}
      onChange={(newValue) => onChange(newValue as ViewMode)}
      selectionMode="single"
    >
      <ToggleButton
        id="list"
        className="react-aria-ToggleButton view-mode-button"
      >
        <span className="mode-icon">📋</span>
        <span className="mode-label">List</span>
      </ToggleButton>
      <ToggleButton
        id="visual"
        className="react-aria-ToggleButton view-mode-button"
      >
        <span className="mode-icon">🔀</span>
        <span className="mode-label">Visual</span>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
