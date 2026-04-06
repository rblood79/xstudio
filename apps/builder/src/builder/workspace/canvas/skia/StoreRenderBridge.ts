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
import {
  buildSkiaNodeData,
  buildTextSkiaNodeData,
  type BuildContext,
} from "./buildSkiaNodeData";
import { buildBoxNodeData } from "./buildBoxNodeData";
import { registerSkiaNode, unregisterSkiaNode } from "./useSkiaNode";

// ---------------------------------------------------------------------------
// Text element 판별
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

function isTextElement(element: Element): boolean {
  return TEXT_TAGS.has(element.tag);
}

// ---------------------------------------------------------------------------
// StoreRenderBridge
// ---------------------------------------------------------------------------

export class StoreRenderBridge {
  private unsubscribe: (() => void) | null = null;
  private registeredIds = new Set<string>();

  /**
   * Store에 연결하여 elementsMap 변경 시 skiaNodeRegistry를 갱신.
   *
   * @param getElements - 현재 elementsMap 반환 함수
   * @param getLayoutMap - 현재 layoutMap 반환 함수
   * @param subscribe - store 변경 구독 함수 (cleanup 반환)
   */
  connect(options: {
    getElements: () => Map<string, Element>;
    getLayoutMap: () => Map<string, ComputedLayout> | null;
    subscribe: (callback: () => void) => () => void;
    theme?: "light" | "dark";
  }): void {
    this.dispose();

    const { getElements, getLayoutMap, subscribe, theme = "light" } = options;

    // 초기 동기화
    this.fullSync(getElements(), getLayoutMap(), theme);

    // 변경 구독
    this.unsubscribe = subscribe(() => {
      this.fullSync(getElements(), getLayoutMap(), theme);
    });
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

    for (const [id, element] of elementsMap) {
      currentIds.add(id);

      // Box 요소 (대부분의 요소): 완전한 BoxSprite 로직 사용
      // Text 요소: 기본 텍스트 빌더
      // 그 외: 기본 빌더 (fallback)
      const layout = ctx.layoutMap.get(id) ?? undefined;
      const nodeData = isTextElement(element)
        ? buildTextSkiaNodeData(element, ctx)
        : (buildBoxNodeData({ element, layout }) ??
          buildSkiaNodeData(element, ctx));

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

    this.registeredIds = currentIds;
  }

  /**
   * 연결 해제 + 등록 해제
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    for (const id of this.registeredIds) {
      unregisterSkiaNode(id);
    }
    this.registeredIds.clear();
  }

  /** 현재 등록된 요소 수 */
  get size(): number {
    return this.registeredIds.size;
  }
}
