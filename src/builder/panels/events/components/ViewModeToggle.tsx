import { ToggleButtonGroup, ToggleButton, Key } from "../../../shared/components/list";

export type ViewMode = "list" | "simple" | "reactflow";

export interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/**
 * ViewModeToggle - Toggle between List, Simple Flow and ReactFlow modes
 *
 * - list: 액션 목록 및 편집 모드
 * - simple: 간단한 플로우 다이어그램
 * - reactflow: ReactFlow 기반 고급 다이어그램
 */
export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  const handleSelectionChange = (keys: Set<Key>) => {
    const selectedKey = Array.from(keys)[0];
    if (selectedKey && typeof selectedKey === "string") {
      const selectedMode = selectedKey as ViewMode;
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
      <ToggleButton id="list" className="view-mode-button">
        <span className="mode-label">List</span>
      </ToggleButton>
      <ToggleButton id="simple" className="view-mode-button">
        <span className="mode-label">Simple</span>
      </ToggleButton>
      <ToggleButton id="reactflow" className="view-mode-button">
         <span className="mode-label">ReactFlow</span>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
