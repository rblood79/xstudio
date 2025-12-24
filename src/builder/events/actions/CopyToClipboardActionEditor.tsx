import {
  TextField,
  Input,
  Label,
  Select,
  SelectValue,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import type { CopyToClipboardConfig } from "../types/eventTypes";
import { ElementPicker } from "../../panels/events/editors/ElementPicker";

export interface CopyToClipboardActionEditorProps {
  config: CopyToClipboardConfig;
  onChange: (config: CopyToClipboardConfig) => void;
}

export function CopyToClipboardActionEditor({
  config,
  onChange,
}: CopyToClipboardActionEditorProps) {
  const updateField = <K extends keyof CopyToClipboardConfig>(
    field: K,
    value: CopyToClipboardConfig[K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  const sourceOptions = [
    { value: "static", label: "Static text" },
    { value: "element", label: "Element content" },
    { value: "state", label: "From state" },
  ];

  const source = config.source || "static";

  return (
    <div className="copytoclipboard-action-editor">
      <div className="field">
        <Label className="field-label">Source</Label>
        <Select
          selectedKey={source}
          onSelectionChange={(key) =>
            updateField("source", key as CopyToClipboardConfig["source"])
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

      {source === "static" && (
        <TextField className="field">
          <Label className="field-label">Text</Label>
          <Input
            className="field-input"
            value={config.text}
            onChange={(e) => updateField("text", e.target.value)}
            placeholder="Text to copy"
          />
        </TextField>
      )}

      {source === "element" && (
        <ElementPicker
          label="Element ID"
          value={config.elementId || ""}
          onChange={(value) => updateField("elementId", value)}
          placeholder="Select element..."
        />
      )}

      {source === "state" && (
        <TextField className="field">
          <Label className="field-label">State Key</Label>
          <Input
            className="field-input"
            value={config.stateKey || ""}
            onChange={(e) => updateField("stateKey", e.target.value)}
            placeholder="user.email"
          />
        </TextField>
      )}
    </div>
  );
}
