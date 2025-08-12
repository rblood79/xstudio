import React, { useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../env/supabase.client";
import { Menu, Eye, Undo, Redo, Play, Monitor, Tablet, Smartphone, Asterisk } from 'lucide-react';

import { RadioGroup, Radio, Key, Label } from 'react-aria-components';
import { iconProps } from '../builder/constants';
import SelectionOverlay from "./overlay";
import Inspector from "./inspector";
import Sidebar from "./sidebar";

import { useStore } from './stores/elements';
import { useThemeStore } from './stores/theme';
import { debounce } from 'lodash';
import type { ElementProps } from '../types/supabase';
import { ColorValue } from '../types/theme';

import "./builder.css";


interface Page {
    id: string;
    title: string;
    project_id: string;
    slug: string;
    parent_id?: string | null;
    order_num?: number;
}

function Builder() {
    const { projectId } = useParams<{ projectId: string }>();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // 새로운 통합된 스토어 사용
    const {
        rawTokens,
        semanticTokens,
        loadTheme
    } = useThemeStore();

    const elements = useStore((state) => state.elements);
    const selectedElementId = useStore((state) => state.selectedElementId);
    const currentPageId = useStore((state) => state.currentPageId);
    const pageHistories = useStore((state) => state.pageHistories);
    const { addElement, setSelectedElement, updateElementProps, undo, redo, loadPageElements } = useStore();
    const [pages, setPages] = React.useState<Page[]>([]);
    const [selectedPageId, setSelectedPageId] = React.useState<string | null>(null);

    const [breakpoint, setBreakpoint] = React.useState(new Set<Key>(['screen']));

    // Breakpoints structure aligned with future Supabase table
    const [breakpoints] = React.useState([
        { id: 'screen', label: 'Screen', max_width: '100%', max_height: '100%' },
        //{ id: 'desktop', label: 'Desktop', min_width: 1920, min_height: 1080 },
        { id: 'desktop', label: 'Desktop', max_width: 1280, max_height: 1080 },
        { id: 'tablet', label: 'Tablet', max_width: 1024, max_height: 800 },
        { id: 'mobile', label: 'Mobile', max_width: 390, max_height: 844 }
    ]);

    // Future integration with Supabase - commented out for now
    /*
    useEffect(() => {
        const fetchBreakpoints = async () => {
            if (!projectId) return;
            const { data, error } = await supabase
                .from("breakpoints")
                .select("id, label, max_width, max_height")
                .eq("project_id", projectId);
            if (error) {
                console.error("Breakpoints fetch error:", error);
            } else if (data) {
                setBreakpoints(data);
            }
        };
        if (projectId) fetchBreakpoints();
    }, [projectId]);
    */

    // 진행 중 여부를 추적하는 플래그
    let isProcessing = false;

    useEffect(() => {
        const fetchProjects = async () => {
            const { data, error } = await supabase
                .from("pages")
                .select("*")
                .eq("project_id", projectId)
                .order('order_num', { ascending: true });
            if (error) {
                console.error("프로젝트 조회 에러:", error);
            } else {
                setPages(data);
            }
        };
        if (projectId) fetchProjects();
    }, [projectId]);

    const fetchElements = useCallback(async (pageId: string) => {
        window.postMessage({ type: "CLEAR_OVERLAY" }, window.location.origin);
        setSelectedPageId(pageId);
        setSelectedElement(null);
        const { data, error } = await supabase
            .from("elements")
            .select("*")
            .eq("page_id", pageId)
            .order('order_num', { ascending: true });
        if (error) console.error("요소 조회 에러:", error);
        else {
            loadPageElements(data, pageId);
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage(
                    { type: "UPDATE_ELEMENTS", elements: data || [] },
                    window.location.origin
                );
            }
        }
    }, [setSelectedPageId, setSelectedElement, loadPageElements]);

    useEffect(() => {
        if (!selectedPageId && pages.length > 0) {
            fetchElements(pages[0].id);
        }
    }, [pages, selectedPageId, fetchElements]);

    const handleAddElement = async (...args: [string, string]) => {
        if (!selectedPageId) {
            alert("먼저 페이지를 선택하세요.");
            return;
        }

        const maxOrderNum = elements.reduce((max, el) =>
            Math.max(max, el.order_num || 0), 0);

        const getDefaultProps = (tag: string, text?: string) => {
            const baseProps = {
                style: {},
                className: '',
            };

            switch (tag) {
                case 'Button':
                    return {
                        ...baseProps,
                        isDisabled: false,
                        children: text || 'Button',
                    };

                case 'ToggleButton':
                    return {
                        ...baseProps,
                        isSelected: false,
                        defaultSelected: false,
                        'aria-pressed': false,
                        children: text || 'Toggle',
                    };

                case 'ToggleButtonGroup':
                    return {
                        ...baseProps,
                        value: [],
                        defaultValue: [],
                        selectionMode: 'single',
                        orientation: 'horizontal',
                        isDisabled: false,
                        children: [
                            {
                                id: 'toggle1',
                                title: 'Option 1',
                                isSelected: false
                            },
                            {
                                id: 'toggle2',
                                title: 'Option 2',
                                isSelected: false
                            }
                        ]
                    };
                case 'CheckboxGroup':
                    return {
                        ...baseProps,
                        label: text || 'Checkbox Group',
                        orientation: 'vertical',
                        isDisabled: false,
                        children: [
                            {
                                id: 'checkbox1',
                                label: 'Option 1',
                                isSelected: false
                            },
                            {
                                id: 'checkbox2',
                                label: 'Option 2',
                                isSelected: false
                            }
                        ]
                    };
                case 'TextField':
                    return {
                        ...baseProps,
                        label: text || 'Text Field',
                        description: '', // 설명 텍스트
                        errorMessage: '', // 에러 메시지
                        isDisabled: false,
                        isRequired: false, // 필수 필드 여부
                        isReadOnly: false, // 읽기 전용 여부
                    };

                case 'Label':
                    return {
                        ...baseProps,
                        children: text || 'Label',
                    };

                case 'Description':
                    return {
                        ...baseProps,
                        children: text || 'Description',
                    };

                case 'Input':
                    return {
                        ...baseProps,
                        type: 'text',
                        value: '',
                        placeholder: text || 'Input',
                        'aria-label': text || 'Input',
                    };
                case 'ListBox':
                    return {
                        ...baseProps,
                        label: text || 'List Box',
                        orientation: 'vertical',
                        selectionMode: 'none',
                        itemLayout: 'default',
                        selectedKeys: [],
                        children: [
                            {
                                id: crypto.randomUUID(),
                                type: 'ListBoxItem',
                                label: 'Item 1',
                                value: 'item1',
                                isDisabled: false
                            },
                            {
                                id: crypto.randomUUID(),
                                type: 'ListBoxItem',
                                label: 'Item 2',
                                value: 'item2',
                                isDisabled: false
                            }
                        ]
                    };

                case 'GridList':
                    return {
                        ...baseProps,
                        label: text || 'Grid List',
                        orientation: 'vertical',
                        selectionMode: 'none',
                        selectedKeys: [],
                        children: [
                            {
                                id: crypto.randomUUID(),
                                type: 'GridListItem',
                                label: 'Item 1',
                                value: 'item1',
                                isDisabled: false
                            },
                            {
                                id: crypto.randomUUID(),
                                type: 'GridListItem',
                                label: 'Item 2',
                                value: 'item2',
                                isDisabled: false
                            }
                        ]
                    };
                case 'Select':
                    return {
                        ...baseProps,
                        label: text || 'Select',
                        selectedKey: null,
                        children: [
                            {
                                id: crypto.randomUUID(),
                                type: 'SelectItem',
                                label: 'Option 1',
                                value: 'option1',
                                isDisabled: false
                            },
                            {
                                id: crypto.randomUUID(),
                                type: 'SelectItem',
                                label: 'Option 2',
                                value: 'option2',
                                isDisabled: false
                            }
                        ]
                    };

                case 'ComboBox':
                    return {
                        ...baseProps,
                        label: text || 'ComboBox',
                        selectedKey: null,
                        children: [
                            {
                                id: crypto.randomUUID(),
                                type: 'ComboBoxItem',
                                label: 'Option 1',
                                value: 'option1',
                                isDisabled: false
                            },
                            {
                                id: crypto.randomUUID(),
                                type: 'ComboBoxItem',
                                label: 'Option 2',
                                value: 'option2',
                                isDisabled: false
                            }
                        ]
                    };
                case 'Text':
                    return {
                        ...baseProps,
                        children: text || 'Text',
                        as: 'p', // 기본값 추가
                    };
                case 'Slider':
                    return {
                        ...baseProps,
                        label: text || 'Slider',
                        value: [50],
                        minValue: 0,
                        maxValue: 100,
                        step: 1,
                        orientation: 'horizontal',
                    };
                case 'Tabs':
                    return {
                        ...baseProps,
                        defaultSelectedKey: 'tab1',
                        orientation: 'horizontal',
                        isDisabled: false,
                        children: [
                            {
                                id: 'tab1',
                                title: 'Tab 1',
                                content: 'Tab 1 content'
                            },
                            {
                                id: 'tab2',
                                title: 'Tab 2',
                                content: 'Tab 2 content'
                            }
                        ]
                    };

                case 'Tree':
                    return {
                        ...baseProps,
                        label: text || 'Tree',
                        selectionMode: 'single',
                        selectionBehavior: 'replace',
                        expandedKeys: ['folder1'],
                        selectedKeys: [],
                        allowsDragging: false,
                        children: [
                            {
                                id: 'folder1',
                                title: 'Folder 1',
                                type: 'folder',
                                parent_id: null
                            },
                            {
                                id: 'file1',
                                title: 'File 1.txt',
                                type: 'file',
                                parent_id: 'folder1'
                            },
                            {
                                id: 'file2',
                                title: 'File 2.txt',
                                type: 'file',
                                parent_id: 'folder1'
                            },
                            {
                                id: 'folder2',
                                title: 'Folder 2',
                                type: 'folder',
                                parent_id: null
                            },
                            {
                                id: 'file3',
                                title: 'File 3.txt',
                                type: 'file',
                                parent_id: 'folder2'
                            }
                        ]
                    };

                case 'Card':
                    return {
                        ...baseProps,
                        children: text || 'Card Content',
                    };
                case 'RadioGroup':
                    return {
                        ...baseProps,
                        label: text || 'Radio Group',
                        orientation: 'vertical',
                        isDisabled: false,
                        children: [
                            {
                                id: 'radio1',
                                label: 'Option 1',
                                value: 'option1'
                            },
                            {
                                id: 'radio2',
                                label: 'Option 2',
                                value: 'option2'
                            }
                        ]
                    };
                case 'Panel':
                    return {
                        ...baseProps,
                        variant: 'tab',
                        title: text || 'Panel',
                    };
                default:
                    return baseProps;
            }
        };

        const newElement = {
            id: crypto.randomUUID(),
            page_id: selectedPageId,
            tag: args[0],
            props: getDefaultProps(args[0], args[1]),
            parent_id: selectedElementId || null,
            order_num: maxOrderNum + 1,
        };

        // TextField 컴포넌트인 경우 내부 구성 요소들도 함께 생성
        if (args[0] === 'TextField') {
            const textFieldId = newElement.id;
            const childElements = [
                {
                    id: crypto.randomUUID(),
                    page_id: selectedPageId,
                    tag: 'Label',
                    props: {
                        children: 'Text Field',
                        style: {},
                        className: ''
                    },
                    parent_id: textFieldId,
                    order_num: 1,
                },
                {
                    id: crypto.randomUUID(),
                    page_id: selectedPageId,
                    tag: 'Input',
                    props: {
                        style: {},
                        className: ''
                    },
                    parent_id: textFieldId,
                    order_num: 2,
                },
                {
                    id: crypto.randomUUID(),
                    page_id: selectedPageId,
                    tag: 'Description',
                    props: {
                        text: '',
                        style: {},
                        className: ''
                    },
                    parent_id: textFieldId,
                    order_num: 3,
                },
                {
                    id: crypto.randomUUID(),
                    page_id: selectedPageId,
                    tag: 'FieldError',
                    props: {
                        text: '',
                        style: {},
                        className: ''
                    },
                    parent_id: textFieldId,
                    order_num: 4,
                }
            ];

            // 모든 요소를 한 번에 삽입
            const { data, error } = await supabase
                .from("elements")
                .insert([newElement, ...childElements])
                .select();

            if (error) console.error("요소 추가 에러:", error);
            else if (data) {
                // 모든 요소를 상태에 추가
                data.forEach(element => {
                    addElement(element);
                });

                requestAnimationFrame(() => {
                    setSelectedElement(textFieldId, newElement.props as ElementProps);
                });
            }
        } else if (args[0] === 'ToggleButtonGroup') {
            // ToggleButtonGroup은 자식 요소 없이 단독으로 추가 (가상 노드 방식 사용)
            const { data, error } = await supabase
                .from("elements")
                .insert([newElement])
                .select();

            if (error) console.error("요소 추가 에러:", error);
            else if (data) {
                data.forEach(element => {
                    addElement(element);
                });

                requestAnimationFrame(() => {
                    setSelectedElement(newElement.id, newElement.props as ElementProps);
                });
            }

        } else if (args[0] === 'Tabs') {
            const tabsId = newElement.id;
            const tabsProps = newElement.props as { children?: Array<{ id: string; title: string; content: string }> };
            const children = tabsProps.children || [];

            // TabPanels 하위에 들어갈 Panel 컴포넌트들 생성
            const panelElements = children.map((tab: { id: string; title: string; content: string }, index: number) => ({
                id: crypto.randomUUID(),
                page_id: selectedPageId,
                tag: 'Panel',
                props: {
                    variant: 'tab',
                    title: tab.title,
                    tabIndex: index,
                    style: {},
                    className: '',
                },
                parent_id: tabsId, // Tabs를 직접 부모로 설정
                order_num: index + 1,
            }));

            // Tabs와 Panel들을 함께 삽입
            const { data, error } = await supabase
                .from("elements")
                .insert([newElement, ...panelElements])
                .select();

            if (error) console.error("Tabs 및 Panel 추가 에러:", error);
            else if (data) {
                data.forEach(element => {
                    addElement(element);
                });

                requestAnimationFrame(() => {
                    setSelectedElement(tabsId, newElement.props as ElementProps);
                });
            }
        } else {
            // TextField가 아닌 경우 기존 로직 사용
            const { data, error } = await supabase
                .from("elements")
                .insert([newElement])
                .select();

            if (error) console.error("요소 추가 에러:", error);
            else if (data) {
                addElement(data[0]);
                requestAnimationFrame(() => {
                    setSelectedElement(data[0].id, data[0].props);
                });
            }
        }
    };

    const handleUndo = debounce(async () => {
        if (isProcessing) return;
        isProcessing = true;

        try {
            undo();
            await new Promise((resolve) => setTimeout(resolve, 0));
            const updatedElements = useStore.getState().elements;

            const { error } = await supabase
                .from("elements")
                .upsert(updatedElements, { onConflict: "id" });
            if (error) throw error;

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
            isProcessing = false;
        }
    }, 300);

    const handleRedo = debounce(async () => {
        if (isProcessing) return;
        isProcessing = true;

        try {
            redo();
            await new Promise((resolve) => setTimeout(resolve, 0));
            const updatedElements = useStore.getState().elements;

            const { error } = await supabase
                .from("elements")
                .upsert(updatedElements, { onConflict: "id" });
            if (error) throw error;

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
            isProcessing = false;
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

            if (event.data.type === "ELEMENT_SELECTED" && event.data.source !== "builder") {
                setSelectedElement(event.data.elementId, event.data.payload?.props);
            }
            if (event.data.type === "UPDATE_ELEMENT_PROPS" && event.data.elementId) {
                updateElementProps(event.data.elementId, event.data.payload.props);
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

    const handleAddPage = async () => {
        const title = prompt("Enter page title:");
        const slug = prompt("Enter page slug:");
        if (!title || !slug) {
            alert("Title and slug are required.");
            return;
        }

        const sortedPages = [...pages].sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
        const newOrderNum = sortedPages.length === 0 ? 1000 : (sortedPages[sortedPages.length - 1].order_num || 0) + 1000;

        const newPage = {
            title,
            project_id: projectId,
            slug,
            order_num: newOrderNum,
        };

        const { data: pageData, error: pageError } = await supabase
            .from("pages")
            .insert([newPage])
            .select();

        if (pageError) {
            console.error("페이지 생성 에러:", pageError);
            return;
        }

        if (pageData) {
            const createdPage = pageData[0];

            const bodyElement = {
                id: crypto.randomUUID(),
                page_id: createdPage.id,
                parent_id: null,
                tag: "body",
                props: { style: { margin: 0 } },
                order_num: 0,
            };

            const { data: elementData, error: elementError } = await supabase
                .from("elements")
                .insert([bodyElement])
                .select();

            if (elementError) {
                console.error("Body 요소 생성 에러:", elementError);
                return;
            }

            setPages((prevPages) => [...prevPages, createdPage]);
            if (elementData) {
                addElement(elementData[0]);
                fetchElements(createdPage.id);
            }
        }
    };

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