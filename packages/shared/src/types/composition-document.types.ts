/**
 * @fileoverview Canonical Document Types — ADR-903 P0
 *
 * **scope 분리 (R5)**:
 * - `CanonicalNode.type` (ComponentTag, 121-literal) — composition component / pencil 구조 타입
 * - `DataBinding.type` ("collection" | "value" | "field") — `element.dataBinding.type` scope
 * - `FieldDefinition.type` (FieldType 7-literal) — `fieldDef.type` scope
 *
 * 세 필드는 `element.type` vs `element.props.columnMapping.*.type` vs
 * `element.dataBinding.type` 처럼 **3단계 nesting scope** 로 격리되어 있으며,
 * 서로 rename 하지 않는다. 값 공간 교집합 0건 — compile-time disjoint 보장.
 *
 * **pencil schema 정합**: 필드명은 pencil.dev 공식 schema 와 동일
 * (`type` / `reusable` / `ref` / `descendants` / `slot` / `clip` / `placeholder` /
 * `version` / `themes` / `variables` / `imports` / `name` / `metadata`) 사용.
 * 이름 변경 금지.
 */

import type { ComponentTag } from "./composition-vocabulary";

// ─────────────────────────────────────────────
// ThemeSnapshot — ADR-910 Phase 1
// ─────────────────────────────────────────────

/**
 * canonical document `themes` 필드의 구체화된 snapshot 타입.
 *
 * ADR-910 대안 B: ADR-021 themeConfigStore 현재 상태의 read-only snapshot.
 * ADR-910 R2 대응: `Record<string, string[]>` stub 대신 확장 가능한 구조체.
 * - `tint`: 현재 Tint 프리셋 이름 (ADR-021 TintPreset)
 * - `darkMode`: 현재 Dark mode 설정 ("light" | "dark" | "system")
 * - `neutral`: 현재 Neutral 프리셋 이름 (ADR-021 NeutralPreset)
 * - `radiusScale`: 현재 Border radius 스케일 ("none" | "sm" | "md" | "lg" | "xl")
 * - `customTokens`: 향후 per-element override 확장용 슬롯 (현재 미사용)
 *
 * Phase 2 (write-through) 이후 `themes` 필드가 런타임에 적용됨.
 */
export interface ThemeSnapshot {
  /** ADR-021 Tint 프리셋 ("blue" | "indigo" | "purple" | ...) */
  tint: string;
  /** ADR-021 Dark mode 설정 ("light" | "dark" | "system") */
  darkMode: string;
  /** ADR-021 Neutral 프리셋 */
  neutral: string;
  /** Border radius 스케일 */
  radiusScale: string;
  /** 향후 확장: per-element theme override, custom token map 등 */
  customTokens?: Record<string, string>;
}

// ─────────────────────────────────────────────
// VariablesSnapshot — ADR-910 Phase 1
// ─────────────────────────────────────────────

/**
 * `VariablesSnapshot` 내 개별 변수 항목.
 *
 * ADR-910 R3 대응: `source` 구분자로 Spec TokenRef vs 사용자 정의 변수를 구분.
 * - `spec-token`: `packages/specs/src/primitives/tokenResolver.ts` 에서 resolve 된 값
 * - `user-defined`: 사용자가 직접 정의한 변수 (향후 UI에서 편집 가능)
 */
export interface VariablesSnapshotEntry {
  type: "color" | "number" | "string" | "boolean";
  value: string | number | boolean;
  /** ADR-910 R3: 변수 출처 구분자 */
  source: "spec-token" | "user-defined";
}

/**
 * canonical document `variables` 필드의 snapshot 타입.
 *
 * ADR-910 대안 B: ADR-022 TokenRef/CSS 변수 체계의 read-only snapshot.
 * `legacyToCanonical()` 호출 시 `getVariables()` 콜백으로 주입됨.
 *
 * Phase 2 이후 `variables`가 Spec TokenRef resolver와 통합되어
 * `resolveCanonicalVariable(ref, document)` 진입점이 생성될 예정.
 */
export type VariablesSnapshot = Record<string, VariablesSnapshotEntry>;

// ─────────────────────────────────────────────
// Variable Reference Primitives
// ─────────────────────────────────────────────

/**
 * `$var` 참조 — ADR-022 TokenRef와 통합되는 canonical variable 참조 문법.
 *
 * 예: `{ $var: "primary" }` → `CompositionDocument.variables["primary"]` 참조
 */
export interface VariableRef {
  $var: string;
}

/** 숫자 또는 variable 참조 */
export type NumberOrVariable = number | VariableRef;

/** 문자열 또는 variable 참조 */
export type StringOrVariable = string | VariableRef;

/** boolean 또는 variable 참조 */
export type BooleanOrVariable = boolean | VariableRef;

/** 색상 문자열 또는 variable 참조 (hex / rgb / hsl 등) */
export type ColorOrVariable = string | VariableRef;

// ─────────────────────────────────────────────
// Variable Definition
// ─────────────────────────────────────────────

/**
 * 문서 레벨 variable 정의 — `CompositionDocument.variables` 의 값 타입.
 *
 * ADR-022 Spec TokenRef + composition preset 통합.
 * 기존 CSS 변수 체계(`--accent`, `--bg-raised` 등)는 resolver가 이 정의에서 자동 emit.
 */
export interface VariableDefinition {
  type: "color" | "number" | "string" | "boolean";
  value: string | number | boolean;
}

// ─────────────────────────────────────────────
// DescendantOverride — 3-mode union
// ─────────────────────────────────────────────

/**
 * **(A) 속성 patch 모드** — `id` / `type` / `children` 키가 **전부 없을 때**.
 *
 * pencil.dev 공식: _"only the customized properties are present.
 * The `id`, `type` and `children` properties must not be specified"_
 *
 * 제공된 속성만 원본 위에 merge.
 */
export type DescendantPatchMode = {
  id?: never;
  type?: never;
  children?: never;
  [key: string]: unknown;
};

/**
 * **(B) node replacement 모드** — `type` 키가 **존재**할 때.
 *
 * 해당 경로 노드를 완전히 새 노드 서브트리로 교체.
 * `id` / `children` 등 새 노드 완전 형태 필수.
 */
export type DescendantReplaceMode = CanonicalNode;

/**
 * **(C) children replacement 모드** — `children` 배열만 존재하고 `type` 이 **없을 때**.
 *
 * 부모 노드는 유지, children 배열만 교체.
 * slot 채우기(`descendants[slotPath].children`)가 이 모드를 사용한다.
 */
export type DescendantChildrenMode = {
  id?: never;
  type?: never;
  children: CanonicalNode[];
};

/**
 * `descendants` 값 — 3-mode union (상호 배제).
 *
 * resolver 단계에서 mode 판정:
 * - `type` 존재 → (B) node replacement
 * - `children` 존재 + `type` 없음 → (C) children replacement
 * - 둘 다 없음 → (A) 속성 patch
 * - 복수 조건 충족 시 resolver **error** (silent merge 금지)
 *
 * TypeScript 패턴: 세 모드를 판별하는 기준 필드는 `type` 과 `children` 의
 * 존재 여부다. `DescendantReplaceMode`는 `CanonicalNode` (type 필수) 이며,
 * `DescendantChildrenMode`는 `children` 필수 + `type?: never`,
 * `DescendantPatchMode`는 두 필드 모두 `never` — 구조적 배제.
 */
export type DescendantOverride =
  | DescendantReplaceMode
  | DescendantChildrenMode
  | DescendantPatchMode;

// ─────────────────────────────────────────────
// CanonicalNode — discriminated union 공통 베이스
// ─────────────────────────────────────────────

/**
 * `CanonicalNode` — composition canonical tree 의 모든 노드 베이스.
 *
 * pencil.dev 공식 schema 정합 (`type` / `reusable` / `ref` / `descendants` /
 * `slot` / `id` / `children` / `name` / `metadata`).
 *
 * **id 형식 제약 (pencil.dev 공식)**: `id` 필드에 slash (`/`) 문자 포함 금지.
 * `descendants` key 의 slash 는 경로 구분자로만 해석된다.
 * 예: `"ok-button/label"` → "ok-button 노드의 label 자식" (path).
 * `id` 자체에 `/` 가 있으면 path parsing 모호성 발생.
 */
export interface CanonicalNode {
  /**
   * 노드 고유 식별자.
   * slash (`/`) 문자 포함 금지 — `descendants` key path 구분자와 충돌.
   */
  id: string;

  /**
   * 노드 타입 discriminator.
   * 값 공간: `ComponentTag` (composition component 118개 + pencil 구조 3개 = 121 literal).
   */
  type: ComponentTag;

  /**
   * 사용자 표시 이름.
   * composition 기존 `componentName` (reusable 전용) 을 모든 노드로 확장 통합.
   */
  name?: string;

  /**
   * Extensibility hook — 메타데이터 저장소.
   *
   * 사용 예:
   * - `metadata.compositionType`: export adapter 가 원본 composition component 이름 저장 (roundtrip 지원)
   * - `metadata.importedFrom`: import adapter 경유 시 `"<importKey>:<nodeId>"` 저장
   */
  metadata?: {
    type: string;
    [k: string]: unknown;
  };

  /** `true`이면 재사용 원본 노드로 승격. 인스턴스는 `type: "ref"` 로 참조. */
  reusable?: boolean;

  /** 자식 노드 배열 */
  children?: CanonicalNode[];

  /**
   * Slot declaration.
   *
   * Pencil schema exposes this on `Frame`, and composition also preserves it on
   * frame-compatible structural container shells such as `CardContent` so their
   * stable descendant path can be filled through `RefNode.descendants`.
   */
  slot?: false | string[];

  /**
   * 엔티티 레벨 theme override.
   * ADR-021 Tint/dark mode 시스템의 노드별 override.
   * 예: `{ mode: "dark", tint: "blue" }`
   */
  theme?: {
    mode?: string;
    tint?: string;
    [k: string]: string | undefined;
  };
}

// ─────────────────────────────────────────────
// FrameNode — Frame 전용 컨테이너 필드
// ─────────────────────────────────────────────

/**
 * `FrameNode` — `type: "frame"` 노드.
 *
   * Frame 전용 컨테이너 필드 2종 (`clip` / `placeholder`) 포함.
   * `slot` 은 CanonicalNode 공통 필드로 보존한다.
 * composition 기존 `overflow: hidden` / 빈 컨테이너 / `type="Slot"` 시스템을 흡수.
 */
export interface FrameNode extends CanonicalNode {
  type: "frame";

  /**
   * children clipping.
   * `true` 일 때 children 이 frame 경계를 넘으면 clip.
   * composition 기존 `style.overflow: "hidden"` 과 매핑.
   */
  clip?: BooleanOrVariable;

  /**
   * 빈 frame UI hint.
   * slot 이 채워지지 않았을 때 editor/canvas 에서 placeholder UI 렌더.
   */
  placeholder?: boolean;

}

// ─────────────────────────────────────────────
// RefNode — ref 인스턴스
// ─────────────────────────────────────────────

/**
 * `RefNode` — `type: "ref"` 인스턴스 노드.
 *
 * `reusable: true` 원본을 참조하고, `descendants` 로 자식 노드를 오버라이드.
 * composition 기존 `componentRole: "instance"` + `masterId` 를 대체.
 */
export interface RefNode extends CanonicalNode {
  type: "ref";

  /**
   * 원본 reusable 노드의 id.
   *
   * - local id: 같은 document 내 reusable 노드 id
   * - import 참조: `"<importKey>:<nodeId>"` 형식 (e.g. `"basic-kit:round-button"`)
   *   (import resolver 는 Phase 5 이후 구현)
   */
  ref: string;

  /**
   * 자식 노드 오버라이드 맵.
   *
   * key: stable id path — slash(`/`)로 경로 구분.
   * 예: `"label"` / `"ok-button/label"` / `"header/title"`
   *
   * 3-mode union (`DescendantOverride`):
   * - (A) 속성 patch: id/type/children 없음 → 속성만 merge
   * - (B) node replacement: type 존재 → 서브트리 전체 교체
   * - (C) children replacement: children 존재 + type 없음 → children 배열 교체
   */
  descendants?: Record<string, DescendantOverride>;
}

// ─────────────────────────────────────────────
// CompositionDocument — 문서 root
// ─────────────────────────────────────────────

/**
 * `CompositionDocument` — canonical document root.
 *
 * pencil.dev 공식 schema 정합 메타 필드 포함.
 *
 * **`version` 네임스페이스 규칙 (ADR-903 Hard Constraint #10)**:
 * - `composition-*` 네임스페이스 고정. 초기값 `"composition-1.0"`.
 * - pencil `"2.10"` 사용 **금지** — 외부 도구가 pencil 파일로 오인하여 잘못된 파서로 열 위험.
 * - breaking change 시 `"composition-2.0"` (major 증가).
 * - additive 변경 시 `"composition-1.1"` (minor 증가).
 * - read-through adapter 는 `"composition-"` 접두사 검사 후 migration 경로 선택.
 */
export interface CompositionDocument {
  /**
   * 문서 포맷 버전.
   * `composition-*` 네임스페이스 고정. 초기값 `"composition-1.0"`.
   */
  version: string;

  /**
   * theme 선언 — ADR-021 Tint/Dark mode 시스템 투영.
   *
   * ADR-910 Phase 1: `ThemeSnapshot` (read-only snapshot adapter 결과).
   * ADR-021 themeConfigStore 현재 상태의 직렬화. call-time 생성 (stale 방지).
   * Phase 2 write-through 이후: document 로드 시 → `themeConfigStore` 주입.
   *
   * 각 엔티티는 `theme?` 필드로 노드별 override 가능.
   */
  themes?: ThemeSnapshot;

  /**
   * 문서 variable 선언 — ADR-022 Spec TokenRef + 사용자 정의 변수 통합.
   *
   * ADR-910 Phase 1: `VariablesSnapshot` (read-only snapshot).
   * 기존 `VariableDefinition` 타입은 D2 props 참조용으로 유지 (하위 호환).
   * 필드에서 `{ $var: "primary" }` 형태로 참조.
   * Phase 2 이후: `resolveCanonicalVariable(ref, document)` → `tokenResolver.ts` 통합.
   */
  variables?: VariablesSnapshot;

  /**
   * 참조형 import hook — 외부 `.pen` 또는 canonical 문서 파일을 URL/path 로 참조.
   *
   * import 된 reusable 노드 id 는 `"<importKey>:<nodeId>"` 형식으로 `ref` 참조 가능.
   * 예: `{ "basic-kit": "./kits/basic.pen" }` → `ref: "basic-kit:round-button"`
   *
   * **P0 타입 스텁만**: 실제 resolver/fetch 구현은 Phase 5 이후 (ADR-914).
   */
  imports?: Record<string, string>;

  /** canonical 노드 트리 */
  children: CanonicalNode[];
}

// ─────────────────────────────────────────────
// Migration Hook
// ─────────────────────────────────────────────

/**
 * 문서 migration 함수 타입.
 *
 * `version` 접두사 (`composition-`) 검사 후 step-wise migration 체인을 등록한다.
 * 실제 migration 코드는 breaking change 시점에 추가.
 */
export type MigrationHook = (
  doc: CompositionDocument,
  fromVersion: string,
  toVersion: string,
) => CompositionDocument;

/**
 * `migrate` — 문서 버전 migration 스텁.
 *
 * 실제 migration 체인은 breaking change 시점에 확장.
 * 현재는 `fromVersion === toVersion` 이면 그대로 반환, 그 외는 미구현 에러.
 */
export function migrate(
  doc: CompositionDocument,
  fromVersion: string,
  toVersion: string,
): CompositionDocument {
  if (fromVersion === toVersion) return doc;
  throw new Error(
    `migrate: not implemented (from "${fromVersion}" to "${toVersion}")`,
  );
}
