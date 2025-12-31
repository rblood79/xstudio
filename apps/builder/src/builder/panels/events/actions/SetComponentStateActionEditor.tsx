import {
  TextField,
  Input,
  Label,
  TextArea,
  Select,
  SelectValue,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import { useState } from "react";
import type { SetComponentStateConfig } from "../types/eventTypes";
import { ComponentSelector } from "../components/ComponentSelector";

export interface SetComponentStateActionEditorProps {
  config: SetComponentStateConfig;
  onChange: (config: SetComponentStateConfig) => void;
}

export function SetComponentStateActionEditor({
  config,
  onChange,
}: SetComponentStateActionEditorProps) {
  const [jsonValue, setJsonValue] = useState(() =>
    JSON.stringify(config.value, null, 2)
  );
  const [jsonError, setJsonError] = useState("");

  const updateField = <K extends keyof SetComponentStateConfig>(
    field: K,
    value: SetComponentStateConfig[K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  const updateValue = (value: string) => {
    setJsonValue(value);
    try {
      const parsed = JSON.parse(value);
      onChange({ ...config, value: parsed });
      setJsonError("");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      setJsonError("유효한 JSON이 아닙니다");
    }
  };

  const sourceOptions = [
    { value: "static", label: "Static value" },
    { value: "state", label: "From app state" },
    { value: "event", label: "From event data" },
  ];

  const source = config.source || "static";

  return (
    <div className="setcomponentstate-action-editor">
      <ComponentSelector
        value={config.targetId}
        onChange={(targetId) => updateField("targetId", targetId)}
        label="Target Component"
        placeholder="Select component to control"
      />

      <TextField className="field">
        <Label className="field-label">State Path</Label>
        <Input
          className="field-input"
          value={config.statePath}
          onChange={(e) => updateField("statePath", e.target.value)}
          placeholder="selectedKeys, isOpen, value"
        />
      </TextField>

      <div className="field">
        <Label className="field-label">Value Source</Label>
        <Select
          selectedKey={source}
          onSelectionChange={(key) =>
            updateField("source", key as SetComponentStateConfig["source"])
          }
        >
          <Button className="select-trigger">
            <SelectValue />
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-listbox">
              {sourceOptions.map((option) => (
                <ListBoxItem key={option.value} id={option.value} textValue={option.label}>
                  {option.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      <TextField className="field">
        <Label className="field-label">Value (JSON)</Label>
        <TextArea
          className="field-textarea"
          value={jsonValue}
          onChange={(e) => updateValue(e.target.value)}
          rows={4}
          placeholder={
            source === "static"
              ? '["item-1", "item-2"] or true'
              : source === "state"
              ? "{{state.selectedItems}}"
              : "{{event.target.value}}"
          }
        />
        {jsonError && <div className="error-message">⚠️ {jsonError}</div>}
      </TextField>

      <div className="field-hint">
        <p><strong>Common state paths:</strong></p>
        <ul>
          <li><code>selectedKeys</code> - Selection state (ListBox, GridList, Select)</li>
          <li><code>isOpen</code> - Open/close state (Modal, Popover, Select)</li>
          <li><code>value</code> - Input value (TextField, NumberField, Slider)</li>
          <li><code>isDisabled</code> - Disabled state (any component)</li>
        </ul>
      </div>
    </div>
  );
}
