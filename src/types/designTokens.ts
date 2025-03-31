export type TokenType = 'color' | 'typography' | 'spacing' | 'shadow' | 'border';

export interface ColorValue {
    r: number;
    g: number;
    b: number;
    a: number;
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