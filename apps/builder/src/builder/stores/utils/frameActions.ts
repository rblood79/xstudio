/**
 * Frame Actions — canonical-shaped wrapper API for reusable frame CRUD.
 *
 * ADR-911 P2-a (PR-A): canonical-native FramesTab 재설계의 첫 단계.
 *
 * 본 모듈은 canonical FrameNode (`type: "frame"` + `reusable: true`) 의미를
 * 가진 wrapper API를 제공한다. P2 scope 동안 내부 구현은 legacy
 * `useLayoutsStore` (createLayout / deleteLayout / updateLayout) 를 호출하여
 * reverse-projection — `selectCanonicalDocument` adapter 가 자동으로 canonical
 * `FrameNode` 로 투영한다.
 *
 * 정책 (ADR-911 design breakdown line 467-474):
 * - P2 scope: `stores/layouts.ts` 본체 미수정. adapter shim 그대로 유지.
 * - P3 이후: legacy bridge 제거 + 직접 canonical document mutation 으로 전환.
 *
 * @see docs/adr/911-layout-frameset-pencil-redesign.md
 * @see docs/adr/design/911-layout-frameset-pencil-redesign-breakdown.md
 */

import { useLayoutsStore } from "@/builder/stores/layouts";
import type { Layout } from "@/types/builder/layout.types";

/**
 * Reusable frame 생성 입력 — canonical-shaped 명명.
 *
 * `LayoutCreate` 에 비해 `project_id` (snake) → `projectId` (canonical) rename.
 */
export interface CreateReusableFrameInput {
  /** Frame 이름 — 사용자 노출 라벨 */
  name: string;
  /** 소속 project id */
  projectId: string;
  /** 설명 (optional) */
  description?: string;
}

/**
 * Reusable frame 생성 결과.
 *
 * P2 scope 동안 내부 구현은 legacy `Layout` 그대로 반환 — 하지만 consumer 는
 * canonical 의미 (`reusable: true` FrameNode 와 동일 식별자)로 사용해야 한다.
 *
 * P3 이후 반환 타입을 `FrameNode` 로 전환 예정.
 */
export interface ReusableFrameRef {
  /** Canonical FrameNode id (현재는 layout id 와 동일) */
  id: string;
  /** Frame 이름 */
  name: string;
}

/**
 * Reusable frame 생성 — canonical-shaped wrapper.
 *
 * 내부 구현: legacy `createLayout` 호출 → adapter 가 자동으로 reusable FrameNode 로 projection.
 *
 * @param input - frame 메타데이터
 * @returns 생성된 frame 참조 (P3 이후 `FrameNode` 로 전환)
 * @throws 생성 실패 시 (DB write error 등)
 */
export async function createReusableFrame(
  input: CreateReusableFrameInput,
): Promise<ReusableFrameRef> {
  const layout: Layout = await useLayoutsStore.getState().createLayout({
    name: input.name,
    project_id: input.projectId,
    description: input.description ?? "",
  });
  return { id: layout.id, name: layout.name };
}

/**
 * Reusable frame 삭제 — canonical-shaped wrapper.
 *
 * 내부 구현: legacy `deleteLayout` 호출. adapter projection 이 자동으로 갱신.
 * cascade (page.layout_id null 화 + element 삭제) 도 layoutAction 내부에서 처리.
 *
 * @param frameId - canonical FrameNode id (현재는 layout id 와 동일)
 */
export async function deleteReusableFrame(frameId: string): Promise<void> {
  await useLayoutsStore.getState().deleteLayout(frameId);
}

/**
 * Reusable frame 이름 업데이트 — canonical-shaped wrapper.
 *
 * 내부 구현: legacy `updateLayout` 호출.
 *
 * @param frameId - canonical FrameNode id
 * @param name - 새 이름
 */
export async function updateReusableFrameName(
  frameId: string,
  name: string,
): Promise<void> {
  await useLayoutsStore.getState().updateLayout(frameId, { name });
}

/**
 * Reusable frame 선택 (canonical semantic).
 *
 * 내부 구현: legacy `setCurrentLayout` 호출. P3-B 정책에 따라
 * `selectedReusableFrameId` + `currentLayoutId` (backward-compat) 양쪽 갱신.
 *
 * @param frameId - 선택할 frame id, 또는 `null` (선택 해제)
 */
export function selectReusableFrame(frameId: string | null): void {
  useLayoutsStore.getState().setCurrentLayout(frameId);
}

/**
 * 새 reusable frame 의 unique 한 default 이름 생성.
 *
 * `Frame N` 패턴의 기존 이름들을 분석하여 미사용 번호 중 가장 작은 값 사용.
 * 이전 패턴 (`Frame ${frames.length + 1}`) 의 중복 위험 제거 — frame 삭제 후
 * 추가하거나 IDB 잔존 데이터 + 메모리 length mismatch 시 발생하는 충돌 방지.
 *
 * 동작:
 * - 빈 목록: `Frame 1`
 * - `["Frame 1", "Frame 2"]`: `Frame 3`
 * - `["Frame 1", "Frame 3"]`: `Frame 2` (gap 채움)
 * - `["Frame 2"]`: `Frame 1` (시작 gap 채움)
 * - `["My Custom"]`: `Frame 1` (`Frame N` 패턴 아닌 이름은 무시)
 * - `["Frame 1", "My Custom", "Frame 3"]`: `Frame 2`
 *
 * @param existingFrames - 현재 frame 목록 (id 와 name 만 사용)
 * @returns 새 frame 의 default 이름 (예: `Frame 4`)
 */
export function getNextFrameName(
  existingFrames: ReadonlyArray<{ name: string }>,
): string {
  const usedNumbers = new Set<number>();
  const pattern = /^Frame (\d+)$/;
  for (const frame of existingFrames) {
    const match = pattern.exec(frame.name);
    if (match) {
      usedNumbers.add(Number(match[1]));
    }
  }
  let n = 1;
  while (usedNumbers.has(n)) {
    n++;
  }
  return `Frame ${n}`;
}
