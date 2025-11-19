import {
  Button,
  Tree as AriaTree,
  TreeItem as AriaTreeItem,
  TreeItemContent as AriaTreeItemContent,
  TreeItemContentProps,
  TreeItemContentRenderProps,
  TreeItemProps as AriaTreeItemProps,
  TreeProps,
  Collection,
  composeRenderProps,
} from "react-aria-components";
import { tv } from "tailwind-variants";
import { InfoIcon, ChevronRightIcon, Minus } from "lucide-react";
import { MyCheckbox } from "./Checkbox";
import type { DataBinding } from "../../types/builder/unified.types";
import type { TreeVariant, ComponentSize } from "../types/componentVariants";
import { useCollectionData } from "../hooks/useCollectionData";

import "./styles/Tree.css";

export interface MyTreeProps<T extends object> extends TreeProps<T> {
  /**
   * M3 variant
   * @default 'primary'
   */
  variant?: TreeVariant;
  /**
   * Size variant
   * @default 'md'
   */
  size?: ComponentSize;
  /**
   * Data binding configuration
   */
  dataBinding?: DataBinding;
}

const treeStyles = tv({
  base: 'react-aria-Tree',
  variants: {
    variant: {
      primary: 'primary',
      secondary: 'secondary',
      tertiary: 'tertiary',
    },
    size: {
      sm: 'sm',
      md: 'md',
      lg: 'lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

/**
 * Tree Component with Material Design 3 support
 *
 * M3 Features:
 * - 3 variants: primary, secondary, tertiary
 * - 3 sizes: sm, md, lg
 * - M3 color tokens for consistent theming
 *
 * Features:
 * - Hierarchical data display
 * - Expandable/collapsible nodes
 * - Selection support (single/multiple)
 * - Drag and drop support
 * - Keyboard navigation (Arrow keys, Home, End)
 * - Data binding support (Static, API, Supabase)
 *
 * @example
 * <Tree variant="primary" size="md">
 *   <TreeItem title="Folder 1">
 *     <TreeItem title="File 1.1" />
 *     <TreeItem title="File 1.2" />
 *   </TreeItem>
 * </Tree>
 */
export function Tree<T extends object>(props: MyTreeProps<T>) {
  const { variant = 'primary', size = 'md', dataBinding, children, ...restProps } = props;

  // useCollectionData Hook으로 데이터 가져오기 (Static, API, Supabase 통합)
  const {
    data: treeData,
    loading,
    // error, // TODO: Add error handling UI
  } = useCollectionData({
    dataBinding,
    componentName: "Tree",
    fallbackData: [],
  });

  const treeClassName = composeRenderProps(
    restProps.className,
    (className, renderProps) => {
      return treeStyles({ ...renderProps, variant, size, className });
    }
  );

  // DataBinding이 있고 데이터가 로드된 경우
  if (dataBinding && treeData.length > 0) {
    const renderTreeItemsRecursively = (items: Record<string, unknown>[]): React.ReactNode => {
      return items.map((item) => {
        const itemId = String(item.id || item.name || Math.random());
        const displayTitle = String(
          item.name || item.label || item.title || itemId
        );
        const hasChildren =
          Array.isArray(item.children) && item.children.length > 0;

        return (
          <TreeItem
            key={itemId}
            id={itemId}
            title={displayTitle}
            hasChildren={hasChildren}
            showInfoButton={false}
            childItems={
              hasChildren
                ? renderTreeItemsRecursively(item.children as Record<string, unknown>[])
                : undefined
            }
          />
        );
      });
    };

    return (
      <AriaTree {...restProps} className={treeClassName}>
        {loading ? (
          <TreeItem
            key="loading"
            id="loading"
            title="Loading..."
            hasChildren={false}
            showInfoButton={false}
          />
        ) : (
          renderTreeItemsRecursively(treeData)
        )}
      </AriaTree>
    );
  }

  // Static children
  return (
    <AriaTree {...restProps} className={treeClassName}>
      {children}
    </AriaTree>
  );
}

export function TreeItemContent(
  props: Omit<TreeItemContentProps, "children"> & {
    children?: React.ReactNode;
    hasChildren?: boolean;
  }
) {
  return (
    <AriaTreeItemContent {...props}>
      {(renderProps: TreeItemContentRenderProps) => (
        <>
          {renderProps.selectionBehavior === "toggle" &&
            renderProps.selectionMode !== "none" && (
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

export interface TreeItemProps
  extends Omit<Partial<AriaTreeItemProps>, "value"> {
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

  const displayTitle = String(title || label || value || "");
  const actualHasChildren = hasChildren ?? childItems != null;

  return (
    <AriaTreeItem
      textValue={displayTitle}
      {...restProps}
      className="react-aria-TreeItem"
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
      {childItems && <Collection items={[]}>{childItems}</Collection>}
    </AriaTreeItem>
  );
}
