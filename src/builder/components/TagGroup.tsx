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

import './components.css';

export interface TagGroupProps<T>
  extends
  Omit<AriaTagGroupProps, 'children'>,
  Pick<TagListProps<T>, 'items' | 'children' | 'renderEmptyState'> {
  label?: string;
  description?: string;
  errorMessage?: string;
  allowsRemoving?: boolean;
  onRemove?: (keys: Set<React.Key>) => void;
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
    ...props
  }: TagGroupProps<T>
) {
  return (
    (
      <AriaTagGroup
        {...props}
        onRemove={allowsRemoving ? onRemove : undefined}
        className='react-aria-TagGroup'
      >
        <Label>{label}</Label>
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
    )
  );
}

export function Tag(
  { children, ...props }: Omit<TagProps, 'children'> & {
    children?: React.ReactNode;
  }
) {
  const textValue = typeof children === 'string' ? children : undefined;
  return (
    (
      <AriaTag textValue={textValue} {...props} className='react-aria-Tag'>
        {({ allowsRemoving }) => (
          <>
            {children}
            {allowsRemoving && <Button slot="remove">ⓧ</Button>}
          </>
        )}
      </AriaTag>
    )
  );
}
