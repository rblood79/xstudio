import { useState, useEffect } from "react";
import {
  Select,
  SelectValue,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  Label,
  TextField,
  Input,
} from "react-aria-components";
import { supabase } from "../../../env/supabase.client";
import type { SupabaseCollectionConfig } from "../types";

export interface SupabaseCollectionEditorProps {
  config: SupabaseCollectionConfig;
  onChange: (config: SupabaseCollectionConfig) => void;
}

export function SupabaseCollectionEditor({
  config,
  onChange,
}: SupabaseCollectionEditorProps) {
  const [tables, setTables] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 테이블 목록 로드
  useEffect(() => {
    loadTables();
  }, []);

  // 선택된 테이블의 컬럼 로드
  useEffect(() => {
    if (config.table) {
      loadColumns(config.table);
    }
  }, [config.table]);

  const loadTables = async () => {
    setLoading(true);
    try {
      // 프로젝트에서 사용하는 실제 Supabase 테이블 목록
      const projectTables = [
        "projects",
        "pages",
        "elements",
        "design_themes",
        "design_tokens",
      ];

      setTables(projectTables);
    } catch (error) {
      console.error("Error loading tables:", error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const loadColumns = async (tableName: string) => {
    try {
      // 샘플 데이터로 컬럼 조회
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .limit(1);

      if (!error && data && data[0]) {
        setColumns(Object.keys(data[0]));
      }
    } catch (error) {
      console.error("Error loading columns:", error);
    }
  };

  const handleTableChange = (table: string) => {
    onChange({
      ...config,
      table,
      columns: [],
    });
  };

  const handleColumnToggle = (column: string) => {
    const isSelected = config.columns.includes(column);
    const updatedColumns = isSelected
      ? config.columns.filter((c) => c !== column)
      : [...config.columns, column];

    onChange({
      ...config,
      columns: updatedColumns,
    });
  };

  return (
    <div className="supabase-collection-editor">
      <h5 className="editor-subtitle">Supabase Table</h5>

      {/* 테이블 선택 */}
      <Select
        className="table-select"
        selectedKey={config.table || ""}
        onSelectionChange={(key) => handleTableChange(key as string)}
      >
        <Label className="field-label">Table</Label>
        <Button className="select-trigger">
          <SelectValue />
          <span className="select-arrow">▼</span>
        </Button>
        <Popover className="select-popover">
          <ListBox className="select-list">
            {loading && (
              <ListBoxItem id="loading" className="select-item" isDisabled>
                Loading tables...
              </ListBoxItem>
            )}
            {!loading && tables.length === 0 && (
              <ListBoxItem id="empty" className="select-item" isDisabled>
                No tables found
              </ListBoxItem>
            )}
            {!loading &&
              tables.length > 0 &&
              tables.map((table) => (
                <ListBoxItem key={table} id={table} className="select-item">
                  {table}
                </ListBoxItem>
              ))}
          </ListBox>
        </Popover>
      </Select>

      {/* 컬럼 선택 */}
      {config.table && columns.length > 0 && (
        <div className="column-selection">
          <Label className="field-label">Columns to Display</Label>
          <div className="column-list">
            {columns.map((column) => {
              const isSelected = config.columns.includes(column);
              return (
                <button
                  key={column}
                  type="button"
                  className={`column-item ${isSelected ? "selected" : ""}`}
                  onClick={() => handleColumnToggle(column)}
                >
                  <span className="column-checkbox">
                    {isSelected ? "☑" : "☐"}
                  </span>
                  <span className="column-name">{column}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 정렬 설정 */}
      {config.table && (
        <div className="order-section">
          <Label className="field-label">Order By (Optional)</Label>
          <div className="order-controls">
            <Select
              className="order-select"
              selectedKey={config.orderBy?.column || ""}
              onSelectionChange={(key) => {
                if (key) {
                  onChange({
                    ...config,
                    orderBy: {
                      column: key as string,
                      ascending: config.orderBy?.ascending ?? true,
                    },
                  });
                } else {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { orderBy: _orderBy, ...rest } = config;
                  onChange(rest);
                }
              }}
            >
              <Button className="select-trigger">
                <SelectValue />
                <span className="select-arrow">▼</span>
              </Button>
              <Popover className="select-popover">
                <ListBox className="select-list">
                  <ListBoxItem id="" className="select-item">
                    No sorting
                  </ListBoxItem>
                  {columns.map((column) => (
                    <ListBoxItem
                      key={column}
                      id={column}
                      className="select-item"
                    >
                      {column}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Popover>
            </Select>

            {config.orderBy && (
              <Button
                className="order-direction"
                onPress={() => {
                  if (config.orderBy) {
                    onChange({
                      ...config,
                      orderBy: {
                        column: config.orderBy.column,
                        ascending: !config.orderBy.ascending,
                      },
                    });
                  }
                }}
              >
                {config.orderBy.ascending ? "↑ ASC" : "↓ DESC"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 제한 설정 */}
      {config.table && (
        <TextField
          className="limit-field"
          type="number"
          value={config.limit?.toString() || ""}
          onChange={(value) => {
            const limit = value ? parseInt(value, 10) : undefined;
            onChange({
              ...config,
              limit,
            });
          }}
        >
          <Label className="field-label">Limit (Optional)</Label>
          <Input className="field-input" placeholder="No limit" />
        </TextField>
      )}
    </div>
  );
}
