import { useState, useCallback, useEffect, useRef } from 'react';
import { debounce, DebouncedFunc } from 'lodash';
import { useStore } from '../stores';
import type { ElementProps } from '../../types/supabase';
import { Element } from '../../types/store';
import { ElementUtils } from '../../utils/elementUtils';
import { MessageService } from '../../utils/messaging';

export interface UseIframeMessengerReturn {
    iframeReady: boolean;
    setIframeReady: React.Dispatch<React.SetStateAction<boolean>>;
    handleIframeLoad: () => void;
    handleMessage: (event: MessageEvent) => void;
    handleUndo: DebouncedFunc<() => Promise<void>>;
    handleRedo: DebouncedFunc<() => Promise<void>>;
    sendElementsToIframe: (elements: Element[]) => void;
    sendElementSelectedMessage: (elementId: string, props?: ElementProps) => void;
}

export const useIframeMessenger = (): UseIframeMessengerReturn => {
    const [iframeReady, setIframeReady] = useState(false);
    const isProcessingRef = useRef(false);

    const elements = useStore((state) => state.elements);
    //const selectedElementId = useStore((state) => state.selectedElementId);
    const setSelectedElement = useStore((state) => state.setSelectedElement);
    const updateElementProps = useStore((state) => state.updateElementProps);
    const { undo, redo } = useStore();

    // 요소들을 iframe에 전송
    const sendElementsToIframe = useCallback((elementsToSend: Element[]) => {
        const iframe = MessageService.getIframe();
        if (!iframe?.contentWindow) {
            console.warn('iframe not ready');
            return;
        }

        //console.log('Sending elements to iframe:', elementsToSend.length);
        //console.log('Elements being sent:', elementsToSend);

        const message = { type: "UPDATE_ELEMENTS", elements: elementsToSend };
        iframe.contentWindow.postMessage(message, window.location.origin);

        //console.log('Message sent to iframe:', message);
    }, []);

    // 요소 선택 시 iframe에 메시지 전송
    const sendElementSelectedMessage = useCallback((elementId: string, props?: ElementProps) => {
        const iframe = MessageService.getIframe();
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

        //console.log('Sending element selected message:', message);
        iframe.contentWindow.postMessage(message, window.location.origin);
    }, [elements]);

    const handleIframeLoad = useCallback(() => {
        //console.log('iframe loaded');

        // iframe이 완전히 준비될 때까지 기다리는 함수
        const waitForIframeReady = () => {
            const iframe = MessageService.getIframe();
            if (iframe?.contentDocument && iframe.contentDocument.readyState === 'complete') {
                setIframeReady(true);

                // iframe 로드 후 현재 요소들을 전송
                if (elements.length > 0) {
                    setTimeout(() => {
                        //console.log('Sending initial elements after iframe load:', elements.length);
                        sendElementsToIframe(elements);
                    }, 500);
                }
            } else {
                // 아직 준비되지 않았으면 다시 시도
                setTimeout(waitForIframeReady, 100);
            }
        };

        waitForIframeReady();
    }, [elements, sendElementsToIframe]);

    const handleMessage = useCallback((event: MessageEvent) => {
        //console.log('Message received:', event.origin, event.data);

        if (event.origin !== window.location.origin) {
            console.warn("Received message from untrusted origin:", event.origin);
            return;
        }

        //console.log('Processing message type:', event.data.type, event.data);

        if (event.data.type === "UPDATE_THEME_TOKENS") {
            const iframe = MessageService.getIframe();
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
            //console.log("Received UPDATE_ELEMENTS from preview:", event.data.elements.length);
            const { setElements } = useStore.getState();
            setElements(event.data.elements as Element[]);
        }

        if (event.data.type === "ELEMENT_SELECTED" && event.data.source !== "builder") {
            //console.log('Element selected from preview:', event.data.elementId);
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
            const iframe = MessageService.getIframe();
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
            //console.log('Element clicked in preview:', event.data.elementId);
            setSelectedElement(event.data.elementId, event.data.payload?.props);

            // 선택된 요소 정보를 iframe에 다시 전송하여 오버레이 표시
            const element = elements.find(el => el.id === event.data.elementId);
            if (element) {
                const iframe = MessageService.getIframe();
                if (iframe?.contentWindow) {
                    const message = {
                        type: "ELEMENT_SELECTED",
                        elementId: event.data.elementId,
                        payload: {
                            tag: element.tag,
                            props: element.props,
                            source: "builder"
                        },
                        source: "builder"
                    };
                    iframe.contentWindow.postMessage(message, window.location.origin);
                }
            }
        }

        // 추가: element-hover 메시지 처리 (선택사항)
        if (event.data.type === "element-hover" && event.data.elementId) {
            //console.log('Element hovered in preview:', event.data.elementId);
            // 필요시 hover 상태 처리 로직 추가
        }
    }, [setSelectedElement, updateElementProps, elements]);

    const handleUndo = debounce(async () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        try {
            undo();
            await ElementUtils.delay(0);
            const updatedElements = useStore.getState().elements;

            for (const element of updatedElements) {
                await ElementUtils.updateElement(element.id, element);
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
            await ElementUtils.delay(0);
            const updatedElements = useStore.getState().elements;

            for (const element of updatedElements) {
                await ElementUtils.updateElement(element.id, element);
            }

            sendElementsToIframe(updatedElements);
        } catch (error) {
            console.error("Redo error:", error);
        } finally {
            isProcessingRef.current = false;
        }
    }, 300);

    // useEffect 제거하고 Layer 트리에서 직접 호출
    // Layer 트리에서 선택할 때:
    // sendElementSelectedMessage(selectedElementId, element.props);

    // elements가 변경될 때마다 iframe에 전송 (iframeReady 체크 제거)
    useEffect(() => {
        if (elements.length > 0) {
            //console.log('Elements changed, sending to iframe:', elements.length);
            // iframeReady 체크 없이 바로 전송
            sendElementsToIframe(elements);
        }
    }, [elements, sendElementsToIframe]);

    return {
        iframeReady,
        setIframeReady,
        handleIframeLoad,
        handleMessage,
        handleUndo,
        handleRedo,
        sendElementsToIframe,
        sendElementSelectedMessage
    };
};
