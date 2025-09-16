import { Element } from '../types/store';
import { elementsApi } from '../services/api';
//import { ComponentElementProps } from '../types/unified';

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

    static async getElementsByPageId(pageId: string): Promise<Element[]> {
        return await elementsApi.getElementsByPageId(pageId);
    }

    static async updateElementProps(elementId: string, props: Record<string, unknown>): Promise<Element> {
        return await elementsApi.updateElementProps(elementId, props);
    }

    static async waitForParentElement(pageId: string, parentId: string, maxRetries: number = 30, delay: number = 300): Promise<boolean> {
        for (let i = 0; i < maxRetries; i++) {
            try {
                // 모든 요소를 가져와서 부모 요소 찾기
                const elements = await elementsApi.getElementsByPageId(pageId);
                const parent = elements.find(el => el.id === parentId);
                if (parent) {
                    console.log(`✅ 부모 요소 찾음: ${parentId} (${i + 1}번째 시도)`);
                    return true;
                }
            } catch (error) {
                // 부모 요소가 아직 DB에 없음
                console.log(`⏳ 부모 요소 대기 중... (${i + 1}/${maxRetries})`);
                console.error(`❌ 부모 요소 찾기 실패: ${parentId} (${maxRetries}번 시도 후)`, error);
            }

            // 잠시 대기 후 재시도
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        console.error(`❌ 부모 요소 찾기 실패: ${parentId} (${maxRetries}번 시도 후)`);
        return false;
    }

    static async createChildElementWithParentCheck(
        childElement: Omit<Element, 'id' | 'created_at' | 'updated_at'>,
        pageId: string, // pageId 추가
        parentId: string
    ): Promise<Element> {
        // 부모 요소가 DB에 저장될 때까지 기다림
        const parentExists = await this.waitForParentElement(pageId, parentId); // pageId 전달
        if (!parentExists) {
            throw new Error(`부모 요소를 찾을 수 없습니다: ${parentId}`);
        }

        // 자식 요소 생성
        return await this.createElement(childElement);
    }
}
