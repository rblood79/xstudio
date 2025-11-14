/**
 * useThemeMessenger - 테마 관련 Preview 통신 전용 훅
 *
 * 목적:
 * - 중복 전송 방지
 * - 일관된 에러 처리
 * - 디버깅 로그 통합
 * - 성능 최적화 (메모이제이션, 디바운싱)
 */

import { useCallback, useRef } from 'react';
import { MessageService } from '../../utils/messaging';
import { tokensToCSS } from '../../utils/theme/tokenToCss';
import type { DesignToken } from '../../types/theme';

export interface UseThemeMessengerReturn {
    sendThemeTokens: (tokens: DesignToken[]) => void;
    sendDarkMode: (isDark: boolean) => void;
}

export const useThemeMessenger = (): UseThemeMessengerReturn => {
    const lastSentTokensHashRef = useRef<string>('');
    const lastSentDarkModeRef = useRef<boolean | null>(null);

    /**
     * Preview에 테마 토큰 전송
     * - 중복 방지: 동일한 tokens는 전송하지 않음
     * - 에러 처리 포함
     */
    const sendThemeTokens = useCallback((tokens: DesignToken[]) => {
        // 🔧 중복 방지: 전체 토큰을 직렬화하여 Hash 계산
        // value가 객체일 수 있으므로 JSON.stringify 사용
        const currentHash = JSON.stringify(
            tokens.map(t => ({
                name: t.name,
                value: t.value,
                scope: t.scope
            }))
        );

        if (lastSentTokensHashRef.current === currentHash) {
            return;
        }

        const iframe = MessageService.getIframe();
        if (!iframe?.contentWindow) {
            console.warn('⚠️ [ThemeMessenger] iframe not ready, cannot send theme tokens');
            return;
        }

        try {
            const cssVars = tokensToCSS(tokens);

            iframe.contentWindow.postMessage(
                { type: 'UPDATE_THEME_TOKENS', styles: cssVars },
                window.location.origin
            );

            lastSentTokensHashRef.current = currentHash;
        } catch (error) {
            console.error('❌ [ThemeMessenger] Failed to send theme tokens:', error);
        }
    }, []);

    /**
     * Preview에 다크 모드 상태 전송
     * - 중복 방지: 동일한 상태는 전송하지 않음
     */
    const sendDarkMode = useCallback((isDark: boolean) => {
        // 🔧 중복 방지: 이전 값과 비교
        if (lastSentDarkModeRef.current === isDark) {
            console.log('⏭️ [ThemeMessenger] Duplicate dark mode, skipping send');
            return;
        }

        const iframe = MessageService.getIframe();
        if (!iframe?.contentWindow) {
            console.warn('⚠️ [ThemeMessenger] iframe not ready, cannot send dark mode');
            return;
        }

        try {
            iframe.contentWindow.postMessage(
                { type: 'SET_DARK_MODE', isDark },
                window.location.origin
            );

            lastSentDarkModeRef.current = isDark;

            console.log(`✅ [ThemeMessenger] Sent dark mode to Preview:`, isDark);
        } catch (error) {
            console.error('❌ [ThemeMessenger] Failed to send dark mode:', error);
        }
    }, []);

    return {
        sendThemeTokens,
        sendDarkMode
    };
};
