/**
 * Text Edit Overlay
 *
 * 🚀 Phase 10 B1.5: 텍스트 편집 HTML 오버레이
 *
 * WebGL 캔버스 위에 HTML textarea를 오버레이하여
 * 네이티브 텍스트 편집 기능을 제공합니다.
 *
 * @since 2025-12-11 Phase 10 B1.5
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

// ============================================
// Types
// ============================================

export interface TextEditOverlayProps {
  /** 편집 중인 요소 ID */
  elementId: string;
  /** 현재 텍스트 값 */
  initialValue: string;
  /** 위치 (캔버스 좌표) */
  position: { x: number; y: number };
  /** 크기 */
  size: { width: number; height: number };
  /** 줌 레벨 */
  zoom: number;
  /** 팬 오프셋 */
  panOffset: { x: number; y: number };
  /** 스타일 */
  style?: TextStyleConfig;
  /** 텍스트 변경 콜백 */
  onChange?: (elementId: string, newValue: string) => void;
  /** 편집 완료 콜백 */
  onComplete?: (elementId: string) => void;
  /** 편집 취소 콜백 */
  onCancel?: (elementId: string) => void;
}

export interface TextStyleConfig {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number | string;
  padding?: number;
}

// ============================================
// Component
// ============================================

/**
 * TextEditOverlay
 *
 * 텍스트 요소를 더블클릭하면 나타나는 HTML textarea입니다.
 * WebGL 캔버스 위에 오버레이되어 네이티브 편집 기능을 제공합니다.
 */
export function TextEditOverlay({
  elementId,
  initialValue,
  position,
  size,
  zoom,
  panOffset,
  style = {},
  onChange,
  onComplete,
  onCancel,
}: TextEditOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(initialValue);
  const [isComposing, setIsComposing] = useState(false);

  // 화면 좌표 계산 (캔버스 좌표 → 화면 좌표)
  const screenPosition = {
    x: position.x * zoom + panOffset.x,
    y: position.y * zoom + panOffset.y,
  };

  const screenSize = {
    width: size.width * zoom,
    height: size.height * zoom,
  };

  // 자동 포커스
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  // 텍스트 변경 핸들러
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      onChange?.(elementId, newValue);
    },
    [elementId, onChange]
  );

  // 키보드 핸들러
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // IME 조합 중에는 무시
      if (isComposing) return;

      // Enter (Shift 없이) = 완료
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onComplete?.(elementId);
      }

      // Escape = 취소
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.(elementId);
      }
    },
    [elementId, isComposing, onComplete, onCancel]
  );

  // Blur 핸들러 (포커스 잃으면 완료)
  const handleBlur = useCallback(() => {
    onComplete?.(elementId);
  }, [elementId, onComplete]);

  // IME 조합 상태 추적
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  // 오버레이 스타일
  const overlayStyle: CSSProperties = {
    position: 'absolute',
    left: screenPosition.x,
    top: screenPosition.y,
    width: screenSize.width,
    height: screenSize.height,
    minWidth: 50,
    minHeight: 20,
    padding: (style.padding || 0) * zoom,
    margin: 0,
    border: '2px solid #3b82f6',
    borderRadius: 2,
    outline: 'none',
    resize: 'none',
    overflow: 'hidden',
    backgroundColor: 'white',
    boxSizing: 'border-box',

    // 텍스트 스타일
    fontFamily: style.fontFamily || 'Pretendard, sans-serif',
    fontSize: (style.fontSize || 16) * zoom,
    fontWeight: style.fontWeight || 'normal',
    color: style.color || '#000000',
    textAlign: style.textAlign || 'left',
    lineHeight: style.lineHeight || 1.4,

    // 애니메이션
    transformOrigin: 'top left',
    zIndex: 1000,
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      style={overlayStyle}
      spellCheck={false}
      autoComplete="off"
    />
  );
}

export default TextEditOverlay;
