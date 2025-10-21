import { useEffect, useRef, useMemo } from 'react';
import { ToggleButtonGroup as RACToggleButtonGroup, ToggleButtonGroupProps } from 'react-aria-components';
import { clsx } from 'clsx';
import './styles/ToggleButtonGroup.css';

export interface ToggleButtonGroupExtendedProps extends ToggleButtonGroupProps {
  indicator?: boolean;
}

export function ToggleButtonGroup({ indicator = false, ...props }: ToggleButtonGroupExtendedProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  // Memoize the indicator value to prevent unnecessary re-renders
  const memoizedIndicator = useMemo(() => {
    return indicator;
  }, [indicator]);

  useEffect(() => {
    if (!memoizedIndicator) return;

    const group = groupRef.current;
    if (!group) return;

    const updateIndicator = () => {
      const selectedButton = group.querySelector('[data-selected]') as HTMLElement;
      if (selectedButton) {
        const groupRect = group.getBoundingClientRect();
        const buttonRect = selectedButton.getBoundingClientRect();

        const left = buttonRect.left - groupRect.left;
        const top = buttonRect.top - groupRect.top;
        const width = buttonRect.width;
        const height = buttonRect.height;

        group.style.setProperty('--indicator-left', `${left}px`);
        group.style.setProperty('--indicator-top', `${top}px`);
        group.style.setProperty('--indicator-width', `${width}px`);
        group.style.setProperty('--indicator-height', `${height}px`);
        group.style.setProperty('--indicator-opacity', '1');
      } else {
        // Hide indicator when no button is selected
        group.style.setProperty('--indicator-opacity', '0');
      }
    };

    // Initial update
    updateIndicator();

    // Use MutationObserver to watch for selection changes
    const observer = new MutationObserver(updateIndicator);
    observer.observe(group, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-selected']
    });

    return () => observer.disconnect();
  }, [memoizedIndicator, props.selectedKeys, props.defaultSelectedKeys]);

  return (
    <RACToggleButtonGroup
      {...props}
      ref={groupRef}
      data-indicator={memoizedIndicator ? 'true' : 'false'}
      className={clsx(
        'react-aria-ToggleButtonGroup',
        props.className
      )}
    />
  );
}
