import { useState, useMemo, useEffect } from "react";
import { TextField, Input } from "react-aria-components";
import { Database, Send, Link, Settings, Lock, Map, Route, Download } from "lucide-react";
import { iconProps } from '../../../utils/uiConstants';
import { PropertySelect, PropertyInput, PropertyFieldset } from "../components";

import { Button, Checkbox, CheckboxGroup } from "../../components/list";
import type { APICollectionConfig } from "../types";
import { detectColumnsFromData } from "../../../utils/columnTypeInference";
import type { ColumnMapping } from "../../../types/unified";
import { apiConfig } from "../../../services/api";
import { ElementUtils } from "../../../utils/elementUtils";
import { Element } from "../../../types/store";
import { useStore } from "../../stores";
import "./data.css";

export interface APICollectionEditorProps {
  config: APICollectionConfig;
  onChange: (config: APICollectionConfig) => void;
  elementId?: string;
}

export function APICollectionEditor({
  config,
  onChange,
  elementId,
}: APICollectionEditorProps) {
  console.log("🔍 APICollectionEditor 현재 config:", config);

  // Zustand Store에서 elements와 필요한 함수들 가져오기
  const elements = useStore((state) => state.elements);
  const removeElement = useStore((state) => state.removeElement);

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
  const [localColumnMapping, setLocalColumnMapping] = useState<ColumnMapping | undefined>(config.columnMapping);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // config가 변경되면 local state 업데이트 (Supabase와 동일한 패턴)
  useEffect(() => {
    setLocalEndpoint(config.endpoint || "");
    setLocalParams(JSON.stringify(config.params || {}, null, 2));
    setLocalHeaders(JSON.stringify(config.headers || {}, null, 2));
    setLocalDataMapping(JSON.stringify(config.dataMapping, null, 2));
    setLocalColumns(config.columns || []);
    setLocalColumnMapping(config.columnMapping);

    // availableColumns 복원 (Load로 가져온 전체 컬럼 목록)
    setAvailableColumns(config.availableColumns || []);
  }, [config.endpoint, config.params, config.headers, config.dataMapping, config.columns, config.columnMapping, config.availableColumns]);

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

      let data: unknown;

      // MOCK_DATA 특별 처리
      if (config.baseUrl === "MOCK_DATA") {
        console.log("🎭 MOCK_DATA 모드 - Mock API 호출:", localEndpoint);

        const mockFetch = apiConfig.MOCK_DATA;
        data = await mockFetch(localEndpoint, parsedParams);

        console.log("📦 Mock API 응답 데이터:", data);
      } else {
        // 실제 API 호출
        let baseUrl = "";
        switch (config.baseUrl) {
          case "JSONPLACEHOLDER":
            baseUrl = "https://jsonplaceholder.typicode.com";
            break;
          case "DUMMYJSON":
            baseUrl = "https://dummyjson.com";
            break;
          case "CUSTOM":
            baseUrl = config.customUrl || "";
            break;
        }

        const fullUrl = `${baseUrl}${localEndpoint}`;
        console.log("🌐 API 호출:", fullUrl);

        const response = await fetch(fullUrl, {
          method: config.method || "GET",
          headers: parsedHeaders,
          ...(config.method === "POST" && { body: JSON.stringify(parsedParams) }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        data = await response.json();
        console.log("📦 API 응답 데이터:", data);
      }

      // resultPath로 데이터 추출
      const resultPath = parsedDataMapping.resultPath || "";
      let items: any = data;

      if (resultPath) {
        const paths = resultPath.split(".");
        for (const path of paths) {
          items = items?.[path];
        }
      }

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("응답 데이터가 배열이 아니거나 비어있습니다.");
      }

      // 컬럼 감지 (타입 자동 인식)
      const columnMapping = detectColumnsFromData(items);
      const cols = Object.keys(columnMapping);

      console.log("📋 추출된 컬럼 (타입 포함):", columnMapping);
      console.log("ℹ️ 컬럼이 추출되었습니다. 'Apply Changes' 버튼을 눌러 적용하세요.");

      // Local state 업데이트
      setAvailableColumns(cols);
      setLocalColumnMapping(columnMapping);

      // localColumns는 기존 선택을 유지하되, 새로운 컬럼이 있으면 추가
      // (첫 호출인 경우에만 모든 컬럼 선택)
      if (localColumns.length === 0) {
        console.log("ℹ️ 첫 호출: 모든 컬럼을 기본 선택합니다.");
        setLocalColumns(cols);
      } else {
        // 기존 선택 유지 + 새로운 컬럼 추가
        const newColumns = cols.filter(col => !availableColumns.includes(col));
        if (newColumns.length > 0) {
          console.log(`ℹ️ ${newColumns.length}개 새로운 컬럼 발견:`, newColumns);
          setLocalColumns([...localColumns, ...newColumns]);
        } else {
          console.log("ℹ️ 기존 컬럼 선택을 유지합니다.");
        }
      }

    } catch (error) {
      console.error("❌ API 호출 오류:", error);
      setLoadError((error as Error).message);
      setAvailableColumns([]);
      setLocalColumns([]);
    } finally {
      setLoading(false);
    }
  };

  // Field Elements 동기화 함수
  const syncFieldElements = async (selectedColumns: string[]) => {
    if (!elementId) {
      console.log("⚠️ elementId가 없어서 Field Elements 생성을 건너뜁니다");
      return;
    }

    // 1. ListBox Element 찾기
    const listBoxElement = elements.find(el => el.id === elementId);
    if (!listBoxElement) {
      console.warn("⚠️ ListBox Element를 찾을 수 없습니다:", elementId);
      return;
    }

    // 2. ListBoxItem 템플릿 찾기 (ListBox의 첫 번째 자식)
    const listBoxItemTemplate = elements.find(
      el => el.parent_id === listBoxElement.id && el.tag === 'ListBoxItem'
    );

    if (!listBoxItemTemplate) {
      console.warn("⚠️ ListBoxItem 템플릿이 없습니다. Layer Tree에서 ListBoxItem을 먼저 추가하세요.");
      return;
    }

    console.log("📋 ListBoxItem 템플릿 발견:", listBoxItemTemplate.id);

    // 3. 기존 Field Elements 찾기
    const existingFields = elements.filter(
      el => el.parent_id === listBoxItemTemplate.id && el.tag === 'Field'
    );

    console.log("📊 기존 Field Elements:", existingFields.length, "개");

    // 4. 추가할 Field 결정
    const fieldsToAdd = selectedColumns.filter(
      colKey => !existingFields.some(field => (field.props as { key?: string }).key === colKey)
    );

    // 5. 삭제할 Field 결정
    const fieldsToRemove = existingFields.filter(
      field => !selectedColumns.includes((field.props as { key?: string }).key as string)
    );

    console.log("➕ 추가할 Field:", fieldsToAdd);
    console.log("➖ 삭제할 Field:", fieldsToRemove.map(f => (f.props as { key?: string }).key));

    // 6. Field Elements 생성
    // localColumnMapping 사용 (config는 아직 업데이트되지 않음)
    if (!localColumnMapping) {
      console.warn("⚠️ localColumnMapping이 없습니다");
      return;
    }

    const newFieldElements: Element[] = fieldsToAdd.map((colKey, index) => {
      const columnDef = localColumnMapping[colKey];
      const existingCount = existingFields.length - fieldsToRemove.length;

      return {
        id: ElementUtils.generateId(),
        tag: 'Field',
        parent_id: listBoxItemTemplate.id,
        page_id: listBoxElement.page_id!,
        order_num: existingCount + index,
        props: {
          key: columnDef.key,
          label: columnDef.label || columnDef.key,
          type: columnDef.type || 'string',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    // 7. DB 저장 + 스토어 추가 (addElement 사용)
    const addElement = useStore.getState().addElement;

    if (newFieldElements.length > 0) {
      console.log(`💾 ${newFieldElements.length}개 Field Elements 생성 중...`);

      // addElement를 사용하여 각 Field Element 추가
      for (const field of newFieldElements) {
        try {
          await addElement(field);
        } catch (error) {
          console.error("❌ Field Element 생성 실패:", field.id, error);
        }
      }

      console.log(`✅ ${newFieldElements.length}개 Field Elements 생성 완료`);
    }

    // 8. Field 삭제
    for (const field of fieldsToRemove) {
      console.log(`🗑️ Field 삭제 중: ${(field.props as { key?: string }).key}`);
      await removeElement(field.id);
    }

    if (fieldsToRemove.length > 0) {
      console.log(`✅ ${fieldsToRemove.length}개 Field Elements 삭제 완료`);
    }
  };

  // 모든 변경사항 적용 (컬럼 포함)
  const handleApplyChanges = async () => {
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
        columnMapping: localColumnMapping,
        availableColumns: availableColumns,
      });

      // 1. Field Elements 먼저 생성 (onChange 전에)
      // 이유: onChange가 Preview를 re-render하기 전에 Field Elements가 존재해야 함
      console.log("📋 Field Elements 생성 중...");
      await syncFieldElements(localColumns);
      console.log("✅ Field Elements 생성 완료");

      // 2. 모든 설정 적용 (Field Elements 생성 완료 후)
      onChange({
        ...config,
        endpoint: localEndpoint,
        params: parsedParams,
        headers: parsedHeaders,
        dataMapping: parsedDataMapping,
        columns: localColumns,
        columnMapping: localColumnMapping, // columnMapping 포함
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
    setLocalColumnMapping(config.columnMapping); // columnMapping도 복원
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
          { value: "DUMMYJSON", label: "DummyJSON (Products, Users, Carts)" },
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

            // DummyJSON 선택 시 기본 dataMapping 설정
            const defaultDataMapping = key === "DUMMYJSON"
              ? { resultPath: "products", idKey: "id", totalKey: "total" }
              : { resultPath: "", idKey: "id", totalKey: "" };

            onChange({
              ...config,
              baseUrl: key as string,
              endpoint: "", // endpoint 초기화
              columns: [], // 컬럼 초기화
              availableColumns: [], // 전체 컬럼 목록 초기화
              dataMapping: defaultDataMapping, // 서비스별 기본 dataMapping
              customUrl: key === "CUSTOM" ? config.customUrl : undefined, // CUSTOM이 아니면 customUrl 제거
            });

            // localDataMapping도 업데이트
            setLocalDataMapping(JSON.stringify(defaultDataMapping, null, 2));

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
                : config.baseUrl === "DUMMYJSON"
                ? "/products, /users, /carts, /posts, /comments"
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
            <div style={{ marginTop: "4px", fontSize: "11px", opacity: 0.8, lineHeight: "1.4" }}>
              💡 Mock 데이터 사용 가능한 엔드포인트:
              <br />
              <strong>📍 지리/위치:</strong> /countries (10), /cities (10), /timezones (8)
              <br />
              <strong>🛍️ 상품:</strong> /categories (8), /products (8)
              <br />
              <strong>📊 상태:</strong> /status (5), /priorities (4), /tags (8)
              <br />
              <strong>🌐 국제화:</strong> /languages (8), /currencies (8)
              <br />
              <strong>🌳 트리 구조:</strong> /component-tree (엔진 DOM 트리), /engine-summary (엔진 요약)
              <br />
              <strong>👥 조직:</strong> /users (10K), /departments (40+), /projects (60), /roles, /permissions
              <br />
              <strong>📝 콘텐츠:</strong> /posts (100), /comments (500), /albums (100), /photos (300), /todos (200)
            </div>
          )}
        </div>
      )}      {/* 컬럼 선택 UI - Load 성공 시에만 표시 */}
      {availableColumns.length > 0 && (
        <fieldset className="properties-aria">
          <legend className="fieldset-legend">
            Columns to Display ({availableColumns.length} detected)
          </legend>
          <div className="react-aria-control react-aria-Group">
            <CheckboxGroup
              value={localColumns}
              onChange={(value) => {
                console.log("🔄 컬럼 선택 변경:", value);
                setLocalColumns(value);
              }}
            >
              {availableColumns.map((column) => {
                const columnInfo = (config.columnMapping as ColumnMapping)?.[column];
                const typeLabel = columnInfo?.type || 'string';
                const typeEmoji = {
                  string: '📝',
                  number: '🔢',
                  boolean: '✓',
                  date: '📅',
                  email: '📧',
                  url: '🔗',
                  image: '🖼️',
                }[typeLabel] || '📝';

                return (
                  <Checkbox key={column} value={column}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{typeEmoji}</span>
                      <span style={{ fontWeight: 500 }}>{columnInfo?.label || column}</span>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--color-gray-500)',
                        fontFamily: 'monospace'
                      }}>
                        ({typeLabel})
                      </span>
                    </span>
                  </Checkbox>
                );
              })}
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
