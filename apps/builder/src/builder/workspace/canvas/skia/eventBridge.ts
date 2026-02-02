/**
 * @deprecated 현재 아키텍처에서는 미사용.
 * PixiJS 캔버스를 z-index:3으로 Skia 위에 배치하여 직접 이벤트를 받으므로
 * 이벤트 브리징이 불필요하다. 향후 아키텍처 변경 시 재활용 가능.
 *
 * DOM 이벤트 브리징: CanvasKit 캔버스 → PixiJS 캔버스
 *
 * CanvasKit 캔버스가 화면 위(z-index: 2)에 위치하므로
 * 모든 DOM 이벤트는 CanvasKit 캔버스에서 발생한다.
 * 이 이벤트를 PixiJS 캔버스(z-index: 1, hidden)로 재디스패치하여
 * PixiJS EventSystem → EventBoundary 히트테스트가 정상 동작하게 한다.
 *
 * ⚠️ FederatedPointerEvent 직접 생성 금지 (PixiJS 내부 API).
 *    DOM 표준 이벤트만 재디스패치한다.
 *
 * @see docs/WASM.md §5.9 이벤트 브리징
 */

/** 브리징 대상 이벤트 타입 */
const FORWARDED_EVENTS = [
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'pointerenter',
  'pointerleave',
  'pointerover',
  'pointerout',
  'wheel',
  'click',
  'dblclick',
  'contextmenu',
] as const;

/** preventDefault()를 호출해야 하는 이벤트 (스크롤/터치 기본 동작 방지) */
const PREVENT_DEFAULT_TYPES = new Set<string>([
  'wheel',
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
]);

/** passive: false가 필요한 이벤트 (preventDefault() 호출을 위해) */
const NON_PASSIVE_TYPES = new Set<string>([
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'wheel',
]);

/**
 * CanvasKit 캔버스의 DOM 이벤트를 PixiJS 캔버스로 재디스패치한다.
 *
 * @param source - CanvasKit 캔버스 (이벤트 수신)
 * @param target - PixiJS 캔버스 (이벤트 전달 대상)
 * @returns cleanup 함수 — 컴포넌트 언마운트 시 호출
 */
export function bridgeEvents(
  source: HTMLCanvasElement,
  target: HTMLCanvasElement,
): () => void {
  const cleanups: Array<() => void> = [];

  for (const eventType of FORWARDED_EVENTS) {
    const handler = (e: Event) => {
      const clone = cloneEvent(e);
      target.dispatchEvent(clone);

      if (PREVENT_DEFAULT_TYPES.has(eventType)) {
        e.preventDefault();
      }
    };

    const options: AddEventListenerOptions | undefined =
      NON_PASSIVE_TYPES.has(eventType)
        ? { passive: false }
        : undefined;

    source.addEventListener(eventType, handler, options);

    cleanups.push(() => {
      source.removeEventListener(eventType, handler, options);
    });
  }

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
    cleanups.length = 0;
  };
}

/**
 * DOM 이벤트를 복제한다.
 *
 * 생성자 클론을 우선 시도하고, 실패 시 타입별 수동 매핑으로 폴백한다.
 */
function cloneEvent(e: Event): Event {
  // PointerEvent
  if (typeof PointerEvent !== 'undefined' && e instanceof PointerEvent) {
    return new PointerEvent(e.type, {
      bubbles: e.bubbles,
      cancelable: e.cancelable,
      composed: e.composed,
      clientX: e.clientX,
      clientY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      width: e.width,
      height: e.height,
      pressure: e.pressure,
      tiltX: e.tiltX,
      tiltY: e.tiltY,
      twist: e.twist,
      isPrimary: e.isPrimary,
      button: e.button,
      buttons: e.buttons,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    });
  }

  // WheelEvent
  if (typeof WheelEvent !== 'undefined' && e instanceof WheelEvent) {
    return new WheelEvent(e.type, {
      bubbles: e.bubbles,
      cancelable: e.cancelable,
      composed: e.composed,
      clientX: e.clientX,
      clientY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      deltaZ: e.deltaZ,
      deltaMode: e.deltaMode,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    });
  }

  // MouseEvent
  if (typeof MouseEvent !== 'undefined' && e instanceof MouseEvent) {
    return new MouseEvent(e.type, {
      bubbles: e.bubbles,
      cancelable: e.cancelable,
      composed: e.composed,
      clientX: e.clientX,
      clientY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      button: e.button,
      buttons: e.buttons,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    });
  }

  // 기본 Event 폴백
  return new Event(e.type, {
    bubbles: e.bubbles,
    cancelable: e.cancelable,
    composed: e.composed,
  });
}
