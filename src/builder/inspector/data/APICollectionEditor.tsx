import { useState } from "react";
import {
  Label,
  TextField,
  Input,
  Select,
  SelectValue,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import type { APICollectionConfig } from "../types";

export interface APICollectionEditorProps {
  config: APICollectionConfig;
  onChange: (config: APICollectionConfig) => void;
}

export function APICollectionEditor({
  config,
  onChange,
}: APICollectionEditorProps) {
  console.log("🔍 APICollectionEditor 현재 config:", config);

  const [localParams, setLocalParams] = useState(
    JSON.stringify(config.params || {}, null, 2)
  );
  const [localHeaders, setLocalHeaders] = useState(
    JSON.stringify(config.headers || {}, null, 2)
  );
  const [localDataMapping, setLocalDataMapping] = useState(
    JSON.stringify(config.dataMapping, null, 2)
  );

  const handleParamsConfirm = () => {
    try {
      const parsed = JSON.parse(localParams);
      console.log("✅ API Params 확인:", parsed);
      onChange({ ...config, params: parsed });
    } catch (error) {
      alert("JSON 파싱 오류: " + (error as Error).message);
    }
  };

  const handleHeadersConfirm = () => {
    try {
      const parsed = JSON.parse(localHeaders);
      console.log("✅ API Headers 확인:", parsed);
      onChange({ ...config, headers: parsed });
    } catch (error) {
      alert("JSON 파싱 오류: " + (error as Error).message);
    }
  };

  const handleDataMappingConfirm = () => {
    try {
      const parsed = JSON.parse(localDataMapping);
      console.log("✅ API DataMapping 확인:", parsed);
      onChange({ ...config, dataMapping: parsed });
    } catch (error) {
      alert("JSON 파싱 오류: " + (error as Error).message);
    }
  };

  return (
    <div className="api-collection-editor">
      <h5 className="editor-subtitle">API Collection</h5>

      {/* Base URL - Select로 변경 */}
      <Select
        className="baseurl-select"
        selectedKey={config.baseUrl || "MOCK_DATA"}
        onSelectionChange={(key) => {
          console.log("🔄 Base URL 변경:", key);
          onChange({ ...config, baseUrl: key as string });
        }}
      >
        <Label className="field-label">Base URL</Label>
        <Button className="select-trigger">
          <SelectValue />
          <span className="select-arrow">▼</span>
        </Button>
        <Popover className="select-popover">
          <ListBox className="select-list">
            <ListBoxItem id="MOCK_DATA" className="select-item">
              MOCK_DATA (자체 Mock API)
            </ListBoxItem>
            <ListBoxItem id="JSONPLACEHOLDER" className="select-item">
              JSONPlaceholder
            </ListBoxItem>
            <ListBoxItem id="CUSTOM" className="select-item">
              Custom URL
            </ListBoxItem>
          </ListBox>
        </Popover>
      </Select>

      {/* Custom URL 입력 필드 (CUSTOM 선택 시에만 표시) */}
      {config.baseUrl === "CUSTOM" && (
        <TextField className="api-field">
          <Label className="field-label">Custom Base URL</Label>
          <Input
            className="field-input"
            placeholder="https://api.example.com"
            value={config.customUrl || ""}
            onChange={(e) => onChange({ ...config, customUrl: e.target.value })}
          />
        </TextField>
      )}

      {/* Endpoint */}
      <TextField className="api-field">
        <Label className="field-label">Endpoint Path</Label>
        <Input
          className="field-input"
          placeholder="/api/v1/items"
          value={config.endpoint || ""}
          onChange={(e) => {
            console.log("🔄 Endpoint 변경:", e.target.value);
            onChange({ ...config, endpoint: e.target.value });
          }}
        />
      </TextField>

      {/* HTTP Method */}
      <Select
        className="method-select"
        selectedKey={config.method || "GET"}
        onSelectionChange={(key) =>
          onChange({ ...config, method: key as "GET" | "POST" })
        }
      >
        <Label className="field-label">HTTP Method</Label>
        <Button className="select-trigger">
          <SelectValue />
          <span className="select-arrow">▼</span>
        </Button>
        <Popover className="select-popover">
          <ListBox className="select-list">
            <ListBoxItem id="GET" className="select-item">
              GET
            </ListBoxItem>
            <ListBoxItem id="POST" className="select-item">
              POST
            </ListBoxItem>
          </ListBox>
        </Popover>
      </Select>

      {/* API Parameters (JSON) */}
      <div className="json-field">
        <Label className="field-label">API Parameters (JSON)</Label>
        <textarea
          className="json-textarea"
          value={localParams}
          onChange={(e) => setLocalParams(e.target.value)}
          placeholder={`{
  "page": 1,
  "limit": 10,
  "sort": "createdAt"
}`}
          rows={6}
        />
        <button
          type="button"
          className="confirm-button"
          onClick={handleParamsConfirm}
        >
          확인
        </button>
      </div>

      {/* Headers (JSON) */}
      <div className="json-field">
        <Label className="field-label">Headers (JSON)</Label>
        <textarea
          className="json-textarea"
          value={localHeaders}
          onChange={(e) => setLocalHeaders(e.target.value)}
          placeholder={`{
  "Authorization": "Bearer token",
  "Content-Type": "application/json"
}`}
          rows={4}
        />
        <button
          type="button"
          className="confirm-button"
          onClick={handleHeadersConfirm}
        >
          확인
        </button>
      </div>

      {/* Data Mapping (JSON) */}
      <div className="json-field">
        <Label className="field-label">Data Mapping (JSON)</Label>
        <textarea
          className="json-textarea"
          value={localDataMapping}
          onChange={(e) => setLocalDataMapping(e.target.value)}
          placeholder={`{
  "resultPath": "data.items",
  "idKey": "id",
  "totalKey": "data.total"
}`}
          rows={6}
        />
        <button
          type="button"
          className="confirm-button"
          onClick={handleDataMappingConfirm}
        >
          확인
        </button>
      </div>
    </div>
  );
}
