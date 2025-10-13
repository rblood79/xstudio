import { useState, useEffect, useMemo } from "react";
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
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Local state로 관리 (즉각 적용 방지)
  const [localTable, setLocalTable] = useState(config.table || "");
  const [localColumns, setLocalColumns] = useState<string[]>(config.columns || []);
  const [localOrderBy, setLocalOrderBy] = useState(config.orderBy);
  const [localLimit, setLocalLimit] = useState(config.limit?.toString() || "");

  // 테이블 목록 로드
  useEffect(() => {
    loadTables();
  }, []);

  // 선택된 테이블의 컬럼 로드
  useEffect(() => {
    if (localTable) {
      loadColumns(localTable);
    }
  }, [localTable]);

  // config가 변경되면 local state 업데이트
  useEffect(() => {
    setLocalTable(config.table || "");
    setLocalColumns(config.columns || []);
    setLocalOrderBy(config.orderBy);
    setLocalLimit(config.limit?.toString() || "");
  }, [config.table, config.columns, config.orderBy, config.limit]);

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

  const handleColumnToggle = (column: string) => {
    const isSelected = localColumns.includes(column);
    const updatedColumns = isSelected
      ? localColumns.filter((c) => c !== column)
      : [...localColumns, column];

    setLocalColumns(updatedColumns);
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
            selectedKey={localTable || ""}
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
      {localTable && columns.length > 0 && (
        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Columns to Display</legend>
          <div className="column-selection">
            <div className={`column-list ${columnsChanged ? "field-modified" : ""}`}>
              {columns.map((column) => {
                const isSelected = localColumns.includes(column);
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
      {localTable && (
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
            <div className={`order-controls ${orderByChanged ? "field-modified" : ""}`}>
              <Select
                selectedKey={localOrderBy?.column || ""}
                onSelectionChange={(key) => {
                  if (key) {
                    setLocalOrderBy({
                      column: key as string,
                      ascending: localOrderBy?.ascending ?? true,
                    });
                  } else {
                    setLocalOrderBy(undefined);
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
          </div>
        </fieldset>
      )}

      {/* 제한 설정 */}
      {localTable && (
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
              value={localLimit}
              onChange={(value) => setLocalLimit(value)}
            >
              <Input
                className={`control-input ${limitChanged ? "field-modified" : ""}`}
                placeholder="No limit"
              />
            </TextField>
          </div>
        </fieldset>
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
