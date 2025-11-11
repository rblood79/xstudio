import { TextField, Input, Label, TextArea, Checkbox } from "react-aria-components";
import { useState } from "react";
import type { SetStateConfig } from "../../types";

export interface UpdateStateActionEditorProps {
  config: SetStateConfig;
  onChange: (config: SetStateConfig) => void;
}

export function UpdateStateActionEditor({
  config,
  onChange,
}: UpdateStateActionEditorProps) {
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

  const updateMerge = (merge: boolean) => {
    onChange({ ...config, merge });
  };

  return (
    <div className="updatestate-action-editor">
      <TextField className="field">
        <Label className="field-label">Store Path</Label>
        <Input
          className="field-input"
          value={config.storePath}
          onChange={(e) => updateStorePath(e.target.value)}
          placeholder="cart.items"
        />
      </TextField>

      <TextField className="field">
        <Label className="field-label">Value (JSON or Template)</Label>
        <TextArea
          className="field-textarea"
          value={jsonValue}
          onChange={(e) => updateValue(e.target.value)}
          rows={4}
          placeholder='{"id": 123} or {{response.data}}'
        />
        {jsonError && <div className="error-message">⚠️ {jsonError}</div>}
      </TextField>

      <Checkbox
        className="checkbox-field"
        isSelected={config.merge || false}
        onChange={(checked) => updateMerge(checked)}
      >
        Merge with existing state
      </Checkbox>
    </div>
  );
}
