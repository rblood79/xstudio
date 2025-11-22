import { useCallback } from 'react';
import { Element } from '../../types/core/store.types';

export interface UseValidationReturn {
    validateOrderNumbers: (elements: Element[]) => void;
}

export const useValidation = (): UseValidationReturn => {
    const validateOrderNumbers = useCallback((elements: Element[]) => {
        if (process.env.NODE_ENV !== 'development') return;

        // 페이지별/레이아웃별, 부모별로 그룹화
        // ⭐ Layout/Slot System: layout_id도 그룹핑 키에 포함
        const groups = elements.reduce((acc, element) => {
            const contextId = element.page_id || element.layout_id || 'unknown';
            const key = `${contextId}_${element.parent_id || 'root'}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(element);
            return acc;
        }, {} as Record<string, Element[]>);

        Object.entries(groups).forEach(([, children]) => {
            // order_num으로 정렬
            const sorted = children.sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

            // ✅ 중복이나 순서 역전만 확인 (0부터 시작할 필요는 없음)
            for (let i = 0; i < sorted.length - 1; i++) {
                const current = sorted[i];
                const next = sorted[i + 1];
                const currentOrder = current.order_num || 0;
                const nextOrder = next.order_num || 0;

                // 중복 order_num 확인
                if (currentOrder === nextOrder) {
                    console.warn(
                        `❌ Duplicate order_num detected: ${current.tag} (${current.id.slice(0, 8)}...) and ${next.tag} (${next.id.slice(0, 8)}...) both have order_num=${currentOrder}`
                    );
                }

                // 순서 역전 확인 (정렬 후에는 발생하지 않지만, 데이터 무결성 확인)
                if (currentOrder > nextOrder) {
                    console.warn(
                        `❌ Order reversal detected: ${current.tag} (${current.id.slice(0, 8)}..., order_num=${currentOrder}) > ${next.tag} (${next.id.slice(0, 8)}..., order_num=${nextOrder})`
                    );
                }
            }
        });
    }, []);

    return {
        validateOrderNumbers
    };
};
