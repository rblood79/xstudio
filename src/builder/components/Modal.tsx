import { Modal as RACModal, ModalOverlayProps } from 'react-aria-components';
import { FocusScope } from '@react-aria/focus';
import './styles/Modal.css';

export interface ModalProps extends ModalOverlayProps {
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
 * Modal Component with Focus Management
 *
 * Features:
 * - Focus trap: Prevents focus from leaving modal
 * - Auto focus: Automatically focuses first element
 * - Focus restoration: Returns focus to trigger element
 * - Keyboard navigation: Supports Tab, Shift+Tab, Escape
 * - ARIA attributes: Proper role and aria-modal
 *
 * @example
 * <Modal trapFocus autoFocus restoreFocus>
 *   <Dialog>
 *     <Heading>Modal Title</Heading>
 *     <p>Modal content</p>
 *     <Button>Close</Button>
 *   </Dialog>
 * </Modal>
 */
export function Modal({
  trapFocus = true,
  autoFocus = true,
  restoreFocus = true,
  children,
  ...props
}: ModalProps) {
  return (
    <RACModal {...props} className="react-aria-Modal">
      <FocusScope
        contain={trapFocus}
        autoFocus={autoFocus}
        restoreFocus={restoreFocus}
      >
        {children}
      </FocusScope>
    </RACModal>
  );
}
