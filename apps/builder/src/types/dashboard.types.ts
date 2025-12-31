/**
 * Dashboard Types
 *
 * 대시보드에서 사용하는 프로젝트 관련 타입 정의
 */

import type { Project } from '../services/api/ProjectsApiService';

/**
 * 프로젝트 저장 위치
 */
export interface ProjectStorage {
  local: boolean;      // IndexedDB에 존재
  cloud: boolean;      // Supabase에 존재
  filePath?: string;   // .xstudio 파일 경로 (있는 경우)
}

/**
 * 프로젝트 동기화 상태
 */
export type SyncStatus =
  | 'local-only'    // 로컬에만 존재
  | 'cloud-only'    // 클라우드에만 존재
  | 'synced'        // 동기화됨 (같은 버전)
  | 'conflict';     // 충돌 (로컬/클라우드 버전이 다름)

/**
 * 프로젝트 동기화 정보
 */
export interface ProjectSync {
  status: SyncStatus;
  lastSyncAt?: Date;
  localUpdatedAt?: Date;
  cloudUpdatedAt?: Date;
}

/**
 * 대시보드 프로젝트 목록 아이템
 *
 * 로컬과 클라우드 프로젝트를 병합한 통합 타입
 */
export interface ProjectListItem {
  id: string;
  name: string;

  // 위치 정보
  storage: ProjectStorage;

  // 동기화 정보
  sync: ProjectSync;

  // 표시 정보
  thumbnail?: string;
  pageCount?: number;
  elementCount?: number;
  createdAt: Date;
  lastModified: Date;

  // 원본 프로젝트 데이터 (필요 시)
  localProject?: Project;
  cloudProject?: Project;
}

/**
 * 프로젝트 필터 타입
 */
export type ProjectFilter = 'all' | 'local' | 'cloud';

/**
 * 저장 위치 뱃지 정보
 */
export interface StorageBadge {
  icon: string;
  label: string;
  className: string;
}

/**
 * 사용 가능한 액션 정보
 */
export interface ProjectActions {
  canSync: boolean;        // 클라우드 동기화 가능
  canDownload: boolean;    // 클라우드에서 다운로드 가능
  canOpen: boolean;        // 열기 가능
  canExport: boolean;      // .xstudio 파일로 내보내기 가능
}
