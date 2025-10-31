import React from "react";
import {
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Panel,
  Card,
  Button,
  Tooltip,
  ProgressBar,
  Meter,
  Separator,
  Breadcrumbs,
  Breadcrumb,
} from "../../components/list";
import { PreviewElement, RenderContext } from "../types";
import { createEventHandlerMap } from "../utils/eventHandlers";


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
      onSelectionChange={(key) => {
        const updatedProps = {
          ...element.props,
          selectedKey: key,
        };
        updateElementProps(element.id, updatedProps);
      }}
    >
      <TabList>
        {tabChildren.map((tab) => (
          <Tab key={tab.id} id={tab.id}>
            {tab.props.title}
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
              title={correspondingPanel.props.title}
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
      title={element.props.title}
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

  const eventHandlers = createEventHandlerMap(element, eventEngine, projectId);

  return (
    <Card
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      title={element.props.title}
      description={String(element.props.description || "")}
      variant={
        (element.props.variant as "default" | "elevated" | "outlined") ||
        "default"
      }
      size={(element.props.size as "small" | "medium" | "large") || "medium"}
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

  const eventHandlers = createEventHandlerMap(element, eventEngine, projectId);

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
      onPress={eventHandlers.onClick as unknown as () => void}
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
 * Breadcrumbs 렌더링
 */
export const renderBreadcrumbs = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements, renderElement } = context;
  const eventHandlers = createEventHandlerMap(element, context);

  const breadcrumbChildren = elements
    .filter((child) => child.parent_id === element.id && child.tag === "Breadcrumb")
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  return (
    <Breadcrumbs
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      aria-label={element.props["aria-label"]}
      isDisabled={Boolean(element.props.isDisabled)}
      style={element.props.style}
      className={element.props.className}
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
