import {
  TextField,
  Input,
  Label,
  NumberField,
  Select,
  SelectValue,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import type { ShowToastConfig } from "../types/eventTypes";

export interface ShowToastActionEditorProps {
  config: ShowToastConfig;
  onChange: (config: ShowToastConfig) => void;
}

export function ShowToastActionEditor({
  config,
  onChange,
}: ShowToastActionEditorProps) {
  const types = ["info", "success", "warning", "error"];

  const updateMessage = (message: string) => {
    onChange({ ...config, message });
  };

  const updateType = (type: string) => {
    onChange({ ...config, type: type as ShowToastConfig["type"] });
  };

  const updateDuration = (duration: number) => {
    onChange({ ...config, duration });
  };

  return (
    <div className="showtoast-action-editor">
      <TextField className="field">
        <Label className="field-label">Message</Label>
        <Input
          className="field-input"
          value={config.message}
          onChange={(e) => updateMessage(e.target.value)}
          placeholder="Operation successful!"
        />
      </TextField>

      <div className="field">
        <Label className="field-label">Type</Label>
        <Select
          selectedKey={config.type || "info"}
          onSelectionChange={(key) => updateType(key as string)}
        >
          <Button className="select-trigger">
            <SelectValue />
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-listbox">
              {types.map((type) => (
                <ListBoxItem key={type} id={type}>
                  {type}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      <NumberField
        className="field"
        value={config.duration || 3000}
        onChange={(value) => updateDuration(value)}
      >
        <Label className="field-label">Duration (ms)</Label>
        <Input className="field-input" />
      </NumberField>
    </div>
  );
}
