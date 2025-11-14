/* src/builder/stores/memoryMonitor.ts */
import { historyManager } from './history';

export interface MemoryStats {
    pageCount: number;
    totalEntries: number;
    commandCount: number;
    cacheSize: number;
    estimatedMemoryUsage: number; // bytes
    compressionRatio: number;
    recommendation: string; // 최적화 권장사항
}

export class MemoryMonitor {
    private statsHistory: MemoryStats[] = [];
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private readonly collectionInterval = 10000; // 10초마다 수집
    private readonly maxStatsHistory = 60; // 10분치 기록 (60 * 10초)
    private statusMessage: string = ''; // 상태 메시지 (콘솔 대신 UI에 표시)

    // Phase 4.1 최적화: constructor에서 자동 시작 제거
    // useMemoryMonitor 훅에서 명시적으로 시작/정지 관리
    constructor() {
        // 자동 시작 제거 - 지연 초기화
    }

    private collectStats(): void {
        const historyStats = historyManager.getMemoryStats();
        const commandStoreStats = historyStats.commandStoreStats;

        const currentStats: MemoryStats = {
            pageCount: historyStats.pageCount,
            totalEntries: historyStats.totalEntries,
            commandCount: commandStoreStats.commandCount,
            cacheSize: commandStoreStats.cacheSize,
            estimatedMemoryUsage: commandStoreStats.estimatedMemoryUsage,
            compressionRatio: commandStoreStats.compressionRatio,
            recommendation: this.analyzeAndRecommend(commandStoreStats.estimatedMemoryUsage, commandStoreStats.compressionRatio)
        };

        this.statsHistory.push(currentStats);
        if (this.statsHistory.length > this.maxStatsHistory) {
            this.statsHistory.shift();
        }

        // 개발 모드에서만 로그 출력
        if (import.meta.env.DEV) {
            //console.log('📊 Memory Stats:', currentStats);
        }
    }

    private analyzeAndRecommend(memoryUsage: number, compressionRatio: number): string {
        let recommendation = '정상 작동 중입니다.';

        if (memoryUsage > 10 * 1024 * 1024) { // 10MB 이상
            recommendation = '메모리 사용량이 높습니다. 불필요한 히스토리 또는 캐시를 정리하세요.';
        }

        if (compressionRatio < 0.2) {
            recommendation = '압축률이 매우 낮습니다. 압축 알고리즘을 확인하거나 데이터를 최적화하세요.';
        }

        // TODO: 추세 분석 로직 추가 (예: statsHistory를 기반으로 메모리 증가 추세 감지)
        // if (this.isMemoryIncreasing()) {
        //     recommendation += ' 메모리 사용량이 지속적으로 증가하고 있습니다. 누수 가능성을 확인하세요.';
        // }

        return recommendation;
    }

    // TODO: 메모리 증가 추세 감지 로직 구현
    // private isMemoryIncreasing(): boolean {
    //     if (this.statsHistory.length < 10) return false; // 충분한 데이터가 없을 때
    //     const recent = this.statsHistory.slice(-10).map(s => s.estimatedMemoryUsage);
    //     const average = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    //     const latest = recent[recent.length - 1];
    //     return latest > average * 1.2; // 최근 값이 평균보다 20% 높으면 증가 추세로 간주
    // }

    public startMonitoring(): void {
        if (!this.intervalId) {
            this.collectStats(); // 초기 1회 수집
            this.intervalId = setInterval(() => this.collectStats(), this.collectionInterval);
            this.statusMessage = `📈 메모리 모니터링 시작 (${this.collectionInterval / 1000}초마다 수집)`;
        }
    }

    public stopMonitoring(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.statusMessage = '📉 메모리 모니터링 중지';
        }
    }

    public getCurrentStats(): MemoryStats | null {
        return this.statsHistory.length > 0 ? this.statsHistory[this.statsHistory.length - 1] : null;
    }

    public getStatsHistory(): MemoryStats[] {
        return [...this.statsHistory];
    }

    public getStatusMessage(): string {
        return this.statusMessage;
    }

    // 수동으로 메모리 최적화 호출
    public optimizeMemory(): void {
        historyManager.optimizeMemory();
        this.statusMessage = '✨ 메모리 최적화 실행됨';
    }
}

export const memoryMonitor = new MemoryMonitor();
