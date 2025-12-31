/**
 * Threshold Config Utilities
 *
 * Fast refresh 최적화를 위해 컴포넌트 파일에서 분리
 */

export interface ThresholdConfig {
  warning: number; // default: 60
  danger: number; // default: 75
}

const STORAGE_KEY = "xstudio-monitor-thresholds";

const DEFAULT_CONFIG: ThresholdConfig = { warning: 60, danger: 75 };

/**
 * localStorage에서 설정 로드
 */
export function loadThresholdConfig(): ThresholdConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // 무시
  }
  return DEFAULT_CONFIG;
}

/**
 * localStorage에 설정 저장
 */
export function saveThresholdConfig(config: ThresholdConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // 무시
  }
}
