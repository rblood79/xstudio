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

        // 모니터링 시작 (이미 시작되어 있을 수 있지만, 안전하게 다시 호출)
        memoryMonitor.startMonitoring();

        // 초기 데이터 로드
        updateStats();

        // 1초마다 업데이트하여 UI에 반영
        const interval = setInterval(updateStats, 1000); // 1초마다 UI 업데이트

        return () => {
            clearInterval(interval);
            // 컴포넌트 언마운트 시 모니터링 중지 (옵션)
            // memoryMonitor.stopMonitoring(); 
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
