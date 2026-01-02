/**
 * Element Types
 *
 * 🚀 Phase 10 B2.2: 공유 Element 타입 정의
 *
 * Builder와 Publish App에서 공통으로 사용하는 Element 관련 타입입니다.
 *
 * @since 2025-12-11 Phase 10 B2.2
 */

import type { CSSProperties, ReactNode } from 'react';

// ============================================
// Data Binding Types
// ============================================

/**
 * 데이터 바인딩 타입
 */
export interface DataBinding {
  type: 'collection' | 'value' | 'field';
  source: 'supabase' | 'api' | 'state' | 'static' | 'parent';
  config: Record<string, unknown>;
}

/**
 * 필드 타입 (컬렉션 컴포넌트용)
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'image'
  | 'url'
  | 'email';

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
  'data-element-id'?: string;
  children?: ReactNode;
}

/**
 * Element 구조
 */
export interface Element {
  id: string;
  customId?: string;
  tag: string;
  props: Record<string, unknown>;
  parent_id?: string | null;
  order_num?: number;
  page_id?: string | null;
  layout_id?: string | null;
  slot_name?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted?: boolean;
  dataBinding?: DataBinding;
  events?: unknown[];
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

// Note: ComponentSize and ComponentVariant are defined in componentVariants.types.ts
// to avoid circular dependencies, we re-export them here
import type { ComponentSize, ComponentVariant } from './componentVariants.types';

/**
 * 공통 컴포넌트 Props
 */
export interface CommonComponentProps extends BaseElementProps {
  variant?: ComponentVariant;
  size?: ComponentSize;
  isDisabled?: boolean;
}

// Re-export for convenience (used by other files that import from element.types)
export type { ComponentSize, ComponentVariant } from './componentVariants.types';
