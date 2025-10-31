import { Button } from "react-aria-components";

export type ViewMode = "list" | "simple" | "reactflow";

export interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/**
 * ViewModeToggle - Toggle between List, Simple Flow, and ReactFlow modes
 */
export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  console.log("🎚️ ViewModeToggle rendered with value:", value);

  const handleButtonClick = (mode: ViewMode) => {
    console.log("🎚️ Button clicked:", mode);
    onChange(mode);
  };

  return (
    <div className="view-mode-toggle">
      <Button
        className={`react-aria-Button view-mode-button ${value === "list" ? "selected" : ""}`}
        onPress={() => handleButtonClick("list")}
      >
        <span className="mode-icon">📋</span>
        <span className="mode-label">List</span>
      </Button>
      <Button
        className={`react-aria-Button view-mode-button ${value === "simple" ? "selected" : ""}`}
        onPress={() => handleButtonClick("simple")}
      >
        <span className="mode-icon">🔀</span>
        <span className="mode-label">Simple</span>
      </Button>
      <Button
        className={`react-aria-Button view-mode-button ${value === "reactflow" ? "selected" : ""}`}
        onPress={() => handleButtonClick("reactflow")}
      >
        <span className="mode-icon">🎯</span>
        <span className="mode-label">ReactFlow</span>
      </Button>
    </div>
  );
}
