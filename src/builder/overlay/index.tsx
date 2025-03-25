
import { useState, useEffect, useRef } from "react";
import { useStore } from "../stores/elements";

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

    const updatePosition = () => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentWindow || !selectedElementId) return;

        const element = iframe.contentDocument?.querySelector(
            `[data-element-id="${selectedElementId}"]`
        ) as HTMLElement;

        if (element) {
            //const iframeRect = iframe.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();

            const newRect = {
                top: elementRect.top, // iframe 뷰포트 기준을 부모 문서 기준으로 변환
                left: elementRect.left,
                width: elementRect.width,
                height: elementRect.height,
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
    };

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
    }, [selectedElementId]);

    /*useEffect(() => {
        console.log("overlayRect updated:", overlayRect);
    }, [overlayRect]);*/

    if (!overlayRect) return null;

    return (
        <div className="overlay">
            <div
                className="absolute pointer-events-none ring-1 ring-sky-500"
                style={{
                    top: overlayRect.top,
                    left: overlayRect.left,
                    width: overlayRect.width,
                    height: overlayRect.height,
                }}
            >
                <div
                    className="pointer-events-auto bg-sky-500 text-neutral-100 bottom-full absolute font-mono py-2 px-2 font-bold cursor-default"
                    style={{ marginLeft: "-0.08rem" }}
                >
                    {selectedTag}
                </div>
                <div className="relative z-1 h-full w-full bg-sky-500 ring-1 ring-sky-500 opacity-5" />
                <div className="absolute inset-0">
                    <div className="h-full text-black/10 bg-[size:8px_8px] bg-left-top bg-[image:repeating-linear-gradient(315deg,currentColor_0,currentColor_1px,transparent_0,transparent_50%)]" />
                </div>
            </div>
        </div>
    );
}
/*import { useState, useEffect } from "react";
import { useStore } from "../stores/elements";

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

    useEffect(() => {
        const iframe = document.getElementById("previewFrame") as HTMLIFrameElement;
        const updateOverlay = () => {
            if (!iframe?.contentDocument) {
                setOverlayRect(null);
                setSelectedTag("");
                return;
            }

            const updateRect = (element: HTMLElement) => {
                requestAnimationFrame(() => {
                    const rect = element.getBoundingClientRect();
                    const newRect = {
                        top: rect.top + (iframe.contentWindow?.scrollY || 0),
                        left: rect.left + (iframe.contentWindow?.scrollX || 0),
                        width: rect.width,
                        height: rect.height,
                    };
                    setOverlayRect((prev) =>
                        prev?.top === newRect.top && prev?.left === newRect.left &&
                        prev?.width === newRect.width && prev?.height === newRect.height
                        ? prev : newRect
                    );
                    setSelectedTag(element.tagName.toLowerCase());
                });
            };

            const handleMessage = (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;
                if (event.data.type === "ELEMENT_SELECTED" && event.data.payload?.rect) {
                    const { top, left, width, height } = event.data.payload.rect;
                    requestAnimationFrame(() => {
                        setOverlayRect({ top, left, width, height });
                        setSelectedTag(event.data.payload.tag || "Unknown");
                    });
                } else if (event.data.type === "UPDATE_ELEMENT_PROPS" && event.data.payload?.rect) {
                    requestAnimationFrame(() => {
                        setOverlayRect({ ...event.data.payload.rect });
                    });
                } else if (event.data.type === "CLEAR_OVERLAY") {
                    requestAnimationFrame(() => {
                        setOverlayRect(null);
                        setSelectedTag("");
                    });
                }
            };

            window.addEventListener("message", handleMessage);

            let observer: MutationObserver | null = null;
            if (selectedElementId) {
                const element = iframe.contentDocument.querySelector(
                    `[data-element-id="${selectedElementId}"]`
                ) as HTMLElement;
                const storeElements = useStore.getState().elements;
                if (element && storeElements.some((el) => el.id === selectedElementId)) {
                    updateRect(element);
                    const debouncedUpdateRect = debounce(updateRect, 50);
                    observer = new MutationObserver(() => debouncedUpdateRect(element));
                    observer.observe(element, {
                        attributes: true,
                        childList: true,
                        subtree: true,
                    });
                } else {
                    setOverlayRect(null);
                    setSelectedTag("");
                }
            }

            return () => {
                window.removeEventListener("message", handleMessage);
                if (observer) observer.disconnect();
            };
        };

        if (iframe?.contentDocument?.readyState === "complete") {
            updateOverlay();
        } else {
            iframe?.addEventListener("load", updateOverlay);
            return () => iframe?.removeEventListener("load", updateOverlay);
        }
    }, [selectedElementId]);

    if (!overlayRect) return null;

    return (
        <div className="overlay">
            <div
                className="absolute pointer-events-none ring-1 ring-sky-500 transition-all duration-60 ease-in-out"
                style={{
                    top: overlayRect.top,
                    left: overlayRect.left,
                    width: overlayRect.width,
                    height: overlayRect.height,
                }}
            >
                <div
                    className="pointer-events-auto bg-sky-500 text-neutral-100 bottom-full absolute font-mono py-2 px-2 font-bold cursor-default"
                    style={{ marginLeft: "-0.08rem" }}
                >
                    {selectedTag}
                </div>
                <div className="relative z-1 h-full w-full bg-sky-500 ring-1 ring-sky-500 opacity-5" />
                <div className="absolute inset-0">
                    <div className="h-full text-black/10 bg-[size:8px_8px] bg-left-top bg-[image:repeating-linear-gradient(315deg,currentColor_0,currentColor_1px,transparent_0,transparent_50%)]" />
                </div>
            </div>
        </div>
    );
}

function debounce(func: (element: HTMLElement) => void, wait: number) {
    let timeout: NodeJS.Timeout;
    return (element: HTMLElement) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(element), wait);
    };
}*/