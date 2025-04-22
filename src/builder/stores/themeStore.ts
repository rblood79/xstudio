import { create } from 'zustand';
import { supabase } from '../../env/supabase.client';
import { DesignToken, ColorValue } from '../../types/designTokens';

interface ThemeStore {
  projectId: string | null;
  tokens: DesignToken[];
  lastFetch: number;
  setProjectId: (id: string) => void;
  fetchTokens: (projectId: string) => Promise<void>;
  updateIframeStyles: () => void;
  getStyleObject: () => Record<string, string>;
}

const CACHE_DURATION = 5000; // 5 seconds cache

export const useThemeStore = create<ThemeStore>((set, get) => ({
  projectId: null,
  tokens: [],
  lastFetch: 0,

  setProjectId: (id) => set({ projectId: id }),

  fetchTokens: async (projectId) => {
    const now = Date.now();
    const { lastFetch } = get();

    // Prevent fetching if the last fetch was too recent
    if (now - lastFetch < CACHE_DURATION) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('design_tokens')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;

      set({
        tokens: data || [],
        lastFetch: now
      });
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  },

  getStyleObject: () => {
    const { tokens } = get();
    const styleObject: Record<string, string> = {};

    tokens.forEach(token => {
      const value = token.value;
      if (token.type === 'color' && typeof value === 'object' && 'h' in value) {
        const colorValue = value as ColorValue;
        styleObject[`--color-${token.name}`] = `hsl(${colorValue.h}deg ${colorValue.s}% ${colorValue.l}% / ${colorValue.a})`;
      }
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

    // Apply styles to iframes
    requestAnimationFrame(() => {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            { type: 'UPDATE_THEME_TOKENS', styles: styleObject },
            window.location.origin
          );
        }
      });
    });
  }
})); 