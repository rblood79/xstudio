/**
 * useComponentMemory Hook
 *
 * 컴포넌트별 메모리 사용량 분석
 * - 각 요소의 메모리 사용량 추정
 * - 자식 요소 수 및 깊이 계산
 */

import { useState, useEffect, useCallback } from "react";
import { useStore } from "../../../stores";
import type { Element } from "../../../../types/core/store.types";

export interface ComponentMemoryInfo {
  elementId: string;
  customId?: string;
  tag: string;
  depth: number;
  memoryBytes: number;
  childCount: number;
  propsSize: number;
  percentage: number;
}

interface UseComponentMemoryOptions {
  enabled?: boolean;
  sortBy?: "memory" | "children" | "depth";
  limit?: number;
}

// 객체 크기 추정 (바이트)
function estimateObjectSize(obj: unknown): number {
  if (obj === null || obj === undefined) return 0;
  if (typeof obj === "boolean") return 4;
  if (typeof obj === "number") return 8;
  if (typeof obj === "string") return (obj as string).length * 2;

  if (Array.isArray(obj)) {
    return obj.reduce((sum, item) => sum + estimateObjectSize(item), 0);
  }

  if (typeof obj === "object") {
    return Object.entries(obj).reduce((sum, [key, value]) => {
      return sum + key.length * 2 + estimateObjectSize(value);
    }, 0);
  }

  return 0;
}

// ADR-040: elementsMap O(1) 조회로 깊이 계산
function getElementDepth(
  elementId: string,
  elementsMap: Map<string, Element>,
): number {
  let depth = 0;
  let current = elementsMap.get(elementId);

  while (current?.parent_id) {
    depth++;
    current = elementsMap.get(current.parent_id);
    if (depth > 100) break; // 무한 루프 방지
  }

  return depth;
}

// ADR-040: childrenMap O(1) 조회로 자식 수 계산
function countChildren(
  elementId: string,
  childrenMap: Map<string, Element[]>,
): number {
  const directChildren = childrenMap.get(elementId) ?? [];
  return directChildren.reduce(
    (sum, child) => sum + 1 + countChildren(child.id, childrenMap),
    0,
  );
}

export function useComponentMemory(options: UseComponentMemoryOptions = {}) {
  const { enabled = true, sortBy = "memory", limit = 20 } = options;
  // ADR-040: elementsMap + childrenMap O(1) 조회
  const elementsMap = useStore((state) => state.elementsMap);
  const childrenMap = useStore((state) => state.childrenMap);
  const [componentMemory, setComponentMemory] = useState<ComponentMemoryInfo[]>(
    [],
  );
  const [totalMemory, setTotalMemory] = useState(0);

  const analyze = useCallback(() => {
    if (!enabled || elementsMap.size === 0) {
      setComponentMemory([]);
      setTotalMemory(0);
      return;
    }

    // 각 요소별 메모리 계산
    const memoryInfos: ComponentMemoryInfo[] = [];
    elementsMap.forEach((el) => {
      const propsSize = estimateObjectSize(el.props);
      const baseSize = 100; // 기본 객체 오버헤드
      const idSize = (el.id?.length ?? 0) * 2;
      const customIdSize = (el.customId?.length ?? 0) * 2;
      const tagSize = (el.tag?.length ?? 0) * 2;

      const memoryBytes =
        baseSize + idSize + customIdSize + tagSize + propsSize;
      const childCount = countChildren(el.id, childrenMap);
      const depth = getElementDepth(el.id, elementsMap);

      memoryInfos.push({
        elementId: el.id,
        customId: el.customId,
        tag: el.tag,
        depth,
        memoryBytes,
        childCount,
        propsSize,
        percentage: 0, // 후처리에서 계산
      });
    });

    // 전체 메모리 계산
    const total = memoryInfos.reduce((sum, info) => sum + info.memoryBytes, 0);
    setTotalMemory(total);

    // 백분율 계산
    memoryInfos.forEach((info) => {
      info.percentage = total > 0 ? (info.memoryBytes / total) * 100 : 0;
    });

    // 정렬
    memoryInfos.sort((a, b) => {
      switch (sortBy) {
        case "memory":
          return b.memoryBytes - a.memoryBytes;
        case "children":
          return b.childCount - a.childCount;
        case "depth":
          return a.depth - b.depth;
        default:
          return 0;
      }
    });

    // 상위 N개만
    setComponentMemory(memoryInfos.slice(0, limit));
  }, [enabled, elementsMap, childrenMap, sortBy, limit]);

  useEffect(() => {
    // 다음 프레임에서 분석 실행하여 cascading render 방지
    const timeoutId = setTimeout(analyze, 0);
    return () => clearTimeout(timeoutId);
  }, [analyze]);

  return { componentMemory, totalMemory, refresh: analyze };
}
