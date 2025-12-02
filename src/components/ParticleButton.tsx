/**
 * ParticleButton - 사막 모래(Sand) 테마 파티클 배경 + 버튼 컴포넌트
 *
 * 공유 모듈을 사용하여 모래바람 효과를 렌더링합니다.
 * ParticleButton 컴포넌트는 호버 시 파티클 배경에 텍스트/SVG를 표시합니다.
 */

/* eslint-disable react-refresh/only-export-components */
import React, { useRef, useCallback } from "react";
import {
  ParticleBackgroundProvider,
  useParticleBackground,
  ParticleCanvas,
  sandPreset,
} from "./particle";
import type { MorphContent } from "./particle";

// ==================== Re-exports for backward compatibility ====================
export { ParticleBackgroundProvider, useParticleBackground };
export type { MorphContent };

// ==================== ParticleBackground (Sand Theme) ====================
export function ParticleBackground() {
  return <ParticleCanvas preset={sandPreset} />;
}

// ==================== ParticleButton Component ====================
interface ParticleButtonProps {
  children: React.ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "default" | "primary" | "secondary" | "surface" | "outline" | "ghost";
  onClick?: () => void;
  className?: string;
}

export function ParticleButton({
  children,
  size = "md",
  variant = "default",
  onClick,
  className = "",
}: ParticleButtonProps) {
  // ParticleBackground.tsx의 useParticleBackground 사용
  const { setHoverContent } = useParticleBackground();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = useCallback(() => {
    // children이 문자열이면 텍스트로 사용
    if (typeof children === "string") {
      setHoverContent({ type: "text", value: children });
      return;
    }

    // React 요소인 경우 (아이콘 등), DOM에서 SVG 추출 시도
    if (React.isValidElement(children) && buttonRef.current) {
      const svgElement = buttonRef.current.querySelector("svg");

      if (svgElement) {
        const svgString = svgElement.outerHTML;
        setHoverContent({ type: "svg", value: svgString });
        return;
      }
    }

    // 배열인 경우 처리
    if (Array.isArray(children)) {
      const firstChild = children[0];
      if (typeof firstChild === "string") {
        setHoverContent({ type: "text", value: firstChild });
        return;
      }

      if (buttonRef.current) {
        const svgElement = buttonRef.current.querySelector("svg");
        if (svgElement) {
          const svgString = svgElement.outerHTML;
          setHoverContent({ type: "svg", value: svgString });
          return;
        }
      }
    }
  }, [children, setHoverContent]);

  const handleMouseLeave = useCallback(() => {
    setHoverContent(null);
  }, [setHoverContent]);

  return (
    <button
      ref={buttonRef}
      className={`particle-button particle-button-${variant} particle-button-${size} ${className}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
  );
}
