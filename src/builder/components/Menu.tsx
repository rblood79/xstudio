import { useState, useEffect, useMemo } from "react";
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
} from "react-aria-components";
import type { DataBinding } from "../../types/unified";

import "./styles/Menu.css";

export interface MenuButtonProps<T>
  extends MenuProps<T>,
    Omit<MenuTriggerProps, "children"> {
  label?: string;
  dataBinding?: DataBinding;
}

export function MenuButton<T extends object>({
  label,
  children,
  dataBinding,
  ...props
}: MenuButtonProps<T>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staticData, setStaticData] = useState<Record<string, unknown>[]>([]);

  // dataBinding을 JSON으로 직렬화하여 안정화 (무한 루프 방지)
  const dataBindingKey = useMemo(
    () => (dataBinding ? JSON.stringify(dataBinding) : null),
    [dataBinding]
  );

  useEffect(() => {
    // Static Collection 데이터 바인딩 처리
    if (dataBinding?.type === "collection" && dataBinding.source === "static") {
      console.log("📋 Menu Static 데이터 바인딩:", dataBinding);
      console.log("📋 Menu dataBinding.config:", dataBinding.config);
      console.log("💡 서브메뉴 예시 구조:", {
        example: [
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

      // Static 데이터는 config.data에 저장됨
      const staticConfig = dataBinding.config as { data?: unknown[] };
      const data = staticConfig.data;

      console.log("📋 Menu config.data:", data);
      console.log("📋 Menu Array.isArray(data):", Array.isArray(data));

      if (data && Array.isArray(data)) {
        console.log("✅ Menu Static 데이터 설정:", data);
        setStaticData(data as Record<string, unknown>[]);
      } else {
        console.warn("⚠️ Menu Static 데이터가 배열이 아님 또는 없음");
        setStaticData([]);
      }
    }

    // API Collection 데이터 바인딩 처리
    const fetchData = async () => {
      if (dataBinding?.type === "collection" && dataBinding.source === "api") {
        const config = dataBinding.config as {
          baseUrl: string;
          customUrl?: string;
          endpoint: string;
          method: string;
          params: Record<string, unknown>;
          headers: Record<string, string>;
          dataMapping: {
            resultPath: string;
            idKey: string;
            totalKey: string;
          };
        };

        if (!config.baseUrl || !config.endpoint) {
          console.warn("⚠️ Menu: API 설정 불완전");
          return;
        }

        setLoading(true);
        setError(null);

        console.log("🌐 Menu API 호출:", {
          baseUrl: config.baseUrl,
          endpoint: config.endpoint,
          params: config.params,
        });

        try {
          const response = await fetch(
            `${config.baseUrl}${config.customUrl || config.endpoint}`,
            {
              method: config.method || "GET",
              headers: {
                ...config.headers,
                "Content-Type": "application/json",
              },
              body:
                config.method !== "GET"
                  ? JSON.stringify(config.params)
                  : undefined,
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          const resultData = config.dataMapping.resultPath
            ? data[config.dataMapping.resultPath]
            : data;

          setStaticData(resultData);
        } catch (err) {
          console.error("Menu API 호출 오류:", err);
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
    // dataBinding 대신 dataBindingKey 사용 (객체 참조 비교 대신 JSON 문자열 비교)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataBindingKey]);

  // 데이터 바인딩이 있는 경우
  const hasDataBinding =
    dataBinding?.source &&
    (dataBinding.source === "static" || dataBinding.source === "api");

  console.log("🎯 Menu 렌더링:", {
    hasDataBinding,
    loading,
    error,
    staticDataLength: staticData.length,
    staticData,
    childrenExists: !!children,
  });

  // Dynamic Collection: items prop 사용
  if (hasDataBinding && !loading && !error && staticData.length > 0) {
    const menuItems = staticData.map((item, index) => {
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
          (child: any, childIndex: number) => ({
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
        <Menu {...props}>
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
          {!loading && !error && children}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

export function MenuItem(
  props: Omit<MenuItemProps, "children"> & { children?: React.ReactNode }
) {
  let textValue =
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
