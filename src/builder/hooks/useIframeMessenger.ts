/**
 * useIframeMessenger - iframe 기반 Preview 통신 훅
 *
 * @deprecated 🚀 Phase 10 B2.4: WebGL Canvas로 마이그레이션 중
 *
 * 이 훅은 iframe + postMessage 패턴을 사용합니다.
 * WebGL Canvas (VITE_USE_WEBGL_CANVAS=true)에서는 더 이상 필요하지 않습니다.
 *
 * 마이그레이션 가이드:
 * - 요소 가져오기: useCanvasElements() 사용
 * - 선택 요소: useCanvasSelectedElement() 사용
 * - 요소 업데이트: useCanvasUpdateElement() 사용
 *
 * @see src/builder/workspace/canvas/store/canvasStore.ts
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { debounce, DebouncedFunc } from 'lodash';
import { useStore } from '../stores';
import { useEditModeStore } from '../stores/editMode';
import { useLayoutsStore } from '../stores/layouts';
import { useDataTables, useApiEndpoints, useVariables, getVariablesForCanvas } from '../stores/data';
// useZundoActions는 제거됨 - 기존 시스템 사용
import type { ElementProps } from '../../types/integrations/supabase.types';
import { Element } from '../../types/core/store.types';
// ElementUtils는 현재 사용되지 않음
import { MessageService } from '../../utils/messaging';
import { elementsApi } from '../../services/api';
import { useInspectorState } from '../inspector/hooks/useInspectorState';
// 🚀 Delta Update
import { canvasDeltaMessenger, shouldUseDelta } from '../utils/canvasDeltaMessenger';

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
    sendLayoutsToIframe: () => void;
    sendDataTablesToIframe: () => void;
    sendApiEndpointsToIframe: () => void;
    sendVariablesToIframe: () => void;
    isIframeReady: boolean;
}

export const useIframeMessenger = (): UseIframeMessengerReturn => {
    const [iframeReadyState, setIframeReadyState] = useState<IframeReadyState>('not_initialized');
    const iframeReadyStateRef = useRef<IframeReadyState>('not_initialized'); // 🔧 Ref로 즉시 상태 변경
    const isProcessingRef = useRef(false);
    const messageQueueRef = useRef<Array<{ type: string; payload: unknown }>>([]);
    const lastAckTimestampRef = useRef<number>(0); // ✅ 마지막 ACK 시점
    const isSendingRef = useRef(false); // ✅ 전송 중 플래그
    const lastSentElementsRef = useRef<Element[] | null>(null); // ✅ 마지막 전송된 elements (중복 전송 방지)

    // 🚀 최적화: elements 구독 제거 - iframe 동기화는 BuilderCore에서 store.subscribe로 처리
    // const elements = useStore((state) => state.elements);  // REMOVED
    // 성능 최적화: Map 사용 (O(1) 조회)
    const elementsMap = useStore((state) => state.elementsMap);
    const setSelectedElement = useStore((state) => state.setSelectedElement);
    const isSyncingToBuilder = useInspectorState((state) => state.isSyncingToBuilder);
    // updateElementProps는 useZundoActions에서 가져옴

    // ⭐ Layout/Slot System: Page 정보 구독
    const currentPageId = useStore((state) => state.currentPageId);
    const pages = useStore((state) => state.pages);

    // ⭐ Layout/Slot System: Edit Mode 구독
    const editMode = useEditModeStore((state) => state.mode);
    const currentLayoutId = useLayoutsStore((state) => state.currentLayoutId);

    // ⭐ Nested Routes & Slug System: Layouts 구독
    const layouts = useLayoutsStore((state) => state.layouts);

    // ⭐ DataTables 구독 (PropertyDataBinding용)
    const dataTables = useDataTables();

    // ⭐ ApiEndpoints 구독 (PropertyDataBinding용)
    const apiEndpoints = useApiEndpoints();

    // ⭐ Variables 구독 (PropertyDataBinding용)
    const variables = useVariables();

    // 기존 히스토리 시스템에서 필요한 함수들만 가져오기
    // undo, redo는 함수 내에서 직접 호출

    // iframe이 준비되었는지 계산된 값
    const isIframeReady = iframeReadyState === 'ready';

    // 요소들을 iframe에 전송 (상태에 따라 큐잉)
    // ⭐ Layout/Slot System: pageInfo도 함께 전송 (초기 로드 시 Layout 렌더링용)
    const sendElementsToIframe = useCallback((elementsToSend: Element[]) => {
        const iframe = MessageService.getIframe();

        // 🔧 FIX: Ref를 사용하여 최신 상태 확인 (비동기 state 업데이트 회피)
        const currentReadyState = iframeReadyStateRef.current;

        // ⭐ Layout/Slot System: editMode에 따라 pageInfo 결정
        const currentEditMode = useEditModeStore.getState().mode;
        const layoutStoreLayoutId = useLayoutsStore.getState().currentLayoutId;
        const { currentPageId, pages } = useStore.getState();
        const currentPage = pages.find((p) => p.id === currentPageId);

        // Layout 편집 모드: pageId=null, layoutId=currentLayoutId
        // Page 모드: pageId=currentPageId, layoutId=page.layout_id (Page에 적용된 Layout)
        const pageInfo = currentEditMode === 'layout'
            ? { pageId: null, layoutId: layoutStoreLayoutId }
            : { pageId: currentPageId, layoutId: currentPage?.layout_id || null };

        // iframe이 준비되지 않았으면 큐에 넣기
        if (currentReadyState !== 'ready' || !iframe?.contentWindow) {
            messageQueueRef.current.push({
                type: "UPDATE_ELEMENTS",
                payload: { elements: elementsToSend, pageInfo }
            });
            return;
        }

        const message = { type: "UPDATE_ELEMENTS", elements: elementsToSend, pageInfo };
        iframe.contentWindow.postMessage(message, window.location.origin);
    }, []); // ✅ 의존성 제거 (Ref 사용)

    // ⭐ Layout/Slot System: Page 정보를 iframe에 전송
    const sendPageInfoToIframe = useCallback((pageId: string | null, layoutId: string | null) => {
        const iframe = MessageService.getIframe();

        // 🔧 FIX: Ref를 사용하여 최신 상태 확인
        const currentReadyState = iframeReadyStateRef.current;

        const message = {
            type: "UPDATE_PAGE_INFO",
            pageId,
            layoutId,
        };

        // iframe이 준비되지 않았으면 큐에 넣기
        if (currentReadyState !== 'ready' || !iframe?.contentWindow) {
            messageQueueRef.current.push({
                type: "UPDATE_PAGE_INFO",
                payload: message
            });
            return;
        }

        iframe.contentWindow.postMessage(message, window.location.origin);
    }, []); // ✅ 의존성 제거 (Ref 사용)

    // ⭐ Nested Routes & Slug System: Layouts를 iframe에 전송
    const sendLayoutsToIframe = useCallback(() => {
        const iframe = MessageService.getIframe();

        // 🔧 FIX: Ref를 사용하여 최신 상태 확인
        const currentReadyState = iframeReadyStateRef.current;

        // 현재 layouts 가져오기
        const currentLayouts = useLayoutsStore.getState().layouts;

        // PreviewLayout 형태로 변환 (id, name, slug만 전송)
        const previewLayouts = currentLayouts.map((l) => ({
            id: l.id,
            name: l.name,
            slug: l.slug || null,
        }));

        const message = {
            type: "UPDATE_LAYOUTS",
            layouts: previewLayouts,
        };

        // iframe이 준비되지 않았으면 큐에 넣기
        if (currentReadyState !== 'ready' || !iframe?.contentWindow) {
            messageQueueRef.current.push({
                type: "UPDATE_LAYOUTS",
                payload: message
            });
            return;
        }

        iframe.contentWindow.postMessage(message, window.location.origin);
    }, []); // ✅ 의존성 제거 (Ref 사용)

    // ⭐ DataTables를 iframe에 전송 (PropertyDataBinding용)
    const sendDataTablesToIframe = useCallback(() => {
        const iframe = MessageService.getIframe();

        // 🔧 FIX: Ref를 사용하여 최신 상태 확인
        const currentReadyState = iframeReadyStateRef.current;

        // 현재 dataTables 가져오기
        const currentDataTables = dataTables;

        // RuntimeDataTable 형태로 변환 (id, name, mockData, runtimeData, useMockData, schema 전송)
        // ⭐ mockData의 키는 schema의 key를 그대로 유지 (label 변환 제거)
        const runtimeDataTables = currentDataTables.map((dt) => {
            return {
                id: dt.id,
                name: dt.name,
                schema: dt.schema, // schema도 함께 전송
                mockData: dt.mockData || [],
                runtimeData: dt.runtimeData || [], // ⭐ runtimeData도 전송 (API 데이터)
                useMockData: dt.useMockData,
            };
        });

        const message = {
            type: "UPDATE_DATA_TABLES",
            dataTables: runtimeDataTables,
        };

        // iframe이 준비되지 않았으면 큐에 넣기
        if (currentReadyState !== 'ready' || !iframe?.contentWindow) {
            messageQueueRef.current.push({
                type: "UPDATE_DATA_TABLES",
                payload: message
            });
            return;
        }

        iframe.contentWindow.postMessage(message, window.location.origin);
    }, [dataTables]); // dataTables 변경 시 갱신

    // ⭐ ApiEndpoints를 iframe에 전송 (PropertyDataBinding용)
    const sendApiEndpointsToIframe = useCallback(() => {
        const iframe = MessageService.getIframe();

        // 🔧 FIX: Ref를 사용하여 최신 상태 확인
        const currentReadyState = iframeReadyStateRef.current;

        // 현재 apiEndpoints 가져오기
        const currentApiEndpoints = apiEndpoints;

        // RuntimeApiEndpoint 형태로 변환
        const runtimeApiEndpoints = currentApiEndpoints.map((ep) => ({
            id: ep.id,
            name: ep.name,
            method: ep.method,
            baseUrl: ep.baseUrl,
            path: ep.path,
            headers: ep.headers,
            params: ep.params,
            body: ep.body,
        }));

        const message = {
            type: "UPDATE_API_ENDPOINTS",
            apiEndpoints: runtimeApiEndpoints,
        };

        // iframe이 준비되지 않았으면 큐에 넣기
        if (currentReadyState !== 'ready' || !iframe?.contentWindow) {
            messageQueueRef.current.push({
                type: "UPDATE_API_ENDPOINTS",
                payload: message
            });
            return;
        }

        iframe.contentWindow.postMessage(message, window.location.origin);
    }, [apiEndpoints]); // apiEndpoints 변경 시 갱신

    // ⭐ Variables를 iframe에 전송 (PropertyDataBinding용)
    const sendVariablesToIframe = useCallback(() => {
        const iframe = MessageService.getIframe();

        // 🔧 FIX: Ref를 사용하여 최신 상태 확인
        const currentReadyState = iframeReadyStateRef.current;

        // ⭐ getVariablesForCanvas 사용 - 런타임 값 포함
        const runtimeVariables = getVariablesForCanvas();

        const message = {
            type: "UPDATE_VARIABLES",
            variables: runtimeVariables,
        };

        // iframe이 준비되지 않았으면 큐에 넣기
        if (currentReadyState !== 'ready' || !iframe?.contentWindow) {
            messageQueueRef.current.push({
                type: "UPDATE_VARIABLES",
                payload: message
            });
            return;
        }

        iframe.contentWindow.postMessage(message, window.location.origin);
    }, []); // variables 변경은 별도 useEffect에서 처리

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

        queue.forEach(item => {
            if (item.type === "UPDATE_ELEMENTS") {
                // ⭐ Layout/Slot System: 새 payload 형식 (elements + pageInfo)
                const payload = item.payload as { elements: Element[]; pageInfo: { pageId: string | null; layoutId: string | null } };
                iframe.contentWindow!.postMessage({
                    type: "UPDATE_ELEMENTS",
                    elements: payload.elements,
                    pageInfo: payload.pageInfo,
                }, window.location.origin);
            } else if (item.type === "ELEMENT_SELECTED") {
                iframe.contentWindow!.postMessage(item.payload, window.location.origin);
            } else if (item.type === "REQUEST_ELEMENT_SELECTION") {
                iframe.contentWindow!.postMessage(item.payload, window.location.origin);
            } else if (item.type === "UPDATE_PAGE_INFO") {
                // ⭐ Layout/Slot System: Page 정보 전송
                iframe.contentWindow!.postMessage(item.payload, window.location.origin);
            } else if (item.type === "UPDATE_LAYOUTS") {
                // ⭐ Nested Routes & Slug System: Layouts 전송
                iframe.contentWindow!.postMessage(item.payload, window.location.origin);
            } else if (item.type === "UPDATE_DATA_TABLES") {
                // ⭐ DataTables 전송 (PropertyDataBinding용)
                iframe.contentWindow!.postMessage(item.payload, window.location.origin);
            } else if (item.type === "UPDATE_API_ENDPOINTS") {
                // ⭐ ApiEndpoints 전송 (PropertyDataBinding용)
                iframe.contentWindow!.postMessage(item.payload, window.location.origin);
            } else if (item.type === "UPDATE_VARIABLES") {
                // ⭐ Variables 전송 (PropertyDataBinding용)
                iframe.contentWindow!.postMessage(item.payload, window.location.origin);
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

            // 🚀 Delta Update: iframe 참조 설정
            const iframe = MessageService.getIframe();
            if (iframe) {
                canvasDeltaMessenger.setIframe(iframe);
            }

            // ✅ 즉시 처리 (setTimeout 제거)
            processMessageQueue();

            // ⭐ Layout/Slot System: persist hydration 완료 후 요소 전송
            // (새로고침 시 editMode가 아직 hydration 안 됐을 수 있음)
            const sendInitialData = () => {
                // ⭐ Nested Routes & Slug System: 초기 layouts 전송
                sendLayoutsToIframe();

                // ⭐ DataTables 전송 (PropertyDataBinding용)
                sendDataTablesToIframe();

                // ⭐ ApiEndpoints 전송 (PropertyDataBinding용)
                sendApiEndpointsToIframe();

                // ⭐ Variables 전송 (PropertyDataBinding용)
                sendVariablesToIframe();

                // Elements 전송
                const currentElements = useStore.getState().elements;
                if (currentElements.length > 0) {
                    // Phase 2.1 최적화: 참조 저장 (중복 전송 방지)
                    lastSentElementsRef.current = currentElements;
                    sendElementsToIframe(currentElements);
                }
            };

            // persist hydration 완료 확인
            const editModeHydrated = useEditModeStore.persist?.hasHydrated?.() ?? true;
            const layoutsHydrated = useLayoutsStore.persist?.hasHydrated?.() ?? true;

            if (editModeHydrated && layoutsHydrated) {
                // 이미 hydration 완료 → 즉시 전송
                sendInitialData();
            } else {
                // hydration 대기 후 전송
                const checkHydration = () => {
                    const editDone = useEditModeStore.persist?.hasHydrated?.() ?? true;
                    const layoutDone = useLayoutsStore.persist?.hasHydrated?.() ?? true;
                    if (editDone && layoutDone) {
                        sendInitialData();
                    } else {
                        // 다음 프레임에서 다시 확인
                        requestAnimationFrame(checkHydration);
                    }
                };
                requestAnimationFrame(checkHydration);
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
            const { elements } = useStore.getState();
            const newColumns = event.data.payload.columns;

            // 중복 제거 (이미 존재하는 Column은 제외)
            const columnsToAdd = newColumns.filter((col: Element) =>
                !elements.some(el => el.id === col.id)
            );

            if (columnsToAdd.length === 0) {
                return;
            }

            // 1. Store에 일괄 추가
            useStore.setState(state => ({
                elements: [...state.elements, ...columnsToAdd]
            }));

            // 2. DB에도 저장
            (async () => {
                try {
                    await elementsApi.createMultipleElements(columnsToAdd);
                } catch (error) {
                    console.error("❌ Column Elements DB 저장 실패:", error);
                }
            })();

            return;
        }

        // Preview에서 Field Elements 일괄 추가 요청 (ListBox column detection)
        if (event.data.type === "ADD_FIELD_ELEMENTS" && event.data.payload?.fields) {
            const { elements } = useStore.getState();
            const newFields = event.data.payload.fields;

            // 중복 제거 (이미 존재하는 Field는 제외)
            const fieldsToAdd = newFields.filter((field: Element) =>
                !elements.some(el => el.id === field.id)
            );

            if (fieldsToAdd.length === 0) {
                return;
            }

            // 1. Store에 일괄 추가
            useStore.setState(state => ({
                elements: [...state.elements, ...fieldsToAdd]
            }));

            // 2. DB에도 저장
            (async () => {
                try {
                    await elementsApi.createMultipleElements(fieldsToAdd);
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

            const currentSelectedId = useStore.getState().selectedElementId;
            const newElementId = event.data.elementId;

            // ⭐ FIX: 다른 요소 선택은 항상 허용
            // 같은 요소 재선택만 동기화 중일 때 스킵 (무한 루프 방지)
            if (isSyncingToBuilder && newElementId === currentSelectedId) {
                return;
            }

            // ⭐ 다중 선택 모드 처리
            const { isMultiSelect } = event.data;

            if (isMultiSelect) {
                // Cmd/Ctrl + Click: 다중 선택 토글
                const store = useStore.getState();
                store.toggleElementInSelection(newElementId);
            } else {
                // 일반 클릭: 단일 선택 (computedStyle 없이 즉시 선택 - Option B+C)
                // computedStyle은 별도 메시지(ELEMENT_COMPUTED_STYLE)로 나중에 도착
                setSelectedElement(
                    newElementId,
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

            // ⭐ FIX: 드래그 선택은 새로운 선택 세트를 설정하므로 항상 허용
            // (isSyncingToBuilder 체크 제거 - 새 요소 선택은 차단하지 않음)
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
            // 필요시 hover 상태 처리 로직 추가
        }
    }, [setSelectedElement, elementsMap, isSyncingToBuilder, processMessageQueue, sendElementsToIframe, sendLayoutsToIframe, sendDataTablesToIframe, sendApiEndpointsToIframe, sendVariablesToIframe]);

    const handleUndo = debounce(async () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        try {
            // 백업 시스템의 히스토리 사용
            const { undo } = useStore.getState();
            undo();
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
            // 백업 시스템의 히스토리 사용
            const { redo } = useStore.getState();
            redo();
        } catch (error) {
            console.error("백업 시스템 Redo error:", error);
        } finally {
            isProcessingRef.current = false;
        }
    }, 300);

    // useEffect 제거하고 Layer 트리에서 직접 호출
    // Layer 트리에서 선택할 때:
    // sendElementSelectedMessage(selectedElementId, element.props);

    // 🚀 최적화: elements 동기화는 BuilderCore에서 store.subscribe로 처리
    // 이 hook에서는 elements 구독을 제거하여 불필요한 리렌더링 방지
    // 기존 filteredElements useEffect는 BuilderCore의 useElementsSync()로 이동됨

    // ⭐ Layout/Slot System: Page 정보가 변경될 때 iframe에 전송
    const lastSentPageInfoRef = useRef<{ pageId: string | null; layoutId: string | null }>({
        pageId: null,
        layoutId: null,
    });

    useEffect(() => {
        // iframe이 준비되지 않았으면 스킵
        if (iframeReadyStateRef.current !== 'ready') {
            return;
        }

        // 현재 Page 찾기
        const currentPage = pages.find((p) => p.id === currentPageId);
        const layoutId = currentPage?.layout_id || null;

        // 이전 값과 같으면 스킵
        if (
            lastSentPageInfoRef.current.pageId === currentPageId &&
            lastSentPageInfoRef.current.layoutId === layoutId
        ) {
            return;
        }

        // 값 저장 후 전송
        lastSentPageInfoRef.current = { pageId: currentPageId, layoutId };
        sendPageInfoToIframe(currentPageId, layoutId);
    }, [currentPageId, pages, sendPageInfoToIframe]);

    // ⭐ Nested Routes & Slug System: Layouts가 변경될 때마다 iframe에 전송
    const lastSentLayoutsRef = useRef<string>('');

    useEffect(() => {
        // iframe이 준비되지 않았으면 스킵
        if (iframeReadyStateRef.current !== 'ready') {
            return;
        }

        // JSON 문자열로 비교 (slug 변경 감지 포함)
        const layoutsJson = JSON.stringify(layouts.map(l => ({
            id: l.id,
            name: l.name,
            slug: l.slug,
        })));

        // 이전 값과 같으면 스킵
        if (lastSentLayoutsRef.current === layoutsJson) {
            return;
        }

        // 값 저장 후 전송
        lastSentLayoutsRef.current = layoutsJson;
        sendLayoutsToIframe();
    }, [layouts, sendLayoutsToIframe]);

    // ⭐ DataTables가 변경될 때마다 iframe에 전송 (PropertyDataBinding용)
    const lastSentDataTablesRef = useRef<string>('');

    useEffect(() => {
        // JSON 문자열로 비교 (mockData 변경 감지 포함)
        const dataTablesJson = JSON.stringify(dataTables.map(dt => ({
            id: dt.id,
            name: dt.name,
            mockData: dt.mockData,
            useMockData: dt.useMockData,
        })));

        // 이전 값과 같으면 스킵
        if (lastSentDataTablesRef.current === dataTablesJson) {
            return;
        }

        // 값 저장 후 전송 (sendDataTablesToIframe 내부에서 iframe 준비 상태에 따라 큐잉 또는 직접 전송)
        lastSentDataTablesRef.current = dataTablesJson;
        sendDataTablesToIframe();

    }, [dataTables, sendDataTablesToIframe]);

    // ⭐ ApiEndpoints가 변경될 때마다 iframe에 전송 (PropertyDataBinding용)
    const lastSentApiEndpointsRef = useRef<string>('');

    useEffect(() => {
        // JSON 문자열로 비교
        const apiEndpointsJson = JSON.stringify(apiEndpoints.map(ep => ({
            id: ep.id,
            name: ep.name,
            method: ep.method,
            baseUrl: ep.baseUrl,
            path: ep.path,
        })));

        // 이전 값과 같으면 스킵
        if (lastSentApiEndpointsRef.current === apiEndpointsJson) {
            return;
        }

        // 값 저장 후 전송 (sendApiEndpointsToIframe 내부에서 iframe 준비 상태에 따라 큐잉 또는 직접 전송)
        lastSentApiEndpointsRef.current = apiEndpointsJson;
        sendApiEndpointsToIframe();

    }, [apiEndpoints, sendApiEndpointsToIframe]);

    // ⭐ Variables가 변경될 때마다 iframe에 전송 (PropertyDataBinding용)
    const lastSentVariablesRef = useRef<string>('');

    useEffect(() => {
        // JSON 문자열로 비교
        const variablesJson = JSON.stringify(variables.map(v => ({
            id: v.id,
            name: v.name,
            type: v.type,
            defaultValue: v.defaultValue,
            persist: v.persist,
            scope: v.scope,
        })));

        // 이전 값과 같으면 스킵
        if (lastSentVariablesRef.current === variablesJson) {
            return;
        }

        // 값 저장 후 전송 (sendVariablesToIframe 내부에서 iframe 준비 상태에 따라 큐잉 또는 직접 전송)
        lastSentVariablesRef.current = variablesJson;
        sendVariablesToIframe();

    }, [variables, sendVariablesToIframe]);

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
            messageQueueRef.current.push({
                type: "REQUEST_ELEMENT_SELECTION",
                payload: message
            });
            return;
        }

        iframe.contentWindow.postMessage(message, window.location.origin);
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
        sendLayoutsToIframe,
        sendDataTablesToIframe,
        sendApiEndpointsToIframe,
        sendVariablesToIframe,
        isIframeReady
    };
};
