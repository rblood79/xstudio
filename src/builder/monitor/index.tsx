/* src/builder/footer/index.tsx */
import React from 'react';
import './index.css';
import { useMemoryMonitor } from '../hooks/useMemoryMonitor';

export const Monitor: React.FC = () => {
    const { stats, optimizeMemory } = useMemoryMonitor();

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <>
            <div className="header">
                <span className="title">Memory Monitor</span>
                <button onClick={optimizeMemory}>memory optimization</button>
            </div>
            <div className="contents">
                {stats ? (
                    <ul className="memory-stats">
                        <li>Total Entries: {stats.totalEntries}</li>
                        <li>Command Count: {stats.commandCount}</li>
                        <li>Cache Size: {stats.cacheSize}</li>
                        <li>Estimated Usage: {formatBytes(stats.estimatedMemoryUsage)}</li>
                        <li>Compression Ratio: {(stats.compressionRatio * 100).toFixed(1)}%</li>
                        <li>Recommendation: {stats.recommendation}</li>
                    </ul>
                ) : (
                    <li>Loading memory stats...</li>
                )}
            </div>
        </>
    );
};
