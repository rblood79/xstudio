import { useCallback, useRef, useEffect } from 'react';
import { Element } from '../../types/store';
import { elementsApi } from '../../services/api/ElementsApiService';
import { HierarchyManager } from '../utils/HierarchyManager';
import { ComponentFactory } from '../factories/ComponentFactory';
import { useErrorHandler, type ErrorInfo } from './useErrorHandler';
import {
    ComponentElementProps,
    createDefaultButtonProps,
    createDefaultTextFieldProps,
    createDefaultToggleButtonGroupProps,
    createDefaultCheckboxGroupProps,
    createDefaultRadioGroupProps,
    createDefaultSelectProps,
    createDefaultComboBoxProps,
    createDefaultTabsProps,
    createDefaultTreeProps,
    createDefaultTagGroupProps,
    createDefaultListBoxProps,
    createDefaultGridListProps
} from '../../types/componentProps';

export interface UseElementCreatorReturn {
    getDefaultProps: (tag: string) => ComponentElementProps;
    handleAddElement: (
        tag: string,
        currentPageId: string,
        selectedElementId: string | null,
        elements: Element[],
        addElement: (element: Element) => void,
        sendElementsToIframe: (elements: Element[]) => void
    ) => Promise<void>;
    getPerformanceStats: () => {
        cacheSize: number;
        childrenCacheSize: number;
        orderNumCacheSize: number;
        hitRate: number;
    };
    clearCache: () => void;
    updateCacheConfig: (config: Partial<{
        maxCacheSize: number;
        enableIncrementalUpdate: boolean;
        enableBatchProcessing: boolean;
        batchSize: number;
    }>) => void;
    getErrorStats: () => {
        totalErrors: number;
        errorsByType: Record<string, number>;
        errorsBySeverity: Record<string, number>;
        recentErrors: ErrorInfo[];
    };
    rollback: (steps?: number) => Promise<boolean>;
    retryLastOperation: () => Promise<void>;
}

export const useElementCreator = (): UseElementCreatorReturn => {
    const isProcessingRef = useRef(false);
    const elementsRef = useRef<Element[]>([]);
    const lastOperationRef = useRef<(() => Promise<void>) | null>(null);

    const {
        handleError,
        addRollbackPoint,
        rollback,
        retryOperation,
        validateElements,
        getErrorStats
    } = useErrorHandler();

    // 성능 최적화 설정 초기화
    useEffect(() => {
        HierarchyManager.updateConfig({
            maxCacheSize: 500,
            enableIncrementalUpdate: true,
            enableBatchProcessing: true,
            batchSize: 50
        });
    }, []);

    const getDefaultProps = useCallback((tag: string): ComponentElementProps => {
        switch (tag) {
            case 'Button':
                return createDefaultButtonProps();
            case 'TextField':
                return createDefaultTextFieldProps();
            case 'ToggleButtonGroup':
                return createDefaultToggleButtonGroupProps();
            case 'CheckboxGroup':
                return createDefaultCheckboxGroupProps();
            case 'RadioGroup':
                return createDefaultRadioGroupProps();
            case 'Select':
                return createDefaultSelectProps();
            case 'ComboBox':
                return createDefaultComboBoxProps();
            case 'Tabs':
                return createDefaultTabsProps();
            case 'Tree':
                return createDefaultTreeProps();
            case 'TagGroup':
                return createDefaultTagGroupProps();
            case 'ListBox':
                return createDefaultListBoxProps();
            case 'GridList':
                return createDefaultGridListProps();
            default:
                // 기본 HTML 요소들 - any 타입 제거
                return {
                    //tag: tag as ComponentElementProps['tag'],
                    children: tag === 'Text' ? 'Text' : ''
                } as ComponentElementProps;
        }
    }, []);

    const handleAddElement = useCallback(async (
        tag: string,
        currentPageId: string,
        selectedElementId: string | null,
        elements: Element[],
        addElement: (element: Element) => void,
        sendElementsToIframe: (elements: Element[]) => void
    ) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        // 요소 유효성 검사
        const validation = validateElements(elements);
        if (!validation.isValid) {
            handleError(validation.errors.join(', '), '요소 유효성 검사 실패', {
                type: 'validation',
                severity: 'high'
            });
            isProcessingRef.current = false;
            return;
        }

        try {
            if (currentPageId) {
                // 요소 배열 참조 업데이트
                elementsRef.current = elements;

                const selectedElement = selectedElementId
                    ? elements.find(el => el.id === selectedElementId)
                    : null;

                // 롤백 포인트 추가
                addRollbackPoint({
                    operation: 'create',
                    elementId: 'pending',
                    previousElements: [...elements],
                    timestamp: new Date()
                });

                // 복합 컴포넌트인지 확인
                const complexComponents = [
                    'TextField', 'ToggleButtonGroup', 'CheckboxGroup', 'RadioGroup',
                    'Select', 'ComboBox', 'Tabs', 'Tree', 'TagGroup', 'ListBox', 'GridList'
                ];

                const operation = async () => {
                    if (complexComponents.includes(tag)) {
                        // ComponentFactory를 사용하여 복합 컴포넌트 생성
                        const result = await ComponentFactory.createComplexComponent(
                            tag,
                            selectedElement ?? null,
                            currentPageId,
                            addElement
                        );

                        // 증분 업데이트로 캐시 최적화
                        const updatedElements = [...elements, ...result.allElements];
                        HierarchyManager.incrementalUpdate(updatedElements, result.parent.id);

                        // iframe에 업데이트된 요소들 전송
                        sendElementsToIframe(updatedElements);
                    } else {
                        // 단순 컴포넌트 생성 (캐시 활용)
                        const parentId = selectedElementId || null;
                        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

                        const newElement: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
                            tag,
                            props: getDefaultProps(tag),
                            page_id: currentPageId,
                            parent_id: parentId,
                            order_num: orderNum
                        };

                        const data = await elementsApi.createElement(newElement);
                        addElement(data);

                        // 증분 업데이트로 캐시 최적화
                        const updatedElements = [...elements, data];
                        HierarchyManager.incrementalUpdate(updatedElements, data.id);

                        // iframe에 업데이트된 요소들 전송
                        sendElementsToIframe(updatedElements);
                    }
                };

                // 마지막 작업 저장 (재시도용)
                lastOperationRef.current = operation;

                // 재시도 로직과 함께 작업 실행
                await retryOperation(operation, 3);

            }
        } catch (error) {
            handleError(error, `요소 생성 실패: ${tag}`, {
                type: 'creation',
                severity: 'high',
                elementId: selectedElementId || undefined,
                operation: 'create',
                recoverable: true
            });
        } finally {
            isProcessingRef.current = false;
        }
    }, [getDefaultProps, handleError, addRollbackPoint, retryOperation, validateElements]);

    const getPerformanceStats = useCallback(() => {
        return HierarchyManager.getPerformanceStats();
    }, []);

    const clearCache = useCallback(() => {
        HierarchyManager.clearCache();
    }, []);

    const updateCacheConfig = useCallback((config: Partial<{
        maxCacheSize: number;
        enableIncrementalUpdate: boolean;
        enableBatchProcessing: boolean;
        batchSize: number;
    }>) => {
        HierarchyManager.updateConfig(config);
    }, []);

    const retryLastOperation = useCallback(async () => {
        if (lastOperationRef.current) {
            await retryOperation(lastOperationRef.current, 3);
        }
    }, [retryOperation]);

    return {
        getDefaultProps,
        handleAddElement,
        getPerformanceStats,
        clearCache,
        updateCacheConfig,
        getErrorStats,
        rollback,
        retryLastOperation
    };
};
