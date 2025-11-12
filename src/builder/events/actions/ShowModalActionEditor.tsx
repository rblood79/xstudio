import { TextField, Input, Label, TextArea } from "react-aria-components";
import { useState } from "react";
import type { ShowModalConfig } from "../types/eventTypes";

export interface ShowModalActionEditorProps {
  config: ShowModalConfig;
  onChange: (config: ShowModalConfig) => void;
}

export function ShowModalActionEditor({
  config,
  onChange,
}: ShowModalActionEditorProps) {
  const [propsJson, setPropsJson] = useState(() =>
    JSON.stringify(config.props || {}, null, 2)
  );

  const updateModalId = (modalId: string) => {
    onChange({ ...config, modalId });
  };

  const updateProps = (value: string) => {
    setPropsJson(value);
    try {
      const parsed = JSON.parse(value);
      onChange({ ...config, props: parsed });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      // Ignore invalid JSON
    }
  };

  return (
    <div className="showmodal-action-editor">
      <TextField className="field">
        <Label className="field-label">Modal ID</Label>
        <Input
          className="field-input"
          value={config.modalId}
          onChange={(e) => updateModalId(e.target.value)}
          placeholder="confirmDialog"
        />
      </TextField>

      <TextField className="field">
        <Label className="field-label">Props (JSON)</Label>
        <TextArea
          className="field-textarea"
          value={propsJson}
          onChange={(e) => updateProps(e.target.value)}
          rows={4}
        />
      </TextField>
    </div>
  );
}
