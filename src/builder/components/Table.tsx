import {
  Button,
  Cell,
  Collection,
  Column as AriaColumn,
  ColumnProps,
  Row as AriaRow,
  RowProps,
  Table as AriaTable,
  TableHeader as AriaTableHeader,
  TableHeaderProps,
  TableProps,
  useTableOptions
} from 'react-aria-components';
import { MyCheckbox } from './Checkbox';

import './components.css';

export function Table(props: TableProps) {
  return <AriaTable {...props} className='react-aria-Table' />;
}

export { Table as MyTable };

export function Column(
  props: Omit<ColumnProps, 'children'> & { children?: React.ReactNode }
) {
  return (
    (
      <AriaColumn {...props}>
        {({ allowsSorting, sortDirection }) => (
          <>
            {props.children}
            {allowsSorting && (
              <span aria-hidden="true" className="sort-indicator">
                {sortDirection === 'ascending' ? '▲' : '▼'}
              </span>
            )}
          </>
        )}
      </AriaColumn>
    )
  );
}

export function TableHeader<T extends object>(
  { columns, children }: TableHeaderProps<T>
) {
  const { selectionBehavior, selectionMode, allowsDragging } = useTableOptions();

  return (
    (
      <AriaTableHeader>
        {/* Add extra columns for drag and drop and selection. */}
        {allowsDragging && <AriaColumn />}
        {selectionBehavior === 'toggle' && (
          <AriaColumn>
            {selectionMode === 'multiple' && <MyCheckbox slot="selection" />}
          </AriaColumn>
        )}
        <Collection items={columns}>
          {children}
        </Collection>
      </AriaTableHeader>
    )
  );
}

export { TableHeader as MyTableHeader };

export function Row<T extends object>(
  { id, columns, children, ...otherProps }: RowProps<T>
) {
  const { selectionBehavior, allowsDragging } = useTableOptions();

  return (
    (
      <AriaRow id={id} {...otherProps}>
        {allowsDragging && (
          <Cell>
            <Button slot="drag">≡</Button>
          </Cell>
        )}
        {selectionBehavior === 'toggle' && (
          <Cell>
            <MyCheckbox slot="selection" />
          </Cell>
        )}
        <Collection items={columns}>
          {children}
        </Collection>
      </AriaRow>
    )
  );
}

export { Row as MyRow };
