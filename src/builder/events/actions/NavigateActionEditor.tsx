import { TextField, Input, Label, Checkbox } from "react-aria-components";
import type { NavigateConfig } from "../types/eventTypes";

export interface NavigateActionEditorProps {
  config: NavigateConfig;
  onChange: (config: NavigateConfig) => void;
}

export function NavigateActionEditor({
  config,
  onChange,
}: NavigateActionEditorProps) {
  const updateField = (
    field: keyof NavigateConfig,
    value: string | boolean
  ) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="navigate-action-editor">
      <TextField className="field">
        <Label className="field-label">Path</Label>
        <Input
          className="field-input"
          value={config.path}
          onChange={(e) => updateField("path", e.target.value)}
          placeholder="/dashboard"
        />
      </TextField>

      <Checkbox
        className="checkbox-field"
        isSelected={config.openInNewTab || false}
        onChange={(checked) => updateField("openInNewTab", checked)}
      >
        Open in new tab
      </Checkbox>

      <Checkbox
        className="checkbox-field"
        isSelected={config.replace || false}
        onChange={(checked) => updateField("replace", checked)}
      >
        Replace history
      </Checkbox>
    </div>
  );
}
