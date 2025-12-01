// src/components/ParticleButton.tsx
import { useRef, useCallback, forwardRef } from "react";
import { Button, ButtonProps } from "../shared/components/list";
import { useParticleBackground } from "./ParticleBackground";

export interface ParticleButtonProps extends ButtonProps {
  /** 파티클 효과에 사용할 텍스트 (SVG가 없을 경우 사용) */
  particleText?: string;
}

/**
 * 파티클 배경 효과와 연동되는 버튼 컴포넌트
 *
 * 버튼 내부의 Lucide 아이콘(SVG)을 자동으로 감지하여
 * hover 시 파티클 효과에 전달합니다.
 *
 * @example
 * ```tsx
 * <ParticleButton>
 *   <SquarePlus />
 * </ParticleButton>
 * ```
 */
export const ParticleButton = forwardRef<HTMLButtonElement, ParticleButtonProps>(
  function ParticleButton({ particleText, onHoverStart, onHoverEnd, children, ...props }, forwardedRef) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const { setHoverContent } = useParticleBackground();

    // ref를 합침
    const setRefs = useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef]
    );

    const handleMouseEnter = useCallback(
      () => {
        // 버튼 내부의 SVG 요소 찾기
        const svgElement = buttonRef.current?.querySelector("svg");

        if (svgElement) {
          // SVG의 outerHTML을 복제하여 사용
          const svgString = svgElement.outerHTML;
          setHoverContent({ type: "svg", value: svgString });
        } else if (particleText) {
          // SVG가 없으면 텍스트 사용
          setHoverContent({ type: "text", value: particleText });
        }

        // 기존 onHoverStart 핸들러 호출
        onHoverStart?.(true);
      },
      [setHoverContent, particleText, onHoverStart]
    );

    const handleMouseLeave = useCallback(
      () => {
        setHoverContent(null);

        // 기존 onHoverEnd 핸들러 호출
        onHoverEnd?.(false);
      },
      [setHoverContent, onHoverEnd]
    );

    return (
      <Button
        ref={setRefs}
        {...props}
        onHoverStart={handleMouseEnter as unknown as (isHovering: boolean) => void}
        onHoverEnd={handleMouseLeave as unknown as (isHovering: boolean) => void}
      >
        {children}
      </Button>
    );
  }
);
