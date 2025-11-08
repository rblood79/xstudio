/**
 * Theme Service
 * 테마 CRUD 및 관리 로직
 */

import { supabase } from '../../env/supabase.client';
import type { DesignTheme } from '../../types/theme';

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

export class ThemeService {
  /**
   * 프로젝트의 모든 테마 조회
   */
  static async getThemesByProject(projectId: string): Promise<DesignTheme[]> {
    const { data, error } = await supabase
      .from('design_themes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[ThemeService] getThemesByProject failed:', error);
      throw new Error(`테마 조회 실패: ${error.message}`);
    }

    return (data as DesignTheme[]) || [];
  }

  /**
   * 테마 ID로 조회
   */
  static async getThemeById(themeId: string): Promise<DesignTheme | null> {
    const { data, error } = await supabase
      .from('design_themes')
      .select('*')
      .eq('id', themeId)
      .single();

    if (error) {
      console.error('[ThemeService] getThemeById failed:', error);
      return null;
    }

    return data as DesignTheme;
  }

  /**
   * 활성 테마 조회
   */
  static async getActiveTheme(projectId: string): Promise<DesignTheme | null> {
    const { data, error } = await supabase
      .from('design_themes')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[ThemeService] getActiveTheme failed:', error);
      return null;
    }

    // 활성 테마가 없으면 첫 번째 테마 반환
    if (!data) {
      const themes = await this.getThemesByProject(projectId);
      return themes[0] || null;
    }

    return data as DesignTheme;
  }

  /**
   * 테마 생성
   */
  static async createTheme(input: CreateThemeInput): Promise<DesignTheme> {
    const { data, error } = await supabase
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

    if (error) {
      console.error('[ThemeService] createTheme failed:', error);
      throw new Error(`테마 생성 실패: ${error.message}`);
    }

    console.log('[ThemeService] Theme created:', data);
    return data as DesignTheme;
  }

  /**
   * 테마 업데이트
   */
  static async updateTheme(themeId: string, updates: UpdateThemeInput): Promise<DesignTheme> {
    const { data, error } = await supabase
      .from('design_themes')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', themeId)
      .select()
      .single();

    if (error) {
      console.error('[ThemeService] updateTheme failed:', error);
      throw new Error(`테마 업데이트 실패: ${error.message}`);
    }

    console.log('[ThemeService] Theme updated:', data);
    return data as DesignTheme;
  }

  /**
   * 테마 삭제
   */
  static async deleteTheme(themeId: string): Promise<void> {
    // 마지막 테마인지 확인
    const theme = await this.getThemeById(themeId);
    if (!theme) {
      throw new Error('테마를 찾을 수 없습니다');
    }

    const allThemes = await this.getThemesByProject(theme.project_id);
    if (allThemes.length === 1) {
      throw new Error('마지막 테마는 삭제할 수 없습니다');
    }

    const { error } = await supabase
      .from('design_themes')
      .delete()
      .eq('id', themeId);

    if (error) {
      console.error('[ThemeService] deleteTheme failed:', error);
      throw new Error(`테마 삭제 실패: ${error.message}`);
    }

    console.log('[ThemeService] Theme deleted:', themeId);
  }

  /**
   * 테마 복제 (RPC)
   */
  static async duplicateTheme(
    sourceThemeId: string,
    newName: string,
    inherit: boolean = false
  ): Promise<string> {
    const { data, error } = await supabase.rpc('duplicate_theme', {
      p_source_theme_id: sourceThemeId,
      p_new_name: newName,
      p_inherit: inherit,
    });

    if (error) {
      console.error('[ThemeService] duplicateTheme failed:', error);
      throw new Error(`테마 복제 실패: ${error.message}`);
    }

    console.log('[ThemeService] Theme duplicated:', data);
    return data as string;
  }

  /**
   * 테마 활성화 (status를 active로 변경하고 다른 테마는 draft로)
   */
  static async activateTheme(themeId: string): Promise<void> {
    const theme = await this.getThemeById(themeId);
    if (!theme) {
      throw new Error('테마를 찾을 수 없습니다');
    }

    // 같은 프로젝트의 모든 테마를 draft로
    const { error: deactivateError } = await supabase
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

    console.log('[ThemeService] Theme activated:', themeId);
  }

  /**
   * 버전 스냅샷 생성 (RPC)
   */
  static async createSnapshot(themeId: string): Promise<number> {
    const { data, error } = await supabase.rpc('increment_design_theme_version', {
      p_theme_id: themeId,
    });

    if (error) {
      console.error('[ThemeService] createSnapshot failed:', error);
      throw new Error(`버전 스냅샷 생성 실패: ${error.message}`);
    }

    console.log('[ThemeService] Snapshot created, new version:', data);
    return data as number;
  }

  /**
   * 테마 계층 구조 조회 (부모-자식 관계)
   */
  static async getThemeHierarchy(projectId: string): Promise<Map<string, DesignTheme[]>> {
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
   */
  static subscribeToTheme(
    themeId: string,
    callback: (payload: Record<string, unknown>) => void
  ): () => void {
    const channel = supabase
      .channel(`theme:${themeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_themes',
          filter: `id=eq.${themeId}`,
        },
        callback
      )
      .subscribe();

    // Unsubscribe 함수 반환
    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * 프로젝트의 테마 변경 구독
   */
  static subscribeToProjectThemes(
    projectId: string,
    callback: (payload: Record<string, unknown>) => void
  ): () => void {
    const channel = supabase
      .channel(`themes:project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_themes',
          filter: `project_id=eq.${projectId}`,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
