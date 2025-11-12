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
import type { UpdateFormFieldConfig } from "../types/eventTypes";

export interface UpdateFormFieldActionEditorProps {
  config: UpdateFormFieldConfig;
  onChange: (config: UpdateFormFieldConfig) => void;
}

export function UpdateFormFieldActionEditor({
  config,
  onChange,
}: UpdateFormFieldActionEditorProps) {
  const [jsonValue, setJsonValue] = useState(() =>
    JSON.stringify(config.value, null, 2)
  );
  const [jsonError, setJsonError] = useState("");

  const updateField = <K extends keyof UpdateFormFieldConfig>(
    field: K,
    value: UpdateFormFieldConfig[K]
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
    <div className="updateformfield-action-editor">
      <TextField className="field">
        <Label className="field-label">Form ID (optional)</Label>
        <Input
          className="field-input"
          value={config.formId || ""}
          onChange={(e) => updateField("formId", e.target.value || undefined)}
          placeholder="signup-form"
        />
      </TextField>

      <TextField className="field">
        <Label className="field-label">Field Name</Label>
        <Input
          className="field-input"
          value={config.fieldName}
          onChange={(e) => updateField("fieldName", e.target.value)}
          placeholder="email, password, username"
        />
      </TextField>

      <div className="field">
        <Label className="field-label">Value Source</Label>
        <Select
          selectedKey={source}
          onSelectionChange={(key) =>
            updateField("source", key as UpdateFormFieldConfig["source"])
          }
        >
          <Button className="select-trigger">
            <SelectValue />
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-listbox">
              {sourceOptions.map((option) => (
                <ListBoxItem key={option.value} id={option.value}>
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
              ? '"user@example.com" or 123'
              : source === "state"
              ? "{{state.user.email}}"
              : "{{event.target.value}}"
          }
        />
        {jsonError && <div className="error-message">⚠️ {jsonError}</div>}
      </TextField>

      <div className="field-hint">
        <p><strong>Usage:</strong></p>
        <ul>
          <li>
            <strong>Field Name:</strong> Must match the <code>name</code> attribute
            of the form field
          </li>
          <li>
            <strong>Form ID:</strong> Optional. If provided, will only update fields
            within that form
          </li>
          <li>
            <strong>Value Source:</strong>
            <ul>
              <li><code>static</code> - Hardcoded value</li>
              <li><code>state</code> - From app state (e.g., <code>state.user.email</code>)</li>
              <li><code>event</code> - From event data (e.g., <code>event.target.value</code>)</li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
}
