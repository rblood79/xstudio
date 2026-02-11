/**
 * panToPage — 페이지 중앙으로 카메라를 부드럽게 이동
 *
 * React 훅에 의존하지 않는 순수 함수로, 좌측 Pages 트리와
 * 캔버스 Workflow 인터랙션 양쪽에서 재사용할 수 있다.
 *
 * @see useWorkflowInteraction.ts — 기존 animateToPage 로직 원본
 */

import { useStore } from '../../../stores';
import { useCanvasSyncStore } from '../canvasSync';
import { getViewportController } from './ViewportController';

const ANIMATE_DURATION_MS = 300;

/** 모듈 레벨 애니메이션 ID — 중복 호출 시 이전 애니메이션 취소 */
let animationRafId: number | null = null;

/**
 * 지정된 페이지가 화면 중앙에 오도록 카메라를 300ms ease-out 애니메이션으로 이동한다.
 */
export function panToPage(pageId: string): void {
  const { pagePositions } = useStore.getState();
  const pos = pagePositions[pageId];
  if (!pos) return;

  const vc = getViewportController();
  if (!vc.isAttached()) return;

  const { zoom, panOffset, containerSize, canvasSize, setPanOffset } = useCanvasSyncStore.getState();

  // 페이지 중심 계산
  const pageCenterX = pos.x + canvasSize.width / 2;
  const pageCenterY = pos.y + canvasSize.height / 2;

  // 화면 중심에 오도록 panOffset 계산
  const targetX = containerSize.width / 2 - pageCenterX * zoom;
  const targetY = containerSize.height / 2 - pageCenterY * zoom;

  const startX = panOffset.x;
  const startY = panOffset.y;
  const startTime = performance.now();

  // 이전 애니메이션 취소
  if (animationRafId !== null) {
    cancelAnimationFrame(animationRafId);
  }

  const animate = () => {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / ANIMATE_DURATION_MS, 1);
    // ease-out: 1 - (1 - t)^3
    const eased = 1 - Math.pow(1 - progress, 3);

    const x = startX + (targetX - startX) * eased;
    const y = startY + (targetY - startY) * eased;

    vc.setPosition(x, y, zoom);
    setPanOffset({ x, y });

    if (progress < 1) {
      animationRafId = requestAnimationFrame(animate);
    } else {
      animationRafId = null;
    }
  };

  animationRafId = requestAnimationFrame(animate);
}

/** 진행 중인 panToPage 애니메이션을 취소한다. */
export function cancelPanToPage(): void {
  if (animationRafId !== null) {
    cancelAnimationFrame(animationRafId);
    animationRafId = null;
  }
}
