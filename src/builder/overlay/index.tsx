import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useStore } from "../stores";
import { ChevronUp } from "lucide-react";
import { MessageService } from "../../utils/messaging";

import "./index.css";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function SelectionOverlay() {
  const selectedElementId = useStore((state) => state.selectedElementId);
  // 다중 선택 상태 추가
  const selectedElementIds = useStore((state) => state.selectedElementIds);
  const multiSelectMode = useStore((state) => state.multiSelectMode);
  // 성능 최적화: Map 사용 (O(1) 조회)
  const elementsMap = useStore((state) => state.elementsMap);
  const overlayOpacity = useStore((state) => state.overlayOpacity);
  const [overlayRect, setOverlayRect] = useState<Rect | null>(null);
  const [multiOverlayRects, setMultiOverlayRects] = useState<Array<Rect & { tag: string; id: string }>>([]);
  const [selectedTag, setSelectedTag] = useState<string>("");
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
      if (!iframe?.contentDocument) {
        setOverlayRect(null);
        setMultiOverlayRects([]);
        return;
      }

      // 다중 선택 모드일 때
      if (multiSelectMode && selectedElementIds.length > 0) {
        const rects: Array<Rect & { tag: string; id: string }> = [];

        selectedElementIds.forEach((elementId) => {
          const element = iframe.contentDocument!.querySelector(
            `[data-element-id="${elementId}"]`
          ) as HTMLElement;

          if (element) {
            const elementRect = element.getBoundingClientRect();
            rects.push({
              id: elementId,
              top: elementRect.top,
              left: elementRect.left,
              width: elementRect.width,
              height: elementRect.height,
              tag: element.tagName.toLowerCase(),
            });
          }
        });

        setMultiOverlayRects(rects);
        setOverlayRect(null); // 단일 선택 오버레이 제거
        return;
      }

      // 단일 선택 모드 (기존 로직)
      if (!selectedElementId) {
        setOverlayRect(null);
        setMultiOverlayRects([]);
        return;
      }

      const element = iframe.contentDocument.querySelector(
        `[data-element-id="${selectedElementId}"]`
      ) as HTMLElement;

      if (!element) {
        setOverlayRect(null);
        setSelectedTag("");
        setMultiOverlayRects([]);
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
      setSelectedTag(element.tagName.toLowerCase());
      setMultiOverlayRects([]); // 다중 선택 오버레이 제거
    });
  }, [selectedElementId, multiSelectMode, selectedElementIds]);

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
      } else if (event.data.type === "UPDATE_ELEMENT_PROPS") {
        // Props 업데이트 시 overlay 위치 동기화
        if (event.data.payload?.rect) {
          // rect가 제공된 경우: Preview의 좌표를 직접 사용
          const { top, left, width, height } = event.data.payload.rect;
          setOverlayRect({ top, left, width, height });
        } else {
          // rect가 없는 경우: DOM에서 직접 재계산
          updatePosition();
        }
        // tag 정보가 있으면 업데이트
        if (event.data.payload?.tag) {
          setSelectedTag(event.data.payload.tag);
        }
      } else if (event.data.type === "CLEAR_OVERLAY") {
        setOverlayRect(null);
        setSelectedTag("");
      }
    };

    const handleScrollResize = () => updatePosition();

    window.addEventListener("message", handleMessage);

    if (selectedElementId && iframe?.contentWindow) {
      updatePosition();
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
  }, [selectedElementId, updatePosition]);

  // 다중 선택 모드일 때
  if (multiSelectMode && multiOverlayRects.length > 0) {
    return (
      <div className="overlay">
        {multiOverlayRects.map((rect) => (
          <div
            key={rect.id}
            className="overlay-element multi-select"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              opacity: overlayOpacity / 100,
            }}
          >
            <div className="overlay-info">
              <div className="overlay-tag-parent">
                <ChevronUp size={16} />
              </div>
              <div className="overlay-tag">{rect.tag}</div>
            </div>

            <div className="overlay-background multi-select-bg" />

            <div className="overlay-pattern">
              <div className="overlay-pattern-inner" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 단일 선택 모드 (기존 UI)
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
