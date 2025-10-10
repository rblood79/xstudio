import { useState } from "react";
import {
  TextField,
  Input,
  Select,
  SelectValue,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";

import { Button } from "../../components/list";
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

  // Local state로 모든 필드 관리 (즉각 적용 방지)
  const [localEndpoint, setLocalEndpoint] = useState(config.endpoint || "");
  const [localParams, setLocalParams] = useState(
    JSON.stringify(config.params || {}, null, 2)
  );
  const [localHeaders, setLocalHeaders] = useState(
    JSON.stringify(config.headers || {}, null, 2)
  );
  const [localDataMapping, setLocalDataMapping] = useState(
    JSON.stringify(config.dataMapping, null, 2)
  );

  // 모든 변경사항 한 번에 적용
  const handleApplyChanges = () => {
    try {
      const parsedParams = JSON.parse(localParams);
      const parsedHeaders = JSON.parse(localHeaders);
      const parsedDataMapping = JSON.parse(localDataMapping);

      console.log("✅ API 설정 일괄 적용:", {
        endpoint: localEndpoint,
        params: parsedParams,
        headers: parsedHeaders,
        dataMapping: parsedDataMapping,
      });

      onChange({
        ...config,
        endpoint: localEndpoint,
        params: parsedParams,
        headers: parsedHeaders,
        dataMapping: parsedDataMapping,
      });
    } catch (error) {
      alert("JSON 파싱 오류: " + (error as Error).message);
    }
  };

  return (
    <div className="component-props">
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
              value={localEndpoint}
              onChange={(e) => {
                console.log("🔄 Endpoint 입력 중:", e.target.value);
                setLocalEndpoint(e.target.value);
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
          <div style={{ flex: 1 }}>
            <textarea
              className="control-input"
              value={localParams}
              onChange={(e) => setLocalParams(e.target.value)}
              placeholder={`{
  "page": 1,
  "limit": 10,
  "sort": "createdAt"
}`}
              rows={6}
            />
          </div>
        </div>
      </fieldset>

      {/* Headers */}
      <fieldset className="properties-aria">
        <legend className="fieldset-legend">Headers (JSON)</legend>
        <div className="react-aria-control react-aria-Group">
          <div style={{ flex: 1 }}>
            <textarea
              className="control-input"
              value={localHeaders}
              onChange={(e) => setLocalHeaders(e.target.value)}
              placeholder={`{
  "Authorization": "Bearer token",
  "Content-Type": "application/json"
}`}
              rows={4}
            />
          </div>
        </div>
      </fieldset>

      {/* Data Mapping */}
      <fieldset className="properties-aria">
        <legend className="fieldset-legend">Data Mapping (JSON)</legend>
        <div className="react-aria-control react-aria-Group">
          <div style={{ flex: 1 }}>
            <textarea
              className="control-input"
              value={localDataMapping}
              onChange={(e) => setLocalDataMapping(e.target.value)}
              placeholder={`{
  "resultPath": "data.items",
  "idKey": "id",
  "totalKey": "data.total"
}`}
              rows={6}
            />
          </div>
        </div>
      </fieldset>

      {/* Apply Changes Button */}
      <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={handleApplyChanges} children="Apply Changes" />
      </div>
    </div>
  );
}
