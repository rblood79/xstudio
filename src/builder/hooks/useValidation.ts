import { useCallback } from 'react';
import { Element } from '../../types/core/store.types';

export interface UseValidationReturn {
    validateOrderNumbers: (elements: Element[]) => void;
}

export const useValidation = (): UseValidationReturn => {
    const validateOrderNumbers = useCallback((elements: Element[]) => {
        if (process.env.NODE_ENV !== 'development') return;

        // 페이지별, 부모별로 그룹화
        const groups = elements.reduce((acc, element) => {
            const key = `${element.page_id}_${element.parent_id || 'root'}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(element);
            return acc;
        }, {} as Record<string, Element[]>);

        Object.entries(groups).forEach(([, children]) => {
            // order_num으로 정렬
            const sorted = children.sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

            sorted.forEach((child, index) => {
                // order_num은 0부터 시작 (0-based indexing)
                const expectedOrder = index;
                const actualOrder = child.order_num || 0;
                const isValid = actualOrder === expectedOrder;

                if (!isValid) {
                    console.warn(`Order mismatch detected for ${child.tag} (${child.id.slice(0, 8)}...): order_num=${actualOrder}, expected=${expectedOrder}`);
                }
            });
        });
    }, []);

    return {
        validateOrderNumbers
    };
};
