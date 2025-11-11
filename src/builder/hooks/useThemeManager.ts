import { useCallback } from 'react';
import { useUnifiedThemeStore } from '../stores/themeStore';

export interface UseThemeManagerReturn {
    applyThemeTokens: () => void;
    loadProjectTheme: (projectId: string) => void;
}

/**
 * ✅ Migrated to use unified theme store
 * CSS injection logic is now handled by the unified store's injectThemeCSS()
 * This hook is now a thin wrapper for backward compatibility
 */
export const useThemeManager = (): UseThemeManagerReturn => {
    const loadActiveTheme = useUnifiedThemeStore(state => state.loadActiveTheme);
    const injectThemeCSS = useUnifiedThemeStore(state => state.injectThemeCSS);

    /**
     * ✅ Simplified: Unified store now handles CSS injection automatically
     * This function is kept for backward compatibility but delegates to the store
     */
    const applyThemeTokens = useCallback(() => {
        // The unified store already handles CSS injection automatically
        // when tokens change, but we can manually trigger it here for compatibility
        injectThemeCSS();
    }, [injectThemeCSS]);

    const loadProjectTheme = useCallback((projectId: string) => {
        loadActiveTheme(projectId);
    }, [loadActiveTheme]);

    return {
        applyThemeTokens,
        loadProjectTheme
    };
};
