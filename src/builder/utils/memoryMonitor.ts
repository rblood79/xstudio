import { historyManager } from '../stores/history';

/**
 * 메모리 사용량 모니터링 유틸리티
 * CommandDataStore와 히스토리 시스템의 메모리 사용량을 추적
 */

export interface MemoryStats {
    timestamp: number;
    historyStats: {
        pageCount: number;
        totalEntries: number;
        commandStoreStats: {
            commandCount: number;
            cacheSize: number;
            estimatedMemoryUsage: number;
            compressionRatio: number;
        };
    };
    browserMemory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
    };
}

export class MemoryMonitor {
    private stats: MemoryStats[] = [];
    private maxStatsHistory = 100;
    private monitoringInterval: NodeJS.Timeout | null = null;
    private isMonitoring = false;

    /**
     * 메모리 모니터링 시작
     */
    startMonitoring(intervalMs: number = 5000): void {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.collectStats();
        }, intervalMs);

        console.log('🔍 메모리 모니터링 시작');
    }

    /**
     * 메모리 모니터링 중지
     */
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
        console.log('⏹️ 메모리 모니터링 중지');
    }

    /**
     * 현재 메모리 통계 수집
     */
    collectStats(): MemoryStats {
        const timestamp = Date.now();

        // 히스토리 시스템 통계
        const historyStats = historyManager.getMemoryStats();

        // 브라우저 메모리 정보 (가능한 경우)
        let browserMemory;
        if ('memory' in performance) {
            const memory = performance.memory;
            browserMemory = {
                usedJSHeapSize: memory.usedJSHeapSize,
                totalJSHeapSize: memory.totalJSHeapSize,
                jsHeapSizeLimit: memory.jsHeapSizeLimit,
            };
        }

        const stats: MemoryStats = {
            timestamp,
            historyStats,
            browserMemory,
        };

        // 통계 히스토리에 추가
        this.stats.push(stats);
        if (this.stats.length > this.maxStatsHistory) {
            this.stats.shift();
        }

        return stats;
    }

    /**
     * 메모리 사용량 추세 분석
     */
    getMemoryTrend(): {
        isIncreasing: boolean;
        averageGrowth: number;
        peakUsage: number;
        currentUsage: number;
    } {
        if (this.stats.length < 2) {
            return {
                isIncreasing: false,
                averageGrowth: 0,
                peakUsage: 0,
                currentUsage: 0,
            };
        }

        const recent = this.stats.slice(-10); // 최근 10개 샘플
        const oldest = recent[0];
        const newest = recent[recent.length - 1];

        const currentUsage = newest.historyStats.commandStoreStats.estimatedMemoryUsage;
        const peakUsage = Math.max(...this.stats.map(s => s.historyStats.commandStoreStats.estimatedMemoryUsage));

        const timeDiff = newest.timestamp - oldest.timestamp;
        const usageDiff = currentUsage - oldest.historyStats.commandStoreStats.estimatedMemoryUsage;
        const averageGrowth = timeDiff > 0 ? usageDiff / timeDiff : 0;

        return {
            isIncreasing: averageGrowth > 0,
            averageGrowth,
            peakUsage,
            currentUsage,
        };
    }

    /**
     * 메모리 최적화 권장사항
     */
    getOptimizationRecommendations(): string[] {
        const trend = this.getMemoryTrend();
        const currentStats = this.stats[this.stats.length - 1];
        const recommendations: string[] = [];

        if (!currentStats) return recommendations;

        const { commandStoreStats } = currentStats.historyStats;

        // 명령어 수가 많을 때
        if (commandStoreStats.commandCount > 80) {
            recommendations.push('⚠️ 명령어 수가 많습니다. 오래된 히스토리를 정리하세요.');
        }

        // 캐시 크기가 클 때
        if (commandStoreStats.cacheSize > 400) {
            recommendations.push('⚠️ 요소 캐시가 큽니다. 메모리 최적화를 실행하세요.');
        }

        // 메모리 사용량이 증가 중일 때
        if (trend.isIncreasing && trend.averageGrowth > 1000) {
            recommendations.push('⚠️ 메모리 사용량이 지속적으로 증가하고 있습니다.');
        }

        // 압축률이 낮을 때
        if (commandStoreStats.compressionRatio > 0.8) {
            recommendations.push('💡 압축률이 낮습니다. 더 효율적인 데이터 구조를 고려하세요.');
        }

        return recommendations;
    }

    /**
     * 메모리 최적화 실행
     */
    optimizeMemory(): void {
        console.log('🔧 메모리 최적화 실행 중...');

        // 히스토리 시스템 최적화
        historyManager.optimizeMemory();

        // 통계 초기화
        this.stats = [];

        console.log('✅ 메모리 최적화 완료');
    }

    /**
     * 현재 통계 조회
     */
    getCurrentStats(): MemoryStats | null {
        return this.stats[this.stats.length - 1] || null;
    }

    /**
     * 통계 히스토리 조회
     */
    getStatsHistory(): MemoryStats[] {
        return [...this.stats];
    }

    /**
     * 메모리 사용량 리포트 생성
     */
    generateReport(): string {
        const current = this.getCurrentStats();
        const trend = this.getMemoryTrend();
        const recommendations = this.getOptimizationRecommendations();

        if (!current) {
            return '📊 메모리 통계를 수집 중입니다...';
        }

        const { historyStats, browserMemory } = current;
        const { commandStoreStats } = historyStats;

        let report = '📊 메모리 사용량 리포트\n\n';

        report += `📈 히스토리 시스템:\n`;
        report += `  - 페이지 수: ${historyStats.pageCount}\n`;
        report += `  - 총 엔트리: ${historyStats.totalEntries}\n`;
        report += `  - 명령어 수: ${commandStoreStats.commandCount}\n`;
        report += `  - 캐시 크기: ${commandStoreStats.cacheSize}\n`;
        report += `  - 예상 메모리 사용량: ${Math.round(commandStoreStats.estimatedMemoryUsage / 1024)}KB\n`;
        report += `  - 압축률: ${Math.round(commandStoreStats.compressionRatio * 100)}%\n\n`;

        if (browserMemory) {
            report += `🌐 브라우저 메모리:\n`;
            report += `  - 사용 중: ${Math.round(browserMemory.usedJSHeapSize / 1024 / 1024)}MB\n`;
            report += `  - 총 할당: ${Math.round(browserMemory.totalJSHeapSize / 1024 / 1024)}MB\n`;
            report += `  - 제한: ${Math.round(browserMemory.jsHeapSizeLimit / 1024 / 1024)}MB\n\n`;
        }

        report += `📊 추세 분석:\n`;
        report += `  - 메모리 증가 중: ${trend.isIncreasing ? '예' : '아니오'}\n`;
        report += `  - 평균 증가율: ${Math.round(trend.averageGrowth)} bytes/ms\n`;
        report += `  - 최대 사용량: ${Math.round(trend.peakUsage / 1024)}KB\n`;
        report += `  - 현재 사용량: ${Math.round(trend.currentUsage / 1024)}KB\n\n`;

        if (recommendations.length > 0) {
            report += `💡 권장사항:\n`;
            recommendations.forEach(rec => {
                report += `  ${rec}\n`;
            });
        } else {
            report += `✅ 메모리 사용량이 정상 범위입니다.\n`;
        }

        return report;
    }
}

// 싱글톤 인스턴스
export const memoryMonitor = new MemoryMonitor();
