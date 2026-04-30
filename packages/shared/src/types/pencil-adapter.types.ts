/**
 * @fileoverview Pencil Import/Export Adapter Type Contracts — ADR-903 P0
 *
 * composition canonical은 pencil primitive 편집 도구가 아니다. 목적:
 *   (a) 필드명/구조 정합 (type, reusable, ref, descendants, slot)
 *   (b) adapter 경유 import/export 가능성
 * primitive-level 편집은 composition 범위 외 — D3 (Spec)가 시각 표현 소유.
 *
 * P0 범위: 함수 시그니처 + 매핑 규칙 문서화. 본체는 stub. 실제 구현은 Phase 5+.
 */

import type { CanonicalNode } from "./composition-document.types";

// ──────────────────────────────────────────────────────────────────────────────
// Pencil Type Vocabularies
// ──────────────────────────────────────────────────────────────────────────────

/**
 * pencil primitive 10종 — composition canonical에 **직접 값으로 등장하지 않음**.
 * import/export adapter 경유 변환만 허용.
 *
 * ADR-903 §type vocabulary policy 참조.
 */
export type PencilPrimitiveType =
  | "rectangle"
  | "ellipse"
  | "line"
  | "polygon"
  | "path"
  | "text"
  | "note"
  | "prompt"
  | "context"
  | "icon_font";

/**
 * pencil 공용 구조 타입 3종 — composition canonical에서도 직접 사용.
 * `ComponentTag` 값 공간에 포함됨.
 */
export type PencilStructureType = "ref" | "frame" | "group";

// ──────────────────────────────────────────────────────────────────────────────
// PencilNode
// ──────────────────────────────────────────────────────────────────────────────

/**
 * pencil `.pen` schema의 node 기본 형태.
 *
 * 전체 schema(Fill/Stroke/Effect/Shape/Text/Flexbox/IconFont 상세 필드)는
 * 본 ADR 범위 외 — D3 (Spec) 경계 안에서 후속 결정.
 * 여기서는 구조적 뼈대만 선언.
 */
export interface PencilNode {
  id: string;
  type: PencilPrimitiveType | PencilStructureType;
  children?: PencilNode[];
  /** extensible — pencil schema의 나머지 모든 필드 허용 */
  [k: string]: unknown;
}

// ──────────────────────────────────────────────────────────────────────────────
// Import Adapter (pencil `.pen` → composition canonical)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * pencil primitive → composition canonical node 변환.
 *
 * 매핑 규칙 (ADR-903 §import adapter 규칙):
 * - `rectangle` / `frame` → `FrameNode` (Fill/Stroke/cornerRadius → Spec style normalize)
 * - `text`      → composition `Text` component (`type: "Text"`)
 * - `icon_font` → composition `Icon` component (iconFontFamily → icon library 매핑, ADR-019)
 * - `ellipse` / `line` / `polygon` / `path` → `FrameNode` + 시각 속성 fallback
 *   (primitive geometry는 composition에 직접 표현 없음)
 * - `note` / `prompt` / `context` → `type` = 가장 근접 component +
 *   `metadata.type = <primitive-type>` 저장 (주석 형태로 시각 렌더)
 * - `group` → `FrameNode` (group은 composition에 별도 타입 없음, frame으로 통합)
 *
 * 1:1 호환 아님: composition canonical은 pencil primitive 편집 도구가 아니다.
 * 필드명/구조 정합 + adapter 경유 변환 호환이 목적.
 *
 * @param primitive — pencil `.pen` 파일에서 읽은 PencilNode
 * @returns canonical CanonicalNode (가장 근접한 composition component로 매핑)
 *
 * @stub 실제 구현은 Phase 5+
 */
export function pencilPrimitiveToComponent(
  _primitive: PencilNode,
): CanonicalNode {
  throw new Error("P0 stub — pencilPrimitiveToComponent: Phase 5+ 구현 대상");
}

// ──────────────────────────────────────────────────────────────────────────────
// Export Adapter (composition canonical → pencil `.pen`)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * composition canonical node → pencil primitive 트리 변환.
 *
 * 매핑 규칙 (ADR-903 §export adapter 규칙):
 * - `FrameNode` (`type: "frame"`)  → `{ type: "frame" }` 그대로
 * - `RefNode`  (`type: "ref"`)     → `{ type: "ref" }` 그대로
 * - composition component (`Button` / `Card` / ...) →
 *   해당 component의 Spec 을 primitive 트리로 expand
 *   (Button = frame + text + icon, Card = frame + section 등)
 * - 원본 vocabulary 복원을 위해 `metadata.compositionType` 에 원본 `type` 저장
 *   (roundtrip 가능성 확보)
 *
 * 표준 pencil 뷰어가 읽을 수 있는 수준의 시각 근사 유지.
 * 1:1 호환 아님.
 *
 * @param node — composition canonical CanonicalNode
 * @returns pencil `.pen` 형태의 PencilNode 트리
 *
 * @stub 실제 구현은 Phase 5+
 */
export function componentToPencilTree(_node: CanonicalNode): PencilNode {
  throw new Error("P0 stub — componentToPencilTree: Phase 5+ 구현 대상");
}
