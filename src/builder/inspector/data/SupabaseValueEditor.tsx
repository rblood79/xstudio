import { useState, useEffect } from "react";
import {
  Select,
  SelectValue,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  Label,
} from "react-aria-components";
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
    <div className="supabase-value-editor">
      <h5 className="editor-subtitle">Supabase Single Value</h5>

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
        <Select
          className="column-select"
          selectedKey={config.column || ""}
          onSelectionChange={(key) => handleColumnChange(key as string)}
        >
          <Label className="field-label">Column</Label>
          <Button className="select-trigger">
            <SelectValue />
            <span className="select-arrow">▼</span>
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-list">
              <ListBoxItem id="" className="select-item">
                Select column...
              </ListBoxItem>
              {columns.map((column) => (
                <ListBoxItem key={column} id={column} className="select-item">
                  {column}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      )}
    </div>
  );
}
