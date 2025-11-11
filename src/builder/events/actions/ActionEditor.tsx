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
  ScrollToConfig,
  HideModalConfig,
  ToggleVisibilityConfig,
  CopyToClipboardConfig,
  CustomConfig,
} from "../../types";
import type {
  SetComponentStateConfig,
  TriggerComponentActionConfig,
  UpdateFormFieldConfig,
  FilterCollectionConfig,
  SelectItemConfig,
  ClearSelectionConfig,
} from "../types/eventTypes";
import { NavigateActionEditor } from "./NavigateActionEditor";
import { SetStateActionEditor } from "./SetStateActionEditor";
import { APICallActionEditor } from "./APICallActionEditor";
import { ShowModalActionEditor } from "./ShowModalActionEditor";
import { ShowToastActionEditor } from "./ShowToastActionEditor";
import { ValidateFormActionEditor } from "./ValidateFormActionEditor";
import { ScrollToActionEditor } from "./ScrollToActionEditor";
import { UpdateStateActionEditor } from "./UpdateStateActionEditor";
import { HideModalActionEditor } from "./HideModalActionEditor";
import { ToggleVisibilityActionEditor } from "./ToggleVisibilityActionEditor";
import { ResetFormActionEditor, type ResetFormConfig } from "./ResetFormActionEditor";
import { SubmitFormActionEditor, type SubmitFormConfig } from "./SubmitFormActionEditor";
import { CopyToClipboardActionEditor } from "./CopyToClipboardActionEditor";
import { CustomFunctionActionEditor } from "./CustomFunctionActionEditor";
import { SetComponentStateActionEditor } from "./SetComponentStateActionEditor";
import { TriggerComponentActionEditor } from "./TriggerComponentActionEditor";
import { UpdateFormFieldActionEditor } from "./UpdateFormFieldActionEditor";
import { FilterCollectionActionEditor } from "./FilterCollectionActionEditor";
import { SelectItemActionEditor } from "./SelectItemActionEditor";
import { ClearSelectionActionEditor } from "./ClearSelectionActionEditor";
import { ConditionEditor } from "../components/ConditionEditor";
import { ActionDelayEditor } from "../components/ActionDelayEditor";

export interface ActionEditorProps {
  action: EventAction;
  onChange: (action: EventAction) => void;
}

export function ActionEditor({ action, onChange }: ActionEditorProps) {
  const actionTypes = [
    { value: "navigate", label: "Navigate" },
    { value: "scrollTo", label: "Scroll To" },
    { value: "setState", label: "Set State" },
    { value: "updateState", label: "Update State" },
    { value: "apiCall", label: "API Call" },
    { value: "showModal", label: "Show Modal" },
    { value: "hideModal", label: "Hide Modal" },
    { value: "showToast", label: "Show Toast" },
    { value: "toggleVisibility", label: "Toggle Visibility" },
    { value: "validateForm", label: "Validate Form" },
    { value: "resetForm", label: "Reset Form" },
    { value: "submitForm", label: "Submit Form" },
    { value: "setComponentState", label: "Set Component State" },
    { value: "triggerComponentAction", label: "Trigger Component Action" },
    { value: "updateFormField", label: "Update Form Field" },
    { value: "filterCollection", label: "Filter Collection" },
    { value: "selectItem", label: "Select Item" },
    { value: "clearSelection", label: "Clear Selection" },
    { value: "copyToClipboard", label: "Copy to Clipboard" },
    { value: "customFunction", label: "Custom Function" },
  ];

  const handleTypeChange = (newType: string) => {
    const defaultConfigs: Record<string, unknown> = {
      navigate: { path: "/" },
      scrollTo: { elementId: "", position: "top", smooth: true },
      setState: { storePath: "", value: "" },
      updateState: { storePath: "", value: "", merge: false },
      apiCall: { endpoint: "", method: "GET" },
      showModal: { modalId: "" },
      hideModal: { modalId: "" },
      showToast: { message: "", variant: "info", duration: 3000 },
      toggleVisibility: { elementId: "", show: undefined },
      validateForm: { formId: "" },
      resetForm: { formId: "" },
      submitForm: { formId: "" },
      setComponentState: { targetId: "", statePath: "", value: "", source: "static" },
      triggerComponentAction: { targetId: "", action: "" },
      updateFormField: { fieldName: "", value: "", source: "static" },
      filterCollection: { targetId: "", filterMode: "text", query: "" },
      selectItem: { targetId: "", itemId: "", behavior: "replace", source: "static" },
      clearSelection: { targetId: "" },
      copyToClipboard: { text: "", source: "static" },
      customFunction: { code: "", params: {} },
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

        {action.type === "scrollTo" && (
          <ScrollToActionEditor
            config={action.config as ScrollToConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "setState" && (
          <SetStateActionEditor
            config={action.config as SetStateConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "updateState" && (
          <UpdateStateActionEditor
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

        {action.type === "hideModal" && (
          <HideModalActionEditor
            config={action.config as HideModalConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "showToast" && (
          <ShowToastActionEditor
            config={action.config as ShowToastConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "toggleVisibility" && (
          <ToggleVisibilityActionEditor
            config={action.config as ToggleVisibilityConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "validateForm" && (
          <ValidateFormActionEditor
            config={action.config as ValidateFormConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "resetForm" && (
          <ResetFormActionEditor
            config={action.config as ResetFormConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "submitForm" && (
          <SubmitFormActionEditor
            config={action.config as SubmitFormConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "copyToClipboard" && (
          <CopyToClipboardActionEditor
            config={action.config as CopyToClipboardConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "customFunction" && (
          <CustomFunctionActionEditor
            config={action.config as CustomConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "setComponentState" && (
          <SetComponentStateActionEditor
            config={action.config as SetComponentStateConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "triggerComponentAction" && (
          <TriggerComponentActionEditor
            config={action.config as TriggerComponentActionConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "updateFormField" && (
          <UpdateFormFieldActionEditor
            config={action.config as UpdateFormFieldConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "filterCollection" && (
          <FilterCollectionActionEditor
            config={action.config as FilterCollectionConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "selectItem" && (
          <SelectItemActionEditor
            config={action.config as SelectItemConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}

        {action.type === "clearSelection" && (
          <ClearSelectionActionEditor
            config={action.config as ClearSelectionConfig}
            onChange={(config) => onChange({ ...action, config })}
          />
        )}
      </div>

      {/* Advanced Settings */}
      <div className="action-advanced-settings">
        <div className="section-divider">Advanced Settings</div>

        <ActionDelayEditor
          delay={action.delay}
          onChange={(delay) => onChange({ ...action, delay })}
        />

        <ConditionEditor
          condition={action.condition}
          onChange={(condition) => onChange({ ...action, condition })}
          label="Execute only when (condition)"
          placeholder="state.isEnabled === true && event.value > 0"
        />
      </div>
    </div>
  );
}
