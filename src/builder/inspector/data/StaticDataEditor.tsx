import { useState, useMemo } from "react";
import { TextField, Input } from "react-aria-components";
import { Button } from "../../components/list";
import type {
  DataBindingType,
  StaticCollectionConfig,
  StaticValueConfig,
} from "../types";
import "./data.css";

// 컬럼 매핑 타입 정의
interface ColumnMappingItem {
  key: string;
  label?: string;
  type?: "string" | "number" | "boolean" | "date";
  sortable?: boolean;
  width?: number;
  align?: "left" | "center" | "right";
}

type ColumnMapping = Record<string, ColumnMappingItem>;


export interface StaticDataEditorProps {
  bindingType: DataBindingType;
  config: StaticCollectionConfig | StaticValueConfig;
  onChange: (config: StaticCollectionConfig | StaticValueConfig) => void;
  onTablePropsUpdate?: (props: Record<string, unknown>) => void;
}

export function StaticDataEditor({
  bindingType,
  config,
  onChange,
  onTablePropsUpdate,
}: StaticDataEditorProps) {
  const isCollection = bindingType === "collection";

  // 초기값 설정: config에 데이터가 있으면 표시
  const initialJson =
    isCollection && (config as StaticCollectionConfig).data?.length > 0
      ? JSON.stringify((config as StaticCollectionConfig).data, null, 2)
      : "";

  // 컬럼 매핑 초기값 설정
  const initialColumnMapping = (config as StaticCollectionConfig).columnMapping || {};

  // Local state로 관리 (즉각 적용 방지)
  const [localJsonInput, setLocalJsonInput] = useState(initialJson);
  const [localColumnMapping, setLocalColumnMapping] = useState(JSON.stringify(initialColumnMapping, null, 2));
  const [error, setError] = useState("");
  const [pendingData, setPendingData] = useState<unknown[] | null>(null);
  const [pendingColumnMapping, setPendingColumnMapping] = useState<ColumnMapping | null>(null);

  // 변경 감지
  const jsonChanged = useMemo(() => {
    const currentJson = isCollection
      ? JSON.stringify((config as StaticCollectionConfig).data || [], null, 2)
      : "";
    return localJsonInput !== currentJson;
  }, [localJsonInput, config, isCollection]);

  const columnMappingChanged = useMemo(() => {
    const currentMapping = JSON.stringify((config as StaticCollectionConfig).columnMapping || {}, null, 2);
    return localColumnMapping !== currentMapping;
  }, [localColumnMapping, config]);

  const handleValueChange = (value: string) => {
    if (!isCollection) {
      onChange({ value } as StaticValueConfig);
    }
  };

  const handleJSONInput = (input: string) => {
    setLocalJsonInput(input);
    setError("");
    setPendingData(null);

    if (!input.trim()) {
      setPendingColumnMapping({});
      return;
    }

    try {
      const parsed = JSON.parse(input);
      if (isCollection) {
        if (Array.isArray(parsed)) {
          // Apply 버튼으로 적용할 수 있도록 pendingData에 저장
          setPendingData(parsed);

          // 데이터의 키를 기반으로 자동 컬럼 매핑 생성
          if (parsed.length > 0) {
            const firstItem = parsed[0] as Record<string, unknown>;
            const keys = Object.keys(firstItem);

            const autoColumnMapping: ColumnMapping = {};
            keys.forEach((key) => {
              autoColumnMapping[key] = {
                key: key,
                label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
                type: typeof firstItem[key] === 'number' ? 'number' :
                  typeof firstItem[key] === 'boolean' ? 'boolean' :
                    typeof firstItem[key] === 'object' && firstItem[key] instanceof Date ? 'date' : 'string',
                sortable: true,
                width: 150
              };
            });

            setLocalColumnMapping(JSON.stringify(autoColumnMapping, null, 2));
            setPendingColumnMapping(autoColumnMapping);
          }
        } else {
          setError("Collection 바인딩은 배열이어야 합니다.");
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      setError("유효한 JSON이 아닙니다.");
    }
  };

  const handleColumnMappingInput = (input: string) => {
    setLocalColumnMapping(input);
    setError("");
    setPendingColumnMapping(null);

    if (!input.trim()) {
      setPendingColumnMapping({});
      return;
    }

    try {
      const parsed = JSON.parse(input);
      if (typeof parsed === 'object' && parsed !== null) {
        setPendingColumnMapping(parsed);

        // 데이터가 있고 컬럼 매핑이 비어있거나 일부만 설정된 경우 자동 완성 제안
        if (pendingData && pendingData.length > 0) {
          const firstItem = pendingData[0] as Record<string, unknown>;
          const dataKeys = Object.keys(firstItem);
          const mappingKeys = Object.keys(parsed);

          // 누락된 키들을 찾아 자동으로 추가
          const missingKeys = dataKeys.filter(key => !mappingKeys.includes(key));

          if (missingKeys.length > 0) {
            console.log("🔍 누락된 컬럼 키 발견, 자동 완성 제안:", missingKeys);

            // 사용자에게 자동 완성할지 물어보는 메시지 표시 (간단한 구현)
            // 실제로는 더 sophisticated한 UI가 필요할 수 있음
            const shouldAutoComplete = confirm(
              `${missingKeys.length}개의 컬럼(${missingKeys.join(', ')})이 데이터에 있지만 매핑에 없습니다. 자동으로 추가하시겠습니까?`
            );

            if (shouldAutoComplete) {
              const autoCompletedMapping: ColumnMapping = { ...parsed };
              missingKeys.forEach(key => {
                autoCompletedMapping[key] = {
                  key: key,
                  label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
                  type: typeof firstItem[key] === 'number' ? 'number' :
                    typeof firstItem[key] === 'boolean' ? 'boolean' :
                      typeof firstItem[key] === 'object' && firstItem[key] instanceof Date ? 'date' : 'string',
                  sortable: true,
                  width: 150
                };
              });

              setLocalColumnMapping(JSON.stringify(autoCompletedMapping, null, 2));
              setPendingColumnMapping(autoCompletedMapping);
            }
          }
        }
      } else {
        setError("컬럼 매핑은 객체 형식이어야 합니다.");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      setError("유효한 JSON이 아닙니다.");
    }
  };

  const handleApply = () => {
    if (isCollection) {
      const updates: Partial<StaticCollectionConfig> = {};

      if (pendingData) {
        updates.data = pendingData;
        setPendingData(null);
      }

      if (pendingColumnMapping !== null) {
        updates.columnMapping = pendingColumnMapping;
        setPendingColumnMapping(null);
      }

      if (Object.keys(updates).length > 0) {
        console.log("✅ Static Data Apply:", updates);
        console.log("📊 현재 데이터 상태:", {
          hasPendingData: !!pendingData,
          hasCurrentData: !!(config as StaticCollectionConfig).data?.length,
          pendingDataLength: pendingData?.length,
          currentDataLength: (config as StaticCollectionConfig).data?.length,
          updates: Object.keys(updates)
        });
        const newConfig = { ...config, ...updates } as StaticCollectionConfig;
        onChange(newConfig);

        // Table 컴포넌트 props 업데이트
        if (onTablePropsUpdate) {
          const tableProps: Record<string, unknown> = {};

          // 데이터 업데이트 (pending이 없어도 기존 데이터 유지)
          const currentData = updates.data || (config as StaticCollectionConfig).data;
          if (currentData && currentData.length > 0) {
            tableProps.data = currentData;
            tableProps.enableAsyncLoading = false; // 정적 데이터 사용 시 비활성화
          }

          // 컬럼 매핑 업데이트
          // ❌ columns props를 직접 설정하지 않음 - Table 컴포넌트의 자동 감지에 맡김
          // const currentColumnMapping = updates.columnMapping || (config as StaticCollectionConfig).columnMapping;
          // if (currentColumnMapping && Object.keys(currentColumnMapping).length > 0) {
          //   const columns = Object.entries(currentColumnMapping).map(([key, mapping]) => ({
          //     key: mapping.key || key,
          //     label: mapping.label || key,
          //     type: mapping.type || 'string',
          //     sortable: mapping.sortable !== false,
          //     width: mapping.width || 150,
          //     align: 'left',
          //   }));
          //   tableProps.columns = columns;
          // }

          if (Object.keys(tableProps).length > 0) {
            onTablePropsUpdate(tableProps);
          }
        }
      }
    }
  };

  const handleDiscard = () => {
    setLocalJsonInput(initialJson);
    setLocalColumnMapping(JSON.stringify((config as StaticCollectionConfig).columnMapping || {}, null, 2));
    setError("");
    setPendingData(null);
    setPendingColumnMapping(null);
  };

  const handleLoadExample = () => {
    // 현재 입력된 데이터가 있으면 그 데이터를 기반으로 예제 생성
    const currentData = localJsonInput.trim();
    let exampleData: string;
    let exampleColumnMapping: ColumnMapping = {};

    if (currentData && isCollection) {
      try {
        const parsed = JSON.parse(currentData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 현재 데이터를 예제로 사용하되, 최대 3개 항목으로 제한
          const limitedData = parsed.slice(0, 3);
          exampleData = JSON.stringify(limitedData, null, 2);

          // 현재 데이터의 키를 기반으로 컬럼 매핑 생성
          const firstItem = limitedData[0] as Record<string, unknown>;
          const keys = Object.keys(firstItem);
          keys.forEach((key) => {
            exampleColumnMapping[key] = {
              key: key,
              label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
              type: typeof firstItem[key] === 'number' ? 'number' :
                typeof firstItem[key] === 'boolean' ? 'boolean' :
                  typeof firstItem[key] === 'object' && firstItem[key] instanceof Date ? 'date' : 'string',
              sortable: true,
              width: 150
            };
          });
        } else {
          // 파싱 실패 시 기본 예제 사용
          exampleData = JSON.stringify(
            [
              { id: 1, name: "Item 1", active: "true" },
              { id: 2, name: "Item 2", active: "false" },
              { id: 3, name: "Item 3", active: "true" },
            ],
            null,
            2
          );

          exampleColumnMapping = {
            id: { key: "id", label: "ID", type: "number", sortable: true, width: 150 },
            name: { key: "name", label: "이름", type: "string", sortable: true, width: 150 },
            active: { key: "active", label: "활성", type: "boolean", sortable: true, width: 150 },
          };
        }
      } catch {
        // 파싱 실패 시 기본 예제 사용
        exampleData = JSON.stringify(
          [
            { id: 1, name: "Item 1", active: "true" },
            { id: 2, name: "Item 2", active: "false" },
            { id: 3, name: "Item 3", active: "true" },
          ],
          null,
          2
        );

        exampleColumnMapping = {
          id: { key: "id", label: "ID", type: "number", sortable: true, width: 150 },
          name: { key: "name", label: "이름", type: "string", sortable: true, width: 150 },
          active: { key: "active", label: "활성", type: "boolean", sortable: true, width: 150 },
        };
      }
    } else {
      // 데이터가 없으면 기본 예제 사용
      exampleData = JSON.stringify(
        [
          { id: 1, name: "Item 1", active: "true" },
          { id: 2, name: "Item 2", active: "false" },
          { id: 3, name: "Item 3", active: "true" },
        ],
        null,
        2
      );

      exampleColumnMapping = {
        id: { key: "id", label: "ID", type: "number", sortable: true, width: 150 },
        name: { key: "name", label: "이름", type: "string", sortable: true, width: 150 },
        active: { key: "active", label: "활성", type: "boolean", sortable: true, width: 150 },
      };
    }

    if (isCollection) {
      handleJSONInput(exampleData);
      setLocalColumnMapping(JSON.stringify(exampleColumnMapping, null, 2));
      setPendingColumnMapping(exampleColumnMapping);
    } else {
      handleValueChange(exampleData);
    }
  };

  return (
    <div className="component-props static-data-editor">
      {isCollection ? (
        <>
          {/* Static Data (JSON Array) */}
          <fieldset className="properties-aria">
            <legend className="fieldset-legend">Static Data (JSON Array)</legend>
            <div className="react-aria-control react-aria-Group">
              <div style={{ flex: 1 }}>
                <textarea
                  className={`control-input ${pendingData ? "field-modified" : ""}`}
                  value={localJsonInput}
                  onChange={(e) => handleJSONInput(e.target.value)}
                  placeholder={`[
  { "id": 1, "name": "Item 1", "active": "true" },
  { "id": 2, "name": "Item 2", "active": "false" },
  { "id": 3, "name": "Item 3", "active": "true" }
]`}
                  rows={10}
                />
              </div>
            </div>
          </fieldset>

          {/* Column Mapping */}
          <fieldset className="properties-aria">
            <legend className="fieldset-legend">Column Mapping (JSON)</legend>
            <div className="react-aria-control react-aria-Group">
              <div style={{ flex: 1 }}>
                <textarea
                  className={`control-input ${pendingColumnMapping ? "field-modified" : ""}`}
                  value={localColumnMapping}
                  onChange={(e) => handleColumnMappingInput(e.target.value)}
                  placeholder={(() => {
                    // 데이터가 있으면 실제 키를 기반으로 placeholder 생성
                    if (pendingData && pendingData.length > 0) {
                      const firstItem = pendingData[0] as Record<string, unknown>;
                      const keys = Object.keys(firstItem);
                      const exampleMapping: ColumnMapping = {};

                      keys.slice(0, 3).forEach((key) => { // 처음 3개 키만 예제로 사용
                        exampleMapping[key] = {
                          key: key,
                          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
                          type: typeof firstItem[key] === 'number' ? 'number' :
                            typeof firstItem[key] === 'boolean' ? 'boolean' :
                              typeof firstItem[key] === 'object' && firstItem[key] instanceof Date ? 'date' : 'string',
                          sortable: true,
                          width: 150
                        };
                      });

                      return JSON.stringify(exampleMapping, null, 2);
                    }

                    // 기본 placeholder
                    return `{
  "id": { "key": "id", "label": "ID", "type": "number", "width": 150 },
  "name": { "key": "name", "label": "이름", "type": "string", "width": 150 },
  "active": { "key": "active", "label": "활성", "type": "boolean", "width": 150 }
}`;
                  })()}
                  rows={8}
                />
              </div>
            </div>
          </fieldset>

          {/* Status Messages */}
          {error && <div className="error-message">⚠️ {error}</div>}

          {!error && pendingData && pendingData.length > 0 && (
            <div className="pending-message">
              📝 {pendingData.length}개 항목 준비됨 - Apply 버튼을 눌러 적용하세요
            </div>
          )}

          {!error &&
            (config as StaticCollectionConfig).data.length > 0 &&
            !pendingData && !columnMappingChanged && (
              <div className="success-message">
                ✓ {(config as StaticCollectionConfig).data.length}개 항목 로드됨
              </div>
            )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <Button
              onPress={handleLoadExample}
              children="Load Example"
            />

            {/* Discard 버튼 - 변경사항이 있을 때만 표시 */}
            {(jsonChanged || columnMappingChanged) && (
              <Button
                onClick={handleDiscard}
                children="Discard"
              />
            )}

            {/* Apply 버튼 */}
            <Button
              className={`apply-button ${(pendingData || pendingColumnMapping) ? "has-changes" : ""}`}
              onPress={handleApply}
              isDisabled={(!pendingData && !pendingColumnMapping) || !!error}
              children={(pendingData || pendingColumnMapping) ? "Apply" : "No Changes"}
            />
          </div>
        </>
      ) : (
        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Static Value</legend>
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
                className="lucide lucide-text"
                aria-hidden="true"
              >
                <path d="M17 6.1H3" />
                <path d="M21 12.1H3" />
                <path d="M15.1 18H3" />
              </svg>
            </label>
            <TextField>
              <Input
                className="control-input"
                placeholder="정적 값 입력"
                value={(config as StaticValueConfig).value?.toString() || ""}
                onChange={(e) => handleValueChange(e.target.value)}
              />
            </TextField>
          </div>
        </fieldset>
      )}
    </div>
  );
}
