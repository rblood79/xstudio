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

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Play,
  Wand2,
} from "lucide-react";
import type { ApiEditorTab } from "../types/editorTypes";
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
  activeTab: ApiEditorTab;
}

const HTTP_METHODS: { value: HttpMethod; label: string }[] = [
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "PATCH", label: "PATCH" },
  { value: "DELETE", label: "DELETE" },
];

export function ApiEndpointEditor({ endpoint, onClose, activeTab }: ApiEndpointEditorProps) {
  const updateApiEndpoint = useDataStore((state) => state.updateApiEndpoint);
  const executeApiEndpoint = useDataStore((state) => state.executeApiEndpoint);
  const createDataTable = useDataStore((state) => state.createDataTable);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["headers", "queryParams"])
  );
  const [testResult, setTestResult] = useState<{ success: boolean; data: unknown } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [detectedColumns, setDetectedColumns] = useState<DetectedColumn[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const hasAutoTriggeredTest = useRef(false);

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

      console.log("🔍 API result:", {
        result,
        resultType: typeof result,
        dataPath: endpoint.responseMapping?.dataPath,
      });

      setTestResult({ success: true, data: result });

      // 성공 시 컬럼 자동 감지
      // executeApiEndpoint이 이미 dataPath를 적용한 결과를 반환하므로
      // 여기서는 다시 적용하지 않음
      let dataToAnalyze = result;

      // 응답이 객체인 경우 배열 필드 자동 탐색
      if (!Array.isArray(dataToAnalyze) && typeof dataToAnalyze === "object" && dataToAnalyze !== null) {
        // 응답 객체에서 배열 필드 찾기 (예: results, data, items, records 등)
        const commonArrayFields = ["results", "data", "items", "records", "list", "rows", "entries"];
        for (const field of commonArrayFields) {
          const fieldValue = (dataToAnalyze as Record<string, unknown>)[field];
          if (Array.isArray(fieldValue) && fieldValue.length > 0) {
            console.log(`🔍 Auto-detected array field: "${field}" with ${fieldValue.length} items`);
            dataToAnalyze = fieldValue;

            // 🆕 dataPath가 비어있으면 자동 설정
            if (!endpoint.responseMapping?.dataPath) {
              console.log(`📝 Auto-setting dataPath to "${field}"`);
              onUpdate({
                responseMapping: { ...endpoint.responseMapping, dataPath: field },
              });
            }
            break;
          }
        }
      }

      console.log("🔍 Column detection - dataToAnalyze:", {
        isArray: Array.isArray(dataToAnalyze),
        type: typeof dataToAnalyze,
        length: Array.isArray(dataToAnalyze) ? dataToAnalyze.length : "N/A",
      });

      const columns = detectColumns(dataToAnalyze);
      console.log("🔍 Detected columns:", columns);
      setDetectedColumns(columns);
    } catch (error) {
      setTestResult({ success: false, data: (error as Error).message });
    } finally {
      setIsExecuting(false);
    }
  }, [endpoint.id, endpoint.responseMapping?.dataPath, executeApiEndpoint]);

  // activeTab="run"으로 열렸을 때 자동으로 API 실행 (초기 1회만)
  useEffect(() => {
    if (activeTab === "run" && !hasAutoTriggeredTest.current && !isExecuting) {
      hasAutoTriggeredTest.current = true;
      handleTest();
    }
  }, [activeTab, handleTest, isExecuting]);

  // DataTable Import 핸들러
  const handleImport = useCallback(
    async (columns: DetectedColumn[], tableName: string) => {
      setIsImporting(true);
      try {
        // 스키마 생성
        const schema = columnsToSchema(columns);
        const selectedKeys = columns.filter((c) => c.selected).map((c) => c.key);

        // 데이터 추출
        // ⚠️ 주의: executeApiEndpoint이 이미 dataPath를 적용하여 반환하므로
        // testResult.data는 이미 추출된 배열입니다.
        // 따라서 dataPath를 다시 적용하지 않습니다.
        let dataToImport = testResult?.data;

        // 만약 데이터가 아직 배열이 아니고 객체인 경우에만 배열 필드 찾기
        // (handleTest에서 자동 감지했지만, 여기서 한번 더 확인)
        if (!Array.isArray(dataToImport) && typeof dataToImport === "object" && dataToImport !== null) {
          const commonArrayFields = ["results", "data", "items", "records", "list", "rows", "entries"];
          for (const field of commonArrayFields) {
            const fieldValue = (dataToImport as Record<string, unknown>)[field];
            if (Array.isArray(fieldValue) && fieldValue.length > 0) {
              console.log(`🔍 handleImport: Auto-detected array field "${field}"`);
              dataToImport = fieldValue;
              break;
            }
          }
        }

        console.log(`🔍 handleImport: dataToImport`, {
          isArray: Array.isArray(dataToImport),
          length: Array.isArray(dataToImport) ? dataToImport.length : 0,
          selectedKeys,
        });

        // 선택된 컬럼만 추출
        const mockData = extractSelectedData(
          dataToImport as unknown[],
          selectedKeys
        );

        console.log(`🔍 handleImport: mockData extracted`, {
          mockDataLength: mockData.length,
          firstItem: mockData[0],
        });

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
    [testResult?.data, endpoint.project_id, createDataTable]
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

  // Note: onClose is handled by parent DataTableEditorPanel
  void onClose;

  return (
    <>
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

      {activeTab === "run" && (
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
    </>
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
  const executeApiEndpoint = useDataStore((state) => state.executeApiEndpoint);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectResult, setDetectResult] = useState<string | null>(null);

  // Data Path 자동 감지
  const handleAutoDetect = async () => {
    setIsDetecting(true);
    setDetectResult(null);

    try {
      // API 실행 (dataPath 없이)
      const result = await executeApiEndpoint(endpoint.id);

      // 응답에서 배열 필드 찾기
      if (result && typeof result === "object" && !Array.isArray(result)) {
        const commonArrayFields = ["results", "data", "items", "records", "list", "rows", "entries", "content", "hits"];
        for (const field of commonArrayFields) {
          const fieldValue = (result as Record<string, unknown>)[field];
          if (Array.isArray(fieldValue) && fieldValue.length > 0) {
            onUpdate({
              responseMapping: { ...endpoint.responseMapping, dataPath: field },
            });
            setDetectResult(`✓ "${field}" 감지됨 (${fieldValue.length}개 항목)`);
            return;
          }
        }
        setDetectResult("⚠ 배열 필드를 찾을 수 없습니다");
      } else if (Array.isArray(result)) {
        // 이미 배열인 경우 dataPath 불필요
        setDetectResult("✓ 응답이 이미 배열입니다 (dataPath 불필요)");
      } else {
        setDetectResult("⚠ 응답 형식을 인식할 수 없습니다");
      }
    } catch (error) {
      setDetectResult(`✗ API 호출 실패: ${(error as Error).message}`);
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className="response-editor">
      <div className="field-with-action">
        <PropertyInput
          label="Data Path"
          value={endpoint.responseMapping?.dataPath || ""}
          onChange={(value) =>
            onUpdate({
              responseMapping: { ...endpoint.responseMapping, dataPath: value },
            })
          }
          placeholder="results, data.items"
        />
        <button
          type="button"
          className="auto-detect-btn"
          onClick={handleAutoDetect}
          disabled={isDetecting}
          title="API를 호출하여 배열 필드를 자동 감지합니다"
        >
          <Wand2 size={14} />
          {isDetecting ? "감지 중..." : "자동 감지"}
        </button>
      </div>
      {detectResult && (
        <p className={`detect-result ${detectResult.startsWith("✓") ? "success" : detectResult.startsWith("⚠") ? "warning" : "error"}`}>
          {detectResult}
        </p>
      )}
      <p className="field-description">
        응답 JSON에서 데이터 배열을 추출할 경로입니다. (예: results, data.items)
      </p>

      <PropertyInput
        label="Target DataTable"
        value={endpoint.targetDataTable || ""}
        onChange={(value) => onUpdate({ targetDataTable: value })}
        placeholder="pokemon_list"
      />
      <p className="field-description">
        API 응답 데이터를 저장할 DataTable 이름입니다. Test 탭에서 Import 시 기본값으로 사용됩니다.
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
          defaultTableName={endpoint.targetDataTable || ""}
        />
      )}
    </div>
  );
}
