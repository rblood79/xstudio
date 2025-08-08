import React, { useState } from 'react';
import { useThemeStore } from '../stores/theme';

interface Props {
    projectId: string;
}

interface NewTokenFormState {
    scope: 'raw' | 'semantic';
    name: string;
    type: string;
    value: string;
    alias_of: string;
    error: string | null;
}

const NAME_RE =
    /^[a-z0-9._-]+(?:\.[a-z0-9._-]+)*$/; // color.brand.primary 형태 허용

export default function ThemeEditor({ projectId }: Props) {
    const rawTokens = useThemeStore(s => s.rawTokens);
    const semanticTokens = useThemeStore(s => s.semanticTokens);
    const loading = useThemeStore(s => s.loading);
    const dirty = useThemeStore(s => s.dirty);
    const updateTokenValue = useThemeStore(s => s.updateTokenValue);
    const addToken = useThemeStore(s => s.addToken);
    const deleteToken = useThemeStore(s => s.deleteToken);
    const activeTheme = useThemeStore(s => s.activeTheme);
    const snapshotVersion = useThemeStore(s => s.snapshotVersion);
    const lastError = useThemeStore(s => s.lastError);

    const [form, setForm] = useState<NewTokenFormState>({
        scope: 'raw',
        name: '',
        type: 'color',
        value: '',
        alias_of: '',
        error: null
    });

    if (loading) return <div className="p-3 text-xs">Loading theme...</div>;

    const handleAdd = () => {
        // validate
        if (!form.name.trim() || !NAME_RE.test(form.name)) {
            setForm(f => ({ ...f, error: '이름 형식 오류' }));
            return;
        }
        const existsRaw =
            rawTokens.some(t => t.name === form.name) ||
            semanticTokens.some(t => t.name === form.name);
        if (existsRaw) {
            setForm(f => ({ ...f, error: '이미 존재하는 이름' }));
            return;
        }
        let value: any = form.value;
        if (!(form.type === 'color' && /^#|rgb/i.test(value))) {
            try {
                value = JSON.parse(value);
            } catch {
                // 문자열 그대로
            }
        }
        const alias = form.scope === 'semantic' && form.alias_of
            ? form.alias_of
            : undefined;
        addToken(form.scope, form.name, form.type, value, alias);
        setForm({
            scope: form.scope,
            name: '',
            type: form.type,
            value: '',
            alias_of: '',
            error: null
        });
    };

    const confirmDelete = (name: string, scope: 'raw' | 'semantic') => {
        if (window.confirm(`토큰 삭제: ${name}?`)) {
            deleteToken(name, scope);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-3">
            <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                    Theme: {activeTheme?.name}
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={dirty}
                        onClick={() => snapshotVersion()}
                        className="text-[11px] px-2 py-1 rounded border
                                   border-neutral-300 hover:bg-neutral-100
                                   disabled:opacity-40"
                        title="버전 스냅샷 생성"
                    >
                        Snapshot v{activeTheme?.version}
                    </button>
                    {dirty && (
                        <span className="text-[10px] text-orange-500">
                            Saving…
                        </span>
                    )}
                </div>
            </header>
            {lastError && (
                <div className="text-[11px] text-red-600">{lastError}</div>
            )}

            {/* Raw Tokens */}
            <section className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-neutral-600">
                    Raw Tokens
                </h4>
                <ul className="flex flex-col gap-2">
                    {rawTokens.map(t => (
                        <li
                            key={t.name}
                            className="flex items-center gap-2 group"
                        >
                            <span className="w-48 text-[11px] truncate">
                                {t.name}
                            </span>
                            <input
                                className="flex-1 border px-2 py-1 rounded
                                           text-xs"
                                defaultValue={
                                    typeof t.value === 'string'
                                        ? t.value
                                        : JSON.stringify(t.value)
                                }
                                onBlur={e => {
                                    let val: any = e.target.value;
                                    if (!(
                                        t.type === 'color' &&
                                        /^#|rgb/i.test(val)
                                    )) {
                                        try {
                                            val = JSON.parse(val);
                                        } catch { }
                                    }
                                    updateTokenValue(t.name, 'raw', val);
                                }}
                            />
                            <button
                                onClick={() =>
                                    confirmDelete(t.name, 'raw')
                                }
                                className="opacity-0 group-hover:opacity-100
                                           text-[10px] px-2 py-1 border rounded
                                           border-red-300 text-red-600
                                           hover:bg-red-50 transition"
                                title="삭제"
                            >
                                X
                            </button>
                        </li>
                    ))}
                    {rawTokens.length === 0 && (
                        <li className="text-[11px] text-neutral-400">
                            (없음)
                        </li>
                    )}
                </ul>
            </section>

            {/* Semantic Tokens */}
            <section className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-neutral-600">
                    Semantic Tokens
                </h4>
                <ul className="flex flex-col gap-2">
                    {semanticTokens.map(t => (
                        <li
                            key={t.name}
                            className="flex items-center gap-2 group"
                        >
                            <span className="w-48 text-[11px] truncate">
                                {t.name}
                            </span>
                            {t.alias_of && (
                                <span className="text-[10px] px-1.5 py-0.5
                                                 rounded bg-neutral-100
                                                 border border-neutral-200">
                                    alias:{' '}
                                    <code className="text-[10px]">
                                        {t.alias_of}
                                    </code>
                                </span>
                            )}
                            <input
                                className="flex-1 border px-2 py-1 rounded
                                           text-xs"
                                defaultValue={
                                    t.alias_of
                                        ? t.alias_of
                                        : typeof t.value === 'string'
                                            ? t.value
                                            : JSON.stringify(t.value)
                                }
                                onBlur={e => {
                                    if (t.alias_of) {
                                        // alias 기반이면 편집 시 alias 갱신
                                        updateTokenValue(
                                            t.name,
                                            'semantic',
                                            t.value
                                        );
                                    } else {
                                        let val: any = e.target.value;
                                        if (!(
                                            t.type === 'color' &&
                                            /^#|rgb/i.test(val)
                                        )) {
                                            try {
                                                val = JSON.parse(val);
                                            } catch { }
                                        }
                                        updateTokenValue(
                                            t.name,
                                            'semantic',
                                            val
                                        );
                                    }
                                }}
                            />
                            <button
                                onClick={() =>
                                    confirmDelete(t.name, 'semantic')
                                }
                                className="opacity-0 group-hover:opacity-100
                                           text-[10px] px-2 py-1 border rounded
                                           border-red-300 text-red-600
                                           hover:bg-red-50 transition"
                            >
                                X
                            </button>
                        </li>
                    ))}
                    {semanticTokens.length === 0 && (
                        <li className="text-[11px] text-neutral-400">
                            (없음)
                        </li>
                    )}
                </ul>
            </section>

            {/* Add Token Form */}
            <section className="flex flex-col gap-2 border-t pt-4">
                <h4 className="text-xs font-semibold text-neutral-600">
                    새 토큰 추가
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <label className="flex flex-col gap-1">
                        <span className="text-neutral-500">Scope</span>
                        <select
                            value={form.scope}
                            onChange={e =>
                                setForm(f => ({
                                    ...f,
                                    scope: e.target
                                        .value as 'raw' | 'semantic'
                                }))
                            }
                            className="border px-2 py-1 rounded"
                        >
                            <option value="raw">raw</option>
                            <option value="semantic">semantic</option>
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-neutral-500">Type</span>
                        <select
                            value={form.type}
                            onChange={e =>
                                setForm(f => ({
                                    ...f,
                                    type: e.target.value
                                }))
                            }
                            className="border px-2 py-1 rounded"
                        >
                            <option value="color">color</option>
                            <option value="spacing">spacing</option>
                            <option value="radius">radius</option>
                            <option value="font">font</option>
                            <option value="size">size</option>
                            <option value="other">other</option>
                        </select>
                    </label>
                    <label className="flex flex-col gap-1 col-span-2">
                        <span className="text-neutral-500">
                            Name (dot 구분)
                        </span>
                        <input
                            value={form.name}
                            onChange={e =>
                                setForm(f => ({
                                    ...f,
                                    name: e.target.value,
                                    error: null
                                }))
                            }
                            placeholder="button.primary.bg"
                            className="border px-2 py-1 rounded"
                        />
                    </label>
                    {form.scope === 'semantic' && (
                        <label className="flex flex-col gap-1 col-span-2">
                            <span className="text-neutral-500">
                                alias_of (raw 토큰명)
                            </span>
                            <input
                                value={form.alias_of}
                                onChange={e =>
                                    setForm(f => ({
                                        ...f,
                                        alias_of: e.target.value
                                    }))
                                }
                                list="raw-token-list"
                                placeholder="color.brand.primary"
                                className="border px-2 py-1 rounded"
                            />
                            <datalist id="raw-token-list">
                                {rawTokens.map(r => (
                                    <option
                                        value={r.name}
                                        key={r.name}
                                    />
                                ))}
                            </datalist>
                        </label>
                    )}
                    <label className="flex flex-col gap-1 col-span-2">
                        <span className="text-neutral-500">Value</span>
                        <input
                            value={form.value}
                            onChange={e =>
                                setForm(f => ({
                                    ...f,
                                    value: e.target.value
                                }))
                            }
                            placeholder={
                                form.scope === 'semantic' &&
                                    form.alias_of
                                    ? '(alias 사용 시 무시)'
                                    : '#3B82F6 또는 JSON'
                            }
                            className="border px-2 py-1 rounded"
                        />
                    </label>
                </div>
                {form.error && (
                    <p className="text-[11px] text-red-500">
                        {form.error}
                    </p>
                )}
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="text-xs px-3 py-1.5 rounded
                                   bg-blue-600 text-white
                                   hover:bg-blue-500 disabled:opacity-50"
                        disabled={!form.name.trim()}
                    >
                        추가
                    </button>
                </div>
            </section>

            <footer className="pt-2 border-t">
                <p className="text-[10px] text-neutral-500">
                    Project: {projectId} | Version: v{activeTheme?.version}
                </p>
            </footer>
        </div>
    );
}