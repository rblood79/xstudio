import React, { useMemo } from "react";
import { generatePreviewSrcdoc, shouldUseSrcdoc } from "./previewSrcdoc";

export interface BuilderCanvasProps {
  projectId?: string;
  breakpoint: Set<string>;
  breakpoints: Array<{
    id: string;
    label: string;
    max_width: string | number;
    max_height: string | number;
  }>;
  onIframeLoad: () => void;
  onMessage: (event: MessageEvent) => void;
  children?: React.ReactNode;
  /** ADR-006 P2-2: nonce 기반 부트스트랩 메시지 검증용 */
  bootstrapNonce: string;
}

/**
 * BuilderCanvas - 레거시 iframe 기반 캔버스
 *
 * 주의: 이 컴포넌트는 WebGL Canvas의 fallback으로만 사용됩니다.
 * WebGL Canvas (isWebGLCanvas() === true) 환경에서는 사용되지 않습니다.
 *
 * @deprecated WebGL Canvas 전환 완료 후 제거 예정
 */
export const BuilderCanvas: React.FC<BuilderCanvasProps> = ({
  projectId,
  breakpoint,
  breakpoints,
  onIframeLoad,
  onMessage,
  children,
  bootstrapNonce,
}) => {
  const currentBreakpoint = breakpoints.find(
    (bp) => bp.id === Array.from(breakpoint)[0]
  );

  // srcdoc 모드 여부 및 srcdoc 콘텐츠 생성
  // bootstrapNonce가 바뀌면 srcdoc를 재생성하여 nonce도 갱신됨
  const useSrcdoc = shouldUseSrcdoc();
  const srcdocContent = useMemo(() => {
    if (!useSrcdoc || !projectId) return null;
    return generatePreviewSrcdoc(projectId, bootstrapNonce);
  }, [useSrcdoc, projectId, bootstrapNonce]);

  // Phase 2.2 최적화: useRef 패턴으로 리스너 재등록 방지
  const onMessageRef = React.useRef(onMessage);

  // onMessage 변경 시 ref만 업데이트 (리스너 재등록 없음)
  React.useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // 메시지 이벤트 리스너 등록 (한 번만)
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      onMessageRef.current(event);
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []); // 빈 의존성 배열 = 마운트 시 한 번만

  return (
    <main className="workSpace">
      <div
        className="canvas"
        data-max-width={currentBreakpoint?.max_width?.toString() || "100%"}
        data-max-height={currentBreakpoint?.max_height?.toString() || "100%"}
        style={{
          width: currentBreakpoint?.max_width || "100%",
          height: currentBreakpoint?.max_height || "100%",
          borderWidth: currentBreakpoint?.id === "screen" ? "0px" : "1px",
        }}
      >
        {/*
         * Preview iframe
         * - srcdoc 모드: 완전히 독립된 Preview Runtime (권장)
         * - src 모드: 기존 방식 (동일 앱 내 /preview 라우트)
         */}
        {useSrcdoc && srcdocContent ? (
          <iframe
            id="previewFrame"
            srcDoc={srcdocContent}
            style={{ width: "100%", height: "100%", border: "none" }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            title="XStudio Preview"
            onLoad={onIframeLoad}
          />
        ) : (
          <iframe
            id="previewFrame"
            src={
              projectId
                ? `/preview/${projectId}?isIframe=true`
                : "/preview?isIframe=true"
            }
            style={{ width: "100%", height: "100%", border: "none" }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            title="XStudio Preview"
            onLoad={onIframeLoad}
          />
        )}
        {children}
      </div>
    </main>
  );
};
