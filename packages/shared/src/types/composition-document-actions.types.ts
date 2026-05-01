/**
 * @fileoverview Canonical Document Actions / Adapter API — ADR-916 Phase 1 (G2)
 *
 * Phase 1 = Canonical Document Store/API surface + skeleton + unit test (R1 명시 scope).
 *
 * 본 파일은 두 contract 를 정의:
 *
 * 1. `CanonicalDocumentActions` — `CompositionDocument` 자체를 mutate 하는 store
 *    surface. legacy `Element` 입력을 받지 않으며 history entry 가 canonical
 *    patch 단위로 기록되도록 시그니처를 잡는다 (design breakdown §6 원칙 1, 3).
 *
 * 2. `CanonicalLegacyAdapter` — Phase 3 shadow write/canonical primary 전환 전
 *    필수 산출물의 spec (design breakdown §8). 본 파일에서는 **type stub only**,
 *    구현은 Phase 3 에서 land. ADR-916 Phase 1 land scope 외부 (R1 보수).
 *
 * **저장 backing 결정 (ADR-916 Phase 1 D2=β)**:
 * - 본 actions surface 는 별도 Zustand slice
 *   (`apps/builder/src/builder/stores/canonical/canonicalDocumentStore.ts`)
 *   가 구현. 기존 elementsMap wrapper 가 아니라 분리 store 로 G3 hot path
 *   cutover 시점에 elementsMap 의존 제거가 자연스럽도록 설계.
 *
 * **Phase 1 land 외 영역 (Phase 2~5)**:
 * - history/undo 통합 — Phase 1 에서는 mutation 단위 caller 가 직접 history
 *   entry 를 push 하지 않음. Phase 2/3 시점에 canonical patch → history record
 *   변환 결정 (R1 잔존).
 * - persistence write-through — Phase 3 (R1, R5 잔존).
 * - elementsMap legacy store 와 양방향 sync — Phase 2 hot path cutover 와 함께.
 */

import type {
  CanonicalNode,
  CompositionExtension,
  CompositionDocument,
  DescendantOverride,
} from "./composition-document.types";

// ─────────────────────────────────────────────
// CanonicalDocumentActions — Phase 1 mutation surface
// ─────────────────────────────────────────────

/**
 * canonical document mutation API.
 *
 * **활성 document 모델 (Phase 1 결정)**:
 * - store 는 `currentProjectId` + `documents: Map<string, CompositionDocument>`
 *   을 보존.
 * - mutation method 는 currentProjectId 가 가리키는 document 에 작용.
 * - currentProjectId 가 `null` 일 때 mutation 호출은 **no-op + dev warn**
 *   (silent fail 금지, throw 도 금지 — caller 가 race condition 으로 호출
 *   가능한 hot path 에 silent 대응).
 *
 * **path 시그니처 (Phase 1 단순화)**:
 * - `nodeId` = canonical document 내 unique id (DFS 검색).
 * - `parentPath` / `nodePath` = Phase 1 에서는 nodeId 와 동일 (single-segment).
 *   Phase 2 시점에 reusable boundary 를 가로지르는 multi-segment path 가
 *   필요해지면 확장. 본 단순화는 design breakdown §6 의 spec 과 정합 (스펙은
 *   path 형식을 명시하지 않음).
 * - `descendantPath` = pencil.dev 공식 slash-separated id path
 *   (예: `"label"` / `"ok-button/label"`).
 */
export interface CanonicalDocumentActions {
  /**
   * 지정 projectId 의 canonical document 를 반환. 없으면 `undefined`.
   *
   * Phase 1 단계에서는 cold path 만 사용 — Phase 2 hot path cutover 시점에
   * selector-based 구독 (`useCanonicalNode(nodeId)` 등) 으로 마이그레이션.
   */
  getDocument(projectId: string): CompositionDocument | undefined;

  /**
   * 지정 projectId 에 canonical document 를 등록 / 교체.
   *
   * 호출 후 `currentProjectId` 가 `null` 이면 본 호출이 자동 활성화하지
   * 않는다 (caller 가 명시적으로 `setCurrentProject` 호출 필요). 이는
   * multi-project 동시 로드 시 race 방지.
   */
  setDocument(projectId: string, doc: CompositionDocument): void;

  /**
   * 활성 document 의 currentProjectId 를 변경. `null` 전달 시 비활성화.
   *
   * design breakdown §6 의 spec 에는 명시되지 않았으나, "활성 document
   * 모델" 채택의 결과로 mutation API surface 에 추가. Phase 2 selector
   * 구현 시 본 selector 의 trigger 로 사용.
   */
  setCurrentProject(projectId: string | null): void;

  /**
   * 활성 document 의 nodeId 노드를 부분 patch.
   *
   * - `id` / `type` 변경은 silently 무시 (구조 invariant 보호).
   * - `props` 는 본 method 가 아닌 `updateNodeProps` 사용 권장 (semantic
   *   intent 분리, history entry granularity 보존).
   * - 노드 미발견 시 no-op + dev warn.
   */
  updateNode(nodeId: string, patch: Partial<CanonicalNode>): void;

  /**
   * 활성 document 의 nodeId 노드의 `props` 를 부분 patch.
   *
   * - `props` 가 `undefined` 였다면 새 객체 생성.
   * - `value === undefined` 인 키는 props 에서 삭제 (`delete`).
   * - `events` / `actions` / `dataBinding` key 는 `props` 에 저장 금지 →
   *   dev warn + skip (G7 Extension Boundary 사전 enforcement).
   * - 노드 미발견 시 no-op + dev warn.
   */
  updateNodeProps(nodeId: string, patch: Record<string, unknown>): void;

  /**
   * 활성 document 의 nodeId 노드의 `x-composition` extension 을 부분 patch.
   *
   * Phase 5 G7 착수 surface:
   * - `events` / `actions` / `dataBinding` / `editor` 는 canonical props 가 아닌
   *   namespaced extension 에만 저장한다.
   * - `value === undefined` 인 key 는 extension 에서 삭제.
   * - function callback / React runtime object / non-JSON payload 는 skip +
   *   dev warn. renderer adapter 는 serialized descriptor 만 소비해야 한다.
   * - 모든 key 삭제 후 extension 이 비면 `"x-composition"` field 자체를 제거.
   */
  updateNodeExtension(
    nodeId: string,
    patch: Partial<CompositionExtension>,
  ): void;

  /**
   * 활성 document 의 parentPath (Phase 1 = parent nodeId) 자식 배열에
   * 새 노드 삽입.
   *
   * - `index` 미지정 시 끝에 append.
   * - parent 미발견 시 no-op + dev warn.
   * - parent 가 `frame` 이 아닌데 자식 자식이 frame-only 의미를 침범하는
   *   경우 (예: `slot: false` 노드에 자식 추가) 는 Phase 1 에서 검증하지
   *   않음 (R6 잔존, Phase 5 parity matrix 시점에 검증).
   */
  insertNode(parentPath: string, node: CanonicalNode, index?: number): void;

  /**
   * 활성 document 의 nodePath (Phase 1 = nodeId) 노드를 제거.
   *
   * - root 노드 (top-level `children[]` 의 직접 항목) 도 제거 가능.
   * - 노드 미발견 시 no-op + dev warn.
   */
  removeNode(nodePath: string): void;

  /**
   * 활성 document 의 refPath (RefNode) 의 `descendants[descendantPath]` 를
   * 갱신. slot fill / override patch / reset 모두 표현 (design breakdown §6
   * 원칙 4).
   *
   * - `value` 가 `null` 처럼 명시적 reset 값을 표현하려면 caller 가
   *   적절한 `DescendantOverride` shape 를 직접 전달 (`undefined` 는
   *   reset 으로 간주하지 않음 — 명시적 entry 삭제는 Phase 2 별도 method
   *   `removeDescendant` 시점에 결정).
   * - RefNode 가 아닌 경로 또는 미발견 시 no-op + dev warn.
   */
  updateDescendant(
    refPath: string,
    descendantPath: string,
    value: DescendantOverride,
  ): void;
}

// ─────────────────────────────────────────────
// CanonicalLegacyAdapter — Phase 3 prerequisite (spec only)
// ─────────────────────────────────────────────

/**
 * 역방향 adapter 진단 entry — Phase 3 shadow write 시 destructive diff 추적.
 *
 * Phase 1 placeholder. Phase 3 시점에 message catalog / nodePath 좌표계
 * 정확화.
 */
export interface CanonicalExportDiagnostic {
  level: "info" | "warn" | "error";
  message: string;
  /** canonical 좌표계 — Phase 1 에서는 nodeId, Phase 2 이후 path */
  nodePath?: string;
}

/**
 * canonical document → legacy projection 결과.
 *
 * `TElement` / `TPage` / `TLayout` 은 generic — `apps/builder` 의 legacy
 * `Element` / `Page` / `Layout` 타입을 주입하여 사용 (shared 가 builder
 * 타입에 의존하지 않게 함).
 */
export interface CanonicalLegacyExport<
  TElement = unknown,
  TPage = unknown,
  TLayout = unknown,
> {
  elements: TElement[];
  pages: TPage[];
  layouts: TLayout[];
  diagnostics: CanonicalExportDiagnostic[];
}

/**
 * roundtrip diff 결과 — Phase 3 shadow write 비교용.
 *
 * Phase 1 placeholder. Phase 3 시점에 path-based diff entry / patch
 * application order 등 구체화.
 */
export interface CanonicalRoundtripDiff {
  identical: boolean;
  /** identical 이 false 일 때만 의미 있음. Phase 3 에서 schema 확정 */
  diffs: Array<{
    path: string;
    before: unknown;
    after: unknown;
    kind: "added" | "removed" | "changed";
  }>;
}

/**
 * legacy `LegacyAdapterInput` 의 placeholder — `apps/builder/src/adapters/canonical/types.ts`
 * 의 구체 타입 (`{ elements, pages, layouts }`) 와 호환되는 generic 표면.
 *
 * Phase 1 spec 에서는 input shape 를 builder 쪽 `LegacyAdapterInput` 와 호환
 * 가능한 형태로 받는 것만 명시. 실제 호출 site (Phase 3) 가 builder 의
 * `LegacyAdapterInput` 을 그대로 전달.
 */
export interface CanonicalLegacyAdapterInput<
  TElement = unknown,
  TPage = unknown,
  TLayout = unknown,
> {
  elements: TElement[];
  pages: TPage[];
  layouts: TLayout[];
}

/**
 * canonical → legacy 역방향 adapter contract.
 *
 * Canonical primary direct cutover 에서 legacy export 와 roundtrip diff 의
 * 최소 계약을 고정한다. 개발 단계에서는 rollback backup API 를 두지 않는다.
 */
export interface CanonicalLegacyAdapter<
  TElement = unknown,
  TPage = unknown,
  TLayout = unknown,
> {
  /**
   * canonical document 를 legacy `elements / pages / layouts` payload 로
   * 변환. Phase 3 shadow write / canonical primary 전환 시 legacy 저장
   * 호환성 유지 용도.
   */
  exportLegacyDocument(
    doc: CompositionDocument,
  ): CanonicalLegacyExport<TElement, TPage, TLayout>;

  /**
   * 동일 document 에 대해 legacy → canonical → legacy roundtrip 결과를
   * before/after 로 비교. Phase 3 destructive diff 0 검증.
   */
  diffLegacyRoundtrip(
    before: CanonicalLegacyAdapterInput<TElement, TPage, TLayout>,
    after: CanonicalLegacyExport<TElement, TPage, TLayout>,
  ): CanonicalRoundtripDiff;
}
