/**
 * Drop Target Resolver
 *
 * ADR-043 Phase 2: 드래그 중 마우스 위치에서 drop target 컨테이너와
 * insertion index를 결정하는 순수 함수 모듈.
 *
 * 좌표 규칙:
 * - layoutBoundsRegistry를 source of truth로 사용 (scene-local 좌표)
 * - Pixi container.getBounds() 사용 금지 (Camera transform 포함 글로벌 좌표)
 *
 * Phase 범위:
 * - 같은 부모 내 reorder만 지원
 * - cross-container 이동은 Phase 4에서 추가
 *
 * @since 2026-03-29 ADR-043 Phase 2
 */

import type { Element } from "../../../../types/builder/unified.types";
import { getElementBoundsSimple } from "../elementRegistry";
import type { ElementBounds } from "../elementRegistry";

// ============================================
// Types
// ============================================

export interface DropTarget {
  /** drop target 컨테이너 요소 ID */
  containerId: string;
  /** 삽입 위치 (0-based, 기존 자식들 사이 또는 처음/끝) */
  insertionIndex: number;
  /** 인접 삽입 여부 (기존 요소 사이에 들어가는 경우 true) */
  isAdjacentInsertion: boolean;
  /** 컨테이너의 layout 방향 */
  isHorizontal: boolean;
  /** 컨테이너 bounds (DropIndicator 렌더링용) */
  containerBounds: ElementBounds;
  /** 드래그 대상 제외 후 정렬된 형제 bounds (DropIndicator 렌더링용) */
  siblingBounds: ElementBounds[];
}

/**
 * ADR-043 Phase 3: SkiaOverlay RAF에서 읽는 drop indicator 스냅샷.
 * DropIndicatorState와 동일한 형태로, DropTarget에서 직접 추출한다.
 * BoundingBox 대신 ElementBounds를 사용하여 변환 없이 전달.
 */
export interface DropIndicatorSnapshot {
  targetBounds: ElementBounds;
  insertIndex: number;
  childBounds: ElementBounds[];
  isHorizontal: boolean;
}

/** resolveDropTarget에 필요한 store 슬라이스 */
export interface DropTargetStoreSlice {
  elementsMap: Map<string, Element>;
  childrenMap: Map<string, Element[]>;
}

// ============================================
// Internal Utilities
// ============================================

/**
 * 컨테이너의 주요 flex 방향을 결정한다.
 * store props의 style.flexDirection 또는 display를 기준으로 판단.
 */
function detectIsHorizontal(element: Element): boolean {
  const style = element.props?.style as Record<string, unknown> | undefined;
  if (!style) return false;

  const flexDir = style.flexDirection;
  if (flexDir === "row" || flexDir === "row-reverse") return true;

  // grid는 기본적으로 row 방향
  if (style.display === "grid") return true;

  return false;
}

/**
 * order_num 오름차순으로 자식 요소를 정렬한다.
 * childrenMap에서 반환된 배열은 stale일 수 있으므로
 * elementsMap에서 최신 값을 읽어 order_num 기준 정렬.
 */
function getSortedChildren(
  parentId: string,
  store: DropTargetStoreSlice,
): Element[] {
  const rawChildren = store.childrenMap.get(parentId);
  if (!rawChildren || rawChildren.length === 0) return [];

  // childrenMap props는 stale → elementsMap에서 최신 조회
  const fresh = rawChildren
    .map((c) => store.elementsMap.get(c.id))
    .filter((c): c is Element => c !== undefined);

  return fresh.sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));
}

/**
 * 점이 bounds의 전반부(앞쪽 50%)에 있는지 판단.
 * 수평 컨테이너는 x축, 수직 컨테이너는 y축을 기준으로 한다.
 */
function isInFirstHalf(
  point: { x: number; y: number },
  bounds: ElementBounds,
  isHorizontal: boolean,
): boolean {
  if (isHorizontal) {
    return point.x < bounds.x + bounds.width / 2;
  }
  return point.y < bounds.y + bounds.height / 2;
}

// ============================================
// Main Resolver
// ============================================

/**
 * scene-local 좌표에서 drop target을 찾는다.
 *
 * 동작:
 * 1. draggedElementId의 부모 컨테이너를 찾는다.
 * 2. 부모의 자식들(드래그 대상 제외)의 layoutBounds를 조회한다.
 * 3. scenePoint와 각 형제의 bounds를 비교하여 insertion index를 결정한다.
 *
 * 반환:
 * - DropTarget: 유효한 drop target이 있는 경우
 * - null: 부모 없음, bounds 없음, body가 부모인데 적절한 위치를 못 찾은 경우
 *
 * 순수 함수 — side effect 없음.
 */
export function resolveDropTarget(
  scenePoint: { x: number; y: number },
  draggedElementId: string,
  store: DropTargetStoreSlice,
): DropTarget | null {
  // 1. 드래그 요소 조회
  const dragged = store.elementsMap.get(draggedElementId);
  if (!dragged) return null;

  // 2. 부모 컨테이너 결정
  const parentId = dragged.parent_id;
  if (!parentId) return null;

  const parent = store.elementsMap.get(parentId);
  if (!parent) return null;

  // body 요소는 drop target이 될 수 있으나,
  // absolute 배치 요소의 부모이므로 reorder 대상이 아님
  // → Phase 2에서는 스킵 (null 반환)
  if (parent.tag.toLowerCase() === "body") return null;

  // 3. 컨테이너 bounds 조회
  const containerBounds = getElementBoundsSimple(parentId);
  if (!containerBounds) return null;

  // 4. 컨테이너의 방향 감지
  const isHorizontal = detectIsHorizontal(parent);

  // 5. 드래그 대상을 제외한 형제 요소 (order_num 오름차순)
  const sortedChildren = getSortedChildren(parentId, store);
  const siblings = sortedChildren.filter((c) => c.id !== draggedElementId);

  // 6. 형제 bounds 수집 (layoutBoundsRegistry에 없는 요소는 스킵)
  const siblingBounds: ElementBounds[] = [];
  for (const sibling of siblings) {
    const b = getElementBoundsSimple(sibling.id);
    if (b) siblingBounds.push(b);
  }

  // 7. insertion index 결정
  //
  // 알고리즘:
  // - 형제가 없으면 → insertionIndex = 0
  // - scenePoint가 각 형제의 절반 기준으로 앞에 있으면 해당 형제 앞에 삽입
  // - 모든 형제를 지나쳤으면 맨 뒤에 삽입
  let insertionIndex = siblings.length; // 기본: 맨 뒤

  for (let i = 0; i < siblingBounds.length; i++) {
    if (isInFirstHalf(scenePoint, siblingBounds[i], isHorizontal)) {
      insertionIndex = i;
      break;
    }
  }

  // 8. 현재 드래그 요소의 현재 index를 구해 인접 삽입 여부 판단
  const currentIndex = sortedChildren.findIndex(
    (c) => c.id === draggedElementId,
  );
  // 형제 기준 삽입 인덱스를 원래 자식 배열 기준으로 변환
  // (드래그 요소가 siblings[i] 앞에 오므로, dragged가 제거됐을 때의 index)
  const originalInsertIndex =
    currentIndex >= 0 && currentIndex <= insertionIndex
      ? insertionIndex + 1 // dragged가 앞에 있었으면 원래 배열에서 한 칸 더 뒤
      : insertionIndex;

  const isAdjacentInsertion =
    originalInsertIndex === currentIndex ||
    originalInsertIndex === currentIndex + 1;

  return {
    containerId: parentId,
    insertionIndex,
    isAdjacentInsertion,
    isHorizontal,
    containerBounds,
    siblingBounds,
  };
}

// ============================================
// Commit Helper
// ============================================

/**
 * resolveDropTarget 결과를 order_num 업데이트 배열로 변환한다.
 *
 * 드래그 요소를 insertionIndex 위치에 삽입한 후
 * 전체 형제 배열의 order_num을 0-based로 재계산.
 *
 * @returns batchUpdateElementOrders에 전달할 updates 배열
 *          변경이 없으면 빈 배열 반환
 */
export function computeReorderFromDropTarget(
  dropTarget: DropTarget,
  draggedElementId: string,
  store: DropTargetStoreSlice,
): Array<{ id: string; order_num: number }> {
  const { containerId, insertionIndex } = dropTarget;

  // 드래그 대상을 제외한 형제 (order_num 오름차순)
  const sortedChildren = getSortedChildren(containerId, store);
  const siblings = sortedChildren.filter((c) => c.id !== draggedElementId);

  // 드래그 요소를 insertionIndex에 삽입
  const newOrder = [
    ...siblings.slice(0, insertionIndex),
    { id: draggedElementId, order_num: -1 }, // placeholder, 아래서 재할당
    ...siblings.slice(insertionIndex),
  ];

  // 0-based order_num 재계산
  const updates: Array<{ id: string; order_num: number }> = [];
  for (let i = 0; i < newOrder.length; i++) {
    const child = newOrder[i];
    const existing = store.elementsMap.get(child.id);
    if (!existing) continue;
    if (existing.order_num !== i) {
      updates.push({ id: child.id, order_num: i });
    }
  }

  return updates;
}
