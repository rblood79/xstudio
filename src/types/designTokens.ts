export type TokenType = 'color' | 'typography' | 'spacing' | 'shadow' | 'border';

export interface ColorValue {
    h: number; // hue (0-360)
    s: number; // saturation (0-100)
    l: number; // lightness (0-100)
    a: number; // alpha (0-1)
}

export interface TypographyValue {
    fontFamily: string;
    fontSize: string;
    fontWeight: number;
    lineHeight: number;
}

export interface ShadowValue {
    offsetX: string;
    offsetY: string;
    blur: string;
    spread: string;
    color: string;
}

export interface BorderValue {
    width: string;
    style: string;
    color: string;
}

export type TokenValue = ColorValue | TypographyValue | ShadowValue | BorderValue | string;

export interface DesignToken {
    id: string;
    project_id: string;
    name: string;
    type: TokenType;
    value: TokenValue;
    created_at: string;
} 