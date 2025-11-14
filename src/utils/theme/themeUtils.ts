import type { DesignToken, ColorValue, TypographyValue, ShadowValue, BorderValue, TokenValue, TokenType } from '../../types/theme';

// 토큰 값을 CSS 값으로 변환
export function tokenValueToCss(token: DesignToken): string {
    const { value } = token;

    switch (token.type) {
        case 'color':
            if (typeof value === 'object' && 'h' in value) {
                const color = value as ColorValue;
                return `hsla(${color.h}, ${color.s}%, ${color.l}%, ${color.a})`;
            }
            return value as string;

        case 'typography':
            if (typeof value === 'object' && 'fontFamily' in value) {
                const typo = value as TypographyValue;
                return `${typo.fontWeight} ${typo.fontSize}/${typo.lineHeight} ${typo.fontFamily}`;
            }
            return value as string;

        case 'shadow':
            if (typeof value === 'object' && 'offsetX' in value) {
                const shadow = value as ShadowValue;
                return `${shadow.offsetX} ${shadow.offsetY} ${shadow.blur} ${shadow.spread} ${shadow.color}`;
            }
            return value as string;

        case 'border':
            if (typeof value === 'object' && 'width' in value) {
                const border = value as BorderValue;
                return `${border.width} ${border.style} ${border.color}`;
            }
            return value as string;

        default:
            return value as string;
    }
}

// CSS 변수명 생성 (Tailwind CSS 호환)
export function toCssVar(name: string, type: TokenType): string {
    const cleanName = name
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .toLowerCase();

    return `--${type}-${cleanName}`;
}

// 토큰 배열을 CSS 변수로 변환
export function generateCssVariables(tokens: DesignToken[]): string {
    return tokens
        .map(token => {
            const cssVar = token.css_variable || toCssVar(token.name, token.type);
            return `${cssVar}: ${tokenValueToCss(token)};`;
        })
        .join('\n');
}

// CSS :root 블록 생성
export function generateCssRoot(tokens: DesignToken[]): string {
    const cssVariables = generateCssVariables(tokens);
    return `:root {\n${cssVariables}\n}`;
}

// 토큰 유효성 검증
export function validateTokenValue(type: string, value: TokenValue): boolean {
    switch (type) {
        case 'color':
            if (typeof value === 'string') {
                return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value) ||
                    /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(value) ||
                    /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/.test(value);
            }
            return typeof value === 'object' && 'h' in value;

        case 'spacing':
            return typeof value === 'string' && /^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/.test(value);

        case 'typography':
            return (typeof value === 'object' && 'fontFamily' in value) ||
                (typeof value === 'string' && /^\d+(\.\d+)?(px|rem|em)$/.test(value));

        default:
            return typeof value === 'string' && value.length > 0;
    }
}

// iframe에 테마 CSS 주입
export function injectThemeToIframe(iframe: HTMLIFrameElement, tokens: DesignToken[]): void {
    if (!iframe.contentWindow || !iframe.contentDocument) {
        console.warn('iframe이 준비되지 않았습니다.');
        return;
    }

    try {
        // 기존 테마 스타일 제거
        const existingStyle = iframe.contentDocument.getElementById('xstudio-theme');
        if (existingStyle) {
            existingStyle.remove();
        }

        // 새 테마 스타일 추가
        const styleElement = iframe.contentDocument.createElement('style');
        styleElement.id = 'xstudio-theme';
        styleElement.textContent = generateCssRoot(tokens);
        iframe.contentDocument.head.appendChild(styleElement);
    } catch (error) {
        console.error('테마 CSS 주입 실패:', error);
    }
}
