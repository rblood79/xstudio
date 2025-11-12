import { TextField, Input, Label } from "react-aria-components";
import type { HideModalConfig } from "../types/eventTypes";

export interface HideModalActionEditorProps {
  config: HideModalConfig;
  onChange: (config: HideModalConfig) => void;
}

export function HideModalActionEditor({
  config,
  onChange,
}: HideModalActionEditorProps) {
  const updateModalId = (modalId: string) => {
    onChange({ ...config, modalId: modalId || undefined });
  };

  return (
    <div className="hidemodal-action-editor">
      <TextField className="field">
        <Label className="field-label">Modal ID (empty = close all)</Label>
        <Input
          className="field-input"
          value={config.modalId || ""}
          onChange={(e) => updateModalId(e.target.value)}
          placeholder="confirmDialog"
        />
      </TextField>

      <p className="field-hint">
        Leave empty to close all open modals
      </p>
    </div>
  );
}
