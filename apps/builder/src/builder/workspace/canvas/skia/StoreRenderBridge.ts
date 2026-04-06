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
import { registerSkiaNode, unregisterSkiaNode } from "./useSkiaNode";
import { getSkImage, loadSkImage, releaseSkImage } from "./imageCache";

// ---------------------------------------------------------------------------
// Tag 분류
// ---------------------------------------------------------------------------

const TEXT_TAGS = new Set([
  "Heading",
  "Text",
  "Label",
  "Description",
  "Kbd",
  "Code",
  "InlineAlert",
]);

const IMAGE_TAGS = new Set(["Image", "Avatar", "Logo", "Thumbnail"]);

function isTextElement(element: Element): boolean {
  return TEXT_TAGS.has(element.tag);
}

function isImageElement(element: Element): boolean {
  return IMAGE_TAGS.has(element.tag);
}

// ---------------------------------------------------------------------------
// StoreRenderBridge
// ---------------------------------------------------------------------------

export class StoreRenderBridge {
  private unsubscribe: (() => void) | null = null;
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
    subscribe: (callback: () => void) => () => void;
    theme?: "light" | "dark";
  }): void {
    this.dispose();

    const { getElements, getLayoutMap, subscribe, theme = "light" } = options;

    const resync = () => {
      this.fullSync(getElements(), getLayoutMap(), theme);
    };
    this.pendingResync = resync;

    // 초기 동기화
    resync();

    // 변경 구독
    this.unsubscribe = subscribe(resync);
  }

  /**
   * 전체 동기화: elementsMap → skiaNodeRegistry
   */
  fullSync(
    elementsMap: Map<string, Element>,
    layoutMap: Map<string, ComputedLayout> | null,
    theme: "light" | "dark",
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

      if (isTextElement(element)) {
        // Text 요소: 완전한 TextSprite 로직 (Phase 6 정밀 이식)
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
    loadSkImage(src).then((img) => {
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
