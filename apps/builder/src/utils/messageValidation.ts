/**
 * postMessage 보안 검증 유틸리티
 *
 * src iframe은 부모와 동일한 origin을 공유하므로
 * source + origin 이중 검증으로 메시지 위조를 방지합니다.
 */

import { MessageService } from "./messaging";

/**
 * 부트스트랩 메시지 검증 (PREVIEW_READY)
 *
 * Preview iframe이 준비 완료 시 전송하는 메시지를 검증합니다.
 * origin 검증으로 신뢰할 수 있는 출처인지 확인합니다.
 */
export function isValidBootstrapMessage(event: MessageEvent): boolean {
  if (event.origin !== window.location.origin) return false;
  if (event.data?.type !== "PREVIEW_READY") return false;
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
