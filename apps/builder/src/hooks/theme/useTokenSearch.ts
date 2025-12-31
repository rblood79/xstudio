/**
 * useTokenSearch Hook
 * 디바운싱 검색 + RPC 기반 전문 검색
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { TokenService } from '../../services/theme';
import type { ResolvedToken } from '../../types/theme';

export interface UseTokenSearchOptions {
  themeId: string;
  debounceMs?: number;
  includeInherited?: boolean;
  minQueryLength?: number;
}

export interface UseTokenSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: ResolvedToken[];
  searching: boolean;
  error: string | null;
  totalResults: number;
}

export function useTokenSearch(
  options: UseTokenSearchOptions
): UseTokenSearchReturn {
  const {
    themeId,
    debounceMs = 300,
    includeInherited = true,
    minQueryLength = 2,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResolvedToken[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 검색 실행
   */
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < minQueryLength) {
        setResults([]);
        return;
      }

      try {
        setSearching(true);
        setError(null);

        const data = await TokenService.searchTokens(
          themeId,
          searchQuery,
          includeInherited
        );

        setResults(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : '검색 실패';
        setError(message);
        console.error('[useTokenSearch] performSearch failed:', err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [themeId, includeInherited, minQueryLength]
  );

  /**
   * 디바운싱된 검색
   */
  useEffect(() => {
    // 이전 타이머 취소
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 빈 쿼리면 즉시 결과 초기화
    if (query.length === 0) {
      setResults([]);
      setSearching(false);
      return;
    }

    // 최소 길이 미만이면 검색 안 함
    if (query.length < minQueryLength) {
      setResults([]);
      setSearching(false);
      return;
    }

    // 디바운싱 타이머 설정
    setSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    // 클린업
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs, minQueryLength, performSearch]);

  /**
   * themeId 변경 시 결과 초기화
   */
  useEffect(() => {
    setResults([]);
    setQuery('');
  }, [themeId]);

  return {
    query,
    setQuery,
    results,
    searching,
    error,
    totalResults: results.length,
  };
}
