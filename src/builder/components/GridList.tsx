import {
  Button,
  GridList as AriaGridList,
  GridListItem as AriaGridListItem,
  GridListItemProps,
  GridListProps
} from 'react-aria-components';
import { MyCheckbox } from './Checkbox';

import './components.css';

export function GridList<T extends object>(
  { children, ...props }: GridListProps<T>
) {
  return (
    (
      <AriaGridList {...props} className='react-aria-GridList'>
        {children}
      </AriaGridList>
    )
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
    (
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
    )
  );
}
