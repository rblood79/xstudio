import {
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  ListBoxItemProps,
  ListBoxProps,
  Text
} from 'react-aria-components';
import { icons } from 'lucide-react';
import { CollectionItemData } from './types';

import './components.css';

export function ListBox<T extends object>(
  { children, items, itemLayout = 'default', ...props }: ListBoxProps<T> & {
    itemLayout?: 'default' | 'compact' | 'detailed' | 'grid';
  }
) {
  return (
    <AriaListBox
      {...props}
      className={`react-aria-ListBox react-aria-ListBox--${itemLayout}`}
      data-layout={itemLayout}
    >
      {children}
    </AriaListBox>
  );
}

export function ListBoxItem(props: ListBoxItemProps) {
  return <AriaListBoxItem {...props} className='react-aria-ListBoxItem' />;
}

// ListBox 전용 아이템 렌더러
export function ListBoxItemRenderer({ item }: { item: CollectionItemData }) {
  const IconComponent = item.icon ? icons[item.icon.name as keyof typeof icons] : null;

  switch (item.type) {
    case 'simple':
      return (
        <ListBoxItem id={item.id} textValue={item.text || item.label}>
          {item.text || item.label}
        </ListBoxItem>
      );

    case 'complex':
      return (
        <ListBoxItem
          id={item.id}
          textValue={item.label || item.text}
          className={item.className}
          style={item.style}
        >
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
        </ListBoxItem>
      );

    case 'custom':
      return (
        <ListBoxItem id={item.id} textValue={item.label || item.text}>
          <div
            className={item.className}
            style={item.style}
            dangerouslySetInnerHTML={{ __html: item.text || '' }}
          />
        </ListBoxItem>
      );

    default:
      return (
        <ListBoxItem id={item.id} textValue={item.text || item.label}>
          {item.text || item.label}
        </ListBoxItem>
      );
  }
}

// 기존 ListBoxItemData 타입을 CollectionItemData로 별칭 (하위 호환성)
export type ListBoxItemData = CollectionItemData;

export { ListBox as MyListBox };
export { ListBoxItem as MyItem };
