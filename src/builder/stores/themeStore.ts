import { create } from 'zustand';
import { supabase } from '../../env/supabase.client';
import { ColorValue } from '../../types/designTokens';

interface DesignToken {
    id: string;
    project_id: string;
    name: string;
    type: 'color' | 'typography' | 'spacing' | 'shadow' | 'border';
    value: ColorValue;
    created_at: string;
}

interface ThemeState {
    tokens: DesignToken[];
    projectId: string | null;
    setProjectId: (projectId: string) => void;
    setTokens: (tokens: DesignToken[]) => void;
    fetchTokens: (projectId: string) => Promise<void>;
    getStyleObject: () => Record<string, string>;
    updateIframeStyles: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    tokens: [],
    projectId: null,
    setProjectId: (projectId: string) => set({ projectId }),
    setTokens: (tokens: DesignToken[]) => set({ tokens }),
    fetchTokens: async (projectId: string) => {
        const { data, error } = await supabase
            .from('design_tokens')
            .select('*')
            .eq('project_id', projectId);

        if (error) {
            console.error('Error fetching tokens:', error);
            return;
        }

        set({ tokens: data || [] });
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
        const styleObject = get().getStyleObject();

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