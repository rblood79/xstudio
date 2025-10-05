import { TextField, Input, Label } from "react-aria-components";
import type { ValidateFormConfig } from "../../types";

export interface ValidateFormActionEditorProps {
  config: ValidateFormConfig;
  onChange: (config: ValidateFormConfig) => void;
}

export function ValidateFormActionEditor({
  config,
  onChange,
}: ValidateFormActionEditorProps) {
  const updateFormId = (formId: string) => {
    onChange({ ...config, formId });
  };

  return (
    <div className="validateform-action-editor">
      <TextField className="field">
        <Label className="field-label">Form ID</Label>
        <Input
          className="field-input"
          value={config.formId}
          onChange={(e) => updateFormId(e.target.value)}
          placeholder="loginForm"
        />
      </TextField>

      <div className="helper-text">
        <p>onValid 및 onInvalid 액션은 고급 설정에서 추가할 수 있습니다.</p>
      </div>
    </div>
  );
}
