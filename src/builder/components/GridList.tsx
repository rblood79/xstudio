import {
  Button,
  GridList as AriaGridList,
  GridListItem as AriaGridListItem,
  GridListItemProps,
  GridListProps
} from 'react-aria-components';
import { MyCheckbox } from './Checkbox';
import type { DataBinding, ColumnMapping } from '../../types/builder/unified.types';
import { useCollectionData } from '../hooks/useCollectionData';

import './styles/GridList.css';

interface ExtendedGridListProps<T extends object> extends GridListProps<T> {
  dataBinding?: DataBinding;
  columnMapping?: ColumnMapping;
}

export function GridList<T extends object>({
  children,
  dataBinding,
  columnMapping,
  ...props
}: ExtendedGridListProps<T>) {
  // useCollectionData Hook으로 데이터 가져오기 (Static, API, Supabase 통합)
  const {
    data: boundData,
    loading,
    error,
  } = useCollectionData({
    dataBinding,
    componentName: 'GridList',
    fallbackData: [
      { id: 1, name: 'Item 1', description: 'Description 1' },
      { id: 2, name: 'Item 2', description: 'Description 2' },
    ],
  });

  // DataBinding이 있고 데이터가 로드되었을 때 동적 아이템 생성
  const hasDataBinding = dataBinding?.type === 'collection';

  // ColumnMapping이 있으면 각 데이터 항목마다 GridListItem 렌더링
  // ListBox와 동일한 패턴: Element tree의 GridListItem 템플릿 + Field 자식 사용
  if (hasDataBinding && columnMapping) {
    console.log('🎯 GridList: columnMapping 감지 - 데이터로 아이템 렌더링', {
      columnMapping,
      hasChildren: !!children,
      childrenType: typeof children,
      isChildrenFunction: typeof children === 'function',
      dataCount: boundData.length,
      loading,
      error,
    });

    // Loading 상태
    if (loading) {
      return (
        <AriaGridList {...props} className='react-aria-GridList'>
          <AriaGridListItem
            key="loading"
            value={{}}
            className='react-aria-GridListItem'
          >
            {({ selectionMode, selectionBehavior, allowsDragging }) => (
              <>
                {allowsDragging && <Button slot="drag">≡</Button>}
                {selectionMode === 'multiple' && selectionBehavior === 'toggle' && (
                  <MyCheckbox slot="selection" />
                )}
                ⏳ 데이터 로딩 중...
              </>
            )}
          </AriaGridListItem>
        </AriaGridList>
      );
    }

    // Error 상태
    if (error) {
      return (
        <AriaGridList {...props} className='react-aria-GridList'>
          <AriaGridListItem
            key="error"
            value={{}}
            className='react-aria-GridListItem'
          >
            {({ selectionMode, selectionBehavior, allowsDragging }) => (
              <>
                {allowsDragging && <Button slot="drag">≡</Button>}
                {selectionMode === 'multiple' && selectionBehavior === 'toggle' && (
                  <MyCheckbox slot="selection" />
                )}
                ❌ 오류: {error}
              </>
            )}
          </AriaGridListItem>
        </AriaGridList>
      );
    }

    // 데이터가 있을 때: items prop 사용
    if (boundData.length > 0) {
      const items = boundData.map((item, index) => ({
        id: String(item.id || index),
        ...item,
      })) as T[];

      console.log('✅ GridList with columnMapping - items:', items);

      return (
        <AriaGridList {...props} className='react-aria-GridList' items={items}>
          {children}
        </AriaGridList>
      );
    }

    // 데이터 없음
    return (
      <AriaGridList {...props} className='react-aria-GridList'>
        {children}
      </AriaGridList>
    );
  }

  // Dynamic Collection: items prop 사용 (columnMapping 없을 때)
  if (hasDataBinding) {
    // Loading 상태
    if (loading) {
      return (
        <AriaGridList {...props} className='react-aria-GridList'>
          <AriaGridListItem
            key="loading"
            value={{}}
            className='react-aria-GridListItem'
          >
            {({ selectionMode, selectionBehavior, allowsDragging }) => (
              <>
                {allowsDragging && <Button slot="drag">≡</Button>}
                {selectionMode === 'multiple' && selectionBehavior === 'toggle' && (
                  <MyCheckbox slot="selection" />
                )}
                ⏳ 데이터 로딩 중...
              </>
            )}
          </AriaGridListItem>
        </AriaGridList>
      );
    }

    // Error 상태
    if (error) {
      return (
        <AriaGridList {...props} className='react-aria-GridList'>
          <AriaGridListItem
            key="error"
            value={{}}
            className='react-aria-GridListItem'
          >
            {({ selectionMode, selectionBehavior, allowsDragging }) => (
              <>
                {allowsDragging && <Button slot="drag">≡</Button>}
                {selectionMode === 'multiple' && selectionBehavior === 'toggle' && (
                  <MyCheckbox slot="selection" />
                )}
                ❌ 오류: {error}
              </>
            )}
          </AriaGridListItem>
        </AriaGridList>
      );
    }

    // 데이터가 로드되었을 때
    if (boundData.length > 0) {
      const items = boundData.map((item, index) => ({
        id: String(item.id || index),
        label: String(
          item.name || item.title || item.label || `Item ${index + 1}`
        ),
        ...item,
      }));

      console.log('✅ GridList Dynamic Collection - items:', items);

      return (
        <AriaGridList {...props} className='react-aria-GridList' items={items}>
          {(item) => (
            <AriaGridListItem
              key={item.id}
              id={item.id}
              textValue={item.label}
              className='react-aria-GridListItem'
            >
              {({ selectionMode, selectionBehavior, allowsDragging }) => (
                <>
                  {allowsDragging && <Button slot="drag">≡</Button>}
                  {selectionMode === 'multiple' && selectionBehavior === 'toggle' && (
                    <MyCheckbox slot="selection" />
                  )}
                  {item.label}
                </>
              )}
            </AriaGridListItem>
          )}
        </AriaGridList>
      );
    }
  }

  // Static Children (기존 방식)
  return (
    <AriaGridList {...props} className='react-aria-GridList'>
      {children}
    </AriaGridList>
  );
}

export { GridList as MyGridList };

export function GridListItem(
  { children, ...props }: Omit<GridListItemProps, 'children'> & {
    children?: React.ReactNode;
  }
) {
  const textValue = typeof children === 'string' ? children : undefined;
  return (
    <AriaGridListItem textValue={textValue} {...props} className='react-aria-GridListItem'>
      {({ selectionMode, selectionBehavior, allowsDragging }) => (
        <>
          {/* Add elements for drag and drop and selection. */}
          {allowsDragging && <Button slot="drag">≡</Button>}
          {selectionMode === 'multiple' && selectionBehavior === 'toggle' && (
            <MyCheckbox slot="selection" />
          )}
          {children}
        </>
      )}
    </AriaGridListItem>
  );
}
