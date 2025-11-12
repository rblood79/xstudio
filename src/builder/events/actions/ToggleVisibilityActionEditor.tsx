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
import type { ToggleVisibilityConfig } from "../types/eventTypes";

export interface ToggleVisibilityActionEditorProps {
  config: ToggleVisibilityConfig;
  onChange: (config: ToggleVisibilityConfig) => void;
}

export function ToggleVisibilityActionEditor({
  config,
  onChange,
}: ToggleVisibilityActionEditorProps) {
  const updateField = <K extends keyof ToggleVisibilityConfig>(
    field: K,
    value: ToggleVisibilityConfig[K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  const showOptions = [
    { value: "", label: "Toggle" },
    { value: "true", label: "Show" },
    { value: "false", label: "Hide" },
  ];

  const easingOptions = [
    { value: "ease", label: "Ease" },
    { value: "ease-in", label: "Ease In" },
    { value: "ease-out", label: "Ease Out" },
    { value: "ease-in-out", label: "Ease In Out" },
    { value: "linear", label: "Linear" },
  ];

  return (
    <div className="togglevisibility-action-editor">
      <TextField className="field">
        <Label className="field-label">Element ID</Label>
        <Input
          className="field-input"
          value={config.elementId}
          onChange={(e) => updateField("elementId", e.target.value)}
          placeholder="sidebar"
        />
      </TextField>

      <div className="field">
        <Label className="field-label">Action</Label>
        <Select
          selectedKey={
            config.show === undefined
              ? ""
              : config.show === true
              ? "true"
              : "false"
          }
          onSelectionChange={(key) => {
            const value =
              key === "" ? undefined : key === "true" ? true : false;
            updateField("show", value);
          }}
        >
          <Button className="select-trigger">
            <SelectValue />
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-listbox">
              {showOptions.map((option) => (
                <ListBoxItem key={option.value} id={option.value}>
                  {option.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      <TextField className="field">
        <Label className="field-label">Duration (ms)</Label>
        <Input
          className="field-input"
          type="number"
          value={String(config.duration || 300)}
          onChange={(e) =>
            updateField("duration", Number(e.target.value) || undefined)
          }
          placeholder="300"
        />
      </TextField>

      <div className="field">
        <Label className="field-label">Easing</Label>
        <Select
          selectedKey={config.easing || "ease"}
          onSelectionChange={(key) =>
            updateField(
              "easing",
              key as ToggleVisibilityConfig["easing"]
            )
          }
        >
          <Button className="select-trigger">
            <SelectValue />
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-listbox">
              {easingOptions.map((option) => (
                <ListBoxItem key={option.value} id={option.value}>
                  {option.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>
    </div>
  );
}
