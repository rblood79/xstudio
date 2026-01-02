/**
 * Migration Utilities
 *
 * 프로젝트 버전 마이그레이션 시스템
 *
 * @since 2026-01-02 Phase 4
 */

import type { ExportedProjectData, ProjectMetadata } from '../types/export.types';
import { ExportErrorCode, type ExportError } from '../types/export.types';

// ============================================
// Types
// ============================================

/**
 * 마이그레이션 함수 타입
 */
type MigrationFn = (data: unknown) => ExportedProjectData;

/**
 * 마이그레이션 결과
 */
export interface MigrationResult {
  success: boolean;
  data?: ExportedProjectData;
  error?: ExportError;
  migratedFrom?: string;
  migratedTo?: string;
}

// ============================================
// Constants
// ============================================

/** 현재 지원 버전 */
export const CURRENT_VERSION = '1.0.0';

/** 지원되는 최소 버전 */
export const MIN_SUPPORTED_VERSION = '0.9.0';

/** 지원되는 버전 목록 */
export const SUPPORTED_VERSIONS = ['0.9.0', '1.0.0'] as const;

// ============================================
// Version Utilities
// ============================================

/**
 * Semver 버전 비교
 * @returns -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;

    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }

  return 0;
}

/**
 * 버전이 지원되는지 확인
 */
export function isVersionSupported(version: string): boolean {
  // 최소 지원 버전 이상인지 확인
  return compareVersions(version, MIN_SUPPORTED_VERSION) >= 0;
}

/**
 * 버전 파싱
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

// ============================================
// Migration Functions
// ============================================

/**
 * v0.9.0 데이터 타입 (레거시)
 */
interface LegacyProjectDataV09 {
  version?: string;
  exportedAt?: string;
  project: {
    id: string;
    name: string;
  };
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    project_id: string;
    // 0.9.0에서는 parent_id, order_num, layout_id가 없을 수 있음
    parent_id?: string | null;
    order_num?: number;
    layout_id?: string | null;
  }>;
  elements: Array<{
    id: string;
    tag: string;
    props: Record<string, unknown>;
    parent_id: string | null;
    page_id: string;
    order_num?: number;
    // 0.9.0에서는 events가 없을 수 있음
    events?: Array<unknown>;
  }>;
  currentPageId?: string;
}

/**
 * 마이그레이션 레지스트리
 */
const migrations: Record<string, MigrationFn> = {
  // v0.9.0 → v1.0.0 마이그레이션
  '0.9.0': (data) => {
    const legacy = data as LegacyProjectDataV09;
    console.log('[Migration] Migrating from v0.9.0 to v1.0.0');

    return {
      version: '0.9.0', // 현재 버전 유지 (체인에서 업데이트됨)
      exportedAt: legacy.exportedAt || new Date().toISOString(),
      project: legacy.project,
      pages: legacy.pages.map((page, index) => ({
        ...page,
        parent_id: page.parent_id ?? null,
        order_num: page.order_num ?? index,
        layout_id: page.layout_id ?? null,
      })),
      elements: legacy.elements.map((element, index) => ({
        ...element,
        order_num: element.order_num ?? index,
        events: element.events ?? [],
      })),
      currentPageId: legacy.currentPageId || legacy.pages[0]?.id,
    } as ExportedProjectData;
  },

  // v1.0.0은 현재 버전
  '1.0.0': (data) => {
    console.log('[Migration] Data is at v1.0.0 (current)');
    return data as ExportedProjectData;
  },

  // 향후 버전 마이그레이션 예시:
  // '1.1.0': (data) => {
  //   const v1 = data as ExportedProjectDataV1;
  //   return {
  //     ...v1,
  //     version: '1.1.0',
  //     metadata: {
  //       ...v1.metadata,
  //       builderVersion: v1.metadata?.builderVersion || '1.0.0',
  //     },
  //   };
  // },
};

/**
 * 마이그레이션 체인 가져오기
 */
function getMigrationChain(fromVersion: string, toVersion: string): string[] {
  const chain: string[] = [];
  const versions = Object.keys(migrations).sort(compareVersions);

  let started = false;
  for (const version of versions) {
    if (version === fromVersion) {
      started = true;
    }
    if (started) {
      chain.push(version);
    }
    if (version === toVersion) {
      break;
    }
  }

  return chain;
}

// ============================================
// Main Migration Function
// ============================================

/**
 * 프로젝트 데이터 마이그레이션
 */
export function migrateProject(data: unknown): MigrationResult {
  // 버전 추출
  const rawData = data as { version?: string };
  const version = rawData.version || '1.0.0';

  // 버전 지원 확인
  if (!isVersionSupported(version)) {
    return {
      success: false,
      error: {
        code: ExportErrorCode.UNKNOWN_VERSION,
        message: `Version ${version} is not supported`,
        detail: `Minimum supported version: ${MIN_SUPPORTED_VERSION}`,
        severity: 'error',
      },
    };
  }

  // 이미 최신 버전이면 바로 반환
  if (version === CURRENT_VERSION) {
    return {
      success: true,
      data: data as ExportedProjectData,
    };
  }

  // 마이그레이션 체인 가져오기
  const chain = getMigrationChain(version, CURRENT_VERSION);

  if (chain.length === 0) {
    return {
      success: false,
      error: {
        code: ExportErrorCode.MIGRATION_FAILED,
        message: `No migration path from ${version} to ${CURRENT_VERSION}`,
        severity: 'error',
      },
    };
  }

  // 순차적으로 마이그레이션 적용
  let current = data;
  let currentVersion = version;

  for (const targetVersion of chain) {
    if (targetVersion === currentVersion) continue;

    const migrationFn = migrations[targetVersion];
    if (!migrationFn) {
      return {
        success: false,
        error: {
          code: ExportErrorCode.MIGRATION_FAILED,
          message: `Migration to ${targetVersion} not found`,
          detail: `Failed at: ${currentVersion} → ${targetVersion}`,
          severity: 'error',
        },
      };
    }

    try {
      current = migrationFn(current);
      currentVersion = targetVersion;
    } catch (error) {
      return {
        success: false,
        error: {
          code: ExportErrorCode.MIGRATION_FAILED,
          message: error instanceof Error ? error.message : 'Migration failed',
          detail: `Failed at: ${currentVersion} → ${targetVersion}`,
          severity: 'error',
        },
      };
    }
  }

  return {
    success: true,
    data: current as ExportedProjectData,
    migratedFrom: version,
    migratedTo: CURRENT_VERSION,
  };
}

/**
 * 메타데이터 정규화
 */
export function normalizeMetadata(metadata?: Partial<ProjectMetadata>): ProjectMetadata {
  return {
    builderVersion: metadata?.builderVersion || CURRENT_VERSION,
    exportedBy: metadata?.exportedBy,
    description: metadata?.description,
    thumbnail: metadata?.thumbnail,
  };
}

/**
 * 버전 호환성 확인
 */
export function checkVersionCompatibility(
  projectVersion: string,
  builderVersion?: string
): { compatible: boolean; warning?: string } {
  const projectParsed = parseVersion(projectVersion);
  const builderParsed = builderVersion ? parseVersion(builderVersion) : null;

  if (!projectParsed) {
    return { compatible: false, warning: 'Invalid project version format' };
  }

  // 프로젝트 버전이 지원 범위 내인지 확인
  if (!isVersionSupported(projectVersion)) {
    return {
      compatible: false,
      warning: `Project version ${projectVersion} is not supported. Minimum: ${MIN_SUPPORTED_VERSION}`,
    };
  }

  // 빌더 버전과 프로젝트 버전의 메이저 버전 불일치 경고
  if (builderParsed && projectParsed.major !== builderParsed.major) {
    return {
      compatible: true,
      warning: `Builder major version (${builderParsed.major}) differs from project (${projectParsed.major})`,
    };
  }

  return { compatible: true };
}
