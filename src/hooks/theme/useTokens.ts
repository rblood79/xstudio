/**
 * useTokens Hook
 * 테마 토큰 관리 (상속 해석 + Realtime 동기화)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TokenService } from '../../services/theme';
import type {
  ResolvedToken,
  CreateTokenInput,
  UpdateTokenInput,
  TokenFilter,
} from '../../types/theme/token.types';
import {
  parseTokens,
  filterTokensByCategory,
  filterTokensByGroup,
  sortTokens,
  separateTokensByScope,
} from '../../utils/theme/tokenParser';

export interface UseTokensOptions {
  themeId: string;
  filter?: TokenFilter;
  enableRealtime?: boolean;
}

export interface UseTokensReturn {
  tokens: ResolvedToken[];
  parsedTokens: ReturnType<typeof parseTokens>;
  rawTokens: ResolvedToken[];
  semanticTokens: ResolvedToken[];
  inheritedTokens: ResolvedToken[];
  currentThemeTokens: ResolvedToken[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createToken: (input: Omit<CreateTokenInput, 'theme_id'>) => Promise<boolean>;
  updateToken: (tokenId: string, updates: UpdateTokenInput) => Promise<boolean>;
  deleteToken: (tokenId: string) => Promise<boolean>;
  bulkUpsertTokens: (
    tokens: Partial<Omit<CreateTokenInput, 'theme_id'>>[]
  ) => Promise<number>;
}

export function useTokens(options: UseTokensOptions): UseTokensReturn {
  const { themeId, filter, enableRealtime = true } = options;

  const [tokens, setTokens] = useState<ResolvedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 토큰 가져오기 (상속 해석 포함)
   */
  const fetchTokens = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await TokenService.getResolvedTokens(themeId);
      setTokens(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '토큰 조회 실패';
      setError(message);
      console.error('[useTokens] fetchTokens failed:', err);
    } finally {
      setLoading(false);
    }
  }, [themeId]);

  /**
   * 초기 데이터 로드
   */
  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  /**
   * Realtime 구독
   */
  useEffect(() => {
    if (!enableRealtime || !themeId) return;

    const unsubscribe = TokenService.subscribeToTokenChanges(
      themeId,
      (payload) => {
        console.log('[useTokens] Realtime update:', payload);

        // 토큰 변경 시 전체 재조회 (상속 해석 필요)
        fetchTokens();
      }
    );

    return unsubscribe;
  }, [enableRealtime, themeId, fetchTokens]);

  /**
   * 필터링된 토큰
   */
  const filteredTokens = useMemo(() => {
    let result = tokens;

    if (filter?.category) {
      result = filterTokensByCategory(result, filter.category);
    }

    if (filter?.category && filter?.group) {
      result = filterTokensByGroup(result, filter.category, filter.group);
    }

    if (filter?.scope) {
      result = result.filter((token) => token.scope === filter.scope);
    }

    if (filter?.showInherited === false) {
      result = result.filter((token) => !token.is_inherited);
    }

    if (filter?.search) {
      const query = filter.search.toLowerCase();
      result = result.filter((token) => {
        return (
          token.name.toLowerCase().includes(query) ||
          token.type.toLowerCase().includes(query) ||
          JSON.stringify(token.value).toLowerCase().includes(query)
        );
      });
    }

    return result;
  }, [tokens, filter]);

  /**
   * 파싱된 토큰 (계층 구조 정보 추가)
   */
  const parsedTokens = useMemo(() => {
    return parseTokens(filteredTokens);
  }, [filteredTokens]);

  /**
   * Raw 토큰만
   */
  const rawTokens = useMemo(() => {
    return filteredTokens.filter((token) => token.scope === 'raw');
  }, [filteredTokens]);

  /**
   * Semantic 토큰만
   */
  const semanticTokens = useMemo(() => {
    return filteredTokens.filter((token) => token.scope === 'semantic');
  }, [filteredTokens]);

  /**
   * 상속된 토큰만
   */
  const inheritedTokens = useMemo(() => {
    return filteredTokens.filter((token) => token.is_inherited);
  }, [filteredTokens]);

  /**
   * 현재 테마의 토큰만 (상속 제외)
   */
  const currentThemeTokens = useMemo(() => {
    return filteredTokens.filter((token) => !token.is_inherited);
  }, [filteredTokens]);

  /**
   * 토큰 생성
   */
  const createToken = useCallback(
    async (input: Omit<CreateTokenInput, 'theme_id'>): Promise<boolean> => {
      try {
        await TokenService.createToken({
          ...input,
          theme_id: themeId,
        } as CreateTokenInput);

        // Realtime이 비활성화된 경우 수동으로 갱신
        if (!enableRealtime) {
          await fetchTokens();
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : '토큰 생성 실패';
        setError(message);
        console.error('[useTokens] createToken failed:', err);
        return false;
      }
    },
    [themeId, enableRealtime, fetchTokens]
  );

  /**
   * 토큰 업데이트
   */
  const updateToken = useCallback(
    async (tokenId: string, updates: UpdateTokenInput): Promise<boolean> => {
      try {
        // Optimistic update: 즉시 로컬 state 업데이트
        setTokens((prevTokens) =>
          prevTokens.map((token) =>
            token.id === tokenId
              ? { ...token, ...updates }
              : token
          )
        );

        await TokenService.updateToken(tokenId, updates);

        // Realtime이 비활성화된 경우 수동으로 갱신
        if (!enableRealtime) {
          await fetchTokens();
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : '토큰 업데이트 실패';
        setError(message);
        console.error('[useTokens] updateToken failed:', err);

        // 에러 발생 시 서버에서 최신 데이터 다시 가져오기
        await fetchTokens();

        return false;
      }
    },
    [enableRealtime, fetchTokens]
  );

  /**
   * 토큰 삭제
   */
  const deleteToken = useCallback(
    async (tokenId: string): Promise<boolean> => {
      try {
        await TokenService.deleteToken(tokenId);

        // Realtime이 비활성화된 경우 수동으로 갱신
        if (!enableRealtime) {
          await fetchTokens();
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : '토큰 삭제 실패';
        setError(message);
        console.error('[useTokens] deleteToken failed:', err);
        return false;
      }
    },
    [enableRealtime, fetchTokens]
  );

  /**
   * 토큰 일괄 업서트
   */
  const bulkUpsertTokens = useCallback(
    async (
      tokenInputs: Partial<Omit<CreateTokenInput, 'theme_id'>>[]
    ): Promise<number> => {
      try {
        const tokensWithThemeId = tokenInputs.map((token) => ({
          ...token,
          theme_id: themeId,
        }));

        const count = await TokenService.bulkUpsertTokens(tokensWithThemeId);

        // Realtime이 비활성화된 경우 수동으로 갱신
        if (!enableRealtime) {
          await fetchTokens();
        }

        return count;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '토큰 일괄 저장 실패';
        setError(message);
        console.error('[useTokens] bulkUpsertTokens failed:', err);
        return 0;
      }
    },
    [themeId, enableRealtime, fetchTokens]
  );

  return {
    tokens: filteredTokens,
    parsedTokens,
    rawTokens,
    semanticTokens,
    inheritedTokens,
    currentThemeTokens,
    loading,
    error,
    refetch: fetchTokens,
    createToken,
    updateToken,
    deleteToken,
    bulkUpsertTokens,
  };
}
