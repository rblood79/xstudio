import type { ClearSelectionConfig } from "../types/eventTypes";
import { ComponentSelector } from "../components/ComponentSelector";

export interface ClearSelectionActionEditorProps {
  config: ClearSelectionConfig;
  onChange: (config: ClearSelectionConfig) => void;
}

export function ClearSelectionActionEditor({
  config,
  onChange,
}: ClearSelectionActionEditorProps) {
  const updateTargetId = (targetId: string) => {
    onChange({ ...config, targetId });
  };

  const collectionTypes = ["ListBox", "GridList", "Select", "ComboBox", "RadioGroup", "CheckboxGroup", "TagGroup"];

  return (
    <div className="clearselection-action-editor">
      <ComponentSelector
        value={config.targetId}
        onChange={updateTargetId}
        filterByType={collectionTypes}
        label="Target Collection"
        placeholder="Select collection to clear"
      />

      <div className="field-hint">
        <p>
          This action will clear all selected items in the target collection
          component.
        </p>
        <p>
          <strong>Compatible with:</strong> ListBox, GridList, Select, ComboBox,
          RadioGroup, CheckboxGroup, TagGroup
        </p>
      </div>
    </div>
  );
}
