/**
 * useResolvedElement Hook
 *
 * Element의 Master-Instance resolution을 수행.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ADR-903 P2 D-B (2026-04-25)
 *
 * 본 hook 은 production 진입 시 resolveInstanceElement 직접 호출 대신
 * canonical resolver 경로 (`resolveInstanceWithSharedCache`) 로 전환된다.
 * shared `ResolverCache` singleton (Preview / Skia 공통) 를 통과하므로 같은
 * (instance, master) pair 의 반복 호출은 cache hit.
 *
 * legacy `resolveInstanceElement` 는 fallback 으로만 유지 — canonical resolve 가
 * null 을 반환하는 경우 (master 없음 등) legacy 동작 보장.
 *
 * dev compare 로깅 (`[ADR-903 P2-Skia]`) 은 D-A 패턴 그대로 유지하여 두 경로의
 * keysMatch 정합을 계속 관찰. keysMatch:true 일관 후 다음 세션에서 legacy
 * fallback 제거 가능.
 *
 * 기존 요소(componentRole 없음)에는 원본 element 참조를 그대로 반환하여
 * 성능 영향 제로.
 *
 * @see docs/adr/903-ref-descendants-slot-composition-format-migration-plan.md
 * @see resolvers/canonical/storeBridge.ts (`resolveInstanceWithSharedCache`)
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
import { resolveInstanceWithSharedCache } from "../../../../resolvers/canonical/storeBridge";
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

  // ──────────────────────────────────────────────────────────────────────────
  // ADR-903 P2 D-B: canonical 경로 우선 + legacy fallback
  //
  // shared ResolverCache (Preview / Skia 공통) 를 통과하므로 같은 (instance,
  // master) pair 의 반복 호출은 cache hit.
  //
  // null 반환 케이스 (master 없음 등) 에는 legacy resolveInstanceElement
  // fallback. instance 가 아닌 element 는 그대로 통과.
  // ──────────────────────────────────────────────────────────────────────────
  const resolved = useMemo(() => {
    if (isInstanceElement(element) && masterElement) {
      const canonical = resolveInstanceWithSharedCache(element, masterElement);
      if (canonical) return canonical;
      return resolveInstanceElement(element, masterElement);
    }
    return element;
  }, [element, masterElement]);

  // ──────────────────────────────────────────────────────────────────────────
  // ADR-903 P2 dev-only 비교 로깅 (옵션 D-A — D-B 진입 후에도 유지)
  //
  // canonical 경로가 production path 가 된 이후에도 legacy 와의 정합성을
  // 계속 관찰. mismatch 발생 시 즉시 visibility 확보 — keysMatch:true 일관이
  // 충분히 누적되면 legacy fallback 제거 가능.
  //
  // production render path 영향: import.meta.env.DEV 가드로 0.
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
