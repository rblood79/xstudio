import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../env/supabase.client';
import { useThemeStore } from '../builder/stores/themeStore';
import { debounce } from 'lodash';
import type { DesignToken, TokenType, TokenValue, NewTokenInput } from '../types/designTokens';

export function useDesignTokens(projectId: string | undefined) {
  const { tokens, setTokens, updateToken, addToken, removeToken } = useThemeStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 토큰 로드 (XStudio 패턴 준수)
  const loadTokens = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('design_tokens')
        .select('*')
        .eq('project_id', projectId)
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      // Supabase 데이터를 DesignToken 형식으로 변환
      const formattedTokens = data?.map(token => ({
        ...token,
        type: token.category as TokenType, // category를 type으로 매핑
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

  // 디바운스된 업데이트 (XStudio 패턴: Zustand 먼저 → Supabase 저장)
  const debouncedUpdate = useCallback(
    debounce(async (tokenId: string, value: TokenValue) => {
      try {
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
    }, 300),
    []
  );

  // 토큰 값 변경
  const handleUpdateToken = useCallback((tokenId: string, value: TokenValue) => {
    updateToken(tokenId, value);
    debouncedUpdate(tokenId, value);
  }, [updateToken, debouncedUpdate]);

  // 토큰 추가 (XStudio 패턴 준수)
  const handleAddToken = useCallback(async (tokenData: NewTokenInput) => {
    if (!projectId) return false;

    setIsSaving(true);
    setError(null);

    try {
      const insertData = {
        project_id: projectId,
        name: tokenData.name,
        category: tokenData.type, // type을 category로 매핑
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

  // 카테고리별 토큰 필터링
  const getTokensByType = useCallback((type: TokenType) => {
    return tokens.filter(token => token.type === type);
  }, [tokens]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

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
    clearError: () => setError(null)
  };
}