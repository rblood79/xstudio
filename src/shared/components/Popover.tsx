import {
  Dialog,
  OverlayArrow,
  Popover as AriaPopover,
  PopoverProps as AriaPopoverProps
} from 'react-aria-components';
import { FocusScope } from '@react-aria/focus';
import { tv } from 'tailwind-variants';
import { composeRenderProps } from 'react-aria-components';
import type { PopoverVariant, ComponentSize } from '../../types/componentVariants';

import './styles/Popover.css';

export interface PopoverProps extends Omit<AriaPopoverProps, 'children'> {
  children: React.ReactNode;
  /**
   * M3 variant
   * @default 'primary'
   */
  variant?: PopoverVariant;
  /**
   * Size variant
   * @default 'md'
   */
  size?: ComponentSize;
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

const popoverStyles = tv({
  base: 'react-aria-Popover',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      tertiary: 'tertiary',
      error: 'error',
      filled: 'filled',
      surface: 'surface',
    },
    size: {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

/**
 * Popover Component with Material Design 3 support
 *
 * M3 Features:
 * - 5 variants: primary, secondary, tertiary, error, filled
 * - 3 sizes: sm, md, lg
 * - M3 color tokens for consistent theming
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
 *   <Popover variant="primary" size="md">
 *     <p>Popover content</p>
 *   </Popover>
 * </DialogTrigger>
 */
export function Popover({
  children,
  variant = 'primary',
  size = 'md',
  showArrow = true,
  containFocus = false,
  autoFocus = true,
  restoreFocus = true,
  ...props
}: PopoverProps) {
  const popoverClassName = composeRenderProps(
    props.className,
    (className, renderProps) => {
      return popoverStyles({
        ...renderProps,
        variant,
        size,
        className,
      });
    }
  );

  return (
    <AriaPopover {...props} className={popoverClassName}>
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
