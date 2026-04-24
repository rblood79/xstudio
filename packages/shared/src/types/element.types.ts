/**
 * Element Types
 *
 * 🚀 Phase 10 B2.2: 공유 Element 타입 정의
 *
 * Builder와 Publish App에서 공통으로 사용하는 Element 관련 타입입니다.
 *
 * @since 2025-12-11 Phase 10 B2.2
 */

// ============================================
// ADR-903 Migration Notice (Phase 0)
// ============================================
//
// 본 Element 타입의 여러 필드는 pencil.dev 정합 canonical format으로 전환 중이다.
// canonical 타입: packages/shared/src/types/composition-document.types.ts
// 전환 계획: docs/adr/903-ref-descendants-slot-composition-format-migration-plan.md
//
// Phase 0 (현재): 타입/계약 고정. 기존 Element 구조 변경 없음
// Phase 1: adapter가 legacy → canonical 일방향 정규화
// Phase 2: Preview/Skia가 canonical resolver 공통 소비
// Phase 3: frameset/layout/slot 흡수
// Phase 4: 편집 semantics (copy/paste/detach/override reset)
// Phase 5: DB 저장 포맷 전환 (tag 컬럼 → type 컬럼)

import type { CSSProperties, ReactNode } from "react";

// ============================================
// Data Binding Types
// ============================================

/**
 * 데이터 바인딩 타입
 */
export interface DataBinding {
  type: "collection" | "value" | "field";
  source: "supabase" | "api" | "state" | "static" | "parent";
  config: Record<string, unknown>;
}

/**
 * 필드 타입 (컬렉션 컴포넌트용)
 */
export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "image"
  | "url"
  | "email";

/**
 * 필드 정의
 */
export interface FieldDefinition {
  key: string;
  label?: string;
  type?: FieldType;
  visible?: boolean;
  order?: number;
}

/**
 * 컬럼 매핑
 */
export interface ColumnMapping {
  [fieldKey: string]: FieldDefinition;
}

// ============================================
// Element Types
// ============================================

/**
 * 기본 Element Props
 */
export interface BaseElementProps {
  id?: string;
  className?: string;
  style?: CSSProperties;
  computedStyle?: Partial<CSSProperties>;
  "data-element-id"?: string;
  children?: ReactNode;
}

/**
 * Element 구조
 */
export interface Element {
  id: string;
  customId?: string;
  /**
   * @deprecated ADR-903 P0: canonical 'type' 필드로 rename 예정. Phase 1 adapter에서
   * tag→type 일방향 정규화, Phase 5에서 DB 컬럼 rename. 값 공간은 pencil 정합
   * ComponentTag literal union으로 수렴 (composition-document.types.ts 참조).
   */
  tag: string;
  props: Record<string, unknown>;
  fills?: unknown[];
  parent_id?: string | null;
  order_num?: number;
  page_id?: string | null;
  /**
   * @deprecated ADR-903 P3: canonical 'ref' 필드로 전환. reusable layout shell의
   * page root ref 참조로 대체. Phase 3에서 frameset/layout 시스템 흡수.
   */
  layout_id?: string | null;
  /**
   * @deprecated ADR-903 P3: canonical 'slot' 메타데이터 + descendants[slotPath].children
   * 패턴으로 전환. 별도 Slot 특수 노드 제거.
   */
  slot_name?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted?: boolean;
  dataBinding?: DataBinding;
  events?: unknown[];

  // --- G.1: Component-Instance System ---
  /**
   * 'master' = 재사용 가능 컴포넌트 원본, 'instance' = master 참조 인스턴스
   *
   * @deprecated ADR-903 P1: canonical 'reusable: true' (master) / 'type: "ref"' (instance)로
   * rename. Phase 1 adapter에서 정규화.
   */
  componentRole?: "master" | "instance";
  /**
   * instance가 참조하는 master element ID
   *
   * @deprecated ADR-903 P1: canonical 'ref: <master-id>' 필드로 rename.
   * 인스턴스의 원본 참조.
   */
  masterId?: string;
  /**
   * instance 직접 props 오버라이드 (master 기본값 위에 적용)
   *
   * @deprecated ADR-903 P1: canonical RefNode 루트 속성 override로 흡수.
   * instance 자신의 props는 ref root에 직접 설정.
   */
  overrides?: Record<string, unknown>;
  /**
   * instance 하위 자손 노드별 오버라이드: { childId: { propKey: value } }
   *
   * @deprecated ADR-903 P3: key 의미 재정의 — 현재 runtime UUID 기반, canonical은
   * stable id path (예: "ok-button/label"). Phase 3 id/path remap 완료 시 의미 전환.
   */
  descendants?: Record<string, Record<string, unknown>>;
  /**
   * master 컴포넌트 표시 이름
   *
   * @deprecated ADR-903 P0: canonical 'name' 필드로 rename. 모든 노드에 사용자 표시
   * 이름 허용 (reusable 전용 아님).
   */
  componentName?: string;

  // --- G.2: Design Variable Reference ---
  /**
   * 이 요소가 참조하는 디자인 변수 목록 (e.g., ['$--primary', '$--spacing-md'])
   *
   * @deprecated ADR-903 P0: canonical 인라인 VariableRef ({ $var: "<key>" }) 참조로 전환.
   * 배열 필드 해체 후 필드 값 자체에 변수 참조 허용.
   */
  variableBindings?: string[];
}

/**
 * Page 구조
 */
export interface Page {
  id: string;
  title: string;
  project_id: string;
  slug: string;
  parent_id?: string | null;
  order_num?: number;
  layout_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Component Props Types
// ============================================

// Note: ComponentSize is defined in componentVariants.types.ts
// to avoid circular dependencies, we re-export them here
import type { ComponentSize } from "./componentVariants.types";

/**
 * 공통 컴포넌트 Props
 */
export interface CommonComponentProps extends BaseElementProps {
  variant?: string;
  size?: ComponentSize;
  isDisabled?: boolean;
}

// Re-export for convenience (used by other files that import from element.types)
export type { ComponentSize } from "./componentVariants.types";
