import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useStore, useSelectedElementData } from "../stores";
import { Maximize2 } from "lucide-react";
import { iconProps } from "../../utils/ui/uiConstants";
import { MessageService } from "../../utils/messaging";
import { isValidPreviewMessage } from "../../utils/messageValidation";
import { useVisibleOverlays } from "./hooks/useVisibleOverlays";
import type { OverlayData as VisibleOverlayData } from "./hooks/useVisibleOverlays";
import { useOverlayRAF, type OverlayUpdateResult } from "./hooks/useOverlayRAF";
import { useOverlayDebug } from "./OverlayDebug";
import { BorderRadiusHandles } from "./components/BorderRadiusHandles";

import "./index.css";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OverlayData {
  rect: Rect;
  tag: string;
}

export default function SelectionOverlay() {
  const selectedElementId = useStore((state) => state.selectedElementId);
  // ⭐ Multi-select state
  const selectedElementIds = useStore(
    (state) => state.selectedElementIds || []
  );
  const multiSelectMode = useStore((state) => state.multiSelectMode || false);

  // 🔍 Debug: Track rapid remounts (only in dev)
  useOverlayDebug("SelectionOverlay", selectedElementId || "none");

  // 🚀 Performance: elementsMap 구독 제거 - 선택 변경 시에만 getState()로 조회
  // 기존: 모든 요소 변경 시 리렌더 발생
  // 개선: selectedElementId/selectedElementIds 변경 시에만 최신 요소 정보 필요

  // ⭐ Single select state (backward compatibility)
  const [overlayRect, setOverlayRect] = useState<Rect | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("");

  // ⭐ Multi-select state: Map of elementId -> overlay data
  const [multiOverlays, setMultiOverlays] = useState<Map<string, OverlayData>>(
    new Map()
  );

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // 🚀 Phase 7.1: RAF 기반 오버레이 스케줄러
  const getIframeDocument = useCallback(
    () => iframeRef.current?.contentDocument,
    []
  );

  const handleOverlayUpdate = useCallback(
    (result: OverlayUpdateResult) => {
      setMultiOverlays((prev) => {
        const next = result.reset ? new Map<string, OverlayData>() : new Map(prev);
        result.rects.forEach((rect, elementId) => {
          next.set(elementId, {
            rect,
            tag: result.tags.get(elementId) || next.get(elementId)?.tag || "",
          });
        });
        return next;
      });
    },
    []
  );

  const { schedule: scheduleOverlayUpdate, scheduleThrottled, clear: clearOverlayScheduler } = useOverlayRAF(
    handleOverlayUpdate,
    getIframeDocument
  );

  // ⭐ Border Radius 구독 (리액티브 업데이트) - 조건부 return 전에 선언
  const selectedElement = useSelectedElementData();
  const borderRadiusFromStore = useMemo(() => {
    const computed = selectedElement?.computedStyle?.borderRadius;
    const inline = selectedElement?.style?.borderRadius as string | undefined;
    const computedStr = typeof computed === 'number' ? `${computed}px` : computed;
    return inline || computedStr;
  }, [selectedElement?.computedStyle?.borderRadius, selectedElement?.style?.borderRadius]);

  // Tag 표시 로직 (useMemo로 최적화, getState() 사용)
  // 🚀 Performance: selectedElementId 변경 시에만 최신 요소 정보 조회
  const displayTag = useMemo(() => {
    const elementsMap = useStore.getState().elementsMap;
    const element = selectedElementId
      ? elementsMap.get(selectedElementId)
      : null;
    return element?.tag || selectedTag || "";
  }, [selectedElementId, selectedTag]);

  // immediate: true면 RAF 없이 즉시 실행 (초기 선택 시 사용)
  // immediate: false면 기존 RAF 사용 (ResizeObserver, 스크롤 등)
  const updatePosition = useCallback(
    (immediate = false) => {
      const calculatePosition = () => {
        const iframe = iframeRef.current;
        if (!iframe?.contentDocument || !selectedElementId) {
          setOverlayRect(null);
          return;
        }

        let element = iframe.contentDocument.querySelector(
          `[data-element-id="${selectedElementId}"]`
        ) as HTMLElement;

        // ⭐ body element 선택 시: 실제 <body> 태그에서 찾기
        // (실제 body에 data-element-id가 설정되어 있음)
        if (!element) {
          // 🚀 Performance: getState()로 현재 elementsMap 조회
          const elementsMap = useStore.getState().elementsMap;
          const selectedElement = elementsMap.get(selectedElementId);
          if (selectedElement?.tag === "body") {
            // 실제 <body> 태그에서 찾기
            if (iframe.contentDocument.body.getAttribute("data-element-id")) {
              element = iframe.contentDocument.body;
            }
          }
        }

        if (!element) {
          setOverlayRect(null);
          setSelectedTag("");
          return;
        }

        const elementRect = element.getBoundingClientRect();
        const newRect = {
          top: elementRect.top,
          left: elementRect.left,
          width: elementRect.width,
          height: elementRect.height,
        };

        setOverlayRect(newRect);
        // ⭐ body 태그 선택 시 'body' 표시
        setSelectedTag(element.tagName.toLowerCase());
      };

      if (immediate) {
        // 초기 선택: RAF 스킵하여 즉시 오버레이 표시
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        calculatePosition();
      } else {
        // ResizeObserver, 스크롤 등: 기존 RAF 배치 처리
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          calculatePosition();
        });
      }
    },
    [selectedElementId] // 🚀 Performance: elementsMap 의존성 제거 - getState()로 조회
  );

  // 🚀 Phase 7.1: 멀티 오버레이 스케줄 래퍼 (즉시 실행 옵션)
  const scheduleMultiOverlayUpdate = useCallback(
    (immediate = false) => {
      if (selectedElementIds.length === 0) {
        setMultiOverlays(new Map());
        return;
      }
      scheduleOverlayUpdate(selectedElementIds, immediate);
    },
    [selectedElementIds, scheduleOverlayUpdate]
  );

  // 🚀 Phase 7.1: 쓰로틀된 스케줄 (스크롤/리사이즈용)
  const scheduleMultiOverlayThrottled = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    scheduleThrottled(selectedElementIds);
  }, [selectedElementIds, scheduleThrottled]);

  // ⭐ Convert multiOverlays to VisibleOverlayData format for virtual scrolling
  const overlaysForVirtualScrolling = useMemo((): VisibleOverlayData[] => {
    return Array.from(multiOverlays.entries()).map(
      ([elementId, overlayData]) => ({
        id: elementId,
        rect: {
          left: overlayData.rect.left,
          top: overlayData.rect.top,
          right: overlayData.rect.left + overlayData.rect.width,
          bottom: overlayData.rect.top + overlayData.rect.height,
          width: overlayData.rect.width,
          height: overlayData.rect.height,
        },
        isPrimary: elementId === selectedElementId,
      })
    );
  }, [multiOverlays, selectedElementId]);

  // ⭐ Apply virtual scrolling to only render visible overlays
  const visibleOverlays = useVisibleOverlays(
    overlaysForVirtualScrolling,
    iframeRef
  );

  // ⭐ Multi-select mode: Update overlays when selectedElementIds changes
  useEffect(() => {
    if (multiSelectMode && selectedElementIds.length > 0) {
      scheduleMultiOverlayUpdate();
    }
  }, [multiSelectMode, selectedElementIds, scheduleMultiOverlayUpdate]);

  // 선택된 요소의 크기 변경 감지 (ResizeObserver만 사용)
  useEffect(() => {
    if (!selectedElementId || !iframeRef.current?.contentDocument) return;

    const selectedElement = iframeRef.current.contentDocument.querySelector(
      `[data-element-id="${selectedElementId}"]`
    );

    if (!selectedElement) return;

    // ResizeObserver는 (entries, observer)를 전달하므로, updatePosition()을 직접 넘기면
    // boolean 파라미터(immediate)가 truthy로 해석되어 강제 동기 getBoundingClientRect()가 발생할 수 있습니다.
    const resizeObserver = new ResizeObserver(() => updatePosition());
    resizeObserver.observe(selectedElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedElementId, updatePosition]);

  // 🚀 Phase 6.3: Message handler를 별도 effect로 분리 (마운트 시 한 번만 설정)
  // - 이전: selectedElementId 변경마다 listener 재등록 → 병목
  // - 이후: 한 번만 등록, Ref로 최신 상태 참조
  const selectedElementIdRef = useRef(selectedElementId);
  const multiSelectModeRef = useRef(multiSelectMode);
  const updatePositionRef = useRef(updatePosition);
  const scheduleMultiOverlayUpdateRef = useRef(scheduleMultiOverlayUpdate);
  const scheduleMultiOverlayThrottledRef = useRef(scheduleMultiOverlayThrottled);

  // Ref 업데이트 (렌더링마다)
  useEffect(() => {
    selectedElementIdRef.current = selectedElementId;
    multiSelectModeRef.current = multiSelectMode;
    updatePositionRef.current = updatePosition;
    scheduleMultiOverlayUpdateRef.current = scheduleMultiOverlayUpdate;
    scheduleMultiOverlayThrottledRef.current = scheduleMultiOverlayThrottled;
  });

  // 🚀 Phase 6.3: iframe 초기화 및 메시지 핸들러 (마운트 시 한 번만)
  useEffect(() => {
    const iframe = MessageService.getIframe();
    iframeRef.current = iframe;

    if (!iframe?.contentDocument) {
      requestAnimationFrame(() => {
        setOverlayRect(null);
        setSelectedTag("");
      });
      return;
    }

    // 🚀 Phase 6.3: Ref를 통해 최신 상태 참조 (클로저 문제 회피)
    const handleMessage = (event: MessageEvent) => {
      // ADR-006 P2-2: source + origin 이중 검증
      if (!isValidPreviewMessage(event)) return;

      if (event.data.type === "ELEMENT_SELECTED" && event.data.payload?.rect) {
        const { top, left, width, height } = event.data.payload.rect;
        setOverlayRect({ top, left, width, height });
        setSelectedTag(event.data.payload.tag || "");
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      } else if (event.data.type === "ELEMENTS_DRAG_SELECTED") {
        scheduleMultiOverlayUpdateRef.current?.();
      } else if (event.data.type === "UPDATE_ELEMENT_PROPS") {
        if (event.data.payload?.rect) {
          const { top, left, width, height } = event.data.payload.rect;
          setOverlayRect({ top, left, width, height });
        } else {
          if (multiSelectModeRef.current) {
            scheduleMultiOverlayUpdateRef.current?.();
          } else {
            updatePositionRef.current?.();
          }
        }
        if (event.data.payload?.tag) {
          setSelectedTag(event.data.payload.tag);
        }
      } else if (event.data.type === "CLEAR_OVERLAY") {
        setOverlayRect(null);
        setSelectedTag("");
        setMultiOverlays(new Map());
      }
    };

    const handleScrollResize = () => {
      if (multiSelectModeRef.current) {
        scheduleMultiOverlayThrottledRef.current?.();
      } else {
        updatePositionRef.current?.();
      }
    };

    window.addEventListener("message", handleMessage);
    iframe.contentWindow?.addEventListener("scroll", handleScrollResize);
    window.addEventListener("resize", handleScrollResize);
    window.addEventListener("scroll", handleScrollResize);

    return () => {
      window.removeEventListener("message", handleMessage);
      iframe.contentWindow?.removeEventListener("scroll", handleScrollResize);
      window.removeEventListener("resize", handleScrollResize);
      window.removeEventListener("scroll", handleScrollResize);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      clearOverlayScheduler();
    };
  }, [clearOverlayScheduler]); // 🚀 의존성 최소화

  // 🚀 Phase 6.3: 선택 변경 시 위치 업데이트 (별도 effect)
  useEffect(() => {
    if (!selectedElementId) return;

    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    // 위치 업데이트 요청
    if (multiSelectMode) {
      scheduleMultiOverlayUpdate();
    } else {
      updatePosition();
    }
  }, [selectedElementId, multiSelectMode, updatePosition, scheduleMultiOverlayUpdate]);

  // ⭐ Multi-select mode: Render multiple overlays (with virtual scrolling)
  if (multiSelectMode && multiOverlays.size > 0) {
    const totalOverlays = overlaysForVirtualScrolling.length;
    const visibleCount = visibleOverlays.length;

    return (
      <div className="overlay">
        {/* Render only visible overlays */}
        {visibleOverlays.map((overlayData) => {
          const elementId = overlayData.id;
          const isPrimary = overlayData.isPrimary;
          // 🚀 Performance: getState()로 현재 elementsMap 조회
          const element = useStore.getState().elementsMap.get(elementId);
          const overlayInfo = multiOverlays.get(elementId);
          const tag = element?.tag || overlayInfo?.tag || "";

          return (
            <div
              key={`overlay-${elementId}-${
                isPrimary ? "primary" : "secondary"
              }`}
              className={`overlay-element multi-select ${
                isPrimary ? "primary" : "secondary"
              }`}
              style={{
                top: overlayData.rect.top,
                left: overlayData.rect.left,
                width: overlayData.rect.width,
                height: overlayData.rect.height,
              }}
            >
              {isPrimary && (
                <div className="overlay-info">
                  <div className="overlay-tag-parent">
                    <Maximize2 size={iconProps.size} />
                  </div>
                  <div className="overlay-tag">{tag}</div>
                </div>
              )}
              <div className="overlay-background" />
              <div className="overlay-pattern">
                <div className="overlay-pattern-inner" />
              </div>
            </div>
          );
        })}

        {/* Virtual scrolling stats (show only if some overlays are hidden) */}
        {visibleCount < totalOverlays && (
          <div className="overlay-stats">
            {visibleCount} / {totalOverlays} visible
          </div>
        )}
      </div>
    );
  }

  // ⭐ Single-select mode: Render single overlay (backward compatibility)
  if (!overlayRect) return null;

  return (
    <div className="overlay">
      <div
        className="overlay-element"
        style={{
          top: overlayRect.top,
          left: overlayRect.left,
          width: overlayRect.width,
          height: overlayRect.height,
        }}
      >
        <div className="overlay-info">
          <div className="overlay-tag-parent">
            <Maximize2 size={iconProps.size} />
          </div>
          <div className="overlay-tag">{displayTag}</div>
        </div>
        <div title="Drag to resize" className="resize-handle" />

        <div className="overlay-background" />

        <div className="overlay-pattern">
          <div className="overlay-pattern-inner" />
        </div>

        {/* Border Radius 코너 포인트 */}
        <BorderRadiusHandles
          rect={overlayRect}
          borderRadius={borderRadiusFromStore}
        />
      </div>
    </div>
  );
}
