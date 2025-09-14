import React from 'react';
import { Menu, Eye, Undo, Redo, Play, Monitor, Tablet, Smartphone, Asterisk } from 'lucide-react';
import { RadioGroup, Radio, Key, Label } from 'react-aria-components';
import { Patch } from 'immer';
import { iconProps } from '../../utils/uiConstants';
import { Element } from '../../types/store';

export interface Breakpoint {
    id: string;
    label: string;
    max_width: string | number;
    max_height: string | number;
}

// 정확한 타입으로 수정
export interface PageHistory {
    history: Array<{
        id: string;
        timestamp: number;
        patches: Patch[];
        inversePatches: Patch[];
        snapshot?: { prev: Element[]; current: Element[] };
        description?: string;
    }>;
    historyIndex: number;
}

export interface BuilderHeaderProps {
    projectId?: string;
    breakpoint: Set<Key>;
    breakpoints: Breakpoint[];
    onBreakpointChange: (value: Key) => void;
    currentPageId: string | null;
    pageHistories: Record<string, PageHistory>;
    onUndo: () => void;
    onRedo: () => void;
    onPreview: () => void;
    onPlay: () => void;
    onPublish: () => void;
}

export const BuilderHeader: React.FC<BuilderHeaderProps> = ({
    projectId,
    breakpoint,
    breakpoints,
    onBreakpointChange,
    currentPageId,
    pageHistories,
    onUndo,
    onRedo,
    onPreview,
    onPlay,
    onPublish
}) => {
    const canUndo = currentPageId && pageHistories[currentPageId] && pageHistories[currentPageId].historyIndex >= 0;
    const canRedo = currentPageId && pageHistories[currentPageId] && pageHistories[currentPageId].historyIndex < pageHistories[currentPageId].history.length - 1;

    return (
        <nav className="header">
            <div className="header_contents header_left">
                <button aria-label="Menu">
                    <Menu color={'#fff'} strokeWidth={iconProps.stroke} size={iconProps.size} />
                </button>
                {projectId ? `Project ID: ${projectId}` : "No project ID provided"}
            </div>

            <div className="header_contents screen">
                <code className="code sizeInfo">
                    {breakpoints.find(bp => bp.id === Array.from(breakpoint)[0])?.max_width}x
                    {breakpoints.find(bp => bp.id === Array.from(breakpoint)[0])?.max_height}
                </code>

                <RadioGroup
                    orientation="horizontal"
                    value={Array.from(breakpoint)[0]?.toString()}
                    onChange={(value) => onBreakpointChange(value)}
                >
                    {breakpoints.map(bp => (
                        <Radio
                            value={bp.id}
                            key={bp.id}
                            className="aria-Radio"
                        >
                            {bp.id === 'screen' && <Asterisk color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />}
                            {bp.id === 'desktop' && <Monitor color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />}
                            {bp.id === 'tablet' && <Tablet color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />}
                            {bp.id === 'mobile' && <Smartphone color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />}
                            <Label>{bp.label}</Label>
                        </Radio>
                    ))}
                </RadioGroup>
            </div>

            <div className="header_contents header_right">
                <span>
                    {currentPageId && pageHistories[currentPageId]
                        ? `${pageHistories[currentPageId].historyIndex + 1}/${pageHistories[currentPageId].history.length}`
                        : '0/0'
                    }
                </span>
                <button
                    aria-label="Undo"
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={!canUndo ? "disabled" : ""}
                >
                    <Undo
                        color={!canUndo ? "#999" : iconProps.color}
                        strokeWidth={iconProps.stroke}
                        size={iconProps.size}
                    />
                </button>
                <button
                    aria-label="Redo"
                    onClick={onRedo}
                    disabled={!canRedo}
                    className={!canRedo ? "disabled" : ""}
                >
                    <Redo
                        color={!canRedo ? "#999" : iconProps.color}
                        strokeWidth={iconProps.stroke}
                        size={iconProps.size}
                    />
                </button>
                <button aria-label="Preview" onClick={onPreview}>
                    <Eye color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                </button>
                <button aria-label="Play" onClick={onPlay}>
                    <Play color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                </button>
                <button aria-label="Publish" className="publish" onClick={onPublish}>
                    Publish
                </button>
            </div>
        </nav>
    );
};
