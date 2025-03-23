import { useState, useLayoutEffect } from "react";

interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export default function SelectionOverlay() {

    const [overlayRect, setOverlayRect] = useState<Rect | null>(null);
    const [selectedTag, setSelectedTag] = useState<string>(""); // tag 상태 추가
    //console.log("overlayRect", overlayRect);
    useLayoutEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) {
                console.warn("Received message from untrusted origin:", event.origin);
                return;
            }
            //console.log("SelectionOverlay received message:", event.data);
            if (event.data.type === "ELEMENT_SELECTED" && event.data.payload?.rect) {
                const { top, left, width, height } = event.data.payload.rect;
                setOverlayRect({ top, left, width, height });
                setSelectedTag(event.data.payload.tag || "Unknown"); // tag 설정
                //console.log("overlayRect set to:", { top, left, width, height });
            }
            //
            if (event.data.type === "UPDATE_ELEMENT_PROPS") {
                if (event.data.payload?.rect) {
                    // 새 객체로 업데이트하여 리렌더링 유도
                    setOverlayRect({ ...event.data.payload.rect });
                }
            }
            //
            if (event.data.type === "CLEAR_OVERLAY") {
                setOverlayRect(null);
                setSelectedTag("");
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    if (!overlayRect) {
        console.log("overlayRect is null, not rendering overlay");
        return null;
    }

    //console.log("Rendering overlay with rect:", overlayRect);
    return (
        <div className="overlay">
            <div
                className="absolute pointer-events-none ring-1 ring-sky-500 transition-all duration-300 ease-in-out"
                style={{
                    top: overlayRect.top,
                    left: overlayRect.left,
                    width: overlayRect.width,
                    height: overlayRect.height
                }}
            >
                <div className="pointer-events-auto bg-sky-500 text-neutral-100 bottom-full absolute font-mono px-2 font-bold " style={{ marginLeft: "-0.08rem" }}>
                    selected:{selectedTag}
                </div>

                <div className="relative z-1 h-full w-full bg-sky-500 ring-1 ring-sky-500 opacity-5" />
                <div className="absolute inset-0">
                    <div className="h-full text-black/10 bg-[size:8px_8px] bg-left-top bg-[image:repeating-linear-gradient(315deg,currentColor_0,currentColor_1px,transparent_0,transparent_50%)]" />
                </div>
            </div>
        </div>
    );
}