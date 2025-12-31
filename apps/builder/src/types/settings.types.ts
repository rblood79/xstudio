/**
 * Settings Types
 *
 * 사용자 설정 및 동기화 옵션
 */

/**
 * 동기화 모드
 * - 'manual': 수동 동기화만 (기본값, Local-First)
 * - 'auto': 자동 동기화 (변경 시 자동 업로드)
 */
export type SyncMode = 'manual' | 'auto';

/**
 * 프로젝트 생성 위치
 * - 'local': 로컬(IndexedDB)에만 생성 (기본값)
 * - 'cloud': 클라우드(Supabase)에 즉시 생성
 * - 'both': 양쪽 모두 생성
 */
export type ProjectCreationMode = 'local' | 'cloud' | 'both';

/**
 * 사용자 설정
 */
export interface UserSettings {
  /**
   * 동기화 모드
   * @default 'manual'
   */
  syncMode: SyncMode;

  /**
   * 프로젝트 생성 위치
   * @default 'local'
   */
  projectCreation: ProjectCreationMode;

  /**
   * 자동 동기화 간격 (분)
   * @default 5
   * syncMode가 'auto'일 때만 적용
   */
  autoSyncInterval?: number;

  /**
   * 프로젝트 열 때 자동 다운로드
   * @default false
   * true면 클라우드 프로젝트 열 때 자동 로컬 다운로드
   */
  autoDownloadOnOpen?: boolean;
}

/**
 * 기본 설정값
 */
export const DEFAULT_SETTINGS: UserSettings = {
  syncMode: 'manual',
  projectCreation: 'local',
  autoSyncInterval: 5,
  autoDownloadOnOpen: false,
};
