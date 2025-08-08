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
    css_variable?: string; // CSS 변수명 추가
    category?: string; // 카테고리 추가 (Supabase 테이블과 호환)
    created_at: string;
    updated_at?: string;
}

// 새 토큰 입력을 위한 인터페이스
export interface NewTokenInput {
    name: string;
    type: TokenType;
    value: TokenValue;
    css_variable?: string;
}

// 카테고리 설정 인터페이스
export interface CategoryConfig {
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    placeholder: string;
    validator?: (value: TokenValue) => boolean;
}