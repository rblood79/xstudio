import { useState, useEffect, useRef, useCallback } from "react";
import { useStore } from "../stores/elements";
import { ChevronUp } from 'lucide-react';

import "./index.css";
interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export default function SelectionOverlay() {
    const selectedElementId = useStore((state) => state.selectedElementId);
    const [overlayRect, setOverlayRect] = useState<Rect | null>(null);
    const [selectedTag, setSelectedTag] = useState<string>("");
    const iframeRef = useRef<HTMLIFrameElement | null>(null);


    const updatePosition = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentWindow || !selectedElementId) return;

        const element = iframe.contentDocument?.querySelector(
            `[data-element-id="${selectedElementId}"]`
        ) as HTMLElement;

        if (element) {
            //const iframeRect = iframe.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();

            const newRect = {
                top: Math.floor(elementRect.top) + 1, // iframe 뷰포트 기준을 부모 문서 기준으로 변환
                left: Math.floor(elementRect.left) + 1,
                width: Math.floor(elementRect.width) - 1,
                height: Math.floor(elementRect.height) - 1,
            };

            /*console.log("iframeRect:", iframeRect);
            console.log("elementRect:", elementRect);
            console.log("scrollY:", iframe.contentWindow.scrollY, "scrollX:", iframe.contentWindow.scrollX);
            console.log("newRect calculated:", newRect);*/

            setOverlayRect({ ...newRect });
            setSelectedTag(element.tagName.toLowerCase());
        } else {
            setOverlayRect(null);
            setSelectedTag("");
        }
    }, [selectedElementId]);

    useEffect(() => {
        iframeRef.current = document.getElementById("previewFrame") as HTMLIFrameElement;
        const iframe = iframeRef.current;

        if (!iframe?.contentDocument) {
            setOverlayRect(null);
            setSelectedTag("");
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data.type === "ELEMENT_SELECTED" && event.data.payload?.rect) {
                const { top, left, width, height } = event.data.payload.rect;
                setOverlayRect({ top, left, width, height });
                setSelectedTag(event.data.payload.tag || "Unknown");
                //console.log("Initial rect from postMessage:", { top, left, width, height });
                setTimeout(updatePosition, 0); // 초기화 후 즉시 DOM 계산
            } else if (event.data.type === "UPDATE_ELEMENT_PROPS" && event.data.payload?.rect) {
                setOverlayRect({ ...event.data.payload.rect });
            } else if (event.data.type === "CLEAR_OVERLAY") {
                setOverlayRect(null);
                setSelectedTag("");
            }
        };

        window.addEventListener("message", handleMessage);

        const handleScrollResize = () => updatePosition();

        if (selectedElementId) {
            updatePosition();
            iframe.contentWindow?.addEventListener("scroll", handleScrollResize);
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
        };
    }, [selectedElementId, updatePosition]);

    /*useEffect(() => {
        console.log("overlayRect updated:", overlayRect);
    }, [overlayRect]);*/

    if (!overlayRect) return null;

    return (
        <div className="overlay">
            <div className="overlay-element"
                style={{
                    top: overlayRect.top,
                    left: overlayRect.left,
                    width: overlayRect.width,
                    height: overlayRect.height,
                }}>
                <div className="overlay-info">
                    <div className="overlay-tag-parent"><ChevronUp size={16} /></div>
                    <div className="overlay-tag">{selectedTag}</div>
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
