import { create } from 'zustand';
import { supabase } from '../../env/supabase.client';

interface ColorValue {
    h: number; // hue (0-360)
    s: number; // saturation (0-100)
    l: number; // lightness (0-100)
    a: number; // alpha (0-1)
}

interface TypographyValue {
    fontFamily: string;
    fontSize: string;
    fontWeight: number;
    lineHeight: number;
}

interface ShadowValue {
    offsetX: string;
    offsetY: string;
    blur: string;
    spread: string;
    color: string;
}

interface BorderValue {
    width: string;
    style: string;
    color: string;
}

type TokenValue = ColorValue | TypographyValue | ShadowValue | BorderValue | string;

interface DesignToken {
    id: string;
    project_id: string;
    name: string;
    type: 'color' | 'typography' | 'spacing' | 'shadow' | 'border';
    value: TokenValue;
    created_at: string;
}

interface ThemeState {
    tokens: DesignToken[];
    projectId: string | null;
    setProjectId: (projectId: string) => void;
    setTokens: (tokens: DesignToken[]) => void;
    fetchTokens: (projectId: string) => Promise<void>;
    getStyleObject: () => Record<string, string>;
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
            } else if (token.type === 'typography' && typeof value === 'object' && 'fontFamily' in value) {
                const typographyValue = value as TypographyValue;
                styleObject[`--typography-${token.name}-family`] = typographyValue.fontFamily;
                styleObject[`--typography-${token.name}-size`] = typographyValue.fontSize;
                styleObject[`--typography-${token.name}-weight`] = String(typographyValue.fontWeight);
                styleObject[`--typography-${token.name}-line-height`] = String(typographyValue.lineHeight);
            } else if (token.type === 'spacing' && typeof value === 'string') {
                styleObject[`--spacing-${token.name}`] = value;
            } else if (token.type === 'shadow' && typeof value === 'object' && 'offsetX' in value) {
                const shadowValue = value as ShadowValue;
                styleObject[`--shadow-${token.name}`] = `${shadowValue.offsetX} ${shadowValue.offsetY} ${shadowValue.blur} ${shadowValue.spread} ${shadowValue.color}`;
            } else if (token.type === 'border' && typeof value === 'object' && 'width' in value) {
                const borderValue = value as BorderValue;
                styleObject[`--border-${token.name}-width`] = borderValue.width;
                styleObject[`--border-${token.name}-style`] = borderValue.style;
                styleObject[`--border-${token.name}-color`] = borderValue.color;
            }
        });

        return styleObject;
    }
})); 