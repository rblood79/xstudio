import { useCallback } from 'react';
import { useStore } from '../stores';
import { ColorValue } from '../../types/theme';
import { MessageService } from '../../utils/messaging';

export interface UseThemeManagerReturn {
    applyThemeTokens: () => void;
    loadProjectTheme: (projectId: string) => void;
}

export const useThemeManager = (): UseThemeManagerReturn => {
    const rawTokens = useStore(state => state.rawTokens);
    const semanticTokens = useStore(state => state.semanticTokens);
    const loadTheme = useStore(state => state.loadTheme);

    const applyThemeTokens = useCallback(() => {
        const iframe = MessageService.getIframe();
        if (!iframe?.contentDocument) return;

        // 모든 토큰을 하나의 배열로 합치기
        const allTokens = [...rawTokens, ...semanticTokens];

        // Raw 토큰 맵 생성 (alias 참조용)
        const rawMap = new Map(rawTokens.map(r => [r.name, r]));

        // Helper function for processing token value
        const processTokenValue = (token: { value: unknown }) => {
            if (typeof token.value === 'object' && token.value !== null) {
                if ('h' in token.value) {
                    // ColorValue
                    const color = token.value as ColorValue;
                    return `hsla(${color.h}, ${color.s}%, ${color.l}%, ${color.a})`;
                } else {
                    return JSON.stringify(token.value);
                }
            } else {
                return String(token.value);
            }
        };

        // CSS 변수 생성
        const cssVariables = allTokens
            .map(token => {
                // css_variable이 있으면 사용하고, 없으면 Tailwind 호환 규칙으로 생성
                const cssVar = token.css_variable || `--${token.type}-${token.name.toLowerCase().replace(/\./g, '-')}`;
                let cssValue: string;

                // Semantic 토큰이고 alias_of가 있으면 Raw 토큰 참조
                if (token.scope === 'semantic' && token.alias_of) {
                    const referencedRaw = rawMap.get(token.alias_of);
                    if (referencedRaw) {
                        const refCssVar = referencedRaw.css_variable || `--${referencedRaw.type}-${referencedRaw.name.toLowerCase().replace(/\./g, '-')}`;
                        cssValue = `var(${refCssVar})`;
                    } else {
                        // fallback to direct value
                        cssValue = processTokenValue(token);
                    }
                } else {
                    cssValue = processTokenValue(token);
                }

                return `${cssVar}: ${cssValue};`;
            })
            .join('\n  ');

        const cssString = `:root {\n  ${cssVariables}\n}`;

        // Apply styles to parent document
        let parentStyleElement = document.getElementById('theme-tokens');
        if (!parentStyleElement) {
            parentStyleElement = document.createElement('style');
            parentStyleElement.id = 'theme-tokens';
            document.head.appendChild(parentStyleElement);
        }

        parentStyleElement.textContent = cssString;

        // Create or update style element in iframe
        let styleElement = iframe.contentDocument.getElementById('theme-tokens');
        if (!styleElement) {
            styleElement = iframe.contentDocument.createElement('style');
            styleElement.id = 'theme-tokens';
            iframe.contentDocument.head.appendChild(styleElement);
        }

        styleElement.textContent = cssString;
    }, [rawTokens, semanticTokens]);

    const loadProjectTheme = useCallback((projectId: string) => {
        loadTheme(projectId);
    }, [loadTheme]);

    return {
        applyThemeTokens,
        loadProjectTheme
    };
};
