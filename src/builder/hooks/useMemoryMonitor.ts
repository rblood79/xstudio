/* src/builder/hooks/useMemoryMonitor.ts */
import { useState, useEffect } from 'react';
import { memoryMonitor, MemoryStats } from '../stores/memoryMonitor';

export function useMemoryMonitor() {
    const [stats, setStats] = useState<MemoryStats | null>(null);
    const [statsHistory, setStatsHistory] = useState<MemoryStats[]>([]);
    const [statusMessage, setStatusMessage] = useState<string>('');

    useEffect(() => {
        const updateStats = () => {
            setStats(memoryMonitor.getCurrentStats());
            setStatsHistory(memoryMonitor.getStatsHistory());
            setStatusMessage(memoryMonitor.getStatusMessage());
        };

        // Phase 4.1 최적화: 지연 초기화 - 훅 마운트 시에만 시작
        memoryMonitor.startMonitoring();

        // 초기 데이터 로드
        updateStats();

        // 1초마다 UI 업데이트 (필요 - memoryMonitor는 10초마다 수집)
        const interval = setInterval(updateStats, 1000);

        return () => {
            clearInterval(interval);
            // 컴포넌트 언마운트 시 모니터링 중지
            memoryMonitor.stopMonitoring();
        };
    }, []);

    const optimizeMemory = () => {
        memoryMonitor.optimizeMemory();
        // 최적화 후 통계 즉시 업데이트
        setStats(memoryMonitor.getCurrentStats());
        setStatsHistory(memoryMonitor.getStatsHistory());
        setStatusMessage(memoryMonitor.getStatusMessage());
    };

    return { stats, statsHistory, statusMessage, optimizeMemory };
}
