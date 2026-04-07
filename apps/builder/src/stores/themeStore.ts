/**
 * Unified Theme Store (Slimmed — ADR-021 Phase D)
 *
 * ADR-021 Phase D에서 레거시 ThemeStudio 관련 코드 제거.
 * 보존: tokens, designVariables, loadTokens, createTheme, bulkUpsertTokens
 * 제거: Theme CRUD (update/delete/duplicate), Realtime 구독, 캐시 getter
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { ThemeService } from "../services/theme/ThemeService";
import { TokenService } from "../services/theme/TokenService";
import { tokensToCSS, formatCSSVars } from "../utils/theme/tokenToCss";
import { invalidateCSSVariableCache } from "../builder/workspace/canvas/utils/cssVariableReader";
import type {
  DesignTheme,
  DesignToken,
  DesignVariable,
  CreateTokenInput,
  UpdateTokenInput,
  TokenValue,
} from "../types/theme";

interface UnifiedThemeState {
  // ===== Theme State =====
  themes: DesignTheme[];
  activeTheme: DesignTheme | null;
  activeThemeId: string | null;
  projectId: string | null;

  // ===== Token State =====
  tokens: DesignToken[];

  // ===== G.2: Design Variables =====
  designVariables: DesignVariable[];

  // ===== Loading & Error =====
  loading: boolean;
  error: string | null;
  dirty: boolean;

  // ===== Theme Actions =====
  setProjectId: (projectId: string) => void;
  loadActiveTheme: (projectId: string) => Promise<void>;
  createTheme: (
    name: string,
    parentThemeId?: string,
    status?: "active" | "draft" | "archived",
    projectId?: string,
  ) => Promise<DesignTheme | null>;

  // ===== Token Actions =====
  loadTokens: (themeId: string) => Promise<void>;
  createToken: (input: CreateTokenInput) => Promise<DesignToken>;
  updateToken: (tokenId: string, updates: UpdateTokenInput) => Promise<void>;
  updateTokenValue: (
    name: string,
    scope: "raw" | "semantic",
    value: TokenValue,
  ) => void;
  addToken: (input: Omit<CreateTokenInput, "project_id" | "theme_id">) => void;
  deleteToken: (tokenId: string) => Promise<void>;
  bulkUpsertTokens: (tokens: Partial<DesignToken>[]) => Promise<void>;
  saveAllTokens: () => Promise<void>;

  // ===== CSS Injection =====
  injectThemeCSS: () => void;

  // ===== Utilities =====
  clearError: () => void;
  reset: () => void;
}

export const useUnifiedThemeStore = create<UnifiedThemeState>()(
  devtools(
    (set, get) => ({
      // ===== Initial State =====
      themes: [],
      activeTheme: null,
      activeThemeId: null,
      projectId: null,
      tokens: [],
      designVariables: [],
      loading: false,
      error: null,
      dirty: false,

      // ===== Theme Actions =====

      setProjectId: (projectId: string) => {
        set({ projectId });
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

          // Auto-load tokens
          await get().loadTokens(activeTheme.id);

          // Auto-inject CSS
          get().injectThemeCSS();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "활성 테마 조회 실패";
          set({ error: message, loading: false });
          console.error("[UnifiedThemeStore] loadActiveTheme failed:", err);
        }
      },

      createTheme: async (
        name: string,
        parentThemeId?: string,
        status: "active" | "draft" | "archived" = "draft",
        projectId?: string,
      ): Promise<DesignTheme | null> => {
        const finalProjectId = projectId || get().projectId;
        if (!finalProjectId) {
          console.error("[UnifiedThemeStore] createTheme: projectId is null");
          return null;
        }

        try {
          const newTheme = await ThemeService.createTheme({
            project_id: finalProjectId,
            name,
            parent_theme_id: parentThemeId,
            status,
          });

          set((state) => ({
            themes: [...state.themes, newTheme],
          }));

          return newTheme;
        } catch (err) {
          const message = err instanceof Error ? err.message : "테마 생성 실패";
          set({ error: message });
          console.error("[UnifiedThemeStore] createTheme failed:", err);
          return null;
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
          set({
            tokens: resolvedTokens as DesignToken[],
            loading: false,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "토큰 조회 실패";
          set({ error: message, loading: false });
          console.error("[UnifiedThemeStore] loadTokens failed:", err);
        }
      },

      createToken: async (input: CreateTokenInput): Promise<DesignToken> => {
        set({ loading: true, error: null });
        try {
          const newToken = await TokenService.createToken(input);
          set((state) => ({
            tokens: [...state.tokens, newToken],
            dirty: false,
            loading: false,
          }));

          get().injectThemeCSS();
          return newToken;
        } catch (err) {
          const message = err instanceof Error ? err.message : "토큰 생성 실패";
          set({ error: message, loading: false });
          console.error("[UnifiedThemeStore] createToken failed:", err);
          throw err;
        }
      },

      updateToken: async (tokenId: string, updates: UpdateTokenInput) => {
        set({ loading: true, error: null });
        try {
          await TokenService.updateToken(tokenId, updates);
          set((state) => ({
            tokens: state.tokens.map((t) =>
              t.id === tokenId ? { ...t, ...updates } : t,
            ),
            loading: false,
          }));

          get().injectThemeCSS();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "토큰 업데이트 실패";
          set({ error: message, loading: false });
          console.error("[UnifiedThemeStore] updateToken failed:", err);
        }
      },

      updateTokenValue: (name, scope, value) => {
        set((state) => {
          const tokenIndex = state.tokens.findIndex(
            (t) => t.name === name && t.scope === scope,
          );

          if (tokenIndex === -1) {
            return state;
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
          };
        });

        get().injectThemeCSS();
      },

      addToken: (input) => {
        set((state) => {
          const newToken: DesignToken = {
            id: uuidv4(),
            project_id: state.activeTheme?.project_id || state.projectId || "",
            theme_id: state.activeTheme?.id || "",
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
          };
        });

        get().injectThemeCSS();
      },

      deleteToken: async (tokenId: string) => {
        set({ loading: true, error: null });
        try {
          await TokenService.deleteToken(tokenId);
          set((state) => ({
            tokens: state.tokens.filter((t) => t.id !== tokenId),
            loading: false,
          }));

          get().injectThemeCSS();
        } catch (err) {
          const message = err instanceof Error ? err.message : "토큰 삭제 실패";
          set({ error: message, loading: false });
          console.error("[UnifiedThemeStore] deleteToken failed:", err);
        }
      },

      bulkUpsertTokens: async (tokens: Partial<DesignToken>[]) => {
        set({ loading: true, error: null });
        try {
          await TokenService.bulkUpsertTokens(tokens);

          const { activeThemeId } = get();
          if (activeThemeId) {
            await get().loadTokens(activeThemeId);
          }

          get().injectThemeCSS();
          set({ loading: false, dirty: false });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "토큰 일괄 저장 실패";
          set({ error: message, loading: false });
          console.error("[UnifiedThemeStore] bulkUpsertTokens failed:", err);
        }
      },

      saveAllTokens: async () => {
        const { tokens, dirty, activeTheme } = get();

        if (!activeTheme || !dirty) {
          return;
        }

        try {
          await TokenService.bulkUpsertTokens(tokens);
          set({ dirty: false });
        } catch (err) {
          const message = err instanceof Error ? err.message : "저장 실패";
          set({ error: message });
          console.error("[UnifiedThemeStore] saveAllTokens failed:", err);
        }
      },

      // ===== CSS Injection =====

      injectThemeCSS: () => {
        const { tokens } = get();
        if (tokens.length === 0) return;

        try {
          const cssVars = tokensToCSS(tokens);
          const cssText = formatCSSVars(cssVars);

          const styleId = "composition-theme-vars";
          let styleTag = document.getElementById(
            styleId,
          ) as HTMLStyleElement | null;

          if (!styleTag) {
            styleTag = document.createElement("style");
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
          }

          styleTag.textContent = cssText;
          invalidateCSSVariableCache();
        } catch (err) {
          console.error("[UnifiedThemeStore] injectThemeCSS failed:", err);
        }
      },

      // ===== Utilities =====

      clearError: () => set({ error: null }),

      reset: () => {
        set({
          themes: [],
          activeTheme: null,
          activeThemeId: null,
          projectId: null,
          tokens: [],
          loading: false,
          error: null,
          dirty: false,
        });
      },
    }),
    { name: "UnifiedThemeStore" },
  ),
);

// ===== Convenience Hooks =====
export const useTokens = () => useUnifiedThemeStore((state) => state.tokens);
export const useThemeLoading = () =>
  useUnifiedThemeStore((state) => state.loading);
export const useThemeError = () => useUnifiedThemeStore((state) => state.error);
