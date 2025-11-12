import { JSX } from 'react';
import {
  Button,
  Label,
  Tag as AriaTag,
  TagGroup as AriaTagGroup,
  TagGroupProps as AriaTagGroupProps,
  TagList,
  TagListProps,
  TagProps,
  Text
} from 'react-aria-components';
import { X } from 'lucide-react';
import type { Key, Selection } from '@react-types/shared';
import type { DataBinding, ColumnMapping } from '../../types/builder/unified.types';
import { useCollectionData } from '../hooks/useCollectionData';
import './styles/TagGroup.css';

export interface TagGroupProps<T>
  extends
  Omit<AriaTagGroupProps, 'children'>,
  Pick<TagListProps<T>, 'items' | 'children' | 'renderEmptyState'> {
  label?: string;
  description?: string;
  errorMessage?: string;
  allowsRemoving?: boolean;
  onRemove?: (keys: Selection) => void;
  // 선택 관련 프로퍼티 추가
  selectionMode?: 'none' | 'single' | 'multiple';
  selectionBehavior?: 'toggle' | 'replace';
  selectedKeys?: 'all' | Iterable<Key>;
  defaultSelectedKeys?: 'all' | Iterable<Key>;
  onSelectionChange?: (keys: Selection) => void;
  // 비활성화 관련 프로퍼티 추가
  isDisabled?: boolean;
  // 기타 유용한 프로퍼티들
  orientation?: 'horizontal' | 'vertical';
  disallowEmptySelection?: boolean;
  // 데이터 바인딩
  dataBinding?: DataBinding;
  columnMapping?: ColumnMapping;
  // 제거된 항목 추적 (columnMapping 모드에서 동적 데이터 항목 제거용)
  removedItemIds?: string[];
  // Tag 스타일 제어
  variant?: 'default' | 'primary' | 'secondary' | 'surface';
  size?: 'sm' | 'md' | 'lg';
}

export function TagGroup<T extends object>(
  {
    label,
    description,
    errorMessage,
    items,
    children,
    renderEmptyState,
    allowsRemoving,
    onRemove,
    selectionMode = 'none',
    selectionBehavior = 'toggle',
    selectedKeys,
    defaultSelectedKeys,
    onSelectionChange,
    disallowEmptySelection = false,
    dataBinding,
    columnMapping,
    removedItemIds = [],
    variant = 'default',
    size = 'md',
    ...props
  }: TagGroupProps<T>
): JSX.Element {
  // Build className with variant and size (재사용을 위해 최상위에 선언)
  const tagGroupClassName = 'react-aria-TagGroup';

  // useCollectionData Hook으로 데이터 가져오기 (Static, API, Supabase 통합)
  const {
    data: boundData,
    loading,
    error,
  } = useCollectionData({
    dataBinding,
    componentName: 'TagGroup',
    fallbackData: [
      { id: 1, name: 'Tag 1', label: 'Tag 1' },
      { id: 2, name: 'Tag 2', label: 'Tag 2' },
    ],
  });

  // DataBinding이 있고 데이터가 로드되었을 때 동적 아이템 생성
  const hasDataBinding = dataBinding?.type === 'collection';

  // ColumnMapping이 있으면 각 데이터 항목마다 Tag 렌더링
  // ListBox와 동일한 패턴: Element tree의 Tag 템플릿 + Field 자식 사용
  if (hasDataBinding && columnMapping) {
    console.log('🎯 TagGroup: columnMapping 감지 - 데이터로 아이템 렌더링', {
      columnMapping,
      hasChildren: !!children,
      dataCount: boundData.length,
      removedItemIds,
    });

    // Loading 상태
    if (loading) {
      return (
        <AriaTagGroup
          {...props}
          selectionMode="none"
          className={tagGroupClassName}
          data-tag-variant={variant}
          data-tag-size={size}
        >
          {label && <Label>{label}</Label>}
          <TagList className='react-aria-TagList'>
            <AriaTag textValue="Loading">⏳ 데이터 로딩 중...</AriaTag>
          </TagList>
          {description && <Text slot="description">{description}</Text>}
        </AriaTagGroup>
      );
    }

    // Error 상태
    if (error) {
      return (
        <AriaTagGroup
          {...props}
          selectionMode="none"
          className={tagGroupClassName}
          data-tag-variant={variant}
          data-tag-size={size}
        >
          {label && <Label>{label}</Label>}
          <TagList className='react-aria-TagList'>
            <AriaTag textValue="Error">❌ 오류: {error}</AriaTag>
          </TagList>
          {description && <Text slot="description">{description}</Text>}
        </AriaTagGroup>
      );
    }

    // 데이터가 있을 때: items prop 사용
    if (boundData.length > 0) {
      // removedItemIds로 필터링 (map 전에 필터링)
      const tagItems = boundData
        .filter((item, index) => {
          // 원본 데이터의 id를 문자열로 변환하여 비교
          const itemId = String(item.id ?? index);
          const isRemoved = removedItemIds.includes(itemId);
          console.log('🔍 Filter check:', {
            originalId: item.id,
            originalIdType: typeof item.id,
            itemId,
            removedItemIds: removedItemIds.slice(0, 5), // 처음 5개만 표시
            isRemoved,
          });
          if (isRemoved) {
            console.log('🚫 Filtering out removed item:', itemId);
          }
          return !isRemoved;
        })
        .map((item, index) => ({
          id: String(item.id || index),
          ...item,
        })) as T[];

      console.log('✅ TagGroup with columnMapping - items:', {
        totalItems: boundData.length,
        removedItemIds,
        filteredItems: tagItems.length,
        tagItems: tagItems.map(item => String((item as { id: string | number }).id)),
      });

      return (
        <AriaTagGroup
          {...props}
          selectionMode={selectionMode}
          selectionBehavior={selectionBehavior}
          selectedKeys={selectedKeys}
          defaultSelectedKeys={defaultSelectedKeys}
          onSelectionChange={onSelectionChange}
          disallowEmptySelection={disallowEmptySelection}
          onRemove={allowsRemoving ? onRemove : undefined}
          className={tagGroupClassName}
          data-tag-variant={variant}
          data-tag-size={size}
        >
          {label && <Label>{label}</Label>}
          <TagList
            items={tagItems}
            renderEmptyState={renderEmptyState}
            className='react-aria-TagList'
          >
            {children}
          </TagList>
          {description && <Text slot="description">{description}</Text>}
          {errorMessage && <Text slot="errorMessage">{errorMessage}</Text>}
        </AriaTagGroup>
      );
    }

    // 데이터 없음
    return (
      <AriaTagGroup
        {...props}
        selectionMode={selectionMode}
        selectionBehavior={selectionBehavior}
        selectedKeys={selectedKeys}
        defaultSelectedKeys={defaultSelectedKeys}
        onSelectionChange={onSelectionChange}
        disallowEmptySelection={disallowEmptySelection}
        onRemove={allowsRemoving ? onRemove : undefined}
        className={tagGroupClassName}
        data-tag-variant={variant}
        data-tag-size={size}
      >
        {label && <Label>{label}</Label>}
        <TagList
          items={items}
          renderEmptyState={renderEmptyState}
          className='react-aria-TagList'
        >
          {children}
        </TagList>
        {description && <Text slot="description">{description}</Text>}
        {errorMessage && <Text slot="errorMessage">{errorMessage}</Text>}
      </AriaTagGroup>
    );
  }

  // Dynamic Collection: items prop 사용 (columnMapping 없을 때)
  if (hasDataBinding) {
    // Loading 상태
    if (loading) {
      return (
        <AriaTagGroup
          {...props}
          selectionMode="none"
          className={tagGroupClassName}
          data-tag-variant={variant}
          data-tag-size={size}
        >
          {label && <Label>{label}</Label>}
          <TagList className='react-aria-TagList'>
            <AriaTag textValue="Loading">⏳ 데이터 로딩 중...</AriaTag>
          </TagList>
          {description && <Text slot="description">{description}</Text>}
        </AriaTagGroup>
      );
    }

    // Error 상태
    if (error) {
      return (
        <AriaTagGroup
          {...props}
          selectionMode="none"
          className={tagGroupClassName}
          data-tag-variant={variant}
          data-tag-size={size}
        >
          {label && <Label>{label}</Label>}
          <TagList className='react-aria-TagList'>
            <AriaTag textValue="Error">❌ 오류: {error}</AriaTag>
          </TagList>
          {description && <Text slot="description">{description}</Text>}
        </AriaTagGroup>
      );
    }

    // 데이터가 로드되었을 때
    if (boundData.length > 0) {
      const tagItems = boundData.map((item, index) => ({
        id: String(item.id || index),
        label: String(
          item.name || item.title || item.label || `Tag ${index + 1}`
        ),
        ...item,
      }));

      console.log('✅ TagGroup Dynamic Collection - items:', tagItems);

      return (
        <AriaTagGroup
          {...props}
          selectionMode={selectionMode}
          selectionBehavior={selectionBehavior}
          selectedKeys={selectedKeys}
          defaultSelectedKeys={defaultSelectedKeys}
          onSelectionChange={onSelectionChange}
          disallowEmptySelection={disallowEmptySelection}
          onRemove={allowsRemoving ? onRemove : undefined}
          className={tagGroupClassName}
          data-tag-variant={variant}
          data-tag-size={size}
        >
          {label && <Label>{label}</Label>}
          <TagList
            items={tagItems}
            renderEmptyState={renderEmptyState}
            className='react-aria-TagList'
          >
            {(item) => (
              <AriaTag
                key={item.id}
                id={item.id}
                textValue={item.label}
                className='react-aria-Tag'
              >
                {({ allowsRemoving: removing }) => (
                  <>
                    {item.label}
                    {removing && <Button slot="remove"><X size={14} /></Button>}
                  </>
                )}
              </AriaTag>
            )}
          </TagList>
          {description && <Text slot="description">{description}</Text>}
          {errorMessage && <Text slot="errorMessage">{errorMessage}</Text>}
        </AriaTagGroup>
      );
    }
  }

  // Static Children (기존 방식)
  return (
    <AriaTagGroup
      {...props}
      selectionMode={selectionMode}
      selectionBehavior={selectionBehavior}
      selectedKeys={selectedKeys}
      defaultSelectedKeys={defaultSelectedKeys}
      onSelectionChange={onSelectionChange}
      disallowEmptySelection={disallowEmptySelection}
      onRemove={allowsRemoving ? onRemove : undefined}
      className={tagGroupClassName}
      data-tag-variant={variant}
      data-tag-size={size}
    >

      {label && <Label>{label}</Label>}
      <TagList
        items={items}
        renderEmptyState={renderEmptyState}
        className='react-aria-TagList'
      >
        {children}
      </TagList>
      {description && <Text slot="description">{description}</Text>}
      {errorMessage && <Text slot="errorMessage">{errorMessage}</Text>}
    </AriaTagGroup>
  );
}

export function Tag({ children, ...props }: TagProps): JSX.Element {
  const textValue = typeof children === 'string' ? children : undefined;
  return (
    <AriaTag textValue={textValue} {...props} className='react-aria-Tag'>
      {({ allowsRemoving }) => (
        <>
          {children}
          {allowsRemoving && <Button slot="remove"><X size={14} /></Button>}
        </>
      )}
    </AriaTag>
  );
}
