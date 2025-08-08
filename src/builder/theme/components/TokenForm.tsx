import React, { useState } from 'react';
import { DesignToken } from '../../../types/designTheme';

interface TokenFormProps {
    rawTokens: DesignToken[];
    onAdd: (scope: 'raw' | 'semantic', name: string, type: string, value: any, alias_of?: string | null) => void;
}

interface FormState {
    scope: 'raw' | 'semantic';
    name: string;
    type: string;
    value: string;
    alias_of: string;
    error: string | null;
}

const NAME_RE = /^[a-z0-9._-]+(?:\.[a-z0-9._-]+)*$/; // color.brand.primary 형태 허용

export function TokenForm({ rawTokens, onAdd }: TokenFormProps) {
    const [form, setForm] = useState<FormState>({
        scope: 'raw',
        name: '',
        type: 'color',
        value: '',
        alias_of: '',
        error: null
    });

    const handleAdd = () => {
        // validate
        if (!form.name.trim() || !NAME_RE.test(form.name)) {
            setForm(f => ({ ...f, error: '이름 형식 오류' }));
            return;
        }

        const existsRaw = rawTokens.some(t => t.name === form.name);
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

        onAdd(form.scope, form.name, form.type, value, alias);

        setForm({
            scope: form.scope,
            name: '',
            type: form.type,
            value: '',
            alias_of: '',
            error: null
        });
    };

    return (
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
                                scope: e.target.value as 'raw' | 'semantic'
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
                    className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                    disabled={!form.name.trim()}
                >
                    추가
                </button>
            </div>
        </section>
    );
}