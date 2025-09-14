import { useCallback, useRef } from 'react';
import type { ElementProps } from '../../types/supabase';
import { Element } from '../../types/store';
import { elementsApi } from '../../services/api/ElementsApiService';
import { useStore } from '../stores';

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
            className: "",
            children: "",
            events: []
        };

        switch (tag) {
            case 'Text':
                return { ...baseProps, children: 'Text', variant: 'default', size: 'medium', isDisabled: false };
            case 'Button':
                return { ...baseProps, children: 'Button', variant: 'default', size: 'medium', isDisabled: false };
            case 'ToggleButton':
                return { ...baseProps, children: 'Toggle', isSelected: false, isDisabled: false };
            case 'ToggleButtonGroup':
                return { ...baseProps, label: 'Toggle Group', orientation: 'horizontal', selectionMode: 'single', isDisabled: false };
            case 'TextField':
                return { ...baseProps, label: 'Text Field', placeholder: 'Enter text...', description: 'Description text', value: '', type: 'text', isDisabled: false, isRequired: false };
            case 'Checkbox':
                return { ...baseProps, children: 'Checkbox', isSelected: false, isDisabled: false };
            case 'CheckboxGroup':
                return { ...baseProps, label: 'Checkbox Group', orientation: 'vertical', isDisabled: false };
            case 'Radio':
                return { ...baseProps, children: 'Radio', value: 'radio1', isDisabled: false };
            case 'RadioGroup':
                return { ...baseProps, label: 'Radio Group', orientation: 'vertical', isDisabled: false };
            case 'Select':
                return { ...baseProps, label: 'Select', placeholder: 'Choose option...', isDisabled: false, isRequired: false };
            case 'ComboBox':
                return { ...baseProps, label: 'Combo Box', placeholder: 'Choose option...', isDisabled: false, isRequired: false };
            case 'ListBox':
                return { ...baseProps, label: 'List Box', isDisabled: false, selectionMode: 'single' };
            case 'GridList':
                return { ...baseProps, label: 'Grid List', isDisabled: false, selectionMode: 'single' };
            case 'Tree':
                return { ...baseProps, label: 'Tree', isDisabled: false, selectionMode: 'single' };
            case 'Table':
                return { ...baseProps, label: 'Table', isDisabled: false };
            case 'Tabs':
                return { ...baseProps, label: 'Tabs', orientation: 'horizontal', isDisabled: false };
            case 'Dialog':
                return { ...baseProps, children: 'Dialog Content', isOpen: false, isDismissable: true };
            case 'Modal':
                return { ...baseProps, children: 'Modal Content', isOpen: false, isDismissable: true };
            case 'Popover':
                return { ...baseProps, children: 'Popover Content', isOpen: false, placement: 'bottom' };
            case 'TagGroup':
                return { ...baseProps, label: 'Tag Group', isDisabled: false, selectionMode: 'single' };
            case 'Form':
                return { ...baseProps, label: 'Form', isDisabled: false };
            case 'FieldGroup':
                return { ...baseProps, label: 'Field Group', isDisabled: false };
            case 'Label':
                return { ...baseProps, children: 'Label' };
            case 'Input':
                return { ...baseProps, type: 'text', placeholder: 'Enter text...', value: '' };
            case 'DateField':
                return { ...baseProps, label: 'Date Field', placeholder: 'Select date...', isDisabled: false, isRequired: false };
            case 'DatePicker':
                return { ...baseProps, label: 'Date Picker', placeholder: 'Select date...', isDisabled: false, isRequired: false };
            case 'DateRangePicker':
                return { ...baseProps, label: 'Date Range Picker', placeholder: 'Select date range...', isDisabled: false, isRequired: false };
            case 'TimeField':
                return { ...baseProps, label: 'Time Field', placeholder: 'Select time...', isDisabled: false, isRequired: false };
            case 'Switch':
                return { ...baseProps, children: 'Switch', isSelected: false, isDisabled: false };
            case 'Slider':
                return { ...baseProps, label: 'Slider', defaultValue: 50, minValue: 0, maxValue: 100, isDisabled: false };
            case 'Calendar':
                return { ...baseProps, label: 'Calendar', isDisabled: false };
            case 'Card':
                return { ...baseProps, children: 'Card Content', variant: 'default', size: 'medium' };
            case 'Panel':
                return { ...baseProps, children: 'Panel Content', variant: 'default', size: 'medium' };
            case 'Description':
                return { ...baseProps, text: 'Description text', children: 'Description text' };
            case 'FieldError':
                return { ...baseProps, text: 'Error message', children: 'Error message' };
            case 'div':
                return {
                    ...baseProps,
                    children: 'Div Content',
                    style: {
                        padding: '16px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        minHeight: '50px',
                        backgroundColor: '#ffffff'
                    }
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
                const props = getDefaultProps(tag);

                // 선택된 요소가 있으면 부모로 설정, 없으면 루트 요소
                const parentId = selectedElementId || null;

                // 부모의 자식 요소 개수로 order_num 계산
                const siblings = elements.filter(el => el.parent_id === parentId);
                const orderNum = siblings.length;

                const newElement: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
                    tag,
                    props,
                    page_id: currentPageId,
                    parent_id: parentId,
                    order_num: orderNum
                };

                // TextField 처리 부분
                if (tag === 'TextField') {
                    // 부모 요소 먼저 생성
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const childElements = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'Label',
                            props: { children: 'Label' } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 1,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'Input',
                            props: {
                                type: 'text',
                                placeholder: newElement.props.placeholder || 'Enter text...'
                            } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 2,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'Description',
                            props: { text: 'Description' } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 3,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'FieldError',
                            props: { text: 'Error message' } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 4,
                        }
                    ];

                    // 자식 요소들 순차적으로 생성
                    for (const child of childElements) {
                        const childData = await elementsApi.createElement(child);
                        addElement(childData);
                    }
                }
                // ToggleButtonGroup 처리 부분
                else if (tag === 'ToggleButtonGroup') {
                    // 부모 요소 먼저 생성
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const defaultToggleButtons = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'ToggleButton',
                            props: {
                                children: 'Option 1',
                                isSelected: false,
                                isDisabled: false
                            } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 1,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'ToggleButton',
                            props: {
                                children: 'Option 2',
                                isSelected: false,
                                isDisabled: false
                            } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 2,
                        }
                    ];

                    // 자식 요소들 순차적으로 생성
                    for (const toggleButton of defaultToggleButtons) {
                        const toggleData = await elementsApi.createElement(toggleButton);
                        addElement(toggleData);
                    }
                }
                else if (tag === 'CheckboxGroup') {
                    // 부모 요소 먼저 생성
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const defaultCheckboxes = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'Checkbox',
                            props: { children: 'Option 1' } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 0,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'Checkbox',
                            props: { children: 'Option 2' } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const checkbox of defaultCheckboxes) {
                        const checkboxData = await elementsApi.createElement(checkbox);
                        addElement(checkboxData);
                    }
                }
                else if (tag === 'RadioGroup') {
                    // 부모 요소 먼저 생성
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const defaultRadios = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'Radio',
                            props: { children: 'Option 1', value: 'option1' } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 0,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'Radio',
                            props: { children: 'Option 2', value: 'option2' } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const radio of defaultRadios) {
                        const radioData = await elementsApi.createElement(radio);
                        addElement(radioData);
                    }
                }
                else if (tag === 'ListBox') {
                    // 부모 요소 먼저 생성
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const defaultItems = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'ListBoxItem',
                            props: { label: 'Item 1', value: 'item1' } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 0,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'ListBoxItem',
                            props: { label: 'Item 2', value: 'item2' } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const item of defaultItems) {
                        const itemData = await elementsApi.createElement(item);
                        addElement(itemData);
                    }
                }
                else if (tag === 'GridList') {
                    // 부모 요소 먼저 생성
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const defaultItems = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'GridListItem',
                            props: { label: 'Item 1', value: 'item1' } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 0,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'GridListItem',
                            props: { label: 'Item 2', value: 'item2' } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const item of defaultItems) {
                        const itemData = await elementsApi.createElement(item);
                        addElement(itemData);
                    }
                }
                else if (tag === 'Select') {
                    // 부모 요소 먼저 생성
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const defaultItems = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'SelectItem',
                            props: { label: 'Option 1', value: 'option1' } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 0,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'SelectItem',
                            props: { label: 'Option 2', value: 'option2' } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const item of defaultItems) {
                        const itemData = await elementsApi.createElement(item);
                        addElement(itemData);
                    }
                }
                else if (tag === 'ComboBox') {
                    // 부모 요소 먼저 생성
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const defaultItems = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'ComboBoxItem',
                            props: { label: 'Option 1', value: 'option1' } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 0,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'ComboBoxItem',
                            props: { label: 'Option 2', value: 'option2' } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const item of defaultItems) {
                        const itemData = await elementsApi.createElement(item);
                        addElement(itemData);
                    }
                }
                else if (tag === 'Tabs') {
                    const tabsProps = {
                        ...newElement.props,
                        defaultSelectedKey: 'tab1',
                        orientation: 'horizontal'
                    };

                    try {
                        // Tabs 부모 요소 먼저 생성
                        const tabsData = await elementsApi.createElement({
                            ...newElement,
                            props: tabsProps
                        });
                        addElement(tabsData);

                        // Tabs 생성 시 Tab과 Panel을 다른 ID로 생성하되, props에 tabId로 연결
                        const tab1Id = crypto.randomUUID();
                        const panel1Id = crypto.randomUUID();
                        const tab2Id = crypto.randomUUID();
                        const panel2Id = crypto.randomUUID();

                        const tab1Data = await elementsApi.createElement({
                            id: tab1Id,
                            tag: 'Tab',
                            props: { title: 'Tab 1', tabId: tab1Id } as ElementProps,
                            parent_id: tabsData.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 0,
                        });

                        const panel1Data = await elementsApi.createElement({
                            id: panel1Id,
                            tag: 'Panel',
                            props: { title: 'Panel 1', tabIndex: 0, tabId: tab1Id } as ElementProps,
                            parent_id: tabsData.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 1,
                        });

                        const tab2Data = await elementsApi.createElement({
                            id: tab2Id,
                            tag: 'Tab',
                            props: { title: 'Tab 2', tabId: tab2Id } as ElementProps,
                            parent_id: tabsData.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 2,
                        });

                        const panel2Data = await elementsApi.createElement({
                            id: panel2Id,
                            tag: 'Panel',
                            props: { title: 'Panel 2', tabIndex: 1, tabId: tab2Id } as ElementProps,
                            parent_id: tabsData.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 3,
                        });

                        addElement(tab1Data);
                        addElement(panel1Data);
                        addElement(tab2Data);
                        addElement(panel2Data);
                    } catch (error) {
                        console.error('Tabs 생성 에러:', error);
                    }
                }
                else if (tag === 'Switch') {
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);
                }
                else if (tag === 'TagGroup') {
                    // 부모 요소 먼저 생성
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const defaultTags = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'Tag',
                            props: {
                                children: 'Tag 1',
                                isDisabled: false,
                                style: {},
                                className: ''
                            } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 0,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'Tag',
                            props: {
                                children: 'Tag 2',
                                isDisabled: false,
                                style: {},
                                className: ''
                            } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const tag of defaultTags) {
                        const tagData = await elementsApi.createElement(tag);
                        addElement(tagData);
                    }
                }
                else if (tag === 'Tree') {
                    // 부모 요소 먼저 생성
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const defaultTreeItems = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'TreeItem',
                            props: {
                                title: 'Documents',
                                value: 'Documents'
                            } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 0,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'TreeItem',
                            props: {
                                title: 'Photos',
                                value: 'Photos'
                            } as ElementProps,
                            parent_id: data.id, // 생성된 부모의 ID 사용
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const treeItem of defaultTreeItems) {
                        const treeItemData = await elementsApi.createElement(treeItem);
                        addElement(treeItemData);
                    }
                }
                else {
                    // 일반 요소 생성
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);
                }

                // 요소 생성 후 iframe에 전송
                setTimeout(() => {
                    const updatedElements = useStore.getState().elements;
                    sendElementsToIframe(updatedElements);
                }, 100);
            }
        } finally {
            isProcessingRef.current = false;
        }
    }, [getDefaultProps]);

    return {
        getDefaultProps,
        handleAddElement
    };
};
