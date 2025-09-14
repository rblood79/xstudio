import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Key } from 'react-aria-components';
import { debounce } from 'lodash';

import { useStore } from '../stores';
import { elementsApi } from '../../services/api/ElementsApiService';
import { pagesApi } from '../../services/api/PagesApiService';
import type { ElementProps } from '../../types/supabase';
import { Element, Page } from '../../types/store';
import { ColorValue } from '../../types/theme';

import { BuilderHeader, Breakpoint } from './BuilderHeader';
import { BuilderWorkspace } from './BuilderWorkspace';
import { BuilderViewport } from './BuilderViewport';
import Inspector from '../inspector';
import Sidebar from '../sidebar';

import './index.css';

export const BuilderCore: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const isProcessingRef = useRef(false);

    // Store 상태
    const elements = useStore((state) => state.elements);
    const currentPageId = useStore((state) => state.currentPageId);
    const pageHistories = useStore((state) => state.pageHistories);
    const selectedElementId = useStore((state) => state.selectedElementId);
    const setSelectedElement = useStore((state) => state.setSelectedElement);
    const setCurrentPageId = useStore((state) => state.setCurrentPageId);
    const { addElement, undo, redo, updateElementProps } = useStore();

    // 테마 관련 상태 추가
    const rawTokens = useStore(state => state.rawTokens);
    const semanticTokens = useStore(state => state.semanticTokens);
    const loadTheme = useStore(state => state.loadTheme);

    // Local 상태
    const [pages, setPages] = useState<Page[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [breakpoint, setBreakpoint] = useState(new Set<Key>(['screen']));
    const [iframeReady, setIframeReady] = useState(false);

    const [breakpoints] = useState<Breakpoint[]>([
        { id: 'screen', label: 'Screen', max_width: '100%', max_height: '100%' },
        { id: 'desktop', label: 'Desktop', max_width: 1280, max_height: 1080 },
        { id: 'tablet', label: 'Tablet', max_width: 1024, max_height: 800 },
        { id: 'mobile', label: 'Mobile', max_width: 390, max_height: 844 }
    ]);

    // iframe에 요소 전송 함수
    const sendElementsToIframe = useCallback((elementsToSend: Element[]) => {
        // DOM에서 직접 iframe 찾기 (ref가 제대로 설정되지 않을 수 있음)
        const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
        if (!iframe?.contentWindow) {
            console.log('iframe not ready for sending elements');
            return;
        }

        console.log('Sending elements to iframe:', elementsToSend.length);
        iframe.contentWindow.postMessage(
            { type: "UPDATE_ELEMENTS", elements: elementsToSend },
            window.location.origin
        );
    }, []);

    // 요소 선택 시 iframe에 메시지 전송
    const sendElementSelectedMessage = useCallback((elementId: string, props?: ElementProps) => {
        const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
        if (!iframe?.contentWindow) return;

        const element = elements.find(el => el.id === elementId);
        if (!element) return;

        const message = {
            type: "ELEMENT_SELECTED",
            elementId,
            payload: {
                tag: element.tag,
                props: props || element.props,
                source: "builder"
            },
            source: "builder"
        };

        iframe.contentWindow.postMessage(message, window.location.origin);
        window.postMessage(message, window.location.origin);
    }, [elements]);

    // 선택된 요소가 변경될 때마다 iframe에 알림
    useEffect(() => {
        if (selectedElementId && iframeReady) {
            const element = elements.find(el => el.id === selectedElementId);
            if (element) {
                const timer = setTimeout(() => {
                    sendElementSelectedMessage(selectedElementId, element.props);
                }, 100);

                return () => clearTimeout(timer);
            }
        }
    }, [selectedElementId, elements, sendElementSelectedMessage, iframeReady]);

    // elements가 변경될 때마다 iframe에 전송
    useEffect(() => {
        if (elements.length > 0 && iframeReady) {
            console.log('Elements changed, sending to iframe:', elements.length);
            sendElementsToIframe(elements);
        }
    }, [elements, sendElementsToIframe, iframeReady]);

    // fetchElements를 useEffect보다 앞에 이동
    const fetchElements = useCallback(async (pageId: string) => {
        if (!pageId) return;

        try {
            setIsLoading(true);
            const elementsData = await elementsApi.getElementsByPageId(pageId);
            const { setElements } = useStore.getState();
            setElements(elementsData);

            // 페이지 변경 시 현재 페이지 ID 업데이트
            setCurrentPageId(pageId);
            setSelectedPageId(pageId);
        } catch (error) {
            console.error('요소 로드 에러:', error);
            setError(`요소 로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        } finally {
            setIsLoading(false);
        }
    }, [setCurrentPageId]); // 의존성 명시

    // 프로젝트 초기 로딩 (fetchElements 선언 후)
    useEffect(() => {
        const initializeProject = async () => {
            if (!projectId) return;

            try {
                setIsLoading(true);

                // 1. 프로젝트의 페이지들 로드
                const projectPages = await pagesApi.getPagesByProjectId(projectId);
                setPages(projectPages);

                // 2. 첫 번째 페이지가 있으면 선택하고 요소들 로드
                if (projectPages.length > 0) {
                    const firstPage = projectPages[0];
                    setSelectedPageId(firstPage.id);
                    setCurrentPageId(firstPage.id);

                    // 첫 번째 페이지의 요소들 로드
                    await fetchElements(firstPage.id);
                }
            } catch (error) {
                console.error('프로젝트 초기화 에러:', error);
                setError(`프로젝트 로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
            } finally {
                setIsLoading(false);
            }
        };

        initializeProject();
    }, [projectId, setCurrentPageId, fetchElements]);

    // getDefaultProps 함수
    const getDefaultProps = useCallback((tag: string): ElementProps => {
        const baseProps: ElementProps = {
            style: {},
            className: "",
            children: "",
            events: []
        };

        switch (tag) {
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

    // 이벤트 핸들러들
    const handleIframeLoad = useCallback(() => {
        console.log('iframe loaded');
        setIframeReady(true);

        // iframe 로드 후 현재 요소들을 전송
        if (elements.length > 0) {
            setTimeout(() => {
                console.log('Sending initial elements after iframe load:', elements.length);
                sendElementsToIframe(elements);
            }, 1000); // iframe이 완전히 로드될 때까지 충분한 대기
        }
    }, [elements, sendElementsToIframe]);

    const handleMessage = useCallback((event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
            console.warn("Received message from untrusted origin:", event.origin);
            return;
        }

        if (event.data.type === "UPDATE_THEME_TOKENS") {
            const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
            if (!iframe?.contentDocument) return;

            let parentStyleElement = document.getElementById('theme-tokens');
            if (!parentStyleElement) {
                parentStyleElement = document.createElement('style');
                parentStyleElement.id = 'theme-tokens';
                document.head.appendChild(parentStyleElement);
            }

            const cssString = `:root {\n${Object.entries(event.data.styles)
                .map(([key, value]) => `  ${key}: ${value};`)
                .join('\n')}\n}`;

            parentStyleElement.textContent = cssString;

            let styleElement = iframe.contentDocument.getElementById('theme-tokens');
            if (!styleElement) {
                styleElement = iframe.contentDocument.createElement('style');
                styleElement.id = 'theme-tokens';
                iframe.contentDocument.head.appendChild(styleElement);
            }

            styleElement.textContent = cssString;
        }

        if (event.data.type === "UPDATE_ELEMENTS" && event.data.elements) {
            console.log("Received UPDATE_ELEMENTS from preview:", event.data.elements.length);
            const { setElements } = useStore.getState();
            setElements(event.data.elements as Element[]);
        }

        if (event.data.type === "ELEMENT_SELECTED" && event.data.source !== "builder") {
            setSelectedElement(event.data.elementId, event.data.payload?.props);
        }

        // 누락된 메시지 핸들링 추가
        if (event.data.type === "UPDATE_ELEMENT_PROPS" && event.data.elementId) {
            updateElementProps(event.data.elementId, event.data.props || event.data.payload?.props);
        }

        // 프리뷰에서 보내는 element-props-update 메시지 처리
        if (event.data.type === "element-props-update" && event.data.elementId) {
            updateElementProps(event.data.elementId, event.data.props);

            // 업데이트된 요소 정보를 프리뷰에 다시 전송
            const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
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
            // 필요한 경우 여기에 클릭 이벤트 관련 로직 추가
        }
    }, [setSelectedElement, updateElementProps]);

    const handleUndo = debounce(async () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        try {
            undo();
            await new Promise((resolve) => setTimeout(resolve, 0));
            const updatedElements = useStore.getState().elements;

            for (const element of updatedElements) {
                await elementsApi.updateElement(element.id, element);
            }

            sendElementsToIframe(updatedElements);
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

            for (const element of updatedElements) {
                await elementsApi.updateElement(element.id, element);
            }

            sendElementsToIframe(updatedElements);
        } catch (error) {
            console.error("Redo error:", error);
        } finally {
            isProcessingRef.current = false;
        }
    }, 300);

    const handlePreview = useCallback(() => {
        console.log('Preview clicked');
    }, []);

    const handlePlay = useCallback(() => {
        console.log('Play clicked');
    }, []);

    const handlePublish = useCallback(() => {
        console.log('Publish clicked');
    }, []);

    const handleAddPage = useCallback(async () => {
        if (!projectId) return;

        try {
            const newPage = await pagesApi.createPage({
                project_id: projectId,
                title: `Page ${pages.length + 1}`,
                slug: `page-${pages.length + 1}`,
                order_num: pages.length
            });

            setPages(prev => [...prev, newPage]);
            setSelectedPageId(newPage.id);
            setCurrentPageId(newPage.id);

            // 새 페이지에 기본 body 요소 생성
            const bodyElement = {
                id: crypto.randomUUID(),
                tag: 'body',
                props: {} as ElementProps,
                parent_id: null,
                page_id: newPage.id,
                order_num: 0,
            };

            const elementData = await elementsApi.createElement(bodyElement);
            addElement(elementData);
        } catch (error) {
            console.error('페이지 생성 에러:', error);
            setError(`페이지 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
    }, [projectId, pages.length, setCurrentPageId, addElement]);

    const handleAddElement = useCallback(async (tag: string) => {
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

                // TextField 특별 처리 - 자식 요소들과 함께 생성
                if (tag === 'TextField') {
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const childElements = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'Label',
                            props: { children: 'Label' } as ElementProps,
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 1,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'Input',
                            props: {
                                type: 'text',
                                placeholder: props.placeholder || 'Enter text...'
                            } as ElementProps,
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 2,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'Description',
                            props: { text: 'Description' } as ElementProps,
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 3,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'FieldError',
                            props: { text: 'Error message' } as ElementProps,
                            parent_id: data.id,
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
                // ToggleButtonGroup 처리
                else if (tag === 'ToggleButtonGroup') {
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
                            parent_id: data.id,
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
                            parent_id: data.id,
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
                // CheckboxGroup 처리
                else if (tag === 'CheckboxGroup') {
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const defaultCheckboxes = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'Checkbox',
                            props: { children: 'Option 1' } as ElementProps,
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 0,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'Checkbox',
                            props: { children: 'Option 2' } as ElementProps,
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const checkbox of defaultCheckboxes) {
                        const checkboxData = await elementsApi.createElement(checkbox);
                        addElement(checkboxData);
                    }
                }
                // RadioGroup 처리
                else if (tag === 'RadioGroup') {
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const defaultRadios = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'Radio',
                            props: { children: 'Option 1', value: 'option1' } as ElementProps,
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 0,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'Radio',
                            props: { children: 'Option 2', value: 'option2' } as ElementProps,
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const radio of defaultRadios) {
                        const radioData = await elementsApi.createElement(radio);
                        addElement(radioData);
                    }
                }
                // ListBox 처리
                else if (tag === 'ListBox') {
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const defaultItems = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'ListBoxItem',
                            props: { label: 'Item 1', value: 'item1' } as ElementProps,
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 0,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'ListBoxItem',
                            props: { label: 'Item 2', value: 'item2' } as ElementProps,
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const item of defaultItems) {
                        const itemData = await elementsApi.createElement(item);
                        addElement(itemData);
                    }
                }
                // GridList 처리
                else if (tag === 'GridList') {
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const defaultItems = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'GridListItem',
                            props: { label: 'Item 1', value: 'item1' } as ElementProps,
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 0,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'GridListItem',
                            props: { label: 'Item 2', value: 'item2' } as ElementProps,
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const item of defaultItems) {
                        const itemData = await elementsApi.createElement(item);
                        addElement(itemData);
                    }
                }
                // Select 처리
                else if (tag === 'Select') {
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const defaultItems = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'SelectItem',
                            props: { label: 'Option 1', value: 'option1' } as ElementProps,
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 0,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'SelectItem',
                            props: { label: 'Option 2', value: 'option2' } as ElementProps,
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const item of defaultItems) {
                        const itemData = await elementsApi.createElement(item);
                        addElement(itemData);
                    }
                }
                // ComboBox 처리
                else if (tag === 'ComboBox') {
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);

                    const defaultItems = [
                        {
                            id: crypto.randomUUID(),
                            tag: 'ComboBoxItem',
                            props: { label: 'Option 1', value: 'option1' } as ElementProps,
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 0,
                        },
                        {
                            id: crypto.randomUUID(),
                            tag: 'ComboBoxItem',
                            props: { label: 'Option 2', value: 'option2' } as ElementProps,
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const item of defaultItems) {
                        const itemData = await elementsApi.createElement(item);
                        addElement(itemData);
                    }
                }
                // Tabs 처리
                else if (tag === 'Tabs') {
                    const tabsProps = {
                        ...props,
                        defaultSelectedKey: 'tab1',
                        orientation: 'horizontal'
                    };

                    const tabsData = await elementsApi.createElement({
                        ...newElement,
                        props: tabsProps
                    });
                    addElement(tabsData);

                    // Tab과 Panel을 다른 ID로 생성하되, props에 tabId로 연결
                    const tab1Id = crypto.randomUUID();
                    const panel1Id = crypto.randomUUID();
                    const tab2Id = crypto.randomUUID();
                    const panel2Id = crypto.randomUUID();

                    const tab1Data = await elementsApi.createElement({
                        id: tab1Id,
                        tag: 'Tab',
                        props: { title: 'Tab 1', tabId: tab1Id } as ElementProps,
                        parent_id: tabsData.id,
                        page_id: currentPageId,
                        order_num: 0,
                    });

                    const panel1Data = await elementsApi.createElement({
                        id: panel1Id,
                        tag: 'Panel',
                        props: { title: 'Panel 1', tabIndex: 0, tabId: tab1Id } as ElementProps,
                        parent_id: tabsData.id,
                        page_id: currentPageId,
                        order_num: 1,
                    });

                    const tab2Data = await elementsApi.createElement({
                        id: tab2Id,
                        tag: 'Tab',
                        props: { title: 'Tab 2', tabId: tab2Id } as ElementProps,
                        parent_id: tabsData.id,
                        page_id: currentPageId,
                        order_num: 2,
                    });

                    const panel2Data = await elementsApi.createElement({
                        id: panel2Id,
                        tag: 'Panel',
                        props: { title: 'Panel 2', tabIndex: 1, tabId: tab2Id } as ElementProps,
                        parent_id: tabsData.id,
                        page_id: currentPageId,
                        order_num: 3,
                    });

                    addElement(tab1Data);
                    addElement(panel1Data);
                    addElement(tab2Data);
                    addElement(panel2Data);
                }
                // TagGroup 처리
                else if (tag === 'TagGroup') {
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
                            parent_id: data.id,
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
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const tag of defaultTags) {
                        const tagData = await elementsApi.createElement(tag);
                        addElement(tagData);
                    }
                }
                // Tree 처리
                else if (tag === 'Tree') {
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
                            parent_id: data.id,
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
                            parent_id: data.id,
                            page_id: currentPageId,
                            order_num: 1,
                        }
                    ];

                    for (const treeItem of defaultTreeItems) {
                        const treeItemData = await elementsApi.createElement(treeItem);
                        addElement(treeItemData);
                    }
                }
                // 기본 요소 처리
                else {
                    const data = await elementsApi.createElement(newElement);
                    addElement(data);
                }
            }
        } catch (error) {
            console.error('요소 생성 에러:', error);
            setError(`요소 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        } finally {
            isProcessingRef.current = false;
        }
    }, [currentPageId, selectedElementId, elements, getDefaultProps, addElement, setError]);

    // 테마 토큰 적용 함수
    const applyThemeTokens = useCallback(() => {
        const iframe = document.getElementById('previewFrame') as HTMLIFrameElement;
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

    // 프로젝트 변경 시 테마 로드
    useEffect(() => {
        if (projectId) {
            loadTheme(projectId);
        }
    }, [projectId, loadTheme]);

    // 테마 토큰 적용
    useEffect(() => {
        applyThemeTokens();
    }, [applyThemeTokens]);

    // 클릭 외부 감지
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // UI 요소들을 클릭한 경우는 무시
            if (target.closest('.selection-overlay') ||
                target.closest('.sidebar') ||
                target.closest('.inspector') ||
                target.closest('.header') ||
                target.closest('.footer') ||
                target.closest('#previewFrame')
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

            <BuilderViewport>
                <BuilderHeader
                    projectId={projectId}
                    breakpoint={breakpoint}
                    breakpoints={breakpoints}
                    onBreakpointChange={(value) => setBreakpoint(new Set<Key>([value]))}
                    currentPageId={currentPageId}
                    pageHistories={pageHistories}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onPreview={handlePreview}
                    onPlay={handlePlay}
                    onPublish={handlePublish}
                />

                <BuilderWorkspace
                    projectId={projectId}
                    breakpoint={new Set(Array.from(breakpoint).map(String))}
                    breakpoints={breakpoints}
                    onIframeLoad={handleIframeLoad}
                    onMessage={handleMessage}
                />

                <Sidebar
                    pages={pages}
                    setPages={setPages}
                    handleAddPage={handleAddPage}
                    handleAddElement={handleAddElement}
                    fetchElements={fetchElements}
                    selectedPageId={selectedPageId}
                />

                <aside className="inspector">
                    <Inspector />
                </aside>

                <footer className="footer">footer</footer>
            </BuilderViewport>
        </div>
    );
};