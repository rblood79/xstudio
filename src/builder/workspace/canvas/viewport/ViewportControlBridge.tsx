/**
 * ViewportControlBridge
 *
 * 🚀 Phase 12 B3.2: Application 내부에서 ViewportController 연결
 *
 * @pixi/react의 Application 내부에서 사용해야 useApplication()이 작동합니다.
 * 이 컴포넌트는 null을 렌더링하며, 순수하게 이벤트 핸들링만 담당합니다.
 *
 * @since 2025-12-12 Phase 12 B3.2
 */

import { useEffect } from 'react';
import { useViewportControl } from './useViewportControl';

export interface ViewportControlBridgeProps {
  /** HTML 컨테이너 요소 (이벤트 바인딩용) */
  containerEl: HTMLElement | null;
  /** Camera Container의 label */
  cameraLabel?: string;
  /** 최소 줌 */
  minZoom?: number;
  /** 최대 줌 */
  maxZoom?: number;
}

/**
 * Application 내부에서 ViewportController를 연결하는 브릿지 컴포넌트
 *
 * 렌더링 출력이 없으며, 순수하게 뷰포트 컨트롤 로직만 처리합니다.
 */
export function ViewportControlBridge({
  containerEl,
  cameraLabel = 'Camera',
  minZoom = 0.1,
  maxZoom = 5,
}: ViewportControlBridgeProps): null {
  // ViewportController 연결 및 이벤트 핸들링
  const { controller } = useViewportControl({
    containerEl,
    cameraLabel,
    minZoom,
    maxZoom,
  });

  // 디버그 로깅 (개발 모드에서만)
  useEffect(() => {
    if (controller && process.env.NODE_ENV === 'development') {
      console.log('[ViewportControlBridge] Controller attached');
    }
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ViewportControlBridge] Controller detached');
      }
    };
  }, [controller]);

  // 렌더링 출력 없음
  return null;
}

export default ViewportControlBridge;
