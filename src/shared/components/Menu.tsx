import {
  Button,
  Menu,
  MenuItem as AriaMenuItem,
  MenuItemProps,
  MenuProps,
  MenuTrigger,
  MenuTriggerProps,
  Popover,
  SubmenuTrigger,
  composeRenderProps
} from "react-aria-components";
import type { MenuVariant, ComponentSize } from '../../types/componentVariants';
import type { DataBinding, ColumnMapping } from "../../types/builder/unified.types";
import type { DataBindingValue } from "../../builder/panels/common/PropertyDataBinding";
import { useCollectionData } from "../../builder/hooks/useCollectionData";

import "./styles/Menu.css";

/**
 * 🚀 Phase 4: data-* 패턴 전환
 * - tailwind-variants 제거
 * - data-variant, data-size 속성 사용
 */

export interface MenuItem {
  id: string;
  label: string;
  isDisabled?: boolean;
  icon?: string;
  shortcut?: string;
  description?: string;
  children?: MenuItem[];
}

export interface MenuButtonProps<T>
  extends MenuProps<T>,
    Omit<MenuTriggerProps, "children"> {
  label?: string;
  dataBinding?: DataBinding | DataBindingValue;
  columnMapping?: ColumnMapping;
  // M3 props
  variant?: MenuVariant;
  size?: ComponentSize;
}

export function MenuButton<T extends object>({
  label,
  children,
  dataBinding,
  columnMapping,
  variant = 'primary',
  size = 'md',
  ...props
}: MenuButtonProps<T>) {
  // useCollectionData Hook으로 데이터 가져오기 (Static, API, Supabase 통합)
  const {
    data: boundData,
    loading,
    error,
  } = useCollectionData({
    dataBinding: dataBinding as DataBinding,
    componentName: "Menu",
    fallbackData: [
      {
        label: "File",
        icon: "📁",
        children: [
          { label: "New", shortcut: "⌘N" },
          { label: "Open", shortcut: "⌘O" },
        ],
      },
      { label: "Edit", icon: "✏️" },
    ],
  });

  // 데이터 바인딩이 있는 경우
  // PropertyDataBinding 형식 (source, name) 또는 DataBinding 형식 (type: "collection") 둘 다 지원
  const isPropertyBinding =
    dataBinding &&
    "source" in dataBinding &&
    "name" in dataBinding &&
    !("type" in dataBinding);
  const hasDataBinding =
    (!isPropertyBinding &&
      dataBinding &&
      "type" in dataBinding &&
      dataBinding.type === "collection") ||
    isPropertyBinding;

  console.log("🎯 Menu 렌더링:", {
    hasDataBinding,
    loading,
    error,
    boundDataLength: boundData.length,
    boundData,
    childrenExists: !!children,
    hasColumnMapping: !!columnMapping,
  });

  // Menu className generator (reused across all conditional renders)
  const getMenuClassName = (baseClassName?: string) =>
    composeRenderProps(
      baseClassName,
      (className) => className ? `react-aria-Menu ${className}` : 'react-aria-Menu'
    );

  // ColumnMapping이 있으면 각 데이터 항목마다 MenuItem 렌더링
  // ListBox와 동일한 패턴: Element tree의 MenuItem 템플릿 + Field 자식 사용
  if (hasDataBinding && columnMapping) {
    console.log('🎯 Menu: columnMapping 감지 - 데이터로 아이템 렌더링', {
      columnMapping,
      hasChildren: !!children,
      dataCount: boundData.length,
    });

    // Loading 상태
    if (loading) {
      return (
        <MenuTrigger {...props}>
          <Button>{label}</Button>
          <Popover>
            <Menu className={getMenuClassName(props.className)} data-variant={variant} data-size={size}>
              <AriaMenuItem key="loading" textValue="Loading">
                ⏳ 데이터 로딩 중...
              </AriaMenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      );
    }

    // Error 상태
    if (error) {
      return (
        <MenuTrigger {...props}>
          <Button>{label}</Button>
          <Popover>
            <Menu className={getMenuClassName(props.className)} data-variant={variant} data-size={size}>
              <AriaMenuItem key="error" textValue="Error">
                ❌ 오류: {error}
              </AriaMenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      );
    }

    // 데이터가 있을 때: items prop 사용
    if (boundData.length > 0) {
      const menuItems = boundData.map((item, index) => {
        const itemId = String(item.id !== undefined ? item.id : index);
        return {
          id: itemId,
          label: String(
            item.label || item.text || item.name || `Item ${index + 1}`
          ),
          isDisabled: Boolean(item.isDisabled),
          icon: item.icon as string | undefined,
          shortcut: item.shortcut as string | undefined,
          description: item.description as string | undefined,
          children: Array.isArray(item.children) ? item.children : undefined,
          ...item,
        };
      });

      console.log('✅ Menu with columnMapping - items:', menuItems);

      // Recursive render function for menu items with submenus
      const renderMenuItem = (item: MenuItem) => {
        const hasSubmenu = item.children && item.children.length > 0;

        if (hasSubmenu) {
          const submenuItems = item.children!.map(
            (child: MenuItem, childIndex: number) => ({
              ...child,
              id: String(child.id || `${item.id}-${childIndex}`),
              label: String(
                child.label ||
                  (child as Record<string, unknown>).text ||
                  (child as Record<string, unknown>).name ||
                  `Item ${childIndex + 1}`
              ),
              isDisabled: Boolean(child.isDisabled),
              icon: child.icon as string | undefined,
              shortcut: child.shortcut as string | undefined,
              description: child.description as string | undefined,
              children: Array.isArray(child.children)
                ? child.children
                : undefined,
            })
          );

          return (
            <SubmenuTrigger>
              <AriaMenuItem textValue={item.label} isDisabled={item.isDisabled}>
                <span className="menu-item-content">
                  {item.icon && <span className="menu-item-icon">{item.icon}</span>}
                  <span className="menu-item-label">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="menu-item-shortcut">{item.shortcut}</kbd>
                  )}
                </span>
                {item.description && (
                  <span className="menu-item-description">{item.description}</span>
                )}
              </AriaMenuItem>
              <Popover>
                <Menu items={submenuItems as Iterable<T>} className={getMenuClassName(props.className)} data-variant={variant} data-size={size}>
                  {(subItem) => renderMenuItem(subItem as unknown as MenuItem)}
                </Menu>
              </Popover>
            </SubmenuTrigger>
          );
        }

        return (
          <AriaMenuItem textValue={item.label} isDisabled={item.isDisabled}>
            <span className="menu-item-content">
              {item.icon && <span className="menu-item-icon">{item.icon}</span>}
              <span className="menu-item-label">{item.label}</span>
              {item.shortcut && (
                <kbd className="menu-item-shortcut">{item.shortcut}</kbd>
              )}
            </span>
            {item.description && (
              <span className="menu-item-description">{item.description}</span>
            )}
          </AriaMenuItem>
        );
      };

      return (
        <MenuTrigger {...props}>
          <Button>{label}</Button>
          <Popover>
            <Menu items={menuItems as Iterable<T>} className={getMenuClassName(props.className)} data-variant={variant} data-size={size}>
              {(item) => renderMenuItem(item as unknown as MenuItem)}
            </Menu>
          </Popover>
        </MenuTrigger>
      );
    }

    // 데이터 없음
    return (
      <MenuTrigger {...props}>
        <Button>{label}</Button>
        <Popover>
          <Menu className={getMenuClassName(props.className)} data-variant={variant} data-size={size}>
            {children}
          </Menu>
        </Popover>
      </MenuTrigger>
    );
  }

  // Dynamic Collection: items prop 사용 (columnMapping 없을 때)
  if (hasDataBinding && !loading && !error && boundData.length > 0) {
    const menuItems = boundData.map((item, index) => {
      const itemId = String(item.id !== undefined ? item.id : index);
      const processedItem = {
        id: itemId, // 고유 ID
        label: String(
          item.label || item.text || item.name || `Item ${index + 1}`
        ),
        isDisabled: Boolean(item.isDisabled),
        icon: item.icon as string | undefined,
        shortcut: item.shortcut as string | undefined,
        description: item.description as string | undefined,
        children: Array.isArray(item.children) ? item.children : undefined, // 원본 children 유지
      };
      console.log("🔸 메뉴 아이템 변환:", {
        index,
        originalItem: item,
        processedItem,
      });
      return processedItem;
    });

    console.log("✅ Menu Dynamic Collection - items:", menuItems);
    console.log("✅ Menu items 개수:", menuItems.length);
    console.log(
      "✅ Menu items 상세:",
      menuItems.map((item) => ({
        id: item.id,
        label: item.label,
        hasChildren: !!item.children,
      }))
    );

    // Recursive render function for menu items with submenus
    const renderMenuItem = (item: (typeof menuItems)[0]) => {
      console.log("🔹 renderMenuItem 호출:", {
        id: item.id,
        label: item.label,
        hasChildren: !!item.children,
      });

      const hasSubmenu = item.children && item.children.length > 0;

      const content = (
        <>
          <span className="menu-item-content">
            {item.icon && <span className="menu-item-icon">{item.icon}</span>}
            <span className="menu-item-label">{item.label}</span>
            {item.shortcut && (
              <kbd className="menu-item-shortcut">{item.shortcut}</kbd>
            )}
          </span>
          {item.description && (
            <span className="menu-item-description">{item.description}</span>
          )}
        </>
      );

      if (hasSubmenu) {
        // Convert children to same format as parent items
        const submenuItems = item.children!.map(
          (child: Record<string, unknown>, childIndex: number) => ({
            id: String(child.id || `${item.id}-${childIndex}`),
            label: String(
              child.label ||
                child.text ||
                child.name ||
                `Item ${childIndex + 1}`
            ),
            isDisabled: Boolean(child.isDisabled),
            icon: child.icon as string | undefined,
            shortcut: child.shortcut as string | undefined,
            description: child.description as string | undefined,
            children: Array.isArray(child.children)
              ? child.children
              : undefined,
            ...child,
          })
        );

        console.log("🔹 서브메뉴 생성:", {
          parentId: item.id,
          submenuItemsCount: submenuItems.length,
        });

        return (
          <SubmenuTrigger>
            <AriaMenuItem textValue={item.label} isDisabled={item.isDisabled}>
              {content}
            </AriaMenuItem>
            <Popover>
              <Menu
                items={submenuItems}
                onAction={(key) => {
                  console.log("Submenu item selected:", key);
                }}
                className={getMenuClassName(props.className)}
                data-variant={variant}
                data-size={size}
              >
                {(subItem) => renderMenuItem(subItem)}
              </Menu>
            </Popover>
          </SubmenuTrigger>
        );
      }

      console.log("🔹 일반 메뉴 아이템 생성:", item.id);

      return (
        <AriaMenuItem textValue={item.label} isDisabled={item.isDisabled}>
          {content}
        </AriaMenuItem>
      );
    };

    return (
      <MenuTrigger {...props}>
        <Button>{label}</Button>
        <Popover>
          <Menu
            items={menuItems}
            onAction={(key) => {
              console.log("Menu item selected:", key);
              const selectedItem = menuItems.find((item) => item.id === key);
              console.log("Selected item data:", selectedItem);
              // 이벤트 핸들러 실행 가능
            }}
            className={getMenuClassName(props.className)}
            data-variant={variant}
            data-size={size}
          >
            {(item) => renderMenuItem(item)}
          </Menu>
        </Popover>
      </MenuTrigger>
    );
  }

  // Static Children 또는 Loading/Error 상태
  return (
    <MenuTrigger {...props}>
      <Button>{label}</Button>
      <Popover>
        <Menu {...props} className={getMenuClassName(props.className)} data-variant={variant} data-size={size}>
          {loading && (
            <AriaMenuItem key="loading" textValue="Loading">
              ⏳ 데이터 로딩 중...
            </AriaMenuItem>
          )}
          {error && (
            <AriaMenuItem key="error" textValue="Error">
              ❌ 오류: {error}
            </AriaMenuItem>
          )}
          {!loading && !error && (children as React.ReactNode)}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

export function MenuItem(
  props: Omit<MenuItemProps, "children"> & { children?: React.ReactNode }
) {
  const textValue =
    props.textValue ||
    (typeof props.children === "string" ? props.children : undefined);
  return (
    <AriaMenuItem {...props} textValue={textValue}>
      {({ hasSubmenu }) => (
        <>
          {props.children}
          {hasSubmenu && (
            <svg className="chevron" viewBox="0 0 24 24">
              <path d="m9 18 6-6-6-6" />
            </svg>
          )}
        </>
      )}
    </AriaMenuItem>
  );
}

export { MenuItem as MyItem };
