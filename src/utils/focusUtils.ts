/**
 * Focus Management Utilities using @react-aria/focus
 *
 * This module provides comprehensive focus management utilities with:
 * - Focus ring visibility management
 * - Focus scope and trap implementation
 * - Focusable element discovery
 * - Keyboard navigation helpers
 * - Focus restoration
 */

import {
  useFocusRing,
  useFocusManager,
  getFocusableTreeWalker,
  FocusScope,
} from '@react-aria/focus';

// ============================================================================
// Re-export Core Hooks
// ============================================================================

/**
 * Hook for managing focus ring visibility
 * Returns focus ring props and visibility state
 *
 * @example
 * const { focusProps, isFocusVisible } = useFocusRing();
 * <button {...focusProps} data-focus-visible={isFocusVisible}>
 *   Click me
 * </button>
 */
export { useFocusRing };

/**
 * Hook for managing focus within a scope
 * Returns focus manager for programmatic focus control
 *
 * @example
 * const focusManager = useFocusManager();
 * focusManager?.focusNext(); // Focus next element
 * focusManager?.focusPrevious(); // Focus previous element
 */
export { useFocusManager };

/**
 * FocusScope component for focus containment
 *
 * @example
 * <FocusScope contain autoFocus restoreFocus>
 *   {children}
 * </FocusScope>
 */
export { FocusScope };

// ============================================================================
// Focusable Element Discovery
// ============================================================================

/**
 * Find all focusable elements within a container
 * @param container - Container element to search within
 * @returns Array of focusable HTML elements
 * @example
 * const focusableElements = findFocusableElements(modalRef.current);
 * console.log(`Found ${focusableElements.length} focusable elements`);
 */
export const findFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const walker = getFocusableTreeWalker(container);
  const elements: HTMLElement[] = [];

  let node = walker.firstChild();
  while (node) {
    elements.push(node as HTMLElement);
    node = walker.nextSibling();
  }

  return elements;
};

/**
 * Get the first focusable element in a container
 * @param container - Container element
 * @returns First focusable element or null
 * @example
 * const firstElement = getFirstFocusable(dialogRef.current);
 * firstElement?.focus();
 */
export const getFirstFocusable = (container: HTMLElement): HTMLElement | null => {
  const walker = getFocusableTreeWalker(container);
  return walker.firstChild() as HTMLElement | null;
};

/**
 * Get the last focusable element in a container
 * @param container - Container element
 * @returns Last focusable element or null
 * @example
 * const lastElement = getLastFocusable(dialogRef.current);
 * lastElement?.focus();
 */
export const getLastFocusable = (container: HTMLElement): HTMLElement | null => {
  const walker = getFocusableTreeWalker(container);
  return walker.lastChild() as HTMLElement | null;
};

/**
 * Check if an element is focusable
 * @param element - Element to check
 * @returns True if element is focusable
 */
export const isFocusable = (element: HTMLElement): boolean => {
  const focusableElements = findFocusableElements(element.parentElement || document.body);
  return focusableElements.includes(element);
};

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Focus the first element in a container
 * @param container - Container element
 * @param options - Focus options
 * @returns True if focus was successful
 */
export const focusFirst = (
  container: HTMLElement,
  options?: FocusOptions
): boolean => {
  const firstElement = getFirstFocusable(container);
  if (firstElement) {
    firstElement.focus(options);
    return true;
  }
  return false;
};

/**
 * Focus the last element in a container
 * @param container - Container element
 * @param options - Focus options
 * @returns True if focus was successful
 */
export const focusLast = (
  container: HTMLElement,
  options?: FocusOptions
): boolean => {
  const lastElement = getLastFocusable(container);
  if (lastElement) {
    lastElement.focus(options);
    return true;
  }
  return false;
};

/**
 * Save current focus for later restoration
 * @returns Function to restore focus
 * @example
 * const restoreFocus = saveFocus();
 * // ... do something that changes focus
 * restoreFocus(); // Restore to original element
 */
export const saveFocus = (): (() => void) => {
  const activeElement = document.activeElement as HTMLElement | null;

  return () => {
    if (activeElement && typeof activeElement.focus === 'function') {
      activeElement.focus();
    }
  };
};

/**
 * Move focus to next focusable element
 * @param current - Current focused element
 * @param wrap - Whether to wrap to first element
 * @returns True if focus moved successfully
 */
export const focusNext = (
  current: HTMLElement,
  wrap: boolean = false
): boolean => {
  const container = current.closest('[data-focus-scope]') || document.body;
  const focusable = findFocusableElements(container as HTMLElement);
  const currentIndex = focusable.indexOf(current);

  if (currentIndex === -1) return false;

  const nextIndex = currentIndex + 1;
  if (nextIndex < focusable.length) {
    focusable[nextIndex].focus();
    return true;
  } else if (wrap && focusable.length > 0) {
    focusable[0].focus();
    return true;
  }

  return false;
};

/**
 * Move focus to previous focusable element
 * @param current - Current focused element
 * @param wrap - Whether to wrap to last element
 * @returns True if focus moved successfully
 */
export const focusPrevious = (
  current: HTMLElement,
  wrap: boolean = false
): boolean => {
  const container = current.closest('[data-focus-scope]') || document.body;
  const focusable = findFocusableElements(container as HTMLElement);
  const currentIndex = focusable.indexOf(current);

  if (currentIndex === -1) return false;

  const prevIndex = currentIndex - 1;
  if (prevIndex >= 0) {
    focusable[prevIndex].focus();
    return true;
  } else if (wrap && focusable.length > 0) {
    focusable[focusable.length - 1].focus();
    return true;
  }

  return false;
};

// ============================================================================
// Focus Trap
// ============================================================================

/**
 * Create a focus trap within a container
 * @param container - Container to trap focus within
 * @param options - Trap options
 * @returns Function to deactivate trap
 * @example
 * const deactivate = createFocusTrap(modalRef.current, { autoFocus: true });
 * // When done:
 * deactivate();
 */
export const createFocusTrap = (
  container: HTMLElement,
  options: {
    autoFocus?: boolean;
    restoreFocus?: boolean;
    onEscape?: () => void;
  } = {}
): (() => void) => {
  const { autoFocus = true, restoreFocus = true, onEscape } = options;

  // Save current focus for restoration
  const previousFocus = restoreFocus ? document.activeElement as HTMLElement : null;

  // Auto focus first element
  if (autoFocus) {
    focusFirst(container);
  }

  // Handle Tab key
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      const focusable = findFocusableElements(container);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (e.shiftKey) {
        // Shift+Tab
        if (activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    } else if (e.key === 'Escape' && onEscape) {
      e.preventDefault();
      onEscape();
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Return deactivate function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
    if (restoreFocus && previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
  };
};

// ============================================================================
// Debugging Utilities
// ============================================================================

/**
 * Debug focus order in a container
 * Logs all focusable elements and their tab index
 * @param container - Container to debug
 * @returns Array of focusable elements with metadata
 */
export const debugFocusOrder = (container: HTMLElement = document.body): Array<{
  element: HTMLElement;
  tagName: string;
  id?: string;
  className?: string;
  tabIndex?: number;
  ariaLabel?: string;
}> => {
  const focusable = findFocusableElements(container);

  const metadata = focusable.map((el, index) => ({
    element: el,
    tagName: el.tagName,
    id: el.id || undefined,
    className: el.className || undefined,
    tabIndex: el.tabIndex,
    ariaLabel: el.getAttribute('aria-label') || undefined,
  }));

  console.group('🎯 Focus Order Debug');
  metadata.forEach((item, index) => {
    console.log(`${index + 1}.`, item.tagName, {
      id: item.id,
      className: item.className,
      tabIndex: item.tabIndex,
      'aria-label': item.ariaLabel,
    });
  });
  console.groupEnd();

  return metadata;
};

/**
 * Track focus changes in the document
 * Logs every focus change to console
 * @returns Function to stop tracking
 * @example
 * const stop = trackFocusChanges();
 * // ... interact with the page
 * stop(); // Stop tracking
 */
export const trackFocusChanges = (): (() => void) => {
  let previousFocus: Element | null = null;

  const handleFocusIn = (e: FocusEvent) => {
    console.log('🎯 Focus changed:', {
      from: previousFocus,
      to: e.target,
      timestamp: new Date().toISOString(),
    });
    previousFocus = e.target as Element;
  };

  document.addEventListener('focusin', handleFocusIn);

  return () => {
    document.removeEventListener('focusin', handleFocusIn);
  };
};

/**
 * Highlight all focusable elements visually
 * Useful for debugging focus order
 * @param container - Container to highlight elements in
 * @returns Function to remove highlights
 */
export const highlightFocusable = (
  container: HTMLElement = document.body
): (() => void) => {
  const focusable = findFocusableElements(container);
  const originalStyles = new Map<HTMLElement, string>();

  focusable.forEach((el, index) => {
    originalStyles.set(el, el.style.outline);
    el.style.outline = `2px solid red`;
    el.setAttribute('data-focus-index', String(index + 1));
  });

  return () => {
    focusable.forEach((el) => {
      const originalStyle = originalStyles.get(el);
      if (originalStyle !== undefined) {
        el.style.outline = originalStyle;
      }
      el.removeAttribute('data-focus-index');
    });
  };
};

// ============================================================================
// Accessibility Helpers
// ============================================================================

/**
 * Check if element is currently focused
 */
export const isFocused = (element: HTMLElement): boolean => {
  return document.activeElement === element;
};

/**
 * Check if any element within container is focused
 */
export const hasFocus = (container: HTMLElement): boolean => {
  return container.contains(document.activeElement);
};

/**
 * Get currently focused element
 */
export const getFocusedElement = (): HTMLElement | null => {
  return document.activeElement as HTMLElement | null;
};
