import { Element } from '../../types/unified';
import { commandDataStore, CommandData } from './commandDataStore';

/**
 * 간단하고 효율적인 History 시스템
 * - 스냅샷 기반이 아닌 변경사항 기반으로 메모리 효율성 확보
 * - 페이지별 독립적인 히스토리 관리
 * - 최대 히스토리 크기 제한으로 메모리 누수 방지
 */

export interface HistoryEntry {
    id: string;
    type: 'add' | 'update' | 'remove' | 'move';
    elementId: string;
    data: {
        element?: Element;
        prevElement?: Element;
        props?: any;
        prevProps?: any;
        parentId?: string;
        prevParentId?: string;
        orderNum?: number;
        prevOrderNum?: number;
    };
    timestamp: number;
}

export interface PageHistory {
    entries: HistoryEntry[];
    currentIndex: number;
    maxSize: number;
}

export class HistoryManager {
    private pageHistories: Map<string, PageHistory> = new Map();
    private currentPageId: string | null = null;
    private readonly defaultMaxSize = 50;
    private commandDataStore = commandDataStore;

    constructor() {
        // 페이지 히스토리 초기화
    }

    /**
     * 현재 페이지 설정
     */
    setCurrentPage(pageId: string): void {
        this.currentPageId = pageId;

        // 페이지 히스토리가 없으면 생성
        if (!this.pageHistories.has(pageId)) {
            this.pageHistories.set(pageId, {
                entries: [],
                currentIndex: -1,
                maxSize: this.defaultMaxSize
            });
        }
    }

    /**
     * 히스토리 엔트리 추가 (CommandDataStore 통합)
     */
    addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
        if (!this.currentPageId) return;

        const pageHistory = this.pageHistories.get(this.currentPageId);
        if (!pageHistory) return;

        // CommandDataStore에 명령어 저장 (메모리 최적화)
        const commandId = this.commandDataStore.addCommand({
            type: entry.type,
            elementId: entry.elementId,
            changes: this.convertToCommandChanges(entry),
            metadata: {
                pageId: this.currentPageId,
                sessionId: this.getSessionId(),
            }
        });

        // 요소 캐시에 저장 (압축된 형태)
        if (entry.data.element) {
            this.commandDataStore.cacheElement(entry.data.element);
        }
        if (entry.data.prevElement) {
            this.commandDataStore.cacheElement(entry.data.prevElement);
        }

        const newEntry: HistoryEntry = {
            ...entry,
            id: commandId, // CommandDataStore ID 사용
            timestamp: Date.now()
        };

        // 현재 인덱스 이후의 엔트리들 제거 (새로운 변경사항이 있을 때)
        pageHistory.entries = pageHistory.entries.slice(0, pageHistory.currentIndex + 1);

        // 새 엔트리 추가
        pageHistory.entries.push(newEntry);
        pageHistory.currentIndex = pageHistory.entries.length - 1;

        // 최대 크기 초과 시 오래된 엔트리 제거
        if (pageHistory.entries.length > pageHistory.maxSize) {
            const removedEntry = pageHistory.entries.shift();
            if (removedEntry) {
                // CommandDataStore에서도 제거
                this.commandDataStore.removeCommand(removedEntry.id);
            }
            pageHistory.currentIndex--;
        }
    }

    /**
     * Undo 실행
     */
    undo(): HistoryEntry | null {
        if (!this.currentPageId) return null;

        const pageHistory = this.pageHistories.get(this.currentPageId);
        if (!pageHistory || pageHistory.currentIndex < 0) return null;

        const entry = pageHistory.entries[pageHistory.currentIndex];
        pageHistory.currentIndex--;
        return entry;
    }

    /**
     * Redo 실행
     */
    redo(): HistoryEntry | null {
        if (!this.currentPageId) return null;

        const pageHistory = this.pageHistories.get(this.currentPageId);
        if (!pageHistory || pageHistory.currentIndex >= pageHistory.entries.length - 1) return null;

        pageHistory.currentIndex++;
        const entry = pageHistory.entries[pageHistory.currentIndex];
        return entry;
    }

    /**
     * Undo 가능 여부
     */
    canUndo(): boolean {
        if (!this.currentPageId) return false;
        const pageHistory = this.pageHistories.get(this.currentPageId);
        return pageHistory ? pageHistory.currentIndex >= 0 : false;
    }

    /**
     * Redo 가능 여부
     */
    canRedo(): boolean {
        if (!this.currentPageId) return false;
        const pageHistory = this.pageHistories.get(this.currentPageId);
        return pageHistory ? pageHistory.currentIndex < pageHistory.entries.length - 1 : false;
    }

    /**
     * 현재 페이지 히스토리 정보
     */
    getCurrentPageHistory(): { canUndo: boolean; canRedo: boolean; totalEntries: number; currentIndex: number } {
        if (!this.currentPageId) {
            return { canUndo: false, canRedo: false, totalEntries: 0, currentIndex: -1 };
        }

        const pageHistory = this.pageHistories.get(this.currentPageId);
        if (!pageHistory) {
            return { canUndo: false, canRedo: false, totalEntries: 0, currentIndex: -1 };
        }

        return {
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            totalEntries: pageHistory.entries.length,
            currentIndex: pageHistory.currentIndex
        };
    }

    /**
     * 페이지 히스토리 초기화
     */
    clearPageHistory(pageId: string): void {
        this.pageHistories.delete(pageId);
        // 현재 페이지가 초기화된 페이지라면 새로운 히스토리 생성
        if (this.currentPageId === pageId) {
            this.setCurrentPage(pageId);
        }
    }

    /**
     * 모든 히스토리 초기화
     */
    clearAllHistory(): void {
        this.pageHistories.clear();
        this.commandDataStore.clear();
    }

    /**
     * CommandDataStore 변경사항 변환
     */
    private convertToCommandChanges(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): any {
        switch (entry.type) {
            case 'add':
                return {
                    added: entry.data.element
                };
            case 'remove':
                return {
                    removed: entry.data.element
                };
            case 'update':
                return {
                    updated: {
                        prevProps: entry.data.prevProps || {},
                        newProps: entry.data.props || {}
                    }
                };
            case 'move':
                return {
                    moved: {
                        prevParentId: entry.data.prevParentId || null,
                        newParentId: entry.data.parentId || null,
                        prevOrderNum: entry.data.prevOrderNum || 0,
                        newOrderNum: entry.data.orderNum || 0
                    }
                };
            default:
                return {};
        }
    }

    /**
     * 세션 ID 생성
     */
    private getSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 메모리 사용량 통계
     */
    getMemoryStats(): {
        pageCount: number;
        totalEntries: number;
        commandStoreStats: any;
    } {
        const pageCount = this.pageHistories.size;
        const totalEntries = Array.from(this.pageHistories.values())
            .reduce((sum, page) => sum + page.entries.length, 0);

        return {
            pageCount,
            totalEntries,
            commandStoreStats: this.commandDataStore.getMemoryStats()
        };
    }

    /**
     * 메모리 최적화
     */
    optimizeMemory(): void {
        this.commandDataStore.optimizeMemory();

        // 오래된 페이지 히스토리 정리
        const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7일 전
        for (const [pageId, pageHistory] of this.pageHistories.entries()) {
            const hasRecentEntries = pageHistory.entries.some(entry => entry.timestamp > cutoffTime);
            if (!hasRecentEntries && pageHistory.entries.length === 0) {
                this.pageHistories.delete(pageId);
            }
        }
    }
}

// 싱글톤 인스턴스
export const historyManager = new HistoryManager();
