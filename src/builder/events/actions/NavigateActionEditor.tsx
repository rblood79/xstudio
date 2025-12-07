import { TextField, Input, Label, Checkbox } from "react-aria-components";
import type { NavigateConfig } from "../types/eventTypes";

export interface NavigateActionEditorProps {
  config: NavigateConfig;
  onChange: (config: NavigateConfig) => void;
}

/**
 * 경로를 정규화하여 항상 "/"로 시작하도록 함
 * 표준 URL 경로 형식: /page-name
 */
function normalizePath(path: string): string {
  if (!path) return '/';
  const trimmed = path.trim();
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function NavigateActionEditor({
  config,
  onChange,
}: NavigateActionEditorProps) {
  const updateField = (
    field: keyof NavigateConfig,
    value: string | boolean
  ) => {
    // path 필드는 정규화하여 항상 "/"로 시작하도록 함
    if (field === 'path' && typeof value === 'string') {
      onChange({ ...config, [field]: normalizePath(value) });
    } else {
      onChange({ ...config, [field]: value });
    }
  };

  return (
    <div className="navigate-action-editor">
      <TextField className="field">
        <Label className="field-label">Path</Label>
        <Input
          className="field-input"
          value={config.path}
          onChange={(e) => updateField("path", e.target.value)}
          placeholder="/page-name"
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
