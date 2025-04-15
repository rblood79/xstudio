import React, { useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../env/supabase.client";
import { Menu, Eye, Smartphone, Monitor, Undo, Redo, Play } from 'lucide-react';
import SelectionOverlay from "./overlay";
import Inspector from "./inspector/layout";
import Sidebar from "./sidebar/index";
import "./builder.css";
import { useStore } from './stores/elements';
import { useThemeStore } from './stores/themeStore';
import { debounce } from 'lodash';

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
    const themeStore = useThemeStore();

    const elements = useStore((state) => state.elements);
    const selectedElementId = useStore((state) => state.selectedElementId);
    const currentPageId = useStore((state) => state.currentPageId);
    const pageHistories = useStore((state) => state.pageHistories);
    const { addElement, setSelectedElement, updateElementProps, undo, redo, loadPageElements } = useStore();
    const [pages, setPages] = React.useState<Page[]>([]);
    const [selectedPageId, setSelectedPageId] = React.useState<string | null>(null);
    const [iconProps] = React.useState({ color: "#171717", stroke: 1, size: 21 });

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
                ...(text ? { text } : {}),
                style: {},
            };

            switch (tag) {
                case 'ToggleButton':
                    return {
                        ...baseProps,
                        isSelected: false,
                        defaultSelected: false,
                        className: '',
                        'aria-pressed': false,
                    };

                case 'ToggleButtonGroup':
                    return {
                        ...baseProps,
                        value: [],
                        defaultValue: [],
                        className: '',
                        selectionMode: 'multiple',
                        orientation: 'horizontal',
                        isDisabled: false,
                    };

                case 'Button':
                    return {
                        ...baseProps,
                        isDisabled: false,
                        className: '',
                        children: text || 'Button',
                    };

                case 'TextField':
                    return {
                        ...baseProps,
                        text: text || 'Text Field',
                        isDisabled: false,
                        className: '',
                        style: {},
                    };

                case 'Label':
                    return {
                        ...baseProps,
                        text: text || 'Label',
                        className: '',
                        style: {},
                    };

                case 'Description':
                    return {
                        ...baseProps,
                        text: text || 'Description',
                        className: '',
                        style: {},
                    };

                case 'Input':
                    return {
                        ...baseProps,
                        text: text || 'Input',
                        className: '',
                        style: {},
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
                        text: newElement.props.text || 'Text Field',
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
                    setSelectedElement(textFieldId, newElement.props);
                });
            }
        } else if (args[0] === 'ToggleButtonGroup') {
            const textFieldId = newElement.id;
            const childElements = [
                {
                    id: crypto.randomUUID(),
                    page_id: selectedPageId,
                    tag: 'ToggleButton',
                    props: {
                        text: 'Left',
                        style: {},
                        className: ''
                    },
                    parent_id: textFieldId,
                    order_num: 1,
                },
                {
                    id: crypto.randomUUID(),
                    page_id: selectedPageId,
                    tag: 'ToggleButton',
                    props: {
                        text: 'center',
                        style: {},
                        className: ''
                    },
                    parent_id: textFieldId,
                    order_num: 1,
                },
                {
                    id: crypto.randomUUID(),
                    page_id: selectedPageId,
                    tag: 'ToggleButton',
                    props: {
                        text: 'Right',
                        style: {},
                        className: ''
                    },
                    parent_id: textFieldId,
                    order_num: 2,
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
                    setSelectedElement(textFieldId, newElement.props);
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

        const styleObject = themeStore.getStyleObject();

        // Apply styles to parent document
        let parentStyleElement = document.getElementById('theme-tokens');
        if (!parentStyleElement) {
            parentStyleElement = document.createElement('style');
            parentStyleElement.id = 'theme-tokens';
            document.head.appendChild(parentStyleElement);
        }

        // Convert style object to CSS string
        const cssString = `:root {\n${Object.entries(styleObject)
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
    }, [themeStore]);

    useEffect(() => {
        if (projectId) {
            themeStore.fetchTokens(projectId);
        }
    }, [projectId, themeStore]);

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
                    <div className="bg">
                        <div className="workspace">
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
                        <span>
                            {currentPageId && pageHistories[currentPageId]
                                ? `${pageHistories[currentPageId].historyIndex + 1}/${pageHistories[currentPageId].history.length}`
                                : '0/0'
                            }
                        </span>
                        <button aria-label="Screen Width 767">767</button>
                        <button aria-label="Mobile View">
                            <Smartphone color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        </button>
                        <button aria-label="Desktop View">
                            <Monitor color={iconProps.color} strokeWidth={iconProps.stroke} size={iconProps.size} />
                        </button>
                    </div>
                    <div className="header_contents header_right">
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