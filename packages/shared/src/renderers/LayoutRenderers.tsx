import React from "react";
import {
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Panel,
  Card,
  Button,
  Link,
  Badge,
  Tooltip,
  ProgressBar,
  Meter,
  Separator,
  Breadcrumbs,
  Breadcrumb,
  Group,
} from "../components/list";
import { Slot } from "../components/Slot";
import type { PreviewElement, RenderContext, DataBinding, ColumnMapping } from "../types";


/**
 * Layout 관련 컴포넌트 렌더러
 * - Tabs, TabList, Tab, TabPanel
 * - Panel
 * - Card
 * - Button
 * - Text
 * - Tooltip, ProgressBar, Meter
 */

/**
 * Tabs 렌더링
 */
export const renderTabs = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, updateElementProps, renderElement } = context;

  // PropertyDataBinding 형식 감지
  const dataBinding = element.dataBinding || element.props.dataBinding;
  const isPropertyBinding =
    dataBinding &&
    typeof dataBinding === 'object' &&
    "source" in (dataBinding as object) &&
    "name" in (dataBinding as object) &&
    !("type" in (dataBinding as object));

  const tabChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "Tab")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const panelChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "Panel")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Tabs
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      defaultSelectedKey={String(element.props.defaultSelectedKey || "")}
      orientation={
        (element.props.orientation as "horizontal" | "vertical") || "horizontal"
      }
      isDisabled={Boolean(element.props.isDisabled)}
      dataBinding={(isPropertyBinding ? dataBinding : element.dataBinding) as DataBinding | undefined}
      columnMapping={element.props.columnMapping as ColumnMapping | undefined}
      onSelectionChange={(key) => {
        const updatedProps = {
          ...element.props,
          selectedKey: key,
        };
        updateElementProps(element.id, updatedProps);
      }}
    >
      <TabList showIndicator={Boolean(element.props.showIndicator)}>
        {tabChildren.map((tab) => (
          <Tab key={tab.id} id={tab.id}>
            {typeof tab.props.title === 'string' ? tab.props.title : String(tab.props.title || '')}
          </Tab>
        ))}
      </TabList>

      {tabChildren.map((tab) => {
        const correspondingPanel = panelChildren.find((panel) => {
          if (panel.props.tabId && tab.props.tabId) {
            return panel.props.tabId === tab.props.tabId;
          }
          return (panel.order_num || 0) === (tab.order_num || 0) + 1;
        });

        if (!correspondingPanel) {
          console.warn(`No corresponding panel found for tab ${tab.id}`);
          return null;
        }

        return (
          <TabPanel key={correspondingPanel.id} id={tab.id}>
            <Panel
              key={correspondingPanel.id}
              data-element-id={correspondingPanel.id}
              variant={
                (correspondingPanel.props.variant as
                  | "default"
                  | "tab"
                  | "sidebar"
                  | "card"
                  | "modal") || "tab"
              }
              title={typeof correspondingPanel.props.title === 'string' ? correspondingPanel.props.title : undefined}
              style={correspondingPanel.props.style}
              className={correspondingPanel.props.className}
            >
              {elements
                .filter((child) => child.parent_id === correspondingPanel.id)
                .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
                .map((child) => renderElement(child))}
            </Panel>
          </TabPanel>
        );
      })}
    </Tabs>
  );
};

/**
 * Panel 렌더링
 */
export const renderPanel = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Panel
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      variant={
        (element.props.variant as
          | "default"
          | "tab"
          | "sidebar"
          | "card"
          | "modal") || "default"
      }
      title={typeof element.props.title === 'string' ? element.props.title : undefined}
      style={element.props.style}
      className={element.props.className}
    >
      {children.map((child) => renderElement(child, child.id))}
    </Panel>
  );
};

/**
 * Card 렌더링
 */
export const renderCard = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, renderElement, eventEngine, projectId } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const eventHandlers = context.services?.createEventHandlerMap?.(element, context) ?? {};

  return (
    <Card
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      title={typeof element.props.title === 'string' ? element.props.title : undefined}
      description={String(element.props.description || "")}
      variant={
        (element.props.variant as "default" | "elevated" | "outlined") ||
        "default"
      }
      size={(element.props.size as "sm" | "md" | "lg" | undefined) || "md"}
      isQuiet={Boolean(element.props.isQuiet)}
      isSelected={Boolean(element.props.isSelected)}
      isDisabled={Boolean(element.props.isDisabled)}
      isFocused={Boolean(element.props.isFocused)}
      style={element.props.style}
      className={element.props.className}
      onClick={eventHandlers.onClick as unknown as () => void}
    >
      {typeof element.props.children === "string"
        ? element.props.children
        : null}
      {children.map((child) => renderElement(child, child.id))}
    </Card>
  );
};

/**
 * Button 렌더링
 */
export const renderButton = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, renderElement, eventEngine, projectId } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const eventHandlers = context.services?.createEventHandlerMap?.(element, context) ?? {};

  // React Aria Button은 onPress를 사용하므로 onClick과 onPress 모두 확인
  const handlePress = eventHandlers.onPress || eventHandlers.onClick;

  return (
    <Button
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      variant={
        element.props.variant as
          | "primary"
          | "secondary"
          | "surface"
          | "outline"
          | "ghost"
      }
      size={element.props.size as "sm" | "md" | "lg"}
      type={(element.props.type as "button" | "submit" | "reset") || "button"}
      isDisabled={Boolean(element.props.isDisabled as boolean)}
      style={element.props.style}
      className={element.props.className}
      onPress={handlePress as unknown as () => void}
      onHoverStart={
        eventHandlers.onMouseEnter as unknown as (e: unknown) => void
      }
      onHoverEnd={eventHandlers.onMouseLeave as unknown as (e: unknown) => void}
      onFocus={eventHandlers.onFocus as unknown as (e: unknown) => void}
      onBlur={eventHandlers.onBlur as unknown as (e: unknown) => void}
      onKeyDown={eventHandlers.onKeyDown as unknown as (e: unknown) => void}
      onKeyUp={eventHandlers.onKeyUp as unknown as (e: unknown) => void}
    >
      {typeof element.props.children === "string"
        ? element.props.children
        : children.length === 0
        ? "Button"
        : null}
      {children.map((child) => renderElement(child, child.id))}
    </Button>
  );
};

/**
 * Text 렌더링
 */
export const renderText = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const TextTag = (element.props.as || "p") as string;

  return React.createElement(
    TextTag,
    {
      key: element.id,
      "data-element-id": element.id,
      style: element.props.style,
      className: element.props.className,
    },
    element.props.children,
    ...children.map((child) => renderElement(child, child.id))
  );
};

/**
 * Tooltip 렌더링
 */
export const renderTooltip = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Tooltip
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
    >
      {typeof element.props.children === "string"
        ? element.props.children
        : null}
      {children.map((child) => renderElement(child, child.id))}
    </Tooltip>
  );
};

/**
 * ProgressBar 렌더링
 */
export const renderProgressBar = (
  element: PreviewElement,
  _context: RenderContext // eslint-disable-line @typescript-eslint/no-unused-vars
): React.ReactNode => {
  return (
    <ProgressBar
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={String(element.props.label || "")}
      value={Number(element.props.value || 0)}
      minValue={
        element.props.minValue !== undefined
          ? Number(element.props.minValue)
          : 0
      }
      maxValue={
        element.props.maxValue !== undefined
          ? Number(element.props.maxValue)
          : 100
      }
      isIndeterminate={Boolean(element.props.isIndeterminate || false)}
      variant={
        (element.props.variant as "default" | "primary" | "secondary" | "surface") || "default"
      }
      size={
        (element.props.size as "sm" | "md" | "lg") || "md"
      }
    />
  );
};

/**
 * Meter 렌더링
 */
export const renderMeter = (
  element: PreviewElement,
  _context: RenderContext // eslint-disable-line @typescript-eslint/no-unused-vars
): React.ReactNode => {
  return (
    <Meter
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      style={element.props.style}
      className={element.props.className}
      label={String(element.props.label || "")}
      value={Number(element.props.value || 0)}
      minValue={
        element.props.minValue !== undefined
          ? Number(element.props.minValue)
          : 0
      }
      maxValue={
        element.props.maxValue !== undefined
          ? Number(element.props.maxValue)
          : 100
      }
      variant={
        (element.props.variant as "default" | "primary" | "secondary" | "surface") || "default"
      }
      size={
        (element.props.size as "sm" | "md" | "lg") || "md"
      }
    />
  );
};

/**
 * Separator 렌더링
 */
export const renderSeparator = (
  element: PreviewElement,
  _context: RenderContext // eslint-disable-line @typescript-eslint/no-unused-vars
): React.ReactNode => {
  return (
    <Separator
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      orientation={
        (element.props.orientation as "horizontal" | "vertical") || "horizontal"
      }
      variant={
        (element.props.variant as "default" | "dashed" | "dotted") || "default"
      }
      size={(element.props.size as "sm" | "md" | "lg") || "md"}
      style={element.props.style}
      className={element.props.className}
    />
  );
};

/**
 * Group 렌더링
 */
export const renderGroup = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Group
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      label={element.props.label as string | undefined}
      isDisabled={Boolean(element.props.isDisabled)}
      isInvalid={Boolean(element.props.isInvalid)}
      isReadOnly={Boolean(element.props.isReadOnly)}
      role={(element.props.role as "group" | "region" | "presentation") || "group"}
      aria-label={element.props["aria-label"] as string | undefined}
      aria-labelledby={element.props["aria-labelledby"] as string | undefined}
      style={element.props.style}
      className={element.props.className}
    >
      {children.map((child) => renderElement(child, child.id))}
    </Group>
  );
};

/**
 * Modal 렌더링
 */
export const renderModal = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, renderElement, eventEngine, projectId } = context;
  const eventHandlers = context.services?.createEventHandlerMap?.(element, context) ?? {};

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const resolvedId = element.customId || element.id;
  const mergedStyle = {
    ...(element.props.style || {}),
    display:
      element.props.isOpen === false
        ? "none"
        : (element.props.style as React.CSSProperties | undefined)?.display,
  };

  return (
    <div
      key={element.id}
      id={resolvedId}
      data-element-id={element.id}
      data-custom-id={element.customId}
      role="dialog"
      aria-modal="true"
      className={element.props.className}
      style={mergedStyle}
      onClick={eventHandlers.onClick as unknown as () => void}
    >
      {children.length === 0 && typeof element.props.children === "string"
        ? element.props.children
        : children.map((child) => renderElement(child, child.id))}
    </div>
  );
};

/**
 * Breadcrumbs 렌더링
 */
export const renderBreadcrumbs = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, renderElement, eventEngine, projectId } = context;
  const eventHandlers = context.services?.createEventHandlerMap?.(element, context) ?? {};

  // PropertyDataBinding 형식 감지
  const dataBinding = element.dataBinding || element.props.dataBinding;
  const isPropertyBinding =
    dataBinding &&
    typeof dataBinding === 'object' &&
    "source" in (dataBinding as object) &&
    "name" in (dataBinding as object) &&
    !("type" in (dataBinding as object));

  const breadcrumbChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "Breadcrumb")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Breadcrumbs
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      aria-label={typeof element.props["aria-label"] === 'string' ? element.props["aria-label"] : undefined}
      isDisabled={Boolean(element.props.isDisabled)}
      style={element.props.style}
      className={element.props.className}
      dataBinding={(isPropertyBinding ? dataBinding : element.dataBinding) as DataBinding | undefined}
      columnMapping={element.props.columnMapping as ColumnMapping | undefined}
      {...eventHandlers}
    >
      {breadcrumbChildren.map((child) => renderElement(child))}
    </Breadcrumbs>
  );
};

/**
 * Breadcrumb (아이템) 렌더링
 */
export const renderBreadcrumb = (
  element: PreviewElement,
  _context: RenderContext // eslint-disable-line @typescript-eslint/no-unused-vars
): React.ReactNode => {
  return (
    <Breadcrumb
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      href={String(element.props.href || "")}
    >
      {element.props.children}
    </Breadcrumb>
  );
};

/**
 * Link 렌더링
 */
export const renderLink = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, renderElement, eventEngine, projectId } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const eventHandlers = context.services?.createEventHandlerMap?.(element, context) ?? {};

  return (
    <Link
      key={element.id}
      data-custom-id={element.customId || undefined}
      data-element-id={element.id}
      href={String(element.props.href || "")}
      variant={
        (element.props.variant as "primary" | "secondary") || undefined
      }
      size={(element.props.size as "sm" | "md" | "lg") || undefined}
      isExternal={Boolean(element.props.isExternal)}
      showExternalIcon={element.props.showExternalIcon !== false}
      isDisabled={Boolean(element.props.isDisabled)}
      style={element.props.style}
      className={element.props.className}
      onPress={eventHandlers.onPress as unknown as () => void}
      onHoverStart={
        eventHandlers.onMouseEnter as unknown as (e: unknown) => void
      }
      onHoverEnd={eventHandlers.onMouseLeave as unknown as (e: unknown) => void}
      onFocus={eventHandlers.onFocus as unknown as (e: unknown) => void}
      onBlur={eventHandlers.onBlur as unknown as (e: unknown) => void}
    >
      {typeof element.props.children === "string"
        ? element.props.children
        : children.length === 0
        ? "Link"
        : null}
      {children.map((child) => renderElement(child, child.id))}
    </Link>
  );
};

/**
 * Badge 렌더링
 */
export const renderBadge = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, renderElement } = context;

  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Badge
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      variant={
        (element.props.variant as "primary" | "secondary" | "tertiary" | "error" | "surface") || undefined
      }
      size={(element.props.size as "sm" | "md" | "lg") || undefined}
      isDot={Boolean(element.props.isDot)}
      isPulsing={Boolean(element.props.isPulsing)}
      style={element.props.style}
      className={element.props.className}
    >
      {typeof element.props.children === "string"
        ? element.props.children
        : children.length === 0
        ? "1"
        : null}
      {children.map((child) => renderElement(child, child.id))}
    </Badge>
  );
};

/**
 * Slot 렌더링
 *
 * Layout 내에서 Page 콘텐츠가 삽입될 위치를 표시하는 컴포넌트.
 * - Layout 편집 모드: 빈 플레이스홀더 표시
 * - Page 렌더링 모드: Page elements로 교체됨 (layoutResolver에서 처리)
 */
export const renderSlot = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, renderElement, editMode } = context;

  // Layout 편집 모드인지 확인
  const isLayoutEditMode = editMode === "layout";

  // Slot에 들어갈 자식 요소들 (이미 layoutResolver에서 배치됨)
  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Slot
      key={element.id}
      data-element-id={element.id}
      name={String(element.props.name || "content")}
      required={Boolean(element.props.required)}
      description={String(element.props.description || "")}
      isEditMode={isLayoutEditMode}
      style={element.props.style}
      className={element.props.className}
    >
      {children.map((child) => renderElement(child, child.id))}
    </Slot>
  );
};
