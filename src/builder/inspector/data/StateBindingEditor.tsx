import React from "react";
import { TextField, Input, Button } from "react-aria-components";
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

  // 로컬 상태로 관리
  const [localConfig, setLocalConfig] = React.useState<StateCollectionConfig | StateValueConfig>(config);

  // config가 외부에서 변경되면 로컬 상태 업데이트
  React.useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const collectionConfig = isCollection
    ? (localConfig as StateCollectionConfig)
    : null;
  const valueConfig = !isCollection ? (localConfig as StateValueConfig) : null;

  // Apply 버튼 핸들러
  const handleApply = () => {
    onChange(localConfig);
  };

  // Discard 버튼 핸들러
  const handleDiscard = () => {
    setLocalConfig(config);
  };

  // 변경 여부 확인
  const hasChanges = JSON.stringify(localConfig) !== JSON.stringify(config);

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
            value={localConfig.storePath || ""}
            onChange={(value) => {
              setLocalConfig({
                ...localConfig,
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
                setLocalConfig({
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
                setLocalConfig({
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

      {/* Apply/Discard Buttons */}
      <fieldset className="properties-aria">
        <div className="button-group">
          <Button
            className="apply-button"
            onPress={handleApply}
            isDisabled={!hasChanges}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Apply
          </Button>
          <Button
            className="discard-button"
            onPress={handleDiscard}
            isDisabled={!hasChanges}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Discard
          </Button>
        </div>
      </fieldset>
    </div>
  );
}
