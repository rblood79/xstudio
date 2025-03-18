// 예시: apps/builder/app/components/SelectionOverlay.tsx
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
      // 보안상 event.origin 체크 필요 (생략)
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
      {/*
      <div className="absolute pointer-events-none right-0 left-0 flex" style={{ top: overlayRect.top - 14, width: overlayRect.width }}>
        <div className="absolute top-1/2 right-0 left-0 h-px -translate-y-px bg-sky-400"></div>
        <div className="w-full">
          <div className="absolute top-1/2 left-0 h-2 w-px -translate-x-px -translate-y-1 rounded-full bg-sky-400"></div>
        </div>
        <div className="relative z-10 flex w-half flex-auto items-center justify-center bg-white px-1.5 font-mono text-xs leading-none font-bold text-sky-600 dark:bg-gray-900 dark:text-sky-400">{overlayRect.width}px</div>
        <div className="w-full"><div className="absolute top-1/2 right-0 h-2 w-px translate-x-px -translate-y-1 rounded-full bg-sky-400"></div>
        </div>
      </div>

      <div className="absolute pointer-events-none -left-8 bottom-0 flex" style={{ top: overlayRect.top, height: overlayRect.height }}>
        <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-[0.5px] bg-sky-400"></div>
        <div className="w-full">
          <div className="absolute top-0 left-1/2 h-px w-2 -translate-x-1 -translate-y-px rounded-full bg-sky-400"></div>
        </div>
        <div
          style={{
            transform: `translateY(${overlayRect.height / 2 - 17.5 / 2}px) rotate(-90deg)`
          }}
          className="relative z-10 flex flex-auto h-5 -translate-x-[0.2rem] items-center justify-center bg-white px-1.5 font-mono text-xs leading-none font-bold text-sky-600 dark:bg-gray-900 dark:text-sky-400"
        >
          {overlayRect.height}px
        </div>
        <div className="w-full">
          <div className="absolute bottom-0 left-1/2 h-px w-2 -translate-x-1 translate-y-px rounded-full bg-sky-400"></div>
        </div>
      </div>
        */}
      <div
        className="absolute pointer-events-none ring-1 ring-sky-500 transition-all duration-150 ease-in-out"
        style={{
          top: overlayRect.top,
          left: overlayRect.left,
          width: overlayRect.width,
          height: overlayRect.height
        }}
      >
        {/* 필요에 따라 리사이즈 핸들 등의 추가 UI 제공*/}

        <div className=" bg-sky-500 bottom-full absolute font-mono px-4" style={{ marginLeft: "-0.08rem" }}>Button</div>
        <div className="relative z-1 h-full w-full bg-sky-500 ring-1 ring-sky-500 opacity-5" />
        <div className="absolute inset-0">
          <div className="h-full text-black/10  bg-[size:8px_8px] bg-left-top bg-[image:repeating-linear-gradient(315deg,currentColor_0,currentColor_1px,transparent_0,transparent_50%)]" />
        </div>
      </div>
    </div>
  );
}
