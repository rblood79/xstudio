/**
 * Text Edit Overlay (Quill Editor)
 *
 * Pencil nUt 패턴: WebGL 캔버스 위에 Quill 에디터 오버레이.
 * - 편집 중 Skia 텍스트 숨김 (nodeRenderers.ts setEditingElementId)
 * - CSS transform으로 카메라 좌표계 매핑
 * - Enter/Escape/외부 클릭으로 편집 완료/취소
 * - IME(한글) 조합 지원
 *
 * @since 2025-12-11 Phase 10 B1.5
 * @updated 2026-03-07 Quill 에디터 전환 (Pencil nUt 패턴)
 */

import { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.core.css";
import { getSceneBounds } from "../canvas/skia/renderCommands";

// ============================================
// Types
// ============================================

export interface TextEditOverlayProps {
  /** 편집 중인 요소 ID */
  elementId: string;
  /** 현재 텍스트 값 */
  initialValue: string;
  /** 위치 (screen 좌표 — layoutBoundsRegistry 기준) */
  position: { x: number; y: number };
  /** 크기 (screen 픽셀) */
  size: { width: number; height: number };
  /** 줌 레벨 */
  zoom: number;
  /** 팬 오프셋 (현재 미사용 — position이 이미 screen 좌표) */
  panOffset: { x: number; y: number };
  /** 스타일 */
  style?: TextStyleConfig;
  /** 텍스트 변경 콜백 */
  onChange?: (elementId: string, newValue: string) => void;
  /** 편집 완료 콜백 */
  onComplete?: (elementId: string) => void;
  /** 편집 취소 콜백 */
  onCancel?: (elementId: string) => void;
}

export interface TextStyleConfig {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  color?: string;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number | string;
  padding?: number;
  paddingTop?: number;
  letterSpacing?: number;
}

// ============================================
// Component
// ============================================

export function TextEditOverlay({
  elementId,
  initialValue,
  position,
  size,
  zoom,
  panOffset,
  style = {},
  onChange,
  onComplete,
  onCancel,
}: TextEditOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);

  // Pencil nUt.updateSize 패턴: getSceneBounds()로 장면 좌표 추적 + 카메라 변환
  // boundsMap(scene 좌표)는 매 프레임 갱신됨 → zoom/pan 적용하여 screen 좌표 산출
  const zoomRef = useRef(zoom);
  const panOffsetRef = useRef(panOffset);
  zoomRef.current = zoom;
  panOffsetRef.current = panOffset;

  const [livePos, setLivePos] = useState(position);
  const [liveSize, setLiveSize] = useState(size);
  useEffect(() => {
    let rafId: number;
    const track = () => {
      const sceneBounds = getSceneBounds(elementId);
      if (sceneBounds) {
        const z = zoomRef.current;
        const pan = panOffsetRef.current;
        // scene → screen 변환
        const sx = sceneBounds.x * z + pan.x;
        const sy = sceneBounds.y * z + pan.y;
        const sw = sceneBounds.width * z;
        const sh = sceneBounds.height * z;
        setLivePos((prev) =>
          prev.x !== sx || prev.y !== sy ? { x: sx, y: sy } : prev,
        );
        setLiveSize((prev) =>
          prev.width !== sw || prev.height !== sh
            ? { width: sw, height: sh }
            : prev,
        );
      }
      rafId = requestAnimationFrame(track);
    };
    rafId = requestAnimationFrame(track);
    return () => cancelAnimationFrame(rafId);
  }, [elementId]);

  // Stable refs for callbacks (avoid stale closures)
  const onCompleteRef = useRef(onComplete);
  const onCancelRef = useRef(onCancel);
  const onChangeRef = useRef(onChange);
  onCompleteRef.current = onComplete;
  onCancelRef.current = onCancel;
  onChangeRef.current = onChange;

  // Initialize Quill editor (Pencil nUt constructor 패턴)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Quill 에디터 생성 (Pencil: toolbar 비활성, 텍스트 전용)
    const quill = new Quill(container, {
      modules: { toolbar: false },
      formats: [],
      placeholder: "",
    });
    quillRef.current = quill;

    // Quill root 스타일 (Pencil setInitialStyle 패턴)
    const root = quill.root;
    root.style.outline = "none";
    root.style.overflow = "visible";
    root.style.display = "flex";
    root.style.flexDirection = "column";
    root.classList.add("notranslate");
    root.setAttribute("translate", "no");

    // Skia 렌더링과 일치하는 폰트 스타일 적용
    const fontSize = style.fontSize ?? 16;
    root.style.fontFamily = style.fontFamily ?? "Pretendard, sans-serif";
    root.style.fontSize = `${fontSize}px`;
    root.style.fontWeight = String(style.fontWeight ?? "normal");
    root.style.color = style.color ?? "#000000";
    root.style.textAlign = style.textAlign ?? "left";
    if (style.lineHeight != null) {
      root.style.lineHeight =
        typeof style.lineHeight === "number"
          ? `${style.lineHeight}px`
          : style.lineHeight;
    }
    if (style.letterSpacing) {
      root.style.letterSpacing = `${style.letterSpacing}px`;
    }
    // paddingLeft/paddingTop: Skia 텍스트 오프셋과 일치
    root.style.paddingLeft = style.padding ? `${style.padding}px` : "0";
    root.style.paddingTop = style.paddingTop ? `${style.paddingTop}px` : "0";
    root.style.margin = "0";
    root.style.minWidth = initialValue ? "auto" : "1px";

    // 초기 텍스트 설정 + 전체 선택 (Pencil: setText → setSelection(0, length))
    quill.setText(initialValue, "api");
    quill.setSelection(0, initialValue.length);
    quill.history.clear();

    // 텍스트 변경 이벤트 (Pencil: text-change → 노드 업데이트, undo 미기록)
    quill.on("text-change", () => {
      let text = quill.getText();
      // Quill은 항상 마지막에 \n을 추가함 → 제거
      if (text.endsWith("\n")) {
        text = text.slice(0, -1);
      }
      onChangeRef.current?.(elementId, text);
    });

    // 키보드 핸들러 (Pencil: Cmd+Enter → 완료, Escape → 취소)
    root.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.stopPropagation();
        e.preventDefault();
        onCompleteRef.current?.(elementId);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        // 단일행 텍스트: Enter → 완료
        e.stopPropagation();
        e.preventDefault();
        onCompleteRef.current?.(elementId);
        return;
      }
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        onCancelRef.current?.(elementId);
        return;
      }
    });

    // 휠 이벤트 차단 (Pencil: 편집 중 캔버스 줌 방지)
    container.addEventListener("wheel", (e: WheelEvent) => {
      e.preventDefault();
    });

    // 외부 클릭 감지 (Pencil: handleClickOutside → destroy)
    const handleClickOutside = (e: MouseEvent) => {
      if (container.contains(e.target as Node)) return;
      onCompleteRef.current?.(elementId);
    };

    // rAF 후 외부 클릭 리스너 등록 + 포커스 (Pencil 동일 패턴)
    requestAnimationFrame(() => {
      if (container.parentElement) {
        document.addEventListener("mousedown", handleClickOutside);
        quill.focus();
      }
    });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount only — Pencil nUt는 constructor에서 한 번만 초기화

  // Pencil nUt.updateSize 패턴: CSS transform으로 카메라 줌 적용
  // getBounds()는 스크린 좌표(줌 포함)를 반환.
  // CSS 텍스트는 자연 크기(fontSize px)로 렌더링 → scale(zoom)으로 Skia와 일치시킴.
  // 컨테이너 크기는 1/zoom으로 보정 → scale 후 스크린 크기와 일치.
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: livePos.x,
    top: livePos.y,
    width: liveSize.width / zoom,
    height: liveSize.height / zoom,
    transformOrigin: "top left",
    transform: `scale(${zoom})`,
    border: "none",
    boxSizing: "border-box",
    background: "transparent",
    zIndex: 1000,
    pointerEvents: "auto",
    cursor: "text",
    overflow: "visible",
    WebkitFontSmoothing: "antialiased",
  };

  return (
    <div
      data-text-edit-overlay
      className="absolute inset-0"
      style={{ pointerEvents: "none", zIndex: 999 }}
    >
      <div ref={containerRef} style={containerStyle} />
    </div>
  );
}

export default TextEditOverlay;
