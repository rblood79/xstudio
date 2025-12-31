/**
 * useToast Hook
 *
 * Toast 알림 상태 관리
 * - 5분 쿨다운으로 중복 알림 방지
 * - 자동 해제 지원
 */

import { useState, useCallback, useRef } from "react";

export type ToastType = "success" | "warning" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

const COOLDOWN_MS = 5 * 60 * 1000; // 5분 쿨다운

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastShownRef = useRef<Map<string, number>>(new Map());

  /**
   * Toast 표시
   * @param type Toast 타입
   * @param message 메시지
   * @param duration 표시 시간 (ms), 0 = 영구
   * @returns Toast ID 또는 null (쿨다운 중인 경우)
   */
  const showToast = useCallback(
    (type: ToastType, message: string, duration = 5000): string | null => {
      // 중복 알림 방지 (동일 메시지 쿨다운)
      const key = `${type}:${message}`;
      const lastShown = lastShownRef.current.get(key);
      const now = Date.now();

      if (lastShown && now - lastShown < COOLDOWN_MS) {
        return null; // 쿨다운 중
      }

      lastShownRef.current.set(key, now);

      const id = `toast-${now}-${Math.random().toString(36).slice(2, 9)}`;
      const toast: Toast = { id, type, message, duration };

      setToasts((prev) => [...prev, toast]);

      // 자동 해제
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }

      return id;
    },
    []
  );

  /**
   * Toast 해제
   */
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * 모든 Toast 해제
   */
  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    dismissToast,
    dismissAll,
  };
}
