import { useState, useEffect } from "react";
import { TextField, Button, Checkbox } from "react-aria-components";
import type { EventAction } from "../../types";
import { ACTION_METADATA } from "../../data/actionMetadata";

export interface InlineActionEditorProps {
  action: EventAction;
  onSave: (updatedAction: EventAction) => void;
  onCancel: () => void;
}

/**
 * InlineActionEditor - Edit action configuration inline
 */
export function InlineActionEditor({
  action,
  onSave,
  onCancel
}: InlineActionEditorProps) {
  const [config, setConfig] = useState(action.config || {});
  const metadata = ACTION_METADATA[action.type];

  useEffect(() => {
    setConfig(action.config || {});
  }, [action]);

  const handleSave = () => {
    onSave({
      ...action,
      config
    });
  };

  const handleFieldChange = (fieldName: string, value: string | number | boolean) => {
    setConfig((prev) => ({
      ...prev,
      [fieldName]: value
    }));
  };

  return (
    <div className="inline-action-editor">
      <div className="editor-header">
        <div className="editor-title">
          <span className="editor-icon">{metadata.icon}</span>
          <span className="editor-label">Edit {metadata.label}</span>
        </div>
      </div>

      <div className="editor-fields">
        {metadata.configFields && metadata.configFields.length > 0 ? (
          metadata.configFields.map((field) => (
            <div key={field.name} className="editor-field">
              <label className="field-label">
                {field.label}
                {field.required && <span className="required-indicator">*</span>}
              </label>

              {field.type === "text" && (
                <TextField
                  className="react-aria-TextField"
                  value={config[field.name] || ""}
                  onChange={(value) => handleFieldChange(field.name, value)}
                >
                  <input
                    type="text"
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  />
                </TextField>
              )}

              {field.type === "number" && (
                <TextField
                  className="react-aria-TextField"
                  value={config[field.name]?.toString() || ""}
                  onChange={(value) => handleFieldChange(field.name, Number(value))}
                >
                  <input
                    type="number"
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  />
                </TextField>
              )}

              {field.type === "boolean" && (
                <Checkbox
                  className="react-aria-Checkbox"
                  isSelected={config[field.name] || false}
                  onChange={(isSelected) => handleFieldChange(field.name, isSelected)}
                >
                  {field.label}
                </Checkbox>
              )}

              {field.type === "select" && field.options && (
                <select
                  className="field-select"
                  value={config[field.name] || ""}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                >
                  <option value="">Select {field.label.toLowerCase()}</option>
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              {field.type === "textarea" && (
                <TextField
                  className="react-aria-TextField"
                  value={config[field.name] || ""}
                  onChange={(value) => handleFieldChange(field.name, value)}
                >
                  <textarea
                    rows={3}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  />
                </TextField>
              )}
            </div>
          ))
        ) : (
          <div className="no-config-message">No configuration options available</div>
        )}
      </div>

      <div className="editor-actions">
        <Button
          className="react-aria-Button editor-cancel-button"
          onPress={onCancel}
        >
          Cancel
        </Button>
        <Button
          className="react-aria-Button editor-save-button"
          onPress={handleSave}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
