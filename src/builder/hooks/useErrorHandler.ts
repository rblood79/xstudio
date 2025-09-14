import { useState, useCallback, useRef } from 'react';
import { Element } from '../../types/store';
import { ElementUtils } from '../../utils/elementUtils';

export interface ErrorInfo {
    id: string;
    timestamp: Date;
    type: 'creation' | 'update' | 'deletion' | 'validation' | 'network' | 'cache';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    context?: string;
    elementId?: string;
    operation?: string;
    stack?: string;
    recoverable: boolean;
}

export interface RollbackInfo {
    operation: 'create' | 'update' | 'delete' | 'move';
    elementId: string;
    previousState?: Element;
    previousElements?: Element[];
    timestamp: Date;
}

export interface UseErrorHandlerReturn {
    error: string | null;
    isLoading: boolean;
    errorHistory: ErrorInfo[];
    rollbackStack: RollbackInfo[];
    setError: (error: string | null) => void;
    setIsLoading: (loading: boolean) => void;
    handleError: (error: unknown, context?: string, options?: {
        type?: ErrorInfo['type'];
        severity?: ErrorInfo['severity'];
        elementId?: string;
        operation?: string;
        recoverable?: boolean;
    }) => void;
    clearError: () => void;
    clearErrorHistory: () => void;
    addRollbackPoint: (info: RollbackInfo) => void;
    rollback: (steps?: number) => Promise<boolean>;
    retryOperation: (operation: () => Promise<void>, maxRetries?: number) => Promise<void>;
    validateElements: (elements: Element[]) => { isValid: boolean; errors: string[] };
    getErrorStats: () => {
        totalErrors: number;
        errorsByType: Record<string, number>;
        errorsBySeverity: Record<string, number>;
        recentErrors: ErrorInfo[];
    };
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorHistory, setErrorHistory] = useState<ErrorInfo[]>([]);
    const [rollbackStack, setRollbackStack] = useState<RollbackInfo[]>([]);
    const retryCountRef = useRef<Map<string, number>>(new Map());

    const handleError = useCallback((
        error: unknown,
        context?: string,
        options?: {
            type?: ErrorInfo['type'];
            severity?: ErrorInfo['severity'];
            elementId?: string;
            operation?: string;
            recoverable?: boolean;
        }
    ) => {
        const errorId = ElementUtils.generateId();
        const timestamp = new Date();

        // 에러 메시지 추출
        let errorMessage = '알 수 없는 오류';
        let stack: string | undefined;

        if (error instanceof Error) {
            errorMessage = error.message;
            stack = error.stack;
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = String(error.message);
        }

        // 컨텍스트 메시지 생성
        const contextMessage = context
            ? `${context} 중 오류가 발생했습니다: ${errorMessage}`
            : errorMessage;

        // 에러 정보 생성
        const errorInfo: ErrorInfo = {
            id: errorId,
            timestamp,
            type: options?.type || 'validation',
            severity: options?.severity || 'medium',
            message: errorMessage,
            context,
            elementId: options?.elementId,
            operation: options?.operation,
            stack,
            recoverable: options?.recoverable ?? true
        };

        // 에러 히스토리에 추가
        setErrorHistory(prev => {
            const newHistory = [...prev, errorInfo];
            // 최대 100개 에러만 유지
            return newHistory.slice(-100);
        });

        // 콘솔에 로깅
        console.error(`[${errorInfo.severity.toUpperCase()}] ${contextMessage}`, {
            errorInfo,
            error
        });

        // 사용자에게 표시할 에러 메시지 설정
        setError(contextMessage);

        // 심각한 에러의 경우 추가 처리
        if (options?.severity === 'critical') {
            console.error('Critical error detected:', errorInfo);
            // 필요시 외부 모니터링 시스템에 전송
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const clearErrorHistory = useCallback(() => {
        setErrorHistory([]);
        retryCountRef.current.clear();
    }, []);

    const addRollbackPoint = useCallback((info: RollbackInfo) => {
        setRollbackStack(prev => {
            const newStack = [...prev, info];
            // 최대 50개 롤백 포인트만 유지
            return newStack.slice(-50);
        });
    }, []);

    const rollback = useCallback(async (steps: number = 1): Promise<boolean> => {
        try {
            const currentStack = rollbackStack;
            if (currentStack.length === 0) {
                handleError('롤백할 작업이 없습니다.', 'Rollback', {
                    type: 'validation',
                    severity: 'low'
                });
                return false;
            }

            const rollbackPoints = currentStack.slice(-steps);

            for (const point of rollbackPoints.reverse()) {
                try {
                    switch (point.operation) {
                        case 'create':
                            // 생성된 요소 삭제
                            if (point.elementId) {
                                // 실제 삭제 로직은 상위 컴포넌트에서 처리
                                console.log(`Rolling back element creation: ${point.elementId}`);
                            }
                            break;

                        case 'update':
                            // 이전 상태로 복원
                            if (point.previousState) {
                                console.log(`Rolling back element update: ${point.elementId}`, point.previousState);
                                // 실제 업데이트 로직은 상위 컴포넌트에서 처리
                            }
                            break;

                        case 'delete':
                            // 삭제된 요소 복원
                            if (point.previousState) {
                                console.log(`Rolling back element deletion: ${point.elementId}`, point.previousState);
                                // 실제 복원 로직은 상위 컴포넌트에서 처리
                            }
                            break;

                        case 'move':
                            // 이전 위치로 복원
                            if (point.previousState) {
                                console.log(`Rolling back element move: ${point.elementId}`, point.previousState);
                                // 실제 이동 로직은 상위 컴포넌트에서 처리
                            }
                            break;
                    }
                } catch (rollbackError) {
                    handleError(rollbackError, `롤백 실패: ${point.operation}`, {
                        type: 'validation',
                        severity: 'high',
                        elementId: point.elementId,
                        operation: point.operation
                    });
                }
            }

            // 롤백 스택에서 처리된 포인트들 제거
            setRollbackStack(prev => prev.slice(0, -steps));

            return true;
        } catch (error) {
            handleError(error, '롤백 처리 중 오류', {
                type: 'validation',
                severity: 'high'
            });
            return false;
        }
    }, [rollbackStack, handleError]);

    const retryOperation = useCallback(async (
        operation: () => Promise<void>,
        maxRetries: number = 3
    ): Promise<void> => {
        const operationId = ElementUtils.generateId();
        let retryCount = retryCountRef.current.get(operationId) || 0;

        while (retryCount < maxRetries) {
            try {
                await operation();
                // 성공 시 재시도 카운트 초기화
                retryCountRef.current.delete(operationId);
                return;
            } catch (error) {
                retryCount++;
                retryCountRef.current.set(operationId, retryCount);

                if (retryCount >= maxRetries) {
                    handleError(error, `작업 재시도 실패 (${maxRetries}회 시도)`, {
                        type: 'network',
                        severity: 'high',
                        recoverable: false
                    });
                    throw error;
                } else {
                    // 재시도 전 대기 (지수 백오프)
                    const delay = Math.pow(2, retryCount) * 1000;
                    await ElementUtils.delay(delay);

                    handleError(error, `작업 재시도 중 (${retryCount}/${maxRetries})`, {
                        type: 'network',
                        severity: 'low',
                        recoverable: true
                    });
                }
            }
        }
    }, [handleError]);

    const validateElements = useCallback((elements: Element[]): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];

        // 기본 유효성 검사
        if (!Array.isArray(elements)) {
            errors.push('요소 배열이 유효하지 않습니다.');
            return { isValid: false, errors };
        }

        // 중복 ID 검사
        const ids = new Set<string>();
        elements.forEach((element, index) => {
            if (!element.id) {
                errors.push(`요소 ${index}: ID가 없습니다.`);
            } else if (ids.has(element.id)) {
                errors.push(`요소 ${index}: 중복된 ID (${element.id})`);
            } else {
                ids.add(element.id);
            }

            // 필수 필드 검사
            if (!element.tag) {
                errors.push(`요소 ${element.id}: 태그가 없습니다.`);
            }
            if (!element.page_id) {
                errors.push(`요소 ${element.id}: 페이지 ID가 없습니다.`);
            }
        });

        // 순환 참조 검사
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (elementId: string): boolean => {
            if (recursionStack.has(elementId)) {
                return true;
            }
            if (visited.has(elementId)) {
                return false;
            }

            visited.add(elementId);
            recursionStack.add(elementId);

            const element = elements.find(el => el.id === elementId);
            if (element?.parent_id) {
                if (hasCycle(element.parent_id)) {
                    return true;
                }
            }

            recursionStack.delete(elementId);
            return false;
        };

        elements.forEach(element => {
            if (hasCycle(element.id)) {
                errors.push(`요소 ${element.id}: 순환 참조가 감지되었습니다.`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }, []);

    const getErrorStats = useCallback(() => {
        const errorsByType: Record<string, number> = {};
        const errorsBySeverity: Record<string, number> = {};

        errorHistory.forEach(error => {
            errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
            errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
        });

        const recentErrors = errorHistory.slice(-10);

        return {
            totalErrors: errorHistory.length,
            errorsByType,
            errorsBySeverity,
            recentErrors
        };
    }, [errorHistory]);

    return {
        error,
        isLoading,
        errorHistory,
        rollbackStack,
        setError,
        setIsLoading,
        handleError,
        clearError,
        clearErrorHistory,
        addRollbackPoint,
        rollback,
        retryOperation,
        validateElements,
        getErrorStats
    };
};
