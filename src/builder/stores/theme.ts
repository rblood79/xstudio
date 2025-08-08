import { create } from 'zustand';
import type { DesignTheme, DesignToken, TokenValue, NewTokenInput } from '../../types/theme';
import { fetchActiveTheme, fetchTokensByTheme, bulkUpsertTokens, deleteDesignToken } from '../theme/themeApi';
import { resolveTokens, injectCss } from '../theme/cssVars';
import { v4 as uuidv4 } from 'uuid';

interface ThemeState {
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
}

export const useThemeStore = create<ThemeState>((set, get) => ({
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
        } catch (e) {
            console.error('[theme] load failed', e);
            set({
                loading: false,
                lastError: e instanceof Error ? e.message : '테마 로드 실패'
            });
        }
    },

    updateTokenValue: (name, scope, value) => {
        console.log('[theme] Updating token:', { name, scope, value });
        const { rawTokens, semanticTokens } = get();
        const list = scope === 'raw' ? rawTokens : semanticTokens;
        const idx = list.findIndex(t => t.name === name && t.scope === scope);
        if (idx === -1) {
            console.warn('[theme] Token not found:', { name, scope });
            return;
        }

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
        console.log('[theme] Token updated, scheduling save');
        scheduleSave();
    },

    addToken: (input) => {
        console.log('[theme] Adding token:', input);
        const { rawTokens, semanticTokens, activeTheme } = get();
        if (!activeTheme) {
            console.warn('[theme] No active theme');
            return;
        }

        const list = input.scope === 'raw' ? rawTokens : semanticTokens;
        const dup = list.some(t => t.name === input.name);
        if (dup) {
            console.warn('[theme] Duplicate token:', input.name);
            return;
        }

        // css_variable 필드를 제거하고 기본 토큰 구조만 사용
        const token: Omit<DesignToken, 'css_variable'> = {
            id: uuidv4(),
            project_id: activeTheme.project_id,
            theme_id: activeTheme.id,
            name: input.name,
            type: input.type,
            value: input.value,
            scope: input.scope,
            alias_of: input.alias_of || null
        };

        const nextRaw = input.scope === 'raw' ? [...rawTokens, token as DesignToken] : rawTokens;
        const nextSem = input.scope === 'semantic' ? [...semanticTokens, token as DesignToken] : semanticTokens;
        const merged = [...nextRaw, ...nextSem];

        injectCss(resolveTokens(merged));
        set({
            rawTokens: nextRaw,
            semanticTokens: nextSem,
            dirty: true
        });
        console.log('[theme] Token added, scheduling save');
        scheduleSave();
    },

    deleteToken: async (name, scope) => {
        const { rawTokens, semanticTokens, activeTheme } = get();
        if (!activeTheme) return false;

        // 참조 보호: raw 삭제 시 semantic alias 사용 여부 검사
        if (scope === 'raw') {
            const dependents = semanticTokens.filter(t => t.alias_of === name);
            if (dependents.length) {
                set({
                    lastError: `삭제 불가: semantic 토큰 ${dependents.map(d => d.name).join(', ')} 가 alias_of 로 참조`
                });
                return false;
            }
        }

        const targetList = scope === 'raw' ? rawTokens : semanticTokens;
        if (!targetList.some(t => t.name === name)) {
            return false;
        }

        // 낙관적 제거
        const nextRaw = scope === 'raw' ? rawTokens.filter(t => t.name !== name) : rawTokens;
        const nextSem = scope === 'semantic' ? semanticTokens.filter(t => t.name !== name) : semanticTokens;

        injectCss(resolveTokens([...nextRaw, ...nextSem]));
        set({
            rawTokens: nextRaw,
            semanticTokens: nextSem,
            dirty: true,
            lastError: null
        });

        // 서버 삭제
        try {
            await deleteDesignToken({
                projectId: activeTheme.project_id,
                themeId: activeTheme.id,
                name,
                scope
            });
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

    saveAll: async () => {
        const { activeTheme, rawTokens, semanticTokens, dirty } = get();
        console.log('[theme] saveAll called:', {
            hasActiveTheme: !!activeTheme,
            dirty,
            tokenCount: rawTokens.length + semanticTokens.length
        });

        if (!activeTheme || !dirty) {
            console.log('[theme] Save skipped - no active theme or not dirty');
            return;
        }

        try {
            const allTokens = [...rawTokens, ...semanticTokens];
            console.log('[theme] Saving tokens:', allTokens);
            await bulkUpsertTokens(allTokens);
            set({ dirty: false });
            console.log('[theme] Save successful');
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

            set({
                activeTheme: {
                    ...activeTheme,
                    version: activeTheme.version + 1,
                    updated_at: new Date().toISOString()
                }
            });
        } catch (e) {
            console.error('[theme] snapshot failed', e);
            set({ lastError: '버전 스냅샷 생성 실패' });
        }
    },

    clearError: () => set({ lastError: null })
}));

let saveTimer: number | null = null;
function scheduleSave() {
    console.log('[theme] Scheduling save...');
    if (saveTimer) {
        console.log('[theme] Clearing existing save timer');
        window.clearTimeout(saveTimer);
    }
    saveTimer = window.setTimeout(() => {
        console.log('[theme] Executing scheduled save');
        useThemeStore.getState().saveAll();
    }, 800);
}