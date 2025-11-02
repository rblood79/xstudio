import { StateCreator } from 'zustand';
import { produce } from 'immer';
import type { DesignTheme, DesignToken, TokenValue, NewTokenInput } from '../../types/theme';
import { fetchActiveTheme, fetchTokensByTheme, bulkUpsertTokens, deleteDesignToken } from '../theme/themeApi';
import { resolveTokens, injectCss } from '../theme/cssVars';
import { TokenService } from '../../services/theme';
import { v4 as uuidv4 } from 'uuid';

export interface ThemeState {
    // 상태
    activeTheme: DesignTheme | null;
    rawTokens: DesignToken[];
    semanticTokens: DesignToken[];
    loading: boolean;
    dirty: boolean;
    lastError?: string | null;

    // 액션
    loadTheme: (projectId: string) => Promise<void>;
    updateTokenValue: (name: string, scope: 'raw' | 'semantic', value: TokenValue) => void;
    addToken: (input: NewTokenInput) => void;
    deleteToken: (name: string, scope: 'raw' | 'semantic') => Promise<boolean>;
    saveAll: () => Promise<void>;
    snapshotVersion: () => Promise<void>;
    clearError: () => void;
    cleanup: () => void;
}

export const createThemeSlice: StateCreator<ThemeState> = (set, get) => {
    let unsubscribeTokens: (() => void) | null = null;

    return {
        activeTheme: null,
        rawTokens: [],
        semanticTokens: [],
        loading: false,
        dirty: false,
        lastError: null,

        loadTheme: async (projectId: string) => {
            set({ loading: true, lastError: null });
            try {
                const theme = await fetchActiveTheme(projectId);
                const tokens = await fetchTokensByTheme(theme.id);
                const raw = tokens.filter(t => t.scope === 'raw');
                const semantic = tokens.filter(t => t.scope === 'semantic');

                injectCss(resolveTokens(tokens));
                set({
                    activeTheme: theme,
                    rawTokens: raw,
                    semanticTokens: semantic,
                    loading: false,
                    dirty: false
                });

                // 기존 구독 해제
                if (unsubscribeTokens) {
                    unsubscribeTokens();
                }

                // Realtime 토큰 변경 구독
                unsubscribeTokens = TokenService.subscribeToTokenChanges(
                    theme.id,
                    async (payload) => {
                        console.log('[Builder Theme] Token changed:', payload);

                        // 토큰 변경 시 다시 로드 + CSS 재주입
                        try {
                            const updatedTokens = await fetchTokensByTheme(theme.id);
                            const updatedRaw = updatedTokens.filter(t => t.scope === 'raw');
                            const updatedSemantic = updatedTokens.filter(t => t.scope === 'semantic');

                            injectCss(resolveTokens(updatedTokens));
                            set({
                                rawTokens: updatedRaw,
                                semanticTokens: updatedSemantic
                            });
                        } catch (err) {
                            console.error('[Builder Theme] Failed to reload tokens:', err);
                        }
                    }
                );

                console.log('[Builder Theme] Subscribed to token changes for theme:', theme.id);
            } catch (e) {
                console.error('[theme] load failed', e);
                set({
                    loading: false,
                    lastError: '테마 로드 실패: 서버 연결 오류'
                });
            }
        },

    updateTokenValue: (name, scope, value) => {
        set(
            produce((state: ThemeState) => {
                const tokens = scope === 'raw' ? state.rawTokens : state.semanticTokens;
                const token = tokens.find(t => t.name === name);

                if (token) {
                    token.value = value;
                    token.updated_at = new Date().toISOString();
                    state.dirty = true;

                    // CSS 즉시 업데이트
                    const allTokens = [...state.rawTokens, ...state.semanticTokens];
                    injectCss(resolveTokens(allTokens));
                }
            })
        );
    },

    addToken: (input) => {
        set(
            produce((state: ThemeState) => {
                const newToken: DesignToken = {
                    id: uuidv4(),
                    project_id: state.activeTheme?.project_id || '',
                    theme_id: state.activeTheme?.id || '',
                    name: input.name,
                    type: input.type,
                    value: input.value,
                    scope: input.scope,
                    alias_of: input.alias_of,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                if (input.scope === 'raw') {
                    state.rawTokens.push(newToken);
                } else {
                    state.semanticTokens.push(newToken);
                }

                state.dirty = true;

                // CSS 즉시 업데이트
                const allTokens = [...state.rawTokens, ...state.semanticTokens];
                injectCss(resolveTokens(allTokens));
            })
        );
    },

    deleteToken: async (name, scope) => {
        try {
            const { activeTheme } = get();
            if (!activeTheme) return false;

            const tokens = scope === 'raw' ? get().rawTokens : get().semanticTokens;
            const token = tokens.find(t => t.name === name);

            if (!token) return false;

            await deleteDesignToken({
                projectId: activeTheme.project_id,
                themeId: activeTheme.id,
                name: token.name,
                scope: scope
            });

            set(
                produce((state: ThemeState) => {
                    if (scope === 'raw') {
                        state.rawTokens = state.rawTokens.filter(t => t.name !== name);
                    } else {
                        state.semanticTokens = state.semanticTokens.filter(t => t.name !== name);
                    }
                    state.dirty = true;

                    // CSS 즉시 업데이트
                    const allTokens = [...state.rawTokens, ...state.semanticTokens];
                    injectCss(resolveTokens(allTokens));
                })
            );

            return true;
        } catch (e) {
            console.error('[theme] delete failed', e);
            set({ lastError: '토큰 삭제 실패: 서버 오류' });
            return false;
        }
    },

    saveAll: async () => {
        const { activeTheme, rawTokens, semanticTokens, dirty } = get();

        if (!activeTheme || !dirty) {
            return;
        }

        try {
            const allTokens = [...rawTokens, ...semanticTokens];
            await bulkUpsertTokens(allTokens);
            set({ dirty: false });
        } catch (e) {
            console.error('[theme] save failed', e);
            set({ lastError: '저장 실패: 서버 오류' });
        }
    },

    snapshotVersion: async () => {
        const { activeTheme } = get();
        if (!activeTheme) return;

        try {
            const { supabase } = await import('../../env/supabase.client');
            const { error } = await supabase.rpc(
                'increment_design_theme_version',
                { p_theme_id: activeTheme.id }
            );
            if (error) throw error;

            set(
                produce((state: ThemeState) => {
                    if (state.activeTheme) {
                        state.activeTheme = {
                            ...state.activeTheme,
                            version: state.activeTheme.version + 1,
                            updated_at: new Date().toISOString()
                        };
                    }
                })
            );
        } catch (e) {
            console.error('[theme] snapshot failed', e);
            set({ lastError: '버전 스냅샷 생성 실패' });
        }
    },

    clearError: () => set({ lastError: null }),

        cleanup: () => {
            // Builder 종료 시 구독 해제
            if (unsubscribeTokens) {
                unsubscribeTokens();
                unsubscribeTokens = null;
                console.log('[Builder Theme] Unsubscribed from token changes');
            }
        }
    };
};
