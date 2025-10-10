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
}

export function StaticDataEditor({
  bindingType,
  config,
  onChange,
}: StaticDataEditorProps) {
  const isCollection = bindingType === "collection";

  // 초기값 설정: config에 데이터가 있으면 표시
  const initialJson =
    isCollection && (config as StaticCollectionConfig).data?.length > 0
      ? JSON.stringify((config as StaticCollectionConfig).data, null, 2)
      : "";

  // Local state로 관리 (즉각 적용 방지)
  const [localJsonInput, setLocalJsonInput] = useState(initialJson);
  const [error, setError] = useState("");
  const [pendingData, setPendingData] = useState<unknown[] | null>(null);

  // 변경 감지
  const jsonChanged = useMemo(() => {
    const currentJson = isCollection
      ? JSON.stringify((config as StaticCollectionConfig).data || [], null, 2)
      : "";
    return localJsonInput !== currentJson;
  }, [localJsonInput, config, isCollection]);

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

  const handleApply = () => {
    if (pendingData && isCollection) {
      console.log("✅ Static Data Apply:", pendingData);
      onChange({ data: pendingData } as StaticCollectionConfig);
      setPendingData(null);
    }
  };

  const handleDiscard = () => {
    setLocalJsonInput(initialJson);
    setError("");
    setPendingData(null);
  };

  const handleLoadExample = () => {
    const example = isCollection
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

    if (isCollection) {
      handleJSONInput(example);
    } else {
      handleValueChange(example);
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

          {/* Status Messages */}
          {error && <div className="error-message">⚠️ {error}</div>}

          {!error && pendingData && pendingData.length > 0 && (
            <div className="pending-message">
              📝 {pendingData.length}개 항목 준비됨 - Apply 버튼을 눌러 적용하세요
            </div>
          )}

          {!error &&
            (config as StaticCollectionConfig).data.length > 0 &&
            !pendingData && (
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
            {jsonChanged && (
              <Button onClick={handleDiscard} className="discard-button">
                Discard
              </Button>
            )}

            {/* Apply 버튼 */}
            <Button
              className={`apply-button ${pendingData ? "has-changes" : ""}`}
              onPress={handleApply}
              isDisabled={!pendingData || !!error}
            >
              {pendingData ? "Apply" : "No Changes"}
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
