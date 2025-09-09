import { BaseApiService } from './BaseApiService';
import { Element } from '../../types/store';

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
                .select('*')
                .single();
        });
    }

    async updateElement(elementId: string, updates: Partial<Element>): Promise<Element> {
        this.validateInput(elementId, (id) => typeof id === 'string' && id.length > 0, 'updateElement');
        this.validateInput(updates, (u) => u && typeof u === 'object', 'updateElement');

        return this.handleApiCall('updateElement', async () => {
            return await this.supabase
                .from("elements")
                .update(updates)
                .eq("id", elementId)
                .select('*')
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
                .select('*')
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

    async deleteMultipleElements(elementIds: string[]): Promise<void> {
        this.validateInput(elementIds, (ids) => Array.isArray(ids) && ids.length > 0, 'deleteMultipleElements');

        await this.handleDeleteCall('deleteMultipleElements', async () => {
            return await this.supabase
                .from("elements")
                .delete()
                .in("id", elementIds);
        });
    }
}

// 싱글톤 인스턴스
export const elementsApi = new ElementsApiService();
