import { useState, useEffect } from "react";
import {
  Select,
  SelectValue,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import { Button } from "../../components/list";
import { supabase } from "../../../env/supabase.client";
import type { SupabaseValueConfig } from "../types";

export interface SupabaseValueEditorProps {
  config: SupabaseValueConfig;
  onChange: (config: SupabaseValueConfig) => void;
}

export function SupabaseValueEditor({
  config,
  onChange,
}: SupabaseValueEditorProps) {
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
      column: "",
    });
  };

  const handleColumnChange = (column: string) => {
    onChange({
      ...config,
      column,
    });
  };

  return (
    <div className="supabase-value-editor component-props">
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
          <legend className="fieldset-legend">Column</legend>
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
                className="lucide lucide-columns"
                aria-hidden="true"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M12 3v18" />
              </svg>
            </label>
            <Select
              selectedKey={config.column || ""}
              onSelectionChange={(key) => handleColumnChange(key as string)}
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
                  <ListBoxItem id="">Select column...</ListBoxItem>
                  {columns.map((column) => (
                    <ListBoxItem key={column} id={column}>
                      {column}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Popover>
            </Select>
          </div>
        </fieldset>
      )}
    </div>
  );
}
