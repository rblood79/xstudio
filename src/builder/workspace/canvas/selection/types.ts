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
  | 'nw-resize'
  | 'n-resize'
  | 'ne-resize'
  | 'e-resize'
  | 'se-resize'
  | 's-resize'
  | 'sw-resize'
  | 'w-resize';

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
}

/**
 * 기본 핸들 설정
 */
export const HANDLE_CONFIGS: HandleConfig[] = [
  { position: 'top-left', cursor: 'nw-resize', relativeX: 0, relativeY: 0 },
  { position: 'top-center', cursor: 'n-resize', relativeX: 0.5, relativeY: 0 },
  { position: 'top-right', cursor: 'ne-resize', relativeX: 1, relativeY: 0 },
  { position: 'middle-right', cursor: 'e-resize', relativeX: 1, relativeY: 0.5 },
  { position: 'bottom-right', cursor: 'se-resize', relativeX: 1, relativeY: 1 },
  { position: 'bottom-center', cursor: 's-resize', relativeX: 0.5, relativeY: 1 },
  { position: 'bottom-left', cursor: 'sw-resize', relativeX: 0, relativeY: 1 },
  { position: 'middle-left', cursor: 'w-resize', relativeX: 0, relativeY: 0.5 },
];

// ============================================
// Constants
// ============================================

/** 핸들 크기 */
export const HANDLE_SIZE = 8;

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
 * 요소의 바운딩 박스 계산
 */
export function calculateBounds(
  style: Record<string, unknown> | undefined
): BoundingBox {
  return {
    x: Number(style?.left) || 0,
    y: Number(style?.top) || 0,
    width: Number(style?.width) || 100,
    height: Number(style?.height) || 100,
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
