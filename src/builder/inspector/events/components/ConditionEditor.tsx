import { TextField, Label, TextArea } from "react-aria-components";
import { useState } from "react";

export interface ConditionEditorProps {
  condition?: string;
  onChange: (condition: string | undefined) => void;
  label?: string;
  placeholder?: string;
}

/**
 * ConditionEditor - JavaScript 조건식 에디터
 *
 * EventHandler 또는 EventAction의 조건부 실행을 위한 표현식 입력
 *
 * @example
 * <ConditionEditor
 *   condition={handler.condition}
 *   onChange={(condition) => updateHandler({ condition })}
 *   label="Execute when"
 * />
 */
export function ConditionEditor({
  condition,
  onChange,
  label = "Condition (optional)",
  placeholder = "event.value > 10 && state.isLoggedIn === true",
}: ConditionEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (value: string) => {
    // 빈 문자열은 undefined로 변환
    onChange(value.trim() === "" ? undefined : value);
  };

  const contextVariables = [
    { name: "event", description: "Event object (e.g., event.target.value)" },
    { name: "state", description: "Application state (e.g., state.user.name)" },
    { name: "element", description: "Target DOM element (e.g., element.id)" },
  ];

  const examples = [
    "state.isLoggedIn === true",
    "event.value > 100",
    "state.cart.items.length > 0",
    "element.dataset.type === 'premium'",
  ];

  return (
    <div className="condition-editor">
      <TextField className="field">
        <Label className="field-label">{label}</Label>
        <TextArea
          className="field-textarea code-editor"
          value={condition || ""}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          rows={3}
          placeholder={placeholder}
        />
      </TextField>

      {isFocused && (
        <div className="condition-hints">
          <div className="hints-section">
            <strong>Available context:</strong>
            <ul>
              {contextVariables.map((ctx) => (
                <li key={ctx.name}>
                  <code>{ctx.name}</code> - {ctx.description}
                </li>
              ))}
            </ul>
          </div>

          <div className="hints-section">
            <strong>Examples:</strong>
            <ul>
              {examples.map((example, index) => (
                <li key={index}>
                  <code>{example}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {condition && (
        <p className="field-hint">
          ✓ Action will only execute if this condition is true
        </p>
      )}
    </div>
  );
}
