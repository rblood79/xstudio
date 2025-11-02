
import type { DesignToken, TokenValue } from '../../types/theme';
import type { TokenType } from '../../types/theme';
import { MessageService } from '../../utils/messaging';
import { tokenToCSS } from '../../utils/theme/tokenToCss';

interface CssPair { cssVar: string; value: string; }

let pendingVars: CssPair[] | null = null;
let lastSig = '';

function toCssVar(name: string, type: TokenType) {
    const cleanName = name
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .toLowerCase();

    return `--${type}-${cleanName}`;
}

export function resolveTokens(tokens: DesignToken[]) {
    const raw = tokens.filter(t => t.scope === 'raw');
    const rawMap = new Map(raw.map(r => [r.name, r]));
    const out: { cssVar: string; value: string; name: string; isDark?: boolean }[] = [];

    // Raw 토큰 처리 - tokenToCSS 사용
    for (const r of raw) {
        const cssVars = tokenToCSS(r);
        const isDark = r.name.endsWith('.dark');

        // tokenToCSS는 여러 CSS 변수를 반환할 수 있음 (Typography 등)
        for (const [cssVar, value] of Object.entries(cssVars)) {
            // .dark suffix 제거 (CSS 변수명은 동일하게 유지)
            const cleanCssVar = isDark ? cssVar.replace(/\.dark$/, '').replace(/-dark$/, '') : cssVar;
            out.push({ name: r.name, cssVar: cleanCssVar, value, isDark });
        }
    }

    // Semantic 토큰 처리
    for (const s of tokens.filter(t => t.scope === 'semantic')) {
        const referencedRaw = s.alias_of && rawMap.get(s.alias_of);
        const isDark = s.name.endsWith('.dark');

        if (referencedRaw) {
            // Alias가 있으면 raw 토큰의 CSS 변수를 참조
            const rawCssVars = tokenToCSS(referencedRaw);
            const primaryCssVar = Object.keys(rawCssVars)[0]; // 첫 번째 CSS 변수 사용
            const semanticCssVar = s.css_variable || toCssVar(s.name, s.type);
            const cleanCssVar = isDark ? semanticCssVar.replace(/\.dark$/, '').replace(/-dark$/, '') : semanticCssVar;
            out.push({
                name: s.name,
                cssVar: cleanCssVar,
                value: `var(${primaryCssVar})`,
                isDark
            });
        } else {
            // Alias가 없으면 자체 값 사용
            const cssVars = tokenToCSS(s);
            for (const [cssVar, value] of Object.entries(cssVars)) {
                const cleanCssVar = isDark ? cssVar.replace(/\.dark$/, '').replace(/-dark$/, '') : cssVar;
                out.push({ name: s.name, cssVar: cleanCssVar, value, isDark });
            }
        }
    }

    return out;
}

function sig(vars: CssPair[]) {
    return vars.map(v => v.cssVar + ':' + v.value).join('|');
}

function applyToDoc(vars: { cssVar: string; value: string; isDark?: boolean }[], doc: Document) {
    let style = doc.getElementById('design-theme-vars') as HTMLStyleElement | null;
    if (!style) {
        style = doc.createElement('style');
        style.id = 'design-theme-vars';
        doc.head.appendChild(style);
    }

    // Light 모드 토큰 (isDark가 없거나 false인 것들)
    const lightVars = vars.filter(v => !v.isDark);
    // Dark 모드 토큰 (isDark가 true인 것들)
    const darkVars = vars.filter(v => v.isDark);

    let cssText = '';

    // Light 모드 CSS 생성
    if (lightVars.length > 0) {
        cssText += ':root {\n' +
            lightVars.map(v => `  ${v.cssVar}: ${v.value};`).join('\n') +
            '\n}\n';
    }

    // Dark 모드 CSS 생성
    if (darkVars.length > 0) {
        cssText += '\n[data-theme="dark"] {\n' +
            darkVars.map(v => `  ${v.cssVar}: ${v.value};`).join('\n') +
            '\n}\n';
    }

    style.textContent = cssText;
}

export function injectCss(vars: CssPair[]) {
    // 부모 문서
    applyToDoc(vars, document);

    // 변경 없으면 중단
    const s = sig(vars);
    if (s === lastSig) return;
    lastSig = s;

    // iframe 전송
    const iframe = MessageService.getIframe();
    if (iframe?.contentWindow) {
        MessageService.sendToIframe('THEME_VARS', { vars });
    } else {
        pendingVars = vars;
    }
}

// PREVIEW_READY 수신 → 누락분 재전송
if (typeof window !== 'undefined') {
    window.addEventListener('message', ev => {
        const d = ev.data;
        if (!d || typeof d !== 'object' || d.type !== 'PREVIEW_READY') return;
        if (pendingVars) {
            const iframe = MessageService.getIframe();
            if (iframe?.contentWindow) {
                MessageService.sendToIframe('THEME_VARS', { vars: pendingVars });
                pendingVars = null;
            }
        }
    });
}