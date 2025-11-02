
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
    const out: { cssVar: string; value: string; name: string }[] = [];

    // Raw 토큰 처리 - tokenToCSS 사용
    for (const r of raw) {
        const cssVars = tokenToCSS(r);

        // tokenToCSS는 여러 CSS 변수를 반환할 수 있음 (Typography 등)
        for (const [cssVar, value] of Object.entries(cssVars)) {
            out.push({ name: r.name, cssVar, value });
        }
    }

    // Semantic 토큰 처리
    for (const s of tokens.filter(t => t.scope === 'semantic')) {
        const referencedRaw = s.alias_of && rawMap.get(s.alias_of);

        if (referencedRaw) {
            // Alias가 있으면 raw 토큰의 CSS 변수를 참조
            const rawCssVars = tokenToCSS(referencedRaw);
            const primaryCssVar = Object.keys(rawCssVars)[0]; // 첫 번째 CSS 변수 사용
            const semanticCssVar = s.css_variable || toCssVar(s.name, s.type);
            out.push({
                name: s.name,
                cssVar: semanticCssVar,
                value: `var(${primaryCssVar})`
            });
        } else {
            // Alias가 없으면 자체 값 사용
            const cssVars = tokenToCSS(s);
            for (const [cssVar, value] of Object.entries(cssVars)) {
                out.push({ name: s.name, cssVar, value });
            }
        }
    }

    return out;
}

function sig(vars: CssPair[]) {
    return vars.map(v => v.cssVar + ':' + v.value).join('|');
}

function applyToDoc(vars: CssPair[], doc: Document) {
    let style = doc.getElementById('design-theme-vars') as HTMLStyleElement | null;
    if (!style) {
        style = doc.createElement('style');
        style.id = 'design-theme-vars';
        doc.head.appendChild(style);
    }
    style.textContent =
        ':root {\n' +
        vars.map(v => `  ${v.cssVar}: ${v.value};`).join('\n') +
        '\n}';
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