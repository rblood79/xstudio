/**
 * Unified Theme Store
 *
 * This store combines and supersedes:
 * - builder/stores/theme.ts (token-focused store)
 * - builder/stores/themeStore.ts (theme-focused store)
 *
 * Key Features:
 * - Single source of truth for theme AND token state
 * - Automatic synchronization: token changes → CSS auto-injection
 * - Automatic synchronization: theme activation → token auto-loading
 * - Realtime subscriptions for both themes and tokens
 * - Service layer only (no direct Supabase calls)
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
// import { produce } from 'immer'; // REMOVED - Phase 15 일관성 리팩토링
import { v4 as uuidv4 } from 'uuid';
import { ThemeService } from '../services/theme/ThemeService';
import { TokenService } from '../services/theme/TokenService';
import { tokensToCSS, formatCSSVars } from '../utils/theme/tokenToCss';
import type {
  DesignTheme,
  DesignToken,
  CreateTokenInput,
  UpdateTokenInput,
  TokenValue,
} from '../types/theme';

// Phase 3.1 최적화: Getter 메모이제이션 캐시
let cachedRawTokens: DesignToken[] | null = null;
let cachedSemanticTokens: DesignToken[] | null = null;
let cachedTokensVersion = 0;

interface UnifiedThemeState {
  // ===== Theme State =====
  themes: DesignTheme[];
  activeTheme: DesignTheme | null;
  activeThemeId: string | null;
  projectId: string | null;

  // ===== Token State =====
  tokens: DesignToken[]; // All tokens (raw + semantic)
  rawTokens: DesignToken[]; // Computed getter
  semanticTokens: DesignToken[]; // Computed getter

  // Phase 3.1: 캐시 무효화를 위한 내부 버전
  _tokensVersion: number;

  // ===== Loading & Error =====
  loading: boolean;
  error: string | null;
  dirty: boolean; // Has unsaved token changes

  // ===== Theme Actions =====
  setProjectId: (projectId: string) => void;
  loadThemes: (projectId: string) => Promise<void>;
  loadActiveTheme: (projectId: string) => Promise<void>;
  setActiveTheme: (themeId: string) => Promise<void>;
  createTheme: (
    name: string,
    parentThemeId?: string,
    status?: 'active' | 'draft' | 'archived',
    projectId?: string
  ) => Promise<DesignTheme | null>;
  updateTheme: (
    themeId: string,
    updates: { name?: string; status?: 'active' | 'draft' | 'archived' }
  ) => Promise<DesignTheme | null>;
  deleteTheme: (themeId: string, projectId?: string) => Promise<boolean>;
  duplicateTheme: (
    sourceThemeId: string,
    newName: string,
    inherit?: boolean,
    projectId?: string
  ) => Promise<string | null>;
  activateTheme: (themeId: string, projectId?: string) => Promise<boolean>;
  snapshotVersion: () => Promise<void>;

  // ===== Token Actions =====
  loadTokens: (themeId: string) => Promise<void>;
  createToken: (input: CreateTokenInput) => Promise<DesignToken>;
  updateToken: (tokenId: string, updates: UpdateTokenInput) => Promise<void>;
  updateTokenValue: (name: string, scope: 'raw' | 'semantic', value: TokenValue) => void;
  addToken: (input: Omit<CreateTokenInput, 'project_id' | 'theme_id'>) => void;
  deleteToken: (tokenId: string) => Promise<void>;
  bulkUpsertTokens: (tokens: Partial<DesignToken>[]) => Promise<void>;
  saveAllTokens: () => Promise<void>;

  // ===== CSS Injection =====
  injectThemeCSS: () => void;

  // ===== Realtime Subscriptions =====
  subscribeToThemes: () => (() => void) | null;
  subscribeToTokens: () => (() => void) | null;

  // ===== Internal State Updates (for Realtime) =====
  _addTheme: (theme: DesignTheme) => void;
  _updateTheme: (theme: DesignTheme) => void;
  _removeTheme: (themeId: string) => void;
  _setActiveTheme: (theme: DesignTheme | null) => void;

  // ===== Utilities =====
  clearError: () => void;
  cleanup: () => void;
  reset: () => void;
}

// Realtime subscription cleanup functions
let unsubscribeThemes: (() => void) | null = null;
let unsubscribeTokens: (() => void) | null = null;

export const useUnifiedThemeStore = create<UnifiedThemeState>()(
  devtools(
    (set, get) => ({
      // ===== Initial State =====
      themes: [],
      activeTheme: null,
      activeThemeId: null,
      projectId: null,
      tokens: [],
      _tokensVersion: 0,
      loading: false,
      error: null,
      dirty: false,

      // ===== Computed Properties =====
      // Phase 3.1 최적화: 메모이제이션된 getter
      get rawTokens() {
        const currentVersion = get()._tokensVersion;
        if (cachedTokensVersion !== currentVersion || !cachedRawTokens) {
          cachedRawTokens = get().tokens.filter((t) => t.scope === 'raw');
          cachedTokensVersion = currentVersion;
        }
        return cachedRawTokens;
      },

      get semanticTokens() {
        const currentVersion = get()._tokensVersion;
        if (cachedTokensVersion !== currentVersion || !cachedSemanticTokens) {
          cachedSemanticTokens = get().tokens.filter((t) => t.scope === 'semantic');
          // cachedTokensVersion은 rawTokens에서 이미 업데이트됨
        }
        return cachedSemanticTokens;
      },

      // ===== Theme Actions =====

      setProjectId: (projectId: string) => {
        set({ projectId });
      },

      /**
       * Load all themes for the project
       */
      loadThemes: async (projectId: string) => {
        set({ loading: true, error: null });
        try {
          const themes = await ThemeService.getThemesByProject(projectId);
          set({ themes, loading: false, projectId });
        } catch (err) {
          const message = err instanceof Error ? err.message : '테마 조회 실패';
          set({ error: message, loading: false });
          console.error('[UnifiedThemeStore] loadThemes failed:', err);
        }
      },

      /**
       * Load active theme for the project
       */
      loadActiveTheme: async (projectId: string) => {
        set({ loading: true, error: null });
        try {
          const activeTheme = await ThemeService.getActiveTheme(projectId);

          if (!activeTheme) {
            set({ loading: false });
            return;
          }

          set({
            activeTheme,
            activeThemeId: activeTheme.id,
            projectId,
            loading: false,
          });

          // ✅ Auto-load tokens (synchronization)
          await get().loadTokens(activeTheme.id);

          // ✅ Auto-inject CSS (synchronization)
          get().injectThemeCSS();
        } catch (err) {
          const message = err instanceof Error ? err.message : '활성 테마 조회 실패';
          set({ error: message, loading: false });
          console.error('[UnifiedThemeStore] loadActiveTheme failed:', err);
        }
      },

      /**
       * Set active theme by ID
       */
      setActiveTheme: async (themeId: string) => {
        set({ loading: true, error: null });
        try {
          const theme = get().themes.find((t) => t.id === themeId);
          if (!theme) throw new Error('Theme not found');

          set({
            activeTheme: theme,
            activeThemeId: themeId,
          });

          // ✅ Auto-load tokens (synchronization)
          await get().loadTokens(themeId);

          // ✅ Auto-inject CSS (synchronization)
          get().injectThemeCSS();

          set({ loading: false });
        } catch (err) {
          const message = err instanceof Error ? err.message : '테마 설정 실패';
          set({ error: message, loading: false });
          console.error('[UnifiedThemeStore] setActiveTheme failed:', err);
        }
      },

      createTheme: async (
        name: string,
        parentThemeId?: string,
        status: 'active' | 'draft' | 'archived' = 'draft',
        projectId?: string
      ): Promise<DesignTheme | null> => {
        const finalProjectId = projectId || get().projectId;
        if (!finalProjectId) {
          console.error('[UnifiedThemeStore] createTheme: projectId is null');
          return null;
        }

        try {
          const newTheme = await ThemeService.createTheme({
            project_id: finalProjectId,
            name,
            parent_theme_id: parentThemeId,
            status,
          });

          // Add to local state for immediate feedback
          get()._addTheme(newTheme);

          return newTheme;
        } catch (err) {
          const message = err instanceof Error ? err.message : '테마 생성 실패';
          set({ error: message });
          console.error('[UnifiedThemeStore] createTheme failed:', err);
          return null;
        }
      },

      updateTheme: async (
        themeId: string,
        updates: { name?: string; status?: 'active' | 'draft' | 'archived' }
      ): Promise<DesignTheme | null> => {
        try {
          const updatedTheme = await ThemeService.updateTheme(themeId, updates);
          get()._updateTheme(updatedTheme);
          return updatedTheme;
        } catch (err) {
          const message = err instanceof Error ? err.message : '테마 업데이트 실패';
          set({ error: message });
          console.error('[UnifiedThemeStore] updateTheme failed:', err);
          return null;
        }
      },

      deleteTheme: async (themeId: string): Promise<boolean> => {
        try {
          await ThemeService.deleteTheme(themeId);
          get()._removeTheme(themeId);
          return true;
        } catch (err) {
          const message = err instanceof Error ? err.message : '테마 삭제 실패';
          set({ error: message });
          console.error('[UnifiedThemeStore] deleteTheme failed:', err);
          return false;
        }
      },

      duplicateTheme: async (
        sourceThemeId: string,
        newName: string,
        inherit: boolean = false,
        projectId?: string
      ): Promise<string | null> => {
        try {
          const newThemeId = await ThemeService.duplicateTheme(
            sourceThemeId,
            newName,
            inherit
          );

          // Refresh themes list
          const finalProjectId = projectId || get().projectId;
          if (finalProjectId) {
            await get().loadThemes(finalProjectId);
          }

          return newThemeId;
        } catch (err) {
          const message = err instanceof Error ? err.message : '테마 복제 실패';
          set({ error: message });
          console.error('[UnifiedThemeStore] duplicateTheme failed:', err);
          return null;
        }
      },

      activateTheme: async (themeId: string): Promise<boolean> => {
        try {
          await ThemeService.activateTheme(themeId);
          // Realtime subscription will automatically update themes and activeTheme
          return true;
        } catch (err) {
          const message = err instanceof Error ? err.message : '테마 활성화 실패';
          set({ error: message });
          console.error('[UnifiedThemeStore] activateTheme failed:', err);
          return false;
        }
      },

      snapshotVersion: async () => {
        const { activeTheme } = get();
        if (!activeTheme) return;

        try {
          const newVersion = await ThemeService.createSnapshot(activeTheme.id);

          // Phase 15 리팩토링: Immer 제거, spread 패턴 사용
          set((state) => ({
            activeTheme: state.activeTheme
              ? {
                  ...state.activeTheme,
                  version: newVersion,
                  updated_at: new Date().toISOString(),
                }
              : null,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : '버전 스냅샷 생성 실패';
          set({ error: message });
          console.error('[UnifiedThemeStore] snapshotVersion failed:', err);
        }
      },

      // ===== Token Actions =====

      /**
       * Load tokens for a theme
       */
      loadTokens: async (themeId: string) => {
        set({ loading: true, error: null });
        try {
          const resolvedTokens = await TokenService.getResolvedTokens(themeId);
          set((state) => ({
            tokens: resolvedTokens as DesignToken[],
            _tokensVersion: state._tokensVersion + 1,
            loading: false
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : '토큰 조회 실패';
          set({ error: message, loading: false });
          console.error('[UnifiedThemeStore] loadTokens failed:', err);
        }
      },

      createToken: async (input: CreateTokenInput): Promise<DesignToken> => {
        set({ loading: true, error: null });
        try {
          const newToken = await TokenService.createToken(input);
          set((state) => ({
            tokens: [...state.tokens, newToken],
            _tokensVersion: state._tokensVersion + 1,
            dirty: false,
            loading: false,
          }));

          // ✅ Auto-inject CSS (synchronization)
          get().injectThemeCSS();

          return newToken;
        } catch (err) {
          const message = err instanceof Error ? err.message : '토큰 생성 실패';
          set({ error: message, loading: false });
          console.error('[UnifiedThemeStore] createToken failed:', err);
          throw err;
        }
      },

      updateToken: async (tokenId: string, updates: UpdateTokenInput) => {
        set({ loading: true, error: null });
        try {
          await TokenService.updateToken(tokenId, updates);
          set((state) => ({
            tokens: state.tokens.map((t) =>
              t.id === tokenId ? { ...t, ...updates } : t
            ),
            _tokensVersion: state._tokensVersion + 1,
            loading: false,
          }));

          // ✅ Auto-inject CSS (synchronization)
          get().injectThemeCSS();
        } catch (err) {
          const message = err instanceof Error ? err.message : '토큰 업데이트 실패';
          set({ error: message, loading: false });
          console.error('[UnifiedThemeStore] updateToken failed:', err);
        }
      },

      /**
       * Update token value (local only, mark as dirty)
       * Phase 15 리팩토링: Immer 제거, spread 패턴 사용
       */
      updateTokenValue: (name, scope, value) => {
        set((state) => {
          const tokenIndex = state.tokens.findIndex(
            (t) => t.name === name && t.scope === scope
          );

          if (tokenIndex === -1) {
            return state; // 토큰을 찾지 못하면 상태 변경 없음
          }

          const updatedToken = {
            ...state.tokens[tokenIndex],
            value,
            updated_at: new Date().toISOString(),
          };

          return {
            tokens: [
              ...state.tokens.slice(0, tokenIndex),
              updatedToken,
              ...state.tokens.slice(tokenIndex + 1),
            ],
            dirty: true,
            _tokensVersion: state._tokensVersion + 1, // Phase 3.1: 캐시 무효화
          };
        });

        // Inject CSS after state update
        get().injectThemeCSS();
      },

      /**
       * Add token (local only, mark as dirty)
       * Phase 15 리팩토링: Immer 제거, spread 패턴 사용
       */
      addToken: (input) => {
        set((state) => {
          const newToken: DesignToken = {
            id: uuidv4(),
            project_id: state.activeTheme?.project_id || state.projectId || '',
            theme_id: state.activeTheme?.id || '',
            name: input.name,
            type: input.type,
            value: input.value,
            scope: input.scope,
            alias_of: input.alias_of,
            css_variable: input.css_variable,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          return {
            tokens: [...state.tokens, newToken],
            dirty: true,
            _tokensVersion: state._tokensVersion + 1, // Phase 3.1: 캐시 무효화
          };
        });

        // Inject CSS after state update
        get().injectThemeCSS();
      },

      deleteToken: async (tokenId: string) => {
        set({ loading: true, error: null });
        try {
          await TokenService.deleteToken(tokenId);
          set((state) => ({
            tokens: state.tokens.filter((t) => t.id !== tokenId),
            _tokensVersion: state._tokensVersion + 1,
            loading: false,
          }));

          // ✅ Auto-inject CSS (synchronization)
          get().injectThemeCSS();
        } catch (err) {
          const message = err instanceof Error ? err.message : '토큰 삭제 실패';
          set({ error: message, loading: false });
          console.error('[UnifiedThemeStore] deleteToken failed:', err);
        }
      },

      bulkUpsertTokens: async (tokens: Partial<DesignToken>[]) => {
        set({ loading: true, error: null });
        try {
          await TokenService.bulkUpsertTokens(tokens);

          // Reload tokens after bulk upsert
          const { activeThemeId } = get();
          if (activeThemeId) {
            await get().loadTokens(activeThemeId);
          }

          // ✅ Auto-inject CSS (synchronization)
          get().injectThemeCSS();

          set({ loading: false, dirty: false });
        } catch (err) {
          const message = err instanceof Error ? err.message : '토큰 일괄 저장 실패';
          set({ error: message, loading: false });
          console.error('[UnifiedThemeStore] bulkUpsertTokens failed:', err);
        }
      },

      /**
       * Save all dirty tokens
       */
      saveAllTokens: async () => {
        const { tokens, dirty, activeTheme } = get();

        if (!activeTheme || !dirty) {
          return;
        }

        try {
          await TokenService.bulkUpsertTokens(tokens);
          set({ dirty: false });
        } catch (err) {
          const message = err instanceof Error ? err.message : '저장 실패';
          set({ error: message });
          console.error('[UnifiedThemeStore] saveAllTokens failed:', err);
        }
      },

      // ===== CSS Injection (Unified) =====

      /**
       * Inject theme CSS variables into the document
       */
      injectThemeCSS: () => {
        const { tokens } = get();
        if (tokens.length === 0) return;

        try {
          const cssVars = tokensToCSS(tokens);
          const cssText = formatCSSVars(cssVars);

          // Inject into <style> tag
          const styleId = 'xstudio-theme-vars';
          let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;

          if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
          }

          styleTag.textContent = cssText;
        } catch (err) {
          console.error('[UnifiedThemeStore] injectThemeCSS failed:', err);
        }
      },

      // ===== Realtime Subscriptions =====

      subscribeToThemes: () => {
        const { projectId } = get();
        if (!projectId) {
          console.error('[UnifiedThemeStore] subscribeToThemes: projectId is null');
          return null;
        }

        // Cleanup existing subscription
        if (unsubscribeThemes) {
          unsubscribeThemes();
        }

        unsubscribeThemes = ThemeService.subscribeToProjectThemes(
          projectId,
          (payload) => {

            if (payload.eventType === 'INSERT') {
              get()._addTheme(payload.new as DesignTheme);

              const newTheme = payload.new as DesignTheme;
              if (newTheme.status === 'active') {
                get()._setActiveTheme(newTheme);
              }
            } else if (payload.eventType === 'UPDATE') {
              get()._updateTheme(payload.new as DesignTheme);

              const updatedTheme = payload.new as DesignTheme;
              const { activeTheme } = get();

              if (activeTheme && updatedTheme.id === activeTheme.id) {
                get()._setActiveTheme(updatedTheme);
              }

              if (updatedTheme.status === 'active' && activeTheme?.id !== updatedTheme.id) {
                get()._setActiveTheme(updatedTheme);
                // ✅ Auto-load tokens for newly activated theme
                get().loadTokens(updatedTheme.id);
              }

              if (
                activeTheme &&
                updatedTheme.id === activeTheme.id &&
                updatedTheme.status !== 'active'
              ) {
                get()._setActiveTheme(null);
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedTheme = payload.old as { id: string };
              get()._removeTheme(deletedTheme.id);

              const { activeTheme } = get();
              if (activeTheme && deletedTheme.id === activeTheme.id) {
                get()._setActiveTheme(null);
              }
            }
          }
        );

        return unsubscribeThemes;
      },

      subscribeToTokens: () => {
        const { activeThemeId } = get();
        if (!activeThemeId) {
          console.error('[UnifiedThemeStore] subscribeToTokens: activeThemeId is null');
          return null;
        }

        // Cleanup existing subscription
        if (unsubscribeTokens) {
          unsubscribeTokens();
        }

        unsubscribeTokens = TokenService.subscribeToTokenChanges(
          activeThemeId,
          async (_payload) => {
            // _payload contains realtime change info, but we reload all tokens
            try {
              // Reload all tokens and re-inject CSS
              await get().loadTokens(activeThemeId);
              get().injectThemeCSS();
            } catch (err) {
              console.error('[UnifiedThemeStore] Failed to reload tokens:', err);
            }
          }
        );

        return unsubscribeTokens;
      },

      // ===== Internal State Updates (for Realtime) =====

      _addTheme: (theme: DesignTheme) => {
        set((state) => ({
          themes: [...state.themes, theme],
        }));
      },

      _updateTheme: (theme: DesignTheme) => {
        set((state) => ({
          themes: state.themes.map((t) => (t.id === theme.id ? theme : t)),
        }));
      },

      _removeTheme: (themeId: string) => {
        set((state) => ({
          themes: state.themes.filter((t) => t.id !== themeId),
        }));
      },

      _setActiveTheme: (theme: DesignTheme | null) => {
        set({ activeTheme: theme, activeThemeId: theme?.id || null });
      },

      // ===== Utilities =====

      clearError: () => set({ error: null }),

      cleanup: () => {
        // Cleanup all subscriptions
        if (unsubscribeThemes) {
          unsubscribeThemes();
          unsubscribeThemes = null;
        }

        if (unsubscribeTokens) {
          unsubscribeTokens();
          unsubscribeTokens = null;
        }
      },

      reset: () => {
        get().cleanup();
        set({
          themes: [],
          activeTheme: null,
          activeThemeId: null,
          projectId: null,
          tokens: [],
          _tokensVersion: 0,
          loading: false,
          error: null,
          dirty: false,
        });
      },
    }),
    { name: 'UnifiedThemeStore' }
  )
);

// ===== Convenience Hooks =====
export const useThemes = () => useUnifiedThemeStore((state) => state.themes);
export const useActiveTheme = () => useUnifiedThemeStore((state) => state.activeTheme);
export const useTokens = () => useUnifiedThemeStore((state) => state.tokens);
export const useRawTokens = () => useUnifiedThemeStore((state) => state.rawTokens);
export const useSemanticTokens = () => useUnifiedThemeStore((state) => state.semanticTokens);
export const useThemeLoading = () => useUnifiedThemeStore((state) => state.loading);
export const useThemeError = () => useUnifiedThemeStore((state) => state.error);
