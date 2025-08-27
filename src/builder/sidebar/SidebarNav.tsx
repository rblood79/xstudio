import React from "react";
//import "./SidebarNav.css";
import { File, SquarePlus, DatabaseZap, LibraryBig, Palette, WandSparkles, Users, Settings } from 'lucide-react';
import { iconProps } from '../../utils/uiConstants';

export type Tab = 'nodes' | 'components' | 'library' | 'dataset' | 'theme' | 'ai' | 'user' | 'settings';

interface SidebarNavProps {
    activeTabs: Set<Tab>;
    onTabChange: (tab: Tab) => void; // onTabToggle에서 onTabChange로 이름 변경
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ activeTabs, onTabChange }) => { // 여기도 함수명 변경
    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'nodes', label: '노드', icon: <File color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /> },
        { id: 'components', label: '컴포넌트', icon: <SquarePlus color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /> },
        { id: 'library', label: '라이브러리', icon: <LibraryBig color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /> },
        { id: 'dataset', label: '데이터셋', icon: <DatabaseZap color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /> },
        { id: 'theme', label: '테마', icon: <Palette color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /> },
        { id: 'ai', label: 'AI', icon: <WandSparkles color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /> },
        { id: 'user', label: '사용자', icon: <Users color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /> },
        { id: 'settings', label: '설정', icon: <Settings color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /> },
    ];

    return (
        <nav className="sidebar-nav">
            <ul className="nav-list">
                {tabs.map((tab) => (
                    <li key={tab.id}>
                        <button
                            className={`nav-button ${activeTabs.has(tab.id) ? 'active' : ''}`}
                            onClick={() => onTabChange(tab.id)} // 여기도 함수명 변경
                            aria-pressed={activeTabs.has(tab.id)}
                        >
                            {tab.icon}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
};