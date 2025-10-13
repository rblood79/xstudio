import { useState, useEffect } from "react";
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
    <div className="supabase-collection-editor component-props">
      {/* 테이블 선택 */}
      <fieldset className="properties-aria">
        <legend className="fieldset-legend">Table</legend>
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
              className="lucide lucide-table"
              aria-hidden="true"
            >
              <path d="M12 3v18" />
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
            </svg>
          </label>
          <Select
            selectedKey={config.table || ""}
            onSelectionChange={(key) => handleTableChange(key as string)}
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
                {loading && (
                  <ListBoxItem id="loading" isDisabled>
                    Loading tables...
                  </ListBoxItem>
                )}
                {!loading && tables.length === 0 && (
                  <ListBoxItem id="empty" isDisabled>
                    No tables found
                  </ListBoxItem>
                )}
                {!loading &&
                  tables.length > 0 &&
                  tables.map((table) => (
                    <ListBoxItem key={table} id={table}>
                      {table}
                    </ListBoxItem>
                  ))}
              </ListBox>
            </Popover>
          </Select>
        </div>
      </fieldset>

      {/* 컬럼 선택 */}
      {config.table && columns.length > 0 && (
        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Columns to Display</legend>
          <div className="column-selection">
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
        </fieldset>
      )}

      {/* 정렬 설정 */}
      {config.table && (
        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Order By (Optional)</legend>
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
                className="lucide lucide-arrow-up-down"
                aria-hidden="true"
              >
                <path d="m21 16-4 4-4-4" />
                <path d="M17 20V4" />
                <path d="m3 8 4-4 4 4" />
                <path d="M7 4v16" />
              </svg>
            </label>
            <div className="order-controls">
              <Select
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
                    <ListBoxItem id="">No sorting</ListBoxItem>
                    {columns.map((column) => (
                      <ListBoxItem key={column} id={column}>
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
        </fieldset>
      )}

      {/* 제한 설정 */}
      {config.table && (
        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Limit (Optional)</legend>
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
                className="lucide lucide-hash"
                aria-hidden="true"
              >
                <line x1="4" x2="20" y1="9" y2="9" />
                <line x1="4" x2="20" y1="15" y2="15" />
                <line x1="10" x2="8" y1="3" y2="21" />
                <line x1="16" x2="14" y1="3" y2="21" />
              </svg>
            </label>
            <TextField
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
              <Input className="control-input" placeholder="No limit" />
            </TextField>
          </div>
        </fieldset>
      )}
    </div>
  );
}
