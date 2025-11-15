/**
 * useCopyPaste - 범용 Copy/Paste Hook
 *
 * 클립보드 기반 데이터 복사/붙여넣기 기능을 제공하는 재사용 가능한 hook
 * Properties, Styles 등 JSON 직렬화 가능한 모든 데이터에 사용 가능
 *
 * @example
 * ```tsx
 * const { copy, paste } = useCopyPaste({
 *   onPaste: (data) => updateProperties(data),
 *   validate: (data) => typeof data === 'object' && data !== null,
 *   name: 'properties', // For error messages
 * });
 * ```
 */

import { useCallback } from 'react';

export interface UseCopyPasteOptions {
  /** 붙여넣기 성공 시 호출되는 콜백 */
  onPaste: (data: Record<string, unknown>) => void;

  /** 클립보드 데이터 검증 함수 (선택사항) */
  validate?: (data: unknown) => boolean;

  /** 데이터 이름 (에러 메시지용, 선택사항) */
  name?: string;

  /** 데이터 변환 함수 (선택사항, 붙여넣기 전에 데이터 변환) */
  transform?: (data: Record<string, unknown>) => Record<string, unknown>;
}

export interface UseCopyPasteReturn {
  /** 클립보드에 데이터 복사 */
  copy: (data: Record<string, unknown>) => Promise<boolean>;

  /** 클립보드에서 데이터 붙여넣기 */
  paste: () => Promise<boolean>;
}

/**
 * Copy/Paste 기능을 제공하는 hook
 */
export function useCopyPaste({
  onPaste,
  validate,
  name = 'data',
  transform,
}: UseCopyPasteOptions): UseCopyPasteReturn {
  /**
   * 데이터를 클립보드에 복사
   */
  const copy = useCallback(
    async (data: Record<string, unknown>): Promise<boolean> => {
      try {
        const dataJSON = JSON.stringify(data, null, 2);
        // eslint-disable-next-line local/prefer-copy-paste-hook
        await navigator.clipboard.writeText(dataJSON);
        return true;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(`[useCopyPaste] Failed to copy ${name}:`, error);
        }
        return false;
      }
    },
    [name]
  );

  /**
   * 클립보드에서 데이터를 읽어와 붙여넣기
   */
  const paste = useCallback(async (): Promise<boolean> => {
    try {
      // eslint-disable-next-line local/prefer-copy-paste-hook
      const text = await navigator.clipboard.readText();
      const data = JSON.parse(text);

      // 기본 검증: 객체 타입 확인
      if (typeof data !== 'object' || data === null) {
        throw new Error(`Invalid ${name} format: expected object, got ${typeof data}`);
      }

      // 커스텀 검증
      if (validate && !validate(data)) {
        throw new Error(`Invalid ${name} format: failed validation`);
      }

      // 데이터 변환 (선택사항)
      const transformedData = transform ? transform(data) : data;

      // 붙여넣기 콜백 실행
      onPaste(transformedData as Record<string, unknown>);
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(`[useCopyPaste] Failed to paste ${name}:`, error);
      }
      return false;
    }
  }, [name, onPaste, validate, transform]);

  return { copy, paste };
}
