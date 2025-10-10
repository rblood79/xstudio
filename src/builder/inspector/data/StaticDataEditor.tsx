import { useState, useMemo } from "react";
import { TextField, Input } from "react-aria-components";
import { Button } from "../../components/list";
import type {
  DataBindingType,
  StaticCollectionConfig,
  StaticValueConfig,
} from "../types";
import "./data.css";


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
  const [pendingColumnMapping, setPendingColumnMapping] = useState<Record<string, any> | null>(null);

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
      return;
    }

    try {
      const parsed = JSON.parse(input);
      if (isCollection) {
        if (Array.isArray(parsed)) {
          // Apply 버튼으로 적용할 수 있도록 pendingData에 저장
          setPendingData(parsed);
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
        const newConfig = { ...config, ...updates } as StaticCollectionConfig;
        onChange(newConfig);

        // Table 컴포넌트 props 업데이트
        if (onTablePropsUpdate) {
          const tableProps: Record<string, unknown> = {};

          if (updates.data) {
            tableProps.data = updates.data;
            tableProps.enableAsyncLoading = false; // 정적 데이터 사용 시 비활성화
          }

          if (updates.columnMapping) {
            // 컬럼 매핑에서 컬럼 정의 생성
            const columns = Object.entries(updates.columnMapping).map(([key, mapping]: [string, any]) => ({
              key: mapping.key || key,
              label: mapping.label || key,
              type: mapping.type || 'string',
              sortable: mapping.sortable !== false,
              width: mapping.width || 150,
              align: 'left',
            }));
            tableProps.columns = columns;
          }

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
    const exampleData = isCollection
      ? JSON.stringify(
        [
          { id: 1, name: "Item 1", active: true },
          { id: 2, name: "Item 2", active: false },
          { id: 3, name: "Item 3", active: true },
        ],
        null,
        2
      )
      : "Hello World";

    const exampleColumnMapping = JSON.stringify({
      id: { key: "id", label: "ID", type: "number", sortable: true },
      name: { key: "name", label: "이름", type: "string", sortable: true },
      active: { key: "active", label: "활성", type: "boolean", sortable: true },
    }, null, 2);

    if (isCollection) {
      handleJSONInput(exampleData);
      setLocalColumnMapping(exampleColumnMapping);
      setPendingColumnMapping(JSON.parse(exampleColumnMapping));
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
  { "id": 1, "name": "Item 1", "active": true },
  { "id": 2, "name": "Item 2", "active": false },
  { "id": 3, "name": "Item 3", "active": true }
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
                  placeholder={`{
  "id": { "key": "id", "label": "ID", "type": "number" },
  "name": { "key": "name", "label": "이름", "type": "string" },
  "active": { "key": "active", "label": "활성", "type": "boolean" }
}`}
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
              className="example-button"
            >
              Load Example
            </Button>

            {/* Discard 버튼 - 변경사항이 있을 때만 표시 */}
            {(jsonChanged || columnMappingChanged) && (
              <Button onClick={handleDiscard} className="discard-button">
                Discard
              </Button>
            )}

            {/* Apply 버튼 */}
            <Button
              className={`apply-button ${(pendingData || pendingColumnMapping) ? "has-changes" : ""}`}
              onPress={handleApply}
              isDisabled={(!pendingData && !pendingColumnMapping) || !!error}
            >
              {(pendingData || pendingColumnMapping) ? "Apply" : "No Changes"}
            </Button>
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
