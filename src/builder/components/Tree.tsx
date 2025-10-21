import {
  Button,
  Tree as AriaTree,
  TreeItem as AriaTreeItem,
  TreeItemContent as AriaTreeItemContent,
  TreeItemContentProps,
  TreeItemContentRenderProps,
  TreeItemProps as AriaTreeItemProps,
  TreeProps,
  Collection
} from 'react-aria-components';
import { InfoIcon, ChevronRightIcon, Minus } from 'lucide-react';
import { MyCheckbox } from './Checkbox';

import './styles/Tree.css';

export function Tree<T extends object>(props: TreeProps<T>) {
  return <AriaTree {...props} className='react-aria-Tree' />;
}

export function TreeItemContent(
  props: Omit<TreeItemContentProps, 'children'> & {
    children?: React.ReactNode;
    hasChildren?: boolean;
  }
) {
  return (
    <AriaTreeItemContent {...props}>
      {(renderProps: TreeItemContentRenderProps) => (
        <>
          {renderProps.selectionBehavior === 'toggle' && renderProps.selectionMode !== 'none' && (
            <MyCheckbox slot="selection" />
          )}
          <Button slot="chevron">
            {props.hasChildren ? (
              <ChevronRightIcon size={16} data-chevron="true" />
            ) : (
              <Minus size={16} data-minus="true" />
            )}
          </Button>
          {props.children}
        </>
      )}
    </AriaTreeItemContent>
  );
}

export interface TreeItemProps extends Omit<Partial<AriaTreeItemProps>, 'value'> {
  title?: string;
  value?: string;
  label?: string;
  children?: React.ReactNode;
  showInfoButton?: boolean;
  onInfoClick?: () => void;
  hasChildren?: boolean;
  childItems?: React.ReactNode; // 하위 TreeItem들을 위한 별도 prop
}

export function TreeItem(props: TreeItemProps) {
  const {
    title,
    value,
    label,
    children,
    showInfoButton = true,
    onInfoClick,
    hasChildren,
    childItems,
    ...restProps
  } = props;

  const displayTitle = String(title || label || value || '');
  const actualHasChildren = hasChildren ?? (childItems != null);

  return (
    <AriaTreeItem
      textValue={displayTitle}
      {...restProps}
      className='react-aria-TreeItem'
    >
      <TreeItemContent hasChildren={actualHasChildren}>
        <span className="tree-item-title">{displayTitle}</span>
        {children} {/* 다른 컴포넌트들 (Button, Text 등) */}
        {showInfoButton && (
          <Button
            aria-label={`${displayTitle} 정보`}
            onPress={onInfoClick}
            className="tree-item-info-button"
          >
            <InfoIcon size={16} />
          </Button>
        )}
      </TreeItemContent>
      
      {/* 하위 TreeItem들을 Collection으로 래핑 */}
      {childItems && (
        <Collection items={[]}>
          {childItems}
        </Collection>
      )}
    </AriaTreeItem>
  );
}
