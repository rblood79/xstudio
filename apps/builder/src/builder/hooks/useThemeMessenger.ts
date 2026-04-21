/**
 * useThemeMessenger - 테마 관련 Preview 통신 전용 훅
 *
 * 목적:
 * - 중복 전송 방지
 * - 일관된 에러 처리
 * - 디버깅 로그 통합
 * - 성능 최적화 (메모이제이션, 디바운싱)
 *
 * 🚀 Phase 11: WebGL-only 모드에서는 postMessage 스킵
 */

import { useCallback, useRef } from "react";
import { MessageService } from "../../utils/messaging";
import { tokensToCSS } from "../../utils/theme/tokenToCss";
import type { DesignToken } from "../../types/theme";
// 🚀 Phase 11: Feature Flags for WebGL-only mode
import { isWebGLCanvas, isCanvasCompareMode } from "../../utils/featureFlags";
// ADR-056 Phase 3: Base Typography SSOT → Preview 동기화
import type { BaseTypography } from "../fonts/customFonts";

export interface UseThemeMessengerReturn {
  sendThemeTokens: (tokens: DesignToken[]) => void;
  sendDarkMode: (isDark: boolean) => void;
  sendBaseTypography: (typography: BaseTypography) => void;
}

export const useThemeMessenger = (): UseThemeMessengerReturn => {
  // 🚀 Phase 11: WebGL-only 모드 체크
  const isWebGLOnly = isWebGLCanvas() && !isCanvasCompareMode();

  const lastSentTokensHashRef = useRef<string>("");
  const lastSentDarkModeRef = useRef<boolean | null>(null);
  const lastSentBaseTypographyHashRef = useRef<string>("");

  /**
   * Preview에 테마 토큰 전송
   * - 중복 방지: 동일한 tokens는 전송하지 않음
   * - 에러 처리 포함
   * - 🚀 Phase 11: WebGL-only 모드에서는 스킵
   */
  const sendThemeTokens = useCallback(
    (tokens: DesignToken[]) => {
      // 🚀 Phase 11: WebGL-only 모드에서는 iframe 통신 불필요
      if (isWebGLOnly) return;

      // 🔧 중복 방지: 전체 토큰을 직렬화하여 Hash 계산
      // value가 객체일 수 있으므로 JSON.stringify 사용
      const currentHash = JSON.stringify(
        tokens.map((t) => ({
          name: t.name,
          value: t.value,
          scope: t.scope,
        })),
      );

      if (lastSentTokensHashRef.current === currentHash) {
        return;
      }

      const iframe = MessageService.getIframe();
      if (!iframe?.contentWindow) {
        console.warn(
          "⚠️ [ThemeMessenger] iframe not ready, cannot send theme tokens",
        );
        return;
      }

      try {
        const cssVars = tokensToCSS(tokens);

        iframe.contentWindow.postMessage(
          { type: "UPDATE_THEME_TOKENS", styles: cssVars },
          window.location.origin,
        );

        lastSentTokensHashRef.current = currentHash;
      } catch (error) {
        console.error(
          "❌ [ThemeMessenger] Failed to send theme tokens:",
          error,
        );
      }
    },
    [isWebGLOnly],
  );

  /**
   * Preview에 다크 모드 상태 전송
   * - 중복 방지: 동일한 상태는 전송하지 않음
   * - 🚀 Phase 11: WebGL-only 모드에서는 스킵
   */
  const sendDarkMode = useCallback(
    (isDark: boolean) => {
      // 🚀 Phase 11: WebGL-only 모드에서는 iframe 통신 불필요
      if (isWebGLOnly) return;

      // 🔧 중복 방지: 이전 값과 비교
      if (lastSentDarkModeRef.current === isDark) {
        console.log("⏭️ [ThemeMessenger] Duplicate dark mode, skipping send");
        return;
      }

      const iframe = MessageService.getIframe();
      if (!iframe?.contentWindow) {
        console.warn(
          "⚠️ [ThemeMessenger] iframe not ready, cannot send dark mode",
        );
        return;
      }

      try {
        iframe.contentWindow.postMessage(
          { type: "SET_DARK_MODE", isDark },
          window.location.origin,
        );

        lastSentDarkModeRef.current = isDark;

        console.log(`✅ [ThemeMessenger] Sent dark mode to Preview:`, isDark);
      } catch (error) {
        console.error("❌ [ThemeMessenger] Failed to send dark mode:", error);
      }
    },
    [isWebGLOnly],
  );

  /**
   * Preview에 Base Typography (font-family / font-size / line-height) 전송
   * - ADR-056 Phase 3: themeConfigStore.baseTypography → Preview body 동기화
   * - 중복 방지: 동일한 typography는 전송하지 않음
   * - 🚀 Phase 11: WebGL-only 모드에서는 스킵
   */
  const sendBaseTypography = useCallback(
    (typography: BaseTypography) => {
      if (isWebGLOnly) return;

      const currentHash = JSON.stringify(typography);
      if (lastSentBaseTypographyHashRef.current === currentHash) {
        return;
      }

      const iframe = MessageService.getIframe();
      if (!iframe?.contentWindow) {
        console.warn(
          "⚠️ [ThemeMessenger] iframe not ready, cannot send base typography",
        );
        return;
      }

      try {
        iframe.contentWindow.postMessage(
          { type: "THEME_BASE_TYPOGRAPHY", payload: typography },
          window.location.origin,
        );

        lastSentBaseTypographyHashRef.current = currentHash;
      } catch (error) {
        console.error(
          "❌ [ThemeMessenger] Failed to send base typography:",
          error,
        );
      }
    },
    [isWebGLOnly],
  );

  return {
    sendThemeTokens,
    sendDarkMode,
    sendBaseTypography,
  };
};
