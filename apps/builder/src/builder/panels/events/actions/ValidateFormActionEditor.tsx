import type { ValidateFormConfig } from "../types/eventTypes";
import { ElementPicker } from '../editors/ElementPicker';

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
      <ElementPicker
        label="Form ID"
        value={config.formId || ""}
        onChange={updateFormId}
        placeholder="Select form..."
        filter={(el) => el.tag === "Form"}
      />

      <div className="helper-text">
        <p>onValid 및 onInvalid 액션은 고급 설정에서 추가할 수 있습니다.</p>
      </div>
    </div>
  );
}
