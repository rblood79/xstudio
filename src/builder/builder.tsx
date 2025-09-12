import React, { useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Menu, Eye, Undo, Redo, Play, Monitor, Tablet, Smartphone, Asterisk } from 'lucide-react';

import { RadioGroup, Radio, Key, Label } from 'react-aria-components';
import { iconProps } from '../utils/uiConstants';
import SelectionOverlay from "./overlay";
import Inspector from "./inspector";
import Sidebar from "./sidebar";

import { useStore } from './stores';
import { debounce } from 'lodash';
import type { ElementProps } from '../types/supabase';
import { ColorValue } from '../types/theme';
import { Page } from './stores/elements'; // 추가

// 서비스 레이어 import
import { elementsApi, pagesApi } from '../services/api';

import "./builder.css";

function Builder() {
    const { projectId } = useParams<{ projectId: string }>();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // 새로운 통합된 스토어 사용
    const rawTokens = useStore(state => state.rawTokens);
    const semanticTokens = useStore(state => state.semanticTokens);
    const loadTheme = useStore(state => state.loadTheme);

    const elements = useStore((state) => state.elements);
    const currentPageId = useStore((state) => state.currentPageId);
    const pageHistories = useStore((state) => state.pageHistories);
    const setSelectedElement = useStore((state) => state.setSelectedElement);
    const { addElement, updateElementProps, undo, redo, loadPageElements } = useStore();
    const [pages, setPages] = React.useState<Page[]>([]); // 타입 변경
    const [selectedPageId, setSelectedPageId] = React.useState<string | null>(null);

    const [breakpoint, setBreakpoint] = React.useState(new Set<Key>(['screen']));

    // Breakpoints structure aligned with future Supabase table
    const [breakpoints] = React.useState([
        { id: 'screen', label: 'Screen', max_width: '100%', max_height: '100%' },
        { id: 'desktop', label: 'Desktop', max_width: 1280, max_height: 1080 },
        { id: 'tablet', label: 'Tablet', max_width: 1024, max_height: 800 },
        { id: 'mobile', label: 'Mobile', max_width: 390, max_height: 844 }
    ]);

    // 진행 중 여부를 추적하는 플래그
    const isProcessingRef = useRef(false);

    useEffect(() => {
        const fetchPages = async () => {
            if (!projectId) return;

            try {
                const pagesData = await pagesApi.fetchPages(projectId);
                setPages(pagesData);
            } catch (error) {
                console.error("페이지 조회 에러:", error);
            }
        };

        fetchPages();
    }, [projectId]);

    const fetchElements = useCallback(async (pageId: string) => {
        window.postMessage({ type: "CLEAR_OVERLAY" }, window.location.origin);
        setSelectedPageId(pageId);
        setSelectedElement(null);

        try {
            const elementsData = await elementsApi.fetchElements(pageId);
            loadPageElements(elementsData, pageId);

            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage(
                    { type: "UPDATE_ELEMENTS", elements: elementsData || [] },
                    window.location.origin
                );
            }
        } catch (error) {
            console.error("요소 조회 에러:", error);
        }
    }, [setSelectedPageId, setSelectedElement, loadPageElements]);

    useEffect(() => {
        if (!selectedPageId && pages.length > 0) {
            fetchElements(pages[0].id);
        }
    }, [pages, selectedPageId, fetchElements]);

    const handleAddElement = useCallback(async (...args: [string, string?, number?]) => {
        if (isProcessingRef.current) return;
        if (!currentPageId) {
            console.error('No current page ID available');
            return;
        }
        isProcessingRef.current = true;

        try {
            const [componentType, parentId, position] = args;

            // body 요소를 찾아서 parent_id로 설정
            const bodyElement = elements.find(el => el.tag === 'body' && el.page_id === currentPageId);
            const actualParentId = parentId || bodyElement?.id || null;


            // 컴포넌트 타입별 기본 props 설정
            const getDefaultProps = (tag: string): ElementProps => {
                switch (tag) {
                    case 'Button':
                        return {
                            children: 'Button',
                            variant: 'default',
                            isDisabled: false
                        } as ElementProps;
                    case 'TextField':
                        return {
                            label: 'Label',
                            placeholder: 'Enter text...',
                            isRequired: false,
                            isDisabled: false
                        } as ElementProps;
                    case 'Checkbox':
                        return {
                            children: 'Checkbox',
                            isSelected: false,
                            isDisabled: false
                        } as ElementProps;
                    case 'Radio':
                        return {
                            children: 'Radio',
                            value: 'radio-value',
                            isSelected: false,
                            isDisabled: false
                        } as ElementProps;
                    case 'Select':
                        return {
                            label: 'Select',
                            placeholder: 'Choose an option...',
                            isDisabled: false
                        } as ElementProps;
                    case 'ComboBox':
                        return {
                            label: 'ComboBox',
                            placeholder: 'Type or select...',
                            allowsCustomValue: false,
                            isDisabled: false
                        } as ElementProps;
                    case 'Switch':
                        return {
                            children: 'Switch',
                            isSelected: false,
                            isDisabled: false
                        } as ElementProps;
                    case 'Slider':
                        return {
                            label: 'Slider',
                            value: 50,
                            minValue: 0,
                            maxValue: 100,
                            step: 1
                        } as ElementProps;
                    case 'Calendar':
                        return {
                            'aria-label': 'Calendar',
                            isDisabled: false
                        } as ElementProps;
                    case 'DatePicker':
                        return {
                            label: 'Date Picker',
                            placeholder: 'Select date...',
                            isDisabled: false,
                            granularity: 'day'
                        } as ElementProps;
                    case 'DateRangePicker':
                        return {
                            label: 'Date Range',
                            placeholder: 'Select date range...',
                            isDisabled: false,
                            granularity: 'day'
                        } as ElementProps;
                    case 'ListBox':
                        return {
                            label: 'List Box',
                            selectionMode: 'single',
                            isDisabled: false
                        } as ElementProps;
                    case 'GridList':
                        return {
                            label: 'Grid List',
                            selectionMode: 'none',
                            orientation: 'vertical'
                        } as ElementProps;
                    case 'Tree':
                        return {
                            'aria-label': 'Tree',
                            selectionMode: 'single',
                            selectionBehavior: 'replace',
                            expandedKeys: [],
                            selectedKeys: [],
                            defaultExpandedKeys: [],
                            defaultSelectedKeys: [],
                            disallowEmptySelection: false
                        } as ElementProps;
                    case 'TreeItem':
                        return {
                            title: 'Tree Item',
                            value: 'Tree Item',
                            children: '', // children 속성 추가
                            isDisabled: false
                        } as ElementProps;
                    case 'Table':
                        return {
                            selectionMode: 'none',
                            selectionBehavior: 'toggle'
                        } as ElementProps;
                    case 'Tabs':
                        return {
                            defaultSelectedKey: 'tab1',
                            orientation: 'horizontal'
                        } as ElementProps;
                    case 'ToggleButton':
                        return {
                            children: 'Toggle',
                            isSelected: false,
                            isDisabled: false
                        } as ElementProps;
                    case 'ToggleButtonGroup':
                        return {
                            selectionMode: 'single',
                            orientation: 'horizontal',
                            value: []
                        } as ElementProps;
                    case 'CheckboxGroup':
                        return {
                            label: 'Checkbox Group',
                            orientation: 'vertical',
                            value: []
                        } as ElementProps;
                    case 'RadioGroup':
                        return {
                            label: 'Radio Group',
                            orientation: 'vertical',
                            value: ''
                        } as ElementProps;
                    case 'TagGroup':
                        return {
                            label: 'Tag Group',
                            items: [],
                            allowsRemoving: true,
                            allowsCustomValue: false
                        } as ElementProps;
                    case 'Card':
                        return {
                            title: 'Card Title',
                            description: 'Card description',
                            variant: 'default',
                            size: 'medium'
                        } as ElementProps;
                    case 'Panel':
                        return {
                            title: 'Panel Title',
                            variant: 'default'
                        } as ElementProps;
                    case 'Text':
                        return {
                            children: 'Text content',
                            as: 'p'
                        } as ElementProps;
                    case 'Label':
                        return {
                            children: 'Label'
                        } as ElementProps;
                    case 'Input':
                        return {
                            placeholder: 'Enter text...'
                        } as ElementProps;
                    case 'Description':
                        return {
                            text: 'Description text'
                        } as ElementProps;
                    case 'FieldError':
                        return {
                            text: 'Error message'
                        } as ElementProps;
                    default:
                        return {} as ElementProps;
                }
            };

            const newElement = {
                id: crypto.randomUUID(),
                tag: componentType,
                props: getDefaultProps(componentType),
                parent_id: actualParentId,
                page_id: currentPageId!,
                order_num: position || 0,
            };


            if (componentType === 'Button') {
                const data = await elementsApi.createElement(newElement);
                addElement(data);
            } else if (componentType === 'TextField') {
                const childElements = [
                    {
                        id: crypto.randomUUID(),
                        tag: 'Label',
                        props: { children: 'Label' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 0,
                    },
                    {
                        id: crypto.randomUUID(),
                        tag: 'Input',
                        props: {} as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 1,
                    },
                    {
                        id: crypto.randomUUID(),
                        tag: 'Description',
                        props: { text: 'Description' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 2,
                    },
                    {
                        id: crypto.randomUUID(),
                        tag: 'FieldError',
                        props: { text: 'Error message' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 3,
                    }
                ];

                // 모든 요소를 한 번에 삽입
                const data = await elementsApi.createElement(newElement);

                // 자식 요소들도 개별적으로 생성
                for (const child of childElements) {
                    const childData = await elementsApi.createElement(child);
                    addElement(childData);
                }

                addElement(data);
            } else if (componentType === 'ToggleButtonGroup') {
                const defaultToggleButtons = [
                    {
                        id: crypto.randomUUID(),
                        tag: 'ToggleButton',
                        props: { children: 'Option 1' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 0,
                    },
                    {
                        id: crypto.randomUUID(),
                        tag: 'ToggleButton',
                        props: { children: 'Option 2' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 1,
                    }
                ];

                // ToggleButtonGroup과 기본 ToggleButton들을 함께 삽입
                const data = await elementsApi.createElement(newElement);
                // Remove the error check since the service layer handles errors internally
                // if (error) throw error;

                for (const toggleButton of defaultToggleButtons) {
                    const toggleData = await elementsApi.createElement(toggleButton);
                    addElement(toggleData);
                }

                addElement(data);
            } else if (componentType === 'CheckboxGroup') {
                const defaultCheckboxes = [
                    {
                        id: crypto.randomUUID(),
                        tag: 'Checkbox',
                        props: { children: 'Option 1' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 0,
                    },
                    {
                        id: crypto.randomUUID(),
                        tag: 'Checkbox',
                        props: { children: 'Option 2' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 1,
                    }
                ];

                // CheckboxGroup과 기본 Checkbox들을 함께 삽입
                const data = await elementsApi.createElement(newElement);
                // Remove the error check since the service layer handles errors internally
                // if (error) throw error;

                for (const checkbox of defaultCheckboxes) {
                    const checkboxData = await elementsApi.createElement(checkbox);
                    addElement(checkboxData);
                }

                addElement(data);
            } else if (componentType === 'RadioGroup') {
                const defaultRadios = [
                    {
                        id: crypto.randomUUID(),
                        tag: 'Radio',
                        props: { children: 'Option 1', value: 'option1' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 0,
                    },
                    {
                        id: crypto.randomUUID(),
                        tag: 'Radio',
                        props: { children: 'Option 2', value: 'option2' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 1,
                    }
                ];

                // RadioGroup과 기본 Radio들을 함께 삽입
                const data = await elementsApi.createElement(newElement);
                // Remove the error check since the service layer handles errors internally
                // if (error) throw error;

                for (const radio of defaultRadios) {
                    const radioData = await elementsApi.createElement(radio);
                    addElement(radioData);
                }

                addElement(data);
            } else if (componentType === 'ListBox') {
                const defaultItems = [
                    {
                        id: crypto.randomUUID(),
                        tag: 'ListBoxItem',
                        props: { label: 'Item 1', value: 'item1' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 0,
                    },
                    {
                        id: crypto.randomUUID(),
                        tag: 'ListBoxItem',
                        props: { label: 'Item 2', value: 'item2' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 1,
                    }
                ];

                // ListBox와 기본 ListBoxItem들을 함께 삽입
                const data = await elementsApi.createElement(newElement);
                // Remove the error check since the service layer handles errors internally
                // if (error) throw error;

                for (const item of defaultItems) {
                    const itemData = await elementsApi.createElement(item);
                    addElement(itemData);
                }

                addElement(data);
            } else if (componentType === 'GridList') {
                const defaultItems = [
                    {
                        id: crypto.randomUUID(),
                        tag: 'GridListItem',
                        props: { label: 'Item 1', value: 'item1' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 0,
                    },
                    {
                        id: crypto.randomUUID(),
                        tag: 'GridListItem',
                        props: { label: 'Item 2', value: 'item2' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 1,
                    }
                ];

                // GridList와 기본 GridListItem들을 함께 삽입
                const data = await elementsApi.createElement(newElement);
                // Remove the error check since the service layer handles errors internally
                // if (error) throw error;

                for (const item of defaultItems) {
                    const itemData = await elementsApi.createElement(item);
                    addElement(itemData);
                }

                addElement(data);
            } else if (componentType === 'Select') {
                const defaultItems = [
                    {
                        id: crypto.randomUUID(),
                        tag: 'SelectItem',
                        props: { label: 'Option 1', value: 'option1' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 0,
                    },
                    {
                        id: crypto.randomUUID(),
                        tag: 'SelectItem',
                        props: { label: 'Option 2', value: 'option2' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 1,
                    }
                ];

                // Select와 기본 SelectItem들을 함께 삽입
                const data = await elementsApi.createElement(newElement);
                // Remove the error check since the service layer handles errors internally
                // if (error) throw error;

                for (const item of defaultItems) {
                    const itemData = await elementsApi.createElement(item);
                    addElement(itemData);
                }

                addElement(data);
            } else if (componentType === 'ComboBox') {
                const defaultItems = [
                    {
                        id: crypto.randomUUID(),
                        tag: 'ComboBoxItem',
                        props: { label: 'Option 1', value: 'option1' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 0,
                    },
                    {
                        id: crypto.randomUUID(),
                        tag: 'ComboBoxItem',
                        props: { label: 'Option 2', value: 'option2' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 1,
                    }
                ];

                // ComboBox와 기본 ComboBoxItem들을 함께 삽입
                const data = await elementsApi.createElement(newElement);
                // Remove the error check since the service layer handles errors internally
                // if (error) throw error;

                for (const item of defaultItems) {
                    const itemData = await elementsApi.createElement(item);
                    addElement(itemData);
                }

                addElement(data);
            } else if (componentType === 'Tabs') {
                const tabsProps = {
                    ...newElement.props,
                    defaultSelectedKey: 'tab1',
                    orientation: 'horizontal'
                };

                try {
                    // Tabs, Tab1, Panel1, Tab2, Panel2를 함께 삽입
                    const tabsData = await elementsApi.createElement({
                        ...newElement,
                        props: tabsProps
                    });

                    // Tabs 생성 시 Tab과 Panel을 다른 ID로 생성하되, props에 tabId로 연결
                    const tab1Id = crypto.randomUUID();
                    const panel1Id = crypto.randomUUID();
                    const tab2Id = crypto.randomUUID();
                    const panel2Id = crypto.randomUUID();

                    const tab1Data = await elementsApi.createElement({
                        id: tab1Id,
                        tag: 'Tab',
                        props: { title: 'Tab 1', tabId: tab1Id } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 0,
                    });

                    const panel1Data = await elementsApi.createElement({
                        id: panel1Id,
                        tag: 'Panel',
                        props: { title: 'Panel 1', tabIndex: 0, tabId: tab1Id } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 1,
                    });

                    const tab2Data = await elementsApi.createElement({
                        id: tab2Id,
                        tag: 'Tab',
                        props: { title: 'Tab 2', tabId: tab2Id } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 2,
                    });

                    const panel2Data = await elementsApi.createElement({
                        id: panel2Id,
                        tag: 'Panel',
                        props: { title: 'Panel 2', tabIndex: 1, tabId: tab2Id } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 3,
                    });

                    addElement(tabsData);
                    addElement(tab1Data);
                    addElement(panel1Data);
                    addElement(tab2Data);
                    addElement(panel2Data);
                } catch (error) {
                    console.error('Tabs 생성 에러:', error);
                }
            } else if (componentType === 'Switch') {
                const data = await elementsApi.createElement(newElement);
                // Remove the error check since the service layer handles errors internally
                // if (error) throw error;
                addElement(data);
            } else if (componentType === 'TagGroup') {
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
                        parent_id: newElement.id,
                        page_id: currentPageId!,
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
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 1,
                    }
                ];

                const data = await elementsApi.createElement(newElement);

                for (const tag of defaultTags) {
                    const tagData = await elementsApi.createElement(tag);
                    addElement(tagData);
                }

                addElement(data);
            } else if (componentType === 'Tree') {
                const defaultTreeItems = [
                    {
                        id: crypto.randomUUID(),
                        tag: 'TreeItem',
                        props: {
                            title: 'Documents',
                            value: 'Documents'
                        } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 0,
                    },
                    {
                        id: crypto.randomUUID(),
                        tag: 'TreeItem',
                        props: {
                            title: 'Photos',
                            value: 'Photos'
                        } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 1,
                    }
                ];

                // Tree와 기본 TreeItem들을 함께 삽입
                const data = await elementsApi.createElement(newElement);

                for (const treeItem of defaultTreeItems) {
                    const treeItemData = await elementsApi.createElement(treeItem);
                    addElement(treeItemData);
                }

                addElement(data);
            } else {
                // TextField가 아닌 경우 기존 로직 사용
                const data = await elementsApi.createElement(newElement);
                // Remove the error check since the service layer handles errors internally
                // if (error) throw error;
                addElement(data);
            }

            // iframe에 새 요소 전송
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage(
                    { type: "UPDATE_ELEMENTS", elements: useStore.getState().elements },
                    window.location.origin
                );
            }
        } catch (error) {
            console.error('요소 생성 에러:', error);
        } finally {
            isProcessingRef.current = false;
        }
    }, [currentPageId, addElement, elements]);

    const handleUndo = debounce(async () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        try {
            undo();
            await new Promise((resolve) => setTimeout(resolve, 0));
            const updatedElements = useStore.getState().elements;

            // elementsApi를 사용하여 요소들 업데이트
            for (const element of updatedElements) {
                await elementsApi.updateElement(element.id, element);
            }

            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage(
                    { type: "UPDATE_ELEMENTS", elements: updatedElements },
                    window.location.origin
                );
            }
        } catch (error) {
            console.error("Undo error:", error);
        } finally {
            isProcessingRef.current = false;
        }
    }, 300);

    const handleRedo = debounce(async () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        try {
            redo();
            await new Promise((resolve) => setTimeout(resolve, 0));
            const updatedElements = useStore.getState().elements;

            // elementsApi를 사용하여 요소들 업데이트
            for (const element of updatedElements) {
                await elementsApi.updateElement(element.id, element);
            }

            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage(
                    { type: "UPDATE_ELEMENTS", elements: updatedElements },
                    window.location.origin
                );
            }
        } catch (error) {
            console.error("Redo error:", error);
        } finally {
            isProcessingRef.current = false;
        }
    }, 300);

    useEffect(() => {
        const iframe = iframeRef.current;
        const sendUpdateElements = () => {
            if (!iframe) {
                console.warn("iframe not found");
                return;
            }
            if (!iframe.contentWindow) {
                console.warn("iframe contentWindow not accessible");
                return;
            }
            if (elements.length > 0) {
                iframe.contentWindow.postMessage(
                    { type: "UPDATE_ELEMENTS", elements },
                    window.location.origin
                );
            }
        };

        if (iframe?.contentDocument?.readyState === "complete") {
            sendUpdateElements();
        } else {
            iframe?.addEventListener("load", sendUpdateElements);
            return () => iframe?.removeEventListener("load", sendUpdateElements);
        }
    }, [elements]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) {
                console.warn("Received message from untrusted origin:", event.origin);
                return;
            }

            if (event.data.type === "UPDATE_THEME_TOKENS") {
                const iframe = iframeRef.current;
                if (!iframe?.contentDocument) return;

                // Apply styles to parent document
                let parentStyleElement = document.getElementById('theme-tokens');
                if (!parentStyleElement) {
                    parentStyleElement = document.createElement('style');
                    parentStyleElement.id = 'theme-tokens';
                    document.head.appendChild(parentStyleElement);
                }

                // Convert style object to CSS string
                const cssString = `:root {\n${Object.entries(event.data.styles)
                    .map(([key, value]) => `  ${key}: ${value};`)
                    .join('\n')}\n}`;

                parentStyleElement.textContent = cssString;

                // Create or update style element in iframe
                let styleElement = iframe.contentDocument.getElementById('theme-tokens');
                if (!styleElement) {
                    styleElement = iframe.contentDocument.createElement('style');
                    styleElement.id = 'theme-tokens';
                    iframe.contentDocument.head.appendChild(styleElement);
                }

                styleElement.textContent = cssString;
            }

            // 프리뷰에서 보내는 UPDATE_ELEMENTS 메시지 처리 (새로 추가)
            if (event.data.type === "UPDATE_ELEMENTS" && event.data.elements) {
                console.log("Received UPDATE_ELEMENTS from preview:", event.data.elements.length);
                // 스토어의 elements를 업데이트
                const { setElements } = useStore.getState();
                setElements(event.data.elements);
            }

            if (event.data.type === "ELEMENT_SELECTED" && event.data.source !== "builder") {
                setSelectedElement(event.data.elementId, event.data.payload?.props);
            }
            if (event.data.type === "UPDATE_ELEMENT_PROPS" && event.data.elementId) {
                updateElementProps(event.data.elementId, event.data.props || event.data.payload?.props);
            }
            // 프리뷰에서 보내는 element-props-update 메시지 처리
            if (event.data.type === "element-props-update" && event.data.elementId) {
                //console.log("Received element-props-update:", event.data);
                updateElementProps(event.data.elementId, event.data.props);

                // 업데이트된 요소 정보를 프리뷰에 다시 전송
                const iframe = iframeRef.current;
                if (iframe?.contentWindow) {
                    const updatedElements = useStore.getState().elements;
                    iframe.contentWindow.postMessage(
                        { type: "UPDATE_ELEMENTS", elements: updatedElements },
                        window.location.origin
                    );
                }
            }

            // 프리뷰에서 보내는 element-click 메시지 처리
            if (event.data.type === "element-click" && event.data.elementId) {
                //console.log("Received element-click:", event.data);
                // 필요한 경우 여기에 클릭 이벤트 관련 로직 추가
                // 예: 상태 업데이트, UI 변경 등
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [setSelectedElement, updateElementProps]);

    const handleAddPage = useCallback(async () => {
        if (!currentPageId) return;

        const newOrderNum = pages.length;
        const newPage = {
            project_id: projectId!,
            title: `Page ${newOrderNum + 1}`,
            slug: `page-${newOrderNum + 1}`,
            order_num: newOrderNum,
        };

        try {
            const pageData = await pagesApi.createPage(newPage);
            setPages(prev => [...prev, pageData]);

            // 새 페이지에 기본 body 요소 생성
            const bodyElement = {
                id: crypto.randomUUID(),
                tag: 'body',
                props: {} as ElementProps,
                parent_id: null,
                page_id: pageData.id,
                order_num: 0,
            };

            const elementData = await elementsApi.createElement(bodyElement);
            addElement(elementData);
        } catch (error) {
            console.error('페이지 생성 에러:', error);
        }
    }, [currentPageId, projectId, pages.length, addElement]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const iframe = iframeRef.current;
            const target = event.target as HTMLElement;

            // UI 요소들을 클릭한 경우는 무시
            if (target.closest('.selection-overlay') ||
                target.closest('.sidebar') ||
                target.closest('.inspector') ||
                target.closest('.header') ||
                target.closest('.footer') ||
                iframe?.contains(target)
            ) {
                return;
            }

            // workspace나 bg 클래스를 가진 요소를 클릭했을 때만 선택 해제
            const isWorkspaceBackground = target.classList.contains('workspace') || target.classList.contains('bg');
            if (isWorkspaceBackground) {
                setSelectedElement(null);
                window.postMessage({ type: "CLEAR_OVERLAY" }, window.location.origin);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [setSelectedElement]);

    const applyThemeTokens = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe?.contentDocument) return;

        // 모든 토큰을 하나의 배열로 합치기
        const allTokens = [...rawTokens, ...semanticTokens];

        // Raw 토큰 맵 생성 (alias 참조용)
        const rawMap = new Map(rawTokens.map(r => [r.name, r]));

        // Helper function for processing token value
        const processTokenValue = (token: { value: unknown }) => {
            if (typeof token.value === 'object' && token.value !== null) {
                if ('h' in token.value) {
                    // ColorValue
                    const color = token.value as ColorValue;
                    return `hsla(${color.h}, ${color.s}%, ${color.l}%, ${color.a})`;
                } else {
                    return JSON.stringify(token.value);
                }
            } else {
                return String(token.value);
            }
        };

        // CSS 변수 생성
        const cssVariables = allTokens
            .map(token => {
                // css_variable이 있으면 사용하고, 없으면 Tailwind 호환 규칙으로 생성
                const cssVar = token.css_variable || `--${token.type}-${token.name.toLowerCase().replace(/\./g, '-')}`;
                let cssValue: string;

                // Semantic 토큰이고 alias_of가 있으면 Raw 토큰 참조
                if (token.scope === 'semantic' && token.alias_of) {
                    const referencedRaw = rawMap.get(token.alias_of);
                    if (referencedRaw) {
                        const refCssVar = referencedRaw.css_variable || `--${referencedRaw.type}-${referencedRaw.name.toLowerCase().replace(/\./g, '-')}`;
                        cssValue = `var(${refCssVar})`;
                    } else {
                        // fallback to direct value
                        cssValue = processTokenValue(token);
                    }
                } else {
                    cssValue = processTokenValue(token);
                }

                return `${cssVar}: ${cssValue};`;
            })
            .join('\n  ');

        const cssString = `:root {\n  ${cssVariables}\n}`;

        // Apply styles to parent document
        let parentStyleElement = document.getElementById('theme-tokens');
        if (!parentStyleElement) {
            parentStyleElement = document.createElement('style');
            parentStyleElement.id = 'theme-tokens';
            document.head.appendChild(parentStyleElement);
        }

        parentStyleElement.textContent = cssString;

        // Create or update style element in iframe
        let styleElement = iframe.contentDocument.getElementById('theme-tokens');
        if (!styleElement) {
            styleElement = iframe.contentDocument.createElement('style');
            styleElement.id = 'theme-tokens';
            iframe.contentDocument.head.appendChild(styleElement);
        }

        styleElement.textContent = cssString;
    }, [rawTokens, semanticTokens]);

    useEffect(() => {
        if (projectId) {
            loadTheme(projectId);
        }
    }, [projectId, loadTheme]);

    const handleIframeLoad = () => {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) {
            console.warn("iframe contentWindow not available on load");
            return;
        }

        // iframe이 완전히 로드될 때까지 대기
        const checkContentWindow = () => {
            if (iframe.contentWindow?.document.readyState === "complete") {
                if (elements.length > 0) {
                    iframe.contentWindow.postMessage(
                        { type: "UPDATE_ELEMENTS", elements },
                        window.location.origin
                    );
                }
                applyThemeTokens();
            } else {
                setTimeout(checkContentWindow, 100);
            }
        };

        checkContentWindow();
    };

    useEffect(() => {
        applyThemeTokens();
    }, [applyThemeTokens]);

    return (
        <div className="app">
            <div className="contents">
                <main>
                    <div className="bg"
                        style={{
                            //backgroundPosition: Math.round(50) + '%',
                            backgroundSize: Math.round(Number(breakpoints.find(bp => bp.id === Array.from(breakpoint)[0])?.max_width) || 0) + 'px ' + Math.round(Number(breakpoints.find(bp => bp.id === Array.from(breakpoint)[0])?.max_height) || 0) + 'px'
                        }}>
                        <div className="workspace"
                            max-width={breakpoints.find(bp => bp.id === Array.from(breakpoint)[0])?.max_width}
                            style={{
                                width: breakpoints.find(bp => bp.id === Array.from(breakpoint)[0])?.max_width || '100%',
                                height: breakpoints.find(bp => bp.id === Array.from(breakpoint)[0])?.max_height || '100%',
                                borderWidth: breakpoints.find(bp => bp.id === Array.from(breakpoint)[0])?.id === 'screen' ? '0px' : '1px'
                            }}>

                            <iframe
                                ref={iframeRef}
                                id="previewFrame"
                                src={projectId ? `/preview/${projectId}?isIframe=true` : "/preview?isIframe=true"}
                                style={{ width: "100%", height: "100%", border: "none" }}
                                sandbox="allow-scripts allow-same-origin allow-forms"
                                onLoad={handleIframeLoad}
                            />
                            <SelectionOverlay />
                        </div>
                    </div>
                </main>

                <Sidebar
                    pages={pages}
                    setPages={setPages}
                    handleAddPage={handleAddPage}
                    handleAddElement={handleAddElement}
                    fetchElements={fetchElements}
                    selectedPageId={selectedPageId}
                >
                </Sidebar>

                <aside className="inspector">
                    <Inspector />
                </aside>

                <nav className="header">
                    <div className="header_contents header_left">
                        <button aria-label="Menu">
                            <Menu color={'#fff'} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        </button>
                        {projectId ? `Project ID: ${projectId}` : "No project ID provided"}
                    </div>
                    <div className="header_contents screen">
                        <code className="code sizeInfo">
                            {breakpoints.find(bp => bp.id === Array.from(breakpoint)[0])?.max_width}x
                            {breakpoints.find(bp => bp.id === Array.from(breakpoint)[0])?.max_height}
                        </code>

                        <RadioGroup
                            orientation="horizontal"
                            value={Array.from(breakpoint)[0]?.toString()}
                            onChange={(value) => setBreakpoint(new Set<Key>([value]))}
                        >
                            {breakpoints.map(bp => (
                                <Radio
                                    value={bp.id}
                                    key={bp.id}
                                    className="aria-Radio"
                                >
                                    {bp.id === 'screen' && <Asterisk color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />}
                                    {bp.id === 'desktop' && <Monitor color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />}
                                    {bp.id === 'tablet' && <Tablet color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />}
                                    {bp.id === 'mobile' && <Smartphone color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />}
                                    <Label>{bp.label}</Label>
                                </Radio>
                            ))}

                        </RadioGroup>
                    </div>
                    <div className="header_contents header_right">
                        <span>
                            {currentPageId && pageHistories[currentPageId]
                                ? `${pageHistories[currentPageId].historyIndex + 1}/${pageHistories[currentPageId].history.length}`
                                : '0/0'
                            }
                        </span>
                        <button
                            aria-label="Undo"
                            onClick={handleUndo}
                            disabled={!currentPageId || !pageHistories[currentPageId] || pageHistories[currentPageId].historyIndex < 0}
                            className={!currentPageId || !pageHistories[currentPageId] || pageHistories[currentPageId].historyIndex < 0 ? "disabled" : ""}
                        >
                            <Undo
                                color={!currentPageId || !pageHistories[currentPageId] || pageHistories[currentPageId].historyIndex < 0
                                    ? "#999"
                                    : iconProps.color
                                }
                                strokeWidth={iconProps.stroke}
                                size={iconProps.size}
                            />
                        </button>
                        <button
                            aria-label="Redo"
                            onClick={handleRedo}
                            disabled={!currentPageId || !pageHistories[currentPageId] || pageHistories[currentPageId].historyIndex >= pageHistories[currentPageId].history.length - 1}
                            className={!currentPageId || !pageHistories[currentPageId] || pageHistories[currentPageId].historyIndex >= pageHistories[currentPageId].history.length - 1 ? "disabled" : ""}
                        >
                            <Redo
                                color={!currentPageId || !pageHistories[currentPageId] || pageHistories[currentPageId].historyIndex >= pageHistories[currentPageId].history.length - 1
                                    ? "#999"
                                    : iconProps.color
                                }
                                strokeWidth={iconProps.stroke}
                                size={iconProps.size}
                            />
                        </button>
                        <button aria-label="Preview"><Eye color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        <button aria-label="Play"><Play color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} /></button>
                        <button aria-label="Publish" className="publish">Publish</button>
                    </div>
                </nav>

                <footer className="footer">footer</footer>
            </div>
        </div>
    );
}

export default Builder;