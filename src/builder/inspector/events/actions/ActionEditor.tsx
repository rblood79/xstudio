import {
  Select,
  SelectValue,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  Label,
} from "react-aria-components";
import type {
  EventAction,
  NavigateConfig,
  SetStateConfig,
  APICallConfig,
  ShowModalConfig,
  ShowToastConfig,
  ValidateFormConfig,
} from "../../types";
import { NavigateActionEditor } from "./NavigateActionEditor";
import { SetStateActionEditor } from "./SetStateActionEditor";
import { APICallActionEditor } from "./APICallActionEditor";
import { ShowModalActionEditor } from "./ShowModalActionEditor";
import { ShowToastActionEditor } from "./ShowToastActionEditor";
import { ValidateFormActionEditor } from "./ValidateFormActionEditor";

export interface ActionEditorProps {
  action: EventAction;
  onChange: (action: EventAction) => void;
}

export function ActionEditor({ action, onChange }: ActionEditorProps) {
  const actionTypes = [
    { value: "navigate", label: "Navigate" },
    { value: "setState", label: "Set State" },
    { value: "apiCall", label: "API Call" },
    { value: "showModal", label: "Show Modal" },
    { value: "showToast", label: "Show Toast" },
    { value: "validateForm", label: "Validate Form" },
  ];

  const handleTypeChange = (newType: string) => {
    const defaultConfigs: Record<string, unknown> = {
      navigate: { path: "/" },
      setState: { storePath: "", value: "" },
      apiCall: { endpoint: "", method: "GET" },
      showModal: { modalId: "" },
      showToast: { message: "", variant: "info", duration: 3000 },
      validateForm: { formId: "" },
    };

    onChange({
      type: newType as EventAction["type"],
      config: defaultConfigs[newType] as EventAction["config"],
    });
  };

  return (
    <div className="action-editor">
      <div className="action-type-selector">
        <Label className="field-label">Action Type</Label>
        <Select
          selectedKey={action.type}
          onSelectionChange={(key) => handleTypeChange(key as string)}
        >
          <Button className="select-trigger">
            <SelectValue />
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-listbox">
              {actionTypes.map((type) => (
                <ListBoxItem key={type.value} id={type.value}>
                  {type.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      <div className="action-config">
        {action.type === "navigate" && (
          <NavigateActionEditor
            config={action.config as NavigateConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "setState" && (
          <SetStateActionEditor
            config={action.config as SetStateConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "apiCall" && (
          <APICallActionEditor
            config={action.config as APICallConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "showModal" && (
          <ShowModalActionEditor
            config={action.config as ShowModalConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "showToast" && (
          <ShowToastActionEditor
            config={action.config as ShowToastConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "validateForm" && (
          <ValidateFormActionEditor
            config={action.config as ValidateFormConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}
      </div>
    </div>
  );
}
