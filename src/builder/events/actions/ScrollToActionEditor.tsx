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
  Checkbox,
} from "react-aria-components";
import type { ScrollToConfig } from "../../types";

export interface ScrollToActionEditorProps {
  config: ScrollToConfig;
  onChange: (config: ScrollToConfig) => void;
}

export function ScrollToActionEditor({
  config,
  onChange,
}: ScrollToActionEditorProps) {
  const updateField = <K extends keyof ScrollToConfig>(
    field: K,
    value: ScrollToConfig[K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  const positionOptions = [
    { value: "top", label: "Top" },
    { value: "center", label: "Center" },
    { value: "bottom", label: "Bottom" },
  ];

  return (
    <div className="scrollto-action-editor">
      <TextField className="field">
        <Label className="field-label">Element ID</Label>
        <Input
          className="field-input"
          value={config.elementId || ""}
          onChange={(e) => updateField("elementId", e.target.value || undefined)}
          placeholder="element-id"
        />
      </TextField>

      <div className="field">
        <Label className="field-label">Position</Label>
        <Select
          selectedKey={config.position || "top"}
          onSelectionChange={(key) =>
            updateField("position", key as "top" | "center" | "bottom")
          }
        >
          <Button className="select-trigger">
            <SelectValue />
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-listbox">
              {positionOptions.map((option) => (
                <ListBoxItem key={option.value} id={option.value}>
                  {option.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      <Checkbox
        className="checkbox-field"
        isSelected={config.smooth !== false}
        onChange={(checked) => updateField("smooth", checked)}
      >
        Smooth scroll
      </Checkbox>

      <TextField className="field">
        <Label className="field-label">Offset (px)</Label>
        <Input
          className="field-input"
          type="number"
          value={String(config.offset || 0)}
          onChange={(e) =>
            updateField("offset", Number(e.target.value) || undefined)
          }
          placeholder="0"
        />
      </TextField>
    </div>
  );
}
