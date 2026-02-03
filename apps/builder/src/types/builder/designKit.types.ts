/**
 * G.4 Design Kit System Types
 *
 * Kit JSON 스키마 및 TypeScript 타입 + Zod 검증.
 * Kit = variables + themes/tokens + master components 패키지.
 *
 * 의존 시스템:
 * - G.1 Component-Instance (componentRole, masterId)
 * - G.2 Variable Reference ($-- 변수 참조)
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.4
 */

import { z } from 'zod';

// ============================================
// Kit Metadata
// ============================================

export interface DesignKitMeta {
  /** 킷 고유 ID (UUID v4) */
  id: string;
  /** 킷 이름 (예: "Shadcn Basic") */
  name: string;
  /** 버전 (semver) */
  version: string;
  /** 설명 */
  description?: string;
  /** 작성자 */
  author?: string;
  /** 미리보기 이미지 URL */
  thumbnailUrl?: string;
  /** 태그 */
  tags?: string[];
  /** 생성일 */
  createdAt: string;
  /** 수정일 */
  updatedAt: string;
}

// ============================================
// Kit Element (master + descendants)
// ============================================

/**
 * Kit 내부의 요소 정의.
 * Element와 유사하지만 localId는 kit-local — 적용 시 새 UUID로 교체.
 */
export interface KitElement {
  /** Kit-local ID (적용 시 새 UUID로 교체) */
  localId: string;
  tag: string;
  props: Record<string, unknown>;
  /** 부모 Kit-local ID (루트이면 null) */
  parentLocalId: string | null;
  orderNum: number;
  componentRole?: 'master' | 'instance';
  componentName?: string;
  /** $-- 변수 참조 목록 */
  variableBindings?: string[];
}

/**
 * Kit에 포함되는 재사용 가능한 컴포넌트.
 * Master element + 하위 요소 트리 전체를 포함.
 */
export interface KitComponent {
  /** Master element (componentRole: 'master') */
  master: KitElement;
  /** Master의 자식 요소 flat 배열 (parentLocalId로 연결) */
  descendants: KitElement[];
  /** 카테고리 (UI 분류용) */
  category?: string;
  /** 미리보기 이미지 URL */
  thumbnailUrl?: string;
}

// ============================================
// Kit Theme Snapshot
// ============================================

/**
 * Kit 내부의 토큰 정의.
 * DesignToken과 유사하지만 project_id/theme_id 없음.
 */
export interface KitToken {
  name: string;
  type: 'color' | 'typography' | 'spacing' | 'shadow' | 'border' | 'radius' | 'font' | 'size' | 'motion' | 'other';
  value: unknown;
  scope: 'raw' | 'semantic';
  aliasOf?: string | null;
  cssVariable?: string;
}

/**
 * Kit에 포함되는 테마 스냅샷.
 * project_id/theme_id는 적용 시 현재 프로젝트 값으로 교체.
 */
export interface KitThemeSnapshot {
  /** 테마 이름 */
  name: string;
  /** 테마 상태 */
  status: 'active' | 'draft';
  /** 다크모드 지원 여부 */
  supportsDarkMode?: boolean;
  /** 이 테마에 속하는 토큰들 */
  tokens: KitToken[];
}

// ============================================
// Kit Variable
// ============================================

/**
 * Kit 내부의 변수 정의.
 * DesignVariable과 유사하지만 project_id 없음.
 */
export interface KitVariable {
  name: string;
  type: 'color' | 'string' | 'number';
  /** 기본값 (themeId: null에 해당) */
  defaultValue: string | number;
  /** 테마별 오버라이드 (테마 이름 -> 값) */
  themeOverrides?: Record<string, string | number>;
  description?: string;
  group?: string;
  tokenRef?: string;
}

// ============================================
// Design Kit (Root Schema)
// ============================================

export interface DesignKit {
  /** JSON format version */
  formatVersion: '1.0';
  /** 킷 메타데이터 */
  meta: DesignKitMeta;
  /** 디자인 변수 */
  variables: KitVariable[];
  /** 테마 스냅샷 (토큰 포함) */
  themes: KitThemeSnapshot[];
  /** 재사용 가능한 컴포넌트 */
  components: KitComponent[];
}

// ============================================
// Kit Loading Result
// ============================================

export interface KitLoadResult {
  success: boolean;
  error?: string;
  variablesApplied: number;
  tokensApplied: number;
  mastersRegistered: number;
  conflicts: KitConflict[];
}

export interface KitConflict {
  type: 'variable' | 'token' | 'component';
  name: string;
  resolution: 'overwrite' | 'skip' | 'rename';
}

// ============================================
// Kit Apply Options
// ============================================

export interface KitApplyOptions {
  /** 충돌 시 기본 처리 */
  conflictResolution: 'overwrite' | 'skip';
  /** 변수 적용 여부 */
  applyVariables: boolean;
  /** 테마/토큰 적용 여부 */
  applyThemes: boolean;
  /** 컴포넌트 등록 여부 */
  registerComponents: boolean;
}

export const DEFAULT_KIT_APPLY_OPTIONS: KitApplyOptions = {
  conflictResolution: 'overwrite',
  applyVariables: true,
  applyThemes: true,
  registerComponents: true,
};

// ============================================
// Kit Store State
// ============================================

export type KitStatus = 'idle' | 'loading' | 'applying' | 'error';

export interface DesignKitState {
  /** 사용 가능한 Kit 목록 (내장 + 사용자) */
  availableKits: DesignKitMeta[];
  /** 현재 로드된 Kit (파싱 완료) */
  loadedKit: DesignKit | null;
  /** 프로젝트에 적용된 Kit ID 목록 */
  appliedKitIds: string[];
  /** 상태 */
  status: KitStatus;
  /** 에러 메시지 */
  error: string | null;
  /** 마지막 적용 결과 */
  lastResult: KitLoadResult | null;
}

// ============================================
// Zod Validation Schemas
// ============================================

export const KitVariableSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['color', 'string', 'number']),
  defaultValue: z.union([z.string(), z.number()]),
  themeOverrides: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  description: z.string().optional(),
  group: z.string().optional(),
  tokenRef: z.string().optional(),
});

export const KitTokenSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['color', 'typography', 'spacing', 'shadow', 'border', 'radius', 'font', 'size', 'motion', 'other']),
  value: z.unknown(),
  scope: z.enum(['raw', 'semantic']),
  aliasOf: z.string().nullable().optional(),
  cssVariable: z.string().optional(),
});

export const KitElementSchema = z.object({
  localId: z.string().min(1),
  tag: z.string().min(1),
  props: z.record(z.string(), z.unknown()),
  parentLocalId: z.string().nullable(),
  orderNum: z.number(),
  componentRole: z.enum(['master', 'instance']).optional(),
  componentName: z.string().optional(),
  variableBindings: z.array(z.string()).optional(),
});

export const KitComponentSchema = z.object({
  master: KitElementSchema,
  descendants: z.array(KitElementSchema),
  category: z.string().optional(),
  thumbnailUrl: z.string().optional(),
});

export const KitThemeSnapshotSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['active', 'draft']),
  supportsDarkMode: z.boolean().optional(),
  tokens: z.array(KitTokenSchema),
});

export const KitMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string(),
  description: z.string().optional(),
  author: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DesignKitSchema = z.object({
  formatVersion: z.literal('1.0'),
  meta: KitMetaSchema,
  variables: z.array(KitVariableSchema),
  themes: z.array(KitThemeSnapshotSchema),
  components: z.array(KitComponentSchema),
});
