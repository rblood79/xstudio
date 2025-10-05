import { TextField, Label, Input } from "react-aria-components";
import type {
  DataBindingType,
  StateCollectionConfig,
  StateValueConfig,
} from "../types";

export interface StateBindingEditorProps {
  bindingType: DataBindingType;
  config: StateCollectionConfig | StateValueConfig;
  onChange: (config: StateCollectionConfig | StateValueConfig) => void;
}

export function StateBindingEditor({
  bindingType,
  config,
  onChange,
}: StateBindingEditorProps) {
  const isCollection = bindingType === "collection";
  const collectionConfig = isCollection
    ? (config as StateCollectionConfig)
    : null;
  const valueConfig = !isCollection ? (config as StateValueConfig) : null;

  return (
    <div className="state-binding-editor">
      <h5 className="editor-subtitle">Zustand Store Binding</h5>

      <TextField
        className="store-path-field"
        value={config.storePath || ""}
        onChange={(value) => {
          onChange({
            ...config,
            storePath: value,
          });
        }}
      >
        <Label className="field-label">Store Path</Label>
        <Input className="field-input" placeholder="예: userStore.users" />
      </TextField>

      {isCollection && collectionConfig && (
        <TextField
          className="selector-field"
          value={collectionConfig.selector || ""}
          onChange={(value) => {
            onChange({
              ...collectionConfig,
              selector: value,
            });
          }}
        >
          <Label className="field-label">Selector (Optional)</Label>
          <Input
            className="field-input"
            placeholder="예: (users) => users.filter(u => u.active)"
          />
        </TextField>
      )}

      {!isCollection && valueConfig && (
        <TextField
          className="transform-field"
          value={valueConfig.transform || ""}
          onChange={(value) => {
            onChange({
              ...valueConfig,
              transform: value,
            });
          }}
        >
          <Label className="field-label">Transform (Optional)</Label>
          <Input
            className="field-input"
            placeholder="예: (value) => value.toUpperCase()"
          />
        </TextField>
      )}

      <div className="helper-text">
        <p className="helper-title">사용 예시:</p>
        <code className="helper-code">
          {isCollection
            ? "userStore.users → 배열 데이터"
            : "formStore.email → 단일 값"}
        </code>
      </div>
    </div>
  );
}
