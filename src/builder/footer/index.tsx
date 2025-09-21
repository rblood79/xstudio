/* src/builder/footer/index.tsx */
import React from 'react';
import './index.css';
import { useMemoryMonitor } from '../hooks/useMemoryMonitor';

export const BuilderFooter: React.FC = () => {
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
                <button onClick={optimizeMemory}>Memory Reset</button>
            </div>
            <div className="contents">
                {stats ? (
                    <div className="memory-stats">
                        <p>Total Entries: {stats.totalEntries}</p>
                        <p>Command Count: {stats.commandCount}</p>
                        <p>Cache Size: {stats.cacheSize}</p>
                        <p>Estimated Usage: {formatBytes(stats.estimatedMemoryUsage)}</p>
                        <p>Compression Ratio: {(stats.compressionRatio * 100).toFixed(1)}%</p>
                        <p>Recommendation: {stats.recommendation}</p>
                    </div>
                ) : (
                    <p>Loading memory stats...</p>
                )}
            </div>
        </>
    );
};
