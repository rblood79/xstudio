import { Label, TextArea } from "react-aria-components";
import { useState } from "react";
import type { CustomConfig } from "../../types";

export interface CustomFunctionActionEditorProps {
  config: CustomConfig;
  onChange: (config: CustomConfig) => void;
}

export function CustomFunctionActionEditor({
  config,
  onChange,
}: CustomFunctionActionEditorProps) {
  const [paramsJson, setParamsJson] = useState(() =>
    JSON.stringify(config.params || {}, null, 2)
  );
  const [paramsError, setParamsError] = useState("");

  const updateCode = (code: string) => {
    onChange({ ...config, code });
  };

  const updateParams = (value: string) => {
    setParamsJson(value);
    try {
      const parsed = JSON.parse(value);
      onChange({ ...config, params: parsed });
      setParamsError("");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      setParamsError("유효한 JSON이 아닙니다");
    }
  };

  return (
    <div className="customfunction-action-editor">
      <div className="field">
        <Label className="field-label">JavaScript Code</Label>
        <TextArea
          className="field-textarea code-editor"
          value={config.code}
          onChange={(e) => updateCode(e.target.value)}
          rows={10}
          placeholder={`// Available context:
// - event: Event object
// - element: DOM element
// - state: App state
// - console: Console methods

console.log('Hello from custom function!');
return { success: true };`}
        />
      </div>

      <div className="field">
        <Label className="field-label">Parameters (JSON)</Label>
        <TextArea
          className="field-textarea"
          value={paramsJson}
          onChange={(e) => updateParams(e.target.value)}
          rows={4}
          placeholder='{"key": "value"}'
        />
        {paramsError && <div className="error-message">⚠️ {paramsError}</div>}
      </div>

      <div className="field-hint">
        <p><strong>⚠️ Security Note:</strong></p>
        <ul>
          <li>Dangerous operations (eval, fetch, DOM manipulation) are restricted</li>
          <li>Only safe console methods and limited DOM access allowed</li>
          <li>Code execution is sandboxed for security</li>
        </ul>
      </div>
    </div>
  );
}
