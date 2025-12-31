import { DesignToken, TokenValue } from '../../../../types/theme';

interface TokenListProps {
    tokens: DesignToken[];
    scope: 'raw' | 'semantic';
    onUpdate: (name: string, scope: 'raw' | 'semantic', value: TokenValue) => void;
    onDelete: (name: string, scope: 'raw' | 'semantic') => void;
}

export function TokenList({ tokens, scope, onUpdate, onDelete }: TokenListProps) {
    const confirmDelete = (name: string) => {
        if (window.confirm(`토큰 삭제: ${name}?`)) {
            onDelete(name, scope);
        }
    };

    return (
        <ul className="flex flex-col gap-2">
            {tokens.map(t => (
                <li
                    key={t.name}
                    className="flex items-center gap-2 group"
                >
                    <span className="w-48 text-[11px] truncate">
                        {t.name}
                    </span>
                    {scope === 'semantic' && t.alias_of && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200">
                            alias:{' '}
                            <code className="text-[10px]">
                                {t.alias_of}
                            </code>
                        </span>
                    )}
                    <input
                        className="flex-1 border px-2 py-1 rounded text-xs"
                        aria-label={`${t.name} 토큰 값`}
                        defaultValue={
                            scope === 'semantic' && t.alias_of
                                ? t.alias_of
                                : typeof t.value === 'string'
                                    ? t.value
                                    : JSON.stringify(t.value)
                        }
                        onBlur={e => {
                            if (scope === 'semantic' && t.alias_of) {
                                // alias 기반이면 편집 시 alias 갱신
                                onUpdate(t.name, scope, t.value);
                            } else {
                                let val: TokenValue = e.target.value;
                                if (!(t.type === 'color' && /^#|rgb/i.test(val))) {
                                    try {
                                        val = JSON.parse(val);
                                    } catch {
                                        // 파싱 실패 시 문자열 그대로 사용
                                    }
                                }
                                onUpdate(t.name, scope, val);
                            }
                        }}
                    />
                    <button
                        onClick={() => confirmDelete(t.name)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] px-2 py-1 border rounded border-red-300 text-red-600 hover:bg-red-50 transition"
                        title="삭제"
                    >
                        X
                    </button>
                </li>
            ))}
            {tokens.length === 0 && (
                <li className="text-[11px] text-neutral-400">
                    (없음)
                </li>
            )}
        </ul>
    );
}