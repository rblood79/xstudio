/**
 * Phase 3: Flat Render Command Stream
 *
 * elementsMap + childrenMap + fullTreeLayoutMap + skiaNodeRegistry에서 직접
 * 렌더 커맨드 스트림(플랫 배열)을 구성하여 PixiJS 순회 제거 + 선형 렌더링.
 *
 * @see ADR-005 Phase 3
 * @since 2026-02-28
 */

import type { CanvasKit, Canvas, FontMgr } from "canvaskit-wasm";
import type { SkiaNodeData } from "./nodeRenderers";
import type { ClipPathShape } from "../sprites/styleConverter";
import type { EffectStyle, MaskImageStyle } from "./types";
import type { ComputedLayout } from "../layout/engines/LayoutEngine";
import type { BoundingBox } from "../selection/types";
import type { AIEffectNodeBounds } from "./types";
import type { Element } from "../../../../types/core/store.types";
import {
  buildMaskGradientShader,
  determineMaskMode,
  applyMaskImage,
} from "./nodeRendererMask";
import { getSkImage, loadSkImage } from "./imageCache";
import { getSkiaNode } from "./useSkiaNode";
import { getDragVisualOffset, getSiblingOffset } from "./nodeRendererTree";
import {
  renderBox,
  renderText,
  renderImage,
  renderLine,
  renderIconPath,
  renderPartialBorder,
  renderScrollbar,
  buildClipPath,
  getEditingElementId,
} from "./nodeRenderers";
import { beginRenderEffects, endRenderEffects } from "./effects";
import { toSkiaBlendMode } from "./blendModes";
import { WASM_FLAGS } from "../wasm-bindings/featureFlags";
import * as spatialIndex from "../wasm-bindings/spatialIndex";
import { resolveStickyY, resolveStickyX } from "../layout/stickyResolver";

// ── Command 타입 ──────────────────────────────────────────────────────

const CMD_ELEMENT_BEGIN = 0 as const;
const CMD_DRAW = 1 as const;
const CMD_CHILDREN_BEGIN = 2 as const;
const CMD_CHILDREN_END = 3 as const;
const CMD_ELEMENT_END = 4 as const;

interface ElementBeginCmd {
  type: typeof CMD_ELEMENT_BEGIN;
  x: number;
  y: number;
  width: number;
  height: number;
  elementId: string;
  visible: boolean;
  transform?: Float32Array;
  clipPath?: ClipPathShape;
  blendMode?: string;
  effects?: EffectStyle[];
  /** position: fixed 요소 — executeRenderCommands에서 camera 역보정 대상 */
  isFixed?: boolean;
  /** CSS mask-image — 요소 전체를 offscreen에 렌더 후 mask 합성 */
  maskImage?: MaskImageStyle;
}

interface DrawCmd {
  type: typeof CMD_DRAW;
  nodeType: SkiaNodeData["type"];
  skiaData: SkiaNodeData;
  width: number;
  height: number;
}

interface ChildrenBeginCmd {
  type: typeof CMD_CHILDREN_BEGIN;
  clipChildren: boolean;
  width: number;
  height: number;
  scrollOffset?: { scrollTop: number; scrollLeft: number };
}

interface ChildrenEndCmd {
  type: typeof CMD_CHILDREN_END;
  clipChildren: boolean;
  hasScrollOffset: boolean;
  scrollbar?: SkiaNodeData["scrollbar"];
  scrollbarNode?: SkiaNodeData;
}

interface ElementEndCmd {
  type: typeof CMD_ELEMENT_END;
  hasBlend: boolean;
  effectLayerCount: number;
}

type RenderCommand =
  | ElementBeginCmd
  | DrawCmd
  | ChildrenBeginCmd
  | ChildrenEndCmd
  | ElementEndCmd;

export interface RenderCommandStream {
  commands: RenderCommand[];
  boundsMap: Map<string, BoundingBox>;
}

/** 최신 boundsMap 캐시 (씬 좌표 — TextEditOverlay 위치 계산용) */
let _lastBoundsMap: Map<string, BoundingBox> = new Map();

/** 씬 좌표 기반 요소 bounds 조회 (카메라 변환 미포함) */
export function getSceneBounds(elementId: string): BoundingBox | undefined {
  return _lastBoundsMap.get(elementId);
}

// ── Bounds 구독 (TextEditOverlay 이벤트 기반 위치 추적) ──────────────

type BoundsListener = (elementId: string, bounds: BoundingBox) => void;
const _boundsListeners = new Map<string, Set<BoundsListener>>();

/** 특정 요소의 bounds 변경을 구독한다. 해제 함수를 반환한다. */
export function subscribeBounds(
  elementId: string,
  listener: BoundsListener,
): () => void {
  let set = _boundsListeners.get(elementId);
  if (!set) {
    set = new Set();
    _boundsListeners.set(elementId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) _boundsListeners.delete(elementId);
  };
}

/** boundsMap 갱신 후 구독자에게 알림 */
function _notifyBoundsListeners(boundsMap: Map<string, BoundingBox>): void {
  if (_boundsListeners.size === 0) return;
  for (const [id, listeners] of _boundsListeners) {
    const bounds = boundsMap.get(id);
    if (bounds) {
      for (const fn of listeners) fn(id, bounds);
    }
  }
}

// ── updateTextChildren (SkiaOverlay.tsx:91-129에서 이동) ──────────────

function updateTextChildren(
  children: SkiaNodeData[] | undefined,
  parentWidth: number,
  parentHeight: number,
): SkiaNodeData[] | undefined {
  return children?.map((child: SkiaNodeData) => {
    if (child.type === "text" && child.text) {
      if (child.text.autoCenter === false) {
        return child;
      }
      const fontSize = child.text.fontSize || 14;
      const lineHeight = child.text.lineHeight || fontSize * 1.2;
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

// ── buildRenderCommandStream ──────────────────────────────────────────

// 캐시
let _cachedStream: RenderCommandStream | null = null;
let _cacheRegVersion = -1;
let _cachePagePosVersion = -1;
let _cacheFramePosVersion = -1;
let _cacheLayoutVersion = -1;
let _cacheRootSignature = "";

/**
 * 캐시 기반 커맨드 스트림 획득.
 *
 * registryVersion + pagePositionsVersion + framePositionsVersion + sharedLayoutVersion 4중 키.
 * ADR-911 P3-δ: framePositionsVersion 추가 — frame 좌표 변경 시 invalidate (D3=A 단일 맵
 * 통합 후에도 frame 영역 카운터는 별도 추적, page-only 변경과 frame-only 변경을 구분 캐시).
 */
export function getCachedCommandStream(
  rootElementIds: string[],
  childrenMap: Map<string, Element[]>,
  layoutMap: Map<string, ComputedLayout>,
  pagePositions: Record<string, { x: number; y: number }>,
  registryVersion: number,
  pagePosVersion: number,
  framePosVersion: number,
  layoutVersion: number,
): RenderCommandStream {
  const rootSignature = rootElementIds.join("|");
  if (
    _cachedStream &&
    registryVersion === _cacheRegVersion &&
    pagePosVersion === _cachePagePosVersion &&
    framePosVersion === _cacheFramePosVersion &&
    layoutVersion === _cacheLayoutVersion &&
    rootSignature === _cacheRootSignature
  ) {
    return _cachedStream;
  }

  const stream = buildRenderCommandStream(
    rootElementIds,
    childrenMap,
    layoutMap,
    pagePositions,
  );

  _cachedStream = stream;
  _cacheRegVersion = registryVersion;
  _cachePagePosVersion = pagePosVersion;
  _cacheFramePosVersion = framePosVersion;
  _cacheLayoutVersion = layoutVersion;
  _cacheRootSignature = rootSignature;

  return stream;
}

/**
 * 커맨드 스트림 캐시 무효화 (pagePositions stale 프레임 등)
 */
export function invalidateCommandStreamCache(): void {
  _cachedStream = null;
  _cacheRootSignature = "";
}

/**
 * elementsMap + childrenMap + layoutMap + skiaNodeRegistry에서 직접
 * RenderCommand[] 플랫 배열을 구성한다.
 *
 * DFS pre-order: 각 페이지 body에서 시작.
 */
export function buildRenderCommandStream(
  rootElementIds: string[],
  childrenMap: Map<string, Element[]>,
  layoutMap: Map<string, ComputedLayout>,
  pagePositions: Record<string, { x: number; y: number }>,
): RenderCommandStream {
  const commands: RenderCommand[] = [];
  const boundsMap = new Map<string, BoundingBox>();

  for (const bodyId of rootElementIds) {
    const pagePos = pagePositions[bodyId];
    const offsetX = pagePos?.x ?? 0;
    const offsetY = pagePos?.y ?? 0;

    visitElement(
      bodyId,
      offsetX,
      offsetY,
      commands,
      boundsMap,
      childrenMap,
      layoutMap,
      offsetX,
      offsetY,
    );
  }

  // SpatialIndex 동기화: boundsMap에 최신 씬 좌표를 반영
  if (WASM_FLAGS.SPATIAL_INDEX) {
    syncSpatialIndex(boundsMap);
  }

  // 최신 boundsMap 캐시 (TextEditOverlay 등 외부 접근용)
  _lastBoundsMap = boundsMap;
  _notifyBoundsListeners(boundsMap);

  return { commands, boundsMap };
}

/**
 * boundsMap → SpatialIndex 동기화.
 *
 * renderCommands가 씬 좌표(페이지 오프셋 포함) 절대좌표로 boundsMap을 구성하므로,
 * 항상 최신 씬 좌표 기반 SpatialIndex를 유지한다.
 * elementRegistry.updateElementBounds()의 스크린 좌표 동기화를 대체.
 */
function syncSpatialIndex(boundsMap: Map<string, BoundingBox>): void {
  const items: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }> = [];
  for (const [id, bounds] of boundsMap) {
    if (bounds.width > 0 && bounds.height > 0) {
      items.push({
        id,
        x: bounds.x,
        y: bounds.y,
        w: bounds.width,
        h: bounds.height,
      });
    }
  }
  spatialIndex.batchUpdate(items);
}

/**
 * DFS pre-order 순회: 단일 element를 커맨드 스트림으로 변환.
 *
 * @param cmdOffsetX - 커맨드의 x에 추가할 오프셋 (페이지 오프셋용, 루트 호출에만 전달)
 * @param cmdOffsetY - 커맨드의 y에 추가할 오프셋 (페이지 오프셋용, 루트 호출에만 전달)
 * @param parentElementId - 부모 elementId (sticky containerBottom/Right 계산용)
 */
function visitElement(
  elementId: string,
  parentAbsX: number,
  parentAbsY: number,
  commands: RenderCommand[],
  boundsMap: Map<string, BoundingBox>,
  childrenMap: Map<string, Element[]>,
  layoutMap: Map<string, ComputedLayout>,
  cmdOffsetX: number = 0,
  cmdOffsetY: number = 0,
  parentElementId: string | null = null,
): void {
  const skiaData = getSkiaNode(elementId);
  if (!skiaData) return;

  // layoutMap에서 부모 기준 상대 좌표 + 크기 조회
  const layout = layoutMap.get(elementId);
  const relX = layout?.x ?? skiaData.x;
  const relY = layout?.y ?? skiaData.y;
  const rawWidth = layout?.width ?? skiaData.width;
  const rawHeight = layout?.height ?? skiaData.height;

  // contentMinHeight 적용 (Card 등 auto-height)
  const width =
    rawWidth > 0 ? rawWidth : skiaData.width > 0 ? skiaData.width : 0;
  const baseHeight =
    rawHeight > 0 ? rawHeight : skiaData.height > 0 ? skiaData.height : 0;
  const height = skiaData.contentMinHeight
    ? Math.max(baseHeight, skiaData.contentMinHeight)
    : baseHeight;

  // 절대 좌표
  const absX = parentAbsX + relX;
  const absY = parentAbsY + relY;

  // boundsMap에 절대 좌표 기록
  boundsMap.set(elementId, { x: absX, y: absY, width, height });

  // position: sticky/fixed — 렌더 좌표 보정
  // layoutMap의 y/x는 정적 레이아웃 기준이므로 스크롤 후 post-layout 보정 필요
  let renderRelX = relX + cmdOffsetX;
  let renderRelY = relY + cmdOffsetY;

  // 부모 layout: sticky containerBottom/Right 계산용
  const parentLayout = parentElementId
    ? layoutMap.get(parentElementId)
    : undefined;

  if (skiaData.isFixed) {
    // fixed: containerBottom=Infinity → 제한 없음. 스크롤 없이 뷰포트 고정
    renderRelY = resolveStickyY({
      elementY: relY,
      stickyTop: skiaData.stickyTop ?? 0,
      scrollOffset: 0,
      containerTop: 0,
      containerBottom: Infinity,
      elementHeight: height,
    });
    renderRelX = resolveStickyX({
      elementX: relX,
      stickyLeft: skiaData.stickyLeft ?? 0,
      scrollOffset: 0,
      containerLeft: 0,
      containerRight: Infinity,
      elementWidth: width,
    });
  } else if (skiaData.isSticky) {
    // sticky: 부모 scrollOffset 기준으로 보정
    // parentAbsX/Y는 이미 부모의 scrollOffset이 차감된 절대 좌표
    const parentScrollY = skiaData.scrollOffset?.scrollTop ?? 0;
    const parentScrollX = skiaData.scrollOffset?.scrollLeft ?? 0;
    // 부모 layout이 있으면 실제 크기로 containerBottom/Right 계산,
    // 없으면 Infinity fallback (루트 body 등)
    const containerBottom =
      parentLayout != null ? parentLayout.height : Infinity;
    const containerRight = parentLayout != null ? parentLayout.width : Infinity;
    renderRelY =
      resolveStickyY({
        elementY: relY,
        stickyTop: skiaData.stickyTop ?? 0,
        scrollOffset: parentScrollY,
        containerTop: 0,
        containerBottom,
        elementHeight: height,
      }) + cmdOffsetY;
    renderRelX =
      resolveStickyX({
        elementX: relX,
        stickyLeft: skiaData.stickyLeft ?? 0,
        scrollOffset: parentScrollX,
        containerLeft: 0,
        containerRight,
        elementWidth: width,
      }) + cmdOffsetX;
  }

  // ELEMENT_BEGIN
  // cmdOffsetX/Y: 페이지 오프셋 (루트 body 호출 시에만 non-zero)
  // canvas.translate()에 페이지 위치가 반영되어야 다중 페이지가 올바른 위치에 렌더링됨
  commands.push({
    type: CMD_ELEMENT_BEGIN,
    x: renderRelX,
    y: renderRelY,
    width,
    height,
    elementId,
    visible: skiaData.visible,
    transform: skiaData.transform,
    clipPath: skiaData.clipPath,
    blendMode: skiaData.blendMode,
    effects: skiaData.effects,
    isFixed: skiaData.isFixed,
    maskImage: skiaData.maskImage,
  });

  // 내부 자식 (text 등) → DRAW 커맨드
  const updatedInternalChildren = updateTextChildren(
    skiaData.children,
    width,
    height,
  );
  emitDrawCommands(skiaData, updatedInternalChildren, width, height, commands);

  // 외부 자식 (element children) → CHILDREN_BEGIN/END + 재귀
  const childElements = childrenMap.get(elementId);
  // ADR-050: clipChildren일 때 skiaData의 원본 크기 사용 (pageWidth/Height)
  // layoutMap의 height는 enrichment로 확장될 수 있어 clip이 무효화됨
  const clipWidth = skiaData.clipChildren
    ? skiaData.width > 0
      ? skiaData.width
      : width
    : width;
  const clipHeight = skiaData.clipChildren
    ? skiaData.height > 0
      ? skiaData.height
      : height
    : height;
  if (childElements && childElements.length > 0) {
    commands.push({
      type: CMD_CHILDREN_BEGIN,
      clipChildren: skiaData.clipChildren ?? false,
      width: clipWidth,
      height: clipHeight,
      scrollOffset: skiaData.scrollOffset,
    });

    // z-index 정렬: skiaNodeRegistry에서 각 자식의 zIndex 조회
    const sortedChildren = sortChildElementsByZIndex(childElements);

    // boundsMap에 scroll offset 반영: 자식의 절대 좌표에서 부모의 스크롤량 차감
    const scrollX = skiaData.scrollOffset?.scrollLeft ?? 0;
    const scrollY = skiaData.scrollOffset?.scrollTop ?? 0;

    for (const child of sortedChildren) {
      visitElement(
        child.id,
        absX - scrollX,
        absY - scrollY,
        commands,
        boundsMap,
        childrenMap,
        layoutMap,
        0,
        0,
        elementId,
      );
    }

    commands.push({
      type: CMD_CHILDREN_END,
      clipChildren: skiaData.clipChildren ?? false,
      hasScrollOffset: !!(
        skiaData.scrollOffset &&
        (skiaData.scrollOffset.scrollTop !== 0 ||
          skiaData.scrollOffset.scrollLeft !== 0)
      ),
      scrollbar: skiaData.scrollbar,
      scrollbarNode: skiaData.scrollbar ? skiaData : undefined,
    });
  }

  // ELEMENT_END
  const effectCount = skiaData.effects ? skiaData.effects.length : 0;
  commands.push({
    type: CMD_ELEMENT_END,
    hasBlend: !!(skiaData.blendMode && skiaData.blendMode !== "normal"),
    effectLayerCount: effectCount,
  });
}

/**
 * 자식 elements를 z-index로 정렬.
 * skiaNodeRegistry에서 zIndex를 조회한다.
 */
function sortChildElementsByZIndex(children: Element[]): Element[] {
  // z-index가 있는 자식이 하나라도 있는지 확인
  let hasZIndex = false;
  for (const child of children) {
    const node = getSkiaNode(child.id);
    if (node?.zIndex !== undefined) {
      hasZIndex = true;
      break;
    }
  }
  if (!hasZIndex) return children;

  const indexed = children.map((child, i) => ({
    child,
    originalIndex: i,
    zIndex: getSkiaNode(child.id)?.zIndex ?? 0,
  }));
  indexed.sort((a, b) => {
    if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
    return a.originalIndex - b.originalIndex;
  });
  return indexed.map((item) => item.child);
}

/**
 * 단일 element의 Skia 렌더 데이터를 DRAW 커맨드로 변환.
 * 내부 자식 (SkiaNodeData.children)도 재귀적으로 DRAW로 변환.
 */
function emitDrawCommands(
  skiaData: SkiaNodeData,
  internalChildren: SkiaNodeData[] | undefined,
  width: number,
  height: number,
  commands: RenderCommand[],
): void {
  // 자체 렌더 (box, text, image 등)
  if (skiaData.type !== "container") {
    commands.push({
      type: CMD_DRAW,
      nodeType: skiaData.type,
      skiaData: {
        ...skiaData,
        x: 0, // ELEMENT_BEGIN에서 이미 translate됨
        y: 0,
        width,
        height,
        children: undefined, // 내부 자식은 별도 처리
      },
      width,
      height,
    });
  }

  // 내부 자식 DRAW (spec shapes 등)
  if (internalChildren) {
    for (const child of internalChildren) {
      emitInternalChildDraw(child, commands);
    }
  }
}

/**
 * 내부 자식 (SkiaNodeData.children)을 재귀적으로 DRAW로 변환.
 * 이들은 element가 아닌 spec shapes 등의 렌더 노드.
 */
function emitInternalChildDraw(
  node: SkiaNodeData,
  commands: RenderCommand[],
): void {
  // 내부 자식은 element가 아니므로 ELEMENT_BEGIN/END 없이
  // 부모의 save/restore 컨텍스트 안에서 DRAW만 발행.
  // 단, 이들이 독립적인 위치를 가질 수 있으므로 별도 ELEMENT_BEGIN/END로 감싸야 한다.
  commands.push({
    type: CMD_ELEMENT_BEGIN,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    elementId: "", // 내부 자식은 elementId 없음
    visible: node.visible ?? true,
    transform: node.transform,
    clipPath: node.clipPath,
    blendMode: node.blendMode,
    effects: node.effects,
  });

  if (node.type !== "container") {
    commands.push({
      type: CMD_DRAW,
      nodeType: node.type,
      skiaData: {
        ...node,
        x: 0,
        y: 0,
        children: undefined,
      },
      width: node.width,
      height: node.height,
    });
  }

  // 재귀: 내부 자식의 자식
  if (node.children) {
    for (const child of node.children) {
      emitInternalChildDraw(child, commands);
    }
  }

  const effectCount = node.effects ? node.effects.length : 0;
  commands.push({
    type: CMD_ELEMENT_END,
    hasBlend: !!(node.blendMode && node.blendMode !== "normal"),
    effectLayerCount: effectCount,
  });
}

// ── executeRenderCommands ─────────────────────────────────────────────

/**
 * RenderCommand[] 플랫 배열을 선형 for 루프로 실행하여 CanvasKit 드로콜 발행.
 */
export function executeRenderCommands(
  ck: CanvasKit,
  canvas: Canvas,
  commands: RenderCommand[],
  cullingBounds: DOMRect,
  fontMgr?: FontMgr,
): void {
  const cullLeft = cullingBounds.x;
  const cullTop = cullingBounds.y;
  const cullRight = cullLeft + cullingBounds.width;
  const cullBottom = cullTop + cullingBounds.height;

  // 절대좌표 추적 스택 (컬링용)
  const translateStack: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
  let stackTop = 0;

  // 현재 요소 ID 스택 (편집 중 텍스트 숨김용)
  const elementIdStack: string[] = [""];
  let eidTop = 0;
  const editingId = getEditingElementId();

  // 비가시 요소 스킵 카운터
  let skipDepth = 0;

  // 드래그 반투명 레이어 추적 스택 (ELEMENT_BEGIN/END 쌍 대응)
  const dragAlphaStack: boolean[] = [];

  // mask-image 레이어 스택: 요소별 마스크 정보 저장
  // ELEMENT_BEGIN에서 mask 있으면 push, ELEMENT_END에서 pop 후 합성
  interface MaskLayerEntry {
    maskImage: MaskImageStyle;
    width: number;
    height: number;
    /** mask를 실제로 적용하는 함수 (저장 시점의 canvas context 캡처) */
    apply: () => void;
  }
  const maskLayerStack: Array<MaskLayerEntry | null> = [];

  const len = commands.length;
  for (let i = 0; i < len; i++) {
    const cmd = commands[i];

    // 비가시 요소 스킵
    if (skipDepth > 0) {
      if (cmd.type === CMD_ELEMENT_BEGIN) {
        skipDepth++;
      } else if (cmd.type === CMD_ELEMENT_END) {
        skipDepth--;
      }
      continue;
    }

    switch (cmd.type) {
      case CMD_ELEMENT_BEGIN: {
        if (!cmd.visible) {
          skipDepth = 1;
          continue;
        }

        // AABB 컬링 (width/height=0 가상 컨테이너는 스킵)
        if (cmd.width > 0 || cmd.height > 0) {
          const parent = translateStack[stackTop];
          const nodeLeft = parent.x + cmd.x;
          const nodeTop = parent.y + cmd.y;
          const nodeRight = nodeLeft + cmd.width;
          const nodeBottom = nodeTop + cmd.height;
          if (
            cullLeft > nodeRight ||
            cullRight < nodeLeft ||
            cullTop > nodeBottom ||
            cullBottom < nodeTop
          ) {
            skipDepth = 1;
            continue;
          }
        }

        // elementId 스택 갱신 (편집 중 텍스트 숨김용)
        // 실제 element의 ELEMENT_BEGIN은 non-empty elementId를 가짐
        // 내부 자식(spec shapes)은 빈 문자열 → 부모 elementId를 유지
        eidTop++;
        if (eidTop >= elementIdStack.length) {
          elementIdStack.push(cmd.elementId || elementIdStack[eidTop - 1]);
        } else {
          elementIdStack[eidTop] = cmd.elementId || elementIdStack[eidTop - 1];
        }

        // Pencil deferred-drop: 드래그 대상 요소에 시각적 오프셋 적용
        const dragOff = getDragVisualOffset();
        const hasDragOffset =
          dragOff !== null && cmd.elementId === dragOff.elementId;
        const sibOff = !hasDragOffset
          ? getSiblingOffset(cmd.elementId)
          : undefined;
        const dox = hasDragOffset ? dragOff.dx : (sibOff?.dx ?? 0);
        const doy = hasDragOffset ? dragOff.dy : (sibOff?.dy ?? 0);

        // translate 스택 갱신
        const parentPos = translateStack[stackTop];
        stackTop++;
        if (stackTop >= translateStack.length) {
          translateStack.push({
            x: parentPos.x + cmd.x + dox,
            y: parentPos.y + cmd.y + doy,
          });
        } else {
          translateStack[stackTop] = {
            x: parentPos.x + cmd.x + dox,
            y: parentPos.y + cmd.y + doy,
          };
        }

        canvas.save();
        // position: fixed — camera 역보정 인프라 (TODO: cameraX/Y 파라미터 수신 후 활성화)
        // 현재는 buildRenderCommandStream에서 이미 보정된 좌표를 사용하므로
        // translate는 일반 경로와 동일하게 처리.
        // 향후: executeRenderCommands(ck, canvas, commands, bounds, fontMgr, cameraX, cameraY)
        // 로 시그니처 확장 후 isFixed 요소에 canvas.translate(-cameraX, -cameraY) 적용.
        canvas.translate(cmd.x + dox, cmd.y + doy);

        // A-8: 드래그 중인 요소 반투명 처리
        if (hasDragOffset) {
          const alphaPaint = new ck.Paint();
          alphaPaint.setAlphaf(0.5);
          canvas.saveLayer(alphaPaint);
          alphaPaint.delete();
          dragAlphaStack.push(true);
        } else {
          dragAlphaStack.push(false);
        }

        if (cmd.transform) {
          canvas.concat(cmd.transform);
        }

        if (cmd.clipPath) {
          const clipP = buildClipPath(ck, cmd.clipPath, cmd.width, cmd.height);
          if (clipP) {
            canvas.clipPath(clipP, ck.ClipOp.Intersect, true);
            clipP.delete();
          }
        }

        if (cmd.blendMode && cmd.blendMode !== "normal") {
          const blendPaint = new ck.Paint();
          blendPaint.setBlendMode(
            toSkiaBlendMode(ck, cmd.blendMode) as Parameters<
              typeof blendPaint.setBlendMode
            >[0],
          );
          canvas.saveLayer(blendPaint);
          blendPaint.delete();
        }

        if (cmd.effects) {
          beginRenderEffects(ck, canvas, cmd.effects);
        }

        // mask-image: 이 요소의 모든 드로콜을 offscreen에 캡처하기 위해
        // saveLayer를 추가로 호출한다. ELEMENT_END에서 mask 합성 후 restore.
        if (
          cmd.maskImage &&
          cmd.maskImage.type === "gradient" &&
          cmd.maskImage.gradient
        ) {
          const maskInfo = cmd.maskImage;
          const maskWidth = cmd.width;
          const maskHeight = cmd.height;
          canvas.saveLayer();
          maskLayerStack.push({
            maskImage: maskInfo,
            width: maskWidth,
            height: maskHeight,
            apply: () => {
              // saveLayer로 캡처된 layer 위에 DstIn 블렌드로 gradient mask 그리기
              const maskShader = buildMaskGradientShader(
                ck,
                maskInfo.gradient!,
              );
              if (!maskShader) return;
              try {
                const mode = determineMaskMode(
                  undefined,
                  "gradient",
                  maskInfo.mode,
                );
                applyMaskImage(
                  ck,
                  canvas,
                  maskWidth,
                  maskHeight,
                  maskShader,
                  mode,
                  // content는 이미 saveLayer로 캡처되어 있으므로 빈 콜백
                  // 실제 합성은 applyMaskImage 내부의 drawRect(DstIn)로 처리
                  () => {},
                );
              } finally {
                maskShader.delete();
              }
            },
          });
        } else if (
          cmd.maskImage &&
          cmd.maskImage.type === "image" &&
          cmd.maskImage.imageUrl
        ) {
          // image mask: imageCache에서 SkImage 조회
          const maskSkImage = getSkImage(cmd.maskImage.imageUrl);
          if (maskSkImage) {
            const maskInfo = cmd.maskImage;
            const maskWidth = cmd.width;
            const maskHeight = cmd.height;
            canvas.saveLayer();
            maskLayerStack.push({
              maskImage: maskInfo,
              width: maskWidth,
              height: maskHeight,
              apply: () => {
                const imgShader = (
                  maskSkImage as {
                    makeShaderOptions(
                      tx: unknown,
                      ty: unknown,
                      fm: unknown,
                      mm: unknown,
                    ): { delete(): void };
                  }
                ).makeShaderOptions(
                  ck.TileMode.Clamp,
                  ck.TileMode.Clamp,
                  ck.FilterMode.Linear,
                  ck.MipmapMode.None,
                );
                try {
                  const mode = determineMaskMode(
                    maskInfo.imageUrl,
                    undefined,
                    maskInfo.mode,
                  );
                  applyMaskImage(
                    ck,
                    canvas,
                    maskWidth,
                    maskHeight,
                    imgShader,
                    mode,
                    () => {},
                  );
                } finally {
                  imgShader.delete();
                }
              },
            });
          } else {
            // 이미지 미로딩 → 비동기 로드 트리거, 이번 프레임은 mask 없이
            loadSkImage(cmd.maskImage.imageUrl);
            maskLayerStack.push(null);
          }
        } else {
          maskLayerStack.push(null);
        }
        break;
      }

      case CMD_DRAW: {
        // 타입별 렌더링 디스패치
        switch (cmd.nodeType) {
          case "box":
            renderBox(ck, canvas, cmd.skiaData);
            break;
          case "text":
            if (cmd.skiaData.box) renderBox(ck, canvas, cmd.skiaData);
            // Pencil hideText: 편집 중인 요소의 텍스트만 숨김 (배경/보더 유지)
            if (fontMgr && !(editingId && elementIdStack[eidTop] === editingId))
              renderText(ck, canvas, cmd.skiaData, fontMgr);
            break;
          case "image":
            renderImage(ck, canvas, cmd.skiaData);
            break;
          case "line":
            renderLine(ck, canvas, cmd.skiaData);
            break;
          case "icon_path":
            renderIconPath(ck, canvas, cmd.skiaData);
            break;
          case "partial_border":
            renderPartialBorder(ck, canvas, cmd.skiaData);
            break;
          case "container":
            break;
        }
        break;
      }

      case CMD_CHILDREN_BEGIN: {
        if (cmd.clipChildren && cmd.width > 0 && cmd.height > 0) {
          canvas.save();
          const clipRect = ck.LTRBRect(0, 0, cmd.width, cmd.height);
          canvas.clipRect(clipRect, ck.ClipOp.Intersect, true);
        }

        if (
          cmd.scrollOffset &&
          (cmd.scrollOffset.scrollTop !== 0 ||
            cmd.scrollOffset.scrollLeft !== 0)
        ) {
          canvas.save();
          canvas.translate(
            -cmd.scrollOffset.scrollLeft,
            -cmd.scrollOffset.scrollTop,
          );
        }
        break;
      }

      case CMD_CHILDREN_END: {
        if (cmd.hasScrollOffset) {
          canvas.restore();
        }

        if (cmd.scrollbar && cmd.scrollbarNode) {
          renderScrollbar(ck, canvas, cmd.scrollbarNode);
        }

        if (cmd.clipChildren) {
          canvas.restore();
        }
        break;
      }

      case CMD_ELEMENT_END: {
        endRenderEffects(canvas, cmd.effectLayerCount);
        if (cmd.hasBlend) canvas.restore();
        // A-8: 드래그 반투명 레이어 복원
        const hadDragAlpha = dragAlphaStack.pop();
        if (hadDragAlpha) canvas.restore();
        // mask-image: saveLayer 복원 후 mask gradient 합성
        const maskEntry = maskLayerStack.pop();
        if (maskEntry) {
          canvas.restore(); // saveLayer(content) 복원
          maskEntry.apply(); // DstIn gradient 드로콜
        }
        canvas.restore();
        if (stackTop > 0) stackTop--;
        if (eidTop > 0) eidTop--;
        break;
      }
    }
  }
}

/**
 * boundsMap + skiaNodeRegistry에서 AI 이펙트 대상의 AIEffectNodeBounds를 구성.
 * buildNodeBoundsMap() DFS를 대체한다.
 */
export function buildAIBoundsFromStream(
  boundsMap: Map<string, BoundingBox>,
  targetIds: Set<string>,
): Map<string, AIEffectNodeBounds> {
  const result = new Map<string, AIEffectNodeBounds>();
  for (const id of targetIds) {
    const bounds = boundsMap.get(id);
    if (!bounds) continue;
    const node = getSkiaNode(id);
    const borderRadius = node?.box
      ? Array.isArray(node.box.borderRadius)
        ? node.box.borderRadius[0]
        : (node.box.borderRadius ?? 0)
      : 0;
    result.set(id, {
      elementId: id,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      borderRadius,
    });
  }
  return result;
}
