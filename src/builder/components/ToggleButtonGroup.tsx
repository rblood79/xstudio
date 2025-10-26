import { useEffect, useRef, useMemo } from 'react';
import { ToggleButton as RACToggleButton, ToggleButtonGroup as RACToggleButtonGroup, ToggleButtonGroupProps } from 'react-aria-components';
import { clsx } from 'clsx';
import type { DataBinding, ColumnMapping } from '../../types/unified';
import { useCollectionData } from '../hooks/useCollectionData';
import './styles/ToggleButtonGroup.css';

export interface ToggleButtonGroupExtendedProps extends ToggleButtonGroupProps {
  indicator?: boolean;
  // 데이터 바인딩
  dataBinding?: DataBinding;
  columnMapping?: ColumnMapping;
}

export function ToggleButtonGroup({ indicator = false, dataBinding, columnMapping, children, ...props }: ToggleButtonGroupExtendedProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  // useCollectionData Hook으로 데이터 가져오기 (Static, API, Supabase 통합)
  const {
    data: boundData,
    loading,
    error,
  } = useCollectionData({
    dataBinding,
    componentName: 'ToggleButtonGroup',
    fallbackData: [
      { id: 1, name: 'Button 1', value: 'button-1' },
      { id: 2, name: 'Button 2', value: 'button-2' },
    ],
  });

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

  // DataBinding이 있고 데이터가 로드되었을 때 동적 ToggleButton 생성
  const hasDataBinding = dataBinding?.type === 'collection';

  // ColumnMapping이 있으면 각 데이터 항목마다 ToggleButton 렌더링
  // ListBox와 동일한 패턴
  if (hasDataBinding && columnMapping) {
    console.log('🎯 ToggleButtonGroup: columnMapping 감지 - 데이터로 ToggleButton 렌더링', {
      columnMapping,
      hasChildren: !!children,
      dataCount: boundData.length,
    });

    // Loading 상태
    if (loading) {
      return (
        <RACToggleButtonGroup
          {...props}
          ref={groupRef}
          data-indicator={memoizedIndicator ? 'true' : 'false'}
          className={clsx('react-aria-ToggleButtonGroup', props.className)}
          isDisabled
        >
          <RACToggleButton className='react-aria-ToggleButton'>
            ⏳ 로딩 중...
          </RACToggleButton>
        </RACToggleButtonGroup>
      );
    }

    // Error 상태
    if (error) {
      return (
        <RACToggleButtonGroup
          {...props}
          ref={groupRef}
          data-indicator={memoizedIndicator ? 'true' : 'false'}
          className={clsx('react-aria-ToggleButtonGroup', props.className)}
          isDisabled
        >
          <RACToggleButton className='react-aria-ToggleButton'>
            ❌ 오류
          </RACToggleButton>
        </RACToggleButtonGroup>
      );
    }

    // 데이터가 있을 때: children 템플릿 사용
    if (boundData.length > 0) {
      console.log('✅ ToggleButtonGroup with columnMapping - using children template');

      return (
        <RACToggleButtonGroup
          {...props}
          ref={groupRef}
          data-indicator={memoizedIndicator ? 'true' : 'false'}
          className={clsx('react-aria-ToggleButtonGroup', props.className)}
        >
          {children}
        </RACToggleButtonGroup>
      );
    }

    // 데이터 없음
    return (
      <RACToggleButtonGroup
        {...props}
        ref={groupRef}
        data-indicator={memoizedIndicator ? 'true' : 'false'}
        className={clsx('react-aria-ToggleButtonGroup', props.className)}
      >
        {children}
      </RACToggleButtonGroup>
    );
  }

  // Dynamic Collection: 동적으로 ToggleButton 생성 (columnMapping 없을 때)
  if (hasDataBinding) {
    // Loading 상태
    if (loading) {
      return (
        <RACToggleButtonGroup
          {...props}
          ref={groupRef}
          data-indicator={memoizedIndicator ? 'true' : 'false'}
          className={clsx('react-aria-ToggleButtonGroup', props.className)}
          isDisabled
        >
          <RACToggleButton className='react-aria-ToggleButton'>
            ⏳ 로딩 중...
          </RACToggleButton>
        </RACToggleButtonGroup>
      );
    }

    // Error 상태
    if (error) {
      return (
        <RACToggleButtonGroup
          {...props}
          ref={groupRef}
          data-indicator={memoizedIndicator ? 'true' : 'false'}
          className={clsx('react-aria-ToggleButtonGroup', props.className)}
          isDisabled
        >
          <RACToggleButton className='react-aria-ToggleButton'>
            ❌ 오류
          </RACToggleButton>
        </RACToggleButtonGroup>
      );
    }

    // 데이터가 로드되었을 때
    if (boundData.length > 0) {
      const buttonItems = boundData.map((item, index) => ({
        id: String(item.id || item.value || index),
        label: String(
          item.name || item.title || item.label || `Button ${index + 1}`
        ),
        isDisabled: Boolean(item.isDisabled),
      }));

      console.log('✅ ToggleButtonGroup Dynamic Collection - items:', buttonItems);

      return (
        <RACToggleButtonGroup
          {...props}
          ref={groupRef}
          data-indicator={memoizedIndicator ? 'true' : 'false'}
          className={clsx('react-aria-ToggleButtonGroup', props.className)}
        >
          {buttonItems.map((item) => (
            <RACToggleButton
              key={item.id}
              id={item.id}
              isDisabled={item.isDisabled}
              className='react-aria-ToggleButton'
            >
              {item.label}
            </RACToggleButton>
          ))}
        </RACToggleButtonGroup>
      );
    }
  }

  // Static Children (기존 방식)
  return (
    <RACToggleButtonGroup
      {...props}
      ref={groupRef}
      data-indicator={memoizedIndicator ? 'true' : 'false'}
      className={clsx(
        'react-aria-ToggleButtonGroup',
        props.className
      )}
    >
      {children}
    </RACToggleButtonGroup>
  );
}
