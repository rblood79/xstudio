import { create } from 'zustand';
import { supabase } from '../../env/supabase.client';

interface ColorValue {
    r: number;
    g: number;
    b: number;
    a: number;
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
            if (token.type === 'color' && typeof value === 'object' && 'r' in value) {
                const colorValue = value as ColorValue;
                styleObject[`--${token.name}-${token.type}`] = `rgba(${colorValue.r}, ${colorValue.g}, ${colorValue.b}, ${colorValue.a})`;
            } else if (token.type === 'typography' && typeof value === 'object' && 'fontFamily' in value) {
                const typographyValue = value as TypographyValue;
                styleObject[`--${token.name}-${token.type}-font-family`] = typographyValue.fontFamily;
                styleObject[`--${token.name}-${token.type}-font-size`] = typographyValue.fontSize;
                styleObject[`--${token.name}-${token.type}-font-weight`] = String(typographyValue.fontWeight);
                styleObject[`--${token.name}-${token.type}-line-height`] = String(typographyValue.lineHeight);
            } else if (token.type === 'spacing' && typeof value === 'string') {
                styleObject[`--${token.name}-${token.type}`] = value;
            } else if (token.type === 'shadow' && typeof value === 'object' && 'offsetX' in value) {
                const shadowValue = value as ShadowValue;
                styleObject[`--${token.name}-${token.type}`] = `${shadowValue.offsetX} ${shadowValue.offsetY} ${shadowValue.blur} ${shadowValue.spread} ${shadowValue.color}`;
            } else if (token.type === 'border' && typeof value === 'object' && 'width' in value) {
                const borderValue = value as BorderValue;
                styleObject[`--${token.name}-${token.type}`] = `${borderValue.width} ${borderValue.style} ${borderValue.color}`;
            }
        });

        return styleObject;
    }
})); 