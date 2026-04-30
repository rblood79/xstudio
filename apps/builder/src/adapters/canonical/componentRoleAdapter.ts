/**
 * @fileoverview Component-Instance Field Adapter — ADR-903 P1 Stream 2
 *
 * Legacy Element의 component-instance 메타필드를 canonical 형태로 변환:
 *   componentRole === "master"  → reusable: true
 *   componentRole === "instance" + masterId → ref: <stable id path>
 *   overrides → rootOverrides (RefNode 루트 속성 patch)
 *   descendants (UUID key) → descendantsRemapped (stable id path key)
 *
 * **legacy descendants는 항상 속성 patch 모드 (mode A)**:
 * legacy 시스템은 UUID 키 + {prop: value} 값 구조만 지원했으며,
 * mode B (node replacement) / mode C (children replacement) semantics를
 * 표현하는 수단이 없었기 때문이다.
 */

import type { ConvertComponentRoleFn } from "./types";

export const convertComponentRole: ConvertComponentRoleFn = (
  element,
  options,
) => {
  const { idPathMap } = options;
  const result: ReturnType<ConvertComponentRoleFn> = {};

  // master → reusable: true
  if (element.componentRole === "master") {
    result.reusable = true;
  }

  // instance → ref (masterId → stable id path)
  if (element.componentRole === "instance" && element.masterId) {
    const masterStablePath = idPathMap.get(element.masterId);
    if (masterStablePath) {
      result.ref = masterStablePath;
    } else {
      // broken instance: master를 찾지 못함 — masterId 그대로 보존
      // 향후 resolver에서 broken ref detection 처리
      result.ref = element.masterId;
      console.warn(
        `[ADR-903 adapter] instance ${element.id} references unknown master ${element.masterId}`,
      );
    }
  }

  // overrides → instance root props (속성 patch)
  if (element.overrides && Object.keys(element.overrides).length > 0) {
    result.rootOverrides = { ...element.overrides };
  }

  // descendants UUID key → stable id path remap
  // legacy descendants는 항상 {childUuid: {propKey: value}} 구조 (mode A only)
  if (element.descendants && Object.keys(element.descendants).length > 0) {
    const remapped: Record<string, unknown> = {};
    for (const [childUuid, childOverride] of Object.entries(
      element.descendants,
    )) {
      const stablePath = idPathMap.get(childUuid);
      if (stablePath) {
        remapped[stablePath] = childOverride;
      } else {
        // path 미발견: UUID 그대로 보존 (debugging fallback)
        remapped[childUuid] = childOverride;
        console.warn(
          `[ADR-903 adapter] descendants key ${childUuid} on instance ${element.id} unmapped`,
        );
      }
    }
    result.descendantsRemapped = remapped;
  }

  return result;
};
