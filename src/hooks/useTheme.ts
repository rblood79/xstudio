import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useUnifiedThemeStore } from '../builder/stores/themeStore';
import type { TokenValue, NewTokenInput } from '../types/theme';

export function useTheme() {
    const {
        activeTheme,
        rawTokens,
        semanticTokens,
        loading,
        dirty,
        error: lastError,
        loadTokens: loadTheme,
        updateTokenValue,
        addToken,
        deleteToken,
        saveAllTokens: saveAll,
        snapshotVersion,
        clearError
    } = useUnifiedThemeStore(useShallow(state => ({
        activeTheme: state.activeTheme,
        rawTokens: state.rawTokens,
        semanticTokens: state.semanticTokens,
        loading: state.loading,
        dirty: state.dirty,
        error: state.error,
        loadTokens: state.loadTokens,
        updateTokenValue: state.updateTokenValue,
        addToken: state.addToken,
        deleteToken: state.deleteToken,
        saveAllTokens: state.saveAllTokens,
        snapshotVersion: state.snapshotVersion,
        clearError: state.clearError
    })));

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
