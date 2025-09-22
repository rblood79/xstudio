
import type { DesignToken, TokenValue } from '../../types/theme';
import type { TokenType } from '../../types/theme';
import { MessageService } from '../../utils/messaging';

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

function normalize(val: TokenValue): string {
    if (val == null) return '';
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    if (typeof val === 'object' && 'r' in val && 'g' in val && 'b' in val) {
        const color = val as { r: number; g: number; b: number; a?: number };
        return color.a == null || color.a === 1
            ? `rgb(${color.r} ${color.g} ${color.b})`
            : `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
    }
    return JSON.stringify(val);
}

export function resolveTokens(tokens: DesignToken[]) {
    const raw = tokens.filter(t => t.scope === 'raw');
    const rawMap = new Map(raw.map(r => [r.name, r]));
    const out: { cssVar: string; value: string; name: string }[] = [];

    for (const r of raw) {
        out.push({ name: r.name, cssVar: toCssVar(r.name, r.type), value: normalize(r.value) });
    }
    for (const s of tokens.filter(t => t.scope === 'semantic')) {
        const referencedRaw = s.alias_of && rawMap.get(s.alias_of);
        const value = referencedRaw
            ? `var(${toCssVar(referencedRaw.name, referencedRaw.type)})`
            : normalize(s.value);
        out.push({ name: s.name, cssVar: toCssVar(s.name, s.type), value });
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