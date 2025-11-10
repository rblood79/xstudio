import {
  Dialog,
  OverlayArrow,
  Popover as AriaPopover,
  PopoverProps as AriaPopoverProps
} from 'react-aria-components';
import { FocusScope } from '@react-aria/focus';

import './styles/Popover.css';

export interface PopoverProps extends Omit<AriaPopoverProps, 'children'> {
  children: React.ReactNode;
  /**
   * 화살표 표시 여부
   * @default true
   */
  showArrow?: boolean;
  /**
   * 포커스 제약
   * Popover 내부에서만 포커스 이동 가능
   * @default false
   */
  containFocus?: boolean;
  /**
   * 자동 포커스
   * Popover가 열릴 때 첫 번째 요소로 자동 이동
   * @default true
   */
  autoFocus?: boolean;
  /**
   * 포커스 복원
   * Popover가 닫힐 때 이전 포커스 위치로 복원
   * @default true
   */
  restoreFocus?: boolean;
}

/**
 * Popover Component with Focus Management
 *
 * Features:
 * - Automatic focus management
 * - Optional focus containment
 * - Focus restoration on close
 * - Keyboard navigation (Tab, Shift+Tab, Escape)
 * - Customizable arrow indicator
 *
 * @example
 * <DialogTrigger>
 *   <Button>Open Popover</Button>
 *   <Popover>
 *     <p>Popover content</p>
 *   </Popover>
 * </DialogTrigger>
 */
export function Popover({
  children,
  showArrow = true,
  containFocus = false,
  autoFocus = true,
  restoreFocus = true,
  ...props
}: PopoverProps) {
  return (
    <AriaPopover {...props} className="react-aria-Popover">
      {showArrow && (
        <OverlayArrow>
          <svg width={12} height={12} viewBox="0 0 12 12">
            <path d="M0 0 L6 6 L12 0" />
          </svg>
        </OverlayArrow>
      )}
      <Dialog>
        <FocusScope
          contain={containFocus}
          autoFocus={autoFocus}
          restoreFocus={restoreFocus}
        >
          {children}
        </FocusScope>
      </Dialog>
    </AriaPopover>
  );
}
