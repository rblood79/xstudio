/**
 * ADR-911 P3-δ — reusable frame canvas authoring viewport root collection.
 *
 * Sibling to `visiblePageRoots.ts`. P3-α (`framePositions`) + P3-β
 * (`computeFrameAreas`) + P3-γ (`selectedReusableFrameId`) 결정에 따라 신설.
 *
 * Contract:
 * - input: `SkiaRendererInput.frameAreas` (canonical reusable frames) +
 *   `framePositions` (frame id → {x,y,width,height})
 * - output: rootElementIds (frame body element id 목록) +
 *   bodyPagePositions (body element id → {x,y}) — `visiblePageRoots` 출력과
 *   동일 shape 라 caller (skiaFramePipeline) 가 단일 맵으로 병합 가능 (D3=A)
 *
 * frame body 식별 (D1=A): `el.layout_id === frameId` 매칭. ADR-903 P3-E E-6
 * 의 composition-pre-1.0 legacy fallback 패턴과 동일. canonical adapter 가
 * layout_id 를 보존하므로 cutover 후에도 유효. Phase 4 legacy 0 진입 시
 * canonical doc 의 reusable FrameNode 직접 매칭으로 마이그레이션 (별도 작업).
 */

import type { SkiaRendererInput } from "../renderers";

export interface VisibleFrameRootBuildResult {
  /** frame body element id → { x, y } — `visiblePageRoots` 와 동일 shape */
  bodyPagePositions: Record<string, { x: number; y: number }>;
  /** frame body element id 목록 — render command stream root 진입 */
  rootElementIds: string[];
}

export function collectVisibleFrameRoots(
  rendererInput: SkiaRendererInput,
): VisibleFrameRootBuildResult {
  const rootElementIds: string[] = [];
  const bodyPagePositions: Record<string, { x: number; y: number }> = {};

  if (rendererInput.frameAreas.length === 0) {
    return { rootElementIds, bodyPagePositions };
  }

  // 각 frame area 의 frameId (legacy layoutId) 로 frame body element 탐색.
  // ADR-911 P3-δ fix #1 (Chrome MCP evidence 2026-04-28):
  // type === "body" 만 frame body 후보로 등록. 동일 layout_id 의 자식 (Slot 등) 도
  // layout_id 를 보유 (composition-pre-1.0 legacy layout_id propagation) — element 순서
  // 의존 시 Slot 이 첫 매칭이 되어 잘못 등록될 위험. type 체크가 가장 단순하고 안전.
  const bodyByLayoutId = new Map<string, string>();
  for (const el of rendererInput.elements) {
    if (el.type !== "body") continue;
    const layoutId = el.layout_id;
    if (!layoutId) continue;
    if (!bodyByLayoutId.has(layoutId)) {
      bodyByLayoutId.set(layoutId, el.id);
    }
  }

  for (const area of rendererInput.frameAreas) {
    const bodyId = bodyByLayoutId.get(area.frameId);
    if (!bodyId) continue;

    rootElementIds.push(bodyId);
    const pos = rendererInput.framePositions[area.frameId];
    bodyPagePositions[bodyId] = pos
      ? { x: pos.x, y: pos.y }
      : { x: area.x, y: area.y };
  }

  return { rootElementIds, bodyPagePositions };
}
