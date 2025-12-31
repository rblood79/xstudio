import { useCallback } from 'react';
// import { useShallow } from 'zustand/react/shallow'; // REMOVED - Phase 15 안티패턴 제거
import { useUnifiedThemeStore } from '../stores/themeStore';
import type { TokenValue, NewTokenInput } from '../types/theme';

/**
 * useTheme Hook
 * Phase 15 리팩토링: useShallow 안티패턴 제거, 개별 selector 사용
 *
 * useShallow는 selector 함수가 매 렌더마다 재생성되어 무한 루프 위험이 있음.
 * 개별 selector 패턴이 Zustand 5.x 권장 사항.
 */
export function useTheme() {
    // ===== 개별 Selector 패턴 (Phase 15) =====
    // 상태 값들
    const activeTheme = useUnifiedThemeStore((state) => state.activeTheme);
    const rawTokens = useUnifiedThemeStore((state) => state.rawTokens);
    const semanticTokens = useUnifiedThemeStore((state) => state.semanticTokens);
    const loading = useUnifiedThemeStore((state) => state.loading);
    const dirty = useUnifiedThemeStore((state) => state.dirty);
    const lastError = useUnifiedThemeStore((state) => state.error);

    // 액션들 (참조 안정성 보장)
    const loadTheme = useUnifiedThemeStore((state) => state.loadTokens);
    const updateTokenValue = useUnifiedThemeStore((state) => state.updateTokenValue);
    const addToken = useUnifiedThemeStore((state) => state.addToken);
    const deleteToken = useUnifiedThemeStore((state) => state.deleteToken);
    const saveAll = useUnifiedThemeStore((state) => state.saveAllTokens);
    const snapshotVersion = useUnifiedThemeStore((state) => state.snapshotVersion);
    const clearError = useUnifiedThemeStore((state) => state.clearError);

    const handleUpdateToken = useCallback((name: string, scope: 'raw' | 'semantic', value: TokenValue) => {
        updateTokenValue(name, scope, value);
    }, [updateTokenValue]);

    const handleAddToken = useCallback((input: NewTokenInput) => {
        addToken(input);
    }, [addToken]);

    const handleDeleteToken = useCallback((name: string, scope: 'raw' | 'semantic') => {
        // Find token by name and scope
        const token = (scope === 'raw' ? rawTokens : semanticTokens).find(t => t.name === name);
        if (token) {
            deleteToken(token.id);
        }
    }, [deleteToken, rawTokens, semanticTokens]);

    return {
        // 상태
        activeTheme,
        rawTokens,
        semanticTokens,
        loading,
        dirty,
        lastError,

        // 액션
        loadTheme,
        updateToken: handleUpdateToken,
        addToken: handleAddToken,
        deleteToken: handleDeleteToken,
        saveAll,
        snapshotVersion,
        clearError
    };
}
