import React from 'react';
import { Modal as RACModal, ModalOverlayProps, composeRenderProps } from 'react-aria-components';
import { FocusScope } from '@react-aria/focus';
import type { ModalVariant, ComponentSize } from '../types';
import './styles/Modal.css';

export interface ModalProps extends ModalOverlayProps {
  /**
   * M3 variant
   * @default 'primary'
   */
  variant?: ModalVariant;
  /**
   * Size variant
   * @default 'md'
   */
  size?: ComponentSize;
  /**
   * 포커스 트랩 활성화
   * 모달 내부에서만 포커스 이동 가능
   * @default true
   */
  trapFocus?: boolean;
  /**
   * 자동 포커스
   * 모달이 열릴 때 첫 번째 포커스 가능한 요소로 자동 이동
   * @default true
   */
  autoFocus?: boolean;
  /**
   * 포커스 복원
   * 모달이 닫힐 때 이전 포커스 위치로 복원
   * @default true
   */
  restoreFocus?: boolean;
}

/**
 * Modal Component with Material Design 3 support
 *
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size 속성 사용
 *
 * M3 Features:
 * - 5 variants: primary, secondary, tertiary, error, filled
 * - 3 sizes: sm, md, lg
 * - M3 color tokens for consistent theming
 *
 * Features:
 * - Focus trap: Prevents focus from leaving modal
 * - Auto focus: Automatically focuses first element
 * - Focus restoration: Returns focus to trigger element
 * - Keyboard navigation: Supports Tab, Shift+Tab, Escape
 * - ARIA attributes: Proper role and aria-modal
 *
 * @example
 * <Modal variant="primary" size="md" trapFocus autoFocus restoreFocus>
 *   <Dialog>
 *     <Heading>Modal Title</Heading>
 *     <p>Modal content</p>
 *     <Button>Close</Button>
 *   </Dialog>
 * </Modal>
 */
export function Modal({
  variant = 'primary',
  size = 'md',
  trapFocus = true,
  autoFocus = true,
  restoreFocus = true,
  children,
  ...props
}: ModalProps) {
  const modalClassName = composeRenderProps(
    props.className,
    (className) => className ? `react-aria-Modal ${className}` : 'react-aria-Modal'
  );

  return (
    <RACModal {...props} className={modalClassName} data-variant={variant} data-size={size}>
      <FocusScope
        contain={trapFocus}
        autoFocus={autoFocus}
        restoreFocus={restoreFocus}
      >
        {children as React.ReactNode}
      </FocusScope>
    </RACModal>
  );
}
