import {
  TextField,
  Label,
  TextArea,
  Select,
  SelectValue,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import { useState } from "react";
import type { TriggerComponentActionConfig } from "../types/eventTypes";
import { ComponentSelector } from "../components/ComponentSelector";
import { useComponentRegistry, getComponentMethods } from "@/builder/stores/componentRegistry";

export interface TriggerComponentActionEditorProps {
  config: TriggerComponentActionConfig;
  onChange: (config: TriggerComponentActionConfig) => void;
}

export function TriggerComponentActionEditor({
  config,
  onChange,
}: TriggerComponentActionEditorProps) {
  const [paramsJson, setParamsJson] = useState(() =>
    JSON.stringify(config.params || {}, null, 2)
  );
  const [paramsError, setParamsError] = useState("");

  const updateField = <K extends keyof TriggerComponentActionConfig>(
    field: K,
    value: TriggerComponentActionConfig[K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  const updateParams = (value: string) => {
    setParamsJson(value);
    try {
      const parsed = JSON.parse(value);
      onChange({ ...config, params: parsed });
      setParamsError("");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      setParamsError("유효한 JSON이 아닙니다");
    }
  };

  // Get target component to determine available actions
  const getComponent = useComponentRegistry((state) => state.getComponent);
  const getComponentByCustomId = useComponentRegistry(
    (state) => state.getComponentByCustomId
  );

  const targetComponent =
    getComponent(config.targetId) || getComponentByCustomId(config.targetId);

  const availableActions = targetComponent
    ? getComponentMethods(targetComponent.tag)
    : [];

  return (
    <div className="triggercomponentaction-action-editor">
      <ComponentSelector
        value={config.targetId}
        onChange={(targetId) => updateField("targetId", targetId)}
        label="Target Component"
        placeholder="Select component to trigger"
      />

      {availableActions.length > 0 ? (
        <div className="field">
          <Label className="field-label">Action</Label>
          <Select
            selectedKey={config.action || ""}
            onSelectionChange={(key) => updateField("action", key as string)}
          >
            <Button className="select-trigger">
              <SelectValue />
            </Button>
            <Popover className="select-popover">
              <ListBox className="select-listbox">
                <ListBoxItem key="" id="">
                  Select an action
                </ListBoxItem>
                {availableActions.map((action) => (
                  <ListBoxItem key={action} id={action}>
                    {action}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </Select>
        </div>
      ) : (
        <p className="field-hint warning">
          ⚠️ Select a target component first to see available actions
        </p>
      )}

      {config.action && (
        <>
          <TextField className="field">
            <Label className="field-label">Parameters (JSON)</Label>
            <TextArea
              className="field-textarea"
              value={paramsJson}
              onChange={(e) => updateParams(e.target.value)}
              rows={4}
              placeholder='{"itemId": "item-1", "behavior": "replace"}'
            />
            {paramsError && (
              <div className="error-message">⚠️ {paramsError}</div>
            )}
          </TextField>

          <div className="field-hint">
            <p><strong>Action: {config.action}</strong></p>
            <p>Common parameters vary by action type:</p>
            <ul>
              <li><code>select</code> - itemId, behavior (replace/add/toggle)</li>
              <li><code>filter</code> - query, mode (include/exclude)</li>
              <li><code>setValue</code> - value</li>
              <li><code>focus/blur</code> - no params needed</li>
            </ul>
          </div>
        </>
      )}

      {targetComponent && (
        <div className="field-hint">
          <p>
            Target: <strong>{targetComponent.customId || targetComponent.id}</strong> ({targetComponent.tag})
          </p>
          <p>Available actions: {availableActions.join(", ") || "None"}</p>
        </div>
      )}
    </div>
  );
}
