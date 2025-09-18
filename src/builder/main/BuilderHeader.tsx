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

// 새로운 히스토리 시스템 타입
export interface HistoryInfo {
    current: number;
    total: number;
}

export interface BuilderHeaderProps {
    projectId?: string;
    breakpoint: Set<Key>;
    breakpoints: Breakpoint[];
    onBreakpointChange: (value: Key) => void;
    currentPageId: string | null;
    historyInfo: HistoryInfo;
    canUndo: boolean;
    canRedo: boolean;
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
    historyInfo,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onPreview,
    onPlay,
    onPublish
}) => {

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
                    {historyInfo ? `${historyInfo.current}/${historyInfo.total}` : '0/0'}
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
