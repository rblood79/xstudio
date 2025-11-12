import { TextField, Label, Input, Button, Checkbox } from "react-aria-components";

export interface ActionDelayEditorProps {
  delay?: number;
  onChange: (delay: number | undefined) => void;
}

/**
 * ActionDelayEditor - 개별 액션 지연 시간 설정
 *
 * EventAction의 delay 설정을 위한 UI
 *
 * @example
 * <ActionDelayEditor
 *   delay={action.delay}
 *   onChange={(delay) => updateAction({ delay })}
 * />
 */
export function ActionDelayEditor({ delay, onChange }: ActionDelayEditorProps) {
  const hasDelay = delay !== undefined && delay > 0;
  const currentDelay = delay || 1000;

  const handleToggle = (enabled: boolean) => {
    onChange(enabled ? currentDelay : undefined);
  };

  const handleDelayChange = (value: number) => {
    onChange(value > 0 ? value : undefined);
  };

  const presets = [
    { label: "0.5s", value: 500 },
    { label: "1s", value: 1000 },
    { label: "2s", value: 2000 },
    { label: "5s", value: 5000 },
  ];

  return (
    <div className="action-delay-editor">
      <Checkbox
        className="checkbox-field"
        isSelected={hasDelay}
        onChange={handleToggle}
      >
        Add delay before executing
      </Checkbox>

      {hasDelay && (
        <>
          <TextField className="field">
            <Label className="field-label">Delay (ms)</Label>
            <Input
              className="field-input"
              type="number"
              value={String(currentDelay)}
              onChange={(e) =>
                handleDelayChange(Number(e.target.value) || 0)
              }
              min={0}
              step={100}
            />
          </TextField>

          <div className="presets-group">
            <Label className="field-label">Presets:</Label>
            <div className="preset-buttons">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  className="react-aria-Button sm"
                  onPress={() => handleDelayChange(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <p className="field-hint">
            ⏱️ This action will wait <strong>{currentDelay}ms</strong> before
            executing. Useful for creating sequences or animations.
          </p>
        </>
      )}
    </div>
  );
}
