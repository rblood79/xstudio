import { create } from 'zustand';
import type { DesignTheme, DesignToken } from '../../types/designTheme';
import { fetchActiveTheme, fetchTokensByTheme, bulkUpsertTokens, deleteDesignToken } from '../theme/themeApi';
import { resolveTokens, injectCss } from '../theme/cssVars';
import { v4 as uuidv4 } from 'uuid';

interface ThemeState {
    activeTheme: DesignTheme | null;
    rawTokens: DesignToken[];
    semanticTokens: DesignToken[];
    loading: boolean;
    dirty: boolean;
    loadTheme: (projectId: string) => Promise<void>;
    updateTokenValue: (name: string, scope: 'raw' | 'semantic', value: any) => void;
    saveAll: () => Promise<void>;
    addToken: (
        scope: 'raw' | 'semantic',
        name: string,
        type: string,
        value: any,
        alias_of?: string | null
    ) => void;
    deleteToken: (name: string, scope: 'raw' | 'semantic') => Promise<boolean>;
    snapshotVersion: () => Promise<void>;
    lastError?: string | null;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    activeTheme: null,
    rawTokens: [],
    semanticTokens: [],
    loading: false,
    dirty: false,
    lastError: null,

    loadTheme: async (projectId: string) => {
        set({ loading: true });
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
        } catch (e) {
            console.error('[theme] load failed', e);
            set({ loading: false, lastError: e.message });
        }
    },

    updateTokenValue: (name, scope, value) => {
        const { rawTokens, semanticTokens } = get();
        const list = scope === 'raw' ? rawTokens : semanticTokens;
        const idx = list.findIndex(t => t.name === name && t.scope === scope);
        if (idx === -1) return;
        const updated = { ...list[idx], value };
        const nextList = [...list];
        nextList[idx] = updated;
        const merged = scope === 'raw'
            ? [...nextList, ...semanticTokens]
            : [...rawTokens, ...nextList];
        injectCss(resolveTokens(merged));
        if (scope === 'raw') {
            set({ rawTokens: nextList, dirty: true });
        } else {
            set({ semanticTokens: nextList, dirty: true });
        }
        scheduleSave();
    },

    addToken: (scope, name, type, value, alias_of) => {
        const {
            rawTokens,
            semanticTokens,
            activeTheme
        } = get();
        if (!activeTheme) return;
        const list = scope === 'raw' ? rawTokens : semanticTokens;
        const dup = list.some(t => t.name === name);
        if (dup) {
            return;
        }
        const token = {
            id: uuidv4(),
            project_id: activeTheme.project_id,
            theme_id: activeTheme.id,
            name,
            type,
            value,
            scope,
            alias_of: alias_of || null
        } as any;
        const nextRaw = scope === 'raw' ? [...rawTokens, token] : rawTokens;
        const nextSem =
            scope === 'semantic' ? [...semanticTokens, token] : semanticTokens;
        const merged = [...nextRaw, ...nextSem];
        injectCss(resolveTokens(merged));
        set({
            rawTokens: nextRaw,
            semanticTokens: nextSem,
            dirty: true
        });
        scheduleSave();
    },

    deleteToken: async (name, scope) => {
        const {
            rawTokens,
            semanticTokens,
            activeTheme
        } = get();
        if (!activeTheme) return false;

        // 참조 보호: raw 삭제 시 semantic alias 사용 여부 검사
        if (scope === 'raw') {
            const dependents = semanticTokens.filter(
                t => t.alias_of === name
            );
            if (dependents.length) {
                set({
                    lastError: `삭제 불가: semantic 토큰 ${dependents
                        .map(d => d.name)
                        .join(', ')} 가 alias_of 로 참조`
                });
                return false;
            }
        }

        const targetList =
            scope === 'raw' ? rawTokens : semanticTokens;
        if (!targetList.some(t => t.name === name)) {
            return false;
        }

        // 낙관적 제거
        const nextRaw =
            scope === 'raw'
                ? rawTokens.filter(t => t.name !== name)
                : rawTokens;
        const nextSem =
            scope === 'semantic'
                ? semanticTokens.filter(t => t.name !== name)
                : semanticTokens;

        // CSS 재주입
        injectCss(resolveTokens([...nextRaw, ...nextSem]));
        set({
            rawTokens: nextRaw,
            semanticTokens: nextSem,
            dirty: true,
            lastError: null
        });

        // 서버 삭제 (실패 시 롤백)
        try {
            await deleteDesignToken({
                projectId: activeTheme.project_id,
                themeId: activeTheme.id,
                name,
                scope
            });
            // upsert saveAll 흐름과 별개로 즉시 DB 반영함 → dirty 플래그는
            // 남겨 다른 변경 저장 계속 허용
            return true;
        } catch (e) {
            console.error('[theme] delete failed', e);
            // 롤백
            set({
                rawTokens: rawTokens,
                semanticTokens: semanticTokens,
                lastError: '삭제 실패: 서버 오류'
            });
            injectCss(resolveTokens([...rawTokens, ...semanticTokens]));
            return false;
        }
    },

    snapshotVersion: async () => {
        const { activeTheme } = get();
        if (!activeTheme) return;
        try {
            // RPC 호출 (이미 생성됨 가정)
            const { supabase } = await import('../../env/supabase.client');
            const { error } = await supabase.rpc(
                'increment_design_theme_version',
                { p_theme_id: activeTheme.id }
            );
            if (error) throw error;
            set({
                activeTheme: {
                    ...activeTheme,
                    version: activeTheme.version + 1,
                    updated_at: new Date().toISOString()
                }
            });
        } catch (e) {
            console.error('[theme] snapshot failed', e);
        }
    },

    saveAll: async () => {
        const { activeTheme, rawTokens, semanticTokens, dirty } = get();
        if (!activeTheme || !dirty) return;
        try {
            await bulkUpsertTokens([...rawTokens, ...semanticTokens]);
            set({ dirty: false });
        } catch (e) {
            console.error('[theme] save failed', e);
        }
    }
}));

let saveTimer: number | null = null;
function scheduleSave() {
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
        useThemeStore.getState().saveAll();
    }, 800);
}