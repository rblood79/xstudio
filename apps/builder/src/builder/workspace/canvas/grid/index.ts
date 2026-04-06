/**
 * Grid Module Index
 *
 * 🚀 Phase 10 B1.4: 그리드 + Zoom/Pan 모듈 내보내기
 *
 * @since 2025-12-11 Phase 10 B1.4
 */

// Components
// GridLayer는 Phase 9에서 삭제됨 — Skia gridRenderer로 대체

// Constants
export const ZOOM_PRESETS = {
  FIT: "fit",
  "25%": 0.25,
  "50%": 0.5,
  "75%": 0.75,
  "100%": 1,
  "150%": 1.5,
  "200%": 2,
  "300%": 3,
} as const;

export const DEFAULT_GRID_SIZE = 20;
export const DEFAULT_SNAP_SIZE = 10;
