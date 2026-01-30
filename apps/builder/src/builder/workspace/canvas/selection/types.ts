/**
 * Selection System Types
 *
 * 🚀 Phase 10 B1.3: Selection + Transform 타입 정의
 *
 * @since 2025-12-11 Phase 10 B1.3
 */

// ============================================
// Handle Types
// ============================================

/**
 * Transform 핸들 위치
 */
export type HandlePosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-right'
  | 'bottom-right'
  | 'bottom-center'
  | 'bottom-left'
  | 'middle-left';

/**
 * Transform 핸들 타입
 */
export type HandleType = 'resize' | 'rotate';

/**
 * 커서 스타일
 */
export type CursorStyle =
  | 'default'
  | 'move'
  | 'nwse-resize'
  | 'nesw-resize'
  | 'ns-resize'
  | 'ew-resize';

// ============================================
// Bounding Box
// ============================================

/**
 * 바운딩 박스 좌표
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 바운딩 박스 + 회전
 */
export interface TransformBox extends BoundingBox {
  rotation?: number;
}

// ============================================
// Drag State
// ============================================

/**
 * 드래그 작업 타입
 */
export type DragOperation = 'move' | 'resize' | 'rotate' | 'lasso';

/**
 * 드래그 상태
 */
export interface DragState {
  /** 드래그 활성화 여부 */
  isDragging: boolean;
  /** 드래그 작업 타입 */
  operation: DragOperation | null;
  /** 시작 위치 (화면 좌표) */
  startPosition: { x: number; y: number } | null;
  /** 현재 위치 (화면 좌표) */
  currentPosition: { x: number; y: number } | null;
  /** 대상 요소 ID (리사이즈/이동 시) */
  targetElementId: string | null;
  /** 대상 핸들 (리사이즈 시) */
  targetHandle: HandlePosition | null;
  /** 시작 바운딩 박스 (리사이즈 시) */
  startBounds: BoundingBox | null;
}

// ============================================
// Selection State
// ============================================

/**
 * 선택 상태
 */
export interface SelectionState {
  /** 선택된 요소 ID 목록 */
  selectedIds: string[];
  /** 바운딩 박스 (단일 선택 또는 그룹 선택) */
  bounds: BoundingBox | null;
  /** 드래그 상태 */
  drag: DragState;
}

// ============================================
// Handle Configuration
// ============================================

/**
 * 핸들 설정
 */
export interface HandleConfig {
  position: HandlePosition;
  cursor: CursorStyle;
  /** 핸들 상대 위치 (0-1) */
  relativeX: number;
  relativeY: number;
  /** 코너 핸들 여부 (false면 엣지 핸들 - 보이지 않는 히트 영역) */
  isCorner: boolean;
}

/**
 * 기본 핸들 설정
 *
 * Figma 스타일: 코너 핸들만 시각적으로 표시,
 * 엣지 핸들은 보이지 않지만 호버/드래그 가능한 히트 영역으로 동작
 */
export const HANDLE_CONFIGS: HandleConfig[] = [
  // 코너 핸들 (시각적으로 표시) - 양방향 대각선 화살표
  { position: 'top-left', cursor: 'nwse-resize', relativeX: 0, relativeY: 0, isCorner: true },
  { position: 'top-right', cursor: 'nesw-resize', relativeX: 1, relativeY: 0, isCorner: true },
  { position: 'bottom-right', cursor: 'nwse-resize', relativeX: 1, relativeY: 1, isCorner: true },
  { position: 'bottom-left', cursor: 'nesw-resize', relativeX: 0, relativeY: 1, isCorner: true },
  // 엣지 핸들 (보이지 않는 히트 영역) - 양방향 수직/수평 화살표
  { position: 'top-center', cursor: 'ns-resize', relativeX: 0.5, relativeY: 0, isCorner: false },
  { position: 'middle-right', cursor: 'ew-resize', relativeX: 1, relativeY: 0.5, isCorner: false },
  { position: 'bottom-center', cursor: 'ns-resize', relativeX: 0.5, relativeY: 1, isCorner: false },
  { position: 'middle-left', cursor: 'ew-resize', relativeX: 0, relativeY: 0.5, isCorner: false },
];

// ============================================
// Constants
// ============================================

/** 핸들 크기 (코너 핸들) */
export const HANDLE_SIZE = 6;

/** 엣지 핸들 히트 영역 두께 (px) */
export const EDGE_HIT_THICKNESS = 8;

/** 선택 박스 테두리 색상 */
export const SELECTION_COLOR = 0x3b82f6; // blue-500

/** 핸들 배경 색상 */
export const HANDLE_FILL_COLOR = 0xffffff;

/** 핸들 테두리 색상 */
export const HANDLE_STROKE_COLOR = 0x3b82f6;

/** 라쏘 선택 색상 */
export const LASSO_COLOR = 0x3b82f6;

/** 라쏘 배경 알파 */
export const LASSO_FILL_ALPHA = 0.1;

// ============================================
// Utility Functions
// ============================================

/**
 * CSS 값 파싱 (px, %, 숫자 등)
 */
function parseCSSValue(value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * 요소의 바운딩 박스 계산
 */
export function calculateBounds(
  style: Record<string, unknown> | undefined
): BoundingBox {
  return {
    x: parseCSSValue(style?.left, 0),
    y: parseCSSValue(style?.top, 0),
    width: parseCSSValue(style?.width, 100),
    height: parseCSSValue(style?.height, 100),
  };
}

/**
 * 여러 바운딩 박스의 합집합 계산
 */
export function calculateCombinedBounds(boxes: BoundingBox[]): BoundingBox | null {
  if (boxes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * 두 바운딩 박스가 교차하는지 확인 (AABB)
 */
export function boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * 점이 바운딩 박스 안에 있는지 확인
 */
export function pointInBox(
  point: { x: number; y: number },
  box: BoundingBox
): boolean {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}
