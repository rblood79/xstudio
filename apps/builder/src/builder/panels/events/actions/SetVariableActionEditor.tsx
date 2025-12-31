import {
  TextField,
  Input,
  Label,
  TextArea,
  Switch,
  Select,
  SelectValue,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import { useState, useMemo } from "react";
import { useDataStore } from "../../../stores/data";

export interface SetVariableConfig {
  variableName: string;
  value: unknown;
  persist?: boolean;
}

export interface SetVariableActionEditorProps {
  config: SetVariableConfig;
  onChange: (config: SetVariableConfig) => void;
}

export function SetVariableActionEditor({
  config,
  onChange,
}: SetVariableActionEditorProps) {
  const [jsonValue, setJsonValue] = useState(() =>
    JSON.stringify(config.value ?? "", null, 2)
  );
  const [jsonError, setJsonError] = useState("");

  // DataStore에서 변수 목록 가져오기
  const variables = useDataStore((state) => state.variables);
  const variableList = useMemo(
    () => Array.from(variables.values()),
    [variables]
  );

  // 선택된 변수의 타입 가져오기
  const selectedVariable = useMemo(
    () => variableList.find((v) => v.name === config.variableName),
    [variableList, config.variableName]
  );

  const updateVariableName = (name: string) => {
    // 변수 선택 시 해당 변수의 기본값으로 초기화
    const variable = variableList.find((v) => v.name === name);
    const defaultValue = variable?.defaultValue ?? "";
    setJsonValue(JSON.stringify(defaultValue, null, 2));
    onChange({
      ...config,
      variableName: name,
      value: defaultValue,
    });
  };

  const updateValue = (value: string) => {
    setJsonValue(value);
    try {
      const parsed = JSON.parse(value);
      onChange({ ...config, value: parsed });
      setJsonError("");
    } catch {
      // JSON 파싱 실패 시 문자열로 저장
      onChange({ ...config, value: value });
      setJsonError("");
    }
  };

  // Boolean 타입일 때 간단한 토글 UI
  const isBooleanType = selectedVariable?.type === "boolean";

  return (
    <div className="setvariable-action-editor">
      {/* Variable 선택 */}
      <div className="field">
        <Label className="field-label">Variable</Label>
        {variableList.length > 0 ? (
          <Select
            selectedKey={config.variableName || ""}
            onSelectionChange={(key) => updateVariableName(key as string)}
          >
            <Button className="select-trigger">
              <SelectValue>{"Select variable..."}</SelectValue>
            </Button>
            <Popover className="select-popover">
              <ListBox className="select-listbox">
                {variableList.map((variable) => (
                  <ListBoxItem key={variable.name} id={variable.name} textValue={variable.name}>
                    <span>{variable.name}</span>
                    <span className="variable-type-badge">
                      {variable.type} · {variable.scope}
                    </span>
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </Select>
        ) : (
          <TextField className="field">
            <Input
              className="field-input"
              value={config.variableName || ""}
              onChange={(e) =>
                onChange({ ...config, variableName: e.target.value })
              }
              placeholder="variableName"
            />
          </TextField>
        )}
      </div>

      {/* Value 입력 - Boolean 타입일 때는 Switch, 아니면 JSON 입력 */}
      {isBooleanType ? (
        <div className="field">
          <Label className="field-label">Value</Label>
          <div className="boolean-toggle">
            <Switch
              isSelected={config.value === true}
              onChange={(isSelected) =>
                onChange({ ...config, value: isSelected })
              }
            >
              <span className="switch-label">
                {config.value === true ? "true" : "false"}
              </span>
            </Switch>
          </div>
        </div>
      ) : (
        <TextField className="field">
          <Label className="field-label">Value (JSON)</Label>
          <TextArea
            className="field-textarea"
            value={jsonValue}
            onChange={(e) => updateValue(e.target.value)}
            rows={3}
            placeholder={
              selectedVariable?.type === "string"
                ? '"your text here"'
                : selectedVariable?.type === "number"
                ? "0"
                : selectedVariable?.type === "array"
                ? "[]"
                : selectedVariable?.type === "object"
                ? "{}"
                : "value"
            }
          />
          {jsonError && <div className="error-message">{jsonError}</div>}
        </TextField>
      )}

      {/* 변수 정보 표시 */}
      {selectedVariable && (
        <div className="variable-info">
          <span className="info-label">Type:</span>
          <span className="info-value">{selectedVariable.type}</span>
          <span className="info-label">Scope:</span>
          <span className="info-value">{selectedVariable.scope}</span>
        </div>
      )}
    </div>
  );
}
