import { TextField, Input } from "react-aria-components";
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
    <div className="state-binding-editor component-props">
      {/* Store Path */}
      <fieldset className="properties-aria">
        <legend className="fieldset-legend">Store Path</legend>
        <div className="react-aria-control react-aria-Group">
          <label className="control-label">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-gray-400)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-database"
              aria-hidden="true"
            >
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5V19A9 3 0 0 0 21 19V5" />
              <path d="M3 12A9 3 0 0 0 21 12" />
            </svg>
          </label>
          <TextField
            value={config.storePath || ""}
            onChange={(value) => {
              onChange({
                ...config,
                storePath: value,
              });
            }}
          >
            <Input className="control-input" placeholder="예: userStore.users" />
          </TextField>
        </div>
      </fieldset>

      {/* Selector for Collection */}
      {isCollection && collectionConfig && (
        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Selector (Optional)</legend>
          <div className="react-aria-control react-aria-Group">
            <label className="control-label">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-gray-400)"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-filter"
                aria-hidden="true"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </label>
            <TextField
              value={collectionConfig.selector || ""}
              onChange={(value) => {
                onChange({
                  ...collectionConfig,
                  selector: value,
                });
              }}
            >
              <Input
                className="control-input"
                placeholder="예: (users) => users.filter(u => u.active)"
              />
            </TextField>
          </div>
        </fieldset>
      )}

      {/* Transform for Value */}
      {!isCollection && valueConfig && (
        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Transform (Optional)</legend>
          <div className="react-aria-control react-aria-Group">
            <label className="control-label">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-gray-400)"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-workflow"
                aria-hidden="true"
              >
                <rect width="8" height="8" x="3" y="3" rx="2" />
                <path d="M7 11v4a2 2 0 0 0 2 2h4" />
                <rect width="8" height="8" x="13" y="13" rx="2" />
              </svg>
            </label>
            <TextField
              value={valueConfig.transform || ""}
              onChange={(value) => {
                onChange({
                  ...valueConfig,
                  transform: value,
                });
              }}
            >
              <Input
                className="control-input"
                placeholder="예: (value) => value.toUpperCase()"
              />
            </TextField>
          </div>
        </fieldset>
      )}

      {/* Helper Text */}
      <fieldset className="properties-aria">
        <legend className="fieldset-legend">사용 예시</legend>
        <div className="helper-text">
          <code className="helper-code">
            {isCollection
              ? "userStore.users → 배열 데이터"
              : "formStore.email → 단일 값"}
          </code>
        </div>
      </fieldset>
    </div>
  );
}
