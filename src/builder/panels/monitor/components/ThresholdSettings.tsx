/**
 * ThresholdSettings Component
 *
 * 메모리 임계값 설정
 * - Warning threshold (노란색 경고)
 * - Danger threshold (빨간색 경고)
 * - localStorage 저장
 */

import { useState, useEffect } from "react";
import { Settings, X, RotateCcw } from "lucide-react";
import { Button } from "react-aria-components";
import { iconSmall, iconEditProps } from "../../../../utils/ui/uiConstants";
import {
  type ThresholdConfig,
  saveThresholdConfig,
} from "../utils/thresholdConfig";

// 외부에서 사용하는 경우 별도 파일에서 직접 import하세요:
// import { loadThresholdConfig, type ThresholdConfig } from "../utils/thresholdConfig";

interface ThresholdSettingsProps {
  config: ThresholdConfig;
  onChange: (config: ThresholdConfig) => void;
}

export function ThresholdSettings({
  config,
  onChange,
}: ThresholdSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = () => {
    // danger가 warning보다 커야 함
    const validConfig = {
      warning: Math.min(localConfig.warning, localConfig.danger - 5),
      danger: localConfig.danger,
    };
    saveThresholdConfig(validConfig);
    onChange(validConfig);
    setIsOpen(false);
  };

  const handleReset = () => {
    const defaultConfig = { warning: 60, danger: 75 };
    setLocalConfig(defaultConfig);
  };

  return (
    <div className="threshold-settings">
      <Button
        className="threshold-settings-btn"
        aria-label="Threshold settings"
        onPress={() => setIsOpen(!isOpen)}
      >
        <Settings size={iconEditProps.size} />
      </Button>

      {isOpen && (
        <div className="threshold-settings-popup">
          <div className="popup-header">
            <h4>Threshold Settings</h4>
            <Button className="popup-close" onPress={() => setIsOpen(false)}>
              <X size={iconEditProps.size} />
            </Button>
          </div>

          <div className="popup-content">
            {/* Warning Threshold */}
            <div className="threshold-slider-group">
              <label className="threshold-label">
                Warning Threshold: {localConfig.warning}%
              </label>
              <input
                type="range"
                min={30}
                max={90}
                step={5}
                value={localConfig.warning}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    warning: Number(e.target.value),
                  }))
                }
                className="threshold-range warning"
                aria-label="Warning threshold"
              />
              <p className="threshold-hint">
                노란색 경고가 표시되는 메모리 사용률
              </p>
            </div>

            {/* Danger Threshold */}
            <div className="threshold-slider-group">
              <label className="threshold-label">
                Danger Threshold: {localConfig.danger}%
              </label>
              <input
                type="range"
                min={40}
                max={95}
                step={5}
                value={localConfig.danger}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    danger: Number(e.target.value),
                  }))
                }
                className="threshold-range danger"
                aria-label="Danger threshold"
              />
              <p className="threshold-hint">
                빨간색 위험 경고가 표시되는 메모리 사용률
              </p>
            </div>

            {/* Preview */}
            <div className="threshold-preview">
              <div className="threshold-preview-bar">
                <div
                  className="threshold-zone safe"
                  style={{ width: `${localConfig.warning}%` }}
                >
                  Safe
                </div>
                <div
                  className="threshold-zone warning"
                  style={{
                    width: `${localConfig.danger - localConfig.warning}%`,
                  }}
                >
                  Warn
                </div>
                <div
                  className="threshold-zone danger"
                  style={{ width: `${100 - localConfig.danger}%` }}
                >
                  Danger
                </div>
              </div>
            </div>
          </div>

          <div className="popup-footer">
            <Button className="btn-secondary" onPress={handleReset}>
              <RotateCcw size={iconSmall.size} />
              Reset
            </Button>
            <Button className="btn-primary" onPress={handleSave}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
