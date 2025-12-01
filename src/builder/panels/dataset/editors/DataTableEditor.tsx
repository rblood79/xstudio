/**
 * DataTableEditor - DataTable 상세 편집 컴포넌트
 *
 * 기능:
 * - 스키마 정의 (필드 추가/삭제/수정)
 * - Mock 데이터 관리
 * - useMockData 토글
 */

import { useState, useCallback, useEffect } from "react";
import {
  Plus,
  Trash2,
  Table2,
  Database,
  Settings,
} from "lucide-react";
import { useDataStore } from "../../../stores/data";
import type {
  DataTable,
  DataField,
  DataFieldType,
} from "../../../../types/builder/data.types";
import { PropertySwitch } from "../../common";
import "./DataTableEditor.css";

interface DataTableEditorProps {
  dataTable: DataTable;
  onClose: () => void;
}

const FIELD_TYPES: { value: DataFieldType; label: string }[] = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "DateTime" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "image", label: "Image" },
  { value: "array", label: "Array" },
  { value: "object", label: "Object" },
];

export function DataTableEditor({ dataTable, onClose }: DataTableEditorProps) {
  const updateDataTable = useDataStore((state) => state.updateDataTable);

  const [activeTab, setActiveTab] = useState<"schema" | "data" | "settings">(
    "schema"
  );
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  // Schema 업데이트
  const handleSchemaUpdate = useCallback(
    async (newSchema: DataField[]) => {
      try {
        await updateDataTable(dataTable.id, { schema: newSchema });
      } catch (error) {
        console.error("스키마 업데이트 실패:", error);
      }
    },
    [dataTable.id, updateDataTable]
  );

  // 필드 추가
  const handleAddField = useCallback(() => {
    const newField: DataField = {
      key: `field_${Date.now()}`,
      type: "string",
      label: "New Field",
      required: false,
    };
    handleSchemaUpdate([...dataTable.schema, newField]);
  }, [dataTable.schema, handleSchemaUpdate]);

  // 필드 삭제
  const handleDeleteField = useCallback(
    (fieldKey: string) => {
      const newSchema = dataTable.schema.filter((f) => f.key !== fieldKey);
      handleSchemaUpdate(newSchema);
    },
    [dataTable.schema, handleSchemaUpdate]
  );

  // 필드 업데이트
  const handleUpdateField = useCallback(
    (fieldKey: string, updates: Partial<DataField>) => {
      const newSchema = dataTable.schema.map((f) =>
        f.key === fieldKey ? { ...f, ...updates } : f
      );
      handleSchemaUpdate(newSchema);
    },
    [dataTable.schema, handleSchemaUpdate]
  );

  // Mock 데이터 업데이트
  const handleMockDataUpdate = useCallback(
    async (newMockData: Record<string, unknown>[]) => {
      try {
        await updateDataTable(dataTable.id, { mockData: newMockData });
      } catch (error) {
        console.error("Mock 데이터 업데이트 실패:", error);
      }
    },
    [dataTable.id, updateDataTable]
  );

  // Mock 데이터 행 추가
  const handleAddMockRow = useCallback(() => {
    const newRow: Record<string, unknown> = {};
    const newRowIndex = dataTable.mockData.length + 1;

    dataTable.schema.forEach((field) => {
      // id 필드는 고유한 값을 자동 생성
      if (field.key === 'id') {
        if (field.type === 'number') {
          newRow[field.key] = newRowIndex;
        } else {
          newRow[field.key] = `row_${newRowIndex}`;
        }
      } else {
        newRow[field.key] = field.defaultValue ?? getDefaultValueForType(field.type);
      }
    });
    handleMockDataUpdate([...dataTable.mockData, newRow]);
  }, [dataTable.schema, dataTable.mockData, handleMockDataUpdate]);

  // Mock 데이터 행 삭제
  const handleDeleteMockRow = useCallback(
    (index: number) => {
      const newMockData = dataTable.mockData.filter((_, i) => i !== index);
      handleMockDataUpdate(newMockData);
    },
    [dataTable.mockData, handleMockDataUpdate]
  );

  // Mock 데이터 셀 업데이트
  const handleUpdateMockCell = useCallback(
    (rowIndex: number, fieldKey: string, value: unknown) => {
      const newMockData = dataTable.mockData.map((row, i) =>
        i === rowIndex ? { ...row, [fieldKey]: value } : row
      );
      handleMockDataUpdate(newMockData);
    },
    [dataTable.mockData, handleMockDataUpdate]
  );

  // useMockData 토글
  const handleUseMockDataToggle = useCallback(
    async (checked: boolean) => {
      try {
        await updateDataTable(dataTable.id, { useMockData: checked });
      } catch (error) {
        console.error("useMockData 업데이트 실패:", error);
      }
    },
    [dataTable.id, updateDataTable]
  );

  // 이름 변경
  const handleNameChange = useCallback(
    async (name: string) => {
      try {
        await updateDataTable(dataTable.id, { name });
      } catch (error) {
        console.error("이름 업데이트 실패:", error);
      }
    },
    [dataTable.id, updateDataTable]
  );

  return (
    <div className="datatable-editor">
      <div className="editor-header">
        <div className="editor-title">
          <Table2 size={18} />
          <input
            type="text"
            className="editor-name-input"
            value={dataTable.name}
            onChange={(e) => handleNameChange(e.target.value)}
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
          className={`editor-tab ${activeTab === "schema" ? "active" : ""}`}
          onClick={() => setActiveTab("schema")}
        >
          <Database size={14} />
          Schema
        </button>
        <button
          type="button"
          className={`editor-tab ${activeTab === "data" ? "active" : ""}`}
          onClick={() => setActiveTab("data")}
        >
          <Table2 size={14} />
          Table
        </button>
        <button
          type="button"
          className={`editor-tab ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          <Settings size={14} />
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="editor-content">
        {activeTab === "schema" && (
          <SchemaEditor
            schema={dataTable.schema}
            expandedFields={expandedFields}
            setExpandedFields={setExpandedFields}
            onAddField={handleAddField}
            onDeleteField={handleDeleteField}
            onUpdateField={handleUpdateField}
          />
        )}

        {activeTab === "data" && (
          <MockDataEditor
            schema={dataTable.schema}
            mockData={dataTable.mockData}
            onAddRow={handleAddMockRow}
            onDeleteRow={handleDeleteMockRow}
            onUpdateCell={handleUpdateMockCell}
          />
        )}

        {activeTab === "settings" && (
          <SettingsEditor
            useMockData={dataTable.useMockData}
            onUseMockDataChange={handleUseMockDataToggle}
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// Schema Editor
// ============================================

interface SchemaEditorProps {
  schema: DataField[];
  expandedFields: Set<string>;
  setExpandedFields: React.Dispatch<React.SetStateAction<Set<string>>>;
  onAddField: () => void;
  onDeleteField: (key: string) => void;
  onUpdateField: (key: string, updates: Partial<DataField>) => void;
}

function SchemaEditor({
  schema,
  onAddField,
  onDeleteField,
  onUpdateField,
}: SchemaEditorProps) {
  // 로컬 상태로 입력값 관리 (blur 시에만 저장)
  const [localValues, setLocalValues] = useState<Record<string, { key: string; label: string }>>({});

  // schema 변경 시 로컬 상태 초기화
  useEffect(() => {
    const initial: Record<string, { key: string; label: string }> = {};
    schema.forEach((field, index) => {
      initial[index] = { key: field.key, label: field.label || "" };
    });
    setLocalValues(initial);
  }, [schema.length]); // schema.length가 변경될 때만 초기화

  const handleLocalChange = (index: number, fieldName: 'key' | 'label', value: string) => {
    setLocalValues(prev => ({
      ...prev,
      [index]: { ...prev[index], [fieldName]: value }
    }));
  };

  const handleBlur = (index: number, originalKey: string, fieldName: 'key' | 'label') => {
    const localValue = localValues[index];
    if (!localValue) return;

    if (fieldName === 'key' && localValue.key !== originalKey) {
      onUpdateField(originalKey, { key: localValue.key });
    } else if (fieldName === 'label') {
      onUpdateField(originalKey, { label: localValue.label });
    }
  };

  return (
    <div className="schema-editor">
      <div className="schema-table-wrapper">
        <table className="schema-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Type</th>
              <th>Label</th>
              <th>Req</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {schema.map((field, index) => (
              <tr key={index}>
                <td>
                  <input
                    type="text"
                    className="cell-input"
                    value={localValues[index]?.key ?? field.key}
                    onChange={(e) => handleLocalChange(index, 'key', e.target.value)}
                    onBlur={() => handleBlur(index, field.key, 'key')}
                  />
                </td>
                <td>
                  <select
                    className="cell-select"
                    value={field.type}
                    onChange={(e) =>
                      onUpdateField(field.key, {
                        type: e.target.value as DataFieldType,
                      })
                    }
                  >
                    {FIELD_TYPES.map((ft) => (
                      <option key={ft.value} value={ft.value}>
                        {ft.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    className="cell-input"
                    value={localValues[index]?.label ?? field.label ?? ""}
                    onChange={(e) => handleLocalChange(index, 'label', e.target.value)}
                    onBlur={() => handleBlur(index, field.key, 'label')}
                    placeholder="Label"
                  />
                </td>
                <td className="cell-center">
                  <input
                    type="checkbox"
                    checked={field.required || false}
                    onChange={(e) =>
                      onUpdateField(field.key, { required: e.target.checked })
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="delete-row-btn"
                    onClick={() => onDeleteField(field.key)}
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="add-field-btn" onClick={onAddField}>
        <Plus size={14} />
        Add Column
      </button>
    </div>
  );
}

// ============================================
// Mock Data Editor
// ============================================

interface MockDataEditorProps {
  schema: DataField[];
  mockData: Record<string, unknown>[];
  onAddRow: () => void;
  onDeleteRow: (index: number) => void;
  onUpdateCell: (rowIndex: number, fieldKey: string, value: unknown) => void;
}

function MockDataEditor({
  schema,
  mockData,
  onAddRow,
  onDeleteRow,
  onUpdateCell,
}: MockDataEditorProps) {
  if (schema.length === 0) {
    return (
      <div className="mock-data-empty">
        스키마를 먼저 정의하세요.
      </div>
    );
  }

  return (
    <div className="mock-data-editor">
      <div className="mock-data-table-wrapper">
        <table className="mock-data-table">
          <thead>
            <tr>
              <th>#</th>
              {schema.map((field) => (
                <th key={field.key}>{field.key}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mockData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="row-index">{rowIndex + 1}</td>
                {schema.map((field) => (
                  <td key={field.key}>
                    <CellEditor
                      fieldType={field.type}
                      value={row[field.key]}
                      onChange={(value) =>
                        onUpdateCell(rowIndex, field.key, value)
                      }
                    />
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    className="delete-row-btn"
                    onClick={() => onDeleteRow(rowIndex)}
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="add-row-btn" onClick={onAddRow}>
        <Plus size={14} />
        Add Row
      </button>
    </div>
  );
}

// ============================================
// Cell Editor
// ============================================

interface CellEditorProps {
  fieldType: DataFieldType;
  value: unknown;
  onChange: (value: unknown) => void;
}

function CellEditor({ fieldType, value, onChange }: CellEditorProps) {
  // 로컬 상태로 관리하여 한국어 IME 조합 문제 해결
  const [localValue, setLocalValue] = useState<string>(String(value || ""));

  // 외부 value가 변경되면 로컬 상태 동기화
  useEffect(() => {
    setLocalValue(String(value || ""));
  }, [value]);

  const handleBlur = () => {
    // blur 시에만 부모에 알림
    if (fieldType === "number") {
      onChange(localValue === "" ? 0 : Number(localValue));
    } else {
      onChange(localValue);
    }
  };

  switch (fieldType) {
    case "boolean":
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case "number":
      return (
        <input
          type="number"
          className="cell-input"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
        />
      );
    case "date":
      return (
        <input
          type="date"
          className="cell-input"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
        />
      );
    case "datetime":
      return (
        <input
          type="datetime-local"
          className="cell-input"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
        />
      );
    default:
      return (
        <input
          type="text"
          className="cell-input"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
        />
      );
  }
}

// ============================================
// Settings Editor
// ============================================

interface SettingsEditorProps {
  useMockData: boolean;
  onUseMockDataChange: (checked: boolean) => void;
}

function SettingsEditor({
  useMockData,
  onUseMockDataChange,
}: SettingsEditorProps) {
  return (
    <div className="settings-editor">
      <PropertySwitch
        label="Use Table Data"
        isSelected={useMockData}
        onChange={onUseMockDataChange}
      />
      <p className="settings-description">
        {useMockData
          ? "Table 데이터를 사용합니다. API 응답 대신 정의된 Table 데이터가 표시됩니다."
          : "실제 API 응답 데이터를 사용합니다."}
      </p>
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function getDefaultValueForType(type: DataFieldType): unknown {
  switch (type) {
    case "string":
    case "email":
    case "url":
    case "image":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "date":
    case "datetime":
      return new Date().toISOString().split("T")[0];
    case "array":
      return [];
    case "object":
      return {};
    default:
      return "";
  }
}
