import { useEffect, useRef } from 'react';
import { File, SquarePlus, DatabaseZap, LibraryBig, Palette, WandSparkles, Users, Settings } from 'lucide-react';
import { iconProps } from '../constants';

export type Tab = 'nodes' | 'components' | 'library' | 'dataset' | 'theme' | 'ai' | 'user' | 'settings';

interface SidebarNavProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

export function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
    const navRef = useRef<HTMLDivElement>(null);
    const beforeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const nav = navRef.current;
        const before = beforeRef.current;
        if (!nav || !before) return;

        const activeButton = nav.querySelector(`button[data-tab="${activeTab}"]`) as HTMLButtonElement;
        if (activeButton) {
            const { top: navTop } = nav.getBoundingClientRect();
            const { top: buttonTop } = activeButton.getBoundingClientRect();
            const translateY = buttonTop - navTop - 8;
            before.style.transform = `translateY(${translateY}px)`;
        }
    }, [activeTab]);

    return (
        <div className="sidebar_nav" ref={navRef}>
            <div className="sidebar_nav_before" ref={beforeRef} />
            <div className="sidebar_group">
                <button
                    data-tab="nodes"
                    aria-label="Nodes"
                    className={activeTab === 'nodes' ? 'active' : ''}
                    onClick={() => onTabChange('nodes')}
                >
                    <File color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                </button>
                <button
                    data-tab="components"
                    aria-label="Components"
                    className={activeTab === 'components' ? 'active' : ''}
                    onClick={() => onTabChange('components')}
                >
                    <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                </button>
                <button
                    data-tab="library"
                    aria-label="Library"
                    className={activeTab === 'library' ? 'active' : ''}
                    onClick={() => onTabChange('library')}
                >
                    <LibraryBig color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                </button>
                <button
                    data-tab="dataset"
                    aria-label="Database"
                    className={activeTab === 'dataset' ? 'active' : ''}
                    onClick={() => onTabChange('dataset')}
                >
                    <DatabaseZap color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                </button>
                <button
                    data-tab="theme"
                    aria-label="Themes"
                    className={activeTab === 'theme' ? 'active' : ''}
                    onClick={() => onTabChange('theme')}
                >
                    <Palette color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                </button>
                <button
                    data-tab="ai"
                    aria-label="AI"
                    className={activeTab === 'ai' ? 'active' : ''}
                    onClick={() => onTabChange('ai')}
                >
                    <WandSparkles color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                </button>
            </div>
            <div className="sidebar_group">
                <button
                    data-tab="user"
                    aria-label="Users"
                    className={activeTab === 'user' ? 'active' : ''}
                    onClick={() => onTabChange('user')}
                >
                    <Users color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                </button>
                <button
                    data-tab="settings"
                    aria-label="Settings"
                    className={activeTab === 'settings' ? 'active' : ''}
                    onClick={() => onTabChange('settings')}
                >
                    <Settings color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                </button>
            </div>
        </div>
    );
} 