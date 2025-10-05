import { useState } from "react";
import { TextField, Label, Input } from "react-aria-components";
import { APIValueConfig } from "../types";

interface APIValueEditorProps {
  config: APIValueConfig;
  onChange: (config: APIValueConfig) => void;
}

export function APIValueEditor({ config, onChange }: APIValueEditorProps) {
  const [paramsText, setParamsText] = useState(
    config.params ? JSON.stringify(config.params, null, 2) : ""
  );
  const [headersText, setHeadersText] = useState(
    config.headers ? JSON.stringify(config.headers, null, 2) : ""
  );
  const [resultPathText, setResultPathText] = useState(
    config.dataMapping?.resultPath || ""
  );

  const handleConfirmParams = () => {
    try {
      const parsed = paramsText.trim() ? JSON.parse(paramsText) : undefined;
      onChange({ ...config, params: parsed });
    } catch {
      alert("Invalid JSON for params");
    }
  };

  const handleConfirmHeaders = () => {
    try {
      const parsed = headersText.trim() ? JSON.parse(headersText) : undefined;
      onChange({ ...config, headers: parsed });
    } catch {
      alert("Invalid JSON for headers");
    }
  };

  return (
    <div className="api-value-editor component-props">
      <TextField className="field">
        <Label>Base URL</Label>
        <Input
          type="text"
          placeholder="https://api.example.com"
          value={config.baseUrl || ""}
          onChange={(e) => onChange({ ...config, baseUrl: e.target.value })}
        />
      </TextField>

      <TextField className="field">
        <Label>Endpoint</Label>
        <Input
          type="text"
          placeholder="/users/123"
          value={config.endpoint || ""}
          onChange={(e) => onChange({ ...config, endpoint: e.target.value })}
        />
      </TextField>

      <TextField className="field">
        <Label>Method</Label>
        <Input
          type="text"
          placeholder="GET"
          value={config.method || "GET"}
          onChange={(e) =>
            onChange({
              ...config,
              method: (e.target.value as "GET" | "POST") || "GET",
            })
          }
        />
      </TextField>

      <TextField className="field">
        <Label>Result Path</Label>
        <Input
          type="text"
          placeholder="data.user"
          value={resultPathText}
          onChange={(e) => setResultPathText(e.target.value)}
          onBlur={() =>
            onChange({
              ...config,
              dataMapping: { resultPath: resultPathText },
            })
          }
        />
      </TextField>

      <div className="json-field">
        <Label>Request Parameters (JSON)</Label>
        <textarea
          className="json-textarea"
          placeholder='{"page": 1, "limit": 10}'
          value={paramsText}
          onChange={(e) => setParamsText(e.target.value)}
          rows={4}
        />
        <button onClick={handleConfirmParams} className="confirm-button">
          ✓ Confirm Params
        </button>
      </div>

      <div className="json-field">
        <Label>Request Headers (JSON)</Label>
        <textarea
          className="json-textarea"
          placeholder='{"Authorization": "Bearer token"}'
          value={headersText}
          onChange={(e) => setHeadersText(e.target.value)}
          rows={4}
        />
        <button onClick={handleConfirmHeaders} className="confirm-button">
          ✓ Confirm Headers
        </button>
      </div>
    </div>
  );
}
