import React from "react";
import { Database, Filter, Workflow } from "lucide-react";
import { Button } from "../../components/list";
import { PropertyInput } from "../components";
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
      <PropertyInput
        label="Store Path"
        icon={Database}
        value={localConfig.storePath || ""}
        placeholder="예: userStore.users"
        onChange={(value) => {
          setLocalConfig({
            ...localConfig,
            storePath: value,
          });
        }}
      />

      {/* Selector for Collection */}
      {isCollection && collectionConfig && (
        <PropertyInput
          label="Selector (Optional)"
          icon={Filter}
          value={collectionConfig.selector || ""}
          placeholder="예: (users) => users.filter(u => u.active)"
          onChange={(value) => {
            setLocalConfig({
              ...collectionConfig,
              selector: value,
            });
          }}
        />
      )}

      {/* Transform for Value */}
      {!isCollection && valueConfig && (
        <PropertyInput
          label="Transform (Optional)"
          icon={Workflow}
          value={valueConfig.transform || ""}
          placeholder="예: (value) => value.toUpperCase()"
          onChange={(value) => {
            setLocalConfig({
              ...valueConfig,
              transform: value,
            });
          }}
        />
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
