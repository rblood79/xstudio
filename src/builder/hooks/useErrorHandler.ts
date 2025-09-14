import { useState, useCallback } from 'react';

export interface UseErrorHandlerReturn {
    error: string | null;
    isLoading: boolean;
    setError: (error: string | null) => void;
    setIsLoading: (loading: boolean) => void;
    handleError: (error: unknown, context?: string) => void;
    clearError: () => void;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleError = useCallback((error: unknown, context?: string) => {
        console.error(`${context || 'Error'}:`, error);
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        const contextMessage = context ? `${context} 중 오류가 발생했습니다: ${errorMessage}` : errorMessage;
        setError(contextMessage);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        error,
        isLoading,
        setError,
        setIsLoading,
        handleError,
        clearError
    };
};
