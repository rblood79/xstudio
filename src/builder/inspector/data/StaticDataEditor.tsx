import { useState } from "react";
import { TextField, Label, TextArea, Button } from "react-aria-components";
import type {
  DataBindingType,
  StaticCollectionConfig,
  StaticValueConfig,
} from "../types";

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
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState("");

  const handleValueChange = (value: string) => {
    if (!isCollection) {
      onChange({ value } as StaticValueConfig);
    }
  };

  const handleJSONInput = (input: string) => {
    setJsonInput(input);
    setError("");

    if (!input.trim()) {
      if (isCollection) {
        onChange({ data: [] } as StaticCollectionConfig);
      }
      return;
    }

    try {
      const parsed = JSON.parse(input);
      if (isCollection) {
        if (Array.isArray(parsed)) {
          onChange({ data: parsed } as StaticCollectionConfig);
        } else {
          setError("Collection 바인딩은 배열이어야 합니다.");
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      setError("유효한 JSON이 아닙니다.");
    }
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
      setJsonInput(example);
      handleJSONInput(example);
    } else {
      handleValueChange(example);
    }
  };

  return (
    <div className="static-data-editor">
      <div className="editor-header">
        <h5 className="editor-subtitle">Static Data</h5>
        <Button className="example-button" onPress={handleLoadExample}>
          예시 불러오기
        </Button>
      </div>

      {isCollection ? (
        <>
          <TextField className="json-field">
            <Label className="field-label">JSON Array</Label>
            <TextArea
              className="json-textarea"
              value={jsonInput}
              onChange={(e) => handleJSONInput(e.target.value)}
              rows={10}
            />
          </TextField>

          {error && <div className="error-message">⚠️ {error}</div>}

          {!error && (config as StaticCollectionConfig).data.length > 0 && (
            <div className="success-message">
              ✓ {(config as StaticCollectionConfig).data.length}개 항목 로드됨
            </div>
          )}
        </>
      ) : (
        <TextField
          className="value-field"
          value={(config as StaticValueConfig).value?.toString() || ""}
          onChange={handleValueChange}
        >
          <Label className="field-label">Value</Label>
          <input className="field-input" placeholder="정적 값 입력" />
        </TextField>
      )}

      <div className="helper-text">
        <p className="helper-title">💡 Tip:</p>
        <p className="helper-content">
          {isCollection
            ? "JSON 배열 형태로 데이터를 입력하세요. 각 객체는 동일한 구조여야 합니다."
            : "문자열, 숫자, 불린 값을 입력할 수 있습니다."}
        </p>
      </div>
    </div>
  );
}
