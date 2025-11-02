// 통합된 테마 관련 타입 정의
export interface DesignTheme {
    id: string;
    project_id: string;
    name: string;
    status: 'active' | 'draft' | 'archived';
    version: number;
    parent_theme_id?: string | null;
    supports_dark_mode?: boolean; // 다크모드 지원 여부 (기본값: true)
    created_at: string;
    updated_at: string;
}

export type DesignTokenScope = 'raw' | 'semantic';
export type TokenType = 'color' | 'typography' | 'spacing' | 'shadow' | 'border' | 'radius' | 'font' | 'size' | 'other';

// 색상 관련 타입
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

// 통합된 DesignToken 인터페이스 (css_variable을 선택적으로 만듦)
export interface DesignToken {
    id: string;
    project_id: string;
    theme_id: string;
    name: string;            // 예: color.brand.primary
    type: TokenType;         // color | typography | spacing | ...
    value: TokenValue;       // JSONB
    scope: DesignTokenScope; // raw | semantic
    alias_of?: string | null;
    css_variable?: string;   // CSS 변수명 (선택적)
    created_at?: string;
    updated_at?: string;
}

// 새 토큰 입력을 위한 인터페이스
export interface NewTokenInput {
    name: string;
    type: TokenType;
    value: TokenValue;
    scope: DesignTokenScope;
    alias_of?: string | null;
    css_variable?: string;
}

// Tailwind 색상 타입 정의
export type TailwindColorName =
    | 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'
    | 'red' | 'orange' | 'amber' | 'yellow' | 'lime'
    | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky'
    | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia'
    | 'pink' | 'rose';

export type NeutralColorName = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone';

// 색상 정의 방식
export type ThemeColor =
    | { type: 'tailwind'; color: TailwindColorName }
    | { type: 'custom'; color: ColorValue };

// 색상 스케일 관련 타입
export type ScaleStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

export interface ColorScaleMap {
    [key: number]: ColorValue;
}

export interface ColorUsage {
    [key: number]: string;
} 