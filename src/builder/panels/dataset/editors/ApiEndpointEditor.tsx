/**
 * ApiEndpointEditor - API Endpoint 상세 편집 컴포넌트
 *
 * 기능:
 * - 기본 설정 (이름, 메서드, URL)
 * - Headers/Query Params 관리
 * - Request Body 설정
 * - Response Mapping 설정
 * - 테스트 실행
 * - Column Selection + Import to DataTable (Phase 4)
 */

import { useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Globe,
  Settings,
  Play,
  Code,
  FileJson,
} from "lucide-react";
import { useDataStore } from "../../../stores/data";
import type {
  ApiEndpoint,
  HttpMethod,
} from "../../../../types/builder/data.types";
import {
  PropertyInput,
  PropertySelect,
  PropertySwitch,
} from "../../common";
import { ColumnSelector } from "../components/ColumnSelector";
import {
  detectColumns,
  columnsToSchema,
  extractSelectedData,
  type DetectedColumn,
} from "../utils/columnDetector";
import "./ApiEndpointEditor.css";

interface ApiEndpointEditorProps {
  endpoint: ApiEndpoint;
  onClose: () => void;
}

const HTTP_METHODS: { value: HttpMethod; label: string }[] = [
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "PATCH", label: "PATCH" },
  { value: "DELETE", label: "DELETE" },
];

export function ApiEndpointEditor({ endpoint, onClose }: ApiEndpointEditorProps) {
  const updateApiEndpoint = useDataStore((state) => state.updateApiEndpoint);
  const executeApiEndpoint = useDataStore((state) => state.executeApiEndpoint);
  const createDataTable = useDataStore((state) => state.createDataTable);

  const [activeTab, setActiveTab] = useState<"basic" | "headers" | "body" | "response" | "test">(
    "basic"
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["headers", "queryParams"])
  );
  const [testResult, setTestResult] = useState<{ success: boolean; data: unknown } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [detectedColumns, setDetectedColumns] = useState<DetectedColumn[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // 기본 정보 업데이트
  const handleBasicUpdate = useCallback(
    async (updates: Partial<ApiEndpoint>) => {
      try {
        await updateApiEndpoint(endpoint.id, updates);
      } catch (error) {
        console.error("API Endpoint 업데이트 실패:", error);
      }
    },
    [endpoint.id, updateApiEndpoint]
  );

  // Headers 업데이트
  const handleAddHeader = useCallback(() => {
    const newHeaders = { ...endpoint.headers, "": "" };
    handleBasicUpdate({ headers: newHeaders });
  }, [endpoint.headers, handleBasicUpdate]);

  const handleUpdateHeader = useCallback(
    (oldKey: string, newKey: string, value: string) => {
      const newHeaders = { ...endpoint.headers };
      if (oldKey !== newKey) {
        delete newHeaders[oldKey];
      }
      newHeaders[newKey] = value;
      handleBasicUpdate({ headers: newHeaders });
    },
    [endpoint.headers, handleBasicUpdate]
  );

  const handleDeleteHeader = useCallback(
    (key: string) => {
      const newHeaders = { ...endpoint.headers };
      delete newHeaders[key];
      handleBasicUpdate({ headers: newHeaders });
    },
    [endpoint.headers, handleBasicUpdate]
  );

  // Query Params 업데이트 (future feature - Query Params tab)
  const _handleAddQueryParam = useCallback(() => {
    const newParams = { ...endpoint.queryParams, "": "" };
    handleBasicUpdate({ queryParams: newParams });
  }, [endpoint.queryParams, handleBasicUpdate]);

  const _handleUpdateQueryParam = useCallback(
    (oldKey: string, newKey: string, value: string) => {
      const newParams = { ...endpoint.queryParams };
      if (oldKey !== newKey) {
        delete newParams[oldKey];
      }
      newParams[newKey] = value;
      handleBasicUpdate({ queryParams: newParams });
    },
    [endpoint.queryParams, handleBasicUpdate]
  );

  const _handleDeleteQueryParam = useCallback(
    (key: string) => {
      const newParams = { ...endpoint.queryParams };
      delete newParams[key];
      handleBasicUpdate({ queryParams: newParams });
    },
    [endpoint.queryParams, handleBasicUpdate]
  );

  // Silence unused variable warnings for future feature handlers
  void _handleAddQueryParam;
  void _handleUpdateQueryParam;
  void _handleDeleteQueryParam;

  // 테스트 실행
  const handleTest = useCallback(async () => {
    setIsExecuting(true);
    setTestResult(null);
    setDetectedColumns([]);
    try {
      const result = await executeApiEndpoint(endpoint.id);
      setTestResult({ success: true, data: result });

      // 성공 시 컬럼 자동 감지
      // dataPath가 설정되어 있으면 해당 경로의 데이터 사용
      let dataToAnalyze = result;
      if (endpoint.responseMapping?.dataPath) {
        const paths = endpoint.responseMapping.dataPath.split(".");
        for (const path of paths) {
          if (dataToAnalyze && typeof dataToAnalyze === "object") {
            dataToAnalyze = (dataToAnalyze as Record<string, unknown>)[path];
          }
        }
      }

      const columns = detectColumns(dataToAnalyze);
      setDetectedColumns(columns);
    } catch (error) {
      setTestResult({ success: false, data: (error as Error).message });
    } finally {
      setIsExecuting(false);
    }
  }, [endpoint.id, endpoint.responseMapping?.dataPath, executeApiEndpoint]);

  // DataTable Import 핸들러
  const handleImport = useCallback(
    async (columns: DetectedColumn[], tableName: string) => {
      setIsImporting(true);
      try {
        // 스키마 생성
        const schema = columnsToSchema(columns);
        const selectedKeys = columns.filter((c) => c.selected).map((c) => c.key);

        // 데이터 추출 (dataPath 적용)
        let dataToImport = testResult?.data;
        if (endpoint.responseMapping?.dataPath) {
          const paths = endpoint.responseMapping.dataPath.split(".");
          for (const path of paths) {
            if (dataToImport && typeof dataToImport === "object") {
              dataToImport = (dataToImport as Record<string, unknown>)[path];
            }
          }
        }

        // 선택된 컬럼만 추출
        const mockData = extractSelectedData(
          dataToImport as unknown[],
          selectedKeys
        );

        // DataTable 생성
        await createDataTable({
          name: tableName,
          project_id: endpoint.project_id,
          schema,
          mockData,
          useMockData: false, // API 데이터이므로 mockData 사용 안함
        });

        console.log(`✅ DataTable "${tableName}" 생성 완료 (${schema.length} 컬럼, ${mockData.length} 행)`);

        // 성공 알림 (간단한 alert - 추후 Toast로 개선)
        alert(`DataTable "${tableName}"이(가) 생성되었습니다.\n${schema.length}개 컬럼, ${mockData.length}개 행`);

        // 컬럼 선택 초기화
        setDetectedColumns([]);
      } catch (error) {
        console.error("❌ DataTable Import 실패:", error);
        alert(`Import 실패: ${(error as Error).message}`);
      } finally {
        setIsImporting(false);
      }
    },
    [testResult?.data, endpoint.responseMapping?.dataPath, endpoint.project_id, createDataTable]
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <div className="api-editor">
      <div className="editor-header">
        <div className="editor-title">
          <Globe size={18} />
          <input
            type="text"
            className="editor-name-input"
            value={endpoint.name}
            onChange={(e) => handleBasicUpdate({ name: e.target.value })}
          />
        </div>
        <button type="button" className="editor-close" onClick={onClose}>
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="editor-tabs">
        <button
          type="button"
          className={`editor-tab ${activeTab === "basic" ? "active" : ""}`}
          onClick={() => setActiveTab("basic")}
        >
          <Settings size={14} />
          Basic
        </button>
        <button
          type="button"
          className={`editor-tab ${activeTab === "headers" ? "active" : ""}`}
          onClick={() => setActiveTab("headers")}
        >
          <Code size={14} />
          Headers
        </button>
        <button
          type="button"
          className={`editor-tab ${activeTab === "body" ? "active" : ""}`}
          onClick={() => setActiveTab("body")}
        >
          <FileJson size={14} />
          Body
        </button>
        <button
          type="button"
          className={`editor-tab ${activeTab === "response" ? "active" : ""}`}
          onClick={() => setActiveTab("response")}
        >
          <FileJson size={14} />
          Response
        </button>
        <button
          type="button"
          className={`editor-tab ${activeTab === "test" ? "active" : ""}`}
          onClick={() => setActiveTab("test")}
        >
          <Play size={14} />
          Test
        </button>
      </div>

      {/* Tab Content */}
      <div className="editor-content">
        {activeTab === "basic" && (
          <BasicEditor
            endpoint={endpoint}
            onUpdate={handleBasicUpdate}
          />
        )}

        {activeTab === "headers" && (
          <KeyValueEditor
            title="Headers"
            description="HTTP 헤더를 설정합니다. {{변수명}} 형식으로 변수를 참조할 수 있습니다."
            items={endpoint.headers || {}}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onAdd={handleAddHeader}
            onUpdate={handleUpdateHeader}
            onDelete={handleDeleteHeader}
            sectionKey="headers"
          />
        )}

        {activeTab === "body" && (
          <BodyEditor
            endpoint={endpoint}
            onUpdate={handleBasicUpdate}
          />
        )}

        {activeTab === "response" && (
          <ResponseEditor
            endpoint={endpoint}
            onUpdate={handleBasicUpdate}
          />
        )}

        {activeTab === "test" && (
          <TestEditor
            endpoint={endpoint}
            testResult={testResult}
            isExecuting={isExecuting}
            onTest={handleTest}
            detectedColumns={detectedColumns}
            onColumnsChange={setDetectedColumns}
            onImport={handleImport}
            isImporting={isImporting}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// Basic Editor
// ============================================

interface BasicEditorProps {
  endpoint: ApiEndpoint;
  onUpdate: (updates: Partial<ApiEndpoint>) => void;
}

function BasicEditor({ endpoint, onUpdate }: BasicEditorProps) {
  return (
    <div className="basic-editor">
      <PropertySelect
        label="Method"
        value={endpoint.method}
        onChange={(value) => onUpdate({ method: value as HttpMethod })}
        options={HTTP_METHODS}
      />

      <PropertyInput
        label="Base URL"
        value={endpoint.baseUrl || ""}
        onChange={(value) => onUpdate({ baseUrl: value })}
        placeholder="https://api.example.com"
      />

      <PropertyInput
        label="Endpoint"
        value={endpoint.endpoint}
        onChange={(value) => onUpdate({ endpoint: value })}
        placeholder="/users/{{userId}}"
      />

      <PropertySwitch
        label="Authentication Required"
        isSelected={endpoint.authRequired || false}
        onChange={(checked) => onUpdate({ authRequired: checked })}
      />

      {endpoint.authRequired && (
        <PropertyInput
          label="Auth Header"
          value={endpoint.authHeader || ""}
          onChange={(value) => onUpdate({ authHeader: value })}
          placeholder="Bearer {{accessToken}}"
        />
      )}

      <div className="section-divider" />

      <h4 className="section-title">Query Parameters</h4>
      <QueryParamsEditor endpoint={endpoint} onUpdate={onUpdate} />
    </div>
  );
}

// ============================================
// Query Params Editor (in Basic tab)
// ============================================

interface QueryParamsEditorProps {
  endpoint: ApiEndpoint;
  onUpdate: (updates: Partial<ApiEndpoint>) => void;
}

function QueryParamsEditor({ endpoint, onUpdate }: QueryParamsEditorProps) {
  const params = endpoint.queryParams || {};
  const entries = Object.entries(params);

  const handleAdd = () => {
    const newParams = { ...params, "": "" };
    onUpdate({ queryParams: newParams });
  };

  const handleUpdateKey = (oldKey: string, newKey: string) => {
    const newParams = { ...params };
    const value = newParams[oldKey];
    delete newParams[oldKey];
    newParams[newKey] = value;
    onUpdate({ queryParams: newParams });
  };

  const handleUpdateValue = (key: string, value: string) => {
    const newParams = { ...params, [key]: value };
    onUpdate({ queryParams: newParams });
  };

  const handleDelete = (key: string) => {
    const newParams = { ...params };
    delete newParams[key];
    onUpdate({ queryParams: newParams });
  };

  return (
    <div className="query-params-editor">
      {entries.map(([key, value], index) => (
        <div key={index} className="kv-row">
          <input
            type="text"
            className="kv-input key"
            value={key}
            onChange={(e) => handleUpdateKey(key, e.target.value)}
            placeholder="key"
          />
          <input
            type="text"
            className="kv-input value"
            value={value}
            onChange={(e) => handleUpdateValue(key, e.target.value)}
            placeholder="value or {{variable}}"
          />
          <button
            type="button"
            className="kv-delete"
            onClick={() => handleDelete(key)}
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      <button type="button" className="add-kv-btn" onClick={handleAdd}>
        <Plus size={14} />
        Add Parameter
      </button>
    </div>
  );
}

// ============================================
// Key-Value Editor (Headers)
// ============================================

interface KeyValueEditorProps {
  title: string;
  description: string;
  items: Record<string, string>;
  expandedSections: Set<string>;
  onToggleSection: (key: string) => void;
  onAdd: () => void;
  onUpdate: (oldKey: string, newKey: string, value: string) => void;
  onDelete: (key: string) => void;
  sectionKey: string;
}

function KeyValueEditor({
  title,
  description,
  items,
  expandedSections,
  onToggleSection,
  onAdd,
  onUpdate,
  onDelete,
  sectionKey,
}: KeyValueEditorProps) {
  const entries = Object.entries(items);
  const isExpanded = expandedSections.has(sectionKey);

  return (
    <div className="kv-editor">
      <div className="kv-section-header" onClick={() => onToggleSection(sectionKey)}>
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="kv-section-title">{title}</span>
        <span className="kv-section-count">{entries.length}</span>
      </div>

      {isExpanded && (
        <>
          <p className="kv-description">{description}</p>

          <div className="kv-list">
            {entries.map(([key, value], index) => (
              <div key={index} className="kv-row">
                <input
                  type="text"
                  className="kv-input key"
                  value={key}
                  onChange={(e) => onUpdate(key, e.target.value, value)}
                  placeholder="Header Name"
                />
                <input
                  type="text"
                  className="kv-input value"
                  value={value}
                  onChange={(e) => onUpdate(key, key, e.target.value)}
                  placeholder="Value or {{variable}}"
                />
                <button
                  type="button"
                  className="kv-delete"
                  onClick={() => onDelete(key)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="add-kv-btn" onClick={onAdd}>
            <Plus size={14} />
            Add {title.slice(0, -1)}
          </button>
        </>
      )}
    </div>
  );
}

// ============================================
// Body Editor
// ============================================

interface BodyEditorProps {
  endpoint: ApiEndpoint;
  onUpdate: (updates: Partial<ApiEndpoint>) => void;
}

function BodyEditor({ endpoint, onUpdate }: BodyEditorProps) {
  const bodyJson = endpoint.body ? JSON.stringify(endpoint.body, null, 2) : "";

  const handleBodyChange = (value: string) => {
    try {
      const parsed = value ? JSON.parse(value) : undefined;
      onUpdate({ body: parsed });
    } catch {
      // Invalid JSON - keep current value
    }
  };

  return (
    <div className="body-editor">
      <p className="editor-description">
        POST/PUT/PATCH 요청의 본문을 JSON 형식으로 입력합니다.
        <br />
        {"{{변수명}} 형식으로 변수를 참조할 수 있습니다."}
      </p>

      <textarea
        className="body-textarea"
        value={bodyJson}
        onChange={(e) => handleBodyChange(e.target.value)}
        placeholder='{"key": "value", "userId": "{{userId}}"}'
        rows={10}
      />
    </div>
  );
}

// ============================================
// Response Editor
// ============================================

interface ResponseEditorProps {
  endpoint: ApiEndpoint;
  onUpdate: (updates: Partial<ApiEndpoint>) => void;
}

function ResponseEditor({ endpoint, onUpdate }: ResponseEditorProps) {
  return (
    <div className="response-editor">
      <PropertyInput
        label="Data Path"
        value={endpoint.responseMapping?.dataPath || ""}
        onChange={(value) =>
          onUpdate({
            responseMapping: { ...endpoint.responseMapping, dataPath: value },
          })
        }
        placeholder="data.items"
      />
      <p className="field-description">
        응답 JSON에서 데이터를 추출할 경로입니다. (예: data.items, result.users)
      </p>

      <PropertyInput
        label="Target DataTable"
        value={endpoint.targetDataTable || ""}
        onChange={(value) => onUpdate({ targetDataTable: value })}
        placeholder="users"
      />
      <p className="field-description">
        API 응답을 저장할 DataTable 이름입니다.
      </p>

      <div className="section-divider" />

      <h4 className="section-title">Field Mapping</h4>
      <p className="field-description">
        API 응답 필드를 DataTable 필드에 매핑합니다.
      </p>

      <FieldMappingEditor endpoint={endpoint} onUpdate={onUpdate} />
    </div>
  );
}

// ============================================
// Field Mapping Editor
// ============================================

interface FieldMappingEditorProps {
  endpoint: ApiEndpoint;
  onUpdate: (updates: Partial<ApiEndpoint>) => void;
}

function FieldMappingEditor({ endpoint, onUpdate }: FieldMappingEditorProps) {
  const fieldMapping = endpoint.responseMapping?.fieldMapping || {};
  const entries = Object.entries(fieldMapping);

  const handleAdd = () => {
    const newMapping = { ...fieldMapping, "": "" };
    onUpdate({
      responseMapping: {
        ...endpoint.responseMapping,
        fieldMapping: newMapping,
      },
    });
  };

  const handleUpdate = (oldKey: string, newKey: string, value: string) => {
    const newMapping = { ...fieldMapping };
    if (oldKey !== newKey) {
      delete newMapping[oldKey];
    }
    newMapping[newKey] = value;
    onUpdate({
      responseMapping: {
        ...endpoint.responseMapping,
        fieldMapping: newMapping,
      },
    });
  };

  const handleDelete = (key: string) => {
    const newMapping = { ...fieldMapping };
    delete newMapping[key];
    onUpdate({
      responseMapping: {
        ...endpoint.responseMapping,
        fieldMapping: newMapping,
      },
    });
  };

  return (
    <div className="field-mapping-editor">
      <div className="kv-list">
        {entries.map(([key, value], index) => (
          <div key={index} className="kv-row">
            <input
              type="text"
              className="kv-input key"
              value={key}
              onChange={(e) => handleUpdate(key, e.target.value, value)}
              placeholder="API Field"
            />
            <span className="kv-arrow">→</span>
            <input
              type="text"
              className="kv-input value"
              value={value}
              onChange={(e) => handleUpdate(key, key, e.target.value)}
              placeholder="DataTable Field"
            />
            <button
              type="button"
              className="kv-delete"
              onClick={() => handleDelete(key)}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="add-kv-btn" onClick={handleAdd}>
        <Plus size={14} />
        Add Mapping
      </button>
    </div>
  );
}

// ============================================
// Test Editor
// ============================================

interface TestEditorProps {
  endpoint: ApiEndpoint;
  testResult: { success: boolean; data: unknown } | null;
  isExecuting: boolean;
  onTest: () => void;
  detectedColumns: DetectedColumn[];
  onColumnsChange: (columns: DetectedColumn[]) => void;
  onImport: (columns: DetectedColumn[], tableName: string) => void;
  isImporting: boolean;
}

function TestEditor({
  endpoint,
  testResult,
  isExecuting,
  onTest,
  detectedColumns,
  onColumnsChange,
  onImport,
  isImporting,
}: TestEditorProps) {
  return (
    <div className="test-editor">
      <div className="test-info">
        <span className={`method-badge ${endpoint.method.toLowerCase()}`}>
          {endpoint.method}
        </span>
        <span className="test-url">
          {endpoint.baseUrl}
          {endpoint.endpoint}
        </span>
      </div>

      <button
        type="button"
        className="test-btn"
        onClick={onTest}
        disabled={isExecuting}
      >
        <Play size={14} />
        {isExecuting ? "Executing..." : "Execute Request"}
      </button>

      {testResult && (
        <div className={`test-result ${testResult.success ? "success" : "error"}`}>
          <div className="result-header">
            {testResult.success ? "✓ Success" : "✗ Error"}
          </div>
          <pre className="result-data">
            {typeof testResult.data === "string"
              ? testResult.data
              : JSON.stringify(testResult.data, null, 2)}
          </pre>
        </div>
      )}

      {/* Column Selector - API 성공 시 표시 */}
      {testResult?.success && detectedColumns.length > 0 && (
        <ColumnSelector
          columns={detectedColumns}
          onColumnsChange={onColumnsChange}
          onImport={onImport}
          isImporting={isImporting}
        />
      )}
    </div>
  );
}
