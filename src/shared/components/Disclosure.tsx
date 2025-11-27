import {
  Button,
  Disclosure as AriaDisclosure,
  DisclosurePanel,
  DisclosureProps as AriaDisclosureProps,
  Heading,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import type { DisclosureVariant, ComponentSize } from '../../types/componentVariants';

import './styles/Disclosure.css';

export interface DisclosureProps extends Omit<AriaDisclosureProps, 'children'> {
  /**
   * M3 variant
   * @default 'primary'
   */
  variant?: DisclosureVariant;
  /**
   * Size variant
   * @default 'md'
   */
  size?: ComponentSize;
  /**
   * Disclosure title/trigger text
   */
  title?: string;
  /**
   * Content to show when expanded
   */
  children?: React.ReactNode;
}

const disclosureStyles = tv({
  base: 'react-aria-Disclosure',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
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
 * Disclosure Component with Material Design 3 support
 *
 * M3 Features:
 * - 2 variants: primary, secondary
 * - 3 sizes: sm, md, lg
 * - M3 color tokens for consistent theming
 *
 * Features:
 * - Expandable/collapsible content
 * - Animated chevron indicator
 * - Keyboard accessible (Enter, Space to toggle)
 * - ARIA attributes for screen readers
 *
 * @example
 * <Disclosure variant="primary" size="md" title="Show Details">
 *   <p>This content is hidden by default and shown when expanded.</p>
 * </Disclosure>
 */
export function Disclosure({ variant = 'primary', size = 'md', title, children, ...props }: DisclosureProps) {
  const disclosureClassName = composeRenderProps(
    props.className,
    (className, renderProps) => {
      return disclosureStyles({ ...renderProps, variant, size, className });
    }
  );

  return (
    <AriaDisclosure {...props} className={disclosureClassName}>
      <Heading>
        <Button slot="trigger">
          <svg viewBox="0 0 24 24" className="disclosure-chevron">
            <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          {title}
        </Button>
      </Heading>
      <DisclosurePanel>
        <p>{children}</p>
      </DisclosurePanel>
    </AriaDisclosure>
  );
}
