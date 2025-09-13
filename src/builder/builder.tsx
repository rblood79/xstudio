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

// 서비스 레이어 import - 올바른 경로로 수정
import { elementsApi } from '../services/api/ElementsApiService';
import { pagesApi } from '../services/api/PagesApiService';

// 또는 index 파일이 있다면
// import { elementsApi, pagesApi } from '../services/api';

import "./builder.css";

// getDefaultProps 함수를 Builder 컴포넌트 상단으로 이동
function Builder() {
    const { projectId } = useParams<{ projectId: string }>();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // 기존 스토어 및 상태 정의들...
    const rawTokens = useStore(state => state.rawTokens);
    const semanticTokens = useStore(state => state.semanticTokens);
    const loadTheme = useStore(state => state.loadTheme);

    const elements = useStore((state) => state.elements);
    const currentPageId = useStore((state) => state.currentPageId);
    const pageHistories = useStore((state) => state.pageHistories);
    const setSelectedElement = useStore((state) => state.setSelectedElement);
    const { addElement, updateElementProps, undo, redo } = useStore();
    
    const [pages, setPages] = React.useState<Page[]>([]);
    const [selectedPageId, setSelectedPageId] = React.useState<string | null>(null);

    // 누락된 상태 변수들 추가
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [breakpoint, setBreakpoint] = React.useState(new Set<Key>(['screen']));
    const [breakpoints] = React.useState([
        { id: 'screen', label: 'Screen', max_width: '100%', max_height: '100%' },
        { id: 'desktop', label: 'Desktop', max_width: 1280, max_height: 1080 },
        { id: 'tablet', label: 'Tablet', max_width: 1024, max_height: 800 },
        { id: 'mobile', label: 'Mobile', max_width: 390, max_height: 844 }
    ]);

    const isProcessingRef = useRef(false);

    // getDefaultProps 함수 정의 (누락된 함수)
    const getDefaultProps = useCallback((tag: string): ElementProps => {
        const baseProps: ElementProps = {
            style: {},
            className: "",
            children: "",
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
                    isDisabled: false,
                    isRequired: false
                };

            case 'Label':
                return {
                    ...baseProps,
                    children: 'Label'
                };

            case 'Input':
                return {
                    ...baseProps,
                    type: 'text',
                    placeholder: 'Enter text...'
                };

            case 'Description':
                return {
                    ...baseProps,
                    text: 'Description text',
                    children: 'Description text'
                };

            case 'FieldError':
                return {
                    ...baseProps,
                    text: 'Error message',
                    children: 'Error message'
                };

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

            case 'Select':
                return {
                    ...baseProps,
                    label: 'Select',
                    placeholder: 'Choose an option...',
                    selectedKey: '',
                    isDisabled: false,
                    isRequired: false
                };

            case 'SelectItem':
                return {
                    ...baseProps,
                    label: 'Option',
                    value: 'option1',
                    isDisabled: false
                };

            case 'ComboBox':
                return {
                    ...baseProps,
                    label: 'ComboBox',
                    placeholder: 'type write an option...',
                    selectedKey: '',
                    isDisabled: false,
                    isRequired: false
                };

            case 'TagGroup':
                return {
                    ...baseProps,
                    label: 'Tag Group'
                };

            case 'Slider':
                return {
                    ...baseProps,
                    label: 'Slider'
                };

            case 'CheckboxGroup':
                return {
                    ...baseProps,
                    label: 'Checkbox Group',
                    isDisabled: false
                };
                
            case 'RadioGroup':
                return {
                    ...baseProps,
                    label: 'Radio Group',
                    isDisabled: false
                };

            case 'Card':
                return {
                    ...baseProps,
                    title: 'Card Title',
                    description: 'This is a card description. You can edit this content.'
                };

            case 'Panel':
                return {
                    ...baseProps,
                    title: 'Panel Title'
                };

            // 다른 컴포넌트들도 동일하게 추가...
            default:
                return {
                    ...baseProps,
                    children: tag === 'Text' ? 'Sample text' : `${tag} Content`
                };
        }
    }, []);

    // fetchElements 함수 정의 (누락된 함수)
    const fetchElements = useCallback(async () => {
        if (!currentPageId) {
            console.warn('fetchElements: No current page ID available');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            //console.log('Fetching elements for page:', currentPageId);
            
            const pageElements = await elementsApi.getElementsByPageId(currentPageId);
            
            if (pageElements && pageElements.length > 0) {
                const { setElements } = useStore.getState();
                setElements(pageElements);
                //console.log('Elements fetched successfully:', pageElements.length);
                
                // iframe에 요소 업데이트 전송
                const iframe = iframeRef.current;
                if (iframe?.contentWindow) {
                    iframe.contentWindow.postMessage(
                        { type: "UPDATE_ELEMENTS", elements: pageElements },
                        window.location.origin
                    );
                }
            } else {
                console.log('No elements found for page:', currentPageId);
                const { setElements } = useStore.getState();
                setElements([]);
            }
        } catch (error) {
            console.error('Error fetching elements:', error);
            setError('요소를 가져오는 중 오류가 발생했습니다.');
            
            // 에러 발생 시에도 빈 배열로 설정하여 UI가 깨지지 않도록 함
            const { setElements } = useStore.getState();
            setElements([]);
        } finally {
            setIsLoading(false);
        }
    }, [currentPageId]);

    // 페이지 변경 시 요소들 자동 fetch
    useEffect(() => {
        if (currentPageId) {
            fetchElements();
        }
    }, [currentPageId, fetchElements]);

    // handleAddElement 함수의 에러 처리 개선
    const handleAddElement = useCallback(async (...args: [string, string?, number?]) => {
        if (isProcessingRef.current) return;
        if (!currentPageId) {
            console.error('No current page ID available');
            setError('현재 페이지가 선택되지 않았습니다.');
            return;
        }
        
        isProcessingRef.current = true;
        setError(null);

        try {
            const [componentType, parentId, position] = args;
            //console.log('handleAddElement called with:', { componentType, parentId, position });
            
            // body 요소를 찾아서 parent_id로 설정
            const bodyElement = elements.find(el => el.tag === 'body' && el.page_id === currentPageId);
            const actualParentId = parentId || bodyElement?.id || null;

            // order_num 계산 로직
            let calculatedOrderNum: number;
            
            if (position !== undefined && position >= 0) {
                calculatedOrderNum = position;
            } else {
                const siblings = elements.filter(el => 
                    el.parent_id === actualParentId && el.page_id === currentPageId
                );
                calculatedOrderNum = siblings.length > 0 
                    ? Math.max(...siblings.map(el => el.order_num || 0)) + 1
                    : 1;
            }

            /*console.log('Order number calculation:', {
                componentType,
                parentId: actualParentId,
                position,
                calculatedOrderNum,
                existingSiblings: elements.filter(el => el.parent_id === actualParentId).length
            });*/

            // 새 요소 객체 생성
            const newElement = {
                id: crypto.randomUUID(),
                tag: componentType,
                props: getDefaultProps(componentType),
                parent_id: actualParentId,
                page_id: currentPageId!,
                order_num: calculatedOrderNum,
            };


            // TextField 처리 부분
            if (componentType === 'TextField') {
                const childElements = [
                    {
                        id: crypto.randomUUID(),
                        tag: 'Label',
                        props: { children: 'Label' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 1, // 1부터 시작
                    },
                    {
                        id: crypto.randomUUID(),
                        tag: 'Input',
                        props: {} as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 2, // 순차적 증가
                    },
                    {
                        id: crypto.randomUUID(),
                        tag: 'Description',
                        props: { text: 'Description' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 3,
                    },
                    {
                        id: crypto.randomUUID(),
                        tag: 'FieldError',
                        props: { text: 'Error message' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 4,
                    }
                ];

                // 부모 요소 먼저 생성
                const data = await elementsApi.createElement(newElement);
                addElement(data);

                // 자식 요소들 순차적으로 생성
                for (const child of childElements) {
                    const childData = await elementsApi.createElement(child);
                    addElement(childData);
                }
            } 
            // ToggleButtonGroup 처리 부분
            else if (componentType === 'ToggleButtonGroup') {
                const defaultToggleButtons = [
                    {
                        id: crypto.randomUUID(),
                        tag: 'ToggleButton',
                        props: { children: 'Button 1' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 1, // 1부터 시작
                    },
                    {
                        id: crypto.randomUUID(),
                        tag: 'ToggleButton',
                        props: { children: 'Button 2' } as ElementProps,
                        parent_id: newElement.id,
                        page_id: currentPageId!,
                        order_num: 2, // 순차적 증가
                    }
                ];

                // 부모 요소 먼저 생성
                const data = await elementsApi.createElement(newElement);
                addElement(data);

                // 자식 요소들 순차적으로 생성
                for (const toggleButton of defaultToggleButtons) {
                    const toggleData = await elementsApi.createElement(toggleButton);
                    addElement(toggleData);
                }
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
            setError(`요소 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        } finally {
            isProcessingRef.current = false;
        }
    }, [currentPageId, addElement, elements, getDefaultProps]);

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
        if (!currentPageId) {
            setError('현재 페이지가 선택되지 않았습니다.');
            return;
        }

        setError(null);

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
            setError('페이지 생성 중 오류가 발생했습니다.');
        }
    }, [currentPageId, projectId, pages.length, addElement]);

    // 페이지 초기화 로직 개선

    // 프로젝트 로딩 시 페이지들 fetch
    const fetchPages = useCallback(async () => {
        if (!projectId) return;

        setIsLoading(true);
        setError(null);

        try {
            console.log('Fetching pages for project:', projectId);
            
            const projectPages = await pagesApi.getPagesByProjectId(projectId);
            
            if (projectPages && projectPages.length > 0) {
                setPages(projectPages);
                
                // 첫 번째 페이지를 선택된 페이지로 설정
                if (!selectedPageId) {
                    const firstPage = projectPages[0];
                    setSelectedPageId(firstPage.id);
                    
                    // Zustand 스토어에도 현재 페이지 설정
                    const { setCurrentPageId } = useStore.getState();
                    setCurrentPageId(firstPage.id);
                }
            } else {
                console.log('No pages found for project:', projectId);
                setPages([]);
            }
        } catch (error) {
            console.error('Error fetching pages:', error);
            setError('페이지를 가져오는 중 오류가 발생했습니다.');
            setPages([]);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, selectedPageId]);

    // 프로젝트 변경 시 페이지들 자동 fetch
    useEffect(() => {
        if (projectId) {
            fetchPages();
        }
    }, [projectId, fetchPages]);

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

    // 디버깅을 위한 order_num 검증 함수

    const validateOrderNumbers = () => {
        if (process.env.NODE_ENV !== 'development') return;
        
        //console.group('Order Numbers Validation');
        
        // 페이지별, 부모별로 그룹화
        const groups = elements.reduce((acc, element) => {
            const key = `${element.page_id}_${element.parent_id || 'root'}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(element);
            return acc;
        }, {} as Record<string, typeof elements>);

        Object.entries(groups).forEach(([, children]) => {
            
            // order_num으로 정렬
            const sorted = children.sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
            
            sorted.forEach((child, index) => {
                const expectedOrder = index + 1;
                const actualOrder = child.order_num || 0;
                const isValid = actualOrder === expectedOrder;

                /*console.log(
                    `  ${child.tag} (${child.id.slice(0, 8)}...): order_num=${actualOrder}, expected=${expectedOrder}`,
                    isValid ? '✅' : '❌'
                );*/

                if (!isValid) {
                    console.warn(`    ⚠️ Order mismatch detected!`);
                }
            });
        });
        
        console.groupEnd();
    };

    // useEffect에서 검증 함수 호출
    useEffect(() => {
        if (elements.length > 0) {
            validateOrderNumbers();
        }
    }, [elements]);

    return (
        <div className="app">
            {/* 에러 표시 */}
            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}
            
            {/* 로딩 표시 */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-spinner">Loading...</div>
                </div>
            )}
            
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