/**
 * G.1 Component-Instance System Types
 *
 * Master-Instance 패턴 전용 타입 정의.
 * Pencil의 reusable/ref/descendants 패턴을 XStudio에 적용.
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.1
 */

import type { Element } from './unified.types';

/** Master 컴포넌트 요약 정보 (UI 목록 표시용) */
export interface MasterComponentSummary {
  id: string;
  name: string;
  tag: string;
  childCount: number;
  instanceCount: number;
}

/**
 * Instance props 해석 결과
 *
 * 우선순위: descendant override > instance override > master > default
 */
export interface ResolvedInstanceProps {
  /** 최종 병합된 props */
  props: Record<string, unknown>;
  /** 각 prop의 출처 */
  sources: Record<string, 'master' | 'override' | 'descendant' | 'default'>;
}

/** Master 변경 이벤트 (instance 전파에 사용) */
export interface MasterChangeEvent {
  masterId: string;
  changedKeys: string[];
  prevProps: Record<string, unknown>;
  newProps: Record<string, unknown>;
}

/** Instance detach 결과 (undo 복원용) */
export interface DetachResult {
  /** detach 후 독립 요소 배열 */
  elements: Element[];
  /** detach 이전 상태 (undo 시 복원) */
  previousState: {
    instanceId: string;
    masterId: string;
    overrides?: Record<string, unknown>;
    descendants?: Record<string, Record<string, unknown>>;
  };
}
