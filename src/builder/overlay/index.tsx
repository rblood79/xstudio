import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useStore } from "../stores";
import { ChevronUp } from "lucide-react";
import { MessageService } from "../../utils/messaging";
import { useVisibleOverlays } from "./hooks/useVisibleOverlays";
import type { OverlayData as VisibleOverlayData } from "./hooks/useVisibleOverlays";

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
  const selectedElementIds = useStore((state) => state.selectedElementIds || []);
  const multiSelectMode = useStore((state) => state.multiSelectMode || false);

  // 성능 최적화: Map 사용 (O(1) 조회)
  const elementsMap = useStore((state) => state.elementsMap);
  const overlayOpacity = useStore((state) => state.overlayOpacity);

  // ⭐ Single select state (backward compatibility)
  const [overlayRect, setOverlayRect] = useState<Rect | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("");

  // ⭐ Multi-select state: Map of elementId -> overlay data
  const [multiOverlays, setMultiOverlays] = useState<Map<string, OverlayData>>(new Map());

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Tag 표시 로직 (useMemo로 최적화, Map 사용)
  const displayTag = useMemo(() => {
    const element = selectedElementId ? elementsMap.get(selectedElementId) : null;
    return element?.tag || selectedTag || "";
  }, [elementsMap, selectedElementId, selectedTag]);

  const updatePosition = useCallback(() => {
    // 이미 대기 중인 업데이트가 있으면 취소
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;

      const iframe = iframeRef.current;
      if (!iframe?.contentDocument || !selectedElementId) {
        setOverlayRect(null);
        return;
      }

      const element = iframe.contentDocument.querySelector(
        `[data-element-id="${selectedElementId}"]`
      ) as HTMLElement;

      if (!element) {
        setOverlayRect(null);
        setSelectedTag("");
        return;
      }

      // iframe의 위치 (부모 문서 기준)
      //const iframeRect = iframe.getBoundingClientRect();
      // 요소의 위치 (iframe 내부 기준)
      const elementRect = element.getBoundingClientRect();

      // getBoundingClientRect()는 이미 viewport 기준 절대 좌표
      // iframe offset 추가 필요
      const newRect = {
        top: elementRect.top,
        left: elementRect.left,
        width: elementRect.width,
        height: elementRect.height,
      };

      setOverlayRect(newRect);
      setSelectedTag(element.tagName.toLowerCase());
    });
  }, [selectedElementId]);

  // ⭐ Update multi-select overlay positions
  const updateMultiOverlays = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument || selectedElementIds.length === 0) {
      setMultiOverlays(new Map());
      return;
    }

    const newOverlays = new Map<string, OverlayData>();

    selectedElementIds.forEach((elementId: string) => {
      const element = iframe.contentDocument!.querySelector(
        `[data-element-id="${elementId}"]`
      ) as HTMLElement;

      if (element) {
        const elementRect = element.getBoundingClientRect();
        newOverlays.set(elementId, {
          rect: {
            top: elementRect.top,
            left: elementRect.left,
            width: elementRect.width,
            height: elementRect.height,
          },
          tag: element.tagName.toLowerCase(),
        });
      }
    });

    setMultiOverlays(newOverlays);
  }, [selectedElementIds]);

  // ⭐ Convert multiOverlays to VisibleOverlayData format for virtual scrolling
  const overlaysForVirtualScrolling = useMemo((): VisibleOverlayData[] => {
    return Array.from(multiOverlays.entries()).map(([elementId, overlayData]) => ({
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
    }));
  }, [multiOverlays, selectedElementId]);

  // ⭐ Apply virtual scrolling to only render visible overlays
  const visibleOverlays = useVisibleOverlays(overlaysForVirtualScrolling, iframeRef);

  // ⭐ Multi-select mode: Update overlays when selectedElementIds changes
  useEffect(() => {
    if (multiSelectMode && selectedElementIds.length > 0) {
      // Call updateMultiOverlays via RAF to avoid triggering during render
      requestAnimationFrame(() => {
        updateMultiOverlays();
      });
    }
  }, [multiSelectMode, selectedElementIds, updateMultiOverlays]);

  // 선택된 요소의 크기 변경 감지 (ResizeObserver만 사용)
  useEffect(() => {
    if (!selectedElementId || !iframeRef.current?.contentDocument) return;

    const selectedElement = iframeRef.current.contentDocument.querySelector(
      `[data-element-id="${selectedElementId}"]`
    );

    if (!selectedElement) return;

    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(selectedElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedElementId, updatePosition]);

  useEffect(() => {
    const iframe = MessageService.getIframe();
    iframeRef.current = iframe;

    if (!iframe?.contentDocument) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOverlayRect(null);
       
      setSelectedTag("");
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "ELEMENT_SELECTED" && event.data.payload?.rect) {
        // Preview에서 보내는 좌표를 직접 사용 (iframe offset 추가 제거)
        // getBoundingClientRect()가 iframe 내부에서 호출되므로 이미 정확한 위치 반환
        const { top, left, width, height } = event.data.payload.rect;
        setOverlayRect({ top, left, width, height });
        setSelectedTag(event.data.payload.tag || "");
      } else if (event.data.type === "ELEMENTS_DRAG_SELECTED") {
        // ⭐ Multi-select: Update all overlay positions
        updateMultiOverlays();
      } else if (event.data.type === "UPDATE_ELEMENT_PROPS") {
        // Props 업데이트 시 overlay 위치 동기화
        if (event.data.payload?.rect) {
          // rect가 제공된 경우: Preview의 좌표를 직접 사용
          const { top, left, width, height } = event.data.payload.rect;
          setOverlayRect({ top, left, width, height });
        } else {
          // rect가 없는 경우: DOM에서 직접 재계산
          if (multiSelectMode) {
            updateMultiOverlays();
          } else {
            updatePosition();
          }
        }
        // tag 정보가 있으면 업데이트
        if (event.data.payload?.tag) {
          setSelectedTag(event.data.payload.tag);
        }
      } else if (event.data.type === "CLEAR_OVERLAY") {
        setOverlayRect(null);
        setSelectedTag("");
        setMultiOverlays(new Map());
      }
    };

    // ⭐ Handle scroll/resize for both single and multi-select
    const handleScrollResize = () => {
      if (multiSelectMode) {
        updateMultiOverlays();
      } else {
        updatePosition();
      }
    };

    window.addEventListener("message", handleMessage);

    if (selectedElementId && iframe?.contentWindow) {
      if (multiSelectMode) {
        updateMultiOverlays();
      } else {
        updatePosition();
      }
      iframe.contentWindow.addEventListener("scroll", handleScrollResize);
      window.addEventListener("resize", handleScrollResize);
      window.addEventListener("scroll", handleScrollResize);
    }

    return () => {
      window.removeEventListener("message", handleMessage);
      if (iframe?.contentWindow) {
        iframe.contentWindow.removeEventListener("scroll", handleScrollResize);
      }
      window.removeEventListener("resize", handleScrollResize);
      window.removeEventListener("scroll", handleScrollResize);

      // requestAnimationFrame cleanup
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [selectedElementId, multiSelectMode, updatePosition, updateMultiOverlays]);

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
          const element = elementsMap.get(elementId);
          const overlayInfo = multiOverlays.get(elementId);
          const tag = element?.tag || overlayInfo?.tag || "";

          return (
            <div
              key={elementId}
              className={`overlay-element multi-select ${isPrimary ? 'primary' : 'secondary'}`}
              style={{
                top: overlayData.rect.top,
                left: overlayData.rect.left,
                width: overlayData.rect.width,
                height: overlayData.rect.height,
                opacity: overlayOpacity / 100,
              }}
            >
              {isPrimary && (
                <div className="overlay-info">
                  <div className="overlay-tag-parent">
                    <ChevronUp size={16} />
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
          opacity: overlayOpacity / 100,
        }}
      >
        <div className="overlay-info">
          <div className="overlay-tag-parent">
            <ChevronUp size={16} />
          </div>
          <div className="overlay-tag">{displayTag}</div>
        </div>
        <div title="Drag to resize" className="resize-handle" />

        <div className="overlay-background" />

        <div className="overlay-pattern">
          <div className="overlay-pattern-inner" />
        </div>
      </div>
    </div>
  );
}
