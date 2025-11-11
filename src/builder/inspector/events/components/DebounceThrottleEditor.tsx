import {
  TextField,
  Label,
  Input,
  Button,
  RadioGroup,
  Radio,
} from "react-aria-components";

export interface DebounceThrottleEditorProps {
  debounce?: number;
  throttle?: number;
  onChange: (settings: { debounce?: number; throttle?: number }) => void;
}

type TimingMode = "none" | "debounce" | "throttle";

/**
 * DebounceThrottleEditor - 이벤트 디바운스/스로틀 설정
 *
 * EventHandler의 debounce/throttle 설정을 위한 UI
 *
 * @example
 * <DebounceThrottleEditor
 *   debounce={handler.debounce}
 *   throttle={handler.throttle}
 *   onChange={({ debounce, throttle }) => updateHandler({ debounce, throttle })}
 * />
 */
export function DebounceThrottleEditor({
  debounce,
  throttle,
  onChange,
}: DebounceThrottleEditorProps) {
  // 현재 모드 결정
  const currentMode: TimingMode = debounce
    ? "debounce"
    : throttle
    ? "throttle"
    : "none";

  const currentValue = debounce || throttle || 300;

  const handleModeChange = (mode: TimingMode) => {
    if (mode === "none") {
      onChange({ debounce: undefined, throttle: undefined });
    } else if (mode === "debounce") {
      onChange({ debounce: currentValue, throttle: undefined });
    } else if (mode === "throttle") {
      onChange({ debounce: undefined, throttle: currentValue });
    }
  };

  const handleValueChange = (value: number) => {
    if (currentMode === "debounce") {
      onChange({ debounce: value, throttle: undefined });
    } else if (currentMode === "throttle") {
      onChange({ debounce: undefined, throttle: value });
    }
  };

  const presets = [
    { label: "Fast", value: 100 },
    { label: "Normal", value: 300 },
    { label: "Slow", value: 1000 },
  ];

  return (
    <div className="debounce-throttle-editor">
      <RadioGroup
        value={currentMode}
        onChange={(value) => handleModeChange(value as TimingMode)}
        className="timing-mode-group"
      >
        <Label className="field-label">Event Timing</Label>
        <div className="radio-options">
          <Radio value="none" className="react-aria-Radio">
            None (immediate)
          </Radio>
          <Radio value="debounce" className="react-aria-Radio">
            Debounce (wait for pause)
          </Radio>
          <Radio value="throttle" className="react-aria-Radio">
            Throttle (limit frequency)
          </Radio>
        </div>
      </RadioGroup>

      {currentMode !== "none" && (
        <>
          <TextField className="field">
            <Label className="field-label">
              {currentMode === "debounce" ? "Debounce" : "Throttle"} Time (ms)
            </Label>
            <Input
              className="field-input"
              type="number"
              value={String(currentValue)}
              onChange={(e) => handleValueChange(Number(e.target.value) || 300)}
              min={0}
              step={50}
            />
          </TextField>

          <div className="presets-group">
            <Label className="field-label">Presets:</Label>
            <div className="preset-buttons">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  className="react-aria-Button sm"
                  onPress={() => handleValueChange(preset.value)}
                >
                  {preset.label} ({preset.value}ms)
                </Button>
              ))}
            </div>
          </div>

          <div className="field-hint">
            {currentMode === "debounce" ? (
              <p>
                <strong>Debounce:</strong> Waits for user to stop typing/clicking
                before executing. Good for search inputs.
              </p>
            ) : (
              <p>
                <strong>Throttle:</strong> Limits execution frequency. Good for
                scroll/resize events.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
