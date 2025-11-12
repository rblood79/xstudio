import { useState, useEffect } from "react";
import { Table as TableIcon, Columns } from "lucide-react";
import { PropertySelect } from '../../shared/ui';
import { supabase } from "../../../env/supabase.client";
import type { SupabaseValueConfig } from "../../inspector/types";

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
      <PropertySelect
        icon={TableIcon}
        label="Table"
        value={config.table || ""}
        options={
          loading
            ? [{ value: "loading", label: "Loading tables..." }]
            : tables.length === 0
              ? [{ value: "empty", label: "No tables found" }]
              : tables.map((table) => ({ value: table, label: table }))
        }
        onChange={(key: string) => handleTableChange(key)}
      />

      {/* 컬럼 선택 */}
      {config.table && columns.length > 0 && (
        <PropertySelect
          icon={Columns}
          label="Column"
          value={config.column || ""}
          options={[
            { value: "", label: "Select column..." },
            ...columns.map((column) => ({ value: column, label: column })),
          ]}
          onChange={(key: string) => handleColumnChange(key)}
        />
      )}
    </div>
  );
}
