import {
  TextField,
  Input,
  Label,
  Select,
  SelectValue,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import type { SelectItemConfig } from "../types/eventTypes";
import { ComponentSelector } from "../components/ComponentSelector";

export interface SelectItemActionEditorProps {
  config: SelectItemConfig;
  onChange: (config: SelectItemConfig) => void;
}

export function SelectItemActionEditor({
  config,
  onChange,
}: SelectItemActionEditorProps) {
  const updateField = <K extends keyof SelectItemConfig>(
    field: K,
    value: SelectItemConfig[K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  const behaviorOptions = [
    { value: "replace", label: "Replace (clear others)" },
    { value: "add", label: "Add (keep existing)" },
    { value: "toggle", label: "Toggle (flip state)" },
  ];

  const sourceOptions = [
    { value: "static", label: "Static ID" },
    { value: "state", label: "From app state" },
    { value: "event", label: "From event data" },
  ];

  const collectionTypes = ["ListBox", "GridList", "Select", "ComboBox", "RadioGroup", "CheckboxGroup"];
  const source = config.source || "static";

  return (
    <div className="selectitem-action-editor">
      <ComponentSelector
        value={config.targetId}
        onChange={(targetId) => updateField("targetId", targetId)}
        filterByType={collectionTypes}
        label="Target Collection"
        placeholder="Select collection component"
      />

      <div className="field">
        <Label className="field-label">Selection Behavior</Label>
        <Select
          selectedKey={config.behavior}
          onSelectionChange={(key) =>
            updateField("behavior", key as SelectItemConfig["behavior"])
          }
        >
          <Button className="select-trigger">
            <SelectValue />
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-listbox">
              {behaviorOptions.map((option) => (
                <ListBoxItem key={option.value} id={option.value} textValue={option.label}>
                  {option.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      <div className="field">
        <Label className="field-label">Item ID Source</Label>
        <Select
          selectedKey={source}
          onSelectionChange={(key) =>
            updateField("source", key as SelectItemConfig["source"])
          }
        >
          <Button className="select-trigger">
            <SelectValue />
          </Button>
          <Popover className="select-popover">
            <ListBox className="select-listbox">
              {sourceOptions.map((option) => (
                <ListBoxItem key={option.value} id={option.value} textValue={option.label}>
                  {option.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>

      {source === "static" && (
        <>
          <TextField className="field">
            <Label className="field-label">Item ID</Label>
            <Input
              className="field-input"
              value={config.itemId || ""}
              onChange={(e) => updateField("itemId", e.target.value)}
              placeholder="user-123, product-456"
            />
          </TextField>

          <TextField className="field">
            <Label className="field-label">Or Item Index (optional)</Label>
            <Input
              className="field-input"
              type="number"
              value={String(config.itemIndex ?? "")}
              onChange={(e) =>
                updateField(
                  "itemIndex",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              placeholder="0, 1, 2, ..."
            />
          </TextField>
        </>
      )}

      {source === "state" && (
        <TextField className="field">
          <Label className="field-label">State Path</Label>
          <Input
            className="field-input"
            value={config.itemId || ""}
            onChange={(e) => updateField("itemId", e.target.value)}
            placeholder="state.selectedUserId or {{state.cart.selectedProduct}}"
          />
        </TextField>
      )}

      {source === "event" && (
        <TextField className="field">
          <Label className="field-label">Event Path</Label>
          <Input
            className="field-input"
            value={config.itemId || ""}
            onChange={(e) => updateField("itemId", e.target.value)}
            placeholder="event.target.value or {{event.detail.itemId}}"
          />
        </TextField>
      )}

      <div className="field-hint">
        <p><strong>Selection Behaviors:</strong></p>
        <ul>
          <li>
            <strong>Replace:</strong> Clear all existing selections and select this
            item only
          </li>
          <li>
            <strong>Add:</strong> Add this item to existing selections (multi-select)
          </li>
          <li>
            <strong>Toggle:</strong> If selected, deselect it; if not, select it
          </li>
        </ul>
        <p>
          <strong>Priority:</strong> If both itemId and itemIndex are provided,
          itemId takes precedence.
        </p>
      </div>
    </div>
  );
}
