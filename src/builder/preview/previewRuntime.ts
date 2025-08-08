function applyThemeVars(vars: { cssVar: string; value: string }[]) {
    let style = document.getElementById('design-theme-vars') as HTMLStyleElement | null;
    if (!style) {
        style = document.createElement('style');
        style.id = 'design-theme-vars';
        document.head.appendChild(style);
    }
    style.textContent =
        ':root {\n' +
        vars.map(v => `${v.cssVar}: ${v.value};`).join('\n') +
        '\n}';
}

window.addEventListener('message', ev => {
    const data = ev.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'THEME_VARS' && Array.isArray(data.vars)) {
        applyThemeVars(data.vars);
        // 필요 시 ACK 보낼 수 있음
    }
    // ...existing handlers...
});

// DOM 준비되면 부모에 준비 알림
window.addEventListener('DOMContentLoaded', () => {
    try {
        window.parent.postMessage(
            { type: 'PREVIEW_READY' },
            window.location.origin
        );
    } catch (e) {
        // ignore
    }
});