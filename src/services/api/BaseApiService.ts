import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../env/supabase.client';
import { Element } from '../../types/store';
import { classifyError, logError, ApiError, ApiErrorType } from './ErrorHandler';

export abstract class BaseApiService {
    protected readonly supabase: SupabaseClient;
    private readonly rateLimiter = new Map<string, number>();
    // 개발 환경에서는 rate limit 완화 (1000 req/min), 프로덕션에서는 60 req/min
    private readonly maxRequestsPerMinute = import.meta.env.DEV ? 1000 : 60;

    constructor() {
        // 전역 싱글톤 인스턴스 사용
        this.supabase = supabase;
    }

    protected async rateLimitCheck(operation: string): Promise<boolean> {
        const now = Date.now();
        const key = `${operation}-${Math.floor(now / 60000)}`;
        const count = this.rateLimiter.get(key) || 0;

        if (count >= this.maxRequestsPerMinute) {
            const error: ApiError = {
                type: ApiErrorType.RATE_LIMIT_ERROR,
                message: 'Rate limit exceeded. Please try again later.',
                operation,
                timestamp: new Date().toISOString()
            };
            logError(error);
            throw new Error(error.message);
        }

        this.rateLimiter.set(key, count + 1);

        // 개발 환경에서만 디버그 로그
        if (import.meta.env.DEV && count > 10) {
            console.warn(`[Rate Limit] ${operation}: ${count + 1}/${this.maxRequestsPerMinute} requests in this minute`);
        }

        return true;
    }

    protected validateInput<T>(input: T, validator: (input: T) => boolean, operation: string): T {
        if (!validator(input)) {
            const error: ApiError = {
                type: ApiErrorType.VALIDATION_ERROR,
                message: 'Invalid input provided',
                operation,
                timestamp: new Date().toISOString()
            };
            logError(error);
            throw new Error(error.message);
        }
        return input;
    }

    protected async handleApiCall<T>(
        operation: string,
        apiCall: () => Promise<{ data: T | null; error: unknown }>
    ): Promise<T> {
        await this.rateLimitCheck(operation);

        try {
            const { data, error } = await apiCall();

            if (error) {
                const apiError = classifyError(error, operation);
                logError(apiError);
                throw new Error(apiError.message);
            }

            if (!data) {
                const apiError: ApiError = {
                    type: ApiErrorType.NOT_FOUND_ERROR,
                    message: `No data returned from ${operation}`,
                    operation,
                    timestamp: new Date().toISOString()
                };
                logError(apiError);
                throw new Error(apiError.message);
            }

            return data;
        } catch (error) {
            const apiError = classifyError(error, operation);
            logError(apiError);
            throw error;
        }
    }

    // 삭제 작업을 위한 별도 메서드 (데이터 반환 불필요)
    protected async handleDeleteCall(
        operation: string,
        apiCall: () => Promise<{ error: unknown }>
    ): Promise<void> {
        await this.rateLimitCheck(operation);

        try {
            const { error } = await apiCall();

            if (error) {
                const apiError = classifyError(error, operation);
                logError(apiError);
                throw new Error(apiError.message);
            }
        } catch (error) {
            const apiError = classifyError(error, operation);
            logError(apiError);
            throw error;
        }
    }
}

// Elements API Service
export class ElementsApiService extends BaseApiService {
    async fetchElements(pageId: string): Promise<Element[]> {
        this.validateInput(pageId, (id) => typeof id === 'string' && id.length > 0, 'fetchElements');

        return this.handleApiCall('fetchElements', async () => {
            return await this.supabase
                .from("elements")
                .select("*")
                .eq("page_id", pageId)
                .order('order_num', { ascending: true });
        });
    }

    async createElement(element: Partial<Element>): Promise<Element> {
        this.validateInput(element, (el) => el && typeof el === 'object', 'createElement');

        return this.handleApiCall('createElement', async () => {
            return await this.supabase
                .from("elements")
                .insert([element])
                .select()
                .single();
        });
    }

    async updateElementProps(elementId: string, props: Record<string, unknown>): Promise<Element> {
        this.validateInput(elementId, (id) => typeof id === 'string' && id.length > 0, 'updateElementProps');
        this.validateInput(props, (p) => p && typeof p === 'object', 'updateElementProps');

        return this.handleApiCall('updateElementProps', async () => {
            return await this.supabase
                .from("elements")
                .update({ props })
                .eq("id", elementId)
                .select()
                .single();
        });
    }

    async deleteElement(elementId: string): Promise<void> {
        this.validateInput(elementId, (id) => typeof id === 'string' && id.length > 0, 'deleteElement');

        await this.handleDeleteCall('deleteElement', async () => {
            return await this.supabase
                .from("elements")
                .delete()
                .eq("id", elementId);
        });
    }
}

// 싱글톤 인스턴스
export const elementsApi = new ElementsApiService();
