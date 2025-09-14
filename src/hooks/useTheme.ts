import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../builder/stores';
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
    } = useStore(useShallow(state => ({
        activeTheme: state.activeTheme,
        rawTokens: state.rawTokens,
        semanticTokens: state.semanticTokens,
        loading: state.loading,
        dirty: state.dirty,
        lastError: state.lastError,
        loadTheme: state.loadTheme,
        updateTokenValue: state.updateTokenValue,
        addToken: state.addToken,
        deleteToken: state.deleteToken,
        saveAll: state.saveAll,
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
