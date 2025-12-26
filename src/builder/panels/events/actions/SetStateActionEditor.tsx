import { TextField, Input, Label, TextArea } from "react-aria-components";
import { useState } from "react";
import type { SetStateConfig } from "../types/eventTypes";

export interface SetStateActionEditorProps {
  config: SetStateConfig;
  onChange: (config: SetStateConfig) => void;
}

export function SetStateActionEditor({
  config,
  onChange,
}: SetStateActionEditorProps) {
  const [jsonValue, setJsonValue] = useState(() =>
    JSON.stringify(config.value, null, 2)
  );
  const [jsonError, setJsonError] = useState("");

  const updateStorePath = (path: string) => {
    onChange({ ...config, storePath: path });
  };

  const updateValue = (value: string) => {
    setJsonValue(value);
    try {
      const parsed = JSON.parse(value);
      onChange({ ...config, value: parsed });
      setJsonError("");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      setJsonError("유효한 JSON이 아닙니다");
    }
  };

  return (
    <div className="setstate-action-editor">
      <TextField className="field">
        <Label className="field-label">Store Path</Label>
        <Input
          className="field-input"
          value={config.storePath}
          onChange={(e) => updateStorePath(e.target.value)}
          placeholder="app.user.name"
        />
      </TextField>

      <TextField className="field">
        <Label className="field-label">Value (JSON)</Label>
        <TextArea
          className="field-textarea"
          value={jsonValue}
          onChange={(e) => updateValue(e.target.value)}
          rows={4}
        />
        {jsonError && <div className="error-message">⚠️ {jsonError}</div>}
      </TextField>
    </div>
  );
}
