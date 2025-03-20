import { useState, useLayoutEffect } from "react";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function SelectionOverlay() {
  const [overlayRect, setOverlayRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 출처 검증
      if (event.origin !== window.location.origin) {
        console.warn("Received message from untrusted origin:", event.origin);
        return;
      }
      //console.log("SelectionOverlay received message:", event.data); // 디버깅 로그 추가
      if (event.data.type === "ELEMENT_SELECTED" && event.data.payload?.rect) {
        const { top, left, width, height } = event.data.payload.rect;
        setOverlayRect({ top, left, width, height });
      }
      if (event.data.type === "CLEAR_OVERLAY") {
        setOverlayRect(null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!overlayRect) return null;

  return (
    <div className="overlay">
      <div
        className="absolute pointer-events-none ring-1 ring-sky-500 transition-all duration-150 ease-in-out"
        style={{
          top: overlayRect.top,
          left: overlayRect.left,
          width: overlayRect.width,
          height: overlayRect.height
        }}
      >
        <div className="bg-sky-500 bottom-full absolute font-mono px-4" style={{ marginLeft: "-0.08rem" }}>Button</div>
        <div className="relative z-1 h-full w-full bg-sky-500 ring-1 ring-sky-500 opacity-5" />
        <div className="absolute inset-0">
          <div className="h-full text-black/10 bg-[size:8px_8px] bg-left-top bg-[image:repeating-linear-gradient(315deg,currentColor_0,currentColor_1px,transparent_0,transparent_50%)]" />
        </div>
      </div>
    </div>
  );
}