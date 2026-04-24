/**
 * useResolvedElement Hook
 *
 * Element의 Master-Instance resolution을 수행.
 *
 * 기존 요소(componentRole 없음)에는
 * 원본 element 참조를 그대로 반환하여 성능 영향 제로.
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.1
 */

import { useEffect, useMemo } from "react";
import type { Element } from "../../../../types/builder/unified.types";
import { isInstanceElement } from "../../../../types/builder/unified.types";
import { useStore } from "../../../stores";
import {
  resolveCanonicalRefProps,
  resolveInstanceElement,
} from "../../../../utils/component/instanceResolver";
import type { CanonicalNode, ComponentTag, RefNode } from "@composition/shared";

/**
 * Element의 instance resolution을 수행
 *
 * 반환값이 useMemo로 안정화되어 있어 하위 렌더링 최적화에 유리.
 * 변경이 없으면 원본 element 참조를 그대로 반환.
 */
export function useResolvedElement(element: Element): Element {
  // Instance resolution: master 조회 (instance인 경우만)
  const masterElement = useStore((state) => {
    if (!isInstanceElement(element) || !element.masterId) return undefined;
    return state.elementsMap.get(element.masterId);
  });

  const resolved = useMemo(() => {
    if (isInstanceElement(element) && masterElement) {
      return resolveInstanceElement(element, masterElement);
    }
    return element;
  }, [element, masterElement]);

  // ──────────────────────────────────────────────────────────────────────────
  // ADR-903 P2 dev-only 비교 로깅 (옵션 D-A)
  //
  // legacy resolveInstanceElement 결과 props 와 canonical resolveCanonicalRefProps
  // 결과를 비교. Skia consumer 가 P2 S3 본 진입 (store-level resolved cache +
  // hook 단순 lookup) 전에 두 path 의 등가성을 검증한다.
  //
  // production render path 는 변경하지 않는다.
  // dev console 에서 "[ADR-903 P2-Skia]" 검색.
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!isInstanceElement(element) || !masterElement) return;

    try {
      const masterNode: CanonicalNode = {
        id: masterElement.id,
        type: masterElement.tag as ComponentTag,
        metadata: {
          type: "legacy-element-props",
          legacyProps: masterElement.props,
        },
      };
      const refNode: RefNode = {
        id: element.id,
        type: "ref",
        ref: masterElement.id,
        metadata: {
          type: "legacy-instance-overrides",
          legacyProps: element.overrides ?? {},
        },
      };
      const canonicalProps = resolveCanonicalRefProps(masterNode, refNode);
      const legacyProps = resolved.props;

      const legacyKeys = Object.keys(legacyProps).sort();
      const canonicalKeys = Object.keys(canonicalProps).sort();
      const keysMatch =
        legacyKeys.length === canonicalKeys.length &&
        legacyKeys.every((k, i) => k === canonicalKeys[i]);

      console.log("[ADR-903 P2-Skia] instance resolve compare", {
        instanceId: element.id,
        masterId: masterElement.id,
        legacyKeyCount: legacyKeys.length,
        canonicalKeyCount: canonicalKeys.length,
        keysMatch,
        ...(keysMatch
          ? {}
          : {
              legacyOnly: legacyKeys.filter((k) => !canonicalKeys.includes(k)),
              canonicalOnly: canonicalKeys.filter(
                (k) => !legacyKeys.includes(k),
              ),
            }),
      });
    } catch (err) {
      console.warn("[ADR-903 P2-Skia] canonical resolve failed", err);
    }
  }, [element, masterElement, resolved]);

  return resolved;
}
