/**
 * CustomScrollbar Component
 *
 * 브라우저/OS 간 일관된 디자인의 커스텀 스크롤바 컴포넌트
 *
 * 기능:
 * - 미니멀한 스크롤바 디자인 (hover 시 확장)
 * - 스크롤 가능 영역 표시 (상단/하단 그라데이션 페이드)
 * - Scroll snap 지원
 * - 부드러운 스크롤
 * - 다크 모드 지원
 */

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from "react";
import "./styles/CustomScrollbar.css";

export type ScrollSnapType = "none" | "mandatory" | "proximity";
export type ScrollSnapAlign = "start" | "center" | "end";

interface CustomScrollbarProps {
  children: ReactNode;
  /** 최대 높이 (overflow 발생 시 스크롤) */
  maxHeight?: string | number;
  /** 최대 너비 (수평 스크롤 필요 시) */
  maxWidth?: string | number;
  /** 상단/하단 그라데이션 페이드 표시 */
  showFade?: boolean;
  /** 페이드 높이 */
  fadeHeight?: number;
  /** Scroll snap 타입 */
  scrollSnap?: ScrollSnapType;
  /** Scroll snap 정렬 (자식 요소에 적용) */
  scrollSnapAlign?: ScrollSnapAlign;
  /** 수평 스크롤 활성화 */
  horizontal?: boolean;
  /** 추가 className */
  className?: string;
  /** 추가 style */
  style?: CSSProperties;
  /** 스크롤 이벤트 콜백 */
  onScroll?: (scrollTop: number, scrollHeight: number) => void;
  /** 스크롤 컨테이너 ref 노출 */
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

export function CustomScrollbar({
  children,
  maxHeight,
  maxWidth,
  showFade = true,
  fadeHeight = 32,
  scrollSnap = "none",
  scrollSnapAlign,
  horizontal = false,
  className = "",
  style,
  onScroll,
  scrollRef,
}: CustomScrollbarProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = scrollRef || internalRef;

  const [scrollState, setScrollState] = useState({
    canScrollUp: false,
    canScrollDown: false,
    canScrollLeft: false,
    canScrollRight: false,
    isScrolling: false,
  });

  // 스크롤 상태 업데이트
  const updateScrollState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const {
      scrollTop,
      scrollHeight,
      clientHeight,
      scrollLeft,
      scrollWidth,
      clientWidth,
    } = container;

    // 1px 여유를 두어 부동소수점 오차 방지
    const threshold = 1;

    setScrollState((prev) => {
      const newState = {
        canScrollUp: scrollTop > threshold,
        canScrollDown: scrollTop + clientHeight < scrollHeight - threshold,
        canScrollLeft: scrollLeft > threshold,
        canScrollRight: scrollLeft + clientWidth < scrollWidth - threshold,
        isScrolling: prev.isScrolling,
      };

      // 상태가 동일하면 업데이트 하지 않음
      if (
        prev.canScrollUp === newState.canScrollUp &&
        prev.canScrollDown === newState.canScrollDown &&
        prev.canScrollLeft === newState.canScrollLeft &&
        prev.canScrollRight === newState.canScrollRight
      ) {
        return prev;
      }

      return newState;
    });

    onScroll?.(scrollTop, scrollHeight);
  }, [containerRef, onScroll]);

  // 초기 로드 및 리사이즈 시 스크롤 상태 업데이트
  useEffect(() => {
    updateScrollState();

    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      updateScrollState();
    });

    resizeObserver.observe(container);

    // children이 변경될 때도 업데이트
    const mutationObserver = new MutationObserver(() => {
      updateScrollState();
    });

    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [containerRef, updateScrollState]);

  // 스크롤 이벤트 핸들러
  const handleScroll = useCallback(() => {
    updateScrollState();

    // 스크롤 중 상태 표시
    setScrollState((prev) => ({ ...prev, isScrolling: true }));

    // 스크롤 끝난 후 상태 리셋
    const container = containerRef.current;
    if (container) {
      const timeoutId = setTimeout(() => {
        setScrollState((prev) => ({ ...prev, isScrolling: false }));
      }, 150);

      return () => clearTimeout(timeoutId);
    }
  }, [containerRef, updateScrollState]);

  // scroll snap 스타일 계산
  const scrollSnapStyle: CSSProperties = {};
  if (scrollSnap !== "none") {
    scrollSnapStyle.scrollSnapType = horizontal
      ? `x ${scrollSnap}`
      : `y ${scrollSnap}`;
  }

  // 컨테이너 스타일 계산
  const containerStyle: CSSProperties = {
    ...style,
    ...scrollSnapStyle,
    maxHeight: maxHeight,
    maxWidth: maxWidth,
    "--fade-height": `${fadeHeight}px`,
  } as CSSProperties;

  // 클래스명 조합
  const containerClassName = [
    "custom-scrollbar",
    horizontal ? "custom-scrollbar--horizontal" : "",
    scrollState.isScrolling ? "custom-scrollbar--scrolling" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // 페이드 표시 여부
  const showTopFade = showFade && scrollState.canScrollUp;
  const showBottomFade = showFade && scrollState.canScrollDown;
  const showLeftFade = showFade && horizontal && scrollState.canScrollLeft;
  const showRightFade = showFade && horizontal && scrollState.canScrollRight;

  return (
    <div className="custom-scrollbar-wrapper">
      {/* 상단/좌측 페이드 인디케이터 */}
      {showTopFade && (
        <div
          className="custom-scrollbar-fade custom-scrollbar-fade--top"
          style={{ height: fadeHeight }}
          aria-hidden="true"
        />
      )}
      {showLeftFade && (
        <div
          className="custom-scrollbar-fade custom-scrollbar-fade--left"
          style={{ width: fadeHeight }}
          aria-hidden="true"
        />
      )}

      {/* 스크롤 컨테이너 */}
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={containerClassName}
        style={containerStyle}
        onScroll={handleScroll}
        data-scroll-snap-align={scrollSnapAlign}
      >
        {children}
      </div>

      {/* 하단/우측 페이드 인디케이터 */}
      {showBottomFade && (
        <div
          className="custom-scrollbar-fade custom-scrollbar-fade--bottom"
          style={{ height: fadeHeight }}
          aria-hidden="true"
        />
      )}
      {showRightFade && (
        <div
          className="custom-scrollbar-fade custom-scrollbar-fade--right"
          style={{ width: fadeHeight }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/**
 * Scroll Snap Item - scroll snap 대상 아이템 래퍼
 */
interface ScrollSnapItemProps {
  children: ReactNode;
  align?: ScrollSnapAlign;
  className?: string;
  style?: CSSProperties;
}

export function ScrollSnapItem({
  children,
  align = "start",
  className = "",
  style,
}: ScrollSnapItemProps) {
  return (
    <div
      className={`scroll-snap-item ${className}`}
      style={{
        ...style,
        scrollSnapAlign: align,
      }}
    >
      {children}
    </div>
  );
}

export default CustomScrollbar;
