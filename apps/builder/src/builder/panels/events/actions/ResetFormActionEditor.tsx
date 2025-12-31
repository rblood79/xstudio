import { ElementPicker } from '../editors/ElementPicker';

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
      <ElementPicker
        label="Form ID"
        value={config.formId || ""}
        onChange={updateFormId}
        placeholder="Select form..."
        filter={(el) => el.tag === "Form"}
      />

      <p className="field-hint">
        Resets all form fields to their initial values
      </p>
    </div>
  );
}
