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
import type { FilterCollectionConfig } from "../types/eventTypes";
import { ComponentSelector } from "../components/ComponentSelector";

export interface FilterCollectionActionEditorProps {
  config: FilterCollectionConfig;
  onChange: (config: FilterCollectionConfig) => void;
}

export function FilterCollectionActionEditor({
  config,
  onChange,
}: FilterCollectionActionEditorProps) {
  const [fieldValueJson, setFieldValueJson] = useState(() =>
    JSON.stringify(config.fieldValue, null, 2)
  );
  const [jsonError, setJsonError] = useState("");

  const updateField = <K extends keyof FilterCollectionConfig>(
    field: K,
    value: FilterCollectionConfig[K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  const updateFieldValue = (value: string) => {
    setFieldValueJson(value);
    try {
      const parsed = JSON.parse(value);
      onChange({ ...config, fieldValue: parsed });
      setJsonError("");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      setJsonError("유효한 JSON이 아닙니다");
    }
  };

  const filterModeOptions = [
    { value: "text", label: "Text Search" },
    { value: "function", label: "Custom Function" },
    { value: "field", label: "Field Match" },
  ];

  const collectionTypes = ["ListBox", "GridList", "Select", "ComboBox", "TagGroup"];

  return (
    <div className="filtercollection-action-editor">
      <ComponentSelector
        value={config.targetId}
        onChange={(targetId) => updateField("targetId", targetId)}
        filterByType={collectionTypes}
        label="Target Collection"
        placeholder="Select ListBox, GridList, or other collection"
      />

      <div className="field">
        <Label className="field-label">Filter Mode</Label>
        <Select
          selectedKey={config.filterMode}
          onSelectionChange={(key) =>
            updateField("filterMode", key as FilterCollectionConfig["filterMode"])
          }
        >
          <Button className="select-trigger">
            <SelectValue />
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-listbox">
              {filterModeOptions.map((option) => (
                <ListBoxItem key={option.value} id={option.value} textValue={option.label}>
                  {option.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      {config.filterMode === "text" && (
        <TextField className="field">
          <Label className="field-label">Search Query</Label>
          <Input
            className="field-input"
            value={config.query || ""}
            onChange={(e) => updateField("query", e.target.value)}
            placeholder="Enter search text"
          />
        </TextField>
      )}

      {config.filterMode === "function" && (
        <TextField className="field">
          <Label className="field-label">Filter Function</Label>
          <TextArea
            className="field-textarea code-editor"
            value={config.filterFn || ""}
            onChange={(e) => updateField("filterFn", e.target.value)}
            rows={4}
            placeholder="item => item.category === 'premium' && item.price > 100"
          />
          <p className="field-hint">
            Write a JavaScript arrow function that returns true for items to keep.
          </p>
        </TextField>
      )}

      {config.filterMode === "field" && (
        <>
          <TextField className="field">
            <Label className="field-label">Field Name</Label>
            <Input
              className="field-input"
              value={config.fieldName || ""}
              onChange={(e) => updateField("fieldName", e.target.value)}
              placeholder="category, status, type"
            />
          </TextField>

          <TextField className="field">
            <Label className="field-label">Field Value (JSON)</Label>
            <TextArea
              className="field-textarea"
              value={fieldValueJson}
              onChange={(e) => updateFieldValue(e.target.value)}
              rows={2}
              placeholder='"premium" or ["active", "pending"]'
            />
            {jsonError && <div className="error-message">⚠️ {jsonError}</div>}
          </TextField>
        </>
      )}

      <div className="field-hint">
        <p><strong>Filter Modes:</strong></p>
        <ul>
          <li>
            <strong>Text Search:</strong> Simple text matching across all fields
          </li>
          <li>
            <strong>Custom Function:</strong> Advanced filtering with JavaScript
          </li>
          <li>
            <strong>Field Match:</strong> Filter by specific field value
          </li>
        </ul>
        <p>
          Examples:
          <br />• Text: "premium user" searches all text fields
          <br />• Function: item =&gt; item.price &gt; 100
          <br />• Field: category = "electronics"
        </p>
      </div>
    </div>
  );
}
