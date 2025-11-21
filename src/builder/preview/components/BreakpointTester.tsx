/**
 * BreakpointTester
 *
 * Preview에서 Breakpoint를 테스트할 수 있는 UI 컴포넌트.
 * 강제로 특정 Breakpoint를 시뮬레이션하거나 현재 Breakpoint를 표시.
 */

import React, { useCallback } from "react";
import { Monitor, Tablet, Smartphone, X } from "lucide-react";
import { useBreakpointContext } from "./BreakpointProvider";
import type { BreakpointName } from "../../../types/builder/responsive.types";
import { BREAKPOINTS, BREAKPOINT_ORDER } from "../../../types/builder/responsive.types";

interface BreakpointTesterProps {
  /** 표시 위치 */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** 컴팩트 모드 (아이콘만 표시) */
  compact?: boolean;
  /** 닫기 버튼 클릭 시 콜백 */
  onClose?: () => void;
}

/**
 * Breakpoint 아이콘 컴포넌트
 */
function BreakpointIcon({ breakpoint, size = 16 }: { breakpoint: BreakpointName; size?: number }) {
  switch (breakpoint) {
    case "desktop":
      return <Monitor size={size} />;
    case "tablet":
      return <Tablet size={size} />;
    case "mobile":
      return <Smartphone size={size} />;
    default:
      return null;
  }
}

/**
 * BreakpointTester Component
 */
export function BreakpointTester({
  position = "bottom-right",
  compact = false,
  onClose,
}: BreakpointTesterProps) {
  const {
    currentBreakpoint,
    forcedBreakpoint,
    viewportWidth,
    setForcedBreakpoint,
  } = useBreakpointContext();

  // Breakpoint 토글 핸들러
  const handleBreakpointClick = useCallback(
    (breakpoint: BreakpointName) => {
      if (forcedBreakpoint === breakpoint) {
        // 같은 Breakpoint 클릭 시 강제 해제
        setForcedBreakpoint(null);
      } else {
        setForcedBreakpoint(breakpoint);
      }
    },
    [forcedBreakpoint, setForcedBreakpoint]
  );

  // 리셋 핸들러
  const handleReset = useCallback(() => {
    setForcedBreakpoint(null);
  }, [setForcedBreakpoint]);

  // 위치 스타일
  const positionStyles: React.CSSProperties = {
    position: "fixed",
    zIndex: 9999,
    ...(position === "top-left" && { top: 8, left: 8 }),
    ...(position === "top-right" && { top: 8, right: 8 }),
    ...(position === "bottom-left" && { bottom: 8, left: 8 }),
    ...(position === "bottom-right" && { bottom: 8, right: 8 }),
  };

  return (
    <div
      className="breakpoint-tester"
      style={{
        ...positionStyles,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 8px",
        background: "rgba(0, 0, 0, 0.8)",
        borderRadius: 8,
        color: "white",
        fontSize: 12,
        fontFamily: "system-ui, sans-serif",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Breakpoint 버튼들 */}
      {BREAKPOINT_ORDER.map((bp) => {
        const isActive = currentBreakpoint === bp;
        const isForced = forcedBreakpoint === bp;
        const config = BREAKPOINTS[bp];

        return (
          <button
            key={bp}
            onClick={() => handleBreakpointClick(bp)}
            title={`${config.label} (${config.minWidth}px${config.maxWidth ? `-${config.maxWidth}px` : "+"})`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: compact ? "4px" : "4px 8px",
              background: isForced
                ? "#3b82f6"
                : isActive
                ? "rgba(255, 255, 255, 0.2)"
                : "transparent",
              border: "none",
              borderRadius: 4,
              color: "white",
              cursor: "pointer",
              transition: "all 0.2s ease",
              opacity: isActive || isForced ? 1 : 0.6,
            }}
          >
            <BreakpointIcon breakpoint={bp} size={14} />
            {!compact && <span>{config.label}</span>}
          </button>
        );
      })}

      {/* 구분선 */}
      <div
        style={{
          width: 1,
          height: 16,
          background: "rgba(255, 255, 255, 0.3)",
          margin: "0 4px",
        }}
      />

      {/* 뷰포트 너비 표시 */}
      <span
        style={{
          fontSize: 11,
          opacity: 0.8,
          minWidth: 45,
          textAlign: "center",
        }}
      >
        {viewportWidth}px
      </span>

      {/* 강제 모드 해제 버튼 */}
      {forcedBreakpoint && (
        <button
          onClick={handleReset}
          title="Reset to auto-detect"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 4,
            background: "rgba(239, 68, 68, 0.8)",
            border: "none",
            borderRadius: 4,
            color: "white",
            cursor: "pointer",
            marginLeft: 4,
          }}
        >
          <X size={12} />
        </button>
      )}

      {/* 닫기 버튼 */}
      {onClose && (
        <button
          onClick={onClose}
          title="Close tester"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 4,
            background: "transparent",
            border: "none",
            borderRadius: 4,
            color: "white",
            cursor: "pointer",
            opacity: 0.6,
            marginLeft: 4,
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

export default BreakpointTester;
