/**
 * Token Service
 * 토큰 CRUD 및 관리 로직
 */

import { supabase } from '../../env/supabase.client';
import type {
  DesignToken,
  ResolvedToken,
  CreateTokenInput,
  UpdateTokenInput,
  TokenType,
  TokenValue,
} from '../../types/theme';

export class TokenService {
  /**
   * 테마의 모든 토큰 조회 (상속 해석 포함)
   */
  static async getResolvedTokens(themeId: string): Promise<ResolvedToken[]> {
    const { data, error } = await supabase.rpc('resolve_theme_tokens', {
      p_theme_id: themeId,
    });

    if (error) {
      console.error('[TokenService] getResolvedTokens failed:', error);
      throw new Error(`토큰 조회 실패: ${error.message}`);
    }

    return (data as ResolvedToken[]) || [];
  }

  /**
   * 토큰 검색 (이름, 타입, 값 기준)
   */
  static async searchTokens(
    themeId: string,
    query: string,
    includeInherited: boolean = true
  ): Promise<ResolvedToken[]> {
    const { data, error } = await supabase.rpc('search_tokens', {
      p_theme_id: themeId,
      p_query: query,
      p_include_inherited: includeInherited,
    });

    if (error) {
      console.error('[TokenService] searchTokens failed:', error);
      throw new Error(`토큰 검색 실패: ${error.message}`);
    }

    return (data as ResolvedToken[]) || [];
  }

  /**
   * 단일 토큰 조회
   */
  static async getTokenById(tokenId: string): Promise<DesignToken | null> {
    const { data, error } = await supabase
      .from('design_tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (error) {
      console.error('[TokenService] getTokenById failed:', error);
      return null;
    }

    return data as DesignToken;
  }

  /**
   * 토큰 생성
   */
  static async createToken(input: CreateTokenInput): Promise<DesignToken> {
    const { data, error } = await supabase
      .from('design_tokens')
      .insert({
        project_id: input.project_id,
        theme_id: input.theme_id,
        name: input.name,
        type: input.type,
        value: input.value,
        scope: input.scope,
        alias_of: input.alias_of || null,
        css_variable: input.css_variable,
      })
      .select()
      .single();

    if (error) {
      console.error('[TokenService] createToken failed:', error);
      throw new Error(`토큰 생성 실패: ${error.message}`);
    }

    console.log('[TokenService] Token created:', data);
    return data as DesignToken;
  }

  /**
   * 토큰 업데이트
   */
  static async updateToken(
    tokenId: string,
    updates: UpdateTokenInput
  ): Promise<DesignToken> {
    const { data, error } = await supabase
      .from('design_tokens')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenId)
      .select()
      .single();

    if (error) {
      console.error('[TokenService] updateToken failed:', error);
      throw new Error(`토큰 업데이트 실패: ${error.message}`);
    }

    console.log('[TokenService] Token updated:', data);
    return data as DesignToken;
  }

  /**
   * 토큰 삭제
   */
  static async deleteToken(tokenId: string): Promise<void> {
    const { error } = await supabase
      .from('design_tokens')
      .delete()
      .eq('id', tokenId);

    if (error) {
      console.error('[TokenService] deleteToken failed:', error);
      throw new Error(`토큰 삭제 실패: ${error.message}`);
    }

    console.log('[TokenService] Token deleted:', tokenId);
  }

  /**
   * 토큰 일괄 업서트 (RPC)
   */
  static async bulkUpsertTokens(
    tokens: Partial<DesignToken>[]
  ): Promise<number> {
    const { data, error } = await supabase.rpc('bulk_upsert_tokens', {
      p_tokens: tokens,
    });

    if (error) {
      console.error('[TokenService] bulkUpsertTokens failed:', error);
      throw new Error(`토큰 일괄 저장 실패: ${error.message}`);
    }

    console.log('[TokenService] Bulk upsert completed:', data, 'tokens');
    return data as number;
  }

  /**
   * 테마의 Raw 토큰만 조회
   */
  static async getRawTokens(themeId: string): Promise<DesignToken[]> {
    const { data, error } = await supabase
      .from('design_tokens')
      .select('*')
      .eq('theme_id', themeId)
      .eq('scope', 'raw')
      .order('name', { ascending: true });

    if (error) {
      console.error('[TokenService] getRawTokens failed:', error);
      throw new Error(`Raw 토큰 조회 실패: ${error.message}`);
    }

    return (data as DesignToken[]) || [];
  }

  /**
   * 테마의 Semantic 토큰만 조회
   */
  static async getSemanticTokens(themeId: string): Promise<DesignToken[]> {
    const { data, error } = await supabase
      .from('design_tokens')
      .select('*')
      .eq('theme_id', themeId)
      .eq('scope', 'semantic')
      .order('name', { ascending: true });

    if (error) {
      console.error('[TokenService] getSemanticTokens failed:', error);
      throw new Error(`Semantic 토큰 조회 실패: ${error.message}`);
    }

    return (data as DesignToken[]) || [];
  }

  /**
   * 특정 타입의 토큰만 조회
   */
  static async getTokensByType(
    themeId: string,
    type: string
  ): Promise<DesignToken[]> {
    const { data, error } = await supabase
      .from('design_tokens')
      .select('*')
      .eq('theme_id', themeId)
      .eq('type', type)
      .order('name', { ascending: true });

    if (error) {
      console.error('[TokenService] getTokensByType failed:', error);
      throw new Error(`타입별 토큰 조회 실패: ${error.message}`);
    }

    return (data as DesignToken[]) || [];
  }

  /**
   * Alias 토큰 해석 (재귀적으로 실제 값 추적)
   */
  static async resolveAlias(
    tokenId: string,
    visited: Set<string> = new Set()
  ): Promise<DesignToken | null> {
    // 순환 참조 방지
    if (visited.has(tokenId)) {
      console.error('[TokenService] Circular alias detected:', tokenId);
      return null;
    }

    visited.add(tokenId);

    const token = await this.getTokenById(tokenId);
    if (!token) return null;

    // alias가 없으면 현재 토큰 반환
    if (!token.alias_of) {
      return token;
    }

    // alias 재귀 해석
    return this.resolveAlias(token.alias_of, visited);
  }

  /**
   * CSS Variable 자동 생성
   */
  static generateCSSVariable(tokenName: string): string {
    // "color.brand.primary" → "--color-brand-primary"
    return `--${tokenName.replace(/\./g, '-')}`;
  }

  /**
   * 토큰 이름 중복 체크
   */
  static async isTokenNameUnique(
    themeId: string,
    name: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('design_tokens')
      .select('id')
      .eq('theme_id', themeId)
      .eq('name', name);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[TokenService] isTokenNameUnique failed:', error);
      return false;
    }

    return data.length === 0;
  }

  /**
   * 토큰 변경 구독
   *
   * ✅ Phase 3 최적화:
   * - Event batching: 100ms 내 이벤트 일괄 처리
   * - Event filtering: 중복 이벤트 제거
   * - Monotonic timer: performance.now() 사용
   */
  static subscribeToTokenChanges(
    themeId: string,
    callback: (payload: Record<string, unknown>) => void
  ): () => void {
    // ✅ RealtimeBatcher 통합 (배칭 + 필터링)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RealtimeBatcher, RealtimeFilters } = require('../../utils/realtimeBatcher') as typeof import('../../utils/realtimeBatcher');

    const batcher = new RealtimeBatcher({
      batchDelay: 100, // 100ms 배칭
      onBatch: (events) => {
        // 배치 처리: 마지막 이벤트만 전달 (최신 상태)
        const lastEvent = events[events.length - 1];
        callback(lastEvent.raw as Record<string, unknown>);

        console.log(`✅ [TokenService] Batched ${events.length} token events → processed 1`);
      },
      filter: RealtimeFilters.combineFilters(
        RealtimeFilters.tableFilter(['design_tokens']),
        RealtimeFilters.hasIdFilter()
      ),
      deduplication: true, // 중복 제거 활성화
    });

    const channel = supabase
      .channel(`tokens:theme:${themeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_tokens',
          filter: `theme_id=eq.${themeId}`,
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
      supabase.removeChannel(channel);
    };
  }

  /**
   * 프로젝트 전체 토큰 변경 구독
   *
   * ✅ Phase 3 최적화:
   * - Event batching: 100ms 내 이벤트 일괄 처리
   * - Event filtering: 중복 이벤트 제거
   */
  static subscribeToProjectTokens(
    projectId: string,
    callback: (payload: Record<string, unknown>) => void
  ): () => void {
    // ✅ RealtimeBatcher 통합
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RealtimeBatcher, RealtimeFilters } = require('../../utils/realtimeBatcher') as typeof import('../../utils/realtimeBatcher');

    const batcher = new RealtimeBatcher({
      batchDelay: 100,
      onBatch: (events) => {
        // 여러 토큰 변경 시 모든 이벤트 전달 (프로젝트 전체 변경)
        events.forEach((event) => {
          callback(event.raw as Record<string, unknown>);
        });

        console.log(`✅ [TokenService] Batched ${events.length} project token events`);
      },
      filter: RealtimeFilters.combineFilters(
        RealtimeFilters.tableFilter(['design_tokens']),
        RealtimeFilters.hasIdFilter()
      ),
      deduplication: true,
    });

    const channel = supabase
      .channel(`tokens:project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_tokens',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          batcher.addEvent(payload as Record<string, unknown>);
        }
      )
      .subscribe();

    return () => {
      batcher.destroy();
      supabase.removeChannel(channel);
    };
  }

  /**
   * 토큰 통계 조회
   */
  static async getTokenStats(themeId: string): Promise<{
    total: number;
    raw: number;
    semantic: number;
    byType: Record<string, number>;
    inherited: number;
  }> {
    const resolvedTokens = await this.getResolvedTokens(themeId);

    const stats = {
      total: resolvedTokens.length,
      raw: resolvedTokens.filter((t) => t.scope === 'raw').length,
      semantic: resolvedTokens.filter((t) => t.scope === 'semantic').length,
      byType: {} as Record<string, number>,
      inherited: resolvedTokens.filter((t) => t.is_inherited).length,
    };

    // 타입별 집계
    for (const token of resolvedTokens) {
      stats.byType[token.type] = (stats.byType[token.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * 토큰 Export (W3C Design Token 형식)
   */
  static async exportTokensW3C(
    themeId: string
  ): Promise<Record<string, unknown>> {
    const tokens = await this.getResolvedTokens(themeId);
    const exported: Record<string, Record<string, unknown>> = {};

    for (const token of tokens) {
      // "color.brand.primary" → { color: { brand: { primary: { $type, $value } } } }
      const parts = token.name.split('.');
      let current = exported;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]] as Record<string, Record<string, unknown>>;
      }

      const lastPart = parts[parts.length - 1];
      current[lastPart] = {
        $type: token.type,
        $value: token.value,
      };

      if (token.alias_of) {
        current[lastPart].$description = `Alias of ${token.alias_of}`;
      }
    }

    return exported;
  }

  /**
   * 토큰 Import (W3C Design Token 형식)
   */
  static async importTokensW3C(
    projectId: string,
    themeId: string,
    w3cTokens: Record<string, unknown>
  ): Promise<number> {
    const tokens: Partial<DesignToken>[] = [];

    const traverse = (obj: Record<string, unknown>, path: string[] = []) => {
      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object') {
          if ('$type' in value && '$value' in value) {
            // W3C 토큰 발견
            const tokenValue = value as { $type: unknown; $value: unknown };
            tokens.push({
              project_id: projectId,
              theme_id: themeId,
              name: [...path, key].join('.'),
              type: tokenValue.$type as TokenType | undefined,
              value: tokenValue.$value as TokenValue | undefined,
              scope: 'raw', // 기본값
              css_variable: this.generateCSSVariable([...path, key].join('.')),
            });
          } else {
            // 중첩 객체, 재귀 탐색
            traverse(value as Record<string, unknown>, [...path, key]);
          }
        }
      }
    };

    traverse(w3cTokens);

    return this.bulkUpsertTokens(tokens);
  }
}
