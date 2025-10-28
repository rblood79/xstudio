import { useState, useCallback, useEffect, useRef } from 'react';
import { debounce, DebouncedFunc } from 'lodash';
import { useStore } from '../stores';
// useZundoActions는 제거됨 - 기존 시스템 사용
import type { ElementProps } from '../../types/supabase';
import { Element } from '../../types/store';
// ElementUtils는 현재 사용되지 않음
import { MessageService } from '../../utils/messaging';
import { elementsApi } from '../../services/api';
import { useInspectorState } from '../inspector/hooks/useInspectorState';

export type IframeReadyState = 'not_initialized' | 'loading' | 'ready' | 'error';

export interface UseIframeMessengerReturn {
    iframeReadyState: IframeReadyState;
    handleIframeLoad: () => void;
    handleMessage: (event: MessageEvent) => void;
    handleUndo: DebouncedFunc<() => Promise<void>>;
    handleRedo: DebouncedFunc<() => Promise<void>>;
    sendElementsToIframe: (elements: Element[]) => void;
    sendElementSelectedMessage: (elementId: string, props?: ElementProps) => void;
    isIframeReady: boolean;
}

export const useIframeMessenger = (): UseIframeMessengerReturn => {
    const [iframeReadyState, setIframeReadyState] = useState<IframeReadyState>('not_initialized');
    const isProcessingRef = useRef(false);
    const isProcessingPreviewMessageRef = useRef(false); // Preview 메시지 처리 중 플래그
    const messageQueueRef = useRef<Array<{ type: string; payload: unknown }>>([]);

    const elements = useStore((state) => state.elements);
    const setSelectedElement = useStore((state) => state.setSelectedElement);
    const isSyncingToBuilder = useInspectorState((state) => state.isSyncingToBuilder);
    // updateElementProps는 useZundoActions에서 가져옴

    // 기존 히스토리 시스템에서 필요한 함수들만 가져오기
    // undo, redo는 함수 내에서 직접 호출

    // iframe이 준비되었는지 계산된 값
    const isIframeReady = iframeReadyState === 'ready';

    // 요소들을 iframe에 전송 (상태에 따라 큐잉)
    const sendElementsToIframe = useCallback((elementsToSend: Element[]) => {
        // Preview 메시지 처리 중이면 다시 Preview로 보내지 않음 (순환 방지)
        if (isProcessingPreviewMessageRef.current) {
            if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true") {
                console.log('⏸️ Preview 메시지 처리 중 - iframe 전송 건너뛰기');
            }
            return;
        }

        const iframe = MessageService.getIframe();

        // iframe이 준비되지 않았으면 큐에 넣기
        if (iframeReadyState !== 'ready' || !iframe?.contentWindow) {
            if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true") {
                //console.log('🔄 Queue elements update, iframe not ready:', iframeReadyState);
            }
            messageQueueRef.current.push({
                type: "UPDATE_ELEMENTS",
                payload: elementsToSend
            });
            return;
        }

        const message = { type: "UPDATE_ELEMENTS", elements: elementsToSend };
        iframe.contentWindow.postMessage(message, window.location.origin);

        if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true") {
            console.log(`📤 Sent ${elementsToSend.length} elements to iframe`);
        }
    }, [iframeReadyState]);

    // 요소 선택 시 iframe에 메시지 전송
    const sendElementSelectedMessage = useCallback((elementId: string, props?: ElementProps) => {
        const iframe = MessageService.getIframe();

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

        // iframe이 준비되지 않았으면 큐에 넣기
        if (iframeReadyState !== 'ready' || !iframe?.contentWindow) {
            messageQueueRef.current.push({
                type: "ELEMENT_SELECTED",
                payload: message
            });
            return;
        }

        iframe.contentWindow.postMessage(message, window.location.origin);
    }, [elements, iframeReadyState]);

    // 큐에 있는 메시지들 처리
    const processMessageQueue = useCallback(() => {
        if (iframeReadyState !== 'ready') return;

        const iframe = MessageService.getIframe();
        if (!iframe?.contentWindow) return;

        const queue = [...messageQueueRef.current];
        messageQueueRef.current = [];

        if (queue.length > 0 && import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true") {
            //console.log(`🔄 Processing ${queue.length} queued messages`);
        }

        queue.forEach(item => {
            if (item.type === "UPDATE_ELEMENTS") {
                iframe.contentWindow!.postMessage({
                    type: "UPDATE_ELEMENTS",
                    elements: item.payload
                }, window.location.origin);
            } else if (item.type === "ELEMENT_SELECTED") {
                iframe.contentWindow!.postMessage(item.payload, window.location.origin);
            }
        });
    }, [iframeReadyState]);

    const handleIframeLoad = useCallback(() => {
        setIframeReadyState('loading');

        if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true") {
            //console.log('🖼️ iframe loading started');
        }

        // iframe이 완전히 준비될 때까지 기다리는 함수
        const waitForIframeReady = () => {
            const iframe = MessageService.getIframe();
            if (iframe?.contentDocument && iframe.contentDocument.readyState === 'complete') {
                setIframeReadyState('ready');

                if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true") {
                    //console.log('✅ iframe ready, processing queued messages');
                }

                // 대기 중인 메시지 처리
                setTimeout(() => {
                    processMessageQueue();

                    // iframe 로드 후 현재 요소들을 전송 (초기 로드 시에는 항상 전송)
                    const currentElements = useStore.getState().elements;
                    if (!isSendingRef.current && currentElements.length > 0) {
                        if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true") {
                            console.log('🖼️ 초기 iframe 로드 - 요소 전송:', {
                                elementCount: currentElements.length,
                                elementIds: currentElements.map(el => el.id).slice(0, 5)
                            });
                        }

                        isSendingRef.current = true;
                        lastSentElementsRef.current = [...currentElements];
                        sendElementsToIframe(currentElements);

                        setTimeout(() => {
                            isSendingRef.current = false;
                        }, 100);
                    }
                }, 100);
            } else {
                // 아직 준비되지 않았으면 다시 시도
                setTimeout(waitForIframeReady, 100);
            }
        };

        waitForIframeReady();
    }, [sendElementsToIframe, processMessageQueue]);

    const handleMessage = useCallback((event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
            console.warn("Received message from untrusted origin:", event.origin);
            return;
        }

        // Preview에서 Column Elements 일괄 추가 요청
        if (event.data.type === "ADD_COLUMN_ELEMENTS" && event.data.payload?.columns) {
            console.log("📥 Builder: Preview에서 Column Elements 일괄 추가 요청:", event.data.payload);

            // 순환 참조 방지 플래그 설정
            isProcessingPreviewMessageRef.current = true;

            const { elements } = useStore.getState();
            const newColumns = event.data.payload.columns;

            // 중복 제거 (이미 존재하는 Column은 제외)
            const columnsToAdd = newColumns.filter((col: Element) =>
                !elements.some(el => el.id === col.id)
            );

            if (columnsToAdd.length === 0) {
                console.log("⚠️ 추가할 새로운 Column이 없습니다 (모두 중복)");
                isProcessingPreviewMessageRef.current = false;
                return;
            }

            // 1. Store에 일괄 추가
            useStore.setState(state => ({
                elements: [...state.elements, ...columnsToAdd]
            }));

            console.log(`✅ Builder Store에 ${columnsToAdd.length}개 Column Elements 추가 완료:`,
                columnsToAdd.map((c: Element) => c.id));

            // 2. DB에도 저장
            (async () => {
                try {
                    await elementsApi.createMultipleElements(columnsToAdd);
                    console.log(`✅ DB에 ${columnsToAdd.length}개 Column Elements 저장 완료`);
                } catch (error) {
                    console.error("❌ Column Elements DB 저장 실패:", error);
                }
            })();

            // 300ms 후 플래그 해제
            setTimeout(() => {
                isProcessingPreviewMessageRef.current = false;
            }, 300);

            return;
        }

        // Preview에서 Field Elements 일괄 추가 요청 (ListBox column detection)
        if (event.data.type === "ADD_FIELD_ELEMENTS" && event.data.payload?.fields) {
            console.log("📥 Builder: Preview에서 Field Elements 일괄 추가 요청:", event.data.payload);

            // 순환 참조 방지 플래그 설정
            isProcessingPreviewMessageRef.current = true;

            const { elements } = useStore.getState();
            const newFields = event.data.payload.fields;

            // 중복 제거 (이미 존재하는 Field는 제외)
            const fieldsToAdd = newFields.filter((field: Element) =>
                !elements.some(el => el.id === field.id)
            );

            if (fieldsToAdd.length === 0) {
                console.log("⚠️ 추가할 새로운 Field가 없습니다 (모두 중복)");
                isProcessingPreviewMessageRef.current = false;
                return;
            }

            // 1. Store에 일괄 추가
            useStore.setState(state => ({
                elements: [...state.elements, ...fieldsToAdd]
            }));

            console.log(`✅ Builder Store에 ${fieldsToAdd.length}개 Field Elements 추가 완료:`,
                fieldsToAdd.map((f: Element) => f.id));

            // 2. DB에도 저장
            (async () => {
                try {
                    await elementsApi.createMultipleElements(fieldsToAdd);
                    console.log(`✅ DB에 ${fieldsToAdd.length}개 Field Elements 저장 완료`);
                } catch (error) {
                    console.error("❌ Field Elements DB 저장 실패:", error);
                }
            })();

            // 300ms 후 플래그 해제
            setTimeout(() => {
                isProcessingPreviewMessageRef.current = false;
            }, 300);

            return;
        }

        // Preview에서 Column이 자동 생성되었을 때 Builder Store에도 추가
        if (event.data.type === "ELEMENT_ADDED" && event.data.payload?.element) {
            console.log("📥 Builder: Preview에서 Element 추가 메시지 수신:", event.data.payload.element);

            // 순환 참조 방지 플래그 설정
            isProcessingPreviewMessageRef.current = true;

            // 무한 루프 방지: Store 배열에 직접 추가 (postMessage 없이)
            const { elements } = useStore.getState();
            const newElement = event.data.payload.element;

            // 중복 체크
            if (elements.some(el => el.id === newElement.id)) {
                console.log("⚠️ 이미 존재하는 Element, 추가 건너뛰기:", newElement.id);
                isProcessingPreviewMessageRef.current = false;
                return;
            }

            // Store에 직접 추가 (postMessage 발생 안함)
            useStore.setState(state => ({
                elements: [...state.elements, newElement]
            }));

            console.log("✅ Builder Store에 Element 추가 완료 (postMessage 없이):", newElement.id);

            // 300ms 후 플래그 해제 (Builder → Preview 동기화 재개)
            setTimeout(() => {
                isProcessingPreviewMessageRef.current = false;
            }, 300);

            return;
        }

        if (event.data.type === "UPDATE_ELEMENTS" && event.data.elements) {
            const { setElements } = useStore.getState();
            // 히스토리 기록을 방지하기 위해 skipHistory 옵션 사용
            setElements(event.data.elements as Element[]);
        }

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

        if (event.data.type === "ELEMENT_SELECTED" && event.data.source !== "builder") {
            //console.log('Element selected from preview:', event.data.elementId);

            // Inspector → Builder 동기화 중이면 Preview의 업데이트 무시 (무한 루프 방지)
            if (isSyncingToBuilder) {
                console.log('⏸️ Inspector 동기화 중 - Preview 업데이트 무시');
                return;
            }

            setSelectedElement(
                event.data.elementId,
                event.data.payload?.props,
                event.data.payload?.style,
                event.data.payload?.computedStyle
            );
        }

        // ELEMENT_UPDATED 메시지 처리는 제거 (무한 루프 방지)
        // PropertyPanel에서 직접 iframe으로 메시지를 보내므로 여기서는 처리하지 않음

        // 누락된 메시지 핸들링 추가
        if (event.data.type === "UPDATE_ELEMENT_PROPS" && event.data.elementId) {
            const { updateElementProps } = useStore.getState();
            updateElementProps(event.data.elementId, event.data.props || event.data.payload?.props);
        }

        // 프리뷰에서 보내는 element-props-update 메시지 처리
        if (event.data.type === "element-props-update" && event.data.elementId) {
            const { updateElementProps } = useStore.getState();
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
    }, [setSelectedElement, elements, isSyncingToBuilder]);

    const handleUndo = debounce(async () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        try {
            console.log('🔄 백업 시스템 Undo 시작');

            // 백업 시스템의 히스토리 사용
            const { undo } = useStore.getState();
            undo();

            console.log('✅ 백업 시스템 Undo 완료');
        } catch (error) {
            console.error("백업 시스템 Undo error:", error);
        } finally {
            isProcessingRef.current = false;
        }
    }, 300);

    const handleRedo = debounce(async () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        try {
            console.log('🔄 백업 시스템 Redo 시작');

            // 백업 시스템의 히스토리 사용
            const { redo } = useStore.getState();
            redo();

            console.log('✅ 백업 시스템 Redo 완료');
        } catch (error) {
            console.error("백업 시스템 Redo error:", error);
        } finally {
            isProcessingRef.current = false;
        }
    }, 300);

    // useEffect 제거하고 Layer 트리에서 직접 호출
    // Layer 트리에서 선택할 때:
    // sendElementSelectedMessage(selectedElementId, element.props);

    // elements가 변경될 때마다 iframe에 전송 (무한 루프 방지)
    const lastSentElementsRef = useRef<Element[]>([]);
    const isSendingRef = useRef(false);

    useEffect(() => {
        // iframe이 준비되지 않았거나 이미 전송 중이면 스킵
        if (iframeReadyState !== 'ready' || isSendingRef.current) {
            return;
        }

        // 요소 변경 감지 (JSON.stringify 제거 - 성능 최적화)
        // 1. 길이 비교 (O(1))
        if (elements.length !== lastSentElementsRef.current.length) {
            // 길이가 다르면 변경됨
        } else {
            // 2. 참조 비교 (O(n)) - props 객체의 참조 비교
            let hasChanged = false;
            for (let i = 0; i < elements.length; i++) {
                const current = elements[i];
                const last = lastSentElementsRef.current[i];

                // ID, tag, props 참조, order_num 비교
                if (
                    current.id !== last.id ||
                    current.tag !== last.tag ||
                    current.props !== last.props ||
                    current.order_num !== last.order_num ||
                    current.parent_id !== last.parent_id
                ) {
                    hasChanged = true;
                    break;
                }
            }

            if (!hasChanged) {
                return; // 변경 없음
            }
        }

        if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true") {
            console.log('🔄 요소 변경 감지 - iframe 전송:', {
                elementCount: elements.length,
                elementIds: elements.map(el => el.id).slice(0, 5),
                iframeReadyState
            });
        }

        // 전송 중 플래그 설정
        isSendingRef.current = true;

        // 마지막 전송된 요소들 업데이트
        lastSentElementsRef.current = [...elements];

        // iframe에 요소 전송만 수행 (setElements 호출하지 않음)
        sendElementsToIframe(elements);

        // 전송 완료 후 플래그 해제
        setTimeout(() => {
            isSendingRef.current = false;
        }, 100);
    }, [elements, iframeReadyState, sendElementsToIframe]);

    // useEffect - iframeReadyState가 변경될 때 큐 처리
    useEffect(() => {
        if (iframeReadyState === 'ready') {
            processMessageQueue();
        }
    }, [iframeReadyState, processMessageQueue]);

    return {
        iframeReadyState,
        handleIframeLoad,
        handleMessage,
        handleUndo,
        handleRedo,
        sendElementsToIframe,
        sendElementSelectedMessage,
        // updateElementProps는 제거됨
        isIframeReady
    };
};
