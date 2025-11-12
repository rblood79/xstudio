import { useState, useEffect, useMemo } from "react";
import { Table as TableIcon, ArrowUpDown, Hash } from "lucide-react";
import { PropertySelect, PropertyInput } from '../../shared/ui';
import { Button, Checkbox, CheckboxGroup } from "../../components/list";
import { supabase } from "../../../env/supabase.client";
import type { SupabaseCollectionConfig } from "../../inspector/types";
import { useColumnLoader } from "./hooks";
import "./data.css";

export interface SupabaseCollectionEditorProps {
  config: SupabaseCollectionConfig;
  onChange: (config: SupabaseCollectionConfig) => void;
  onTablePropsUpdate?: (props: Record<string, unknown>) => void;
}

export function SupabaseCollectionEditor({
  config,
  onChange,
  onTablePropsUpdate,
}: SupabaseCollectionEditorProps) {
  const [tables, setTables] = useState<string[]>([]);

  // Local state로 관리 (즉각 적용 방지)
  const [localTable, setLocalTable] = useState(config.table || "");
  const [localColumns, setLocalColumns] = useState<string[]>(config.columns || []);
  const [localOrderBy, setLocalOrderBy] = useState(config.orderBy);
  const [localLimit, setLocalLimit] = useState(config.limit?.toString() || "");

  // useColumnLoader로 컬럼 로딩 자동화
  const columnLoader = useColumnLoader(async ({ signal }) => {
    if (!localTable) {
      return [];
    }

    // Supabase에서 샘플 데이터로 컬럼 조회
    const { data, error } = await supabase
      .from(localTable)
      .select("*")
      .limit(1)
      .abortSignal(signal);

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error("No data found in table");
    }

    // 컬럼 이름을 ColumnListItem[] 형태로 반환
    const columnKeys = Object.keys(data[0]);
    return columnKeys.map((key, index) => ({
      id: key,
      key,
      label: key,
      type: 'string', // Supabase는 타입 추론 없이 모두 string으로
      selected: true,
      order: index,
    }));
  });

  const loadTables = async () => {
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
    }
  };

  // 테이블 목록 로드
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTables();
  }, []);

  // localTable이 변경되면 컬럼 로드
  useEffect(() => {
    if (localTable) {
      columnLoader.reload();
    }
  }, [localTable, columnLoader]);

  // columnLoader.items가 변경되면 localColumns 자동 업데이트
  useEffect(() => {
    if (columnLoader.items.length > 0) {
      const columnKeys = columnLoader.items.map(item => item.key);

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalColumns(prevColumns => {
        // 첫 호출인 경우 모든 컬럼 선택
        if (prevColumns.length === 0) {
          return columnKeys;
        }

        // 기존 선택 유지 + 새로운 컬럼 추가
        const newColumns = columnKeys.filter(col => !prevColumns.includes(col));
        if (newColumns.length > 0) {
          return [...prevColumns, ...newColumns];
        }

        return prevColumns;
      });
    }
  }, [columnLoader.items]);

  // config가 변경되면 local state 업데이트
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalTable(config.table || "");
     
    setLocalColumns(config.columns || []);
     
    setLocalOrderBy(config.orderBy);
     
    setLocalLimit(config.limit?.toString() || "");
  }, [config.table, config.columns, config.orderBy, config.limit]);

  // 변경 감지
  const tableChanged = useMemo(() => localTable !== (config.table || ""), [localTable, config.table]);
  const columnsChanged = useMemo(() => {
    return JSON.stringify(localColumns) !== JSON.stringify(config.columns || []);
  }, [localColumns, config.columns]);
  const orderByChanged = useMemo(() => {
    return JSON.stringify(localOrderBy) !== JSON.stringify(config.orderBy);
  }, [localOrderBy, config.orderBy]);
  const limitChanged = useMemo(() => {
    const currentLimit = config.limit?.toString() || "";
    return localLimit !== currentLimit;
  }, [localLimit, config.limit]);

  const hasChanges = useMemo(() => {
    return tableChanged || columnsChanged || orderByChanged || limitChanged;
  }, [tableChanged, columnsChanged, orderByChanged, limitChanged]);

  const handleTableChange = (table: string) => {
    setLocalTable(table);
    setLocalColumns([]); // 테이블 변경 시 컬럼 초기화
  };

  const handleApplyChanges = async () => {
    try {
      // Supabase에서 실제 데이터 가져오기
      let query = supabase.from(localTable).select(localColumns.join(", ") || "*");

      // 정렬 적용
      if (localOrderBy) {
        query = query.order(localOrderBy.column, { ascending: localOrderBy.ascending });
      }

      // 제한 적용
      if (localLimit) {
        const limit = parseInt(localLimit, 10);
        if (!isNaN(limit)) {
          query = query.limit(limit);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase 데이터 로드 오류:", error);
        alert("데이터를 불러오는데 실패했습니다: " + error.message);
        return;
      }

      console.log("✅ Supabase 데이터 로드 성공:", data);

      // 선택된 컬럼을 기반으로 컬럼 매핑 자동 생성
      const columnMapping: Record<string, {
        key: string;
        label: string;
        type: string;
        sortable: boolean;
        width: number;
        align: string;
      }> = {};

      if (data && data.length > 0 && localColumns.length > 0) {
        const firstItem = data[0] as unknown as Record<string, unknown>;

        localColumns.forEach((columnKey) => {
          columnMapping[columnKey] = {
            key: columnKey,
            label: columnKey.charAt(0).toUpperCase() + columnKey.slice(1).replace(/_/g, ' '),
            type: typeof firstItem[columnKey] === 'number' ? 'number' :
              typeof firstItem[columnKey] === 'boolean' ? 'boolean' :
                typeof firstItem[columnKey] === 'object' && firstItem[columnKey] instanceof Date ? 'date' : 'string',
            sortable: true,
            width: 150,
            align: 'left',
          };
        });
      }

      console.log("📊 Supabase 컬럼 매핑 생성:", columnMapping);

      // config 업데이트
      const newConfig: SupabaseCollectionConfig = {
        ...config,
        table: localTable,
        columns: localColumns,
        orderBy: localOrderBy,
        limit: localLimit ? parseInt(localLimit, 10) : undefined,
      };

      // Table 컴포넌트 props를 먼저 업데이트
      if (onTablePropsUpdate && data) {
        const tableProps: Record<string, unknown> = {
          data: data,
          enableAsyncLoading: false, // Supabase는 미리 로드한 데이터 사용
          columnMapping: columnMapping, // 컬럼 매핑 추가
        };

        console.log("📊 Supabase - Table props 업데이트 전송:", tableProps);
        onTablePropsUpdate(tableProps);
      }

      // config는 나중에 업데이트
      onChange(newConfig);
    } catch (error) {
      console.error("Apply 오류:", error);
      alert("데이터 적용 중 오류가 발생했습니다.");
    }
  };

  const handleDiscardChanges = () => {
    setLocalTable(config.table || "");
    setLocalColumns(config.columns || []);
    setLocalOrderBy(config.orderBy);
    setLocalLimit(config.limit?.toString() || "");
  };

  return (
    <div className="supabase-collection-editor component-props">
      {/* 테이블 선택 */}
      <PropertySelect
        icon={TableIcon}
        label="Table"
        value={localTable || ""}
        options={
          tables.length === 0
            ? [{ value: "empty", label: "No tables found" }]
            : tables.map((table) => ({ value: table, label: table }))
        }
        onChange={(key: string) => handleTableChange(key)}
      />

      {/* 로딩 상태 표시 */}
      {columnLoader.isLoading && (
        <div className="loading-message">Loading columns...</div>
      )}

      {/* 에러 표시 */}
      {columnLoader.error && (
        <div className="error-message" style={{
          color: "var(--color-red-500)",
          padding: "8px",
          backgroundColor: "var(--color-red-50)",
          borderRadius: "4px",
          fontSize: "12px",
          marginTop: "8px"
        }}>
          ⚠️ {columnLoader.error.message}
        </div>
      )}

      {/* 컬럼 선택 */}
      {localTable && columnLoader.items.length > 0 && (
        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Columns to Display ({columnLoader.items.length} detected)</legend>
          <CheckboxGroup
            value={localColumns}
            onChange={(value) => setLocalColumns(value)}
            className={`column-list ${columnsChanged ? "field-modified" : ""}`}
          >
            {columnLoader.items.map((item) => (
              <Checkbox key={item.key} value={item.key}>
                {item.label}
              </Checkbox>
            ))}
          </CheckboxGroup>
        </fieldset>
      )}

      {/* 정렬 설정 */}
      {localTable && columnLoader.items.length > 0 && (
        <div className={`order-controls ${orderByChanged ? "field-modified" : ""}`}>
          <PropertySelect
            icon={ArrowUpDown}
            label="Order By (Optional)"
            value={localOrderBy?.column || ""}
            options={[
              { value: "", label: "No sorting" },
              ...columnLoader.items.map((item) => ({ value: item.key, label: item.label })),
            ]}
            onChange={(key: string) => {
              if (key) {
                setLocalOrderBy({
                  column: key,
                  ascending: localOrderBy?.ascending ?? true,
                });
              } else {
                setLocalOrderBy(undefined);
              }
            }}
          />

          {localOrderBy && (
            <Button
              className="order-direction"
              onPress={() => {
                if (localOrderBy) {
                  setLocalOrderBy({
                    column: localOrderBy.column,
                    ascending: !localOrderBy.ascending,
                  });
                }
              }}
            >
              {localOrderBy.ascending ? "↑ ASC" : "↓ DESC"}
            </Button>
          )}
        </div>
      )}

      {/* 제한 설정 */}
      {localTable && (
        <PropertyInput
          label="Limit (Optional)"
          icon={Hash}
          type="number"
          value={localLimit}
          placeholder="No limit"
          onChange={(value) => setLocalLimit(value)}
          className={limitChanged ? "field-modified" : ""}
        />
      )}

      {/* Status Messages */}
      {localTable && !hasChanges && config.table && (
        <div className="success-message">
          ✓ 설정 완료: {config.table} 테이블
        </div>
      )}

      {/* Action Buttons */}
      {localTable && (
        <div className="action-buttons">
          {/* Discard Changes 버튼 - 변경사항이 있을 때만 표시 */}
          {hasChanges && (
            <Button
              onClick={handleDiscardChanges}
              children="Discard"
            />
          )}

          {/* Apply 버튼 */}
          <Button
            onClick={handleApplyChanges}
            isDisabled={!hasChanges || localColumns.length === 0}
            children={hasChanges ? "Apply" : "No Changes"}
          />
        </div>
      )}
    </div>
  );
}
