import { useState } from "react";
import {
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
    <div className="api-collection-editor component-props">
      {/* Base URL */}
      <fieldset className="properties-aria">
        <legend className="fieldset-legend">Base URL</legend>
        <div className="react-aria-control react-aria-Group">
          <label className="control-label">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-gray-400)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-globe"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
          </label>
          <Select
            selectedKey={config.baseUrl || "MOCK_DATA"}
            onSelectionChange={(key) => {
              console.log("🔄 Base URL 변경:", key);
              onChange({ ...config, baseUrl: key as string });
            }}
          >
            <Button>
              <SelectValue />
              <span aria-hidden="true" className="select-chevron">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-chevron-down"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </Button>
            <Popover>
              <ListBox>
                <ListBoxItem id="MOCK_DATA">MOCKUP DATA</ListBoxItem>
                <ListBoxItem id="JSONPLACEHOLDER">JSONPlaceholder</ListBoxItem>
                <ListBoxItem id="CUSTOM">Custom URL</ListBoxItem>
              </ListBox>
            </Popover>
          </Select>
        </div>
      </fieldset>

      {/* Custom URL */}
      {config.baseUrl === "CUSTOM" && (
        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Custom Base URL</legend>
          <div className="react-aria-control react-aria-Group">
            <label className="control-label">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-gray-400)"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-link"
                aria-hidden="true"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </label>
            <TextField>
              <Input
                className="control-input"
                placeholder="https://api.example.com"
                value={config.customUrl || ""}
                onChange={(e) =>
                  onChange({ ...config, customUrl: e.target.value })
                }
              />
            </TextField>
          </div>
        </fieldset>
      )}

      {/* Endpoint Path */}
      <fieldset className="properties-aria">
        <legend className="fieldset-legend">Endpoint Path</legend>
        <div className="react-aria-control react-aria-Group">
          <label className="control-label">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-gray-400)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-route"
              aria-hidden="true"
            >
              <circle cx="6" cy="19" r="3" />
              <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
              <circle cx="18" cy="5" r="3" />
            </svg>
          </label>
          <TextField>
            <Input
              className="control-input"
              placeholder="/api/v1/items"
              value={config.endpoint || ""}
              onChange={(e) => {
                console.log("🔄 Endpoint 변경:", e.target.value);
                onChange({ ...config, endpoint: e.target.value });
              }}
            />
          </TextField>
        </div>
      </fieldset>

      {/* HTTP Method */}
      <fieldset className="properties-aria">
        <legend className="fieldset-legend">HTTP Method</legend>
        <div className="react-aria-control react-aria-Group">
          <label className="control-label">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-gray-400)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-send"
              aria-hidden="true"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </label>
          <Select
            selectedKey={config.method || "GET"}
            onSelectionChange={(key) =>
              onChange({ ...config, method: key as "GET" | "POST" })
            }
          >
            <Button>
              <SelectValue />
              <span aria-hidden="true" className="select-chevron">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-chevron-down"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </Button>
            <Popover>
              <ListBox>
                <ListBoxItem id="GET">GET</ListBoxItem>
                <ListBoxItem id="POST">POST</ListBoxItem>
              </ListBox>
            </Popover>
          </Select>
        </div>
      </fieldset>

      {/* API Parameters */}
      <fieldset className="properties-aria">
        <legend className="fieldset-legend">API Parameters (JSON)</legend>
        <div className="react-aria-control react-aria-Group">
          <label className="control-label">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-gray-400)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-braces"
              aria-hidden="true"
            >
              <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" />
              <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
            </svg>
          </label>
          <div style={{ flex: 1 }}>
            <textarea
              className="control-input"
              style={{
                minHeight: "120px",
                fontFamily: "monospace",
                fontSize: "12px",
              }}
              value={localParams}
              onChange={(e) => setLocalParams(e.target.value)}
              placeholder={`{
  "page": 1,
  "limit": 10,
  "sort": "createdAt"
}`}
              rows={6}
            />
            <div className="editor-actions">
              <button
                type="button"
                className="confirm-button"
                onClick={handleParamsConfirm}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      </fieldset>

      {/* Headers */}
      <fieldset className="properties-aria">
        <legend className="fieldset-legend">Headers (JSON)</legend>
        <div className="react-aria-control react-aria-Group">
          <label className="control-label">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-gray-400)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-file-key"
              aria-hidden="true"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <circle cx="10" cy="16" r="2" />
              <path d="m16 10-4.5 4.5" />
              <path d="m15 11 1 1" />
            </svg>
          </label>
          <div style={{ flex: 1 }}>
            <textarea
              className="control-input"
              style={{
                minHeight: "80px",
                fontFamily: "monospace",
                fontSize: "12px",
              }}
              value={localHeaders}
              onChange={(e) => setLocalHeaders(e.target.value)}
              placeholder={`{
  "Authorization": "Bearer token",
  "Content-Type": "application/json"
}`}
              rows={4}
            />
            <div className="editor-actions">
              <button
                type="button"
                className="confirm-button"
                onClick={handleHeadersConfirm}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      </fieldset>

      {/* Data Mapping */}
      <fieldset className="properties-aria">
        <legend className="fieldset-legend">Data Mapping (JSON)</legend>
        <div className="react-aria-control react-aria-Group">
          <label className="control-label">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-gray-400)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-map"
              aria-hidden="true"
            >
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" x2="9" y1="3" y2="18" />
              <line x1="15" x2="15" y1="6" y2="21" />
            </svg>
          </label>
          <div style={{ flex: 1 }}>
            <textarea
              className="control-input"
              style={{
                minHeight: "120px",
                fontFamily: "monospace",
                fontSize: "12px",
              }}
              value={localDataMapping}
              onChange={(e) => setLocalDataMapping(e.target.value)}
              placeholder={`{
  "resultPath": "data.items",
  "idKey": "id",
  "totalKey": "data.total"
}`}
              rows={6}
            />
            <div className="editor-actions">
              <button
                type="button"
                className="confirm-button"
                onClick={handleDataMappingConfirm}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
