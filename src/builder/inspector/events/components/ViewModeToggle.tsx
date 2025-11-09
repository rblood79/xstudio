import { ToggleButtonGroup, ToggleButton, Key } from "../../../components/list";

export type ViewMode = "simple" | "reactflow";

export interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/**
 * ViewModeToggle - Toggle between Simple Flow and ReactFlow modes
 *
 * Phase 1: listMode removed, only visualMode (simple/reactflow) supported
 */
export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  console.log("🎚️ ViewModeToggle rendered with value:", value);

  const handleSelectionChange = (keys: Set<Key>) => {
    const selectedKey = Array.from(keys)[0];
    if (selectedKey && typeof selectedKey === "string") {
      const selectedMode = selectedKey as ViewMode;
      console.log("🎚️ Selection changed:", selectedMode);
      onChange(selectedMode);
    }
  };

  return (
    <ToggleButtonGroup
      className="view-mode-toggle"
      selectedKeys={new Set([value])}
      onSelectionChange={handleSelectionChange}
      selectionMode="single"
    >
      <ToggleButton id="simple" className="view-mode-button">
        <span className="mode-label">Simple</span>
      </ToggleButton>
      <ToggleButton id="reactflow" className="view-mode-button">
         <span className="mode-label">ReactFlow</span>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
