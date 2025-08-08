import React, { useState } from 'react';
import { useThemeStore } from '../stores/theme';
import { TokenList } from './components/TokenList';
import { TokenForm } from './components/TokenForm';
import { ThemeHeader } from './components/ThemeHeader';
//import './styles/components.css';

interface Props {
    projectId: string;
}

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

    if (loading) return <div className="p-3 text-xs">Loading theme...</div>;

    return (
        <div className="flex flex-col gap-6 p-3">
            <ThemeHeader
                theme={activeTheme}
                dirty={dirty}
                onSnapshot={snapshotVersion}
            />

            {lastError && (
                <div className="text-[11px] text-red-600">{lastError}</div>
            )}

            {/* Raw Tokens */}
            <section className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-neutral-600">
                    Raw Tokens
                </h4>
                <TokenList
                    tokens={rawTokens}
                    scope="raw"
                    onUpdate={updateTokenValue}
                    onDelete={deleteToken}
                />
            </section>

            {/* Semantic Tokens */}
            <section className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-neutral-600">
                    Semantic Tokens
                </h4>
                <TokenList
                    tokens={semanticTokens}
                    scope="semantic"
                    onUpdate={updateTokenValue}
                    onDelete={deleteToken}
                />
            </section>

            {/* Add Token Form */}
            <TokenForm rawTokens={rawTokens} onAdd={addToken} />

            <footer className="pt-2 border-t">
                <p className="text-[10px] text-neutral-500">
                    Project: {projectId} | Version: v{activeTheme?.version}
                </p>
            </footer>
        </div>
    );
}