/**
 * postMessage 보안 검증 유틸리티 — ADR-006 P2-2
 *
 * nonce 기반 2단계 수신 검증:
 * 1. bootstrapNonce: PREVIEW_READY 메시지의 출처 보증 (srcdoc 주입 값 확인)
 * 2. source + origin 이중 검증: 일반 메시지의 위조 방지
 */

import { MessageService } from './messaging';

/**
 * 부트스트랩 메시지 검증 — nonce 기반 출처 보증
 *
 * PREVIEW_READY는 srcdoc에서 window.__bootstrapNonce를 읽어 포함합니다.
 * builder가 생성한 nonce와 일치해야 신뢰할 수 있습니다.
 */
export function isValidBootstrapMessage(
  event: MessageEvent,
  expectedNonce?: string,
): boolean {
  if (event.origin !== window.location.origin) return false;
  if (event.data?.type !== 'PREVIEW_READY') return false;
  // nonce가 제공된 경우에만 nonce 검증, 미제공 시 origin 검증만으로 통과
  if (expectedNonce !== undefined) {
    return event.data?.nonce === expectedNonce;
  }
  return true;
}

/**
 * 일반 메시지 검증 — source + origin 이중 검증
 *
 * source 검증으로 동일 origin 내 다른 창(탭 등)에서 오는 메시지를 차단합니다.
 */
export function isValidPreviewMessage(event: MessageEvent): boolean {
  const iframe = MessageService.getIframe();
  if (!iframe?.contentWindow) return false;
  if (event.source !== iframe.contentWindow) return false;
  if (event.origin !== window.location.origin) return false;
  return true;
}
