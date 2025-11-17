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
   * 프로젝트의 모든 테마 조회 (캐싱 적용)
   *
   * ✅ 최적화:
   * - 5분 캐싱
   * - 중복 요청 자동 방지
   * - 성능 모니터링
   */
  static async getThemesByProject(projectId: string): Promise<DesignTheme[]> {
    const instance = new ThemeService();
    const queryKey = `themes:project:${projectId}`;

    return instance.handleCachedApiCall<DesignTheme[]>(
      queryKey,
      'getThemesByProject',
      async () => {
        return await instance.supabase
          .from('design_themes')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });
      },
      { staleTime: 5 * 60 * 1000 }
    );
  }

  /**
   * 테마 ID로 조회 (캐싱 적용)
   */
  static async getThemeById(themeId: string): Promise<DesignTheme | null> {
    const instance = new ThemeService();
    const queryKey = `theme:id:${themeId}`;

    try {
      return await instance.handleCachedApiCall<DesignTheme>(
        queryKey,
        'getThemeById',
        async () => {
          return await instance.supabase
            .from('design_themes')
            .select('*')
            .eq('id', themeId)
            .single();
        },
        { staleTime: 5 * 60 * 1000 }
      );
    } catch (error) {
      console.error('[ThemeService] getThemeById failed:', error);
      return null;
    }
  }

  /**
   * 활성 테마 조회 (캐싱 적용)
   */
  static async getActiveTheme(projectId: string): Promise<DesignTheme | null> {
    const instance = new ThemeService();
    const queryKey = `theme:active:${projectId}`;

    try {
      const result = await instance.handleCachedApiCall<DesignTheme | null>(
        queryKey,
        'getActiveTheme',
        async () => {
          const response = await instance.supabase
            .from('design_themes')
            .select('*')
            .eq('project_id', projectId)
            .eq('status', 'active')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          return { data: response.data, error: response.error };
        },
        { staleTime: 5 * 60 * 1000, allowNull: true } // 활성 테마가 없을 수 있음
      );

      // 활성 테마가 없으면 첫 번째 테마 반환
      if (!result) {
        const themes = await this.getThemesByProject(projectId);
        return themes[0] || null;
      }

      return result;
    } catch (error) {
      console.error('[ThemeService] getActiveTheme failed:', error);
      return null;
    }
  }

  /**
   * 테마 생성 (캐시 무효화)
   */
  static async createTheme(input: CreateThemeInput): Promise<DesignTheme> {
    const instance = new ThemeService();

    const result = await instance.handleApiCall<DesignTheme>('createTheme', async () => {
      return await instance.supabase
        .from('design_themes')
        .insert({
          project_id: input.project_id,
          name: input.name,
          parent_theme_id: input.parent_theme_id || null,
          status: input.status || 'draft',
          version: 1,
        })
        .select()
        .single();
    });

    // ✅ 캐시 무효화
    instance.invalidateCache(`themes:project:${input.project_id}`);
    if (input.status === 'active') {
      instance.invalidateCache(`theme:active:${input.project_id}`);
    }

    console.log('[ThemeService] Theme created:', result);
    return result;
  }

  /**
   * 테마 업데이트 (캐시 무효화)
   */
  static async updateTheme(themeId: string, updates: UpdateThemeInput): Promise<DesignTheme> {
    const instance = new ThemeService();

    const result = await instance.handleApiCall<DesignTheme>('updateTheme', async () => {
      return await instance.supabase
        .from('design_themes')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', themeId)
        .select()
        .single();
    });

    // ✅ 캐시 무효화
    instance.invalidateCache(`theme:id:${themeId}`);
    instance.invalidateCache(`themes:project:${result.project_id}`);
    if (updates.status === 'active') {
      instance.invalidateCache(`theme:active:${result.project_id}`);
    }

    console.log('[ThemeService] Theme updated:', result);
    return result;
  }

  /**
   * 테마 삭제 (캐시 무효화)
   */
  static async deleteTheme(themeId: string): Promise<void> {
    const instance = new ThemeService();

    // 마지막 테마인지 확인
    const theme = await this.getThemeById(themeId);
    if (!theme) {
      throw new Error('테마를 찾을 수 없습니다');
    }

    const allThemes = await this.getThemesByProject(theme.project_id);
    if (allThemes.length === 1) {
      throw new Error('마지막 테마는 삭제할 수 없습니다');
    }

    await instance.handleDeleteCall('deleteTheme', async () => {
      return await instance.supabase
        .from('design_themes')
        .delete()
        .eq('id', themeId);
    });

    // ✅ 캐시 무효화
    instance.invalidateCache(`theme:id:${themeId}`);
    instance.invalidateCache(`themes:project:${theme.project_id}`);
    instance.invalidateCache(`theme:active:${theme.project_id}`);

    console.log('[ThemeService] Theme deleted:', themeId);
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
   * 테마 활성화 (status를 active로 변경하고 다른 테마는 draft로, 캐시 무효화)
   */
  static async activateTheme(themeId: string): Promise<void> {
    const instance = new ThemeService();
    const theme = await this.getThemeById(themeId);
    if (!theme) {
      throw new Error('테마를 찾을 수 없습니다');
    }

    // 같은 프로젝트의 모든 테마를 draft로
    const { error: deactivateError } = await instance.supabase
      .from('design_themes')
      .update({ status: 'draft' })
      .eq('project_id', theme.project_id)
      .eq('status', 'active');

    if (deactivateError) {
      console.error('[ThemeService] deactivate failed:', deactivateError);
      throw new Error(`테마 비활성화 실패: ${deactivateError.message}`);
    }

    // 선택한 테마를 active로
    await this.updateTheme(themeId, { status: 'active' });

    // ✅ 캐시 무효화 (active 테마 변경됨)
    instance.invalidateCache(`theme:active:${theme.project_id}`);
    instance.invalidateCache(`themes:project:${theme.project_id}`);

    console.log('[ThemeService] Theme activated:', themeId);
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
