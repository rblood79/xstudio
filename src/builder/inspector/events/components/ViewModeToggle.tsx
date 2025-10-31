import { ToggleButton, ToggleButtonGroup } from "react-aria-components";

export type ViewMode = "list" | "simple" | "reactflow";

export interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/**
 * ViewModeToggle - Toggle between List, Simple Flow, and ReactFlow modes
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
        id="simple"
        className="react-aria-ToggleButton view-mode-button"
      >
        <span className="mode-icon">🔀</span>
        <span className="mode-label">Simple</span>
      </ToggleButton>
      <ToggleButton
        id="reactflow"
        className="react-aria-ToggleButton view-mode-button"
      >
        <span className="mode-icon">🎯</span>
        <span className="mode-label">ReactFlow</span>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
