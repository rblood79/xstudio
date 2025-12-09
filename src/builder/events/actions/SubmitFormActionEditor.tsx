import { ElementPicker } from "../../panels/events/editors/ElementPicker";

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
      <ElementPicker
        label="Form ID"
        value={config.formId || ""}
        onChange={updateFormId}
        placeholder="Select form..."
        filter={(el) => el.tag === "Form"}
      />

      <p className="field-hint">
        Triggers form submission (typically used with API call actions)
      </p>
    </div>
  );
}
