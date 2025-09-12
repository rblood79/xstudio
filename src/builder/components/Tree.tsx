import {
  Button,
  Tree as AriaTree,
  TreeItem as AriaTreeItem,
  TreeItemContent as AriaTreeItemContent,
  TreeItemContentProps,
  TreeItemContentRenderProps,
  TreeItemProps as AriaTreeItemProps,
  TreeProps
} from 'react-aria-components';
import { InfoIcon, ChevronRightIcon, Minus } from 'lucide-react';
import { MyCheckbox } from './Checkbox';

import './components.css';

export function Tree<T extends object>(props: TreeProps<T>) {
  return <AriaTree {...props} className='react-aria-Tree' />;
}

export function TreeItemContent(
  props: Omit<TreeItemContentProps, 'children'> & {
    children?: React.ReactNode;
    hasChildren?: boolean; // 하위 항목 존재 여부
  }
) {
  return (
    <AriaTreeItemContent {...props}>
      {(
        { selectionBehavior, selectionMode }:
          TreeItemContentRenderProps
      ) => (
        <>
          {selectionBehavior === 'toggle' && selectionMode !== 'none' && (
            <MyCheckbox slot="selection" />
          )}
          <Button slot="chevron">
            {/* 하위 항목이 있으면 ChevronRightIcon, 없으면 Minus */}
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
  hasChildren?: boolean; // 하위 항목 존재 여부 prop 추가
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
    ...restProps
  } = props;

  // XStudio 표준 패턴: title > label > value 우선순위
  const displayTitle = String(title || label || value || '');

  // children prop을 기반으로 hasChildren 자동 감지
  const actualHasChildren = hasChildren ?? (children != null &&
    (Array.isArray(children) ? children.length > 0 : true));

  return (
    <AriaTreeItem
      textValue={displayTitle} // React Aria 접근성용 (내부 API)
      {...restProps}
      className='react-aria-TreeItem'
    >
      <TreeItemContent hasChildren={actualHasChildren}>
        <span className="tree-item-title">{displayTitle}</span>
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
      {children}
    </AriaTreeItem>
  );
}
