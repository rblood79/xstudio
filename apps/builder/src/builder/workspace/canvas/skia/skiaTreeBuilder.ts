/**
 * Skia Tree Builder (ADR-035 Phase 4)
 *
 * PixiJS 씬 그래프를 계층적으로 순회하여 Skia 렌더 트리를 구성한다.
 * SkiaOverlay에서 추출된 독립 모듈.
 *
 * worldTransform에서 부모-자식 간 상대 좌표를 계산하여 계층 구조를 보존한다.
 *
 * 핵심 공식:
 *   relativeX = (child.wt.tx - parent.wt.tx) / cameraZoom
 *
 * parent.wt.tx와 child.wt.tx 모두 동일한 (stale) cameraX를 포함하므로
 * 뺄셈 시 카메라 오프셋이 상쇄된다. 따라서 팬 중에도 부모-자식 상대 위치는
 * worldTransform 갱신 타이밍과 무관하게 항상 정확하다.
 *
 * @see docs/RENDERING_ARCHITECTURE.md §5.7
 */

import type { SkiaNodeData } from "./nodeRenderers";

/** PixiJS Container에서 Tree 순회에 필요한 최소 인터페이스 */
interface PixiContainerLike {
  label?: string;
  width: number;
  height: number;
  worldTransform: { tx: number; ty: number };
  children: Iterable<unknown>;
}
import type { BoundingBox } from "../selection/types";
import { getSkiaNode } from "./useSkiaNode";
import { buildTreeBoundsMap } from "./skiaFrameHelpers";
import { invalidateCommandStreamCache } from "./renderCommands";

// ============================================
// Internal Text Children Update
// ============================================

/**
 * text children의 크기/정렬을 실제 컨테이너 크기에 맞춰 갱신한다.
 * (ElementSprite의 useMemo 시점에는 style 기본값만 사용 가능하므로)
 */
function updateTextChildren(
  children: SkiaNodeData[] | undefined,
  parentWidth: number,
  parentHeight: number,
): SkiaNodeData[] | undefined {
  return children?.map((child: SkiaNodeData) => {
    if (child.type === "text" && child.text) {
      // autoCenter: false → 수동 배치 텍스트 (spec shapes 기반)
      // specShapesToSkia가 paddingLeft/maxWidth를 이미 정확하게 계산했으므로
      // 여기서 재계산하지 않는다. (Tabs 등 다중 텍스트에서 위치별 maxWidth가 훼손됨)
      if (child.text.autoCenter === false) {
        return child;
      }
      const fontSize = child.text.fontSize || 14;
      const lineHeight = child.text.lineHeight || fontSize * 1.2; // I-L22: 실제값 우선
      return {
        ...child,
        width: parentWidth,
        height: parentHeight,
        text: {
          ...child.text,
          maxWidth: parentWidth,
          paddingTop: Math.max(0, (parentHeight - lineHeight) / 2),
        },
      };
    }
    // box 자식 (spec 컨테이너): width/height 갱신 + 내부 text 자식 재귀
    if (child.type === "box" && child.children && child.children.length > 0) {
      const updatedChildren = updateTextChildren(
        child.children,
        parentWidth,
        parentHeight,
      );
      return {
        ...child,
        width: parentWidth,
        height: parentHeight,
        children: updatedChildren,
      };
    }
    return child;
  });
}

// ============================================
// Tree Build Cache
// ============================================

// 트리 rebuild 캐시 — registryVersion + pagePositionsVersion 미변경 시 재사용하여 GC 압력 저감.
// 카메라(팬/줌)는 비교하지 않음: 트리 좌표는 부모-자식 뺄셈으로 카메라가 상쇄되어
// 동일한 버전이면 카메라 값과 무관하게 동일한 트리가 생성된다.
let _cachedTree: SkiaNodeData | null = null;
let _cachedVersion = -1;
let _cachedPagePosVersion = -1;
// pagePositionsVersion 변경 후 PixiJS worldTransform이 실제 갱신될 때까지
// 캐시를 우회하여 stale 좌표가 캐시에 고정되는 것을 방지한다.
// React 리렌더 → PixiJS 컨테이너 props 갱신 → Application.render() worldTransform 갱신
// 까지 1~2프레임이 필요하므로 3프레임간 캐시를 스킵한다.
export let _pagePosStaleFrames = 0;

/**
 * pagePositionsVersion 변경 시 stale 프레임 카운터를 설정한다.
 */
export function setPagePosStaleFrames(frames: number): void {
  _pagePosStaleFrames = frames;
}

/**
 * pagePositionsVersion stale 프레임 감소 + 캐시 무효화.
 * renderFrame 루프에서 매 프레임 호출.
 * @returns true면 캐시 무효화 수행됨
 */
export function tickPagePosStaleFrames(): boolean {
  if (_pagePosStaleFrames > 0) {
    _cachedTree = null;
    invalidateCommandStreamCache();
    _pagePosStaleFrames--;
    return true;
  }
  return false;
}

/**
 * PixiJS 씬 그래프를 계층적으로 순회하여 Skia 렌더 트리를 구성한다.
 */
export function buildSkiaTreeHierarchical(
  cameraContainer: PixiContainerLike,
  registryVersion: number,
  cameraX: number,
  cameraY: number,
  cameraZoom: number,
  pagePositionsVersion = 0,
): SkiaNodeData | null {
  if (
    _cachedTree &&
    registryVersion === _cachedVersion &&
    pagePositionsVersion === _cachedPagePosVersion
  ) {
    return _cachedTree;
  }

  /**
   * PixiJS 컨테이너 트리를 재귀 순회하며 계층적 Skia 노드를 수집한다.
   *
   * @param container - 현재 탐색 중인 PixiJS 컨테이너
   * @param parentAbsX - 부모 labeled 노드의 씬-로컬 절대 X 좌표
   * @param parentAbsY - 부모 labeled 노드의 씬-로컬 절대 Y 좌표
   */
  function traverse(
    container: PixiContainerLike,
    parentAbsX: number,
    parentAbsY: number,
  ): SkiaNodeData[] {
    const results: SkiaNodeData[] = [];

    for (const child of container.children) {
      if (!("children" in (child as object))) continue;
      const c = child as PixiContainerLike;

      if (c.label) {
        const nodeData = getSkiaNode(c.label);
        if (nodeData) {
          // worldTransform에서 씬-로컬 절대 좌표 계산
          const wt = c.worldTransform;
          const absX = (wt.tx - cameraX) / cameraZoom;
          const absY = (wt.ty - cameraY) / cameraZoom;

          // 부모 기준 상대 좌표
          // (parent.wt와 child.wt 모두 동일한 stale cameraX를 포함하므로
          //  뺄셈 시 카메라 오프셋이 상쇄되어 상대 위치는 항상 정확)
          const relX = absX - parentAbsX;
          const relY = absY - parentAbsY;

          // Phase 11: @pixi/layout(Yoga) 제거 — nodeData(엔진 결과 기반)를 우선 사용.
          // c.width/c.height(PixiJS Container bounds)는 자식 bounding box 기반이므로
          // 엔진 결과와 다를 수 있어 폴백으로만 사용.
          const actualWidth =
            nodeData.width > 0 ? nodeData.width : c.width > 0 ? c.width : 0;
          // Card 등 auto-height UI 컴포넌트: contentMinHeight를 최소값으로 적용
          const baseHeight =
            nodeData.height > 0 ? nodeData.height : c.height > 0 ? c.height : 0;
          const actualHeight = nodeData.contentMinHeight
            ? Math.max(baseHeight, nodeData.contentMinHeight)
            : baseHeight;

          // 내부 자식 (text 등) 크기 갱신
          const updatedInternalChildren = updateTextChildren(
            nodeData.children,
            actualWidth,
            actualHeight,
          );

          // 하위 element 자식 재귀 (이 노드의 절대 좌표를 부모로 전달)
          const elementChildren = traverse(c, absX, absY);

          results.push({
            ...nodeData,
            elementId: c.label, // G.3: AI 이펙트 타겟팅용
            x: relX, // 부모 labeled 노드 기준 상대 좌표
            y: relY,
            width: actualWidth,
            height: actualHeight,
            children: [...(updatedInternalChildren || []), ...elementChildren],
          });
          continue; // 이미 자식 순회 완료
        }
      }

      // label 없거나 레지스트리 미등록 → 부모 절대 좌표 유지하며 하위 탐색
      const childResults = traverse(c, parentAbsX, parentAbsY);
      results.push(...childResults);
    }

    return results;
  }

  /**
   * ADR-050: body에 clipChildren이 설정된 경우, body의 형제 노드(자식 요소)를
   * body의 children으로 편입시킨다.
   *
   * PixiJS 트리에서 body(pixiGraphics)와 자식 요소(BoxSprite 등)가 같은
   * PageContainer 아래 형제로 배치되어 있으므로, Skia 트리에서도 같은 레벨로
   * 수집된다. body.clipChildren이 동작하려면 자식이 body 노드 아래에 있어야 한다.
   */
  function adoptSiblingsIntoClipBody(nodes: SkiaNodeData[]): SkiaNodeData[] {
    const bodyIdx = nodes.findIndex((n) => n.clipChildren && n.type === "box");
    if (bodyIdx === -1) return nodes;

    const bodyNode = nodes[bodyIdx];
    // body 앞의 노드(title hit area 등)는 유지, body 뒤의 형제를 body children으로 편입
    const before = nodes.slice(0, bodyIdx);
    const siblings = nodes.slice(bodyIdx + 1);

    if (siblings.length === 0) return nodes;

    // 형제 좌표를 body 기준 상대 좌표로 변환
    const adoptedChildren = siblings.map((s) => ({
      ...s,
      x: s.x - bodyNode.x,
      y: s.y - bodyNode.y,
    }));

    return [
      ...before,
      {
        ...bodyNode,
        children: [...(bodyNode.children || []), ...adoptedChildren],
      },
    ];
  }

  const children = traverse(cameraContainer, 0, 0);
  if (children.length === 0) {
    _cachedTree = null;
    _cachedVersion = registryVersion;
    _cachedPagePosVersion = pagePositionsVersion;
    return null;
  }

  // ADR-050: clipChildren body 후처리 — body와 형제가 flat으로 풀린 경우
  // Page 컨테이너가 Skia 레지스트리 미등록 → body와 자식 요소가 동일 레벨
  const processedChildren = adoptSiblingsIntoClipBody(children);

  const result: SkiaNodeData = {
    type: "container",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: true,
    children: processedChildren,
  };

  _cachedTree = result;
  _cachedVersion = registryVersion;
  _cachedPagePosVersion = pagePositionsVersion;

  return result;
}

// ============================================
// Tree Bounds Map Cache
// ============================================

// Selection 바운드맵 캐시 — registryVersion + pagePosVersion + scrollVersion 기반 재사용
let _cachedTreeBoundsMap: Map<string, BoundingBox> | null = null;
let _cachedTreeBoundsVersion = -1;
let _cachedTreeBoundsPosVersion = -1;
let _cachedTreeBoundsScrollVersion = -1;

export function getCachedTreeBoundsMap(
  tree: SkiaNodeData,
  registryVersion: number,
  pagePosVersion = 0,
  scrollVersion = 0,
): Map<string, BoundingBox> {
  if (
    _cachedTreeBoundsMap &&
    registryVersion === _cachedTreeBoundsVersion &&
    pagePosVersion === _cachedTreeBoundsPosVersion &&
    scrollVersion === _cachedTreeBoundsScrollVersion
  ) {
    return _cachedTreeBoundsMap;
  }
  const map = buildTreeBoundsMap(tree);
  _cachedTreeBoundsMap = map;
  _cachedTreeBoundsVersion = registryVersion;
  _cachedTreeBoundsPosVersion = pagePosVersion;
  _cachedTreeBoundsScrollVersion = scrollVersion;
  return map;
}
