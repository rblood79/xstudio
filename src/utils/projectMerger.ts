/**
 * Project Merger Utility
 *
 * 로컬(IndexedDB)과 클라우드(Supabase) 프로젝트를 병합하여
 * 통합 프로젝트 목록을 생성합니다.
 */

import type { Project } from '../services/api/ProjectsApiService';
import type { ProjectListItem, StorageBadge, ProjectActions } from '../types/dashboard.types';

/**
 * 로컬과 클라우드 프로젝트를 병합
 *
 * @param localProjects - IndexedDB의 로컬 프로젝트들
 * @param cloudProjects - Supabase의 클라우드 프로젝트들
 * @returns 병합된 프로젝트 목록
 *
 * @example
 * ```typescript
 * const localProjects = await db.projects.getAll();
 * const cloudProjects = await projectsApi.fetchProjects();
 * const merged = mergeProjects(localProjects, cloudProjects);
 * ```
 */
export function mergeProjects(
  localProjects: Project[],
  cloudProjects: Project[]
): ProjectListItem[] {
  const projectMap = new Map<string, ProjectListItem>();

  console.log('[ProjectMerger] 병합 시작:', {
    localCount: localProjects.length,
    cloudCount: cloudProjects.length,
  });

  // 1. 로컬 프로젝트 추가
  for (const local of localProjects) {
    const item: ProjectListItem = {
      id: local.id,
      name: local.name,
      storage: {
        local: true,
        cloud: false,
      },
      sync: {
        status: 'local-only',
        localUpdatedAt: new Date(local.updated_at),
      },
      createdAt: new Date(local.created_at),
      lastModified: new Date(local.updated_at),
      localProject: local,
    };

    projectMap.set(local.id, item);
  }

  // 2. 클라우드 프로젝트 병합
  for (const cloud of cloudProjects) {
    const existing = projectMap.get(cloud.id);

    if (existing) {
      // 이미 로컬에 있음 → 동기화 상태 확인
      existing.storage.cloud = true;
      existing.sync.cloudUpdatedAt = new Date(cloud.updated_at);
      existing.cloudProject = cloud;

      // 충돌 여부 확인
      const localTime = existing.sync.localUpdatedAt!.getTime();
      const cloudTime = existing.sync.cloudUpdatedAt!.getTime();

      if (Math.abs(localTime - cloudTime) < 1000) {
        // 1초 이내 차이면 동일한 것으로 간주
        existing.sync.status = 'synced';
      } else if (localTime > cloudTime) {
        // 로컬이 최신
        existing.sync.status = 'conflict';
        console.log('[ProjectMerger] 충돌 감지 (로컬 최신):', {
          projectId: cloud.id,
          localTime: existing.sync.localUpdatedAt,
          cloudTime: existing.sync.cloudUpdatedAt,
        });
      } else {
        // 클라우드가 최신
        existing.sync.status = 'conflict';
        console.log('[ProjectMerger] 충돌 감지 (클라우드 최신):', {
          projectId: cloud.id,
          localTime: existing.sync.localUpdatedAt,
          cloudTime: existing.sync.cloudUpdatedAt,
        });
      }

      // 최신 수정 시간 사용
      existing.lastModified = new Date(Math.max(localTime, cloudTime));
    } else {
      // 클라우드에만 있음
      const item: ProjectListItem = {
        id: cloud.id,
        name: cloud.name,
        storage: {
          local: false,
          cloud: true,
        },
        sync: {
          status: 'cloud-only',
          cloudUpdatedAt: new Date(cloud.updated_at),
        },
        createdAt: new Date(cloud.created_at),
        lastModified: new Date(cloud.updated_at),
        cloudProject: cloud,
      };

      projectMap.set(cloud.id, item);
    }
  }

  const merged = Array.from(projectMap.values());

  console.log('[ProjectMerger] 병합 완료:', {
    totalCount: merged.length,
    localOnly: merged.filter((p) => p.sync.status === 'local-only').length,
    cloudOnly: merged.filter((p) => p.sync.status === 'cloud-only').length,
    synced: merged.filter((p) => p.sync.status === 'synced').length,
    conflict: merged.filter((p) => p.sync.status === 'conflict').length,
  });

  // 최신 수정 시간 기준으로 정렬
  return merged.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

/**
 * 저장 위치 뱃지 정보 생성
 *
 * @param project - 프로젝트 아이템
 * @returns 뱃지 정보
 *
 * @example
 * ```typescript
 * const badge = getStorageBadge(project);
 * console.log(badge.icon, badge.label); // "☁️💾 Synced"
 * ```
 */
export function getStorageBadge(project: ProjectListItem): StorageBadge {
  const { local, cloud } = project.storage;

  if (local && cloud) {
    if (project.sync.status === 'conflict') {
      return {
        icon: '⚠️',
        label: 'Needs Sync',
        className: 'badge-conflict',
      };
    }
    return {
      icon: '☁️💾',
      label: 'Synced',
      className: 'badge-synced',
    };
  }

  if (local && !cloud) {
    return {
      icon: '💾',
      label: 'Local Only',
      className: 'badge-local',
    };
  }

  if (!local && cloud) {
    return {
      icon: '☁️',
      label: 'Cloud Only',
      className: 'badge-cloud',
    };
  }

  return {
    icon: '❓',
    label: 'Unknown',
    className: 'badge-unknown',
  };
}

/**
 * 사용 가능한 액션 확인
 *
 * @param project - 프로젝트 아이템
 * @returns 액션 가능 여부
 *
 * @example
 * ```typescript
 * const actions = getAvailableActions(project);
 * if (actions.canSync) {
 *   // "Sync to Cloud" 버튼 표시
 * }
 * ```
 */
export function getAvailableActions(project: ProjectListItem): ProjectActions {
  const { local, cloud } = project.storage;

  return {
    canSync: local && (!cloud || project.sync.status === 'conflict'),
    canDownload: cloud && !local,
    canOpen: local || cloud,
    canExport: local,
  };
}

/**
 * 상대 시간 포맷팅
 *
 * @param date - 날짜
 * @returns 상대 시간 문자열 (예: "5분 전", "2시간 전")
 *
 * @example
 * ```typescript
 * formatRelativeTime(new Date(Date.now() - 5 * 60 * 1000)); // "5분 전"
 * ```
 */
export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 30) return `${days}일 전`;
  if (months < 12) return `${months}개월 전`;
  return `${years}년 전`;
}
