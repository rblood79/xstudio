import type { HideModalConfig } from "../types/eventTypes";
import { ElementPicker } from '../editors/ElementPicker';

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
      <ElementPicker
        label="Modal ID (empty = close all)"
        value={config.modalId || ""}
        onChange={updateModalId}
        placeholder="Select modal..."
        filter={(el) => el.tag === "Modal"}
      />

      <p className="field-hint">
        Leave empty to close all open modals
      </p>
    </div>
  );
}
