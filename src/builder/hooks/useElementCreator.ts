import { useCallback, useRef, useEffect } from 'react';
import { Element, ComponentElementProps } from '../../types/builder/unified.types';
import { elementsApi } from '../../services/api/ElementsApiService';
import { HierarchyManager } from '../utils/HierarchyManager';
import { ComponentFactory } from '../factories/ComponentFactory';
import { useErrorHandler, type ErrorInfo } from './useErrorHandler';
import { generateCustomId } from '../utils/idGeneration';
import {
    createDefaultButtonProps,
    createDefaultLinkProps,
    createDefaultTextFieldProps,
    createDefaultCheckboxProps,
    createDefaultRadioProps,
    createDefaultToggleButtonProps,
    createDefaultToggleButtonGroupProps,
    createDefaultCheckboxGroupProps,
    createDefaultRadioGroupProps,
    createDefaultSelectProps,
    createDefaultComboBoxProps,
    createDefaultSliderProps,
    createDefaultSwitchProps,
    createDefaultTabsProps,
    createDefaultTabProps,
    createDefaultPanelProps,
    createDefaultTreeProps,
    createDefaultTreeItemProps,
    createDefaultCalendarProps,
    createDefaultDatePickerProps,
    createDefaultDateRangePickerProps,
    createDefaultTableProps,
    createDefaultCardProps,
    createDefaultBadgeProps,
    createDefaultTagGroupProps,
    createDefaultTagProps,
    createDefaultListBoxProps,
    createDefaultListBoxItemProps,
    createDefaultGridListProps,
    createDefaultGridListItemProps,
    createDefaultTextProps,
    createDefaultDivProps,
    createDefaultSectionProps,
    createDefaultNavProps
} from '../../types/builder/unified.types';
import { ElementUtils } from '../../utils/element/elementUtils';
//import { useStore } from '../stores';

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
    const isConfiguredRef = useRef(false);

    const {
        handleError,
        addRollbackPoint,
        rollback,
        retryOperation,
        validateElements,
        getErrorStats
    } = useErrorHandler();

    // HierarchyManager 설정 최적화
    useEffect(() => {
        if (!isConfiguredRef.current) {
            HierarchyManager.updateConfig({
                maxCacheSize: 500,
                enableIncrementalUpdate: true,
                enableBatchProcessing: true,
                batchSize: 50
            });
            isConfiguredRef.current = true;
        }
    }, []); // 빈 의존성 배열로 한 번만 실행

    const getDefaultProps = useCallback((tag: string): ComponentElementProps => {
        console.log('🎯 getDefaultProps called for tag:', tag);
        switch (tag) {
            case 'Button': {
                const buttonProps = createDefaultButtonProps();
                console.log('✅ Button props created:', buttonProps);
                return buttonProps;
            }
            case 'Link':
                return createDefaultLinkProps();
            case 'TextField':
                return createDefaultTextFieldProps();
            case 'Checkbox':
                return createDefaultCheckboxProps();
            case 'Radio':
                return createDefaultRadioProps();
            case 'ToggleButton':
                return createDefaultToggleButtonProps();
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
            case 'Slider':
                return createDefaultSliderProps();
            case 'Switch':
                return createDefaultSwitchProps();
            case 'Tabs':
                return createDefaultTabsProps();
            case 'Tab':
                return createDefaultTabProps();
            case 'Panel':
                return createDefaultPanelProps();
            case 'Tree':
                return createDefaultTreeProps();
            case 'TreeItem':
                return createDefaultTreeItemProps();
            case 'Calendar':
                return createDefaultCalendarProps();
            case 'DatePicker':
                return createDefaultDatePickerProps();
            case 'DateRangePicker':
                return createDefaultDateRangePickerProps();
            case 'Table':
                return createDefaultTableProps();
            case 'Card':
                return createDefaultCardProps();
            case 'Badge':
                return createDefaultBadgeProps();
            case 'TagGroup':
                return createDefaultTagGroupProps();
            case 'Tag':
                return createDefaultTagProps();
            case 'ListBox':
                return createDefaultListBoxProps();
            case 'ListBoxItem':
                return createDefaultListBoxItemProps();
            case 'GridList':
                return createDefaultGridListProps();
            case 'GridListItem':
                return createDefaultGridListItemProps();
            case 'Text':
                return createDefaultTextProps();
            case 'Div':
                return createDefaultDivProps();
            case 'Section':
                return createDefaultSectionProps();
            case 'Nav':
                return createDefaultNavProps();
            default:
                // 기본 HTML 요소들 - any 타입 제거
                return {
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
                    'Select', 'ComboBox', 'Tabs', 'Tree', 'TagGroup', 'ListBox', 'GridList', 'Table'
                ];

                const operation = async () => {
                    if (complexComponents.includes(tag)) {
                        console.log(`🏗️ 복합 컴포넌트 생성 시작: ${tag}`);
                        // ComponentFactory를 사용하여 복합 컴포넌트 생성
                        const result = await ComponentFactory.createComplexComponent(
                            tag,
                            selectedElement ?? null,
                            currentPageId,
                            elements // addElement 매개변수 제거
                        );
                        console.log(`✅ 복합 컴포넌트 생성 완료: ${tag}, 총 ${result.allElements.length}개 요소 생성`);

                        // 증분 업데이트로 캐시 최적화
                        const updatedElements = [...elements, ...result.allElements];
                        HierarchyManager.incrementalUpdate(updatedElements, result.parent.id);

                        // iframe에 업데이트된 요소들 전송
                        sendElementsToIframe(updatedElements);
                    } else {
                        console.log(`🔧 단순 컴포넌트 생성: ${tag}`);
                        // 단순 컴포넌트 생성 (캐시 활용)
                        // parent_id가 없으면 body 요소를 parent로 설정
                        let parentId = selectedElementId || null;
                        if (!parentId) {
                            parentId = ElementUtils.findBodyElement(elements, currentPageId);
                        }
                        const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

                        const newElement: Element = {
                            id: crypto.randomUUID(), // UUID 생성
                            tag,
                            customId: generateCustomId(tag, elements),
                            props: getDefaultProps(tag),
                            page_id: currentPageId,
                            parent_id: parentId,
                            order_num: orderNum,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };

                        // addElement 호출 (내부에서 DB 저장 처리)
                        addElement(newElement);

                        // 증분 업데이트로 캐시 최적화
                        const updatedElements = [...elements, newElement];
                        HierarchyManager.incrementalUpdate(updatedElements, newElement.id);

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
