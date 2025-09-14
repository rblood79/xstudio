import { useCallback, useRef } from 'react';
import type { ElementProps } from '../../types/supabase';
import { Element } from '../../types/store';
import { elementsApi } from '../../services/api/ElementsApiService';
//import { useStore } from '../stores';
import { HierarchyManager } from '../utils/HierarchyManager';
import { ComponentFactory } from '../factories/ComponentFactory';

export interface UseElementCreatorReturn {
    getDefaultProps: (tag: string) => ElementProps;
    handleAddElement: (
        tag: string,
        currentPageId: string,
        selectedElementId: string | null,
        elements: Element[],
        addElement: (element: Element) => void,
        sendElementsToIframe: (elements: Element[]) => void
    ) => Promise<void>;
}

export const useElementCreator = (): UseElementCreatorReturn => {
    const isProcessingRef = useRef(false);

    const getDefaultProps = useCallback((tag: string): ElementProps => {
        const baseProps: ElementProps = {
            style: {},
            className: '',
            children: '',
            events: []
        };

        switch (tag) {
            case 'Button':
                return {
                    ...baseProps,
                    children: 'Button',
                    variant: 'default',
                    size: 'medium',
                    isDisabled: false
                };

            case 'TextField':
                return {
                    ...baseProps,
                    label: 'Text Field',
                    placeholder: 'Enter text...',
                    value: '',
                    type: 'text',
                    isRequired: false,
                    isDisabled: false,
                    isReadOnly: false
                };

            case 'Input':
                return {
                    ...baseProps,
                    type: 'text',
                    placeholder: 'Enter text...',
                    value: '',
                    isDisabled: false,
                    isReadOnly: false
                };

            case 'Checkbox':
                return {
                    ...baseProps,
                    children: 'Checkbox',
                    isSelected: false,
                    isIndeterminate: false,
                    isDisabled: false
                };

            case 'Radio':
                return {
                    ...baseProps,
                    children: 'Radio',
                    value: '',
                    isDisabled: false
                };

            case 'Label':
                return {
                    ...baseProps,
                    children: 'Label'
                };

            case 'Description':
                return {
                    ...baseProps,
                    text: 'Description'
                };

            case 'FieldError':
                return {
                    ...baseProps,
                    text: 'Error message'
                };

            case 'ToggleButton':
                return {
                    ...baseProps,
                    children: 'Toggle Button',
                    isSelected: false,
                    isDisabled: false
                };

            case 'ToggleButtonGroup':
                return {
                    ...baseProps,
                    orientation: 'horizontal',
                    selectionMode: 'single',
                    value: []
                };

            case 'CheckboxGroup':
                return {
                    ...baseProps,
                    label: 'Checkbox Group',
                    orientation: 'vertical',
                    value: []
                };

            case 'RadioGroup':
                return {
                    ...baseProps,
                    label: 'Radio Group',
                    orientation: 'vertical',
                    value: ''
                };

            case 'Select':
                return {
                    ...baseProps,
                    label: 'Select',
                    placeholder: 'Choose an option...',
                    selectedKey: undefined
                };

            case 'SelectItem':
                return {
                    ...baseProps,
                    label: 'Option',
                    value: 'option',
                    isDisabled: false
                };

            case 'ComboBox':
                return {
                    ...baseProps,
                    label: 'Combo Box',
                    placeholder: 'Type or select...',
                    inputValue: '',
                    allowsCustomValue: true,
                    selectedKey: undefined
                };

            case 'ComboBoxItem':
                return {
                    ...baseProps,
                    label: 'Option',
                    value: 'option',
                    isDisabled: false
                };

            case 'Slider':
                return {
                    ...baseProps,
                    label: 'Slider',
                    value: '[50]', // 문자열로 변경
                    minValue: '0', // 문자열로 변경
                    maxValue: '100', // 문자열로 변경
                    step: '1', // 문자열로 변경
                    orientation: 'horizontal'
                };

            case 'Tabs':
                return {
                    ...baseProps,
                    defaultSelectedKey: 'tab1',
                    orientation: 'horizontal'
                };

            case 'Tab':
                return {
                    ...baseProps,
                    title: 'Tab',
                    tabId: 'tab1'
                };

            case 'Panel':
                return {
                    ...baseProps,
                    title: 'Panel',
                    variant: 'default'
                };

            case 'Tree':
                return {
                    ...baseProps,
                    'aria-label': 'Tree',
                    selectionMode: 'single',
                    selectionBehavior: 'replace'
                };

            case 'TreeItem':
                return {
                    ...baseProps,
                    title: 'Tree Item',
                    hasChildren: false
                };

            case 'Calendar':
                return {
                    ...baseProps,
                    'aria-label': 'Calendar',
                    isDisabled: false,
                    visibleDuration: 1,
                    pageBehavior: 'visible'
                };

            case 'DatePicker':
                return {
                    ...baseProps,
                    label: 'Date Picker',
                    placeholder: 'Select date',
                    isDisabled: false,
                    isRequired: false,
                    isReadOnly: false,
                    granularity: 'day',
                    firstDayOfWeek: 0
                };

            case 'DateRangePicker':
                return {
                    ...baseProps,
                    label: 'Date Range Picker',
                    placeholder: 'Select date range',
                    isDisabled: false,
                    isRequired: false,
                    isReadOnly: false,
                    granularity: 'day',
                    firstDayOfWeek: 0
                };

            case 'Switch':
                return {
                    ...baseProps,
                    children: 'Switch',
                    isSelected: false,
                    isDisabled: false
                };

            case 'Table':
                return {
                    ...baseProps,
                    selectionMode: 'none',
                    selectionBehavior: 'toggle'
                };

            case 'Card':
                return {
                    ...baseProps,
                    title: 'Card',
                    description: 'Card description',
                    variant: 'default',
                    size: 'medium',
                    isQuiet: false,
                    isSelected: false,
                    isDisabled: false,
                    isFocused: false
                };

            case 'TagGroup':
                return {
                    ...baseProps,
                    label: 'Tag Group',
                    allowsRemoving: true,
                    selectionMode: 'multiple'
                };

            case 'Tag':
                return {
                    ...baseProps,
                    children: 'Tag',
                    isDisabled: false
                };

            case 'ListBox':
                return {
                    ...baseProps,
                    orientation: 'vertical',
                    selectionMode: 'single'
                };

            case 'ListBoxItem':
                return {
                    ...baseProps,
                    label: 'List Item',
                    value: 'item',
                    isDisabled: false
                };

            case 'GridList':
                return {
                    ...baseProps,
                    selectionMode: 'none'
                };

            case 'GridListItem':
                return {
                    ...baseProps,
                    label: 'Grid Item',
                    value: 'item',
                    isDisabled: false
                };

            case 'Text':
                return {
                    ...baseProps,
                    children: 'Text',
                    as: 'p'
                };

            case 'Div':
            case 'section':
            case 'Nav':
                return {
                    ...baseProps,
                    children: ''
                };

            default:
                return baseProps;
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

        try {
            if (currentPageId) {
                const selectedElement = selectedElementId
                    ? elements.find(el => el.id === selectedElementId)
                    : null;

                // 복합 컴포넌트인지 확인
                const complexComponents = [
                    'TextField', 'ToggleButtonGroup', 'CheckboxGroup', 'RadioGroup',
                    'Select', 'ComboBox', 'Tabs', 'Tree', 'TagGroup', 'ListBox', 'GridList'
                ];

                if (complexComponents.includes(tag)) {
                    // ComponentFactory를 사용하여 복합 컴포넌트 생성
                    const result = await ComponentFactory.createComplexComponent(
                        tag,
                        selectedElement ?? null,
                        currentPageId,
                        addElement
                    );

                    // iframe에 업데이트된 요소들 전송
                    const updatedElements = [...elements, ...result.allElements];
                    sendElementsToIframe(updatedElements);
                } else {
                    // 단순 컴포넌트 생성
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

                    // iframe에 업데이트된 요소들 전송
                    const updatedElements = [...elements, data];
                    sendElementsToIframe(updatedElements);
                }
            }
        } catch (error) {
            console.error('Element creation failed:', error);
        } finally {
            isProcessingRef.current = false;
        }
    }, [getDefaultProps]);

    return {
        getDefaultProps,
        handleAddElement
    };
};
