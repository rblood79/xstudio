// 예시: apps/builder/app/components/SelectionOverlay.tsx
import React, { useState, useEffect } from "react";

export default function SelectionOverlay() {
  const [overlayRect, setOverlayRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 보안상 event.origin 체크 필요 (생략)
      if (event.data.type === "ELEMENT_SELECTED") {
        setOverlayRect(event.data.payload.rect);
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
    <div
      style={{
        position: "absolute",
        top: overlayRect.top,
        left: overlayRect.left,
        width: overlayRect.width,
        height: overlayRect.height,
        border: "1px solid #ff0000",
        pointerEvents: "none",
      }}
    >
      {/* 필요에 따라 리사이즈 핸들 등의 추가 UI 제공 */}
    </div>
  );
}
