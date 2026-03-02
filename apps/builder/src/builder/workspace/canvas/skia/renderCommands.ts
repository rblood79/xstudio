/**
 * Phase 3: Flat Render Command Stream
 *
 * elementsMap + childrenMap + fullTreeLayoutMap + skiaNodeRegistry에서 직접
 * 렌더 커맨드 스트림(플랫 배열)을 구성하여 PixiJS 순회 제거 + 선형 렌더링.
 *
 * @see ADR-005 Phase 3
 * @since 2026-02-28
 */

import type { CanvasKit, Canvas, FontMgr } from 'canvaskit-wasm';
import type { SkiaNodeData } from './nodeRenderers';
import type { ClipPathShape } from '../sprites/styleConverter';
import type { EffectStyle } from './types';
import type { ComputedLayout } from '../layout/engines/LayoutEngine';
import type { BoundingBox } from '../selection/types';
import type { AIEffectNodeBounds } from './types';
import type { Element } from '../../../../types/core/store.types';
import { getSkiaNode } from './useSkiaNode';
import {
  renderBox,
  renderText,
  renderImage,
  renderLine,
  renderIconPath,
  renderPartialBorder,
  renderScrollbar,
  buildClipPath,
  sortByStackingOrder,
} from './nodeRenderers';
import { beginRenderEffects, endRenderEffects } from './effects';
import { toSkiaBlendMode } from './blendModes';
import { WASM_FLAGS } from '../wasm-bindings/featureFlags';
import * as spatialIndex from '../wasm-bindings/spatialIndex';

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
}

interface DrawCmd {
  type: typeof CMD_DRAW;
  nodeType: SkiaNodeData['type'];
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
  scrollbar?: SkiaNodeData['scrollbar'];
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

// ── updateTextChildren (SkiaOverlay.tsx:91-129에서 이동) ──────────────

function updateTextChildren(
  children: SkiaNodeData[] | undefined,
  parentWidth: number,
  parentHeight: number,
): SkiaNodeData[] | undefined {
  return children?.map((child: SkiaNodeData) => {
    if (child.type === 'text' && child.text) {
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
    if (child.type === 'box' && child.children && child.children.length > 0) {
      const updatedChildren = updateTextChildren(child.children, parentWidth, parentHeight);
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
let _cacheLayoutVersion = -1;

/**
 * 캐시 기반 커맨드 스트림 획득.
 *
 * registryVersion + pagePositionsVersion + sharedLayoutVersion 3중 키.
 */
export function getCachedCommandStream(
  rootElementIds: string[],
  childrenMap: Map<string, Element[]>,
  layoutMap: Map<string, ComputedLayout>,
  pagePositions: Record<string, { x: number; y: number }>,
  registryVersion: number,
  pagePosVersion: number,
  layoutVersion: number,
): RenderCommandStream {
  if (
    _cachedStream &&
    registryVersion === _cacheRegVersion &&
    pagePosVersion === _cachePagePosVersion &&
    layoutVersion === _cacheLayoutVersion
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
  _cacheLayoutVersion = layoutVersion;

  return stream;
}

/**
 * 커맨드 스트림 캐시 무효화 (pagePositions stale 프레임 등)
 */
export function invalidateCommandStreamCache(): void {
  _cachedStream = null;
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

    visitElement(bodyId, offsetX, offsetY, commands, boundsMap, childrenMap, layoutMap, offsetX, offsetY);
  }

  // SpatialIndex 동기화: boundsMap에 최신 씬 좌표를 반영
  if (WASM_FLAGS.SPATIAL_INDEX) {
    syncSpatialIndex(boundsMap);
  }

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
  const items: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];
  for (const [id, bounds] of boundsMap) {
    if (bounds.width > 0 && bounds.height > 0) {
      items.push({ id, x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height });
    }
  }
  spatialIndex.batchUpdate(items);
}

/**
 * DFS pre-order 순회: 단일 element를 커맨드 스트림으로 변환.
 *
 * @param cmdOffsetX - 커맨드의 x에 추가할 오프셋 (페이지 오프셋용, 루트 호출에만 전달)
 * @param cmdOffsetY - 커맨드의 y에 추가할 오프셋 (페이지 오프셋용, 루트 호출에만 전달)
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
  const width = rawWidth > 0 ? rawWidth : (skiaData.width > 0 ? skiaData.width : 0);
  const baseHeight = rawHeight > 0 ? rawHeight : (skiaData.height > 0 ? skiaData.height : 0);
  const height = skiaData.contentMinHeight
    ? Math.max(baseHeight, skiaData.contentMinHeight)
    : baseHeight;

  // 절대 좌표
  const absX = parentAbsX + relX;
  const absY = parentAbsY + relY;

  // boundsMap에 절대 좌표 기록
  boundsMap.set(elementId, { x: absX, y: absY, width, height });

  // ELEMENT_BEGIN
  // cmdOffsetX/Y: 페이지 오프셋 (루트 body 호출 시에만 non-zero)
  // canvas.translate()에 페이지 위치가 반영되어야 다중 페이지가 올바른 위치에 렌더링됨
  commands.push({
    type: CMD_ELEMENT_BEGIN,
    x: relX + cmdOffsetX,
    y: relY + cmdOffsetY,
    width,
    height,
    elementId,
    visible: skiaData.visible,
    transform: skiaData.transform,
    clipPath: skiaData.clipPath,
    blendMode: skiaData.blendMode,
    effects: skiaData.effects,
  });

  // 내부 자식 (text 등) → DRAW 커맨드
  const updatedInternalChildren = updateTextChildren(skiaData.children, width, height);
  emitDrawCommands(skiaData, updatedInternalChildren, width, height, commands);

  // 외부 자식 (element children) → CHILDREN_BEGIN/END + 재귀
  const childElements = childrenMap.get(elementId);
  if (childElements && childElements.length > 0) {
    commands.push({
      type: CMD_CHILDREN_BEGIN,
      clipChildren: skiaData.clipChildren ?? false,
      width,
      height,
      scrollOffset: skiaData.scrollOffset,
    });

    // z-index 정렬: skiaNodeRegistry에서 각 자식의 zIndex 조회
    const sortedChildren = sortChildElementsByZIndex(childElements);

    for (const child of sortedChildren) {
      visitElement(child.id, absX, absY, commands, boundsMap, childrenMap, layoutMap);
    }

    commands.push({
      type: CMD_CHILDREN_END,
      clipChildren: skiaData.clipChildren ?? false,
      hasScrollOffset: !!(skiaData.scrollOffset &&
        (skiaData.scrollOffset.scrollTop !== 0 || skiaData.scrollOffset.scrollLeft !== 0)),
      scrollbar: skiaData.scrollbar,
      scrollbarNode: skiaData.scrollbar ? skiaData : undefined,
    });
  }

  // ELEMENT_END
  const effectCount = skiaData.effects
    ? skiaData.effects.length
    : 0;
  commands.push({
    type: CMD_ELEMENT_END,
    hasBlend: !!(skiaData.blendMode && skiaData.blendMode !== 'normal'),
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
  return indexed.map(item => item.child);
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
  if (skiaData.type !== 'container') {
    commands.push({
      type: CMD_DRAW,
      nodeType: skiaData.type,
      skiaData: {
        ...skiaData,
        x: 0,  // ELEMENT_BEGIN에서 이미 translate됨
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
    elementId: '', // 내부 자식은 elementId 없음
    visible: node.visible ?? true,
    transform: node.transform,
    clipPath: node.clipPath,
    blendMode: node.blendMode,
    effects: node.effects,
  });

  if (node.type !== 'container') {
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
    hasBlend: !!(node.blendMode && node.blendMode !== 'normal'),
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

  // 비가시 요소 스킵 카운터
  let skipDepth = 0;

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

        // translate 스택 갱신
        const parentPos = translateStack[stackTop];
        stackTop++;
        if (stackTop >= translateStack.length) {
          translateStack.push({ x: parentPos.x + cmd.x, y: parentPos.y + cmd.y });
        } else {
          translateStack[stackTop] = { x: parentPos.x + cmd.x, y: parentPos.y + cmd.y };
        }

        canvas.save();
        canvas.translate(cmd.x, cmd.y);

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

        if (cmd.blendMode && cmd.blendMode !== 'normal') {
          const blendPaint = new ck.Paint();
          blendPaint.setBlendMode(
            toSkiaBlendMode(ck, cmd.blendMode) as Parameters<typeof blendPaint.setBlendMode>[0],
          );
          canvas.saveLayer(blendPaint);
          blendPaint.delete();
        }

        if (cmd.effects) {
          beginRenderEffects(ck, canvas, cmd.effects);
        }
        break;
      }

      case CMD_DRAW: {
        // 타입별 렌더링 디스패치
        switch (cmd.nodeType) {
          case 'box':
            renderBox(ck, canvas, cmd.skiaData);
            break;
          case 'text':
            if (cmd.skiaData.box) renderBox(ck, canvas, cmd.skiaData);
            if (fontMgr) renderText(ck, canvas, cmd.skiaData, fontMgr);
            break;
          case 'image':
            renderImage(ck, canvas, cmd.skiaData);
            break;
          case 'line':
            renderLine(ck, canvas, cmd.skiaData);
            break;
          case 'icon_path':
            renderIconPath(ck, canvas, cmd.skiaData);
            break;
          case 'partial_border':
            renderPartialBorder(ck, canvas, cmd.skiaData);
            break;
          case 'container':
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

        if (cmd.scrollOffset &&
          (cmd.scrollOffset.scrollTop !== 0 || cmd.scrollOffset.scrollLeft !== 0)) {
          canvas.save();
          canvas.translate(-cmd.scrollOffset.scrollLeft, -cmd.scrollOffset.scrollTop);
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
        canvas.restore();
        if (stackTop > 0) stackTop--;
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
      ? (Array.isArray(node.box.borderRadius) ? node.box.borderRadius[0] : (node.box.borderRadius ?? 0))
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
