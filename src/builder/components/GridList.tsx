import {
  Button,
  GridList as AriaGridList,
  GridListItem as AriaGridListItem,
  GridListItemProps,
  GridListProps,
  Text
} from 'react-aria-components';
import { LucideIcon, icons } from 'lucide-react';
import { MyCheckbox } from './Checkbox';
import { CollectionItemData } from './types';

import './components.css';

export function GridList<T extends object>(
  { children, items, itemLayout = 'default', ...props }: GridListProps<T> & {
    itemLayout?: 'default' | 'compact' | 'detailed' | 'grid';
  }
) {
  return (
    <AriaGridList
      {...props}
      className={`react-aria-GridList react-aria-GridList--${itemLayout}`}
      data-layout={itemLayout}
    >
      {children}
    </AriaGridList>
  );
}

export function GridListItem(props: GridListItemProps) {
  return <AriaGridListItem {...props} className='react-aria-GridListItem' />;
}

// GridList 전용 아이템 렌더러
export function GridListItemRenderer({ item }: { item: CollectionItemData }) {
  const IconComponent = item.icon ? icons[item.icon.name as keyof typeof icons] : null;

  switch (item.type) {
    case 'simple':
      return (
        <GridListItem id={item.id} textValue={item.text || item.label}>
          {({ selectionMode, selectionBehavior, allowsDragging }) => (
            <>
              {allowsDragging && <Button slot="drag">≡</Button>}
              {selectionMode === 'multiple' && selectionBehavior === 'toggle' && (
                <MyCheckbox slot="selection" />
              )}
              {item.text || item.label}
            </>
          )}
        </GridListItem>
      );

    case 'complex':
      return (
        <GridListItem
          id={item.id}
          textValue={item.label || item.text}
          className={item.className}
          style={item.style}
        >
          {({ selectionMode, selectionBehavior, allowsDragging }) => (
            <>
              {allowsDragging && <Button slot="drag">≡</Button>}
              {selectionMode === 'multiple' && selectionBehavior === 'toggle' && (
                <MyCheckbox slot="selection" />
              )}
              <div className="collection-item-content">
                {item.image && (
                  <img
                    src={item.image.src}
                    alt={item.image.alt}
                    className={`collection-item-image collection-item-image--${item.image.size || 'medium'}`}
                  />
                )}

                {IconComponent && (
                  <IconComponent
                    size={item.icon?.size || 16}
                    color={item.icon?.color}
                    className="collection-item-icon"
                  />
                )}

                <div className="collection-item-text">
                  {item.label && (
                    <Text slot="label" className="collection-item-label">
                      {item.label}
                    </Text>
                  )}

                  {item.description && (
                    <Text slot="description" className="collection-item-description">
                      {item.description}
                    </Text>
                  )}

                  {item.subtitle && (
                    <Text className="collection-item-subtitle">
                      {item.subtitle}
                    </Text>
                  )}
                </div>

                {item.actions && item.actions.length > 0 && (
                  <div className="collection-item-actions">
                    {item.actions.map(action => (
                      <button
                        key={action.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick?.();
                        }}
                        className="collection-item-action"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </GridListItem>
      );

    case 'custom':
      return (
        <GridListItem id={item.id} textValue={item.label || item.text}>
          {({ selectionMode, selectionBehavior, allowsDragging }) => (
            <>
              {allowsDragging && <Button slot="drag">≡</Button>}
              {selectionMode === 'multiple' && selectionBehavior === 'toggle' && (
                <MyCheckbox slot="selection" />
              )}
              <div
                className={item.className}
                style={item.style}
                dangerouslySetInnerHTML={{ __html: item.text || '' }}
              />
            </>
          )}
        </GridListItem>
      );

    default:
      return (
        <GridListItem id={item.id} textValue={item.text || item.label}>
          {({ selectionMode, selectionBehavior, allowsDragging }) => (
            <>
              {allowsDragging && <Button slot="drag">≡</Button>}
              {selectionMode === 'multiple' && selectionBehavior === 'toggle' && (
                <MyCheckbox slot="selection" />
              )}
              {item.text || item.label}
            </>
          )}
        </GridListItem>
      );
  }
}

export { GridList as MyGridList };
export { GridListItem as MyItem };
