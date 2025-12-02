/**
 * DataTableEditor - DataTable 상세 편집 컴포넌트
 *
 * 기능:
 * - 스키마 정의 (필드 추가/삭제/수정)
 * - Mock 데이터 관리
 * - useMockData 토글
 */

import { useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Table2,
  Database,
  Settings,
  X,
} from "lucide-react";
import { useDataStore } from "../../../stores/data";
import type {
  DataTable,
  DataField,
  DataFieldType,
} from "../../../../types/builder/data.types";
import { PropertySwitch, PanelHeader } from "../../common";
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
      <PanelHeader
        title={dataTable.name}
        actions={
          <button type="button" className="iconButton" onClick={onClose} title="닫기">
            <X size={16} />
          </button>
        }
      />

      {/* Tabs */}
      <div className="panel-tabs">
        <button
          type="button"
          className={`panel-tab ${activeTab === "schema" ? "active" : ""}`}
          onClick={() => setActiveTab("schema")}
        >
          <Database size={14} />
          Schema
        </button>
        <button
          type="button"
          className={`panel-tab ${activeTab === "data" ? "active" : ""}`}
          onClick={() => setActiveTab("data")}
        >
          <Table2 size={14} />
          Table
        </button>
        <button
          type="button"
          className={`panel-tab ${activeTab === "settings" ? "active" : ""}`}
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
            name={dataTable.name}
            useMockData={dataTable.useMockData}
            onNameChange={handleNameChange}
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

// 개별 스키마 필드 행 컴포넌트 (로컬 상태로 IME 문제 해결)
interface SchemaFieldRowProps {
  field: DataField;
  onUpdateField: (key: string, updates: Partial<DataField>) => void;
  onDeleteField: (key: string) => void;
}

function SchemaFieldRow({ field, onUpdateField, onDeleteField }: SchemaFieldRowProps) {
  // 각 필드에 대한 로컬 상태 (key 변경 시 컴포넌트가 새로 마운트되어 자동 초기화)
  const [localKey, setLocalKey] = useState(field.key);
  const [localLabel, setLocalLabel] = useState(field.label || "");

  return (
    <tr>
      <td>
        <input
          type="text"
          className="cell-input"
          value={localKey}
          onChange={(e) => setLocalKey(e.target.value)}
          onBlur={() => {
            if (localKey !== field.key) {
              onUpdateField(field.key, { key: localKey });
            }
          }}
        />
      </td>
      <td>
        <select
          className="cell-select"
          value={field.type}
          onChange={(e) =>
            onUpdateField(field.key, { type: e.target.value as DataFieldType })
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
          value={localLabel}
          onChange={(e) => setLocalLabel(e.target.value)}
          onBlur={() => onUpdateField(field.key, { label: localLabel })}
          placeholder="Label"
        />
      </td>
      <td className="cell-center">
        <input
          type="checkbox"
          checked={field.required || false}
          onChange={(e) => onUpdateField(field.key, { required: e.target.checked })}
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
  );
}

function SchemaEditor({
  schema,
  onAddField,
  onDeleteField,
  onUpdateField,
}: SchemaEditorProps) {
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
            {schema.map((field) => (
              <SchemaFieldRow
                key={field.key}
                field={field}
                onUpdateField={onUpdateField}
                onDeleteField={onDeleteField}
              />
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
                      key={`${rowIndex}-${field.key}-${JSON.stringify(row[field.key])}`}
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
  // useState 초기값으로 props를 사용하고, key prop으로 리셋 처리
  const [localValue, setLocalValue] = useState<string>(String(value || ""));

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
  name: string;
  useMockData: boolean;
  onNameChange: (name: string) => void;
  onUseMockDataChange: (checked: boolean) => void;
}

function SettingsEditor({
  name,
  useMockData,
  onNameChange,
  onUseMockDataChange,
}: SettingsEditorProps) {
  return (
    <div className="settings-editor">
      <div className="settings-field">
        <label className="settings-label">테이블 이름</label>
        <input
          type="text"
          className="settings-input"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>
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
