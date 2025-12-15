/**
 * useThemeColors Hook
 *
 * 테마 변경을 감지하고 M3 버튼 색상을 동적으로 제공
 * MutationObserver로 data-theme 속성 변경 감지
 *
 * @since 2025-12-15
 */

import { useState, useEffect, useCallback } from 'react';
import { getM3ButtonColors, type M3ButtonColors } from '../utils/cssVariableReader';

/**
 * 테마 색상을 동적으로 제공하는 hook
 *
 * @example
 * const colors = useThemeColors();
 * // colors.primaryBg, colors.primaryText, etc.
 */
export function useThemeColors(): M3ButtonColors {
  const [colors, setColors] = useState<M3ButtonColors>(() => getM3ButtonColors());

  // 색상 업데이트 함수
  const updateColors = useCallback(() => {
    setColors(getM3ButtonColors());
  }, []);

  useEffect(() => {
    // MutationObserver로 data-theme 속성 변경 감지
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'data-theme' ||
            mutation.attributeName === 'data-builder-theme' ||
            mutation.attributeName === 'class')
        ) {
          // 약간의 딜레이 후 색상 업데이트 (CSS 적용 대기)
          requestAnimationFrame(() => {
            updateColors();
          });
          break;
        }
      }
    });

    // document.documentElement와 body 모두 관찰
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-builder-theme', 'class'],
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-builder-theme', 'class'],
    });

    // prefers-color-scheme 미디어 쿼리 변경 감지
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      requestAnimationFrame(() => {
        updateColors();
      });
    };

    mediaQuery.addEventListener('change', handleMediaChange);

    // Cleanup
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, [updateColors]);

  return colors;
}

export default useThemeColors;
