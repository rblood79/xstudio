import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Element } from '../../types/store';

export abstract class BaseApiService {
    protected readonly supabase: SupabaseClient;
    private readonly rateLimiter = new Map<string, number>();
    private readonly maxRequestsPerMinute = 60;

    constructor() {
        this.supabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY,
            {
                auth: {
                    persistSession: true,
                    storageKey: import.meta.env.DEV ? 'xstudio-auth-dev' : 'xstudio-auth-prod'
                },
                global: {
                    headers: {
                        'X-Client-Version': '1.0.0',
                        'X-Request-ID': crypto.randomUUID()
                    }
                }
            }
        );
    }

    protected async rateLimitCheck(operation: string): Promise<boolean> {
        const now = Date.now();
        const key = `${operation}-${Math.floor(now / 60000)}`;
        const count = this.rateLimiter.get(key) || 0;

        if (count >= this.maxRequestsPerMinute) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        this.rateLimiter.set(key, count + 1);
        return true;
    }

    protected validateInput<T>(input: T, validator: (input: T) => boolean): T {
        if (!validator(input)) {
            throw new Error('Invalid input provided');
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
                console.error(`API Error [${operation}]:`, error);
                throw new Error(`API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            if (!data) {
                throw new Error(`No data returned from ${operation}`);
            }

            return data;
        } catch (error) {
            // 에러 로깅 및 모니터링
            this.logError(operation, error);
            throw error;
        }
    }

    private logError(operation: string, error: unknown) {
        // 에러 모니터링 서비스로 전송 (예: Sentry)
        console.error(`[${operation}] Error:`, error);
    }
}

// Elements API Service
export class ElementsApiService extends BaseApiService {
    async fetchElements(pageId: string): Promise<Element[]> {
        this.validateInput(pageId, (id) => typeof id === 'string' && id.length > 0);

        return this.handleApiCall('fetchElements', async () => {
            return await this.supabase
                .from("elements")
                .select("*")
                .eq("page_id", pageId)
                .order('order_num', { ascending: true });
        });
    }

    async createElement(element: Partial<Element>): Promise<Element> {
        this.validateInput(element, (el) => el && typeof el === 'object');

        return this.handleApiCall('createElement', async () => {
            return await this.supabase
                .from("elements")
                .insert([element])
                .select()
                .single();
        });
    }

    async updateElementProps(elementId: string, props: Record<string, unknown>): Promise<Element> {
        this.validateInput(elementId, (id) => typeof id === 'string' && id.length > 0);
        this.validateInput(props, (p) => p && typeof p === 'object');

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
        this.validateInput(elementId, (id) => typeof id === 'string' && id.length > 0);

        await this.handleApiCall('deleteElement', async () => {
            return await this.supabase
                .from("elements")
                .delete()
                .eq("id", elementId);
        });
    }
}

// 싱글톤 인스턴스
export const elementsApi = new ElementsApiService();
