import { useState, useMemo, useEffect } from "react";
import { TextField, Input } from "react-aria-components";
import { Database, Send, Link, Settings, Lock, Map, Route, Download } from "lucide-react";
import { iconProps } from '../../../utils/uiConstants';
import { PropertySelect, PropertyInput, PropertyFieldset } from "../components";

import { Button, Checkbox, CheckboxGroup } from "../../components/list";
import type { APICollectionConfig } from "../types";
import "./data.css";

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

  // 컬럼 관련 state 추가
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [localColumns, setLocalColumns] = useState<string[]>(config.columns || []);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // config가 변경되면 local state 업데이트 (Supabase와 동일한 패턴)
  useEffect(() => {
    setLocalEndpoint(config.endpoint || "");
    setLocalParams(JSON.stringify(config.params || {}, null, 2));
    setLocalHeaders(JSON.stringify(config.headers || {}, null, 2));
    setLocalDataMapping(JSON.stringify(config.dataMapping, null, 2));
    setLocalColumns(config.columns || []);

    // availableColumns 복원 (Load로 가져온 전체 컬럼 목록)
    setAvailableColumns(config.availableColumns || []);
  }, [config.endpoint, config.params, config.headers, config.dataMapping, config.columns, config.availableColumns]);

  // 변경 감지: 각 필드별로 변경 여부 확인
  const endpointChanged = localEndpoint !== (config.endpoint || "");
  const paramsChanged = localParams !== JSON.stringify(config.params || {}, null, 2);
  const headersChanged = localHeaders !== JSON.stringify(config.headers || {}, null, 2);
  const dataMappingChanged = localDataMapping !== JSON.stringify(config.dataMapping, null, 2);
  const columnsChanged = useMemo(() => {
    return JSON.stringify(localColumns) !== JSON.stringify(config.columns || []);
  }, [localColumns, config.columns]);

  // 전체 변경사항 여부
  const hasChanges = useMemo(() => {
    return endpointChanged || paramsChanged || headersChanged || dataMappingChanged || columnsChanged;
  }, [endpointChanged, paramsChanged, headersChanged, dataMappingChanged, columnsChanged]);

  // Endpoint Path의 Load 버튼으로 데이터 로드 및 컬럼 추출
  const handleLoadData = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const parsedParams = JSON.parse(localParams);
      const parsedHeaders = JSON.parse(localHeaders);
      const parsedDataMapping = JSON.parse(localDataMapping);

      // Base URL 구성
      let baseUrl = "";
      switch (config.baseUrl) {
        case "MOCK_DATA":
        case "JSONPLACEHOLDER":
          baseUrl = "https://jsonplaceholder.typicode.com";
          break;
        case "CUSTOM":
          baseUrl = config.customUrl || "";
          break;
      }

      const fullUrl = `${baseUrl}${localEndpoint}`;
      console.log("🌐 API 호출:", fullUrl);

      // API 호출
      const response = await fetch(fullUrl, {
        method: config.method || "GET",
        headers: parsedHeaders,
        ...(config.method === "POST" && { body: JSON.stringify(parsedParams) }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📦 API 응답 데이터:", data);

      // resultPath로 데이터 추출
      const resultPath = parsedDataMapping.resultPath || "";
      let items = data;

      if (resultPath) {
        const paths = resultPath.split(".");
        for (const path of paths) {
          items = items?.[path];
        }
      }

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("응답 데이터가 배열이 아니거나 비어있습니다.");
      }

      // 첫 번째 항목에서 컬럼 추출
      const firstItem = items[0];
      const cols = Object.keys(firstItem);

      console.log("📋 추출된 컬럼:", cols);
      setAvailableColumns(cols);
      setLocalColumns(cols); // 기본적으로 모든 컬럼 선택

    } catch (error) {
      console.error("❌ API 호출 오류:", error);
      setLoadError((error as Error).message);
      setAvailableColumns([]);
      setLocalColumns([]);
    } finally {
      setLoading(false);
    }
  };

  // 모든 변경사항 적용 (컬럼 포함)
  const handleApplyChanges = () => {
    try {
      const parsedParams = JSON.parse(localParams);
      const parsedHeaders = JSON.parse(localHeaders);
      const parsedDataMapping = JSON.parse(localDataMapping);

      console.log("✅ API 설정 최종 적용:", {
        endpoint: localEndpoint,
        params: parsedParams,
        headers: parsedHeaders,
        dataMapping: parsedDataMapping,
        columns: localColumns,
        availableColumns: availableColumns,
      });

      onChange({
        ...config,
        endpoint: localEndpoint,
        params: parsedParams,
        headers: parsedHeaders,
        dataMapping: parsedDataMapping,
        columns: localColumns,
        availableColumns: availableColumns, // 전체 컬럼 목록도 저장
      });
    } catch (error) {
      alert("JSON 파싱 오류: " + (error as Error).message);
    }
  };

  // 변경사항 취소 (원래 값으로 되돌리기)
  const handleDiscardChanges = () => {
    setLocalEndpoint(config.endpoint || "");
    setLocalParams(JSON.stringify(config.params || {}, null, 2));
    setLocalHeaders(JSON.stringify(config.headers || {}, null, 2));
    setLocalDataMapping(JSON.stringify(config.dataMapping, null, 2));
    setLocalColumns(config.columns || []);
    setAvailableColumns(config.availableColumns || []); // 전체 컬럼 목록도 복원
    setLoadError(null);
  };

  return (
    <div className="component-props api-collection-editor">
      {/* Base URL */}
      <PropertySelect
        icon={Database}
        label="Base URL"
        value={config.baseUrl || "MOCK_DATA"}
        options={[
          { value: "MOCK_DATA", label: "MOCKUP DATA" },
          { value: "JSONPLACEHOLDER", label: "JSONPlaceholder" },
          { value: "CUSTOM", label: "Custom URL" },
        ]}
        onChange={(key: string) => {
          console.log("🔄 Base URL 변경:", key);

          // Base URL이 실제로 변경되었는지 확인
          if (key !== config.baseUrl) {
            // Base URL이 변경되면 endpoint와 관련 데이터 초기화
            setLocalEndpoint("");
            setAvailableColumns([]);
            setLocalColumns([]);
            setLoadError(null);

            onChange({
              ...config,
              baseUrl: key as string,
              endpoint: "", // endpoint 초기화
              columns: [], // 컬럼 초기화
              availableColumns: [], // 전체 컬럼 목록 초기화
              customUrl: key === "CUSTOM" ? config.customUrl : undefined, // CUSTOM이 아니면 customUrl 제거
            });

            console.log("✅ Base URL 변경으로 Endpoint와 컬럼 초기화됨");
          }
        }}
      />

      {/* Custom URL */}
      {config.baseUrl === "CUSTOM" && (
        <PropertyInput
          label="Custom Base URL"
          icon={Link}
          value={config.customUrl || ""}
          placeholder="https://api.example.com"
          onChange={(value) => {
            // Custom URL이 실제로 변경되었는지 확인
            if (value !== config.customUrl) {
              // Custom URL이 변경되면 endpoint와 관련 데이터 초기화
              setLocalEndpoint("");
              setAvailableColumns([]);
              setLocalColumns([]);
              setLoadError(null);

              onChange({
                ...config,
                customUrl: value,
                endpoint: "", // endpoint 초기화
                columns: [], // 컬럼 초기화
                availableColumns: [], // 전체 컬럼 목록 초기화
              });

              console.log("✅ Custom URL 변경으로 Endpoint와 컬럼 초기화됨");
            }
          }}
        />
      )}

      {/* Endpoint Path */}
      <PropertyFieldset legend="Endpoint Path" icon={Route}>
        <TextField className="api-endpoint-path">
          <Input
            className={`react-aria-Input ${endpointChanged ? "field-modified" : ""}`}
            placeholder={
              config.baseUrl === "JSONPLACEHOLDER" || config.baseUrl === "MOCK_DATA"
                ? "/users, /posts, /comments, /albums, /photos, /todos"
                : "/api/v1/items"
            }
            value={localEndpoint}
            onChange={(e) => {
              console.log("🔄 Endpoint 입력 중:", e.target.value);
              setLocalEndpoint(e.target.value);
            }}
          />

          <Button
            size="xs"
            onClick={handleLoadData}
            isDisabled={!localEndpoint || loading}
            children={<Download size={iconProps.size} />}
          />
        </TextField>
      </PropertyFieldset>

      {/* 로드 에러 표시 */}
      {loadError && (
        <div className="error-message" style={{
          color: "var(--color-red-500)",
          padding: "8px",
          backgroundColor: "var(--color-red-50)",
          borderRadius: "4px",
          fontSize: "12px",
          marginTop: "8px"
        }}>
          ⚠️ {loadError}
          {(config.baseUrl === "JSONPLACEHOLDER" || config.baseUrl === "MOCK_DATA") && (
            <div style={{ marginTop: "4px", fontSize: "11px", opacity: 0.8 }}>
              💡 Mock 데이터 사용 가능한 엔드포인트:
              <br />
              • /users (100개) - JSONPlaceholder 스타일 사용자
              <br />
              &nbsp;&nbsp;컬럼: id, name, username, email, phone, website, address, company
              <br />
              • /posts (100개) - 게시글
              <br />
              • /comments (500개) - 댓글
              <br />
              • /albums (100개) - 앨범
              <br />
              • /photos (300개) - 사진
              <br />
              • /todos (200개) - 할일
            </div>
          )}
        </div>
      )}      {/* 컬럼 선택 UI - Load 성공 시에만 표시 */}
      {availableColumns.length > 0 && (
        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Columns to Display</legend>
          <div className="react-aria-control react-aria-Group">
            <CheckboxGroup
              value={localColumns}
              onChange={(value) => {
                console.log("🔄 컬럼 선택 변경:", value);
                setLocalColumns(value);
              }}
            >
              {availableColumns.map((column) => (
                <Checkbox key={column} value={column}>
                  {column}
                </Checkbox>
              ))}
            </CheckboxGroup>
          </div>
        </fieldset>
      )}

      {/* HTTP Method */}
      <PropertySelect
        icon={Send}
        label="HTTP Method"
        value={config.method || "GET"}
        options={[
          { value: "GET", label: "GET" },
          { value: "POST", label: "POST" },
        ]}
        onChange={(key: string) =>
          onChange({ ...config, method: key as "GET" | "POST" })
        }
      />

      {/* API Parameters */}
      <PropertyInput
        label="API Parameters (JSON)"
        icon={Settings}
        value={localParams}
        onChange={(value) => setLocalParams(value)}
        placeholder={`{
  "page": 1,
  "limit": 10,
  "sort": "createdAt"
}`}
        multiline
        className={paramsChanged ? "field-modified" : ""}
      />

      {/* Headers */}
      <PropertyInput
        label="Headers (JSON)"
        icon={Lock}
        value={localHeaders}
        onChange={(value) => setLocalHeaders(value)}
        placeholder={`{
  "Authorization": "Bearer token",
  "Content-Type": "application/json"
}`}
        multiline
        className={headersChanged ? "field-modified" : ""}
      />

      {/* Data Mapping */}
      <PropertyInput
        label="Data Mapping (JSON)"
        icon={Map}
        value={localDataMapping}
        onChange={(value) => setLocalDataMapping(value)}
        placeholder={`{
  "resultPath": "data.items",
  "idKey": "id",
  "totalKey": "data.total"
}`}
        multiline
        className={dataMappingChanged ? "field-modified" : ""}
      />

      {/* Action Buttons */}
      <div className="action-buttons">
        {/* Discard Changes 버튼 - 변경사항이 있을 때만 표시 */}
        {hasChanges && (
          <Button
            onClick={handleDiscardChanges}
            children="Discard"
          />
        )}

        {/* Apply 버튼 - 모든 설정 최종 적용 */}
        <Button
          onClick={handleApplyChanges}
          isDisabled={!hasChanges}
          children={hasChanges ? "Apply" : "No Changes"}
        />
      </div>
    </div>
  );
}
