import { useState } from "react";
import { Link, Route, Send, Map, Settings, Lock } from "lucide-react";
import { PropertyInput, PropertySelect } from '../common';
import { APIValueConfig } from "../../inspector/types";

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
      {/* Base URL */}
      <PropertyInput
        label="Base URL"
        icon={Link}
        value={config.baseUrl || ""}
        placeholder="https://api.example.com"
        onChange={(value) => onChange({ ...config, baseUrl: value })}
      />

      {/* Endpoint */}
      <PropertyInput
        label="Endpoint"
        icon={Route}
        value={config.endpoint || ""}
        placeholder="/users/123"
        onChange={(value) => onChange({ ...config, endpoint: value })}
      />

      {/* HTTP Method */}
      <PropertySelect
        label="HTTP Method"
        icon={Send}
        value={config.method || "GET"}
        options={[
          { value: "GET", label: "GET" },
          { value: "POST", label: "POST" },
        ]}
        onChange={(key: string) =>
          onChange({ ...config, method: key as "GET" | "POST" })
        }
      />

      {/* Result Path */}
      <PropertyInput
        label="Result Path"
        icon={Map}
        value={resultPathText}
        placeholder="data.user"
        onChange={(value) => {
          setResultPathText(value);
          onChange({
            ...config,
            dataMapping: { resultPath: value },
          });
        }}
      />

      {/* Request Parameters (JSON) */}
      <PropertyInput
        label="Request Parameters (JSON)"
        icon={Settings}
        value={paramsText}
        placeholder='{"page": 1, "limit": 10}'
        multiline
        onChange={(value) => {
          setParamsText(value);
          handleConfirmParams();
        }}
      />

      {/* Request Headers (JSON) */}
      <PropertyInput
        label="Request Headers (JSON)"
        icon={Lock}
        value={headersText}
        placeholder='{"Authorization": "Bearer token"}'
        multiline
        onChange={(value) => {
          setHeadersText(value);
          handleConfirmHeaders();
        }}
      />
    </div>
  );
}
