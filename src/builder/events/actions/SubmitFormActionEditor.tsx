import { TextField, Input, Label } from "react-aria-components";

export interface SubmitFormConfig {
  formId: string;
}

export interface SubmitFormActionEditorProps {
  config: SubmitFormConfig;
  onChange: (config: SubmitFormConfig) => void;
}

export function SubmitFormActionEditor({
  config,
  onChange,
}: SubmitFormActionEditorProps) {
  const updateFormId = (formId: string) => {
    onChange({ ...config, formId });
  };

  return (
    <div className="submitform-action-editor">
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
        Triggers form submission (typically used with API call actions)
      </p>
    </div>
  );
}
