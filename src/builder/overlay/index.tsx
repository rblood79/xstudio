import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useStore } from "../stores";
import { ChevronUp } from 'lucide-react';
import { MessageService } from '../../utils/messaging';

import "./index.css";

interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export default function SelectionOverlay() {
    const selectedElementId = useStore((state) => state.selectedElementId);
    const elements = useStore((state) => state.elements);
    const overlayOpacity = useStore((state) => state.overlayOpacity);
    const [overlayRect, setOverlayRect] = useState<Rect | null>(null);
    const [selectedTag, setSelectedTag] = useState<string>("");
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const rafIdRef = useRef<number | null>(null);

    // Tag 표시 로직 (useMemo로 최적화)
    const displayTag = useMemo(() => {
        const element = elements.find(el => el.id === selectedElementId);
        return element?.tag || selectedTag || "";
    }, [elements, selectedElementId, selectedTag]);

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
            const iframeRect = iframe.getBoundingClientRect();
            // 요소의 위치 (iframe 내부 기준)
            const elementRect = element.getBoundingClientRect();

            // 정확한 위치 계산: iframe offset + element position
            // 소수점 유지 (subpixel rendering 지원)
            const newRect = {
                top: iframeRect.top + elementRect.top,
                left: iframeRect.left + elementRect.left,
                width: elementRect.width,
                height: elementRect.height,
            };

            setOverlayRect(newRect);
            setSelectedTag(element.tagName.toLowerCase());
        });
    }, [selectedElementId]);

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
            setOverlayRect(null);
            setSelectedTag("");
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data.type === "ELEMENT_SELECTED" && event.data.payload?.rect) {
                // Preview의 좌표를 신뢰 (재계산 불필요)
                const { top, left, width, height } = event.data.payload.rect;

                // iframe offset 정확히 반영
                const iframeRect = iframe?.getBoundingClientRect();
                if (iframeRect) {
                    setOverlayRect({
                        top: iframeRect.top + top,
                        left: iframeRect.left + left,
                        width,
                        height,
                    });
                } else {
                    setOverlayRect({ top, left, width, height });
                }

                setSelectedTag(event.data.payload.tag || "");
            } else if (event.data.type === "UPDATE_ELEMENT_PROPS" && event.data.payload?.rect) {
                // Props 업데이트 시에도 iframe offset 반영
                const { top, left, width, height } = event.data.payload.rect;
                const iframeRect = iframe?.getBoundingClientRect();
                if (iframeRect) {
                    setOverlayRect({
                        top: iframeRect.top + top,
                        left: iframeRect.left + left,
                        width,
                        height,
                    });
                } else {
                    setOverlayRect({ top, left, width, height });
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

    if (!overlayRect) return null;

    return (
        <div className="overlay">
            <div className="overlay-element"
                style={{
                    top: overlayRect.top,
                    left: overlayRect.left,
                    width: overlayRect.width,
                    height: overlayRect.height,
                    opacity: overlayOpacity / 100,
                }}>
                <div className="overlay-info">
                    <div className="overlay-tag-parent"><ChevronUp size={16} /></div>
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
