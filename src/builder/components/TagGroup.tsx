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
    ...props
  }: TagGroupProps<T>
): JSX.Element {
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
      className='react-aria-TagGroup'
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
