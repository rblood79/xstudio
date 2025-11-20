/**
 * Theme Service
 * 테마 CRUD 및 관리 로직
 *
 * ✅ Phase 6: BaseApiService 마이그레이션 (2025-11-17)
 * - 캐싱 적용 (5분 TTL)
 * - Request Deduplication
 * - Performance Monitoring
 * - Automatic Cache Invalidation
 */

import { BaseApiService } from '../api/BaseApiService';
import type { DesignTheme } from '../../types/theme';
import { RealtimeBatcher, RealtimeFilters } from '../../utils/realtimeBatcher';
import { getDB } from '../../lib/db';
import { ElementUtils } from '../../utils/element/elementUtils';

export interface CreateThemeInput {
  project_id: string;
  name: string;
  parent_theme_id?: string;
  status?: 'active' | 'draft' | 'archived';
}

export interface UpdateThemeInput {
  name?: string;
  status?: 'active' | 'draft' | 'archived';
}

export class ThemeService extends BaseApiService {
  /**
   * 프로젝트의 모든 테마 조회 (IndexedDB)
   */
  static async getThemesByProject(projectId: string): Promise<DesignTheme[]> {
    try {
      const db = await getDB();
      const themes = await db.themes.getByProject(projectId);
      return themes;
    } catch (error) {
      console.error('[ThemeService] getThemesByProject failed:', error);
      return [];
    }
  }

  /**
   * 테마 ID로 조회 (IndexedDB)
   */
  static async getThemeById(themeId: string): Promise<DesignTheme | null> {
    try {
      const db = await getDB();
      return await db.themes.getById(themeId);
    } catch (error) {
      console.error('[ThemeService] getThemeById failed:', error);
      return null;
    }
  }

  /**
   * 활성 테마 조회 (IndexedDB)
   */
  static async getActiveTheme(projectId: string): Promise<DesignTheme | null> {
    try {
      const db = await getDB();
      const activeTheme = await db.themes.getActiveTheme(projectId);
      return activeTheme;
    } catch (error) {
      console.error('[ThemeService] getActiveTheme failed:', error);
      return null;
    }
  }

  /**
   * 테마 생성 (IndexedDB 전용)
   */
  static async createTheme(input: CreateThemeInput): Promise<DesignTheme> {
    const db = await getDB();

    // 1. Project 존재 확인 (없으면 자동 생성)
    let project = await db.projects.getById(input.project_id);
    if (!project) {
      console.warn('[ThemeService] Project not found, creating temp project:', input.project_id);
      const tempProject = {
        id: input.project_id,
        name: 'Temp Project',
        domain: 'localhost',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      project = await db.projects.insert(tempProject);
      console.log('✅ [IndexedDB] Temp project created:', project);
    }

    // 2. IndexedDB에 테마 생성
    const newTheme: DesignTheme = {
      id: ElementUtils.generateId(),
      project_id: input.project_id,
      name: input.name,
      parent_theme_id: input.parent_theme_id || null,
      status: input.status || 'draft',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.themes.insert(newTheme);
    console.log('✅ [IndexedDB] Theme created:', newTheme);

    return newTheme;
  }

  /**
   * 테마 업데이트 (IndexedDB)
   */
  static async updateTheme(themeId: string, updates: UpdateThemeInput): Promise<DesignTheme> {
    try {
      const db = await getDB();
      const result = await db.themes.update(themeId, updates);
      console.log('[ThemeService] Theme updated:', result);
      return result;
    } catch (error) {
      console.error('[ThemeService] updateTheme failed:', error);
      throw error;
    }
  }

  /**
   * 테마 삭제 (IndexedDB)
   */
  static async deleteTheme(themeId: string): Promise<void> {
    try {
      const db = await getDB();

      // 마지막 테마인지 확인
      const theme = await this.getThemeById(themeId);
      if (!theme) {
        throw new Error('테마를 찾을 수 없습니다');
      }

      const allThemes = await this.getThemesByProject(theme.project_id);
      if (allThemes.length === 1) {
        throw new Error('마지막 테마는 삭제할 수 없습니다');
      }

      await db.themes.delete(themeId);
      console.log('[ThemeService] Theme deleted:', themeId);
    } catch (error) {
      console.error('[ThemeService] deleteTheme failed:', error);
      throw error;
    }
  }

  /**
   * 테마 복제 (RPC, 캐시 무효화)
   */
  static async duplicateTheme(
    sourceThemeId: string,
    newName: string,
    inherit: boolean = false
  ): Promise<string> {
    const instance = new ThemeService();

    // 원본 테마 조회 (project_id 필요)
    const sourceTheme = await this.getThemeById(sourceThemeId);
    if (!sourceTheme) {
      throw new Error('원본 테마를 찾을 수 없습니다');
    }

    const { data, error } = await instance.supabase.rpc('duplicate_theme', {
      p_source_theme_id: sourceThemeId,
      p_new_name: newName,
      p_inherit: inherit,
    });

    if (error) {
      console.error('[ThemeService] duplicateTheme failed:', error);
      throw new Error(`테마 복제 실패: ${error.message}`);
    }

    // ✅ 캐시 무효화 (새 테마 생성됨)
    instance.invalidateCache(`themes:project:${sourceTheme.project_id}`);

    console.log('[ThemeService] Theme duplicated:', data);
    return data as string;
  }

  /**
   * 테마 활성화 (IndexedDB - status를 active로 변경하고 다른 테마는 draft로)
   */
  static async activateTheme(themeId: string): Promise<void> {
    try {
      const db = await getDB();
      const theme = await this.getThemeById(themeId);
      if (!theme) {
        throw new Error('테마를 찾을 수 없습니다');
      }

      // 같은 프로젝트의 모든 테마를 draft로
      const allThemes = await db.themes.getByProject(theme.project_id);
      const activeThemes = allThemes.filter((t) => (t as { status?: string }).status === 'active');

      for (const activeTheme of activeThemes) {
        await db.themes.update(activeTheme.id, { status: 'draft' });
      }

      // 선택한 테마를 active로
      await this.updateTheme(themeId, { status: 'active' });

      console.log('[ThemeService] Theme activated:', themeId);
    } catch (error) {
      console.error('[ThemeService] activateTheme failed:', error);
      throw error;
    }
  }

  /**
   * 버전 스냅샷 생성 (RPC, 캐시 무효화)
   */
  static async createSnapshot(themeId: string): Promise<number> {
    const instance = new ThemeService();

    // 테마 조회 (project_id 필요)
    const theme = await this.getThemeById(themeId);
    if (!theme) {
      throw new Error('테마를 찾을 수 없습니다');
    }

    const { data, error } = await instance.supabase.rpc('increment_design_theme_version', {
      p_theme_id: themeId,
    });

    if (error) {
      console.error('[ThemeService] createSnapshot failed:', error);
      throw new Error(`버전 스냅샷 생성 실패: ${error.message}`);
    }

    // ✅ 캐시 무효화 (버전 업데이트됨)
    instance.invalidateCache(`theme:id:${themeId}`);
    instance.invalidateCache(`themes:project:${theme.project_id}`);

    console.log('[ThemeService] Snapshot created, new version:', data);
    return data as number;
  }

  /**
   * 테마 계층 구조 조회 (부모-자식 관계, 캐싱 적용)
   *
   * ✅ 최적화:
   * - getThemesByProject 캐시 재사용
   * - 계층 구조 변환 로직만 실행
   */
  static async getThemeHierarchy(projectId: string): Promise<Map<string, DesignTheme[]>> {
    // ✅ getThemesByProject가 이미 캐싱되어 있으므로 그대로 사용
    const themes = await this.getThemesByProject(projectId);
    const hierarchy = new Map<string, DesignTheme[]>();

    // 부모 테마별로 그룹화
    for (const theme of themes) {
      const parentId = theme.parent_theme_id || 'root';
      if (!hierarchy.has(parentId)) {
        hierarchy.set(parentId, []);
      }
      hierarchy.get(parentId)!.push(theme);
    }

    return hierarchy;
  }

  /**
   * Realtime 구독 (테마 변경 감지)
   *
   * ✅ Phase 3 최적화:
   * - Event batching: 100ms 내 이벤트 일괄 처리
   * - Event filtering: 중복 이벤트 제거
   * - Monotonic timer: performance.now() 사용
   */
  static subscribeToTheme(
    themeId: string,
    callback: (payload: Record<string, unknown>) => void
  ): () => void {
    const instance = new ThemeService();

    // ✅ RealtimeBatcher 통합 (배칭 + 필터링)
    const batcher = new RealtimeBatcher({
      batchDelay: 100, // 100ms 배칭
      onBatch: (events) => {
        // 배치 처리: 마지막 이벤트만 전달 (최신 상태)
        const lastEvent = events[events.length - 1];
        callback(lastEvent.raw as Record<string, unknown>);

        console.log(`✅ [ThemeService] Batched ${events.length} theme events → processed 1`);
      },
      filter: RealtimeFilters.combineFilters(
        RealtimeFilters.tableFilter(['design_themes']),
        RealtimeFilters.hasIdFilter()
      ),
      deduplication: true, // 중복 제거 활성화
    });

    const channel = instance.supabase
      .channel(`theme:${themeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_themes',
          filter: `id=eq.${themeId}`,
        },
        (payload) => {
          // ✅ Batcher에 이벤트 추가 (즉시 처리 X)
          batcher.addEvent(payload as Record<string, unknown>);
        }
      )
      .subscribe();

    // Unsubscribe 함수 반환 (batcher 정리 포함)
    return () => {
      batcher.destroy(); // ✅ Batcher 정리
      instance.supabase.removeChannel(channel);
    };
  }

  /**
   * 프로젝트의 테마 변경 구독
   *
   * ✅ Phase 3 최적화:
   * - Event batching: 100ms 내 이벤트 일괄 처리
   * - Event filtering: 중복 이벤트 제거
   */
  static subscribeToProjectThemes(
    projectId: string,
    callback: (payload: Record<string, unknown>) => void
  ): () => void {
    const instance = new ThemeService();

    // ✅ RealtimeBatcher 통합
    const batcher = new RealtimeBatcher({
      batchDelay: 100,
      onBatch: (events) => {
        // 여러 테마 변경 시 모든 이벤트 전달 (프로젝트 전체 변경)
        events.forEach((event) => {
          callback(event.raw as Record<string, unknown>);
        });

        console.log(`✅ [ThemeService] Batched ${events.length} project theme events`);
      },
      filter: RealtimeFilters.combineFilters(
        RealtimeFilters.tableFilter(['design_themes']),
        RealtimeFilters.hasIdFilter()
      ),
      deduplication: true,
    });

    const channel = instance.supabase
      .channel(`themes:project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_themes',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          batcher.addEvent(payload as Record<string, unknown>);
        }
      )
      .subscribe();

    return () => {
      batcher.destroy();
      instance.supabase.removeChannel(channel);
    };
  }
}
