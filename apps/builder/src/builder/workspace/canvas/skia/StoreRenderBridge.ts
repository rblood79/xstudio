/**
 * StoreRenderBridge (ADR-100 Phase 6.2 + 증분 갱신)
 *
 * Zustand store 변경을 감지하여 skiaNodeRegistry를 직접 채운다.
 * PixiJS Sprite 컴포넌트(ElementSprite/BoxSprite/TextSprite/ImageSprite)의
 * useSkiaNode() 호출을 대체.
 *
 * 증분 갱신: prevElementsMap 참조 비교로 변경된 요소만 rebuild.
 * Zustand immutable update 패턴 덕분에 변경된 요소만 새 참조를 가짐.
 *
 * 사용법:
 *   const bridge = new StoreRenderBridge();
 *   bridge.connect(store);  // store subscribe 시작
 *   bridge.dispose();       // cleanup
 */

import type { Element } from "../../../../types/core/store.types";
import type { ComputedLayout } from "../layout/engines/LayoutEngine";
import { buildSkiaNodeData, type BuildContext } from "./buildSkiaNodeData";
import { buildBoxNodeData } from "./buildBoxNodeData";
import { buildTextNodeData } from "./buildTextNodeData";
import { buildImageNodeData } from "./buildImageNodeData";
import { buildSpecNodeData } from "./buildSpecNodeData";
import { registerSkiaNode, unregisterSkiaNode } from "./useSkiaNode";
import { getSkImage, loadSkImage, releaseSkImage } from "./imageCache";
import { getSpecForTag, TEXT_TAGS, IMAGE_TAGS } from "../sprites/tagSpecMap";
import { onLayoutPublished } from "../layout";
import type { TransitionManager } from "./transitionManager";

function isTextElement(element: Element): boolean {
  return TEXT_TAGS.has(element.tag);
}

function isImageElement(element: Element): boolean {
  return IMAGE_TAGS.has(element.tag);
}

/**
 * TEXT_TAGS ∩ TAG_SPEC_MAP 중 parent delegation이 필요한 태그.
 * 이 태그들은 buildSpecNodeData (spec 경로)로 라우팅하여
 * parentDelegatedSize, necessityIndicator, labelAlignment 등을 처리.
 * 나머지 TEXT_TAGS (Text, Heading, Kbd, Code)는
 * buildTextNodeData (텍스트 경로)로 라우팅하여 inline CSS style 지원.
 */
const SPEC_PREFERRED_TEXT_TAGS = new Set([
  "Label",
  "FieldError",
  "InlineAlert",
  "Description", // InlineAlert parent font delegation
]);

const EMPTY_LAYOUT_MAP = new Map<string, ComputedLayout>();

// ---------------------------------------------------------------------------
// CSS Transition 헬퍼
// ---------------------------------------------------------------------------

interface TransitionDef {
  property: string;
  duration: number; // ms
  easing: string;
}

export function parseTransitionShorthand(value: string): TransitionDef[] {
  if (!value || value === "none") return [];
  return value.split(",").map((part) => {
    const tokens = part.trim().split(/\s+/);
    const property = tokens[0] ?? "all";
    const durationStr = tokens[1] ?? "0s";
    let duration = parseFloat(durationStr);
    if (!durationStr.endsWith("ms") && durationStr.endsWith("s")) {
      duration *= 1000;
    }
    const easing = tokens[2] ?? "ease";
    return { property, duration, easing };
  });
}

/**
 * CSS transition 대상 numeric 속성 목록.
 * Element.props.style에서 읽을 때 사용하는 키 이름.
 */
const NUMERIC_TRANSITION_PROPERTIES = new Set([
  "opacity",
  "width",
  "height",
  "borderRadius",
  "fontSize",
  "letterSpacing",
  "lineHeight",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "top",
  "right",
  "bottom",
  "left",
  "gap",
  "columnGap",
  "rowGap",
  "rotate",
  "scaleX",
  "scaleY",
  "translateX",
  "translateY",
]);

/**
 * element.props.style에서 numeric 속성값을 추출한다.
 * 문자열(예: "16px")인 경우 parseFloat으로 숫자 추출.
 */
function getNumericStyleValue(
  style: Record<string, unknown>,
  property: string,
): number | undefined {
  const val = style[property];
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/** Spec 경로 사용 여부: TAG_SPEC_MAP 등록 + TEXT_TAGS 미등록 또는 delegation 필요 */
function useSpecPath(element: Element): boolean {
  if (!getSpecForTag(element.tag)) return false;
  if (!TEXT_TAGS.has(element.tag)) return true;
  return SPEC_PREFERRED_TEXT_TAGS.has(element.tag);
}

// ---------------------------------------------------------------------------
// StoreRenderBridge
// ---------------------------------------------------------------------------

export class StoreRenderBridge {
  private unsubscribe: (() => void) | null = null;
  private unsubscribeLayout: (() => void) | null = null;
  private registeredIds = new Set<string>();
  /** 이미지 src → element id 매핑 (라이프사이클 관리) */
  private loadedImageSrcs = new Map<string, string>();
  /** 비동기 이미지 로딩 후 재동기화용 콜백 */
  private pendingResync: (() => void) | null = null;
  /** 이전 elementsMap 참조 (증분 갱신용) */
  private prevElementsMap: Map<string, Element> | null = null;
  /** CSS transition 애니메이션 매니저 (선택 연결) */
  public transitionManager: TransitionManager | null = null;

  /**
   * Store에 연결하여 elementsMap 변경 시 skiaNodeRegistry를 갱신.
   */
  connect(options: {
    getElements: () => Map<string, Element>;
    getLayoutMap: () => Map<string, ComputedLayout> | null;
    getChildrenMap?: () => Map<string, Element[]>;
    subscribe: (callback: () => void) => () => void;
    theme?: "light" | "dark";
  }): void {
    this.dispose();

    const {
      getElements,
      getLayoutMap,
      getChildrenMap,
      subscribe,
      theme = "light",
    } = options;

    const resync = () => {
      this.sync(
        getElements(),
        getLayoutMap(),
        theme,
        getChildrenMap?.() ?? null,
      );
    };
    this.pendingResync = resync;

    // 초기 동기화 (전체 rebuild)
    resync();

    // 변경 구독: Zustand store + layout publish
    this.unsubscribe = subscribe(resync);
    this.unsubscribeLayout = onLayoutPublished(resync);
  }

  /**
   * 동기화: 증분 갱신 또는 전체 rebuild 자동 선택.
   */
  sync(
    elementsMap: Map<string, Element>,
    layoutMap: Map<string, ComputedLayout> | null,
    theme: "light" | "dark",
    childrenMap: Map<string, Element[]> | null = null,
  ): void {
    const changedIds = this.detectChangedIds(elementsMap);

    if (changedIds === null) {
      // 첫 실행: 전체 rebuild
      this.fullRebuild(elementsMap, layoutMap, theme, childrenMap);
    } else if (changedIds.size === 0) {
      // 동일 참조 = 요소 변경 없음, layout만 변경 → 전체 rebuild
      this.fullRebuild(elementsMap, layoutMap, theme, childrenMap);
    } else {
      // 증분 갱신: 변경된 요소만 rebuild
      this.incrementalSync(
        changedIds,
        elementsMap,
        layoutMap,
        theme,
        childrenMap,
      );
    }

    this.prevElementsMap = elementsMap;
  }

  /**
   * 변경된 요소 ID 감지 (참조 비교).
   * - null: 첫 실행 → 전체 rebuild 필요
   * - empty Set: 변경 없음
   * - non-empty Set: 변경된 요소 ID 목록
   */
  private detectChangedIds(
    elementsMap: Map<string, Element>,
  ): Set<string> | null {
    if (!this.prevElementsMap) return null;
    if (this.prevElementsMap === elementsMap) return new Set();

    const changed = new Set<string>();

    // 추가/변경된 요소 (Zustand immutable → 변경 시 새 참조)
    for (const [id, el] of elementsMap) {
      const prev = this.prevElementsMap.get(id);
      if (!prev || prev !== el) changed.add(id);
    }

    // 삭제된 요소
    for (const id of this.prevElementsMap.keys()) {
      if (!elementsMap.has(id)) changed.add(id);
    }

    return changed;
  }

  /**
   * 증분 갱신: 변경된 요소만 rebuild.
   */
  private incrementalSync(
    changedIds: Set<string>,
    elementsMap: Map<string, Element>,
    layoutMap: Map<string, ComputedLayout> | null,
    theme: "light" | "dark",
    childrenMap: Map<string, Element[]> | null,
  ): void {
    const ctx: BuildContext = {
      layoutMap: layoutMap ?? EMPTY_LAYOUT_MAP,
      theme,
    };

    for (const id of changedIds) {
      const element = elementsMap.get(id);
      if (!element) {
        // 삭제된 요소
        unregisterSkiaNode(id);
        this.registeredIds.delete(id);
        this.transitionManager?.remove(id);
        // 이미지 해제
        const oldSrc = this.loadedImageSrcs.get(id);
        if (oldSrc) {
          releaseSkImage(oldSrc);
          this.loadedImageSrcs.delete(id);
        }
        continue;
      }

      // CSS transition 트리거: 이전 element가 있고 transitionManager가 연결된 경우
      if (this.transitionManager && this.prevElementsMap) {
        const prevElement = this.prevElementsMap.get(id);
        if (prevElement && prevElement !== element) {
          this.triggerTransitions(id, prevElement, element);
        }
      }

      // 추가 또는 변경된 요소 rebuild
      this.registeredIds.add(id);
      const layout = ctx.layoutMap.get(id) ?? undefined;
      const nodeData = this.buildNodeForElement(
        element,
        id,
        layout,
        ctx,
        elementsMap,
        childrenMap,
      );
      if (nodeData) {
        registerSkiaNode(id, nodeData);
      }
    }
  }

  /**
   * 전체 rebuild: 모든 요소 순회 + skiaNodeRegistry 갱신.
   */
  private fullRebuild(
    elementsMap: Map<string, Element>,
    layoutMap: Map<string, ComputedLayout> | null,
    theme: "light" | "dark",
    childrenMap: Map<string, Element[]> | null,
  ): void {
    const ctx: BuildContext = {
      layoutMap: layoutMap ?? EMPTY_LAYOUT_MAP,
      theme,
    };

    const currentIds = new Set<string>();
    const currentImageSrcs = new Map<string, string>();

    for (const [id, element] of elementsMap) {
      currentIds.add(id);

      const layout = ctx.layoutMap.get(id) ?? undefined;
      const nodeData = this.buildNodeForElement(
        element,
        id,
        layout,
        ctx,
        elementsMap,
        childrenMap,
      );

      if (nodeData) {
        registerSkiaNode(id, nodeData);
      }

      // 이미지 추적
      if (isImageElement(element)) {
        const src = getImageSrc(element);
        if (src) {
          currentImageSrcs.set(id, src);
          if (!getSkImage(src) && !this.loadedImageSrcs.has(id)) {
            this.loadImageAsync(id, src);
          }
        }
      }
    }

    // 삭제된 요소 unregister
    for (const id of this.registeredIds) {
      if (!currentIds.has(id)) {
        unregisterSkiaNode(id);
      }
    }

    // 삭제된 이미지 src 해제
    for (const [id, src] of this.loadedImageSrcs) {
      if (!currentImageSrcs.has(id) || currentImageSrcs.get(id) !== src) {
        releaseSkImage(src);
      }
    }

    this.registeredIds = currentIds;
    this.loadedImageSrcs = currentImageSrcs;
  }

  /**
   * 단일 요소의 SkiaNodeData 빌드 (routing + build).
   */
  private buildNodeForElement(
    element: Element,
    id: string,
    layout: ComputedLayout | undefined,
    ctx: BuildContext,
    elementsMap: Map<string, Element>,
    childrenMap: Map<string, Element[]> | null,
  ): import("./nodeRendererTypes").SkiaNodeData | null {
    if (useSpecPath(element)) {
      const childElements = childrenMap?.get(id) ?? undefined;
      const nodeData = buildSpecNodeData({
        element,
        layout,
        theme: ctx.theme,
        childElements,
        elementsMap,
      });
      if (nodeData) return nodeData;
      return (
        buildBoxNodeData({ element, layout }) ?? buildSkiaNodeData(element, ctx)
      );
    }

    if (isTextElement(element)) {
      return buildTextNodeData({ element, layout, theme: ctx.theme });
    }

    if (isImageElement(element)) {
      const src = getImageSrc(element);
      const skImage = src ? getSkImage(src) : null;

      if (src) {
        const alreadyLoading = this.loadedImageSrcs.has(id);
        this.loadedImageSrcs.set(id, src);
        if (!skImage && !alreadyLoading) {
          this.loadImageAsync(id, src);
        }
      }

      return buildImageNodeData({ element, layout, skImage });
    }

    // Box / fallback
    const tag = (element.tag ?? "").toLowerCase();
    const isCollectionItem = tag === "gridlistitem" || tag === "listboxitem";
    return (
      buildBoxNodeData({ element, layout, isCollectionItem }) ??
      buildSkiaNodeData(element, ctx)
    );
  }

  /**
   * CSS transition 트리거: 이전/현재 element style 비교 후
   * 변경된 numeric 속성에 대해 transitionManager.start() 호출.
   */
  private triggerTransitions(
    elementId: string,
    prevElement: Element,
    nextElement: Element,
  ): void {
    const tm = this.transitionManager;
    if (!tm) return;

    const nextStyle = (nextElement.props as Record<string, unknown>)?.style as
      | Record<string, unknown>
      | undefined;
    if (!nextStyle) return;

    const transitionValue = nextStyle.transition as string | undefined;
    if (!transitionValue || transitionValue === "none") return;

    const defs = parseTransitionShorthand(transitionValue);
    if (defs.length === 0) return;

    const prevStyle = ((prevElement.props as Record<string, unknown>)?.style ??
      {}) as Record<string, unknown>;

    for (const def of defs) {
      const { property, duration, easing } = def;
      if (duration <= 0) continue;

      // "all" 처리: NUMERIC_TRANSITION_PROPERTIES 전체 검사
      const targetProps =
        property === "all"
          ? NUMERIC_TRANSITION_PROPERTIES
          : NUMERIC_TRANSITION_PROPERTIES.has(property)
            ? new Set([property])
            : null;

      if (!targetProps) continue;

      for (const prop of targetProps) {
        const prevVal = getNumericStyleValue(prevStyle, prop);
        const nextVal = getNumericStyleValue(nextStyle, prop);

        if (
          prevVal !== undefined &&
          nextVal !== undefined &&
          prevVal !== nextVal
        ) {
          tm.start(elementId, prop, prevVal, nextVal, duration, easing);
        }
      }
    }
  }

  /**
   * 비동기 이미지 로딩 후 재동기화 트리거.
   */
  private loadImageAsync(elementId: string, src: string): void {
    void loadSkImage(src).then((img) => {
      if (!img) return;
      if (!this.registeredIds.has(elementId)) {
        releaseSkImage(src);
        return;
      }
      this.pendingResync?.();
    });
  }

  /**
   * 연결 해제 + 등록 해제
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.unsubscribeLayout) {
      this.unsubscribeLayout();
      this.unsubscribeLayout = null;
    }
    this.pendingResync = null;
    this.prevElementsMap = null;

    for (const id of this.registeredIds) {
      unregisterSkiaNode(id);
    }
    this.registeredIds.clear();

    for (const [, src] of this.loadedImageSrcs) {
      releaseSkImage(src);
    }
    this.loadedImageSrcs.clear();
  }

  /** 현재 등록된 요소 수 */
  get size(): number {
    return this.registeredIds.size;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getImageSrc(element: Element): string | null {
  const props = element.props as Record<string, unknown> | undefined;
  const src = (props?.src as string) || (props?.source as string) || "";
  return src || null;
}
