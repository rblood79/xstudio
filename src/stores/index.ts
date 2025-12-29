/**
 * Global Stores - 통합 Export
 *
 * 앱 전역에서 사용되는 스토어들의 통합 진입점
 *
 * @since 2024-12-29 Phase 1
 */

// UI 설정 (테마 모드, UI 스케일)
export {
  useUiStore,
  useThemeMode,
  useUiScale,
  getUiState,
  type UiState,
  type ThemeMode,
  type UiScale,
} from './uiStore';

// 디자인 시스템 테마/토큰
export {
  useUnifiedThemeStore,
  useThemes,
  useActiveTheme,
  useTokens,
  useRawTokens,
  useSemanticTokens,
  useThemeLoading,
  useThemeError,
} from './themeStore';

// 앱 환경 설정
export {
  useSettingsStore,
  getSettings,
} from './settingsStore';
