import { Element } from '../types/store';
import { elementsApi } from '../services/api';
//import { ComponentElementProps } from '../types/unified';

// 통합 요소 관리 유틸리티
export class ElementUtils {
    static generateId(): string {
        return crypto.randomUUID();
    }

    static async createElement(element: Partial<Element>): Promise<Element> {
        //console.log('🔍 ElementUtils.createElement 호출 - 전체 element:', element);
        //console.log('🔍 ElementUtils.createElement 호출 - 전달된 ID:', element.id);
        const result = await elementsApi.createElement(element);
        //console.log('✅ ElementUtils.createElement 완료 - 반환된 ID:', result.id);
        return result;
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

    static async waitForParentElement(pageId: string, parentId: string, maxRetries: number = 100, delay: number = 500): Promise<boolean> {
        for (let i = 0; i < maxRetries; i++) {
            try {
                // 모든 요소를 가져와서 부모 요소 찾기
                const elements = await elementsApi.getElementsByPageId(pageId);
                const parent = elements.find(el => el.id === parentId);
                if (parent) {
                    //console.log(`✅ 부모 요소 찾음: ${parentId} (${i + 1}번째 시도)`);
                    return true;
                }
            } catch (error) {
                // 부모 요소가 아직 DB에 없음
                console.log(`⏳ 부모 요소 대기 중... (${i + 1}/${maxRetries})`, error);
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

    /**
     * 해당 page의 body 요소를 찾아 ID 반환
     * parent_id가 없을 때 자동으로 body를 parent로 설정하기 위해 사용
     */
    static findBodyElement(elements: Element[], pageId: string): string | null {
        const bodyElement = elements.find(
            el => el.page_id === pageId && el.tag === 'body'
        );
        return bodyElement?.id || null;
    }

    /**
     * 페이지의 모든 orphan 요소(parent_id가 null)를 body의 자식으로 마이그레이션
     * body 요소 자체는 제외
     *
     * @param elements - 전체 요소 배열
     * @param pageId - 대상 페이지 ID
     * @returns 마이그레이션된 요소 배열과 업데이트가 필요한 요소 목록
     */
    static migrateOrphanElementsToBody(
        elements: Element[],
        pageId: string
    ): { elements: Element[]; updatedElements: Element[] } {
        const bodyElement = elements.find(
            el => el.page_id === pageId && el.tag === 'body'
        );

        if (!bodyElement) {
            console.warn(`⚠️ Body element not found for page: ${pageId}`);
            return { elements, updatedElements: [] };
        }

        const updatedElements: Element[] = [];
        const migratedElements = elements.map(el => {
            // body가 아니면서 parent_id가 null인 요소를 body의 자식으로 변경
            if (el.page_id === pageId && el.tag !== 'body' && el.parent_id === null) {
                console.log(`📦 Migrating orphan element to body: ${el.tag} (${el.id})`);
                const updated = { ...el, parent_id: bodyElement.id };
                updatedElements.push(updated);
                return updated;
            }
            return el;
        });

        if (updatedElements.length > 0) {
            console.log(`✅ Migrated ${updatedElements.length} orphan elements to body`);
        }

        return { elements: migratedElements, updatedElements };
    }
}
