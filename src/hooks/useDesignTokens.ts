import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../env/supabase.client';
import { useThemeStore } from '../builder/stores/themeStore';
import { debounce } from 'lodash';
import type { TokenType, TokenValue, NewTokenInput } from '../types/designTokens';
// DesignToken 타입 사용되므로 import 유지

export function useDesignTokens(projectId: string | undefined) {
  // XStudio 패턴: Zustand 스토어에서 필요한 액션 추출
  const tokens = useThemeStore(state => state.tokens);
  const setTokens = useThemeStore(state => state.setTokens);
  const updateToken = useThemeStore(state => state.updateToken);
  const addToken = useThemeStore(state => state.addToken);
  const removeToken = useThemeStore(state => state.removeToken);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 토큰 로드 (XStudio 패턴 준수)
  const loadTokens = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      // XStudio 패턴: Supabase 싱글톤 클라이언트 직접 사용
      const { data, error } = await supabase
        .from('design_tokens')
        .select('*')
        .eq('project_id', projectId)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      // Supabase 데이터를 DesignToken 형식으로 변환
      const formattedTokens = data?.map(token => ({
        ...token,
        type: token.category as TokenType,
        value: typeof token.value === 'string' ? token.value : token.value as TokenValue
      })) || [];

      setTokens(formattedTokens);
    } catch (err) {
      console.error('토큰 로드 실패:', err);
      setError('토큰을 로드하는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, setTokens]);

  // 디바운스된 업데이트 (ESLint 경고 해결: 인라인 함수 사용)
  const debouncedUpdateRef = useMemo(() => {
    // 안정적인 참조를 위해 useMemo 사용
    return debounce(async (tokenId: string, value: TokenValue) => {
      try {
        // XStudio 패턴: Supabase 직접 호출
        const { error } = await supabase
          .from('design_tokens')
          .update({
            value: typeof value === 'object' ? JSON.stringify(value) : value,
            updated_at: new Date().toISOString()
          })
          .eq('id', tokenId);

        if (error) throw error;

        // iframe 프리뷰에 테마 업데이트 알림
        window.postMessage({
          type: "UPDATE_THEME_TOKENS",
          tokens: useThemeStore.getState().tokens
        }, window.location.origin);

      } catch (err) {
        console.error('토큰 업데이트 실패:', err);
        setError('토큰 업데이트에 실패했습니다.');
      }
    }, 300);
  }, []);

  // 토큰 값 변경 (XStudio 패턴: Zustand 먼저 업데이트)
  const handleUpdateToken = useCallback((tokenId: string, value: TokenValue) => {
    updateToken(tokenId, value);
    debouncedUpdateRef(tokenId, value);
  }, [updateToken, debouncedUpdateRef]);

  // 토큰 추가 (XStudio 패턴 준수: Supabase 직접 호출 후 Zustand 업데이트)
  const handleAddToken = useCallback(async (tokenData: NewTokenInput) => {
    if (!projectId) return false;

    setIsSaving(true);
    setError(null);

    try {
      const insertData = {
        project_id: projectId,
        name: tokenData.name,
        category: tokenData.type,
        value: typeof tokenData.value === 'object' ? JSON.stringify(tokenData.value) : tokenData.value,
        css_variable: tokenData.css_variable || `--${tokenData.name.toLowerCase().replace(/\s+/g, '-')}`
      };

      const { data, error } = await supabase
        .from('design_tokens')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Supabase 응답을 DesignToken 형식으로 변환
      const formattedToken = {
        ...data,
        type: data.category as TokenType,
        value: typeof data.value === 'string' ? data.value : data.value as TokenValue
      };

      addToken(formattedToken);

      // iframe 프리뷰 업데이트
      window.postMessage({
        type: "UPDATE_THEME_TOKENS",
        tokens: useThemeStore.getState().tokens
      }, window.location.origin);

      return true;
    } catch (err) {
      console.error('토큰 추가 실패:', err);
      setError('토큰 추가에 실패했습니다.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [projectId, addToken]);

  // 토큰 삭제
  const handleDeleteToken = useCallback(async (tokenId: string) => {
    setError(null);

    try {
      const { error } = await supabase
        .from('design_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;

      removeToken(tokenId);

      // iframe 프리뷰 업데이트
      window.postMessage({
        type: "UPDATE_THEME_TOKENS",
        tokens: useThemeStore.getState().tokens
      }, window.location.origin);

      return true;
    } catch (err) {
      console.error('토큰 삭제 실패:', err);
      setError('토큰 삭제에 실패했습니다.');
      return false;
    }
  }, [removeToken]);

  // 카테고리별 토큰 필터링 (메모이제이션으로 안정적인 참조 보장)
  const getTokensByType = useMemo(() => {
    return (type: TokenType) => tokens.filter(token => token.type === type);
  }, [tokens]);

  // 프로젝트 변경 시 토큰 로드
  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  // 안정적인 반환값 보장 (XStudio 패턴: 불필요한 리렌더링 방지)
  return {
    tokens,
    isLoading,
    isSaving,
    error,
    handleUpdateToken,
    handleAddToken,
    handleDeleteToken,
    getTokensByType,
    reloadTokens: loadTokens,
    clearError: useCallback(() => setError(null), [])
  };
}