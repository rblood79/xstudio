import { useEffect, useRef, useMemo } from 'react';
import { ToggleButtonGroup as RACToggleButtonGroup, ToggleButtonGroupProps } from 'react-aria-components';
import { clsx } from 'clsx';
import './components.css';

export interface ToggleButtonGroupExtendedProps extends ToggleButtonGroupProps {
  indicator?: boolean;
}

export function ToggleButtonGroup({ indicator = false, ...props }: ToggleButtonGroupExtendedProps) {
  console.log('ToggleButtonGroup rendered with indicator:', indicator, 'Full props:', props);
  const groupRef = useRef<HTMLDivElement>(null);

  // Memoize the indicator value to prevent unnecessary re-renders
  const memoizedIndicator = useMemo(() => {
    console.log('Memoizing indicator:', indicator);
    return indicator;
  }, [indicator]);

  useEffect(() => {
    console.log('Indicator effect triggered', {
      indicator: memoizedIndicator,
      selectedKeys: props.selectedKeys,
      defaultSelectedKeys: props.defaultSelectedKeys
    });
    if (!memoizedIndicator) return;

    const group = groupRef.current;
    if (!group) {
      console.log('Group ref is null');
      return;
    }

    const updateIndicator = () => {
      console.log('Updating indicator');

      const children = group.children;
      console.log('Group children:', children.length);
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        console.log(`Child ${i}:`, {
          selected: child.hasAttribute('data-selected'),
          attributes: Array.from(child.attributes).map(attr => attr.name)
        });
      }

      const selectedButton = group.querySelector('[data-selected]') as HTMLElement;
      if (selectedButton) {
        const groupRect = group.getBoundingClientRect();
        const buttonRect = selectedButton.getBoundingClientRect();

        const left = buttonRect.left - groupRect.left;
        const top = buttonRect.top - groupRect.top;
        const width = buttonRect.width;
        const height = buttonRect.height;

        console.log('Indicator details:', { left, top, width, height });

        group.style.setProperty('--indicator-left', `${left}px`);
        group.style.setProperty('--indicator-top', `${top}px`);
        group.style.setProperty('--indicator-width', `${width}px`);
        group.style.setProperty('--indicator-height', `${height}px`);
      } else {
        console.log('No selected button found');
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
