import { useState, useCallback, useEffect, useRef } from 'react';
import { debounce, DebouncedFunc } from 'lodash';
import { useStore } from '../stores';
// useZundoActions는 제거됨 - 기존 시스템 사용
import type { ElementProps } from '../../types/integrations/supabase.types';
import { Element } from '../../types/core/store.types';
// ElementUtils는 현재 사용되지 않음
import { MessageService } from '../../utils/messaging';
import { elementsApi } from '../../services/api';
import { useInspectorState } from '../inspector/hooks/useInspectorState';

export type IframeReadyState = 'not_initialized' | 'loading' | 'ready' | 'error';

// 🎯 모듈 레벨 변수: 모든 useIframeMessenger 인스턴스가 공유
let pendingAutoSelectElementId: string | null = null;

export interface UseIframeMessengerReturn {
    iframeReadyState: IframeReadyState;
    handleIframeLoad: () => void;
    handleMessage: (event: MessageEvent) => void;
    handleUndo: DebouncedFunc<() => Promise<void>>;
    handleRedo: DebouncedFunc<() => Promise<void>>;
    sendElementsToIframe: (elements: Element[]) => void;
    sendElementSelectedMessage: (elementId: string, props?: ElementProps) => void;
    requestElementSelection: (elementId: string) => void;
    requestAutoSelectAfterUpdate: (elementId: string) => void;
    isIframeReady: boolean;
}

export const useIframeMessenger = (): UseIframeMessengerReturn => {
    const [iframeReadyState, setIframeReadyState] = useState<IframeReadyState>('not_initialized');
    const iframeReadyStateRef = useRef<IframeReadyState>('not_initialized'); // 🔧 Ref로 즉시 상태 변경
    const isProcessingRef = useRef(false);
    const messageQueueRef = useRef<Array<{ type: string; payload: unknown }>>([]);
    const lastAckTimestampRef = useRef<number>(0); // ✅ 마지막 ACK 시점

    const elements = useStore((state) => state.elements);
    // 성능 최적화: Map 사용 (O(1) 조회)
    const elementsMap = useStore((state) => state.elementsMap);
    const setSelectedElement = useStore((state) => state.setSelectedElement);
    const isSyncingToBuilder = useInspectorState((state) => state.isSyncingToBuilder);
    // updateElementProps는 useZundoActions에서 가져옴

    // 기존 히스토리 시스템에서 필요한 함수들만 가져오기
    // undo, redo는 함수 내에서 직접 호출

    // iframe이 준비되었는지 계산된 값
    const isIframeReady = iframeReadyState === 'ready';

    // 요소들을 iframe에 전송 (상태에 따라 큐잉)
    const sendElementsToIframe = useCallback((elementsToSend: Element[]) => {
        const iframe = MessageService.getIframe();

        // 🔧 FIX: Ref를 사용하여 최신 상태 확인 (비동기 state 업데이트 회피)
        const currentReadyState = iframeReadyStateRef.current;

        // iframe이 준비되지 않았으면 큐에 넣기
        if (currentReadyState !== 'ready' || !iframe?.contentWindow) {
            messageQueueRef.current.push({
                type: "UPDATE_ELEMENTS",
                payload: elementsToSend
            });
            return;
        }

        const message = { type: "UPDATE_ELEMENTS", elements: elementsToSend };
        iframe.contentWindow.postMessage(message, window.location.origin);
    }, []); // ✅ 의존성 제거 (Ref 사용)

    // 요소 선택 시 iframe에 메시지 전송
    const sendElementSelectedMessage = useCallback((elementId: string, props?: ElementProps) => {
        const iframe = MessageService.getIframe();

        // 성능 최적화: Map 사용 (O(1) 조회)
        const element = elementsMap.get(elementId);
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

        // 🔧 FIX: Ref 사용
        if (iframeReadyStateRef.current !== 'ready' || !iframe?.contentWindow) {
            messageQueueRef.current.push({
                type: "ELEMENT_SELECTED",
                payload: message
            });
            return;
        }

        iframe.contentWindow.postMessage(message, window.location.origin);
    }, [elementsMap]); // ✅ 의존성에서 iframeReadyState 제거

    // 큐에 있는 메시지들 처리
    const processMessageQueue = useCallback(() => {
        // 🔧 FIX: Ref 사용
        if (iframeReadyStateRef.current !== 'ready') return;

        const iframe = MessageService.getIframe();
        if (!iframe?.contentWindow) return;

        const queue = [...messageQueueRef.current];
        messageQueueRef.current = [];

        if (queue.length > 0) {
            console.log(`🔄 [Builder] Processing ${queue.length} queued messages`);
        }

        queue.forEach(item => {
            if (item.type === "UPDATE_ELEMENTS") {
                iframe.contentWindow!.postMessage({
                    type: "UPDATE_ELEMENTS",
                    elements: item.payload
                }, window.location.origin);
                console.log(`✅ [Builder] Sent queued UPDATE_ELEMENTS: ${(item.payload as Element[]).length} elements`);
            } else if (item.type === "ELEMENT_SELECTED") {
                iframe.contentWindow!.postMessage(item.payload, window.location.origin);
            } else if (item.type === "REQUEST_ELEMENT_SELECTION") {
                iframe.contentWindow!.postMessage(item.payload, window.location.origin);
                console.log(`✅ [Builder] Sent queued REQUEST_ELEMENT_SELECTION`);
            }
        });
    }, []); // ✅ 의존성 제거 (Ref 사용)

    const handleIframeLoad = useCallback(() => {
        // 🔧 FIX: Ref도 업데이트
        iframeReadyStateRef.current = 'loading';
        setIframeReadyState('loading');

        // 🔧 FIX: 요소 전송은 PREVIEW_READY 핸들러에서 처리
        // (여기서는 DOM 로드만 확인하고, Preview의 React 앱 마운트를 기다림)
    }, []);

    const handleMessage = useCallback((event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
            console.warn("Received message from untrusted origin:", event.origin);
            return;
        }

        // 🔧 FIX: Preview가 준비되었다는 신호 처리
        if (event.data.type === "PREVIEW_READY") {
            // 🔧 FIX: Ref를 먼저 업데이트 (동기적 상태 변경)
            iframeReadyStateRef.current = 'ready';
            // State도 업데이트 (UI 반영)
            setIframeReadyState('ready');

            // ✅ 즉시 처리 (setTimeout 제거)
            processMessageQueue();

            // 현재 요소들을 전송 (초기 로드 시에도 전송)
            const currentElements = useStore.getState().elements;
            if (currentElements.length > 0) {
                // Phase 2.1 최적화: 참조 저장 (중복 전송 방지)
                lastSentElementsRef.current = currentElements;

                sendElementsToIframe(currentElements);
            }

            return;
        }

        // ✅ ACK: Preview가 요소를 받았다는 확인
        if (event.data.type === "ELEMENTS_UPDATED_ACK") {
            // ACK 시점 기록
            lastAckTimestampRef.current = event.data.timestamp || Date.now();

            // 전송 플래그 해제 (즉시)
            isSendingRef.current = false;

            // 🎯 대기 중인 auto-select가 있으면 실행 (모듈 레벨 변수)
            if (pendingAutoSelectElementId) {
                const elementId = pendingAutoSelectElementId;
                pendingAutoSelectElementId = null; // 초기화

                const iframe = MessageService.getIframe();
                if (iframe?.contentWindow) {
                    iframe.contentWindow.postMessage(
                        {
                            type: "REQUEST_ELEMENT_SELECTION",
                            elementId,
                        },
                        '*' // 개발환경: origin 제한 없음
                    );
                }
            }

            return;
        }

        // Preview에서 Column Elements 일괄 추가 요청
        if (event.data.type === "ADD_COLUMN_ELEMENTS" && event.data.payload?.columns) {
            console.log("📥 Builder: Preview에서 Column Elements 일괄 추가 요청:", event.data.payload);

            const { elements } = useStore.getState();
            const newColumns = event.data.payload.columns;

            // 중복 제거 (이미 존재하는 Column은 제외)
            const columnsToAdd = newColumns.filter((col: Element) =>
                !elements.some(el => el.id === col.id)
            );

            if (columnsToAdd.length === 0) {
                console.log("⚠️ 추가할 새로운 Column이 없습니다 (모두 중복)");
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

            return;
        }

        // Preview에서 Field Elements 일괄 추가 요청 (ListBox column detection)
        if (event.data.type === "ADD_FIELD_ELEMENTS" && event.data.payload?.fields) {
            console.log("📥 Builder: Preview에서 Field Elements 일괄 추가 요청:", event.data.payload);

            const { elements } = useStore.getState();
            const newFields = event.data.payload.fields;

            // 중복 제거 (이미 존재하는 Field는 제외)
            const fieldsToAdd = newFields.filter((field: Element) =>
                !elements.some(el => el.id === field.id)
            );

            if (fieldsToAdd.length === 0) {
                console.log("⚠️ 추가할 새로운 Field가 없습니다 (모두 중복)");
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

            // ⭐ 다중 선택 모드 처리
            const { isMultiSelect } = event.data;

            if (isMultiSelect) {
                // Cmd/Ctrl + Click: 다중 선택 토글
                const store = useStore.getState();
                store.toggleElementInSelection(event.data.elementId);
            } else {
                // 일반 클릭: 단일 선택 (computedStyle 없이 즉시 선택 - Option B+C)
                // computedStyle은 별도 메시지(ELEMENT_COMPUTED_STYLE)로 나중에 도착
                setSelectedElement(
                    event.data.elementId,
                    event.data.payload?.props,
                    event.data.payload?.style,
                    undefined // computedStyle은 나중에 업데이트
                );
            }
        }

        // ⭐ Option C: computedStyle 별도 메시지 처리 (오버레이 표시 후 지연 도착)
        if (event.data.type === "ELEMENT_COMPUTED_STYLE" && event.data.elementId) {
            const { updateSelectedElementComputedStyle } = useInspectorState.getState();
            const currentSelectedId = useStore.getState().selectedElementId;

            // 현재 선택된 요소의 computedStyle만 업데이트
            if (currentSelectedId === event.data.elementId && event.data.payload?.computedStyle) {
                updateSelectedElementComputedStyle(event.data.payload.computedStyle);
            }
        }

        // ⭐ 드래그 선택 (Shift + Drag Lasso Selection)
        if (event.data.type === "ELEMENTS_DRAG_SELECTED") {
            //console.log('Elements drag selected from preview:', event.data.elementIds);

            // Inspector → Builder 동기화 중이면 Preview의 업데이트 무시
            if (isSyncingToBuilder) {
                console.log('⏸️ Inspector 동기화 중 - Preview 업데이트 무시');
                return;
            }

            const store = useStore.getState();
            store.setSelectedElements(event.data.elementIds);
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
            // 성능 최적화: Map 사용 (O(1) 조회)
            const element = elementsMap.get(event.data.elementId);
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
    }, [setSelectedElement, elementsMap, isSyncingToBuilder, processMessageQueue, sendElementsToIframe]);

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
    // Phase 2.1 최적화: JSON.stringify 제거, 구조적 참조 비교
    const lastSentElementsRef = useRef<Element[]>([]);
    const isSendingRef = useRef(false);

    useEffect(() => {
        // 🔧 FIX: Ref 사용
        if (iframeReadyStateRef.current !== 'ready' || isSendingRef.current) {
            return;
        }

        // ✅ ACK 기반 중복 방지: 마지막 ACK 이후 100ms 이내면 스킵
        const timeSinceLastAck = Date.now() - lastAckTimestampRef.current;
        if (timeSinceLastAck < 100) {
            console.log('⏭️ [Builder] ACK 직후 중복 전송 스킵 (마지막 ACK:', timeSinceLastAck, 'ms 전)');
            return;
        }

        // Phase 2.1 최적화: 구조적 참조 비교 (JSON.stringify 제거)
        // 배열 길이와 각 요소의 참조 비교
        const prevElements = lastSentElementsRef.current;
        if (prevElements.length === elements.length) {
            let isSame = true;
            for (let i = 0; i < elements.length; i++) {
                // 요소 참조가 다르거나 id/tag가 다르면 변경됨
                if (prevElements[i] !== elements[i] ||
                    prevElements[i].id !== elements[i].id ||
                    prevElements[i].tag !== elements[i].tag) {
                    isSame = false;
                    break;
                }
            }
            if (isSame) {
                return;
            }
        }

        console.log('🔄 요소 변경 감지 - iframe 전송:', {
            elementCount: elements.length,
            elementIds: elements.map(el => el.id),
            iframeReadyState: iframeReadyStateRef.current
        });

        // 전송 중 플래그 설정
        isSendingRef.current = true;
        lastSentElementsRef.current = elements;

        // iframe에 요소 전송 (ACK를 받으면 isSendingRef.current = false로 해제됨)
        sendElementsToIframe(elements);

        // ✅ 백업: ACK를 못 받으면 1초 후 플래그 강제 해제
        setTimeout(() => {
            if (isSendingRef.current) {
                console.warn('⚠️ [Builder] ACK timeout - 플래그 강제 해제');
                isSendingRef.current = false;
            }
        }, 1000);
    }, [elements, sendElementsToIframe]); // ✅ iframeReadyState 의존성 제거

    // 🔧 REMOVED: Ref를 사용하므로 iframeReadyState 기반 useEffect 불필요
    // processMessageQueue는 PREVIEW_READY 핸들러에서 직접 호출됨

    // Preview에 요소 선택 요청 (rect 정보와 함께 응답받기)
    const requestElementSelection = useCallback((elementId: string) => {
        const iframe = MessageService.getIframe();

        const message = {
            type: "REQUEST_ELEMENT_SELECTION",
            elementId,
        };

        // 🔧 FIX: iframe이 준비되지 않았으면 큐에 넣기
        if (iframeReadyStateRef.current !== 'ready' || !iframe?.contentWindow) {
            console.log('⏸️ [Builder] Queue REQUEST_ELEMENT_SELECTION, iframe not ready');
            messageQueueRef.current.push({
                type: "REQUEST_ELEMENT_SELECTION",
                payload: message
            });
            return;
        }

        iframe.contentWindow.postMessage(message, window.location.origin);
        console.log('📤 [Builder] Sent REQUEST_ELEMENT_SELECTION:', elementId);
    }, []); // ✅ 의존성 제거 (Ref 사용)

    // 🎯 UPDATE_ELEMENTS 후 ACK를 받으면 자동으로 요소 선택 (모듈 레벨 변수)
    const requestAutoSelectAfterUpdate = useCallback((elementId: string) => {
        pendingAutoSelectElementId = elementId;
    }, []);

    return {
        iframeReadyState,
        handleIframeLoad,
        handleMessage,
        handleUndo,
        handleRedo,
        sendElementsToIframe,
        sendElementSelectedMessage,
        requestElementSelection,
        requestAutoSelectAfterUpdate,
        isIframeReady
    };
};
