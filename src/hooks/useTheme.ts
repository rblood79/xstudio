import { useCallback } from 'react';
import { useThemeStore } from '../builder/stores/theme';
import type { TokenValue, NewTokenInput } from '../types/theme';

export function useTheme() {
    const {
        activeTheme,
        rawTokens,
        semanticTokens,
        loading,
        dirty,
        lastError,
        loadTheme,
        updateTokenValue,
        addToken,
        deleteToken,
        saveAll,
        snapshotVersion,
        clearError
    } = useThemeStore();

    const handleUpdateToken = useCallback((name: string, scope: 'raw' | 'semantic', value: TokenValue) => {
        updateTokenValue(name, scope, value);
    }, [updateTokenValue]);

    const handleAddToken = useCallback((input: NewTokenInput) => {
        addToken(input);
    }, [addToken]);

    const handleDeleteToken = useCallback((name: string, scope: 'raw' | 'semantic') => {
        deleteToken(name, scope);
    }, [deleteToken]);

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
