import { create } from 'zustand';
import { produce } from 'immer';
import { supabase } from '../../env/supabase.client';
import type { DesignToken, TokenType, TokenValue } from '../../types/designTokens';

interface ThemeStore {
  // 상태
  projectId: string | null;
  tokens: DesignToken[];
  lastFetch: number;

  // 기존 액션
  setProjectId: (id: string) => void;
  fetchTokens: (projectId: string) => Promise<void>;
  updateIframeStyles: () => void;
  getStyleObject: () => Record<string, string>;

  // 추가 필요한 토큰 관리 액션
  setTokens: (tokens: DesignToken[]) => void;
  updateToken: (tokenId: string, value: TokenValue) => void;
  addToken: (token: DesignToken) => void;
  removeToken: (tokenId: string) => void;
}

const CACHE_DURATION = 5000; // 5 seconds cache

export const useThemeStore = create<ThemeStore>((set, get) => ({
  // 초기 상태
  projectId: null,
  tokens: [],
  lastFetch: 0,

  // 기존 액션
  setProjectId: (id) => set({ projectId: id }),

  fetchTokens: async (projectId) => {
    const now = Date.now();
    const { lastFetch } = get();

    // Prevent fetching if the last fetch was too recent
    if (now - lastFetch < CACHE_DURATION) {
      return;
    }

    try {
      // XStudio 패턴: Supabase 직접 호출
      const { data, error } = await supabase
        .from('design_tokens')
        .select('*')
        .eq('project_id', projectId)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      // Supabase 데이터를 DesignToken 형식으로 변환
      const formattedTokens = data?.map(token => ({
        ...token,
        type: token.category as TokenType,
        value: typeof token.value === 'string' ? token.value : token.value as TokenValue
      })) || [];

      set({
        tokens: formattedTokens,
        lastFetch: now
      });

      // iframe 프리뷰에 테마 업데이트 알림 (XStudio iframe 통신 패턴)
      window.postMessage({
        type: "UPDATE_THEME_TOKENS",
        tokens: formattedTokens
      }, window.location.origin);

    } catch (error) {
      console.error('토큰 로드 실패:', error);
    }
  },

  getStyleObject: () => {
    const { tokens } = get();
    const styleObject: Record<string, string> = {};

    tokens.forEach(token => {
      const cssVar = token.css_variable || `--${token.name.toLowerCase().replace(/\s+/g, '-')}`;
      let cssValue: string;

      if (typeof token.value === 'object') {
        cssValue = JSON.stringify(token.value);
      } else {
        cssValue = token.value as string;
      }

      styleObject[cssVar] = cssValue;
    });

    return styleObject;
  },

  updateIframeStyles: () => {
    const { getStyleObject } = get();
    const styleObject = getStyleObject();

    // Apply styles to parent document
    let parentStyleElement = document.getElementById('theme-tokens');
    if (!parentStyleElement) {
      parentStyleElement = document.createElement('style');
      parentStyleElement.id = 'theme-tokens';
      document.head.appendChild(parentStyleElement);
    }

    // Convert style object to CSS string
    const cssString = `:root {\n${Object.entries(styleObject)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n')}\n}`;

    parentStyleElement.textContent = cssString;
  },

  // 추가된 토큰 관리 액션 (XStudio 패턴: Immer로 불변성 보장)
  setTokens: (tokens) => set(
    produce((state: ThemeStore) => {
      state.tokens = tokens;
    })
  ),

  updateToken: (tokenId, value) => set(
    produce((state: ThemeStore) => {
      const tokenIndex = state.tokens.findIndex(token => token.id === tokenId);
      if (tokenIndex !== -1) {
        state.tokens[tokenIndex].value = value;
        state.tokens[tokenIndex].updated_at = new Date().toISOString();
      }
    })
  ),

  addToken: (token) => set(
    produce((state: ThemeStore) => {
      const existingIndex = state.tokens.findIndex(t => t.id === token.id);
      if (existingIndex === -1) {
        state.tokens.push(token);
        // XStudio 패턴: 자동 정렬
        state.tokens.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type.localeCompare(b.type);
          }
          return a.name.localeCompare(b.name);
        });
      }
    })
  ),

  removeToken: (tokenId) => set(
    produce((state: ThemeStore) => {
      state.tokens = state.tokens.filter(token => token.id !== tokenId);
    })
  )
}));