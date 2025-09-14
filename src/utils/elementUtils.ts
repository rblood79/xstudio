import { Element } from '../types/store';
import { elementsApi } from '../services/api';

// 통합 요소 관리 유틸리티
export class ElementUtils {
    static generateId(): string {
        return crypto.randomUUID();
    }

    static async createElement(element: Omit<Element, 'id' | 'created_at' | 'updated_at'>): Promise<Element> {
        return await elementsApi.createElement(element);
    }

    static async deleteElement(elementId: string): Promise<void> {
        return await elementsApi.deleteElement(elementId);
    }

    static async updateElement(elementId: string, element: Element): Promise<Element> {
        return await elementsApi.updateElement(elementId, element);
    }

    static async delay(ms: number = 0): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
