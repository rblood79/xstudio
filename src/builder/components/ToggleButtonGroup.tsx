import { useEffect, useRef } from 'react';
import { ToggleButtonGroup as RACToggleButtonGroup, ToggleButtonGroupProps } from 'react-aria-components';
import { clsx } from 'clsx';
import './components.css';

export interface ToggleButtonGroupExtendedProps extends ToggleButtonGroupProps {
  indicator?: boolean;
}

export function ToggleButtonGroup({ indicator = false, ...props }: ToggleButtonGroupExtendedProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!indicator) return;

    const group = groupRef.current;
    if (!group) return;

    const updateIndicator = () => {
      const selectedButton = group.querySelector('[data-selected]') as HTMLElement;
      if (selectedButton) {
        const groupRect = group.getBoundingClientRect();
        const buttonRect = selectedButton.getBoundingClientRect();

        const left = buttonRect.left - groupRect.left;
        const width = buttonRect.width;
        const height = buttonRect.height;

        group.style.setProperty('--indicator-left', `${left}px`);
        group.style.setProperty('--indicator-width', `${width}px`);
        group.style.setProperty('--indicator-height', `${height}px`);
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
  }, [indicator, props.selectedKeys, props.defaultSelectedKeys]);

  return (
    <RACToggleButtonGroup
      {...props}
      ref={groupRef}
      className={clsx(
        'react-aria-ToggleButtonGroup',
        indicator && 'segmented-control',
        props.className
      )}
    />
  );
}
