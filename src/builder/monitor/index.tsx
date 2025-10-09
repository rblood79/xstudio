/* src/builder/monitor/index.tsx */
import React, { useState, useEffect } from 'react';
import './index.css';
import { useMemoryMonitor } from '../hooks/useMemoryMonitor';
import { saveService } from '../../services/save/saveService';
import type { PerformanceMetrics, ValidationError } from '../../services/save/saveService';

export const Monitor: React.FC = () => {
    const { stats, optimizeMemory } = useMemoryMonitor();
    const [saveMetrics, setSaveMetrics] = useState<PerformanceMetrics | null>(null);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [activeTab, setActiveTab] = useState<'memory' | 'save'>('memory');

    // SaveService 메트릭 업데이트
    useEffect(() => {
        const updateSaveMetrics = () => {
            const metrics = saveService.getPerformanceMetrics();
            const errors = saveService.getValidationErrors();
            setSaveMetrics(metrics);
            setValidationErrors(errors);
        };

        // 초기 로드
        updateSaveMetrics();

        // 5초마다 업데이트
        const interval = setInterval(updateSaveMetrics, 5000);
        return () => clearInterval(interval);
    }, []);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const resetSaveMetrics = () => {
        saveService.resetMetrics();
        saveService.clearValidationErrors();
        setSaveMetrics(saveService.getPerformanceMetrics());
        setValidationErrors([]);
    };

    const totalSkips = saveMetrics ?
        saveMetrics.skipCounts.preview + saveMetrics.skipCounts.validation : 0;

    const successRate = saveMetrics && saveMetrics.saveOperations > 0 ?
        ((saveMetrics.saveOperations - validationErrors.length) / saveMetrics.saveOperations * 100).toFixed(1) :
        '100.0';

    return (
        <>
            <div className="header">
                <div className="tabs">
                    <button
                        className={activeTab === 'memory' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('memory')}
                    >
                        Memory Monitor
                    </button>
                    <button
                        className={activeTab === 'save' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('save')}
                    >
                        Save Monitor
                    </button>
                </div>
                <div className="actions">
                    {activeTab === 'memory' && (
                        <button onClick={optimizeMemory}>memory optimization</button>
                    )}
                    {activeTab === 'save' && (
                        <button onClick={resetSaveMetrics}>reset metrics</button>
                    )}
                </div>
            </div>
            <div className="contents">
                {activeTab === 'memory' ? (
                    <div className="monitor">
                        {stats ? (
                            <ul className="stats">
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
                ) : (
                    <div className="monitor">
                        {saveMetrics ? (
                            <>
                                <ul className="stats">
                                    <li>Save Operations: {saveMetrics.saveOperations}</li>
                                    <li>Average Time: {saveMetrics.averageSaveTime.toFixed(2)}ms</li>
                                    <li>Success Rate: {successRate}%</li>
                                    <li>Preview Skips: {saveMetrics.skipCounts.preview}</li>
                                    <li>Validation Skips: {saveMetrics.skipCounts.validation}</li>
                                    <li>Total Skips: {totalSkips}</li>
                                </ul>

                                {validationErrors.length > 0 && (
                                    <div className="validation-errors">
                                        <h4>Validation Errors ({validationErrors.length})</h4>
                                        <ul className="error-list">
                                            {validationErrors.slice(-5).map((error, index) => (
                                                <li key={index} className="error-item">
                                                    <strong>{error.elementId}</strong>: {error.field} - {error.message}
                                                    <span className="timestamp">
                                                        {error.timestamp.toLocaleTimeString()}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                        {validationErrors.length > 5 && (
                                            <p className="more-errors">
                                                ... and {validationErrors.length - 5} more errors
                                            </p>
                                        )}
                                    </div>
                                )}

                                {saveMetrics.saveOperations === 0 && (
                                    <p className="no-data">No save operations recorded yet. Start editing elements to see metrics.</p>
                                )}
                            </>
                        ) : (
                            <li>Loading save metrics...</li>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};
