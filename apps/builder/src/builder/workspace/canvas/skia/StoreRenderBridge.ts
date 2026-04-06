/**
 * StoreRenderBridge (ADR-100 Phase 6.2)
 *
 * Zustand store 변경을 감지하여 skiaNodeRegistry를 직접 채운다.
 * PixiJS Sprite 컴포넌트(ElementSprite/BoxSprite/TextSprite/ImageSprite)의
 * useSkiaNode() 호출을 대체.
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
 * 나머지 TEXT_TAGS (Text, Heading, Description, InlineAlert 등)는
 * buildTextNodeData (텍스트 경로)로 라우팅하여 inline CSS style 지원.
 */
const SPEC_PREFERRED_TEXT_TAGS = new Set([
  "Label",
  "FieldError",
  "InlineAlert",
  "Description", // InlineAlert parent font delegation
]);

/** Spec 경로 사용 여부: TAG_SPEC_MAP 등록 + TEXT_TAGS 미등록 또는 delegation 필요 */
function useSpecPath(element: Element): boolean {
  if (!getSpecForTag(element.tag)) return false;
  // TEXT_TAGS에 속하지 않으면 항상 spec 경로
  if (!TEXT_TAGS.has(element.tag)) return true;
  // TEXT_TAGS이면서 parent delegation이 필요한 경우만 spec 경로
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
      this.fullSync(
        getElements(),
        getLayoutMap(),
        theme,
        getChildrenMap?.() ?? null,
      );
    };
    this.pendingResync = resync;

    // 초기 동기화
    resync();

    // 변경 구독: Zustand store + layout publish
    this.unsubscribe = subscribe(resync);
    this.unsubscribeLayout = onLayoutPublished(resync);
  }

  /**
   * 전체 동기화: elementsMap → skiaNodeRegistry
   */
  fullSync(
    elementsMap: Map<string, Element>,
    layoutMap: Map<string, ComputedLayout> | null,
    theme: "light" | "dark",
    childrenMap: Map<string, Element[]> | null = null,
  ): void {
    const ctx: BuildContext = {
      layoutMap: layoutMap ?? new Map(),
      theme,
    };

    const currentIds = new Set<string>();
    const currentImageSrcs = new Map<string, string>();

    for (const [id, element] of elementsMap) {
      currentIds.add(id);

      const layout = ctx.layoutMap.get(id) ?? undefined;
      let nodeData;

      if (useSpecPath(element)) {
        // Spec 경로: TAG_SPEC_MAP 등록 + TEXT_TAGS 미등록 컴포넌트
        // 또는 parent delegation이 필요한 TEXT_TAGS (Label, FieldError)
        // Phase 8: parent delegation, accent override, phantom indicator 등 포함
        const childElements = childrenMap?.get(id) ?? undefined;
        nodeData = buildSpecNodeData({
          element,
          layout,
          theme,
          childElements,
          elementsMap,
        });
        // Spec이 null 반환 시 (크기 미확정 등) fallback
        if (!nodeData) {
          nodeData =
            buildBoxNodeData({ element, layout }) ??
            buildSkiaNodeData(element, ctx);
        }
      } else if (isTextElement(element)) {
        // 텍스트 요소 (Text, Heading, Description, InlineAlert, Kbd, Code)
        // inline CSS style (border, background 등) 지원
        nodeData = buildTextNodeData({ element, layout, theme });
      } else if (isImageElement(element)) {
        // Image 요소: 캐시된 skImage 동기 조회 + 비동기 로딩
        const src = getImageSrc(element);
        const skImage = src ? getSkImage(src) : null;

        if (src) {
          currentImageSrcs.set(id, src);
          // 캐시 미스 → 비동기 로딩 트리거
          if (!skImage && !this.loadedImageSrcs.has(id)) {
            this.loadImageAsync(id, src);
          }
        }

        nodeData = buildImageNodeData({ element, layout, skImage });
      } else {
        // Box 요소 / fallback
        nodeData =
          buildBoxNodeData({ element, layout }) ??
          buildSkiaNodeData(element, ctx);
      }

      if (nodeData) {
        registerSkiaNode(id, nodeData);
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
   * 비동기 이미지 로딩 후 재동기화 트리거.
   */
  private loadImageAsync(elementId: string, src: string): void {
    void loadSkImage(src).then((img) => {
      if (!img) return;
      // 이미 dispose 되었거나 해당 요소가 사라졌으면 해제
      if (!this.registeredIds.has(elementId)) {
        releaseSkImage(src);
        return;
      }
      // 로딩 완료 → 재동기화로 skImage 포함 nodeData 갱신
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

    for (const id of this.registeredIds) {
      unregisterSkiaNode(id);
    }
    this.registeredIds.clear();

    // 이미지 참조 해제
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
