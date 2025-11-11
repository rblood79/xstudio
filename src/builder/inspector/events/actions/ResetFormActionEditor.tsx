import { TextField, Input, Label } from "react-aria-components";

export interface ResetFormConfig {
  formId: string;
}

export interface ResetFormActionEditorProps {
  config: ResetFormConfig;
  onChange: (config: ResetFormConfig) => void;
}

export function ResetFormActionEditor({
  config,
  onChange,
}: ResetFormActionEditorProps) {
  const updateFormId = (formId: string) => {
    onChange({ ...config, formId });
  };

  return (
    <div className="resetform-action-editor">
      <TextField className="field">
        <Label className="field-label">Form ID</Label>
        <Input
          className="field-input"
          value={config.formId}
          onChange={(e) => updateFormId(e.target.value)}
          placeholder="signup-form"
        />
      </TextField>

      <p className="field-hint">
        Resets all form fields to their initial values
      </p>
    </div>
  );
}
