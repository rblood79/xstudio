// 에러 타입 정의
export enum ApiErrorType {
    NETWORK_ERROR = 'NETWORK_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
    NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
    RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
    SERVER_ERROR = 'SERVER_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ApiError {
    type: ApiErrorType;
    message: string;
    code?: string;
    details?: unknown;
    operation?: string;
    timestamp: string;
}

// 에러 분류 함수
export const classifyError = (error: unknown, operation: string): ApiError => {
    const timestamp = new Date().toISOString();

    if (error instanceof Error) {
        const message = error.message.toLowerCase();

        // 네트워크 에러
        if (message.includes('network') || message.includes('fetch')) {
            return {
                type: ApiErrorType.NETWORK_ERROR,
                message: '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.',
                operation,
                timestamp
            };
        }

        // 인증 에러
        if (message.includes('auth') || message.includes('unauthorized')) {
            return {
                type: ApiErrorType.AUTHENTICATION_ERROR,
                message: '인증이 필요합니다. 다시 로그인해주세요.',
                operation,
                timestamp
            };
        }

        // 권한 에러
        if (message.includes('forbidden') || message.includes('permission')) {
            return {
                type: ApiErrorType.AUTHORIZATION_ERROR,
                message: '이 작업을 수행할 권한이 없습니다.',
                operation,
                timestamp
            };
        }

        // 찾을 수 없음 에러
        if (message.includes('not found') || message.includes('404')) {
            return {
                type: ApiErrorType.NOT_FOUND_ERROR,
                message: '요청한 데이터를 찾을 수 없습니다.',
                operation,
                timestamp
            };
        }

        // Rate limit 에러
        if (message.includes('rate limit')) {
            return {
                type: ApiErrorType.RATE_LIMIT_ERROR,
                message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
                operation,
                timestamp
            };
        }

        // 서버 에러
        if (message.includes('500') || message.includes('server')) {
            return {
                type: ApiErrorType.SERVER_ERROR,
                message: '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
                operation,
                timestamp
            };
        }

        // 유효성 검사 에러
        if (message.includes('invalid') || message.includes('validation')) {
            return {
                type: ApiErrorType.VALIDATION_ERROR,
                message: error.message,
                operation,
                timestamp
            };
        }
    }

    // 알 수 없는 에러
    return {
        type: ApiErrorType.UNKNOWN_ERROR,
        message: '알 수 없는 오류가 발생했습니다.',
        operation,
        timestamp
    };
};

// 에러 로깅 및 모니터링
export const logError = (error: ApiError) => {
    // 콘솔 로깅
    console.error(`[${error.operation}] ${error.type}:`, error.message);

    // 개발 환경에서만 상세 로깅
    if (import.meta.env.DEV) {
        console.error('Error details:', error);
    }

    // 프로덕션에서는 에러 모니터링 서비스로 전송
    if (import.meta.env.PROD) {
        // TODO: Sentry, LogRocket 등 에러 모니터링 서비스 연동
        // sendToErrorMonitoring(error);
    }
};

// 사용자 친화적 에러 메시지 생성
export const getUserFriendlyMessage = (error: ApiError): string => {
    switch (error.type) {
        case ApiErrorType.NETWORK_ERROR:
            return '네트워크 연결을 확인해주세요.';
        case ApiErrorType.AUTHENTICATION_ERROR:
            return '로그인이 필요합니다.';
        case ApiErrorType.AUTHORIZATION_ERROR:
            return '권한이 없습니다.';
        case ApiErrorType.NOT_FOUND_ERROR:
            return '데이터를 찾을 수 없습니다.';
        case ApiErrorType.RATE_LIMIT_ERROR:
            return '잠시 후 다시 시도해주세요.';
        case ApiErrorType.SERVER_ERROR:
            return '서버 오류가 발생했습니다.';
        case ApiErrorType.VALIDATION_ERROR:
            return error.message;
        default:
            return '오류가 발생했습니다.';
    }
};

// 에러 복구 전략
export const getRecoveryStrategy = (error: ApiError): string | null => {
    switch (error.type) {
        case ApiErrorType.NETWORK_ERROR:
            return '네트워크 연결을 확인하고 다시 시도해주세요.';
        case ApiErrorType.AUTHENTICATION_ERROR:
            return '로그인 페이지로 이동하시겠습니까?';
        case ApiErrorType.RATE_LIMIT_ERROR:
            return '잠시 후 자동으로 다시 시도됩니다.';
        case ApiErrorType.SERVER_ERROR:
            return '서버가 복구되면 자동으로 다시 시도됩니다.';
        default:
            return null;
    }
};

// React Hook for error handling
export const useErrorHandler = () => {
    const handleError = (error: unknown, operation: string) => {
        const apiError = classifyError(error, operation);
        logError(apiError);

        // 사용자에게 알림 표시 (토스트, 모달 등)
        // showNotification(getUserFriendlyMessage(apiError), 'error');

        return apiError;
    };

    const handleAsyncError = async <T>(
        operation: () => Promise<T>,
        operationName: string
    ): Promise<T | null> => {
        try {
            return await operation();
        } catch (error) {
            handleError(error, operationName);
            return null;
        }
    };

    return { handleError, handleAsyncError };
};

// 에러 복구를 위한 재시도 로직
export const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries) {
                break;
            }

            // 지수 백오프
            const waitTime = delay * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    throw lastError;
};