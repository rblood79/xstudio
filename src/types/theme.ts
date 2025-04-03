import { ColorValue } from './designTokens';

// Tailwind 색상 타입 정의
export type TailwindColorName =
    | 'slate'
    | 'gray'
    | 'zinc'
    | 'neutral'
    | 'stone'
    | 'red'
    | 'orange'
    | 'amber'
    | 'yellow'
    | 'lime'
    | 'green'
    | 'emerald'
    | 'teal'
    | 'cyan'
    | 'sky'
    | 'blue'
    | 'indigo'
    | 'violet'
    | 'purple'
    | 'fuchsia'
    | 'pink'
    | 'rose';

export type NeutralColorName = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone';

// 색상 정의 방식
export type ThemeColor =
    | { type: 'tailwind'; color: TailwindColorName }
    | { type: 'custom'; color: ColorValue };

// 이전 버전과의 호환성을 위한 인터페이스
export interface LegacyThemeColors {
    accent: ColorValue;
}

export interface ThemeColors {
    theme: ThemeColor;
    neutral: NeutralColorName;
}

// 색상 스케일 관련 타입
export type ScaleStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

export interface ColorScaleMap {
    [key: number]: ColorValue;
}

export interface ColorUsage {
    [key: number]: string;
} 