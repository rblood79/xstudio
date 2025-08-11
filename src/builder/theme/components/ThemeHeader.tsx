import React from 'react';
import { DesignTheme } from '../../../types/theme';

interface ThemeHeaderProps {
    theme: DesignTheme | null;
    dirty: boolean;
    onSnapshot: () => void;
}

export function ThemeHeader({ theme, dirty, onSnapshot }: ThemeHeaderProps) {
    return (
        <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
                Theme: {theme?.name}
            </h3>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={dirty}
                    onClick={onSnapshot}
                    className="text-[11px] px-2 py-1 rounded border
                             border-neutral-300 hover:bg-neutral-100
                             disabled:opacity-40"
                    title="버전 스냅샷 생성"
                >
                    Snapshot v{theme?.version}
                </button>
                {dirty && (
                    <span className="text-[10px] text-orange-500">
                        Saving…
                    </span>
                )}
            </div>
        </header>
    );
}
